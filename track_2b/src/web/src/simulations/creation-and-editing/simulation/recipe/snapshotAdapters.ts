import type { BridgeState } from "../../../legacy/runtime/bridgeSession";
import type { ProjectileInstance } from "../../../legacy/runtime/projectileSession";
import type { TownModelState } from "../../../legacy/runtime/townModel";
import type { MathBoard, MathDemo } from "../../../legacy/components/traits/MathBoards";

function record(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

/** Runtime providers validate the full state. Presentation checks readiness and
 * discriminants here so renderers cannot accidentally consume another model. */
export function readyBridge(value: unknown): BridgeState | undefined {
  if (!record(value) || value.ready !== true) return undefined;
  if (!record(value.truss) || !record(value.response))
    throw new Error("Bridge snapshot is missing its structure or response");
  return value as unknown as BridgeState;
}

export function readyTown(value: unknown): TownModelState | undefined {
  if (!record(value) || value.ready !== true) return undefined;
  if (!Array.isArray(value.citizens) || !Array.isArray(value.buildings))
    throw new Error("Town snapshot is missing its citizens or buildings");
  return value as unknown as TownModelState;
}

export function projectileInstance(
  value: unknown,
): ProjectileInstance | undefined {
  if (value == null) return undefined;
  if (
    !record(value) ||
    !record(value.launch) ||
    !record(value.transform) ||
    !record(value.metrics) ||
    typeof value.id !== "string"
  )
    throw new Error(
      "Projectile snapshot is missing its launch or observations",
    );
  return value as unknown as ProjectileInstance;
}

export function mathBoard(value: unknown): MathBoard | undefined {
  if (!record(value) || typeof value.id !== "string" || !record(value.sequence))
    return undefined;
  switch (value.demo) {
    case "counting":
    case "arithmetic":
    case "equal-groups":
    case "fraction-builder":
    case "fraction-number-line":
      return value as unknown as MathBoard;
    default:
      return undefined;
  }
}

export function mathBoardFor<D extends MathDemo>(value: unknown, demo: D) {
  const board = mathBoard(value);
  return board?.demo === demo
    ? (board as Extract<MathBoard, { demo: D }>)
    : undefined;
}
