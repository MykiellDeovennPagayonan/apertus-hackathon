import { offlineEnabled } from "../deployment";
import { embeddingConfig } from "./config";

export const EMBEDDING_DIMENSIONS = 384;
export function validateVector(value: unknown): number[] {
  if (
    !Array.isArray(value) ||
    value.length !== EMBEDDING_DIMENSIONS ||
    value.some(
      (n) => typeof n !== "number" || !Number.isFinite(n) || Math.abs(n) > 1e6,
    ) ||
    !value.some((n) => n !== 0)
  )
    throw new Error("Invalid repair memory embedding vector");
  return value;
}

export async function embed(
  text: string,
  signal: AbortSignal,
): Promise<number[]> {
  if (offlineEnabled()) throw new Error("Repair memory is disabled offline");
  if (!text || text.length > 2400)
    throw new Error("Embedding text exceeds bounds");
  const config = embeddingConfig();
  const response = await fetch(config.endpoint, {
    method: "POST",
    redirect: "error",
    cache: "no-store",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(config.token ? { Authorization: `Bearer ${config.token}` } : {}),
    },
    body: JSON.stringify({
      model: config.model,
      input: text,
      encoding_format: "float",
    }),
  });
  if (!response.ok) {
    await response.body?.cancel();
    throw new Error("Embedding service unavailable");
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Embedding response is empty");
  let content = "";
  let size = 0;
  const decoder = new TextDecoder("utf-8", { fatal: true });
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 64000) {
        await reader.cancel();
        throw new Error("Embedding response exceeds bounds");
      }
      content += decoder.decode(value, { stream: true });
    }
    content += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  const result = JSON.parse(content);
  if (result.model && result.model !== config.model)
    throw new Error("Embedding model mismatch");
  if (
    !Array.isArray(result.data) ||
    result.data.length !== 1 ||
    result.data[0].index !== 0
  )
    throw new Error("Invalid embedding response");
  return validateVector(result.data[0].embedding);
}
