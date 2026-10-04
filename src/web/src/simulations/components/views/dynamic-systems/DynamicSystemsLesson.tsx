"use client";
import { useState } from "react";
import { dynamicSystems } from "../../../domains/dynamic-systems";
import type { ModelInstance } from "../../../runtime/contribution";
import {
  type DynamicDispatch,
  DynamicNumberControl,
} from "../../controls/dynamic-systems/DynamicControls";
import {
  dynamicNumber as fmt,
  GrowthVisual,
  QueueVisual,
  TrafficVisual,
} from "../../visuals/dynamic-systems/DynamicVisuals";
import { ExperimentLessonFrame } from "../ExperimentLessonFrame";
import "./DynamicSystemsLesson.css";

export function DynamicSystemsLesson({
  instance,
  dispatch,
  learningGoal,
}: {
  instance: ModelInstance;
  dispatch: DynamicDispatch;
  learningGoal?: string;
}) {
  const [feedback, report] = useState("");
  const model = dynamicSystems.models.find(
    (candidate) => candidate.ref === instance.provider,
  );
  if (!model) return null;
  const output = instance.outputs;
  const command = (type: string, value?: unknown, target = instance.id) => {
    const result = dispatch({
      type,
      target,
      ...(value === undefined ? {} : { value }),
    });
    report(
      result.accepted
        ? type === "RESET"
          ? "Initial experiment restored."
          : "Change applied."
        : result.error,
    );
  };
  const isGrowth = model.presentation === "dynamic-growth";
  const isTraffic = model.presentation === "dynamic-traffic";
  const isQueue = model.presentation === "dynamic-queue";
  const scene = (
    <div className="dynamic-scene">
      <h2>
        {isGrowth
          ? "How compounding builds"
          : isTraffic
            ? "A jam with no accident"
            : "The same shoppers, more capacity"}
      </h2>
      {isGrowth && <GrowthVisual instance={instance} />}
      {isTraffic && <TrafficVisual instance={instance} />}
      {isQueue && <QueueVisual instance={instance} />}
    </div>
  );
  const panel = (
    <>
      <p className="dynamic-panel-title">Try the experiment</p>
      {isGrowth && (
        <>
          <p className="dynamic-coach">
            Try the requested two-year, ten-percent case.
          </p>
          <button
            className="dynamic-primary"
            type="button"
            onClick={() =>
              command("GROW_SET_SCENARIO", { annualRate: 0.1, years: 2 })
            }
          >
            Use 10% for 2 years
          </button>
          <div className="dynamic-results">
            <div>
              <span>Compound total</span>
              <strong>${fmt(output.compoundTotal)}</strong>
            </div>
            <div>
              <span>Simple total</span>
              <strong>${fmt(output.simpleTotal)}</strong>
            </div>
            <div>
              <span>Starting balance</span>
              <strong>${fmt(output.principal)}</strong>
            </div>
            <div>
              <span>Rate × duration</span>
              <strong>
                {fmt(Number(output.annualRate) * 100)}% × {String(output.years)}{" "}
                yr
              </strong>
            </div>
          </div>
        </>
      )}
      {isTraffic && (
        <>
          <p className="dynamic-coach">
            A small brake can make following cars slow in turn.
          </p>
          <button
            className="dynamic-primary"
            type="button"
            onClick={() => command("TRAFFIC_BRAKE")}
          >
            Brake one car briefly
          </button>
          <div className="dynamic-actions">
            <button
              type="button"
              onClick={() => command("TRAFFIC_SET_PLAYING", !output.playing)}
            >
              {output.playing ? "Pause" : "Play"}
            </button>
            <button
              type="button"
              disabled={Boolean(output.playing)}
              onClick={() => command("TRAFFIC_STEP")}
            >
              Step 0.25 s
            </button>
            <button type="button" onClick={() => command("TRAFFIC_RESTART")}>
              Restart traffic
            </button>
          </div>
          <div className="dynamic-results">
            <div>
              <span>Average speed</span>
              <strong>{fmt(output.averageSpeed)} m/s</strong>
            </div>
            <div>
              <span>Slowest car</span>
              <strong>{fmt(output.minimumSpeed)} m/s</strong>
            </div>
            <div>
              <span>Slow cars</span>
              <strong>{String(output.slowVehicles)}</strong>
            </div>
            <div>
              <span>Smallest gap</span>
              <strong>{fmt(output.minimumGap)} m</strong>
            </div>
          </div>
        </>
      )}
      {isQueue && (
        <>
          <p className="dynamic-coach">
            Keep every shopper’s schedule fixed and open cashier 2.
          </p>
          <button
            className="dynamic-primary"
            type="button"
            onClick={() => command("QUEUE_SET_CASHIERS", 2)}
          >
            Add a second cashier
          </button>
          <div className="dynamic-results">
            <div>
              <span>Average wait</span>
              <strong>{fmt(output.averageWait)} min</strong>
            </div>
            <div>
              <span>Longest line</span>
              <strong>{String(output.maximumQueue)}</strong>
            </div>
            <div>
              <span>Completed</span>
              <strong>{String(output.completed)}</strong>
            </div>
            <div>
              <span>Waiting / serving</span>
              <strong>
                {String(output.waiting)} / {String(output.inService)}
              </strong>
            </div>
          </div>
        </>
      )}
      <button
        className="dynamic-reset"
        type="button"
        onClick={() => command("RESET", undefined, "session")}
      >
        Reset experiment
      </button>
    </>
  );
  const details = (
    <details className="dynamic-details">
      <summary>Exact settings and model assumptions</summary>
      <div className="dynamic-details-grid">
        {isGrowth && (
          <>
            <DynamicNumberControl
              key={`p:${output.principal}`}
              label="Starting balance"
              min={0.01}
              max={1_000_000}
              initial={Number(output.principal)}
              action="GROW_SET_PRINCIPAL"
              instance={instance}
              dispatch={dispatch}
              report={report}
            />
            <DynamicNumberControl
              key={`r:${output.annualRate}`}
              label="Annual rate (decimal; 0.10 = 10%)"
              min={0}
              max={1}
              initial={Number(output.annualRate)}
              action="GROW_SET_RATE"
              instance={instance}
              dispatch={dispatch}
              report={report}
            />
            <DynamicNumberControl
              key={`y:${output.years}`}
              label="Whole years"
              min={0}
              max={25}
              step={1}
              initial={Number(output.years)}
              action="GROW_SET_YEARS"
              instance={instance}
              dispatch={dispatch}
              report={report}
            />
          </>
        )}
        {isTraffic && (
          <DynamicNumberControl
            key={`h:${output.desiredHeadway}`}
            label="Desired headway (seconds)"
            min={0.5}
            max={3}
            initial={Number(output.desiredHeadway)}
            action="TRAFFIC_SET_HEADWAY"
            instance={instance}
            dispatch={dispatch}
            report={report}
          />
        )}
        {isQueue && (
          <>
            <DynamicNumberControl
              key={`a:${output.arrivalRate}`}
              label="Average arrivals per minute"
              min={0.05}
              max={2}
              initial={Number(output.arrivalRate)}
              action="QUEUE_SET_ARRIVAL_RATE"
              instance={instance}
              dispatch={dispatch}
              report={report}
            />
            <DynamicNumberControl
              key={`s:${output.serviceRate}`}
              label="Service capacity per cashier per minute"
              min={0.1}
              max={3}
              initial={Number(output.serviceRate)}
              action="QUEUE_SET_SERVICE_RATE"
              instance={instance}
              dispatch={dispatch}
              report={report}
            />
          </>
        )}
      </div>
      <div className="dynamic-assumptions">
        {model.assumptions.map((assumption) => (
          <p key={assumption}>{assumption}</p>
        ))}
      </div>
    </details>
  );
  return (
    <ExperimentLessonFrame
      ariaLabel={instance.label}
      className="dynamic-systems-experiment"
      learningGoal={learningGoal ?? model.description}
      feedback={
        <output className="dynamic-feedback" aria-live="polite">
          {feedback}
        </output>
      }
      scene={scene}
      panel={panel}
      details={details}
    />
  );
}
