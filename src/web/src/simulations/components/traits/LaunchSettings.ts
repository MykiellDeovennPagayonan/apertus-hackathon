import type { FieldContract } from "../../runtime/definition";
/** Validated inputs; angle 0–90 degrees, speed 5–40 m/s; edits relaunch. */
export interface LaunchSettings {
  angle: number;
  velocity: number;
  origin: { x: number; y: number };
}

export const LaunchSettingsFields = {
  angle: {
    unit: "degrees",
    role: "configuration",
    writer: "launch handler",
    timing: "relaunch",
    range: [0, 90],
  },
  velocity: {
    unit: "m/s",
    role: "configuration",
    writer: "launch handler",
    timing: "relaunch",
    range: [5, 40],
  },
  origin: {
    unit: "metres",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
} satisfies Record<string, FieldContract>;
