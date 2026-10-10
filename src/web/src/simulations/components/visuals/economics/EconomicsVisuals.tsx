"use client";

import type { ModelInstance } from "../../../runtime/contribution";

export const formatCurrency = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v)
    ? `$${v.toFixed(2)}`
    : `$${String(v)}`;

export const formatUnits = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v)
    ? v.toFixed(1)
    : String(v);

/**
 * Visual for Market Equilibrium:
 * Draws Supply & Demand curves intersecting at equilibrium (Q*, P*).
 * Illustrates Consumer Surplus (blue/teal shade), Producer Surplus (amber shade),
 * price control ceiling/floor line if active, and tax wedge.
 */
export function MarketEquilibriumVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const d0 = Number(p.demandIntercept ?? 100);
  const b = Number(p.demandSlope ?? 1.0);
  const s0 = Number(p.supplyIntercept ?? 20);
  const d = Number(p.supplySlope ?? 1.0);
  const priceControl = Number(p.priceControl ?? 0);
  const tax = Number(p.tax ?? 0);

  const eqP = Number(o.equilibriumPrice ?? (d0 * d + s0 * b) / (b + d));
  const eqQ = Number(o.equilibriumQuantity ?? (d0 - s0) / (b + d));
  const actualP = Number(o.actualPrice ?? eqP);
  const actualQ = Number(o.actualQuantity ?? eqQ);

  // Chart bounds in SVG: x from 40 to 360 (width 320), y from 220 down to 30 (height 190)
  const maxQ = Math.max(20, eqQ * 1.8, actualQ * 1.4);
  const maxP = Math.max(50, d0 * 1.15, eqP * 1.5);

  const scaleX = (q: number) => 40 + (Math.max(0, q) / maxQ) * 320;
  const scaleY = (price: number) => 220 - (Math.max(0, price) / maxP) * 190;

  // Demand line endpoints: Q=0 -> d0, P=0 -> d0/b
  const dStart = { x: scaleX(0), y: scaleY(d0) };
  const dEndQ = Math.min(maxQ, d0 / b);
  const dEnd = { x: scaleX(dEndQ), y: scaleY(Math.max(0, d0 - b * dEndQ)) };

  // Supply line endpoints: Q=0 -> s0, Q=maxQ -> s0 + d*maxQ
  const sStart = { x: scaleX(0), y: scaleY(s0) };
  const sEnd = { x: scaleX(maxQ), y: scaleY(s0 + d * maxQ) };

  const eqPoint = { x: scaleX(eqQ), y: scaleY(eqP) };
  const actualPoint = { x: scaleX(actualQ), y: scaleY(actualP) };

  // Consumer Surplus polygon: (0, actualP) -> (actualQ, actualP) -> (actualQ, P_d(actualQ)) -> (0, d0)
  const csPath = `M ${scaleX(0)} ${scaleY(actualP)} L ${actualPoint.x} ${scaleY(actualP)} L ${actualPoint.x} ${scaleY(d0 - b * actualQ)} L ${scaleX(0)} ${dStart.y} Z`;

  // Producer Surplus polygon: (0, s0) -> (actualQ, s0 + d*actualQ) -> (actualQ, actualP) -> (0, actualP)
  const psPath = `M ${scaleX(0)} ${sStart.y} L ${actualPoint.x} ${scaleY(s0 + d * actualQ)} L ${actualPoint.x} ${scaleY(actualP)} L ${scaleX(0)} ${scaleY(actualP)} Z`;

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 420 280"
        role="img"
        aria-label={`Market Equilibrium: Equilibrium price ${formatCurrency(eqP)}, quantity ${formatUnits(eqQ)}`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Supply and Demand Market Equilibrium</title>

        {/* Shaded Surpluses */}
        <path d={csPath} fill="#245bcb" fillOpacity={0.18} />
        <path d={psPath} fill="#d97706" fillOpacity={0.18} />

        {/* Axes */}
        <line x1="40" y1="220" x2="380" y2="220" stroke="currentColor" strokeWidth="2" />
        <line x1="40" y1="20" x2="40" y2="220" stroke="currentColor" strokeWidth="2" />

        {/* Axis Labels */}
        <text x="380" y="240" fontSize="12" fill="currentColor" textAnchor="end">
          Quantity (Q)
        </text>
        <text x="35" y="16" fontSize="12" fill="currentColor" textAnchor="start">
          Price (P)
        </text>

        {/* Demand Curve */}
        <line
          x1={dStart.x}
          y1={dStart.y}
          x2={dEnd.x}
          y2={dEnd.y}
          stroke="#2563eb"
          strokeWidth="3"
        />
        <text x={dEnd.x - 10} y={dEnd.y - 10} fontSize="13" fontWeight="bold" fill="#2563eb">
          Demand (D)
        </text>

        {/* Supply Curve */}
        <line
          x1={sStart.x}
          y1={sStart.y}
          x2={sEnd.x}
          y2={sEnd.y}
          stroke="#dc2626"
          strokeWidth="3"
        />
        <text x={sEnd.x - 15} y={sEnd.y + 16} fontSize="13" fontWeight="bold" fill="#dc2626">
          Supply (S)
        </text>

        {/* Price Control Horizontal Line if active */}
        {priceControl > 0 && (
          <g>
            <line
              x1="40"
              y1={scaleY(priceControl)}
              x2="380"
              y2={scaleY(priceControl)}
              stroke="#9333ea"
              strokeWidth="2"
              strokeDasharray="5,4"
            />
            <text
              x="380"
              y={scaleY(priceControl) - 6}
              fontSize="11"
              fill="#9333ea"
              textAnchor="end"
              fontWeight="bold"
            >
              Control: {formatCurrency(priceControl)} ({priceControl < eqP ? "Ceiling" : "Floor"})
            </text>
          </g>
        )}

        {/* Equilibrium Point dashed reference lines */}
        <line
          x1={eqPoint.x}
          y1={eqPoint.y}
          x2={eqPoint.x}
          y2="220"
          stroke="currentColor"
          strokeDasharray="3,3"
          strokeOpacity={0.6}
        />
        <line
          x1="40"
          y1={eqPoint.y}
          x2={eqPoint.x}
          y2={eqPoint.y}
          stroke="currentColor"
          strokeDasharray="3,3"
          strokeOpacity={0.6}
        />

        {/* Equilibrium Marker */}
        <circle cx={eqPoint.x} cy={eqPoint.y} r="5" fill="#059669" />
        <text
          x={eqPoint.x + 8}
          y={eqPoint.y - 8}
          fontSize="11"
          fontWeight="bold"
          fill="#059669"
        >
          E ({formatUnits(eqQ)}, {formatCurrency(eqP)})
        </text>

        {/* Axis Ticks & Labels */}
        <text x={eqPoint.x} y="235" fontSize="11" textAnchor="middle" fill="currentColor">
          Q*={formatUnits(eqQ)}
        </text>
        <text x="35" y={eqPoint.y + 4} fontSize="11" textAnchor="end" fill="currentColor">
          P*={formatCurrency(eqP)}
        </text>

        {/* Legend / Status Badges */}
        <g transform="translate(60, 260)">
          <rect x="0" y="0" width="12" height="12" fill="#245bcb" fillOpacity={0.4} />
          <text x="18" y="10" fontSize="11" fill="currentColor">
            CS: {formatCurrency(o.consumerSurplus)}
          </text>

          <rect x="130" y="0" width="12" height="12" fill="#d97706" fillOpacity={0.4} />
          <text x="148" y="10" fontSize="11" fill="currentColor">
            PS: {formatCurrency(o.producerSurplus)}
          </text>

          {tax > 0 && (
            <text x="260" y="10" fontSize="11" fill="#7c3aed">
              Tax: {formatCurrency(o.taxRevenue)}
            </text>
          )}
        </g>
      </svg>
      <figcaption className="scene-guidance" style={{ fontSize: 13, color: "var(--foreground-muted, #666)" }}>
        Supply equals Demand at equilibrium. Shaded regions illustrate consumer surplus (blue) and producer surplus (amber).
      </figcaption>
    </figure>
  );
}

/**
 * Visual for Price Elasticity of Demand & Total Revenue Curve:
 * Dual-panel SVG with demand line on top (showing elastic vs inelastic zones)
 * and parabolic Total Revenue TR = P*Q curve below, peaking at unit elasticity Ed = 1.
 */
export function PriceElasticityVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const a = Number(p.chokePrice ?? 100);
  const qMax = Number(p.maxQuantity ?? 100);
  const price = Number(p.currentPrice ?? 50);

  const elasticity = Number(o.elasticity ?? 1.0);
  const currentQ = Number(o.currentQuantity ?? qMax * (1 - price / a));
  const totalRev = Number(o.totalRevenue ?? price * currentQ);
  const regime = String(o.elasticityRegime ?? "unit-elastic");

  const midP = a / 2;
  const maxRev = (a * qMax) / 4;

  // Coordinate scales for Top Chart (Demand Curve: P vs Q)
  // X: 40 to 380, Y: 130 to 20
  const topX = (q: number) => 50 + (Math.max(0, q) / qMax) * 330;
  const topY = (pr: number) => 130 - (Math.max(0, pr) / a) * 110;

  // Bottom Chart (Total Revenue vs Price)
  // X: 50 to 380 (Price 0 to a), Y: 250 down to 170 (Rev 0 to maxRev)
  const botX = (pr: number) => 50 + (Math.max(0, pr) / a) * 330;
  const botY = (rev: number) => 250 - (Math.max(0, rev) / (maxRev * 1.15)) * 75;

  // Sample TR curve points
  const trPathPoints = Array.from({ length: 25 }, (_, i) => {
    const pr = (a * i) / 24;
    const rev = pr * qMax * (1 - pr / a);
    return `${i === 0 ? "M" : "L"} ${botX(pr)} ${botY(rev)}`;
  }).join(" ");

  const curPtTop = { x: topX(currentQ), y: topY(price) };
  const curPtBot = { x: botX(price), y: botY(totalRev) };
  const unitRevPt = { x: botX(midP), y: botY(maxRev) };

  const regimeColor =
    regime === "elastic"
      ? "#2563eb"
      : regime === "inelastic"
        ? "#d97706"
        : "#059669";

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 420 280"
        role="img"
        aria-label={`Price Elasticity: ${regime} with Ed=${elasticity.toFixed(2)}, Revenue=${formatCurrency(totalRev)}`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Price Elasticity of Demand and Total Revenue</title>

        {/* TOP PANEL: Demand Curve & Elasticity Zones */}
        <text x="50" y="16" fontSize="11" fontWeight="bold" fill="currentColor">
          Demand Curve (P vs Q)
        </text>

        {/* Axes */}
        <line x1="50" y1="130" x2="380" y2="130" stroke="currentColor" strokeWidth="1.5" />
        <line x1="50" y1="20" x2="50" y2="130" stroke="currentColor" strokeWidth="1.5" />

        {/* Demand line */}
        <line
          x1={topX(0)}
          y1={topY(a)}
          x2={topX(qMax)}
          y2={topY(0)}
          stroke="#475569"
          strokeWidth="2.5"
        />

        {/* Elastic region highlight (P > midP) */}
        <line
          x1={topX(0)}
          y1={topY(a)}
          x2={topX(qMax / 2)}
          y2={topY(midP)}
          stroke="#2563eb"
          strokeWidth="3.5"
        />
        <text x="100" y="45" fontSize="10" fill="#2563eb" fontWeight="bold">
          Elastic (|Ed| &gt; 1)
        </text>

        {/* Inelastic region highlight (P < midP) */}
        <line
          x1={topX(qMax / 2)}
          y1={topY(midP)}
          x2={topX(qMax)}
          y2={topY(0)}
          stroke="#d97706"
          strokeWidth="3.5"
        />
        <text x="270" y="115" fontSize="10" fill="#d97706" fontWeight="bold">
          Inelastic (|Ed| &lt; 1)
        </text>

        {/* Unit Elastic Point */}
        <circle cx={topX(qMax / 2)} cy={topY(midP)} r="4" fill="#059669" />

        {/* Current Operating Point */}
        <circle cx={curPtTop.x} cy={curPtTop.y} r="6" fill={regimeColor} />
        <text
          x={curPtTop.x + 8}
          y={curPtTop.y - 6}
          fontSize="11"
          fontWeight="bold"
          fill={regimeColor}
        >
          P={formatCurrency(price)}, |Ed|={elasticity.toFixed(2)}
        </text>

        {/* BOTTOM PANEL: Total Revenue Curve */}
        <text x="50" y="165" fontSize="11" fontWeight="bold" fill="currentColor">
          Total Revenue TR = P × Q
        </text>
        <line x1="50" y1="250" x2="380" y2="250" stroke="currentColor" strokeWidth="1.5" />
        <line x1="50" y1="170" x2="50" y2="250" stroke="currentColor" strokeWidth="1.5" />

        {/* TR Parabola */}
        <path d={trPathPoints} fill="none" stroke="#059669" strokeWidth="2.5" />

        {/* Peak Revenue Reference */}
        <circle cx={unitRevPt.x} cy={unitRevPt.y} r="4" fill="#059669" />
        <line
          x1={unitRevPt.x}
          y1={unitRevPt.y}
          x2={unitRevPt.x}
          y2="250"
          stroke="#059669"
          strokeDasharray="2,2"
        />
        <text x={unitRevPt.x} y="262" fontSize="9" textAnchor="middle" fill="#059669">
          P*={formatCurrency(midP)}
        </text>

        {/* Current TR Marker */}
        <circle cx={curPtBot.x} cy={curPtBot.y} r="5" fill={regimeColor} />
        <text
          x={curPtBot.x + 8}
          y={curPtBot.y - 4}
          fontSize="10"
          fontWeight="bold"
          fill={regimeColor}
        >
          TR={formatCurrency(totalRev)}
        </text>
      </svg>
      <figcaption className="scene-guidance" style={{ fontSize: 13, color: "var(--foreground-muted, #666)" }}>
        Demand transitions from elastic (upper line) to inelastic (lower line). Total revenue peaks at unit elasticity (|Ed| = 1).
      </figcaption>
    </figure>
  );
}

/**
 * Visual for Firm Production Costs & Profit Maximization:
 * Plots Marginal Cost (MC), Average Total Cost (ATC), Average Variable Cost (AVC),
 * and market price MR line. Shaded rectangle shows economic profit or loss.
 */
export function CostAndProfitVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const fc = Number(p.fixedCost ?? 50);
  const v = Number(p.linearCost ?? 5);
  const c = Number(p.quadraticCost ?? 0.5);
  const price = Number(p.marketPrice ?? 25);

  const optQ = Number(o.optimalQuantity ?? Math.max(0, (price - v) / (2 * c)));
  const profit = Number(o.economicProfit ?? 0);
  const atc = Number(o.averageTotalCost ?? 0);
  const mc = Number(o.marginalCost ?? 0);

  // SVG dimensions: x 50 to 380 (q: 0 to 35), y 220 down to 25 (cost: 0 to 60)
  const maxQ = Math.max(25, optQ * 1.6);
  const maxCost = Math.max(40, price * 1.5, mc * 1.3);

  const scaleX = (q: number) => 50 + (Math.max(0, q) / maxQ) * 330;
  const scaleY = (cost: number) => 220 - (Math.max(0, cost) / maxCost) * 195;

  // Sample curve paths over q in [1, maxQ]
  const sampleCount = 25;
  const step = (maxQ - 1) / (sampleCount - 1);

  const mcPath = Array.from({ length: sampleCount }, (_, i) => {
    const q = 0.5 + i * step;
    const cost = 2 * c * q + v;
    return `${i === 0 ? "M" : "L"} ${scaleX(q)} ${scaleY(cost)}`;
  }).join(" ");

  const atcPath = Array.from({ length: sampleCount }, (_, i) => {
    const q = 1 + i * step;
    const cost = fc / q + c * q + v;
    return `${i === 0 ? "M" : "L"} ${scaleX(q)} ${scaleY(cost)}`;
  }).join(" ");

  const avcPath = Array.from({ length: sampleCount }, (_, i) => {
    const q = 0.5 + i * step;
    const cost = c * q + v;
    return `${i === 0 ? "M" : "L"} ${scaleX(q)} ${scaleY(cost)}`;
  }).join(" ");

  // Profit box: from q=0 to optQ, between ATC and Price
  const profitBoxY1 = Math.min(scaleY(price), scaleY(atc));
  const profitBoxHeight = Math.abs(scaleY(price) - scaleY(atc));
  const profitBoxWidth = Math.max(0, scaleX(optQ) - scaleX(0));

  const isProfitable = profit >= 0;

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 420 280"
        role="img"
        aria-label={`Firm Costs & Profit: Output q*=${optQ.toFixed(1)}, Profit=${formatCurrency(profit)}`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Firm Production Costs and Profit Maximization</title>

        {/* Profit / Loss Rectangle */}
        {optQ > 0 && profitBoxHeight > 0 && (
          <rect
            x={scaleX(0)}
            y={profitBoxY1}
            width={profitBoxWidth}
            height={profitBoxHeight}
            fill={isProfitable ? "#10b981" : "#ef4444"}
            fillOpacity={0.22}
            stroke={isProfitable ? "#059669" : "#dc2626"}
            strokeDasharray="3,3"
          />
        )}

        {/* Axes */}
        <line x1="50" y1="220" x2="390" y2="220" stroke="currentColor" strokeWidth="2" />
        <line x1="50" y1="20" x2="50" y2="220" stroke="currentColor" strokeWidth="2" />

        <text x="390" y="238" fontSize="11" fill="currentColor" textAnchor="end">
          Quantity (q)
        </text>
        <text x="45" y="16" fontSize="11" fill="currentColor" textAnchor="start">
          Cost / Price ($)
        </text>

        {/* Market Price Line (MR = P) */}
        <line
          x1="50"
          y1={scaleY(price)}
          x2="390"
          y2={scaleY(price)}
          stroke="#2563eb"
          strokeWidth="2.5"
        />
        <text x="390" y={scaleY(price) - 6} fontSize="11" fontWeight="bold" fill="#2563eb" textAnchor="end">
          P = MR = {formatCurrency(price)}
        </text>

        {/* Cost Curves */}
        {/* AVC */}
        <path d={avcPath} fill="none" stroke="#f59e0b" strokeWidth="2" />
        <text x="340" y={scaleY(c * maxQ + v) + 14} fontSize="11" fill="#f59e0b" fontWeight="bold">
          AVC
        </text>

        {/* ATC */}
        <path d={atcPath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
        <text x="340" y={scaleY(fc / maxQ + c * maxQ + v) - 6} fontSize="11" fill="#6366f1" fontWeight="bold">
          ATC
        </text>

        {/* MC */}
        <path d={mcPath} fill="none" stroke="#dc2626" strokeWidth="3" />
        <text x="340" y={scaleY(2 * c * maxQ + v) - 8} fontSize="11" fill="#dc2626" fontWeight="bold">
          MC
        </text>

        {/* Optimal output marker MR = MC */}
        {optQ > 0 && (
          <g>
            <circle cx={scaleX(optQ)} cy={scaleY(price)} r="5" fill="#dc2626" />
            <line
              x1={scaleX(optQ)}
              y1={scaleY(price)}
              x2={scaleX(optQ)}
              y2="220"
              stroke="currentColor"
              strokeDasharray="3,3"
            />
            <text x={scaleX(optQ)} y="235" fontSize="11" textAnchor="middle" fill="currentColor">
              q*={optQ.toFixed(1)}
            </text>
          </g>
        )}

        {/* Legend / Status */}
        <g transform="translate(60, 260)">
          <text x="0" y="10" fontSize="11" fill={isProfitable ? "#059669" : "#dc2626"} fontWeight="bold">
            Profit: {formatCurrency(profit)} {isProfitable ? "(Economic Gain)" : "(Loss)"}
          </text>
          <text x="210" y="10" fontSize="11" fill="currentColor">
            ATC: {formatCurrency(atc)} · MC: {formatCurrency(mc)}
          </text>
        </g>
      </svg>
      <figcaption className="scene-guidance" style={{ fontSize: 13, color: "var(--foreground-muted, #666)" }}>
        Competitive profit is maximized where MR = MC. Shaded box represents economic profit (green) or loss (red).
      </figcaption>
    </figure>
  );
}
