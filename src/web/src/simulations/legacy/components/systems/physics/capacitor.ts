import {
  choice,
  num,
  object,
  validateValue,
} from "../../../../registry/contracts/parameterSchema";
export const capacitorParameters = object({
  resistance: num(100, 1000000, "Ω"),
  capacitance: num(1e-6, 0.01, "F"),
  source: num(0, 24, "V"),
  voltage: num(0, 24, "V"),
  mode: choice("charge", "isolate", "discharge"),
  time: num(0, 100000, "s"),
});
export const capacitorDefaults = {
  resistance: 10000,
  capacitance: 0.0001,
  source: 10,
  voltage: 0,
  mode: "charge",
  time: 0,
};
export function capacitorState(p: Record<string, unknown>) {
  const s = { ...capacitorDefaults, ...p };
  validateValue(capacitorParameters, s);
  return s;
}
export function capacitorAdvance(
  s: ReturnType<typeof capacitorState>,
  seconds: number,
) {
  validateValue(num(0, 10000, "s"), seconds);
  const target = s.mode === "charge" ? s.source : 0;
  const voltage =
    s.mode === "isolate"
      ? s.voltage
      : target +
        (s.voltage - target) *
          Math.exp(-seconds / (s.resistance * s.capacitance));
  return capacitorState({ ...s, voltage, time: s.time + seconds });
}
export function capacitorMeasure(s: ReturnType<typeof capacitorState>) {
  return {
    voltage: s.voltage,
    current:
      s.mode === "isolate"
        ? 0
        : ((s.mode === "charge" ? s.source : 0) - s.voltage) / s.resistance,
    charge: s.capacitance * s.voltage,
    energy: (s.capacitance * s.voltage ** 2) / 2,
    timeConstant: s.resistance * s.capacitance,
  };
}
