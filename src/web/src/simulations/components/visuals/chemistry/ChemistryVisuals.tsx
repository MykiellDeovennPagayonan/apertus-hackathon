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

/**
 * Visual for Acid-Base Titration:
 * Illustrates a glass buret dripping into an Erlenmeyer flask with phenolphthalein indicator
 * (clear in acid, pink near endpoint, magenta in base), paired with a live S-shaped titration curve.
 */
export function AcidBaseTitrationVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const va = Number(p.analyteVolume ?? 25);
  const vb = Number(o.titrantVolumeAdded ?? p.titrantVolumeAdded ?? 0);
  const veq = Number(o.equivalenceVolume ?? 25);
  const ph = Number(o.currentPH ?? 7.0);
  const color = String(o.indicatorColor ?? "colorless");

  // Flask liquid fill color based on phenolphthalein
  let liquidColor = "#e0f2fe"; // clear water with subtle tint
  let liquidOpacity = 0.35;
  if (color === "magenta") {
    liquidColor = "#db2777";
    liquidOpacity = 0.85;
  } else if (color === "faint-pink") {
    liquidColor = "#f472b6";
    liquidOpacity = 0.65;
  }

  // Buret liquid level (starts at 0 mL dispensed = full buret; as Vb increases, liquid level drops)
  const buretHeight = 90;
  const buretDispensedFraction = Math.min(1, vb / 50);
  const buretLiquidTop = 30 + buretHeight * buretDispensedFraction;
  const buretLiquidHeight = Math.max(0, 120 - buretLiquidTop);

  // Flask liquid level (starts at Va, rises with Va + Vb)
  const totalVol = va + vb;
  const flaskLevel = Math.min(45, 15 + (totalVol / 120) * 30);

  // Titration curve chart coordinates on right side: x from 200 to 390, y from 220 (pH 0) to 40 (pH 14)
  const maxV = Math.max(50, veq * 1.8);
  const chartX = (v: number) => 210 + (Math.max(0, v) / maxV) * 180;
  const chartY = (curPh: number) => 220 - (Math.max(0, Math.min(14, curPh)) / 14) * 180;

  // S-curve path
  const curvePoints = ((o.points as { x: number; y: number }[]) || []).map(
    (pt, i) => `${i === 0 ? "M" : "L"} ${chartX(pt.x)} ${chartY(pt.y)}`,
  ).join(" ");

  const currentPt = { x: chartX(vb), y: chartY(ph) };
  const eqPt = { x: chartX(veq), y: chartY(7.0) };

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 420 270"
        role="img"
        aria-label={`Acid-Base Titration: pH ${ph.toFixed(2)}, Titrant added ${vb.toFixed(1)} mL, Equivalence ${veq.toFixed(1)} mL`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Strong Acid / Strong Base Titration and pH Curve</title>

        {/* LEFT APPARATUS: Buret & Erlenmeyer Flask */}
        {/* Buret Stand & Clamp */}
        <line x1="30" y1="20" x2="30" y2="245" stroke="#94a3b8" strokeWidth="4" />
        <rect x="15" y="245" width="130" height="10" rx="3" fill="#64748b" />
        <rect x="30" y="60" width="40" height="8" rx="2" fill="#94a3b8" />

        {/* Buret Tube */}
        <rect
          x="65"
          y="25"
          width="16"
          height="100"
          rx="2"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
        />
        {/* Buret Titrant Liquid */}
        <rect
          x="67"
          y={buretLiquidTop}
          width="12"
          height={buretLiquidHeight}
          fill="#38bdf8"
          fillOpacity={0.7}
        />
        {/* Buret Stopcock & Tip */}
        <polygon points="71,125 75,125 74,142 72,142" fill="#334155" />
        <circle cx="73" cy="132" r="4" fill="#0284c7" />

        {/* Falling Drop */}
        <circle cx="73" cy="155" r="2.5" fill="#38bdf8" opacity={vb > 0 ? 0.9 : 0.2} />

        {/* Erlenmeyer Flask (trapezoidal flask body) */}
        {/* Flask neck */}
        <rect x="63" y="165" width="20" height="18" fill="none" stroke="#334155" strokeWidth="2" />
        {/* Flask liquid fill */}
        <path
          d={`M ${73 - flaskLevel * 0.9} 240 L ${73 + flaskLevel * 0.9} 240 L ${73 + flaskLevel * 0.55} ${240 - flaskLevel} L ${73 - flaskLevel * 0.55} ${240 - flaskLevel} Z`}
          fill={liquidColor}
          fillOpacity={liquidOpacity}
        />
        {/* Flask glass outline */}
        <path
          d="M 63 183 L 38 240 Q 36 244 42 244 L 104 244 Q 110 244 108 240 L 83 183 Z"
          fill="none"
          stroke="#334155"
          strokeWidth="2"
        />
        <text x="73" y="258" fontSize="10" textAnchor="middle" fill="currentColor">
          Flask: {totalVol.toFixed(1)} mL
        </text>

        {/* RIGHT PANEL: S-Shaped Titration Curve */}
        <text x="210" y="26" fontSize="11" fontWeight="bold" fill="currentColor">
          Titration Curve (pH vs Volume)
        </text>

        {/* Chart Axes */}
        <line x1="210" y1="220" x2="395" y2="220" stroke="currentColor" strokeWidth="1.5" />
        <line x1="210" y1="40" x2="210" y2="220" stroke="currentColor" strokeWidth="1.5" />

        <text x="395" y="236" fontSize="10" fill="currentColor" textAnchor="end">
          Titrant Volume (mL)
        </text>
        <text x="205" y="38" fontSize="10" fill="currentColor" textAnchor="end">
          pH 14
        </text>
        <text x="205" y="224" fontSize="10" fill="currentColor" textAnchor="end">
          0
        </text>

        {/* Neutral pH 7 dashed line */}
        <line
          x1="210"
          y1={chartY(7)}
          x2="395"
          y2={chartY(7)}
          stroke="#94a3b8"
          strokeDasharray="3,3"
        />
        <text x="205" y={chartY(7) + 3} fontSize="9" fill="#94a3b8" textAnchor="end">
          7.0
        </text>

        {/* Titration Curve */}
        {curvePoints && (
          <path d={curvePoints} fill="none" stroke="#2563eb" strokeWidth="2.5" />
        )}

        {/* Equivalence Point Marker */}
        <circle cx={eqPt.x} cy={eqPt.y} r="4" fill="#64748b" />
        <line
          x1={eqPt.x}
          y1={eqPt.y}
          x2={eqPt.x}
          y2="220"
          stroke="#64748b"
          strokeDasharray="2,2"
        />
        <text x={eqPt.x} y="234" fontSize="9" textAnchor="middle" fill="#64748b">
          Veq={veq.toFixed(1)}
        </text>

        {/* Current Operating Point on Curve */}
        <circle cx={currentPt.x} cy={currentPt.y} r="6" fill={color === "colorless" ? "#2563eb" : liquidColor} />
        <text
          x={currentPt.x + 8}
          y={currentPt.y - 6}
          fontSize="11"
          fontWeight="bold"
          fill={color === "colorless" ? "#2563eb" : liquidColor}
        >
          pH = {ph.toFixed(2)}
        </text>

        {/* Status Badge */}
        <g transform="translate(210, 250)">
          <rect
            x="0"
            y="0"
            width="12"
            height="12"
            fill={liquidColor}
            fillOpacity={liquidOpacity}
            stroke="#334155"
          />
          <text x="18" y="10" fontSize="11" fill="currentColor">
            Indicator: <strong>{color}</strong> {ph >= 7 ? "(Basic)" : "(Acidic)"}
          </text>
        </g>
      </svg>
      <figcaption className="scene-guidance" style={{ fontSize: 13, color: "var(--foreground-muted, #666)" }}>
        Adding titrant shifts solution pH along the sigmoidal curve. Phenolphthalein turns pink near the equivalence endpoint.
      </figcaption>
    </figure>
  );
}

/**
 * Visual for Gas Equilibrium & Le Chatelier's Principle:
 * Closed gas chamber with movable piston (volume V), brown haze representing NO2 gas
 * and colorless N2O4, pressure gauge, and Le Chatelier response indicator.
 */
export function GasEquilibriumVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const temp = Number(o.temperature ?? p.temperature ?? 298);
  const vol = Number(o.volume ?? p.volume ?? 5);
  const kc = Number(o.equilibriumConstant ?? 0.0058);
  const pressure = Number(o.totalPressure ?? 1.0);
  const concNO2 = Number(o.concNO2 ?? 0.1);
  const concN2O4 = Number(o.concN2O4 ?? 0.2);
  const colorIntensity = Number(o.gasColorIntensity ?? 0.3);
  const shift = String(o.shiftDirection ?? "equilibrated");

  // Chamber geometry: x: 40, y: 40, height: 160.
  // Piston moves horizontally with volume: width proportional to V in [1, 20 L]
  // Max chamber width: 280 px
  const pistonWidth = 40 + (Math.max(1, Math.min(20, vol)) / 20) * 240;

  // Gas color: reddish-brown NO2 vs colorless N2O4
  // Brown RGB: rgb(180, 83, 9)
  const gasColor = `rgba(180, 83, 9, ${0.06 + 0.82 * Math.min(1, colorIntensity)})`;

  // Pressure gauge needle angle (0 to 5 atm mapped to -60 deg to +60 deg)
  const gaugeAngle = Math.min(60, Math.max(-60, (pressure - 2.5) * 24));

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 420 270"
        role="img"
        aria-label={`Gas Equilibrium: N2O4 <=> 2 NO2 at ${temp} K, Volume ${vol} L, Pressure ${pressure.toFixed(2)} atm`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>N₂O₄ ⇌ 2 NO₂ Gas Equilibrium & Le Chatelier's Principle</title>

        {/* Reaction Header */}
        <text x="210" y="24" fontSize="13" fontWeight="bold" textAnchor="middle" fill="currentColor">
          N₂O₄ (colorless) ⇌ 2 NO₂ (red-brown) · ΔH° &gt; 0 (Endothermic)
        </text>

        {/* Chamber Glass Wall & Base */}
        <rect
          x="40"
          y="45"
          width="280"
          height="140"
          rx="4"
          fill="none"
          stroke="#475569"
          strokeWidth="3"
        />

        {/* Gas inside enclosed volume (from x=40 to pistonWidth) */}
        <rect
          x="42"
          y="47"
          width={Math.max(0, pistonWidth - 42)}
          height="136"
          fill={gasColor}
        />

        {/* Illustrated NO2 & N2O4 molecule clusters */}
        {Array.from({ length: 12 }, (_, i) => {
          const cx = 55 + ((pistonWidth - 75) * ((i * 37) % 100)) / 100;
          const cy = 60 + ((110 * ((i * 53) % 100)) / 100);
          return (
            <g key={i} opacity={0.75}>
              {i % 2 === 0 ? (
                // Single NO2 molecule (brown dot)
                <circle cx={cx} cy={cy} r="4" fill="#9a3412" />
              ) : (
                // Double N2O4 cluster (paired gray dots)
                <g>
                  <circle cx={cx - 3} cy={cy} r="3.5" fill="#64748b" />
                  <circle cx={cx + 3} cy={cy} r="3.5" fill="#64748b" />
                </g>
              )}
            </g>
          );
        })}

        {/* Movable Piston Head */}
        <rect
          x={pistonWidth - 6}
          y="43"
          width="12"
          height="144"
          rx="2"
          fill="#334155"
          stroke="#1e293b"
          strokeWidth="2"
        />
        {/* Piston Rod extending rightward */}
        <rect
          x={pistonWidth + 6}
          y="108"
          width={Math.max(10, 325 - pistonWidth)}
          height="14"
          rx="2"
          fill="#64748b"
        />

        {/* Volume dimension label */}
        <text
          x={40 + pistonWidth / 2}
          y="118"
          fontSize="12"
          fontWeight="bold"
          fill="#1e293b"
          textAnchor="middle"
        >
          {vol.toFixed(1)} L
        </text>

        {/* RIGHT SIDE: Gauges & Displays */}
        {/* Pressure Gauge dial */}
        <g transform="translate(365, 85)">
          <circle cx="0" cy="0" r="26" fill="#f8fafc" stroke="#334155" strokeWidth="2" />
          <text x="0" y="-12" fontSize="8" fill="#64748b" textAnchor="middle">
            PRESSURE
          </text>
          <text x="0" y="16" fontSize="9" fontWeight="bold" fill="#0f172a" textAnchor="middle">
            {pressure.toFixed(2)} atm
          </text>
          {/* Needle */}
          <line
            x1="0"
            y1="0"
            x2={16 * Math.sin((gaugeAngle * Math.PI) / 180)}
            y2={-16 * Math.cos((gaugeAngle * Math.PI) / 180)}
            stroke="#dc2626"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <circle cx="0" cy="0" r="3" fill="#dc2626" />
        </g>

        {/* Temperature Badge */}
        <g transform="translate(365, 145)">
          <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
          <text x="0" y="4" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle">
            {temp} K
          </text>
        </g>

        {/* Equilibrium Constant Kc Badge */}
        <g transform="translate(365, 185)">
          <text x="0" y="0" fontSize="9" fill="#475569" textAnchor="middle">
            Kc = {kc.toFixed(4)}
          </text>
        </g>

        {/* Bottom Status & Concentrations */}
        <g transform="translate(40, 215)">
          <text x="0" y="0" fontSize="11" fill="currentColor">
            [NO₂] = <strong>{concNO2.toFixed(3)} M</strong> (brown) · [N₂O₄] = <strong>{concN2O4.toFixed(3)} M</strong> (colorless)
          </text>
          <text x="0" y="20" fontSize="11" fill="#2563eb" fontWeight="bold">
            Le Chatelier State: {shift === "equilibrated" ? "Dynamic Equilibrium Reached" : shift}
          </text>
        </g>
      </svg>
      <figcaption className="scene-guidance" style={{ fontSize: 13, color: "var(--foreground-muted, #666)" }}>
        Raising temperature shifts equilibrium endothermically toward brown NO₂. Compressing volume shifts equilibrium toward colorless N₂O₄.
      </figcaption>
    </figure>
  );
}

