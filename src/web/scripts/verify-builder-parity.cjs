const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const doc = load("src/simulations/builder/document.ts");
const m = load("src/simulations/builder/composition/model.ts");
const migration = load("src/simulations/builder/composition/migration.ts");
const w = load("src/simulations/builder/composition/workspace.ts");
const g = load("src/simulations/builder/composition/graph.ts");
const runtime = load("src/simulations/builder/composition/runtimeState.ts");
const editor = load("src/simulations/builder/composition/editor.ts");
const { measurementValue } = load(
  "src/simulations/builder/composition/measurements.ts",
);
const control = (id, widget = "slider") => ({
  id,
  label: id,
  target: "",
  property: "",
  widget,
  binding: widget === "button" ? "action" : "property",
  min: 0,
  max: 10,
  step: 1,
  slot: "primary",
});
const result = (id, output = "") => ({
  id,
  label: id,
  target: "",
  other: "",
  output,
  precision: 4,
  slot: "primary",
});
const connect = (s, from, port, to, input) =>
  g.connectPorts(s, { node: from, port }, { node: to, port: input });
for (const template of ["gas", "fractions"]) {
  const old = doc.createDocument(template),
    snapshot = JSON.stringify(old);
  const upgraded = migration.composeLegacy(old);
  doc.validateDocument(upgraded);
  assert.equal(
    JSON.stringify(old),
    snapshot,
    "migration must not mutate saved source",
  );
  assert.deepEqual(
    migration.composeLegacy(upgraded),
    upgraded,
    "migration idempotence",
  );
  assert.equal(upgraded.documentVersion, 2);
  assert.equal(upgraded.scene.workspace.canvases.length, 1);
  assert.equal(upgraded.scene.objects.length, template === "gas" ? 1 : 2);
  assert.equal(
    upgraded.scene.controls.length,
    old.presentation.controls.length,
  );
  assert.equal(
    upgraded.scene.measurements.length,
    old.presentation.results.length,
  );
  assert.deepEqual(
    doc.parseDocument(doc.serializeDocument(upgraded)),
    upgraded,
  );
}
const gasDoc = migration.composeLegacy(doc.createBlankDocument("gas", "right"));
const gas = gasDoc.scene;
gas.controls.push(control("volume"), control("reset", "button"));
gas.measurements.push(result("pressure"));
doc.validateDocument(gasDoc);
assert.throws(() => doc.validateRunnableDocument(gasDoc));
const ca = w.addCanvas(gas, "canvas-a"),
  cb = w.addCanvas(gas, "canvas-b");
const a = m.addSceneObject(gas, "gas", "gas-a"),
  b = m.addSceneObject(gas, "gas", "gas-b");
connect(gas, a.id, "geometry", ca.id, "objects");
connect(gas, b.id, "geometry", cb.id, "objects");
connect(gas, "volume", "value", a.id, "property:volume");
connect(gas, "reset", "value", ca.id, "action:reset");
connect(gas, a.id, "output:pressureKPa", "pressure", "data");
doc.validateDocument(gasDoc);
assert.equal(gas.controls[0].unit, "L");
assert.equal(gas.measurements[0].unit, "kPa");
const pa = w.projectedScene(gas, ca),
  pb = w.projectedScene(gas, cb);
assert.equal(pa.controls[1].target, "canvas");
assert.equal(pb.controls.length, 0);
const before = measurementValue(gas.measurements[0], pa, [], 0);
// Independent SI-unit expectation, rather than comparing two calls to the same system.
const expectedKPa =
  (a.inputs.amount * 1e-3 * 8.314462618 * a.inputs.temperature) /
  (a.inputs.volume * 1e-3) /
  1000;
assert.ok(Math.abs(before - expectedKPa) < 1e-10);
const changed = runtime.updateRuntimeObject(
  pa,
  a.id,
  "property",
  "volume",
  a.inputs.volume / 2,
);
assert.equal(changed.inputs.volume, a.inputs.volume / 2);
assert.equal(pb.objects[0].inputs.volume, b.inputs.volume);
const after = measurementValue(
  gas.measurements[0],
  { ...pa, objects: [changed] },
  [],
  0,
);
assert.ok(Math.abs(after / before - 2) < 1e-12);
const warmer = runtime.updateRuntimeObject(
  pa,
  a.id,
  "property",
  "temperature",
  400,
);
const warmPressure = measurementValue(
  gas.measurements[0],
  { ...pa, objects: [warmer] },
  [],
  0,
);
assert.ok(Math.abs(warmPressure / before - 400 / a.inputs.temperature) < 1e-12);
assert.throws(() =>
  runtime.updateRuntimeObject(pa, a.id, "property", "volume", 0),
);
assert.throws(() =>
  runtime.updateRuntimeObject(pa, a.id, "property", "temperature", Infinity),
);
assert.throws(() =>
  runtime.updateRuntimeObject(pa, a.id, "property", "volume", NaN),
);
assert.throws(() =>
  runtime.updateRuntimeObject(pa, a.id, "property", "volume", 1000),
);
const displayEdit = structuredClone(pa);
displayEdit.objects[0].display.x += 5;
displayEdit.objects[0].label = "Renamed gas sample";
displayEdit.objects[0].color = "#ff8844";
assert.equal(
  runtime.configurationKey(displayEdit),
  runtime.configurationKey(pa),
);
const merged = runtime.mergeRuntimeObjects(
  displayEdit.objects,
  [changed],
  pa.objects,
);
assert.equal(merged[0].inputs.volume, changed.inputs.volume);
assert.equal(merged[0].display.x, displayEdit.objects[0].display.x);
assert.equal(merged[0].label, "Renamed gas sample");
assert.equal(merged[0].color, "#ff8844");
const preview = structuredClone(changed);
preview.display.x += 9;
assert.equal(
  runtime.mergeRuntimeObjects(pa.objects, [preview], pa.objects)[0].display.x,
  preview.display.x,
);
const badUnit = structuredClone(gasDoc);
badUnit.scene.controls[0].unit = "K";
assert.throws(() => doc.validateDocument(badUnit));
const badOutput = structuredClone(gasDoc);
badOutput.scene.measurements[0].unit = "L";
assert.throws(() => doc.validateDocument(badOutput));
const toggle = control("toggle", "toggle");
gas.controls.push(toggle);
assert.ok(
  g.connectionError(
    gas,
    { node: toggle.id, port: "value" },
    { node: a.id, port: "property:volume" },
  ),
);
editor.deleteComponents(gasDoc, [a.id]);
assert.equal(gas.controls[0].target, "");
assert.equal(gas.measurements[0].target, "");
doc.validateDocument(gasDoc);

const fractionDoc = migration.composeLegacy(
  doc.createBlankDocument("fractions", "bottom"),
);
const s = fractionDoc.scene,
  canvas = w.addCanvas(s, "diagram-a"),
  otherCanvas = w.addCanvas(s, "diagram-b");
const bars = ["bar-a", "bar-b", "bar-c"].map((id) =>
  m.addSceneObject(s, "fraction-bar", id),
);
bars[1].shaded = [true, false, false, true];
bars[2].shaded = [true, false, false];
for (const bar of bars) connect(s, bar.id, "geometry", canvas.id, "objects");
s.controls.push(control("split", "button"), control("partitions", "number"));
s.measurements.push(
  result("comparison-ab", "comparison"),
  result("comparison-ac", "comparison"),
  result("fraction-readout"),
);
connect(s, "split", "value", bars[0].id, "action:subdivide");
connect(s, "partitions", "value", bars[2].id, "property:partitions");
connect(s, bars[0].id, "fraction-bar", "comparison-ab", "first");
connect(s, bars[1].id, "fraction-bar", "comparison-ab", "second");
connect(s, bars[0].id, "fraction-bar", "comparison-ac", "first");
connect(s, bars[2].id, "fraction-bar", "comparison-ac", "second");
connect(s, bars[0].id, "output:fraction", "fraction-readout", "data");
doc.validateDocument(fractionDoc);
assert.equal(measurementValue(s.measurements[0], s, [], 0), "1/2 = 2/4");
assert.equal(measurementValue(s.measurements[1], s, [], 0), "1/2 > 1/3");
const split = runtime.updateRuntimeObject(
  w.projectedScene(s, canvas),
  bars[1].id,
  "action",
  "subdivide",
  { factor: 2 },
);
assert.deepEqual(split.shaded, [
  true,
  true,
  false,
  false,
  false,
  false,
  true,
  true,
]);
assert.deepEqual(
  bars[1].shaded,
  [true, false, false, true],
  "staged commands cannot alter authored state",
);
const partitioned = runtime.updateRuntimeObject(
  s,
  bars[1].id,
  "property",
  "partitions",
  3,
);
assert.deepEqual(
  partitioned.shaded,
  [true, true, false],
  "partition setter uses prefix-shaded numerator",
);
assert.deepEqual(
  runtime.updateRuntimeObject(s, bars[1].id, "property", "partitions", 1)
    .shaded,
  [true],
  "partition setter caps numerator at denominator",
);
const rejectedStart = JSON.stringify(s);
assert.throws(() =>
  runtime.updateRuntimeObject(s, bars[1].id, "action", "subdivide", {
    factor: 4,
  }),
);
assert.throws(() =>
  runtime.updateRuntimeObject(s, bars[0].id, "action", "subdivide", {
    factor: 1.5,
  }),
);
assert.throws(() =>
  runtime.updateRuntimeObject(s, bars[0].id, "property", "partitions", 2.5),
);
assert.equal(
  JSON.stringify(s),
  rejectedStart,
  "rejected commands leave all state unchanged",
);
assert.throws(() =>
  runtime.updateRuntimeObject(s, bars[0].id, "piece", "", -1),
);
assert.throws(() => runtime.updateRuntimeObject(s, bars[0].id, "piece", "", 2));
const toggled = runtime.updateRuntimeObject(s, bars[0].id, "piece", "", 1);
assert.deepEqual(toggled.shaded, [true, true]);
bars[0].interactive = false;
assert.throws(() => runtime.updateRuntimeObject(s, bars[0].id, "piece", "", 1));
bars[0].interactive = true;
const snapshot = JSON.stringify(s);
assert.throws(() =>
  connect(s, bars[0].id, "geometry", otherCanvas.id, "objects"),
);
assert.equal(JSON.stringify(s), snapshot);
assert.throws(() =>
  connect(s, bars[0].id, "fraction-bar", "comparison-ab", "second"),
);
const wire = g
  .compositionGraph(fractionDoc)
  .wires.find((v) => v.to === "comparison-ac" && v.toPort === "second");
g.disconnectWire(s, wire);
assert.equal(s.measurements[1].other, "");
doc.validateDocument(fractionDoc);
editor.groupComponents(fractionDoc, [
  bars[0].id,
  bars[1].id,
  "comparison-ab",
  "split",
]);
editor.pasteComponents(fractionDoc, {
  document: structuredClone(fractionDoc),
  ids: [bars[0].id, bars[1].id, "comparison-ab", "split"],
});
doc.validateDocument(fractionDoc);
assert.equal(s.objects.length, 5);
assert.deepEqual(
  doc.parseDocument(doc.serializeDocument(fractionDoc)),
  fractionDoc,
);
assert.throws(() =>
  doc.validateDocument({ ...fractionDoc, documentVersion: "2" }),
);
assert.throws(() =>
  doc.validateDocument({ ...fractionDoc, documentVersion: 99 }),
);
console.log(
  "Builder parity: migration, detached drafts, instance isolation, gas units/mathematics, exact fractions/actions, permissions, graph constraints, display lifetime, copy/delete and serialization passed.",
);

assert.equal(
  runtime.authoredDisplayCommit(pa, changed).inputs.volume,
  a.inputs.volume,
  "display commit preserves authored gas starts",
);
const collision = doc.createDocument("gas");
collision.presentation.controls[0].id = "gas/container";
collision.presentation.controls[1].id = "canvas-main";
doc.validateDocument(collision);
const collisionMigration = migration.composeLegacy(collision);
doc.validateDocument(collisionMigration);
assert.equal(collisionMigration.scene.objects[0].id, "gas/container-1");
assert.ok(!Object.hasOwn(pa, "clock"), "physical projection has no town clock");
