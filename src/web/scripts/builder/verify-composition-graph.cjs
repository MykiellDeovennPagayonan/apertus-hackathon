const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const docs = load("src/simulations/builder/document.ts");
const model = {
  ...load("src/simulations/runtime/composition/index.ts"),
  ...load("src/simulations/builder/editor/objectCommands.ts"),
  ...load("src/simulations/lessons/formatHour.ts"),
};
const migration = load(
  "src/simulations/builder/document/migrations/composeLegacy.ts",
);
const workspace = {
  ...load("src/simulations/runtime/composition/projectCanvas.ts"),
  ...load("src/simulations/builder/editor/workspaceCommands.ts"),
  ...load("src/simulations/runtime/composition/validateWorkspace.ts"),
};
const graph = load("src/simulations/builder/graph/deriveGraph.ts");
const { compileTown } = load(
  "src/simulations/components/systems/ScheduledTripSystem.ts",
);
const { measurementValue } = load("src/simulations/lessons/measurements.ts");
const blank = (template) => {
  const doc = migration.composeLegacy(
    docs.createBlankDocument(
      template,
      template === "town" ? "floating" : "right",
    ),
  );
  workspace.upgradeWorkspace(doc.scene);
  return doc;
};
const d = blank("line"),
  s = d.scene;
assert.equal(s.workspace.canvases.length, 0);
assert.equal(graph.compositionGraph(d).blocks.length, 0);
docs.validateDocument(d);
const a = workspace.addCanvas(s, "plane-a"),
  b = workspace.addCanvas(s, "plane-b");
const line = model.addSceneObject(s, "line", "line-a");
const line2 = model.addSceneObject(s, "line", "line-b");
const square = model.addSceneObject(s, "square", "square-a");
s.controls.push({
  id: "slider",
  label: "Slope",
  target: "",
  property: "",
  widget: "slider",
  min: 0,
  max: 10,
  step: 0.1,
  slot: "primary",
});
s.measurements.push({
  id: "area",
  label: "Area",
  target: "",
  output: "",
  other: "",
  precision: 2,
  slot: "primary",
});
s.measurements.push({
  id: "intersection",
  label: "Intersection",
  target: "",
  output: "intersection",
  other: "",
  precision: 2,
  slot: "primary",
});
docs.validateDocument(d);
assert.equal(
  workspace.projectedScene(s, a).objects.length,
  0,
  "unconnected objects never render",
);
const connect = (from, port, to, input) =>
  graph.connectPorts(s, { node: from, port }, { node: to, port: input });
connect(line.id, "geometry", a.id, "objects");
connect(line2.id, "geometry", a.id, "objects");
connect(square.id, "geometry", b.id, "objects");
connect("slider", "value", line.id, "property:slope");
connect(square.id, "output:area", "area", "data");
connect(line.id, "line", "intersection", "first");
docs.validateDocument(d);
assert.ok(
  workspace.pendingConnections(s).some((p) => p.includes("Intersection")),
);
connect(line2.id, "line", "intersection", "second");
docs.validateDocument(d);
assert.deepEqual(
  workspace.projectedScene(s, a).objects.map((o) => o.id),
  [line.id, line2.id],
);
assert.deepEqual(
  workspace.projectedScene(s, b).objects.map((o) => o.id),
  [square.id],
);
assert.equal(workspace.projectedScene(s, a).controls.length, 1);
assert.equal(workspace.projectedScene(s, b).measurements.length, 1);
assert.throws(
  () => connect(line2.id, "geometry", b.id, "objects"),
  /intersection/i,
);
assert.throws(
  () => connect(square.id, "geometry", "area", "data"),
  /cannot connect/,
);
assert.throws(
  () => connect("slider", "value", square.id, "property:fill"),
  /toggles/,
);
square.side = 4;
assert.equal(
  measurementValue(s.measurements[0], workspace.projectedScene(s, b), [], 0),
  16,
);
d.editor.positions[line.id] = { x: 50, y: 80 };
d.lesson.title = "Two planes";
d.lesson.instruction = "Change slope and compare.";
docs.validateRunnableDocument(d);
const graphState = graph.compositionGraph(d);
for (const wire of graphState.wires) {
  assert.ok(
    graphState.node(wire.from).outputs.some((p) => p.id === wire.fromPort),
  );
  assert.ok(graphState.node(wire.to).inputs.some((p) => p.id === wire.toPort));
}
assert.deepEqual(docs.parseDocument(docs.serializeDocument(d)), d);
const moveWire = graphState.wires.find(
  (w) => w.from === square.id && w.to === b.id,
);
graph.disconnectWire(s, moveWire);
docs.validateDocument(d);
assert.equal(workspace.projectedScene(s, b).objects.length, 0);
assert.throws(() => docs.validateRunnableDocument(d), /Connect Square/);
connect(square.id, "geometry", b.id, "objects");
workspace.removeCanvas(s, b.id);
docs.validateDocument(d);
assert.ok(
  s.objects.some((o) => o.id === square.id),
  "removing a canvas leaves its objects editable",
);
assert.equal(s.workspace.placements[square.id], undefined);
const invalid = (mutate) => {
  const copy = structuredClone(d);
  mutate(copy.scene);
  assert.throws(() => docs.validateDocument(copy));
};
invalid((s) => {
  s.workspace.placements[line.id] = "missing";
});
invalid((s) => {
  s.workspace.canvases[0].settings.xMax = -100;
});
invalid((s) => {
  s.workspace.canvases[0].id = line.id;
});
invalid((s) => {
  s.controls[0].target = "missing";
});
invalid((s) => {
  s.workspace.untrusted = true;
});
const old = migration.composeLegacy(docs.createDocument("line"));
const original = structuredClone(old);
workspace.upgradeWorkspace(old.scene);
assert.equal(old.scene.workspace.canvases.length, 1);
assert.equal(old.scene.objects.length, original.scene.objects.length);
assert.equal(workspace.pendingConnections(old.scene).length, 0);
docs.validateRunnableDocument(old);
const town = blank("town"),
  t = town.scene;
const first = workspace.addCanvas(t, "town-a"),
  second = workspace.addCanvas(t, "town-b");
const ground = model.addSceneObject(t, "ground", "ground-a");
const ground2 = model.addSceneObject(t, "ground", "ground-b");
const house = model.addSceneObject(t, "building", "house");
house.x = 8;
const person = model.addSceneObject(t, "person", "person");
person.spawnAt = 2;
t.workspace.trips.push({
  id: "trip",
  label: "Go home",
  person: "",
  target: "",
  at: 3,
  x: 5,
  z: 0,
});
const townConnect = (from, port, to, input) =>
  graph.connectPorts(t, { node: from, port }, { node: to, port: input });
for (const o of [ground, person, house])
  townConnect(o.id, "geometry", first.id, "objects");
townConnect(ground2.id, "geometry", second.id, "objects");
assert.throws(
  () => townConnect(ground2.id, "geometry", first.id, "objects"),
  /already has ground/,
);
townConnect(person.id, "person", "trip", "person");
townConnect(house.id, "destination", "trip", "destination");
t.controls.push({
  id: "time",
  label: "Time",
  target: workspace.clockTarget(first.id),
  property: "time",
  widget: "slider",
  min: 0,
  max: 24,
  step: 0.05,
  slot: "primary",
});
docs.validateDocument(town);
const compiled = workspace.projectedScene(t, first);
assert.equal(
  compiled.objects.find((o) => o.id === person.id).schedule.length,
  1,
);
assert.equal(compiled.controls[0].target, "clock");
assert.equal(compileTown(compiled)(1)[0].status, "not spawned");
assert.equal(compileTown(compiled)(3)[0].status, "walking");
assert.throws(
  () => townConnect(house.id, "geometry", second.id, "objects"),
  /Disconnect the trip/,
);
model.removeSceneObject(t, house.id);
assert.equal(t.workspace.trips[0].target, "");
assert.equal(t.workspace.trips[0].person, person.id);
docs.validateDocument(town);
const legacyTown = migration.composeLegacy(docs.createDocument("town"));
workspace.upgradeWorkspace(legacyTown.scene);
assert.ok(legacyTown.scene.workspace.trips.length);
assert.ok(
  legacyTown.scene.objects
    .filter((o) => o.kind === "person")
    .every((o) => !o.schedule.length),
);
docs.validateDocument(legacyTown);
console.log(
  "Graph composition: disconnected drafts, multiple canvases, typed wires, projections, calculations, saved positions, migrations, trip compilation and deletion passed.",
);
