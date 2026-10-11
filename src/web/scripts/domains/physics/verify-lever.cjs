const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const { leverModel: model } = load("src/simulations/domains/physics/index.ts");
const near = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-10 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const initial = model.initialize({});
let out = model.measure(initial);
near(out.loadArm, 0.2);
near(out.effortArm, 1);
near(out.effortForce, 20);
near(out.loadTorque, 20);
near(out.effortTorque, -20);
assert.deepEqual(Object.keys(out).sort(), Object.keys(model.outputs).sort());
const raised = model.apply(initial, "LEVER_LIFT");
out = model.measure(raised);
near(out.loadTravel, 0.017431148549531632);
near(out.effortTravel, 0.08715574274765817);
near(out.effortTravel / out.loadTravel, 5);
near(out.loadTorque, 19.92389396183491);
near(out.inputWork, 1.7431148549531632);
near(out.outputWork, out.inputWork);
assert.deepEqual(model.apply(raised, "LEVER_LIFT"), initial);
assert.deepEqual(model.initialize(model.configuration(raised)), raised);
const midpoint = model.apply(initial, "LEVER_SET_PIVOT", 50);
near(model.measure(midpoint).effortForce, 100);
const extended = model.apply(initial, "LEVER_SET_LENGTH", 2.4);
near(model.measure(extended).effortForce, 20);
const retainedLoadArm = model.apply(
  extended,
  "LEVER_SET_PIVOT",
  (100 * 0.2) / 2.4,
);
near(model.measure(retainedLoadArm).loadArm, 0.2);
near(model.measure(retainedLoadArm).effortForce, 100 / 11);
assert.deepEqual(
  initial,
  model.initialize({}),
  "Edits never mutate previous state",
);
for (const pivotPercent of [5, 50, 95])
  for (const length of [0.4, 1.2, 4]) {
    const state = model.initialize({
      pivotPercent,
      length,
      lifted: true,
      loadForce: 1000,
    });
    const o = model.measure(state);
    Object.values(o).forEach((value) => {
      assert.ok(Number.isFinite(value));
    });
    near(o.loadTorque + o.effortTorque, 0);
    near(o.inputWork, o.outputWork);
    near(o.loadArm + o.effortArm, length);
  }
for (const [command, values] of [
  ["LEVER_SET_PIVOT", [0, 100, 4.9, 95.1, NaN, Infinity, "50"]],
  ["LEVER_SET_LENGTH", [0, 0.39, 4.01, NaN, Infinity]],
  ["LEVER_SET_LOAD_FORCE", [0, 1001, NaN, Infinity]],
])
  for (const value of values)
    assert.throws(() => model.apply(raised, command, value));
assert.throws(() => model.apply(raised, "LEVER_LIFT", true));
assert.throws(() => model.apply(raised, "UNSUPPORTED"));
assert.throws(() => model.initialize({ lifted: "true" }));
assert.deepEqual(model.configuration(raised), raised);

// Run real recipe/runtime integration once O registers the contribution and scene.
if (
  load("src/simulations/runtime/assembly.ts").assemblyModels.some(
    (m) => m.ref === model.ref,
  )
) {
  const { parseRecipe } = load("src/simulations/runtime/recipes/schema.ts");
  const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
  const { DocumentRuntime } = load(
    "src/simulations/runtime/authoring/runtime.ts",
  );
  const recipe = parseRecipe(
    require("../../../src/simulations/pre-made/levers/recipe.json"),
  );
  const runtime = loadRecipe(recipe).runtime;
  const pair = structuredClone(recipe.document);
  pair.nodes.push({
    ...structuredClone(pair.nodes[0]),
    id: "second",
    label: "Second lever",
    configuration: { ...model.defaults, pivotPercent: 50 },
  });
  const pairRuntime = new DocumentRuntime(pair);
  near(pairRuntime.getSnapshot().outputs.second.effortForce, 100);
  assert.ok(pairRuntime.submit("pivot", { value: 5 }).accepted);
  near(pairRuntime.getSnapshot().outputs.second.effortForce, 100);
  pair.nodes.push({
    ...structuredClone(pair.nodes[0]),
    id: "third",
    label: "Third lever",
  });
  assert.throws(
    () => new DocumentRuntime(pair),
    /maximum 2 independent objects/,
  );
  assert.ok(runtime.submit("pivot", { value: 50 }).accepted);
  assert.ok(runtime.submit("lift", {}).accepted);
  near(runtime.getSnapshot().outputs.model.effortForce, 100);
  const accepted = structuredClone(runtime.getSnapshot());
  assert.equal(runtime.submit("pivot", { value: 100 }).accepted, false);
  assert.deepEqual(runtime.getSnapshot().state, accepted.state);
  const reopened = new DocumentRuntime(
    JSON.parse(JSON.stringify(runtime.capture())),
  );
  assert.deepEqual(reopened.getSnapshot(), runtime.getSnapshot());
  console.log(
    "PHYS-01 model, boundary, recipe/runtime and save/reopen checks passed.",
  );
} else
  console.log(
    "PHYS-01 model and boundary checks passed; recipe/runtime checks await O registration.",
  );
