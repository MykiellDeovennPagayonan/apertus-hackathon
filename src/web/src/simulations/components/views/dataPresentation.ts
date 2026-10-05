/** Presentation-only contracts. Runtime datasets and model state remain authoritative. */
export type DataColumn = {
  key: string;
  label: string;
  unit?: string;
  type?: "number" | "string" | "boolean";
  precision?: number;
};
export type DataPresentation = {
  columns?: DataColumn[];
  xKey?: string;
  xLabel?: string;
  xUnit?: string;
  yLabel?: string;
  yUnit?: string;
  series?: string[];
  rowLabel?: string;
  columnLabel?: string;
  valueLabel?: string;
  valueUnit?: string;
};
export type PresentedData = {
  state: "ready" | "empty" | "unavailable" | "invalid";
  columns: DataColumn[];
  rows: Record<string, unknown>[];
  assumption?: string;
};
const record = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);
const column = (v: unknown): v is DataColumn =>
  record(v) &&
  typeof v.key === "string" &&
  v.key.length > 0 &&
  typeof v.label === "string" &&
  v.label.length > 0 &&
  (v.unit === undefined || typeof v.unit === "string") &&
  (v.type === undefined ||
    ["number", "string", "boolean"].includes(String(v.type))) &&
  (v.precision === undefined ||
    (Number.isInteger(v.precision) &&
      Number(v.precision) >= 0 &&
      Number(v.precision) <= 8));
const knownColumns: Record<string, Omit<DataColumn, "key">> = {
  x: { label: "x", type: "number" },
  y: { label: "y", type: "number" },
  time: { label: "Time", type: "number" },
  outcome: { label: "Outcome", type: "string" },
  observed: { label: "Observed", unit: "trials", type: "number" },
  expected: { label: "Expected", unit: "trials", type: "number" },
  element: { label: "Element", type: "string" },
  left: { label: "Left side", type: "number" },
  right: { label: "Right side", type: "number" },
  step: { label: "Step" },
  explanation: { label: "Explanation", type: "string" },
  value: { label: "Value" },
  id: { label: "Observation" },
};
export function presentData(
  value: unknown,
  presentation: DataPresentation = {},
): PresentedData {
  const result: PresentedData = { state: "ready", columns: [], rows: [] };
  if (value == null) return { ...result, state: "unavailable" };
  const typed = record(value) && "rows" in value;
  const rows = typed ? value.rows : value;
  const declared = presentation.columns ?? (typed ? value.columns : undefined);
  if (typed && !Array.isArray(value.columns))
    return { ...result, state: "invalid" };
  if (
    !Array.isArray(rows) ||
    rows.length > 1000 ||
    rows.some((r) => !record(r))
  )
    return { ...result, state: "invalid" };
  if (
    declared !== undefined &&
    (!Array.isArray(declared) ||
      !declared.length ||
      declared.length > 32 ||
      !declared.every(column) ||
      new Set(declared.map((c) => c.key)).size !== declared.length)
  )
    return { ...result, state: "invalid" };
  const keys = [...new Set(rows.flatMap(Object.keys))];
  if (keys.length > 32 || (rows.length > 0 && !keys.length))
    return { ...result, state: "invalid" };
  const columns: DataColumn[] =
    declared ??
    keys.map((key) => {
      const values = rows
        .map((r) => r[key])
        .filter((v) => v != null && v !== "");
      const type =
        values.length && values.every((v) => typeof v === "number")
          ? "number"
          : undefined;
      return { key, ...knownColumns[key], ...(type ? { type } : {}) };
    });
  return {
    state: rows.length ? "ready" : "empty",
    columns,
    rows,
    assumption:
      typed && typeof value.assumption === "string"
        ? value.assumption
        : undefined,
  };
}
export function dataCell(
  value: unknown,
  c: DataColumn,
  precision = 3,
): { text: string; state: "valid" | "missing" | "invalid" } {
  if (record(value) && value.status === "unavailable")
    return { text: "Unavailable", state: "missing" };
  if (value == null || value === "")
    return { text: "Missing", state: "missing" };
  if (
    (c.type && typeof value !== c.type) ||
    (typeof value === "number" && !Number.isFinite(value)) ||
    !["number", "string", "boolean"].includes(typeof value)
  )
    return { text: "Invalid", state: "invalid" };
  return {
    text:
      typeof value === "number"
        ? formatDataNumber(value, c.precision ?? precision)
        : typeof value === "boolean"
          ? value
            ? "Yes"
            : "No"
          : String(value),
    state: "valid",
  };
}
export function formatDataNumber(value: number, precision = 3): string {
  if (
    value !== 0 &&
    (Math.abs(value) < 10 ** -precision || Math.abs(value) >= 1e7)
  )
    return value.toExponential(Math.min(precision, 3));
  return value.toLocaleString(undefined, { maximumFractionDigits: precision });
}
export function outputDataPresentation(
  definition: string,
  output: string,
): DataPresentation {
  if (output === "frequencies")
    return {
      columns: [
        { key: "outcome", label: "Outcome", type: "string" },
        {
          key: "observed",
          label: "Observed",
          unit: "trials",
          type: "number",
          precision: 0,
        },
        { key: "expected", label: "Expected", unit: "trials", type: "number" },
      ],
      xLabel: "Outcome",
      yLabel: "Frequency",
      yUnit: "trials",
    };
  if (
    output === "field" &&
    definition === "prefabs/natural-systems/DiffusionField"
  )
    return {
      rowLabel: "Row",
      columnLabel: "Column",
      valueLabel: "Dye concentration",
      valueUnit: "mass units/m²",
    };
  if (
    ["points", "comparisonPoints"].includes(output) &&
    definition === "prefabs/natural-systems/PlantGrowth"
  )
    return {
      xKey: "x",
      xLabel: "Time",
      xUnit: "days",
      yLabel: "Biomass",
      yUnit: "illustrative biomass units",
      columns: [
        { key: "x", label: "Time", unit: "days", type: "number" },
        {
          key: "y",
          label: "Biomass",
          unit: "illustrative biomass units",
          type: "number",
        },
      ],
    };
  if (["points", "comparisonPoints"].includes(output)) {
    if (definition === "prefabs/natural-systems/PredatorPrey")
      return {
        xKey: "x",
        xLabel: "Model time",
        xUnit: "days",
        yLabel: "Population",
        yUnit: "population",
        columns: [
          { key: "x", label: "Model time", unit: "days", type: "number" },
          {
            key: "rabbits",
            label: "Rabbits",
            unit: "population",
            type: "number",
          },
          { key: "foxes", label: "Foxes", unit: "population", type: "number" },
        ],
      };
    const axes =
      definition === "prefabs/physical-systems/Pendulum"
        ? ["Model time", "s", "Angle", "degrees"]
        : definition === "prefabs/chemistry/ReactionRate"
          ? ["Model time", "s", "Reactant concentration", "mol/L"]
          : definition === "prefabs/dynamic-systems/RingTraffic"
            ? ["Model time", "s", "Average speed", "m/s"]
            : definition === "prefabs/dynamic-systems/CheckoutQueue"
              ? ["Arrival time", "min", "Waiting time", "min"]
              : definition === "prefabs/physical-systems/RollingTrack"
                ? ["Distance", "m", "Track height", "m"]
                : undefined;
    if (axes)
      return {
        xKey: "x",
        xLabel: axes[0],
        xUnit: axes[1],
        yLabel: axes[2],
        yUnit: axes[3],
        columns: [
          { key: "x", label: axes[0], unit: axes[1], type: "number" },
          { key: "y", label: axes[2], unit: axes[3], type: "number" },
        ],
      };
  }
  if (output === "atoms")
    return {
      columns: [
        { key: "element", label: "Element", type: "string" },
        { key: "left", label: "Reactant atoms", unit: "atoms", type: "number" },
        { key: "right", label: "Product atoms", unit: "atoms", type: "number" },
        { key: "conserved", label: "Conserved", type: "boolean" },
      ],
    };
  return {};
}
