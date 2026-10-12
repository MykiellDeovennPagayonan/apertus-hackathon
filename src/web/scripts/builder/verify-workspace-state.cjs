const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { contentFingerprint } = load(
  "src/simulations/builder/composition/constructionPreview.ts",
);
const { builderFailureStatus } = load(
  "src/simulations/builder/composition/builderFeedback.ts",
);
const { formatUserFacingDetails, formatUserFacingStatus } = load(
  "src/lib/planner/errorFormatting.ts",
);
const authored = modelRecipe("models/Projectile").document;
authored.presentation = convertToBoard(authored);
authored.editor.positions.model = { x: 321, y: 654 };
authored.editor.zoom = 0.73;
authored.editor.pan = { x: -287, y: 144 };
const document = canonicalDocument(authored);
const restored = parseDocument(serializeDocument(document));
assert.deepEqual(restored.authored, authored);
assert.deepEqual(restored.editor, authored.editor);
const moved = structuredClone(document);
moved.editor.pan = { x: 800, y: -800 };
moved.authored.editor.pan = { x: 800, y: -800 };
moved.editor.zoom = 1.4;
moved.authored.editor.zoom = 1.4;
assert.equal(contentFingerprint(document), contentFingerprint(moved));
moved.authored.editor.positions.model.x++;
assert.notEqual(contentFingerprint(document), contentFingerprint(moved));
for (const pan of [
  { x: NaN, y: 1 },
  { x: 1, y: Infinity },
  { x: "1", y: 2 },
  [1, 2],
  null,
]) {
  const bad = structuredClone(authored);
  bad.editor.pan = pan;
  assert.throws(
    () => validateAuthoredDocument(bad),
    /viewport position|finite JSON data/,
  );
}
const legacy = structuredClone(authored);
delete legacy.editor.pan;
validateAuthoredDocument(legacy);
assert.equal(
  parseDocument(serializeDocument(canonicalDocument(legacy))).editor.pan,
  undefined,
);
for (const message of [
  "Laya could not select a supported composition confidently. Please clarify the experiment.",
  "The request needs more detail. Specify which component or value to change.",
]) {
  const feedback = builderFailureStatus(
    message,
    "Add a chart",
    document,
    false,
  );
  assert.equal(feedback.kind, "info");
  assert.equal(feedback.text, "What should the chart show?");
  assert.ok(feedback.suggestions.length > 0);
  assert.ok(feedback.suggestions.every((s) => s.includes("Projectile")));
  assert.ok(!/Laya/i.test(feedback.text + feedback.help));
  assert.ok(
    !/Laya/i.test(
      formatUserFacingStatus(message) + formatUserFacingDetails(message),
    ),
  );
}
const failure = builderFailureStatus(
  "Apertus timed out.",
  "Add a chart",
  document,
  true,
);
assert.equal(failure.kind, "error");
assert.equal(failure.retry, true);
assert.match(failure.help, /No changes were applied/);
console.log(
  "Workspace metadata round-trip, legacy compatibility, viewport validation, transaction fingerprints and user-facing failure contracts passed.",
);
