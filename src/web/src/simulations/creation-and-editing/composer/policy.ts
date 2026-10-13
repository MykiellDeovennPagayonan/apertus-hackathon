import { PlannerError } from "../errors";
export function requiresLayaComposition(env: NodeJS.ProcessEnv = process.env) {
  const policy = env.COMPOSITION_DECISION_POLICY ?? "optional";
  if (!["optional", "required-laya"].includes(policy))
    throw new PlannerError(
      "COMPOSITION_DECISION_POLICY must be optional or required-laya.",
      503,
    );
  if (
    policy === "required-laya" &&
    ((env.PLANNER_MODE ?? "hybrid") !== "hybrid" ||
      (env.DECISION_PROVIDER ?? "laya") !== "laya" ||
      (env.LLM_PROVIDER ?? "apertus") !== "apertus")
  )
    throw new PlannerError(
      "Required Laya composition needs PLANNER_MODE=hybrid, DECISION_PROVIDER=laya and LLM_PROVIDER=apertus.",
      503,
    );
  return policy === "required-laya";
}

/** Longer local multi-component graphs retain a bounded deadline. */
export function compositionDeadlineMs(env: NodeJS.ProcessEnv = process.env) {
  return Number(
    env.PLANNER_TIMEOUT_MS ??
      (env.COMPOSITION_DECISION_POLICY === "required-laya" ? 240000 : 120000),
  );
}
