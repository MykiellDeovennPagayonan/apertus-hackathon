import {
  boolean,
  num,
  object,
  validateValue,
} from "../../../../registry/contracts/parameterSchema";

export const buoyancyParameters = object({
  mass: num(1, 50, "kg"),
  cargo: num(0, 100, "kg"),
  volume: num(0.002, 0.2, "m³"),
  materialVolume: num(0.0001, 0.01, "m³"),
  hullHeight: num(0.1, 1, "m"),
  density: num(800, 1400, "kg/m³"),
  flooded: boolean,
});
export const buoyancyDefaults = {
  mass: 10,
  cargo: 0,
  volume: 0.02,
  materialVolume: 10 / 7850,
  hullHeight: 0.4,
  density: 1000,
  flooded: false,
};
export type BuoyancyState = typeof buoyancyDefaults;
export function buoyancyState(
  parameters: Record<string, unknown>,
): BuoyancyState {
  const s = { ...buoyancyDefaults, ...parameters };
  validateValue(buoyancyParameters, s);
  if (s.materialVolume > s.volume)
    throw new Error("Material volume cannot exceed hull volume");
  return s;
}
export function buoyancyMeasure(s: BuoyancyState) {
  const totalMass = s.mass + s.cargo;
  const availableVolume = s.flooded ? s.materialVolume : s.volume;
  const requiredVolume = totalMass / s.density;
  const floats = requiredVolume <= availableVolume;
  const displacedVolume = Math.min(requiredVolume, availableVolume);
  return {
    requiredVolume,
    displacedVolume,
    availableVolume,
    weight: totalMass * 9.81,
    buoyantForce: s.density * 9.81 * displacedVolume,
    floats,
    draft: floats
      ? (s.hullHeight * requiredVolume) / availableVolume
      : s.hullHeight,
    solidFloats: s.mass / s.materialVolume <= s.density,
  };
}
