/** Instance-local data. Only the corresponding chemistry system writes these fields. */
export type DilutionState = Record<string, unknown> & {
  saltMass: number;
  volume: number;
};

export type ConservationState = Record<string, unknown> & {
  reactionId: string;
  coefficients: number[];
};

export type ReactionRateState = Record<string, unknown> & {
  initialConcentration: number;
  temperature: number;
  referenceRate: number;
  activationEnergy: number;
  duration: number;
  elapsed: number;
  comparisonTemperature: number;
  playing: boolean;
};

export type AcidBaseTitrationState = Record<string, unknown> & {
  analyteVolume: number;
  acidConcentration: number;
  baseConcentration: number;
  titrantVolumeAdded: number;
  acidType?: "strong" | "weak";
};

export type GasEquilibriumState = Record<string, unknown> & {
  temperature: number;
  volume: number;
  initialN2O4: number;
  initialNO2: number;
};

export type PhaseMaterial = "water" | "carbon-dioxide" | "nitrogen";

export type PhaseChangeState = Record<string, unknown> & {
  material: PhaseMaterial;
  temperature: number;
  pressure: number;
};

export type BeerLambertState = Record<string, unknown> & {
  concentration: number;
  pathLength: number;
  molarAbsorptivity: number;
};

export type GalvanicCellState = Record<string, unknown> & {
  znConcentration: number;
  cuConcentration: number;
  temperature?: number;
};

