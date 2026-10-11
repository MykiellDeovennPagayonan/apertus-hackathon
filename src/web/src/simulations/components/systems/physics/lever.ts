import {
  boolean,
  num,
  object,
  validateValue,
} from "../../../runtime/parameterSchema";

export const leverParameters = object({
  length: num(0.4, 4, "m"),
  pivotPercent: num(5, 95, "%"),
  loadForce: num(1, 1000, "N"),
  lifted: boolean,
});
export const leverDefaults = {
  length: 1.2,
  pivotPercent: 100 / 6,
  loadForce: 100,
  lifted: false,
};
export type LeverState = typeof leverDefaults;

export function leverState(parameters: Record<string, unknown>): LeverState {
  const state = { ...leverDefaults, ...parameters };
  validateValue(leverParameters, state);
  return state;
}

export function leverMeasure(state: LeverState) {
  const angle = state.lifted ? 5 : 0;
  const radians = (angle * Math.PI) / 180;
  const loadArm = (state.length * state.pivotPercent) / 100;
  const effortArm = state.length - loadArm;
  const mechanicalAdvantage = effortArm / loadArm;
  const effortForce = state.loadForce / mechanicalAdvantage;
  const loadMomentArm = loadArm * Math.cos(radians);
  const effortMomentArm = effortArm * Math.cos(radians);
  const loadTravel = loadArm * Math.sin(radians);
  const effortTravel = effortArm * Math.sin(radians);
  return {
    angle,
    loadArm,
    effortArm,
    loadMomentArm,
    effortMomentArm,
    mechanicalAdvantage,
    effortForce,
    loadTorque: state.loadForce * loadMomentArm,
    effortTorque: -effortForce * effortMomentArm,
    loadTravel,
    effortTravel,
    inputWork: effortForce * effortTravel,
    outputWork: state.loadForce * loadTravel,
  };
}
