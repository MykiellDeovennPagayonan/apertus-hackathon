import type { ModelInstance } from "../../../runtime/contribution";
import { DatasetDisplay } from "../../views/DatasetDisplay";
import {
  comparisonData,
  outputDataPresentation,
} from "../../views/dataPresentation";

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
      <figcaption className="scene-guidance">
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
      <figcaption className="scene-guidance">
        Each cluster is one molecule. Change how many clusters there are,
        keeping the atoms inside fixed.
      </figcaption>
    </figure>
  );
}
export function ReactionCurveVisual({ instance }: { instance: ModelInstance }) {
  const metadata = outputDataPresentation(instance.provider, "points");
  return (
    <DatasetDisplay
      kind="Chart"
      label="Reaction progress: current and previous temperature"
      value={comparisonData(
        instance.outputs.points,
        instance.outputs.comparisonPoints,
      )}
      presentation={{
        ...metadata,
        columns: [
          { key: "x", label: "Model time", unit: "s", type: "number" },
          {
            key: "y",
            label: "Current temperature",
            unit: "mol/L",
            type: "number",
          },
          {
            key: "comparison_y",
            label: "Previous temperature",
            unit: "mol/L",
            type: "number",
          },
        ],
      }}
    />
  );
}
