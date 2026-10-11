/** Shared immutable defaults for economics simulation models. */
export const economicsDefaults = Object.freeze({
  marketEquilibrium: Object.freeze({
    demandIntercept: 100,
    demandSlope: 1.0,
    supplyIntercept: 20,
    supplySlope: 1.0,
    priceControl: 0,
    tax: 0,
  }),
  priceElasticity: Object.freeze({
    chokePrice: 100,
    maxQuantity: 100,
    currentPrice: 50,
  }),
  costAndProfit: Object.freeze({
    fixedCost: 50,
    linearCost: 5,
    quadraticCost: 0.5,
    marketPrice: 25,
  }),
  tradeAndTariffs: Object.freeze({
    demandIntercept: 120,
    demandSlope: 1.0,
    supplyIntercept: 10,
    supplySlope: 1.0,
    worldPrice: 40,
    tariff: 15,
  }),
  monopolyPricing: Object.freeze({
    demandIntercept: 120,
    demandSlope: 1.0,
    marginalCostSlope: 0.2,
    marginalCostBase: 20,
    fixedCost: 100,
  }),
});

