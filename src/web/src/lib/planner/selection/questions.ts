import type { ChoiceQuestion } from "../../decisions/contracts";
import type { CapabilityCard } from "../catalog";
export function capabilityQuestion(cards: CapabilityCard[]): ChoiceQuestion {
  return {
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
}
