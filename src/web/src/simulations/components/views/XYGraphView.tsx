import { useProjectileStore } from "../../runtime/projectileSession";
import { sampleRange } from "../systems/BallisticMotionSystem";
import { DatasetDisplay } from "./DatasetDisplay";
export function XYGraphView() {
  const state = useProjectileStore();
  const instances = state.instances.slice(0, 6);
  const samples = instances.map((instance) =>
    sampleRange(instance.launch.velocity, instance.gravity),
  );
  const rows =
    samples[0]?.map((point) =>
      Object.fromEntries([
        ["angle", point.x],
        ...samples.map((series, index) => [
          `ball${index}`,
          series.find((sample) => sample.x === point.x)?.y,
        ]),
      ]),
    ) ?? [];
  return (
    <DatasetDisplay
      kind="Chart"
      label="Range versus launch angle"
      value={rows}
      presentation={{
        xKey: "angle",
        xLabel: "Launch angle",
        xUnit: "degrees",
        yLabel: "Range",
        yUnit: "m",
        columns: [
          {
            key: "angle",
            label: "Launch angle",
            unit: "degrees",
            type: "number",
          },
          ...instances.map((_, index) => ({
            key: `ball${index}`,
            label: `Ball ${index + 1}`,
            unit: "m",
            type: "number" as const,
          })),
        ],
      }}
    />
  );
}
export default XYGraphView;
