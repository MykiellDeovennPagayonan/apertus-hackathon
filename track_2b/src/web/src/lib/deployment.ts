/** Server-owned deployment policy. Only the boolean is sent to the browser. */
export function offlineEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const value = env.OFFLINE?.trim().toLowerCase();
  if (value === undefined || value === "" || value === "false") return false;
  if (value === "true") return true;
  throw new Error("OFFLINE must be true or false.");
}

/** Account services are independent of inference; offline always disables them. */
export function accountFeaturesEnabled(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  const value = env.ACCOUNT_FEATURES_ENABLED?.trim().toLowerCase();
  if (
    value !== undefined &&
    value !== "" &&
    value !== "true" &&
    value !== "false"
  )
    throw new Error("ACCOUNT_FEATURES_ENABLED must be true or false.");
  return !offlineEnabled(env) && value !== "false";
}

/** Offline deployments use loopback, private LAN addresses, or Docker DNS names. */
export function requireLocalEndpoint(value: string) {
  const host = new URL(value).hostname.toLowerCase();
  const ipv4 = host.split(".").map(Number);
  const privateV4 =
    ipv4.length === 4 &&
    ipv4.every((part) => Number.isInteger(part) && part >= 0 && part <= 255) &&
    (ipv4[0] === 127 ||
      ipv4[0] === 10 ||
      (ipv4[0] === 192 && ipv4[1] === 168) ||
      (ipv4[0] === 172 && ipv4[1] >= 16 && ipv4[1] <= 31));
  const localName = /^[a-z][a-z0-9-]*$/.test(host) || host.endsWith(".local");
  const privateV6 = host === "[::1]" || /^\[f[cd][0-9a-f]{2}:/.test(host);
  if (!privateV4 && !privateV6 && !localName)
    throw new Error("OFFLINE requires a local inference endpoint.");
}
