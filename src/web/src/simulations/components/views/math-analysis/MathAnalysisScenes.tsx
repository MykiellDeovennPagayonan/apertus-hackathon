/** biome-ignore-all lint/suspicious/noArrayIndexKey: Fixed trial, score, lattice and partition slots are stateless SVG marks. */
import type { ReactNode } from "react";
import {
  basketAllowed,
  basketCost,
  flowAt,
  type Knot,
} from "../../../domains/math-analysis/models";
import type { ModelInstance } from "../../../runtime/contribution";
import "./math-analysis.css";

type Props = { instance: ModelInstance };
const value = (v: unknown, digits = 2) =>
  v === null || v === undefined
    ? "undefined"
    : typeof v === "number"
      ? Number(v.toFixed(digits)).toString()
      : String(v);
function Scene({
  instance,
  caption,
  children,
}: Props & { caption: string; children: ReactNode }) {
  return (
    <section
      className="math-analysis-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg viewBox="0 0 780 360" role="img" aria-label={caption}>
        {children}
      </svg>
      <p aria-live="polite">{caption}</p>
    </section>
  );
}
function Axis({
  label,
  minimum = 0,
  maximum = 100,
  y = 275,
}: {
  label: string;
  minimum?: number;
  maximum?: number;
  y?: number;
}) {
  return (
    <g>
      <path d={`M60 ${y}H720`} className="ma-axis" />
      <text x="60" y={y + 24}>
        {value(minimum)}
      </text>
      <text x="720" y={y + 24} textAnchor="end">
        {value(maximum)}
      </text>
      <text x="390" y={y + 50} textAnchor="middle">
        {label}
      </text>
    </g>
  );
}
export function HousePricesScene({ instance }: Props) {
  const houses = instance.state.houses as { id: string; value: number }[],
    o = instance.outputs;
  const max = Math.max(200, ...houses.map((p) => p.value)),
    x = (n: number) => 60 + (n / max) * 660;
  const sorted = [...houses].sort((a, b) => a.value - b.value);
  return (
    <Scene
      instance={instance}
      caption={`Mean ${value(o.mean)}, median ${value(o.median)} currency units. Each dot keeps its house identity; the middle ranks determine the median.`}
    >
      <Axis label="Fictional house price (currency units)" maximum={max} />
      {houses.map((h, i) => (
        <g key={h.id}>
          <circle
            cx={x(h.value)}
            cy={120 + (i % 6) * 24}
            r="9"
            className="ma-dot"
          />
          <text x={x(h.value)} y={105 + (i % 6) * 24} textAnchor="middle">
            {h.id.replace("house-", "H")} · {value(h.value)}
          </text>
        </g>
      ))}
      {o.mean !== null && (
        <g>
          <path d={`M${x(Number(o.mean))} 120V275`} className="ma-mean" />
          <text x={x(Number(o.mean))} y="95" textAnchor="middle">
            Mean {value(o.mean)}
          </text>
        </g>
      )}
      {o.median !== null && (
        <g>
          <path d={`M${x(Number(o.median))} 135V275`} className="ma-median" />
          <text x={x(Number(o.median))} y="55" textAnchor="middle">
            Median {value(o.median)}
          </text>
        </g>
      )}
      <text x="390" y="345" textAnchor="middle">
        {sorted.length > 10
          ? `Middle ranks: ${value(sorted[Math.floor((sorted.length - 1) / 2)].value)} · ${value(sorted[Math.floor(sorted.length / 2)].value)}`
          : `Ordered prices: ${sorted.map((h) => value(h.value)).join(" · ") || "No houses — add an observation"}`}
      </text>
    </Scene>
  );
}
export function ScoreSpreadScene({ instance }: Props) {
  const o = instance.outputs,
    s = instance.state,
    x = (v: number) => 60 + v * 6.6;
  return (
    <Scene
      instance={instance}
      caption={`${s.formula} standard deviations: class A ${value(o.firstDeviation)} points; class B ${value(o.secondDeviation)} points. Spread can differ even when means match.`}
    >
      <Axis label="Score (points)" />
      {(["first", "second"] as const).map((key, j) => {
        const mean = o[j ? "secondMean" : "firstMean"];
        return (
          <g key={key}>
            <text x="60" y={55 + j * 115}>
              Class {j ? "B" : "A"} · mean {value(mean)}
            </text>
            {(s[key] as number[]).map((v, i) => (
              <g key={i}>
                <path
                  d={`M${x(Number(mean))} ${85 + j * 115 + (i % 2) * 18}H${x(v)}`}
                  className={j ? "ma-median" : "ma-mean"}
                />
                <circle
                  cx={x(v)}
                  cy={85 + j * 115 + (i % 2) * 18}
                  r="8"
                  className="ma-dot"
                />
              </g>
            ))}
          </g>
        );
      })}
    </Scene>
  );
}
export function SurveySamplingScene({ instance }: Props) {
  const s = instance.state,
    o = instance.outputs,
    p = Number(o.population);
  const counts = new Map<number, number>();
  const estimates = (o.estimates as number[]).map((estimate) => {
    const row = counts.get(estimate) ?? 0;
    counts.set(estimate, row + 1);
    return { estimate, row };
  });
  const gap = Math.min(20, 200 / Math.max(1, ...counts.values()));
  return (
    <Scene
      instance={instance}
      caption={`20 surveys of ${s.sampleSize} people, with replacement. Population ${value(p * 100)}% A; ${s.selection} selection uses ${value(Number(o.selectedProbability) * 100)}%. Random-sampling standard error ${value(Number(o.standardError) * 100)} percentage points.`}
    >
      <Axis label="Each survey's percentage choosing A" />
      <path d={`M${60 + p * 660} 60V275`} className="ma-mean" />
      <text x={60 + p * 660} y="40" textAnchor="middle">
        Population {value(p * 100)}%
      </text>
      {estimates.map(({ estimate, row }) => (
        <circle
          key={`${estimate}/${row}`}
          cx={60 + estimate * 660}
          cy={250 - row * gap}
          r={Math.min(7, gap / 2 - 1)}
          className="ma-dot"
        />
      ))}
      {s.selection === "biased" && (
        <text x="390" y="75" textAnchor="middle">
          More responses reduce variation, not selection bias
        </text>
      )}
    </Scene>
  );
}
export function StudyRegressionScene({ instance }: Props) {
  const s = instance.state,
    o = instance.outputs,
    points = s.students as { id: string; x: number; y: number }[];
  const maxX = Math.max(6, ...points.map((p) => p.x)),
    x = (v: number) => 70 + (v / maxX) * 630,
    y = (v: number) => 285 - v * 2.2;
  return (
    <Scene
      instance={instance}
      caption={
        o.slope === null
          ? "No unique fitted slope: add observations with different study hours."
          : `Fitted slope ${value(o.slope)} points/hour. Residuals join observations to predictions. Association does not prove causation${o.extrapolation ? "; selected prediction is extrapolation" : ""}.`
      }
    >
      <Axis label="Study hours (hours)" maximum={maxX} y={285} />
      <path d="M70 55V285" className="ma-axis" />
      <text x="70" y="35">
        Exam score (points), 0–100
      </text>
      {o.slope !== null && (
        <path
          d={`M${x(0)} ${y(Number(o.intercept))}L${x(maxX)} ${y(Number(o.intercept) + Number(o.slope) * maxX)}`}
          className="ma-mean"
        />
      )}
      {points.map((p) => (
        <g key={p.id}>
          {o.slope !== null && (
            <path
              d={`M${x(p.x)} ${y(p.y)}V${y(Number(o.intercept) + Number(o.slope) * p.x)}`}
              className="ma-median"
            />
          )}
          <circle cx={x(p.x)} cy={y(p.y)} r="8" className="ma-dot" />
          <text x={x(p.x)} y={y(p.y) - 15} textAnchor="middle">
            {p.id}
          </text>
        </g>
      ))}
    </Scene>
  );
}
export function FeasibleChoicesScene({ instance }: Props) {
  const s = instance.state,
    o = instance.outputs,
    maxN = Math.max(1, Number(s.notebookStock), Number(s.notebooks)),
    maxP = Math.max(1, Number(s.penStock), Number(s.pens)),
    x = (n: number) => 95 + (n / maxN) * 590,
    y = (p: number) => 275 - (p / maxP) * 205;
  const pennies = Math.round(Number(s.budget) * 100),
    a = Math.round(Number(s.notebookPrice) * 100),
    b = Math.round(Number(s.penPrice) * 100);
  const region: number[][] = [];
  const minN = Number(s.minimumNotebooks),
    minP = Number(s.minimumPens);
  if (minN <= maxN && minP <= maxP && basketAllowed(s, minN, minP)) {
    region.push(
      [minN, minP],
      [Math.min(Number(s.notebookStock), (pennies - b * minP) / a), minP],
    );
    if (pennies >= a * Number(s.notebookStock) + b * minP)
      region.push([
        Number(s.notebookStock),
        Math.min(
          Number(s.penStock),
          (pennies - a * Number(s.notebookStock)) / b,
        ),
      ]);
    if (pennies >= a * minN + b * Number(s.penStock))
      region.push([
        Math.min(
          Number(s.notebookStock),
          (pennies - b * Number(s.penStock)) / a,
        ),
        Number(s.penStock),
      ]);
    region.push([minN, Math.min(Number(s.penStock), (pennies - a * minN) / b)]);
  }
  return (
    <Scene
      instance={instance}
      caption={`${o.choices} affordable whole-item baskets. Selected: ${s.notebooks} notebooks + ${s.pens} pens, cost ${value(o.cost)} of budget ${value(s.budget)}; ${o.affordable ? `${value(o.remaining)} currency units left` : o.exclusion}.`}
    >
      <path d="M95 60V275H710" className="ma-axis" />
      <text x="390" y="325" textAnchor="middle">
        Notebooks, 0–{maxN}
      </text>
      <text x="95" y="35">
        Pens, 0–{maxP}
      </text>
      {region.length > 0 && (
        <polygon
          points={region.map(([n, p]) => `${x(n)},${y(p)}`).join(" ")}
          className="ma-region"
        />
      )}
      {Array.from({ length: Number(s.notebookStock) + 1 }, (_, n) =>
        Array.from({ length: Number(s.penStock) + 1 }, (_, p) => (
          <circle
            key={`${n}/${p}`}
            cx={x(n)}
            cy={y(p)}
            r="5"
            className={basketAllowed(s, n, p) ? "ma-dot" : "ma-excluded"}
          >
            <title>{`${n} notebooks, ${p} pens; ${value(basketCost(s, n, p) / 100)} currency units`}</title>
          </circle>
        )),
      )}
      <circle
        cx={x(Number(s.notebooks))}
        cy={y(Number(s.pens))}
        r="11"
        className="ma-selected"
      />
    </Scene>
  );
}
export function ConditionalBagsScene({ instance }: Props) {
  const o = instance.outputs,
    s = instance.state,
    revealed = Boolean(s.revealed),
    a = Number(o.blueFromA),
    b = Number(o.blueFromB);
  return (
    <Scene
      instance={instance}
      caption={
        revealed
          ? o.posterior === null
            ? "Blue is impossible; the probability of the first bag given blue is undefined."
            : `Given blue, first bag probability is ${value(Number(o.posterior) * 100)}%, compared with prior ${value(Number(o.prior) * 100)}%.`
          : "The origin is hidden. Reveal blue to narrow the reference group to blue outcomes."
      }
    >
      <text x="160" y="45" textAnchor="middle">
        First bag: {s.blueA as number} blue, {s.redA as number} red
      </text>
      <text x="595" y="45" textAnchor="middle">
        Second bag: {s.blueB as number} blue, {s.redB as number} red
      </text>
      <path d="M390 95L160 170M390 95L595 170" className="ma-axis" />
      <text x="390" y="85" textAnchor="middle">
        Hidden origin
      </text>
      <path
        d="M160 170L100 240M160 170L235 240M595 170L515 240M595 170L680 240"
        className="ma-axis"
      />
      {[
        [100, a, "A blue"],
        [235, Number(s.prior) - a, "A red"],
        [515, b, "B blue"],
        [680, 1 - Number(s.prior) - b, "B red"],
      ].map(([px, p, label]) => (
        <g
          key={String(label)}
          opacity={revealed && String(label).includes("red") ? 0.25 : 1}
        >
          <circle
            cx={Number(px)}
            cy="245"
            r={Math.sqrt(Number(p)) * 45}
            className={String(label).includes("blue") ? "ma-dot" : "ma-red"}
          />
          <text x={Number(px)} y="310" textAnchor="middle">
            {label} · {value(Number(p) * 100)}%
          </text>
        </g>
      ))}
    </Scene>
  );
}
function gallery(n: number, k: number, ordered: boolean) {
  const results: number[][] = [];
  const visit = (prefix: number[]) => {
    if (results.length >= 12) return;
    if (prefix.length === k) {
      results.push(prefix);
      return;
    }
    for (let i = ordered ? 1 : (prefix.at(-1) ?? 0) + 1; i <= n; i++) {
      if (!prefix.includes(i)) visit([...prefix, i]);
      if (results.length >= 12) break;
    }
  };
  visit([]);
  return results;
}
export function TeamsAndPodiumsScene({ instance }: Props) {
  const s = instance.state,
    o = instance.outputs,
    ordered = s.mode === "podium",
    examples = gallery(Number(s.people), Number(s.selected), ordered);
  return (
    <Scene
      instance={instance}
      caption={`${s.people} distinct people, choose ${s.selected}: ${o.teams} teams or ${o.ordered} podium orders. Each team has ${o.ordersPerTeam} orders. Showing up to 12 examples (first five people in large selections), no repeated people.`}
    >
      <text x="390" y="45" textAnchor="middle">
        {ordered
          ? "Swapping positions creates a new podium"
          : "Swapping members keeps the same team"}
      </text>
      {examples.map((members, i) => (
        <g key={members.join("/")}>
          <rect
            x={45 + (i % 3) * 245}
            y={70 + Math.floor(i / 3) * 65}
            width="225"
            height="48"
            rx="8"
            className="ma-region"
          />
          <text
            x={157 + (i % 3) * 245}
            y={101 + Math.floor(i / 3) * 65}
            textAnchor="middle"
          >
            {members.length
              ? members
                  .slice(0, 5)
                  .map((v) => `P${v}`)
                  .join(ordered ? " → " : " · ") +
                (members.length > 5 ? " …" : "")
              : "Empty selection"}
          </text>
        </g>
      ))}
    </Scene>
  );
}
export function LoanPaymentsScene({ instance }: Props) {
  const s = instance.state,
    o = instance.outputs,
    p = Number(s.principal),
    n = Number(s.months),
    timeline = o.timeline as {
      month: number;
      balance: number;
      baseline: number;
    }[];
  const path = (key: "balance" | "baseline") =>
    timeline
      .map(
        (r, i) =>
          `${i ? "L" : "M"}${65 + (r.month / n) * 475} ${225 - (r[key] / p) * 160}`,
      )
      .join(" ");
  return (
    <Scene
      instance={instance}
      caption={`Month ${s.month}: payment ${value(o.paid)} = interest ${value(o.interest)} + principal ${value(o.capital)} currency units. Payoff ${o.payoffMonth} months versus baseline ${o.baselinePayoff}; total interest ${value(o.totalInterest)} versus ${value(o.baselineInterest)}.`}
    >
      <path d="M65 45V225H550" className="ma-axis" />
      <text x="65" y="30">
        Remaining balance (currency units)
      </text>
      <path d={path("baseline")} className="ma-median" />
      <path d={path("balance")} className="ma-mean" />
      <text x="300" y="265" textAnchor="middle">
        Time: 0–{n} months
      </text>
      <text x="85" y="305" className="ma-blue-text">
        Blue: extra payments
      </text>
      <text x="345" y="305" className="ma-orange-text">
        Dashed: baseline
      </text>
      <text x="625" y="55" textAnchor="middle">
        This payment
      </text>
      {Number(o.paid) > 0 && (
        <g>
          <rect
            x="585"
            y="80"
            width="80"
            height={(180 * Number(o.capital)) / Number(o.paid)}
            className="ma-dot"
          />
          <rect
            x="585"
            y={80 + (180 * Number(o.capital)) / Number(o.paid)}
            width="80"
            height={(180 * Number(o.interest)) / Number(o.paid)}
            className="ma-red"
          />
        </g>
      )}
      <text x="625" y="285" textAnchor="middle">
        Principal {value(o.capital)}
      </text>
      <text x="625" y="315" textAnchor="middle">
        Interest {value(o.interest)}
      </text>
    </Scene>
  );
}
export function InstantaneousVelocityScene({ instance }: Props) {
  const s = instance.state,
    o = instance.outputs,
    t = Number(s.time),
    h = Number(s.increment),
    offset = s.preset === "reversing" ? 5 : 0,
    x = (n: number) => 70 + n * 62,
    y = (n: number) => 270 - n * 2;
  const curve = Array.from(
    { length: 51 },
    (_, i) => `${i ? "L" : "M"}${x(i / 5)} ${y((i / 5 - offset) ** 2)}`,
  ).join(" ");
  const line = (slope: number) =>
    `M${x(Math.max(0, t - 1))} ${y(Number(o.position) + slope * (Math.max(0, t - 1) - t))}L${x(Math.min(10, t + 2))} ${y(Number(o.position) + slope * (Math.min(10, t + 2) - t))}`;
  return (
    <Scene
      instance={instance}
      caption={`At ${value(t)} s, exact instantaneous velocity ${value(o.velocity)} m/s; average over h=${value(h, 4)} s is ${value(o.averageVelocity, 4)} m/s. Speed is ${value(o.speed)} m/s.`}
    >
      <Axis label="Time (s)" maximum={10} y={270} />
      <text x="65" y="30">
        Position (m)
      </text>
      <path d="M70 45V270" className="ma-axis" />
      <path d={curve} className="ma-curve" />
      <path d={line(Number(o.averageVelocity))} className="ma-median" />
      <path d={line(Number(o.velocity))} className="ma-mean" />
      <circle cx={x(t)} cy={y(Number(o.position))} r="7" className="ma-dot" />
      <circle
        cx={x(t + h)}
        cy={y(Number(o.nextPosition))}
        r="7"
        className="ma-red"
      />
      <text x="240" y="345">
        Blue tangent · dashed secant
      </text>
    </Scene>
  );
}
export function AccumulatedWaterScene({ instance }: Props) {
  const s = instance.state,
    o = instance.outputs,
    knots = s.knots as Knot[],
    a = Number(s.start),
    b = Number(s.end),
    n = Number(s.partitions),
    dx = (b - a) / n,
    max = Math.max(1, ...knots.map((p) => p.rate)),
    x = (v: number) => 60 + ((v - a) / (b - a)) * 470,
    y = (v: number) => 260 - (v / max) * 180;
  const shift = s.rule === "left" ? 0 : s.rule === "right" ? 1 : 0.5;
  const curve = Array.from(
    { length: 61 },
    (_, i) =>
      `${i ? "L" : "M"}${x(a + ((b - a) * i) / 60)} ${y(flowAt(knots, a + ((b - a) * i) / 60))}`,
  ).join(" ");
  return (
    <Scene
      instance={instance}
      caption={`${s.rule} rectangles (${n}) estimate ${value(o.estimate)} L; exact inflow ${value(o.exact)} L. The tank contains ${value(o.tank)} L including ${value(s.initial)} L initially.`}
    >
      <text x="60" y="30">
        Flow rate (L/min), 0–{value(max)}
      </text>
      <path d="M60 55V260H530" className="ma-axis" />
      {Array.from({ length: n }, (_, i) => {
        const height = (flowAt(knots, a + (i + shift) * dx) / max) * 180;
        return (
          <rect
            key={i}
            x={x(a + i * dx)}
            y={260 - height}
            width={470 / n}
            height={height}
            className="ma-region"
          />
        );
      })}
      <path d={curve} className="ma-mean" />
      <text x="295" y="305" textAnchor="middle">
        Time {value(a)}–{value(b)} min
      </text>
      <rect x="600" y="65" width="120" height="195" className="ma-tank" />
      <rect
        x="602"
        y={258 - (191 * Number(o.tank)) / Number(s.capacity)}
        width="116"
        height={(191 * Number(o.tank)) / Number(s.capacity)}
        className="ma-water"
      />
      <text x="660" y="305" textAnchor="middle">
        {value(o.tank)} / {value(s.capacity)} L
      </text>
    </Scene>
  );
}
export const mathAnalysisAppearances = {
  "math-analysis-house-prices": HousePricesScene,
  "math-analysis-score-spread": ScoreSpreadScene,
  "math-analysis-survey-sampling": SurveySamplingScene,
  "math-analysis-study-regression": StudyRegressionScene,
  "math-analysis-feasible-choices": FeasibleChoicesScene,
  "math-analysis-conditional-bags": ConditionalBagsScene,
  "math-analysis-teams-and-podiums": TeamsAndPodiumsScene,
  "math-analysis-loan-payments": LoanPaymentsScene,
  "math-analysis-instantaneous-velocity": InstantaneousVelocityScene,
  "math-analysis-accumulated-water": AccumulatedWaterScene,
};
