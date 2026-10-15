import { num, object, validateValue } from "../../../../registry/contracts/parameterSchema";

export const COOLING_DURATION = 240;

export const coolingParameters = object({
  initial: num(0, 100, "°C"),
  ambient: num(0, 50, "°C"),
  coefficient: num(0.001, 1, "min⁻¹"),
  time: num(0, COOLING_DURATION, "min"),
});
export const coolingDefaults = {
  initial: 80,
  ambient: 20,
  coefficient: 0.05,
  time: 0,
};
export function coolingState(parameters: Record<string, unknown>) {
  const s = { ...coolingDefaults, ...parameters };
  validateValue(coolingParameters, s);
  return s;
}
export function coolingMeasure(s: ReturnType<typeof coolingState>) {
  const temperature =
    s.ambient + (s.initial - s.ambient) * Math.exp(-s.coefficient * s.time);
  return { temperature, rate: -s.coefficient * (temperature - s.ambient) };
}
