import type {
  DiffusionState,
  NaturalState,
  PlantGrowthState,
  PredatorPreyState,
} from "../../traits/natural-systems/state";

function number(value: unknown, min: number, max: number, label: string) {
  if (
    typeof value !== "number" ||
    !Number.isFinite(value) ||
    value < min ||
    value > max
  )
    throw new Error(`${label}: expected a finite value from ${min} to ${max}`);
  return value;
}
function integer(value: unknown, min: number, max: number, label: string) {
  const result = number(value, min, max, label);
  if (!Number.isInteger(result))
    throw new Error(`${label}: expected an integer`);
  return result;
}
function bool(value: unknown, label: string) {
  if (typeof value !== "boolean")
    throw new Error(`${label}: expected true or false`);
  return value;
}

function centralDeposit(gridSize: number, width: number, mass: number) {
  const field = Array<number>(gridSize * gridSize).fill(0);
  const dx = width / gridSize;
  field[Math.floor(gridSize / 2) * gridSize + Math.floor(gridSize / 2)] =
    mass / (dx * dx);
  return field;
}

/**
 * Conservative finite-volume face fluxes. Each face transfer is added to one
 * cell and subtracted from its neighbour, so no-flux boundaries conserve mass.
 */
export function diffuseFiniteVolume(
  field: readonly number[],
  gridSize: number,
  width: number,
  coefficient: number,
  elapsed: number,
) {
  const dx = width / gridSize;
  const stableStep = (0.24 * dx * dx) / coefficient;
  const steps = Math.max(1, Math.ceil(elapsed / stableStep));
  const dt = elapsed / steps;
  let current = [...field];
  for (let step = 0; step < steps; step++) {
    const next = [...current];
    const ratio = (coefficient * dt) / (dx * dx);
    for (let row = 0; row < gridSize; row++)
      for (let column = 0; column < gridSize; column++) {
        const here = row * gridSize + column;
        if (column + 1 < gridSize) {
          const there = here + 1;
          const transfer = ratio * (current[there] - current[here]);
          next[here] += transfer;
          next[there] -= transfer;
        }
        if (row + 1 < gridSize) {
          const there = here + gridSize;
          const transfer = ratio * (current[there] - current[here]);
          next[here] += transfer;
          next[there] -= transfer;
        }
      }
    current = next.map((value) => (value < 0 && value > -1e-12 ? 0 : value));
  }
  return current;
}

export function diffusionInitial(p: NaturalState): DiffusionState {
  const diffusionCoefficient = number(
    p.diffusionCoefficient,
    0.001,
    1,
    "Diffusion coefficient (m²/s)",
  );
  const width = number(p.width, 0.1, 10, "Tank width (m)");
  const gridSize = integer(p.gridSize, 9, 15, "Grid size");
  const dyeMass = number(p.dyeMass, 0.001, 100, "Dye mass");
  const duration = number(p.duration, 0.1, 60, "Duration (s)");
  const field = centralDeposit(gridSize, width, dyeMass);
  return {
    diffusionCoefficient,
    comparisonCoefficient: diffusionCoefficient,
    width,
    gridSize,
    dyeMass,
    duration,
    elapsed: 0,
    playing: false,
    field,
    comparisonField: [...field],
  };
}
export function diffusionConfiguration(s: NaturalState) {
  return {
    diffusionCoefficient: s.diffusionCoefficient,
    width: s.width,
    gridSize: s.gridSize,
    dyeMass: s.dyeMass,
    duration: s.duration,
  };
}
function restartDiffusion(
  s: DiffusionState,
  coefficient: number,
): DiffusionState {
  const field = centralDeposit(s.gridSize, s.width, s.dyeMass);
  return {
    ...s,
    diffusionCoefficient: coefficient,
    comparisonCoefficient: s.diffusionCoefficient,
    elapsed: 0,
    field: [...field],
    comparisonField: [...field],
  };
}
export function diffusionApply(
  s: NaturalState,
  action: string,
  value?: unknown,
) {
  const state = s as DiffusionState;
  if (action === "DIFF_SET_PLAYING")
    return { ...state, playing: bool(value, "Playing") };
  if (action === "DIFF_RESTART") {
    const initial = centralDeposit(state.gridSize, state.width, state.dyeMass);
    return {
      ...state,
      elapsed: 0,
      field: initial,
      comparisonField: [...initial],
    };
  }
  if (action === "DIFF_STEP") {
    if (state.playing) throw new Error("Pause diffusion before stepping");
    return advanceDiffusion(
      state,
      Math.min(0.25, state.duration - state.elapsed),
    );
  }
  if (action === "DIFF_SCALE_COEFFICIENT") {
    const factor = number(value, 0.1, 10, "Diffusion coefficient multiplier");
    return restartDiffusion(
      state,
      number(
        state.diffusionCoefficient * factor,
        0.001,
        1,
        "Diffusion coefficient (m²/s)",
      ),
    );
  }
  if (action === "DIFF_SET_COEFFICIENT")
    return restartDiffusion(
      state,
      number(value, 0.001, 1, "Diffusion coefficient (m²/s)"),
    );
  throw new Error("Unsupported diffusion operation");
}
export function diffusionStep(s: NaturalState, delta: number): DiffusionState {
  const state = s as DiffusionState;
  number(delta, 0, 60, "Simulation timestep");
  if (!state.playing || state.elapsed >= state.duration) return state;
  return advanceDiffusion(state, delta);
}
function advanceDiffusion(
  state: DiffusionState,
  delta: number,
): DiffusionState {
  const advance = Math.min(delta, state.duration - state.elapsed);
  return {
    ...state,
    elapsed: state.elapsed + advance,
    field: diffuseFiniteVolume(
      state.field,
      state.gridSize,
      state.width,
      state.diffusionCoefficient,
      advance,
    ),
    comparisonField: diffuseFiniteVolume(
      state.comparisonField,
      state.gridSize,
      state.width,
      state.comparisonCoefficient,
      advance,
    ),
    playing: state.elapsed + advance < state.duration && state.playing,
  };
}
function fieldReadings(state: DiffusionState, field: readonly number[]) {
  const center = Math.floor(state.gridSize / 2);
  const dx = state.width / state.gridSize;
  return {
    mass: field.reduce((sum, value) => sum + value * dx * dx, 0),
    center: field[center * state.gridSize + center],
    midway:
      field[center * state.gridSize + Math.floor((3 * state.gridSize) / 4)],
    edge: field[center * state.gridSize + state.gridSize - 1],
  };
}
export function diffusionMeasure(s: NaturalState): NaturalState {
  const state = s as DiffusionState;
  const current = fieldReadings(state, state.field);
  const comparison = fieldReadings(state, state.comparisonField);
  const dx = state.width / state.gridSize;
  return {
    diffusionCoefficient: state.diffusionCoefficient,
    comparisonCoefficient: state.comparisonCoefficient,
    elapsed: state.elapsed,
    totalMass: current.mass,
    centerConcentration: current.center,
    midwayConcentration: current.midway,
    edgeConcentration: current.edge,
    comparisonCenter: comparison.center,
    stableTimestep: (0.24 * dx * dx) / state.diffusionCoefficient,
    field: Array.from({ length: state.gridSize }, (_, row) =>
      state.field.slice(row * state.gridSize, (row + 1) * state.gridSize),
    ),
    gridSize: state.gridSize,
    playing: state.playing,
  };
}

type Populations = { rabbits: number; foxes: number };
type Rates = Pick<
  PredatorPreyState,
  "rabbitGrowth" | "predationRate" | "conversionRate" | "foxDeathRate"
>;
export function populationDerivatives(
  pop: Populations,
  rates: Rates,
): Populations {
  return {
    rabbits:
      rates.rabbitGrowth * pop.rabbits -
      rates.predationRate * pop.rabbits * pop.foxes,
    foxes:
      rates.conversionRate * pop.rabbits * pop.foxes -
      rates.foxDeathRate * pop.foxes,
  };
}
function rk4(pop: Populations, rates: Rates, dt: number): Populations {
  const add = (p: Populations, k: Populations, scale: number) => ({
    rabbits: p.rabbits + k.rabbits * scale,
    foxes: p.foxes + k.foxes * scale,
  });
  const k1 = populationDerivatives(pop, rates);
  const k2 = populationDerivatives(add(pop, k1, dt / 2), rates);
  const k3 = populationDerivatives(add(pop, k2, dt / 2), rates);
  const k4 = populationDerivatives(add(pop, k3, dt), rates);
  return {
    rabbits: Math.max(
      0,
      pop.rabbits +
        (dt / 6) * (k1.rabbits + 2 * k2.rabbits + 2 * k3.rabbits + k4.rabbits),
    ),
    foxes: Math.max(
      0,
      pop.foxes +
        (dt / 6) * (k1.foxes + 2 * k2.foxes + 2 * k3.foxes + k4.foxes),
    ),
  };
}
export function integratePopulations(
  pop: Populations,
  rates: Rates,
  elapsed: number,
  step: number,
) {
  let current = { ...pop };
  const count = Math.max(1, Math.ceil(elapsed / step));
  const dt = elapsed / count;
  for (let i = 0; i < count; i++) current = rk4(current, rates, dt);
  if (!Number.isFinite(current.rabbits + current.foxes))
    throw new Error("Population integration produced a non-finite state");
  return current;
}
export function predatorPreyInitial(p: NaturalState): PredatorPreyState {
  const initialRabbits = number(p.initialRabbits, 0, 1000, "Initial rabbits");
  const initialFoxes = number(p.initialFoxes, 0, 1000, "Initial foxes");
  return {
    initialRabbits,
    comparisonInitialRabbits: initialRabbits,
    initialFoxes,
    rabbitGrowth: number(p.rabbitGrowth, 0, 5, "Rabbit growth rate"),
    predationRate: number(p.predationRate, 0, 1, "Predation rate"),
    conversionRate: number(p.conversionRate, 0, 1, "Fox conversion rate"),
    foxDeathRate: number(p.foxDeathRate, 0, 5, "Fox death rate"),
    duration: number(p.duration, 1, 365, "Duration (days)"),
    integrationStep: number(
      p.integrationStep,
      0.001,
      0.1,
      "Integrator step (days)",
    ),
    elapsed: 0,
    rabbits: initialRabbits,
    foxes: initialFoxes,
    comparisonRabbits: initialRabbits,
    comparisonFoxes: initialFoxes,
    playing: false,
  };
}
export function predatorPreyConfiguration(s: NaturalState) {
  const state = s as PredatorPreyState;
  return Object.fromEntries(
    [
      "initialRabbits",
      "initialFoxes",
      "rabbitGrowth",
      "predationRate",
      "conversionRate",
      "foxDeathRate",
      "duration",
      "integrationStep",
    ].map((key) => [key, state[key]]),
  );
}
function populationRates(s: PredatorPreyState): Rates {
  return {
    rabbitGrowth: s.rabbitGrowth,
    predationRate: s.predationRate,
    conversionRate: s.conversionRate,
    foxDeathRate: s.foxDeathRate,
  };
}
export function predatorPreyApply(
  s: NaturalState,
  action: string,
  value?: unknown,
) {
  const state = s as PredatorPreyState;
  if (action === "ECO_SET_PLAYING")
    return { ...state, playing: bool(value, "Playing") };
  if (action === "ECO_RESTART")
    return {
      ...state,
      elapsed: 0,
      rabbits: state.initialRabbits,
      foxes: state.initialFoxes,
      comparisonRabbits: state.comparisonInitialRabbits,
      comparisonFoxes: state.initialFoxes,
    };
  if (action === "ECO_STEP") {
    if (state.playing)
      throw new Error("Pause the population model before stepping");
    return predatorPreyAdvance(
      state,
      Math.min(0.25, state.duration - state.elapsed),
    );
  }
  if (action === "ECO_SET_INITIAL_RABBITS") {
    const next = number(value, 0, 1000, "Initial rabbits");
    return {
      ...state,
      initialRabbits: next,
      comparisonInitialRabbits: state.initialRabbits,
      elapsed: 0,
      rabbits: next,
      foxes: state.initialFoxes,
      comparisonRabbits: state.initialRabbits,
      comparisonFoxes: state.initialFoxes,
    };
  }
  if (action === "ECO_SCALE_INITIAL_RABBITS")
    return predatorPreyApply(
      state,
      "ECO_SET_INITIAL_RABBITS",
      state.initialRabbits * number(value, 0, 10, "Rabbit multiplier"),
    );
  throw new Error("Unsupported predator–prey operation");
}
function predatorPreyAdvance(
  s: PredatorPreyState,
  delta: number,
): PredatorPreyState {
  const advance = Math.min(delta, s.duration - s.elapsed);
  const rates = populationRates(s);
  const current = integratePopulations(
    { rabbits: s.rabbits, foxes: s.foxes },
    rates,
    advance,
    s.integrationStep,
  );
  const comparison = integratePopulations(
    { rabbits: s.comparisonRabbits, foxes: s.comparisonFoxes },
    rates,
    advance,
    s.integrationStep,
  );
  return {
    ...s,
    elapsed: s.elapsed + advance,
    rabbits: current.rabbits,
    foxes: current.foxes,
    comparisonRabbits: comparison.rabbits,
    comparisonFoxes: comparison.foxes,
    playing: s.playing && s.elapsed + advance < s.duration,
  };
}
export function predatorPreyStep(s: NaturalState, delta: number) {
  const state = s as PredatorPreyState;
  number(delta, 0, 60, "Simulation timestep");
  return state.playing ? predatorPreyAdvance(state, delta) : state;
}
function populationSeries(initialRabbits: number, state: PredatorPreyState) {
  const points: { x: number; rabbits: number; foxes: number }[] = [];
  const samples = 28;
  for (let i = 0; i <= samples; i++) {
    const x = (state.duration * i) / samples;
    points.push({
      x,
      ...integratePopulations(
        { rabbits: initialRabbits, foxes: state.initialFoxes },
        populationRates(state),
        x,
        state.integrationStep,
      ),
    });
  }
  return points;
}
export function predatorPreyMeasure(s: NaturalState): NaturalState {
  const state = s as PredatorPreyState;
  const derivatives = populationDerivatives(
    { rabbits: state.rabbits, foxes: state.foxes },
    populationRates(state),
  );
  return {
    elapsed: state.elapsed,
    rabbits: state.rabbits,
    foxes: state.foxes,
    rabbitDerivative: derivatives.rabbits,
    foxDerivative: derivatives.foxes,
    initialRabbitDerivative: populationDerivatives(
      { rabbits: state.initialRabbits, foxes: state.initialFoxes },
      populationRates(state),
    ).rabbits,
    initialFoxDerivative: populationDerivatives(
      { rabbits: state.initialRabbits, foxes: state.initialFoxes },
      populationRates(state),
    ).foxes,
    comparisonInitialRabbits: state.comparisonInitialRabbits,
    points: populationSeries(state.initialRabbits, state),
    comparisonPoints: populationSeries(state.comparisonInitialRabbits, state),
    playing: state.playing,
  };
}

export function plantInitial(p: NaturalState): PlantGrowthState {
  return {
    initialBiomass: number(p.initialBiomass, 0, 1000, "Initial biomass"),
    maximumGrowthRate: number(
      p.maximumGrowthRate,
      0,
      100,
      "Maximum growth rate",
    ),
    light: number(p.light, 0, 1, "Normalized light"),
    water: number(p.water, 0, 1, "Normalized water"),
    nutrients: number(p.nutrients, 0, 1, "Normalized nutrients"),
    comparisonLight: number(p.light, 0, 1, "Normalized light"),
    duration: number(p.duration, 0.1, 365, "Duration (days)"),
    elapsed: 0,
    playing: false,
  };
}
export function plantConfiguration(s: NaturalState) {
  const state = s as PlantGrowthState;
  return {
    initialBiomass: state.initialBiomass,
    maximumGrowthRate: state.maximumGrowthRate,
    light: state.light,
    water: state.water,
    nutrients: state.nutrients,
    duration: state.duration,
  };
}
export function plantGrowthRate(
  s: Pick<
    PlantGrowthState,
    "maximumGrowthRate" | "light" | "water" | "nutrients"
  >,
) {
  return s.maximumGrowthRate * Math.min(s.light, s.water, s.nutrients);
}
export function plantApply(s: NaturalState, action: string, value?: unknown) {
  const state = s as PlantGrowthState;
  if (action === "PLANT_SET_PLAYING")
    return { ...state, playing: bool(value, "Playing") };
  if (action === "PLANT_RESTART") return { ...state, elapsed: 0 };
  if (action === "PLANT_STEP") {
    if (state.playing) throw new Error("Pause plant growth before stepping");
    return {
      ...state,
      elapsed: Math.min(state.duration, state.elapsed + 0.25),
    };
  }
  const field = (
    {
      PLANT_SET_LIGHT: "light",
      PLANT_SET_WATER: "water",
      PLANT_SET_NUTRIENTS: "nutrients",
    } as const
  )[action];
  if (!field) throw new Error("Unsupported plant-growth operation");
  const availability = number(value, 0, 1, `Normalized ${field}`);
  return {
    ...state,
    [field]: availability,
    ...(field === "light" ? { comparisonLight: state.light } : {}),
    elapsed: 0,
  };
}
export function plantStep(s: NaturalState, delta: number) {
  const state = s as PlantGrowthState;
  number(delta, 0, 365, "Simulation timestep");
  if (!state.playing) return state;
  const elapsed = Math.min(state.duration, state.elapsed + delta);
  return { ...state, elapsed, playing: elapsed < state.duration };
}
export function plantMeasure(s: NaturalState): NaturalState {
  const state = s as PlantGrowthState;
  const rate = plantGrowthRate(state);
  const comparisonRate = plantGrowthRate({
    ...state,
    light: state.comparisonLight,
  });
  const resources = {
    light: state.light,
    water: state.water,
    nutrients: state.nutrients,
  };
  const minimum = Math.min(...Object.values(resources));
  const series = (growthRate: number) =>
    Array.from({ length: 30 }, (_, i) => {
      const x = (state.duration * i) / 29;
      return { x, y: state.initialBiomass + growthRate * x };
    });
  return {
    elapsed: state.elapsed,
    biomass: state.initialBiomass + rate * state.elapsed,
    growthRate: rate,
    comparisonGrowthRate: comparisonRate,
    comparisonLight: state.comparisonLight,
    limitingResources: Object.entries(resources)
      .filter(([, value]) => value === minimum)
      .map(([name]) => name),
    points: series(rate),
    comparisonPoints: series(comparisonRate),
    playing: state.playing,
  };
}
