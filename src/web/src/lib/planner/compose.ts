import {
  publicDefinition,
  publicDefinitions,
} from "../../simulations/components/catalog";
import { compositionRequirements } from "../../simulations/components/catalog/explorationTeaching";
import {
  convertToBoard,
  reconcileBoard,
} from "../../simulations/runtime/authoring/board";
import { finalizeRecipe } from "../../simulations/runtime/authoring/operations";
import {
  autoConnectUnambiguous,
  checkRunnable,
  suggestConnections,
} from "../../simulations/runtime/authoring/runnable";
import {
  AuthoringTransaction,
  type OperationReceipt,
} from "../../simulations/runtime/authoring/transaction";
import {
  emptyAuthoredDocument,
  emptyLayout,
} from "../../simulations/runtime/authoring/types";
import { loadRecipe } from "../../simulations/runtime/recipes/loadRecipe";
import { type Message, requestStructured } from "../apertus/transport";
import { buildInitialCard, retrieveComponentBucket } from "./bucket";
import type { GenerationBudget } from "./budget";
import { requiresLayaComposition } from "./compositionPolicy";
import { compositionIssues } from "./compositionQuality";
import {
  focusCompositionTools,
  requestedControlTools,
} from "./compositionTools";
import { computeOpenCompositionCoverage } from "./coverage";
import { PlannerError } from "./errors";
import { focusedTurn } from "./focusedTurn";
import { type FixerResult, fixAndValidateToolResponse } from "./formatFixer";
import type {
  GenerationRequest,
  GenerationResult,
  TeachingIntent,
} from "./schema";
import { selectCompositionStrategy } from "./selection/compositionStrategy";
import { buildTurnEnvelopeSchema, buildTurnTools } from "./turnSchema";

const TURN_SYSTEM_PROMPT = `You are the component and composite builder agent for Apertus.
Your task is to build or modify an interactive simulation composite matching the user's intent.
A composite is a reusable assembly of connected components (models, controls, observations, canvases) with typed ports and layout.
Each turn, you must return a single JSON turn envelope containing either:
1. {"action": "tool", "tool": {"tool": "<tool_name>", "arguments": { ... }}, "note": "<brief rationale>"}
2. {"action": "done", "note": "<brief summary>"}

Recommended sequence of operations:
1. Insert required model/prefab components (insert_component with definition and alias).
2. Connect required ports between components if needed (connect).
3. Configure model parameters to reflect constraints (configure).
4. Add only controls needed for the active learning question. Process lessons need one contextual primary action, not every adjustable parameter.
5. Use one timely caption for process lessons. Add numerical observations or graphs only when the question requires them. Follow topic guidance for independent action/caption dependencies.
6. Set composite metadata and lesson info (set_lesson) and layout arrangement (arrange).
7. Return action "done" when the composite is fully assembled and configured.
Only use valid tool names and arguments from the provided schema. Do not output markdown fences or explanatory text outside the JSON envelope.`;

export async function compose(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
  activeFollowup?: () => Promise<GenerationResult | null>,
  replaceTopic = false,
): Promise<GenerationResult> {
  budget.enableCompositionMode();
  budget.check();

  const shouldStartFresh =
    replaceTopic ||
    /\b(?:start over|from scratch|new experiment|clear all|reset all|replace everything)\b/i.test(
      request.prompt,
    );
  // 1. Retrieve component bucket
  const activeContextText =
    request.active && !shouldStartFresh
      ? [
          request.active.recipe.title,
          request.active.recipe.description || "",
          ...request.active.recipe.document.nodes.map((n) => n.definition),
        ].join(" ")
      : "";
  const bucketPrompt = activeContextText
    ? `${request.prompt}\nActive experiment: ${activeContextText}`
    : request.prompt;
  const bucket = retrieveComponentBucket(bucketPrompt, intent);

  if (request.active?.recipe.document.nodes) {
    for (const node of request.active.recipe.document.nodes) {
      if (!bucket.some((c) => c.id === node.definition)) {
        const card = buildInitialCard(node.definition);
        if (card) bucket.unshift(card);
      }
    }
  }

  const serializedChars = JSON.stringify(bucket).length;
  budget.trace?.("bucket", {
    count: bucket.length,
    cards: bucket.map((c) => c.id),
    chars: serializedChars,
  });

  if (bucket.length === 0) {
    return {
      protocolVersion: 1,
      status: "unsupported",
      requestId: request.requestId,
      message:
        "I can currently build simulations using the available catalog components. This request has no supported teaching overlap.",
    };
  }

  const requiredLaya = requiresLayaComposition();
  const activeTopics =
    request.active && !shouldStartFresh
      ? [
          ...new Set(
            request.active.recipe.document.nodes
              .map((n) => compositionRequirements[n.definition]?.topic)
              .filter(Boolean),
          ),
        ]
      : [];
  const decisionPrompt = activeTopics.length
    ? `Active lesson: ${request.active?.recipe.document.nodes
        .filter(
          (n) => publicDefinitions.get(n.definition)?.category === "models",
        )
        .map((n) => publicDefinition(n.definition).title)
        .join("; ")}. Follow-up within this lesson: ${request.prompt}`
    : request.prompt;
  const strategy = requiredLaya
    ? await selectCompositionStrategy(decisionPrompt, intent, bucket, budget)
    : null;
  if (strategy) intent = { ...intent, suggestedStructure: strategy.structure };
  // Strict selection still validates the topic; supported active lessons then use
  // the canonical runtime/authoring follow-up path instead of rebuilding a lesson.
  if (
    activeFollowup &&
    strategy &&
    !shouldStartFresh &&
    request.active?.recipe.document.nodes.some(
      (node) =>
        node.definition === strategy.definition &&
        node.definition.startsWith("prefabs/earth-atmosphere/"),
    )
  ) {
    const result = await activeFollowup();
    if (result) return result;
  }

  // 2. Initialize authoring transaction
  const initialDoc = structuredClone(
    (!shouldStartFresh && request.active?.recipe.document) ||
      emptyAuthoredDocument(),
  );
  if (!initialDoc.presentation) {
    initialDoc.presentation = {
      version: 1,
      mode: "board",
      items: [],
      groups: [],
      startView: { x: 0, y: 0, width: 800, height: 600 },
      navigation: { mode: "bounded", minZoom: 0.25, maxZoom: 2 },
      immersive: { startup: "board", allowReturnToBoard: true, overlays: [] },
    };
  }
  const draft = new AuthoringTransaction(
    request.requestId,
    initialDoc,
    requiredLaya ? { operations: 32, receipts: 48 } : undefined,
  );

  const maxTurns = budget.maxTurns;
  let turn = 0;
  let lastReceipt: OperationReceipt | undefined;
  const executedPayloads = new Set<string>();
  let unchangedRevisionsCount = 0;
  let lastRevision = draft.revision;

  // 3. Multi-turn composition loop
  while (turn < maxTurns) {
    budget.check();

    const allTools = buildTurnTools(draft.document, bucket);
    const controlAdditions = requestedControlTools(
      draft.document,
      allTools,
      request.prompt,
    );
    const wantsMoreControls =
      controlAdditions.length > 0 ||
      (/\b(?:build|make|add|insert|include|create|provide|give|with)\b/i.test(
        request.prompt,
      ) &&
        /\b(?:slider|control|input|dial|button)\b/i.test(request.prompt));
    const wantsMoreObservations =
      /\b(?:build|make|add|insert|include|create|provide|give|with)\b/i.test(
        request.prompt,
      ) &&
      /\b(?:readout|observation|display|meter|graph|monitor)\b/i.test(
        request.prompt,
      );
    const additions = [
      ...controlAdditions,
      ...(wantsMoreObservations
        ? allTools.filter((tool) => tool.tool === "add_observation")
        : []),
    ];
    const pendingControls = controlAdditions.filter((tool) => {
      if (tool.schema.type !== "object") return false;
      const { target, command } = tool.schema.properties;
      return !draft.document.connections.some(
        (wire) =>
          target.type === "enum" &&
          command.type === "enum" &&
          wire.to.node === target.values[0] &&
          wire.to.port === command.values[0] &&
          draft.document.nodes.some(
            (node) =>
              node.id === wire.from.node &&
              publicDefinition(node.definition).category === "controls",
          ),
      );
    });
    const isControlExtension =
      Boolean(request.active) &&
      !shouldStartFresh &&
      wantsMoreControls &&
      !wantsMoreObservations;
    let turnTools = strategy
      ? focusCompositionTools(
          draft.document,
          bucket,
          allTools,
          strategy.definition,
          additions,
        )
      : allTools;
    if (
      request.active &&
      !shouldStartFresh &&
      executedPayloads.size === 0 &&
      additions.length > 0 &&
      additions.some((tool) => turnTools.includes(tool)) &&
      compositionIssues(draft.document).length === 0
    ) {
      // A requested extension must create an interactive component before edits
      // to existing settings can be considered a successful response.
      turnTools = additions;
    }
    if (
      isControlExtension &&
      compositionIssues(draft.document).length === 0 &&
      controlAdditions.some((tool) => turnTools.includes(tool))
    ) {
      // The requested command wiring is the completion criterion. Once present,
      // arrange the new controls rather than asking inference to change model values.
      turnTools = pendingControls.length
        ? pendingControls
        : allTools.filter((tool) => tool.tool === "arrange");
    }
    if (
      requiredLaya &&
      (!request.active || shouldStartFresh) &&
      compositionIssues(draft.document).length === 0 &&
      draft.document.nodes.some(
        (node) => node.definition === strategy?.definition,
      )
    ) {
      const hasLesson = [...executedPayloads].some(
        (p) => JSON.parse(p).tool === "set_lesson",
      );
      const hasArrangement = [...executedPayloads].some(
        (p) => JSON.parse(p).tool === "arrange",
      );
      turnTools = allTools.filter((t) =>
        !hasLesson
          ? t.tool === "set_lesson"
          : !hasArrangement
            ? t.tool === "arrange"
            : false,
      );
    }
    // A complete existing capability needs editing tools; unrelated optional insertions
    // make small local models copy schemas instead of making the requested edit.
    if (
      requiredLaya &&
      request.active &&
      !shouldStartFresh &&
      strategy?.structure === "single" &&
      draft.document.nodes.some(
        (node) => node.definition === strategy.definition,
      ) &&
      compositionIssues(draft.document).length === 0
    ) {
      turnTools = turnTools.filter((tool) => tool.tool !== "insert_component");
    }
    if (requiredLaya) {
      turnTools = turnTools.map((tool) => {
        if (tool.tool !== "arrange" || tool.schema.type !== "object")
          return tool;
        const properties = { ...tool.schema.properties };
        for (const [role, categories] of Object.entries({
          main: ["appearance", "canvases"],
          controls: ["controls"],
          results: ["displays"],
        })) {
          const ids = draft.document.nodes
            .filter((n) =>
              categories.includes(publicDefinition(n.definition).category),
            )
            .map((n) => n.id);
          const field = properties[role];
          if (field.type === "array")
            properties[role] = {
              ...field,
              ...(ids.length
                ? { items: { type: "enum" as const, values: ids } }
                : { maxItems: 0 }),
            };
        }
        return { ...tool, schema: { ...tool.schema, properties } };
      });
    }

    const liveHandles = requiredLaya
      ? draft.document.nodes.map((n) => n.id)
      : Object.keys(draft.handles);
    const nodesSummary = draft.document.nodes.map((n) => {
      const handle =
        Object.entries(draft.handles).find(([, id]) => id === n.id)?.[0] ??
        n.id;
      const def = publicDefinitions.get(n.definition);
      return {
        handle,
        definition: n.definition,
        label: n.label,
        instanceLabel: `${compositionRequirements[n.definition]?.instanceNoun ?? def?.title ?? n.definition} ${draft.document.nodes.filter((peer) => peer.definition === n.definition).findIndex((peer) => peer.id === n.id) + 1}`,
        commands: def ? Object.keys(def.commands) : [],
        valueOutputs: def
          ? Object.entries(def.outputs)
              .filter(([, p]) => p.kind === "value")
              .map(([k]) => k)
          : [],
        config: n.configuration,
      };
    });
    const connectionsSummary = draft.document.connections.map(
      (c) => `${c.from.node}.${c.from.port} -> ${c.to.node}.${c.to.port}`,
    );
    const suggestions = suggestConnections(draft.document);

    const isCompositeBuilder =
      (request.active?.sessionId?.startsWith("builder-") ?? false) ||
      /\b(?:builder|composite|component)\b/i.test(request.prompt) ||
      Boolean(request.requestId?.includes("builder")) ||
      request.active == null;

    const contextData = {
      strategy,
      allowedTools: [...new Set(turnTools.map((t) => t.tool))],
      requirements: Object.fromEntries(
        bucket
          .filter((c) => compositionRequirements[c.id])
          .map((c) => [c.id, compositionRequirements[c.id]]),
      ),
      incomplete: requiredLaya ? compositionIssues(draft.document) : [],
      mode: isCompositeBuilder ? "composite_builder" : "experiment_planner",
      draftSummary: {
        nodes: nodesSummary,
        connections: connectionsSummary,
        groups:
          draft.document.groups?.map((g) => ({
            id: g.id,
            label: g.label,
            members: g.members,
            parameters: g.parameters,
            exposedPorts: g.exposedPorts,
          })) ?? [],
        unconnectedRequiredPorts: suggestions.map(
          (s) =>
            `${s.to.node}.${s.to.port} (compatible candidate: ${s.from.node}.${s.from.port})`,
        ),
        revision: draft.revision,
      },
      compositeDetails: request.active?.recipe
        ? {
            id: request.active.recipe.id,
            title: request.active.recipe.title,
            description: request.active.recipe.description,
            parameters: request.active.recipe.parameters,
            externalPorts: request.active.recipe.externalPorts,
            tags: request.active.recipe.tags,
            assumptions: request.active.recipe.assumptions,
            discovery: request.active.recipe.discovery,
          }
        : undefined,
      bucketComponents: bucket.map((c) => ({
        id: c.id,
        kind: c.kind,
        summary: c.summary,
        supports: c.supports,
        commands: c.commands,
        outputs: c.outputs.map((o) => o.name),
      })),
      lastOperation: lastReceipt
        ? {
            status: lastReceipt.status,
            summary: lastReceipt.summary,
            issues: lastReceipt.issues,
          }
        : null,
    };

    const modelNodes = draft.document.nodes.filter(
      (n) => publicDefinition(n.definition).category === "models",
    );
    const controlCount = draft.document.nodes.filter(
      (n) => publicDefinition(n.definition).category === "controls",
    ).length;
    const observationCount = draft.document.nodes.filter(
      (n) => publicDefinition(n.definition).category === "displays",
    ).length;

    let stepHint = "";
    if (isCompositeBuilder) {
      if (modelNodes.length === 0) {
        stepHint =
          "Step: insert the core physical or mathematical model component (insert_component or insert_recipe).";
      } else if (
        draft.document.connections.length === 0 &&
        (controlCount > 0 || observationCount > 0)
      ) {
        stepHint =
          "Step: connect controls or observation readouts to model ports (connect).";
      } else if (wantsMoreControls && executedPayloads.size === 0) {
        stepHint =
          "Step: add interactive control components (add_control) to satisfy user addition request.";
      } else if (wantsMoreObservations && executedPayloads.size === 0) {
        stepHint =
          "Step: add observation or display components (add_observation) to satisfy user addition request.";
      } else if (controlCount === 0) {
        stepHint =
          "Step: add interactive control components (add_control) to manipulate composite model parameters.";
      } else if (observationCount === 0) {
        stepHint =
          "Step: add observation or display components (add_observation) to visualize composite outputs.";
      } else {
        stepHint =
          "Step: configure parameters (configure), set composite title/description (set_lesson), arrange layout (arrange), or return action 'done'.";
      }
    } else {
      const wantedModels = intent.suggestedStructure === "comparison" ? 2 : 1;
      const wantedControls = wantedModels;
      const wantedObservations = wantedModels;
      if (modelNodes.length < wantedModels) {
        stepHint =
          wantedModels > 1
            ? "Step: insert the models to compare (insert_component or insert_recipe)."
            : "Step: insert the single model needed (insert_component or insert_recipe).";
      } else if (controlCount < wantedControls) {
        stepHint =
          "Step: add an interactive control (add_control) using a command and field that exist on the target model.";
      } else if (observationCount < wantedObservations) {
        stepHint =
          "Step: add an observation readout (add_observation) using an output that exists on the source model.";
      } else {
        stepHint =
          "Step: configure parameters (configure), set lesson info (set_lesson), arrange layout (arrange), or return action 'done'.";
      }
    }

    const messages: Message[] = [
      { role: "system", content: TURN_SYSTEM_PROMPT },
      {
        role: "user",
        content: isCompositeBuilder
          ? `Original composite request: "${request.prompt}"\nGoal: "${intent.goal}"\nComposite Assembly Guidance: ${stepHint}\nContext:\n${JSON.stringify(
              contextData,
              null,
              2,
            )}\n\nChoose the next single tool operation to build or modify this composite, or choose done if complete.`
          : `Original request: "${request.prompt}"\nLearning goal: "${intent.goal}"\nGuidance: ${stepHint}\nContext:\n${JSON.stringify(
              contextData,
              null,
              2,
            )}\n\nChoose the next single tool operation to perform, or choose done if complete.`,
      },
    ];

    const canFinish = !(
      modelNodes.length === 0 ||
      (controlCount === 0 && observationCount === 0) ||
      (wantsMoreControls && controlCount === 0) ||
      (wantsMoreObservations && observationCount === 0)
    );
    const turnJsonSchema = buildTurnEnvelopeSchema(turnTools, canFinish);

    if (requiredLaya) budget.beginTurn();
    budget.trace?.("turn.start", {
      turn: turn + 1,
      revision: draft.revision,
      availableTools: turnTools.map((t) => t.tool),
    });

    const turnResult = requiredLaya
      ? await focusedTurn(
          request.prompt,
          turnTools,
          {
            acceptedIntent: {
              goal: intent.goal,
              interactions: intent.interactions,
              ...(wantsMoreControls && executedPayloads.size === 0
                ? {
                    requiredNextOperation:
                      "add_control: add and connect a persistent interactive control for the requested parameter; changing its current configuration alone does not satisfy this request",
                  }
                : {}),
            },
            originalNodes: initialDoc.nodes.map((node) => ({
              id: node.id,
              definition: node.definition,
              config: node.configuration,
            })),
            originalConnections: initialDoc.connections,
            aliases: Object.keys(draft.handles),
            fidelity: [
              ...new Set(
                draft.document.nodes
                  .flatMap((n) => [
                    ...publicDefinition(n.definition).assumptions,
                    compositionRequirements[n.definition]?.guidance ?? "",
                  ])
                  .filter(Boolean),
              ),
            ],
            nodes: nodesSummary.map((n) => ({
              ...n,
              id: draft.handles[n.handle] ?? n.handle,
            })),
            connections: connectionsSummary,
            selectedCapability: strategy?.definition,
            priorOperation: lastReceipt
              ? { summary: lastReceipt.summary, issues: lastReceipt.issues }
              : null,
          },
          budget,
          turn,
          (operation) => {
            const candidate = draft.fork();
            const receipt = candidate.execute({
              draftId: candidate.draftId,
              expectedRevision: candidate.revision,
              operationId: `op_turn_${turn + 1}`,
              request: operation,
            });
            if (
              operation.tool === "configure" &&
              JSON.stringify(candidate.document) ===
                JSON.stringify(draft.document)
            )
              throw new Error(
                "The configuration patch changed nothing. Choose new values to implement the requested condition; current settings are context, not the requested result.",
              );
            if (receipt.status !== "applied")
              throw new Error(
                receipt.issues.map((issue) => issue.message).join("; ") ||
                  receipt.summary,
              );
          },
          Boolean(
            request.active &&
              !shouldStartFresh &&
              lastReceipt?.status === "applied" &&
              compositionIssues(draft.document).length === 0,
          ),
        )
      : await requestStructured<FixerResult>(
          messages,
          (content: string) => {
            const fixed = fixAndValidateToolResponse(
              content,
              liveHandles,
              undefined,
              (event, data) => {
                budget.trace?.(event, data);
              },
              draft.document,
            );
            if (fixed.issues.length > 0) {
              throw new Error(fixed.issues.join("; "));
            }
            return fixed;
          },
          'Return a single valid JSON turn envelope matching schema: {"action": "tool"|"done", "tool": {...}, "note": "..."}.',
          budget.signal,
          {
            budget,
            schema: turnJsonSchema,
            maxTokens: 768,
            onEvent: (event, data) =>
              budget.trace?.(`turn_${turn + 1}.${event}`, data),
            stage: `turn_${turn + 1}`,
          },
        );

    if (turnResult.unsupported) {
      return {
        protocolVersion: 1,
        status: "unsupported",
        requestId: request.requestId,
        message: turnResult.unsupported,
      };
    }
    if (turnResult.action === "done") {
      const incomplete = requiredLaya ? compositionIssues(draft.document) : [];
      if (
        requiredLaya &&
        (!draft.document.nodes.some(
          (n) => publicDefinition(n.definition).category === "models",
        ) ||
          incomplete.length)
      ) {
        lastReceipt = {
          operationId: "premature_done",
          draftRevision: draft.revision,
          handles: draft.handles,
          status: "rejected",
          summary: "Finish the required interactive graph before done.",
          issues: incomplete.map((message) => ({
            code: "incomplete_composition",
            message,
          })),
        };
        turn++;
        continue;
      }
      const missingRequestedControl = wantsMoreControls && controlCount === 0;
      const missingRequestedObservation =
        wantsMoreObservations && observationCount === 0;
      if (
        (missingRequestedControl || missingRequestedObservation) &&
        turn < maxTurns - 1
      ) {
        lastReceipt = {
          operationId: "op_premature_done",
          draftRevision: draft.revision,
          handles: draft.handles,
          status: "rejected",
          summary: `User requested ${missingRequestedControl ? "controls/sliders" : ""}${missingRequestedControl && missingRequestedObservation ? " and " : ""}${missingRequestedObservation ? "observations/readouts" : ""}; please add them before finishing.`,
          issues: [
            {
              code: "premature_done",
              message: `User requested ${missingRequestedControl ? "controls/sliders" : ""}${missingRequestedControl && missingRequestedObservation ? " and " : ""}${missingRequestedObservation ? "observations/readouts" : ""}; perform add_control or add_observation before finishing.`,
            },
          ],
        };
        turn++;
        continue;
      }
      budget.trace?.("turn.done", { turn: turn + 1, fixes: turnResult.fixes });
      break;
    }

    if (turnResult.action === "tool" && turnResult.request) {
      const canonicalPayload = JSON.stringify(turnResult.request);
      if (executedPayloads.has(canonicalPayload)) {
        budget.trace?.("turn.loop_detected", { payload: canonicalPayload });
        break;
      }
      executedPayloads.add(canonicalPayload);

      if (turnResult.request.tool === "arrange") {
        const validLayoutTargets = new Set(
          draft.document.layout.children.map((l) => l.node ?? l.id),
        );
        const filterTargets = (list: unknown) =>
          Array.isArray(list)
            ? list.filter((id) => {
                if (typeof id !== "string") return false;
                const resolved = draft.handles[id] ?? id;
                return (
                  validLayoutTargets.has(resolved) || validLayoutTargets.has(id)
                );
              })
            : [];
        turnResult.request.arguments.main = filterTargets(
          turnResult.request.arguments.main,
        );
        turnResult.request.arguments.controls = filterTargets(
          turnResult.request.arguments.controls,
        );
        turnResult.request.arguments.results = filterTargets(
          turnResult.request.arguments.results,
        );
        turnResult.request.arguments.narrowOrder = filterTargets(
          turnResult.request.arguments.narrowOrder,
        );
        turnResult.request.arguments.preserveLocked = true;
      }

      lastReceipt = draft.execute({
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        operationId: `op_turn_${turn + 1}`,
        request: turnResult.request,
      });

      if (lastReceipt.status === "applied")
        await budget.construction?.publish(
          draft.document,
          draft.revision,
          turnResult.request.tool === "arrange" ? "arrangement" : undefined,
        );

      budget.trace?.("turn.executed", {
        turn: turn + 1,
        tool: turnResult.request.tool,
        status: lastReceipt.status,
        issues: lastReceipt.issues,
        revision: draft.revision,
      });
      if (
        isControlExtension &&
        pendingControls.length === 0 &&
        turnResult.request.tool === "arrange" &&
        lastReceipt.status === "applied"
      )
        break;
      // A focused parameter patch contains all requested fields and completes a
      // refinement in one operation, rather than repeatedly amplifying a relative change.
      if (
        requiredLaya &&
        request.active &&
        !shouldStartFresh &&
        strategy?.structure === "single" &&
        turnResult.request.tool === "configure" &&
        lastReceipt.status === "applied" &&
        !wantsMoreControls &&
        !wantsMoreObservations &&
        compositionIssues(draft.document).length === 0
      )
        break;

      if (requiredLaya && lastReceipt.status !== "applied")
        throw new PlannerError(
          `Composition operation rejected: ${lastReceipt.summary}`,
          422,
        );
      if (draft.revision === lastRevision) {
        unchangedRevisionsCount++;
        if (unchangedRevisionsCount >= 2) {
          budget.trace?.("turn.stalled", { unchangedRevisionsCount });
          break;
        }
      } else {
        unchangedRevisionsCount = 0;
        lastRevision = draft.revision;
      }
    }

    turn++;
  }

  // 4. Auto-connect any remaining unambiguous ports
  const auto = requiredLaya
    ? { connected: [] }
    : autoConnectUnambiguous(draft.document);
  if (auto.connected.length > 0) {
    for (const conn of auto.connected) {
      draft.execute({
        draftId: draft.draftId,
        expectedRevision: draft.revision,
        operationId: `op_autoconn_${turn++}`,
        request: {
          tool: "connect",
          arguments: { from: conn.from, to: conn.to },
        },
      });
    }
    await budget.construction?.publish(draft.document, draft.revision);
    budget.trace?.("autoConnected", {
      count: auto.connected.length,
      connections: auto.connected,
    });
  }

  // 5.5 Auto-attach visual appearance and basic interaction if missing
  const composedModelNodes = draft.document.nodes.filter(
    (n) =>
      (!request.active || shouldStartFresh) &&
      publicDefinition(n.definition).category === "models",
  );
  for (const modelNode of composedModelNodes) {
    const def = publicDefinition(modelNode.definition);
    const hasAppearance = draft.document.nodes.some(
      (n) =>
        publicDefinition(n.definition).category === "appearance" &&
        draft.document.connections.some(
          (c) =>
            c.kind === "attachment" &&
            ((c.from.node === modelNode.id && c.to.node === n.id) ||
              (c.to.node === modelNode.id && c.from.node === n.id)),
        ),
    );
    if (!hasAppearance) {
      const req = compositionRequirements[modelNode.definition];
      const candidateAppearance =
        req?.appearance ??
        (publicDefinitions.has(
          `appearance/${modelNode.definition.replace(/^models\//, "")}`,
        )
          ? `appearance/${modelNode.definition.replace(/^models\//, "")}`
          : undefined);
      if (candidateAppearance && publicDefinitions.has(candidateAppearance)) {
        const appAlias = `vis_${Math.random().toString(36).slice(2, 8)}`;
        try {
          const r1 = draft.execute({
            draftId: draft.draftId,
            expectedRevision: draft.revision,
            operationId: `op_autoapp_${turn++}`,
            request: {
              tool: "insert_component",
              arguments: {
                definition: candidateAppearance,
                version: 1,
                alias: appAlias,
                configuration: {},
              },
            },
          });
          if (r1.status === "applied") {
            const appId = draft.handles[appAlias] ?? appAlias;
            draft.execute({
              draftId: draft.draftId,
              expectedRevision: draft.revision,
              operationId: `op_autoappconn_${turn++}`,
              request: {
                tool: "connect",
                arguments: {
                  from: { node: modelNode.id, port: "appearance" },
                  to: { node: appId, port: "model" },
                },
              },
            });
          }
        } catch {
          // ignore
        }
      }
    }

    const hasControl = draft.document.nodes.some(
      (n) => publicDefinition(n.definition).category === "controls",
    );
    if (!hasControl) {
      const req = compositionRequirements[modelNode.definition];
      const cmd =
        req?.commands?.[0] ??
        Object.keys(def.commands).find(
          (k) => k !== "RESET" && !k.startsWith("set:"),
        );
      if (cmd && def.commands[cmd]) {
        const cmdObj = def.commands[cmd];
        const argProps =
          cmdObj.arguments.type === "object"
            ? Object.keys(cmdObj.arguments.properties ?? {})
            : [];
        const isActionWithoutArgs = argProps.length === 0;
        const field = isActionWithoutArgs ? "" : argProps[0];
        const widget = isActionWithoutArgs ? "button" : "slider";
        try {
          const ctrlReceipt = draft.execute({
            draftId: draft.draftId,
            expectedRevision: draft.revision,
            operationId: `op_autoctrl_${turn++}`,
            request: {
              tool: "add_control",
              arguments: {
                target: modelNode.id,
                command: cmd,
                field,
                widget,
                label: cmdObj.description || cmd,
              },
            },
          });
          if (ctrlReceipt.status !== "applied" && !isActionWithoutArgs) {
            const altCmd = Object.keys(def.commands).find(
              (k) =>
                def.commands[k].arguments.type === "object" &&
                Object.keys(def.commands[k].arguments.properties ?? {})
                  .length === 0,
            );
            if (altCmd) {
              draft.execute({
                draftId: draft.draftId,
                expectedRevision: draft.revision,
                operationId: `op_autoctrl_btn_${turn++}`,
                request: {
                  tool: "add_control",
                  arguments: {
                    target: modelNode.id,
                    command: altCmd,
                    field: "",
                    widget: "button",
                    label: def.commands[altCmd].description || altCmd,
                  },
                },
              });
            }
          }
        } catch {
          // ignore
        }
      }
    }

    const hasObservation = draft.document.nodes.some(
      (n) => publicDefinition(n.definition).category === "displays",
    );
    if (!hasObservation) {
      const req = compositionRequirements[modelNode.definition];
      const obsName =
        req?.observations?.[0] ??
        Object.keys(def.outputs).find(
          (k) => k !== "appearance" && k !== "configuration",
        );
      if (obsName && def.outputs[obsName]) {
        try {
          const obsReceipt = draft.execute({
            draftId: draft.draftId,
            expectedRevision: draft.revision,
            operationId: `op_autoobs_${turn++}`,
            request: {
              tool: "add_observation",
              arguments: {
                source: modelNode.id,
                output: obsName,
                widget: "readout",
                label: obsName,
              },
            },
          });
          if (obsReceipt.status !== "applied") {
            draft.execute({
              draftId: draft.draftId,
              expectedRevision: draft.revision,
              operationId: `op_autoobs_insp_${turn++}`,
              request: {
                tool: "add_observation",
                arguments: {
                  source: modelNode.id,
                  output: obsName,
                  widget: "inspector",
                  label: obsName,
                },
              },
            });
          }
        } catch {
          // ignore
        }
      }
    }
  }

  // 5.8 Enforce lesson title and instructions
  const currentDoc = draft.document;
  if (
    !currentDoc.lesson.title.trim() ||
    currentDoc.lesson.title === "Untitled experiment"
  ) {
    currentDoc.lesson.title =
      intent.goal.slice(0, 80) || "Simulation Experiment";
  }
  if (
    !currentDoc.lesson.instruction.trim() ||
    currentDoc.lesson.instruction === "Explore the experiment."
  ) {
    currentDoc.lesson.instruction = intent.goal || "Explore the simulation.";
  }
  if (!currentDoc.lesson.explanation?.trim()) {
    currentDoc.lesson.explanation = `${intent.goal}. Concepts: ${intent.concepts.join(", ")}.`;
  }

  // 6. Ensure default arrangement if layout is missing
  if (currentDoc.layout.children.length === 0) {
    for (const node of currentDoc.nodes) {
      const def = publicDefinition(node.definition);
      if (!["models", "resources", "behaviors"].includes(def.category)) {
        currentDoc.layout.children.push({
          ...emptyLayout(`layout/${node.id}`),
          node: node.id,
        });
      }
    }
  }

  // 6.5 Reconcile board presentation
  if (
    !currentDoc.presentation ||
    currentDoc.presentation.mode !== "board" ||
    currentDoc.presentation.items.length === 0 ||
    currentDoc.presentation.items.length < currentDoc.layout.children.length
  ) {
    currentDoc.presentation = convertToBoard(currentDoc);
  } else {
    reconcileBoard(currentDoc);
  }

  // 7. Check runnable
  budget.trace?.("validation.start", {});
  let runCheck = checkRunnable(currentDoc);
  budget.trace?.("runnable.check", runCheck);
  if (!runCheck.runnable) {
    if (budget.repairs < budget.maxRepairs) {
      budget.consumeCall(true);
      const repairAuto = autoConnectUnambiguous(currentDoc);
      if (repairAuto.connected.length > 0) {
        for (const conn of repairAuto.connected) {
          draft.execute({
            draftId: draft.draftId,
            expectedRevision: draft.revision,
            operationId: `op_repairconn_${turn++}`,
            request: {
              tool: "connect",
              arguments: { from: conn.from, to: conn.to },
            },
          });
        }
      }
      await budget.construction?.publish(draft.document, draft.revision);
      runCheck = checkRunnable(draft.document);
    }
    if (!runCheck.runnable) {
      return {
        protocolVersion: 1,
        status: "unsupported",
        requestId: request.requestId,
        message: `Unable to construct a runnable simulation: ${runCheck.issues.join("; ")}`,
      };
    }
  }

  // 8. Compute coverage
  const finalDoc = draft.document;
  finalDoc.lesson = currentDoc.lesson;
  finalDoc.layout = currentDoc.layout;
  finalDoc.presentation = currentDoc.presentation;

  const coverage = computeOpenCompositionCoverage(
    request.prompt,
    intent,
    finalDoc,
    bucket,
  );

  if (coverage.level === "partial") {
    if (!finalDoc.lesson.explanation.includes(coverage.explanation)) {
      finalDoc.lesson.explanation =
        `${finalDoc.lesson.explanation}\n\n${coverage.explanation}`.trim();
    }
    if (!finalDoc.lesson.instruction.includes(coverage.explanation)) {
      finalDoc.lesson.instruction =
        `${finalDoc.lesson.instruction} ${coverage.explanation}`.trim();
    }
  }

  if (requiredLaya) {
    const issues = compositionIssues(finalDoc);
    if (issues.length)
      throw new PlannerError(
        `Incomplete interactive composition: ${issues.join("; ")}`,
        422,
      );
  }
  const assumptions = [
    ...new Set(
      finalDoc.nodes.flatMap((n) => publicDefinition(n.definition).assumptions),
    ),
  ];
  finalDoc.lesson.explanation = [
    finalDoc.lesson.explanation,
    ...assumptions.filter(
      (assumption) => !finalDoc.lesson.explanation.includes(assumption),
    ),
  ]
    .filter(Boolean)
    .join("\n");

  // 9. Finalize recipe
  const existingRecipe =
    request.active && !shouldStartFresh ? request.active.recipe : undefined;
  const recipe = finalizeRecipe(finalDoc, {
    ...existingRecipe,
    id:
      request.active && !shouldStartFresh
        ? request.active.recipe.id
        : `generated/${request.requestId}`,
    assumptions: [
      ...new Set([...(existingRecipe?.assumptions ?? []), ...assumptions]),
    ],
    title: finalDoc.lesson.title,
    description: finalDoc.lesson.instruction,
  });

  // 10. Verify headless load
  const loaded = loadRecipe(recipe);
  if (!loaded.runtime) {
    throw new PlannerError("Failed to initialize simulation runtime", 502);
  }

  loaded.runtime.dispose();
  const isUpdated = Boolean(request.active && !shouldStartFresh);
  return {
    protocolVersion: 1,
    status: isUpdated ? "updated" : "created",
    requestId: request.requestId,
    expectedSessionId: isUpdated ? (request.active?.sessionId ?? null) : null,
    expectedAuthoredRevision: isUpdated
      ? (request.active?.authoredRevision ?? null)
      : null,
    recipe,
    coverage,
    learnerExplanation: intent.goal,
  };
}
