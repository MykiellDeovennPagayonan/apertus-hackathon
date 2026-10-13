import type { MemoryMode } from "../../simulations/creation-and-editing/memory/contracts";
import { offlineEnabled } from "../deployment";

export function memoryMode(env: NodeJS.ProcessEnv = process.env): MemoryMode {
  if (offlineEnabled(env)) return "off";
  const mode = env.REPAIR_MEMORY_MODE ?? "off";
  if (!["off", "record", "repair", "prevent"].includes(mode))
    throw new Error("Invalid REPAIR_MEMORY_MODE");
  return mode as MemoryMode;
}

export function embeddingConfig(env: NodeJS.ProcessEnv = process.env) {
  const endpoint = env.REPAIR_MEMORY_EMBEDDING_URL?.trim();
  const model = env.REPAIR_MEMORY_EMBEDDING_MODEL?.trim();
  const revision = env.REPAIR_MEMORY_EMBEDDING_REVISION?.trim();
  if (!endpoint || !model || !revision)
    throw new Error("Repair memory embeddings are not configured");
  const url = new URL(endpoint);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.hash ||
    url.search
  )
    throw new Error("Invalid repair memory embedding endpoint");
  if (
    url.protocol !== "https:" &&
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  )
    throw new Error("Remote embedding endpoints require HTTPS");
  if (model.length > 150 || revision.length > 150)
    throw new Error("Embedding identity exceeds bounds");
  return {
    endpoint: url.href,
    model,
    version: `${model}@${revision}`,
    token: env.REPAIR_MEMORY_EMBEDDING_KEY?.trim(),
  };
}

export function accountScope(scope: string): void {
  if (!/^account:[a-zA-Z0-9_-]{1,100}$/.test(scope))
    throw new Error("Invalid private memory scope");
}
