import {
  choice,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { publicDefinition } from "../../registry/index";
import type { GenerationBudget } from "../budget";
import type { GenerationRequest } from "../input/contracts";
import { parseArgumentJson } from "../input/inference/parseJson";
import { toJsonSchema } from "../input/inference/structuredSchema";
import { requestStructured } from "../input/inference/transport";
import type { TeachingIntent } from "../intent-interpreter/contracts";
import type { assemblyCandidates } from "./assemblyCandidates";
import type { CapabilityCard } from "./recipeCapabilities";
import { selectCapability } from "./selectAssemblies";

const text = (maxLength = 240) => ({
  type: "string" as const,
  minLength: 1,
  maxLength,
});
export type AssemblyPlan = {
  activities: string[];
  title: string;
  instruction: string;
  omitted: string[];
};
export async function selectAssemblyPlan(
  request: GenerationRequest,
  intent: TeachingIntent,
  budget: GenerationBudget,
  {
    ranked,
    cards,
    requiredCapabilities,
  }: ReturnType<typeof assemblyCandidates>,
) {
  let recommendation: string | undefined;
  if ((process.env.PLANNER_MODE ?? "hybrid") === "hybrid") {
    const capabilities: CapabilityCard[] = cards.map((card, index) => ({
      id: card.candidate,
      version: ranked[index].recipe.version,
      recipeSlug: card.candidate,
      summary: `${card.title}: ${card.description}`,
      supports: ranked[index].models.flatMap((node) => {
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
  const slots = Array.from(
    { length: count },
    (_, index) => `experiment${index + 1}`,
  );
  const example = cards.find((card) => count % card.instanceCount === 0);
  const selectionSchema = object({
    ...Object.fromEntries(
      slots.map((slot) => [
        slot,
        choice(
          ...cards.map((card) => card.candidate),
          "covered",
          "unavailable",
        ),
      ]),
    ),
    omitted: { type: "array", minItems: 0, maxItems: 6, items: text() },
  });
  budget.trace?.("stage", { task: "select_capability" });
  return await requestStructured<AssemblyPlan>(
    [
      {
        role: "system",
        content:
          "Choose one candidate ID STRING for each supplied experiment slot. Return ONLY those exact slot keys and omitted. Never return an activities array or copy the candidate list. Slots count independent model instances, NOT whole activities. Each candidate declares instanceCount: if an activity already contains the requested comparison, select it once and mark the remaining slots covered. Repeat an ID only when another copy is needed to reach the requested instance count. Choose different model types only when requested. Honor requiredCapabilities and the accepted teaching goal, interactions and observations together; a matching topic word alone is insufficient. Equivalent implementations are alternatives. Check the real descriptions and interactions. The recommendation is advisory. Independent activities cannot be claimed as a coupled simulation unless an activity implements that relationship. Use unavailable for unsupported core behavior and explain it in omitted. Do not author lesson text or wiring.",
      },
      {
        role: "user",
        content: JSON.stringify({
          request: request.prompt,
          intent,
          recommendation,
          requiredCapabilities,
          candidates: cards,
          experimentSlots: slots,
          exampleResponse: example
            ? {
                ...Object.fromEntries(
                  slots.map((slot, index) => [
                    slot,
                    index % example.instanceCount === 0
                      ? example.candidate
                      : "covered",
                  ]),
                ),
                omitted: [],
              }
            : undefined,
          responseSchema: toJsonSchema(selectionSchema),
        }),
      },
    ],
    (content) => {
      const { value } = parseArgumentJson(content);
      validateValue(selectionSchema, value);
      const selected = value as Record<string, unknown> & {
        omitted: string[];
      };
      const choices = slots.map((slot) => selected[slot] as string);
      const result: AssemblyPlan = {
        omitted: selected.omitted,
        title: Array.from(intent.question ?? intent.goal)
          .slice(0, 100)
          .join(""),
        instruction: intent.question ?? intent.goal,
        activities: choices.includes("unavailable")
          ? []
          : choices.filter((choice) => choice !== "covered"),
      };
      if (result.activities.length > 3)
        throw new Error(
          "Use at most three total independent activity instances.",
        );
      const available = new Set(
        result.activities.flatMap((candidate) => [
          ...ranked[cards.findIndex((card) => card.candidate === candidate)]
            .capabilities,
        ]),
      );
      const missing = requiredCapabilities.filter(
        (capability) => !available.has(capability),
      );
      if (result.activities.length && missing.length)
        throw new Error(
          `Selected activities lack requested capabilities: ${missing.join(", ")}. Select activities whose real contracts support these values. Do not substitute an unrelated activity.`,
        );
      const represented = result.activities.reduce(
        (sum, candidate) =>
          sum +
          cards.find((card) => card.candidate === candidate)!.instanceCount,
        0,
      );
      if (!choices.includes("unavailable") && represented !== count)
        throw new Error(
          `Selected activities contain ${represented} independent model instances; the request needs ${count}. An activity with multiple instances must be selected once, with its additional slots marked covered.`,
        );
      return result;
    },
    "Return one candidate ID string per supplied experiment slot and omitted. Use covered only for instances already contained in a selected activity. Preserve the requested total model instance count. Use exactly the supplied slot keys, never an activities array or additional slots.",
    budget.signal,
    {
      budget,
      stage: "assembly_plan",
      schema: toJsonSchema(selectionSchema),
      maxTokens: 256,
      onEvent: (event, data) => budget.trace?.(`assembly_plan.${event}`, data),
    },
  );
}
