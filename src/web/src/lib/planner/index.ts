import { publicDefinition } from "../../simulations/components/catalog";
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
import { validateValue } from "../../simulations/runtime/parameterSchema";
import { premadeRecipe } from "../../simulations/runtime/recipes/registry";
import { toJsonSchema } from "../apertus/structuredSchema";
import { requestStructured } from "../apertus/transport";
import { selectCapability } from "../laya/selection";
import { GenerationBudget, type TraceSink } from "./budget";
import {
  activeHandles,
  type CapabilityCard,
  capabilityCards,
  retrieveCapabilities,
  selectedContract,
} from "./catalog";
import { verifyExplicitQuantities } from "./constraints";
import { stageMessages } from "./context";
import { coverageFor, verifyCoverage } from "./coverage";
import { PlannerError } from "./errors";
import {
  type Coverage,
  exactKeys,
  type GenerationRequest,
  type GenerationResult,
  intentSchema,
  parseGenerationRequest,
  parseGenerationResult,
  parseIntent,
  record,
  type TeachingIntent,
} from "./schema";
import {
  creationSchema,
  followupContract,
  followupModeSchema,
  parseAuthoredFollowup,
  parseCreation,
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
    (content) => parse(JSON.parse(content)),
    "Return only this stage's schema, preserving the original constraints. Do not repeat valid prior operations.",
    budget.signal,
    {
      budget,
      schema,
      maxTokens,
      stage: task,
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
    budget.trace?.("selection.laya", {
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
    );
    if (selected) return selected;
  } else
    budget.trace?.("selection.laya", {
      status: "skipped",
      reason: "Apertus-only mode",
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
  const handles = activeHandles(current.recipe.document);
  if (!handles.length)
    return {
      protocolVersion: 1,
      status: "unsupported",
      requestId: request.requestId,
      message:
        "Prompt changes currently support addition/subtraction, rectangle area/perimeter, and truss bridge lessons. You can continue exploring this lesson or Remix it.",
    };
  const mode = await stage(
    "followup_mode",
    request,
    budget,
    toJsonSchema(followupModeSchema),
    {
      policy:
        "Explicit start/initial/default, adding components/observations, layout, or wording means authored. Perform/play/reset/move now means runtime. An ordinary value change without starting/default wording is a learner runtime action. Creating a different lesson means new. Never capture a running checkpoint.",
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
    const schema = followupContract(current.recipe.document, false);
    const response = await stage(
      "runtime_arguments",
      request,
      budget,
      schema,
      {
        policy:
          "Read accepted runtime values to preserve sibling fields. Send only scoped declared commands.",
        targets: handles.map(
          ({ configurationSchema, configuration, ...rest }) => rest,
        ),
      },
      (value) => {
        record(value);
        exactKeys(value, ["status", "commands", "message"]);
        if (
          !["runtime", "unsupported"].includes(String(value.status)) ||
          typeof value.message !== "string" ||
          !value.message.trim() ||
          value.message.length > 500 ||
          !Array.isArray(value.commands) ||
          value.commands.length > 8 ||
          (value.status === "runtime" && !value.commands.length) ||
          (value.status === "unsupported" && value.commands.length)
        )
          throw new Error("Invalid runtime outcome");
        for (const command of value.commands) {
          record(command);
          exactKeys(command, ["node", "command", "arguments"]);
          const node = current.recipe.document.nodes.find(
            (n) => n.id === command.node,
          );
          const contract =
            node &&
            publicDefinition(node.definition).commands[String(command.command)];
          if (
            !contract ||
            !handles.some((handle) => handle.target === command.node)
          )
            throw new Error("Unknown runtime command");
          validateValue(contract.arguments, command.arguments);
        }
        const commands = value.commands as ScopedCommand[];
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
        if (!accepted.accepted) throw new Error(accepted.error);
        return value as {
          status: "runtime" | "unsupported";
          commands: ScopedCommand[];
          message: string;
        };
      },
      undefined,
      current.runtimeContext,
    );
    if (response.status === "unsupported")
      return {
        protocolVersion: 1,
        status: "unsupported",
        requestId: request.requestId,
        message: response.message,
      };
    return {
      protocolVersion: 1,
      status: "runtime_action",
      requestId: request.requestId,
      expectedSessionId: current.sessionId,
      expectedInteractionRevision: current.interactionRevision,
      commands: response.commands,
      message: response.message,
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
        "Only change authored fields explicitly requested. Nested task objects must be complete. Keep unrelated authored values. Add an observation through add_observation; do not configure a disconnected display.",
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
      toJsonSchema(intentSchema),
      {
        policy:
          "Describe the goal, concepts, actions and observations. Copy exact original sourceText for each explicit quantity, unit, negation and starting constraint. Do not claim supported capabilities.",
      },
      (value) => parseIntent(value, request.prompt),
    );
    const selected = await select(request, intent, budget);
    if (!selected)
      return {
        protocolVersion: 1,
        status: "unsupported",
        requestId: request.requestId,
        message:
          "I can currently build addition/subtraction, rectangle area/perimeter, and truss bridge lessons. This request has no useful supported teaching overlap.",
      };
    const source = premadeRecipe(selected.recipeSlug);
    const construct = (
      configuration: ReturnType<typeof parseCreation>,
      report: boolean,
    ) => {
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
      const lesson = configuration.lesson ?? source.document.lesson;
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
    const configuration = await stage(
      "configure_selected_recipe",
      request,
      budget,
      toJsonSchema(creationSchema(selected.recipeSlug)),
      {
        ...selectedContract(selected.recipeSlug),
        policy:
          "Return one instance per independent model. Comparison aliases A/B must retain their identity. Preserve explicit values exactly, converting units only when equivalent. Arithmetic task is complete, looping false and initial activity idle. Bridge overrides position/magnitude target the connected load. Do not invent deflection. Report truthful covered/omitted concepts. Omit lesson to retain the authored wording. Set extend:true only when the request needs an additional compatible control, observation, component, or structural regeneration beyond the supplied recipe.",
      },
      (value) => {
        const parsed = parseCreation(value, selected.recipeSlug);
        construct(parsed, false);
        return parsed;
      },
      intent,
      undefined,
      1024,
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
        layaCalls: budget.layaCalls,
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
