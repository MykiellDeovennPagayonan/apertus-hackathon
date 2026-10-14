import { DecisionError } from "../errors";
export interface HttpRequest {
  url: string;
  headers?: Record<string, string>;
  body: unknown;
}
export type HttpTransport = (
  request: HttpRequest,
  signal: AbortSignal,
) => Promise<unknown>;
export function createHttpTransport(
  timeout: number,
  fetcher: typeof fetch = (...args) => fetch(...args),
): HttpTransport {
  return async (request, signal) => {
    signal.throwIfAborted();
    const deadline = AbortSignal.timeout(timeout);
    const combined = AbortSignal.any([signal, deadline]);
    const body = JSON.stringify(request.body);
    if (new TextEncoder().encode(body).byteLength > 64000)
      throw new DecisionError(
        "size_limit",
        "Decision request exceeds size limit",
      );
    try {
      const response = await fetcher(request.url, {
        method: "POST",
        cache: "no-store",
        redirect: "error",
        signal: combined,
        headers: { "Content-Type": "application/json", ...request.headers },
        body,
      });
      if (!response.ok) {
        await response.body?.cancel();
        throw new DecisionError(
          "http",
          `Decision provider returned HTTP ${response.status}`,
          response.status,
        );
      }
      const reader = response.body?.getReader();
      if (!reader)
        throw new DecisionError(
          "invalid_response",
          "Decision provider returned no body",
        );
      const chunks: Uint8Array[] = [];
      let size = 0;
      try {
        while (true) {
          combined.throwIfAborted();
          const { value, done } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 64000) {
            await reader.cancel();
            throw new DecisionError(
              "size_limit",
              "Decision response exceeds size limit",
            );
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
        offset += chunk.length;
      }
      try {
        return JSON.parse(new TextDecoder().decode(bytes));
      } catch {
        throw new DecisionError(
          "invalid_response",
          "Invalid decision response JSON",
        );
      }
    } catch (error) {
      signal.throwIfAborted();
      if (deadline.aborted)
        throw new DecisionError("timeout", "Decision provider timeout");
      if (error instanceof DecisionError) throw error;
      throw new DecisionError("transport", "Cannot reach decision provider.");
    }
  };
}
