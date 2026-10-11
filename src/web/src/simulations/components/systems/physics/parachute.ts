import {
  boolean,
  num,
  object,
  validateValue,
} from "../../../runtime/parameterSchema";

export const parachuteParameters = object({
  mass: num(20, 200, "kg"),
  area: num(0.5, 60, "m²"),
  dragCoefficient: num(0.5, 2, "1"),
  density: num(0.5, 1.5, "kg/m³"),
  height: num(10, 1000, "m"),
  speed: num(-30, 300, "m/s downward"),
  distance: num(-1000, 1000, "m below release"),
  time: num(0, 1000, "s"),
  landed: boolean,
});
export const parachuteDefaults = {
  mass: 80,
  area: 20,
  dragCoefficient: 1.5,
  density: 1.2,
  height: 100,
  speed: 0,
  distance: 0,
  time: 0,
  landed: false,
};
export type ParachuteState = typeof parachuteDefaults;
export function parachuteState(
  parameters: Record<string, unknown>,
): ParachuteState {
  const s = { ...parachuteDefaults, ...parameters };
  validateValue(parachuteParameters, s);
  if (s.distance > s.height || s.landed !== (s.distance === s.height))
    throw new Error("Ground-contact state must agree with fall distance");
  if (s.landed && s.speed !== 0)
    throw new Error("A landed load has zero speed");
  return s;
}
export function parachuteMeasure(s: ParachuteState) {
  const k = (s.density * s.dragCoefficient * s.area) / 2;
  return {
    terminalSpeed: Math.sqrt((s.mass * 9.81) / k),
    speed: s.speed,
    distance: s.distance,
    time: s.time,
    weight: s.mass * 9.81,
    support: s.landed ? s.mass * 9.81 : 0,
    drag: -k * s.speed * Math.abs(s.speed),
    acceleration: s.landed
      ? 0
      : 9.81 - (k * s.speed * Math.abs(s.speed)) / s.mass,
    landed: s.landed,
  };
}
// RK4 integrates speed and position together; bound each substep by drag timescale.
export function parachuteAdvance(
  s: ParachuteState,
  duration = 1,
): ParachuteState {
  if (!Number.isFinite(duration) || duration <= 0 || duration > 1)
    throw new Error("Advance must be within one second");
  if (s.landed) return s;
  const k = (s.density * s.dragCoefficient * s.area) / (2 * s.mass);
  const acceleration = (v: number) => 9.81 - k * v * Math.abs(v);
  let { speed: v, distance: x, time } = s;
  let remaining = duration;
  while (remaining > 1e-12) {
    const dt = Math.min(
      remaining,
      0.01,
      0.1 / (k * Math.max(Math.abs(v), Math.sqrt(9.81 / k))),
    );
    const a = acceleration(v),
      vb = v + (a * dt) / 2,
      b = acceleration(vb);
    const vc = v + (b * dt) / 2,
      c = acceleration(vc),
      vd = v + c * dt,
      d = acceleration(vd);
    const nextV = v + (dt * (a + 2 * b + 2 * c + d)) / 6;
    const nextX = x + (dt * (v + 2 * vb + 2 * vc + vd)) / 6;
    if (nextX >= s.height) {
      const fraction = (s.height - x) / (nextX - x);
      return {
        ...s,
        speed: 0,
        distance: s.height,
        time: time + dt * fraction,
        landed: true,
      };
    }
    x = nextX;
    v = nextV;
    time += dt;
    remaining -= dt;
  }
  return parachuteState({ ...s, speed: v, distance: x, time });
}
