import type { ModelInstance } from "../../../runtime/contribution";

export const naturalPalette = ["#2d6a4f", "#a44a3f", "#4f46a5", "#b7791f"];
const format = (value: number) =>
  value.toLocaleString("en", { maximumFractionDigits: 3 });

export function DiffusionHeatmap({ instance }: { instance: ModelInstance }) {
  const field = (instance.outputs.field as number[][]).flat();
  const size = Number(instance.outputs.gridSize);
  const peak = Math.max(...field, Number.EPSILON);
  const cell = 300 / size;
  return (
    <figure className="natural-figure">
      <svg
        viewBox="0 0 340 350"
        role="img"
        aria-label={`Dye concentration heatmap after ${format(Number(instance.outputs.elapsed))} seconds. Center probe ${format(Number(instance.outputs.centerConcentration))}, edge probe ${format(Number(instance.outputs.edgeConcentration))} mass units per square metre.`}
      >
        <title>Authoritative dye concentration field</title>
        <g transform="translate(20 18)">
          {field.map((value, index) => (
            <rect
              // biome-ignore lint/suspicious/noArrayIndexKey: Fixed row-major grid cells never reorder.
              key={index}
              x={(index % size) * cell}
              y={Math.floor(index / size) * cell}
              width={cell + 0.2}
              height={cell + 0.2}
              fill={`color-mix(in srgb, #5b21b6 ${(100 * Math.sqrt(value / peak)).toFixed(2)}%, #edf6fb)`}
            />
          ))}
          <rect
            width="300"
            height="300"
            fill="none"
            stroke="#374151"
            strokeWidth="2"
          />
          <circle
            cx="150"
            cy="150"
            r="4"
            fill="none"
            stroke="#fff"
            strokeWidth="2"
          />
          <circle
            cx="225"
            cy="150"
            r="4"
            fill="none"
            stroke="#111827"
            strokeWidth="2"
          />
          <circle
            cx="296"
            cy="150"
            r="4"
            fill="none"
            stroke="#111827"
            strokeWidth="2"
          />
        </g>
        <text x="170" y="340" textAnchor="middle">
          Tank width {format(Number(instance.parameters.width))} m · no-flux
          walls
        </text>
      </svg>
      <figcaption>
        Color and the three outlined probes come from the same concentration
        grid.
      </figcaption>
    </figure>
  );
}

type PopulationPoint = { x: number; rabbits: number; foxes: number };
type Point = { x: number; y: number };
function line(points: Point[], maxX: number, maxY: number) {
  return points
    .map((p) => `${48 + (372 * p.x) / maxX},${220 - (180 * p.y) / maxY}`)
    .join(" ");
}
export function PopulationGraph({ instance }: { instance: ModelInstance }) {
  const points = instance.outputs.points as PopulationPoint[];
  const prior = instance.outputs.comparisonPoints as PopulationPoint[];
  const maxX = points.at(-1)?.x ?? 1;
  const maxY = Math.max(
    1,
    ...points.flatMap((p) => [p.rabbits, p.foxes]),
    ...prior.flatMap((p) => [p.rabbits, p.foxes]),
  );
  const series = (data: PopulationPoint[], key: "rabbits" | "foxes") =>
    data.map((p) => ({ x: p.x, y: p[key] }));
  return (
    <figure className="natural-figure">
      <svg
        viewBox="0 0 450 285"
        role="img"
        aria-label={`Rabbit and fox population curves over ${format(maxX)} model days`}
      >
        <path d="M48 35 V220 H420" fill="none" stroke="#5f675c" />
        <polyline
          points={line(series(prior, "rabbits"), maxX, maxY)}
          fill="none"
          stroke="#2d6a4f"
          strokeDasharray="6 5"
        />
        <polyline
          points={line(series(prior, "foxes"), maxX, maxY)}
          fill="none"
          stroke="#a44a3f"
          strokeDasharray="6 5"
        />
        <polyline
          points={line(series(points, "rabbits"), maxX, maxY)}
          fill="none"
          stroke="#2d6a4f"
          strokeWidth="3"
        />
        <polyline
          points={line(series(points, "foxes"), maxX, maxY)}
          fill="none"
          stroke="#a44a3f"
          strokeWidth="3"
        />
        <text x="234" y="272" textAnchor="middle">
          Model time (days)
        </text>
        <text transform="translate(14 130) rotate(-90)" textAnchor="middle">
          Continuous population
        </text>
        <text x="52" y="28">
          0–{format(maxY)}
        </text>
      </svg>
      <figcaption>
        Rabbits: green · foxes: rust · previous starting-rabbit comparison:
        dashed.
      </figcaption>
    </figure>
  );
}

export function PlantGrowthGraph({ instance }: { instance: ModelInstance }) {
  const points = instance.outputs.points as Point[];
  const prior = instance.outputs.comparisonPoints as Point[];
  const maxX = points.at(-1)?.x ?? 1;
  const maxY = Math.max(1, ...points.map((p) => p.y), ...prior.map((p) => p.y));
  return (
    <figure className="natural-figure">
      <svg
        viewBox="0 0 450 285"
        role="img"
        aria-label={`Illustrative biomass from 0 to ${format(maxX)} days`}
      >
        <path d="M48 35 V220 H420" fill="none" stroke="#5f675c" />
        <polyline
          points={line(prior, maxX, maxY)}
          fill="none"
          stroke="#8b5e34"
          strokeWidth="2"
          strokeDasharray="6 5"
        />
        <polyline
          points={line(points, maxX, maxY)}
          fill="none"
          stroke="#2d6a4f"
          strokeWidth="3"
        />
        <text x="234" y="272" textAnchor="middle">
          Model time (days)
        </text>
        <text transform="translate(14 130) rotate(-90)" textAnchor="middle">
          Illustrative biomass units
        </text>
        <text x="52" y="28">
          0–{format(maxY)}
        </text>
      </svg>
      <figcaption>
        Current resources: green · previous light setting: brown dashed. Both
        use the same scale.
      </figcaption>
    </figure>
  );
}
