const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../../test-loader.cjs");
const { pythagoreanModel: model } = load(
  "src/simulations/domains/math-geometry/pythagorean.ts",
);
const { PythagoreanScene } = load(
  "src/simulations/components/views/math-geometry/PythagoreanScene.tsx",
);
const recipe = require("../../../src/simulations/pre-made/pythagorean/recipe.json");
const close = (actual, expected) =>
  assert.ok(Math.abs(actual - expected) < 1e-10, `${actual} != ${expected}`);
const start = model.initialize(model.defaults);
assert.deepEqual(model.measure(start), {
  distance: 3,
  height: 4,
  ladderLength: 5,
  distanceSquare: 9,
  heightSquare: 16,
  ladderSquare: 25,
});
close(
  model.measure(model.initialize({ distance: 5, height: 12 })).ladderLength,
  13,
);
const doubled = model.measure(model.initialize({ distance: 6, height: 8 }));
close(doubled.ladderLength, 10);
assert.equal(doubled.ladderSquare, 100);
for (const key of ["distance", "height"]) {
  for (const value of [0, -2, NaN, Infinity, "3", 20.1]) {
    assert.throws(() => model.initialize({ ...model.defaults, [key]: value }));
    assert.throws(() => model.apply(start, `set:${key}`, value));
    assert.deepEqual(start, model.defaults);
  }
  for (const value of [0.1, 20])
    assert.doesNotThrow(() =>
      model.initialize({ ...model.defaults, [key]: value }),
    );
}
assert.throws(() => model.apply(start, "set:ladderLength", 2));
const changed = model.apply(start, "set:distance", 6);
assert.equal(changed.height, 4);
close(model.measure(changed).ladderLength, 7.211102550927978);
assert.deepEqual(
  model.initialize(JSON.parse(JSON.stringify(model.configuration(changed)))),
  changed,
);

function drawing(state) {
  return renderToStaticMarkup(
    React.createElement(PythagoreanScene, {
      instance: {
        id: "model",
        label: "Ladder geometry",
        provider: model.ref,
        parameters: model.configuration(state),
        state,
        outputs: model.measure(state),
      },
    }),
  );
}
const markup = drawing(start);
assert.match(markup, /90°/);
assert.match(markup, /Pythagorean theorem/);
assert.match(markup, /a<sup>2<\/sup> \+ b<sup>2<\/sup> = c<sup>2<\/sup>/);
assert.match(markup, /Take the square root of both sides/);
assert.match(
  markup,
  /aria-label="c equals the square root of 3 squared plus 4 squared, equals 5 metres"/,
);
assert.match(
  drawing(changed),
  /aria-label="c equals the square root of 6 squared plus 4 squared, approximately 7.21 metres"/,
);
assert.doesNotMatch(markup, /<polygon|pythagorean-square/);
assert.match(markup, /x1="180" y1="300" x2="60" y2="140"/);
assert.match(drawing(changed), /x1="300" y1="300" x2="60" y2="140"/);
for (const state of [
  { distance: 0.1, height: 20 },
  { distance: 20, height: 0.1 },
])
  assert.doesNotMatch(drawing(state), /NaN|Infinity/);
assert.equal(recipe.document.nodes.length, 4);
assert.equal(recipe.document.presentation.items.length, 3);
assert.ok(
  recipe.document.nodes.every((node) => node.definition !== "displays/Readout"),
);
assert.equal(
  recipe.document.nodes.filter((node) => node.definition === "controls/Slider")
    .length,
  2,
);
console.log(
  "MATH-02 model, rejection, ladder diagram and worked calculation and configuration checks passed",
);

const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { serializeRecipe } = load(
  "src/simulations/runtime/recipes/serializeRecipe.ts",
);
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const comparison = structuredClone(recipe.document);
comparison.nodes.push({
  ...structuredClone(comparison.nodes[0]),
  id: "second-ladder",
});
const pair = new DocumentRuntime(comparison);
assert.equal(
  pair.dispatch([
    { node: "second-ladder", command: "set:distance", arguments: { value: 6 } },
  ]).accepted,
  true,
);
assert.equal(pair.getSnapshot().state.model.distance, 3);
assert.equal(pair.getSnapshot().state["second-ladder"].distance, 6);
comparison.nodes.push({
  ...structuredClone(comparison.nodes[0]),
  id: "third-ladder",
});
assert.throws(
  () => new DocumentRuntime(comparison),
  /maximum|instances|objects/i,
);
assert.deepEqual(compositionIssues(recipe.document), []);
const runtime = loadRecipe(recipe).runtime;
assert.equal(runtime.submit("input/distance", { value: 6 }).accepted, true);
const snapshot = runtime.getSnapshot();
assert.equal(snapshot.state.model.height, 4);
const rejected = runtime.submit("input/distance", { value: -2 });
assert.equal(rejected.accepted, false);
assert.deepEqual(runtime.getSnapshot().state.model, snapshot.state.model);
const saved = JSON.parse(serializeRecipe(recipe, runtime.capture()));
const reopened = loadRecipe(saved).runtime;
assert.equal(reopened.getSnapshot().state.model.distance, 6);
assert.equal(reopened.getSnapshot().state.model.height, 4);
assert.deepEqual(saved.document.presentation, recipe.document.presentation);
console.log(
  "MATH-02 integrated recipe, atomic dispatch and save/reopen checks passed",
);
