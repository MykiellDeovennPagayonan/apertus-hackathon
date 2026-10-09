import {
  finalizeRecipe,
  type ToolRequest,
} from "../../simulations/runtime/authoring/operations";
import {
  DocumentRuntime,
  type ScopedCommand,
} from "../../simulations/runtime/authoring/runtime";
import { AuthoringTransaction } from "../../simulations/runtime/authoring/transaction";
import { emptyAuthoredDocument } from "../../simulations/runtime/authoring/types";
import {
  choice,
  object,
  type ParameterSchema,
  validateValue,
} from "../../simulations/runtime/parameterSchema";
import { premadeRecipe } from "../../simulations/runtime/recipes/registry";
import { toJsonSchema } from "../apertus/structuredSchema";
import { requestStructured } from "../apertus/transport";
import { selectCapability } from "./selection/selectCapability";
import { GenerationBudget, type TraceSink } from "./budget";
import {
  activeHandles,
  type CapabilityCard,
  capabilityCards,
  retrieveCapabilities,
  selectedContract,
} from "./catalog";
import { compose } from "./compose";
import { verifyExplicitQuantities } from "./constraints";
import { parseStageJson, stageMessages } from "./context";
import { coverageFor, verifyCoverage } from "./coverage";
import { PlannerError } from "./errors";
import { fixConfiguration } from "./formatFixer";
import {
  type Coverage,
  type GenerationRequest,
  type GenerationResult,
  intentResponseSchema,
  intentSources,
  parseGenerationRequest,
  parseGenerationResult,
  parseIntentResponse,
  type TeachingIntent,
} from "./schema";
import {
  creationResponseSchema,
  followupContract,
  followupModeSchema,
  parseAuthoredFollowup,
  type parseCreation,
  parseCreationResponse,
  selectionSchema,
} from "./stages";

let activeRequests = 0;

async function stage<T>(
  task: string,
  request: GenerationRequest,
  budget: GenerationBudget,
  schema: Record<string, unknown>,
  contract: unknown,
  parse: (value: unknown) => T,
  intent?: TeachingIntent,
  relevant?: unknown,
  maxTokens = 768,
  verify?: (result: T) => void,
) {
  budget.check();
  const messages = stageMessages(
    task,
    request.prompt,
    { ...(contract as object), responseSchema: schema },
    intent,
    relevant,
  );
  budget.trace?.("stage", {
    task,
    inputCharacters: JSON.stringify(messages).length,
    promptTokens: null,
  });
  return requestStructured(
    messages,
    (content) =>
      parse(
        parseStageJson(content, schema.type === "array" ? "array" : "object"),
      ),
    `Return only this stage's schema, preserving the original constraints. Do not repeat valid prior operations.${
      task === "runtime_command_arguments"
        ? " Return only the selected command's argument object. The application owns the command envelope. Close each nested argument object before the root object."
        : task === "authoring_arguments"
          ? " For operations, close the arguments object with }, then the operation object with }, then the operations array with ], and finally the root object with }."
          : ""
    }`,
    budget.signal,
    {
      budget,
      schema,
      maxTokens,
      stage: task,
      verify,
      onEvent: (event, data) => budget.trace?.(`${task}.${event}`, data),
    },
  );
}
function execute(
  draft: AuthoringTransaction,
  operations: ToolRequest[],
  budget: GenerationBudget,
  name: string,
  report = true,
) {
  budget.check();
  const receipt = draft.execute({
    draftId: draft.draftId,
    expectedRevision: draft.revision,
    operationId: name,
    request: operations,
  });
  if (report)
    budget.trace?.("operations", {
      tools: operations.map((op) => op.tool),
      receipt,
    });
  if (receipt.status !== "applied")
    throw new Error(receipt.issues.map((i) => i.message).join("; "));
}
async function select(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
) {
  let ranked = retrieveCapabilities(request.prompt, intent);
  if (!ranked.length) {
    budget.broaderSearches++;
    ranked = retrieveCapabilities(request.prompt, intent, true);
    budget.trace?.("retrieval.broader", {
      reason: "No useful initial candidate",
      cards: ranked.map((r) => r.card.recipeSlug),
    });
  }
  budget.trace?.(
    "retrieval",
    ranked.map(({ card, score }) => ({ card, score })),
  );
  if (!ranked.length) return null;
  if (ranked.length === 1 || ranked[0].score >= ranked[1].score + 8) {
    budget.trace?.("selection.decision", {
      status: "skipped",
      reason: "Unambiguous grounded capability",
    });
    return ranked[0].card;
  }
  const cards = ranked.map((r) => r.card);
  if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
    const selected = await selectCapability(
      request.prompt,
      intent,
      cards,
      budget,
      () => budget.decision,
    );
    if (selected.status === "selected") return selected.capability;
  } else
    budget.trace?.("selection.decision", {
      status: "skipped",
      reason: "Decision selection disabled",
    });
  const schema = selectionSchema(cards.map((c) => c.recipeSlug));
  const selected = await stage(
    "select_capability",
    request,
    budget,
    toJsonSchema(schema),
    {
      candidates: cards,
      policy:
        "Choose substantial learning overlap, or unclear. Do not construct a lesson on a token match.",
    },
    (value) => {
      validateValue(schema, value);
      return (value as { selected: string }).selected;
    },
    intent,
    undefined,
    96,
  );
  return cards.find((c) => c.recipeSlug === selected) ?? null;
}
function existingCoverage(
  request: GenerationRequest,
  card: CapabilityCard,
): Coverage {
  const explanation = request.active?.recipe.document.lesson.explanation ?? "";
  const partial =
    card.recipeSlug === "bridge" && /unavailable/i.test(explanation);
  return {
    level: partial ? "partial" : "full",
    covered: [...card.supports],
    omitted: partial ? ["Exact engineering deflection in millimetres"] : [],
    explanation: partial ? explanation : "",
  };
}
async function followup(
  request: GenerationRequest,
  budget: GenerationBudget,
): Promise<GenerationResult | null> {
  const current = request.active;
  if (!current) throw new Error("A follow-up requires an active recipe");
  if (current.sessionId.startsWith("builder-")) {
    // Builder sessions are authoring workflows that compose or modify components and composites.
    return null;
  }
  const handles = activeHandles(current.recipe.document);
  if (!handles.length) {
    // Active recipe has no legacy handles (open composition or builder document);
    // fall back to open composition planning.
    return null;
  }
  let mode = await stage(
    "followup_mode",
    request,
    budget,
    toJsonSchema(followupModeSchema),
    {
      policy:
        "Explicit start/initial/default, adding components/observations, layout, or wording means authored. Perform/play/reset/move now means runtime. An ordinary value change without starting/default wording is a learner runtime action. Creating a different lesson means new. Questions, explanations, or queries that do not operate or reconfigure the simulation are unsupported. Never capture a running checkpoint.",
      targets: handles.map(({ target, label, definition }) => ({
        target,
        label,
        definition,
      })),
    },
    (value) => {
      validateValue(followupModeSchema, value);
      return (value as { mode: string }).mode;
    },
    undefined,
    undefined,
    96,
  );
  if (
    mode === "runtime" &&
    /\b(?:start|starting|initial|initially|default)\b/i.test(request.prompt)
  ) {
    mode = "authored";
  }
  if (mode === "new") return null;
  if (mode === "unsupported")
    return {
      protocolVersion: 1,
      status: "unsupported",
      requestId: request.requestId,
      message:
        "That change is outside the supported teaching contracts. Your current lesson is still available.",
    };
  if (mode === "runtime") {
    const options = handles.flatMap((handle) =>
      Object.entries(handle.commands).map(([command, contract], index) => ({
        id: `${handle.target}:${index + 1}`,
        node: handle.target,
        label: handle.label,
        definition: handle.definition,
        command,
        description: contract.description,
        arguments: contract.arguments,
      })),
    );
    const selectionShape = object({
      selections: {
        type: "array",
        minItems: 1,
        maxItems: 3,
        items: choice(...options.map((option) => option.id)),
      },
    });
    const selectedIds = await stage(
      "runtime_command_selection",
      request,
      budget,
      toJsonSchema(selectionShape),
      {
        policy:
          "Select only the declared runtime commands needed to perform the request now. Value changes are runtime actions unless the request says start, initial, or default. Preserve the current operation when only arithmetic numbers change. Do not select RESET unless explicitly requested. For bridge loads, SET_LOAD changes weight/mass/magnitude (tonnes), while MOVE_LOAD changes position (left/right/across).",
        options,
      },
      (value) => {
        validateValue(selectionShape, value);
        let selections = (value as { selections: string[] }).selections;
        if (new Set(selections).size !== selections.length)
          throw new Error("Runtime command selections must be unique");

        // Disambiguate bridge MOVE_LOAD vs SET_LOAD based on user intent keywords
        const isWeightQuery =
          /\b(?:kg|ton|tonne|tons|tonnes|weight|mass|heavy|load)\b/i.test(
            request.prompt,
          ) &&
          !/\b(?:move|position|slide|location|left|right)\b/i.test(
            request.prompt,
          );
        const isPositionQuery =
          /\b(?:move|position|slide|location|left|right)\b/i.test(
            request.prompt,
          ) &&
          !/\b(?:kg|ton|tonne|tons|tonnes|weight|mass|heavy)\b/i.test(
            request.prompt,
          );

        selections = selections.map((selId) => {
          const opt = options.find((o) => o.id === selId);
          if (!opt) return selId;
          if (isWeightQuery && opt.command === "MOVE_LOAD") {
            const setLoadOpt = options.find(
              (o) => o.node === opt.node && o.command === "SET_LOAD",
            );
            if (setLoadOpt) return setLoadOpt.id;
          }
          if (isPositionQuery && opt.command === "SET_LOAD") {
            const moveLoadOpt = options.find(
              (o) => o.node === opt.node && o.command === "MOVE_LOAD",
            );
            if (moveLoadOpt) return moveLoadOpt.id;
          }
          return selId;
        });

        return selections;
      },
      undefined,
      current.runtimeContext,
      128,
    );
    const commands: ScopedCommand[] = [];
    for (const selectedId of selectedIds) {
      const selected = options.find((option) => option.id === selectedId);
      if (!selected) throw new Error("Unknown runtime command selection");
      const fullSchema = selected.arguments;
      const unwrapped =
        fullSchema.type === "object" &&
        Object.keys(fullSchema.properties).length === 1 &&
        fullSchema.properties.value?.type === "object"
          ? fullSchema.properties.value
          : null;
      const responseSchema: ParameterSchema = unwrapped ?? fullSchema;
      const generated = await stage(
        "runtime_command_arguments",
        request,
        budget,
        toJsonSchema(responseSchema),
        {
          policy:
            "Return only the selected command's arguments. Copy every required sibling field from currentState when the request changes only some fields. Preserve the current arithmetic operation when only its numbers change.",
          selected: {
            node: selected.node,
            label: selected.label,
            definition: selected.definition,
            command: selected.command,
            description: selected.description,
          },
          currentState: current.runtimeContext[selected.node],
        },
        (value) => {
          let v = value;
          if (
            responseSchema.type === "object" &&
            responseSchema.properties &&
            Object.keys(responseSchema.properties).length === 1 &&
            "value" in responseSchema.properties &&
            (typeof v === "number" || typeof v === "string")
          ) {
            v = { value: v };
          }
          if (
            (responseSchema.type === "number" ||
              responseSchema.type === "integer") &&
            v &&
            typeof v === "object" &&
            "value" in (v as Record<string, unknown>)
          ) {
            v = (v as Record<string, unknown>).value;
          }
          if (typeof v === "string") {
            const m = v
              .trim()
              .match(/^(-?[0-9]+(?:\.[0-9]+)?)\s*[a-zA-Z%°/]*$/);
            if (m) {
              v = Number(m[1]);
            }
          }
          if (
            (responseSchema.type === "number" ||
              responseSchema.type === "integer") &&
            typeof v === "number"
          ) {
            if (
              typeof responseSchema.minimum === "number" &&
              v < responseSchema.minimum
            ) {
              v = responseSchema.minimum;
            } else if (
              typeof responseSchema.maximum === "number" &&
              v > responseSchema.maximum
            ) {
              v = responseSchema.maximum;
            }
          }
          if (
            v &&
            typeof v === "object" &&
            responseSchema.type === "object" &&
            responseSchema.properties
          ) {
            const rec = v as Record<string, unknown>;
            for (const [propName, propSchema] of Object.entries(
              responseSchema.properties,
            )) {
              if (propName in rec) {
                let iv = rec[propName];
                if (typeof iv === "string") {
                  const m = iv
                    .trim()
                    .match(/^(-?[0-9]+(?:\.[0-9]+)?)\s*[a-zA-Z%°/]*$/);
                  if (m) {
                    iv = Number(m[1]);
                  }
                }
                if (
                  (propSchema.type === "number" ||
                    propSchema.type === "integer") &&
                  typeof iv === "number"
                ) {
                  if (
                    typeof propSchema.minimum === "number" &&
                    iv < propSchema.minimum
                  ) {
                    iv = propSchema.minimum;
                  } else if (
                    typeof propSchema.maximum === "number" &&
                    iv > propSchema.maximum
                  ) {
                    iv = propSchema.maximum;
                  }
                }
                rec[propName] = iv;
              }
            }
          }
          validateValue(responseSchema, v);
          const arguments_ = unwrapped ? { value: v } : v;
          validateValue(fullSchema, arguments_);
          return arguments_ as Record<string, unknown>;
        },
        undefined,
        undefined,
        192,
      );
      commands.push({
        node: selected.node,
        command: selected.command,
        arguments: generated,
      });
    }
    const candidate = new DocumentRuntime(current.recipe.document);
    const snapshot = candidate.getSnapshot();
    for (const handle of handles) {
      const state = current.runtimeContext[handle.target];
      if (state && typeof state === "object" && !Array.isArray(state))
        snapshot.state[handle.target] = {
          ...snapshot.state[handle.target],
          ...(structuredClone(state) as Record<string, unknown>),
        };
    }
    candidate.adoptSnapshot(snapshot);
    const accepted = candidate.dispatch(commands);
    if (!accepted.accepted) {
      return {
        protocolVersion: 1,
        status: "unsupported",
        requestId: request.requestId,
        message:
          accepted.error === "Unknown or absent member"
            ? "Please click directly on a bridge beam to select and inspect it."
            : accepted.error ||
              "That action cannot be performed on the current simulation.",
      };
    }
    return {
      protocolVersion: 1,
      status: "runtime_action",
      requestId: request.requestId,
      expectedSessionId: current.sessionId,
      expectedInteractionRevision: current.interactionRevision,
      commands,
      message: "Applied the requested change.",
    };
  }
  const draft = new AuthoringTransaction(
    request.requestId,
    current.recipe.document,
  );
  const card = capabilityCards().find((c) =>
    current.recipe.document.nodes.some(
      (n) =>
        n.definition ===
        (c.recipeSlug === "bridge"
          ? "models/BridgeResponse"
          : `models/${c.recipeSlug}`),
    ),
  );
  if (!card) throw new Error("Active recipe has no eligible capability");
  const coverage = existingCoverage(request, card);
  const applyFollowup = (
    target: AuthoringTransaction,
    operations: ToolRequest[],
    report: boolean,
  ) => {
    execute(target, operations, budget, "followup", report);
    if (
      operations.some((op) =>
        [
          "add_control",
          "add_observation",
          "insert_component",
          "insert_recipe",
        ].includes(op.tool),
      ) &&
      !operations.some((op) => op.tool === "arrange")
    )
      execute(
        target,
        [
          {
            tool: "arrange",
            arguments: {
              template:
                target.document.scopes.length > 1
                  ? "comparison"
                  : "scene-with-sidebar",
              main: [],
              controls: [],
              results: [],
              narrowOrder: [],
              preserveLocked: true,
            },
          },
        ],
        budget,
        "arrangement",
        report,
      );
    const document = target.document;
    if (
      coverage.level === "partial" &&
      !document.lesson.explanation.includes(coverage.explanation)
    )
      document.lesson.explanation += `\n${coverage.explanation}`;
    const recipe = finalizeRecipe(document, current.recipe);
    verifyCoverage(recipe, card);
    return recipe;
  };
  const response = await stage(
    "authoring_arguments",
    request,
    budget,
    followupContract(current.recipe.document, true),
    {
      policy:
        "Only change authored fields explicitly requested. Nested task objects must be complete. Keep unrelated authored values. Add an observation through add_observation; do not configure a disconnected display. When status is 'authored', operations must contain 1-8 operations configuring or modifying the simulation. For bridge starting values, configure the load target.",
      targets: handles,
    },
    (value) => {
      const parsed = parseAuthoredFollowup(value, current.recipe.document);
      if (parsed.status === "authored")
        applyFollowup(draft.fork(), parsed.operations, false);
      return parsed;
    },
  );
  if (response.status === "unsupported")
    return {
      protocolVersion: 1,
      status: "unsupported",
      requestId: request.requestId,
      message: response.message,
    };
  const recipe = applyFollowup(draft, response.operations, true);
  return {
    protocolVersion: 1,
    status: "updated",
    requestId: request.requestId,
    expectedSessionId: current.sessionId,
    expectedAuthoredRevision: current.authoredRevision,
    recipe,
    coverage,
    learnerExplanation: response.message,
  };
}
export async function planPrompt(
  input: GenerationRequest,
  signal?: AbortSignal,
  trace?: TraceSink,
): Promise<GenerationResult> {
  const request = parseGenerationRequest(input);
  const mode = process.env.PLANNER_MODE ?? "hybrid";
  if (!["hybrid", "apertus"].includes(mode))
    throw new PlannerError("PLANNER_MODE must be hybrid or apertus.", 503);
  const limit = Number(process.env.PLANNER_MAX_CONCURRENT_REQUESTS ?? 1);
  if (!Number.isInteger(limit) || limit < 1 || limit > 16)
    throw new PlannerError("Invalid planner concurrency.", 503);
  const budget = new GenerationBudget(signal, trace);
  budget.check();
  if (activeRequests >= limit)
    throw new PlannerError("Planner is busy. Please try again shortly.", 429);
  activeRequests++;
  try {
    if (request.active) {
      const result = await followup(request, budget);
      if (result) return parseGenerationResult(result, request);
    }
    const intent = await stage(
      "teaching_intent",
      request,
      budget,
      toJsonSchema(intentResponseSchema(request.prompt)),
      {
        policy:
          "Describe the goal, concepts, actions and observations concisely. Use 1–3 short entries per concepts/interactions/observations list; do not invent extra interactions or feedback. explicitConstraints is ALWAYS an array of {meaning, sourceId} objects. Select sourceId from constraintSources for each explicit quantity, unit, negation or starting constraint. The application attaches the exact original text; do not return sourceText. Multiple constraints may refer to the same source. Do not claim supported capabilities. suggestedStructure is 'comparison' ONLY when the learner explicitly requests comparing two models or differences (e.g. compare, versus, difference, two). Otherwise default to 'single'.",
        constraintSources: intentSources(request.prompt),
      },
      (value) => parseIntentResponse(value, request.prompt),
      undefined,
      {
        exampleRequest:
          "Explore how changing a value changes the result. Start at 5.",
        exampleResponse: {
          goal: "Explore the relationship between a value and its result",
          concepts: ["relationship"],
          interactions: ["change the value"],
          observations: ["result"],
          explicitConstraints: [
            { meaning: "Initial value", sourceId: "source-1" },
          ],
          suggestedStructure: "single",
        },
      },
      768,
    );
    const isBuilderModifyingComposite =
      Boolean(request.active?.sessionId?.startsWith("builder-")) &&
      (request.active?.recipe.document.nodes.length ?? 0) > 0;

    const selected = isBuilderModifyingComposite
      ? null
      : await select(request, intent, budget);
    if (!selected) {
      budget.trace?.("selection.fallback_to_composition", {
        reason: "No single recipe fits request",
      });
      return await compose(request, intent, budget);
    }
    const source = premadeRecipe(selected.recipeSlug);
    const construct = (
      configuration: ReturnType<typeof parseCreation>,
      report: boolean,
    ) => {
      const fixResult = fixConfiguration(
        request.prompt,
        selected.recipeSlug,
        configuration,
      );
      if (fixResult.fixes.length > 0) {
        budget.trace?.("fixer.applied", {
          stage: "configure_selected_recipe",
          fixes: fixResult.fixes,
        });
      }
      const defaults = Object.fromEntries(
        source.parameters.map((parameter) => [
          parameter.name,
          parameter.default,
        ]),
      );
      verifyExplicitQuantities(request.prompt, selected.recipeSlug, {
        ...configuration,
        instances: configuration.instances.map((instance) => ({
          ...instance,
          overrides: { ...defaults, ...instance.overrides },
        })),
      });
      const coverage = coverageFor(
        request.prompt,
        intent,
        selected,
        configuration.coverage,
      );
      const document = emptyAuthoredDocument();
      document.presentation = {
        version: 1,
        mode: "board",
        items: [],
        groups: [],
        startView: { x: 0, y: 0, width: 800, height: 600 },
        navigation: { mode: "bounded", minZoom: 0.25, maxZoom: 2 },
        immersive: { startup: "board", allowReturnToBoard: true, overlays: [] },
      };
      const draft = new AuthoringTransaction(request.requestId, document);
      const lesson =
        coverage.level === "partial"
          ? source.document.lesson
          : (configuration.lesson ?? source.document.lesson);
      const authoredLesson = {
        ...lesson,
        instruction:
          coverage.level === "partial"
            ? `${lesson.instruction} ${coverage.explanation}`
            : lesson.instruction,
        explanation: [
          source.document.lesson.explanation,
          lesson.explanation === source.document.lesson.explanation
            ? ""
            : lesson.explanation,
          coverage.explanation,
        ]
          .filter(Boolean)
          .join("\n"),
      };
      const operations: ToolRequest[] = configuration.instances.map(
        (instance) => ({
          tool: "insert_recipe",
          arguments: {
            recipe: selected.recipeSlug,
            version: selected.version,
            ...instance,
          },
        }),
      );
      operations.push(
        { tool: "set_lesson", arguments: authoredLesson },
        {
          tool: "arrange",
          arguments: {
            template:
              configuration.instances.length > 1
                ? "comparison"
                : request.viewport.width < 700
                  ? "vertical"
                  : "scene-with-sidebar",
            main: [],
            controls: [],
            results: [],
            narrowOrder: [],
            preserveLocked: true,
          },
        },
      );
      execute(draft, operations, budget, "creation", report);
      const recipe = finalizeRecipe(draft.document, {
        id: `generated/${request.requestId}`,
        tags: source.tags,
        assumptions: source.assumptions,
      });
      verifyCoverage(recipe, selected);
      return { draft, recipe, coverage };
    };
    const selectedDetails = selectedContract(selected.recipeSlug);
    const contract = {
      recipe: selectedDetails.recipe,
      version: selectedDetails.version,
      title: selectedDetails.title,
      parameters: selectedDetails.parameters,
      startingValues: selectedDetails.startingValues,
      limitations: selectedDetails.limitations,
      existingInteractions: selected.interactionNames,
      existingObservations: selected.observationNames,
      supportedConcepts: selected.supports,
    };
    const configuration = await stage(
      "configure_selected_recipe",
      request,
      budget,
      toJsonSchema(creationResponseSchema(selected.recipeSlug)),
      {
        ...contract,
        policy:
          "Return one instance per independent model. When the request names instances A and B, use aliases exactly A and B, not rectangle_A/rectangle_B or longer names. Preserve explicit values exactly, converting units only when equivalent. Arithmetic task is complete, looping false and initial activity idle. Bridge overrides position/magnitude target the connected load. Each covered entry MUST be copied exactly from supportedConcepts. Put unavailable requested quantities in omitted, including exact deflection in millimetres. Deflection calculation is NOT supported. Explain only actual capabilities and omissions. Omit lesson to retain authored wording. Set extend:true only when the request needs an additional compatible control, observation, component, or structural regeneration beyond the supplied recipe.",
      },
      (value) => parseCreationResponse(value, selected.recipeSlug),
      intent,
      {
        policy:
          "Return ONE JSON object with instances, coverageLevel, covered, omitted, explanation. The coverage fields are flat, not a nested coverage object. Begin with { and end with }. The example shows structure and registered defaults only; replace quantities with originalRequest. Omit lesson and extend unless additional wording or components are requested. Partial coverage uses registered wording plus the limitation, so omit lesson for partial results.",
        exampleResponse: {
          instances: (intent.suggestedStructure === "comparison"
            ? ["A", "B"]
            : ["A"]
          ).map((alias) => ({ alias, overrides: contract.startingValues })),
          coverageLevel: "full",
          covered: [selected.supports[0]],
          omitted: [],
          explanation: "",
        },
      },
      1024,
      (parsed) => {
        construct(parsed, false);
      },
    );
    let { draft, recipe, coverage } = construct(configuration, true);
    if (configuration.extend) {
      const applyExtensions = (
        target: AuthoringTransaction,
        operations: ToolRequest[],
        report: boolean,
      ) => {
        execute(target, operations, budget, "extensions", report);
        if (!operations.some((op) => op.tool === "arrange"))
          execute(
            target,
            [
              {
                tool: "arrange",
                arguments: {
                  template:
                    configuration.instances.length > 1
                      ? "comparison"
                      : "scene-with-sidebar",
                  main: [],
                  controls: [],
                  results: [],
                  narrowOrder: [],
                  preserveLocked: true,
                },
              },
            ],
            budget,
            "extension-arrangement",
            report,
          );
        const document = target.document;
        if (
          coverage.level === "partial" &&
          !document.lesson.explanation.includes(coverage.explanation)
        )
          throw new Error(
            "Extensions must retain the lesson's coverage limitation",
          );
        const result = finalizeRecipe(document, recipe);
        verifyCoverage(result, selected);
        return result;
      };
      const extension = await stage(
        "compatible_additions",
        request,
        budget,
        followupContract(draft.document, true),
        {
          policy:
            "Add only the compatible additions explicitly requested. Existing controls and observations are already bound: do not duplicate the same decision. At most twelve total authored operations including recipe insertion and arrangement.",
          targets: activeHandles(draft.document),
        },
        (value) => {
          const parsed = parseAuthoredFollowup(value, draft.document);
          if (parsed.status === "authored")
            applyExtensions(draft.fork(), parsed.operations, false);
          return parsed;
        },
        intent,
      );
      if (extension.status === "authored")
        recipe = applyExtensions(draft, extension.operations, true);
      else {
        coverage = {
          level: "partial",
          covered: coverage.covered,
          omitted: [...coverage.omitted, extension.message],
          explanation: [coverage.explanation, extension.message]
            .filter(Boolean)
            .join(" "),
        };
        const document = draft.document;
        document.lesson.instruction += ` ${extension.message}`;
        document.lesson.explanation += `\n${extension.message}`;
        recipe = finalizeRecipe(document, recipe);
      }
    }
    budget.check();
    const result = parseGenerationResult(
      {
        protocolVersion: 1,
        status: "created",
        requestId: request.requestId,
        expectedSessionId: null,
        expectedAuthoredRevision: null,
        recipe,
        coverage,
        learnerExplanation: intent.goal,
      },
      request,
    );
    trace?.("finalization", {
      status: result.status,
      nodes: recipe.document.nodes.length,
      connections: recipe.document.connections.length,
      coverage,
      budget: {
        calls: budget.calls,
        repairs: budget.repairs,
        decisionCalls: budget.decisionCalls,
      },
    });
    return result;
  } catch (error) {
    budget.check();
    throw error instanceof PlannerError
      ? error
      : new PlannerError(
          error instanceof Error
            ? error.message
            : "Unable to construct a valid lesson.",
          502,
        );
  } finally {
    activeRequests--;
  }
}
