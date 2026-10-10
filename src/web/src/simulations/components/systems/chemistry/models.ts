import {
  type ReactionId,
  reactions,
} from "../../resources/chemistry/definitions";
import type {
  AcidBaseTitrationState,
  ConservationState,
  DilutionState,
  GasEquilibriumState,
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

// ---------------------------------------------------------------------------
// 4. Acid-Base Titration & pH Neutralization Model
// ---------------------------------------------------------------------------

export function titrationInitial(p: State): AcidBaseTitrationState {
  return {
    analyteVolume: number(p.analyteVolume ?? 25, 5, 100, "Analyte volume (mL)"),
    acidConcentration: number(p.acidConcentration ?? 0.1, 0.01, 2.0, "Acid concentration (M)"),
    baseConcentration: number(p.baseConcentration ?? 0.1, 0.01, 2.0, "Base concentration (M)"),
    titrantVolumeAdded: number(p.titrantVolumeAdded ?? 0, 0, 100, "Titrant volume added (mL)"),
  };
}

export function titrationApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "CHEM_ADD_TITRANT") {
    const inc = number(value ?? 1, 0.1, 50, "Titrant increment (mL)");
    return titrationInitial({
      ...s,
      titrantVolumeAdded: Math.min(100, Number(s.titrantVolumeAdded ?? 0) + inc),
    });
  }
  if (action === "CHEM_SET_TITRANT_VOLUME") {
    return titrationInitial({
      ...s,
      titrantVolumeAdded: number(value, 0, 100, "Titrant volume (mL)"),
    });
  }
  if (action === "CHEM_RESET_TITRATION") {
    return titrationInitial({ ...s, titrantVolumeAdded: 0 });
  }
  if (action === "CHEM_SET_ACID_CONC") {
    return titrationInitial({
      ...s,
      acidConcentration: number(value, 0.01, 2.0, "Acid concentration (M)"),
    });
  }
  throw new Error(`Unsupported titration operation: ${action}`);
}

export function titrationMeasure(s: State): State {
  const p = titrationInitial(s);
  const Va = p.analyteVolume; // mL
  const Ca = p.acidConcentration; // mol/L
  const Cb = p.baseConcentration; // mol/L
  const Vb = p.titrantVolumeAdded; // mL

  const eqVolume = (Ca * Va) / Cb; // mL

  // Calculate pH for strong acid - strong base titration
  const totalVolume = Va + Vb; // mL
  let ph = 7.0;
  let hConc = 1e-7;
  let ohConc = 1e-7;

  const kw = 1e-14;
  if (Vb < eqVolume - 1e-5) {
    const excessH = ((Ca * Va - Cb * Vb) / totalVolume); // mol/L
    // Quadratic accounting for water autoionization
    hConc = (excessH + Math.sqrt(excessH * excessH + 4 * kw)) / 2;
    ph = -Math.log10(hConc);
    ohConc = kw / hConc;
  } else if (Vb > eqVolume + 1e-5) {
    const excessOH = ((Cb * Vb - Ca * Va) / totalVolume); // mol/L
    ohConc = (excessOH + Math.sqrt(excessOH * excessOH + 4 * kw)) / 2;
    const poh = -Math.log10(ohConc);
    ph = 14.0 - poh;
    hConc = kw / ohConc;
  } else {
    ph = 7.0;
    hConc = 1e-7;
    ohConc = 1e-7;
  }

  // Phenolphthalein color indicator
  let indicatorColor = "colorless";
  if (ph > 10.0) indicatorColor = "magenta";
  else if (ph >= 8.2) indicatorColor = "faint-pink";

  const neutralized = Math.abs(ph - 7.0) <= 0.1;

  // Sample titration curve points up to 2 * Veq
  const maxV = Math.max(eqVolume * 1.8, 40);
  const step = maxV / 24;
  const points = Array.from({ length: 25 }, (_, i) => {
    const vol = i * step;
    let curPh = 7.0;
    if (vol < eqVolume - 1e-5) {
      const excess = (Ca * Va - Cb * vol) / (Va + vol);
      const h = (excess + Math.sqrt(excess * excess + 4 * kw)) / 2;
      curPh = -Math.log10(h);
    } else if (vol > eqVolume + 1e-5) {
      const excess = (Cb * vol - Ca * Va) / (Va + vol);
      const oh = (excess + Math.sqrt(excess * excess + 4 * kw)) / 2;
      curPh = 14.0 - (-Math.log10(oh));
    }
    return {
      x: Math.round(vol * 10) / 10,
      y: Math.round(curPh * 100) / 100,
    };
  });

  return {
    analyteVolume: Va,
    acidConcentration: Ca,
    baseConcentration: Cb,
    titrantVolumeAdded: Vb,
    equivalenceVolume: Math.round(eqVolume * 100) / 100,
    currentPH: Math.round(ph * 100) / 100,
    hConcentration: hConc,
    ohConcentration: ohConc,
    indicatorColor,
    neutralized,
    points,
  };
}

// ---------------------------------------------------------------------------
// 5. Chemical Gas Equilibrium & Le Chatelier's Principle Model
// ---------------------------------------------------------------------------

export function gasEquilibriumInitial(p: State): GasEquilibriumState {
  return {
    temperature: number(p.temperature ?? 298, 250, 450, "Temperature (K)"),
    volume: number(p.volume ?? 5, 1, 20, "Volume (L)"),
    initialN2O4: number(p.initialN2O4 ?? 1.0, 0.1, 10, "Initial N₂O₄ (mol)"),
    initialNO2: number(p.initialNO2 ?? 0.0, 0.0, 10, "Initial NO₂ (mol)"),
  };
}

export function gasEquilibriumApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "CHEM_SET_EQ_TEMP") {
    return gasEquilibriumInitial({
      ...s,
      temperature: number(value, 250, 450, "Temperature (K)"),
    });
  }
  if (action === "CHEM_SET_EQ_VOLUME") {
    return gasEquilibriumInitial({
      ...s,
      volume: number(value, 1, 20, "Volume (L)"),
    });
  }
  if (action === "CHEM_ADD_GAS") {
    if (typeof value === "object" && value !== null) {
      const v = value as Record<string, unknown>;
      return gasEquilibriumInitial({
        ...s,
        initialN2O4: Number(s.initialN2O4) + Number(v.n2o4 ?? 0),
        initialNO2: Number(s.initialNO2) + Number(v.no2 ?? 0),
      });
    }
    return gasEquilibriumInitial({
      ...s,
      initialNO2: Math.min(10, Number(s.initialNO2) + 0.5),
    });
  }
  throw new Error(`Unsupported gas equilibrium operation: ${action}`);
}

export function gasEquilibriumMeasure(s: State): State {
  const p = gasEquilibriumInitial(s);
  const T = p.temperature;
  const V = p.volume;
  const n0_N2O4 = p.initialN2O4;
  const n0_NO2 = p.initialNO2;

  // Kc(T) using van 't Hoff: N2O4 <=> 2 NO2, Delta H = +57.2 kJ/mol
  const R = 8.314; // J/(mol*K)
  const T0 = 298.15;
  const deltaH = 57200; // J/mol
  const Kc0 = 0.0058; // mol/L at 298 K
  const Kc = Kc0 * Math.exp((-deltaH / R) * (1 / T - 1 / T0));

  // Solve 4*xi^2 + (4*n0_NO2 + Kc*V)*xi + ((n0_NO2)^2 - Kc*V*n0_N2O4) = 0
  const A = 4;
  const B = 4 * n0_NO2 + Kc * V;
  const C = n0_NO2 * n0_NO2 - Kc * V * n0_N2O4;
  const disc = Math.max(0, B * B - 4 * A * C);
  const xi = (-B + Math.sqrt(disc)) / (2 * A);

  const eqN2O4 = Math.max(0.0001, n0_N2O4 - xi);
  const eqNO2 = Math.max(0.0001, n0_NO2 + 2 * xi);
  const concN2O4 = eqN2O4 / V;
  const concNO2 = eqNO2 / V;

  // Pressure P = n_total * R_gas * T / V, with R_gas = 0.08206 L*atm/(mol*K)
  const totalMoles = eqN2O4 + eqNO2;
  const pressure = (totalMoles * 0.08206 * T) / V;

  // NO2 is reddish-brown gas; N2O4 is completely colorless
  const gasColorIntensity = Math.min(1.0, concNO2 / 0.4);

  let shiftDirection = "equilibrated";
  if (xi > 0.01) shiftDirection = "shifted-to-products";
  else if (xi < -0.01) shiftDirection = "shifted-to-reactants";

  // Comparison curve across volume range [1L to 20L]
  const points = Array.from({ length: 25 }, (_, i) => {
    const vol = 1 + (19 * i) / 24;
    const curB = 4 * n0_NO2 + Kc * vol;
    const curC = n0_NO2 * n0_NO2 - Kc * vol * n0_N2O4;
    const curD = Math.max(0, curB * curB - 4 * A * curC);
    const curXi = (-curB + Math.sqrt(curD)) / (2 * A);
    const no2 = Math.max(0.0001, n0_NO2 + 2 * curXi);
    return {
      x: Math.round(vol * 10) / 10,
      y: Math.round((no2 / vol) * 1000) / 1000,
    };
  });

  return {
    temperature: T,
    volume: V,
    initialN2O4: n0_N2O4,
    initialNO2: n0_NO2,
    equilibriumConstant: Math.round(Kc * 10000) / 10000,
    molesN2O4: Math.round(eqN2O4 * 1000) / 1000,
    molesNO2: Math.round(eqNO2 * 1000) / 1000,
    concN2O4: Math.round(concN2O4 * 1000) / 1000,
    concNO2: Math.round(concNO2 * 1000) / 1000,
    totalPressure: Math.round(pressure * 100) / 100,
    gasColorIntensity: Math.round(gasColorIntensity * 100) / 100,
    shiftDirection,
    points,
  };
}

