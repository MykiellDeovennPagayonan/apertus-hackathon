import { num, object, validateValue } from "../../../runtime/parameterSchema";
export const turningParameters = object({
  speed: num(0, 20, "m/s"),
  radius: num(2, 50, "m"),
  mass: num(20, 200, "kg"),
  friction: num(0, 1.5, "1"),
});
export const turningDefaults = {
  speed: 5,
  radius: 10,
  mass: 80,
  friction: 0.5,
};
export function turningState(p: Record<string, unknown>) {
  const s = { ...turningDefaults, ...p };
  validateValue(turningParameters, s);
  return s;
}
export function turningMeasure(s: ReturnType<typeof turningState>) {
  const acceleration = s.speed ** 2 / s.radius,
    requiredForce = s.mass * acceleration,
    availableForce = s.friction * s.mass * 9.81;
  return {
    acceleration,
    requiredForce,
    availableForce,
    limit: Math.sqrt(s.friction * 9.81 * s.radius),
    lean: (Math.atan(acceleration / 9.81) * 180) / Math.PI,
    feasible: requiredForce <= availableForce,
  };
}
