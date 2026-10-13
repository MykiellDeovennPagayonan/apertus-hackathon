/** Shared immutable definitions, never live instance state. Only these reactions are supported. */
export const reactions = Object.freeze({
  water: Object.freeze({
    name: "Making water",
    species: Object.freeze([
      Object.freeze({
        formula: "H₂",
        side: "left",
        atoms: Object.freeze({ H: 2, O: 0 }),
      }),
      Object.freeze({
        formula: "O₂",
        side: "left",
        atoms: Object.freeze({ H: 0, O: 2 }),
      }),
      Object.freeze({
        formula: "H₂O",
        side: "right",
        atoms: Object.freeze({ H: 2, O: 1 }),
      }),
    ]),
  }),
  carbonDioxide: Object.freeze({
    name: "Making carbon dioxide",
    species: Object.freeze([
      Object.freeze({
        formula: "C",
        side: "left",
        atoms: Object.freeze({ C: 1, O: 0 }),
      }),
      Object.freeze({
        formula: "O₂",
        side: "left",
        atoms: Object.freeze({ C: 0, O: 2 }),
      }),
      Object.freeze({
        formula: "CO₂",
        side: "right",
        atoms: Object.freeze({ C: 1, O: 2 }),
      }),
    ]),
  }),
});
export type ReactionId = keyof typeof reactions;
export const chemistryDefaults = Object.freeze({
  dilution: Object.freeze({ saltMass: 10, volume: 1 }),
  conservation: Object.freeze({
    reactionId: "water",
    coefficients: Object.freeze([1, 1, 1]),
  }),
  rate: Object.freeze({
    initialConcentration: 1,
    temperature: 300,
    referenceRate: 0.1,
    activationEnergy: 40000,
    duration: 30,
  }),
  titration: Object.freeze({
    analyteVolume: 25,
    acidConcentration: 0.1,
    baseConcentration: 0.1,
    titrantVolumeAdded: 0,
    acidType: "strong",
  }),
  gasEquilibrium: Object.freeze({
    temperature: 298,
    volume: 5,
    initialN2O4: 1.0,
    initialNO2: 0.0,
  }),
  phaseChange: Object.freeze({
    material: "water",
    temperature: 300,
    pressure: 1.0,
  }),
  beerLambert: Object.freeze({
    concentration: 50,
    pathLength: 1.0,
    molarAbsorptivity: 0.02,
  }),
  galvanicCell: Object.freeze({
    znConcentration: 1.0,
    cuConcentration: 1.0,
  }),
});

export interface PhaseMaterialData {
  name: string;
  formula: string;
  molarMass: number;
  T_triple: number;
  P_triple: number;
  T_crit: number;
  P_crit: number;
  T_melt_1atm: number;
  T_boil_1atm: number;
  fusionSlope: number;
  dH_vap: number;
  dH_sub: number;
}

export const phaseMaterials: Record<string, PhaseMaterialData> = Object.freeze({
  water: Object.freeze({
    name: "Water",
    formula: "H₂O",
    molarMass: 18.015,
    T_triple: 273.16,
    P_triple: 0.006,
    T_crit: 647.1,
    P_crit: 217.7,
    T_melt_1atm: 273.15,
    T_boil_1atm: 373.15,
    fusionSlope: -0.0075,
    dH_vap: 40660,
    dH_sub: 51000,
  }),
  "carbon-dioxide": Object.freeze({
    name: "Carbon Dioxide",
    formula: "CO₂",
    molarMass: 44.01,
    T_triple: 216.58,
    P_triple: 5.11,
    T_crit: 304.13,
    P_crit: 72.8,
    T_melt_1atm: 194.65,
    T_boil_1atm: 194.65,
    fusionSlope: 0.045,
    dH_vap: 15300,
    dH_sub: 26100,
  }),
  nitrogen: Object.freeze({
    name: "Nitrogen",
    formula: "N₂",
    molarMass: 28.013,
    T_triple: 63.15,
    P_triple: 0.123,
    T_crit: 126.2,
    P_crit: 33.5,
    T_melt_1atm: 63.15,
    T_boil_1atm: 77.36,
    fusionSlope: 0.02,
    dH_vap: 5560,
    dH_sub: 6800,
  }),
});

