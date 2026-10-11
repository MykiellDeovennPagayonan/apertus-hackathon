import type { PublicDefinition } from "../../runtime/authoring/types";
export interface CompositionRequirements {
  topic: string;
  guidance?: string;
  instanceNoun?: string;
  selectionKey: string;
  commands: string[];
  observations: string[];
  appearance?: string;
  dependencies?: string[];
  minimumInstances?: number;
}
export const compositionRequirements: Record<string, CompositionRequirements> =
  {
    "prefabs/physical-systems/Pendulum": {
      topic: "Pendulum simulation",
      guidance:
        "Explore how length changes swing time at a fixed starting angle, then try larger starting angles up to 90°. Nonlinear period increases with amplitude; T≈2π√(L/g) is only the small-angle limit. Compare successive settings on the same pendulum. The drawing uses a fixed metre scale; changing length must visibly change the rod length.",
      selectionKey: "pendulum",
      commands: ["PEND_SET_LENGTH", "PEND_SET_AMPLITUDE", "PHYS_PLAY"],
      observations: ["period"],
      appearance: "appearance/physical-pendulum",
    },
    "prefabs/dynamic-systems/RingTraffic": {
      topic: "Traffic jam simulation",
      guidance:
        "Compare an undisturbed run and a braking run after reset with the same settings. Headway changes following behavior; congestion depends on density and parameters. Braking is a temporary disturbance, not an accident.",
      selectionKey: "traffic",
      commands: ["TRAFFIC_BRAKE", "TRAFFIC_SET_HEADWAY", "TRAFFIC_SET_PLAYING"],
      observations: ["averageSpeed"],
      appearance: "appearance/dynamic-traffic",
    },
    "prefabs/physical-systems/ResistiveCircuit": {
      topic: "Circuit bulbs in series and parallel",
      selectionKey: "circuit",
      commands: ["CIRC_SET_BULBS", "CIRC_SET_TOPOLOGY"],
      observations: ["bulbPower"],
      appearance: "appearance/physical-circuit",
    },
    "models/EclipseGeometry": {
      topic: "Solar and lunar eclipse geometry",
      selectionKey: "eclipse",
      commands: ["set:moonAngle", "set:moonOffset", "set:moonDistance"],
      observations: ["event"],
      appearance: "appearance/EclipseGeometry",
    },
    "models/SinusoidalSignal": {
      topic: "Sound pressure signal",
      instanceNoun: "Signal",
      selectionKey: "signal",
      commands: ["set:phase", "set:amplitude", "set:frequency"],
      observations: [],
      minimumInstances: 2,
      dependencies: ["data/SignalSuperposition"],
    },
    "data/SignalSuperposition": {
      topic: "Noise cancelling headphones",
      selectionKey: "headphones",
      commands: [],
      observations: ["residualPeak"],
      appearance: "appearance/SignalSuperposition",
      dependencies: ["models/SinusoidalSignal"],
    },
    "prefabs/chemistry/Conservation": {
      topic: "Balancing chemical equations and atom conservation",
      selectionKey: "conservation",
      commands: ["CHEM_SET_COEFFICIENTS"],
      observations: ["equation", "balanced"],
      appearance: "appearance/chemistry-conservation",
    },
    "prefabs/chemistry/PhaseChange": {
      topic: "Phases of matter and supercritical fluids",
      selectionKey: "phases",
      commands: ["CHEM_SET_PHASE_TEMP", "CHEM_SET_PHASE_PRESSURE"],
      observations: ["phase", "density"],
      appearance: "appearance/chemistry-phase-change",
    },
    "prefabs/chemistry/AcidBaseTitration": {
      topic: "Acid-base titration and neutralization",
      selectionKey: "titration",
      commands: ["CHEM_SET_TITRANT_VOLUME"],
      observations: ["currentPH"],
      appearance: "appearance/chemistry-titration",
    },
    "prefabs/chemistry/GasEquilibrium": {
      topic: "Gas equilibrium and Le Chatelier principle",
      selectionKey: "gas-equilibrium",
      commands: ["CHEM_SET_EQ_TEMP", "CHEM_SET_EQ_VOLUME"],
      observations: ["equilibriumConstant", "totalPressure"],
      appearance: "appearance/chemistry-gas-equilibrium",
    },
    "prefabs/chemistry/BeerLambert": {
      topic: "Beer-Lambert law and spectrophotometry",
      selectionKey: "beer-lambert",
      commands: [
        "CHEM_SET_BEER_CONCENTRATION",
        "CHEM_SET_BEER_PATH_LENGTH",
        "CHEM_SET_BEER_EPSILON",
      ],
      observations: ["absorbance", "transmittance"],
      appearance: "appearance/chemistry-beer-lambert",
    },
    "prefabs/chemistry/GalvanicCell": {
      topic: "Galvanic cell and Nernst equation",
      selectionKey: "galvanic-cell",
      commands: ["CHEM_SET_ZN_CONC", "CHEM_SET_CU_CONC"],
      observations: ["cellPotential", "reactionQuotient"],
      appearance: "appearance/chemistry-galvanic-cell",
    },
    "prefabs/chemistry/ReactionRate": {
      topic: "Reaction rate and chemical kinetics",
      selectionKey: "reaction-rate",
      commands: ["CHEM_SET_TEMPERATURE"],
      observations: ["concentrationA", "rateConstant"],
      appearance: "appearance/chemistry-rate",
    },
    "prefabs/economics/MarketEquilibrium": {
      topic: "Market equilibrium and price controls",
      selectionKey: "market-equilibrium",
      commands: ["ECON_SET_PRICE_CONTROL"],
      observations: ["equilibriumPrice", "equilibriumQuantity"],
      appearance: "appearance/economics-market-equilibrium",
    },
    "prefabs/economics/PriceElasticity": {
      topic: "Price elasticity of demand and total revenue",
      selectionKey: "price-elasticity",
      commands: ["ECON_SET_PRICE"],
      observations: ["elasticity", "totalRevenue"],
      appearance: "appearance/economics-price-elasticity",
    },
    "prefabs/economics/CostAndProfit": {
      topic: "Production costs and profit maximization",
      selectionKey: "cost-profit",
      commands: ["ECON_SET_MARKET_PRICE"],
      observations: ["optimalQuantity", "economicProfit"],
      appearance: "appearance/economics-cost-and-profit",
    },
    "prefabs/economics/TradeAndTariffs": {
      topic: "Trade tariffs and deadweight loss with imports",
      selectionKey: "trade-tariffs",
      commands: ["ECON_SET_TARIFF"],
      observations: ["domesticPrice", "imports"],
      appearance: "appearance/economics-trade-and-tariffs",
    },
    "prefabs/economics/MonopolyPricing": {
      topic: "Monopoly pricing and deadweight loss with market power",
      selectionKey: "monopoly-pricing",
      commands: ["ECON_SET_DEMAND_INTERCEPT"],
      observations: ["monopolyPrice", "deadweightLoss"],
      appearance: "appearance/economics-monopoly-pricing",
    },
  };
export function applyExplorationTeaching(
  definitions: Map<string, PublicDefinition>,
) {
  for (const [id, requirements] of Object.entries(compositionRequirements)) {
    const d = definitions.get(id);
    if (!d) throw new Error(`Missing exploration model ${id}`);
    for (const command of requirements.commands)
      if (!d.commands[command])
        throw new Error(`Missing exploration command ${id}.${command}`);
    for (const output of requirements.observations)
      if (!d.outputs[output])
        throw new Error(`Missing exploration output ${id}.${output}`);
    if (requirements.appearance && !definitions.has(requirements.appearance))
      throw new Error(`Missing exploration appearance ${id}`);
  }
}
