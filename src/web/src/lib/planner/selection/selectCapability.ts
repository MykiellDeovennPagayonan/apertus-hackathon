import type { DecisionProvider } from "../../decisions/contracts";
import { DecisionError } from "../../decisions/errors";
import type { TraceSink } from "../budget";
import type { CapabilityCard } from "../catalog";
import type { TeachingIntent } from "../schema";
import { acceptChoice } from "./acceptance";
import type { SelectionPolicy } from "./policy";
import { capabilityQuestion } from "./questions";
export interface DecisionSelectionDependencies {
  provider: DecisionProvider;
  policy: SelectionPolicy;
}
export interface SelectionBudget {
  signal: AbortSignal;
  check(): void;
  consumeDecisionCall(): void;
  trace?: TraceSink;
}
export type SelectionOutcome =
  | { status: "selected"; capability: CapabilityCard }
  | { status: "rejected"; reason: string }
  | { status: "unavailable"; reason: string; kind: string };
export async function selectCapability(
  prompt: string,
  intent: TeachingIntent,
  cards: CapabilityCard[],
  budget: SelectionBudget,
  dependencies: () => DecisionSelectionDependencies,
): Promise<SelectionOutcome> {
  budget.check();
  budget.consumeDecisionCall();
  try {
    // Laziness preserves the unambiguous path when decision configuration is invalid.
    const { provider, policy } = dependencies();
    const question = capabilityQuestion(cards);
    const response = await provider(
      {
        state: { originalRequest: prompt, intent },
        questions: { capability: question },
      },
      budget.signal,
    );
    budget.check();
    const accepted = acceptChoice(
      response.answers.capability,
      question,
      policy.probabilityGate,
      policy.confidenceGate,
    );
    budget.trace?.("selection.decision", {
      status: accepted ? "accepted" : "rejected",
      provider: response.provider,
      model: response.model,
      usage: response.usage ?? null,
      durationMs: response.durationMs,
      answer: response.answers.capability,
      timing: response.timing ?? null,
    });
    const capability = accepted
      ? cards.find((card) => card.recipeSlug === accepted.choice)
      : undefined;
    return capability
      ? { status: "selected", capability }
      : {
          status: "rejected",
          reason: "Decision did not meet capability selection policy.",
        };
  } catch (error) {
    budget.check();
    budget.signal.throwIfAborted();
    const kind = error instanceof DecisionError ? error.kind : "unexpected";
    const reason =
      error instanceof DecisionError
        ? error.message
        : "Decision selection failed.";
    budget.trace?.("selection.decision", {
      status: "unavailable",
      kind,
      reason,
    });
    return { status: "unavailable", kind, reason };
  }
}
