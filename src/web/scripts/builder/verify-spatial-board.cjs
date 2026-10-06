const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { emptyAuthoredDocument, emptyLayout } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const {
  boardItemMinimum,
  convertToBoard,
  separateBoardLayout,
  constrain,
  fit,
  resizeBoardRect,
  zoomAt,
  validateBoard,
  reconcileBoard,
  worldToScreen,
  screenToWorld,
} = load("src/simulations/runtime/authoring/board.ts");
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { remapDocument, removeNodes } = load(
  "src/simulations/runtime/authoring/recipes.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const d = emptyAuthoredDocument();
d.layout.children = [emptyLayout("first"), emptyLayout("second")];
validateAuthoredDocument(d);
d.presentation = convertToBoard(d);
validateAuthoredDocument(d);
assert.deepEqual(
  parseDocument(serializeDocument(canonicalDocument(d))).authored,
  d,
);
const sized = structuredClone(d);
sized.presentation.items[0].aspectRatio = 16 / 9;
const resized = resizeBoardRect(
  sized.presentation.items[0].rect,
  160,
  5,
  sized.presentation.items[0].aspectRatio,
  8,
);
assert.equal(resized.width / resized.height, 16 / 9);
validateAuthoredDocument(sized);
assert.equal(
  parseDocument(serializeDocument(canonicalDocument(sized))).authored
    .presentation.items[0].aspectRatio,
  16 / 9,
  "aspect-ratio preferences survive document round trips",
);
const invalidRatio = structuredClone(sized);
invalidRatio.presentation.items[0].aspectRatio = 12;
assert.throws(() => validateAuthoredDocument(invalidRatio));
const copied = remapDocument(d, (id) => `copy/${id}`);
validateAuthoredDocument(copied);
assert.equal(copied.presentation.items[0].layoutId, "copy/first");
assert.notEqual(copied.presentation.items[0].id, d.presentation.items[0].id);
for (const mutate of [
  (p) => (p.items[0].rect.width = 0),
  (p) => (p.items[0].rect.x = Infinity),
  (p) => p.items.push(p.items[0]),
  (p) => (p.items[0].layoutId = "missing"),
  (p) => (p.navigation.minZoom = 0),
  (p) => (p.immersive.startup = "scene"),
  (p) => (p.groups = [{ id: "group", label: "x", members: ["missing"] }]),
  (p) => p.items.pop(),
]) {
  const broken = structuredClone(d);
  mutate(broken.presentation);
  assert.throws(() => validateAuthoredDocument(broken));
}
const c = { centerX: -500, centerY: 20, zoom: 0.5 },
  z = zoomAt(c, 2, 150, -75);
assert.equal(c.centerX + 150 / c.zoom, z.centerX + 150 / z.zoom);
assert.equal(c.centerY - 75 / c.zoom, z.centerY - 75 / z.zoom);
assert.deepEqual(
  constrain(
    { centerX: -1000, centerY: 10000, zoom: 1 },
    { x: 0, y: 0, width: 100, height: 100 },
    400,
    200,
  ),
  { centerX: 50, centerY: 50, zoom: 1 },
);
assert.deepEqual(
  constrain(
    { centerX: -1000, centerY: 10000, zoom: 2 },
    { x: -100, y: -100, width: 1000, height: 1000 },
    400,
    200,
  ),
  { centerX: 0, centerY: 850, zoom: 2 },
);
assert.equal(fit({ x: 0, y: 0, width: 800, height: 600 }, 400, 300).zoom, 0.5);
const textDocument = emptyAuthoredDocument();
textDocument.nodes.push({
  id: "text",
  definition: "displays/Text",
  version: 1,
  label: "Instructions",
  scope: "main",
  configuration: { text: "Read me", variant: "body" },
});
textDocument.layout.children.push({
  ...emptyLayout("layout/text"),
  node: "text",
});
textDocument.presentation = convertToBoard(textDocument);
assert.deepEqual(boardItemMinimum(textDocument, "layout/text"), {
  width: 72,
  height: 48,
});
const compactText = resizeBoardRect(
  textDocument.presentation.items[0].rect,
  -1000,
  -1000,
  undefined,
  0,
  boardItemMinimum(textDocument, "layout/text"),
);
assert.deepEqual(
  { width: compactText.width, height: compactText.height },
  { width: 72, height: 48 },
  "text cards can shrink to compact content-sized bounds",
);
textDocument.presentation.items[0].rect = compactText;
validateBoard(textDocument);
const runtime = new DocumentRuntime(d),
  before = structuredClone(runtime.getSnapshot());
const moved = structuredClone(d);
moved.presentation.items[0].rect.x = -200;
runtime.updateDocument(moved);
assert.deepEqual(runtime.getSnapshot(), before);
assert.deepEqual(
  moved.editor,
  d.editor,
  "board placement does not change graph coordinates",
);
const pruned = structuredClone(d);
pruned.layout.children.pop();
reconcileBoard(pruned);
validateBoard(pruned);
assert.equal(pruned.presentation.items.length, 1);
assert.equal(removeNodes(d, []).presentation.items.length, 2);
console.log(
  "Spatial board: geometry, aspect ratios, validation, round trips, remapping, continuity, legacy compatibility passed",
);

for (const zoom of [0.1, 0.25, 1, 4]) {
  const camera = { centerX: -200, centerY: 800, zoom };
  const point = { x: 120, y: -80 };
  const viewport = { width: 390, height: 844 };
  const back = screenToWorld(
    worldToScreen(point, camera, viewport),
    camera,
    viewport,
  );
  assert.ok(
    Math.abs(back.x - point.x) < 1e-8 && Math.abs(back.y - point.y) < 1e-8,
  );
}
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const live = structuredClone(d),
  def = publicDefinition("models/Projectile");
live.scopes = [{ id: "scope", label: "Scope" }];
live.nodes.push({
  id: "projectile",
  definition: def.id,
  version: def.version,
  label: "Projectile",
  scope: "scope",
  configuration: structuredClone(def.defaults),
});
const running = new DocumentRuntime(live);
assert.ok(
  running.dispatch([
    { node: "projectile", command: "set:angle", arguments: { value: 37 } },
  ]).accepted,
);
running.step(0.1);
const liveSnapshot = structuredClone(running.getSnapshot());
const next = structuredClone(live);
next.presentation.items[0].rect.x += 100;
running.updateDocument(next);
assert.deepEqual(
  running.getSnapshot(),
  liveSnapshot,
  "Presentation edits preserve actual simulation state",
);

// Separation is presentation-only, preserves model identities and survives copies.
const separated = emptyAuthoredDocument();
separated.layout.children = [
  {
    ...emptyLayout("panel"),
    kind: "panel",
    label: "Controls",
    children: [emptyLayout("child-a"), emptyLayout("child-b")],
  },
];
separated.presentation = convertToBoard(separated);
const originalLayout = structuredClone(separated.layout);
separateBoardLayout(separated, "panel");
assert.deepEqual(separated.layout, originalLayout);
assert.deepEqual(separated.presentation.separatedLayouts, ["panel"]);
assert.equal(separated.presentation.items.length, 2);
validateAuthoredDocument(separated);
assert.deepEqual(
  parseDocument(serializeDocument(canonicalDocument(separated))).authored,
  separated,
);
const separatedCopy = remapDocument(separated, (id) => `copy/${id}`);
assert.deepEqual(separatedCopy.presentation.separatedLayouts, ["copy/panel"]);
validateAuthoredDocument(separatedCopy);
const dynamic = structuredClone(separated);
dynamic.presentation = {
  ...convertToBoard({ ...dynamic, presentation: undefined }),
};
dynamic.layout.children[0].kind = "tabs";
separateBoardLayout(dynamic, "panel");
assert.equal(
  dynamic.presentation.separatedLayouts,
  undefined,
  "Tabs retain their navigation semantics",
);
console.log(
  "Board separation: model/layout preservation, round trips, copied references and dynamic-container guard passed",
);

const emptied = structuredClone(separated);
emptied.layout.children[0].children = [];
reconcileBoard(emptied);
assert.deepEqual(emptied.presentation.separatedLayouts, []);
validateAuthoredDocument(emptied);
