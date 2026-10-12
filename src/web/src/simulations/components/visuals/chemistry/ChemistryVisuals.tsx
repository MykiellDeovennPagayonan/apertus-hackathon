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
  const molecules = (instance.outputs.molecules as Molecule[]) || [];
  const balanced = Boolean(instance.outputs.balanced);
  const atoms = (instance.outputs.atoms as { element: string; left: number; right: number; conserved: boolean }[]) || [];

  return (
    <figure style={{ margin: 0 }}>
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

      {/* Stoichiometry Atom Ledger */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "center",
          gap: "8px 16px",
          marginTop: 12,
          padding: "6px 12px",
          borderRadius: 6,
          fontSize: 12,
          fontWeight: 600,
          background: balanced ? "rgba(34, 197, 94, 0.12)" : "rgba(239, 68, 68, 0.1)",
          color: balanced ? "#15803d" : "#b91c1c",
          border: `1px solid ${balanced ? "#86efac" : "#fca5a5"}`,
        }}
      >
        <span>{balanced ? "✓ Balanced Reaction" : "⚠ Unbalanced Equation"}</span>
        {atoms.map((a) => (
          <span key={a.element} style={{ opacity: 0.9 }}>
            {a.element}: {a.left} {a.conserved ? "=" : "≠"} {a.right}
          </span>
        ))}
      </div>

      <figcaption className="scene-guidance" style={{ marginTop: 8 }}>
        Each cluster represents one molecule. Adjust coefficients to conserve atoms on both sides of the reaction.
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
          { key: "x", label: "Time (s)", unit: "s", type: "number" },
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
  const acidType = String(o.acidType ?? p.acidType ?? "strong");

  // Flask liquid fill color based on phenolphthalein
  let liquidColor = "#e0f2fe"; // clear water with subtle tint
  let liquidOpacity = 0.35;
  if (color === "magenta") {
    liquidColor = "#db2777";
    liquidOpacity = 0.88;
  } else if (color === "pink") {
    liquidColor = "#ec4899";
    liquidOpacity = 0.72;
  } else if (color === "faint-pink") {
    liquidColor = "#f472b6";
    liquidOpacity = 0.55;
  }

  // Buret liquid level (starts at 0 mL dispensed = full buret; as Vb increases, liquid level drops)
  const buretHeight = 90;
  const buretDispensedFraction = Math.min(1, vb / 50);
  const buretLiquidTop = 30 + buretHeight * buretDispensedFraction;
  const buretLiquidHeight = Math.max(0, 120 - buretLiquidTop);

  // Flask liquid level (starts at Va, rises with Va + Vb)
  const totalVol = va + vb;
  const flaskLevel = Math.min(45, 15 + (totalVol / 120) * 30);

  // Titration curve chart coordinates on right side: x from 200 to 395, y from 220 (pH 0) to 40 (pH 14)
  const maxV = Math.max(50, veq * 1.8);
  const chartX = (v: number) => 210 + (Math.max(0, v) / maxV) * 180;
  const chartY = (curPh: number) => 220 - (Math.max(0, Math.min(14, curPh)) / 14) * 180;

  // S-curve path
  const curvePoints = ((o.points as { x: number; y: number }[]) || []).map(
    (pt, i) => `${i === 0 ? "M" : "L"} ${chartX(pt.x)} ${chartY(pt.y)}`,
  ).join(" ");

  const currentPt = { x: chartX(vb), y: chartY(ph) };
  const eqPh = acidType === "strong" ? 7.0 : 8.7;
  const eqPt = { x: chartX(veq), y: chartY(eqPh) };
  const halfEqPt = { x: chartX(veq / 2), y: chartY(4.76) };

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 420 300"
        role="img"
        aria-label={`Acid-Base Titration: ${acidType} acid, pH ${ph.toFixed(2)}, Titrant added ${vb.toFixed(1)} mL, Equivalence ${veq.toFixed(1)} mL`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>{`${acidType === "weak" ? "Weak Acid (CH₃COOH)" : "Strong Acid (HCl)"} Titration and pH Neutralization Curve`}</title>

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
          d={`M 40 240 L 106 240 L ${106 - (flaskLevel * 25) / 57} ${240 - flaskLevel} L ${40 + (flaskLevel * 25) / 57} ${240 - flaskLevel} Z`}
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
        <text x="73" y="270" fontSize="10" textAnchor="middle" fill="currentColor">
          Flask: {totalVol.toFixed(1)} mL
        </text>

        {/* RIGHT PANEL: Titration Curve */}
        <text x="210" y="26" fontSize="11" fontWeight="bold" fill="currentColor">
          {acidType === "weak" ? "Titration: Weak Acid (pKa 4.76)" : "Titration: Strong Acid / Base"}
        </text>

        {/* Chart Axes */}
        <line x1="210" y1="220" x2="395" y2="220" stroke="currentColor" strokeWidth="1.5" />
        <line x1="210" y1="40" x2="210" y2="220" stroke="currentColor" strokeWidth="1.5" />

        <text x="395" y="248" fontSize="10" fill="currentColor" textAnchor="end">
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

        {/* Weak Acid Buffer region marker at half-equivalence */}
        {acidType === "weak" && (
          <g>
            <circle cx={halfEqPt.x} cy={halfEqPt.y} r="3" fill="#8b5cf6" />
            <text x={halfEqPt.x} y={halfEqPt.y - 6} fontSize="8" fill="#7c3aed" textAnchor="middle">
              Buffer (pKa)
            </text>
          </g>
        )}

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
        <text x={eqPt.x} y="232" fontSize="9" textAnchor="middle" fill="#64748b">
          Veq={veq.toFixed(1)}
        </text>

        {/* Current Operating Point on Curve */}
        <circle cx={currentPt.x} cy={currentPt.y} r="6" fill={color === "colorless" ? "#2563eb" : liquidColor} />
        {(() => {
          const ptColor = color === "colorless" ? "#2563eb" : liquidColor;
          const isRight = currentPt.x <= 315;
          const badgeW = 70;
          const badgeH = 18;
          const badgeX = Math.max(215, Math.min(390 - badgeW, isRight ? currentPt.x + 8 : currentPt.x - badgeW - 8));
          const badgeY = Math.max(42, Math.min(198, currentPt.y - 9));
          return (
            <g>
              <rect
                x={badgeX}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                rx="3"
                fill="var(--panel, #ffffff)"
                fillOpacity={0.95}
                stroke={ptColor}
                strokeWidth="1.2"
              />
              <text
                x={badgeX + badgeW / 2}
                y={badgeY + 12.5}
                fontSize="10"
                fontWeight="bold"
                fill={ptColor}
                textAnchor="middle"
              >
                pH = {ph.toFixed(2)}
              </text>
            </g>
          );
        })()}

        {/* Status Badge */}
        <g transform="translate(210, 262)">
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
            Indicator: <tspan fontWeight="bold">{color}</tspan> {ph >= 7 ? "(Basic)" : "(Acidic)"}
          </text>
          <text x="18" y="26" fontSize="9.5" fill="#64748b">
            {acidType === "weak" ? "Weak acid" : "Strong acid"}
          </text>
        </g>
      </svg>
      <figcaption className="scene-caption" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--foreground-muted, #666)", lineHeight: 1.4 }}>
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
  const reactionQuotient = Number(o.reactionQuotient ?? kc);
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
        <g transform="translate(365, 142)">
          <rect x="-30" y="-12" width="60" height="24" rx="4" fill="#e2e8f0" stroke="#94a3b8" />
          <text x="0" y="4" fontSize="10" fontWeight="bold" fill="#0f172a" textAnchor="middle">
            {temp} K
          </text>
        </g>

        {/* Equilibrium Constant Kc & Qc Badge */}
        <g transform="translate(365, 178)">
          <text x="0" y="0" fontSize="9" fill="#475569" textAnchor="middle">
            Kc = {kc.toFixed(4)}
          </text>
          <text x="0" y="12" fontSize="9" fill="#2563eb" textAnchor="middle" fontWeight="bold">
            Qc = {reactionQuotient.toFixed(4)}
          </text>
        </g>

        {/* Bottom Status & Concentrations */}
        <g transform="translate(40, 215)">
          <text x="0" y="0" fontSize="11" fill="currentColor">
            [NO₂] = <tspan fontWeight="bold">{concNO2.toFixed(3)} M</tspan> (brown) · [N₂O₄] = <tspan fontWeight="bold">{concN2O4.toFixed(3)} M</tspan> (colorless)
          </text>
          <text x="0" y="20" fontSize="11" fill="#2563eb" fontWeight="bold">
            {shift === "equilibrated"
              ? "At equilibrium (Qc ≈ Kc)"
              : shift === "shifted-to-products"
                ? "Equilibrium favors NO₂ (products)"
                : "Equilibrium favors N₂O₄ (reactants)"}
          </text>
        </g>
      </svg>
      <figcaption className="scene-caption" style={{ margin: "8px 0 0", fontSize: 12, color: "var(--foreground-muted, #666)", lineHeight: 1.4 }}>
        Raising temperature shifts equilibrium endothermically toward brown NO₂. Compressing volume shifts equilibrium toward colorless N₂O₄.
      </figcaption>
    </figure>
  );
}

/**
 * Visual for Phases of Matter & Supercritical Fluids:
 * Dual panel showing:
 * 1) Physical pressurized chamber with particle lattice (solid), flowing liquid with meniscus,
 *    dispersed kinetic gas, or glowing non-condensing supercritical fluid.
 * 2) Accurate P-T Phase Diagram mapping current state point (T, P) against sublimation,
 *    fusion, and vaporization boundaries, triple point, and critical point with supercritical region.
 */
export function PhaseChangeVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const mat = String(o.material ?? p.material ?? "water");
  const formula = String(
    o.formula ??
      (mat === "carbon-dioxide" ? "CO₂" : mat === "nitrogen" ? "N₂" : "H₂O"),
  );
  const matName = String(
    o.materialName ??
      (mat === "carbon-dioxide"
        ? "Carbon Dioxide"
        : mat === "nitrogen"
          ? "Nitrogen"
          : "Water"),
  );
  const temp = Number(o.temperature ?? p.temperature ?? 300);
  const pressure = Number(o.pressure ?? p.pressure ?? 1.0);
  const phase = String(o.phase ?? "Liquid");
  const density = Number(o.density ?? 1.0);
  const tTriple = Number(o.triplePointTemp ?? 273.16);
  const pTriple = Number(o.triplePointPressure ?? 0.006);
  const tCrit = Number(o.criticalPointTemp ?? 647.1);
  const pCrit = Number(o.criticalPointPressure ?? 217.7);
  const transitionState = String(
    o.transitionState ?? `Equilibrium Phase: ${phase}`,
  );

  const mapT = (t: number) =>
    270 + ((Math.max(50, Math.min(750, t)) - 50) / 700) * 230;

  const mapP = (pr: number) => {
    const logP = Math.log10(Math.max(0.001, Math.min(300, pr)));
    return 240 - ((logP + 3) / 5.477) * 190;
  };

  const curX = mapT(temp);
  const curY = mapP(pressure);
  const tripX = mapT(tTriple);
  const tripY = mapP(pTriple);
  const critX = mapT(tCrit);
  const critY = mapP(pCrit);

  const pistonY =
    75 +
    Math.min(
      60,
      Math.max(0, (Math.log10(Math.max(0.001, pressure)) + 3) * 11),
    );
  const chamberBottom = 220;

  const phaseColors: Record<
    string,
    { bg: string; stroke: string; label: string; text: string }
  > = {
    Solid: {
      bg: "rgba(14, 165, 233, 0.18)",
      stroke: "#0284c7",
      label: "Solid (Crystal Lattice)",
      text: "#0369a1",
    },
    Liquid: {
      bg: "rgba(37, 99, 235, 0.22)",
      stroke: "#2563eb",
      label: "Liquid (Flowing Fluid)",
      text: "#1d4ed8",
    },
    Gas: {
      bg: "rgba(245, 158, 11, 0.12)",
      stroke: "#d97706",
      label: "Gas (Dispersed Vapor)",
      text: "#b45309",
    },
    "Supercritical Fluid": {
      bg: "rgba(168, 85, 247, 0.28)",
      stroke: "#9333ea",
      label: "Supercritical Fluid (Dense Non-Condensing)",
      text: "#7e22ce",
    },
  };
  const theme = phaseColors[phase] ?? phaseColors.Liquid;

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 540 320"
        role="img"
        aria-label={`Phase Diagram for ${matName}: Current state is ${phase} at ${temp.toFixed(1)} K and ${pressure.toFixed(3)} atm.`}
        style={{ width: "100%", maxWidth: 640, height: "auto" }}
      >
        <title>{`${matName} (${formula}) Phase Diagram & Supercritical Transitions`}</title>

        <text
          x="270"
          y="24"
          fontSize="13"
          fontWeight="bold"
          textAnchor="middle"
          fill="currentColor"
        >
          {matName} ({formula}) · Phase: {phase} ({temp.toFixed(1)} K,{" "}
          {pressure < 1 ? pressure.toFixed(3) : pressure.toFixed(1)} atm)
        </text>

        {/* LEFT PANEL: Matter Chamber */}
        <rect
          x="30"
          y="50"
          width="180"
          height="170"
          rx="6"
          fill="#f8fafc"
          stroke="#475569"
          strokeWidth="2"
        />

        <rect
          x="32"
          y={pistonY}
          width="176"
          height={Math.max(4, chamberBottom - pistonY)}
          fill={theme.bg}
        />

        {phase === "Liquid" && (
          <path
            d={`M 32 ${pistonY + 4} Q 120 ${pistonY + 9} 208 ${pistonY + 4}`}
            fill="none"
            stroke="#2563eb"
            strokeWidth="2.5"
            strokeDasharray="4 2"
          />
        )}

        {phase === "Solid" && (
          <g transform="translate(45, 110)">
            {Array.from({ length: 16 }, (_, i) => {
              const row = Math.floor(i / 4);
              const col = i % 4;
              const cx = col * 40 + (row % 2 === 1 ? 12 : 0);
              const cy = row * 26;
              return (
                <g key={i}>
                  {col < 3 && (
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx + 38}
                      y2={cy}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}
                  {row < 3 && (
                    <line
                      x1={cx}
                      y1={cy}
                      x2={cx + (row % 2 === 1 ? -12 : 12)}
                      y2={cy + 26}
                      stroke="#94a3b8"
                      strokeWidth="1"
                      strokeDasharray="2 2"
                    />
                  )}
                  <circle cx={cx} cy={cy} r="6" fill="#0284c7" />
                  <circle cx={cx} cy={cy} r="3" fill="#bae6fd" />
                </g>
              );
            })}
          </g>
        )}

        {phase === "Liquid" && (
          <g transform="translate(40, 115)">
            {Array.from({ length: 18 }, (_, i) => {
              const cx = 15 + ((i * 31) % 140);
              const cy = 10 + Math.min(85, (i * 17) % 95);
              return (
                <circle
                  key={i}
                  cx={cx}
                  cy={cy}
                  r="5"
                  fill="#2563eb"
                  fillOpacity="0.85"
                />
              );
            })}
          </g>
        )}

        {phase === "Gas" && (
          <g transform="translate(40, 60)">
            {Array.from({ length: 12 }, (_, i) => {
              const cx = 15 + ((i * 47) % 140);
              const cy = Math.max(pistonY - 45, 15 + ((i * 37) % 135));
              const dx = i % 2 === 0 ? 8 : -8;
              const dy = i % 3 === 0 ? 6 : -6;
              return (
                <g key={i}>
                  <circle cx={cx} cy={cy} r="4" fill="#d97706" />
                  <line
                    x1={cx}
                    y1={cy}
                    x2={cx + dx}
                    y2={cy + dy}
                    stroke="#f59e0b"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}
          </g>
        )}

        {phase === "Supercritical Fluid" && (
          <g transform="translate(40, 60)">
            {Array.from({ length: 28 }, (_, i) => {
              const cx = 12 + ((i * 29) % 148);
              const cy = Math.max(pistonY - 45, 12 + ((i * 23) % 145));
              return (
                <g key={i}>
                  <circle
                    cx={cx}
                    cy={cy}
                    r={i % 3 === 0 ? 5 : 3.5}
                    fill="#9333ea"
                    fillOpacity="0.75"
                  />
                  <circle
                    cx={cx}
                    cy={cy}
                    r={i % 3 === 0 ? 2 : 1.5}
                    fill="#f3e8ff"
                  />
                </g>
              );
            })}
          </g>
        )}

        <rect
          x="32"
          y={pistonY - 8}
          width="176"
          height="12"
          rx="2"
          fill="#334155"
          stroke="#1e293b"
          strokeWidth="1.5"
        />
        <rect
          x="112"
          y="28"
          width="16"
          height={Math.max(10, pistonY - 34)}
          rx="2"
          fill="#64748b"
        />

        <g transform="translate(120, 236)">
          <rect
            x="-85"
            y="-11"
            width="170"
            height="22"
            rx="4"
            fill={theme.bg}
            stroke={theme.stroke}
            strokeWidth="1.5"
          />
          <text
            x="0"
            y="4"
            fontSize="10"
            fontWeight="bold"
            fill={theme.text}
            textAnchor="middle"
          >
            {theme.label}
          </text>
        </g>
        <text x="120" y="258" fontSize="9.5" fill="#475569" textAnchor="middle">
          Density:{" "}
          <tspan fontWeight="bold" fill="#0f172a">
            {density.toFixed(3)} g/cm³
          </tspan>
        </text>

        {/* RIGHT PANEL: P-T Phase Diagram */}
        <rect
          x="260"
          y="50"
          width="250"
          height="190"
          fill="#ffffff"
          stroke="#cbd5e1"
          strokeWidth="1.5"
          rx="4"
        />

        {critX < 510 && critY > 50 && (
          <g>
            <rect
              x={critX}
              y="50"
              width={510 - critX}
              height={critY - 50}
              fill="rgba(192, 132, 252, 0.22)"
              stroke="#c084fc"
              strokeDasharray="3 3"
            />
            <text
              x={(critX + 510) / 2}
              y="64"
              fontSize="8.5"
              fontWeight="bold"
              fill="#7e22ce"
              textAnchor="middle"
            >
              SUPERCRITICAL
            </text>
            <text
              x={(critX + 510) / 2}
              y="76"
              fontSize="8"
              fill="#9333ea"
              textAnchor="middle"
            >
              T &gt; Tc, P &gt; Pc
            </text>
          </g>
        )}

        <path
          d={`M 260 240 L ${tripX} ${tripY} L ${mapT(tTriple + (mat === "water" ? -15 : 15))} 50 L 260 50 Z`}
          fill="rgba(2, 132, 199, 0.06)"
        />

        <path
          d={`M 260 240 Q ${(260 + tripX) / 2} ${(240 + tripY) / 2 + 10} ${tripX} ${tripY}`}
          fill="none"
          stroke="#0284c7"
          strokeWidth="2"
        />

        <line
          x1={tripX}
          y1={tripY}
          x2={mapT(tTriple + (mat === "water" ? -12 : 20))}
          y2="50"
          stroke="#0369a1"
          strokeWidth="2.5"
        />

        <path
          d={`M ${tripX} ${tripY} Q ${(tripX + critX) / 2 - 10} ${(tripY + critY) / 2 + 15} ${critX} ${critY}`}
          fill="none"
          stroke="#2563eb"
          strokeWidth="2.5"
        />

        <text x="285" y="140" fontSize="11" fontWeight="bold" fill="#0284c7">
          SOLID
        </text>
        <text
          x={tripX + 15}
          y="115"
          fontSize="11"
          fontWeight="bold"
          fill="#2563eb"
        >
          LIQUID
        </text>
        <text x="430" y="210" fontSize="11" fontWeight="bold" fill="#d97706">
          GAS
        </text>

        <circle
          cx={tripX}
          cy={tripY}
          r="4"
          fill="#0f172a"
          stroke="#ffffff"
          strokeWidth="1.5"
        />
        <text
          x={tripX + 6}
          y={tripY + 12}
          fontSize="8"
          fill="#334155"
          fontWeight="bold"
        >
          TP ({tTriple.toFixed(0)} K,{" "}
          {pTriple < 1 ? pTriple.toFixed(3) : pTriple.toFixed(1)} atm)
        </text>

        <circle
          cx={critX}
          cy={critY}
          r="5.5"
          fill="#9333ea"
          stroke="#ffffff"
          strokeWidth="2"
        />
        <text
          x={critX - 6}
          y={critY - 8}
          fontSize="8.5"
          fill="#7e22ce"
          fontWeight="bold"
          textAnchor="end"
        >
          CP ({tCrit.toFixed(0)} K, {pCrit.toFixed(0)} atm)
        </text>

        <circle
          cx={curX}
          cy={curY}
          r="8"
          fill="none"
          stroke="#dc2626"
          strokeWidth="2"
          strokeDasharray="3 2"
        />
        <circle cx={curX} cy={curY} r="3.5" fill="#dc2626" />
        {(() => {
          const badgeW = 152;
          const badgeH = 18;
          const badgeX = Math.min(360, Math.max(265, curX - badgeW / 2));
          const badgeY = curY > 80 ? curY - 22 : curY + 12;
          return (
            <g>
              <rect
                x={badgeX}
                y={badgeY}
                width={badgeW}
                height={badgeH}
                rx="3"
                fill="var(--panel, #ffffff)"
                fillOpacity={0.95}
                stroke="#dc2626"
                strokeWidth="1"
              />
              <text
                x={badgeX + badgeW / 2}
                y={badgeY + 12}
                fontSize="8.5"
                fontWeight="bold"
                fill="#dc2626"
                textAnchor="middle"
              >
                Current ({temp.toFixed(0)} K,{" "}
                {pressure < 1 ? pressure.toFixed(3) : pressure.toFixed(1)} atm)
              </text>
            </g>
          );
        })()}

        <text x="260" y="254" fontSize="8" fill="#64748b">
          50 K
        </text>
        <text x="380" y="254" fontSize="8" fill="#64748b" textAnchor="middle">
          400 K
        </text>
        <text x="500" y="254" fontSize="8" fill="#64748b" textAnchor="end">
          750 K (Temperature T)
        </text>

        <text x="255" y="240" fontSize="8" fill="#64748b" textAnchor="end">
          0.001
        </text>
        <text x="255" y="136" fontSize="8" fill="#64748b" textAnchor="end">
          1 atm
        </text>
        <text x="255" y="55" fontSize="8" fill="#64748b" textAnchor="end">
          300 atm (P)
        </text>

        <g transform="translate(270, 282)">
          <text
            x="0"
            y="0"
            fontSize="10"
            fontWeight="bold"
            fill="currentColor"
            textAnchor="middle"
          >
            {transitionState}
          </text>
          <text x="0" y="15" fontSize="9" fill="#64748b" textAnchor="middle">
            Triple Point: {tTriple.toFixed(1)} K,{" "}
            {pTriple < 1 ? pTriple.toFixed(3) : pTriple.toFixed(2)} atm · Critical
            Point: {tCrit.toFixed(1)} K,{" "}
            {pCrit < 1 ? pCrit.toFixed(2) : pCrit.toFixed(1)} atm · Normal B.P.:{" "}
            {Number(o.normalBoilingTemp ?? 373).toFixed(1)} K
          </text>
        </g>
      </svg>
      <figcaption
        className="scene-caption"
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          color: "var(--foreground-muted, #666)",
          lineHeight: 1.4,
        }}
      >
        Vary temperature and pressure across phase boundaries. Beyond the
        critical point (T &gt; Tc and P &gt; Pc), the substance transitions into
        a supercritical fluid with hybrid liquid-gas properties.
      </figcaption>
    </figure>
  );
}

export function BeerLambertVisual({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs;
  const concentration = Number(o.concentration ?? 50);
  const pathLength = Number(o.pathLength ?? 1.0);
  const molarAbsorptivity = Number(o.molarAbsorptivity ?? 0.02);
  const absorbance = Number(o.absorbance ?? 1.0);
  const transmittance = Number(o.transmittance ?? 10.0);
  const transmittanceFraction = Math.max(
    0.0001,
    Math.min(1.0, Number(o.transmittanceFraction ?? 0.1)),
  );

  // Cuvette geometric scaling: pathLength from 0.5 cm to 3.0 cm maps to width 50px to 190px
  const cuvetteW = 50 + ((pathLength - 0.5) / 2.5) * 140;
  const cuvetteX = 180;
  const cuvetteH = 150;
  const cuvetteY = 55;

  // Solution optical depth: cyan-blue solution #0284c7
  const solutionOpacity = Math.min(
    0.92,
    Math.max(0.08, 0.08 + 0.84 * (concentration / 400)),
  );

  // Beam geometry
  const beamY = 110;
  const beamH = 40;
  const exitBeamX = cuvetteX + cuvetteW;
  const detectorX = 425;

  // Educational status
  let regimeText =
    "Optimal Linear Range: Beer-Lambert law exhibits ideal proportionality";
  let regimeColor = "#0284c7";
  if (absorbance < 0.1) {
    regimeText =
      "Dilute Solution: High light transmission (>79%), low optical density";
    regimeColor = "#10b981";
  } else if (absorbance > 1.5) {
    regimeText =
      "Strongly Absorbing: <3.2% light transmitted (photodetector saturation warning)";
    regimeColor = "#f59e0b";
  }

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 580 320"
        role="img"
        aria-label={`Beer-Lambert spectrophotometry simulation: Concentration ${concentration} mM, path length ${pathLength.toFixed(1)} cm, molar absorptivity ${molarAbsorptivity} mM⁻¹cm⁻¹, Absorbance ${absorbance.toFixed(3)}, Transmittance ${transmittance.toFixed(1)}%`}
      >
        <title>Beer-Lambert Law &amp; Spectrophotometry</title>
        <defs>
          <linearGradient id="incidentBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#fbbf24" stopOpacity="1.0" />
          </linearGradient>
          <linearGradient id="cuvetteBeamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#fbbf24" stopOpacity="1.0" />
            <stop
              offset="100%"
              stopColor="#fbbf24"
              stopOpacity={Math.max(0.05, transmittanceFraction)}
            />
          </linearGradient>
          <linearGradient id="metalHousing" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#334155" />
            <stop offset="50%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="glassWall" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#94a3b8" stopOpacity="0.1" />
          </linearGradient>
        </defs>

        {/* Header Title */}
        <text
          x="290"
          y="25"
          textAnchor="middle"
          fontSize="13"
          fontWeight="bold"
          fill="currentColor"
        >
          Beer-Lambert Spectrophotometer: Light Absorbance &amp; Transmittance
        </text>
        <text
          x="290"
          y="42"
          textAnchor="middle"
          fontSize="10"
          fill="var(--foreground-muted, #64748b)"
        >
          A = ε · b · c &nbsp;|&nbsp; T = 10⁻ᴬ × 100% &nbsp;|&nbsp; λ = 540 nm
        </text>

        {/* 1. Light Source (Left) */}
        <g id="lightSource">
          <rect
            x="20"
            y="75"
            width="80"
            height="110"
            rx="6"
            fill="url(#metalHousing)"
            stroke="#475569"
            strokeWidth="1.5"
          />
          {/* Cooling ribs */}
          <line x1="28" y1="90" x2="28" y2="170" stroke="#475569" strokeWidth="1.5" />
          <line x1="38" y1="90" x2="38" y2="170" stroke="#475569" strokeWidth="1.5" />
          <line x1="48" y1="90" x2="48" y2="170" stroke="#475569" strokeWidth="1.5" />

          {/* Aperture ring & lens */}
          <rect x="90" y="102" width="10" height="56" rx="2" fill="#64748b" />
          <ellipse cx="100" cy="130" rx="4" ry="24" fill="#fbbf24" opacity="0.9" />

          <text
            x="60"
            y="95"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="bold"
            fill="#e2e8f0"
          >
            LIGHT
          </text>
          <text
            x="60"
            y="107"
            textAnchor="middle"
            fontSize="7.5"
            fill="#94a3b8"
          >
            SOURCE
          </text>
          <text
            x="60"
            y="172"
            textAnchor="middle"
            fontSize="7"
            fill="#38bdf8"
          >
            λ = 540 nm
          </text>
        </g>

        {/* 2. Incident Light Beam (from Light Source to Cuvette) */}
        <g id="incidentBeam">
          <rect
            x="100"
            y={beamY}
            width={cuvetteX - 100}
            height={beamH}
            fill="url(#incidentBeamGrad)"
            opacity="0.95"
          />
          {/* Beam boundary glow lines */}
          <line
            x1="100"
            y1={beamY}
            x2={cuvetteX}
            y2={beamY}
            stroke="#fde68a"
            strokeWidth="1"
            opacity="0.8"
          />
          <line
            x1="100"
            y1={beamY + beamH}
            x2={cuvetteX}
            y2={beamY + beamH}
            stroke="#fde68a"
            strokeWidth="1"
            opacity="0.8"
          />
          <text
            x={(100 + cuvetteX) / 2}
            y={beamY - 6}
            textAnchor="middle"
            fontSize="9"
            fontWeight="bold"
            fill="#d97706"
          >
            I₀ = 100%
          </text>
        </g>

        {/* 3. Optical Cuvette & Solution */}
        <g id="opticalCuvette">
          {/* Cuvette glass backing */}
          <rect
            x={cuvetteX}
            y={cuvetteY}
            width={cuvetteW}
            height={cuvetteH}
            fill="#e2e8f0"
            fillOpacity="0.2"
            stroke="#94a3b8"
            strokeWidth="2"
            rx="2"
          />

          {/* Solution Liquid */}
          <rect
            x={cuvetteX + 2}
            y={cuvetteY + 14}
            width={cuvetteW - 4}
            height={cuvetteH - 16}
            fill="#0284c7"
            fillOpacity={solutionOpacity}
          />
          {/* Meniscus curve */}
          <ellipse
            cx={cuvetteX + cuvetteW / 2}
            cy={cuvetteY + 14}
            rx={(cuvetteW - 4) / 2}
            ry="4"
            fill="#38bdf8"
            fillOpacity={solutionOpacity * 0.8}
            stroke="#0284c7"
            strokeWidth="1"
          />

          {/* Attenuating Beam inside cuvette */}
          <rect
            x={cuvetteX}
            y={beamY}
            width={cuvetteW}
            height={beamH}
            fill="url(#cuvetteBeamGrad)"
          />

          {/* Solute particles illustration */}
          {Array.from({ length: Math.min(28, Math.max(4, Math.round(concentration / 15))) }, (_, i) => {
            const px = cuvetteX + 8 + ((i * 37) % Math.max(10, cuvetteW - 16));
            const py = cuvetteY + 24 + ((i * 47) % (cuvetteH - 32));
            return (
              <circle
                key={i}
                cx={px}
                cy={py}
                r="2"
                fill="#ffffff"
                opacity={0.3 + 0.6 * (concentration / 400)}
              />
            );
          })}

          {/* Front glass highlight */}
          <rect
            x={cuvetteX + 2}
            y={cuvetteY}
            width={8}
            height={cuvetteH}
            fill="url(#glassWall)"
          />

          {/* Cuvette Path Length b Dimension Meter */}
          <g transform={`translate(${cuvetteX}, ${cuvetteY + cuvetteH + 12})`}>
            <line x1="0" y1="0" x2={cuvetteW} y2="0" stroke="currentColor" strokeWidth="1.5" />
            <line x1="0" y1="-4" x2="0" y2="4" stroke="currentColor" strokeWidth="1.5" />
            <line x1={cuvetteW} y1="-4" x2={cuvetteW} y2="4" stroke="currentColor" strokeWidth="1.5" />
            <text
              x={cuvetteW / 2}
              y="14"
              textAnchor="middle"
              fontSize="9"
              fontWeight="bold"
              fill="currentColor"
            >
              b = {pathLength.toFixed(1)} cm
            </text>
          </g>

          {/* Solution Parameters Tag */}
          <text
            x={cuvetteX + cuvetteW / 2}
            y={cuvetteY - 6}
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="bold"
            fill="#0284c7"
          >
            c = {concentration.toFixed(0)} mM
          </text>
        </g>

        {/* 4. Transmitted Light Beam (from Cuvette to Detector) */}
        <g id="transmittedBeam">
          {exitBeamX < detectorX && (
            <>
              <rect
                x={exitBeamX}
                y={beamY}
                width={detectorX - exitBeamX}
                height={beamH}
                fill="#fbbf24"
                opacity={Math.max(0.04, Math.min(1.0, transmittanceFraction))}
              />
              <line
                x1={exitBeamX}
                y1={beamY}
                x2={detectorX}
                y2={beamY}
                stroke="#fde68a"
                strokeWidth="1"
                opacity={Math.max(0.04, transmittanceFraction * 0.8)}
              />
              <line
                x1={exitBeamX}
                y1={beamY + beamH}
                x2={detectorX}
                y2={beamY + beamH}
                stroke="#fde68a"
                strokeWidth="1"
                opacity={Math.max(0.04, transmittanceFraction * 0.8)}
              />
              <text
                x={(exitBeamX + detectorX) / 2}
                y={beamY - 6}
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="#d97706"
              >
                I = {transmittance.toFixed(1)}%
              </text>
            </>
          )}
        </g>

        {/* 5. Photodetector & Spectrophotometer Display (Right) */}
        <g id="photodetector">
          {/* Main Housing */}
          <rect
            x={detectorX}
            y="55"
            width="135"
            height="150"
            rx="8"
            fill="url(#metalHousing)"
            stroke="#0284c7"
            strokeWidth="2"
          />

          {/* Detector sensor aperture */}
          <rect x={detectorX - 6} y="102" width="6" height="56" rx="2" fill="#64748b" />
          <ellipse cx={detectorX} cy="130" rx="3" ry="24" fill="#38bdf8" opacity="0.8" />

          {/* Instrument Title */}
          <text
            x={detectorX + 67}
            y="72"
            textAnchor="middle"
            fontSize="8.5"
            fontWeight="bold"
            fill="#e2e8f0"
          >
            PHOTODETECTOR
          </text>

          {/* LCD Screen 1: Absorbance (A) */}
          <rect
            x={detectorX + 12}
            y="82"
            width="111"
            height="34"
            rx="4"
            fill="#030712"
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text x={detectorX + 18} y="94" fontSize="7.5" fill="#94a3b8" fontWeight="bold">
            ABSORBANCE (A)
          </text>
          <text
            x={detectorX + 116}
            y="109"
            textAnchor="end"
            fontSize="15"
            fontWeight="bold"
            fontFamily="monospace"
            fill="#38bdf8"
          >
            {absorbance.toFixed(3)}
          </text>

          {/* LCD Screen 2: Transmittance (%T) */}
          <rect
            x={detectorX + 12}
            y="122"
            width="111"
            height="34"
            rx="4"
            fill="#030712"
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text x={detectorX + 18} y="134" fontSize="7.5" fill="#94a3b8" fontWeight="bold">
            TRANSMITTANCE (%T)
          </text>
          <text
            x={detectorX + 116}
            y="149"
            textAnchor="end"
            fontSize="15"
            fontWeight="bold"
            fontFamily="monospace"
            fill="#34d399"
          >
            {transmittance.toFixed(1)}%
          </text>

          {/* Transmittance linear bar gauge */}
          <g transform={`translate(${detectorX + 12}, 166)`}>
            <rect x="0" y="0" width="111" height="8" rx="3" fill="#1e293b" />
            <rect
              x="0"
              y="0"
              width={Math.max(2, (111 * transmittance) / 100)}
              height="8"
              rx="3"
              fill="#10b981"
            />
            <text x="0" y="18" fontSize="7" fill="#64748b">
              0%
            </text>
            <text x="111" y="18" textAnchor="end" fontSize="7" fill="#64748b">
              100%
            </text>
          </g>

          <text
            x={detectorX + 67}
            y="198"
            textAnchor="middle"
            fontSize="7"
            fill="#64748b"
          >
            Digital Dual Display
          </text>
        </g>

        {/* 6. Bottom Pedagogical Breakdown Card */}
        <g transform="translate(20, 240)">
          <rect
            x="0"
            y="0"
            width="540"
            height="68"
            rx="6"
            fill="var(--panel, #ffffff)"
            fillOpacity="0.95"
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          <text x="14" y="18" fontSize="9.5" fontWeight="bold" fill="currentColor">
            Calculation: A = ε · b · c = ({molarAbsorptivity.toFixed(3)} mM⁻¹cm⁻¹) × ({pathLength.toFixed(1)} cm) × ({concentration.toFixed(0)} mM) = {absorbance.toFixed(3)}
          </text>

          <text x="14" y="34" fontSize="9" fill="var(--foreground-muted, #64748b)">
            Transmittance: T = 10⁻ᴬ × 100% = 10⁻⁽{absorbance.toFixed(3)}⁾ × 100% = {transmittance.toFixed(2)}% (Transmitted Intensity: {Number(o.transmittedIntensity ?? 0).toFixed(1)} mW/cm²)
          </text>

          <rect
            x="14"
            y="42"
            width="512"
            height="18"
            rx="3"
            fill={regimeColor}
            fillOpacity="0.12"
            stroke={regimeColor}
            strokeWidth="1"
          />
          <text
            x="20"
            y="54"
            fontSize="8.5"
            fontWeight="bold"
            fill={regimeColor}
          >
            {regimeText}
          </text>
        </g>
      </svg>
      <figcaption
        className="scene-caption"
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          color: "var(--foreground-muted, #666)",
          lineHeight: 1.4,
        }}
      >
        Beer-Lambert spectrophotometry: As concentration <em>c</em> or optical
        path length <em>b</em> increases, absorbance <em>A</em> rises linearly (
        <em>A = ε·b·c</em>), while light transmittance <em>T</em> decays
        exponentially (<em>T = 10⁻ᴬ × 100%</em>).
      </figcaption>
    </figure>
  );
}

export function GalvanicCellVisual({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs;
  const znConc = Number(o.znConcentration ?? 1.0);
  const cuConc = Number(o.cuConcentration ?? 1.0);
  const cellPotential = Number(o.cellPotential ?? 1.1);
  const reactionQuotient = Number(o.reactionQuotient ?? 1.0);
  const deltaG = Number(o.deltaG ?? -212.3);
  const isSpontaneous = Boolean(o.isSpontaneous ?? true);

  // Solution opacities
  const znSolutionOpacity = Math.min(
    0.45,
    Math.max(0.08, 0.08 + 0.35 * (znConc / 2.0)),
  );
  const cuSolutionOpacity = Math.min(
    0.9,
    Math.max(0.18, 0.18 + 0.72 * (cuConc / 2.0)),
  );

  // Beaker geometry
  const leftBeakerX = 40;
  const rightBeakerX = 390;
  const beakerW = 150;
  const beakerH = 130;
  const beakerY = 120;

  // Status insight text
  let statusBadge = "Standard State: [Zn²⁺] = [Cu²⁺] = 1.0 M → E = E° = +1.100 V";
  let statusColor = "#0284c7";
  if (cuConc > znConc) {
    statusBadge = `Enhanced Voltage (E > E°): High reactant [Cu²⁺] drives forward reduction (Le Chatelier)`;
    statusColor = "#10b981";
  } else if (znConc > cuConc) {
    statusBadge = `Reduced Voltage (E < E°): High product [Zn²⁺] opposes cell EMF`;
    statusColor = "#f59e0b";
  }

  return (
    <figure style={{ margin: 0 }}>
      <svg
        viewBox="0 0 580 340"
        role="img"
        aria-label={`Galvanic voltaic Daniell cell simulation: [Zn²⁺] = ${znConc.toFixed(3)} M, [Cu²⁺] = ${cuConc.toFixed(3)} M, Cell potential = ${cellPotential.toFixed(3)} V, Q = ${reactionQuotient.toFixed(4)}, ΔG = ${deltaG.toFixed(1)} kJ/mol`}
      >
        <title>Galvanic Voltaic Cell &amp; Nernst Equation</title>
        <defs>
          <linearGradient id="znPlateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#94a3b8" />
            <stop offset="50%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#64748b" />
          </linearGradient>
          <linearGradient id="cuPlateGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#c2410c" />
            <stop offset="50%" stopColor="#ea580c" />
            <stop offset="100%" stopColor="#9a3412" />
          </linearGradient>
          <linearGradient id="voltmeterChassis" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#1e293b" />
            <stop offset="100%" stopColor="#0f172a" />
          </linearGradient>
          <linearGradient id="saltBridgeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#e0e7ff" stopOpacity="0.9" />
            <stop offset="50%" stopColor="#c7d2fe" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#e0e7ff" stopOpacity="0.9" />
          </linearGradient>
        </defs>

        {/* Header */}
        <text
          x="290"
          y="18"
          textAnchor="middle"
          fontSize="12.5"
          fontWeight="bold"
          fill="currentColor"
        >
          Daniell Galvanic Cell (Zn / Cu) &amp; Nernst Equation
        </text>

        {/* 1. Overhead Circuit & Digital Voltmeter */}
        {/* External wire from Zn plate to Voltmeter */}
        <path
          d="M 115 110 L 115 45 L 240 45"
          fill="none"
          stroke="#475569"
          strokeWidth="2.5"
        />
        {/* External wire from Cu plate to Voltmeter */}
        <path
          d="M 465 110 L 465 45 L 340 45"
          fill="none"
          stroke="#475569"
          strokeWidth="2.5"
        />

        {/* Electron Flow Markers */}
        <g id="electronFlow">
          <circle cx="160" cy="45" r="3.5" fill="#38bdf8" />
          <text x="160" y="38" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0284c7">
            e⁻ →
          </text>
          <circle cx="210" cy="45" r="3.5" fill="#38bdf8" />
          <circle cx="370" cy="45" r="3.5" fill="#38bdf8" />
          <text x="400" y="38" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0284c7">
            e⁻ →
          </text>
          <circle cx="430" cy="45" r="3.5" fill="#38bdf8" />
        </g>

        {/* Voltmeter Housing */}
        <g id="voltmeter" transform="translate(235, 20)">
          <rect
            x="0"
            y="0"
            width="110"
            height="54"
            rx="6"
            fill="url(#voltmeterChassis)"
            stroke="#64748b"
            strokeWidth="1.5"
          />
          {/* Voltmeter Terminals */}
          <circle cx="8" cy="25" r="3.5" fill="#000000" stroke="#475569" strokeWidth="1" />
          <circle cx="102" cy="25" r="3.5" fill="#dc2626" stroke="#f87171" strokeWidth="1" />

          {/* LCD Screen */}
          <rect
            x="14"
            y="8"
            width="82"
            height="26"
            rx="3"
            fill="#030712"
            stroke="#1e293b"
            strokeWidth="1"
          />
          <text
            x="55"
            y="26"
            textAnchor="middle"
            fontSize="14.5"
            fontWeight="bold"
            fontFamily="monospace"
            fill={cellPotential >= 0 ? "#22c55e" : "#ef4444"}
          >
            {cellPotential >= 0 ? "+" : ""}
            {cellPotential.toFixed(3)} V
          </text>

          <text
            x="55"
            y="45"
            textAnchor="middle"
            fontSize="7.5"
            fontWeight="bold"
            fill="#94a3b8"
          >
            DIGITAL VOLTMETER
          </text>
        </g>

        {/* 2. Salt Bridge (Inverted U-Tube) */}
        <g id="saltBridge">
          <path
            d="M 165 170 L 165 105 Q 165 95 175 95 L 405 95 Q 415 95 415 105 L 415 170"
            fill="none"
            stroke="url(#saltBridgeGrad)"
            strokeWidth="16"
            strokeLinecap="round"
          />
          <path
            d="M 165 170 L 165 105 Q 165 95 175 95 L 405 95 Q 415 95 415 105 L 415 170"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="1.5"
          />
          {/* Cotton plugs at ends */}
          <rect x="157" y="166" width="16" height="6" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" />
          <rect x="407" y="166" width="16" height="6" rx="2" fill="#cbd5e1" stroke="#64748b" strokeWidth="0.5" />

          {/* Salt Bridge Label & Ion Migration */}
          <rect x="238" y="86" width="104" height="16" rx="3" fill="var(--panel, #ffffff)" fillOpacity="0.9" stroke="#cbd5e1" strokeWidth="1" />
          <text x="290" y="98" textAnchor="middle" fontSize="7.5" fontWeight="bold" fill="#4338ca">
            Salt Bridge (KNO₃)
          </text>

          {/* Ion Migration markers */}
          <text x="210" y="112" fontSize="7.5" fontWeight="bold" fill="#dc2626">
            ← NO₃⁻
          </text>
          <text x="345" y="112" fontSize="7.5" fontWeight="bold" fill="#2563eb">
            K⁺ →
          </text>
        </g>

        {/* 3. Left Beaker: Zinc Anode Half-Cell */}
        <g id="anodeHalfCell">
          {/* Beaker Outline */}
          <path
            d={`M ${leftBeakerX} 120 L ${leftBeakerX} ${beakerY + beakerH} Q ${leftBeakerX} ${beakerY + beakerH + 8} ${leftBeakerX + 10} ${beakerY + beakerH + 8} L ${leftBeakerX + beakerW - 10} ${beakerY + beakerH + 8} Q ${leftBeakerX + beakerW} ${beakerY + beakerH + 8} ${leftBeakerX + beakerW} ${beakerY + beakerH} L ${leftBeakerX + beakerW} 120`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          {/* ZnSO4 Solution */}
          <rect
            x={leftBeakerX + 2}
            y={beakerY + 18}
            width={beakerW - 4}
            height={beakerH - 12}
            fill="#94a3b8"
            fillOpacity={znSolutionOpacity}
          />
          <ellipse
            cx={leftBeakerX + beakerW / 2}
            cy={beakerY + 18}
            rx={(beakerW - 4) / 2}
            ry="4"
            fill="#cbd5e1"
            fillOpacity={znSolutionOpacity}
            stroke="#94a3b8"
            strokeWidth="1"
          />

          {/* Zinc Electrode Plate */}
          <rect
            x="100"
            y="90"
            width="30"
            height="140"
            rx="2"
            fill="url(#znPlateGrad)"
            stroke="#475569"
            strokeWidth="1.5"
          />
          <text x="115" y="105" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#0f172a">
            Zn
          </text>

          {/* Anode oxidation text */}
          <text x={leftBeakerX + beakerW / 2} y="142" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#0f172a">
            ANODE (-)
          </text>
          <text x={leftBeakerX + beakerW / 2} y="154" textAnchor="middle" fontSize="7.5" fill="#475569">
            Zn(s) → Zn²⁺ + 2e⁻
          </text>
          <text x={leftBeakerX + beakerW / 2} y="165" textAnchor="middle" fontSize="7" fill="#64748b">
            E°_ox = +0.76 V
          </text>

          {/* Zn2+ dissolving ions markers */}
          <circle cx="75" cy="190" r="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          <text x="75" y="193" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#334155">
            Zn²⁺
          </text>
          <circle cx="150" cy="205" r="8" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
          <text x="150" y="208" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#334155">
            Zn²⁺
          </text>

          {/* Anode concentration pill */}
          <g transform={`translate(${leftBeakerX + 15}, ${beakerY + beakerH + 14})`}>
            <rect x="0" y="0" width="120" height="20" rx="3" fill="var(--panel, #ffffff)" fillOpacity="0.9" stroke="#94a3b8" strokeWidth="1" />
            <text x="60" y="14" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#0f172a">
              [Zn²⁺] = {znConc.toFixed(3)} M
            </text>
          </g>
        </g>

        {/* 4. Right Beaker: Copper Cathode Half-Cell */}
        <g id="cathodeHalfCell">
          {/* Beaker Outline */}
          <path
            d={`M ${rightBeakerX} 120 L ${rightBeakerX} ${beakerY + beakerH} Q ${rightBeakerX} ${beakerY + beakerH + 8} ${rightBeakerX + 10} ${beakerY + beakerH + 8} L ${rightBeakerX + beakerW - 10} ${beakerY + beakerH + 8} Q ${rightBeakerX + beakerW} ${beakerY + beakerH + 8} ${rightBeakerX + beakerW} ${beakerY + beakerH} L ${rightBeakerX + beakerW} 120`}
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2"
          />
          {/* CuSO4 Solution */}
          <rect
            x={rightBeakerX + 2}
            y={beakerY + 18}
            width={beakerW - 4}
            height={beakerH - 12}
            fill="#1d4ed8"
            fillOpacity={cuSolutionOpacity}
          />
          <ellipse
            cx={rightBeakerX + beakerW / 2}
            cy={beakerY + 18}
            rx={(beakerW - 4) / 2}
            ry="4"
            fill="#60a5fa"
            fillOpacity={cuSolutionOpacity}
            stroke="#1d4ed8"
            strokeWidth="1"
          />

          {/* Copper Electrode Plate */}
          <rect
            x="450"
            y="90"
            width="30"
            height="140"
            rx="2"
            fill="url(#cuPlateGrad)"
            stroke="#9a3412"
            strokeWidth="1.5"
          />
          <text x="465" y="105" textAnchor="middle" fontSize="8" fontWeight="bold" fill="#ffffff">
            Cu
          </text>

          {/* Cathode reduction text */}
          <text x={rightBeakerX + beakerW / 2} y="142" textAnchor="middle" fontSize="8.5" fontWeight="bold" fill="#ffffff">
            CATHODE (+)
          </text>
          <text x={rightBeakerX + beakerW / 2} y="154" textAnchor="middle" fontSize="7.5" fill="#e0e7ff">
            Cu²⁺ + 2e⁻ → Cu(s)
          </text>
          <text x={rightBeakerX + beakerW / 2} y="165" textAnchor="middle" fontSize="7" fill="#bfdbfe">
            E°_red = +0.34 V
          </text>

          {/* Cu2+ plating ions markers */}
          <circle cx="420" cy="190" r="8" fill="#1e40af" stroke="#60a5fa" strokeWidth="1" />
          <text x="420" y="193" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#ffffff">
            Cu²⁺
          </text>
          <circle cx="505" cy="205" r="8" fill="#1e40af" stroke="#60a5fa" strokeWidth="1" />
          <text x="505" y="208" textAnchor="middle" fontSize="6.5" fontWeight="bold" fill="#ffffff">
            Cu²⁺
          </text>

          {/* Cathode concentration pill */}
          <g transform={`translate(${rightBeakerX + 15}, ${beakerY + beakerH + 14})`}>
            <rect x="0" y="0" width="120" height="20" rx="3" fill="var(--panel, #ffffff)" fillOpacity="0.9" stroke="#1d4ed8" strokeWidth="1" />
            <text x="60" y="14" textAnchor="middle" fontSize="9" fontWeight="bold" fill="#1d4ed8">
              [Cu²⁺] = {cuConc.toFixed(3)} M
            </text>
          </g>
        </g>

        {/* 5. Bottom Nernst Equation Dashboard */}
        <g transform="translate(20, 276)">
          <rect
            x="0"
            y="0"
            width="540"
            height="58"
            rx="6"
            fill="var(--panel, #ffffff)"
            fillOpacity="0.95"
            stroke="#cbd5e1"
            strokeWidth="1"
          />

          <text x="14" y="17" fontSize="9.5" fontWeight="bold" fill="currentColor">
            Nernst Equation: E_cell = E° - (RT/2F) · ln(Q) = 1.100 V - (0.01285 V) · ln({reactionQuotient.toFixed(3)}) = {cellPotential.toFixed(3)} V
          </text>

          <text x="14" y="32" fontSize="9" fill="var(--foreground-muted, #64748b)">
            Reaction Quotient Q = [Zn²⁺]/[Cu²⁺] = {reactionQuotient.toFixed(4)} &nbsp;|&nbsp; ΔG = -nFE = {deltaG.toFixed(1)} kJ/mol ({isSpontaneous ? "Spontaneous" : "Non-spontaneous"})
          </text>

          <rect
            x="14"
            y="38"
            width="512"
            height="15"
            rx="2.5"
            fill={statusColor}
            fillOpacity="0.12"
            stroke={statusColor}
            strokeWidth="1"
          />
          <text
            x="20"
            y="49"
            fontSize="8"
            fontWeight="bold"
            fill={statusColor}
          >
            {statusBadge}
          </text>
        </g>
      </svg>
      <figcaption
        className="scene-caption"
        style={{
          margin: "8px 0 0",
          fontSize: 12,
          color: "var(--foreground-muted, #666)",
          lineHeight: 1.4,
        }}
      >
        Daniell galvanic cell: Spontaneous redox reaction Zn(s) + Cu²⁺(aq) → Zn²⁺(aq) + Cu(s) generates electrical potential. As reactant [Cu²⁺] increases relative to product [Zn²⁺], cell EMF increases according to the Nernst equation.
      </figcaption>
    </figure>
  );
}
