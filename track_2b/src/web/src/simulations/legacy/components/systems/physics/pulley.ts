import {
  choice,
  num,
  object,
  validateValue,
} from "../../../../registry/contracts/parameterSchema";

export const pulleyParameters = object({
  loadForce: num(1, 2000, "N"),
  strands: choice(1, 2, 4),
  pull: num(0, 2, "m"),
});
export const pulleyDefaults = { loadForce: 200, strands: 4, pull: 1 };
export type PulleyState = typeof pulleyDefaults;
export function pulleyState(parameters: Record<string, unknown>): PulleyState {
  const s = { ...pulleyDefaults, ...parameters };
  validateValue(pulleyParameters, s);

  return s;
}
export function pulleyMeasure(s: PulleyState) {
  return {
    tension: s.loadForce / s.strands,
    rise: s.pull / s.strands,
    inputWork: (s.loadForce * s.pull) / s.strands,
    outputWork: (s.loadForce * s.pull) / s.strands,
  };
}
