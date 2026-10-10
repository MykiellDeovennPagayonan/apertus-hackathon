/** Instance-local data. Only the corresponding economics system writes these fields. */

export type MarketEquilibriumState = Record<string, unknown> & {
  demandIntercept: number;
  demandSlope: number;
  supplyIntercept: number;
  supplySlope: number;
  priceControl: number;
  tax: number;
};

export type PriceElasticityState = Record<string, unknown> & {
  chokePrice: number;
  maxQuantity: number;
  currentPrice: number;
};

export type CostAndProfitState = Record<string, unknown> & {
  fixedCost: number;
  linearCost: number;
  quadraticCost: number;
  marketPrice: number;
};
