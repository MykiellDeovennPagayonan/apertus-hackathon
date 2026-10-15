import type { FieldContract } from "../../runtime/definition";
/** BallisticMotionSystem-owned output, elapsed seconds and velocity in m/s. */
export interface BallisticMotion {
  elapsed: number;
  velocity: { x: number; y: number };
  status: "flying" | "landed";
}

export const BallisticMotionFields = {
  elapsed: {
    unit: "seconds",
    role: "state",
    writer: "BallisticMotionSystem",
    timing: "model-step",
  },
  velocity: {
    unit: "m/s",
    role: "output",
    writer: "BallisticMotionSystem",
    timing: "model-step",
  },
  status: {
    unit: "flight status",
    role: "output",
    writer: "BallisticMotionSystem",
    timing: "model-step",
  },
} satisfies Record<string, FieldContract>;
