import { num, object, validateValue } from "../../../../registry/contracts/parameterSchema";

export const gearsParameters = object({
  front: num(20, 60, "teeth", true),
  rear: num(10, 40, "teeth", true),
  wheelRadius: num(0.1, 0.5, "m"),
  pedalTorque: num(1, 100, "N·m"),
  turns: num(0, 10, "turns"),
});
export const gearsDefaults = {
  front: 30,
  rear: 15,
  wheelRadius: 0.33,
  pedalTorque: 20,
  turns: 0,
};
export type GearsState = typeof gearsDefaults;
export function gearsState(parameters: Record<string, unknown>): GearsState {
  const s = { ...gearsDefaults, ...parameters };
  validateValue(gearsParameters, s);

  return s;
}
export function gearsMeasure(s: GearsState) {
  const ratio = s.front / s.rear;
  return {
    ratio,
    torqueRatio: 1 / ratio,
    wheelTorque: s.pedalTorque / ratio,
    wheelTurns: s.turns * ratio,
    distancePerTurn: 2 * Math.PI * s.wheelRadius * ratio,
    distance: 2 * Math.PI * s.wheelRadius * s.turns * ratio,
  };
}
