import type { ChoiceQuestion } from "../../decisions/contracts";
export function acceptChoice(
  answer: unknown,
  question: ChoiceQuestion,
  gate: number,
  confidenceGate = 0,
) {
  if (
    !Number.isFinite(gate) ||
    gate <= 0.5 ||
    gate >= 1 ||
    !answer ||
    typeof answer !== "object"
  )
    return null;
  const a = answer as {
    choice?: unknown;
    probabilities?: unknown;
    confidence?: unknown;
  };
  if (
    !Number.isFinite(confidenceGate) ||
    confidenceGate < 0 ||
    confidenceGate > 1 ||
    (confidenceGate > 0 &&
      (typeof a.confidence !== "number" ||
        !Number.isFinite(a.confidence) ||
        a.confidence < confidenceGate ||
        a.confidence > 1))
  )
    return null;
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
    keys.some((key) => (probabilities[key] as number) > probability) ||
    a.choice === "unclear"
  )
    return null;
  return { choice: a.choice, probability };
}
