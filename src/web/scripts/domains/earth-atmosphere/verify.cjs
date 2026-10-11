const assert = require("node:assert/strict");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../../test-loader.cjs");
const { TsunamiDiagram } = load(
  "src/simulations/components/views/earth-atmosphere/Diagrams.tsx",
);
const p = load(
  "src/simulations/components/systems/earth-atmosphere/physics.ts",
);
const d = load("src/simulations/domains/earth-atmosphere/index.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
for (const [i, k] of d.earthKinds.entries()) {
  const model = d.earthModels[i],
    s = model.initialize(model.defaults);
  assert.throws(() => model.initialize({ ...model.defaults, speed: NaN }));
  assert.throws(() => model.apply(s, d.command(k, "SET_missing"), 1));
  let n = s;
  for (let j = 0; j < d.lastPhase[k]; j++)
    n = model.apply(n, d.command(k, "ADVANCE"));
  assert.equal(n.phase, d.lastPhase[k]);
  assert.equal(n.playing, false);
  const restart = model.apply(n, d.command(k, "RESTART"));
  assert.equal(restart.phase, 0);
  assert.deepEqual(model.configuration(restart), model.defaults);
  // A one-stage advance takes equal model time independent of render rate.
  let slow = model.apply(s, d.command(k, "RUN")),
    fast = model.apply(s, d.command(k, "RUN"));
  for (let j = 0; j < 160; j++) slow = model.step(slow, 0.01);
  for (let j = 0; j < 16; j++) fast = model.step(fast, 0.1);
  assert.equal(slow.phase, fast.phase);
  assert.equal(slow.playing, fast.playing);
  const slug =
    k === "atmosphere"
      ? "atmosphere-ozone"
      : k === "greenhouse"
        ? "greenhouse-effect"
        : k + "-formation";
  const recipe = require(
    "../../../src/simulations/pre-made/" + slug + "/recipe.json",
  );
  assert.deepEqual(compositionIssues(recipe.document), []);
  const runtime = loadRecipe(recipe).runtime;
  assert.ok(
    runtime.dispatch([
      { node: "model", command: d.command(k, "ADVANCE"), arguments: {} },
    ]).accepted,
  );
  assert.equal(recipe.document.nodes.length, 4);
}
const f = p.faultState(1, 0, 3, 0),
  r = p.faultState(2, 0, 3, 0);
assert.equal(f.slip, 0);
assert.ok(r.slip > 0 && r.stress < f.stress);
assert.ok(r.pArrival < r.sArrival);
assert.equal(p.faultState(2, 0, 3, 0).slipVector[1], 0);
assert.ok(p.faultState(2, 0, 3, 1).slipVector[1] < 0);
assert.ok(p.faultState(2, 0, 3, 2).slipVector[1] > 0);
assert.ok(Math.abs(p.waveSpeed(4000) / p.waveSpeed(1000) - 2) < 1e-12);
assert.equal(p.tsunamiState(4000, 0, 3, 0).shelfAmplitude, 0);
assert.equal(p.tsunamiState(4000, 1, 5, 0).arrivals, 2);
assert.deepEqual(
  [0, 25, 60, 100, 700].map((h) => p.atmosphereState(h, 1).layer),
  [0, 1, 2, 3, 4],
);
assert.ok(p.atmosphereState(25, 0.3).uvB > p.atmosphereState(25, 1).uvB);
assert.ok(
  p.atmosphereState(25, 1).ozoneConcentration >
    p.atmosphereState(0, 1).ozoneConcentration,
);
const energy = p.initializeEnergy(0.76, 0.3, 1361);
assert.ok(Math.abs(p.energyFlux(energy, 0.76, 0.3, 1361).imbalance) < 1e-9);
assert.ok(p.energyFlux(energy, 0.91, 0.3, 1361).imbalance > 0);
const warmed = p.integrateEnergy(energy, 0.91, 0.3, 1361, 6e6);
assert.ok(warmed.surface > energy.surface);
assert.ok(Math.abs(warmed.residual) < 1e-5);
assert.ok(Math.abs(p.energyFlux(warmed, 0.91, 0.3, 1361).imbalance) < 1);
for (const wavelength of p.wavelengths) {
  const ray = p.rainbowRay(wavelength.index);
  assert.ok(Math.abs(ray.snellResidual) < 1e-12);
  assert.equal(ray.totalInternalReflection, false);
  assert.ok(ray.radius > 39 && ray.radius < 44);
}
assert.ok(p.rainbowRay(1.331).radius > p.rainbowRay(1.343).radius);
assert.ok(p.rainbowRay(1.331, 2).radius < p.rainbowRay(1.343, 2).radius);
assert.notDeepEqual(
  p.rainbowState(12, 0, false).contributingDroplets,
  p.rainbowState(12, 1, false).contributingDroplets,
);
assert.equal(p.rainbowState(60, 0, false).visible, false);
assert.equal(p.lightningState(3, 0, 1000, false).connected, false);
assert.equal(p.lightningState(5, 0.5, 1000, false).returnFraction, 0.5);
assert.equal(p.lightningState(5, 1, 1000, true).groundConnection, false);
assert.equal(p.lightningState(2, 0, 1000, false).netCloudCharge, 0);
assert.ok(
  p.lightningState(6, 0, 2000, false).thunderDelay >
    p.lightningState(6, 0, 1000, false).thunderDelay,
);
for (const rh of [20, 30, 80, 100])
  for (let phase = 0; phase <= 6; phase++) {
    const m = p.weatherState(phase, rh, 0);
    assert.ok(Math.abs(m.vapor + m.cloudWater + m.rain - m.waterTotal) < 1e-12);
    assert.ok(m.vapor >= 0 && m.cloudWater >= 0 && m.rain >= 0);
    if (phase < 6) assert.equal(m.rain, 0);
  }
assert.ok(
  p.weatherState(3, 30, 1).cloudBase > p.weatherState(3, 80, 1).cloudBase,
);
console.log(
  "Seven domain contracts, recipe wiring, causal physics, budgets and frame-rate checks passed.",
);

// A later greenhouse edit must preserve thermal inertia and allow another warming investigation.
let completed = d.initialize("greenhouse", d.defaults.greenhouse);
for (let i = 0; i < 6; i++) completed = d.apply(completed, "ADVANCE");
const edited = d.apply(completed, "SET_absorption", 0.91);
assert.deepEqual(edited.energy, completed.energy);
assert.equal(edited.phase, 3);
const continued = d.apply(edited, "ADVANCE");
assert.ok(continued.energy.surface > edited.energy.surface);
assert.equal(continued.config.solar, edited.config.solar);
assert.equal(
  d.apply(d.initialize("lightning", d.defaults.lightning), "SHOW_THUNDER")
    .phase,
  6,
);
assert.equal(
  d.apply(d.initialize("tsunami", d.defaults.tsunami), "NEXT_WAVE").phase,
  5,
);
const ozone = d.apply(
  d.initialize("atmosphere", d.defaults.atmosphere),
  "SHOW_OZONE",
);
assert.equal(ozone.config.altitude, 25);
assert.equal(ozone.config.ozone, 1);
assert.equal(ozone.config.uv, false);
const depleted = d.apply(ozone, "SET_ozone", 0.5);
assert.equal(
  depleted.config.uv,
  true,
  "Ozone changes must reveal their UV consequence",
);
assert.equal(depleted.config.altitude, 25);

// Changing animation rate must preserve both running and paused stages.
for (const model of d.earthModels) {
  if (model.ref.endsWith("/atmosphere")) continue;
  const initial = model.initialize(model.defaults);
  const running = model.step(
    model.apply(initial, d.command(initial.kind, "RUN")),
    0.4,
  );
  const slower = model.apply(
    running,
    d.command(initial.kind, "SET_speed"),
    0.5,
  );
  assert.equal(slower.playing, true);
  assert.equal(slower.phase, running.phase);
  assert.equal(slower.target, running.target);
  assert.equal(slower.progress, running.progress);
  const tick = model.step(slower, 0.4);
  assert.ok(Math.abs(tick.progress - slower.progress - 0.125) < 1e-12);
  const paused = model.apply(slower, d.command(initial.kind, "PAUSE"));
  assert.equal(
    model.apply(paused, d.command(initial.kind, "SET_speed"), 1).playing,
    false,
  );
}

// A zero source stays flat through every stage, including direct later-wave actions.
for (const displacement of [0, 1, -1]) {
  let tsunami = d.initialize("tsunami", {
    ...d.defaults.tsunami,
    displacement,
  });
  for (let phase = 0; phase <= d.lastPhase.tsunami; phase++) {
    const html = renderToStaticMarkup(
      React.createElement(TsunamiDiagram, { s: tsunami }),
    );
    if (displacement === 0) {
      assert.equal(d.metrics(tsunami).arrivals, 0);
      assert.match(d.caption(tsunami), /no tsunami/i);
      assert.doesNotMatch(
        html,
        /Seabed displacement|Faster|Schematic coastal surge|A later wave follows/,
      );
    } else {
      assert.equal(html.includes("Schematic coastal surge"), phase >= 4);
      assert.equal(
        d.metrics(tsunami).arrivals,
        phase < 4 ? 0 : phase === 4 ? 1 : 2,
      );
    }
    tsunami = d.apply(tsunami, "ADVANCE");
  }
  if (displacement === 0)
    assert.equal(d.metrics(d.apply(tsunami, "NEXT_WAVE")).arrivals, 0);
}
console.log(
  "Playback speed changes and zero-source tsunami regression checks passed.",
);
