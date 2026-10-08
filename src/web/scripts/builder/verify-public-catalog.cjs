const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { builtInRecipes, builtInRecipe, createPublicNode } = load(
  "src/simulations/components/composites/catalog.ts",
);
const {
  insertRecipe,
  selectionRecipe,
  remapDocument,
  removeNodes,
  validateRecipe,
} = load("src/simulations/runtime/authoring/recipes.ts");
const { emptyAuthoredDocument, emptyLayout } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { canonicalDocument, migrateManualDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { createDocument, serializeDocument, parseDocument } = load(
  "src/simulations/builder/document.ts",
);
const { RecipeRepository } = load(
  "src/simulations/builder/library/RecipeRepository.ts",
);
const { assemblyDocument } = load(
  "src/simulations/runtime/authoring/adapters.ts",
);
const { defaultAssembly } = load("src/simulations/runtime/assembly.ts");
const { publicDefinitions } = load(
  "src/simulations/components/catalog/index.ts",
);
const { dataProviders, expressionValue } = load(
  "src/simulations/runtime/authoring/dataProviders.ts",
);
for (const id of [
  "controls/TextInput",
  "controls/EntityPicker",
  "displays/Formula",
  "displays/Legend",
  "data/Literal",
  "data/FieldSelector",
  "data/Expression",
  "data/UnitConversion",
  "resources/Theme",
])
  assert.ok(publicDefinitions.has(id), `${id} must be publicly registered`);
for (const recipe of builtInRecipes) {
  validateRecipe(recipe);
  const doc = insertRecipe(
    emptyAuthoredDocument(),
    recipe,
    builtInRecipe,
    (id) => `fixture/${id}`,
  );
  validateAuthoredDocument(doc, true);
  const runtime = new DocumentRuntime(doc),
    before = structuredClone(runtime.getSnapshot());
  assert.ok(runtime.reset().accepted);
  assert.deepEqual(runtime.getSnapshot(), before, recipe.title);
  runtime.step(0.1);
  assert.deepEqual(
    parseDocument(serializeDocument(canonicalDocument(doc))).authored,
    doc,
  );
}
// Construct dilution from individual primitives; this proves authoring as well as built-in insertion.
const manual = emptyAuthoredDocument();
manual.scopes = [{ id: "scope", label: "Lab" }];
manual.nodes = [
  createPublicNode("prefabs/chemistry/Dilution", "solution", "scope"),
  createPublicNode("appearance/chemistry-dilution", "beaker", "scope"),
  createPublicNode("controls/NumberInput", "water", "scope"),
  createPublicNode("displays/Readout", "concentration", "scope"),
];
manual.nodes[2].configuration.initial = '{"value":1}';
manual.connections = [
  {
    id: "appearance",
    kind: "attachment",
    from: { node: "solution", port: "appearance" },
    to: { node: "beaker", port: "model" },
  },
  {
    id: "add-water",
    kind: "command",
    from: { node: "water", port: "submit" },
    to: { node: "solution", port: "CHEM_ADD_WATER" },
  },
  {
    id: "measure",
    kind: "value",
    from: { node: "solution", port: "concentration" },
    to: { node: "concentration", port: "value" },
  },
];
manual.layout.children = manual.nodes
  .slice(1)
  .map((n) => ({ ...emptyLayout(`layout/${n.id}`), node: n.id }));
const recipe = selectionRecipe(
  manual,
  manual.nodes.map((n) => n.id),
  {
    id: "user/dilution",
    title: "My dilution",
    description: "",
    tags: ["chemistry"],
  },
);
let doc = insertRecipe(
  emptyAuthoredDocument(),
  recipe,
  () => {},
  (id) => `first/${id}`,
);
doc = insertRecipe(
  doc,
  recipe,
  () => {},
  (id) => `second/${id}`,
);
const runtime = new DocumentRuntime(doc),
  second = structuredClone(runtime.getSnapshot().state["second/solution"]);
assert.ok(runtime.submit("first/water", { value: 1 }).accepted);
assert.deepEqual(runtime.getSnapshot().state["second/solution"], second);
assert.notDeepEqual(runtime.getSnapshot().state["first/solution"], second);
const before = structuredClone(runtime.getSnapshot());
assert.equal(
  runtime.dispatch([
    {
      node: "first/solution",
      command: "CHEM_ADD_WATER",
      arguments: { value: 1 },
    },
    {
      node: "second/solution",
      command: "CHEM_ADD_WATER",
      arguments: { value: -1 },
    },
  ]).accepted,
  false,
);
assert.deepEqual(runtime.getSnapshot(), before);
assert.ok(runtime.reset("first/scope").accepted);
assert.deepEqual(runtime.getSnapshot().state["second/solution"], second);
runtime.submit("first/water", { value: 1 });
const accepted = structuredClone(runtime.getSnapshot().state),
  presentation = structuredClone(doc);
presentation.layout.gap = 24;
runtime.updateDocument(presentation);
assert.deepEqual(runtime.getSnapshot().state, accepted);
assert.ok(
  runtime.capture().nodes.find((n) => n.id === "first/solution").configuration
    .volume >
    doc.nodes.find((n) => n.id === "first/solution").configuration.volume,
);
const copy = remapDocument(doc, (id) => `copy/${id}`);
assert.equal(copy.connections[0].from.node, "copy/first/solution");
const ungrouped = structuredClone(doc);
ungrouped.groups = [];
validateAuthoredDocument(ungrouped, true);
const removed = removeNodes(doc, ["first/solution"]);
assert.ok(!removed.connections.some((c) => c.from.node === "first/solution"));
const external = selectionRecipe(manual, ["water"], {
  id: "external",
  title: "Water",
  description: "",
  tags: [],
});
assert.equal(external.externalPorts.length, 1);
const externalTarget = emptyAuthoredDocument();
externalTarget.scopes = [{ id: "external-scope", label: "External target" }];
externalTarget.nodes = [
  createPublicNode(
    "prefabs/chemistry/Dilution",
    "external-solution",
    "external-scope",
  ),
];
const externallyBound = insertRecipe(
    externalTarget,
    external,
    () => {},
    (id) => `external-copy/${id}`,
    {},
    {
      [external.externalPorts[0].name]: {
        node: "external-solution",
        port: "CHEM_ADD_WATER",
      },
    },
  ),
  externalRuntime = new DocumentRuntime(externallyBound),
  externalBefore = externalRuntime.getSnapshot().state["external-solution"];
assert.ok(externalRuntime.submit("external-copy/water", { value: 1 }).accepted);
assert.notDeepEqual(
  externalRuntime.getSnapshot().state["external-solution"],
  externalBefore,
);
assert.throws(
  () =>
    selectionRecipe(
      manual,
      ["water"],
      { id: "external", title: "Water", description: "", tags: [] },
      "reject",
    ),
  /external/,
);
const cycle = structuredClone(recipe);
cycle.nested = [{ id: "nested", recipe: cycle.id, version: 1 }];
assert.throws(
  () =>
    insertRecipe(
      doc,
      cycle,
      () => cycle,
      (id) => `cycle/${id}`,
    ),
  /recipe cycle/,
);
const missing = structuredClone(recipe);
missing.document.nodes[0].definition = "missing/provider";
assert.throws(
  () =>
    insertRecipe(
      doc,
      missing,
      () => {},
      (id) => id,
    ),
  /unknown/,
);
assert.deepEqual(
  doc,
  parseDocument(serializeDocument(canonicalDocument(doc))).authored,
);
assert.throws(
  () =>
    insertRecipe(
      doc,
      recipe,
      () => {},
      () => "collision",
    ),
  /duplicate/,
);
const nested = {
  ...structuredClone(recipe),
  id: "nested",
  document: emptyAuthoredDocument(),
  parameters: [],
  dependencies: [],
  nested: [
    { id: "a", recipe: recipe.id, version: 1 },
    { id: "b", recipe: recipe.id, version: 1 },
  ],
};
const expanded = insertRecipe(
  emptyAuthoredDocument(),
  nested,
  () => recipe,
  (id) => `nested/${id}`,
);
assert.equal(expanded.nodes.length, manual.nodes.length * 2);
validateAuthoredDocument(expanded, true);
const dilution = builtInRecipes.find((candidate) =>
  candidate.id.includes("chemistry-Dilution"),
);
assert.ok(dilution);
const customized = insertRecipe(
  emptyAuthoredDocument(),
  dilution,
  builtInRecipe,
  (id) => `custom/${id}`,
  { volume: 8 },
);
assert.equal(
  customized.nodes.find((node) => node.id === "custom/model").configuration
    .volume,
  8,
);
const resourceDocument = emptyAuthoredDocument();
resourceDocument.scopes = [{ id: "resource-scope", label: "Resources" }];
const dataset = createPublicNode(
  "resources/Dataset",
  "dataset",
  "resource-scope",
);
dataset.configuration.rows = '[{"id":"a","value":2}]';
resourceDocument.resources.push(dataset);
resourceDocument.nodes.push(
  createPublicNode("displays/DataTable", "table", "resource-scope"),
);
resourceDocument.connections.push({
  id: "dataset-table",
  kind: "value",
  from: { node: "dataset", port: "rows" },
  to: { node: "table", port: "value" },
});
resourceDocument.layout.children.push({
  ...emptyLayout("layout/table"),
  node: "table",
});
validateAuthoredDocument(resourceDocument, true);
assert.deepEqual(new DocumentRuntime(resourceDocument).value("table"), [
  { id: "a", value: 2 },
]);
const resourceRecipe = selectionRecipe(resourceDocument, ["dataset", "table"], {
  id: "resource-recipe",
  title: "Resource recipe",
  description: "",
  tags: [],
});
assert.equal(resourceRecipe.document.resources.length, 1);
resourceRecipe.parameters = [
  {
    name: "Rows",
    node: "dataset",
    field: "rows",
    schema:
      publicDefinitions.get("resources/Dataset").configuration.properties.rows,
    default: dataset.configuration.rows,
  },
];
validateRecipe(resourceRecipe);
const customizedResource = insertRecipe(
  emptyAuthoredDocument(),
  resourceRecipe,
  () => {
    throw new Error("No nested recipe expected");
  },
  (id) => `data/${id}`,
  { Rows: '[{"id":"b","value":4}]' },
);
assert.equal(
  customizedResource.resources.find((node) => node.id === "data/dataset")
    .configuration.rows,
  '[{"id":"b","value":4}]',
);
const dataDocument = emptyAuthoredDocument();
dataDocument.scopes = [{ id: "data-scope", label: "Data" }];
for (const [definition, id, configuration] of [
  ["models/area-perimeter", "rectangle", { width: 2, height: 3 }],
  ["data/Literal", "scalar", { json: "2" }],
  ["data/UnitConversion", "centimetres", {}],
  [
    "data/Expression",
    "expression",
    { expression: '{"op":"add","args":["x",3]}' },
  ],
]) {
  const node = createPublicNode(definition, id, "data-scope");
  node.configuration = configuration;
  dataDocument.nodes.push(node);
}
dataDocument.connections.push(
  {
    id: "convert",
    kind: "value",
    from: { node: "rectangle", port: "perimeter" },
    to: { node: "centimetres", port: "value" },
  },
  {
    id: "calculate",
    kind: "value",
    from: { node: "scalar", port: "value" },
    to: { node: "expression", port: "x" },
  },
);
validateAuthoredDocument(dataDocument, true);
const dataRuntime = new DocumentRuntime(dataDocument);
assert.equal(dataRuntime.getSnapshot().outputs.centimetres.value, 1000);
assert.equal(dataRuntime.getSnapshot().outputs.expression.value, 5);
assert.throws(
  () => expressionValue({ op: "divide", args: [1, 0] }, {}),
  /division by zero/,
);
assert.throws(
  () =>
    dataProviders
      .get("data/KelvinToCelsius")
      .synchronize(
        {},
        { value: [-1] },
        createPublicNode("data/KelvinToCelsius", "cold", "data-scope"),
      ),
  /absolute zero/,
);
const themed = structuredClone(dataDocument);
const visible = createPublicNode(
    "data/Literal-boolean",
    "visible",
    "data-scope",
  ),
  theme = createPublicNode("resources/Theme", "theme", "data-scope");
visible.configuration.json = "true";
themed.nodes.push(visible);
themed.resources.push(theme);
themed.layout.visibleWhen = { node: "visible", port: "value" };
themed.layout.theme = { node: "theme", port: "theme" };
validateAuthoredDocument(themed);
const themedCopy = remapDocument(themed, (id) => `copy/${id}`);
assert.equal(themedCopy.layout.visibleWhen.node, "copy/visible");
assert.equal(themedCopy.layout.theme.node, "copy/theme");
const comparison = defaultAssembly("prefabs/physical-systems/Pendulum");
comparison.instances.push({
  id: "object/second",
  label: "Second swing",
  prefab: { ref: "prefabs/physical-systems/Pendulum", version: 1 },
  parameters: { length: 2 },
});
const comparisonDocument = assemblyDocument(comparison),
  gravityConnections = comparisonDocument.connections.filter(
    (connection) => connection.to.port === "PEND_SET_GRAVITY",
  );
assert.equal(gravityConnections.length, 2);
assert.equal(gravityConnections[0].from.node, gravityConnections[1].from.node);
const comparisonRuntime = new DocumentRuntime(comparisonDocument);
assert.ok(
  comparisonRuntime.submit(gravityConnections[0].from.node, { value: 5 })
    .accepted,
);
assert.equal(comparisonRuntime.getSnapshot().state["object/first"].gravity, 5);
assert.equal(comparisonRuntime.getSnapshot().state["object/second"].gravity, 5);
let stored = null;
const storage = {
    getItem: () => stored,
    setItem: (_k, v) => {
      stored = v;
    },
  },
  repository = new RecipeRepository(storage);
repository.save(recipe);
assert.equal(repository.read()[0].title, recipe.title);
assert.throws(() => repository.save(recipe), /changed/);
const unchanged = stored;
assert.throws(
  () =>
    new RecipeRepository({
      ...storage,
      setItem: () => {
        throw new Error("quota");
      },
    }).save({
      ...recipe,
      id: "another",
      title: "Quota test copy",
      document: {
        ...recipe.document,
        lesson: { ...recipe.document.lesson, title: "Quota test copy" },
      },
    }),
  /quota/,
);
assert.equal(stored, unchanged);
stored = "invalid-json";
assert.throws(() => repository.read());
assert.equal(stored, "invalid-json");
for (const template of ["line", "gas", "fractions"]) {
  const legacy = createDocument(template),
    original = structuredClone(legacy),
    migrated = migrateManualDocument(legacy);
  assert.deepEqual(legacy, original);
  new DocumentRuntime(migrated.authored);
  validateAuthoredDocument(migrated.authored);
}
console.log(
  `${builtInRecipes.length} public recipes, manual dilution construction, exposed parameters, bounded data operations, layout bindings, independent copies, rollback, capture, migrations, nesting, references and storage failures passed.`,
);
