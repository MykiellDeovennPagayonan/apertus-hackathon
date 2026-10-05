import type { Dataset } from "../traits/MeasurementProbe";
import { DatasetDisplay } from "./DatasetDisplay";
export function TimeSeriesView({ dataset }: { dataset: Dataset }) {
  const columns = Array.isArray(dataset?.columns) ? dataset.columns : [];
  const observable = columns.find((c) => c?.key === "value");
  const time = columns.find((c) => c?.key === "time");
  if (
    dataset &&
    (time?.unit !== "s" ||
      time?.type !== "number" ||
      observable?.type !== "number")
  )
    return (
      <section aria-label="Time-series observations">
        <p>
          A time-series plot needs numeric model time in seconds and a numeric
          observation. The available data is shown below.
        </p>
        <DatasetDisplay
          value={dataset}
          kind="DataTable"
          label="Time-series observations"
        />
      </section>
    );
  return (
    <DatasetDisplay
      value={dataset}
      kind="Chart"
      label={
        observable
          ? `${observable.label} over model time`
          : "Observations over model time"
      }
      presentation={{
        xKey: "time",
        xLabel: "Model time",
        xUnit: "s",
        series: ["value"],
      }}
    />
  );
}
