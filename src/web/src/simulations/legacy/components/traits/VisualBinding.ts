import type { FieldContract } from "../../runtime/definition";
/** Construction-owned binding read by presentation; dimensions are world or screen units explicitly. */
export interface VisualBinding {
  visual: string;
  target: "svg" | "three";
  resources: string[];
  appearance?: Record<string, string | number | boolean>;
}

export const VisualBindingFields = {
  visual: {
    unit: "definition ID",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  target: {
    unit: "rendering backend",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  resources: {
    unit: "definition IDs",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  appearance: {
    unit: "display values",
    role: "configuration",
    writer: "presentation configuration",
    timing: "live",
  },
} satisfies Record<string, FieldContract>;
