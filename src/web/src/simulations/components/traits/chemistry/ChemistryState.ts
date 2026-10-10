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
};

export type GasEquilibriumState = Record<string, unknown> & {
  temperature: number;
  volume: number;
  initialN2O4: number;
  initialNO2: number;
};
