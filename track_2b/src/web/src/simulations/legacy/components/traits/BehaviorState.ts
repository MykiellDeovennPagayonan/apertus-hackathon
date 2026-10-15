import type { FieldContract } from "../../runtime/definition";
/** Behavior runner owns requested activity and monotonically increasing request identity. */
export interface BehaviorState {
  activity?: "home" | "work" | "market" | "square";
  target?: { x: number; z: number };
  requestId: number;
}

export const BehaviorStateFields = {
  activity: {
    unit: "routine task",
    role: "state",
    writer: "BehaviorRunnerSystem",
    timing: "live",
  },
  target: {
    unit: "model coordinates",
    role: "state",
    writer: "BehaviorRunnerSystem",
    timing: "live",
  },
  requestId: {
    unit: "request identity",
    role: "state",
    writer: "BehaviorRunnerSystem",
    timing: "live",
  },
} satisfies Record<string, FieldContract>;
