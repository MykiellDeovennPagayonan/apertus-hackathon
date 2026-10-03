import { randomUUID } from "node:crypto";
import { planPrompt } from "../../../lib/planner";
import { startTrace } from "../../../lib/planner/diagnostics";
import { PlannerError } from "../../../lib/planner/errors";
import { isDemo, validateContext } from "../../../lib/planner/schema";
import { templateDemo } from "../../../simulations/runtime/capabilities";
export const runtime = "nodejs";
export async function POST(request: Request) {
  const correlationId = randomUUID();
  let trace: ReturnType<typeof startTrace> | undefined;
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader) {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 16000) {
            await reader.cancel();
            return Response.json(
              { error: "Request too large." },
              { status: 413 },
            );
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const body = new TextDecoder().decode(bytes);
    let raw: unknown;
    try {
      raw = JSON.parse(body);
    } catch {
      return Response.json({ error: "Invalid JSON." }, { status: 400 });
    }
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
      return Response.json(
        { error: "Invalid prompt request." },
        { status: 400 },
      );
    const input = raw as Record<string, unknown>;
    if (
      !input ||
      typeof input !== "object" ||
      Array.isArray(input) ||
      Object.keys(input).some(
        (k) => !["prompt", "demo", "context"].includes(k),
      ) ||
      typeof input.prompt !== "string" ||
      !input.prompt.trim() ||
      input.prompt.length > 4000 ||
      (input.demo != null && !isDemo(input.demo))
    )
      return Response.json(
        { error: "Invalid prompt request." },
        { status: 400 },
      );
    let context: ReturnType<typeof validateContext>;
    try {
      context = validateContext(input.context);
      if (context && templateDemo(context.composition.ref) !== input.demo)
        throw new Error("Context composition does not match active demo");
      if (input.demo != null && !context)
        throw new Error("Follow-up requests require session context");
      if (context?.composition.ref && input.demo == null)
        throw new Error("Context requires active demo");
    } catch (error) {
      return Response.json(
        {
          error:
            error instanceof Error
              ? error.message
              : "Invalid simulation context",
        },
        { status: 400 },
      );
    }
    trace = startTrace(correlationId, input.prompt.trim());
    const plan = await planPrompt(
      input.prompt.trim(),
      input.demo ?? null,
      context,
      request.signal,
      trace,
    );
    trace("plan", plan);
    return Response.json(plan, {
      headers: { "Cache-Control": "no-store", "X-Request-ID": correlationId },
    });
  } catch (error) {
    const status = error instanceof PlannerError ? error.status : 500;
    trace?.("failure", {
      status,
      message:
        error instanceof Error ? error.message : "Unknown planner failure",
    });
    return Response.json(
      {
        error:
          error instanceof PlannerError
            ? error.message
            : "Unable to process the prompt.",
      },
      {
        status,
        headers: {
          "X-Request-ID": correlationId,
          ...(status === 429 ? { "Retry-After": "2" } : {}),
        },
      },
    );
  }
}
