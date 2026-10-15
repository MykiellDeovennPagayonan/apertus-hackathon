import type { FieldContract } from "../../runtime/definition";
/** Model pose; units/plane are declared by the composition. Ballistics or path following owns updates. */
export interface Transform2D {
  position: { x: number; y: number };
  heading: number;
  scale?: number;
}

export const Transform2DFields = {
  position: {
    unit: "composition units",
    role: "state",
    writer: "declared movement provider",
    timing: "model-step",
  },
  heading: {
    unit: "radians",
    role: "state",
    writer: "declared movement provider",
    timing: "model-step",
  },
} satisfies Record<string, FieldContract>;
