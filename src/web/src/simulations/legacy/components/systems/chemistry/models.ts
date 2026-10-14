import {
  type ReactionId,
  phaseMaterials,
  reactions,
} from "../../resources/chemistry/definitions";
import type {
  AcidBaseTitrationState,
  BeerLambertState,
  ConservationState,
  DilutionState,
  GalvanicCellState,
  GasEquilibriumState,
  PhaseChangeState,
  PhaseMaterial,
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
  if (action === "CHEM_INCREMENT_SPECIES") {
    const idx =
      typeof value === "object" && value !== null && "index" in value
        ? Number((value as Record<string, unknown>).index)
        : Number(value);
    if (![0, 1, 2].includes(idx))
      throw new Error("Species index must be 0, 1, or 2");
    const current = coefficients(s.coefficients);
    const next = [...current];
    next[idx] = Math.min(12, next[idx] + 1);
    return conservationInitial({ ...s, coefficients: next });
  }
  if (action === "CHEM_DECREMENT_SPECIES") {
    const idx =
      typeof value === "object" && value !== null && "index" in value
        ? Number((value as Record<string, unknown>).index)
        : Number(value);
    if (![0, 1, 2].includes(idx))
      throw new Error("Species index must be 0, 1, or 2");
    const current = coefficients(s.coefficients);
    const next = [...current];
    next[idx] = Math.max(1, next[idx] - 1);
    return conservationInitial({ ...s, coefficients: next });
  }
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
  const acidType = p.acidType === "weak" ? "weak" : "strong";
  return {
    analyteVolume: number(p.analyteVolume ?? 25, 5, 100, "Analyte volume (mL)"),
    acidConcentration: number(p.acidConcentration ?? 0.1, 0.01, 2.0, "Acid concentration (M)"),
    baseConcentration: number(p.baseConcentration ?? 0.1, 0.01, 2.0, "Base concentration (M)"),
    titrantVolumeAdded: number(p.titrantVolumeAdded ?? 0, 0, 100, "Titrant volume added (mL)"),
    acidType,
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
  if (action === "CHEM_SET_ACID_TYPE") {
    if (value !== "strong" && value !== "weak")
      throw new Error("Acid type must be 'strong' or 'weak'");
    return titrationInitial({ ...s, acidType: value });
  }
  throw new Error(`Unsupported titration operation: ${action}`);
}

export function titrationMeasure(s: State): State {
  const p = titrationInitial(s);
  const Va = p.analyteVolume; // mL
  const Ca = p.acidConcentration; // mol/L
  const Cb = p.baseConcentration; // mol/L
  const Vb = p.titrantVolumeAdded; // mL
  const acidType = p.acidType ?? "strong";

  const eqVolume = (Ca * Va) / Cb; // mL
  const kw = 1e-14;
  const ka = 1.75e-5; // Acetic acid Ka (pKa ~ 4.757)

  const calcPHAt = (volAdded: number): number => {
    const totV = Va + volAdded;
    if (acidType === "strong") {
      if (volAdded < eqVolume - 1e-6) {
        const excessH = (Ca * Va - Cb * volAdded) / totV;
        const hConc = (excessH + Math.sqrt(excessH * excessH + 4 * kw)) / 2;
        return -Math.log10(Math.max(1e-14, hConc));
      }
      if (volAdded > eqVolume + 1e-6) {
        const excessOH = (Cb * volAdded - Ca * Va) / totV;
        const ohConc = (excessOH + Math.sqrt(excessOH * excessOH + 4 * kw)) / 2;
        const poh = -Math.log10(Math.max(1e-14, ohConc));
        return 14.0 - poh;
      }
      return 7.0;
    }

    // Weak acid titration with strong base
    if (volAdded <= 1e-6) {
      const hConc = (-ka + Math.sqrt(ka * ka + 4 * ka * Ca)) / 2;
      return -Math.log10(Math.max(1e-14, hConc));
    }
    if (volAdded < eqVolume - 1e-5) {
      // Buffer region: Henderson-Hasselbalch with quadratic stabilization
      const nHA = Ca * Va - Cb * volAdded;
      const cHA = nHA / totV;
      const cA = (Cb * volAdded) / totV;
      const b = ka + cA;
      const c = -ka * cHA;
      const hConc = (-b + Math.sqrt(b * b - 4 * c)) / 2;
      return -Math.log10(Math.max(1e-14, hConc));
    }
    if (volAdded > eqVolume + 1e-5) {
      // Excess strong base dominates beyond equivalence point
      const excessOH = (Cb * volAdded - Ca * Va) / totV;
      const ohConc = (excessOH + Math.sqrt(excessOH * excessOH + 4 * kw)) / 2;
      const poh = -Math.log10(Math.max(1e-14, ohConc));
      return 14.0 - poh;
    }
    // Equivalence point: weak conjugate base hydrolysis (mildly basic)
    const cA_eq = (Ca * Va) / (Va + eqVolume);
    const kb = kw / ka;
    const ohConc = (-kb + Math.sqrt(kb * kb + 4 * kb * cA_eq)) / 2;
    const poh = -Math.log10(Math.max(1e-14, ohConc));
    return 14.0 - poh;
  };

  const rawPh = calcPHAt(Vb);
  const ph = Math.max(0, Math.min(14, rawPh));
  const hConc = Math.pow(10, -ph);
  const ohConc = Math.pow(10, -(14.0 - ph));

  // Phenolphthalein indicator transitions:
  // Colorless below 8.2; faint-pink 8.2-9.2; pink 9.2-10.0; magenta above 10.0
  let indicatorColor = "colorless";
  if (ph > 10.0) indicatorColor = "magenta";
  else if (ph >= 9.2) indicatorColor = "pink";
  else if (ph >= 8.2) indicatorColor = "faint-pink";

  const equivalencePH = acidType === "strong" ? 7.0 : calcPHAt(eqVolume);
  const neutralized = Math.abs(ph - equivalencePH) <= 0.25 || Math.abs(Vb - eqVolume) <= 0.2;

  // Sample titration curve points
  const maxV = Math.max(eqVolume * 1.8, 40);
  const step = maxV / 24;
  const points = Array.from({ length: 25 }, (_, i) => {
    const vol = i * step;
    const curPh = Math.max(0, Math.min(14, calcPHAt(vol)));
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
    acidType,
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

  // Reaction quotient Qc = [NO2]_0^2 / [N2O4]_0
  const conc0_N2O4 = n0_N2O4 / V;
  const conc0_NO2 = n0_NO2 / V;
  const Qc = (conc0_NO2 * conc0_NO2) / Math.max(1e-6, conc0_N2O4);

  // Solve 4*xi^2 + (4*n0_NO2 + Kc*curV)*xi + ((n0_NO2)^2 - Kc*curV*n0_N2O4) = 0
  const solveXi = (curV: number): number => {
    const A = 4;
    const B = 4 * n0_NO2 + Kc * curV;
    const C = n0_NO2 * n0_NO2 - Kc * curV * n0_N2O4;
    const disc = Math.max(0, B * B - 4 * A * C);
    // Numerically stable root formulation avoiding catastrophic subtractive cancellation
    const q = -0.5 * (B + Math.sqrt(disc));
    const root = q !== 0 ? C / q : (-B + Math.sqrt(disc)) / (2 * A);
    const minXi = -n0_NO2 / 2 + 1e-6;
    const maxXi = n0_N2O4 - 1e-6;
    return Math.max(minXi, Math.min(maxXi, root));
  };

  const xi = solveXi(V);
  const eqN2O4 = Math.max(0.0001, n0_N2O4 - xi);
  const eqNO2 = Math.max(0.0001, n0_NO2 + 2 * xi);
  const concN2O4 = eqN2O4 / V;
  const concNO2 = eqNO2 / V;

  // Pressure P = n_total * R_gas * T / V, with R_gas = 0.08206 L*atm/(mol*K)
  const totalMoles = eqN2O4 + eqNO2;
  const pressure = (totalMoles * 0.08206 * T) / V;

  // NO2 is reddish-brown gas; N2O4 is completely colorless
  const gasColorIntensity = Math.min(1.0, Math.max(0.05, concNO2 / 0.35));

  let shiftDirection = "equilibrated";
  if (xi > 0.008) shiftDirection = "shifted-to-products";
  else if (xi < -0.008) shiftDirection = "shifted-to-reactants";

  // Comparison curve across volume range [1L to 20L]
  const points = Array.from({ length: 25 }, (_, i) => {
    const vol = 1 + (19 * i) / 24;
    const curXi = solveXi(vol);
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
    reactionQuotient: Math.round(Qc * 10000) / 10000,
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

// ---------------------------------------------------------------------------
// 6. Phase Change & Supercritical Fluids Model
// ---------------------------------------------------------------------------

function validateMaterial(m: unknown): PhaseMaterial {
  if (m === "water" || m === "carbon-dioxide" || m === "nitrogen") {
    return m;
  }
  throw new Error(
    `Invalid material type "${String(m)}". Supported materials are: water, carbon-dioxide, nitrogen`,
  );
}

export function phaseChangeInitial(p: State): PhaseChangeState {
  return {
    material: validateMaterial(p.material ?? "water"),
    temperature: number(p.temperature ?? 300, 50, 750, "Temperature (K)"),
    pressure: number(p.pressure ?? 1.0, 0.001, 300, "Pressure (atm)"),
  };
}

export function phaseChangeApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "CHEM_SET_MATERIAL") {
    return phaseChangeInitial({
      ...s,
      material: validateMaterial(value),
    });
  }
  if (action === "CHEM_SET_PHASE_TEMP") {
    return phaseChangeInitial({
      ...s,
      temperature: number(value, 50, 750, "Temperature (K)"),
    });
  }
  if (action === "CHEM_SET_PHASE_PRESSURE") {
    return phaseChangeInitial({
      ...s,
      pressure: number(value, 0.001, 300, "Pressure (atm)"),
    });
  }
  throw new Error(`Unsupported phase change operation: ${action}`);
}

function calcPhaseBoundaryP(
  mat: (typeof phaseMaterials)[string],
  tK: number,
): number {
  const R = 8.314;
  if (tK < mat.T_triple) {
    const pSub =
      mat.P_triple * Math.exp((-mat.dH_sub / R) * (1 / tK - 1 / mat.T_triple));
    return Math.max(0.0001, pSub);
  }
  if (tK <= mat.T_crit) {
    const pVap =
      mat.P_triple * Math.exp((-mat.dH_vap / R) * (1 / tK - 1 / mat.T_triple));
    return Math.min(mat.P_crit, Math.max(0.0001, pVap));
  }
  return mat.P_crit;
}

export function phaseChangeMeasure(s: State): State {
  const p = phaseChangeInitial(s);
  const matKey = p.material;
  const mat = phaseMaterials[matKey] ?? phaseMaterials.water;
  const { T_triple, P_triple, T_crit, P_crit, fusionSlope, dH_vap, dH_sub } =
    mat;
  const T = p.temperature;
  const P = p.pressure;
  const R = 8.314;

  const invTBoil =
    1 / T_triple -
    (R / dH_vap) * Math.log(Math.max(0.0001, P / P_triple));
  const T_boil = invTBoil > 0 ? Math.min(T_crit, 1 / invTBoil) : T_crit;

  const invTSubl =
    1 / T_triple -
    (R / dH_sub) * Math.log(Math.max(0.0001, P / P_triple));
  const T_subl = invTSubl > 0 ? 1 / invTSubl : T_triple;

  const T_melt = Math.max(10, T_triple + fusionSlope * (P - P_triple));

  let phase: "Solid" | "Liquid" | "Gas" | "Supercritical Fluid";
  let isSupercritical = false;

  if (T > T_crit && P > P_crit) {
    phase = "Supercritical Fluid";
    isSupercritical = true;
  } else if (P < P_triple) {
    phase = T < T_subl ? "Solid" : "Gas";
  } else if (P <= P_crit) {
    if (T < T_melt) {
      phase = "Solid";
    } else if (T <= T_boil) {
      phase = "Liquid";
    } else {
      phase = "Gas";
    }
  } else {
    phase = T < T_melt ? "Solid" : "Liquid";
  }

  // Refined boundary descriptions with triple point & critical point recognition
  const nearTriple =
    Math.abs(T - T_triple) < 3 &&
    Math.abs(P - P_triple) / Math.max(0.001, P_triple) < 0.2;
  const nearCrit =
    Math.abs(T - T_crit) < 4 && Math.abs(P - P_crit) / P_crit < 0.1;

  let transitionState = `Equilibrium Phase: ${phase}`;
  if (isSupercritical) {
    transitionState =
      "Supercritical Fluid (T > Tc, P > Pc: dense non-condensing fluid, zero surface tension)";
  } else if (nearCrit) {
    transitionState =
      "Critical Point (Liquid-gas boundary terminates; enters supercritical fluid regime)";
  } else if (nearTriple) {
    transitionState =
      "Triple Point (Solid, Liquid, and Gas phases coexist in thermodynamic equilibrium)";
  } else if (P < P_triple && Math.abs(T - T_subl) < 3.5) {
    transitionState = "Sublimation / Deposition Boundary (Solid ⇌ Gas)";
  } else if (Math.abs(T - T_melt) < 3.5) {
    transitionState = "Melting / Freezing Boundary (Solid ⇌ Liquid)";
  } else if (P <= P_crit && Math.abs(T - T_boil) < 3.5) {
    transitionState = "Vaporization / Condensation Boundary (Liquid ⇌ Gas)";
  }

  let density = 1.0;
  if (phase === "Solid") {
    density =
      matKey === "water" ? 0.917 : matKey === "carbon-dioxide" ? 1.562 : 1.026;
  } else if (phase === "Liquid") {
    if (matKey === "water") {
      density = Math.max(0.85, 0.997 - 0.0003 * Math.max(0, T - 273.15));
    } else if (matKey === "carbon-dioxide") {
      density = Math.max(0.8, 1.1 - 0.0015 * Math.max(0, T - 216.58));
    } else {
      density = Math.max(0.65, 0.808 - 0.002 * Math.max(0, T - 63.15));
    }
  } else if (phase === "Gas") {
    const molarMass = mat.molarMass;
    const gasGL = (P * molarMass) / (0.08206 * T);
    density = Math.max(0.0001, gasGL / 1000);
  } else {
    // Supercritical fluid: hybrid density scaling smoothly with P and T
    const critDensity =
      matKey === "water" ? 0.322 : matKey === "carbon-dioxide" ? 0.468 : 0.311;
    const pFactor = Math.pow(P / P_crit, 0.42);
    const tFactor = Math.pow(T_crit / T, 0.32);
    const scDensity = critDensity * pFactor * tFactor;
    const maxDensity =
      matKey === "water" ? 1.1 : matKey === "carbon-dioxide" ? 1.3 : 0.9;
    density = Math.min(maxDensity, Math.max(0.12, scDensity));
  }

  const points = Array.from({ length: 30 }, (_, i) => {
    const tStep = 50 + (i * 700) / 29;
    return {
      x: Math.round(tStep),
      y: Math.round(calcPhaseBoundaryP(mat, tStep) * 100) / 100,
    };
  });

  return {
    material: matKey,
    materialName: mat.name,
    formula: mat.formula,
    temperature: Math.round(T * 10) / 10,
    pressure: Math.round(P * 1000) / 1000,
    phase,
    isSupercritical,
    transitionState,
    density: Math.round(density * 1000) / 1000,
    triplePointTemp: mat.T_triple,
    triplePointPressure: mat.P_triple,
    criticalPointTemp: mat.T_crit,
    criticalPointPressure: mat.P_crit,
    normalBoilingTemp: mat.T_boil_1atm,
    normalMeltingTemp: mat.T_melt_1atm,
    points,
  };
}

// ---------------------------------------------------------------------------
// 7. Beer-Lambert Law & Spectrophotometry Model
// ---------------------------------------------------------------------------

export function beerLambertInitial(p: State): BeerLambertState {
  return {
    concentration: number(p.concentration ?? 50, 0, 400, "Concentration (mM)"),
    pathLength: number(p.pathLength ?? 1.0, 0.5, 3.0, "Path length (cm)"),
    molarAbsorptivity: number(
      p.molarAbsorptivity ?? 0.02,
      0.01,
      0.1,
      "Molar absorptivity (mM⁻¹ cm⁻¹)",
    ),
  };
}

export function beerLambertApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "CHEM_SET_BEER_CONCENTRATION") {
    return beerLambertInitial({
      ...s,
      concentration: number(value, 0, 400, "Concentration (mM)"),
    });
  }
  if (action === "CHEM_SET_BEER_PATH_LENGTH") {
    return beerLambertInitial({
      ...s,
      pathLength: number(value, 0.5, 3.0, "Path length (cm)"),
    });
  }
  if (action === "CHEM_SET_BEER_EPSILON") {
    return beerLambertInitial({
      ...s,
      molarAbsorptivity: number(
        value,
        0.01,
        0.1,
        "Molar absorptivity (mM⁻¹ cm⁻¹)",
      ),
    });
  }
  if (action === "CHEM_RESET_BEER") {
    return beerLambertInitial({
      concentration: 50,
      pathLength: 1.0,
      molarAbsorptivity: 0.02,
    });
  }
  throw new Error(`Unsupported Beer-Lambert operation: ${action}`);
}

export function beerLambertMeasure(s: State): State {
  const p = beerLambertInitial(s);
  // Guard against negative concentration or path length
  const c = Math.max(0, p.concentration);
  const b = Math.max(0.01, p.pathLength);
  const eps = Math.max(0.001, p.molarAbsorptivity);

  // A = eps * b * c (Beer-Lambert law)
  const rawAbsorbance = eps * b * c;
  const absorbance = Math.max(0, Math.round(rawAbsorbance * 1000) / 1000);

  // Transmittance T = 10^(-A) * 100%
  // Guard against underflow with minimum transmittance fraction 1e-7
  const transmittanceFraction = Math.min(
    1.0,
    Math.max(1e-7, Math.pow(10, -rawAbsorbance)),
  );
  const transmittancePercent = Math.min(
    100,
    Math.max(0, transmittanceFraction * 100),
  );
  const transmittance = Math.round(transmittancePercent * 100) / 100;

  // Incident intensity I0 = 100 mW/cm², transmitted intensity I = I0 * T
  const transmittedIntensity =
    Math.round(100 * transmittanceFraction * 100) / 100;

  // Visual solution tint fraction (0 to 1)
  const colorIntensity = Math.min(
    0.95,
    Math.max(0.05, 0.05 + 0.9 * (c / 400)),
  );

  // Calibration curve points: Absorbance A as function of concentration c across [0, 400] mM
  const points = Array.from({ length: 25 }, (_, i) => {
    const concStep = (i * 400) / 24;
    const aVal = Math.max(0, eps * b * concStep);
    return {
      x: Math.round(concStep * 10) / 10,
      y: Math.round(aVal * 1000) / 1000,
    };
  });

  return {
    concentration: Math.round(c * 10) / 10,
    pathLength: Math.round(b * 100) / 100,
    molarAbsorptivity: Math.round(eps * 1000) / 1000,
    absorbance,
    transmittance,
    transmittanceFraction: Math.round(transmittanceFraction * 10000) / 10000,
    transmittedIntensity,
    colorIntensity: Math.round(colorIntensity * 100) / 100,
    points,
  };
}

// ---------------------------------------------------------------------------
// 8. Galvanic / Voltaic Cell Model (Daniell Cell & Nernst Equation)
// ---------------------------------------------------------------------------

export function galvanicCellInitial(p: State): GalvanicCellState {
  return {
    znConcentration: number(
      p.znConcentration ?? 1.0,
      0.001,
      2.0,
      "Zinc concentration (mol/L)",
    ),
    cuConcentration: number(
      p.cuConcentration ?? 1.0,
      0.001,
      2.0,
      "Copper concentration (mol/L)",
    ),
    temperature: number(
      p.temperature ?? 298.15,
      273.15,
      373.15,
      "Temperature (K)",
    ),
  };
}

export function galvanicCellApply(
  s: State,
  action: string,
  value?: unknown,
): State {
  if (action === "CHEM_SET_ZN_CONC") {
    return galvanicCellInitial({
      ...s,
      znConcentration: number(value, 0.001, 2.0, "Zinc concentration (mol/L)"),
    });
  }
  if (action === "CHEM_SET_CU_CONC") {
    return galvanicCellInitial({
      ...s,
      cuConcentration: number(value, 0.001, 2.0, "Copper concentration (mol/L)"),
    });
  }
  if (action === "CHEM_RESET_CELL") {
    return galvanicCellInitial({
      znConcentration: 1.0,
      cuConcentration: 1.0,
      temperature: 298.15,
    });
  }
  throw new Error(`Unsupported Galvanic cell operation: ${action}`);
}

export function galvanicCellMeasure(s: State): State {
  const p = galvanicCellInitial(s);
  // Guard against zero / negative concentrations (strictly >= 0.0001 M) to prevent log(0) singularity
  const znConc = Math.max(0.0001, p.znConcentration);
  const cuConc = Math.max(0.0001, p.cuConcentration);
  const T = Math.max(200, p.temperature ?? 298.15);

  // Constants
  const R = 8.31446; // J/(mol*K)
  const F = 96485.33; // C/mol
  const n = 2; // 2 electrons transferred: Zn(s) + Cu²⁺(aq) -> Zn²⁺(aq) + Cu(s)
  const E0_cathode = 0.34; // Cu²⁺/Cu reduction potential
  const E0_anode = -0.76; // Zn²⁺/Zn reduction potential
  const standardPotential = E0_cathode - E0_anode; // +1.10 V

  // Reaction quotient Q = [Zn²⁺] / [Cu²⁺] (strictly guarded against division by zero and non-positive argument)
  const reactionQuotient = Math.max(1e-6, znConc / cuConc);

  // Nernst slope: RT / (nF) ≈ 0.012845 V at 298.15 K
  const nernstSlope = (R * T) / (n * F);
  const nernstTerm = nernstSlope * Math.log(reactionQuotient);
  const cellPotentialRaw = standardPotential - nernstTerm;
  const cellPotential = Math.round(cellPotentialRaw * 1000) / 1000;

  // Gibbs free energy: Delta G = -n * F * E_cell (in kJ/mol)
  const deltaG = Math.round(((-n * F * cellPotentialRaw) / 1000) * 10) / 10;
  const isSpontaneous = cellPotentialRaw > 0;
  const electronFlowDirection = isSpontaneous
    ? "Zn anode → Cu cathode"
    : "Cu cathode → Zn anode (non-spontaneous)";

  // Relative ion flux / electron flow speed indicator (scaled 0.1 to 1)
  const electronFlowRate = Math.min(
    1.0,
    Math.max(0.1, cellPotentialRaw / 1.1),
  );

  // Visual solution opacities
  const znColorIntensity = Math.min(
    0.4,
    Math.max(0.05, 0.05 + 0.35 * (znConc / 2.0)),
  );
  const cuColorIntensity = Math.min(
    0.9,
    Math.max(0.15, 0.15 + 0.75 * (cuConc / 2.0)),
  );

  // Potential curve across Zn2+ concentration [0.001 M to 2.0 M] with Cu2+ fixed at current value
  const points = Array.from({ length: 25 }, (_, i) => {
    const curZn = 0.001 + (1.999 * i) / 24;
    const curQ = Math.max(1e-6, curZn / cuConc);
    const curE = standardPotential - nernstSlope * Math.log(curQ);
    return {
      x: Math.round(curZn * 1000) / 1000,
      y: Math.round(curE * 1000) / 1000,
    };
  });

  return {
    znConcentration: Math.round(znConc * 1000) / 1000,
    cuConcentration: Math.round(cuConc * 1000) / 1000,
    temperature: Math.round(T * 10) / 10,
    standardPotential,
    cellPotential,
    reactionQuotient: Math.round(reactionQuotient * 10000) / 10000,
    deltaG,
    isSpontaneous,
    electronFlowDirection,
    electronFlowRate: Math.round(electronFlowRate * 100) / 100,
    znColorIntensity: Math.round(znColorIntensity * 100) / 100,
    cuColorIntensity: Math.round(cuColorIntensity * 100) / 100,
    points,
  };
}


