import type { FieldContract } from "../../runtime/definition";
/** Construction/configuration owns footprints; these block navigation, not physics. */
export interface NavigationObstacle {
  x: number;
  z: number;
  halfWidth: number;
  halfDepth: number;
}

export const NavigationObstacleFields = {
  x: {
    unit: "model units",
    role: "state",
    writer: "building configuration handler",
    timing: "live",
  },
  z: {
    unit: "model units",
    role: "state",
    writer: "building configuration handler",
    timing: "live",
  },
  halfWidth: {
    unit: "model units",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  halfDepth: {
    unit: "model units",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
} satisfies Record<string, FieldContract>;
