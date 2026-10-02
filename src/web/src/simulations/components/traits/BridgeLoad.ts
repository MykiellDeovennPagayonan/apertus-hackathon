import type { FieldContract } from "../../runtime/definition";
/** Validated live inputs, position 0.05–0.95 and magnitude 2–30 in the demo tonne convention. */
export interface BridgeLoad {
  id: string;
  assembly: string;
  position: number;
  magnitude: number;
}

export const BridgeLoadFields = {
  assembly: {
    unit: "assembly ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  position: {
    unit: "span fraction",
    role: "configuration",
    writer: "load handler",
    timing: "live",
    range: [0.05, 0.95],
  },
  magnitude: {
    unit: "demo tonnes",
    role: "configuration",
    writer: "load handler",
    timing: "live",
    range: [2, 30],
  },
} satisfies Record<string, FieldContract>;
