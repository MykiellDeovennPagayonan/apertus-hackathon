import type { FieldContract } from "../../runtime/definition";
export interface Building {
  id: string;
  label: string;
  kind: "house" | "school" | "market" | "workshop" | "square";
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  color: string;
}

export const BuildingFields = {
  kind: {
    unit: "building kind",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  label: {
    unit: "text",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
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
  w: {
    unit: "model units",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  d: {
    unit: "model units",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  h: {
    unit: "display units",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
  color: {
    unit: "display color",
    role: "configuration",
    writer: "construction",
    timing: "construction",
  },
} satisfies Record<string, FieldContract>;
