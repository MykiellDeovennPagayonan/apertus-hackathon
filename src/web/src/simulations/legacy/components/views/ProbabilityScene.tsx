import { useRef } from "react";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram } from "./useCompactDiagram";
export function ProbabilityScene({
  frequencies,
  trials,
  preset,
}: {
  frequencies: { outcome: string; observed: number; expected: number }[];
  trials: number;
  preset: string;
}) {
  const surface = useRef<SVGSVGElement>(null);
  const compact = useCompactDiagram(surface, 450);
  const maximum = Math.max(
    1,
    ...frequencies.flatMap((row) => [row.observed, row.expected]),
  );
  const width = compact ? 360 : 540,
    start = compact ? 68 : 82,
    extent = compact ? 200 : 330;
  return (
    <div className="probability-scene">
      <h2 className="math-activity-heading">
        {trials.toLocaleString()}{" "}
        {preset === "coin" ? "coin tosses" : "die rolls"}
      </h2>
      <p className="math-activity-hint">
        Filled bars show observed counts. Gold marks show expected counts.
      </p>
      <SVGWorldView
        ref={surface}
        viewBox={`0 0 ${width} ${30 + frequencies.length * 72}`}
        aria-label={frequencies
          .map(
            (row) =>
              `${row.outcome}: observed ${row.observed} (${((100 * row.observed) / trials).toFixed(1)} percent), expected ${row.expected.toFixed(1)} (${((100 * row.expected) / trials).toFixed(1)} percent)`,
          )
          .join(". ")}
      >
        {frequencies.map((row, i) => (
          <g key={row.outcome} data-outcome={row.outcome}>
            <text x={8} y={40 + i * 72} fontSize={18} fill="currentColor">
              {row.outcome}
            </text>
            <rect
              x={start}
              y={17 + i * 72}
              width={extent}
              height={30}
              rx={5}
              fill="#edf0e7"
            />
            <rect
              x={start}
              y={17 + i * 72}
              width={(extent * row.observed) / maximum}
              height={30}
              rx={5}
              fill="#285e56"
            />
            <path
              d={`M${start + (extent * row.expected) / maximum} ${12 + i * 72}v40`}
              stroke="#ad7629"
              strokeWidth={3}
            />
            <text
              x={start + extent + 12}
              y={40 + i * 72}
              fontSize={18}
              fill="currentColor"
            >
              {row.observed}
            </text>
            <text
              x={start}
              y={67 + i * 72}
              fontSize={compact ? 16 : 18}
              fill="currentColor"
            >
              Observed {((100 * row.observed) / trials).toFixed(1)}% · Expected{" "}
              {((100 * row.expected) / trials).toFixed(1)}%
            </text>
          </g>
        ))}
      </SVGWorldView>
      <p className="math-activity-hint">
        Expected probability describes a fair {preset}. A single sample can
        differ; larger samples usually come closer.
      </p>
    </div>
  );
}
