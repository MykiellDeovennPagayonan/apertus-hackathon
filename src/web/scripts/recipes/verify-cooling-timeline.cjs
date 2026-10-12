const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../test-loader.cjs");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { CoolingScene } = load(
  "src/simulations/components/visuals/physics/ThermalOpticsScenes.tsx",
);
const { COOLING_DURATION } = load(
  "src/simulations/components/systems/physics/cooling.ts",
);
const { runtime } = loadRecipe(premadeRecipe("cooling-drinks"));

for (const time of [1, 14, COOLING_DURATION, 14, 0]) {
  assert.ok(runtime.submit("control/time", { value: time }).accepted);
  const snapshot = runtime.getSnapshot();
  for (const id of ["model0", "model1"]) {
    assert.equal(snapshot.state[id].time, time);
    const scene = renderToStaticMarkup(
      React.createElement(CoolingScene, {
        instance: { label: id, state: snapshot.state[id] },
      }),
    );
    assert.match(scene, /240 min/);
    assert.match(scene, new RegExp(`After ${time} min`));
  }
  if (time > 0)
    assert.ok(
      snapshot.outputs.model0.temperature < snapshot.outputs.model1.temperature,
    );
  else assert.equal(snapshot.outputs.model0.temperature, 80);
}
const before = structuredClone(runtime.getSnapshot());
for (const value of [-1, COOLING_DURATION + 1]) {
  assert.equal(runtime.submit("control/time", { value }).accepted, false);
  assert.deepEqual(runtime.getSnapshot(), before);
}
console.log(
  "Cooling timeline: shared time, rewind, restart, fixed graphs and limits passed.",
);
