import type {
  CostAndProfitState,
  MarketEquilibriumState,
  PriceElasticityState,
} from "../../traits/economics/EconomicsState";

export type State = Record<string, unknown>;

function number(
  value: unknown,
  min: number,
  max: number,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${label}: expected a finite value from ${min} to ${max}`);
  return value;
}

// ---------------------------------------------------------------------------
// 1. Market Equilibrium Model
// ---------------------------------------------------------------------------

export function marketEquilibriumInitial(p: State): MarketEquilibriumState {
  return {
    demandIntercept: number(p.demandIntercept ?? 100, 40, 300, "Demand intercept ($)"),
    demandSlope: number(p.demandSlope ?? 1.0, 0.1, 5.0, "Demand slope ($/unit)"),
    supplyIntercept: number(p.supplyIntercept ?? 20, 0, 100, "Supply intercept ($)"),
    supplySlope: number(p.supplySlope ?? 1.0, 0.1, 5.0, "Supply slope ($/unit)"),
    priceControl: number(p.priceControl ?? 0, 0, 300, "Price control ($)"),
    tax: number(p.tax ?? 0, 0, 50, "Excise tax ($/unit)"),
  };
}

export function marketEquilibriumApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "ECON_SET_DEMAND") {
    if (typeof value === "object" && value !== null) {
      const v = value as Record<string, unknown>;
      return marketEquilibriumInitial({
        ...s,
        demandIntercept: v.demandIntercept ?? s.demandIntercept,
        demandSlope: v.demandSlope ?? s.demandSlope,
      });
    }
    return marketEquilibriumInitial({
      ...s,
      demandIntercept: number(value, 40, 300, "Demand intercept ($)"),
    });
  }
  if (action === "ECON_SET_SUPPLY") {
    if (typeof value === "object" && value !== null) {
      const v = value as Record<string, unknown>;
      return marketEquilibriumInitial({
        ...s,
        supplyIntercept: v.supplyIntercept ?? s.supplyIntercept,
        supplySlope: v.supplySlope ?? s.supplySlope,
      });
    }
    return marketEquilibriumInitial({
      ...s,
      supplyIntercept: number(value, 0, 100, "Supply intercept ($)"),
    });
  }
  if (action === "ECON_SET_PRICE_CONTROL") {
    return marketEquilibriumInitial({
      ...s,
      priceControl: number(value, 0, 300, "Price control ($)"),
    });
  }
  if (action === "ECON_SET_TAX") {
    return marketEquilibriumInitial({
      ...s,
      tax: number(value, 0, 50, "Excise tax ($/unit)"),
    });
  }
  throw new Error(`Unsupported market equilibrium operation: ${action}`);
}

export function marketEquilibriumMeasure(s: State): State {
  const p = marketEquilibriumInitial(s);
  const d0 = p.demandIntercept;
  const b = p.demandSlope;
  const s0 = p.supplyIntercept;
  const d = p.supplySlope;
  const tax = p.tax;
  const priceControl = p.priceControl;

  // Unrestricted equilibrium with tax
  const eqQ = Math.max(0, (d0 - s0 - tax) / (b + d));
  const buyerPrice = d0 - b * eqQ;
  const sellerPrice = s0 + d * eqQ;
  const eqPrice = (d0 * d + s0 * b) / (b + d);

  // Price control analysis
  let actualPrice = buyerPrice;
  let actualQ = eqQ;
  let shortageOrSurplus = 0;

  if (priceControl > 0) {
    const qDemandedAtControl = Math.max(0, (d0 - priceControl) / b);
    const qSuppliedAtControl = Math.max(0, (priceControl - s0) / d);

    if (priceControl < eqPrice) {
      // Binding price ceiling: quantity supplied limits the market
      actualPrice = priceControl;
      actualQ = Math.min(eqQ, qSuppliedAtControl);
      shortageOrSurplus = qDemandedAtControl - qSuppliedAtControl; // positive = shortage
    } else if (priceControl > eqPrice) {
      // Binding price floor: quantity demanded limits the market
      actualPrice = priceControl;
      actualQ = Math.min(eqQ, qDemandedAtControl);
      shortageOrSurplus = qDemandedAtControl - qSuppliedAtControl; // negative = surplus
    }
  }

  // Surpluses
  const effectiveBuyerP = priceControl > 0 ? actualPrice : buyerPrice;
  const effectiveSellerP = priceControl > 0 ? actualPrice : sellerPrice;
  const cs = Math.max(0, 0.5 * (d0 - effectiveBuyerP) * actualQ);
  const ps = Math.max(0, 0.5 * (effectiveSellerP - s0) * actualQ);
  const taxRevenue = tax * actualQ;

  // Free-market baseline surplus for DWL calculation
  const freeQ = Math.max(0, (d0 - s0) / (b + d));
  const maxTotalSurplus = 0.5 * (d0 - s0) * freeQ;
  const actualTotalSurplus = cs + ps + taxRevenue;
  const deadweightLoss = Math.max(0, maxTotalSurplus - actualTotalSurplus);

  // Curve points for visualization
  const maxQ = Math.max(20, Math.ceil(freeQ * 1.6));
  const step = maxQ / 24;
  const points = Array.from({ length: 25 }, (_, i) => {
    const q = i * step;
    return {
      x: q,
      y: Math.max(0, d0 - b * q), // Demand curve
      supply_y: s0 + d * q, // Supply curve
    };
  });

  return {
    demandIntercept: d0,
    demandSlope: b,
    supplyIntercept: s0,
    supplySlope: d,
    priceControl,
    tax,
    equilibriumPrice: Math.round(eqPrice * 100) / 100,
    equilibriumQuantity: Math.round(eqQ * 100) / 100,
    actualPrice: Math.round(actualPrice * 100) / 100,
    actualQuantity: Math.round(actualQ * 100) / 100,
    consumerSurplus: Math.round(cs * 100) / 100,
    producerSurplus: Math.round(ps * 100) / 100,
    taxRevenue: Math.round(taxRevenue * 100) / 100,
    deadweightLoss: Math.round(deadweightLoss * 100) / 100,
    shortageOrSurplus: Math.round(shortageOrSurplus * 100) / 100,
    points,
  };
}

// ---------------------------------------------------------------------------
// 2. Price Elasticity of Demand Model
// ---------------------------------------------------------------------------

export function priceElasticityInitial(p: State): PriceElasticityState {
  return {
    chokePrice: number(p.chokePrice ?? 100, 20, 500, "Choke price ($)"),
    maxQuantity: number(p.maxQuantity ?? 100, 10, 1000, "Max quantity (units)"),
    currentPrice: number(p.currentPrice ?? 50, 1, 500, "Current price ($)"),
  };
}

export function priceElasticityApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "ECON_SET_PRICE") {
    return priceElasticityInitial({
      ...s,
      currentPrice: number(value, 1, Number(s.chokePrice || 500), "Current price ($)"),
    });
  }
  if (action === "ECON_SET_CHOKE_PRICE") {
    const cp = number(value, 20, 500, "Choke price ($)");
    return priceElasticityInitial({
      ...s,
      chokePrice: cp,
      currentPrice: Math.min(Number(s.currentPrice), cp - 1),
    });
  }
  if (action === "ECON_SET_MAX_QUANTITY") {
    return priceElasticityInitial({
      ...s,
      maxQuantity: number(value, 10, 1000, "Max quantity (units)"),
    });
  }
  throw new Error(`Unsupported price elasticity operation: ${action}`);
}

export function priceElasticityMeasure(s: State): State {
  const p = priceElasticityInitial(s);
  const a = p.chokePrice;
  const qMax = p.maxQuantity;
  const price = Math.min(p.currentPrice, a - 0.01);

  // Q = Qmax * (1 - P / a)
  const qty = Math.max(0, qMax * (1 - price / a));
  // Point elasticity Ed = P / (a - P)
  const elasticity = price / (a - price);
  const totalRevenue = price * qty;

  let regime = "unit-elastic";
  if (elasticity > 1.05) regime = "elastic";
  else if (elasticity < 0.95) regime = "inelastic";

  const revMaxPrice = a / 2;
  const revMaxQty = qMax / 2;
  const maxRevenue = revMaxPrice * revMaxQty;

  // Graph points across price spectrum
  const step = a / 24;
  const points = Array.from({ length: 25 }, (_, i) => {
    const px = i * step;
    const qx = Math.max(0, qMax * (1 - px / a));
    return {
      x: Math.round(px * 10) / 10,
      y: Math.round(qx * 10) / 10,
      revenue: Math.round(px * qx * 10) / 10,
    };
  });

  return {
    chokePrice: a,
    maxQuantity: qMax,
    currentPrice: price,
    currentQuantity: Math.round(qty * 100) / 100,
    elasticity: Math.round(elasticity * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    elasticityRegime: regime,
    revenueMaximizingPrice: Math.round(revMaxPrice * 100) / 100,
    revenueMaximizingQuantity: Math.round(revMaxQty * 100) / 100,
    maxRevenue: Math.round(maxRevenue * 100) / 100,
    points,
  };
}

// ---------------------------------------------------------------------------
// 3. Firm Production Costs and Profit Model
// ---------------------------------------------------------------------------

export function costAndProfitInitial(p: State): CostAndProfitState {
  return {
    fixedCost: number(p.fixedCost ?? 50, 0, 500, "Fixed cost ($)"),
    linearCost: number(p.linearCost ?? 5, 0, 50, "Linear cost coefficient ($/unit)"),
    quadraticCost: number(p.quadraticCost ?? 0.5, 0.05, 5.0, "Quadratic cost coefficient ($/unit²)"),
    marketPrice: number(p.marketPrice ?? 25, 1, 100, "Market price ($/unit)"),
  };
}

export function costAndProfitApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "ECON_SET_MARKET_PRICE") {
    return costAndProfitInitial({
      ...s,
      marketPrice: number(value, 1, 100, "Market price ($/unit)"),
    });
  }
  if (action === "ECON_SET_FIXED_COST") {
    return costAndProfitInitial({
      ...s,
      fixedCost: number(value, 0, 500, "Fixed cost ($)"),
    });
  }
  throw new Error(`Unsupported cost and profit operation: ${action}`);
}

export function costAndProfitMeasure(s: State): State {
  const p = costAndProfitInitial(s);
  const fc = p.fixedCost;
  const v = p.linearCost;
  const c = p.quadraticCost;
  const price = p.marketPrice;

  // Profit maximization: MR = MC -> P = 2*c*q + v -> q* = (P - v) / (2c)
  const shutdownPrice = v;
  let optimalQ = 0;
  if (price > shutdownPrice) {
    optimalQ = Math.max(0, (price - v) / (2 * c));
  }

  const tr = price * optimalQ;
  const vc = c * optimalQ * optimalQ + v * optimalQ;
  const tc = fc + vc;
  const profit = tr - tc;

  const mc = optimalQ > 0 ? 2 * c * optimalQ + v : v;
  const atc = optimalQ > 0 ? tc / optimalQ : (fc > 0 ? 9999 : v);
  const avc = optimalQ > 0 ? vc / optimalQ : v;
  const breakEvenPrice = v + 2 * Math.sqrt(Math.max(0, c * fc));

  // Cost curves over q in [1, 30]
  const points = Array.from({ length: 25 }, (_, i) => {
    const q = 1 + (29 * i) / 24;
    const curTc = fc + c * q * q + v * q;
    return {
      x: Math.round(q * 10) / 10,
      y: Math.round((2 * c * q + v) * 100) / 100, // Marginal Cost MC
      atc: Math.round((curTc / q) * 100) / 100, // Average Total Cost ATC
      avc: Math.round((c * q + v) * 100) / 100, // Average Variable Cost AVC
      price,
    };
  });

  return {
    fixedCost: fc,
    linearCost: v,
    quadraticCost: c,
    marketPrice: price,
    optimalQuantity: Math.round(optimalQ * 100) / 100,
    totalRevenue: Math.round(tr * 100) / 100,
    totalCost: Math.round(tc * 100) / 100,
    economicProfit: Math.round(profit * 100) / 100,
    marginalCost: Math.round(mc * 100) / 100,
    averageTotalCost: Math.round(atc * 100) / 100,
    averageVariableCost: Math.round(avc * 100) / 100,
    shutdownPrice: Math.round(shutdownPrice * 100) / 100,
    breakEvenPrice: Math.round(breakEvenPrice * 100) / 100,
    points,
  };
}
