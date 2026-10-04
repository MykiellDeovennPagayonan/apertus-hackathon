const assert = require("node:assert/strict");
const { load } = require("./loader.cjs");
const { naturalSystems } = load(
  "src/simulations/domains/natural-systems/index.ts",
);
const { diffuseFiniteVolume, integratePopulations, populationDerivatives } =
  load("src/simulations/components/systems/natural-systems/models.ts");

const near = (actual, expected, relative = 1e-6, absolute = 1e-9) =>
  assert.ok(
    Math.abs(actual - expected) <= absolute + relative * Math.abs(expected),
    `${actual} != ${expected}`,
  );
const model = (name) =>
  naturalSystems.models.find((candidate) => candidate.ref.endsWith(`/${name}`));
const outputContract = (provider, state) => {
  const measured = provider.measure(state);
  assert.deepEqual(
    Object.keys(measured).sort(),
    Object.keys(provider.outputs).sort(),
  );
  return measured;
};
const apply = (provider, state, action, value) =>
  provider.apply(structuredClone(state), action, value);

// DIFF-001: independent conservation, positivity, stationarity, CFL and convergence checks.
const diffusion = model("DiffusionField");
let diffusionState = diffusion.initialize(diffusion.defaults);
let diffusionOutput = outputContract(diffusion, diffusionState);
near(diffusionOutput.totalMass, 1);
near(diffusionOutput.elapsed, 0);
assert.ok(diffusionOutput.stableTimestep > 0);
const uniform = Array(15 * 15).fill(7.25);
assert.deepEqual(diffuseFiniteVolume(uniform, 15, 1, 0.05, 3), uniform);

diffusionState = apply(diffusion, diffusionState, "DIFF_SET_PLAYING", true);
diffusionState = diffusion.step(diffusionState, 2);
diffusionOutput = outputContract(diffusion, diffusionState);
near(diffusionOutput.totalMass, 1, 1e-10);
assert.ok(
  diffusionOutput.field
    .flat()
    .every((value) => Number.isFinite(value) && value >= 0),
);
assert.ok(
  diffusionOutput.centerConcentration > diffusionOutput.midwayConcentration,
);
assert.ok(
  diffusionOutput.midwayConcentration >= diffusionOutput.edgeConcentration,
);
assert.ok(
  (0.05 * diffusionOutput.stableTimestep) / (1 / 15) ** 2 <= 0.24 + 1e-12,
);

const secondMoment = (field, size, width) => {
  const dx = width / size;
  const center = Math.floor(size / 2);
  let mass = 0;
  let moment = 0;
  field.forEach((concentration, index) => {
    const x = ((index % size) - center) * dx;
    const y = (Math.floor(index / size) - center) * dx;
    const cellMass = concentration * dx * dx;
    mass += cellMass;
    moment += cellMass * (x * x + y * y);
  });
  return moment / mass;
};
const deposit = (size) => {
  const cells = Array(size * size).fill(0);
  cells[Math.floor(size / 2) * size + Math.floor(size / 2)] = size * size;
  return cells;
};
for (const size of [15, 31]) {
  const evolved = diffuseFiniteVolume(deposit(size), size, 1, 0.05, 0.05);
  // Infinite-domain diffusion gives E[x²+y²]=4Dt. At this short time the walls are immaterial.
  near(secondMoment(evolved, size, 1), 4 * 0.05 * 0.05, 0.02, 1e-5);
}
const whole = diffuseFiniteVolume(deposit(15), 15, 1, 0.05, 0.2);
let partitioned = deposit(15);
for (let i = 0; i < 20; i++)
  partitioned = diffuseFiniteVolume(partitioned, 15, 1, 0.05, 0.01);
near(secondMoment(whole, 15, 1), secondMoment(partitioned, 15, 1), 0.015);

diffusionState = apply(diffusion, diffusionState, "DIFF_SCALE_COEFFICIENT", 2);
assert.equal(diffusionState.diffusionCoefficient, 0.1);
assert.equal(diffusionState.comparisonCoefficient, 0.05);
assert.equal(diffusionState.elapsed, 0);
diffusionState = apply(diffusion, diffusionState, "DIFF_SET_PLAYING", false);
diffusionState = apply(diffusion, diffusionState, "DIFF_STEP");
diffusionOutput = outputContract(diffusion, diffusionState);
assert.ok(
  diffusionOutput.centerConcentration < diffusionOutput.comparisonCenter,
);
near(diffusionOutput.totalMass, 1, 1e-10);
assert.throws(() =>
  apply(diffusion, diffusionState, "DIFF_SET_COEFFICIENT", 0),
);
assert.throws(() =>
  apply(diffusion, diffusionState, "DIFF_SET_COEFFICIENT", "twice"),
);
assert.throws(() =>
  diffusion.initialize({ ...diffusion.defaults, gridSize: 12.5 }),
);

// ECO-001: independently calculated initial derivatives, boundaries and RK4 convergence.
const ecology = model("PredatorPrey");
let ecologyState = ecology.initialize(ecology.defaults);
let ecologyOutput = outputContract(ecology, ecologyState);
near(ecologyOutput.initialRabbitDerivative, 12.8);
near(ecologyOutput.initialFoxDerivative, 0.9);
assert.deepEqual(
  populationDerivatives(
    { rabbits: 0, foxes: 9 },
    {
      rabbitGrowth: 0.5,
      predationRate: 0.02,
      conversionRate: 0.01,
      foxDeathRate: 0.3,
    },
  ),
  { rabbits: 0, foxes: -2.6999999999999997 },
);
assert.deepEqual(
  populationDerivatives(
    { rabbits: 40, foxes: 0 },
    {
      rabbitGrowth: 0.5,
      predationRate: 0.02,
      conversionRate: 0.01,
      foxDeathRate: 0.3,
    },
  ),
  { rabbits: 20, foxes: 0 },
);
ecologyState = apply(ecology, ecologyState, "ECO_SCALE_INITIAL_RABBITS", 0.5);
ecologyOutput = outputContract(ecology, ecologyState);
assert.equal(ecologyState.initialRabbits, 20);
assert.equal(ecologyState.comparisonInitialRabbits, 40);
near(ecologyOutput.initialRabbitDerivative, 6.4);
near(ecologyOutput.initialFoxDerivative, -0.9);
ecologyState = apply(ecology, ecologyState, "ECO_SET_PLAYING", true);
ecologyState = ecology.step(ecologyState, 5);
ecologyOutput = outputContract(ecology, ecologyState);
assert.ok(ecologyOutput.rabbits >= 0 && ecologyOutput.foxes >= 0);
assert.ok(Number.isFinite(ecologyOutput.rabbits + ecologyOutput.foxes));

const rates = {
  rabbitGrowth: 0.5,
  predationRate: 0.02,
  conversionRate: 0.01,
  foxDeathRate: 0.3,
};
const coarse = integratePopulations({ rabbits: 40, foxes: 9 }, rates, 10, 0.01);
const fine = integratePopulations({ rabbits: 40, foxes: 9 }, rates, 10, 0.005);
near(coarse.rabbits, fine.rabbits, 2e-8);
near(coarse.foxes, fine.foxes, 2e-8);
for (const point of ecologyOutput.points)
  assert.ok(
    point.rabbits >= 0 &&
      point.foxes >= 0 &&
      Number.isFinite(point.rabbits + point.foxes),
  );
assert.throws(() =>
  apply(ecology, ecologyState, "ECO_SET_INITIAL_RABBITS", -1),
);

// PLANT-001: exact limiting-resource behavior and resource bounds.
const plant = model("PlantGrowth");
let plantState = plant.initialize(plant.defaults);
let plantOutput = outputContract(plant, plantState);
near(plantOutput.growthRate, 0.4);
assert.deepEqual(plantOutput.limitingResources, ["light"]);
plantState = apply(plant, plantState, "PLANT_SET_LIGHT", 0.9);
plantOutput = outputContract(plant, plantState);
near(plantOutput.growthRate, 0.6);
near(plantOutput.comparisonGrowthRate, 0.4);
assert.deepEqual(plantOutput.limitingResources, ["water"]);
plantState = apply(plant, plantState, "PLANT_SET_LIGHT", 1);
near(outputContract(plant, plantState).growthRate, 0.6);
for (const resource of [
  "PLANT_SET_LIGHT",
  "PLANT_SET_WATER",
  "PLANT_SET_NUTRIENTS",
]) {
  const zero = apply(plant, plant.initialize(plant.defaults), resource, 0);
  near(outputContract(plant, zero).growthRate, 0);
}
assert.throws(() => apply(plant, plantState, "PLANT_SET_LIGHT", 1.01));
assert.throws(() => apply(plant, plantState, "PLANT_SET_WATER", -0.01));
plantState = apply(plant, plantState, "PLANT_SET_PLAYING", true);
plantState = plant.step(plantState, 3);
plantOutput = outputContract(plant, plantState);
near(plantOutput.elapsed, 3);
near(plantOutput.biomass, 2.8);

// Reset/configuration invariants and semantic server render for all three lessons.
for (const provider of naturalSystems.models) {
  const initial = provider.initialize(provider.defaults);
  assert.deepEqual(provider.configuration(initial), provider.defaults);
}
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { NaturalSystemsContent } = load(
  "src/simulations/components/views/natural-systems/NaturalSystemsView.tsx",
);
for (const provider of naturalSystems.models) {
  const state = provider.initialize(provider.defaults);
  const instance = {
    id: "object/first",
    label: provider.name,
    provider: provider.ref,
    parameters: provider.configuration(state),
    state,
    outputs: provider.measure(state),
  };
  const assembly = {
    version: 1,
    title: provider.name,
    learningGoal: provider.description,
    instances: [
      {
        id: instance.id,
        label: instance.label,
        prefab: { ref: provider.ref, version: 1 },
        parameters: instance.parameters,
      },
    ],
    observations: provider.requiredObservations.map((name) => ({
      id: `observation/${name}`,
      instance: instance.id,
      output: name,
      unit: provider.outputs[name].unit,
    })),
    connections: [],
    controls: Object.keys(provider.actions).map((action) => ({
      instance: instance.id,
      action,
    })),
    views: [{ ref: "views/AssemblyScene", observations: [] }],
  };
  const html = renderToStaticMarkup(
    React.createElement(NaturalSystemsContent, {
      assembly,
      instances: [instance],
    }),
  );
  assert.ok(html.includes("Reset initial settings"));
  assert.ok(html.includes("Model assumptions"));
  assert.ok(html.includes(provider.name));
}

console.log(
  "Natural systems: diffusion conservation/stability/convergence, Lotka–Volterra derivatives/boundaries/convergence, limiting-resource exactness, validation and semantic rendering passed (development checks; no live-model acceptance). ",
);
