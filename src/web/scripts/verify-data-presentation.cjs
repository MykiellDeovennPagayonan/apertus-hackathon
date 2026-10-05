const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("./test-loader.cjs");
const { DatasetDisplay } = load(
  "src/simulations/components/views/DatasetDisplay.tsx",
);
const { presentData, dataCell, outputDataPresentation } = load(
  "src/simulations/components/views/dataPresentation.ts",
);
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const render = (value, kind = "Chart", presentation = {}) =>
  renderToStaticMarkup(
    React.createElement(DatasetDisplay, {
      value,
      kind,
      label: "Test observations",
      presentation,
    }),
  );
for (const kind of ["DataTable", "Chart", "Histogram", "Heatmap"]) {
  assert.match(render([], kind), /No observations yet/);
  assert.match(render(undefined, kind), /Waiting for observations/);
  assert.match(render("bad", kind), /cannot be displayed/);
}
assert.equal(
  dataCell(0, { key: "v", label: "Value", type: "number" }).text,
  "0",
);
assert.equal(
  dataCell(false, { key: "v", label: "Value", type: "boolean" }).text,
  "No",
);
for (const v of [null, undefined, ""])
  assert.equal(dataCell(v, { key: "v", label: "Value" }).state, "missing");
for (const v of [NaN, Infinity, {}, []])
  assert.equal(dataCell(v, { key: "v", label: "Value" }).state, "invalid");
assert.equal(
  dataCell("3", { key: "v", label: "Value", type: "number" }).state,
  "invalid",
);
const observations = {
  columns: [
    { key: "x", label: "Time", unit: "s", type: "number" },
    { key: "y", label: "Speed", unit: "m/s", type: "number" },
  ],
  rows: [{ x: 0, y: 0 }, { x: 1 }, { x: 2, y: Infinity }, { x: 3, y: 4 }],
};
const source = structuredClone(observations);
const html = render(observations);
assert.match(html, /Missing or invalid observations leave gaps/);
assert.match(html, /View observations/);
assert.match(html, /Speed \(m\/s\)/);
assert.match(html, /Missing/);
assert.match(html, /Invalid/);
assert.doesNotMatch(
  html,
  /(?:d|points|height|width|x|y)="[^"]*(?:NaN|Infinity)/,
);
assert.deepEqual(
  observations,
  source,
  "Presentation never mutates observations",
);
assert.match(
  render([
    { x: -2, y: -3 },
    { x: -1, y: -4 },
  ]),
  /data-plot/,
);
assert.match(render([{ x: 0, y: 0 }]), /<circle/);
assert.match(render([{ x: 0, y: 1e-9 }]), /1.000e-9/);
assert.match(
  render([
    { x: -1e308, y: 2 },
    { x: 1e308, y: 3 },
  ]),
  /cannot be displayed/,
);
assert.match(
  render([{ outcome: "A", observed: 0, expected: 0 }], "Histogram"),
  /data-bar-expected/,
);
for (const rows of [
  [{ outcome: "A", observed: 1 }],
  [{ outcome: "A", observed: -1, expected: 0 }],
  [{ outcome: "A", observed: NaN, expected: 1 }],
]) {
  const html = render(rows, "Histogram");
  assert.match(html, /plot is unavailable/);
  assert.doesNotMatch(html, /<rect/);
}
for (const grid of [
  [[1], [2, 3]],
  [[NaN]],
  [[]],
  [[Infinity]],
  [[1e308, -1e308]],
])
  assert.match(render(grid, "Heatmap"), /cannot be displayed/);
assert.match(
  render(
    [
      [0, 0],
      [0, 0],
    ],
    "Heatmap",
  ),
  /Every cell has the same value/,
);
assert.match(
  render(
    [
      [-2, 0],
      [2, 4],
    ],
    "Heatmap",
  ),
  /Darker cells have higher values/,
);
const mixed = {
  columns: [
    { key: "a", label: "Distance", unit: "m", type: "number" },
    { key: "b", label: "Speed", unit: "m/s", type: "number" },
  ],
  rows: [{ a: 1, b: 2 }],
};
assert.match(render(mixed), /same unit/);
assert.equal(presentData([{ nested: {} }]).state, "ready");
assert.equal(presentData([{}]).state, "invalid");
assert.equal(
  presentData(Array.from({ length: 1001 }, () => ({ x: 1 }))).state,
  "invalid",
);
assert.equal(
  presentData([], {
    columns: [
      { key: "x", label: "X" },
      { key: "x", label: "Again" },
    ],
  }).state,
  "invalid",
);
for (const definition of [
  "models/probability",
  "prefabs/natural-systems/DiffusionField",
  "prefabs/natural-systems/PredatorPrey",
  "prefabs/natural-systems/PlantGrowth",
  "prefabs/chemistry/Conservation",
  "prefabs/chemistry/ReactionRate",
  "prefabs/physical-systems/Pendulum",
  "prefabs/dynamic-systems/RingTraffic",
  "prefabs/dynamic-systems/CheckoutQueue",
]) {
  const document = modelRecipe(definition).document;
  validateAuthoredDocument(document);
  if (definition === "models/probability")
    assert.equal(
      document.nodes.find((n) => n.id === "display/frequencies").definition,
      "displays/Histogram",
    );
  if (definition.endsWith("DiffusionField"))
    assert.equal(
      document.nodes.find((n) => n.id === "display/field").definition,
      "displays/Heatmap",
    );
}
assert.equal(
  outputDataPresentation("prefabs/natural-systems/DiffusionField", "field")
    .valueUnit,
  "mass units/m²",
);
console.log(
  "Data presentation: empty/unavailable/invalid states, truthful zero/missing cells, finite geometry, gaps, scales, histogram/heatmap validation, unit compatibility, source immutability and recipe contracts passed.",
);
// Updating a host's document must retain parsed authoritative resource rows.
const { emptyAuthoredDocument } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { createPublicNode } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const resourceDocument = emptyAuthoredDocument();
resourceDocument.scopes.push({ id: "scope/data", label: "Data" });
const resource = createPublicNode("resources/Dataset", "source", "scope/data");
resource.configuration.rows = '[{"id":"a","value":0}]';
resourceDocument.resources.push(resource);
const runtime = new DocumentRuntime(resourceDocument);
runtime.updateDocument(structuredClone(resourceDocument));
assert.deepEqual(runtime.getSnapshot().outputs.source.rows, [
  { id: "a", value: 0 },
]);
const relabeled = structuredClone(resourceDocument);
relabeled.resources[0].configuration.label = "Renamed observations";
runtime.updateDocument(relabeled);
assert.deepEqual(runtime.getSnapshot().outputs.source.rows, [
  { id: "a", value: 0 },
]);
relabeled.resources[0].configuration.rows = '[{"id":"b","value":3}]';
runtime.updateDocument(relabeled);
assert.deepEqual(runtime.getSnapshot().outputs.source.rows, [
  { id: "b", value: 3 },
]);
const { TimeSeriesView } = load(
  "src/simulations/components/views/TimeSeriesView.tsx",
);
const wrongTime = {
  columns: [
    { key: "time", label: "Time", unit: "min", type: "number" },
    { key: "value", label: "Distance", unit: "m", type: "number" },
  ],
  rows: [{ time: 1, value: 2 }],
  assumption: "",
};
assert.match(
  renderToStaticMarkup(
    React.createElement(TimeSeriesView, { dataset: wrongTime }),
  ),
  /numeric model time in seconds/,
);
console.log(
  "Resource presentation updates preserve parsed rows; authored data changes reinitialize; incompatible time-series contracts stay local.",
);

const sparse = {
  columns: [
    { key: "x", label: "x", type: "number" },
    { key: "y", label: "y", type: "number" },
  ],
  rows: Array.from({ length: 61 }, (_, x) => ({ x, y: x === 30 ? 1 : null })),
};
assert.match(
  render(sparse),
  /<circle/,
  "An isolated valid observation stays visible in a longer dataset",
);
assert.doesNotMatch(
  render([{ x: 1e308, y: 1 }]),
  /(?:d|cx|cy)="[^"]*(?:NaN|Infinity)/,
);
