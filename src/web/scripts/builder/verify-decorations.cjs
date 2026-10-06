const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { emptyAuthoredDocument, emptyLayout } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { createDrawing, resizeDrawing } = load(
  "src/simulations/runtime/authoring/drawings.ts",
);
const { convertToBoard, reconcileBoard, reorderBoardItems } = load(
  "src/simulations/runtime/authoring/board.ts",
);
const { migrateBoardDrawings } = load(
  "src/simulations/runtime/authoring/migrateDrawings.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { remapDocument } = load("src/simulations/runtime/authoring/recipes.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { serializeDocument, parseDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { pasteBoardContent, deleteBoardDrawingContent } = load(
  "src/simulations/builder/editor/boardClipboard.ts",
);
const { libraryChoices } = load(
  "src/simulations/builder/composition/libraryChoices.ts",
);
const d = emptyAuthoredDocument();
d.presentation = convertToBoard(d);
d.presentation.version = 2;
const box = createDrawing("box", { x: 0, y: 0, width: 300, height: 150 }, 0);
const text = createDrawing("text", { x: 20, y: 20, width: 180, height: 40 }, 1);
text.text = "Gas container";
d.presentation.items = [box, text];
d.presentation.groups = [
  { id: "drawing-group", label: "", members: [box.id, text.id] },
];
validateAuthoredDocument(d);
new DocumentRuntime(d);
reconcileBoard(d);
assert.equal(d.presentation.items.length, 2);
assert.deepEqual(
  parseDocument(serializeDocument(canonicalDocument(d))).authored,
  d,
);
const remapped = remapDocument(d, (id) => `copy/${id}`);
validateAuthoredDocument(remapped);
assert.equal(remapped.presentation.items[1].text, text.text);
assert.equal(remapped.presentation.groups[0].members[0], `copy/${box.id}`);
assert.deepEqual(resizeDrawing(box.rect, -40, -20, "nw"), {
  x: -40,
  y: -20,
  width: 340,
  height: 170,
});
const square = resizeDrawing(box.rect, 80, 10, "se", true);
assert.equal(square.width, square.height);
reorderBoardItems(d.presentation, [text.id], "back");
assert.equal(text.zIndex, 0);
const target = canonicalDocument(structuredClone(d));
pasteBoardContent(target, {
  document: canonicalDocument(d),
  ids: [],
  itemIds: [box.id, text.id],
});
assert.equal(target.authored.presentation.items.length, 4);
assert.equal(target.authored.presentation.groups.length, 2);
const copied = target.authored.presentation.items.slice(2);
assert.equal(copied[1].text, "Gas container");
assert.ok(copied[1].id !== text.id);
deleteBoardDrawingContent(target, [copied[0].id]);
validateAuthoredDocument(target.authored);
assert.equal(target.authored.presentation.groups.length, 1);
const invalid = structuredClone(d);
invalid.presentation.items[0].style.opacity = 2;
assert.throws(() => validateAuthoredDocument(invalid), /drawing/);
const version = structuredClone(d);
version.presentation.version = 1;
assert.throws(() => validateAuthoredDocument(version), /host/);
assert.ok(
  !libraryChoices("all", "").some((def) =>
    ["displays/Text", "displays/Box"].includes(def.id),
  ),
);
const old = emptyAuthoredDocument();
old.scopes = [{ id: "main", label: "Main" }];
old.nodes.push({
  id: "label",
  definition: "displays/Text",
  version: 1,
  label: "Label",
  scope: "main",
  configuration: { text: "Gas container", variant: "heading" },
});
old.layout.children.push({ ...emptyLayout("layout/label"), node: "label" });
old.presentation = convertToBoard(old);
old.editor.positions.label = { x: 20, y: 30 };
const snapshot = structuredClone(old);
const upgraded = migrateBoardDrawings(old);
validateAuthoredDocument(upgraded);
assert.deepEqual(old, snapshot);
assert.equal(upgraded.nodes.length, 0);
assert.equal(upgraded.presentation.items[0].kind, "text");
assert.equal(upgraded.presentation.items[0].text, "Gas container");
assert.deepEqual(
  upgraded.presentation.items[0].rect,
  old.presentation.items[0].rect,
);
const dynamic = structuredClone(old);
dynamic.nodes[0].configuration.text = "Value: {{value}}";
assert.equal(migrateBoardDrawings(dynamic).nodes.length, 1);
const nested = structuredClone(old);
nested.layout.children = [
  {
    ...emptyLayout("layout/container"),
    kind: "panel",
    children: nested.layout.children,
  },
];
nested.presentation = convertToBoard(nested);
assert.equal(migrateBoardDrawings(nested).nodes.length, 1);
assert.deepEqual(migrateBoardDrawings(upgraded), upgraded);
console.log(
  "Drawings: native storage, validation, resizing, layering, remapping, grouped clipboard, deletion, round trips, catalog exclusion and safe legacy migration passed",
);
// Mixed groups retain one shared layer order and duplicate both types together.
const { addCatalogComponent } = load(
  "src/simulations/builder/editor/compositeCommands.ts",
);
const mixed = structuredClone(d);
mixed.presentation.groups = [];
addCatalogComponent(mixed, "canvases/physical", "canvas", "", []);
const canvasItem = mixed.presentation.items.find(
  (item) => item.layoutId === "layout/canvas",
);
mixed.presentation.groups = [
  { id: "mixed", label: "", members: [canvasItem.id, text.id] },
];
const mixedTarget = canonicalDocument(mixed);
pasteBoardContent(mixedTarget, {
  document: canonicalDocument(mixed),
  ids: ["canvas"],
  itemIds: [canvasItem.id, text.id],
});
validateAuthoredDocument(mixedTarget.authored);
assert.equal(
  mixedTarget.authored.nodes.filter((n) => n.definition === "canvases/physical")
    .length,
  2,
);
assert.equal(
  mixedTarget.authored.presentation.items.filter((item) => item.kind === "text")
    .length,
  2,
);
assert.ok(
  mixedTarget.authored.presentation.groups.some(
    (group) => group.id !== "mixed" && group.members.length === 2,
  ),
);
console.log("Mixed component/drawing clipboard and grouping passed");
