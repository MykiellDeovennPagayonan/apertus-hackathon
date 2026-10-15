import { choice, identity, num, object } from "../../../registry/contracts/parameterSchema";
export interface Dataset {
  columns: {
    key: string;
    label: string;
    unit: string;
    type: "number" | "string";
  }[];
  rows: Record<string, number | string>[];
  assumption: string;
}
export interface MeasurementProbe {
  target: string;
  observable: "x" | "y" | "speed";
  interval: number;
  maxSamples: number;
}
export function validateDataset(dataset: Dataset) {
  if (
    !dataset ||
    !Array.isArray(dataset.columns) ||
    dataset.columns.length < 1 ||
    dataset.columns.length > 12 ||
    !Array.isArray(dataset.rows) ||
    dataset.rows.length > 1000
  )
    throw new Error("Invalid bounded dataset");
  const keys = new Set<string>();
  for (const c of dataset.columns) {
    if (
      keys.has(c.key) ||
      !c.key ||
      !["number", "string"].includes(c.type) ||
      c.label.length > 100 ||
      c.unit.length > 50
    )
      throw new Error("Invalid dataset columns");
    keys.add(c.key);
  }
  for (const row of dataset.rows) {
    if (Object.keys(row).some((k) => !keys.has(k)))
      throw new Error("Unknown dataset column");
    for (const c of dataset.columns)
      if (
        typeof row[c.key] !== c.type ||
        (c.type === "number" && !Number.isFinite(row[c.key]))
      )
        throw new Error(`Invalid dataset ${c.key}`);
  }
}

export const measurementProbeSchema = object({
  target: identity,
  observable: choice("x", "y", "speed"),
  interval: num(0.02, 60, "s"),
  maxSamples: num(1, 1000, "samples", true),
});
