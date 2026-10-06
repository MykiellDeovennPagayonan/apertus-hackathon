import { randomUUID } from "node:crypto";
import { planPrompt } from "../../../lib/planner";
import { startTrace } from "../../../lib/planner/diagnostics";
import { PlannerError } from "../../../lib/planner/errors";
import {
  type GenerationResult,
  parseGenerationRequest,
  REQUEST_BYTE_LIMIT,
} from "../../../lib/planner/schema";
export const runtime = "nodejs";
export async function POST(request: Request) {
  let correlationId = randomUUID();
  let trace: ReturnType<typeof startTrace> | undefined;
  const respond = (result: GenerationResult, status = 200) =>
    Response.json(result, {
      status,
      headers: {
        "Cache-Control": "no-store",
        "X-Request-ID": correlationId,
        ...(status === 429 ? { "Retry-After": "2" } : {}),
      },
    });
  const failure = (message: string, status: number, retryable = false) =>
    respond(
      {
        protocolVersion: 1,
        status: "failed",
        requestId: correlationId,
        message,
        retryable,
      },
      status,
    );
  try {
    const reader = request.body?.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    if (reader)
      try {
        while (true) {
          if (request.signal.aborted)
            throw new PlannerError("Request cancelled.", 499);
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > REQUEST_BYTE_LIMIT) {
            await reader.cancel();
            return failure("Request too large.", 413);
          }
          chunks.push(value);
        }
      } finally {
        reader.releaseLock();
      }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    let raw: unknown;
    try {
      raw = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
    } catch {
      return failure("Invalid JSON.", 400);
    }
    // Preserve a valid caller ID on validation errors too.
    if (
      raw &&
      typeof raw === "object" &&
      "requestId" in raw &&
      typeof raw.requestId === "string" &&
      /^[a-zA-Z0-9][a-zA-Z0-9/_:.-]{0,99}$/.test(raw.requestId)
    )
      correlationId = raw.requestId as ReturnType<typeof randomUUID>;
    let input: ReturnType<typeof parseGenerationRequest>;
    try {
      input = parseGenerationRequest(raw);
    } catch (error) {
      return failure(
        error instanceof Error ? error.message : "Invalid generation request.",
        400,
      );
    }
    trace = startTrace(correlationId, input.prompt);
    const result = await planPrompt(input, request.signal, trace);
    trace("result", {
      status: result.status,
      ...("recipe" in result
        ? {
            nodes: result.recipe.document.nodes.length,
            coverage: result.coverage,
          }
        : {}),
    });
    return respond(result);
  } catch (error) {
    const status = error instanceof PlannerError ? error.status : 500;
    const message =
      error instanceof PlannerError
        ? error.message
        : "Unable to process the prompt.";
    trace?.("failure", { status, message });
    return failure(message, status, [429, 502, 503, 504, 500].includes(status));
  }
}
