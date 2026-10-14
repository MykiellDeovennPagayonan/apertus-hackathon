import type { FieldContract } from "../../runtime/definition";
/** BallisticMotionSystem-owned analytic outputs, metres and seconds. */
export interface FlightMetrics {
  range: number;
  maxHeight: number;
  duration: number;
}

export const FlightMetricsFields = {
  range: {
    unit: "metres",
    role: "output",
    writer: "BallisticMotionSystem",
    timing: "relaunch",
  },
  maxHeight: {
    unit: "metres",
    role: "output",
    writer: "BallisticMotionSystem",
    timing: "relaunch",
  },
  duration: {
    unit: "seconds",
    role: "output",
    writer: "BallisticMotionSystem",
    timing: "relaunch",
  },
} satisfies Record<string, FieldContract>;
