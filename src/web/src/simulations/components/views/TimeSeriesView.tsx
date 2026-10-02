import { type Dataset, validateDataset } from "../traits/MeasurementProbe";
export function TimeSeriesView({ dataset }: { dataset: Dataset }) {
  validateDataset(dataset);
  if (
    !dataset.columns.some(
      (c) => c.key === "time" && c.unit === "s" && c.type === "number",
    ) ||
    !dataset.columns.some((c) => c.key === "value" && c.type === "number")
  )
    throw new Error(
      "Time-series view requires time in seconds and a numeric observable",
    );
  const xs = dataset.rows.map((r) => Number(r.time)),
    ys = dataset.rows.map((r) => Number(r.value));
  const xmax = Math.max(1, ...xs),
    ymin = Math.min(0, ...ys),
    ymax = Math.max(1, ...ys),
    column = dataset.columns.find((c) => c.key === "value");
  const points = dataset.rows
    .map(
      (r) =>
        `${40 + (Number(r.time) / xmax) * 510},${210 - ((Number(r.value) - ymin) / (ymax - ymin)) * 180}`,
    )
    .join(" ");
  return (
    <figure>
      <figcaption>
        {column?.label} ({column?.unit}) over model time (s)
      </figcaption>
      <svg
        viewBox="0 0 600 250"
        role="img"
        aria-label={`${column?.label} time series`}
        style={{ width: "100%", maxHeight: 220 }}
      >
        <path d="M40 20V210H550" fill="none" stroke="currentColor" />
        <polyline
          points={points}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
        />
        <text x="40" y="235">
          0 s
        </text>
        <text x="510" y="235">
          {xmax.toFixed(1)} s
        </text>
        <text x="5" y="30">
          {ymax.toFixed(1)}
        </text>
      </svg>
      <small>{dataset.assumption}</small>
    </figure>
  );
}
