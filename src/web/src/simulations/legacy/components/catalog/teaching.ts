import type { PublicDefinition } from "../../../registry/contracts/publicDefinition";
export const arithmeticTeaching: PublicDefinition["teaching"] = {
  concepts: ["addition", "subtraction", "arithmetic", "whole numbers"],
  keywords: ["add", "sum", "subtract", "take away", "circles", "calculation"],
  interactions: [
    "change the two numbers",
    "press Add circles",
    "press Take away circles",
    "reset",
  ],
  observations: ["circles moving together or away", "calculation result"],
  limitations: [
    "Whole numbers and results from 0 to 20; subtraction cannot be negative.",
  ],
};
export const rectangleTeaching: PublicDefinition["teaching"] = {
  concepts: ["area", "perimeter", "rectangle", "dimensions"],
  keywords: [
    "rectangles",
    "width",
    "height",
    "side lengths",
    "metres",
    "square metres",
  ],
  interactions: [
    "change width",
    "change height",
    "compare independent rectangles",
    "reset",
  ],
  observations: [
    "area in m²",
    "perimeter in m",
    "proportional rectangle scene",
  ],
  limitations: [
    "Rectangles only. Equal perimeter at the start does not lock later exploration.",
  ],
};
export const bridgeTeaching: PublicDefinition["teaching"] = {
  concepts: ["truss bridge", "bridge load", "beam response", "support shares"],
  keywords: ["bridge", "truss", "beam", "member", "load", "supports", "tonne"],
  interactions: [
    "move the bridge load",
    "change load mass",
    "select a beam",
    "inspect beam response",
    "reset",
  ],
  observations: [
    "conceptual beam classification",
    "heuristic relative load score",
    "support load shares in tonnes",
  ],
  limitations: [
    "Exact engineering deflection in millimetres is unavailable. Response and illustrated sag are conceptual/heuristic, not engineering analysis.",
    "Friction and momentum are not simulated.",
  ],
};

export const marketEquilibriumTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "supply and demand",
    "market equilibrium",
    "equilibrium price",
    "price controls",
    "consumer surplus",
    "producer surplus",
  ],
  keywords: [
    "market",
    "equilibrium",
    "supply",
    "demand",
    "price ceiling",
    "price floor",
    "shortage",
    "surplus",
  ],
  interactions: [
    "set price control",
    "adjust demand",
    "adjust supply",
    "reset",
  ],
  observations: [
    "equilibrium price",
    "equilibrium quantity",
    "consumer surplus",
    "producer surplus",
  ],
  limitations: [
    "Competitive market with linear demand and supply schedules.",
  ],
};

export const priceElasticityTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "price elasticity of demand",
    "total revenue",
    "elastic and inelastic demand",
  ],
  keywords: [
    "price elasticity",
    "elasticity",
    "total revenue",
    "demand curve",
    "elastic",
    "inelastic",
    "choke price",
  ],
  interactions: [
    "change current price",
    "change choke price",
    "reset",
  ],
  observations: [
    "point elasticity |Ed|",
    "total revenue",
    "quantity demanded",
    "elasticity regime",
  ],
  limitations: [
    "Linear downward-sloping demand curve. Total revenue peaks at unit elasticity (|Ed| = 1).",
  ],
};

export const costAndProfitTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "firm production costs",
    "profit maximization",
    "marginal cost",
    "average total cost",
    "economic profit",
  ],
  keywords: [
    "profit",
    "cost",
    "marginal cost",
    "average cost",
    "market price",
    "break even",
    "shutdown",
  ],
  interactions: [
    "change market price",
    "change fixed cost",
    "reset",
  ],
  observations: [
    "optimal quantity",
    "economic profit",
    "marginal cost",
    "average total cost",
  ],
  limitations: [
    "Competitive price-taking firm with quadratic cost structure.",
  ],
};

export const tradeAndTariffsTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "trade tariffs",
    "tariffs and imports",
    "deadweight loss with imports",
    "world price",
    "tariff revenue",
    "import quota",
    "consumer surplus loss",
    "producer surplus gain",
  ],
  keywords: [
    "trade",
    "tariffs",
    "tariff",
    "imports",
    "import",
    "world price",
    "deadweight loss",
    "surplus",
    "protectionism",
    "autarky",
  ],
  interactions: [
    "change tariff rate",
    "change world price",
    "adjust domestic demand",
    "adjust domestic supply",
    "reset",
  ],
  observations: [
    "effective domestic price",
    "domestic production",
    "domestic consumption",
    "import volume",
    "tariff revenue collected",
    "deadweight loss",
  ],
  limitations: [
    "Small open economy model with linear domestic supply and demand curves taking world price P_w as given.",
  ],
};

export const monopolyPricingTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "monopoly pricing",
    "monopoly power",
    "deadweight loss with market power",
    "marginal revenue",
    "marginal cost",
    "price mark-up",
    "lerner index",
    "economic profit",
  ],
  keywords: [
    "monopoly",
    "monopoly pricing",
    "market power",
    "deadweight loss",
    "marginal revenue",
    "marginal cost",
    "mark-up",
    "lerner index",
    "profit maximization",
  ],
  interactions: [
    "change demand choke price",
    "change base marginal cost",
    "change overhead fixed cost",
    "reset",
  ],
  observations: [
    "monopoly price",
    "monopoly quantity",
    "competitive benchmark price",
    "competitive quantity",
    "price mark-up",
    "monopoly economic profit",
    "deadweight loss",
  ],
  limitations: [
    "Single-price unregulated monopolist facing linear downward-sloping market demand where MR has twice the slope of demand.",
  ],
};


export const acidBaseTitrationTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "acid base titration",
    "pH neutralization",
    "equivalence point",
    "indicators",
  ],
  keywords: [
    "titration",
    "pH",
    "acid",
    "base",
    "neutralization",
    "phenolphthalein",
    "buret",
    "analyte",
  ],
  interactions: [
    "add titrant volume",
    "change titrant volume",
    "reset titration",
  ],
  observations: [
    "pH value",
    "indicator color",
    "equivalence volume",
    "hydronium concentration",
  ],
  limitations: [
    "Strong acid-strong base titration curve with phenolphthalein color transition at pH 8.2-10.0.",
  ],
};

export const gasEquilibriumTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "gas phase equilibrium",
    "Le Chatelier's principle",
    "equilibrium constant Kc",
    "temperature and volume response",
  ],
  keywords: [
    "gas equilibrium",
    "Le Chatelier",
    "NO2",
    "N2O4",
    "pressure",
    "temperature",
    "volume",
    "piston",
  ],
  interactions: [
    "change temperature",
    "change chamber volume",
    "add gas",
    "reset",
  ],
  observations: [
    "total pressure",
    "equilibrium constant Kc",
    "gas color intensity",
    "shift direction",
  ],
  limitations: [
    "Closed vessel dimer-monomer reaction N2O4 ⇌ 2 NO2 following ideal gas law.",
  ],
};

export const phaseChangeTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "phases of matter",
    "phase diagram",
    "supercritical fluid",
    "triple point",
    "critical point",
  ],
  keywords: [
    "phase change",
    "solid",
    "liquid",
    "gas",
    "supercritical fluid",
    "temperature",
    "pressure",
    "triple point",
    "critical point",
  ],
  interactions: [
    "change temperature",
    "change pressure",
    "select material",
    "reset",
  ],
  observations: [
    "current phase",
    "density",
    "matter chamber visualization",
    "phase boundary curves",
  ],
  limitations: [
    "Thermodynamic equation of state for water, CO2, and argon with subcritical and supercritical regimes.",
  ],
};

export const conservationTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "balancing chemical equations",
    "conservation of mass",
    "atom bookkeeping",
    "molecules",
  ],
  keywords: [
    "chemical equation",
    "balancing",
    "molecules",
    "atoms",
    "reactants",
    "products",
    "coefficients",
  ],
  interactions: [
    "change coefficients",
    "balance equation",
    "reset",
  ],
  observations: [
    "chemical equation",
    "balanced status",
    "element atom counts",
    "molecules visual",
  ],
  limitations: [
    "Atom conservation for registered reaction equations (water, CO2).",
  ],
};

export const beerLambertTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "Beer-Lambert law",
    "spectrophotometry",
    "light absorbance",
    "transmittance",
    "molar absorptivity",
    "path length",
  ],
  keywords: [
    "beer lambert",
    "beer lambert law",
    "beer's law",
    "absorbance",
    "transmittance",
    "spectrophotometer",
    "cuvette",
    "concentration",
    "path length",
    "molar absorptivity",
    "attenuation",
  ],
  interactions: [
    "change concentration",
    "change path length",
    "change molar absorptivity",
    "reset",
  ],
  observations: [
    "absorbance",
    "transmittance",
    "transmitted beam intensity",
    "solution color intensity",
    "calibration curve",
  ],
  limitations: [
    "Linear Beer-Lambert law A = ε·b·c for homogeneous solutions at monochromatic wavelength.",
  ],
};

export const galvanicCellTeaching: PublicDefinition["teaching"] = {
  concepts: [
    "galvanic cell",
    "voltaic cell",
    "electrochemistry",
    "Nernst equation",
    "cell potential",
    "Daniell cell",
    "salt bridge",
    "redox reaction",
  ],
  keywords: [
    "galvanic cell",
    "voltaic cell",
    "nernst equation",
    "daniell cell",
    "zinc",
    "copper",
    "cell potential",
    "voltage",
    "voltmeter",
    "salt bridge",
    "electrodes",
    "anode",
    "cathode",
    "redox",
  ],
  interactions: [
    "change zinc concentration",
    "change copper concentration",
    "reset",
  ],
  observations: [
    "cell potential",
    "standard potential",
    "reaction quotient Q",
    "Gibbs free energy ΔG",
    "electron flow direction",
    "Nernst curve",
  ],
  limitations: [
    "Daniell cell Zn(s)|Zn²⁺(aq)||Cu²⁺(aq)|Cu(s) at 298.15 K governed by Nernst equation.",
  ],
};

