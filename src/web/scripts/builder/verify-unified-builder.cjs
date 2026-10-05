const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { createCanvasDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { addCatalogComponent, insertComposite } = load(
  "src/simulations/builder/editor/compositeCommands.ts",
);
const { builtInRecipes, builtInRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { compositionGraph } = load(
  "src/simulations/builder/graph/deriveGraph.ts",
);
const { validateDocument, serializeDocument, parseDocument } = load(
  "src/simulations/builder/document.ts",
);
const { editableDocument } = load(
  "src/simulations/builder/persistence/recovery.ts",
);
const { deleteComponents, pasteComponents } = load(
  "src/simulations/builder/editor/selection.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { connectDocument, disconnectDocument, documentConnectionError } = load(
  "src/simulations/builder/editor/connectionCommands.ts",
);
for (const template of ["line", "gas", "fractions", "town"]) {
  const doc = createCanvasDocument(
    template,
    template === "town" ? "floating" : "right",
  );
  validateDocument(doc);
  assert.ok(doc.authored);
  assert.equal(doc.scene, undefined);
  assert.equal(doc.template, template);
  assert.equal(
    doc.authored.nodes.filter((n) => n.definition.startsWith("canvases/"))
      .length,
    1,
  );
  new DocumentRuntime(doc.authored);
  assert.deepEqual(
    editableDocument(parseDocument(serializeDocument(doc))),
    doc,
  );
}
const doc = createCanvasDocument("line", "right"),
  canvas = doc.authored.nodes.find(
    (n) => n.definition === "canvases/cartesian",
  );
const { componentDefinitions } = load("src/simulations/components/registry.ts");
const lineDef = Object.values(componentDefinitions).find(
  (d) => d.kind === "line",
);
addCatalogComponent(doc.authored, lineDef.id, "line-a", canvas.id, []);
assert.equal(
  doc.authored.nodes.find((n) => n.id === "line-a").scope,
  canvas.scope,
);
assert.equal(doc.authored.connections.length, 1);
addCatalogComponent(doc.authored, "displays/Readout", "readout", canvas.id, []);
assert.equal(
  documentConnectionError(
    doc,
    { node: "line-a", port: "slope" },
    { node: "readout", port: "value" },
  ),
  null,
);
connectDocument(
  doc,
  { node: "line-a", port: "slope" },
  { node: "readout", port: "value" },
);
const wire = compositionGraph(doc).wires.find((w) => w.to === "readout");
assert.ok(wire);
disconnectDocument(doc, wire);
assert.equal(doc.authored.connections.length, 1);
const dilution = builtInRecipes.find((r) => r.title === "Dilution Lab");
assert.ok(dilution);
const before = structuredClone(doc);
doc.authored = insertComposite(
  doc.authored,
  dilution,
  builtInRecipe,
  (id) => `copy/${id}`,
  {},
  {},
  "",
);
assert.ok(doc.authored.nodes.some((n) => n.id === canvas.id));
assert.ok(compositionGraph(doc).blocks.some((n) => n.kind === "Composite"));
new DocumentRuntime(doc.authored);
const group = doc.authored.groups.find((g) => g.source?.id === dilution.id);
const copy = pasteComponents(doc, {
  document: structuredClone(doc),
  ids: [group.id],
});
assert.ok(copy.length >= dilution.document.nodes.length);
new DocumentRuntime(doc.authored);
deleteComponents(doc, [group.id]);
assert.ok(doc.authored.nodes.some((n) => n.id === canvas.id));
assert.ok(!doc.authored.nodes.some((n) => group.members.includes(n.id)));
assert.deepEqual(
  before.authored.nodes.find((n) => n.id === canvas.id),
  doc.authored.nodes.find((n) => n.id === canvas.id),
);
console.log(
  "Unified builder commands: all setup canvases, canonical recovery, typed graph wiring, scoped insertion, collapsed groups, copy remapping and deletion passed.",
);
// Reuse a compatible chosen canvas without replacing its authored settings.
const destinationDoc = createCanvasDocument("line", "right");
const host = destinationDoc.authored.nodes.find(
  (n) => n.definition === "canvases/cartesian",
);
host.configuration.xMin = -25;
const lineRecipe = builtInRecipes.find((r) => r.title === "Line");
const placed = insertComposite(
  destinationDoc.authored,
  lineRecipe,
  builtInRecipe,
  (id) => `placed/${id}`,
  {},
  {},
  host.id,
);
assert.equal(
  placed.nodes.filter((n) => n.definition === "canvases/cartesian").length,
  1,
);
assert.equal(
  placed.nodes.find((n) => n.id === host.id).configuration.xMin,
  -25,
);
assert.ok(placed.connections.some((c) => c.to.node === host.id));
new DocumentRuntime(placed);
const unchanged = JSON.stringify(destinationDoc.authored);
assert.throws(
  () =>
    insertComposite(
      destinationDoc.authored,
      builtInRecipes.find((r) => r.title === "Gas Pressure"),
      builtInRecipe,
      (id) => `bad/${id}`,
      {},
      {},
      host.id,
    ),
  /own compatible canvases/,
);
assert.equal(JSON.stringify(destinationDoc.authored), unchanged);
console.log(
  "Destination insertion: matching canvas reuse, settings preservation and incompatible-host rollback passed.",
);
