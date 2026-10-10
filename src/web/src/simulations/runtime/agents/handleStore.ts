import type { SessionProjection } from "./providers";

export interface RunHandleStore {
  read(key: string): SessionProjection["handle"];
  write(key: string, handle: NonNullable<SessionProjection["handle"]>): void;
}
/** Tab-scoped bearer handles only; this cache never claims authoritative acceptance. */
export const browserHandleStore: RunHandleStore = {
  read(key) {
    try {
      if (typeof sessionStorage === "undefined") return null;
      const value = JSON.parse(
        sessionStorage.getItem(`agent-run:${key}`) ?? "null",
      );
      return value &&
        typeof value.id === "string" &&
        (value.token === undefined || typeof value.token === "string")
        ? value
        : null;
    } catch {
      return null;
    }
  },
  write(key, handle) {
    try {
      if (typeof sessionStorage !== "undefined")
        sessionStorage.setItem(`agent-run:${key}`, JSON.stringify(handle));
    } catch {
      /* Browser storage may be unavailable; server history remains authoritative. */
    }
  },
};
