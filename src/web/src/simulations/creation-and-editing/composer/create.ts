import { premadeRecipe } from "../../registry/recipes/premade";
import { emptyAuthoredDocument } from "../authoring-engine/document";
import { finalizeRecipe } from "../authoring-engine/finalizeRecipe";
import { fixConfiguration } from "../authoring-engine/normalizeOperations";
import type { ToolRequest } from "../authoring-engine/operations";
import { AuthoringTransaction } from "../authoring-engine/transaction";
import type { GenerationBudget } from "../budget";
import {
  activeHandles,
  selectedContract,
} from "../component-selection/recipeCapabilities";
import { select } from "../component-selection/selectRecipe";
import type { GenerationRequest } from "../input/contracts";
import { requestStage } from "../input/inference/stage";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { type GenerationResult, parseGenerationResult } from "../input/results";
import { interpretCreation } from "../intent-interpreter/interpretCreation";
import { coverageFor, verifyCoverage } from "../validator/coverage";
import { verifyExplicitQuantities } from "../validator/requestConstraints";
import { compose } from "./composeFromComponents";
import { createFromAssemblies } from "./createFromAssemblies";
import { requiresLayaComposition } from "./policy";
import {
  creationResponseSchema,
  followupContract,
  parseAuthoredFollowup,
  type parseCreation,
  parseCreationResponse,
} from "./recipeArguments";
import { execute } from "./recipeCreation";
export async function createSimulation(
  request: GenerationRequest,
  budget: GenerationBudget,
): Promise<GenerationResult> {
  const requiredComposition = requiresLayaComposition();
  const intent = await interpretCreation(request, budget);
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
      source.parameters.map((parameter) => [parameter.name, parameter.default]),
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
  const configuration = await requestStage(
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
    const extension = await requestStage(
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
}
