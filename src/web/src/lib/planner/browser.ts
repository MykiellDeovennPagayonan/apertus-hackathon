import { correlatePlan } from "../../simulations/runtime/session";
import type { DemoType } from "../../simulations/runtime/types";
import { type ExperimentContext, parsePlan } from "./schema";
export async function requestPlan(
  prompt: string,
  demo: DemoType | null,
  context: ExperimentContext | null,
  signal: AbortSignal,
) {
  const response = await fetch("/api/apertus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt, demo, context }),
    signal,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      typeof data.error === "string" ? data.error : "Apertus request failed.",
    );
  const plan = parsePlan(data, demo, context);
  const id = response.headers.get("X-Request-ID");
  if (id) correlatePlan(plan, id);
  return plan;
}
