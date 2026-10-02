import type { UIAction } from "./types";
export type ActionResult =
  | { accepted: true }
  | { accepted: false; error: string };
export const accepted: ActionResult = { accepted: true };
export const rejected = (error: string): ActionResult => ({
  accepted: false,
  error,
});
export function validNumber(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value >= min &&
    value <= max
  );
}
export type SimulationCommand =
  | {
      type:
        | "SET_ANGLE"
        | "COMPARE_ANGLE"
        | "SET_VELOCITY"
        | "MOVE_LOAD"
        | "SET_LOAD"
        | "SET_TIME"
        | "SET_SPEED";
      value: number;
    }
  | { type: "SET_GRAVITY"; value: string }
  | { type: "SET_PLAYING" | "SET_SLOW_MO"; value: boolean }
  | { type: "SELECT_MEMBER"; value: string | null }
  | {
      type:
        | "CLEAR_COMPARE"
        | "SHOW_VECTORS"
        | "HIDE_VECTORS"
        | "LAUNCH"
        | "RESET"
        | "DOUBLE_LENGTH"
        | "NORMAL_LENGTH"
        | "MORE_TRIANGLES"
        | "REMOVE_MIDDLE"
        | "REBUILD"
        | "CLOSE_ROAD"
        | "OPEN_ROAD"
        | "MOVE_MARKET"
        | "MARKET_BUSY";
    };
export function isSimulationCommand(
  action: UIAction,
): action is SimulationCommand {
  if (
    [
      "SET_ANGLE",
      "COMPARE_ANGLE",
      "SET_VELOCITY",
      "MOVE_LOAD",
      "SET_LOAD",
      "SET_TIME",
      "SET_SPEED",
    ].includes(action.type)
  )
    return typeof action.value === "number";
  if (["SET_PLAYING", "SET_SLOW_MO"].includes(action.type))
    return typeof action.value === "boolean";
  if (action.type === "SET_GRAVITY") return typeof action.value === "string";
  if (action.type === "SELECT_MEMBER")
    return action.value === null || typeof action.value === "string";
  return [
    "CLEAR_COMPARE",
    "SHOW_VECTORS",
    "HIDE_VECTORS",
    "LAUNCH",
    "RESET",
    "DOUBLE_LENGTH",
    "NORMAL_LENGTH",
    "MORE_TRIANGLES",
    "REMOVE_MIDDLE",
    "REBUILD",
    "CLOSE_ROAD",
    "OPEN_ROAD",
    "MOVE_MARKET",
    "MARKET_BUSY",
  ].includes(action.type);
}
