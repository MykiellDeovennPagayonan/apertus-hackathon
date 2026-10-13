import type { ChoiceAnswer, DecisionRequest } from "../contracts";
import { DecisionError } from "../errors";
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new DecisionError(
      "invalid_response",
      "Invalid decision response object",
    );
  return value as Record<string, unknown>;
}
export function probability(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= 1
  );
}
export function readModel(value: unknown): string {
  if (typeof value !== "string" || !value.trim())
    throw new DecisionError("invalid_response", "Invalid decision model");
  return value;
}
export function readAnswers(
  value: unknown,
  request: DecisionRequest,
  requireConfidence: boolean,
): Record<string, ChoiceAnswer> {
  const answers = record(value);
  if (Object.keys(answers).length !== Object.keys(request.questions).length)
    throw new DecisionError("invalid_response", "Invalid decision answer IDs");
  return Object.fromEntries(
    Object.entries(request.questions).map(([id, question]) => {
      if (!Object.hasOwn(answers, id))
        throw new DecisionError(
          "invalid_response",
          "Invalid decision answer IDs",
        );
      const answer = record(answers[id]);
      const probabilities = record(answer.probabilities);
      const keys = Object.keys(question.criteria);
      if (
        typeof answer.choice !== "string" ||
        !Object.hasOwn(question.criteria, answer.choice) ||
        (requireConfidence
          ? answer.type !== "choice"
          : answer.type !== undefined && answer.type !== "choice") ||
        (requireConfidence && !probability(answer.confidence)) ||
        (answer.confidence !== undefined && !probability(answer.confidence)) ||
        Object.keys(probabilities).length !== keys.length ||
        keys.some(
          (key) =>
            !Object.hasOwn(probabilities, key) ||
            !probability(probabilities[key]),
        ) ||
        Math.abs(
          keys.reduce((sum, key) => sum + (probabilities[key] as number), 0) -
            1,
        ) > 0.025 ||
        keys.some(
          (key) =>
            (probabilities[key] as number) >
            (probabilities[answer.choice as string] as number),
        )
      )
        throw new DecisionError(
          "invalid_response",
          "Invalid decision choice answer",
        );
      return [
        id,
        {
          type: "choice" as const,
          choice: answer.choice,
          probabilities: Object.fromEntries(
            keys.map((key) => [key, probabilities[key] as number]),
          ),
          ...(answer.confidence !== undefined
            ? { confidence: answer.confidence as number }
            : {}),
        },
      ];
    }),
  );
}
