const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (file.endsWith(".json")) return require(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith(".")) return require(name);
    if (name.endsWith(".css")) return {};
    const base = path.resolve(path.dirname(file), name);
    const resolved = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
    ].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    assert.ok(resolved, `Cannot resolve ${name} from ${file}`);
    return load(path.relative(path.resolve(__dirname, ".."), resolved));
  };
  new Function("require", "module", "exports", source)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
const { resolveExperimentPrompt } = load(
  "src/app/_lib/resolveExperimentPrompt.ts",
);
for (const [prompt, scene] of [
  ["Show me how launch angle affects projectile distance", "projectile"],
  ["Show me how a truss bridge supports weight", "bridge"],
  ["Show me how people move through a small town during the day", "town"],
])
  assert.equal(resolveExperimentPrompt(prompt), scene);
const { parseFollowUp } = load(
  "src/simulations/components/controls/PromptControl.ts",
);
const { planTownPath } = load(
  "src/simulations/components/systems/NavigationSystem.ts",
);
const openRoute = planTownPath({ x: -18, z: -8.4 }, { x: 16, z: 7.9 }, false);
const closedRoute = planTownPath({ x: -18, z: -8.4 }, { x: 16, z: 7.9 }, true);
assert.ok(openRoute.some((p) => p.z === 0));
assert.ok(closedRoute.every((p) => p.z !== 0));
const { townObstacles, clearTownSegment, avoidTownObstacles } = load(
  "src/simulations/components/systems/townNavigation.ts",
);
for (const nearSchool of [false, true]) {
  const obstacles = townObstacles(nearSchool);
  for (const [from, to] of [
    [
      { x: 1, z: 0 },
      { x: 11, z: 0 },
    ],
    [
      { x: -18, z: -8.4 },
      { x: 16, z: 7.9 },
    ],
    [
      { x: 14, z: -6 },
      { x: 14, z: -20 },
    ],
  ]) {
    const route = avoidTownObstacles(from, to, obstacles);
    assert.ok(route.length > 0, "Obstacle detour must reach destination");
    let previous = from;
    for (const point of route) {
      assert.ok(
        clearTownSegment(previous, point, obstacles),
        "Every path segment must clear solid objects",
      );
      previous = point;
    }
    assert.deepEqual(route.at(-1), to);
  }
}
const { townSurfaceHeight } = load(
  "src/simulations/components/visuals/townSurface.ts",
);
assert.equal(townSurfaceHeight({ x: 6, z: 3.3 }), 0.22);
assert.equal(townSurfaceHeight({ x: -25, z: 15 }), -0.05);
const { useTownStore } = load("src/simulations/runtime/townSession.ts");
load("src/simulations/runtime/session.ts").activateSession("town");
for (const prompt of [
  "Make it nighttime",
  "Close the main road",
  "Move the market near the school",
  "Make the market busy",
  "Speed up the day",
])
  assert.equal(parseFollowUp("town", prompt).handled, true);
assert.equal(useTownStore.getState().roadClosed, true);
assert.equal(useTownStore.getState().speed, 4);
const { useBridgeStore } = load("src/simulations/runtime/bridgeSession.ts");
const { buildTruss } = load(
  "src/simulations/components/prefabs/TrussAssembly.ts",
);
const { memberStress } = load(
  "src/simulations/components/systems/HeuristicBridgeResponseSystem.ts",
);
load("src/simulations/runtime/session.ts").activateSession("bridge");
parseFollowUp("bridge", "Put a heavier truck on it");
assert.equal(useBridgeStore.getState().loadTons, 22);
parseFollowUp("bridge", "Move the weight to the left");
assert.equal(useBridgeStore.getState().loadPos, 0.2);
parseFollowUp("bridge", "Make the bridge twice as long");
assert.equal(useBridgeStore.getState().spanScale, 2);
parseFollowUp("bridge", "Remove the middle member");
assert.equal(useBridgeStore.getState().removedMember, "bridge/diag2");
parseFollowUp("bridge", "Add more triangles");
assert.equal(useBridgeStore.getState().dense, true);
const truss = buildTruss(1, false);
const member = truss.members[0];
assert.ok(
  memberStress(member, truss.joints, 0.5, 10, true) >
    memberStress(member, truss.joints, 0.5, 10),
);
const { useProjectileStore } = load(
  "src/simulations/runtime/projectileSession.ts",
);
const { range, maxHeight, flightTime, posAt } = load(
  "src/simulations/components/systems/BallisticMotionSystem.ts",
);
assert.ok(Math.abs(range(20, 45, 9.81) - 40.7747) < 0.001);
assert.ok(Math.abs(posAt(20, 45, 9.81, flightTime(20, 45, 9.81)).y) < 1e-9);
assert.ok(maxHeight(20, 45, 1.62) > maxHeight(20, 45, 9.81));
load("src/simulations/runtime/session.ts").activateSession("projectile");
for (const prompt of [
  "Make it 60 degrees",
  "Compare it with 30 degrees",
  "What if gravity was like the Moon?",
  "Show velocity vectors",
])
  assert.equal(parseFollowUp("projectile", prompt).handled, true);
assert.equal(useProjectileStore.getState().compareAngle, 30);

assert.equal(parseFollowUp("bridge", "write a novel").handled, false);
console.log("Simulation verification passed.");

// Extraction boundary checks: data/ownership/lifecycle, rather than re-export syntax.
const { resolveComposition, stageComposition } = load(
  "src/simulations/runtime/validation.ts",
);
const { AngleComparisonExperiment } = load(
  "src/simulations/components/compositions/AngleComparisonExperiment.ts",
);
for (const demo of [
  "projectile",
  "bridge",
  "town",
  "counting",
  "arithmetic",
  "equal-groups",
  "fraction-builder",
  "fraction-number-line",
]) {
  const composition = resolveComposition(demo);
  assert.doesNotThrow(() => JSON.stringify(composition));
  const staged = stageComposition(composition);
  assert.equal(staged.length, composition.instances.length);
  // Premade selections must cover the authoritative recipe. Implementations stay in the library.
  for (const [kind, names] of Object.entries(composition.components)) {
    const file = path.resolve(
      __dirname,
      "..",
      `src/simulations/pre-made/${demo}/${kind}/index.ts`,
    );
    const ast = ts.createSourceFile(
      file,
      fs.readFileSync(file, "utf8"),
      ts.ScriptTarget.Latest,
    );
    assert.ok(
      ast.statements.every(ts.isExportDeclaration),
      `${file} must contain exports only`,
    );
    const selected = ast.statements.flatMap(
      (node) => node.exportClause?.elements?.map((e) => e.name.text) ?? [],
    );
    for (const name of names)
      assert.ok(selected.includes(name), `${demo}/${kind} is missing ${name}`);
  }
  const invalid = structuredClone(composition);
  invalid.instances.push(structuredClone(invalid.instances[0]));
  assert.throws(() => stageComposition(invalid), /duplicate instance/);
  const unknown = structuredClone(composition);
  unknown.components.resources.push("UnavailableAsset");
  assert.throws(() => stageComposition(unknown), /unknown definition/);
  const badAction = structuredClone(composition);
  badAction.actions.push("EXECUTE_SCRIPT");
  assert.throws(() => stageComposition(badAction), /unsupported action/);
}
const comparisonInstances = stageComposition(AngleComparisonExperiment);
assert.equal(comparisonInstances.length, 2);
comparisonInstances[0].transform.position.x = 99;
assert.equal(comparisonInstances[1].transform.position.x, 0);
const trussA = buildTruss(1, false, "a");
const trussB = buildTruss(1, false, "b");
assert.equal(
  new Set(
    [
      ...trussA.joints,
      ...trussB.joints,
      ...trussA.members,
      ...trussB.members,
    ].map((e) => e.id),
  ).size,
  trussA.joints.length +
    trussB.joints.length +
    trussA.members.length +
    trussB.members.length,
);
trussA.joints[0].x = 0.2;
assert.equal(trussB.joints[0].x, 0);
assert.ok(Object.values(trussB).every((v) => typeof v !== "function"));
const bridge = () => useBridgeStore.getState();
bridge().reset();
const originalTopology = bridge().truss.joints;
bridge().dispatch({ type: "SET_LOAD", value: 22 });
assert.equal(
  bridge().truss.joints,
  originalTopology,
  "Load edit must preserve topology",
);
assert.equal(
  bridge().response.supportShares[0] + bridge().response.supportShares[1],
  22,
);
assert.equal(bridge().truss.load.magnitude, 22);
bridge().dispatch({ type: "SELECT_MEMBER", value: "bridge/diag2" });
bridge().dispatch({ type: "REMOVE_MIDDLE" });
assert.equal(bridge().selectedMember, null);
assert.ok(!bridge().response.members.some((m) => m.id === "bridge/diag2"));
assert.equal(
  bridge().dispatch({ type: "SELECT_MEMBER", value: "bridge/diag2" }).accepted,
  false,
);
bridge().dispatch({ type: "MORE_TRIANGLES" });
assert.equal(bridge().removedMember, "bridge/diag4");
assert.ok(!bridge().response.members.some((m) => m.id === "bridge/diag4"));
assert.equal(bridge().selectedMember, null);
assert.ok(
  bridge().response.members.every(
    (m) =>
      bridge().truss.joints.some((j) => j.id === m.a) &&
      bridge().truss.joints.some((j) => j.id === m.b),
  ),
);
const beforeInvalidBridge = bridge();
assert.equal(
  bridge().dispatch({ type: "SET_LOAD", value: NaN }).accepted,
  false,
);
assert.equal(bridge(), beforeInvalidBridge);
const projectile = () => useProjectileStore.getState();
projectile().reset();
projectile().step(0.5);
projectile().dispatch({ type: "SET_PLAYING", value: false });
const pausedProjectile = projectile();
projectile().step(0.5);
assert.equal(projectile(), pausedProjectile);
projectile().dispatch({ type: "SET_ANGLE", value: 60 });
assert.equal(projectile().elapsed, 0);
assert.equal(projectile().primary.launch.angle, 60);
projectile().dispatch({ type: "COMPARE_ANGLE", value: 30 });
assert.notEqual(projectile().primary.id, projectile().comparison.id);
projectile().dispatch({ type: "SET_VELOCITY", value: 25 });
assert.equal(projectile().comparison.launch.velocity, 25);
projectile().dispatch({ type: "SET_GRAVITY", value: "moon" });
assert.equal(projectile().gravity, 1.62);
assert.equal(
  projectile().comparison.metrics.duration,
  flightTime(25, 30, 1.62),
);
projectile().dispatch({ type: "LAUNCH" });
projectile().dispatch({ type: "SET_SLOW_MO", value: true });
projectile().step(1);
assert.equal(projectile().elapsed, 0.25);
const beforeInvalidProjectile = projectile();
assert.equal(
  projectile().dispatch({ type: "SET_GRAVITY", value: "unknown" }).accepted,
  false,
);
assert.equal(projectile(), beforeInvalidProjectile);
for (const angle of [0, 90]) {
  projectile().dispatch({ type: "SET_ANGLE", value: angle });
  projectile().step(60);
  assert.ok(
    Object.values(projectile().primary.transform.position).every(
      Number.isFinite,
    ),
  );
  assert.ok(Object.values(projectile().primary.metrics).every(Number.isFinite));
}
const town = () => useTownStore.getState();
town().reset();
const initialTownCitizens = structuredClone(town().citizens);
assert.equal(initialTownCitizens.length, 22);
assert.equal(initialTownCitizens.filter((c) => c.role === "student").length, 8);
for (const c of initialTownCitizens) {
  if (c.status === "no-route") continue;
  let previous = c.pos;
  for (const waypoint of c.path) {
    assert.ok(
      clearTownSegment(previous, waypoint, townObstacles(false)),
      `${c.id}: route must clear obstacles`,
    );
    previous = waypoint;
  }
  assert.deepEqual(c.path.at(-1), c.destination);
}
town().step(1); // clamp to 0.1 seconds
assert.ok(Math.abs(town().time - 8.02) < 1e-9);
assert.ok(
  town().citizens.some(
    (c, i) =>
      Math.hypot(
        c.pos.x - initialTownCitizens[i].pos.x,
        c.pos.z - initialTownCitizens[i].pos.z,
      ) > 0,
  ),
);
town().dispatch({ type: "SET_PLAYING", value: false });
const poses = town().citizens.map((c) => structuredClone(c.pos));
for (const action of [
  { type: "SET_TIME", value: 12 },
  { type: "CLOSE_ROAD" },
  { type: "MOVE_MARKET" },
  { type: "MARKET_BUSY" },
]) {
  assert.equal(town().dispatch(action).accepted, true);
  assert.deepEqual(
    town().citizens.map((c) => c.pos),
    poses,
    "Paused edits must not move citizens",
  );
}
assert.equal(town().market.building.z, -18);
assert.equal(town().market.entrance.z, -16.5);
assert.equal(town().market.obstacle.z, -18);
assert.ok(
  town()
    .citizens.filter((c) => c.seed < 0.8)
    .every((c) => c.behavior.activity === "market"),
);
town().dispatch({ type: "SET_TIME", value: 24 });
assert.equal(town().time, 0);
assert.ok(town().citizens.every((c) => c.behavior.activity === "home"));
const beforeInvalidTown = town();
assert.equal(town().dispatch({ type: "SET_SPEED", value: 3 }).accepted, false);
assert.equal(town(), beforeInvalidTown);
town().reset();
assert.deepEqual(town().citizens, initialTownCitizens);
assert.equal(town().market.building.z, -4);
const { BehaviorRunnerSystem } = load(
  "src/simulations/components/systems/BehaviorRunnerSystem.ts",
);
const { NavigationSystem } = load(
  "src/simulations/components/systems/NavigationSystem.ts",
);
const { PathFollowingSystem } = load(
  "src/simulations/components/systems/PathFollowingSystem.ts",
);
const oneCitizen = structuredClone(initialTownCitizens[0]);
const previousPosition = structuredClone(oneCitizen.pos);
NavigationSystem(
  oneCitizen,
  {
    type: "MoveTo",
    entity: oneCitizen.id,
    taskId: 99,
    target: { x: 100, z: 100 },
  },
  { roadClosed: false, marketNearSchool: false },
);
assert.equal(oneCitizen.status, "no-route");
assert.deepEqual(oneCitizen.pos, previousPosition);
const arrived = structuredClone(initialTownCitizens[0]);
arrived.path = [{ x: arrived.pos.x + 0.1, z: arrived.pos.z }];
arrived.status = "traveling";
arrived.taskId = 101;
PathFollowingSystem(arrived, 0.1, townObstacles(false));
assert.equal(arrived.arrivedTaskId, 101);
assert.equal(arrived.status, "arrived");
const routine = structuredClone(initialTownCitizens[0]);
BehaviorRunnerSystem(routine, 6, true, false);
assert.equal(routine.behavior.activity, "home");
BehaviorRunnerSystem(routine, 8, true, false);
assert.equal(routine.behavior.activity, "market");
const requestId = routine.behavior.requestId;
assert.equal(BehaviorRunnerSystem(routine, 8, true, false), undefined);
assert.equal(routine.behavior.requestId, requestId);
// Clock adapters are owned by activation and cancel old sessions on switching/disposal.
const frames = new Map();
let nextFrame = 1;
global.requestAnimationFrame = (callback) => {
  const id = nextFrame++;
  frames.set(id, callback);
  return id;
};
global.cancelAnimationFrame = (id) => frames.delete(id);
const { activateSession, disposeSession } = load(
  "src/simulations/runtime/session.ts",
);
activateSession("town");
assert.equal(frames.size, 1);
activateSession("projectile");
assert.equal(frames.size, 1);
activateSession("bridge");
assert.equal(frames.size, 0);
activateSession("town");
const runFrame = (now) => {
  const [id, callback] = frames.entries().next().value;
  frames.delete(id);
  callback(now);
};
runFrame(1000);
runFrame(1100);
assert.ok(Math.abs(town().time - 8.02) < 1e-9);
disposeSession();
assert.equal(frames.size, 0);
delete global.requestAnimationFrame;
delete global.cancelAnimationFrame;
console.log(
  "Component ownership, validation, prefab, and lifecycle verification passed.",
);

const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { ProjectileScene } = load(
  "src/simulations/components/views/ProjectileScene.tsx",
);
const { BeamVisual } = load(
  "src/simulations/components/visuals/BeamVisual.tsx",
);
const { SVGWorldView } = load(
  "src/simulations/components/views/SVGWorldView.tsx",
);
const beforeRender = projectile();
const duplicateViews = renderToStaticMarkup(
  React.createElement(
    React.Fragment,
    null,
    React.createElement(ProjectileScene, {
      state: useProjectileStore.getState(),
    }),
    React.createElement(ProjectileScene, {
      state: useProjectileStore.getState(),
    }),
  ),
);
const markerIds = Array.from(
  duplicateViews.matchAll(/<marker id="([^"]+)"/g),
  (m) => m[1],
);
assert.equal(markerIds.length, 2);
assert.equal(
  new Set(markerIds).size,
  2,
  "Each SVG instance must have unique marker IDs",
);
assert.ok(!/NaN|Infinity/.test(duplicateViews));
assert.equal(
  projectile(),
  beforeRender,
  "Rendering additional views must not mutate model state",
);
const { HeuristicBridgeResponseSystem } = load(
  "src/simulations/components/systems/HeuristicBridgeResponseSystem.ts",
);
const beamTruss = buildTruss(1, false, "render");
const beamMember = beamTruss.members[0];
const beamResponse = HeuristicBridgeResponseSystem(
  beamTruss,
  0.5,
  10,
  null,
  false,
  1,
).responses[beamMember.id];
const beamHTML = renderToStaticMarkup(
  React.createElement(
    SVGWorldView,
    { viewBox: "0 0 800 400" },
    React.createElement(BeamVisual, {
      member: beamMember,
      joints: beamTruss.joints,
      response: beamResponse,
      toXY: (j) => ({ x: j.x * 400, y: 240 + j.y * 40 }),
      loadPos: 0.5,
      sag: 0,
      selected: false,
      onSelect: () => {},
    }),
  ),
);
assert.ok(beamHTML.includes('data-force="tension"'));
assert.ok(beamHTML.includes('stroke-dasharray="12 3"'));
console.log("SVG adapter rendering and instance-ID verification passed.");

require("./verify-math.cjs")({ load, React, renderToStaticMarkup });
