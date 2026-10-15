/** Immutable educational defaults. Changing a running instance never mutates these. */
export const naturalSystemsDefaults = Object.freeze({
  diffusion: Object.freeze({
    diffusionCoefficient: 0.05,
    width: 1,
    gridSize: 15,
    dyeMass: 1,
    duration: 8,
  }),
  predatorPrey: Object.freeze({
    initialRabbits: 40,
    initialFoxes: 9,
    rabbitGrowth: 0.5,
    predationRate: 0.02,
    conversionRate: 0.01,
    foxDeathRate: 0.3,
    duration: 30,
    integrationStep: 0.01,
  }),
  plantGrowth: Object.freeze({
    initialBiomass: 1,
    maximumGrowthRate: 1,
    light: 0.4,
    water: 0.6,
    nutrients: 0.8,
    duration: 10,
  }),
});
