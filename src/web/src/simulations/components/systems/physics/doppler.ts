import { num, object, validateValue } from "../../../runtime/parameterSchema";
export const dopplerParameters = object({
  frequency: num(100, 2000, "Hz"),
  speed: num(0, 100, "m/s"),
  soundSpeed: num(200, 400, "m/s"),
  offset: num(0, 100, "m"),
  time: num(-10, 10, "s"),
});
export const dopplerDefaults = {
  frequency: 700,
  speed: 20,
  soundSpeed: 343,
  offset: 10,
  time: -5,
};
export function dopplerState(p: Record<string, unknown>) {
  const s = { ...dopplerDefaults, ...p };
  validateValue(dopplerParameters, s);
  return s;
}
export function dopplerMeasure(s: ReturnType<typeof dopplerState>) {
  // Retarded emission time: arrival t = te + distance(source(te), observer)/c.
  const c = s.soundSpeed,
    v = s.speed;
  const emissionTime =
    (c * c * s.time -
      Math.sqrt(
        c * c * v * v * s.time ** 2 + (c * c - v * v) * s.offset ** 2,
      )) /
    (c * c - v * v);
  const x = v * emissionTime,
    distance = Math.hypot(x, s.offset);
  if (distance === 0 && v !== 0)
    return {
      received: null,
      radialVelocity: null,
      emissionTime,
      sourceX: v * s.time,
    };
  const radialVelocity = distance === 0 ? 0 : (-v * x) / distance;
  return {
    received: (s.frequency * c) / (c - radialVelocity),
    radialVelocity,
    emissionTime,
    sourceX: v * s.time,
  };
}
