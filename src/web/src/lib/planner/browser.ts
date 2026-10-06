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
) {
  const request = parseGenerationRequest(input);
  const response = await fetch("/api/apertus", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
    cache: "no-store",
  });
  const data: unknown = await response.json();
  if (signal.aborted) throw new DOMException("Request cancelled", "AbortError");
  const result = parseGenerationResult(data, request);
  if (response.headers.get("X-Request-ID") !== request.requestId)
    throw new Error("Response correlation does not match the current request.");
  if (!response.ok && result.status !== "failed")
    throw new Error("Generation request failed.");
  onResultReceived?.();
  return result;
}
