import {
  choice,
  num,
  object,
  validateValue,
} from "../../../runtime/parameterSchema";
export const inductionParameters = object({
  position: num(-0.3, 0.3, "m"),
  speed: num(-0.1, 0.1, "m/s"),
  turns: num(1, 1000, "1", true),
  polarity: choice(-1, 1),
  resistance: num(1, 1000, "Ω"),
  peakFlux: num(0.0001, 0.01, "Wb"),
  width: num(0.02, 0.1, "m"),
});
export const inductionDefaults = {
  position: -0.08,
  speed: 0.04,
  turns: 100,
  polarity: 1,
  resistance: 10,
  peakFlux: 0.002,
  width: 0.05,
};
export function inductionState(p: Record<string, unknown>) {
  const s = { ...inductionDefaults, ...p };
  validateValue(inductionParameters, s);
  return s;
}
export function inductionMeasure(s: ReturnType<typeof inductionState>) {
  const flux =
      s.polarity * s.peakFlux * Math.exp(-((s.position / s.width) ** 2) / 2),
    gradient = (-s.position / s.width ** 2) * flux;
  const emf = -s.turns * gradient * s.speed,
    current = emf / s.resistance;
  return {
    flux,
    fluxRate: gradient * s.speed,
    emf,
    current,
    dissipation: emf * current,
  };
}
export function inductionAdvance(s: ReturnType<typeof inductionState>) {
  const next = s.position + s.speed * 0.1;
  if (Math.abs(next) > 0.3)
    throw new Error(
      "Magnet reached the teaching path limit; reverse or reposition it",
    );
  return inductionState({ ...s, position: next });
}
