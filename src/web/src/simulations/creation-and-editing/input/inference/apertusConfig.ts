import { offlineEnabled, requireLocalEndpoint } from "../../../../lib/deployment";

export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const provider = env.APERTUS_PROVIDER ?? "local";
  if (provider !== "local" && provider !== "huggingface")
    throw new Error("APERTUS_PROVIDER must be local or huggingface.");
  const localRuntime = env.APERTUS_LOCAL_RUNTIME ?? "mlx";
  if (!["mlx", "ollama", "llamacpp"].includes(localRuntime))
    throw new Error("APERTUS_LOCAL_RUNTIME must be mlx, ollama, or llamacpp.");
  const online = provider === "huggingface";
  if (offlineEnabled(env) && online)
    throw new Error("OFFLINE requires local Apertus inference.");
  const baseUrl = online
    ? env.APERTUS_HF_BASE_URL || "https://router.huggingface.co/v1"
    : env.APERTUS_LOCAL_BASE_URL || "http://127.0.0.1:43101/v1";
  const url = new URL(baseUrl);
  if (offlineEnabled(env)) requireLocalEndpoint(baseUrl);
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "Apertus base URL must be HTTP(S) without credentials, query, or fragment.",
    );
  const model = online
    ? env.APERTUS_HF_MODEL
    : env.APERTUS_LOCAL_MODEL ||
      (localRuntime === "llamacpp"
        ? "apertus-v1.5-8b-text"
        : "m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4");
  const token = online ? env.HF_TOKEN : undefined;
  if (!model?.trim() || (online && !token?.trim()))
    throw new Error("Hosted Apertus requires APERTUS_HF_MODEL and HF_TOKEN.");
  function integer(key: string, fallback: number, max: number) {
    const value = Number(env[key] ?? fallback);
    if (!Number.isInteger(value) || value < 1 || value > max)
      throw new Error(`${key} must be an integer between 1 and ${max}.`);
    return value;
  }
  return {
    structuredOutput:
      env.APERTUS_STRUCTURED_OUTPUT === "strict-json"
        ? "strict-json"
        : env.APERTUS_STRUCTURED_OUTPUT === undefined ||
            env.APERTUS_STRUCTURED_OUTPUT === "auto"
          ? "auto"
          : (() => {
              throw new Error(
                "APERTUS_STRUCTURED_OUTPUT must be auto or strict-json.",
              );
            })(),
    contextTokens: env.APERTUS_CONTEXT_TOKENS
      ? integer("APERTUS_CONTEXT_TOKENS", 8192, 1000000)
      : null,
    provider,
    localRuntime,
    baseUrl: baseUrl.replace(/\/+$/, ""),
    model,
    token,
    timeout: integer("APERTUS_TIMEOUT_MS", 120000, 600000),
    maxTokens: integer("APERTUS_MAX_TOKENS", 1024, 8192),
    concurrency: integer("APERTUS_MAX_CONCURRENT_REQUESTS", 1, 16),
  };
}
