"use client";

import { type FormEvent, useId, useState } from "react";
import { modelProvider } from "../../../runtime/assembly";
import { useAssemblyStore } from "../../../runtime/assemblySession";
import type { ModelInstance } from "../../../runtime/contribution";
import { dispatchCommand } from "../../../runtime/session";
import { useCompactDiagram } from "../useCompactDiagram";
import "./AssemblyView.css";

type Point = { x: number; y: number };
const palette = ["#285e56", "#a66f1f", "#514381", "#586600"];
const numberText = (value: unknown, digits = 6) =>
  typeof value === "number"
    ? value.toLocaleString("en", { maximumFractionDigits: digits })
    : String(value);

function runCommand(
  instance: ModelInstance,
  type: string,
  report: (message: string) => void,
  value?: number,
) {
  const result = dispatchCommand("assembly", {
    type,
    target: instance.id,
    ...(value === undefined ? {} : { value }),
  });
  report(
    result.accepted
      ? ""
      : (result.error ?? "That change could not be applied.").replace(
          /^commands\[\d+\] [^:]+:\s*/,
          "",
        ),
  );
  return result;
}

function ResetButton({ report }: { report: (message: string) => void }) {
  return (
    <button
      className="foundation-reset"
      type="button"
      onClick={() => {
        const result = dispatchCommand("assembly", {
          type: "RESET",
          target: "session",
        });
        report(result.accepted ? "" : (result.error ?? "Reset failed."));
      }}
    >
      Reset
    </button>
  );
}

function ExactNumberControl({
  instance,
  action,
  label,
  value,
  min,
  max,
  step = "any",
  report,
}: {
  instance: ModelInstance;
  action: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number | "any";
  report: (message: string) => void;
}) {
  const id = useId();
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    const result = runCommand(
      instance,
      action,
      report,
      Number(editing ? draft : value),
    );
    if (result.accepted) setEditing(false);
  };
  return (
    <form className="foundation-exact" onSubmit={submit}>
      <label htmlFor={id}>{label}</label>
      <div>
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step={step}
          value={editing ? draft : String(value)}
          onChange={(event) => {
            setDraft(event.target.value);
            setEditing(true);
          }}
        />
        <button type="submit">Set</button>
      </div>
    </form>
  );
}

function ModelDetails({ instances }: { instances: ModelInstance[] }) {
  return (
    <details className="foundation-details">
      <summary>How this model works</summary>
      {instances.flatMap((instance) =>
        modelProvider(instance.provider).assumptions.map((assumption) => (
          <p key={`${instance.id}:${assumption}`}>{assumption}</p>
        )),
      )}
    </details>
  );
}

function EquationLesson({
  instance,
  report,
}: {
  instance: ModelInstance;
  report: (message: string) => void;
}) {
  const output = instance.outputs;
  const coefficient = Number(output.leftCoefficient),
    constant = Number(output.leftConstant),
    right = Number(output.right);
  const steps = output.steps as string[];
  const solved = coefficient === 1 && constant === 0;
  const nextAction =
    constant !== 0 ? "subtract" : coefficient !== 1 ? "divide" : null;
  const operationValue = nextAction === "subtract" ? constant : coefficient;
  const operationLabel =
    nextAction === "subtract"
      ? constant < 0
        ? `Add ${Math.abs(constant)} to both sides`
        : `Subtract ${constant} from both sides`
      : `Divide both sides by ${coefficient}`;
  const leftTerms = [];
  if (coefficient !== 0) {
    if (Number.isInteger(coefficient) && coefficient > 0 && coefficient <= 4) {
      for (let index = 0; index < coefficient; index += 1)
        leftTerms.push(
          <span className="equation-x-tile" key={`x-${index}`}>
            x
          </span>,
        );
    } else
      leftTerms.push(
        <span className="equation-x-tile" key="coefficient">
          {coefficient}x
        </span>,
      );
  }
  return (
    <>
      <div className="foundation-layout equation-layout">
        <section className="foundation-scene" aria-label="Equation balance">
          <p className="foundation-eyebrow">Keep both sides equal</p>
          <div className="equation-display" aria-live="polite">
            {String(output.equation)}
          </div>
          <div
            className="equation-balance"
            role="img"
            aria-label={`Balanced equation ${output.equation}`}
          >
            <div className="equation-side">
              <div className="equation-objects">
                {leftTerms}
                {constant !== 0 && (
                  <>
                    <span className="equation-operator">
                      {constant < 0 ? "−" : "+"}
                    </span>
                    <span className="equation-number-tile">
                      {Math.abs(constant)}
                    </span>
                  </>
                )}
              </div>
              <span>left side</span>
            </div>
            <span className="equation-equals" aria-hidden="true">
              =
            </span>
            <div className="equation-side">
              <div className="equation-objects">
                <span className="equation-number-tile">{right}</span>
              </div>
              <span>right side</span>
            </div>
          </div>
          <div className="equation-history">
            {[...steps, String(output.equation)].map((equation, index) => (
              <span
                key={`${index}:${equation}`}
                className={index === steps.length ? "is-current" : ""}
              >
                {index > 0 && <b aria-hidden="true">→</b>}
                {equation}
              </span>
            ))}
          </div>
        </section>
        <aside className="foundation-panel" aria-label="Equation controls">
          <p className="foundation-panel-title">
            {solved ? "Solved" : "Your next step"}
          </p>
          {solved ? (
            <div className="equation-solution">
              <strong>x = {String(output.solution)}</strong>
              <p>Check: the value makes the original equation true ✓</p>
            </div>
          ) : (
            <>
              <p className="foundation-coach">
                Do the same operation to both sides. The equation stays
                balanced.
              </p>
              <button
                className="foundation-primary"
                type="button"
                onClick={() =>
                  runCommand(
                    instance,
                    nextAction === "subtract" ? "SUBTRACT_BOTH" : "DIVIDE_BOTH",
                    report,
                    operationValue,
                  )
                }
              >
                {operationLabel}
              </button>
            </>
          )}
          <div className="foundation-panel-actions">
            <button
              type="button"
              disabled={steps.length === 0}
              onClick={() => runCommand(instance, "UNDO", report)}
            >
              Undo step
            </button>
            <ResetButton report={report} />
          </div>
          <details className="foundation-custom">
            <summary>Try another operation</summary>
            <ExactNumberControl
              instance={instance}
              action="SUBTRACT_BOTH"
              label="Subtract from both sides"
              value={constant}
              min={-1000}
              max={1000}
              step={1}
              report={report}
            />
            <ExactNumberControl
              instance={instance}
              action="DIVIDE_BOTH"
              label="Divide both sides by"
              value={coefficient}
              min={-100}
              max={100}
              step={1}
              report={report}
            />
          </details>
        </aside>
      </div>
      <ModelDetails instances={[instance]} />
    </>
  );
}

function slopeExplanation(slope: number) {
  if (slope === 0) return "The line stays flat as you move right.";
  return slope > 0
    ? `For every 1 step right, the line rises ${numberText(slope)}.`
    : `For every 1 step right, the line falls ${numberText(Math.abs(slope))}.`;
}

function LineGraph({ instances }: { instances: ModelInstance[] }) {
  const minX = Math.min(...instances.map((line) => Number(line.outputs.xMin)));
  const maxX = Math.max(...instances.map((line) => Number(line.outputs.xMax)));
  const allY = instances.flatMap((line) =>
    (line.outputs.points as Point[]).map((point) => point.y),
  );
  const plotStart = 60,
    plotSize = 440,
    yExtent = (maxX - minX) / 2;
  const x = (value: number) =>
    plotStart + ((value - minX) / (maxX - minX)) * plotSize;
  const y = (value: number) =>
    plotStart + plotSize - ((value + yExtent) / (yExtent * 2)) * plotSize;
  const clipId = useId().replaceAll(":", "");
  const clipped = allY.some((value) => Math.abs(value) > yExtent);
  const ticks = [-1, -0.5, 0, 0.5, 1];
  return (
    <figure className="line-figure">
      <svg
        viewBox="0 0 560 560"
        role="img"
        aria-label="Coordinate graph showing how slope changes a line"
      >
        <title>Line graph with a rise and run marker</title>
        <defs>
          <clipPath id={clipId}>
            <rect
              x={plotStart}
              y={plotStart}
              width={plotSize}
              height={plotSize}
            />
          </clipPath>
        </defs>
        <rect
          x={plotStart}
          y={plotStart}
          width={plotSize}
          height={plotSize}
          rx="10"
          className="graph-paper"
        />
        {ticks.map((tick) => {
          const xValue = minX + (maxX - minX) * ((tick + 1) / 2),
            yValue = yExtent * tick;
          return (
            <g key={tick}>
              <line
                className="graph-grid"
                x1={x(xValue)}
                x2={x(xValue)}
                y1={plotStart}
                y2={plotStart + plotSize}
              />
              <line
                className="graph-grid"
                x1={plotStart}
                x2={plotStart + plotSize}
                y1={y(yValue)}
                y2={y(yValue)}
              />
              <text
                x={x(xValue)}
                y={plotStart + plotSize + 28}
                textAnchor="middle"
              >
                {numberText(xValue)}
              </text>
              <text x={plotStart - 12} y={y(yValue) + 5} textAnchor="end">
                {numberText(yValue)}
              </text>
            </g>
          );
        })}
        <line
          className="graph-axis"
          x1={x(0)}
          x2={x(0)}
          y1={plotStart}
          y2={plotStart + plotSize}
        />
        <line
          className="graph-axis"
          x1={plotStart}
          x2={plotStart + plotSize}
          y1={y(0)}
          y2={y(0)}
        />
        <g clipPath={`url(#${clipId})`}>
          {instances.map((line, index) => {
            const marker = line.outputs.marker as Point[];
            return (
              <g key={line.id} style={{ color: palette[index] }}>
                <polyline
                  className="graph-line"
                  points={(line.outputs.points as Point[])
                    .map((point) => `${x(point.x)},${y(point.y)}`)
                    .join(" ")}
                  strokeDasharray={index ? "9 6" : undefined}
                />
                <polyline
                  className="graph-marker"
                  points={marker
                    .map((point) => `${x(point.x)},${y(point.y)}`)
                    .join(" ")}
                />
                {marker
                  .filter((_, markerIndex) => markerIndex !== 1)
                  .map((point, markerIndex) => (
                    <circle
                      key={`${point.x}:${markerIndex}`}
                      cx={x(point.x)}
                      cy={y(point.y)}
                      r="5"
                      fill="currentColor"
                    />
                  ))}
              </g>
            );
          })}
        </g>
        <text
          className="graph-axis-label"
          x={plotStart + plotSize + 10}
          y={y(0) - 10}
        >
          x
        </text>
        <text className="graph-axis-label" x={x(0) + 10} y={plotStart - 14}>
          y
        </text>
      </svg>
      {clipped && (
        <figcaption>Fixed scale: lines continue beyond the graph.</figcaption>
      )}
    </figure>
  );
}

function RangeControl({
  instance,
  action,
  label,
  value,
  min,
  max,
  step,
  report,
}: {
  instance: ModelInstance;
  action: string;
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  report: (message: string) => void;
}) {
  return (
    <label className="foundation-range">
      <span>{label}</span>
      <strong>{numberText(value)}</strong>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={Math.max(min, Math.min(max, value))}
        onChange={(event) =>
          runCommand(instance, action, report, Number(event.target.value))
        }
      />
    </label>
  );
}

function LineLesson({
  instances,
  report,
}: {
  instances: ModelInstance[];
  report: (message: string) => void;
}) {
  const [selectedId, setSelectedId] = useState(instances[0].id);
  const selected =
    instances.find((instance) => instance.id === selectedId) ?? instances[0];
  const slope = Number(selected.parameters.slope),
    intercept = Number(selected.parameters.intercept);
  return (
    <>
      <div className="foundation-layout line-layout">
        <section className="foundation-scene">
          <div className="line-summary">
            {instances.map((line, index) => (
              <div key={line.id} style={{ color: palette[index] }}>
                <span className="line-key" aria-hidden="true" />
                <strong>{String(line.outputs.equation)}</strong>
              </div>
            ))}
          </div>
          <LineGraph instances={instances} />
        </section>
        <aside className="foundation-panel" aria-label="Line controls">
          <p className="foundation-panel-title">Change the line</p>
          {instances.length > 1 && (
            <label className="foundation-select">
              Line
              <select
                value={selected.id}
                onChange={(event) => setSelectedId(event.target.value)}
              >
                {instances.map((instance) => (
                  <option key={instance.id} value={instance.id}>
                    {instance.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <RangeControl
            instance={selected}
            action="SET_SLOPE"
            label="Slope"
            value={slope}
            min={-5}
            max={5}
            step={0.5}
            report={report}
          />
          <p className="foundation-insight">{slopeExplanation(slope)}</p>
          <RangeControl
            instance={selected}
            action="SET_INTERCEPT"
            label="Starting height"
            value={intercept}
            min={-5}
            max={5}
            step={0.5}
            report={report}
          />
          <div className="foundation-panel-actions">
            <ResetButton report={report} />
          </div>
          <details className="foundation-custom">
            <summary>Enter exact values</summary>
            <ExactNumberControl
              instance={selected}
              action="SET_SLOPE"
              label="Slope"
              value={slope}
              min={-20}
              max={20}
              report={report}
            />
            <ExactNumberControl
              instance={selected}
              action="SET_INTERCEPT"
              label="Starting height"
              value={intercept}
              min={-100}
              max={100}
              report={report}
            />
          </details>
        </aside>
      </div>
      <ModelDetails instances={instances} />
    </>
  );
}

function CircleLesson({
  instance,
  report,
}: {
  instance: ModelInstance;
  report: (message: string) => void;
}) {
  const [unrolled, setUnrolled] = useState(false);
  const compact = useCompactDiagram();
  const radius = Number(instance.outputs.radius),
    diameter = Number(instance.outputs.diameter),
    circumference = Number(instance.outputs.circumference),
    ratio = Number(instance.outputs.ratio);
  const displayRadius = Math.max(
      58,
      Math.min(94, 68 + Math.log2(Math.max(radius, 0.25)) * 18),
    ),
    circleX = compact ? 92 : 155,
    promptX = compact ? 262 : 430,
    circleY = compact ? 120 : 145,
    measureStart = compact ? 24 : 86,
    measureLength = compact ? 340 : 478,
    diameterMark = measureLength / Math.PI,
    measureY = compact ? 235 : 292,
    measureLabelY = compact ? 272 : 327;
  return (
    <>
      <div className="foundation-layout circle-layout">
        <section className="foundation-scene circle-scene">
          <svg
            viewBox={compact ? "0 0 390 290" : "0 0 650 360"}
            role="img"
            aria-label={`Circle with diameter ${numberText(diameter)} units and circumference ${numberText(circumference)} units`}
          >
            <title>Compare one circle circumference with its diameter</title>
            <circle
              cx={circleX}
              cy={circleY}
              r={displayRadius}
              className="circle-outline"
            />
            <line
              x1={circleX - displayRadius}
              x2={circleX + displayRadius}
              y1={circleY}
              y2={circleY}
              className="circle-diameter"
            />
            <text
              x={circleX}
              y={circleY - 6}
              textAnchor="middle"
              className="circle-label"
            >
              diameter = {numberText(diameter)}
            </text>
            <path
              d={
                compact
                  ? "M 185 60 C 230 15, 310 15, 360 60"
                  : "M 300 80 C 365 22, 470 22, 535 80"
              }
              className={`circle-unroll-arrow${unrolled ? " is-visible" : ""}`}
            />
            <text
              x={compact ? 272 : 418}
              y="58"
              textAnchor="middle"
              className={`circle-unroll-label${unrolled ? " is-visible" : ""}`}
            >
              unroll the edge
            </text>
            <line
              x1={measureStart}
              x2={measureStart + measureLength}
              y1={measureY}
              y2={measureY}
              className={`circle-circumference${unrolled ? " is-visible" : ""}`}
            />
            <g className={`circle-measures${unrolled ? " is-visible" : ""}`}>
              {[0, 1, 2, 3].map((index) => (
                <line
                  key={index}
                  x1={measureStart + index * diameterMark}
                  x2={measureStart + index * diameterMark}
                  y1={measureY - 14}
                  y2={measureY + 15}
                />
              ))}
              <text
                x={measureStart + diameterMark / 2}
                y={measureLabelY}
                textAnchor="middle"
              >
                1 diameter
              </text>
              <text
                x={measureStart + diameterMark * 1.5}
                y={measureLabelY}
                textAnchor="middle"
              >
                2
              </text>
              <text
                x={measureStart + diameterMark * 2.5}
                y={measureLabelY}
                textAnchor="middle"
              >
                3
              </text>
              <text
                x={measureStart + measureLength - 30}
                y={compact ? measureLabelY + 15 : measureLabelY}
                textAnchor="middle"
              >
                + a little
              </text>
            </g>
            {!unrolled && (
              <text
                x={promptX}
                y={compact ? 108 : 145}
                textAnchor="middle"
                className="circle-prompt"
              >
                {compact ? (
                  <>
                    <tspan x={promptX}>How many diameters</tspan>
                    <tspan x={promptX} dy="24">
                      fit around the edge?
                    </tspan>
                  </>
                ) : (
                  "How many diameters fit around the edge?"
                )}
              </text>
            )}
          </svg>
          <button
            className="foundation-unroll"
            type="button"
            aria-pressed={unrolled}
            onClick={() => setUnrolled((value) => !value)}
          >
            {unrolled ? "Roll it back up" : "Unroll the circle’s edge"}
          </button>
        </section>
        <aside
          className="foundation-panel"
          aria-label="Circle controls and result"
        >
          <p className="foundation-panel-title">Try a different circle</p>
          <RangeControl
            instance={instance}
            action="SET_RADIUS"
            label="Radius"
            value={radius}
            min={0.5}
            max={5}
            step={0.5}
            report={report}
          />
          <div className="circle-results">
            <div>
              <span>Distance across</span>
              <strong>{numberText(diameter)} units</strong>
            </div>
            <div>
              <span>Distance around</span>
              <strong>{numberText(circumference, 3)} units</strong>
            </div>
          </div>
          <div className="circle-ratio">
            <span>around ÷ across</span>
            <strong>≈ {numberText(ratio, 3)}</strong>
          </div>
          <p className="foundation-insight">
            Every circle is a scaled copy. Both lengths grow by the same factor,
            so their ratio stays π.
          </p>
          <div className="foundation-panel-actions">
            <ResetButton report={report} />
          </div>
          <details className="foundation-custom">
            <summary>Enter an exact radius</summary>
            <ExactNumberControl
              instance={instance}
              action="SET_RADIUS"
              label="Radius (units)"
              value={radius}
              min={0.01}
              max={100}
              report={report}
            />
          </details>
        </aside>
      </div>
      <ModelDetails instances={[instance]} />
    </>
  );
}

export function AssemblyView() {
  const { assembly, instances } = useAssemblyStore();
  const [feedback, setFeedback] = useState("");
  if (!assembly || instances.length === 0) return null;
  const presentations = instances.map(
    (instance) => modelProvider(instance.provider).presentation,
  );
  const introduction = presentations.every(
    (presentation) => presentation === "balance",
  )
    ? "Use the same operation on both sides to isolate x."
    : presentations.every((presentation) => presentation === "line")
      ? "Move the slope and watch the line change direction and steepness."
      : "Change the circle’s size. The distance around stays about 3.14 times the distance across.";
  return (
    <main className="math-foundations-experiment" aria-label={assembly.title}>
      <header className="foundation-intro">
        <p>{introduction}</p>
      </header>
      <p className="foundation-scroll-cue">
        Explore the scene, then scroll for more ↓
      </p>
      <output className="foundation-feedback" aria-live="polite">
        {feedback}
      </output>
      {presentations.every((presentation) => presentation === "balance") && (
        <EquationLesson instance={instances[0]} report={setFeedback} />
      )}
      {presentations.every((presentation) => presentation === "line") && (
        <LineLesson instances={instances} report={setFeedback} />
      )}
      {presentations.every((presentation) => presentation === "circle") && (
        <CircleLesson instance={instances[0]} report={setFeedback} />
      )}
    </main>
  );
}
