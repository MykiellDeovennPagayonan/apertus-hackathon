import { choice, num, object, validateValue } from "../../../runtime/parameterSchema";
export const stringParameters = object({
  length: num(0.1, 1, "m"),
  tension: num(1, 200, "N"),
  density: num(0.001, 0.02, "kg/m"),
  harmonic: choice(1,2,3,4,5,6),
  phase: num(0, 1, "cycles"),
});
export const stringDefaults = {
  length: 0.65,
  tension: 65,
  density: 0.005,
  harmonic: 1,
  phase: 0,
};
export function stringState(p: Record<string, unknown>) {
  const s = { ...stringDefaults, ...p };
  validateValue(stringParameters, s);
  return s;
}
export function stringMeasure(s: ReturnType<typeof stringState>) {
  const waveSpeed = Math.sqrt(s.tension / s.density);
  return {
    waveSpeed,
    fundamental: waveSpeed / (2 * s.length),
    frequency: (s.harmonic * waveSpeed) / (2 * s.length),
  };
}
export function stringDisplacement(
  s: ReturnType<typeof stringState>,
  x: number,
) {
  return x <= 0 || x >= s.length
    ? 0
    : Math.sin((s.harmonic * Math.PI * x) / s.length) *
        Math.cos(2 * Math.PI * s.phase);
}
