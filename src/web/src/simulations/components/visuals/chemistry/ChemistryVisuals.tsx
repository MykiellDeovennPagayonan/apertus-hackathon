import type { ModelInstance } from "../../../runtime/contribution";

export const chemistryNumber = (v: unknown) =>
  typeof v === "number"
    ? Math.abs(v) > 0 && Math.abs(v) < 0.0001
      ? v.toExponential(3)
      : v.toLocaleString("en", { maximumFractionDigits: 4 })
    : String(v);
export function BeakerVisual({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs,
    volume = Number(o.volume),
    concentration = Number(o.concentration);
  const capacity = Math.max(2, 2 ** Math.ceil(Math.log2(volume * 1.05)));
  const height = (160 * volume) / capacity;
  return (
    <figure>
      <svg
        viewBox="0 0 360 260"
        role="img"
        aria-label={`${chemistryNumber(o.saltMass)} grams salt in ${chemistryNumber(volume)} litres; ${chemistryNumber(concentration)} grams per litre`}
      >
        <title>Salt stays dissolved as water is added</title>
        <path
          d="M90 40 L90 220 Q90 230 100 230 L250 230 Q260 230 260 220 L260 40"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
        />
        <rect
          x="93"
          y={227 - height}
          width="164"
          height={height}
          fill="#285e56"
          opacity={0.12 + (0.68 * concentration) / (concentration + 10)}
        />
        <line
          x1="93"
          x2="257"
          y1={227 - height}
          y2={227 - height}
          stroke="#285e56"
          strokeWidth="2"
        />
        {[0.25, 0.5, 0.75, 1].map((f) => (
          <g key={f}>
            <line
              x1="250"
              x2="273"
              y1={227 - 160 * f}
              y2={227 - 160 * f}
              stroke="currentColor"
            />
            <text x="280" y={232 - 160 * f}>
              {chemistryNumber(capacity * f)} L
            </text>
          </g>
        ))}
        <text x="175" y="30" textAnchor="middle">
          {chemistryNumber(o.saltMass)} g dissolved salt
        </text>
        <text x="175" y="253" textAnchor="middle">
          {chemistryNumber(concentration)} g/L
        </text>
      </svg>
      <figcaption>
        Adding water spreads the same salt through more solution. The beaker
        scale adapts to fit.
      </figcaption>
    </figure>
  );
}
type Molecule = {
  formula: string;
  side: string;
  count: number;
  atoms: Record<string, number>;
};
export function MoleculeVisual({ instance }: { instance: ModelInstance }) {
  const molecules = instance.outputs.molecules as Molecule[];
  return (
    <figure>
      <section className="chem-molecules" aria-label="Molecules on each side">
        {molecules.map((m, i) => (
          <div key={`${i}:${m.formula}`} className="chem-species">
            <strong>
              {m.count} × {m.formula}
            </strong>
            <span>{m.side === "left" ? "reactant" : "product"}</span>
            <div className="chem-molecule-tokens">
              {Array.from({ length: m.count }, (_, n) => (
                <span
                  className="chem-molecule"
                  role="img"
                  key={`${m.formula}-${n}`}
                  aria-label={`${m.formula} molecule ${n + 1}`}
                >
                  {Object.entries(m.atoms).flatMap(([element, count]) =>
                    Array.from({ length: count }, (_, j) => (
                      <b
                        className={`chem-atom chem-atom-${element}`}
                        // biome-ignore lint/suspicious/noArrayIndexKey: Immutable species atom order gives each atom a stable slot.
                        key={`${element}-${j}`}
                      >
                        {element}
                      </b>
                    )),
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}
      </section>
      <figcaption>
        Each cluster is one molecule. Change how many clusters there are,
        keeping the atoms inside fixed.
      </figcaption>
    </figure>
  );
}
type Point = { x: number; y: number };
export function ReactionCurveVisual({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs,
    points = o.points as Point[],
    products = o.productPoints as Point[],
    previous = o.comparisonPoints as Point[];
  const maxX = points.at(-1)?.x ?? 1,
    maxY = Number(o.totalConcentration);
  const x = (v: number) => 58 + (350 * v) / maxX,
    y = (v: number) => 220 - (180 * v) / maxY;
  const path = (data: Point[]) =>
    data.map((p) => `${x(p.x)},${y(p.y)}`).join(" ");
  return (
    <figure>
      <svg
        viewBox="0 0 450 285"
        role="img"
        aria-label={`Concentration curves at ${o.temperature} kelvin, compared with ${o.comparisonTemperature} kelvin; A decreases and B increases`}
      >
        <title>Analytical fixed-temperature concentration curves</title>
        <path d="M58 35 V220 H414" fill="none" stroke="currentColor" />
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <text x="48" y={y(maxY * f) + 5} textAnchor="end">
              {chemistryNumber(maxY * f)}
            </text>
            <text x={x(maxX * f)} y="243" textAnchor="middle">
              {chemistryNumber(maxX * f)}
            </text>
          </g>
        ))}
        <text x="230" y="275" textAnchor="middle">
          Time (s)
        </text>
        <text transform="translate(16 130) rotate(-90)" textAnchor="middle">
          Concentration (mol/L)
        </text>
        <polyline
          points={path(previous)}
          fill="none"
          stroke="#514381"
          strokeWidth="2"
          strokeDasharray="6 5"
        />
        <polyline
          points={path(points)}
          fill="none"
          stroke="#285e56"
          strokeWidth="3"
        />
        <polyline
          points={path(products)}
          fill="none"
          stroke="#885410"
          strokeWidth="3"
        />
        <circle
          cx={x(Number(o.elapsed))}
          cy={y(Number(o.concentrationA))}
          r="5"
          fill="#285e56"
        />
      </svg>
      <figcaption>
        A: green solid · B: amber solid · A at{" "}
        {chemistryNumber(o.comparisonTemperature)} K: purple dashed. All curves
        use the same scales.
      </figcaption>
      <div
        className="chem-particles"
        role="img"
        aria-label="Illustrative reactant and product particles"
      >
        {Array.from({ length: 20 }, (_, i) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: Fixed illustrative particle slots never reorder.
            key={`particle-${i}`}
            className={
              i < Math.round((20 * Number(o.concentrationA)) / maxY)
                ? "chem-particle-a"
                : "chem-particle-b"
            }
          >
            {i < Math.round((20 * Number(o.concentrationA)) / maxY) ? "A" : "B"}
          </span>
        ))}
      </div>
      <p className="chem-caption">
        Particles illustrate proportions; the analytical model calculates
        concentrations.
      </p>
    </figure>
  );
}
