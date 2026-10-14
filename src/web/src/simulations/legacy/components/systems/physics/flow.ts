import { num, object, validateValue } from "../../../../registry/contracts/parameterSchema";

export const flowParameters = object({
  wideArea: num(0.001, 0.1, "m²"),
  narrowArea: num(0.001, 0.1, "m²"),
  flowRate: num(0, 0.05, "m³/s"),
  referencePressure: num(3000, 1000000, "Pa absolute"),
  density: num(800, 1400, "kg/m³"),
  time: num(0, 10, "s"),
});
export const flowDefaults = {
  wideArea: 0.02,
  narrowArea: 0.01,
  flowRate: 0.02,
  referencePressure: 101325,
  density: 1000,
  time: 0,
};
export type FlowState = typeof flowDefaults;
export function flowState(parameters: Record<string, unknown>): FlowState {
  const s = { ...flowDefaults, ...parameters };
  validateValue(flowParameters, s);
  if (s.narrowArea > s.wideArea)
    throw new Error("Constriction area cannot exceed the wide section");
  if (
    s.referencePressure +
      (s.density *
        ((s.flowRate / s.wideArea) ** 2 - (s.flowRate / s.narrowArea) ** 2)) /
        2 <=
    2340
  )
    throw new Error(
      "Pressure reaches water vapour pressure at 20°C; cavitation is outside this model",
    );
  return s;
}
export function flowMeasure(s: FlowState) {
  const wideSpeed = s.flowRate / s.wideArea;
  const narrowSpeed = s.flowRate / s.narrowArea;
  const pressureDifference =
    (s.density * (wideSpeed ** 2 - narrowSpeed ** 2)) / 2;
  return {
    wideSpeed,
    narrowSpeed,
    pressureDifference,
    narrowPressure: s.referencePressure + pressureDifference,
  };
}
