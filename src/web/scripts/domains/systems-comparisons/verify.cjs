const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const { ecology } = load("src/simulations/domains/ecology/index.ts");
const { socialSystems } = load(
  "src/simulations/domains/social-systems/index.ts",
);
const { measureModel, instantiateModel } = load(
  "src/simulations/runtime/assembly.ts",
);
const models = [...ecology.models, ...socialSystems.models];
for (const model of models) {
  const initial = model.initialize(model.defaults);
  assert.deepEqual(initial, model.defaults);
  assert.deepEqual(model.initialize({}), model.defaults);
  measureModel(model, initial);
  const fields = Object.entries(model.parameters.properties).filter(
    ([, schema]) => ["number", "integer"].includes(schema.type),
  );
  for (
    let corner = 0;
    corner < (fields.length <= 6 ? 2 ** fields.length : 2);
    corner++
  ) {
    const state = {
      ...model.defaults,
      ...Object.fromEntries(
        fields.map(([key, schema], index) => [
          key,
          (fields.length <= 6 ? corner & (1 << index) : corner)
            ? schema.maximum
            : 0,
        ]),
      ),
    };
    measureModel(model, model.configuration(state));
  }
  for (const [key, schema] of fields) {
    const action = Object.keys(model.actions).find(
      (a) =>
        model.actions[a].arguments.properties.value.maximum ===
          schema.maximum && a.endsWith(key.toUpperCase()),
    );
    assert.ok(action);
    for (const value of [0, schema.maximum]) {
      const next = model.apply(initial, action, value);
      assert.equal(next[key], value);
      measureModel(model, next);
      assert.deepEqual(initial, model.defaults);
    }
    for (const value of [-1, schema.maximum + 1, NaN, Infinity, "2", 0.5])
      assert.throws(() => model.apply(initial, action, value));
    assert.deepEqual(initial, model.defaults);
  }
  assert.throws(() => model.apply(initial, "UNKNOWN", 1));
  const one = instantiateModel("first", "First", model.ref, {}),
    two = instantiateModel("second", "Second", model.ref, {});
  one.state[Object.keys(model.defaults)[0]] = 0;
  assert.deepEqual(two.state, model.defaults);
}
const nutrients = ecology.models[0];
const n = (nitrogen, phosphorus, potassium) =>
  nutrients.measure({ nitrogen, phosphorus, potassium });
assert.equal(n(40, 100, 100).biomass, 40);
assert.equal(n(40, 150, 100).biomass, 40);
assert.equal(n(80, 100, 100).biomass, 80);
assert.equal(n(100, 20, 100).limiter, "Phosphorus");
assert.equal(n(40, 40, 100).limiter, "Nitrogen + Phosphorus");
assert.equal(n(80, 40, 100).biomass, 40);
assert.equal(n(150, 150, 150).biomass, 100);
assert.equal(n(0, 100, 100).biomass, 0);
const production = socialSystems.models[0];
const p = (specialization, delay, disruption) =>
  production.measure({ specialization, delay, disruption });
assert.ok(p(100, 0, 0).assemblyCompleted > p(100, 0, 0).craftCompleted);
// With no interruption, a balanced serial line has one startup pass through
// all eight stations, then one completion per station duration.
for (const specialization of [0, 25, 50, 80, 100]) {
  const duration = 10 / (1 + (1.2 * specialization) / 100);
  const expected = Math.floor(480 / duration + 1e-9) - 7;
  assert.equal(p(specialization, 0, 0).assemblyCompleted, expected);
}
for (const state of [
  [100, 100, 0],
  [80, 0, 100],
  [0, 0, 0],
])
  assert.ok(
    p(...state).assemblyCompleted <= p(...state).craftCompleted,
    JSON.stringify(p(...state)),
  );
assert.ok(p(100, 100, 0).scene.stages[3].queue > 0);
const fire = ecology.models[1];
const f = (coverage, wind, moisture) =>
  fire.measure({ coverage, wind, moisture });
assert.deepEqual(
  f(0, 35, 40).scene.untreated.grid,
  f(0, 35, 40).scene.treated.grid,
);
assert.ok(f(50, 35, 40).treatedArea < f(50, 35, 40).untreatedArea);
assert.equal(f(50, 100, 0).scene.treated.reached, true);
assert.ok(f(100, 35, 40).treatedArea <= f(50, 35, 40).treatedArea);
assert.ok(f(50, 35, 40).treatedPeak <= f(50, 35, 40).untreatedPeak);
const web = ecology.models[2];
const w = (pressure) => web.measure({ pressure });
for (const key of [
  "predator",
  "herbivore",
  "producer",
  "generalist",
  "specialist",
  "decomposer",
])
  assert.equal(w(100)[key], 100);
assert.ok(w(0).herbivore > 100);
assert.ok(w(0).producer < 100);
assert.ok(w(150).producer > 100);
const pineRemoved = web.measure({ ...web.defaults, pine: 0 });
assert.ok(
  Math.abs(pineRemoved.generalist - 100) <
    Math.abs(pineRemoved.specialist - 100),
);
console.log(
  "Four systems: finite contracts, all setter boundaries, invalid-command rejection, isolation, co-limitation, non-limiter invariance, assembly counterexamples, identical untreated maps, treatment crossing and direct/indirect cascade passed.",
);

const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { serializeRecipe } = load(
  "src/simulations/runtime/recipes/serializeRecipe.ts",
);
const { boardItemMinimum } = load("src/simulations/runtime/authoring/board.ts");
const { acceptedCommandArguments, commandPresentation } = load(
  "src/simulations/components/controls/commandPresentation.ts",
);
for (const slug of [
  "nutrient-limitation",
  "craft-production",
  "wildfire",
  "food-web",
]) {
  const recipe = premadeRecipe(slug),
    { runtime } = loadRecipe(recipe);
  const model = models.find(
    (m) =>
      m.ref === recipe.document.nodes.find((n) => n.id === "model").definition,
  );
  if (slug === "food-web") continue;
  for (const [key, schema] of Object.entries(
    model.parameters.properties,
  ).filter(([key]) => !["custom", "patches"].includes(key))) {
    const control = `input/${key}`;
    const command = recipe.document.connections.find(
      (c) => c.from.node === control,
    ).to.port;
    const before = structuredClone(runtime.getSnapshot());
    assert.equal(
      runtime.submit(control, { value: schema.maximum + 1 }).accepted,
      false,
    );
    assert.deepEqual(runtime.getSnapshot(), before);
    assert.ok(runtime.submit(control, { value: 0 }).accepted);
    assert.equal(
      acceptedCommandArguments(command, runtime.getSnapshot().state.model)
        .value,
      0,
    );
    const metadata = commandPresentation(command, model.ref);
    assert.equal(metadata.presentation.value.compact, true);
    assert.equal(metadata.presentation.value.limits, false);
    const captured = runtime.capture();
    assert.equal(
      captured.nodes.find((n) => n.id === "model").configuration[key],
      0,
    );
    const reopened = loadRecipe(serializeRecipe(recipe, captured)).runtime;
    assert.deepEqual(
      reopened.getSnapshot().state.model,
      runtime.getSnapshot().state.model,
    );
    assert.notEqual(reopened, runtime);
  }
  assert.ok(runtime.reset().accepted);
  assert.deepEqual(runtime.getSnapshot().state.model, model.defaults);
  assert.deepEqual(boardItemMinimum(recipe.document, "layout/conclusion"), {
    width: 128,
    height: 96,
  });
  const compact = structuredClone(recipe);
  compact.document.presentation.items[3].rect.height = 96;
  assert.doesNotThrow(() => loadRecipe(compact));
  compact.document.presentation.items[3].rect.height = 95;
  assert.throws(() => loadRecipe(compact), /content size/);
}
console.log(
  "Authored runtime: atomic slider rejection, accepted-value projection, captured configuration save/reopen, instance isolation, authored resets and compact status bounds passed.",
);

const { foodWebSpecies, foodWebLinks } = load(
  "src/simulations/components/systems/ecology/foodWebSpecies.ts",
);
assert.equal(foodWebSpecies.length, 24);
assert.equal(new Set(foodWebSpecies.map((s) => s.id)).size, 24);
assert.ok(foodWebLinks.length >= 50);
assert.equal(
  new Set(foodWebLinks.map((e) => `${e.food}/${e.consumer}`)).size,
  foodWebLinks.length,
);
for (const edge of foodWebLinks) {
  assert.ok(foodWebSpecies.some((s) => s.id === edge.food));
  assert.ok(foodWebSpecies.some((s) => s.id === edge.consumer));
  assert.notEqual(edge.food, edge.consumer);
  assert.ok(edge.weight > 0);
}
const exploredRecipe = premadeRecipe("food-web");
const explorerRuntime = loadRecipe(exploredRecipe).runtime;
const dispatch = (command, value) =>
  explorerRuntime.dispatch([{ node: "model", command, arguments: { value } }]);
for (let selection = 0; selection < foodWebSpecies.length; selection++) {
  assert.ok(dispatch("WEB_SET_SELECTION", selection).accepted);
  const species = foodWebSpecies[selection];
  for (const value of [0, 150, 100]) {
    assert.ok(
      dispatch("WEB_SET_POPULATION", { species: species.id, value }).accepted,
    );
    assert.equal(explorerRuntime.getSnapshot().state.model[species.id], value);
    assert.equal(
      explorerRuntime.getSnapshot().outputs.model.selectedPopulation,
      value,
    );
  }
}
for (const value of [
  { species: "missing", value: 0 },
  { species: "elk", value: -1 },
  { species: "elk", value: 151 },
  { species: "elk", value: 0.5 },
  { species: "elk", value: "0" },
  { species: "elk", value: NaN },
]) {
  const before = structuredClone(explorerRuntime.getSnapshot());
  assert.equal(dispatch("WEB_SET_POPULATION", value).accepted, false);
  assert.deepEqual(explorerRuntime.getSnapshot(), before);
}
assert.ok(
  dispatch("WEB_SET_POPULATION", { species: "pressure", value: 0 }).accepted,
);
assert.ok(
  dispatch("WEB_SET_POPULATION", { species: "pine", value: 0 }).accepted,
);
assert.equal(explorerRuntime.getSnapshot().state.model.pressure, 0);
assert.equal(explorerRuntime.getSnapshot().state.model.pine, 0);
const capturedExplorer = serializeRecipe(
  exploredRecipe,
  explorerRuntime.capture(),
);
const restoredExplorer = loadRecipe(capturedExplorer).runtime;
assert.deepEqual(restoredExplorer.getSnapshot(), explorerRuntime.getSnapshot());
assert.ok(explorerRuntime.reset().accepted);
assert.deepEqual(explorerRuntime.getSnapshot().state.model, web.defaults);
console.log(
  "Detailed food web: 24 distinct nodes, validated feeding graph, every organism selection/population boundary, atomic compound rejection, accumulated interventions, capture/reopen and whole-web reset passed.",
);

// Treatment is authoritative spatial state, including exact placement and lifecycle.
const fireRecipe = premadeRecipe("wildfire");
const fireRuntime = loadRecipe(fireRecipe).runtime;
const startingFire = structuredClone(fireRuntime.getSnapshot());
const dispatchPatch = (value) =>
  fireRuntime.dispatch([
    { node: "model", command: "FIRE_TOGGLE_PATCH", arguments: { value } },
  ]);
const initialPatches = Array.from(
  fire.measure(fire.defaults).scene.treatment,
  (value, index) => (value === "1" ? index : -1),
).filter((value) => value >= 0);
for (const value of [-1, 160, 1.5, "2", NaN, Infinity]) {
  assert.equal(dispatchPatch(value).accepted, false);
  assert.deepEqual(fireRuntime.getSnapshot(), startingFire);
}
assert.ok(dispatchPatch(0).accepted);
let fireState = fireRuntime.getSnapshot().state.model;
assert.deepEqual(
  fireState.patches,
  [0, ...initialPatches].sort((a, b) => a - b),
);
assert.equal(fireState.custom, 1);
assert.ok(dispatchPatch(0).accepted);
assert.deepEqual(fireRuntime.getSnapshot().state.model.patches, initialPatches);
assert.ok(
  fireRuntime.dispatch([
    { node: "model", command: "FIRE_CLEAR_PATCHES", arguments: {} },
  ]).accepted,
);
assert.deepEqual(
  fireRuntime.getSnapshot().outputs.model.scene.untreated.grid,
  fireRuntime.getSnapshot().outputs.model.scene.treated.grid,
);
const firebreak = Array.from({ length: 160 }, (_, i) => i).filter(
  (i) => i % 16 >= 6 && i % 16 <= 9,
);
for (const patch of firebreak) assert.ok(dispatchPatch(patch).accepted);
fireState = fireRuntime.getSnapshot().state.model;
assert.deepEqual(fireState.patches, firebreak);
const pairedFire = fireRuntime.getSnapshot().outputs.model;
assert.ok(pairedFire.treatedArea < pairedFire.untreatedArea);
const savedFire = serializeRecipe(fireRecipe, fireRuntime.capture());
assert.deepEqual(
  loadRecipe(savedFire).runtime.getSnapshot().state.model,
  fireState,
);
assert.throws(
  () => fire.configuration({ ...fire.defaults, patches: [1, 1] }),
  /unique/,
);
assert.throws(() => fire.configuration({ ...fire.defaults, patches: [160] }));
assert.ok(
  fireRuntime.dispatch([
    { node: "model", command: "FIRE_SET_COVERAGE", arguments: { value: 0 } },
  ]).accepted,
);
assert.equal(fireRuntime.getSnapshot().state.model.custom, 0);
assert.equal(
  fireRuntime.getSnapshot().outputs.model.scene.treatment,
  "0".repeat(160),
);
fireRuntime.reset();
assert.deepEqual(fireRuntime.getSnapshot().state.model, fire.defaults);
console.log(
  "Spatial wildfire: exact patch toggles, atomic invalid rejection, identical empty-plan comparison, effective connected firebreak, authored capture/reopen, preset replacement and reset passed.",
);

const allPatchRuntime = loadRecipe(fireRecipe).runtime;
assert.ok(
  allPatchRuntime.dispatch([
    { node: "model", command: "FIRE_CLEAR_PATCHES", arguments: {} },
  ]).accepted,
);
for (let patch = 0; patch < 160; patch++)
  assert.ok(
    allPatchRuntime.dispatch([
      {
        node: "model",
        command: "FIRE_TOGGLE_PATCH",
        arguments: { value: patch },
      },
    ]).accepted,
  );
assert.equal(allPatchRuntime.getSnapshot().state.model.patches.length, 160);
assert.equal(
  allPatchRuntime.getSnapshot().outputs.model.scene.treatment,
  "1".repeat(160),
);
console.log(
  "All 160 wildfire patches remain accepted within the unchanged bounded-output contract.",
);
