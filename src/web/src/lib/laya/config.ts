export function readLayaConfig(env: NodeJS.ProcessEnv = process.env) {
  const url = new URL(env.LAYA_BASE_URL || "http://127.0.0.1:43102");
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  )
    throw new Error(
      "LAYA_BASE_URL must be HTTP(S) without credentials, query, or fragment.",
    );
  const timeout = Number(env.LAYA_TIMEOUT_MS ?? 3000);
  const gate = Number(env.LAYA_ACCEPTANCE_GATE ?? 0.9);
  const creationGate = Number(env.LAYA_CREATION_ACCEPTANCE_GATE ?? 0.75);
  if (
    !Number.isFinite(creationGate) ||
    creationGate <= 0.5 ||
    creationGate >= 1
  )
    throw new Error(
      "LAYA_CREATION_ACCEPTANCE_GATE must be greater than 0.5 and less than 1.",
    );
  if (!Number.isInteger(timeout) || timeout < 1 || timeout > 30000)
    throw new Error("LAYA_TIMEOUT_MS must be an integer from 1 to 30000.");
  if (!Number.isFinite(gate) || gate <= 0.5 || gate >= 1)
    throw new Error(
      "LAYA_ACCEPTANCE_GATE must be greater than 0.5 and less than 1.",
    );
  return {
    baseUrl: url.href.replace(/\/+$/, ""),
    timeout,
    gate,
    creationGate,
  };
}
