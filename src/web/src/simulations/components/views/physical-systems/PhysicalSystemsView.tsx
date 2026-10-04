"use client";
import { useState } from "react";
import { physicalSystems } from "../../../domains/physical-systems";
import { useAssemblyStore } from "../../../runtime/assemblySession";
import type { Assembly, ModelInstance } from "../../../runtime/contribution";
import {
  PhysicalControls,
  PhysicalPlayback,
  physicalCommand,
} from "../../controls/physical-systems/PhysicalControls";
import {
  CircuitVisual,
  PendulumVisual,
  physicalPalette,
  TrackVisual,
} from "../../visuals/physical-systems/PhysicalVisuals";
import { ExperimentLessonFrame } from "../ExperimentLessonFrame";
import "./physical-systems.css";

const format = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString("en", { maximumFractionDigits: 3 })
    : String(value);
export const physicalPresentations = [
  "physical-pendulum",
  "physical-track",
  "physical-circuit",
] as const;
function ObservationReadout({
  instance,
  assembly,
}: {
  instance: ModelInstance;
  assembly: Assembly;
}) {
  const model = physicalSystems.models.find((m) => m.ref === instance.provider);
  if (!model) return null;
  const selected = new Set(
    assembly.observations
      .filter((o) => o.instance === instance.id)
      .map((o) => o.output),
  );
  const readings = instance.outputs.bulbReadings as
    | { id: string; voltage: number; current: number; power: number }[]
    | undefined;
  return (
    <>
      <dl className="physical-readouts">
        {Object.entries(instance.outputs)
          .filter(
            ([key, value]) =>
              selected.has(key) &&
              (value === null || typeof value !== "object"),
          )
          .map(([key, value]) => (
            <div key={key}>
              <dt>{model.outputs[key].description}</dt>
              <dd>
                {value === null ? (
                  key === "lastPeriod" ? (
                    "Awaiting one cycle"
                  ) : (
                    "No finite stop"
                  )
                ) : (
                  <>
                    {format(value)}{" "}
                    {model.outputs[key].unit !== "1"
                      ? model.outputs[key].unit
                      : ""}
                  </>
                )}
              </dd>
            </div>
          ))}
      </dl>
      {readings && selected.has("bulbReadings") && (
        <div className="physical-table-wrap">
          <table>
            <caption>Each bulb</caption>
            <thead>
              <tr>
                <th>Bulb</th>
                <th>V</th>
                <th>A</th>
                <th>W</th>
              </tr>
            </thead>
            <tbody>
              {readings.map((r, index) => (
                <tr key={r.id}>
                  <th>{index + 1}</th>
                  <td>{format(r.voltage)}</td>
                  <td>{format(r.current)}</td>
                  <td>{format(r.power)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function physicalLabel(instance: ModelInstance, index: number) {
  if (instance.provider.endsWith("/Pendulum")) return `Swing ${index + 1}`;
  if (instance.provider.endsWith("/RollingTrack"))
    return index === 0
      ? "Smooth track"
      : index === 1
        ? "Rough track"
        : `Track ${index + 1}`;
  return "Circuit";
}

function KeyReadout({ instance }: { instance: ModelInstance }) {
  if (instance.provider.endsWith("/Pendulum"))
    return (
      <div className="physical-key-results">
        <div>
          <span>Length</span>
          <strong>{format(instance.parameters.length)} m</strong>
        </div>
        <div>
          <span>Period</span>
          <strong>{format(instance.outputs.period)} s</strong>
        </div>
      </div>
    );
  if (instance.provider.endsWith("/RollingTrack"))
    return (
      <div className="physical-key-results">
        <div>
          <span>Resistance μ</span>
          <strong>{format(instance.parameters.resistance)}</strong>
        </div>
        <div>
          <span>Stopping distance</span>
          <strong>
            {instance.outputs.stoppingDistance === null
              ? "No finite stop"
              : `${format(instance.outputs.stoppingDistance)} m`}
          </strong>
        </div>
      </div>
    );
  return (
    <div className="physical-key-results">
      <div>
        <span>Total current</span>
        <strong>{format(instance.outputs.totalCurrent)} A</strong>
      </div>
      <div>
        <span>Each bulb</span>
        <strong>{format(instance.outputs.bulbPower)} W</strong>
      </div>
    </div>
  );
}
function AngleGraph({ instances }: { instances: ModelInstance[] }) {
  const horizon = Math.min(
    ...instances.map(
      (instance) =>
        (instance.outputs.points as { x: number; y: number }[]).at(-1)?.x ?? 12,
    ),
  );
  const x = (t: number) => 50 + (t / horizon) * 480;
  const y = (a: number) => 130 - a * 10;
  return (
    <section
      className="physical-angle-graph"
      aria-label="Angle over simulation time"
    >
      <h3>Same time, different lengths</h3>
      <svg
        viewBox="0 0 560 300"
        role="img"
        aria-label={`Pendulum angle curves, time 0 to ${format(horizon)} seconds, angle −10 to 10 degrees`}
      >
        <path d="M50 25 V235 H530 M50 130 H530" fill="none" stroke="#746f61" />
        {[0, horizon / 4, horizon / 2, (3 * horizon) / 4, horizon].map((t) => (
          <text key={t} x={x(t)} y={255} textAnchor="middle">
            {format(t)}
          </text>
        ))}
        {[-10, 0, 10].map((a) => (
          <text key={a} x={40} y={y(a) + 5} textAnchor="end">
            {a}
          </text>
        ))}
        <text x={280} y={287} textAnchor="middle">
          Simulation time (s)
        </text>
        <text x={4} y={17}>
          Angle (°)
        </text>
        {instances.map((instance, index) => (
          <polyline
            key={instance.id}
            points={(instance.outputs.points as { x: number; y: number }[])
              .filter((p) => p.x <= horizon)
              .map((p) => `${x(p.x)},${y(p.y)}`)
              .join(" ")}
            fill="none"
            stroke={physicalPalette[index % 4]}
            strokeWidth={2}
            strokeDasharray={index % 2 ? "7 3" : undefined}
          />
        ))}
      </svg>
      <ul>
        {instances.map((instance, index) => (
          <li key={instance.id}>
            {index + 1}. {instance.label}: period{" "}
            {format(instance.outputs.period)} s, maximum angle{" "}
            {format(instance.parameters.amplitude)}°
          </li>
        ))}
      </ul>
    </section>
  );
}
export function PhysicalSystemsView() {
  const { assembly, instances } = useAssemblyStore();
  if (!assembly || !instances.length) return null;
  return <PhysicalSystemsContent assembly={assembly} instances={instances} />;
}

export function PhysicalSystemsContent({
  assembly,
  instances,
}: {
  assembly: Assembly;
  instances: ModelInstance[];
}) {
  const [feedback, setFeedback] = useState("");
  const physical = instances.filter((i) =>
    physicalSystems.models.some((m) => m.ref === i.provider),
  );
  if (!physical.length) return null;
  const pendulums = physical.filter((i) => i.provider.endsWith("/Pendulum"));
  const tracks = physical.filter((i) => i.provider.endsWith("/RollingTrack"));
  const circuits = physical.filter((i) =>
    i.provider.endsWith("/ResistiveCircuit"),
  );
  const command = physicalCommand(physical, setFeedback);
  const scale =
    220 / Math.max(...pendulums.map((i) => Number(i.parameters.length)), 1);
  const extent =
    Math.max(
      1,
      ...tracks.flatMap((i) => [
        Number(i.outputs.distance),
        typeof i.outputs.stoppingDistance === "number"
          ? i.outputs.stoppingDistance
          : 0,
      ]),
    ) * 1.1;
  const graph = assembly.views.find((v) => v.ref === "views/AssemblyGraph");
  const graphInstances = pendulums.filter((i) =>
    assembly.observations.some(
      (o) =>
        o.instance === i.id &&
        o.output === "points" &&
        graph?.observations.includes(o.id),
    ),
  );
  const scene = (
    <>
      {pendulums.length > 0 && (
        <section className="physical-scene" aria-label="Pendulum comparison">
          <div className="physical-scene-heading">
            <h2>Longer length, longer period</h2>
            <p>
              Ideal pendulums, small angles, no friction · shared gravity{" "}
              {format(pendulums[0].parameters.gravity)} m/s²
            </p>
          </div>
          <div
            className={
              graphInstances.length > 0 ? "physical-pendulum-pair" : undefined
            }
          >
            <svg
              className="physical-motion-scene"
              viewBox={`0 0 ${Math.max(320, pendulums.length * 130 + 30)} 340`}
              role="img"
              aria-label="Pendulum positions on the same length scale"
            >
              {pendulums.map((instance, index) => (
                <PendulumVisual
                  key={instance.id}
                  instance={instance}
                  index={index}
                  scale={scale}
                />
              ))}
            </svg>
            {graphInstances.length > 0 && (
              <AngleGraph instances={graphInstances} />
            )}
          </div>
          <p className="physical-reduced-note">
            Motion illustration hidden by your reduced motion preference. Pause
            and step to explore the measurements.
          </p>
          {pendulums.length === 2 && (
            <p className="physical-insight">
              The second swing is{" "}
              {format(
                Number(pendulums[1].parameters.length) /
                  Number(pendulums[0].parameters.length),
              )}
              × as long and takes{" "}
              {format(
                Number(pendulums[1].outputs.period) /
                  Number(pendulums[0].outputs.period),
              )}
              × as long per cycle.
            </p>
          )}
        </section>
      )}
      {tracks.length > 0 && (
        <section
          className="physical-scene"
          aria-label="Rolling-resistance comparison"
        >
          <div className="physical-scene-heading">
            <h2>Watch how far each car travels</h2>
            <p>
              Same {format(tracks[0].parameters.height)} m launch height ·
              simplified rolling resistance
            </p>
          </div>
          <svg
            className="physical-motion-scene"
            viewBox={`0 0 560 ${tracks.length * 120 + 65}`}
            role="img"
            aria-label="Horizontal tracks and stopping distances on a shared metre scale"
          >
            {tracks.map((instance, index) => (
              <TrackVisual
                key={instance.id}
                instance={instance}
                index={index}
                extent={extent}
              />
            ))}
          </svg>
          <p className="physical-reduced-note">
            Motion illustration hidden by your reduced motion preference. Pause
            and step to explore the measurements.
          </p>
          <p className="physical-insight">
            Both tracks use the same entry speed. Greater resistance shortens
            the stopping distance.
          </p>
        </section>
      )}
      {circuits.map((instance) => (
        <section
          className="physical-scene"
          key={instance.id}
          aria-label="Bulb circuit"
        >
          <div className="physical-scene-heading">
            <h2>Follow the current through the bulbs</h2>
            <p>
              {String(instance.parameters.topology)} connection · brightness
              illustrates bulb power
            </p>
          </div>
          <CircuitVisual instance={instance} />
          <p className="physical-insight">
            The bulbs use a constant-resistance approximation. A 3 W bulb
            reaches full displayed brightness.
          </p>
        </section>
      ))}
    </>
  );
  const panel = (
    <>
      <p className="physical-panel-title">
        {circuits.length > 0 ? "Build the circuit" : "Try the comparison"}
      </p>
      <div className="physical-panel-objects">
        {physical.map((instance, index) => (
          <section
            key={instance.id}
            aria-label={`${physicalLabel(instance, index)} controls`}
          >
            <h3>{physicalLabel(instance, index)}</h3>
            <PhysicalControls
              instance={instance}
              command={command}
              boundActions={assembly.controls
                .filter((control) => control.instance === instance.id)
                .map((control) => control.action)}
            />
            <KeyReadout instance={instance} />
          </section>
        ))}
      </div>
      <PhysicalPlayback
        instances={physical}
        report={setFeedback}
        boundActions={assembly.controls}
      />
    </>
  );
  const details = (
    <details className="physical-details">
      <summary>Measurements and how these models work</summary>
      <div className="physical-detail-grid">
        {physical.map((instance, index) => (
          <section key={instance.id}>
            <h3>{physicalLabel(instance, index)}</h3>
            <ObservationReadout instance={instance} assembly={assembly} />
          </section>
        ))}
      </div>
      <div className="physical-assumptions">
        {[
          ...new Set(
            physical.flatMap(
              (instance) =>
                physicalSystems.models.find(
                  (model) => model.ref === instance.provider,
                )?.assumptions ?? [],
            ),
          ),
        ].map((text) => (
          <p key={text}>{text}</p>
        ))}
      </div>
    </details>
  );
  return (
    <main className="physical-systems-experiment">
      <ExperimentLessonFrame
        ariaLabel={assembly.title}
        learningGoal={assembly.learningGoal}
        feedback={
          <output className="physical-feedback" aria-live="polite">
            {feedback}
          </output>
        }
        scene={scene}
        panel={panel}
        details={details}
      />
    </main>
  );
}
