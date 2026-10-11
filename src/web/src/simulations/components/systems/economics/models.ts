import type {
  CostAndProfitState,
  MarketEquilibriumState,
  MonopolyPricingState,
  PriceElasticityState,
  TradeAndTariffsState,
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
    if (typeof value === "object" && value !== null && !("value" in value)) {
      const v = value as Record<string, unknown>;
      return marketEquilibriumInitial({
        ...s,
        demandIntercept: v.demandIntercept ?? s.demandIntercept,
        demandSlope: v.demandSlope ?? s.demandSlope,
      });
    }
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return marketEquilibriumInitial({
      ...s,
      demandIntercept: number(raw, 40, 300, "Demand intercept ($)"),
    });
  }
  if (action === "ECON_SET_SUPPLY") {
    if (typeof value === "object" && value !== null && !("value" in value)) {
      const v = value as Record<string, unknown>;
      return marketEquilibriumInitial({
        ...s,
        supplyIntercept: v.supplyIntercept ?? s.supplyIntercept,
        supplySlope: v.supplySlope ?? s.supplySlope,
      });
    }
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return marketEquilibriumInitial({
      ...s,
      supplyIntercept: number(raw, 0, 100, "Supply intercept ($)"),
    });
  }
  if (action === "ECON_SET_PRICE_CONTROL") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return marketEquilibriumInitial({
      ...s,
      priceControl: number(raw, 0, 300, "Price control ($)"),
    });
  }
  if (action === "ECON_SET_TAX") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return marketEquilibriumInitial({
      ...s,
      tax: number(raw, 0, 50, "Excise tax ($/unit)"),
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
  const tax = Math.max(0, p.tax);
  const priceControl = Math.max(0, p.priceControl);

  const slopeSum = Math.max(1e-6, b + d);
  const freeQ = Math.max(0, (d0 - s0) / slopeSum);
  const eqPrice = Math.max(0, (d0 * d + s0 * b) / slopeSum);

  // Equilibrium with excise tax wedge: Pb - Ps = tax
  const eqQ = Math.max(0, (d0 - s0 - tax) / slopeSum);
  const buyerPrice = eqQ > 0 ? d0 - b * eqQ : d0;
  const sellerPrice = eqQ > 0 ? s0 + d * eqQ : s0;

  // Price control analysis (ceiling or floor)
  let actualPrice = buyerPrice;
  let actualQ = eqQ;
  let shortageOrSurplus = 0;

  if (priceControl > 0) {
    const qDemandedAtControl = Math.max(0, (d0 - priceControl) / Math.max(1e-6, b));
    const effectiveSellerAtControl = Math.max(0, priceControl - tax);
    const qSuppliedAtControl = Math.max(0, (effectiveSellerAtControl - s0) / Math.max(1e-6, d));

    if (priceControl < eqPrice) {
      // Binding price ceiling: quantity supplied limits the market
      actualPrice = priceControl;
      actualQ = Math.min(eqQ, qSuppliedAtControl);
      shortageOrSurplus = Math.max(0, qDemandedAtControl - qSuppliedAtControl); // positive = shortage
    } else if (priceControl > eqPrice) {
      // Binding price floor: quantity demanded limits the market
      actualPrice = priceControl;
      actualQ = Math.min(eqQ, qDemandedAtControl);
      shortageOrSurplus = qDemandedAtControl - qSuppliedAtControl; // negative = surplus
    } else {
      actualPrice = eqPrice;
      actualQ = eqQ;
      shortageOrSurplus = 0;
    }
  }

  // Surpluses
  const effectiveBuyerP = priceControl > 0 ? actualPrice : buyerPrice;
  const effectiveSellerP = priceControl > 0 ? Math.max(0, actualPrice - tax) : sellerPrice;

  // Exact consumer and producer surplus trapezoids without negative artifacts
  const cs = actualQ > 0
    ? Math.max(0, (d0 - effectiveBuyerP - 0.5 * b * actualQ) * actualQ)
    : 0;
  const ps = actualQ > 0
    ? Math.max(0, (effectiveSellerP - s0 - 0.5 * d * actualQ) * actualQ)
    : 0;
  const taxRevenue = Math.max(0, tax * actualQ);

  // Free-market baseline surplus for exact DWL calculation
  const maxTotalSurplus = 0.5 * Math.max(0, d0 - s0) * freeQ;
  const actualTotalSurplus = cs + ps + taxRevenue;
  const deadweightLoss = Math.max(0, maxTotalSurplus - actualTotalSurplus);

  // Curve points for visualization
  const maxQ = Math.max(20, Math.ceil(Math.max(freeQ, actualQ) * 1.6));
  const step = maxQ / 24;
  const points = Array.from({ length: 25 }, (_, i) => {
    const q = i * step;
    return {
      x: Math.round(q * 10) / 10,
      y: Math.max(0, Math.round((d0 - b * q) * 100) / 100), // Demand curve
      supply_y: Math.max(0, Math.round((s0 + d * q) * 100) / 100), // Supply curve
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
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return priceElasticityInitial({
      ...s,
      currentPrice: number(raw, 1, Number(s.chokePrice || 500), "Current price ($)"),
    });
  }
  if (action === "ECON_SET_CHOKE_PRICE") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    const cp = number(raw, 20, 500, "Choke price ($)");
    return priceElasticityInitial({
      ...s,
      chokePrice: cp,
      currentPrice: Math.min(Number(s.currentPrice), cp - 1),
    });
  }
  if (action === "ECON_SET_MAX_QUANTITY") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return priceElasticityInitial({
      ...s,
      maxQuantity: number(raw, 10, 1000, "Max quantity (units)"),
    });
  }
  throw new Error(`Unsupported price elasticity operation: ${action}`);
}

export function priceElasticityMeasure(s: State): State {
  const p = priceElasticityInitial(s);
  const a = p.chokePrice;
  const qMax = p.maxQuantity;
  const price = Math.min(Math.max(0, p.currentPrice), a);

  // Linear demand slope magnitude |dP/dQ| = a / qMax
  const slope = a / Math.max(1e-6, qMax);

  // Q = Qmax * (1 - P / a)
  const qty = Math.max(0, qMax * (1 - price / a));

  // Point elasticity |Ed| = (P / Q) * (1 / slope)
  // Protected against division by zero when qty = 0 or price = a
  const elasticity = (a - price > 0.001 && qty > 0.001)
    ? Math.min(999, (price / qty) * (1 / slope))
    : (price <= 0 ? 0 : 999);

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
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return costAndProfitInitial({
      ...s,
      marketPrice: number(raw, 1, 100, "Market price ($/unit)"),
    });
  }
  if (action === "ECON_SET_FIXED_COST") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return costAndProfitInitial({
      ...s,
      fixedCost: number(raw, 0, 500, "Fixed cost ($)"),
    });
  }
  throw new Error(`Unsupported cost and profit operation: ${action}`);
}

export function costAndProfitMeasure(s: State): State {
  const p = costAndProfitInitial(s);
  const fc = Math.max(0, p.fixedCost);
  const v = Math.max(0, p.linearCost);
  const c = Math.max(1e-4, p.quadraticCost);
  const price = Math.max(0, p.marketPrice);

  // Shutdown price threshold: min(AVC) = v
  const shutdownPrice = v;

  // Long-run break-even price threshold: min(ATC) = v + 2*sqrt(c * fc)
  const breakEvenPrice = v + 2 * Math.sqrt(Math.max(0, c * fc));

  // Profit maximization: MR = MC -> P = 2*c*q + v -> q* = (P - v) / (2c)
  // Subject to shutdown condition P >= shutdownPrice
  let optimalQ = 0;
  if (price > shutdownPrice) {
    optimalQ = Math.max(0, (price - v) / (2 * c));
  }

  const tr = price * optimalQ;
  const vc = c * optimalQ * optimalQ + v * optimalQ;
  const tc = fc + vc;
  const profit = tr - tc;

  const mc = optimalQ > 0 ? 2 * c * optimalQ + v : v;
  const atc = optimalQ > 0 ? tc / optimalQ : (fc === 0 ? v : 0);
  const avc = optimalQ > 0 ? vc / optimalQ : v;

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

// ---------------------------------------------------------------------------
// 4. Trade, Tariffs & Import Quotas Model
// ---------------------------------------------------------------------------

export function tradeAndTariffsInitial(p: State): TradeAndTariffsState {
  return {
    demandIntercept: number(p.demandIntercept ?? 120, 40, 300, "Demand intercept ($)"),
    demandSlope: number(p.demandSlope ?? 1.0, 0.1, 5.0, "Demand slope ($/unit)"),
    supplyIntercept: number(p.supplyIntercept ?? 10, 0, 100, "Supply intercept ($)"),
    supplySlope: number(p.supplySlope ?? 1.0, 0.1, 5.0, "Supply slope ($/unit)"),
    worldPrice: number(p.worldPrice ?? 40, 10, 150, "World price ($)"),
    tariff: number(p.tariff ?? 15, 0, 80, "Import tariff ($/unit)"),
  };
}

export function tradeAndTariffsApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "ECON_SET_TARIFF") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return tradeAndTariffsInitial({
      ...s,
      tariff: number(raw, 0, 80, "Import tariff ($/unit)"),
    });
  }
  if (action === "ECON_SET_WORLD_PRICE") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return tradeAndTariffsInitial({
      ...s,
      worldPrice: number(raw, 10, 150, "World price ($)"),
    });
  }
  if (action === "ECON_SET_DOMESTIC_DEMAND") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return tradeAndTariffsInitial({
      ...s,
      demandIntercept: number(raw, 40, 300, "Demand intercept ($)"),
    });
  }
  if (action === "ECON_SET_DOMESTIC_SUPPLY") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return tradeAndTariffsInitial({
      ...s,
      supplyIntercept: number(raw, 0, 100, "Supply intercept ($)"),
    });
  }
  throw new Error(`Unsupported trade and tariffs operation: ${action}`);
}

export function tradeAndTariffsMeasure(s: State): State {
  const p = tradeAndTariffsInitial(s);
  const d0 = p.demandIntercept;
  const b = p.demandSlope;
  const s0 = p.supplyIntercept;
  const d = p.supplySlope;
  const pw = p.worldPrice;
  const t = Math.max(0, p.tariff);

  const slopeSum = Math.max(1e-6, b + d);
  const pAutarky = (d0 * d + s0 * b) / slopeSum;
  const qAutarky = Math.max(0, (d0 - s0) / slopeSum);

  // Effective domestic price: capped at autarky price (prohibitive tariff condition)
  const domesticP = Math.min(pAutarky, Math.max(pw, pw + t));
  const priceWedge = Math.max(0, domesticP - pw);

  // Free trade baseline quantities (at Pw)
  const freeQd = Math.max(0, (d0 - pw) / Math.max(1e-6, b));
  const freeQs = pw > s0 ? Math.max(0, (pw - s0) / Math.max(1e-6, d)) : 0;

  // Quantities under tariff (at domesticP)
  const qd = Math.max(0, (d0 - domesticP) / Math.max(1e-6, b));
  const qs = domesticP > s0 ? Math.max(0, (domesticP - s0) / Math.max(1e-6, d)) : 0;
  const imports = Math.max(0, qd - qs);

  // Welfare redistribution relative to free trade baseline at Pw
  // Consumer surplus loss: area of trapezoid between Pw and domesticP
  const csLoss = Math.max(0, 0.5 * (freeQd + qd) * priceWedge);

  // Producer surplus gain: area of trapezoid between Pw and domesticP
  const psGain = Math.max(0, 0.5 * (freeQs + qs) * priceWedge);

  // Tariff revenue collected: priceWedge * imports
  const tariffRevenue = Math.max(0, priceWedge * imports);

  // Dual deadweight loss components
  // 1. Production efficiency loss (producing at higher domestic marginal cost than world price)
  const dwlProd = Math.max(0, 0.5 * (qs - freeQs) * priceWedge);

  // 2. Consumption efficiency loss (domestic consumers priced out)
  const dwlCons = Math.max(0, 0.5 * (freeQd - qd) * priceWedge);

  const totalDwl = Math.max(0, dwlProd + dwlCons);

  // Sample points for Supply and Demand curves
  const maxQ = Math.max(30, Math.ceil(Math.max(freeQd, qAutarky) * 1.5));
  const step = maxQ / 24;
  const points = Array.from({ length: 25 }, (_, i) => {
    const q = i * step;
    return {
      x: Math.round(q * 10) / 10,
      y: Math.max(0, Math.round((d0 - b * q) * 100) / 100), // Demand
      supply_y: Math.max(0, Math.round((s0 + d * q) * 100) / 100), // Supply
      world_price: pw,
      domestic_price: Math.round(domesticP * 100) / 100,
    };
  });

  return {
    demandIntercept: d0,
    demandSlope: b,
    supplyIntercept: s0,
    supplySlope: d,
    worldPrice: pw,
    tariff: t,
    autarkyPrice: Math.round(pAutarky * 100) / 100,
    autarkyQuantity: Math.round(qAutarky * 100) / 100,
    domesticPrice: Math.round(domesticP * 100) / 100,
    domesticProduction: Math.round(qs * 100) / 100,
    domesticConsumption: Math.round(qd * 100) / 100,
    imports: Math.round(imports * 100) / 100,
    tariffRevenue: Math.round(tariffRevenue * 100) / 100,
    consumerSurplusLoss: Math.round(csLoss * 100) / 100,
    producerSurplusGain: Math.round(psGain * 100) / 100,
    deadweightLossProd: Math.round(dwlProd * 100) / 100,
    deadweightLossCons: Math.round(dwlCons * 100) / 100,
    deadweightLoss: Math.round(totalDwl * 100) / 100,
    points,
  };
}

// ---------------------------------------------------------------------------
// 5. Monopoly Pricing & Deadweight Loss Model
// ---------------------------------------------------------------------------

export function monopolyPricingInitial(p: State): MonopolyPricingState {
  return {
    demandIntercept: number(p.demandIntercept ?? 120, 50, 300, "Demand intercept ($)"),
    demandSlope: number(p.demandSlope ?? 1.0, 0.2, 5.0, "Demand slope ($/unit)"),
    marginalCostSlope: number(p.marginalCostSlope ?? 0.2, 0, 2.0, "MC slope ($/unit²)"),
    marginalCostBase: number(p.marginalCostBase ?? 20, 0, 50, "Base MC ($/unit)"),
    fixedCost: number(p.fixedCost ?? 100, 0, 500, "Fixed cost ($)"),
  };
}

export function monopolyPricingApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "ECON_SET_DEMAND_INTERCEPT" || action === "ECON_SET_MONOPOLY_DEMAND") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return monopolyPricingInitial({
      ...s,
      demandIntercept: number(raw, 50, 300, "Demand intercept ($)"),
    });
  }
  if (action === "ECON_SET_MARGINAL_COST_BASE") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return monopolyPricingInitial({
      ...s,
      marginalCostBase: number(raw, 0, 50, "Base MC ($/unit)"),
    });
  }
  if (action === "ECON_SET_MONOPOLY_FIXED_COST" || action === "ECON_SET_FIXED_COST") {
    const raw =
      typeof value === "object" && value !== null && "value" in value
        ? (value as Record<string, unknown>).value
        : value;
    return monopolyPricingInitial({
      ...s,
      fixedCost: number(raw, 0, 500, "Fixed cost ($)"),
    });
  }
  throw new Error(`Unsupported monopoly pricing operation: ${action}`);
}

export function monopolyPricingMeasure(s: State): State {
  const p = monopolyPricingInitial(s);
  const a = p.demandIntercept;
  const b = p.demandSlope;
  const c = p.marginalCostSlope;
  const v = p.marginalCostBase;
  const fc = p.fixedCost;

  // 1. Monopoly profit maximization: MR = MC
  // MR = a - 2b*Q, MC = c*Q + v -> (2b + c)*Q = a - v
  const mrMcDenominator = Math.max(1e-6, 2 * b + c);
  const qMonopoly = a > v ? Math.max(0, (a - v) / mrMcDenominator) : 0;
  const pMonopoly = Math.max(0, a - b * qMonopoly);
  const mcAtMonopoly = c * qMonopoly + v;

  // Mark-up over marginal cost
  const markup = Math.max(0, pMonopoly - mcAtMonopoly);

  // Lerner index of market power: (P - MC) / P
  const lernerIndex = pMonopoly > 0.001 ? Math.min(1, Math.max(0, markup / pMonopoly)) : 0;

  // Monopoly financial metrics
  const tr = pMonopoly * qMonopoly;
  const tc = fc + 0.5 * c * qMonopoly * qMonopoly + v * qMonopoly;
  const profit = tr - tc;

  // 2. Competitive benchmark: P = MC
  // a - b*Q = c*Q + v -> (b + c)*Q = a - v
  const compDenominator = Math.max(1e-6, b + c);
  const qCompetitive = a > v ? Math.max(0, (a - v) / compDenominator) : 0;
  const pCompetitive = Math.max(0, a - b * qCompetitive);

  // 3. Welfare analysis
  // Consumer surplus under monopoly: 0.5 * (a - Pm) * Qm
  const csMonopoly = Math.max(0, 0.5 * (a - pMonopoly) * qMonopoly);

  // Deadweight loss triangle: 0.5 * (Pm - MC(Qm)) * (Qc - Qm)
  const dwl = Math.max(0, 0.5 * markup * (qCompetitive - qMonopoly));

  // Curve sample points over [0, maxQ]
  const maxQ = Math.max(30, Math.ceil(Math.max(qCompetitive, qMonopoly) * 1.5));
  const step = maxQ / 24;
  const points = Array.from({ length: 25 }, (_, i) => {
    const q = i * step;
    return {
      x: Math.round(q * 10) / 10,
      demand: Math.max(0, Math.round((a - b * q) * 100) / 100),
      mr: Math.round((a - 2 * b * q) * 100) / 100,
      mc: Math.round((c * q + v) * 100) / 100,
    };
  });

  return {
    demandIntercept: a,
    demandSlope: b,
    marginalCostSlope: c,
    marginalCostBase: v,
    fixedCost: fc,
    monopolyQuantity: Math.round(qMonopoly * 100) / 100,
    monopolyPrice: Math.round(pMonopoly * 100) / 100,
    competitiveQuantity: Math.round(qCompetitive * 100) / 100,
    competitivePrice: Math.round(pCompetitive * 100) / 100,
    marginalCostAtMonopoly: Math.round(mcAtMonopoly * 100) / 100,
    markup: Math.round(markup * 100) / 100,
    lernerIndex: Math.round(lernerIndex * 1000) / 1000,
    totalRevenue: Math.round(tr * 100) / 100,
    totalCost: Math.round(tc * 100) / 100,
    monopolyProfit: Math.round(profit * 100) / 100,
    consumerSurplus: Math.round(csMonopoly * 100) / 100,
    deadweightLoss: Math.round(dwl * 100) / 100,
    points,
  };
}

