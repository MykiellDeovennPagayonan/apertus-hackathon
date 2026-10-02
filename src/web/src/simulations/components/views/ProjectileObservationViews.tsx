import { useProjectileStore } from "../../runtime/projectileSession";
import { dispatchCommand, getActiveDefinition } from "../../runtime/session";
import { projectileSweep } from "../../runtime/sweeps";
import { MeasurementSamplingSystem } from "../systems/MeasurementSamplingSystem";
import type { Dataset } from "../traits/MeasurementProbe";
import { ComparisonView } from "./ComparisonView";
import { EntityInspectorView } from "./EntityInspectorView";
import { ResultsTableView } from "./ResultsTableView";
import { TimeSeriesView } from "./TimeSeriesView";
export function ProjectileObservationViews() {
  const s = useProjectileStore(),
    definition = getActiveDefinition(),
    views = definition?.components.views ?? [];
  const results: Dataset = {
    columns: [
      { key: "id", label: "Instance", unit: "", type: "string" },
      { key: "angle", label: "Angle", unit: "degrees", type: "number" },
      { key: "speed", label: "Launch speed", unit: "m/s", type: "number" },
      { key: "range", label: "Range", unit: "m", type: "number" },
      { key: "height", label: "Max height", unit: "m", type: "number" },
      { key: "duration", label: "Flight time", unit: "s", type: "number" },
    ],
    rows: s.instances.map((i) => ({
      id: i.id,
      angle: i.launch.angle,
      speed: i.launch.velocity,
      range: i.metrics.range,
      height: i.metrics.maxHeight,
      duration: i.metrics.duration,
    })),
    assumption:
      "Independent analytic ground-to-ground launches; no drag or collision.",
  };
  return (
    <div style={{ padding: 20 }}>
      {views.includes("ResultsTableView") && (
        <ResultsTableView
          dataset={
            definition?.id === "ProjectileSweepExperiment"
              ? projectileSweep(s.velocity, s.gravity)
              : results
          }
        />
      )}
      {views.includes("ComparisonView") && (
        <ComparisonView
          panels={s.instances.map((i) => ({
            id: i.id,
            label: i.id,
            content: (
              <p>
                {i.launch.angle}° · {i.launch.velocity} m/s · range{" "}
                {i.metrics.range.toFixed(2)} m
              </p>
            ),
          }))}
        />
      )}
      {s.instances.map((i) => (
        <div key={i.id}>
          {views.includes("EntityInspectorView") && (
            <EntityInspectorView
              demo="projectile"
              id={i.id}
              parameters={{
                angle: i.launch.angle,
                speed: i.launch.velocity,
                gravity: i.gravity,
              }}
              outputs={i.metrics}
              assumptions={definition?.assumptions ?? []}
            />
          )}
          {views.includes("TimeSeriesView") && (
            <TimeSeriesView
              dataset={MeasurementSamplingSystem(
                i.probe,
                i.launch,
                i.gravity,
                i.elapsed,
              )}
            />
          )}
          <label>
            <input
              type="checkbox"
              checked={i.trajectoryVisible}
              onChange={(e) =>
                dispatchCommand("projectile", {
                  type: "SET_TRAJECTORY_VISIBLE",
                  target: i.id,
                  value: e.target.checked,
                })
              }
            />{" "}
            Show {i.id} trajectory
          </label>
        </div>
      ))}
    </div>
  );
}
