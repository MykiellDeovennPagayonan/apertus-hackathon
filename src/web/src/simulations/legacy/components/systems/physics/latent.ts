import { num, object, validateValue } from "../../../../registry/contracts/parameterSchema";
export const latentParameters = object({
  mass: num(0.01, 1, "kg"),
  initial: num(-40, 0, "°C"),
  power: num(1, 1000, "W"),
  time: num(0, 4000, "s"),
});
export const latentDefaults = { mass: 0.1, initial: 0, power: 100, time: 0 };
export function latentState(p: Record<string, unknown>) {
  const s = { ...latentDefaults, ...p };
  validateValue(latentParameters, s);
  if (2100 * s.initial + (s.power * s.time) / s.mass > 3209600)
    throw new Error(
      "Constant-property water model supports temperatures only up to 200°C; reduce heating time or power",
    );
  return s;
}
export function latentMeasure(s: ReturnType<typeof latentState>) {
  const addedEnergy = s.power * s.time,
    enthalpy = s.mass * 2100 * s.initial + addedEnergy,
    specific = enthalpy / s.mass;
  let temperature: number,
    solid = 0,
    liquid = 0,
    vapour = 0;
  if (specific < 0) {
    temperature = specific / 2100;
    solid = 1;
  } else if (specific < 334000) {
    temperature = 0;
    liquid = specific / 334000;
    solid = 1 - liquid;
  } else if (specific < 752600) {
    temperature = (specific - 334000) / 4186;
    liquid = 1;
  } else if (specific < 3008600) {
    temperature = 100;
    vapour = (specific - 752600) / 2256000;
    liquid = 1 - vapour;
  } else {
    temperature = 100 + (specific - 3008600) / 2010;
    vapour = 1;
  }
  return { temperature, solid, liquid, vapour, addedEnergy, enthalpy };
}
