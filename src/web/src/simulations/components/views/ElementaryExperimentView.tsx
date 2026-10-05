import { useElementaryStore } from "../../runtime/elementarySession";
import { dispatchCommand, getActiveDefinition } from "../../runtime/session";
import { ActionButton } from "../controls/ActionButton";
import { DragHandleControl } from "../controls/DragHandleControl";
import { NumberField } from "../controls/NumberField";
import {
  CoordinateAxesVisual,
  DimensionLabelVisual,
  RatioBarVisual,
} from "../visuals/ElementaryVisuals";
import { ControlsOverlay } from "./ControlsOverlay";
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
  const edit = (value: Record<string, unknown>) =>
    dispatchCommand(s.demo, {
      type: action,
      target: s.id,
      value: { ...p, ...value },
    });
  const field = (
    key: string,
    label: string,
    min: number,
    max: number,
    step = 1,
  ) => (
    <NumberField
      key={key}
      label={label}
      value={Number(p[key])}
      min={min}
      max={max}
      step={step}
      onChange={(value) => edit({ [key]: value })}
    />
  );
  const views = definition?.components.views ?? [];
  const frequencies =
    "frequencies" in s.outputs ? s.outputs.frequencies : undefined;
  const ratio = Number("ratio" in s.outputs ? s.outputs.ratio : 0);
  const instructions = {
    "area-perimeter":
      "Change the side lengths and compare the area with the perimeter.",
    coordinates:
      "Drag the point, use the arrow keys, or enter its coordinates.",
    ratio: "Change the selected parts or the whole to explore percentages.",
    probability: "Choose a coin or die, then run another set of trials.",
  };
  return (
    <main className={`elementary-experiment elementary-experiment--${s.demo}`}>
      <p className="experiment-instruction">{instructions[s.demo]}</p>
      <div className="experiment-diagram">
        {views.includes("SVGWorldView") && (
          <>
            {s.demo === "ratio" && <RatioBarVisual ratio={ratio} />}
            {s.demo === "area-perimeter" && (
              <DimensionLabelVisual
                width={Number(p.width)}
                height={Number(p.height)}
              />
            )}
            {s.demo === "coordinates" && (
              // biome-ignore lint/a11y/useSemanticElements: Interactive SVG contains a keyboard-operable point.
              <svg
                viewBox="0 0 440 440"
                role="group"
                aria-label="Interactive coordinate plane; one square is one unit"
              >
                <CoordinateAxesVisual />
                <circle
                  cx={220 + Number(p.x) * 18}
                  cy={220 - Number(p.y) * 18}
                  r="6"
                  fill="var(--accent)"
                />
                <DragHandleControl
                  onCommand={(command) => dispatchCommand(s.demo, command)}
                  target={s.id}
                  cx={220 + Number(p.x) * 18}
                  cy={220 - Number(p.y) * 18}
                  keyboardStep={18}
                  label="Move coordinate point"
                  map={(x, y) => ({
                    type: "MOVE_POINT",
                    value: {
                      x: Math.max(
                        -10,
                        Math.min(10, Math.round(((x - 220) / 18) * 10) / 10),
                      ),
                      y: Math.max(
                        -10,
                        Math.min(10, Math.round(((220 - y) / 18) * 10) / 10),
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
      </div>
      <section
        className="experiment-interaction"
        aria-label="Try the experiment"
      >
        <div className="experiment-fields">
          {s.demo === "area-perimeter" && (
            <>
              {field("width", "Width (m)", 0.1, 100, 0.1)}
              {field("height", "Height (m)", 0.1, 100, 0.1)}
            </>
          )}
          {s.demo === "coordinates" && (
            <>
              {field("x", "x", -10, 10, 0.1)}
              {field("y", "y", -10, 10, 0.1)}
            </>
          )}
          {s.demo === "ratio" && (
            <>
              {field("numerator", "Selected parts", 0, 1000)}
              {field("denominator", "Parts in a whole", 1, 1000)}
            </>
          )}
          {s.demo === "probability" && (
            <>
              <label className="experiment-number">
                <span>Experiment</span>
                <select
                  value={String(p.preset)}
                  onChange={(e) => edit({ preset: e.target.value })}
                >
                  <option value="coin">Coin</option>
                  <option value="die">Six-sided die</option>
                </select>
              </label>
              {field("trials", "Number of trials", 1, 10000)}
              <ActionButton
                onCommand={() =>
                  edit({ seed: (Number(p.seed) + 1) % 4294967296 })
                }
              >
                Run again
              </ActionButton>
            </>
          )}
        </div>
        {s.demo === "area-perimeter" && (
          <div className="experiment-results" aria-live="polite">
            <output aria-label="Area">
              <span>Area</span>
              <strong>
                {Number(
                  "area" in s.outputs ? s.outputs.area : 0,
                ).toLocaleString()}{" "}
                m²
              </strong>
              <small>
                {String(p.width)} × {String(p.height)}
              </small>
            </output>
            <output aria-label="Perimeter">
              <span>Perimeter</span>
              <strong>
                {Number(
                  "perimeter" in s.outputs ? s.outputs.perimeter : 0,
                ).toLocaleString()}{" "}
                m
              </strong>
              <small>
                2 × ({String(p.width)} + {String(p.height)})
              </small>
            </output>
          </div>
        )}
        {s.demo === "coordinates" && (
          <output
            className="experiment-answer"
            aria-label="Point coordinates"
            aria-live="polite"
          >
            ({String(p.x)}, {String(p.y)})
            <small>One square = one unit · Shift + arrow for 0.1 steps</small>
          </output>
        )}
        {s.demo === "ratio" && (
          <output className="experiment-answer" aria-live="polite">
            {String(p.numerator)} / {String(p.denominator)} ={" "}
            {(ratio * 100).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            %
            <small>
              {ratio > 1
                ? `${Math.floor(ratio)} whole${Math.floor(ratio) === 1 ? "" : "s"}${ratio % 1 ? " and part of another" : ""}`
                : "The shaded part of one whole"}
            </small>
          </output>
        )}
        <ActionButton
          className="experiment-reset"
          onCommand={() => dispatchCommand(s.demo, { type: "RESET" })}
        >
          Reset
        </ActionButton>
      </section>
      {frequencies && views.includes("ResultsTableView") && (
        <ResultsTableView
          dataset={{
            columns: [
              { key: "outcome", label: "Outcome", unit: "", type: "string" },
              { key: "observed", label: "Observed", unit: "", type: "number" },
              { key: "expected", label: "Expected", unit: "", type: "number" },
            ],
            rows: frequencies,
            assumption: `Results from ${Number(p.trials).toLocaleString()} trials`,
          }}
        />
      )}
      <ControlsOverlay>
        {s.demo === "probability" && (
          <>
            <p>
              Use the same seed to reproduce a set of trials. Run again chooses
              the next seed.
            </p>
            {field("seed", "Random seed", 0, 4294967295)}
          </>
        )}
        <details>
          <summary>About this model</summary>
          {definition?.assumptions.map((a) => (
            <p key={a}>{a}</p>
          ))}
        </details>
        {views.includes("EntityInspectorView") && (
          <EntityInspectorView
            demo={s.demo}
            id={s.id}
            label="activity"
            parameters={p}
            outputs={s.outputs}
            assumptions={definition?.assumptions ?? []}
          />
        )}
      </ControlsOverlay>
    </main>
  );
}
