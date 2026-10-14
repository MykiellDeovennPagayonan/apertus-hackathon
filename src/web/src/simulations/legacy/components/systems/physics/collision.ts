import {
  boolean,
  num,
  object,
  validateValue,
} from "../../../../registry/contracts/parameterSchema";

export const collisionParameters = object({
  mass1: num(0.1, 20, "kg"),
  mass2: num(0.1, 20, "kg"),
  speed1: num(-10, 10, "m/s"),
  speed2: num(-10, 10, "m/s"),
  restitution: num(0, 1, "1"),
  collided: boolean,
});
export const collisionDefaults = {
  mass1: 2,
  mass2: 1,
  speed1: 3,
  speed2: 0,
  restitution: 0,
  collided: false,
};
export type CollisionState = typeof collisionDefaults;
export function collisionState(
  parameters: Record<string, unknown>,
): CollisionState {
  const s = { ...collisionDefaults, ...parameters };
  validateValue(collisionParameters, s);

  return s;
}
export function collisionMeasure(s: CollisionState) {
  const { mass1: a, mass2: b, speed1: u, speed2: w, restitution: e } = s;
  const approaching = u > w;
  const momentum = a * u + b * w;
  const v1 =
    s.collided && approaching ? (momentum - b * e * (u - w)) / (a + b) : u;
  const v2 =
    s.collided && approaching ? (momentum + a * e * (u - w)) / (a + b) : w;
  const initialEnergy = (a * u * u + b * w * w) / 2;
  const kineticEnergy = (a * v1 * v1 + b * v2 * v2) / 2;
  return {
    approaching,
    velocity1: v1,
    velocity2: v2,
    momentum,
    finalMomentum: a * v1 + b * v2,
    initialEnergy,
    kineticEnergy,
    internalEnergy: Math.max(0, initialEnergy - kineticEnergy),
  };
}
