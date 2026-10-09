import { DecisionError } from "./errors";

interface ConnectionConfig {
  baseUrl: string;
  timeout: number;
}

export type DecisionConfig = ConnectionConfig &
  ({ provider: "laya" } | { provider: "jev"; token: string; model: string });

/** Server-only decision configuration, independent of LLM_PROVIDER. */
function parseDecisionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DecisionConfig {
  const provider = env.DECISION_PROVIDER?.trim() || "laya";
  if (provider !== "laya" && provider !== "jev")
    throw new Error("DECISION_PROVIDER must be laya or jev.");
  const urlKey = provider === "jev" ? "JEV_BASE_URL" : "LAYA_BASE_URL";
  const url = new URL(
    env[urlKey] ||
      (provider === "jev"
        ? "https://api.typesafe.ai/v1"
        : "http://127.0.0.1:43102"),
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      `${urlKey} must be HTTP(S) without credentials, query, or fragment.`,
    );
  if (provider === "jev" && url.protocol !== "https:")
    throw new Error("JEV_BASE_URL must use HTTPS.");
  const timeout = Number(
    env.DECISION_TIMEOUT_MS ??
      (provider === "laya" ? env.LAYA_TIMEOUT_MS : undefined) ??
      3000,
  );
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 30000)
    throw new Error("Decision timeout must be an integer from 1 to 30000.");
  const connection = { baseUrl: url.href.replace(/\/+$/, ""), timeout };
  if (provider === "laya") return { ...connection, provider };
  const token = env.TYPESAFE_API_KEY?.trim();
  if (!token) throw new Error("Jev requires TYPESAFE_API_KEY.");
  const model = env.JEV_MODEL?.trim() ?? "jev-1.13.0";
  if (!model) throw new Error("JEV_MODEL must not be blank.");
  return { ...connection, provider, token, model };
}
export function readDecisionConfig(
  env: NodeJS.ProcessEnv = process.env,
): DecisionConfig {
  try {
    return parseDecisionConfig(env);
  } catch (error) {
    // URL parser errors can contain credentials; expose only configuration guidance.
    throw new DecisionError(
      "configuration",
      error instanceof TypeError
        ? "Invalid decision provider URL."
        : error instanceof Error
          ? error.message
          : "Invalid decision configuration.",
    );
  }
}
