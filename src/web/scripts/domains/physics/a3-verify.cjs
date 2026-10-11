const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { load } = require("../../test-loader.cjs");
const { mechanicsModels: models } = load(
  "src/simulations/domains/physics/mechanics.ts",
);
const cases = require("./a3-cases.json");
const near = (a, b, t = 1e-10) =>
  assert.ok(Math.abs(a - b) <= t * Math.max(1, Math.abs(b)), `${a} != ${b}`);
const model = (k) => models.find((m) => m.presentation === "physics-" + k),
  state = (k, p = {}) => model(k).initialize(p),
  measure = (k, p = {}) => model(k).measure(state(k, p));
for (const m of models) {
  const s = m.initialize({}),
    o = m.measure(s);
  assert.deepEqual(Object.keys(o).sort(), Object.keys(m.outputs).sort());
  for (const v of Object.values(o))
    if (typeof v === "number") assert.ok(Number.isFinite(v));
  assert.deepEqual(
    m.initialize(JSON.parse(JSON.stringify(m.configuration(s)))),
    s,
  );
  assert.throws(() => m.initialize({ extra: true }));
  assert.throws(() => m.apply(s, "UNKNOWN"));
  for (const [key, schema] of Object.entries(m.parameters.properties))
    if (["number", "integer"].includes(schema.type))
      for (const bad of [
        NaN,
        Infinity,
        schema.minimum - 1,
        schema.maximum + 1,
        "1",
      ])
        assert.throws(() => m.initialize({ [key]: bad }));
}
for (const n of [1, 2, 4])
  for (const force of [1, 200, 2000]) {
    const o = measure("pulley", { strands: n, loadForce: force, pull: 1 });
    near(o.tension, force / n);
    near(o.rise, 1 / n);
    near(o.inputWork, o.outputWork);
  }
assert.throws(() => state("pulley", { strands: 3 }));
near(measure("gears").ratio, 2);
near(measure("gears").torqueRatio, 0.5);
for (const [front, rear] of [
  [20, 40],
  [30, 15],
  [60, 10],
]) {
  const o = measure("gears", { front, rear, turns: 1 });
  near(o.ratio * o.torqueRatio, 1);
  near(o.wheelTorque * o.ratio, 20);
  near(o.distance, o.distancePerTurn);
}
near(measure("tipping").criticalAngle, 16.69924423399362);
assert.equal(measure("tipping", { tilt: 16.7 }).tipped, true);
assert.equal(measure("tipping", { tilt: 16 }).tipped, false);
assert.ok(
  measure("tipping", { loadHeight: 0.5 }).criticalAngle >
    measure("tipping", { loadHeight: 1.5 }).criticalAngle,
);
assert.throws(() => state("tipping", { height: 0.5, loadHeight: 1 }));
const impact = model("collision").apply(
    state("collision"),
    "COLLISION_COLLIDED",
  ),
  o = model("collision").measure(impact);
near(o.velocity1, 2);
near(o.velocity2, 2);
near(o.initialEnergy, 9);
near(o.kineticEnergy, 6);
near(o.internalEnergy, 3);
for (const e of [0, 0.5, 1])
  for (const u of [1, 3, 10])
    for (const w of [-10, -1, 0]) {
      const o = measure("collision", {
        restitution: e,
        speed1: u,
        speed2: w,
        collided: true,
      });
      near(o.finalMomentum, o.momentum);
      near(o.velocity2 - o.velocity1, e * (u - w));
      near(o.initialEnergy, o.kineticEnergy + o.internalEnergy);
      if (e === 1) near(o.initialEnergy, o.kineticEnergy);
    }
assert.equal(
  measure("collision", { speed1: -1, speed2: 1, collided: true }).approaching,
  false,
);
near(
  model("collision").measure(
    model("collision").apply(impact, "COLLISION_SPEED1", 4),
  ).velocity1,
  4,
);
near(measure("buoyancy").displacedVolume, 0.01);
near(measure("buoyancy", { cargo: 5 }).requiredVolume, 0.015);
assert.equal(measure("buoyancy", { cargo: 50 }).floats, false);
assert.equal(measure("buoyancy", { flooded: true }).floats, false);
assert.equal(measure("buoyancy").solidFloats, false);
near(measure("buoyancy").weight, measure("buoyancy").buoyantForce);
assert.throws(() => state("buoyancy", { materialVolume: 0.01, volume: 0.002 }));
near(measure("pressure").range, 1);
near(measure("pressure", { holeHeight: 0.1 }).range, 0.6);
near(measure("pressure", { holeHeight: 0 }).range, 0);
near(measure("pressure", { holeHeight: 1 }).speed, 0);
assert.throws(() => state("pressure", { holeHeight: 2 }));
near(measure("hydraulics").outputForce, 2000);
near(measure("hydraulics").outputTravel, 0.01);
for (const inputForce of [1, 100, 500]) {
  const o = measure("hydraulics", { inputForce });
  near(o.inputWork, o.outputWork);
  near(o.inputWork, o.loadWork);
  near(o.inputTravel * 1e-4, o.outputTravel * 20e-4);
  if (inputForce < 100) {
    assert.equal(o.canLift, false);
    near(o.inputTravel, 0);
    near(o.outputTravel, 0);
  }
}
near(measure("flow").wideSpeed, 1);
near(measure("flow").narrowSpeed, 2);
near(measure("flow").pressureDifference, -1500);
assert.throws(() => state("flow", { narrowArea: 0.001 }));
assert.throws(() => state("flow", { narrowArea: 0.03 }));
near(measure("flow", { flowRate: 0 }).pressureDifference, 0);
const { parachuteAdvance } = load(
  "src/simulations/components/systems/physics/parachute.ts",
);
near(measure("parachute").terminalSpeed, 6.603029607687671);
near(measure("parachute", { area: 40 }).terminalSpeed, 4.669047011971501);
for (const area of [0.5, 20, 40, 60]) {
  let s = state("parachute", { area, height: 1000 });
  const terminal = model("parachute").measure(s).terminalSpeed;
  for (let i = 0; i < 10; i++) s = parachuteAdvance(s);
  near(s.speed, terminal * Math.tanh((9.81 * 10) / terminal), 1e-7);
  near(
    s.distance,
    ((terminal * terminal) / 9.81) *
      Math.log(Math.cosh((9.81 * 10) / terminal)),
    1e-7,
  );
  let fine = state("parachute", { area, height: 1000 });
  for (let i = 0; i < 100; i++) fine = parachuteAdvance(fine, 0.1);
  near(fine.speed, s.speed, 1e-8);
  near(fine.distance, s.distance, 1e-8);
}
for (const params of [
  {
    mass: 200,
    area: 0.5,
    density: 0.5,
    dragCoefficient: 0.5,
    height: 1000,
    speed: 300,
  },
  {
    mass: 20,
    area: 60,
    density: 1.5,
    dragCoefficient: 2,
    height: 1000,
    speed: -30,
  },
]) {
  let coarse = state("parachute", params),
    fine = coarse;
  coarse = parachuteAdvance(coarse);
  for (let i = 0; i < 10; i++) fine = parachuteAdvance(fine, 0.1);
  near(coarse.speed, fine.speed, 1e-5);
  near(coarse.distance, fine.distance, 1e-5);
  assert.ok(Number.isFinite(coarse.speed) && Number.isFinite(coarse.distance));
}
let fall = state("parachute");
for (let i = 0; i < 2; i++) fall = parachuteAdvance(fall);
const deployed = model("parachute").apply(fall, "PARACHUTE_AREA", 40);
near(deployed.speed, fall.speed);
near(deployed.distance, fall.distance);
assert.ok(parachuteAdvance(deployed).speed < fall.speed);
assert.ok(measure("parachute", { speed: -10 }).drag > 0);
assert.ok(measure("parachute", { speed: 10 }).drag < 0);
for (let i = 0; i < 30; i++) fall = parachuteAdvance(fall);
assert.equal(fall.landed, true);
near(fall.distance, 100);
near(fall.speed, 0);
assert.deepEqual(parachuteAdvance(fall), fall);
assert.throws(() => parachuteAdvance(fall, 2));
assert.throws(() => state("parachute", { distance: 101 }));
assert.throws(() => state("parachute", { landed: true }));
console.log(
  "PHYS-02–10 reference, boundary, conservation, transition and convergence checks passed.",
);
if (process.env.A3_MODELS_ONLY) process.exit(0);
const { parseRecipe } = load("src/simulations/runtime/recipes/schema.ts"),
  { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts"),
  { DocumentRuntime } = load("src/simulations/runtime/authoring/runtime.ts");
for (const c of cases) {
  const recipe = parseRecipe(
      JSON.parse(
        fs.readFileSync(
          path.join(
            __dirname,
            "../../../src/simulations/pre-made",
            c.slug,
            "recipe.json",
          ),
          "utf8",
        ),
      ),
    ),
    runtime = loadRecipe(recipe).runtime,
    controls = recipe.document.nodes.filter((n) =>
      n.definition.startsWith("controls/"),
    );
  assert.ok(controls.length >= 1 && controls.length <= 3);
  for (const control of controls)
    assert.equal(
      runtime.submit(control.id, JSON.parse(control.configuration.initial))
        .accepted,
      true,
      control.id,
    );
  const snapshot = structuredClone(runtime.getSnapshot()),
    scalar = controls.find((n) => n.definition === "controls/Slider");
  if (scalar) {
    assert.equal(
      runtime.submit(scalar.id, { value: Infinity }).accepted,
      false,
    );
    assert.deepEqual(runtime.getSnapshot(), snapshot);
  }
  const reopened = new DocumentRuntime(
    JSON.parse(JSON.stringify(runtime.capture())),
  );
  assert.deepEqual(reopened.getSnapshot(), runtime.getSnapshot());
  if (c.kind !== "parachute") {
    const pair = runtime.capture();
    pair.nodes.push({
      ...structuredClone(pair.nodes[0]),
      id: "second",
      label: "Second independent model",
    });
    const paired = new DocumentRuntime(pair),
      second = structuredClone(paired.getSnapshot().state.second),
      first = scalar,
      previousFirst = structuredClone(
        paired.getSnapshot().state[pair.nodes[0].id],
      );
    assert.ok(
      paired.submit(first.id, {
        value:
          JSON.parse(first.configuration.initial).value +
          Number(first.configuration.step),
      }).accepted,
    );
    assert.notDeepEqual(
      paired.getSnapshot().state[pair.nodes[0].id],
      previousFirst,
    );
    assert.deepEqual(paired.getSnapshot().state.second, second);
  }
  console.log(
    c.id +
      " typed recipe/control/recovery/independent-edit/save/reopen passed.",
  );
}

const { compositionRequirements } = load(
  "src/simulations/components/catalog/explorationTeaching.ts",
);
for (const m of models)
  assert.equal(
    compositionRequirements[m.ref].selectionGroup,
    compositionRequirements["prefabs/physics/Lever"].selectionGroup,
    "Physics siblings must provide real contrast in Laya topic selection",
  );

require("./a3-retrieval.cjs");
