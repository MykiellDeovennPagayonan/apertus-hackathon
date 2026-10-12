import { publicDefinitions } from "../../simulations/components/catalog";
import {
  finalizeRecipe,
  type ToolRequest,
} from "../../simulations/runtime/authoring/operations";
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
import { GenerationBudget, type TraceSink } from "./budget";
import {
  activeHandles,
  type CapabilityCard,
  capabilityCards,
  retrieveCapabilities,
  selectedContract,
} from "./catalog";
import { compose } from "./compose";
import { requiresLayaComposition } from "./compositionPolicy";
import { createFromAssemblies } from "./assemblyCreation";
import { verifyExplicitQuantities } from "./constraints";
import type { ConstructionSink } from "./construction";
import { ConstructionPublisher } from "./constructionPublisher";
import { planEdit } from "./edit";
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
import { selectCapability } from "./selection/selectCapability";
import {
  creationResponseSchema,
  followupContract,
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
    (content) => {
      let value = parseStageJson(
        content,
        schema.type === "array" ? "array" : "object",
      );
      const wrappers: string[] = [];
      for (let depth = 0; depth < 2; depth++) {
        if (!value || typeof value !== "object" || Array.isArray(value)) break;
        const record = value as Record<string, unknown>;
        const keys = Object.keys(record);
        const key = keys[0];
        const argumentStage = task === "runtime_command_arguments";
        const declared = (schema.properties ?? {}) as Record<string, unknown>;
        if (
          keys.length === 1 &&
          !(key in declared) &&
          (key === task ||
            (argumentStage && ["arguments", "command_arguments"].includes(key)))
        ) {
          value = record[key];
          wrappers.push(key);
        } else if (
          argumentStage &&
          (keys.length === 2 || keys.length === 3) &&
          keys.includes("command") &&
          keys.includes("arguments") &&
          keys.every((key) => ["command", "arguments", "node"].includes(key)) &&
          (!("node" in record) ||
            record.node ===
              (contract as { selected?: { node?: string } }).selected?.node) &&
          !("command" in declared) &&
          record.command ===
            (contract as { selected?: { command?: string } }).selected?.command
        ) {
          value = record.arguments;
          wrappers.push("matching selected command");
        } else break;
      }
      const result = parse(value);
      if (wrappers.length) {
        budget.trace?.(`${task}.formatNormalized`, {
          kind: "bounded known stage or argument envelope",
          stage: task,
          wrappers,
        });
      }
      return result;
    },
    `Return only this stage's schema, preserving the original constraints. Do not repeat valid prior operations.${
      task === "teaching_intent"
        ? " Keep each of concepts, interactions, and observations to at most THREE concise entries. Combine related concepts into one entry. Do not list individual terms as separate concepts. This is a compact intent summary, not a glossary."
        : task === "runtime_command_arguments"
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
  budget.trace?.("selection.start", {});
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
async function planPromptInternal(
  input: GenerationRequest,
  budget: GenerationBudget,
): Promise<GenerationResult> {
  const request = parseGenerationRequest(input);
  const mode = process.env.PLANNER_MODE ?? "hybrid";
  if (!["hybrid", "apertus"].includes(mode))
    throw new PlannerError("PLANNER_MODE must be hybrid or apertus.", 503);
  const limit = Number(process.env.PLANNER_MAX_CONCURRENT_REQUESTS ?? 1);
  if (!Number.isInteger(limit) || limit < 1 || limit > 16)
    throw new PlannerError("Invalid planner concurrency.", 503);
  budget.check();
  if (activeRequests >= limit)
    throw new PlannerError("Planner is busy. Please try again shortly.", 429);
  activeRequests++;
  try {
    const edit =
      request.purpose === "create" ? null : await planEdit(request, budget);
    if (edit) return parseGenerationResult(edit, request);
    const requiredComposition = requiresLayaComposition();
    const intent = await stage(
      "teaching_intent",
      request,
      budget,
      toJsonSchema(intentResponseSchema(request.prompt)),
      {
        policy:
          "Describe the goal, concepts, actions and observations concisely. Use 1–3 short entries per concepts/interactions/observations list; do not invent extra interactions or feedback. question is ONE short learning question, in familiar language, about the visible relationship the user wants to explore. Mention all explicitly requested adjustments in that question. Never describe an adjustable quantity as constant or fixed unless the user requested that constraint. Never begin it with Design, Create, Build or Implement. explicitConstraints is ALWAYS an array of {meaning, sourceId} objects. Select sourceId from constraintSources for each explicit quantity, unit, negation or starting constraint. The application attaches the exact original text; do not return sourceText. Multiple constraints may refer to the same source. Do not claim supported capabilities. suggestedStructure is 'comparison' when the learner requests multiple independent model instances or comparing conditions. Otherwise use 'single'. instanceCount is the requested number of independent instances (1–3): default 1 for a single experiment, 2 for a comparison without an explicit count. Counts of particles, measurements or settings are not model instances. comparisonConditions is 'different' for requested distinct starting conditions, 'same' for explicitly equal starting conditions, otherwise 'unspecified'.",
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
          instanceCount: 1,
          comparisonConditions: "unspecified",
          question: "How does changing the value change the result?",
        },
      },
      768,
    );
    const isBuilderModifyingComposite =
      Boolean(request.active?.sessionId?.startsWith("builder-")) &&
      (request.active?.recipe.document.nodes.length ?? 0) > 0;

    if (!request.active || request.purpose === "create")
      return await createFromAssemblies(request, intent, budget);

    const selected =
      isBuilderModifyingComposite || requiredComposition
        ? null
        : await select(request, intent, budget);
    if (!selected) {
      budget.trace?.("selection.fallback_to_composition", {
        reason: "No single recipe fits request",
      });
      return await compose(request, intent, budget, Boolean(request.active));
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
    budget.trace?.("validation.start", {});
    let { draft, recipe, coverage } = construct(configuration, true);
    await budget.construction?.publish(
      draft.document,
      draft.revision,
      "arrangement",
    );
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
      if (extension.status === "authored") {
        recipe = applyExtensions(draft, extension.operations, true);
        await budget.construction?.publish(
          draft.document,
          draft.revision,
          "arrangement",
        );
      } else {
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
    budget.trace?.("finalization", {
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

/** Shared interpretation/selection; the destination only changes presentation and activation. */
export async function planPrompt(
  input: GenerationRequest,
  signal?: AbortSignal,
  trace?: TraceSink,
  sink?: ConstructionSink,
): Promise<GenerationResult> {
  const request = parseGenerationRequest(input);
  const budget = new GenerationBudget(signal, trace);
  const initial = request.active?.recipe.document ?? emptyAuthoredDocument();
  const publisher =
    request.destination === "builder" &&
    request.construction === "live" &&
    sink &&
    (request.purpose === "create" ||
      !request.active?.recipe.document.nodes.length)
      ? new ConstructionPublisher(
          request.requestId,
          initial,
          sink,
          budget.signal,
        )
      : undefined;
  budget.construction = publisher;
  try {
    const result = await planPromptInternal(request, budget);
    if (
      publisher &&
      (result.status === "created" || result.status === "updated")
    ) {
      if (
        result.recipe.document.nodes.some(
          (node) => !initial.nodes.some((existing) => existing.id === node.id),
        )
      )
        result.recipe.document = publisher.finalize(result.recipe.document);
      parseGenerationResult(result, request);
      await publisher.publish(
        result.recipe.document,
        publisher.latestRevision,
        "checking",
      );
    }
    budget.check();
    return parseGenerationResult(result, request);
  } catch (error) {
    budget.check();
    throw error;
  }
}
