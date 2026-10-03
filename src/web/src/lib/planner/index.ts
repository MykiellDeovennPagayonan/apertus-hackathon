import type { DemoType } from "../../simulations/runtime/types";
import {
  assembleArguments,
  interpretArguments,
  planEdits,
} from "../apertus/arguments";
import { planPrompt as planWithApertus } from "../apertus/client";
import { createLayaClient } from "../laya/client";
import { readLayaConfig } from "../laya/config";
import { selectWithLaya } from "../laya/planner";
import type { PlannerSelection } from "../laya/types";
import { planCreation, type TraceSink } from "./creation";
import { PlannerError } from "./errors";
import type { ExperimentContext, Plan } from "./schema";

let active = 0;
export async function planPrompt(
  prompt: string,
  demo: DemoType | null,
  context: ExperimentContext | null,
  signal?: AbortSignal,
  trace?: TraceSink,
): Promise<Plan> {
  const mode = process.env.PLANNER_MODE ?? "hybrid";
  if (!["apertus", "hybrid"].includes(mode))
    throw new PlannerError("PLANNER_MODE must be apertus or hybrid.", 503);
  if (signal?.aborted)
    throw new PlannerError("Planner request cancelled.", 499);
  if (mode === "apertus") return planWithApertus(prompt, demo, context, signal);
  const budget = Number(process.env.PLANNER_TIMEOUT_MS ?? 120000);
  if (!Number.isInteger(budget) || budget < 1 || budget > 600000)
    throw new PlannerError(
      "PLANNER_TIMEOUT_MS must be an integer from 1 to 600000.",
      503,
    );
  const deadline = AbortSignal.timeout(budget);
  const requestSignal = signal ? AbortSignal.any([signal, deadline]) : deadline;
  const limit = Number(process.env.PLANNER_MAX_CONCURRENT_REQUESTS ?? 1);
  if (!Number.isInteger(limit) || limit < 1 || limit > 16)
    throw new PlannerError("Invalid PLANNER_MAX_CONCURRENT_REQUESTS.", 503);
  let config: ReturnType<typeof readLayaConfig>;
  try {
    config = readLayaConfig();
  } catch (error) {
    throw new PlannerError(
      error instanceof Error ? error.message : "Invalid Laya configuration",
      503,
    );
  }
  if (active >= limit)
    throw new PlannerError("Planner is busy. Please try again shortly.", 429);
  active++;
  try {
    // One deadline spans all sequential Laya decisions. Apertus retains its own budget.
    const timeout = AbortSignal.timeout(config.timeout);
    const combined = AbortSignal.any([requestSignal, timeout]);
    if (!demo && !context)
      return await planCreation(
        prompt,
        createLayaClient(config, requestSignal),
        config.creationGate,
        requestSignal,
        trace,
      );
    let selection: PlannerSelection | null = null;
    try {
      selection = await selectWithLaya(
        prompt,
        demo,
        context,
        createLayaClient(config, combined),
        config.gate,
        (event) => trace?.("edit.layaSelection", event),
      );
      if (signal?.aborted)
        throw new PlannerError("Planner request cancelled.", 499);
    } catch (error) {
      if (signal?.aborted)
        throw new PlannerError("Planner request cancelled.", 499);
      if (requestSignal.aborted || combined.aborted)
        throw new PlannerError("Planner timed out. Please try again.", 504);
      throw new PlannerError(
        error instanceof Error ? error.message : "Laya transport failed.",
        502,
      );
    }
    if (signal?.aborted)
      throw new PlannerError("Planner request cancelled.", 499);
    if (selection && demo && context) {
      const result = await interpretArguments(
        prompt,
        demo,
        context,
        selection,
        requestSignal,
        (event, data) => trace?.(`edit.focused.${event}`, data),
      );
      if (signal?.aborted)
        throw new PlannerError("Planner request cancelled.", 499);
      if (result.outcome === "arguments")
        return assembleArguments(result, selection, demo, context);
      if (result.outcome !== "conflict")
        return {
          schemaVersion: 1,
          operation: result.outcome,
          message: result.message,
        };
      // Only an explicit semantic conflict restarts broad planning. Transport or
      // repeated schema failures propagate instead of causing more model calls.
    }
    return demo && context
      ? await planEdits(prompt, demo, context, requestSignal, (event, data) =>
          trace?.(`edit.broad.${event}`, data),
        )
      : await planWithApertus(prompt, demo, context, requestSignal);
  } catch (error) {
    if (signal?.aborted)
      throw new PlannerError("Planner request cancelled.", 499);
    if (deadline.aborted)
      throw new PlannerError("Planner timed out. Please try again.", 504);
    throw error;
  } finally {
    active--;
  }
}
