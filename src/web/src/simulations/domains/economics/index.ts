import { economicsDefaults } from "../../components/resources/economics/defaults";
import {
  costAndProfitApply,
  costAndProfitInitial,
  costAndProfitMeasure,
  marketEquilibriumApply,
  marketEquilibriumInitial,
  marketEquilibriumMeasure,
  priceElasticityApply,
  priceElasticityInitial,
  priceElasticityMeasure,
} from "../../components/systems/economics/models";
import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import {
  num,
  object,
  type ParameterSchema,
} from "../../runtime/parameterSchema";

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

/** Independent knowledge domain contribution for Economics. */
export const economics: DomainContribution = {
  namespace: "economics",
  version: 1,
  models: [marketEquilibrium, priceElasticity, costAndProfit],
};
