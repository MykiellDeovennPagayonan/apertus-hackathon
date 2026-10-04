const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const docs = load("src/simulations/builder/document.ts");
const migration = load("src/simulations/builder/composition/migration.ts");
const workspace = load("src/simulations/builder/composition/workspace.ts");
const model = load("src/simulations/builder/composition/model.ts");
const graph = load("src/simulations/builder/composition/graph.ts");
const editor = load("src/simulations/builder/composition/editor.ts");
function fixture() {
  const d = migration.composeLegacy(docs.createBlankDocument("line", "right"));
  workspace.upgradeWorkspace(d.scene);
  const s = d.scene;
  workspace.addCanvas(s, "plane");
  model.addSceneObject(s, "line", "line-a");
  model.addSceneObject(s, "line", "line-b");
  s.controls.push({
    id: "slider",
    label: "Slope",
    widget: "slider",
    target: "",
    property: "",
    min: 0,
    max: 10,
    step: 0.1,
    slot: "primary",
  });
  s.measurements.push({
    id: "intersection",
    label: "Intersection",
    target: "",
    other: "",
    output: "intersection",
    precision: 2,
    slot: "primary",
  });
  const connect = (from, port, to, input) =>
    graph.connectPorts(s, { node: from, port }, { node: to, port: input });
  connect("line-a", "geometry", "plane", "objects");
  connect("line-b", "geometry", "plane", "objects");
  connect("slider", "value", "line-a", "property:slope");
  connect("line-a", "line", "intersection", "first");
  connect("line-b", "line", "intersection", "second");
  for (const b of graph.compositionGraph(d).blocks)
    d.editor.positions[b.id] = { x: b.x, y: b.y };
  d.lesson.title = "Canvas editing";
  d.lesson.instruction = "Explore the lines.";
  return d;
}
if (require.main === module) {
  const d = fixture();
  d.editor.positions["line-a"] = { x: 45000, y: -32000 };
  docs.validateDocument(d);
  editor.groupComponents(d, [
    "line-a",
    "line-b",
    "slider",
    "intersection",
    "plane",
  ]);
  assert.equal(editor.expandSelection(d, ["line-a"]).length, 5);
  const before = structuredClone(d);
  const pasted = editor.pasteComponents(d, {
    document: before,
    ids: editor.expandSelection(d, ["line-a"]),
  });
  docs.validateRunnableDocument(d);
  assert.equal(d.editor.groups.length, 2);
  const copied = d.scene.objects.find(
    (o) => pasted.includes(o.id) && o.label === "Line 1 copy",
  );
  const copiedPlane = d.scene.workspace.canvases.find((c) =>
    pasted.includes(c.id),
  );
  const control = d.scene.controls.find((c) => pasted.includes(c.id));
  const result = d.scene.measurements.find((m) => pasted.includes(m.id));
  assert.equal(d.scene.workspace.placements[copied.id], copiedPlane.id);
  assert.equal(control.target, copied.id);
  assert.equal(result.target, copied.id);
  assert.ok(pasted.includes(result.other));
  assert.deepEqual(d.editor.positions[copied.id], { x: 45040, y: -31960 });
  assert.deepEqual(docs.parseDocument(docs.serializeDocument(d)), d);
  editor.deleteComponents(d, pasted);
  docs.validateRunnableDocument(d);
  assert.deepEqual(d, before);
  editor.deleteComponents(d, ["line-a"]);
  docs.validateDocument(d);
  assert.equal(d.scene.controls[0].target, "");
  assert.equal(d.scene.measurements[0].target, "");
  assert.ok(!d.editor.groups[0].members.includes("line-a"));
  assert.throws(() => docs.validateRunnableDocument(d), /Connect/);
  const bad = fixture();
  bad.editor.groups = [
    { id: "group-a", label: "A", members: ["line-a", "missing"] },
  ];
  assert.throws(() => docs.validateDocument(bad), /membership/);
  bad.editor.groups = [
    { id: "group-a", label: "A", members: ["line-a", "line-b"] },
    { id: "group-b", label: "B", members: ["line-a", "plane"] },
  ];
  assert.throws(() => docs.validateDocument(bad), /membership/);
  const nonfinite = fixture();
  nonfinite.editor.positions["line-a"] = { x: Infinity, y: 0 };
  assert.throws(() => docs.validateDocument(nonfinite));
  const partial = fixture();
  const partialIds = editor.pasteComponents(partial, {
    document: structuredClone(partial),
    ids: ["plane", "line-a", "intersection"],
  });
  docs.validateDocument(partial);
  assert.equal(
    partial.scene.measurements.find((m) => partialIds.includes(m.id)).other,
    "",
  );
  const town = migration.composeLegacy(
    docs.createBlankDocument("town", "floating"),
  );
  workspace.upgradeWorkspace(town.scene);
  const ts = town.scene;
  workspace.addCanvas(ts, "town-view");
  model.addSceneObject(ts, "ground", "ground");
  model.addSceneObject(ts, "building", "house");
  model.addSceneObject(ts, "person", "person");
  ts.workspace.placements = {
    ground: "town-view",
    house: "town-view",
    person: "town-view",
  };
  ts.workspace.trips.push({
    id: "trip",
    label: "Morning trip",
    person: "person",
    target: "house",
    at: 8,
    x: 0,
    z: 0,
  });
  docs.validateDocument(town);
  const singleGround = editor.pasteComponents(town, {
    document: structuredClone(town),
    ids: ["ground"],
  });
  docs.validateDocument(town);
  assert.equal(ts.workspace.placements[singleGround[0]], undefined);
  editor.deleteComponents(town, singleGround);
  const singleTrip = editor.pasteComponents(town, {
    document: structuredClone(town),
    ids: ["trip"],
  });
  docs.validateDocument(town);
  assert.equal(
    ts.workspace.trips.find((t) => t.id === singleTrip[0]).person,
    "",
  );
  editor.deleteComponents(town, singleTrip);
  const allTown = graph.compositionGraph(town).blocks.map((b) => b.id);
  editor.groupComponents(town, allTown);
  const copiedTown = editor.pasteComponents(town, {
    document: structuredClone(town),
    ids: allTown,
  });
  docs.validateDocument(town);
  const trip = ts.workspace.trips.find((t) => copiedTown.includes(t.id));
  assert.ok(copiedTown.includes(trip.person));
  assert.ok(copiedTown.includes(trip.target));
  editor.deleteComponents(town, ["house"]);
  docs.validateDocument(town);
  assert.equal(ts.workspace.trips.find((t) => t.id === "trip").target, "");
  console.log(
    "Canvas editor: unbounded finite positions, group expansion, copy remapping, persistence, batch deletion, detached bindings and group validation passed.",
  );
}
module.exports = { fixture };
