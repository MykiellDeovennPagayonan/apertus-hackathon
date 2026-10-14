import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import type { nutrientsMeasure } from "../../systems/ecology/nutrients";

type Scene = ReturnType<typeof nutrientsMeasure>["scene"];
function Plant({
  x,
  biomass,
  deficient,
  label,
  height,
}: {
  x: number;
  biomass: number;
  deficient: boolean;
  label: string;
  height: number;
}) {
  const scale = height / 60;
  return (
    <g>
      <text x={x} y={30} textAnchor="middle" className="systems-label">
        {label}
      </text>
      <g transform={`translate(${x} 276) scale(${scale})`}>
        <path
          d="M0 0C-6-60 8-128 0-190"
          fill="none"
          stroke="#446b45"
          strokeWidth={7}
        />
        {[-45, -90, -135, -175].map((y, i) => (
          <g key={y} transform={`translate(0 ${y})`}>
            <path
              d={
                i % 2
                  ? "M0 0C-62 8-82-32-72-39C-32-48-6-20 0 0Z"
                  : "M0 0C62 8 82-32 72-39C32-48 6-20 0 0Z"
              }
              fill={deficient && i < 2 ? "#c4ad54" : "#5d8754"}
              stroke="#446b45"
              strokeWidth={2}
            />
            <path
              d={i % 2 ? "M-6-4L-62-30" : "M6-4L62-30"}
              stroke="#e7e7b9"
              strokeWidth={2}
            />
          </g>
        ))}
      </g>
      <path d={`M${x - 86} 278H${x + 86}`} stroke="#b6a78c" strokeWidth={2} />
      <text x={x} y={312} textAnchor="middle" className="systems-value">
        {height} cm
      </text>
      <text x={x} y={337} textAnchor="middle" className="systems-small">
        Biomass {biomass} / 100
      </text>
    </g>
  );
}
export function NutrientLimitationVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const scene = instance.outputs.scene as Scene;
  return (
    <figure className="systems-scene" data-biomass={scene.biomass}>
      <figcaption>
        <strong>Will any extra nutrient increase growth?</strong>
        <span>
          Change nitrogen first. Light and water stay fixed and suitable.
        </span>
      </figcaption>
      <div className="systems-limiter">
        Current limiter <strong>{scene.limiter}</strong>
      </div>
      <svg
        viewBox="0 0 760 360"
        role="img"
        aria-label="Current and balanced plants on a shared scale"
      >
        <Plant
          x={115}
          biomass={scene.biomass}
          deficient={scene.biomass < 100}
          label="Current plant"
          height={scene.height}
        />
        <Plant
          x={340}
          biomass={100}
          deficient={false}
          label="Balanced reference"
          height={60}
        />
        <text x={482} y={30} className="systems-label">
          Nutrient supply
        </text>
        <text x={482} y={55} className="systems-small">
          100 = sufficient · relative level
        </text>
        {scene.resources.map((r, i) => {
          const y = 105 + i * 90,
            limiting = r.value === scene.biomass && scene.biomass < 100;
          return (
            <g key={r.name}>
              <text x={482} y={y} className="systems-label">
                {r.name}
                {limiting ? " ↓" : ""}
              </text>
              <text x={730} y={y} textAnchor="end" className="systems-value">
                {r.value}
              </text>
              <rect
                x={482}
                y={y + 14}
                width={248}
                height={20}
                rx={5}
                fill="#e8e3d6"
              />
              <rect
                x={482}
                y={y + 14}
                width={(248 * r.value) / 150}
                height={20}
                rx={5}
                fill={limiting ? "#af7b31" : "#39776d"}
              />
              <path
                d={`M647 ${y + 8}v32`}
                stroke="#30362e"
                strokeDasharray="3 3"
              />
            </g>
          );
        })}
        <text x={482} y={337} className="systems-small">
          ↓ Lowest supply constrains biomass
        </text>
      </svg>
      <p className="systems-footnote">
        {scene.health} · Height and biomass are different measures of growth.
      </p>
    </figure>
  );
}
