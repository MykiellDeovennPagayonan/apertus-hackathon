export type NaturalState = Record<string, unknown>;

/** Cell averages are row-major. The diffusion system is their only writer. */
export interface DiffusionState extends NaturalState {
  diffusionCoefficient: number;
  comparisonCoefficient: number;
  width: number;
  gridSize: number;
  dyeMass: number;
  duration: number;
  elapsed: number;
  playing: boolean;
  field: number[];
  comparisonField: number[];
}

export interface PredatorPreyState extends NaturalState {
  initialRabbits: number;
  comparisonInitialRabbits: number;
  initialFoxes: number;
  rabbitGrowth: number;
  predationRate: number;
  conversionRate: number;
  foxDeathRate: number;
  duration: number;
  integrationStep: number;
  elapsed: number;
  rabbits: number;
  foxes: number;
  comparisonRabbits: number;
  comparisonFoxes: number;
  playing: boolean;
}

export interface PlantGrowthState extends NaturalState {
  initialBiomass: number;
  maximumGrowthRate: number;
  light: number;
  water: number;
  nutrients: number;
  comparisonLight: number;
  duration: number;
  elapsed: number;
  playing: boolean;
}
