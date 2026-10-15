import { economicsDefaults } from "../../legacy/components/resources/economics/defaults";
import {
  costAndProfitApply,
  costAndProfitInitial,
  costAndProfitMeasure,
  marketEquilibriumApply,
  marketEquilibriumInitial,
  marketEquilibriumMeasure,
  monopolyPricingApply,
  monopolyPricingInitial,
  monopolyPricingMeasure,
  priceElasticityApply,
  priceElasticityInitial,
  priceElasticityMeasure,
  tradeAndTariffsApply,
  tradeAndTariffsInitial,
  tradeAndTariffsMeasure,
} from "../../legacy/components/systems/economics/models";
import type {
  DomainContribution,
  DomainModel,
} from "../../registry/contracts/domainContribution";
import {
  num,
  object,
  type ParameterSchema,
} from "../../registry/contracts/parameterSchema";

const action = (
  value: ParameterSchema | undefined,
  description: string,
  timing: "live" | "relaunch" = "live",
) => ({
  arguments: object(value ? { value } : {}),
  description,
  timing,
  target: "instance" as const,
});

const dependencies = (name: string, system: string) => ({
  resources: ["economics/EducationalDefaults"],
  traits: [`economics/${name}State`],
  behaviors: [],
  systems: [`economics/${system}`],
  visuals: [`economics/${name}Visual`],
  views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
  controls: ["AssemblyControls"],
  prefabs: [`economics/${name}`],
  compositions: [],
});

const output = (unit: string, description: string) => ({ unit, description });

export const marketEquilibrium: DomainModel = {
  ref: "prefabs/economics/MarketEquilibrium",
  version: 1,
  name: "Market equilibrium and price controls",
  presentation: "economics-market-equilibrium",
  maximumInstances: 2,
  description:
    "Supply and demand intersection determining market equilibrium price and quantity. Explore price ceilings, price floors, per-unit excise taxes, consumer surplus, producer surplus, and deadweight loss.",
  assumptions: [
    "Competitive market with linear demand and supply curves.",
    "Price ceilings below equilibrium create shortages; price floors above equilibrium create surpluses. Taxes create a price wedge between buyers and sellers.",
  ],
  parameters: object(
    {
      demandIntercept: num(40, 300, "$"),
      demandSlope: num(0.1, 5, "$/unit"),
      supplyIntercept: num(0, 100, "$"),
      supplySlope: num(0.1, 5, "$/unit"),
      priceControl: num(0, 300, "$"),
      tax: num(0, 50, "$/unit"),
    },
    [
      "demandIntercept",
      "demandSlope",
      "supplyIntercept",
      "supplySlope",
      "priceControl",
      "tax",
    ],
  ),
  defaults: { ...economicsDefaults.marketEquilibrium },
  outputs: {
    demandIntercept: output("$", "Maximum willingness to pay"),
    demandSlope: output("$/unit", "Demand price responsiveness"),
    supplyIntercept: output("$", "Minimum supply threshold price"),
    supplySlope: output("$/unit", "Supply price responsiveness"),
    priceControl: output("$", "Government price ceiling or floor"),
    tax: output("$/unit", "Per-unit excise tax"),
    equilibriumPrice: output("$", "Equilibrium clearing price"),
    equilibriumQuantity: output("units", "Equilibrium market quantity"),
    actualPrice: output("$", "Effective transaction price"),
    actualQuantity: output("units", "Effective traded volume"),
    consumerSurplus: output("$", "Consumer surplus value"),
    producerSurplus: output("$", "Producer surplus value"),
    taxRevenue: output("$", "Government tax revenue collected"),
    deadweightLoss: output("$", "Deadweight loss from distortion"),
    shortageOrSurplus: output("units", "Market shortage (positive) or surplus (negative)"),
    points: output("$", "Supply and demand curve points"),
  },
  requiredObservations: [
    "equilibriumPrice",
    "equilibriumQuantity",
    "actualPrice",
    "actualQuantity",
    "consumerSurplus",
    "producerSurplus",
    "points",
  ],
  graphOutput: "points",
  actions: {
    ECON_SET_DEMAND: action(
      num(40, 300, "$"),
      "Adjust demand intercept to shift market demand curve",
    ),
    ECON_SET_SUPPLY: action(
      num(0, 100, "$"),
      "Adjust supply intercept to shift market supply curve",
    ),
    ECON_SET_PRICE_CONTROL: action(
      num(0, 300, "$"),
      "Set price ceiling or price floor control",
    ),
    ECON_SET_TAX: action(
      num(0, 50, "$/unit"),
      "Set per-unit excise tax wedge",
    ),
  },
  dependencies: dependencies("MarketEquilibrium", "EquilibriumSystem"),
  initialize: marketEquilibriumInitial,
  apply: marketEquilibriumApply,
  measure: marketEquilibriumMeasure,
  configuration: (s) => ({ ...s }),
};

export const priceElasticity: DomainModel = {
  ref: "prefabs/economics/PriceElasticity",
  version: 1,
  name: "Price elasticity of demand and total revenue",
  presentation: "economics-price-elasticity",
  maximumInstances: 2,
  description:
    "Point price elasticity of demand along a linear demand curve. Observe price sensitivity transitions from elastic to unit-elastic to inelastic, and how total revenue peaks at unit elasticity.",
  assumptions: [
    "Linear demand curve P = a - b*Q where elasticity varies at every point along the line.",
    "Total revenue is maximized where point price elasticity equals exactly 1 (unit elastic).",
  ],
  parameters: object(
    {
      chokePrice: num(20, 500, "$"),
      maxQuantity: num(10, 1000, "units"),
      currentPrice: num(1, 500, "$"),
    },
    ["chokePrice", "maxQuantity", "currentPrice"],
  ),
  defaults: { ...economicsDefaults.priceElasticity },
  outputs: {
    chokePrice: output("$", "Price where demand drops to zero"),
    maxQuantity: output("units", "Quantity demanded at zero price"),
    currentPrice: output("$", "Current price charged"),
    currentQuantity: output("units", "Quantity demanded at current price"),
    elasticity: output("1", "Point price elasticity of demand"),
    totalRevenue: output("$", "Total sales revenue (Price × Quantity)"),
    elasticityRegime: output("regime", "Demand sensitivity regime"),
    revenueMaximizingPrice: output("$", "Price maximizing total revenue"),
    revenueMaximizingQuantity: output("units", "Quantity maximizing total revenue"),
    maxRevenue: output("$", "Maximum attainable revenue"),
    points: output("units", "Demand and revenue curve coordinates"),
  },
  requiredObservations: [
    "currentPrice",
    "currentQuantity",
    "elasticity",
    "totalRevenue",
    "revenueMaximizingPrice",
    "points",
  ],
  graphOutput: "points",
  actions: {
    ECON_SET_PRICE: action(
      num(1, 500, "$"),
      "Set current selling price along the demand curve",
    ),
    ECON_SET_CHOKE_PRICE: action(
      num(20, 500, "$"),
      "Set maximum choke price where demand reaches zero",
    ),
    ECON_SET_MAX_QUANTITY: action(
      num(10, 1000, "units"),
      "Set market size maximum quantity demanded at price zero",
    ),
  },
  dependencies: dependencies("PriceElasticity", "ElasticitySystem"),
  initialize: priceElasticityInitial,
  apply: priceElasticityApply,
  measure: priceElasticityMeasure,
  configuration: (s) => ({ ...s }),
};

export const costAndProfit: DomainModel = {
  ref: "prefabs/economics/CostAndProfit",
  version: 1,
  name: "Firm production costs and profit maximization",
  presentation: "economics-cost-and-profit",
  maximumInstances: 2,
  description:
    "Short-run production cost curves (MC, ATC, AVC) and competitive firm profit maximization where Marginal Revenue equals Marginal Cost (MR = MC).",
  assumptions: [
    "Competitive price-taking firm where price equals marginal revenue.",
    "Profit maximization occurs where MR = MC, provided price covers average variable cost (shutdown rule).",
  ],
  parameters: object(
    {
      fixedCost: num(0, 500, "$"),
      linearCost: num(0, 50, "$/unit"),
      quadraticCost: num(0.05, 5, "$/unit²"),
      marketPrice: num(1, 100, "$/unit"),
    },
    ["fixedCost", "linearCost", "quadraticCost", "marketPrice"],
  ),
  defaults: { ...economicsDefaults.costAndProfit },
  outputs: {
    fixedCost: output("$", "Overhead fixed cost"),
    linearCost: output("$/unit", "Linear cost factor"),
    quadraticCost: output("$/unit²", "Diminishing returns quadratic cost factor"),
    marketPrice: output("$/unit", "Prevailing market price"),
    optimalQuantity: output("units", "Profit-maximizing output quantity"),
    totalRevenue: output("$", "Total revenue earned"),
    totalCost: output("$", "Total production cost"),
    economicProfit: output("$", "Economic profit or loss"),
    marginalCost: output("$/unit", "Marginal cost at optimal quantity"),
    averageTotalCost: output("$/unit", "Average total cost per unit"),
    averageVariableCost: output("$/unit", "Average variable cost per unit"),
    shutdownPrice: output("$/unit", "Short-run shutdown price threshold"),
    breakEvenPrice: output("$/unit", "Long-run break-even price threshold"),
    points: output("$/unit", "Cost curve coordinates (MC, ATC, AVC)"),
  },
  requiredObservations: [
    "marketPrice",
    "optimalQuantity",
    "totalRevenue",
    "totalCost",
    "economicProfit",
    "marginalCost",
    "averageTotalCost",
    "points",
  ],
  graphOutput: "points",
  actions: {
    ECON_SET_MARKET_PRICE: action(
      num(1, 100, "$/unit"),
      "Set prevailing market price for the competitive firm",
    ),
    ECON_SET_FIXED_COST: action(
      num(0, 500, "$"),
      "Adjust fixed overhead production costs",
    ),
  },
  dependencies: dependencies("CostAndProfit", "ProductionCostSystem"),
  initialize: costAndProfitInitial,
  apply: costAndProfitApply,
  measure: costAndProfitMeasure,
  configuration: (s) => ({ ...s }),
};

export const tradeAndTariffs: DomainModel = {
  ref: "prefabs/economics/TradeAndTariffs",
  version: 1,
  name: "Trade, tariffs and import quotas",
  presentation: "economics-trade-and-tariffs",
  maximumInstances: 2,
  description:
    "Domestic supply and demand interacting with world price P_w and import tariff t. Explore domestic production Q_s, consumption Q_d, import volume, consumer surplus loss, producer surplus gain, tariff revenue box, and dual deadweight loss triangles.",
  assumptions: [
    "Small open economy taking world price P_w as given.",
    "Import tariff t raises domestic price to min(P_autarky, P_w + t); if tariff is prohibitive, imports drop to zero and domestic market clears at autarky equilibrium.",
  ],
  parameters: object(
    {
      demandIntercept: num(40, 300, "$"),
      demandSlope: num(0.1, 5, "$/unit"),
      supplyIntercept: num(0, 100, "$"),
      supplySlope: num(0.1, 5, "$/unit"),
      worldPrice: num(10, 150, "$"),
      tariff: num(0, 80, "$/unit"),
    },
    [
      "demandIntercept",
      "demandSlope",
      "supplyIntercept",
      "supplySlope",
      "worldPrice",
      "tariff",
    ],
  ),
  defaults: { ...economicsDefaults.tradeAndTariffs },
  outputs: {
    demandIntercept: output("$", "Maximum domestic willingness to pay"),
    demandSlope: output("$/unit", "Domestic demand price slope"),
    supplyIntercept: output("$", "Minimum domestic supply threshold price"),
    supplySlope: output("$/unit", "Domestic supply price slope"),
    worldPrice: output("$", "World market clearing price"),
    tariff: output("$/unit", "Per-unit import tariff"),
    autarkyPrice: output("$", "Domestic price without trade (autarky)"),
    autarkyQuantity: output("units", "Domestic quantity without trade"),
    domesticPrice: output("$", "Effective domestic price (Pw + tariff)"),
    domesticProduction: output("units", "Domestic quantity supplied (Qs)"),
    domesticConsumption: output("units", "Domestic quantity demanded (Qd)"),
    imports: output("units", "Volume of imports (Qd - Qs)"),
    tariffRevenue: output("$", "Government tariff revenue collected"),
    consumerSurplusLoss: output("$", "Consumer surplus loss relative to free trade"),
    producerSurplusGain: output("$", "Producer surplus gain relative to free trade"),
    deadweightLossProd: output("$", "Production efficiency loss triangle"),
    deadweightLossCons: output("$", "Consumption efficiency loss triangle"),
    deadweightLoss: output("$", "Total deadweight loss (DWL prod + DWL cons)"),
    points: output("$", "Supply and demand curve points"),
  },
  requiredObservations: [
    "worldPrice",
    "domesticPrice",
    "domesticProduction",
    "domesticConsumption",
    "imports",
    "tariffRevenue",
    "deadweightLoss",
    "points",
  ],
  graphOutput: "points",
  actions: {
    ECON_SET_TARIFF: action(
      num(0, 80, "$/unit"),
      "Set per-unit import tariff rate",
    ),
    ECON_SET_WORLD_PRICE: action(
      num(10, 150, "$"),
      "Set prevailing world market price",
    ),
    ECON_SET_DOMESTIC_DEMAND: action(
      num(40, 300, "$"),
      "Shift domestic demand curve intercept",
    ),
    ECON_SET_DOMESTIC_SUPPLY: action(
      num(0, 100, "$"),
      "Shift domestic supply curve intercept",
    ),
  },
  dependencies: dependencies("TradeAndTariffs", "TradeTariffSystem"),
  initialize: tradeAndTariffsInitial,
  apply: tradeAndTariffsApply,
  measure: tradeAndTariffsMeasure,
  configuration: (s) => ({ ...s }),
};

export const monopolyPricing: DomainModel = {
  ref: "prefabs/economics/MonopolyPricing",
  version: 1,
  name: "Monopoly pricing and deadweight loss",
  presentation: "economics-monopoly-pricing",
  maximumInstances: 2,
  description:
    "Single-price monopoly equilibrium where Marginal Revenue equals Marginal Cost (MR = MC) compared against the socially optimal competitive benchmark (P = MC). Observe monopoly price mark-up, economic profit box, deadweight loss triangle, and Lerner index of market power.",
  assumptions: [
    "Monopolist faces downward-sloping linear market demand P = a - bQ.",
    "Marginal revenue has identical intercept a and twice the slope: MR = a - 2bQ.",
    "Monopoly profit maximization occurs at MR = MC; competitive social optimum occurs at P = MC.",
  ],
  parameters: object(
    {
      demandIntercept: num(50, 300, "$"),
      demandSlope: num(0.2, 5, "$/unit"),
      marginalCostSlope: num(0, 2, "$/unit²"),
      marginalCostBase: num(0, 50, "$/unit"),
      fixedCost: num(0, 500, "$"),
    },
    [
      "demandIntercept",
      "demandSlope",
      "marginalCostSlope",
      "marginalCostBase",
      "fixedCost",
    ],
  ),
  defaults: { ...economicsDefaults.monopolyPricing },
  outputs: {
    demandIntercept: output("$", "Market demand choke price"),
    demandSlope: output("$/unit", "Market demand slope coefficient"),
    marginalCostBase: output("$/unit", "Baseline marginal cost"),
    marginalCostSlope: output("$/unit²", "Marginal cost slope coefficient"),
    fixedCost: output("$", "Overhead fixed cost"),
    monopolyQuantity: output("units", "Monopoly output quantity where MR = MC"),
    monopolyPrice: output("$", "Monopoly profit-maximizing price"),
    competitiveQuantity: output("units", "Competitive benchmark output where P = MC"),
    competitivePrice: output("$", "Competitive benchmark price"),
    marginalCostAtMonopoly: output("$/unit", "Marginal cost at monopoly output"),
    markup: output("$/unit", "Price mark-up over marginal cost (P - MC)"),
    lernerIndex: output("ratio", "Lerner index of market power (P - MC)/P"),
    totalRevenue: output("$", "Total sales revenue earned"),
    totalCost: output("$", "Total production cost"),
    monopolyProfit: output("$", "Monopoly economic profit"),
    consumerSurplus: output("$", "Consumer surplus under monopoly"),
    deadweightLoss: output("$", "Deadweight loss from monopoly restriction"),
    points: output("$/unit", "Demand, MR, and MC curve coordinates"),
  },
  requiredObservations: [
    "monopolyQuantity",
    "monopolyPrice",
    "competitiveQuantity",
    "competitivePrice",
    "markup",
    "monopolyProfit",
    "deadweightLoss",
    "points",
  ],
  graphOutput: "points",
  actions: {
    ECON_SET_DEMAND_INTERCEPT: action(
      num(50, 300, "$"),
      "Adjust market demand choke price",
    ),
    ECON_SET_MARGINAL_COST_BASE: action(
      num(0, 50, "$/unit"),
      "Adjust base marginal cost",
    ),
    ECON_SET_MONOPOLY_FIXED_COST: action(
      num(0, 500, "$"),
      "Adjust fixed overhead production costs",
    ),
  },
  dependencies: dependencies("MonopolyPricing", "MonopolySystem"),
  initialize: monopolyPricingInitial,
  apply: monopolyPricingApply,
  measure: monopolyPricingMeasure,
  configuration: (s) => ({ ...s }),
};

/** Independent knowledge domain contribution for Economics. */
export const economics: DomainContribution = {
  namespace: "economics",
  version: 1,
  models: [
    marketEquilibrium,
    priceElasticity,
    costAndProfit,
    tradeAndTariffs,
    monopolyPricing,
  ],
};

