import { dispatchCommand } from "../../runtime/session";
import type { DemoType } from "../../runtime/types";
import { ParameterSlider } from "../controls/ParameterSlider";
import "../../../creation-and-editing/simulation/recipe-lesson.css";

type InspectionState = "ready" | "empty" | "unavailable" | "invalid";
export type InspectionEntry = {
  path: string;
  label: string;
  group?: string;
  text: string;
  unit?: string;
  state: InspectionState;
};
export type InspectionPresentation = {
  state: InspectionState;
  entries: InspectionEntry[];
  truncated: boolean;
};

const fieldPresentation: Record<
  string,
  { label: string; unit?: string; precision?: number }
> = {
  angle: { label: "Launch angle", unit: "°", precision: 1 },
  velocity: { label: "Launch speed", unit: "m/s", precision: 2 },
  speed: { label: "Speed", unit: "m/s", precision: 2 },
  gravity: { label: "Gravity", unit: "m/s²", precision: 2 },
  range: { label: "Distance travelled", unit: "m", precision: 2 },
  maxHeight: { label: "Maximum height", unit: "m", precision: 2 },
  duration: { label: "Flight time", unit: "s", precision: 2 },
  elapsed: { label: "Elapsed time", unit: "s", precision: 2 },
  playing: { label: "Playback" },
  slowMo: { label: "Slow motion" },
  trajectoryVisible: { label: "Trajectory" },
  showVectors: { label: "Velocity vectors" },
  numerator: { label: "Shaded parts" },
  denominator: { label: "Total parts" },
  n: { label: "Shaded parts" },
  d: { label: "Total parts" },
  classification: { label: "State" },
  score: { label: "Relative load", precision: 2 },
  kind: { label: "Type" },
  status: { label: "Status" },
  count: { label: "Count" },
  population: { label: "Population" },
  time: { label: "Time" },
  temperature: { label: "Temperature" },
  pressure: { label: "Pressure" },
  volume: { label: "Volume" },
  a: { label: "Start joint" },
  b: { label: "End joint" },
  id: { label: "Object" },
  present: { label: "Included in structure" },
};

const groupPresentation: Record<string, string> = {
  inputs: "Inputs",
  outputs: "Observations",
  launch: "Launch settings",
  metrics: "Observations",
  position: "Position",
  motion: "Motion",
  value: "Value",
  a: "First value",
  b: "Second value",
};

const unavailableRecord = (
  value: unknown,
): value is { status: "unavailable"; reason?: unknown } =>
  !!value &&
  typeof value === "object" &&
  !Array.isArray(value) &&
  (value as Record<string, unknown>).status === "unavailable";

function numericText(value: number, precision: number) {
  if (!Number.isFinite(value)) return "Unavailable";
  const absolute = Math.abs(value);
  if (absolute !== 0 && (absolute < 1e-6 || absolute >= 1e9))
    return value.toExponential(Math.min(precision, 6));
  return value.toLocaleString(undefined, {
    maximumFractionDigits: precision,
  });
}

function referenceText(value: string, path: string[]) {
  const key = path.at(-1);
  if (!["a", "b", "id"].includes(String(key)) || !value.includes("/"))
    return value;
  const name = value.split("/").at(-1) ?? value;
  if (key === "a" || key === "b") return name.toUpperCase();
  return name
    .replace(/([a-z])([0-9])/gi, "$1 $2")
    .replace(/^./, (character) => character.toUpperCase());
}

function presentationFor(path: string[], precision: number) {
  const key = path.at(-1) ?? "value";
  const metadata = fieldPresentation[key];
  return {
    label: metadata?.label ?? key,
    unit: metadata?.unit,
    precision: metadata?.precision ?? precision,
    group:
      path.length > 1
        ? (groupPresentation[path[0]] ??
          fieldPresentation[path[0]]?.label ??
          path[0])
        : undefined,
  };
}

/** Converts bounded structured output into readable rows without exposing JSON. */
export function presentInspection(
  value: unknown,
  precision = 3,
  rootUnit = "",
): InspectionPresentation {
  const entries: InspectionEntry[] = [];
  let truncated = false;
  const add = (
    path: string[],
    text: string,
    state: InspectionState = "ready",
    unit?: string,
  ) => {
    if (entries.length >= 40) {
      truncated = true;
      return;
    }
    const metadata = presentationFor(path, precision);
    entries.push({
      path: path.join("."),
      label: metadata.label,
      group: metadata.group,
      text,
      unit: unit ?? metadata.unit,
      state,
    });
  };
  const visit = (current: unknown, path: string[], depth: number) => {
    if (entries.length >= 40) {
      truncated = true;
      return;
    }
    if (unavailableRecord(current)) {
      add(
        path,
        typeof current.reason === "string" ? current.reason : "Unavailable",
        "unavailable",
      );
      return;
    }
    if (current === undefined || current === null) {
      add(path, "Unavailable", "unavailable");
      return;
    }
    if (typeof current === "number") {
      const metadata = presentationFor(path, precision);
      add(
        path,
        numericText(current, metadata.precision),
        Number.isFinite(current) ? "ready" : "invalid",
        path.length === 1 ? rootUnit || metadata.unit : metadata.unit,
      );
      return;
    }
    if (typeof current === "boolean") {
      const key = path.at(-1);
      add(
        path,
        key === "playing"
          ? current
            ? "Running"
            : "Paused"
          : current
            ? "Enabled"
            : "Disabled",
      );
      return;
    }
    if (typeof current === "string") {
      add(
        path,
        current ? referenceText(current, path) : "Empty",
        current ? "ready" : "empty",
      );
      return;
    }
    if (Array.isArray(current)) {
      if (!current.length) {
        add(path, "No items", "empty");
        return;
      }
      if (depth >= 3 || current.length > 12) {
        add(path, `${current.length.toLocaleString()} items`);
        return;
      }
      current.forEach((item, index) => {
        visit(item, [...path, `Item ${index + 1}`], depth + 1);
      });
      return;
    }
    if (typeof current === "object") {
      const fields: [string, unknown][] = [];
      for (const key in current)
        if (Object.hasOwn(current, key)) {
          if (fields.length >= 40) {
            truncated = true;
            break;
          }
          fields.push([key, (current as Record<string, unknown>)[key]]);
        }
      if (!fields.length) {
        add(path, "No properties", "empty");
        return;
      }
      if (depth >= 3) {
        add(path, `${fields.length.toLocaleString()} properties`);
        return;
      }
      for (const [key, nested] of fields)
        visit(nested, path.length ? [...path, key] : [key], depth + 1);
      return;
    }
    add(path, "Cannot be displayed", "invalid");
  };
  visit(
    value,
    value && typeof value === "object" && !Array.isArray(value)
      ? []
      : ["value"],
    0,
  );
  const states = new Set(entries.map((entry) => entry.state));
  const state: InspectionState = entries.some(
    (entry) => entry.state === "ready",
  )
    ? "ready"
    : states.has("invalid")
      ? "invalid"
      : states.has("unavailable")
        ? "unavailable"
        : "empty";
  return { state, entries, truncated };
}

export function PropertyInspector({
  label,
  value,
  precision = 3,
  unit = "",
}: {
  label: string;
  value: unknown;
  precision?: number;
  unit?: string;
}) {
  const presentation = presentInspection(value, precision, unit);
  const groups = new Map<string, InspectionEntry[]>();
  for (const entry of presentation.entries) {
    const group = entry.group ?? "";
    groups.set(group, [...(groups.get(group) ?? []), entry]);
  }
  return (
    <section className="property-inspector" aria-label={label}>
      <header className="property-inspector__header">
        <h3>{label}</h3>
        <span>
          {presentation.entries.length}{" "}
          {presentation.entries.length === 1 ? "property" : "properties"}
        </span>
      </header>
      {[...groups].map(([group, entries]) => (
        <section
          className="property-inspector__group"
          key={group || "properties"}
        >
          {group && <h4>{group}</h4>}
          <dl className="property-inspector__list">
            {entries.map((entry) => (
              <div
                className={`property-inspector__row property-inspector__row--${entry.state}`}
                key={entry.path}
              >
                <dt>{entry.label}</dt>
                <dd>
                  <span>{entry.text}</span>
                  {entry.unit && <small>{entry.unit}</small>}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      ))}
      {presentation.truncated && (
        <p className="property-inspector__note">
          Showing the first 40 properties. Use a table for larger collections.
        </p>
      )}
    </section>
  );
}

export function EntityInspectorView({
  demo,
  id,
  label,
  parameters,
  outputs,
  assumptions,
}: {
  demo: DemoType;
  id: string;
  label?: string;
  parameters: Record<string, unknown>;
  outputs: Record<string, unknown>;
  assumptions: readonly string[];
}) {
  const name = label || "object";
  const speed = Number(parameters.speed);
  return (
    <details className="entity-inspector">
      <summary>Inspect {name}</summary>
      <div className="entity-inspector__content">
        {demo === "projectile" && Number.isFinite(speed) && (
          <section
            className="entity-inspector__editing"
            aria-label="Adjust object"
          >
            <h3>Adjust object</h3>
            <ParameterSlider
              label="Launch speed"
              value={speed}
              min={5}
              max={40}
              step={1}
              display={`${speed.toLocaleString()} m/s`}
              onChange={(value) =>
                dispatchCommand(demo, {
                  type: "SET_VELOCITY",
                  target: id,
                  value,
                })
              }
            />
          </section>
        )}
        <PropertyInspector label="Inputs" value={parameters} />
        <PropertyInspector label="Observations" value={outputs} />
        {!!assumptions.length && (
          <details className="entity-inspector__notes">
            <summary>About this model</summary>
            <ul>
              {assumptions.map((assumption) => (
                <li key={assumption}>{assumption}</li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </details>
  );
}
