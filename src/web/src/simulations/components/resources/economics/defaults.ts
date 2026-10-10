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
});
