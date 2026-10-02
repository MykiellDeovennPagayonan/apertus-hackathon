export function HistogramView({
  frequencies,
}: {
  frequencies: { outcome: string; observed: number; expected: number }[];
}) {
  const max = Math.max(
      1,
      ...frequencies.flatMap((f) => [f.observed, f.expected]),
    ),
    width = 480 / frequencies.length;
  return (
    <figure>
      <figcaption>
        Observed frequencies (solid) and expected frequencies (outline)
      </figcaption>
      <svg
        viewBox="0 0 600 270"
        role="img"
        aria-label="Observed and expected trial frequencies"
        style={{ width: "100%" }}
      >
        {frequencies.map((f, i) => (
          <g key={f.outcome}>
            <rect
              x={50 + i * width}
              y={230 - (f.observed / max) * 190}
              width={width * 0.4}
              height={(f.observed / max) * 190}
              fill="var(--accent)"
            />
            <rect
              x={50 + i * width + width * 0.42}
              y={230 - (f.expected / max) * 190}
              width={width * 0.4}
              height={(f.expected / max) * 190}
              fill="none"
              stroke="var(--warn)"
            />
            <text x={50 + i * width} y="255">
              {f.outcome}
            </text>
            <text x={50 + i * width} y="25">
              {f.observed}
            </text>
          </g>
        ))}
      </svg>
    </figure>
  );
}
