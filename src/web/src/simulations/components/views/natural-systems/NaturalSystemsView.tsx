"use client";
import { useState } from "react";
import { naturalSystems } from "../../../domains/natural-systems";
import { useAssemblyStore } from "../../../runtime/assemblySession";
import type { Assembly, ModelInstance } from "../../../runtime/contribution";
import {
  NaturalControls,
  NaturalPlayback,
  naturalCommand,
} from "../../controls/natural-systems/NaturalControls";
import {
  DiffusionHeatmap,
  PlantGrowthGraph,
  PopulationGraph,
} from "../../visuals/natural-systems/NaturalVisuals";
import { ExperimentLessonFrame } from "../ExperimentLessonFrame";
import "./natural-systems.css";

export const naturalPresentations = [
  "natural-diffusion",
  "natural-predator-prey",
  "natural-plant-growth",
] as const;
const format = (value: unknown) =>
  typeof value === "number"
    ? value.toLocaleString("en", { maximumFractionDigits: 3 })
    : Array.isArray(value)
      ? value.join(", ")
      : String(value);

function mainResult(instance: ModelInstance) {
  if (instance.provider.endsWith("/DiffusionField"))
    return {
      title: "Dye spreads down its concentration gradient",
      cue: "Diffusion in still water · conservative no-flux grid",
      visual: <DiffusionHeatmap instance={instance} />,
      result: (
        <>
          <strong>{format(instance.outputs.totalMass)}</strong>
          <span>mass units conserved</span>
        </>
      ),
      insight:
        Number(instance.outputs.diffusionCoefficient) ===
        Number(instance.outputs.comparisonCoefficient)
          ? "The run begins with all dye in the center cell. It spreads without crossing the tank walls."
          : `At the same time, D=${format(instance.outputs.diffusionCoefficient)} m²/s leaves ${format(instance.outputs.centerConcentration)} at the center versus ${format(instance.outputs.comparisonCenter)} for D=${format(instance.outputs.comparisonCoefficient)} m²/s.`,
    };
  if (instance.provider.endsWith("/PredatorPrey"))
    return {
      title: "Rabbits and foxes change together",
      cue: "Simplified continuous Lotka–Volterra model · RK4, fixed 0.01-day step",
      visual: <PopulationGraph instance={instance} />,
      result: (
        <>
          <strong>
            {format(instance.outputs.rabbits)} /{" "}
            {format(instance.outputs.foxes)}
          </strong>
          <span>rabbits / foxes now</span>
        </>
      ),
      insight: `Initial rates: rabbits ${Number(instance.outputs.initialRabbitDerivative) >= 0 ? "+" : ""}${format(instance.outputs.initialRabbitDerivative)}/day; foxes ${Number(instance.outputs.initialFoxDerivative) >= 0 ? "+" : ""}${format(instance.outputs.initialFoxDerivative)}/day. A lower start changes the whole trajectory, not every future value in one direction.`,
    };
  return {
    title: "The scarcest resource sets the rate",
    cue: "Illustrative plant-growth model · fixed normalized resources",
    visual: <PlantGrowthGraph instance={instance} />,
    result: (
      <>
        <strong>{format(instance.outputs.growthRate)}</strong>
        <span>illustrative biomass units/day</span>
      </>
    ),
    insight: `Limiting resource: ${format(instance.outputs.limitingResources)}. Raising light above ${format(Math.min(Number(instance.parameters.water), Number(instance.parameters.nutrients)))} cannot increase growth until another limiting resource changes.`,
  };
}
function InstanceLesson({
  instance,
  assembly,
  command,
}: {
  instance: ModelInstance;
  assembly: Assembly;
  command: ReturnType<typeof naturalCommand>;
}) {
  const model = naturalSystems.models.find(
    (candidate) => candidate.ref === instance.provider,
  );
  if (!model) return null;
  const result = mainResult(instance);
  const observations = new Set(
    assembly.observations
      .filter((o) => o.instance === instance.id)
      .map((o) => o.output),
  );
  return (
    <article className="natural-instance">
      <header>
        <h2>{instance.label}</h2>
        <p>{result.cue}</p>
      </header>
      <section className="natural-scene" aria-label={`${instance.label} model`}>
        <h3>{result.title}</h3>
        {result.visual}
        <p className="natural-insight">{result.insight}</p>
      </section>
      <section className="natural-result" aria-label="Key result">
        {result.result}
      </section>
      <NaturalControls
        instance={instance}
        command={command}
        boundActions={assembly.controls
          .filter((c) => c.instance === instance.id)
          .map((c) => c.action)}
      />
      <details className="natural-readouts">
        <summary>Numeric observations</summary>
        <dl>
          {Object.entries(instance.outputs)
            .filter(
              ([key, value]) =>
                observations.has(key) &&
                (value === null || typeof value !== "object"),
            )
            .map(([key, value]) => (
              <div key={key}>
                <dt>{model.outputs[key].description}</dt>
                <dd>
                  {format(value)}{" "}
                  {model.outputs[key].unit === "1"
                    ? ""
                    : model.outputs[key].unit}
                </dd>
              </div>
            ))}
        </dl>
      </details>
    </article>
  );
}
export function NaturalSystemsContent({
  assembly,
  instances,
}: {
  assembly: Assembly;
  instances: ModelInstance[];
}) {
  const [feedback, setFeedback] = useState("");
  const natural = instances.filter((instance) =>
    naturalSystems.models.some((model) => model.ref === instance.provider),
  );
  if (!natural.length) return null;
  const command = naturalCommand(setFeedback);
  return (
    <ExperimentLessonFrame
      ariaLabel={assembly.title}
      className="natural-systems-experiment"
      learningGoal={assembly.learningGoal}
      feedback={<output aria-live="polite">{feedback}</output>}
      scene={
        <div className="natural-instance-grid">
          {natural.map((instance) => (
            <InstanceLesson
              key={instance.id}
              instance={instance}
              assembly={assembly}
              command={command}
            />
          ))}
        </div>
      }
      panel={
        <>
          <h2>Explore the model</h2>
          <NaturalPlayback
            instances={natural}
            report={setFeedback}
            boundActions={assembly.controls}
          />
          <section className="natural-time">
            <span>Simulation time</span>
            <strong>
              {format(natural[0].outputs.elapsed)}{" "}
              {natural[0].provider.endsWith("/DiffusionField") ? "s" : "days"}
            </strong>
          </section>
        </>
      }
      details={
        <details>
          <summary>Model assumptions</summary>
          {natural.map((instance) => {
            const model = naturalSystems.models.find(
              (candidate) => candidate.ref === instance.provider,
            );
            return (
              <section key={instance.id}>
                <h3>{instance.label}</h3>
                <ul>
                  {model?.assumptions.map((assumption) => (
                    <li key={assumption}>{assumption}</li>
                  ))}
                </ul>
              </section>
            );
          })}
        </details>
      }
    />
  );
}
export function NaturalSystemsView() {
  const { assembly, instances } = useAssemblyStore();
  if (!assembly || !instances.length) return null;
  return <NaturalSystemsContent assembly={assembly} instances={instances} />;
}
