const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("../test-loader.cjs");
const { builtInRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { insertRecipe, remapDocument, selectionRecipe } = load(
  "src/simulations/runtime/authoring/recipes.ts",
);
const { emptyAuthoredDocument } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { regenerateTruss } = load(
  "src/simulations/runtime/authoring/regenerateTruss.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { canonicalDocument, migrateManualDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { parseDocument, serializeDocument, createDocument } = load(
  "src/simulations/builder/document.ts",
);
function copies(id) {
  let d = emptyAuthoredDocument();
  for (const prefix of ["a", "b"])
    d = insertRecipe(
      d,
      builtInRecipe(id),
      builtInRecipe,
      (key) => `${prefix}/${key}`,
    );
  return d;
}
const bridge = copies("recipes/BridgeLab"),
  br = new DocumentRuntime(bridge),
  original = structuredClone(br.getSnapshot());
assert.ok(
  br.dispatch([
    { node: "a/load", command: "SET_LOAD", arguments: { value: 20 } },
  ]).accepted,
);
assert.deepEqual(br.getSnapshot().state["b/model"], original.state["b/model"]);
assert.notDeepEqual(
  br.getSnapshot().outputs["a/model"].response,
  original.outputs["a/model"].response,
);
const middle = bridge.nodes.find((n) => n.id === "a/generated/diag2");
assert.ok(
  br.dispatch([
    { node: middle.id, command: "set:present", arguments: { value: false } },
  ]).accepted,
);
const before = structuredClone(br.getSnapshot());
const unsupported = bridge.nodes.find((n) => n.id === "a/generated/deck0");
assert.equal(
  br.dispatch([
    { node: "a/load", command: "SET_LOAD", arguments: { value: 25 } },
    {
      node: unsupported.id,
      command: "set:present",
      arguments: { value: false },
    },
  ]).accepted,
  false,
);
assert.deepEqual(
  br.getSnapshot(),
  before,
  "failed topology batch rolls back load and member",
);
const broken = structuredClone(bridge);
broken.nodes.find((n) => n.id === "a/generated/b0").configuration.x = 0.01;
assert.throws(() => br.updateDocument(broken), /unsupported joint/);
assert.deepEqual(
  br.document,
  bridge,
  "failed configuration leaves runtime document untouched",
);
assert.deepEqual(br.getSnapshot(), before);
const regenerated = regenerateTruss(
  bridge,
  "a/model",
  2,
  true,
  (id) => `new/${id}`,
);
assert.equal(regenerated.added, 45);
validateAuthoredDocument(regenerated.document, true);
new DocumentRuntime(regenerated.document);
assert.deepEqual(
  regenerated.document.nodes.find((n) => n.id === "a/load"),
  bridge.nodes.find((n) => n.id === "a/load"),
);
const copy = remapDocument(bridge, (id) => `copy/${id}`);
assert.equal(
  copy.nodes.find((n) => n.id === "copy/a/generated/deck0").configuration.a,
  "copy/a/generated/b0",
);
new DocumentRuntime(copy);
const town = copies("recipes/TownLab"),
  tr = new DocumentRuntime(town),
  initial = structuredClone(tr.getSnapshot());
assert.ok(
  tr.dispatch([
    { node: "a/model", command: "set:playing", arguments: { value: false } },
    { node: "a/market", command: "MOVE_MARKET", arguments: {} },
  ]).accepted,
);
assert.deepEqual(tr.getSnapshot().state["b/model"], initial.state["b/model"]);
const paused = structuredClone(tr.getSnapshot().state["a/model"]);
tr.step(0.1);
assert.deepEqual(tr.getSnapshot().state["a/model"], paused);
assert.ok(
  tr.getSnapshot().state["b/model"].time > initial.state["b/model"].time,
);
assert.ok(
  town.nodes
    .filter((n) => n.definition === "models/DailyRoutine")
    .every((n) =>
      town.nodes.some(
        (b) => b.id === n.configuration.homeId && b.scope === n.scope,
      ),
    ),
);
const appearance = structuredClone(town);
appearance.nodes.find((n) => n.id === "a/h1").configuration.color = "#ff0000";
const motion = structuredClone(tr.getSnapshot().state["b/model"].citizens);
tr.updateDocument(appearance);
assert.deepEqual(tr.getSnapshot().state["b/model"].citizens, motion);
const cameraDocument = structuredClone(appearance);
cameraDocument.nodes.find(
  (n) => n.id === "a/appearance",
).configuration.cameraPreset = "close";
const cameraBefore = structuredClone(tr.getSnapshot().state);
tr.updateDocument(cameraDocument);
assert.deepEqual(
  tr.getSnapshot().state,
  cameraBefore,
  "camera changes do not restart or advance clocks",
);
const ownMotion = structuredClone(tr.getSnapshot().state["a/model"].citizens);
appearance.nodes.find((n) => n.id === "a/h1").configuration.h = 10;
tr.updateDocument(appearance);
assert.deepEqual(
  tr.getSnapshot().state["a/model"].citizens,
  ownMotion,
  "building height is presentation",
);
const comparison = copies("recipes/ProjectileComparison"),
  pr = new DocumentRuntime(comparison),
  _start = structuredClone(pr.getSnapshot());
assert.ok(pr.submit("a/ball0/control/set:gravity", { value: 5 }).accepted);
assert.equal(pr.getSnapshot().state["a/ball1/model"].gravity, 5);
assert.equal(pr.getSnapshot().state["b/ball0/model"].gravity, 9.81);
const accepted = structuredClone(pr.getSnapshot());
assert.equal(
  pr.submit("a/ball0/control/set:gravity", { value: 0 }).accepted,
  false,
);
assert.deepEqual(pr.getSnapshot(), accepted);
pr.step(0.1);
pr.step(0.1);
assert.equal(pr.getSnapshot().state["a/ball0/model"].samples.length, 3);
assert.ok(pr.submit("a/ball0/control/set:angle", { value: 60 }).accepted);
assert.equal(pr.getSnapshot().state["a/ball1/model"].elapsed, 0);
const presentation = structuredClone(comparison);
presentation.nodes.find(
  (n) => n.id === "a/ball0/model",
).configuration.showVectors = true;
const elapsed = pr.getSnapshot().state["b/ball0/model"].elapsed;
pr.updateDocument(presentation);
assert.equal(pr.getSnapshot().state["b/ball0/model"].elapsed, elapsed);
const saved = selectionRecipe(
  town,
  town.nodes.filter((n) => n.id.startsWith("a/")).map((n) => n.id),
  { id: "user/town", title: "My town", description: "", tags: ["town"] },
);
const inserted = insertRecipe(
  emptyAuthoredDocument(),
  saved,
  () => {},
  (id) => `saved/${id}`,
);
validateAuthoredDocument(inserted, true);
new DocumentRuntime(inserted);
for (const d of [bridge, town, comparison, inserted])
  assert.deepEqual(
    parseDocument(serializeDocument(canonicalDocument(d))).authored,
    d,
  );
const trips = copies("recipes/ScheduledTrip"),
  sr = new DocumentRuntime(trips);
assert.ok(
  sr.dispatch([
    { node: "a/model", command: "set:time", arguments: { value: 8.5 } },
  ]).accepted,
);
assert.equal(sr.getSnapshot().state["b/model"].time, 0);
assert.notEqual(sr.getSnapshot().outputs["a/model"].people[0].position.x, -8);
assert.equal(
  trips.nodes.find((n) => n.id === "a/person").configuration.schedule[0].target,
  "a/destination",
);
for (const family of [
  "recipes/PendulumComparison",
  "recipes/RollingComparison",
]) {
  const d = copies(family),
    r = new DocumentRuntime(d);
  const shared = d.connections.find(
    (c) => c.kind === "command" && /SET_GRAVITY$/.test(c.to.port),
  );
  assert.ok(r.submit(shared.from.node, { value: 5 }).accepted);
  assert.equal(r.getSnapshot().state["a/object/second"].gravity, 5);
  assert.equal(r.getSnapshot().state["b/object/second"].gravity, 9.81);
}
for (const file of [
  "components/views/BridgeScene.tsx",
  "components/views/ProjectileScene.tsx",
  "components/views/ScopedWorldView.tsx",
  "components/visuals/CitizenVisual3D.tsx",
  "components/visuals/TownEnvironment.tsx",
]) {
  const text = fs.readFileSync(`src/simulations/${file}`, "utf8");
  assert.doesNotMatch(text, /use\w+Store|dispatchCommand\(/, file);
}
const migrated = migrateManualDocument(createDocument("town"));
validateAuthoredDocument(migrated.authored);
new DocumentRuntime(migrated.authored);
console.log(
  "Spatial catalog: isolated bridge/town/comparison copies, atomic topology failures, reference remapping, generation, seeded motion, presentation invariance, timeline, save/reload and public renderer ownership passed.",
);

const { publicDefinitions } = load(
  "src/simulations/components/catalog/index.ts",
);
const { runtimeProviders } = load(
  "src/simulations/runtime/authoring/providers.ts",
);
for (const definition of publicDefinitions.values())
  if (definition.runtimeProvider)
    assert.ok(runtimeProviders.has(definition.runtimeProvider), definition.id);
const { removeNodes } = load("src/simulations/runtime/authoring/recipes.ts");
let marketTarget = removeNodes(copies("recipes/TownLab"), [
  "a/market",
  "a/visual/market",
  "a/control/MOVE_MARKET",
  "a/control/MARKET_BUSY",
]);
const marketRecipe = builtInRecipe("recipes/Market"),
  bindings = {};
for (const external of marketRecipe.externalPorts)
  bindings[external.name] = {
    node:
      external.port.unit === "world/presentation" ? "a/appearance" : "a/model",
    port: external.port.unit === "world/presentation" ? "scene" : "market",
  };
marketTarget = insertRecipe(
  marketTarget,
  marketRecipe,
  builtInRecipe,
  (id) => `market/${id}`,
  {},
  bindings,
);
validateAuthoredDocument(marketTarget, true);
const marketRuntime = new DocumentRuntime(marketTarget);
assert.ok(marketRuntime.submit("market/control/MOVE_MARKET", {}).accepted);
assert.equal(
  marketRuntime.getSnapshot().state["a/model"].marketNearSchool,
  true,
);
assert.equal(
  marketRuntime.getSnapshot().state["b/model"].marketNearSchool,
  false,
);
// Both ports must opt into cross-scope observations; writes and attachments never inherit a subject tag policy.
const invalidScopes = structuredClone(town);
invalidScopes.nodes.find((n) => n.id === "a/market").scope = "b/scope/lab";
assert.throws(() => validateAuthoredDocument(invalidScopes), /scope|reference/);
let large = emptyAuthoredDocument(),
  copiesCount = 0;
while (
  large.nodes.length + builtInRecipe("recipes/TownLab").document.nodes.length <=
  512
) {
  large = insertRecipe(
    large,
    builtInRecipe("recipes/TownLab"),
    builtInRecipe,
    (id) => `large${copiesCount}/${id}`,
  );
  copiesCount++;
}
const largeBefore = structuredClone(large);
assert.throws(
  () =>
    insertRecipe(
      large,
      builtInRecipe("recipes/TownLab"),
      builtInRecipe,
      (id) => `excess/${id}`,
    ),
  /limit/,
);
assert.deepEqual(large, largeBefore);
const boundedRuntime = new DocumentRuntime(large);
boundedRuntime.step(0.1);
const path = require("node:path"),
  repo = path.resolve(__dirname, "../../../..");
const ledger = JSON.parse(
  fs.readFileSync(
    path.join(repo, "docs/agent-only/implementation/009-SOURCE-LEDGER.json"),
    "utf8",
  ),
);
function inventory(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? inventory(path.join(dir, e.name))
        : [path.relative(repo, path.join(dir, e.name)).replace(/\\/g, "/")],
    );
}
assert.deepEqual(
  [...new Set(ledger.records.map((r) => r.source))].sort(),
  inventory(path.join(repo, "src/web/src/simulations/components")).sort(),
  "refresh source ledger after component changes",
);
assert.ok(
  ledger.records.every(
    (r) =>
      r.finalOwner?.kind &&
      r.finalOwner.destination &&
      Array.isArray(r.finalOwner.consumers),
  ),
);
console.log(
  `Catalog closure: ${publicDefinitions.size} registered definitions, applied Market scope, both-port cross-scope policies, ${large.nodes.length}-node bounded execution, expansion rejection and complete source ledger passed.`,
);

for (const [ref, parameters] of [
  [
    "ProjectileExperiment",
    { angles: [30, 60], speed: 25, gravityPreset: "Moon" },
  ],
  [
    "BridgeExperiment",
    { spanScale: 2, dense: true, loadPos: 0.7, loadTons: 15 },
  ],
  ["TownExperiment", { time: 12, playing: false, speed: 2 }],
]) {
  const original = {
    schemaVersion: 1,
    composition: { ref: `compositions/${ref}`, version: 1 },
    parameters,
  };
  const migrated = parseDocument(JSON.stringify(original));
  validateAuthoredDocument(migrated.authored, true);
  new DocumentRuntime(migrated.authored);
  assert.deepEqual(migrated.authored.compatibility.source, original);
}
console.log(
  "Legacy projectile/bridge/town recipes migrate to editable canonical graphs with original source retained.",
);
