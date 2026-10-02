import { useElementaryStore } from "../../runtime/elementarySession";
import { dispatchCommand, getActiveDefinition } from "../../runtime/session";
import { DragHandleControl } from "../controls/DragHandleControl";
import type { Dataset } from "../traits/MeasurementProbe";
import {
  CoordinateAxesVisual,
  DimensionLabelVisual,
  RatioBarVisual,
} from "../visuals/ElementaryVisuals";
import { EntityInspectorView } from "./EntityInspectorView";
import { HistogramView } from "./HistogramView";
import { ResultsTableView } from "./ResultsTableView";
export function ElementaryExperimentView() {
  const s = useElementaryStore(),
    definition = getActiveDefinition(),
    p = s.parameters;
  const action =
    s.demo === "ratio"
      ? "SET_RATIO"
      : s.demo === "area-perimeter"
        ? "SET_DIMENSIONS"
        : s.demo === "coordinates"
          ? "MOVE_POINT"
          : "SET_DISTRIBUTION";
  const numericFields = Object.entries(p).filter(
    ([, v]) => typeof v === "number",
  );
  const frequencies =
    "frequencies" in s.outputs ? s.outputs.frequencies : undefined;
  const dataset: Dataset = frequencies
    ? {
        columns: [
          { key: "outcome", label: "Outcome", unit: "", type: "string" },
          {
            key: "observed",
            label: "Observed",
            unit: "trials",
            type: "number",
          },
          {
            key: "expected",
            label: "Expected",
            unit: "trials",
            type: "number",
          },
        ],
        rows: frequencies,
        assumption: definition?.assumptions[0] ?? "",
      }
    : {
        columns: [
          {
            key: "measurement",
            label: "Measurement",
            unit: "",
            type: "string",
          },
          {
            key: "value",
            label: "Value",
            unit: s.demo === "coordinates" ? "math units" : "see measurement",
            type: "number",
          },
        ],
        rows: Object.entries(s.outputs).map(([key, value]) => ({
          measurement:
            key === "area"
              ? "Area (m²)"
              : key === "perimeter"
                ? "Perimeter (m)"
                : key === "percentage"
                  ? "Percentage (%)"
                  : key,
          value: Number(value),
        })),
        assumption: definition?.assumptions[0] ?? "",
      };
  const views = definition?.components.views ?? [];
  return (
    <main
      style={{
        padding: 24,
        width: "100%",
        maxWidth: 1000,
        margin: "auto",
        overflowY: "auto",
      }}
    >
      {views.includes("SVGWorldView") && (
        <>
          {s.demo === "ratio" && (
            <RatioBarVisual
              ratio={Number("ratio" in s.outputs ? s.outputs.ratio : 0)}
            />
          )}
          {s.demo === "area-perimeter" && (
            <DimensionLabelVisual
              width={Number(p.width)}
              height={Number(p.height)}
            />
          )}
          {s.demo === "coordinates" && (
            <svg
              viewBox="0 0 600 300"
              role="img"
              aria-label="Coordinate plane in math units"
              style={{ width: "100%" }}
            >
              <CoordinateAxesVisual />
              <circle
                cx={280 + Number(p.x) * 24}
                cy={140 - Number(p.y) * 12}
                r="6"
                fill="var(--accent)"
              />
              <text x="40" y="290">
                ({String(p.x)}, {String(p.y)}) · math units
              </text>
              <DragHandleControl
                demo={s.demo}
                target={s.id}
                cx={280 + Number(p.x) * 24}
                cy={140 - Number(p.y) * 12}
                label="Move coordinate point"
                map={(x, y) => ({
                  type: "MOVE_POINT",
                  value: {
                    x: Math.max(
                      -10,
                      Math.min(10, Math.round(((x - 280) / 24) * 10) / 10),
                    ),
                    y: Math.max(
                      -10,
                      Math.min(10, Math.round(((140 - y) / 12) * 10) / 10),
                    ),
                  },
                })}
              />
            </svg>
          )}
        </>
      )}
      {frequencies && views.includes("HistogramView") && (
        <HistogramView frequencies={frequencies} />
      )}
      <div style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {numericFields.map(([key, value]) => (
          <label key={key}>
            {key}
            {s.demo === "area-perimeter" ? " (m)" : ""}{" "}
            <input
              type="number"
              aria-label={key}
              step={
                s.demo === "area-perimeter" || s.demo === "coordinates"
                  ? 0.1
                  : 1
              }
              min={
                key === "denominator" || key === "trials"
                  ? 1
                  : s.demo === "coordinates"
                    ? -10
                    : s.demo === "area-perimeter"
                      ? 0.1
                      : 0
              }
              max={
                key === "seed"
                  ? 4294967295
                  : key === "trials"
                    ? 10000
                    : s.demo === "coordinates"
                      ? 10
                      : s.demo === "area-perimeter"
                        ? 100
                        : 1000
              }
              value={Number(value)}
              onChange={(e) =>
                dispatchCommand(s.demo, {
                  type: action,
                  target: s.id,
                  value: { ...p, [key]: Number(e.target.value) },
                })
              }
            />
          </label>
        ))}
        {s.demo === "probability" && (
          <label>
            Distribution{" "}
            <select
              value={String(p.preset)}
              onChange={(e) =>
                dispatchCommand(s.demo, {
                  type: action,
                  target: s.id,
                  value: { ...p, preset: e.target.value },
                })
              }
            >
              <option value="coin">Coin</option>
              <option value="die">Six-sided die</option>
            </select>
          </label>
        )}
        <button
          type="button"
          onClick={() => dispatchCommand(s.demo, { type: "RESET" })}
        >
          Reset
        </button>
      </div>
      {views.includes("ResultsTableView") && (
        <ResultsTableView dataset={dataset} />
      )}
      {views.includes("EntityInspectorView") && (
        <EntityInspectorView
          demo={s.demo}
          id={s.id}
          parameters={p}
          outputs={s.outputs}
          assumptions={definition?.assumptions ?? []}
        />
      )}
    </main>
  );
}
