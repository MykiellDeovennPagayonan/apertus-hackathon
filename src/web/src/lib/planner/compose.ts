import {
  publicDefinition,
  publicDefinitions,
} from "../../simulations/components/catalog";
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
import { computeOpenCompositionCoverage } from "./coverage";
import { PlannerError } from "./errors";
import { type FixerResult, fixAndValidateToolResponse } from "./formatFixer";
import type {
  GenerationRequest,
  GenerationResult,
  TeachingIntent,
} from "./schema";
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
4. Add interactive controls (add_control) for independent parameter exploration.
5. Add observation readouts or graphs (add_observation) to show key outputs.
6. Set composite metadata and lesson info (set_lesson) and layout arrangement (arrange).
7. Return action "done" when the composite is fully assembled and configured.
Only use valid tool names and arguments from the provided schema. Do not output markdown fences or explanatory text outside the JSON envelope.`;

export async function compose(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
): Promise<GenerationResult> {
  budget.enableCompositionMode();
  budget.check();

  // 1. Retrieve component bucket
  const activeContextText = request.active
    ? [
        request.active.recipe.title,
        request.active.recipe.description || "",
        ...request.active.recipe.document.nodes.map((n) => n.definition),
      ].join(" ")
    : "";
  const bucketPrompt = activeContextText
    ? `${request.prompt} ${activeContextText}`
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

  // 2. Initialize authoring transaction
  const shouldStartFresh =
    /\b(?:start over|from scratch|new experiment|clear all|reset all|replace everything)\b/i.test(
      request.prompt,
    );
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
  const draft = new AuthoringTransaction(request.requestId, initialDoc);

  const maxTurns = budget.maxTurns;
  let turn = 0;
  let lastReceipt: OperationReceipt | undefined;
  const executedPayloads = new Set<string>();
  let unchangedRevisionsCount = 0;
  let lastRevision = draft.revision;

  // 3. Multi-turn composition loop
  while (turn < maxTurns) {
    budget.check();

    const turnTools = buildTurnTools(draft.document, bucket);
    const turnJsonSchema = buildTurnEnvelopeSchema(turnTools);

    const liveHandles = Object.keys(draft.handles);
    const nodesSummary = draft.document.nodes.map((n) => {
      const handle =
        Object.entries(draft.handles).find(([, id]) => id === n.id)?.[0] ??
        n.id;
      const def = publicDefinitions.get(n.definition);
      return {
        handle,
        definition: n.definition,
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
      request.active?.sessionId?.startsWith("builder-") ?? false;

    const contextData = {
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

    const wantsMoreControls =
      /\b(?:add|insert|include|create|provide|give)\b/i.test(request.prompt) &&
      /\b(?:slider|control|input|dial|button)\b/i.test(request.prompt);
    const wantsMoreObservations =
      /\b(?:add|insert|include|create|provide|give)\b/i.test(request.prompt) &&
      /\b(?:readout|observation|display|meter|graph|monitor)\b/i.test(request.prompt);

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

    budget.trace?.("turn.start", {
      turn: turn + 1,
      revision: draft.revision,
      availableTools: turnTools.map((t) => t.tool),
    });

    const turnResult = await requestStructured<FixerResult>(
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
        maxTokens: 512,
        stage: `turn_${turn + 1}`,
      },
    );

    if (turnResult.action === "done") {
      if (
        isCompositeBuilder &&
        executedPayloads.size === 0 &&
        (wantsMoreControls || wantsMoreObservations) &&
        turn === 0
      ) {
        lastReceipt = {
          operationId: "op_premature_done",
          draftRevision: draft.revision,
          handles: draft.handles,
          status: "rejected",
          summary:
            "User requested adding components; please perform add_control or add_observation before finishing.",
          issues: [
            {
              code: "premature_done",
              message:
                "User requested adding components; please perform add_control or add_observation before finishing.",
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

      budget.trace?.("turn.executed", {
        turn: turn + 1,
        tool: turnResult.request.tool,
        status: lastReceipt.status,
        issues: lastReceipt.issues,
        revision: draft.revision,
      });

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
  const auto = autoConnectUnambiguous(draft.document);
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
    budget.trace?.("autoConnected", {
      count: auto.connected.length,
      connections: auto.connected,
    });
  }

  // 5. Enforce lesson title and instructions
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

  // 7. Check runnable
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

  // 9. Finalize recipe
  const recipe = finalizeRecipe(finalDoc, {
    id: "generated/lesson",
    title: finalDoc.lesson.title,
    description: finalDoc.lesson.instruction,
  });

  // 10. Verify headless load
  const loaded = loadRecipe(recipe);
  if (!loaded.runtime) {
    throw new PlannerError("Failed to initialize simulation runtime", 502);
  }

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
