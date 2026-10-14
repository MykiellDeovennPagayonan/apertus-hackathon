import type { ChoiceQuestion } from "./contracts";
import type { CapabilityCard } from "../recipeCapabilities";
export function capabilityQuestion(cards: CapabilityCard[]): ChoiceQuestion {
  return {
    type: "choice",
    instructions:
      "Choose the capability whose concepts, interactions and observations support the requested teaching goal together. A shared object or topic word alone is insufficient. Unsupported results may be omitted, but do not select an unrelated activity. Use unclear for no fit.",
    criteria: {
      ...Object.fromEntries(
        cards.map((c) => [
          c.recipeSlug,
          `${c.summary} Supports ${c.supports.join(", ")}. Interactions: ${c.interactionNames.join("; ")}. Observations: ${c.observationNames.join("; ")}. Limitations: ${c.limitations.join(" ")}`,
        ]),
      ),
      unclear: "No useful capability or intent remains unclear",
    },
  };
}
