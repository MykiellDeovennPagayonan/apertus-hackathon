import type { ChoiceQuestion } from "./types";
export function acceptChoice(
  answer: unknown,
  question: ChoiceQuestion,
  gate: number,
) {
  if (
    !Number.isFinite(gate) ||
    gate <= 0.5 ||
    gate >= 1 ||
    !answer ||
    typeof answer !== "object"
  )
    return null;
  const a = answer as { choice?: unknown; probabilities?: unknown };
  if (
    typeof a.choice !== "string" ||
    !Object.hasOwn(question.criteria, a.choice) ||
    !a.probabilities ||
    typeof a.probabilities !== "object" ||
    Array.isArray(a.probabilities)
  )
    return null;
  const probabilities = a.probabilities as Record<string, unknown>;
  const keys = Object.keys(question.criteria);
  if (Object.keys(probabilities).length !== keys.length) return null;
  let total = 0;
  for (const key of keys) {
    const p = probabilities[key];
    if (typeof p !== "number" || !Number.isFinite(p) || p < 0 || p > 1)
      return null;
    total += p;
  }
  const probability = probabilities[a.choice] as number;
  if (
    Math.abs(total - 1) > 0.025 ||
    probability < gate ||
    a.choice === "unclear"
  )
    return null;
  return { choice: a.choice, probability };
}
