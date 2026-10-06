/** Immutable educational defaults. Runtime state is always instance-local. */
export const dynamicDefaults = Object.freeze({
  growth: Object.freeze({
    principal: 100,
    annualRate: 0.05,
    years: 10,
  }),
  traffic: Object.freeze({
    vehicleCount: 22,
    roadLength: 260,
    desiredSpeed: 22,
    desiredHeadway: 1.1,
    minimumGap: 2,
    maximumAcceleration: 1.2,
    comfortableBraking: 2,
    seed: 117,
    playing: false,
  }),
  queue: Object.freeze({
    arrivalRate: 0.8,
    serviceRate: 1,
    duration: 60,
    cashiers: 1,
    seed: 604,
  }),
});
