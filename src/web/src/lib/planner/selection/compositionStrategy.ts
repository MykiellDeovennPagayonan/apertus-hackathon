import { publicDefinitions } from "../../../simulations/components/catalog";
import { compositionRequirements } from "../../../simulations/components/catalog/explorationTeaching";
import type { ChoiceQuestion } from "../../decisions/contracts";
import { buildInitialCard, type ComponentBucketCard } from "../bucket";
import type { GenerationBudget } from "../budget";
import { PlannerError } from "../errors";
import type { TeachingIntent } from "../schema";
import { acceptChoice } from "./acceptance";
export interface CompositionStrategy {
  structure: "single" | "comparison";
  guidance: string;
  definition: string;
}
export async function selectCompositionStrategy(
  prompt: string,
  intent: TeachingIntent,
  cards: ComponentBucketCard[],
  budget: GenerationBudget,
): Promise<CompositionStrategy> {
  budget.consumeDecisionCall();
  const { provider, policy } = budget.decision;
  const candidates = cards.filter(
    (c) =>
      publicDefinitions.get(c.id)?.category === "models" &&
      !(
        c.id === "models/SinusoidalSignal" &&
        cards.some((p) => p.id === "data/SignalSuperposition")
      ),
  );
  // A binary topic-vs-none question can be poorly calibrated by a choice model.
  // Use registered sibling topics as contrast, retaining every acceptance gate.
  // A contrast-only choice is rejected rather than silently expanding retrieval.
  const retrievedIds = new Set(candidates.map((c) => c.id));
  const groups = new Set(
    candidates
      .map((c) => compositionRequirements[c.id]?.selectionGroup)
      .filter(Boolean),
  );
  const contrasting = Object.entries(compositionRequirements)
    .filter(
      ([id, r]) =>
        r.selectionGroup &&
        groups.has(r.selectionGroup) &&
        !retrievedIds.has(id),
    )
    .map(([id]) => buildInitialCard(id))
    .filter((card): card is ComponentBucketCard => card !== null)
    .slice(0, 3);
  const choices = [...candidates, ...contrasting].map((c) => ({
    card: c,
    key:
      compositionRequirements[c.id]?.selectionKey ??
      (c.id.split("/").pop() ?? c.id)
        .replace(/([a-z])([A-Z])/g, "$1-$2")
        .toLowerCase(),
  }));
  const question: ChoiceQuestion = {
    type: "choice" as const,
    instructions: "Select the simulation matching the user request.",
    criteria: {
      ...Object.fromEntries(
        choices.map(({ card, key }) => [
          key,
          compositionRequirements[card.id]?.topic ?? card.title,
        ]),
      ),
      unclear: "None of these topics",
    },
  };
  try {
    const response = await provider(
      {
        state: prompt,
        questions: { strategy: question },
      },
      budget.signal,
    );
    budget.check();
    const accepted =
      response.provider === "laya"
        ? acceptChoice(
            response.answers.strategy,
            question,
            policy.probabilityGate,
            policy.confidenceGate,
          )
        : null;
    budget.trace?.("composition.decision", {
      status: accepted ? "accepted" : "rejected",
      provider: response.provider,
      model: response.model,
      answer: response.answers.strategy,
      candidates: choices.map(({ card, key }) => ({
        definition: card.id,
        key,
        label: question.criteria[key],
      })),
      durationMs: response.durationMs,
      timing: response.timing,
      usage: response.usage ?? null,
    });
    if (!accepted)
      throw new PlannerError(
        "Laya could not select a supported composition confidently. Please clarify the experiment.",
        422,
      );
    const candidate = choices.find((c) => c.key === accepted.choice)?.card;
    if (!candidate || !retrievedIds.has(candidate.id))
      throw new PlannerError("Laya selected an unavailable capability", 422);
    return {
      definition: candidate.id,
      structure: intent.suggestedStructure,
      guidance: `${candidate.summary} ${candidate.limitations.join(" ")}`,
    };
  } catch (error) {
    if (!(error instanceof PlannerError))
      budget.trace?.("composition.decision", {
        status: "unavailable",
        reason: error instanceof Error ? error.message : "Decision failed",
      });
    budget.check();
    throw error instanceof PlannerError
      ? error
      : new PlannerError(
          "Laya selection is unavailable. Your current experiment is preserved; check the local Laya service.",
          503,
        );
  }
}
