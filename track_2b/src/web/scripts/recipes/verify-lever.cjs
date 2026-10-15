const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../test-loader.cjs");
const { premadeRecipe } = load("src/simulations/registry/recipes/premade.ts");
const { loadRecipe } = load("src/simulations/creation-and-editing/runtime-engine/loadRecipe.ts");
const { serializeRecipe } = load("src/simulations/creation-and-editing/authoring-engine/serializeRecipe.ts");
const { remapDocument } = load("src/simulations/creation-and-editing/authoring-engine/recipes.ts");
const { DocumentRuntime } = load("src/simulations/creation-and-editing/runtime-engine/DocumentRuntime.ts");
const { LeverScene } = load("src/simulations/legacy/components/visuals/physics/LeverScene.tsx");
const { ControlPresentation } = load("src/simulations/creation-and-editing/simulation/recipe/ControlPresentation.tsx");
const { SnapshotContext } = load("src/simulations/creation-and-editing/simulation/recipe/contexts.tsx");
const recipe = premadeRecipe("levers");
const { runtime } = loadRecipe(recipe);
const renderControl = (id) => renderToStaticMarkup(
  React.createElement(SnapshotContext.Provider, { value: runtime.getSnapshot() },
    React.createElement(ControlPresentation, {
      runtime, node: runtime.document.nodes.find((node) => node.id === id),
    }),
  ),
);
const pivot = renderControl("pivot");
assert.match(pivot, /Toward the object/);
assert.match(pivot, /Toward your push/);
assert.doesNotMatch(pivot, /<span>%<\/span>|<span>5<\/span>|<span>95<\/span>/);
assert.match(pivot, /percentage of the bar from the object end/);
for (const value of [5, 50, 68, 95, 100 / 6]) {
  assert.ok(runtime.submit("pivot", { value }).accepted);
  for (const lifted of [false, true]) {
    if (runtime.getSnapshot().state.model.lifted !== lifted)
      assert.ok(runtime.submit("lift", {}).accepted);
    const snapshot = runtime.getSnapshot();
    assert.equal(snapshot.state.model.loadForce, 100);
    assert.equal(snapshot.state.model.length, 1.2);
    assert.equal(snapshot.state.model.pivotPercent, value);
    const scene = renderToStaticMarkup(React.createElement(LeverScene, {
      instance: { state: snapshot.state.model },
    }));
    assert.match(scene, /Object weight/);
    assert.match(scene, /Push needed to lift/);
    assert.match(scene, /N = newtons of force/);
    assert.match(renderControl("lift"), lifted ? /Lower the load/ : /Lift the load/);
    const ratio = (100 - value) / value;
    assert.match(scene, lifted
      ? ratio > 1 ? /Less force, more movement/ : ratio < 1 ? /More force, less movement/ : /same distance/
      : ratio > 1 ? /lifting needs less force/ : ratio < 1 ? /lifting needs more force/ : /equals the object/);
    assert.ok(Math.abs(snapshot.outputs.model.inputWork - snapshot.outputs.model.outputWork) < 1e-9);
  }
}
const before = structuredClone(runtime.getSnapshot());
for (const value of [0, 100, -1]) {
  assert.equal(runtime.submit("pivot", { value }).accepted, false);
  assert.deepEqual(runtime.getSnapshot(), before);
}
const reopened = loadRecipe(JSON.parse(serializeRecipe(recipe))).runtime;
assert.equal(reopened.getSnapshot().state.model.loadForce, 100);
const copied = new DocumentRuntime(remapDocument(recipe.document, (id) => `copy/${id}`));
assert.ok(copied.submit("copy/pivot", { value: 68 }).accepted);
assert.ok(copied.submit("copy/lift", {}).accepted);
assert.equal(copied.getSnapshot().state["copy/model"].lifted, true);
console.log("Lever: directional controls, stateful lift labels, force/travel explanations, invalid-input recovery, save/reopen and remix passed.");
