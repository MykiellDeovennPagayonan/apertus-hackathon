import { num, object, validateValue } from "../../../runtime/parameterSchema";

export const hydraulicsParameters = object({
  inputArea: num(0.5, 20, "cm²"),
  outputArea: num(1, 100, "cm²"),
  inputForce: num(1, 500, "N"),
  loadForce: num(1, 10000, "N"),
  stroke: num(0, 50, "cm"),
});
export const hydraulicsDefaults = {
  inputArea: 1,
  outputArea: 20,
  inputForce: 100,
  loadForce: 2000,
  stroke: 20,
};
export type HydraulicsState = typeof hydraulicsDefaults;
export function hydraulicsState(
  parameters: Record<string, unknown>,
): HydraulicsState {
  const s = { ...hydraulicsDefaults, ...parameters };
  validateValue(hydraulicsParameters, s);

  return s;
}
export function hydraulicsMeasure(s: HydraulicsState) {
  const ratio = s.outputArea / s.inputArea;
  const outputForce = s.inputForce * ratio;
  const canLift = outputForce >= s.loadForce;
  const inputTravel = canLift ? s.stroke / 100 : 0;
  const outputTravel = inputTravel / ratio;
  return {
    pressureChange: s.inputForce / (s.inputArea * 1e-4),
    outputForce,
    requiredInputForce: s.loadForce / ratio,
    canLift,
    inputTravel,
    outputTravel,
    displacedVolume: s.inputArea * 1e-4 * inputTravel,
    inputWork: (s.loadForce / ratio) * inputTravel,
    outputWork: s.loadForce * outputTravel,
    loadWork: s.loadForce * outputTravel,
  };
}
