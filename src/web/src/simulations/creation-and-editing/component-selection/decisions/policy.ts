import type { DecisionProviderId } from "./contracts";
import { DecisionError } from "./errors";
export interface SelectionPolicy {
  probabilityGate: number;
  confidenceGate: number;
}
export function readSelectionPolicy(
  provider: DecisionProviderId,
  env: NodeJS.ProcessEnv = process.env,
): SelectionPolicy {
  const gate = Number(
    env.DECISION_ACCEPTANCE_GATE ??
      (provider === "laya" ? env.LAYA_ACCEPTANCE_GATE : undefined) ??
      0.9,
  );
  const probabilityGate = Number(
    env.DECISION_CREATION_ACCEPTANCE_GATE ??
      (provider === "laya" ? env.LAYA_CREATION_ACCEPTANCE_GATE : undefined) ??
      0.75,
  );
  for (const value of [gate, probabilityGate])
    if (!Number.isFinite(value) || value <= 0.5 || value >= 1)
      throw new DecisionError(
        "configuration",
        "Decision probability gates must be greater than 0.5 and less than 1.",
      );
  const confidenceGate = Number(
    env.DECISION_CONFIDENCE_GATE ?? (provider === "jev" ? 0.75 : 0),
  );
  if (
    !Number.isFinite(confidenceGate) ||
    confidenceGate < 0 ||
    confidenceGate > 1
  )
    throw new DecisionError(
      "configuration",
      "DECISION_CONFIDENCE_GATE must be between 0 and 1.",
    );
  // The general gate is retained for legacy configuration validation only.
  return { probabilityGate, confidenceGate };
}
