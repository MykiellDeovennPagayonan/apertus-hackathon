"use client";

import type { ModelInstance } from "../../../../registry/contracts/domainContribution";

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
 * Illustrates Consumer Surplus (blue shade), Producer Surplus (amber shade),
 * Tax Revenue (purple shade), Deadweight Loss (red dashed triangle),
 * and active price controls (ceiling or floor).
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
  const cs = Number(o.consumerSurplus ?? 0);
  const ps = Number(o.producerSurplus ?? 0);
  const taxRevenue = Number(o.taxRevenue ?? 0);
  const dwl = Number(o.deadweightLoss ?? 0);

  // SVG viewBox: 460 x 260
  // Chart bounds: x from 70 to 400 (width 330), y from 205 down to 25 (height 180)
  const maxQ = Math.max(20, eqQ * 1.7, actualQ * 1.4);
  const maxP = Math.max(50, d0 * 1.15, eqP * 1.4);

  const scaleX = (q: number) => 70 + (Math.max(0, q) / maxQ) * 330;
  const scaleY = (price: number) => 205 - (Math.max(0, price) / maxP) * 180;

  // Demand line endpoints: Q=0 -> d0, P=0 -> d0/b
  const dStart = { x: scaleX(0), y: scaleY(d0) };
  const dEndQ = Math.min(maxQ, d0 / Math.max(1e-6, b));
  const dEnd = { x: scaleX(dEndQ), y: scaleY(Math.max(0, d0 - b * dEndQ)) };

  // Supply line endpoints: Q=0 -> s0, Q=maxQ -> s0 + d*maxQ
  const sStart = { x: scaleX(0), y: scaleY(s0) };
  const sEnd = { x: scaleX(maxQ), y: scaleY(s0 + d * maxQ) };

  const eqPoint = { x: scaleX(eqQ), y: scaleY(eqP) };

  // Transaction prices for buyers and sellers
  const effectiveBuyerP = priceControl > 0 ? actualP : (eqQ > 0 ? d0 - b * actualQ : d0);
  const effectiveSellerP = priceControl > 0 ? Math.max(0, actualP - tax) : (eqQ > 0 ? s0 + d * actualQ : s0);

  // Shaded surplus polygons (exact trapezoids)
  const csPath = actualQ > 0
    ? `M ${scaleX(0)} ${scaleY(effectiveBuyerP)} L ${scaleX(actualQ)} ${scaleY(effectiveBuyerP)} L ${scaleX(actualQ)} ${scaleY(d0 - b * actualQ)} L ${scaleX(0)} ${dStart.y} Z`
    : "";

  const psPath = actualQ > 0
    ? `M ${scaleX(0)} ${sStart.y} L ${scaleX(actualQ)} ${scaleY(s0 + d * actualQ)} L ${scaleX(actualQ)} ${scaleY(effectiveSellerP)} L ${scaleX(0)} ${scaleY(effectiveSellerP)} Z`
    : "";

  // Tax wedge revenue rectangle
  const taxPath = tax > 0 && actualQ > 0
    ? `M ${scaleX(0)} ${scaleY(effectiveSellerP)} L ${scaleX(actualQ)} ${scaleY(effectiveSellerP)} L ${scaleX(actualQ)} ${scaleY(effectiveBuyerP)} L ${scaleX(0)} ${scaleY(effectiveBuyerP)} Z`
    : "";

  // Deadweight loss triangle (if distorted volume is below free market volume)
  const freeQ = Math.max(0, (d0 - s0) / Math.max(1e-6, b + d));
  const dwlPath = (dwl > 0.5 && actualQ < freeQ)
    ? `M ${scaleX(actualQ)} ${scaleY(d0 - b * actualQ)} L ${scaleX(freeQ)} ${scaleY(eqP)} L ${scaleX(actualQ)} ${scaleY(s0 + d * actualQ)} Z`
    : "";

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 460 260"
        role="img"
        aria-label={`Market Equilibrium: Equilibrium price ${formatCurrency(eqP)}, quantity ${formatUnits(eqQ)}`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Supply and Demand Market Equilibrium</title>

        {/* Shaded Surpluses */}
        {csPath && <path d={csPath} fill="#245bcb" fillOpacity={0.18} />}
        {psPath && <path d={psPath} fill="#d97706" fillOpacity={0.18} />}
        {taxPath && <path d={taxPath} fill="#8b5cf6" fillOpacity={0.22} stroke="#8b5cf6" strokeWidth="1" strokeDasharray="3,2" />}
        {dwlPath && <path d={dwlPath} fill="#ef4444" fillOpacity={0.22} stroke="#dc2626" strokeWidth="1.2" strokeDasharray="3,3" />}

        {/* Axes */}
        <line x1="70" y1="205" x2="410" y2="205" stroke="currentColor" strokeWidth="2" />
        <line x1="70" y1="20" x2="70" y2="205" stroke="currentColor" strokeWidth="2" />

        {/* Axis Titles */}
        <text x="74" y="16" fontSize="10.5" fill="currentColor" textAnchor="start" fontWeight="bold">
          Price ($)
        </text>
        <text x="410" y="222" fontSize="10.5" fill="currentColor" textAnchor="end" fontWeight="bold">
          Quantity (Units)
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
        <text
          x={Math.min(400, dEnd.x - 8)}
          y={Math.max(35, dEnd.y - 8)}
          fontSize="11.5"
          fontWeight="bold"
          fill="#2563eb"
          textAnchor="end"
        >
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
        <text
          x={Math.min(405, sEnd.x)}
          y={Math.min(200, sEnd.y + 16)}
          fontSize="11.5"
          fontWeight="bold"
          fill="#dc2626"
          textAnchor="end"
        >
          Supply (S)
        </text>

        {/* Price Control Horizontal Line if active */}
        {priceControl > 0 && (
          <g>
            <line
              x1="70"
              y1={scaleY(priceControl)}
              x2="400"
              y2={scaleY(priceControl)}
              stroke="#9333ea"
              strokeWidth="2"
              strokeDasharray="5,4"
            />
            <rect
              x="225"
              y={Math.max(22, scaleY(priceControl) - 17)}
              width="165"
              height="16"
              rx="3"
              fill="var(--panel, #ffffff)"
              fillOpacity={0.95}
              stroke="#9333ea"
              strokeWidth="1"
            />
            <text
              x="307"
              y={Math.max(34, scaleY(priceControl) - 5)}
              fontSize="9.5"
              fill="#9333ea"
              textAnchor="middle"
              fontWeight="bold"
            >
              Control: {formatCurrency(priceControl)} ({priceControl < eqP ? "Ceiling" : "Floor"})
            </text>
            <text
              x="64"
              y={scaleY(priceControl) + 4}
              fontSize="9.5"
              fill="#9333ea"
              textAnchor="end"
              fontWeight="bold"
            >
              P_c={formatCurrency(priceControl)}
            </text>
          </g>
        )}

        {/* Equilibrium Point dashed reference lines */}
        <line
          x1={eqPoint.x}
          y1={eqPoint.y}
          x2={eqPoint.x}
          y2="205"
          stroke="currentColor"
          strokeDasharray="3,3"
          strokeOpacity={0.6}
        />
        <line
          x1="70"
          y1={eqPoint.y}
          x2={eqPoint.x}
          y2={eqPoint.y}
          stroke="currentColor"
          strokeDasharray="3,3"
          strokeOpacity={0.6}
        />

        {/* Equilibrium Marker */}
        <circle cx={eqPoint.x} cy={eqPoint.y} r="5" fill="#059669" />
        {(() => {
          const eqBadgeW = 108;
          const eqBadgeH = 18;
          const isEqRight = eqPoint.x + eqBadgeW + 12 <= 405;
          const eqBadgeX = isEqRight ? eqPoint.x + 8 : eqPoint.x - eqBadgeW - 8;
          const eqBadgeY = Math.max(25, Math.min(185, eqPoint.y - 9));
          return (
            <g>
              <rect
                x={eqBadgeX}
                y={eqBadgeY}
                width={eqBadgeW}
                height={eqBadgeH}
                rx="4"
                fill="var(--panel, #ffffff)"
                fillOpacity={0.96}
                stroke="#059669"
                strokeWidth="1.2"
              />
              <text
                x={eqBadgeX + eqBadgeW / 2}
                y={eqBadgeY + 12.5}
                fontSize="9.5"
                fontWeight="bold"
                fill="#059669"
                textAnchor="middle"
              >
                E ({formatUnits(eqQ)}, {formatCurrency(eqP)})
              </text>
            </g>
          );
        })()}

        {/* Axis Ticks & Labels with generous left margin */}
        <text x={eqPoint.x} y="220" fontSize="10.5" textAnchor="middle" fill="currentColor">
          Q*={formatUnits(eqQ)}
        </text>
        <text x="64" y={eqPoint.y + 4} fontSize="10" textAnchor="end" fill="currentColor">
          P*={formatCurrency(eqP)}
        </text>

        {/* Bottom Legend / Status Badges */}
        <g transform="translate(70, 244)">
          <rect x="0" y="-8" width="10" height="10" rx="2" fill="#245bcb" fillOpacity={0.4} />
          <text x="14" y="0" fontSize="10" fill="currentColor">
            CS: {formatCurrency(cs)}
          </text>

          <rect x="100" y="-8" width="10" height="10" rx="2" fill="#d97706" fillOpacity={0.4} />
          <text x="114" y="0" fontSize="10" fill="currentColor">
            PS: {formatCurrency(ps)}
          </text>

          {tax > 0 && (
            <g transform="translate(200, 0)">
              <rect x="0" y="-8" width="10" height="10" rx="2" fill="#8b5cf6" fillOpacity={0.4} />
              <text x="14" y="0" fontSize="10" fill="#7c3aed">
                Tax: {formatCurrency(taxRevenue)}
              </text>
            </g>
          )}

          {dwl > 0.5 && (
            <g transform={`translate(${tax > 0 ? 295 : 200}, 0)`}>
              <rect x="0" y="-8" width="10" height="10" rx="2" fill="#ef4444" fillOpacity={0.4} />
              <text x="14" y="0" fontSize="10" fill="#dc2626">
                DWL: {formatCurrency(dwl)}
              </text>
            </g>
          )}
        </g>
      </svg>
      <figcaption className="scene-caption" style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--foreground-muted, #666)", lineHeight: 1.3 }}>
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
  const currentQ = Number(o.currentQuantity ?? Math.max(0, qMax * (1 - price / a)));
  const totalRev = Number(o.totalRevenue ?? price * currentQ);
  const regime = String(o.elasticityRegime ?? "unit-elastic");

  const midP = a / 2;
  const maxRev = (a * qMax) / 4;

  // Coordinate scales for Top Chart (Demand Curve: P vs Q)
  // X: 70 to 400 (width 330), Y: 118 down to 22 (height 96)
  const topX = (q: number) => 70 + (Math.max(0, q) / qMax) * 330;
  const topY = (pr: number) => 118 - (Math.max(0, pr) / a) * 96;

  // Coordinate scales for Bottom Chart (Total Revenue vs Price)
  // X: 70 to 400 (Price 0 to a), Y: 240 down to 165 (Rev 0 to maxRev)
  const botX = (pr: number) => 70 + (Math.max(0, pr) / a) * 330;
  const botY = (rev: number) => 240 - (Math.max(0, rev) / (maxRev * 1.15)) * 72;

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
        viewBox="0 0 460 260"
        role="img"
        aria-label={`Price Elasticity: ${regime} with Ed=${elasticity.toFixed(2)}, Revenue=${formatCurrency(totalRev)}`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Price Elasticity of Demand and Total Revenue</title>

        {/* TOP PANEL: Demand Curve & Elasticity Zones */}
        <text x="70" y="16" fontSize="10.5" fontWeight="bold" fill="currentColor">
          Demand Curve (P vs Q)
        </text>
        <g transform="translate(215, 16)">
          <line x1="0" y1="-3.5" x2="14" y2="-3.5" stroke="#2563eb" strokeWidth="3" strokeLinecap="round" />
          <text x="18" y="0" fontSize="9" fill="#2563eb" fontWeight="bold">
            Elastic (|Ed| &gt; 1)
          </text>
          <line x1="100" y1="-3.5" x2="114" y2="-3.5" stroke="#d97706" strokeWidth="3" strokeLinecap="round" />
          <text x="118" y="0" fontSize="9" fill="#d97706" fontWeight="bold">
            Inelastic (|Ed| &lt; 1)
          </text>
        </g>

        {/* Axes */}
        <line x1="70" y1="118" x2="405" y2="118" stroke="currentColor" strokeWidth="1.5" />
        <line x1="70" y1="22" x2="70" y2="118" stroke="currentColor" strokeWidth="1.5" />
        <text x="74" y="24" fontSize="9.5" fill="currentColor" textAnchor="start" fontWeight="bold">
          Price ($)
        </text>
        <text x="405" y="130" fontSize="9.5" fill="currentColor" textAnchor="end" fontWeight="bold">
          Quantity (Units)
        </text>

        {/* Demand line */}
        <line
          x1={topX(0)}
          y1={topY(a)}
          x2={topX(qMax)}
          y2={topY(0)}
          stroke="#475569"
          strokeWidth="2"
        />

        {/* Elastic region highlight (P > midP) */}
        <line
          x1={topX(0)}
          y1={topY(a)}
          x2={topX(qMax / 2)}
          y2={topY(midP)}
          stroke="#2563eb"
          strokeWidth="3.2"
        />

        {/* Inelastic region highlight (P < midP) */}
        <line
          x1={topX(qMax / 2)}
          y1={topY(midP)}
          x2={topX(qMax)}
          y2={topY(0)}
          stroke="#d97706"
          strokeWidth="3.2"
        />

        {/* Unit Elastic Point */}
        <circle cx={topX(qMax / 2)} cy={topY(midP)} r="4" fill="#059669" />
        {Math.abs(elasticity - 1) >= 0.18 && (
          <text
            x={topX(qMax / 2)}
            y={topY(midP) + 14}
            fontSize="8.5"
            fill="#059669"
            fontWeight="600"
            textAnchor="middle"
          >
            Unit Elastic (|Ed|=1)
          </text>
        )}

        {/* Current Operating Point */}
        <circle cx={curPtTop.x} cy={curPtTop.y} r="5.5" fill={regimeColor} />
        {(() => {
          const topBadgeW = 132;
          const topBadgeH = 18;
          const isTopRight = curPtTop.x + topBadgeW + 10 <= 405;
          const topBadgeX = isTopRight ? curPtTop.x + 8 : curPtTop.x - topBadgeW - 8;
          const topBadgeY = Math.max(22, Math.min(98, curPtTop.y - 9));
          return (
            <g>
              <rect
                x={topBadgeX}
                y={topBadgeY}
                width={topBadgeW}
                height={topBadgeH}
                rx="4"
                fill="var(--panel, #ffffff)"
                fillOpacity={0.96}
                stroke={regimeColor}
                strokeWidth="1.2"
              />
              <text
                x={topBadgeX + topBadgeW / 2}
                y={topBadgeY + 12.5}
                fontSize="9.5"
                fontWeight="bold"
                fill={regimeColor}
                textAnchor="middle"
              >
                P={formatCurrency(price)}, |Ed|={elasticity >= 999 ? "∞" : elasticity.toFixed(2)}
              </text>
            </g>
          );
        })()}

        {/* BOTTOM PANEL: Total Revenue Curve */}
        <text x="70" y="156" fontSize="10.5" fontWeight="bold" fill="currentColor">
          Total Revenue TR = P × Q
        </text>
        <line x1="70" y1="240" x2="405" y2="240" stroke="currentColor" strokeWidth="1.5" />
        <line x1="70" y1="160" x2="70" y2="240" stroke="currentColor" strokeWidth="1.5" />
        <text x="74" y="165" fontSize="9.5" fill="currentColor" textAnchor="start" fontWeight="bold">
          Revenue ($)
        </text>
        <text x="405" y="252" fontSize="9.5" fill="currentColor" textAnchor="end" fontWeight="bold">
          Price ($)
        </text>

        {/* TR Parabola */}
        <path d={trPathPoints} fill="none" stroke="#059669" strokeWidth="2.5" />

        {/* Peak Revenue Reference */}
        <circle cx={unitRevPt.x} cy={unitRevPt.y} r="4" fill="#059669" />
        <line
          x1={unitRevPt.x}
          y1={unitRevPt.y}
          x2={unitRevPt.x}
          y2="240"
          stroke="#059669"
          strokeDasharray="2,2"
        />
        <text x={unitRevPt.x} y="252" fontSize="9" textAnchor="middle" fill="#059669">
          P*={formatCurrency(midP)}
        </text>

        {/* Current TR Marker */}
        <circle cx={curPtBot.x} cy={curPtBot.y} r="5" fill={regimeColor} />
        {(() => {
          const botBadgeW = 100;
          const botBadgeH = 17;
          const isBotRight = curPtBot.x + botBadgeW + 10 <= 405;
          const botBadgeX = isBotRight ? curPtBot.x + 8 : curPtBot.x - botBadgeW - 8;
          const botBadgeY = Math.max(164, Math.min(222, curPtBot.y - 8.5));
          return (
            <g>
              <rect
                x={botBadgeX}
                y={botBadgeY}
                width={botBadgeW}
                height={botBadgeH}
                rx="4"
                fill="var(--panel, #ffffff)"
                fillOpacity={0.96}
                stroke={regimeColor}
                strokeWidth="1.2"
              />
              <text
                x={botBadgeX + botBadgeW / 2}
                y={botBadgeY + 12}
                fontSize="9"
                fontWeight="bold"
                fill={regimeColor}
                textAnchor="middle"
              >
                TR={formatCurrency(totalRev)}
              </text>
            </g>
          );
        })()}
      </svg>
      <figcaption className="scene-caption" style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--foreground-muted, #666)", lineHeight: 1.3 }}>
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
  const shutdownP = Number(o.shutdownPrice ?? v);
  const breakEvenP = Number(o.breakEvenPrice ?? v + 2 * Math.sqrt(Math.max(0, c * fc)));

  // SVG dimensions: x 70 to 405 (width 335), y 205 down to 25 (height 180)
  const maxQ = Math.max(25, optQ * 1.6);
  const maxCost = Math.max(40, price * 1.4, mc * 1.25, breakEvenP * 1.2);

  const scaleX = (q: number) => 70 + (Math.max(0, q) / maxQ) * 335;
  const scaleY = (cost: number) => 205 - (Math.max(0, cost) / maxCost) * 180;

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
  const isShutdown = optQ === 0;

  // Price badge positioned away from optQ marker and curve badges
  const optX = optQ > 0 ? scaleX(optQ) : 0;
  const priceBadgeX = optQ > 0 && optX < 210 ? 250 : 130;

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 460 260"
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
            fillOpacity={0.2}
            stroke={isProfitable ? "#059669" : "#dc2626"}
            strokeDasharray="3,3"
          />
        )}

        {/* Axes */}
        <line x1="70" y1="205" x2="410" y2="205" stroke="currentColor" strokeWidth="2" />
        <line x1="70" y1="20" x2="70" y2="205" stroke="currentColor" strokeWidth="2" />

        <text x="410" y="222" fontSize="10.5" fill="currentColor" textAnchor="end" fontWeight="bold">
          Quantity (Units)
        </text>
        <text x="74" y="16" fontSize="10.5" fill="currentColor" textAnchor="start" fontWeight="bold">
          Dollars ($)
        </text>

        {/* Break-even & Shutdown reference marks on Y axis */}
        <line x1="66" y1={scaleY(breakEvenP)} x2="70" y2={scaleY(breakEvenP)} stroke="#6366f1" strokeWidth="1.5" />
        <text x="64" y={scaleY(breakEvenP) + 3.5} fontSize="8.5" textAnchor="end" fill="#6366f1" fontWeight="bold">
          P_be={formatCurrency(breakEvenP)}
        </text>

        <line x1="66" y1={scaleY(shutdownP)} x2="70" y2={scaleY(shutdownP)} stroke="#f59e0b" strokeWidth="1.5" />
        <text x="64" y={scaleY(shutdownP) + 3.5} fontSize="8.5" textAnchor="end" fill="#f59e0b" fontWeight="bold">
          P_sd={formatCurrency(shutdownP)}
        </text>

        {/* Market Price Line (MR = P) */}
        <line
          x1="70"
          y1={scaleY(price)}
          x2="405"
          y2={scaleY(price)}
          stroke="#2563eb"
          strokeWidth="2.5"
        />
        <rect
          x={priceBadgeX}
          y={Math.max(22, scaleY(price) - 17)}
          width="114"
          height="16"
          rx="3"
          fill="var(--panel, #ffffff)"
          fillOpacity={0.95}
          stroke="#2563eb"
          strokeWidth="1"
        />
        <text
          x={priceBadgeX + 57}
          y={Math.max(34, scaleY(price) - 5)}
          fontSize="9.5"
          fontWeight="bold"
          fill="#2563eb"
          textAnchor="middle"
        >
          P = MR = {formatCurrency(price)}
        </text>

        {/* Cost Curves */}
        {/* AVC */}
        <path d={avcPath} fill="none" stroke="#f59e0b" strokeWidth="2" />
        <rect
          x="372"
          y={Math.max(25, scaleY(c * maxQ + v) - 8)}
          width="32"
          height="15"
          rx="3"
          fill="var(--panel, #ffffff)"
          fillOpacity={0.92}
          stroke="#f59e0b"
          strokeWidth="1"
        />
        <text
          x="388"
          y={Math.max(36, scaleY(c * maxQ + v) + 3)}
          fontSize="9"
          fill="#f59e0b"
          fontWeight="bold"
          textAnchor="middle"
        >
          AVC
        </text>

        {/* ATC */}
        <path d={atcPath} fill="none" stroke="#6366f1" strokeWidth="2.5" />
        <rect
          x="372"
          y={Math.max(25, scaleY(fc / maxQ + c * maxQ + v) - 16)}
          width="32"
          height="15"
          rx="3"
          fill="var(--panel, #ffffff)"
          fillOpacity={0.92}
          stroke="#6366f1"
          strokeWidth="1"
        />
        <text
          x="388"
          y={Math.max(36, scaleY(fc / maxQ + c * maxQ + v) - 5)}
          fontSize="9"
          fill="#6366f1"
          fontWeight="bold"
          textAnchor="middle"
        >
          ATC
        </text>

        {/* MC */}
        <path d={mcPath} fill="none" stroke="#dc2626" strokeWidth="3" />
        <rect
          x="372"
          y={Math.max(22, scaleY(2 * c * maxQ + v) - 18)}
          width="28"
          height="15"
          rx="3"
          fill="var(--panel, #ffffff)"
          fillOpacity={0.92}
          stroke="#dc2626"
          strokeWidth="1"
        />
        <text
          x="386"
          y={Math.max(33, scaleY(2 * c * maxQ + v) - 7)}
          fontSize="9"
          fill="#dc2626"
          fontWeight="bold"
          textAnchor="middle"
        >
          MC
        </text>

        {/* Optimal output marker MR = MC */}
        {optQ > 0 ? (
          <g>
            <circle cx={scaleX(optQ)} cy={scaleY(price)} r="5" fill="#dc2626" />
            <line
              x1={scaleX(optQ)}
              y1={scaleY(price)}
              x2={scaleX(optQ)}
              y2="205"
              stroke="currentColor"
              strokeDasharray="3,3"
            />
            <text x={scaleX(optQ)} y="220" fontSize="10.5" textAnchor="middle" fill="currentColor">
              q*={optQ.toFixed(1)}
            </text>
          </g>
        ) : (
          <g transform="translate(200, 100)">
            <rect
              x="-60"
              y="-12"
              width="150"
              height="24"
              rx="4"
              fill="var(--panel, #ffffff)"
              fillOpacity={0.95}
              stroke="#ef4444"
              strokeWidth="1.5"
            />
            <text x="15" y="4" fontSize="10" fill="#dc2626" fontWeight="bold" textAnchor="middle">
              SHUT DOWN: P ≤ AVC
            </text>
          </g>
        )}

        {/* Bottom Legend / Status */}
        <g transform="translate(70, 244)">
          <text
            x="0"
            y="0"
            fontSize="10.5"
            fill={isShutdown ? "#dc2626" : isProfitable ? "#059669" : "#dc2626"}
            fontWeight="bold"
          >
            Profit: {formatCurrency(profit)} {isShutdown ? "(Shut Down: Loss = FC)" : isProfitable ? "(Economic Gain)" : "(Operating Loss)"}
          </text>
          <text x="240" y="0" fontSize="10.5" fill="currentColor">
            ATC: {optQ > 0 ? formatCurrency(atc) : "N/A"} · MC: {formatCurrency(mc)}
          </text>
        </g>
      </svg>
      <figcaption className="scene-caption" style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--foreground-muted, #666)", lineHeight: 1.3 }}>
        Competitive profit is maximized where MR = MC. Shaded box represents economic profit (green) or loss (red).
      </figcaption>
    </figure>
  );
}

/**
 * Visual for Trade, Tariffs & Import Quotas:
 * Illustrates Domestic Supply & Demand with horizontal World Price (Pw) and Tariff Price (Pw + t).
 * Shows domestic production (Qs), consumption (Qd), imports bracket, tariff revenue box (purple),
 * producer surplus gain (amber), and dual deadweight loss triangles (red).
 */
export function TradeAndTariffsVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const d0 = Number(p.demandIntercept ?? 120);
  const b = Number(p.demandSlope ?? 1.0);
  const s0 = Number(p.supplyIntercept ?? 10);
  const d = Number(p.supplySlope ?? 1.0);
  const pw = Number(p.worldPrice ?? 40);
  const t = Number(p.tariff ?? 15);

  const slopeSum = Math.max(1e-6, b + d);
  const autarkyP = Number(o.autarkyPrice ?? (d0 * d + s0 * b) / slopeSum);
  const autarkyQ = Number(o.autarkyQuantity ?? Math.max(0, (d0 - s0) / slopeSum));
  const domP = Number(o.domesticPrice ?? Math.min(autarkyP, pw + t));
  const qs = Number(o.domesticProduction ?? (domP > s0 ? (domP - s0) / d : 0));
  const qd = Number(o.domesticConsumption ?? Math.max(0, (d0 - domP) / b));
  const imports = Number(o.imports ?? Math.max(0, qd - qs));
  const tariffRevenue = Number(o.tariffRevenue ?? 0);
  const dwlProd = Number(o.deadweightLossProd ?? 0);
  const dwlCons = Number(o.deadweightLossCons ?? 0);
  const dwl = Number(o.deadweightLoss ?? dwlProd + dwlCons);
  const psGain = Number(o.producerSurplusGain ?? 0);
  const csLoss = Number(o.consumerSurplusLoss ?? 0);

  // Free trade quantities at Pw
  const freeQd = Math.max(0, (d0 - pw) / Math.max(1e-6, b));
  const freeQs = pw > s0 ? Math.max(0, (pw - s0) / Math.max(1e-6, d)) : 0;

  const isProhibitive = (pw + t) >= autarkyP - 0.05;

  // Chart bounds: x: 70 to 410 (width 340), y: 205 down to 25 (height 180)
  const maxQ = Math.max(30, freeQd * 1.35, autarkyQ * 1.45);
  const maxP = Math.max(60, d0 * 1.15, autarkyP * 1.3);

  const scaleX = (q: number) => 70 + (Math.max(0, q) / maxQ) * 340;
  const scaleY = (price: number) => 205 - (Math.max(0, price) / maxP) * 180;

  // Demand line endpoints
  const dStart = { x: scaleX(0), y: scaleY(d0) };
  const dEndQ = Math.min(maxQ, d0 / Math.max(1e-6, b));
  const dEnd = { x: scaleX(dEndQ), y: scaleY(Math.max(0, d0 - b * dEndQ)) };

  // Supply line endpoints
  const sStart = { x: scaleX(0), y: scaleY(s0) };
  const sEnd = { x: scaleX(maxQ), y: scaleY(s0 + d * maxQ) };

  // Coordinates of key welfare vertices
  const yPw = scaleY(pw);
  const yDomP = scaleY(domP);
  const xFreeQs = scaleX(freeQs);
  const xFreeQd = scaleX(freeQd);
  const xQs = scaleX(qs);
  const xQd = scaleX(qd);

  // Shaded polygon paths
  // 1. Producer surplus gain trapezoid between Pw and domP
  const psGainPath = domP > pw && qs > 0
    ? `M ${scaleX(0)} ${yPw} L ${xFreeQs} ${yPw} L ${xQs} ${yDomP} L ${scaleX(0)} ${yDomP} Z`
    : "";

  // 2. Tariff Revenue Box: from Qs to Qd between Pw and domP
  const hasTariffBox = domP > pw && imports > 0;
  const tariffBoxX = xQs;
  const tariffBoxY = yDomP;
  const tariffBoxW = Math.max(0, xQd - xQs);
  const tariffBoxH = Math.max(0, yPw - yDomP);

  // 3. DWL Production Efficiency Loss triangle
  const dwlProdPath = domP > pw && qs > freeQs
    ? `M ${xFreeQs} ${yPw} L ${xQs} ${yPw} L ${xQs} ${yDomP} Z`
    : "";

  // 4. DWL Consumption Efficiency Loss triangle
  const dwlConsPath = domP > pw && freeQd > qd
    ? `M ${xQd} ${yDomP} L ${xQd} ${yPw} L ${xFreeQd} ${yPw} Z`
    : "";

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 460 260"
        role="img"
        aria-label={`Trade & Tariffs: World price ${formatCurrency(pw)}, Domestic price ${formatCurrency(domP)}, Imports ${formatUnits(imports)}`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Trade, Tariffs and Welfare Redistribution</title>

        {/* Shaded Welfare Polygons */}
        {psGainPath && <path d={psGainPath} fill="#d97706" fillOpacity={0.22} />}
        {hasTariffBox && (
          <rect
            x={tariffBoxX}
            y={tariffBoxY}
            width={tariffBoxW}
            height={tariffBoxH}
            fill="#8b5cf6"
            fillOpacity={0.25}
            stroke="#8b5cf6"
            strokeWidth="1.2"
            strokeDasharray="3,2"
          />
        )}
        {dwlProdPath && (
          <path
            d={dwlProdPath}
            fill="#ef4444"
            fillOpacity={0.25}
            stroke="#dc2626"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        )}
        {dwlConsPath && (
          <path
            d={dwlConsPath}
            fill="#ef4444"
            fillOpacity={0.25}
            stroke="#dc2626"
            strokeWidth="1"
            strokeDasharray="2,2"
          />
        )}

        {/* Axes */}
        <line x1="70" y1="205" x2="410" y2="205" stroke="currentColor" strokeWidth="2" />
        <line x1="70" y1="20" x2="70" y2="205" stroke="currentColor" strokeWidth="2" />

        <text x="74" y="16" fontSize="10.5" fill="currentColor" textAnchor="start" fontWeight="bold">
          Price ($)
        </text>
        <text x="410" y="222" fontSize="10.5" fill="currentColor" textAnchor="end" fontWeight="bold">
          Quantity (Units)
        </text>

        {/* Demand & Supply Curves */}
        <line x1={dStart.x} y1={dStart.y} x2={dEnd.x} y2={dEnd.y} stroke="#2563eb" strokeWidth="2.5" />
        <text x={Math.min(405, dEnd.x - 4)} y={Math.max(35, dEnd.y - 6)} fontSize="11" fontWeight="bold" fill="#2563eb" textAnchor="end">
          Domestic Demand (D)
        </text>

        <line x1={sStart.x} y1={sStart.y} x2={sEnd.x} y2={sEnd.y} stroke="#dc2626" strokeWidth="2.5" />
        <text x={Math.min(405, sEnd.x)} y={Math.min(200, sEnd.y + 14)} fontSize="11" fontWeight="bold" fill="#dc2626" textAnchor="end">
          Domestic Supply (S)
        </text>

        {/* Horizontal World Price Line Pw */}
        <line x1="70" y1={yPw} x2="405" y2={yPw} stroke="#10b981" strokeWidth="2" strokeDasharray="4,3" />
        <text x="64" y={yPw + 3.5} fontSize="9" fill="#059669" textAnchor="end" fontWeight="bold">
          P_w={formatCurrency(pw)}
        </text>

        {/* Horizontal Domestic Tariff Price Line (Pw + t) */}
        {domP > pw && (
          <g>
            <line x1="70" y1={yDomP} x2="405" y2={yDomP} stroke="#8b5cf6" strokeWidth="2.2" />
            <text x="64" y={yDomP + 3.5} fontSize="9" fill="#7c3aed" textAnchor="end" fontWeight="bold">
              P_dom={formatCurrency(domP)}
            </text>
          </g>
        )}

        {/* Autarky reference point */}
        <circle cx={scaleX(autarkyQ)} cy={scaleY(autarkyP)} r="3" fill="#64748b" />
        <text x={scaleX(autarkyQ) + 6} y={scaleY(autarkyP) - 4} fontSize="8.5" fill="#64748b">
          Autarky ({formatCurrency(autarkyP)})
        </text>

        {/* Quantity Reference Guidelines & Ticks */}
        {/* Qs marker */}
        <line x1={xQs} y1={yDomP} x2={xQs} y2="205" stroke="currentColor" strokeDasharray="2,2" strokeOpacity={0.5} />
        <text x={xQs} y="217" fontSize="9" fill="currentColor" textAnchor="middle">
          Q_s={formatUnits(qs)}
        </text>

        {/* Qd marker */}
        <line x1={xQd} y1={yDomP} x2={xQd} y2="205" stroke="currentColor" strokeDasharray="2,2" strokeOpacity={0.5} />
        <text x={xQd} y="217" fontSize="9" fill="currentColor" textAnchor="middle">
          Q_d={formatUnits(qd)}
        </text>

        {/* Operating markers along domestic price */}
        <circle cx={xQs} cy={yDomP} r="4.5" fill="#dc2626" />
        <circle cx={xQd} cy={yDomP} r="4.5" fill="#2563eb" />

        {/* Imports Bracket / Callout */}
        {imports > 0.5 && domP > pw && (
          <g>
            <line x1={xQs + 2} y1={yDomP + tariffBoxH / 2} x2={xQd - 2} y2={yDomP + tariffBoxH / 2} stroke="#7c3aed" strokeWidth="1.5" />
            <rect
              x={(xQs + xQd) / 2 - 45}
              y={yDomP + tariffBoxH / 2 - 8}
              width="90"
              height="16"
              rx="3"
              fill="var(--panel, #ffffff)"
              fillOpacity={0.96}
              stroke="#8b5cf6"
              strokeWidth="1"
            />
            <text
              x={(xQs + xQd) / 2}
              y={yDomP + tariffBoxH / 2 + 3.5}
              fontSize="9"
              fontWeight="bold"
              fill="#7c3aed"
              textAnchor="middle"
            >
              Tariff: {formatCurrency(tariffRevenue)}
            </text>
          </g>
        )}

        {/* Prohibitive Tariff Banner */}
        {isProhibitive && (
          <g transform="translate(195, 36)">
            <rect
              x="-85"
              y="-11"
              width="170"
              height="22"
              rx="4"
              fill="var(--panel, #ffffff)"
              fillOpacity={0.96}
              stroke="#ef4444"
              strokeWidth="1.5"
            />
            <text x="0" y="3.5" fontSize="9.5" fill="#dc2626" fontWeight="bold" textAnchor="middle">
              PROHIBITIVE TARIFF: Imports = 0
            </text>
          </g>
        )}

        {/* Bottom Legend / Status Badges */}
        <g transform="translate(70, 244)">
          <text x="0" y="0" fontSize="10" fill="currentColor">
            Imports: <tspan fontWeight="bold" fill="#7c3aed">{formatUnits(imports)} units</tspan>
          </text>
          <text x="110" y="0" fontSize="10" fill="currentColor">
            Revenue: <tspan fontWeight="bold" fill="#7c3aed">{formatCurrency(tariffRevenue)}</tspan>
          </text>
          <text x="215" y="0" fontSize="10" fill="currentColor">
            DWL: <tspan fontWeight="bold" fill="#dc2626">{formatCurrency(dwl)}</tspan>
          </text>
          <text x="295" y="0" fontSize="10" fill="currentColor">
            CS Loss: <tspan fontWeight="bold" fill="#dc2626">-{formatCurrency(csLoss)}</tspan>
          </text>
        </g>
      </svg>
      <figcaption className="scene-caption" style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--foreground-muted, #666)", lineHeight: 1.3 }}>
        Tariff increases domestic price from P_w to P_dom. Shaded purple box is tariff revenue; shaded red triangles represent deadweight efficiency losses.
      </figcaption>
    </figure>
  );
}

/**
 * Visual for Monopoly Pricing & Deadweight Loss:
 * Plots Downward-sloping Demand curve, Marginal Revenue (MR) curve with twice the slope,
 * and Marginal Cost (MC) line.
 * Illustrates Monopoly output Qm where MR = MC, Monopoly price Pm, Mark-up over MC,
 * Competitive benchmark Qc where P = MC, shaded Profit box (green), and Harberger Deadweight Loss triangle (red).
 */
export function MonopolyPricingVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const o = instance.outputs;
  const p = instance.parameters;

  const a = Number(p.demandIntercept ?? 120);
  const b = Number(p.demandSlope ?? 1.0);
  const c = Number(p.marginalCostSlope ?? 0.2);
  const v = Number(p.marginalCostBase ?? 20);
  const fc = Number(p.fixedCost ?? 100);

  const qm = Number(o.monopolyQuantity ?? (a > v ? (a - v) / (2 * b + c) : 0));
  const pm = Number(o.monopolyPrice ?? Math.max(0, a - b * qm));
  const qc = Number(o.competitiveQuantity ?? (a > v ? (a - v) / (b + c) : 0));
  const pc = Number(o.competitivePrice ?? Math.max(0, a - b * qc));
  const mcM = Number(o.marginalCostAtMonopoly ?? c * qm + v);
  const markup = Number(o.markup ?? Math.max(0, pm - mcM));
  const lerner = Number(o.lernerIndex ?? (pm > 0 ? markup / pm : 0));
  const profit = Number(o.monopolyProfit ?? 0);
  const dwl = Number(o.deadweightLoss ?? 0);
  const cs = Number(o.consumerSurplus ?? 0);

  // SVG dimensions: x 70 to 410 (width 340), y 205 down to 25 (height 180)
  const maxQ = Math.max(30, qc * 1.35, qm * 1.6);
  const maxP = Math.max(50, a * 1.15, pm * 1.35);

  const scaleX = (q: number) => 70 + (Math.max(0, q) / maxQ) * 340;
  const scaleY = (price: number) => 205 - (Math.max(0, price) / maxP) * 180;

  // Demand line endpoints
  const dStart = { x: scaleX(0), y: scaleY(a) };
  const dEndQ = Math.min(maxQ, a / Math.max(1e-6, b));
  const dEnd = { x: scaleX(dEndQ), y: scaleY(Math.max(0, a - b * dEndQ)) };

  // MR line endpoints: starts at a, reaches 0 at a / (2b)
  const mrStart = { x: scaleX(0), y: scaleY(a) };
  const mrZeroQ = Math.min(maxQ, a / Math.max(1e-6, 2 * b));
  const mrEnd = { x: scaleX(mrZeroQ), y: scaleY(0) };

  // MC line endpoints: starts at v, rises with slope c
  const mcStart = { x: scaleX(0), y: scaleY(v) };
  const mcEnd = { x: scaleX(maxQ), y: scaleY(c * maxQ + v) };

  // Coordinates
  const xQm = scaleX(qm);
  const yPm = scaleY(pm);
  const yMcM = scaleY(mcM);

  const xQc = scaleX(qc);
  const yPc = scaleY(pc);

  // Shaded Areas
  // 1. Consumer Surplus triangle under demand down to Pm
  const csPath = qm > 0
    ? `M ${scaleX(0)} ${scaleY(a)} L ${scaleX(0)} ${yPm} L ${xQm} ${yPm} Z`
    : "";

  // 2. Monopoly Profit / Mark-up Box from 0 to Qm between MC(Qm) and Pm
  const profitBoxX = scaleX(0);
  const profitBoxY = Math.min(yPm, yMcM);
  const profitBoxW = Math.max(0, xQm - scaleX(0));
  const profitBoxH = Math.abs(yMcM - yPm);

  // 3. Deadweight Loss Triangle between Qm and Qc bounded by Demand and MC
  const dwlPath = qm > 0 && qc > qm
    ? `M ${xQm} ${yPm} L ${xQc} ${yPc} L ${xQm} ${yMcM} Z`
    : "";

  return (
    <figure style={{ margin: 0, textAlign: "center" }}>
      <svg
        viewBox="0 0 460 260"
        role="img"
        aria-label={`Monopoly Pricing: Monopoly price ${formatCurrency(pm)}, Output ${formatUnits(qm)}, Mark-up ${formatCurrency(markup)}`}
        style={{ width: "100%", maxWidth: 500, height: "auto" }}
      >
        <title>Monopoly Pricing and Deadweight Loss</title>

        {/* Shaded Welfare Areas */}
        {csPath && <path d={csPath} fill="#2563eb" fillOpacity={0.16} />}
        {qm > 0 && profitBoxH > 0 && (
          <rect
            x={profitBoxX}
            y={profitBoxY}
            width={profitBoxW}
            height={profitBoxH}
            fill="#10b981"
            fillOpacity={0.2}
            stroke="#059669"
            strokeWidth="1.2"
            strokeDasharray="3,2"
          />
        )}
        {dwlPath && (
          <path
            d={dwlPath}
            fill="#ef4444"
            fillOpacity={0.25}
            stroke="#dc2626"
            strokeWidth="1.2"
            strokeDasharray="3,3"
          />
        )}

        {/* Axes */}
        <line x1="70" y1="205" x2="410" y2="205" stroke="currentColor" strokeWidth="2" />
        <line x1="70" y1="20" x2="70" y2="205" stroke="currentColor" strokeWidth="2" />

        <text x="74" y="16" fontSize="10.5" fill="currentColor" textAnchor="start" fontWeight="bold">
          Price / Cost ($)
        </text>
        <text x="410" y="222" fontSize="10.5" fill="currentColor" textAnchor="end" fontWeight="bold">
          Quantity (Units)
        </text>

        {/* Demand Curve */}
        <line x1={dStart.x} y1={dStart.y} x2={dEnd.x} y2={dEnd.y} stroke="#2563eb" strokeWidth="2.5" />
        <text x={Math.min(405, dEnd.x - 4)} y={Math.max(35, dEnd.y - 6)} fontSize="10.5" fontWeight="bold" fill="#2563eb" textAnchor="end">
          Demand (P)
        </text>

        {/* Marginal Revenue Curve */}
        <line x1={mrStart.x} y1={mrStart.y} x2={mrEnd.x} y2={mrEnd.y} stroke="#8b5cf6" strokeWidth="2" strokeDasharray="5,3" />
        <text x={Math.min(405, mrEnd.x)} y={Math.min(200, mrEnd.y - 6)} fontSize="10" fontWeight="bold" fill="#7c3aed" textAnchor="end">
          MR
        </text>

        {/* Marginal Cost Curve */}
        <line x1={mcStart.x} y1={mcStart.y} x2={mcEnd.x} y2={mcEnd.y} stroke="#dc2626" strokeWidth="2.5" />
        <text x={Math.min(405, mcEnd.x)} y={Math.min(200, mcEnd.y - 6)} fontSize="10.5" fontWeight="bold" fill="#dc2626" textAnchor="end">
          MC
        </text>

        {/* Monopoly Quantity Vertical Guideline */}
        {qm > 0 && (
          <g>
            <line x1={xQm} y1={yPm} x2={xQm} y2="205" stroke="currentColor" strokeDasharray="2,2" strokeOpacity={0.6} />
            <line x1="70" y1={yPm} x2={xQm} y2={yPm} stroke="currentColor" strokeDasharray="2,2" strokeOpacity={0.6} />

            {/* Monopoly Output Marker on X Axis */}
            <text x={xQm} y="217" fontSize="9" fill="currentColor" textAnchor="middle" fontWeight="bold">
              Q_m={formatUnits(qm)}
            </text>

            {/* Monopoly Price on Y Axis */}
            <text x="64" y={yPm + 3.5} fontSize="9" fill="#2563eb" textAnchor="end" fontWeight="bold">
              P_m={formatCurrency(pm)}
            </text>

            {/* MR = MC Intersection Circle */}
            <circle cx={xQm} cy={yMcM} r="4" fill="#7c3aed" />

            {/* Monopoly Price Point on Demand Curve */}
            <circle cx={xQm} cy={yPm} r="5" fill="#2563eb" />

            {/* Mark-up Callout Bracket on vertical segment */}
            <line x1={xQm + 8} y1={yPm} x2={xQm + 8} y2={yMcM} stroke="#059669" strokeWidth="2" />
            <rect
              x={xQm + 14}
              y={(yPm + yMcM) / 2 - 8}
              width="100"
              height="16"
              rx="3"
              fill="var(--panel, #ffffff)"
              fillOpacity={0.96}
              stroke="#059669"
              strokeWidth="1"
            />
            <text
              x={xQm + 64}
              y={(yPm + yMcM) / 2 + 3.5}
              fontSize="8.5"
              fontWeight="bold"
              fill="#059669"
              textAnchor="middle"
            >
              Mark-up: {formatCurrency(markup)}
            </text>
          </g>
        )}

        {/* Competitive Benchmark Reference */}
        {qc > 0 && (
          <g>
            <line x1={xQc} y1={yPc} x2={xQc} y2="205" stroke="#64748b" strokeDasharray="2,2" strokeOpacity={0.5} />
            <circle cx={xQc} cy={yPc} r="3.5" fill="#64748b" />
            <text x={xQc} y="217" fontSize="8.5" fill="#64748b" textAnchor="middle">
              Q_c={formatUnits(qc)}
            </text>
          </g>
        )}

        {/* Bottom Legend / Status Badges */}
        <g transform="translate(70, 244)">
          <text x="0" y="0" fontSize="10" fill="currentColor">
            P_m: <tspan fontWeight="bold" fill="#2563eb">{formatCurrency(pm)}</tspan>
          </text>
          <text x="75" y="0" fontSize="10" fill="currentColor">
            Q_m: <tspan fontWeight="bold" fill="currentColor">{formatUnits(qm)}</tspan>
          </text>
          <text x="140" y="0" fontSize="10" fill="currentColor">
            Profit: <tspan fontWeight="bold" fill="#059669">{formatCurrency(profit)}</tspan>
          </text>
          <text x="245" y="0" fontSize="10" fill="currentColor">
            DWL: <tspan fontWeight="bold" fill="#dc2626">{formatCurrency(dwl)}</tspan>
          </text>
          <text x="325" y="0" fontSize="10" fill="currentColor">
            Lerner: <tspan fontWeight="bold" fill="#7c3aed">{lerner.toFixed(2)}</tspan>
          </text>
        </g>
      </svg>
      <figcaption className="scene-caption" style={{ margin: "6px 0 0", fontSize: 11.5, color: "var(--foreground-muted, #666)", lineHeight: 1.3 }}>
        Monopolist sets output where MR = MC and charges price P_m on demand curve. Shaded green rectangle is operating profit; shaded red triangle is deadweight loss.
      </figcaption>
    </figure>
  );
}


