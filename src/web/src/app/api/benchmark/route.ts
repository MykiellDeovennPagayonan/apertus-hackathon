import { readDecisionConfig } from "../../../simulations/creation-and-editing/component-selection/decisions/config";
import {
  compositionDeadlineMs,
  requiresLayaComposition,
} from "../../../simulations/creation-and-editing/composer/policy";
import { readTrace } from "../../../simulations/creation-and-editing/diagnostics";
import { readLlmConfig } from "../../../simulations/creation-and-editing/input/inference/config";
import { requestStructured } from "../../../simulations/creation-and-editing/input/inference/transport";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function available(request: Request) {
  return (
    process.env.BENCHMARK_MEASUREMENTS === "true" &&
    process.env.NODE_ENV !== "production" &&
    ["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname)
  );
}

/** Local benchmark metadata only: never return prompts, response bodies or credentials. */
export function GET(request: Request) {
  const url = new URL(request.url);
  if (!available(request)) return new Response(null, { status: 404 });
  const id = url.searchParams.get("id");
  if (id) {
    const trace = readTrace(id);
    return Response.json(
      trace ? { requestId: id, measurements: trace.measurements } : null,
      { status: trace ? 200 : 404, headers: { "Cache-Control": "no-store" } },
    );
  }
  try {
    requiresLayaComposition();
    const { token: _decisionToken, ...decision } = {
      token: undefined,
      ...readDecisionConfig(),
    };
    const { token: _token, ...llm } = readLlmConfig();
    return Response.json(
      {
        protocolVersion: 1,
        llm,
        decision,
        planner: {
          mode: process.env.PLANNER_MODE ?? "hybrid",
          compositionPolicy:
            process.env.COMPOSITION_DECISION_POLICY ?? "optional",
          decisionProvider: process.env.DECISION_PROVIDER ?? "laya",
          timeoutMs: compositionDeadlineMs(),
          memoryMode: process.env.REPAIR_MEMORY_MODE ?? "off",
        },
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return Response.json(
      { error: "Invalid benchmark model configuration." },
      { status: 503 },
    );
  }
}

/** Explicit setup smoke call, excluded from the forty scored attempts. */
export async function POST(request: Request) {
  if (
    !available(request) ||
    request.headers.get("X-Benchmark-Setup") !== "true"
  )
    return new Response(null, { status: 404 });
  try {
    await requestStructured(
      [{ role: "user", content: 'Return only {"ready":true}.' }],
      (content) => {
        const result = JSON.parse(content);
        if (result.ready !== true)
          throw new Error("Setup response did not match the contract.");
        return result;
      },
      'Return only {"ready":true}.',
      request.signal,
      {
        config: readLlmConfig(),
        stage: "benchmark.setup",
        maxTokens: 128,
        maxRepairsPerIssue: 0,
        schema: {
          type: "object",
          properties: { ready: { enum: [true] } },
          required: ["ready"],
          additionalProperties: false,
        },
      },
    );
    return Response.json({ ready: true, scored: false });
  } catch {
    return Response.json(
      {
        error:
          "Provider setup failed. Check model access, endpoint, credentials and structured-output compatibility.",
      },
      { status: 502 },
    );
  }
}
