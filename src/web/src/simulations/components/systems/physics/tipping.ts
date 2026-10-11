import { num, object, validateValue } from "../../../runtime/parameterSchema";

export const tippingParameters = object({
  width: num(0.2, 2, "m"),
  height: num(0.5, 3, "m"),
  bodyMass: num(1, 100, "kg"),
  loadMass: num(0, 100, "kg"),
  loadHeight: num(0, 3, "m"),
  tilt: num(0, 80, "deg"),
});
export const tippingDefaults = {
  width: 0.6,
  height: 2,
  bodyMass: 20,
  loadMass: 10,
  loadHeight: 1,
  tilt: 0,
};
export type TippingState = typeof tippingDefaults;
export function tippingState(
  parameters: Record<string, unknown>,
): TippingState {
  const s = { ...tippingDefaults, ...parameters };
  validateValue(tippingParameters, s);
  if (s.loadHeight > s.height)
    throw new Error("Load must stay inside the cabinet");
  return s;
}
export function tippingMeasure(s: TippingState) {
  const totalMass = s.bodyMass + s.loadMass;
  const centreHeight =
    ((s.bodyMass * s.height) / 2 + s.loadMass * s.loadHeight) / totalMass;
  const theta = (s.tilt * Math.PI) / 180;
  const gravityX =
    (-s.width / 2) * Math.cos(theta) + centreHeight * Math.sin(theta);
  return {
    centreHeight,
    criticalAngle: (Math.atan(s.width / (2 * centreHeight)) * 180) / Math.PI,
    gravityX,
    restoringTorque: -totalMass * 9.81 * gravityX,
    tipped: gravityX > 1e-12,
  };
}
