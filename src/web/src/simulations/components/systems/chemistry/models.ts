import {
  type ReactionId,
  reactions,
} from "../../resources/chemistry/definitions";
import type {
  ConservationState,
  DilutionState,
  ReactionRateState,
} from "../../traits/chemistry/ChemistryState";

export type State = Record<string, unknown>;
function number(
  value: unknown,
  min: number,
  max: number,
  label: string,
): number {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${label}: expected a finite value from ${min} to ${max}`);
  return value;
}
export function dilutionInitial(p: State): DilutionState {
  return {
    saltMass: number(p.saltMass, 0, 1000, "Salt mass (g)"),
    volume: number(p.volume, 0.001, 1000, "Solution volume (L)"),
  };
}
export function dilutionApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action !== "CHEM_ADD_WATER")
    throw new Error("Unsupported dilution operation");
  const amount = number(value, 0.001, 1000, "Added water (L)");
  return dilutionInitial({ ...s, volume: Number(s.volume) + amount });
}
export function dilutionMeasure(s: State): State {
  const p = dilutionInitial(s);
  return { ...p, concentration: Number(p.saltMass) / Number(p.volume) };
}

function reactionDefinition(id: unknown) {
  if (typeof id !== "string" || !Object.hasOwn(reactions, id))
    throw new Error("Choose a registered reactionId: water or carbonDioxide");
  return reactions[id as ReactionId];
}
function coefficients(value: unknown): number[] {
  if (!Array.isArray(value) || value.length !== 3)
    throw new Error("Exactly three coefficients are required");
  return value.map((v) => {
    const n = number(v, 1, 12, "Coefficient");
    if (!Number.isInteger(n))
      throw new Error("Coefficients must be positive integers");
    return n;
  });
}
export function conservationInitial(p: State): ConservationState {
  reactionDefinition(p.reactionId);
  return {
    reactionId: String(p.reactionId),
    coefficients: coefficients(p.coefficients),
  };
}
export function conservationMeasure(s: State): State {
  const definition = reactionDefinition(s.reactionId),
    values = coefficients(s.coefficients);
  const elements = [
    ...new Set(definition.species.flatMap((sp) => Object.keys(sp.atoms))),
  ];
  const atoms = elements.map((element) => {
    let left = 0,
      right = 0;
    definition.species.forEach((sp, i) => {
      const count =
        ((sp.atoms as Record<string, number>)[element] ?? 0) * values[i];
      if (sp.side === "left") left += count;
      else right += count;
    });
    return { element, left, right, conserved: left === right };
  });
  const term = (i: number) =>
    `${values[i] === 1 ? "" : values[i]}${definition.species[i].formula}`;
  return {
    equation: `${term(0)} + ${term(1)} → ${term(2)}`,
    balanced: atoms.every((a) => a.conserved),
    atoms,
    molecules: definition.species.map((sp, i) => ({
      formula: sp.formula,
      side: sp.side,
      count: values[i],
      atoms: { ...sp.atoms },
    })),
  };
}
export function conservationApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "CHEM_SET_COEFFICIENTS")
    return conservationInitial({ ...s, coefficients: value });
  if (action !== "CHEM_BALANCE")
    throw new Error("Unsupported conservation operation");
  // Search only the finite registered definitions; lexicographically deterministic minimum sum.
  let best: number[] | undefined;
  for (let a = 1; a <= 12; a++)
    for (let b = 1; b <= 12; b++)
      for (let c = 1; c <= 12; c++) {
        if (best && a + b + c >= best.reduce((sum, n) => sum + n, 0)) continue;
        if (conservationMeasure({ ...s, coefficients: [a, b, c] }).balanced)
          best = [a, b, c];
      }
  if (!best) throw new Error("No supported bounded balance exists");
  return conservationInitial({ ...s, coefficients: best });
}

export function rateInitial(p: State): ReactionRateState {
  return {
    initialConcentration: number(
      p.initialConcentration,
      0.001,
      100,
      "A₀ (mol/L)",
    ),
    temperature: number(p.temperature, 250, 400, "Temperature (K)"),
    referenceRate: number(p.referenceRate, 0.0001, 10, "k at 300 K (s⁻¹)"),
    activationEnergy: number(
      p.activationEnergy,
      0,
      100000,
      "Activation energy (J/mol)",
    ),
    duration: number(p.duration, 0.1, 10000, "Run duration (s)"),
    elapsed: 0,
    comparisonTemperature: Number(p.temperature),
    playing: false,
  };
}
export function rateConfiguration(s: State): State {
  const {
    initialConcentration,
    temperature,
    referenceRate,
    activationEnergy,
    duration,
  } = s;
  return {
    initialConcentration,
    temperature,
    referenceRate,
    activationEnergy,
    duration,
  };
}
export function rateApply(s: State, action: string, value?: unknown): State {
  if (action === "CHEM_RESTART_RATE") return { ...s, elapsed: 0 };
  if (action === "CHEM_SET_RATE_PLAYING") {
    if (typeof value !== "boolean")
      throw new Error("Playing must be a boolean");
    return { ...s, playing: value };
  }
  if (action === "CHEM_STEP_RATE") {
    if (s.playing) throw new Error("Pause the run before stepping");
    return {
      ...s,
      elapsed: Math.min(Number(s.duration), Number(s.elapsed) + 1),
    };
  }
  if (action !== "CHEM_SET_TEMPERATURE")
    throw new Error("Unsupported rate operation");
  return {
    ...rateInitial({ ...s, temperature: value }),
    comparisonTemperature: s.temperature,
    playing: s.playing,
  };
}
export function rateStep(s: State, delta: number): State {
  if (!Number.isFinite(delta) || delta < 0)
    throw new Error("Invalid simulation timestep");
  if (!s.playing) return s;
  const elapsed = Math.min(Number(s.duration), Number(s.elapsed) + delta);
  return { ...s, elapsed, playing: elapsed < Number(s.duration) };
}
export function rateMeasure(s: State): State {
  const p = rateInitial(s),
    time = number(s.elapsed, 0, Number(p.duration), "Elapsed time (s)");
  const temperature = Number(p.temperature),
    comparisonTemperature = number(
      s.comparisonTemperature,
      250,
      400,
      "Comparison temperature (K)",
    );
  const rateAt = (t: number) =>
    Number(p.referenceRate) *
    Math.exp((-Number(p.activationEnergy) / 8.314) * (1 / t - 1 / 300));
  const k = rateAt(temperature),
    comparisonRate = rateAt(comparisonTemperature),
    initial = Number(p.initialConcentration);
  const aAt = (t: number, rate: number) => initial * Math.exp(-rate * t);
  const concentrationA = aAt(time, k);
  const points = Array.from({ length: 25 }, (_, i) => ({
    x: (Number(p.duration) * i) / 24,
    y: aAt((Number(p.duration) * i) / 24, k),
  }));
  return {
    temperature,
    comparisonTemperature,
    playing: s.playing,
    rateConstant: k,
    halfLife: Math.LN2 / k,
    comparisonRate,
    comparisonHalfLife: Math.LN2 / comparisonRate,
    elapsed: time,
    concentrationA,
    concentrationB: initial - concentrationA,
    totalConcentration: initial,
    points,
    productPoints: points.map(({ x, y }) => ({ x, y: initial - y })),
    comparisonPoints: points.map(({ x }) => ({ x, y: aAt(x, comparisonRate) })),
  };
}
