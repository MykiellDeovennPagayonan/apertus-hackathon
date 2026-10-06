const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("./test-loader.cjs");
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { libraryChoices } = load(
  "src/simulations/builder/composition/libraryChoices.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { createPublicNode } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { connectDocument } = load(
  "src/simulations/builder/editor/connectionCommands.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { ScalarControl, UnconfiguredControl } = load(
  "src/simulations/components/controls/ScalarControl.tsx",
);
const { ControlSettings } = load(
  "src/simulations/builder/composition/ControlSettings.tsx",
);
const { changeControlType, controlTypeCompatibility } = load(
  "src/simulations/builder/editor/controlTypeCommands.ts",
);
const { authoredGraph } = load(
  "src/simulations/builder/graph/authoredGraph.ts",
);

assert.equal(
  libraryChoices("controls", "").filter((d) =>
    /Task$|Activity$|FractionComparison$/.test(d.id),
  ).length,
  0,
);
assert.ok(
  libraryChoices("composites", "").some(
    (d) => d.id === "controls/ArithmeticActivity",
  ),
);
assert.ok(
  !libraryChoices("all", "").some((d) => d.id === "controls/ExplorationTask"),
);
assert.ok(
  publicDefinition("controls/Slider").configuration.properties.showNumber,
);
assert.ok(
  !publicDefinition("controls/Toggle").configuration.properties.showNumber,
);
assert.ok(
  !publicDefinition("controls/ArithmeticActivity").configuration.properties
    .initial,
);
const recipe = premadeRecipe("coordinates");
const originalControls = structuredClone(recipe.document);
const numericControl = recipe.document.nodes.find(
  (node) => node.id === "input/x",
);
assert.ok(
  controlTypeCompatibility(recipe.document, numericControl, "controls/Toggle")
    .reason,
);
assert.throws(
  () => changeControlType(recipe.document, "input/x", "controls/Toggle"),
  /compatible|bound parameter/,
);
const numberDocument = changeControlType(
  recipe.document,
  "input/x",
  "controls/NumberInput",
);
const changedNumber = numberDocument.nodes.find(
  (node) => node.id === "input/x",
);
assert.equal(changedNumber.definition, "controls/NumberInput");
assert.equal(changedNumber.configuration.parameter, "value.x");
assert.equal(
  changedNumber.configuration.step,
  numericControl.configuration.step,
);
assert.equal(changedNumber.label, numericControl.label);
assert.deepEqual(numberDocument.connections, recipe.document.connections);
assert.deepEqual(numberDocument.layout, recipe.document.layout);
assert.deepEqual(recipe.document, originalControls);
const convertedRuntime = new DocumentRuntime(numberDocument);
assert.ok(convertedRuntime.submit("input/x", { value: 4.5 }).accepted);
assert.deepEqual(convertedRuntime.getSnapshot().state.model, { x: 4.5, y: 3 });
const reopenedNumber = parseDocument(
  serializeDocument(canonicalDocument(numberDocument)),
);
assert.equal(
  reopenedNumber.authored.nodes.find((node) => node.id === "input/x")
    .definition,
  "controls/NumberInput",
);
assert.equal(
  authoredGraph(canonicalDocument(numberDocument), null, true).node("input/x")
    .componentType,
  "Number input",
);
const groupDocument = changeControlType(
  numberDocument,
  "input/x",
  "controls/Form",
);
assert.throws(
  () => changeControlType(groupDocument, "input/x", "controls/Slider"),
  /Choose the parameter/,
);
const restoredSlider = changeControlType(
  groupDocument,
  "input/x",
  "controls/Slider",
  "value.x",
);
assert.equal(
  restoredSlider.nodes.find((node) => node.id === "input/x").configuration
    .parameter,
  "value.x",
);
const buttonDocument = changeControlType(
  numberDocument,
  "input/x",
  "controls/Button",
);
assert.ok(new DocumentRuntime(buttonDocument).submit("input/x", {}).accepted);
const fixedButton = structuredClone(buttonDocument);
for (const link of fixedButton.connections.filter(
  (c) => c.kind === "command" && c.from.node === "input/x",
))
  link.arguments = { value: { x: 2, y: 3 } };
assert.throws(
  () => changeControlType(fixedButton, "input/x", "controls/Slider"),
  /fixed arguments/,
);
assert.ok(
  !recipe.document.nodes.some(
    (node) => node.definition === "controls/ExplorationTask",
  ),
);
const runtime = loadRecipe(recipe).runtime;
assert.ok(
  runtime.dispatch([
    {
      node: "model",
      command: "MOVE_POINT",
      arguments: { value: { x: 7, y: -8 } },
    },
  ]).accepted,
);
assert.ok(runtime.submit("input/x", { value: 4.25 }).accepted);
assert.deepEqual(runtime.getSnapshot().state.model, { x: 4.25, y: -8 });
assert.ok(runtime.submit("input/y", { value: 9.75 }).accepted);
assert.deepEqual(runtime.getSnapshot().state.model, { x: 4.25, y: 9.75 });
const before = structuredClone(runtime.getSnapshot());
assert.equal(runtime.submit("input/x", { value: 11 }).accepted, false);
assert.equal(runtime.submit("input/x", { value: "4" }).accepted, false);
assert.deepEqual(runtime.getSnapshot(), before);
assert.ok(runtime.reset().accepted);
assert.deepEqual(runtime.getSnapshot().state.model, { x: 2, y: 3 });
for (const mutate of [
  (n) => delete n.configuration.parameter,
  (n) => (n.configuration.parameter = "value.missing"),
  (n) => (n.configuration.min = -11),
  (n) => {
    n.configuration.min = 5;
    n.configuration.max = 0;
  },
  (n) => (n.configuration.step = 0),
  (n) => {
    n.definition = "controls/Toggle";
    delete n.configuration.showNumber;
    delete n.configuration.step;
  },
]) {
  const document = structuredClone(recipe.document);
  mutate(document.nodes.find((n) => n.id === "input/x"));
  assert.throws(() => new DocumentRuntime(document));
}
const bounded = structuredClone(recipe.document);
Object.assign(bounded.nodes.find((n) => n.id === "input/x").configuration, {
  min: -5,
  max: 5,
  step: 0.25,
});
const limited = new DocumentRuntime(bounded);
assert.equal(limited.submit("input/x", { value: 6 }).accepted, false);
assert.ok(limited.submit("input/x", { value: 4.25 }).accepted);
const builder = canonicalDocument(structuredClone(recipe.document));
const slider = createPublicNode("controls/Slider", "new-slider", "scope/lab");
builder.authored.nodes.push(slider);
assert.throws(
  () =>
    connectDocument(
      builder,
      { node: "new-slider", port: "submit" },
      { node: "model", port: "MOVE_POINT" },
    ),
  /choose one/,
);
slider.configuration.parameter = "value.x";
assert.doesNotThrow(() =>
  connectDocument(
    builder,
    { node: "new-slider", port: "submit" },
    { node: "model", port: "MOVE_POINT" },
  ),
);
const node = recipe.document.nodes.find((n) => n.id === "input/x");
const command = publicDefinition("models/coordinates").commands.MOVE_POINT;
const renderScalar = (node) =>
  renderToStaticMarkup(
    React.createElement(ScalarControl, {
      node,
      command,
      commandKey: "MOVE_POINT",
      state: { x: 2, y: 3 },
      onSubmit: () => ({ accepted: true }),
    }),
  );
let markup = renderScalar(node);
assert.equal((markup.match(/type="range"/g) || []).length, 1);
assert.equal((markup.match(/type="text"/g) || []).length, 1);
markup = renderScalar({
  ...node,
  configuration: { ...node.configuration, showNumber: false },
});
assert.equal((markup.match(/type="text"/g) || []).length, 0);
markup = renderToStaticMarkup(
  React.createElement(UnconfiguredControl, {
    node: createPublicNode("controls/Slider", "preview", "scope/lab"),
    onConfigure: () => {},
  }),
);
assert.match(markup, /type="range"[^>]*disabled|disabled[^>]*type="range"/);
assert.match(markup, /Set up control/);
markup = renderToStaticMarkup(
  React.createElement(ControlSettings, {
    node,
    catalog: { document: recipe.document, change: () => true },
  }),
);
assert.match(markup, /Target parameter/);
assert.match(markup, /Minimum/);
assert.match(markup, /Step/);
assert.doesNotMatch(markup, /Starting configuration|>Initial</);
const activity = premadeRecipe("equal-groups").document;
const wrong = structuredClone(activity);
wrong.connections.find((c) => c.from.node === "task").to.port = "RESET";
assert.throws(() => validateAuthoredDocument(wrong), /connect to/);
const saved = structuredClone(activity);
saved.nodes.find((n) => n.id === "task").definition = "controls/GroupingTask";
saved.nodes.find((n) => n.id === "task").configuration = {
  label: "Explore",
  mode: "submit",
  initial: "{}",
};
const migrated = parseDocument(JSON.stringify(saved));
assert.equal(
  migrated.authored.nodes.find((n) => n.id === "task").definition,
  "controls/GroupingActivity",
);
assert.deepEqual(migrated.authored.presentation, saved.presentation);
assert.deepEqual(parseDocument(serializeDocument(migrated)), migrated);
const old = structuredClone(recipe);
old.document.nodes = old.document.nodes.filter(
  (n) => !n.id.startsWith("input/"),
);
old.document.nodes.push({
  id: "task",
  definition: "controls/ExplorationTask",
  version: 1,
  label: "Explore",
  scope: "scope/lab",
  configuration: {
    label: "Explore",
    mode: "submit",
    initial: '{"value":{"x":2,"y":3}}',
  },
});
old.document.connections = old.document.connections.filter(
  (c) => !c.from.node.startsWith("input/"),
);
old.document.connections.push({
  id: "link/task",
  kind: "command",
  from: { node: "task", port: "submit" },
  to: { node: "model", port: "MOVE_POINT" },
});
const layout = old.document.layout.children.find((l) => l.id === "layout/task");
layout.children = [];
layout.node = "task";
old.dependencies = Array.from(
  new Set(old.document.nodes.map((n) => n.definition)),
  (id) => ({ id, version: 1 }),
);
const upgraded = loadRecipe(old);
assert.equal(
  upgraded.document.nodes.find((n) => n.id === "task").definition,
  "controls/Form",
);
assert.equal(
  upgraded.document.nodes.find((n) => n.id === "task").configuration.fields
    .length,
  2,
);
assert.ok(upgraded.runtime.submit("task", { value: { x: 5, y: 6 } }).accepted);
assert.equal(
  old.document.nodes.find((n) => n.id === "task").definition,
  "controls/ExplorationTask",
);
assert.deepEqual(
  parseDocument(serializeDocument(parseDocument(JSON.stringify(old)))).authored,
  upgraded.document,
);
const oldCompound = structuredClone(old);
oldCompound.document.nodes.find((n) => n.id === "task").definition =
  "controls/Slider";
oldCompound.document.nodes.find((n) => n.id === "task").configuration.label =
  "Slider";
oldCompound.dependencies = Array.from(
  new Set(oldCompound.document.nodes.map((n) => n.definition)),
  (id) => ({ id, version: 1 }),
);
assert.equal(
  loadRecipe(oldCompound).document.nodes.find((n) => n.id === "task")
    .definition,
  "controls/Form",
);
const { RecipeRepository } = load(
  "src/simulations/builder/library/RecipeRepository.ts",
);
const library = new RecipeRepository({
  getItem: () => JSON.stringify([oldCompound]),
  setItem: () => {},
});
assert.equal(
  library.read()[0].document.nodes.find((n) => n.id === "task").definition,
  "controls/Form",
);
const { editableDocument, usableEntries } = load(
  "src/simulations/builder/persistence/recovery.ts",
);
const oldDraft = canonicalDocument(upgraded.document);
oldDraft.authored = structuredClone(oldCompound.document);
const { document: omitted, ...metadata } = oldCompound;
oldDraft.recipeMetadata = metadata;
const repaired = editableDocument(oldDraft);
assert.equal(
  repaired.authored.nodes.find((n) => n.id === "task").definition,
  "controls/Form",
);
assert.ok(
  repaired.recipeMetadata.dependencies.some((d) => d.id === "controls/Form"),
);
assert.doesNotThrow(() => serializeDocument(repaired));
assert.equal(usableEntries([{ id: "saved", document: oldDraft }]).length, 1);
// Boolean and enumerated bindings retain their native input types and reject bad values.
const counting = premadeRecipe("counting").document;
const toggle = createPublicNode(
  "controls/Toggle",
  "loop-toggle",
  counting.nodes[0].scope,
);
toggle.configuration.parameter = "value";
counting.nodes.push(toggle);
counting.connections.push({
  id: "loop-toggle/link",
  kind: "command",
  from: { node: toggle.id, port: "submit" },
  to: { node: "model", port: "SET_LOOPING" },
});
const toggled = new DocumentRuntime(counting);
assert.ok(toggled.submit(toggle.id, { value: true }).accepted);
assert.equal(toggled.getSnapshot().state.model.sequence.looping, true);
assert.equal(toggled.submit(toggle.id, { value: 1 }).accepted, false);
markup = renderToStaticMarkup(
  React.createElement(ScalarControl, {
    node: toggle,
    command: publicDefinition("models/counting").commands.SET_LOOPING,
    commandKey: "SET_LOOPING",
    state: toggled.getSnapshot().state.model,
    onSubmit: () => ({ accepted: true }),
  }),
);
assert.match(markup, /type="checkbox"/);
assert.doesNotMatch(markup, /type="range"/);
const arithmetic = premadeRecipe("arithmetic").document;
const select = createPublicNode(
  "controls/Select",
  "operation-select",
  arithmetic.nodes[0].scope,
);
select.configuration.parameter = "value.operation";
arithmetic.nodes.push(select);
arithmetic.connections.push({
  id: "operation-select/link",
  kind: "command",
  from: { node: select.id, port: "submit" },
  to: { node: "model", port: "SET_ARITHMETIC_TASK" },
});
const selected = new DocumentRuntime(arithmetic);
assert.ok(selected.submit(select.id, { value: "subtract" }).accepted);
assert.equal(selected.getSnapshot().state.model.a, 3);
assert.equal(selected.getSnapshot().state.model.b, 2);
assert.equal(selected.submit(select.id, { value: "multiply" }).accepted, false);
markup = renderToStaticMarkup(
  React.createElement(ScalarControl, {
    node: select,
    command: publicDefinition("models/arithmetic").commands.SET_ARITHMETIC_TASK,
    commandKey: "SET_ARITHMETIC_TASK",
    state: selected.getSnapshot().state.model,
    onSubmit: () => ({ accepted: true }),
  }),
);
assert.match(markup, /<select/);
assert.doesNotMatch(markup, /type="range"/);
const action = createPublicNode(
  "controls/Button",
  "set-count",
  counting.nodes[0].scope,
);
action.configuration.initial = JSON.stringify({
  value: { mode: "count", target: 8 },
});
counting.nodes.push(action);
counting.connections.push({
  id: "set-count/link",
  kind: "command",
  from: { node: action.id, port: "submit" },
  to: { node: "model", port: "SET_COUNTING_TASK" },
});
const clicked = new DocumentRuntime(counting);
assert.ok(clicked.submit(action.id, {}).accepted);
assert.equal(clicked.getSnapshot().state.model.target, 8);
assert.ok(
  clicked.submit(action.id, { value: { mode: "count", target: 6 } }).accepted,
);
assert.equal(clicked.getSnapshot().state.model.target, 6);
console.log(
  "Control contracts: distinct catalog/settings, one parameter per slider, bounds and incompatible-wire rejection, sibling preservation, resets, previews, activity contracts and legacy save/reopen migrations passed.",
);
