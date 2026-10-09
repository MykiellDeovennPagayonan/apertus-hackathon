import { type GenerationStage, isGenerationStage } from "./progress";
import {
  type GenerationRequest,
  parseGenerationRequest,
  parseGenerationResult,
} from "./schema";
/** The browser checks both JSON identity and response correlation before activation. */
export async function requestGeneration(
  input: GenerationRequest,
  signal: AbortSignal,
  onResultReceived?: () => void,
  onProgress?: (stage: GenerationStage) => void,
) {
  const request = parseGenerationRequest(input);
  const response = await fetch("/api/apertus", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(onProgress ? { Accept: "application/x-ndjson" } : {}),
    },
    body: JSON.stringify(request),
    signal,
    cache: "no-store",
  });
  if (response.headers.get("X-Request-ID") !== request.requestId)
    throw new Error("Response correlation does not match the current request.");
  let data: unknown;
  if (response.headers.get("Content-Type")?.includes("application/x-ndjson")) {
    if (!response.body) throw new Error("Generation response is empty.");
    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8", { fatal: true });
    let buffer = "";
    let received = false;
    const consume = (line: string) => {
      if (!line.trim()) return;
      const event = JSON.parse(line);
      if (!event || event.requestId !== request.requestId)
        throw new Error(
          "Progress correlation does not match the current request.",
        );
      if (received)
        throw new Error("Unexpected event after generation result.");
      if (event.type === "progress" && isGenerationStage(event.stage))
        onProgress?.(event.stage);
      else if (event.type === "result") {
        data = event.result;
        received = true;
      } else throw new Error("Invalid generation progress event.");
    };
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (signal.aborted)
          throw new DOMException("Request cancelled", "AbortError");
        buffer += done
          ? decoder.decode()
          : decoder.decode(value, { stream: true });
        let newline = buffer.indexOf("\n");
        while (newline >= 0) {
          consume(buffer.slice(0, newline));
          buffer = buffer.slice(newline + 1);
          newline = buffer.indexOf("\n");
        }
        if (done) {
          consume(buffer);
          break;
        }
      }
      if (!received)
        throw new Error(
          "Generation ended before the lesson arrived. Please try again.",
        );
    } finally {
      await reader.cancel().catch(() => {});
      reader.releaseLock();
    }
  } else data = await response.json();
  if (signal.aborted) throw new DOMException("Request cancelled", "AbortError");
  const result = parseGenerationResult(data, request);
  if (!response.ok && result.status !== "failed")
    throw new Error("Generation request failed.");
  onResultReceived?.();
  return result;
}
