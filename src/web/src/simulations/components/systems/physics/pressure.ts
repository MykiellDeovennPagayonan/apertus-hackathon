import { num, object, validateValue } from "../../../runtime/parameterSchema";

export const pressureParameters = object({
  surfaceHeight: num(0.1, 3, "m"),
  holeHeight: num(0, 3, "m"),
  density: num(800, 1400, "kg/m³"),
});
export const pressureDefaults = {
  surfaceHeight: 1,
  holeHeight: 0.5,
  density: 1000,
};
export type PressureState = typeof pressureDefaults;
export function pressureState(
  parameters: Record<string, unknown>,
): PressureState {
  const s = { ...pressureDefaults, ...parameters };
  validateValue(pressureParameters, s);
  if (s.holeHeight > s.surfaceHeight)
    throw new Error("Hole must be at or below the fixed water surface");
  return s;
}
export function pressureMeasure(s: PressureState) {
  const depth = s.surfaceHeight - s.holeHeight;
  const speed = Math.sqrt(2 * 9.81 * depth);
  const flightTime = Math.sqrt((2 * s.holeHeight) / 9.81);
  return {
    depth,
    gaugePressure: s.density * 9.81 * depth,
    speed,
    flightTime,
    range: speed * flightTime,
  };
}
