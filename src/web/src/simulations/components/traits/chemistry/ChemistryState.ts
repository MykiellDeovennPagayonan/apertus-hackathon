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
