const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { builtInRecipes, builtInRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { libraryChoices } = load(
  "src/simulations/builder/composition/libraryChoices.ts",
);
const { createCanvasDocument, canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { insertComposite, addCatalogComponent } = load(
  "src/simulations/builder/editor/compositeCommands.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { remapDocument, selectionRecipe, validateRecipe, removeNodes } = load(
  "src/simulations/runtime/authoring/recipes.ts",
);
const { ungroupComponents, deleteComponents, pasteComponents } = load(
  "src/simulations/builder/editor/selection.ts",
);
const { compositionGraph } = load(
  "src/simulations/builder/graph/deriveGraph.ts",
);
const { connectDocument } = load(
  "src/simulations/builder/editor/connectionCommands.ts",
);
const { planInsertion } = load(
  "src/simulations/builder/editor/insertionPlan.ts",
);
const { makeFeedback } = load(
  "src/simulations/builder/composition/feedback.ts",
);
const { RecipeRepository } = load(
  "src/simulations/builder/library/RecipeRepository.ts",
);
const { emptyLayout } = load("src/simulations/runtime/authoring/types.ts");
const line = builtInRecipes.find((r) => r.title === "Line exploration");
assert.equal(line.version, 2);
assert.equal(line.document.nodes.length, 7);
assert.equal(builtInRecipe(line.id, 1).document.nodes.length, 14);
assert.equal(builtInRecipe(line.id, 2), line);
assert.equal(libraryChoices("all", "line")[0].id, "prefabs/AuthoredLine");
assert.ok(
  libraryChoices("objects", "line").every((d) => d.discovery.kind === "object"),
);
assert.ok(
  libraryChoices("all", "").every(
    (d) => d.discovery.summary.trim() && d.discovery.summary !== d.title,
  ),
);
const doc = createCanvasDocument("line", "right");
const host = doc.authored.nodes[0];
const count = doc.authored.nodes.length;
addCatalogComponent(
  doc.authored,
  "prefabs/AuthoredLine",
  "simple-line",
  host.id,
  [],
);
assert.equal(doc.authored.nodes.length, count + 1);
assert.ok(
  doc.authored.connections.some(
    (c) => c.from.node === "simple-line" && c.to.node === host.id,
  ),
);
assert.throws(
  () =>
    addCatalogComponent(
      structuredClone(doc.authored),
      "prefabs/AuthoredLine",
      "bad",
      "missing",
      [],
    ),
  /canvas was removed/,
);
const plannedSource = structuredClone(doc.authored);
const primitivePlan = planInsertion(
  plannedSource,
  { definition: "prefabs/AuthoredLine" },
  host.id,
  [],
  builtInRecipe,
  "planned-line",
);
assert.deepEqual(
  plannedSource,
  doc.authored,
  "planning does not mutate the active document",
);
assert.match(primitivePlan.summary, /Adds one line to Cartesian plane/);
assert.ok(
  primitivePlan.document.connections.some(
    (connection) =>
      connection.from.node === "planned-line" && connection.to.node === host.id,
  ),
);
assert.throws(
  () =>
    planInsertion(
      plannedSource,
      { definition: "prefabs/AuthoredLine" },
      "removed-canvas",
      [],
      builtInRecipe,
      "rejected-line",
    ),
  /selected canvas was removed/i,
);
assert.deepEqual(plannedSource, doc.authored, "rejected plans are atomic");
doc.authored = insertComposite(
  doc.authored,
  line,
  builtInRecipe,
  (id) => `activity/${id}`,
  {},
  {},
  "",
);
const group = doc.authored.groups.find((g) => g.source?.id === line.id);
doc.editor.positions[group.id] = { x: 190, y: 260 };
doc.authored.editor = structuredClone(doc.editor);
validateAuthoredDocument(doc.authored);
const graph = compositionGraph(doc);
const projected = graph.node(group.id);
assert.equal(projected.x, 190);
assert.equal(
  projected.outputs.length,
  3,
  "declared ports exist without boundary connections",
);
const slope = projected.outputs.find((p) => p.label === "Slope");
const appearance = projected.outputs.find((p) => p.label === "Line appearance");
connectDocument(
  doc,
  { node: group.id, port: appearance.id },
  { node: host.id, port: "objects" },
);
assert.equal(
  doc.authored.nodes.find((n) => n.id === "activity/model").scope,
  host.scope,
);
assert.ok(
  group.members.every(
    (id) => doc.authored.nodes.find((n) => n.id === id).scope === host.scope,
  ),
);
addCatalogComponent(
  doc.authored,
  "displays/Readout",
  "outside-readout",
  host.id,
  [],
);
connectDocument(
  doc,
  { node: group.id, port: slope.id },
  { node: "outside-readout", port: "value" },
);
assert.ok(
  doc.authored.connections.some(
    (c) =>
      c.from.node === "activity/model" &&
      c.from.port === "slope" &&
      c.to.node === "outside-readout",
  ),
);
for (const collapsed of [false, true]) {
  group.collapsed = collapsed;
  validateAuthoredDocument(doc.authored);
  assert.ok(
    compositionGraph(doc).wires.some((w) => w.to === "outside-readout"),
  );
}
const reloaded = parseDocument(serializeDocument(doc));
assert.deepEqual(reloaded.editor.positions[group.id], { x: 190, y: 260 });
assert.deepEqual(
  reloaded.authored.groups.find((g) => g.id === group.id).exposedPorts,
  group.exposedPorts,
);
assert.deepEqual(canonicalDocument(doc.authored).editor, doc.authored.editor);
const exported = selectionRecipe(doc.authored, group.members, {
  id: "user/line",
  title: "Reusable line",
  description: "A line activity",
  tags: [],
});
validateRecipe(exported);
assert.ok(exported.document.groups.some((g) => g.id === group.id));
assert.ok(exported.externalPorts.some((p) => p.endpoint.port === "intercept"));
const remapped = remapDocument(exported.document, (id) => `remapped/${id}`);
assert.deepEqual(remapped.editor.positions[`remapped/${group.id}`], {
  x: 190,
  y: 260,
});
assert.ok(
  remapped.groups.every((g) =>
    g.exposedPorts.every((p) => p.endpoint.node.startsWith("remapped/")),
  ),
);
const clipboard = { document: structuredClone(doc), ids: [group.id] };
pasteComponents(doc, clipboard);
validateAuthoredDocument(doc.authored);
const copiedGroup = doc.authored.groups.find(
  (g) => g.id !== group.id && g.id.endsWith(group.id),
);
assert.ok(copiedGroup);
assert.deepEqual(doc.editor.positions[copiedGroup.id], { x: 230, y: 300 });
assert.ok(
  copiedGroup.exposedPorts.every((p) =>
    copiedGroup.members.includes(p.endpoint.node),
  ),
);
assert.equal(
  doc.authored.connections.filter((c) => c.to.node === "outside-readout")
    .length,
  1,
  "paste preserves an already bound singleton external destination",
);
const invalid = structuredClone(doc.authored);
invalid.groups[0].exposedPorts[0].endpoint.node = host.id;
assert.throws(() => validateAuthoredDocument(invalid), /invalid exposed port/);
const unknownPosition = structuredClone(doc.authored);
unknownPosition.editor.positions.unknown = { x: 0, y: 0 };
assert.throws(
  () => validateAuthoredDocument(unknownPosition),
  /invalid editor position/,
);
const badPosition = structuredClone(doc.authored);
badPosition.editor.positions[group.id].x = Infinity;
assert.throws(() => validateAuthoredDocument(badPosition), /finite JSON/);
const oldDocument = structuredClone(doc.authored);
for (const g of oldDocument.groups) delete g.exposedPorts;
validateAuthoredDocument(oldDocument);
assert.ok(
  compositionGraph(canonicalDocument(oldDocument)).node(group.id).outputs
    .length > 0,
  "legacy boundary ports still project",
);
ungroupComponents(doc, [copiedGroup.id]);
assert.equal(doc.editor.positions[copiedGroup.id], undefined);
assert.equal(doc.authored.editor.positions[copiedGroup.id], undefined);
validateAuthoredDocument(doc.authored);
deleteComponents(doc, [group.id]);
assert.equal(doc.editor.positions[group.id], undefined);
assert.equal(doc.authored.editor.positions[group.id], undefined);
validateAuthoredDocument(doc.authored);
const partial = removeNodes(clipboard.document.authored, ["activity/model"]);
assert.ok(
  partial.groups.every((g) =>
    (g.exposedPorts ?? []).every((p) => p.endpoint.node !== "activity/model"),
  ),
);
const reuseHost = createCanvasDocument("line", "right").authored;
reuseHost.layout.children.push({
  ...emptyLayout("author-empty-panel"),
  id: "author-empty-panel",
  kind: "panel",
  label: "Intentional empty panel",
});
const reused = insertComposite(
  reuseHost,
  line,
  builtInRecipe,
  (id) => `reused/${id}`,
  {},
  {},
  reuseHost.nodes[0].id,
);
validateAuthoredDocument(reused);
assert.ok(
  reused.layout.children.some((layout) => layout.id === "author-empty-panel"),
  "authored empty containers survive canvas reuse",
);
const generatedEmptyWrappers = [];
const findGeneratedEmptyWrappers = (layout) => {
  if (
    layout.id !== "author-empty-panel" &&
    !layout.node &&
    layout.children.length === 0 &&
    !reuseHost.layout.children.some((existing) => existing.id === layout.id)
  )
    generatedEmptyWrappers.push(layout.id);
  layout.children.forEach(findGeneratedEmptyWrappers);
};
findGeneratedEmptyWrappers(reused.layout);
assert.deepEqual(
  generatedEmptyWrappers,
  [],
  "canvas reuse prunes only newly emptied generated wrappers",
);
assert.ok(
  reused.groups.every((g) =>
    g.exposedPorts.every((p) => g.members.includes(p.endpoint.node)),
  ),
);
const diagnostic = makeFeedback(
  "group/86f0668a-3a5d-4ac7-8a88-c427f44ce1b2: invalid editor position",
  "error",
  "move Line exploration",
  "editor.position",
);
assert.equal(
  diagnostic.body.includes("86f0668a"),
  false,
  "primary errors hide internal identifiers",
);
assert.match(diagnostic.details, /editor\.position/);
const memory = new Map();
const store = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
};
const repository = new RecipeRepository(store);
repository.save(line);
assert.throws(() => repository.save(line), /changed in another editor/);
console.log(
  "Builder R1–R9 contracts: discovery, shared atomic insertion planning, curated activities, declared-port wiring, positions, import identity, diagnostics, canvas reuse pruning and metadata lifecycle passed.",
);
