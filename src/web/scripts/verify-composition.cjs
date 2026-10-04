const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const model = load("src/simulations/builder/composition/model.ts");
const { composeLegacy } = load(
  "src/simulations/builder/composition/migration.ts",
);
const { measurementValue } = load(
  "src/simulations/builder/composition/measurements.ts",
);
const { compileTown, planRoute } = load(
  "src/simulations/builder/composition/town.ts",
);
const docs = load("src/simulations/builder/document.ts");
const cart = composeLegacy(docs.createBlankDocument("line", "right"));
assert.ok(cart.scene);
assert.equal(cart.scene.objects.length, 0);
docs.validateDocument(cart);
const a = model.addSceneObject(cart.scene, "line", "line-a");
const b = model.addSceneObject(cart.scene, "line", "line-b");
b.a = { x: 0, y: 2 };
b.b = { x: 2, y: 0 };
assert.deepEqual(model.lineIntersection(a, b), { x: 1, y: 1 });
b.a = { x: 0, y: 1 };
b.b = { x: 2, y: 3 };
assert.equal(model.lineIntersection(a, b), "parallel");
b.a = { x: 1, y: 1 };
b.b = { x: 2, y: 2 };
assert.equal(model.lineIntersection(a, b), "coincident");
b.a = { x: 1, y: -3 };
b.b = { x: 1, y: 3 };
assert.deepEqual(model.lineIntersection(a, b), { x: 1, y: 1 });
assert.throws(() => model.setProperty(b, "slope", 2));
model.setProperty(a, "slope", 2);
assert.equal(model.propertyValue(a, "slope"), 2);
model.setProperty(a, "intercept", 3);
assert.equal(model.propertyValue(a, "intercept"), 3);
const square = model.addSceneObject(cart.scene, "square", "square-a");
square.side = 4;
square.fill = true;
square.width = 12;
const readout = (target, output, other = "") => ({
  id: "readout",
  target,
  output,
  other,
  label: "Result",
  precision: 2,
  slot: "primary",
});
assert.equal(
  measurementValue(readout(square.id, "area"), cart.scene, [], 0),
  16,
);
assert.equal(
  measurementValue(readout(square.id, "perimeter"), cart.scene, [], 0),
  16,
);
square.fill = false;
square.width = 1;
assert.equal(
  measurementValue(readout(square.id, "area"), cart.scene, [], 0),
  16,
  "appearance cannot change mathematical area",
);
assert.equal(
  measurementValue(readout(b.id, "equation"), cart.scene, [], 0),
  "x = 1",
);
assert.equal(measurementValue(readout(a.id, "yAtOne"), cart.scene, [], 0), 5);
cart.scene.controls.push({
  id: "slope-a",
  target: a.id,
  property: "slope",
  label: "A slope",
  widget: "slider",
  min: -20,
  max: 20,
  step: 0.1,
  slot: "primary",
});
cart.scene.measurements.push({
  id: "intersection",
  target: a.id,
  other: b.id,
  output: "intersection",
  label: "Intersection",
  precision: 2,
  slot: "primary",
});
docs.validateDocument(cart);
assert.deepEqual(docs.parseDocument(docs.serializeDocument(cart)), cart);
const invalid = (mutate) => {
  const d = structuredClone(cart);
  mutate(d.scene);
  assert.throws(() => docs.validateDocument(d));
};
invalid((s) => (s.controls[0].target = "missing"));
invalid((s) => (s.controls[0].min = -30));
invalid((s) => (s.controls[0].max = 1));
invalid((s) => (s.objects[0].id = "clock"));
invalid((s) => (s.objects[1].id = s.objects[0].id));
invalid((s) => (s.objects[0].a.x = Infinity));
invalid((s) => (s.measurements[0].other = a.id));
invalid((s) => (s.objects[0].kind = "building"));
invalid((s) => (s.canvas.xMin = s.canvas.xMax));
invalid((s) => (s.objects[0].unexpected = true));
model.removeSceneObject(cart.scene, b.id);
assert.equal(cart.scene.measurements.length, 0);
assert.equal(cart.scene.controls.length, 1);
model.removeSceneObject(cart.scene, a.id);
assert.equal(cart.scene.controls.length, 0);
docs.validateDocument(cart);
const town = composeLegacy(docs.createBlankDocument("town", "floating"));
const ground = model.addSceneObject(town.scene, "ground", "ground");
ground.width = 20;
ground.depth = 20;
const house = model.addSceneObject(town.scene, "building", "house");
house.x = 3;
house.z = 0;
house.width = 2;
house.depth = 2;
const person = model.addSceneObject(town.scene, "person", "person");
person.x = -4;
person.z = 0;
person.spawnAt = 2;
person.speed = 1;
person.schedule.push({ id: "trip", at: 3, target: "house", x: 0, z: 0 });
docs.validateDocument(town);
const timeline = compileTown(town.scene);
assert.equal(timeline(1)[0].status, "not spawned");
assert.equal(timeline(2)[0].status, "waiting");
assert.equal(timeline(3.1)[0].status, "walking");
assert.notDeepEqual(timeline(3.1)[0].position, { x: -4, y: 0 });
assert.equal(timeline(10)[0].status, "waiting");
assert.deepEqual(timeline(10)[0].position, model.entrance(house));
assert.deepEqual(timeline(3.1), timeline(3.1), "scrubbing is deterministic");
const originalArrival = timeline(10)[0].position;
house.x = 6;
assert.notDeepEqual(
  compileTown(town.scene)(10)[0].position,
  originalArrival,
  "destination tracks moved building",
);
assert.deepEqual(planRoute(town.scene, { x: -4, y: 0 }, { x: 0, y: 0 }), [
  { x: 0, y: 0 },
]);
const obstacle = model.addSceneObject(town.scene, "building", "obstacle");
obstacle.x = 0;
obstacle.z = 0;
obstacle.width = 2;
obstacle.depth = 6;
const detour = planRoute(town.scene, { x: -4, y: 0 }, { x: 4, y: 0 });
assert.ok(detour.length > 1, "routes avoid authored obstacles");
assert.ok(
  detour.some((p) => Math.abs(p.y) > 3),
  "detour goes around building footprint",
);
assert.deepEqual(
  planRoute(town.scene, { x: -4, y: 0 }, { x: 0, y: 0 }),
  [],
  "inside obstacle is unreachable",
);
obstacle.depth = 20;
assert.deepEqual(
  planRoute(town.scene, { x: -4, y: 0 }, { x: 4, y: 0 }),
  [],
  "blocked crossing reports no route",
);
assert.deepEqual(
  planRoute(town.scene, { x: -4, y: 0 }, { x: 100, y: 0 }),
  [],
  "authored ground bounds apply",
);
model.removeSceneObject(town.scene, house.id);
assert.equal(person.schedule[0].target, "");
assert.deepEqual(
  { x: person.schedule[0].x, y: person.schedule[0].z },
  model.entrance(house),
  "deleting destination preserves its last coordinate",
);
docs.validateDocument(town);
const closedRoad = model.addSceneObject(town.scene, "road", "closed-road");
closedRoad.x = 0;
closedRoad.z = 0;
closedRoad.width = 1;
closedRoad.depth = 20;
closedRoad.closed = true;
model.removeSceneObject(town.scene, "obstacle");
assert.deepEqual(
  planRoute(town.scene, { x: -4, y: 0 }, { x: 4, y: 0 }),
  [],
  "closed roads are authored obstacles",
);
closedRoad.closed = false;
assert.deepEqual(planRoute(town.scene, { x: -4, y: 0 }, { x: 4, y: 0 }), [
  { x: 4, y: 0 },
]);
const badSchedule = structuredClone(town);
badSchedule.scene.objects.find((o) => o.kind === "person").schedule[0].at = 1;
assert.throws(() => docs.validateDocument(badSchedule));
const interrupted = structuredClone(town.scene);
const actor = interrupted.objects.find((o) => o.kind === "person");
actor.spawnAt = 0;
actor.speed = 1;
actor.x = -4;
actor.z = 0;
actor.schedule = [
  { id: "first-trip", at: 0, target: "", x: 4, z: 0 },
  { id: "second-trip", at: 0.5, target: "", x: -4, z: 0 },
];
assert.equal(
  compileTown(interrupted)(0.5)[0].position.x,
  -1.5,
  "new departures interrupt at the current position",
);
assert.equal(compileTown(interrupted)(2)[0].position.x, -4);
for (const template of ["line", "town"]) {
  const migrated = composeLegacy(docs.createDocument(template));
  docs.validateDocument(migrated);
  assert.ok(migrated.scene.objects.length);
  assert.deepEqual(
    docs.parseDocument(docs.serializeDocument(migrated)),
    migrated,
  );
  assert.deepEqual(composeLegacy(migrated), migrated);
}
console.log(
  "Composition pilots: geometry, intersections, instance bindings, strict validation, deletion, migration, schedules, deterministic playback and authored navigation passed.",
);
const twoLines = structuredClone(docs.createDocument("line").recipe);
const assembly = twoLines.assembly;
assembly.instances.push({
  ...structuredClone(assembly.instances[0]),
  id: "line/second",
  label: "Second line",
  parameters: { slope: -1, intercept: 4, xMin: -10, xMax: 10 },
});
for (const r of [...assembly.observations]) {
  const copy = { ...r, id: "second-" + r.id, instance: "line/second" };
  assembly.observations.push(copy);
  assembly.connections.push({
    type: "observation-source",
    from: { instance: copy.instance, output: copy.output },
    to: copy.id,
  });
  assembly.views[0].observations.push(copy.id);
}
for (const c of [...assembly.controls])
  assembly.controls.push({ ...c, instance: "line/second" });
const importedLines = docs.parseDocument(JSON.stringify(twoLines));
assert.equal(importedLines.scene.objects.length, 2);
assert.equal(
  importedLines.scene.controls.filter((c) => c.target === "line/second").length,
  2,
);
assert.equal(
  importedLines.scene.measurements.filter((m) => m.target === "line/second")
    .length,
  5,
);
assert.equal(importedLines.scene.canvas.xMin, -10);
docs.validateDocument(importedLines);
console.log(
  "Multi-line legacy recipes import as editable independent objects with instance-specific controls and observations.",
);
