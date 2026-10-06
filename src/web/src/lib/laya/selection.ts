import type { GenerationBudget } from "../planner/budget";
import type { CapabilityCard } from "../planner/catalog";
import type { TeachingIntent } from "../planner/schema";
import { createLayaClient } from "./client";
import { readLayaConfig } from "./config";
import { acceptChoice } from "./decisions";
import type { ChoiceQuestion } from "./types";

export async function selectCapability(
  prompt: string,
  intent: TeachingIntent,
  cards: CapabilityCard[],
  budget: GenerationBudget,
): Promise<CapabilityCard | null> {
  budget.check();
  if (budget.layaCalls >= 1) throw new Error("Laya selection budget exhausted");
  budget.layaCalls++;
  try {
    // Configuration and client construction occur only after an ambiguous shortlist exists.
    const config = readLayaConfig();
    const question: ChoiceQuestion = {
      type: "choice",
      instructions:
        "Choose the capability with substantial teaching overlap. Unsupported results may be omitted, but do not select an unrelated activity. Use unclear for no fit.",
      criteria: {
        ...Object.fromEntries(
          cards.map((c) => [
            c.recipeSlug,
            `${c.summary} Supports ${c.supports.join(", ")}. Limitations: ${c.limitations.join(" ")}`,
          ]),
        ),
        unclear: "No useful capability or intent remains unclear",
      },
    };
    const response = await createLayaClient(
      config,
      budget.signal,
    )({
      state: { originalRequest: prompt, intent },
      questions: { capability: question },
    });
    const accepted = acceptChoice(
      response.answers.capability,
      question,
      config.creationGate,
    );
    budget.trace?.("selection.laya", {
      status: accepted ? "accepted" : "rejected",
      model: response.model,
      answer: response.answers.capability,
      timing: response.timing ?? null,
    });
    return accepted
      ? (cards.find((c) => c.recipeSlug === accepted.choice) ?? null)
      : null;
  } catch (error) {
    budget.check();
    budget.trace?.("selection.laya", {
      status: "unavailable",
      reason: error instanceof Error ? error.message : "Laya unavailable",
    });
    return null;
  }
}
