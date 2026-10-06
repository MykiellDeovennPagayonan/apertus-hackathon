import { readConfig } from "../apertus/config";
export interface PlannerTrace {
  id: string;
  startedAt: string;
  prompt: string;
  configuration: unknown;
  events: { event: string; elapsedMs: number; data: unknown }[];
}
const globalDiagnostics = globalThis as typeof globalThis & {
  plannerTraces?: Map<string, PlannerTrace>;
};
globalDiagnostics.plannerTraces ??= new Map();
const traces = globalDiagnostics.plannerTraces;
export function startTrace(id: string, prompt: string) {
  const enabled =
    process.env.PLANNER_DIAGNOSTICS === "true" &&
    process.env.NODE_ENV !== "production";
  const started = Date.now();
  let configuration: unknown;
  try {
    const a = readConfig();
    configuration = {
      mode: process.env.PLANNER_MODE ?? "hybrid",
      apertus: {
        model: a.model,
        provider: a.provider,
        baseUrl: a.baseUrl,
        structuredOutput: a.structuredOutput,
        contextCapacity: a.contextTokens,
        maxTokens: a.maxTokens,
        temperature: 0,
        timeout: a.timeout,
      },
      laya: {
        policy:
          "Constructed only for ambiguous selection; see selection.laya events.",
      },
      deadlineMs: Number(process.env.PLANNER_TIMEOUT_MS ?? 120000),
    };
  } catch {
    configuration = { invalid: true };
  }
  const trace: PlannerTrace = {
    id,
    prompt,
    configuration,
    startedAt: new Date(started).toISOString(),
    events: [],
  };
  if (enabled) {
    traces.set(id, trace);
    while (traces.size > 50) {
      const first = traces.keys().next().value;
      if (first) traces.delete(first);
    }
  }
  return (event: string, data: unknown) => {
    if (enabled && trace.events.length < 50)
      trace.events.push({ event, elapsedMs: Date.now() - started, data });
  };
}
export function readTrace(id: string) {
  return traces.get(id) ?? null;
}
