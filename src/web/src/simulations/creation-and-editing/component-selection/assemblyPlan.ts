import {
  boolean,
  choice,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import { parameterLeaves } from "../../registry/contracts/controlContract";
import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { TeachingIntent } from "../intent-interpreter/contracts";
import type { assemblyCandidates } from "./assemblyCandidates";
import type { CapabilityCard } from "./recipeCapabilities";
import {
  resolveRequiredInputs,
  type RequiredInputs,
} from "../composer/choosePresentation";
import { selectCapability } from "./selectAssemblies";

export type AssemblyPlan = {
  activities: string[];
  title: string;
  instruction: string;
  omitted: string[];
  bindings: RequiredInputs[];
};
export async function selectAssemblyPlan(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
  retrieval: ReturnType<typeof assemblyCandidates>,
) {
  const { ranked } = retrieval;
  const cards = retrieval.cards;
  if (!cards.length)
    return {
      activities: [],
      bindings: [],
      title: intent.goal.slice(0, 100),
      instruction: intent.question ?? intent.goal,
      omitted: [
        "Retrieval found no available activities.",
      ],
    };
  let recommendation: string | undefined;
  if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
    const capabilities: CapabilityCard[] = cards.map((card) => ({
      id: card.candidate,
      version:
        ranked[
          retrieval.cards.findIndex((peer) => peer.candidate === card.candidate)
        ].recipe.version,
      recipeSlug: card.candidate,
      summary: `${card.title}: ${card.description}`,
      supports: ranked[
        retrieval.cards.findIndex((peer) => peer.candidate === card.candidate)
      ].models.flatMap((node) => {
        const definition = publicDefinition(node);
        return definition.teaching?.concepts ?? [definition.title];
      }),
      limitations: card.limitations,
      interactionNames: card.interactions,
      observationNames: card.observations,
      names: [card.title],
    }));
    const selected = await selectCapability(
      request.prompt,
      intent,
      capabilities,
      budget,
      () => budget.decision,
    );
    if (selected.status === "selected")
      recommendation = selected.capability.recipeSlug;
    // Uncertainty is a retrieval hint, not evidence that a supported experiment is impossible.
  }
  const count =
    intent.instanceCount ??
    (intent.suggestedStructure === "comparison" ? 2 : 1);
  const activities: string[] = [];
  const bindings: RequiredInputs[] = [];
  const rejected = new Set<string>();
  let remaining = count;
  let complete = false;
  while (remaining > 0 && !complete) {
    const candidates = cards.filter(
      (card) => !rejected.has(card.candidate),
    );
    if (!candidates.length || rejected.size >= 3)
      return {
        activities: [],
        bindings: [],
        title: intent.goal.slice(0, 100),
        instruction: intent.question ?? intent.goal,
        omitted: [
          "The offered activities could not resolve all requested input bindings.",
        ],
      };
    const schema = object({
      candidate: choice(
        ...candidates.map((card) => card.candidate),
        "unavailable",
      ),
      complete: boolean,
    });
    budget.trace?.("stage", { task: "select_capability" });
    const answer = await requestStructured<{ candidate: string; complete: boolean }>(
      [
        {
          role: "system",
          content:
            'Choose ONE offered activity by its models and scientific meaning, preserving the ORIGINAL request. Return only {"candidate":"supplied-id","complete":true} when this activity together with alreadySelected covers the whole request. A single activity can already contain several objects or a complete comparison; do not duplicate it merely to match an inferred instance count. Use complete:false only when another independent activity is still needed. The remainingInstances value and recommendation are hints, not semantic eligibility gates. Registered commands can receive learner controls even if no control is currently wired. Return {"candidate":"unavailable","complete":false} if none supports the missing meaning. Do not return settings, layouts or a plan.',
        },
        {
          role: "user",
          content: JSON.stringify({
            request: request.prompt,
            remainingInstances: remaining,
            recommendation,
            alreadySelected: activities.map((candidate) =>
              cards.find((card) => card.candidate === candidate)?.title,
            ),
            candidates: candidates.map((card) => {
              return {
                id: card.candidate,
                label: card.title,
                meaning: card.description,
                instances: card.instanceCount,
                models: ranked[
                  retrieval.cards.findIndex((peer) => peer.candidate === card.candidate)
                ].models.map((node) => {
                  const definition = publicDefinition(node);
                  return {
                    title: definition.title,
                    meaning: definition.description.slice(0, 400),
                    commands: Object.entries(definition.commands).map(([command, contract]) => ({
                      command,
                      meaning: contract.description,
                      fields: parameterLeaves(contract.arguments).map(({ path, schema }) => ({
                        field: path,
                        unit: "unit" in schema ? schema.unit : undefined,
                      })),
                    })),
                  };
                }),
                inputs: ranked[
                  retrieval.cards.findIndex(
                    (peer) => peer.candidate === card.candidate,
                  )
                ].bindings.map((binding) => ({
                  labels: binding.labels,
                  command: binding.command,
                  field: binding.field,
                  meaning: binding.meaning.slice(0, 160),
                  instances: binding.wires.length,
                })),
                outputs: card.observations
                  .filter(
                    (name) => !["configuration", "appearance"].includes(name),
                  )
                  .slice(0, 8),
              };
            }),
          }),
        },
      ],
      (content) => {
        const { value } = parseArgumentJson(content);
        validateValue(schema, value);
        return value as { candidate: string; complete: boolean };
      },
      'Return only candidate and complete, deciding coverage from the original request and supplied models.',
      budget.signal,
      {
        budget,
        stage: "assembly_plan",
        schema: toJsonSchema(schema),
        maxTokens: 128,
        onEvent: (event, data) =>
          budget.trace?.(`assembly_plan.${event}`, data),
      },
    );
    if (answer.candidate === "unavailable")
      return {
        activities: [],
        bindings: [],
        title: intent.goal.slice(0, 100),
        instruction: intent.question ?? intent.goal,
        omitted: ["The offered activities cannot support this request."],
      };
    const source =
      ranked[
        retrieval.cards.findIndex((card) => card.candidate === answer.candidate)
      ].recipe;
    const resolved = await resolveRequiredInputs(
      request,
      intent,
      budget,
      source,
    );
    if (resolved.unsupported) {
      rejected.add(answer.candidate);
      budget.trace?.("assembly_plan.rejected", {
        candidate: answer.candidate,
        recipe: source.id,
        reason: resolved.unsupported,
      });
      continue;
    }
    bindings.push(resolved);
    activities.push(answer.candidate);
    complete = answer.complete;
    remaining -= candidates.find(
      (card) => card.candidate === answer.candidate,
    )!.instanceCount;
  }
  if (!complete)
    return {
      activities: [],
      bindings: [],
      title: intent.goal.slice(0, 100),
      instruction: intent.question ?? intent.goal,
      omitted: ["Activity selection did not cover the request within the existing instance budget."],
    };
  const question = intent.question ?? intent.goal;
  const title =
    Array.from(question).length <= 100
      ? question
      : Array.from(
          cards.find((card) => card.candidate === activities[0])?.title ??
            intent.goal,
        )
          .slice(0, 100)
          .join("");
  const result: AssemblyPlan = {
    activities,
    bindings,
    title,
    instruction: question,
    omitted: [],
  };
  budget.trace?.("assembly_plan.selection", result);
  return result;
}
