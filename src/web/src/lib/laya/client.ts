import type { readLayaConfig } from "./config";
import type { DecisionProvider } from "./types";
export function createLayaClient(
  config: ReturnType<typeof readLayaConfig>,
  signal: AbortSignal,
): DecisionProvider {
  return async (payload) => {
    const response = await fetch(`${config.baseUrl}/api/decide`, {
      method: "POST",
      cache: "no-store",
      signal: AbortSignal.any([signal, AbortSignal.timeout(config.timeout)]),
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error(`Laya returned HTTP ${response.status}`);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("Laya returned no body");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > 64000) {
          await reader.cancel();
          throw new Error("Laya response exceeds size limit");
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
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (
      !data?.result?.answers ||
      typeof data.result.answers !== "object" ||
      Array.isArray(data.result.answers) ||
      typeof data.model !== "string"
    )
      throw new Error("Invalid Laya response");
    return {
      answers: data.result.answers,
      model: data.model,
      timing: data.timing,
    };
  };
}
