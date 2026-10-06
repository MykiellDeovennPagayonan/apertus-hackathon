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
    rows: s.instances.map((i, index) => ({
      id: `Ball ${index + 1}`,
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
      {s.instances.length > 1 && (
        <div className="learning-comparison">
          {s.instances.map((i, index) => (
            <p key={i.id}>
              <strong>
                Ball {index + 1} · {i.launch.angle}°
              </strong>
              <br />
              Distance {i.metrics.range.toFixed(2)} m · Maximum height{" "}
              {i.metrics.maxHeight.toFixed(2)} m
            </p>
          ))}
        </div>
      )}
      <details>
        <summary>Explore more: measurements and trajectories</summary>
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
            panels={s.instances.map((i, index) => ({
              id: i.id,
              label: `Ball ${index + 1}`,
              content: (
                <p>
                  {i.launch.angle}° · {i.launch.velocity} m/s · range{" "}
                  {i.metrics.range.toFixed(2)} m
                </p>
              ),
            }))}
          />
        )}
        {s.instances.map((i, index) => (
          <div key={i.id}>
            {views.includes("EntityInspectorView") && (
              <EntityInspectorView
                demo="projectile"
                id={i.id}
                label={`Ball ${index + 1}`}
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
              Show Ball {index + 1} trajectory
            </label>
          </div>
        ))}
      </details>
    </div>
  );
}
