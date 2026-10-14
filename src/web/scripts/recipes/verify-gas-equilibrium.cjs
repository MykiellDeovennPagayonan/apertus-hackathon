const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../test-loader.cjs");
const { premadeRecipe } = load("src/simulations/registry/recipes/premade.ts");
const { loadRecipe } = load("src/simulations/creation-and-editing/runtime-engine/loadRecipe.ts");
const { publicDefinition } = load(
  "src/simulations/registry/index.ts",
);
const { ScalarControl } = load(
  "src/simulations/registry/controls/ScalarControl.tsx",
);
const { responsiveBoardRows, expandResponsiveContent } = load(
  "src/simulations/creation-and-editing/authoring-engine/presentation/responsiveLayout.ts",
);
const { GasEquilibriumVisual } = load(
  "src/simulations/legacy/components/visuals/chemistry/ChemistryVisuals.tsx",
);

const recipe = premadeRecipe("gas-equilibrium");
const { runtime, document } = loadRecipe(recipe);
const initial = structuredClone(runtime.getSnapshot());
const definition = publicDefinition("prefabs/chemistry/GasEquilibrium");
for (const [id, key, value, invalid] of [
  ["input/temp", "CHEM_SET_EQ_TEMP", 350, 451],
  ["input/vol", "CHEM_SET_EQ_VOLUME", 2.5, 0],
]) {
  const command = definition.commands[key];
  assert.equal(command.submission, "continuous");
  const node = document.nodes.find((node) => node.id === id);
  const markup = renderToStaticMarkup(
    React.createElement(ScalarControl, {
      node,
      command,
      commandKey: key,
      state: runtime.getSnapshot().state.model,
      onSubmit: (args) => runtime.submit(id, args),
    }),
  );
  assert.match(markup, /type="range"/);
  assert.doesNotMatch(markup, /type="submit"|Apply changes/);
  assert.ok(runtime.submit(id, { value }).accepted);
  const accepted = structuredClone(runtime.getSnapshot());
  assert.notEqual(
    accepted.outputs.model.totalPressure,
    initial.outputs.model.totalPressure,
  );
  assert.equal(runtime.submit(id, { value: invalid }).accepted, false);
  assert.deepEqual(runtime.getSnapshot(), accepted);
}
assert.equal(runtime.getSnapshot().outputs.model.temperature, 350);
assert.equal(runtime.getSnapshot().outputs.model.volume, 2.5);
assert.ok(
  runtime.getSnapshot().outputs.model.equilibriumConstant >
    initial.outputs.model.equilibriumConstant,
);
assert.ok(runtime.reset().accepted);
assert.deepEqual(runtime.getSnapshot(), initial);

const presentation = document.presentation;
const grown = expandResponsiveContent(presentation, {
  "board/layout/task": 376,
});
const results = grown.items.filter((item) =>
  item.layoutId.startsWith("layout/result/"),
);
assert.deepEqual(
  results.map((item) => item.rect.y),
  [400, 400, 400],
);
assert.deepEqual(
  results.map((item) => item.rect.height),
  [134, 134, 134],
);
assert.deepEqual(expandResponsiveContent(presentation, {}), presentation);
assert.equal(
  presentation.items.find((item) => item.id === "board/layout/result/pressure")
    .rect.y,
  374,
);

// A following row must clear the entire aligned result row, too.
const withFooter = structuredClone(presentation);
withFooter.items.push({
  ...withFooter.items[1],
  id: "footer",
  rect: { x: 0, y: 532, width: 984, height: 80 },
});
const cascaded = expandResponsiveContent(withFooter, {
  "board/layout/task": 376,
  "board/layout/result/no2": 160,
});
assert.equal(cascaded.items.find((item) => item.id === "footer").rect.y, 584);
withFooter.items[1].locked = true;
assert.equal(
  expandResponsiveContent(withFooter, { "board/layout/task": 376 }).items[1]
    .rect.y,
  374,
);

assert.deepEqual(responsiveBoardRows(document, presentation, 1024)[0], [
  "board/layout/appearance",
  "board/layout/task",
]);
const phoneRows = responsiveBoardRows(document, presentation, 390);
assert.deepEqual(phoneRows.slice(0, 2), [
  ["board/layout/appearance"],
  ["board/layout/task"],
]);
assert.deepEqual(phoneRows[2], presentation.responsiveRows[1]);
assert.deepEqual(phoneRows.flat(), presentation.responsiveRows.flat());
for (const [shiftDirection, label] of [
  ["equilibrated", "At equilibrium"],
  ["shifted-to-products", "Equilibrium favors NO₂"],
  ["shifted-to-reactants", "Equilibrium favors N₂O₄"],
]) {
  const markup = renderToStaticMarkup(
    React.createElement(GasEquilibriumVisual, {
      instance: {
        parameters: {},
        outputs: { ...initial.outputs.model, shiftDirection },
      },
    }),
  );
  assert.ok(markup.includes(label));
}
console.log(
  "Gas equilibrium: live controls, immediate model updates, validation, reset, and responsive rows passed.",
);
