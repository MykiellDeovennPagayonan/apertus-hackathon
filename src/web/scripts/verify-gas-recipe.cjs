const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const source = require("../src/simulations/pre-made/gas/gas-pressure.recipe.json");
const { loadGasPressureRecipe } = load(
  "src/simulations/components/composites/gas.ts",
);
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { learningPolicies } = load(
  "src/simulations/components/resources/LearningPolicies.ts",
);

const recipe = loadGasPressureRecipe();
assert.deepEqual(recipe, source);
assert.deepEqual(modelRecipe("prefabs/AuthoredGasContainer"), source);
const model = source.document.nodes.find((node) => node.id === "model");
assert.deepEqual(learningPolicies.gas, model.configuration.inputs);
recipe.document.nodes[0].configuration.inputs.volume = 2;
recipe.document.lesson.title = "Edited copy";
assert.deepEqual(
  loadGasPressureRecipe(),
  source,
  "Each load must be independent",
);

const imported = parseDocument(JSON.stringify(source));
assert.deepEqual(imported.authored.lesson, source.document.lesson);
assert.deepEqual(parseDocument(serializeDocument(imported)), imported);
const runtime = new DocumentRuntime(imported.authored);
const gas = imported.authored.nodes.find(
  (node) => node.definition === "prefabs/AuthoredGasContainer",
);
const slider = imported.authored.nodes.find(
  (node) => node.definition === "controls/Slider",
);
const initial = structuredClone(runtime.getSnapshot());
for (const [volume, pressure] of [
  [0.25, 9.98],
  [1, 2.49],
  [2, 1.25],
]) {
  assert.ok(runtime.submit(slider.id, { value: volume }).accepted);
  const snapshot = runtime.getSnapshot();
  assert.equal(snapshot.state[gas.id].inputs.volume, volume);
  assert.equal(snapshot.state[gas.id].inputs.temperature, 300);
  assert.equal(snapshot.state[gas.id].inputs.amount, 1);
  assert.equal(
    Number(snapshot.outputs[gas.id].pressureKPa.toFixed(2)),
    pressure,
  );
}
const beforeInvalid = structuredClone(runtime.getSnapshot());
assert.equal(runtime.submit(slider.id, { value: 0 }).accepted, false);
assert.deepEqual(runtime.getSnapshot(), beforeInvalid);
assert.ok(runtime.reset().accepted);
assert.deepEqual(runtime.getSnapshot(), initial);
const invalid = structuredClone(source);
invalid.document.nodes.find(
  (node) => node.id === "model",
).configuration.inputs.volume = 0;
assert.throws(() => parseDocument(JSON.stringify(invalid)));
console.log(
  "Gas JSON recipe: loader isolation, defaults, import/save round trip, pressure response, rejected input, and reset passed.",
);
