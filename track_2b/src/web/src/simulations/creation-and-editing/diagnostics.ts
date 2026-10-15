import { BenchmarkMeasurements } from "./benchmark";
import { compositionDeadlineMs } from "./composer/policy";
import { readLlmConfig } from "./input/inference/config";
export interface PlannerTrace {
  id: string;
  startedAt: string;
  prompt: string;
  configuration: unknown;
  events: { event: string; elapsedMs: number; data: unknown }[];
  measurements: BenchmarkMeasurements;
}
const globalDiagnostics = globalThis as typeof globalThis & {
  plannerTraces?: Map<string, PlannerTrace>;
};
globalDiagnostics.plannerTraces ??= new Map();
const traces = globalDiagnostics.plannerTraces;
export function startTrace(id: string, prompt: string) {
  const enabled =
    (process.env.PLANNER_DIAGNOSTICS === "true" ||
      process.env.BENCHMARK_MEASUREMENTS === "true") &&
    process.env.NODE_ENV !== "production";
  const started = Date.now();
  let configuration: unknown;
  try {
    const a = readLlmConfig();
    configuration = {
      mode: process.env.PLANNER_MODE ?? "hybrid",
      llm: {
        model: a.model,
        provider: a.provider,
        connection: a.connection,
        baseUrl: a.baseUrl,
        structuredOutput: a.structuredOutput,
        contextCapacity: a.contextTokens,
        maxTokens: a.maxTokens,
        ...(a.provider === "apertus" ? { temperature: 0 } : {}),
        reasoningEffort: a.reasoningEffort ?? null,
        timeout: a.timeout,
      },
      decision: {
        provider: process.env.DECISION_PROVIDER?.trim() || "laya",
        policy:
          "See selection.decision or composition.decision for actual acceptance.",
      },
      deadlineMs: compositionDeadlineMs(),
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
    measurements: new BenchmarkMeasurements(),
  };
  if (enabled) {
    traces.set(id, trace);
    while (traces.size > 50) {
      const first = traces.keys().next().value;
      if (first) traces.delete(first);
    }
  }
  return (event: string, data: unknown) => {
    if (enabled) trace.measurements.record(event, data, Date.now() - started);
    if (enabled && trace.events.length < 240)
      trace.events.push({ event, elapsedMs: Date.now() - started, data });
  };
}
export function readTrace(id: string) {
  const trace = traces.get(id);
  return trace
    ? { ...trace, measurements: trace.measurements.snapshot() }
    : null;
}
