import { chemistryDefaults } from "../../components/resources/chemistry/definitions";
import {
  conservationApply,
  conservationInitial,
  conservationMeasure,
  dilutionApply,
  dilutionInitial,
  dilutionMeasure,
  gasEquilibriumApply,
  gasEquilibriumInitial,
  gasEquilibriumMeasure,
  rateApply,
  rateConfiguration,
  rateInitial,
  rateMeasure,
  rateStep,
  titrationApply,
  titrationInitial,
  titrationMeasure,
} from "../../components/systems/chemistry/models";
import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import {
  boolean,
  choice,
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
  resources: ["chemistry/EducationalDefaults"],
  traits: [`chemistry/${name}State`],
  behaviors: [],
  systems: [`chemistry/${system}`],
  visuals: [`chemistry/${name}Visual`],
  views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
  controls: ["AssemblyControls"],
  prefabs: [`chemistry/${name}`],
  compositions: [],
});
const output = (unit: string, description: string) => ({ unit, description });
const coefficientSchema: ParameterSchema = {
  type: "array",
  items: num(1, 12, "1", true),
  minItems: 3,
  maxItems: 3,
};

export const dilution: DomainModel = {
  ref: "prefabs/chemistry/Dilution",
  version: 1,
  name: "Diluting salt water",
  presentation: "chemistry-dilution",
  maximumInstances: 4,
  description:
    "Salt-water dilution in a beaker. Adding water keeps the dissolved salt mass constant, increases solution volume, and lowers salt concentration. Compare independent beakers.",
  assumptions: [
    "Salt is already dissolved. Volumes add, with no reaction, evaporation or salt loss.",
    "Beaker level uses a labeled adaptive scale. Dots and color illustrate concentration; dots are not a physical molecule count.",
  ],
  parameters: object(
    { saltMass: num(0, 1000, "g"), volume: num(0.001, 1000, "L") },
    ["saltMass", "volume"],
  ),
  defaults: { ...chemistryDefaults.dilution },
  outputs: {
    saltMass: output("g", "Dissolved salt"),
    volume: output("L", "Solution volume"),
    concentration: output("g/L", "Salt concentration"),
  },
  requiredObservations: ["saltMass", "volume", "concentration"],
  actions: {
    CHEM_ADD_WATER: action(
      num(0.001, 1000, "L"),
      "Add this many litres of water; preserve dissolved salt and all unrelated settings",
    ),
  },
  dependencies: dependencies("Dilution", "ConcentrationSystem"),
  initialize: dilutionInitial,
  apply: dilutionApply,
  measure: dilutionMeasure,
  configuration: (s) => ({ ...s }),
};
export const conservation: DomainModel = {
  ref: "prefabs/chemistry/Conservation",
  version: 1,
  name: "Balancing chemical equations",
  presentation: "chemistry-conservation",
  maximumInstances: 1,
  creationDefaults: {
    structure: "single",
    objects: [
      {
        label: "Unbalanced water equation",
        parameters: { reactionId: "water", coefficients: [1, 1, 1] },
      },
    ],
    explanation:
      "Begin with one water equation and coefficients [1,1,1], unbalanced. Balancing is a later action, never initialization. Explicit initial coefficients or a named registered reaction override defaults: hydrogen plus oxygen making water uses reactionId water; carbon plus oxygen making carbon dioxide uses reactionId carbonDioxide and fixed species C + O₂ → CO₂. The carbon-dioxide equation is ALREADY BALANCED with coefficients [1,1,1]; do not call it unbalanced. The observation identifier is always balanced, whatever its boolean value.",
  },
  description:
    "Conservation of atoms in chemical reactions: editable coefficients and molecule pictures show why a chemical equation needs balancing. Count each element on both sides. Registered water and carbon-dioxide reactions only.",
  assumptions: [
    "Species formulas and atom definitions are immutable. Coefficients count whole molecules; subscripts define atoms inside each molecule.",
    "An unbalanced equation is a valid editing state. This is atom bookkeeping, not a simulation of reaction feasibility or energy.",
  ],
  parameters: object(
    {
      reactionId: choice("water", "carbonDioxide"),
      coefficients: coefficientSchema,
    },
    ["reactionId", "coefficients"],
  ),
  defaults: {
    reactionId: chemistryDefaults.conservation.reactionId,
    coefficients: [...chemistryDefaults.conservation.coefficients],
  },
  outputs: {
    equation: output("1", "Chemical equation"),
    balanced: output("1", "All elements conserved"),
    atoms: output("atoms", "Element conservation table"),
    molecules: output("molecules", "Molecules represented by coefficients"),
  },
  requiredObservations: ["equation", "balanced", "atoms"],
  actions: {
    CHEM_SET_COEFFICIENTS: action(
      coefficientSchema,
      "Set the three positive integer coefficients in left-to-right species order; formulas remain fixed",
    ),
    CHEM_BALANCE: action(
      undefined,
      "Find the lowest positive integer coefficients for this registered reaction",
    ),
  },
  dependencies: dependencies("Conservation", "ElementConservationSystem"),
  initialize: conservationInitial,
  apply: conservationApply,
  measure: conservationMeasure,
  configuration: conservationInitial,
};
export const reactionRate: DomainModel = {
  ref: "prefabs/chemistry/ReactionRate",
  version: 1,
  name: "Temperature and reaction rate",
  presentation: "chemistry-rate",
  maximumInstances: 4,
  description:
    "Chemical reaction rate for A to B (A → B). Temperature in kelvin changes the first-order Arrhenius rate and half-life; observe reactant A and product B concentrations over time, conserving A+B. Compare independent reaction runs at different temperatures. Changing one run's temperature restarts that run at t=0.",
  assumptions: [
    "One illustrative first-order reaction: k(T)=k300 exp[−Ea/8.314 (1/T−1/300)], A=A₀ exp(−kt), B=A₀−A. Temperature is in kelvin, time in seconds.",
    "Changing temperature starts a new comparison run at zero; the dashed curve uses the previous temperature. Reset restores the accepted initial recipe.",
    "Particles illustrate authoritative concentrations and do not calculate them. This is not a universal model for all reactions.",
  ],
  parameters: object(
    {
      initialConcentration: num(0.001, 100, "mol/L"),
      temperature: num(250, 400, "K"),
      referenceRate: num(0.0001, 10, "s^-1"),
      activationEnergy: num(0, 100000, "J/mol"),
      duration: num(0.1, 10000, "s"),
    },
    [
      "initialConcentration",
      "temperature",
      "referenceRate",
      "activationEnergy",
      "duration",
    ],
  ),
  defaults: { ...chemistryDefaults.rate },
  outputs: {
    temperature: output("K", "Run temperature"),
    comparisonTemperature: output("K", "Previous temperature"),
    rateConstant: output("s^-1", "Rate constant k"),
    halfLife: output("s", "Half-life"),
    comparisonRate: output("s^-1", "Previous rate constant"),
    comparisonHalfLife: output("s", "Previous half-life"),
    elapsed: output("s", "Elapsed simulation time"),
    concentrationA: output("mol/L", "Reactant A"),
    concentrationB: output("mol/L", "Product B"),
    totalConcentration: output("mol/L", "Conserved A + B"),
    playing: output("1", "Run is playing"),
    points: output("mol/L", "A versus seconds"),
    productPoints: output("mol/L", "B versus seconds"),
    comparisonPoints: output("mol/L", "Previous-temperature A versus seconds"),
  },
  requiredObservations: [
    "temperature",
    "rateConstant",
    "halfLife",
    "concentrationA",
    "concentrationB",
    "points",
  ],
  graphOutput: "points",
  actions: {
    CHEM_SET_TEMPERATURE: action(
      num(250, 400, "K"),
      "Set temperature and restart comparison from t=0; preserve initial amount, activation energy and reference rate",
      "relaunch",
    ),
    CHEM_RESTART_RATE: action(
      undefined,
      "Run again from zero at current settings, retaining comparison temperature",
      "relaunch",
    ),
    CHEM_SET_RATE_PLAYING: action(
      boolean,
      "Play or pause this instance on the shared simulation clock",
    ),
    CHEM_STEP_RATE: action(
      undefined,
      "Advance a paused run by one simulation second",
    ),
  },
  dependencies: dependencies("ReactionRate", "ArrheniusFirstOrderSystem"),
  initialize: rateInitial,
  apply: rateApply,
  measure: rateMeasure,
  configuration: rateConfiguration,
  step: rateStep,
};

export const acidBaseTitration: DomainModel = {
  ref: "prefabs/chemistry/AcidBaseTitration",
  version: 1,
  name: "Acid-base titration and pH neutralization",
  presentation: "chemistry-titration",
  maximumInstances: 2,
  description:
    "Strong acid titration with strong base. Observe pH curve changes as titrant is added from a buret, phenolphthalein indicator color changes, hydronium and hydroxide concentrations, and the neutral equivalence point.",
  assumptions: [
    "Monoprotic strong acid (e.g. HCl) titrated with strong base (e.g. NaOH) at 25°C.",
    "Autoionization of water Kw = 1.0e-14 is accounted for near the equivalence point (pH 7.0). Phenolphthalein transitions from colorless to pink between pH 8.2 and 10.0.",
  ],
  parameters: object(
    {
      analyteVolume: num(5, 100, "mL"),
      acidConcentration: num(0.01, 2, "mol/L"),
      baseConcentration: num(0.01, 2, "mol/L"),
      titrantVolumeAdded: num(0, 100, "mL"),
    },
    [
      "analyteVolume",
      "acidConcentration",
      "baseConcentration",
      "titrantVolumeAdded",
    ],
  ),
  defaults: { ...chemistryDefaults.titration },
  outputs: {
    analyteVolume: output("mL", "Flask acid volume"),
    acidConcentration: output("mol/L", "Flask acid concentration"),
    baseConcentration: output("mol/L", "Buret base concentration"),
    titrantVolumeAdded: output("mL", "Volume of titrant added"),
    equivalenceVolume: output("mL", "Equivalence point volume"),
    currentPH: output("pH", "Solution pH"),
    hConcentration: output("mol/L", "Hydronium concentration [H₃O⁺]"),
    ohConcentration: output("mol/L", "Hydroxide concentration [OH⁻]"),
    indicatorColor: output("color", "Phenolphthalein indicator color"),
    neutralized: output("1", "Solution is at equivalence pH"),
    points: output("pH", "Titration curve pH versus volume"),
  },
  requiredObservations: [
    "titrantVolumeAdded",
    "equivalenceVolume",
    "currentPH",
    "indicatorColor",
    "points",
  ],
  graphOutput: "points",
  actions: {
    CHEM_ADD_TITRANT: action(
      num(0.1, 50, "mL"),
      "Dispense titrant increment from buret into analyte flask",
    ),
    CHEM_SET_TITRANT_VOLUME: action(
      num(0, 100, "mL"),
      "Set exact volume of titrant dispensed from buret",
    ),
    CHEM_RESET_TITRATION: action(
      undefined,
      "Refill buret and reset titration volume to zero",
    ),
    CHEM_SET_ACID_CONC: action(
      num(0.01, 2, "mol/L"),
      "Change initial analyte acid concentration in flask",
    ),
  },
  dependencies: dependencies("AcidBaseTitration", "TitrationSystem"),
  initialize: titrationInitial,
  apply: titrationApply,
  measure: titrationMeasure,
  configuration: (s) => ({ ...s }),
};

export const gasEquilibrium: DomainModel = {
  ref: "prefabs/chemistry/GasEquilibrium",
  version: 1,
  name: "Gas equilibrium and Le Chatelier's principle",
  presentation: "chemistry-gas-equilibrium",
  maximumInstances: 2,
  description:
    "Reversible gas-phase equilibrium N₂O₄ (colorless) ⇌ 2 NO₂ (brown). Explore Le Chatelier's principle: temperature shifts the endothermic equilibrium, and volume/pressure shifts favor the side with fewer gas moles.",
  assumptions: [
    "Reversible reaction N₂O₄ ⇌ 2 NO₂ with endothermic forward reaction (ΔH° = +57.2 kJ/mol).",
    "Equilibrium constant Kc varies with temperature via van 't Hoff equation. Total pressure follows the ideal gas law.",
  ],
  parameters: object(
    {
      temperature: num(250, 450, "K"),
      volume: num(1, 20, "L"),
      initialN2O4: num(0.1, 10, "mol"),
      initialNO2: num(0, 10, "mol"),
    },
    ["temperature", "volume", "initialN2O4", "initialNO2"],
  ),
  defaults: { ...chemistryDefaults.gasEquilibrium },
  outputs: {
    temperature: output("K", "Chamber temperature"),
    volume: output("L", "Chamber gas volume"),
    initialN2O4: output("mol", "Initial moles of N₂O₄"),
    initialNO2: output("mol", "Initial moles of NO₂"),
    equilibriumConstant: output("mol/L", "Equilibrium constant Kc"),
    molesN2O4: output("mol", "Equilibrium moles of N₂O₄"),
    molesNO2: output("mol", "Equilibrium moles of NO₂"),
    concN2O4: output("mol/L", "Concentration of colorless N₂O₄"),
    concNO2: output("mol/L", "Concentration of brown NO₂"),
    totalPressure: output("atm", "Total chamber pressure"),
    gasColorIntensity: output("1", "Brown color intensity fraction"),
    shiftDirection: output("shift", "Le Chatelier response state"),
    points: output("mol/L", "NO₂ concentration across container volumes"),
  },
  requiredObservations: [
    "temperature",
    "volume",
    "equilibriumConstant",
    "concNO2",
    "totalPressure",
    "gasColorIntensity",
    "points",
  ],
  graphOutput: "points",
  actions: {
    CHEM_SET_EQ_TEMP: action(
      num(250, 450, "K"),
      "Change reaction temperature to shift equilibrium via van 't Hoff",
    ),
    CHEM_SET_EQ_VOLUME: action(
      num(1, 20, "L"),
      "Change gas chamber volume to induce Le Chatelier pressure shift",
    ),
    CHEM_ADD_GAS: action(
      undefined,
      "Inject additional NO₂ gas into the chamber",
    ),
  },
  dependencies: dependencies("GasEquilibrium", "LeChatelierSystem"),
  initialize: gasEquilibriumInitial,
  apply: gasEquilibriumApply,
  measure: gasEquilibriumMeasure,
  configuration: (s) => ({ ...s }),
};

/** Explicit integration imports this value; importing chemistry has no registration side effects. */
export const chemistry: DomainContribution = {
  namespace: "chemistry",
  version: 1,
  models: [
    dilution,
    conservation,
    reactionRate,
    acidBaseTitration,
    gasEquilibrium,
  ],
};
