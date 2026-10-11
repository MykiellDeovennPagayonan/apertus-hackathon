const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const { cycleModels, initializeCycle, advanceCycle, activities, cycleCommand } =
  load("src/simulations/domains/biogeochemistry/index.ts");
const { audit, transfer } = load(
  "src/simulations/components/systems/biogeochemistry/transfers.ts",
);
const { oxygenEquilibrium, dissolvedOxygen, oxygenAdvance } = load(
  "src/simulations/components/systems/biogeochemistry/oxygen.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
const { measureModel, compileAssembly, defaultAssembly } = load(
  "src/simulations/runtime/assembly.ts",
);
// Hand-calculated independent fixture: two consumers jointly request 8 from a store of 4.
const f = transfer({ a: 4, b: 0, c: 0 }, { a: 1, b: 1, c: 1 }, [
  { process: "first", amount: 4, from: { a: 1 }, to: { b: 1 } },
  { process: "second", amount: 4, from: { a: 1 }, to: { c: 1 } },
]);
assert.deepEqual(f.stores, { a: 0, b: 2, c: 2 });
assert.throws(() =>
  transfer({ a: 1, b: 0 }, { a: 1, b: 2 }, [
    { process: "bad", amount: 1, from: { a: 1 }, to: { b: 1 } },
  ]),
);
assert.throws(() =>
  transfer({ a: 1, b: 0 }, { a: 1, b: 1 }, [
    { process: "bad", amount: NaN, from: { a: 1 }, to: { b: 1 } },
  ]),
);
// USGS standard freshwater values rounded to 0.01 mg/L, independent benchmark tolerance.
for (const [t, expected] of [
  [0, 14.62],
  [15, 10.08],
  [20, 9.09],
  [25, 8.26],
  [40, 6.41],
])
  assert.ok(
    Math.abs(oxygenEquilibrium(t) - expected) < 0.02,
    `${t}°C equilibrium`,
  );
assert.throws(() => oxygenEquilibrium(Infinity));
let activityCount = 0;
for (const m of cycleModels) {
  const kind = m.presentation.slice(6);
  compileAssembly(defaultAssembly(m.ref));
  const recipe = premadeRecipe(`${kind}-cycle`);
  assert.deepEqual(compositionIssues(recipe.document), []);
  assert.ok(
    retrieveComponentBucket(`show me the ${kind} cycle`, {
      goal: `${kind} cycle`,
      requestedCapabilities: [],
      constraints: [],
      suggestedStructure: "single",
    }).some((c) => c.id === m.ref),
    "Short prompt retrieves model",
  );
  const r = loadRecipe(recipe).runtime;
  const before = structuredClone(r.getSnapshot().state.model);
  assert.equal(
    r.dispatch([
      { node: "model", command: cycleCommand(kind, "ADVANCE"), arguments: {} },
    ]).accepted,
    true,
  );
  assert.notDeepEqual(r.getSnapshot().state.model, before);
  const rejected = structuredClone(r.getSnapshot().state.model);
  assert.equal(
    r.dispatch([
      {
        node: "model",
        command: cycleCommand(kind, "ACTIVITY"),
        arguments: { value: { activity: "invalid", variant: 0 } },
      },
    ]).accepted,
    false,
  );
  assert.deepEqual(r.getSnapshot().state.model, rejected);
  // No invalid partial mutation when a batch has one valid and one invalid action.
  assert.equal(
    r.dispatch([
      { node: "model", command: cycleCommand(kind, "ADVANCE"), arguments: {} },
      {
        node: "model",
        command: cycleCommand(kind, "ACTIVITY"),
        arguments: { value: { activity: "invalid", variant: 0 } },
      },
    ]).accepted,
    false,
  );
  assert.deepEqual(r.getSnapshot().state.model, rejected);
  loadRecipe({ ...recipe, document: r.capture() });
  for (const a of activities[kind])
    for (let variant = 0; variant < (a.variants?.length ?? 1); variant++) {
      let s = initializeCycle(kind, a.id, variant),
        replay = structuredClone(s);
      for (let i = 0; i < 24; i++) {
        const previous = s,
          frozen = structuredClone(s);
        s = advanceCycle(s);
        assert.deepEqual(
          previous,
          frozen,
          "Advancing must not mutate prior accepted state",
        );
        audit(s);
        if (s.baseline) {
          audit(s.baseline);
          assert.equal(s.time, s.baseline.time);
        }
        measureModel(m, s);
        replay = advanceCycle(replay);
        assert.deepEqual(s, replay);
      }
      assert.throws(() =>
        m.apply(s, cycleCommand(kind, "ACTIVITY"), {
          activity: a.id,
          variant: 9,
        }),
      );
      activityCount++;
    }
  assert.deepEqual(m.initialize(m.defaults), before);
}
let o = initializeCycle("oxygen");
const initialDO = dissolvedOxygen(o);
o = advanceCycle(o);
assert.ok(dissolvedOxygen(o) < initialDO);
assert.equal(
  o.fluxes.some((f) => f.process === "Photosynthesis"),
  false,
);
o = advanceCycle(o);
assert.ok(o.fluxes.some((f) => f.process === "Photosynthesis"));
let high = initializeCycle("oxygen", "mixing");
high.stores.dissolved = 50;
high.initialTotal += 50;
high = advanceCycle(high);
assert.ok(
  high.fluxes.some(
    (f) => f.process === "Air-water exchange" && "dissolved" in f.from,
  ),
);
const temp = advanceCycle(initializeCycle("oxygen", "temperature"));
assert.ok(dissolvedOxygen(temp) < dissolvedOxygen(temp.baseline));
const zero = initializeCycle("oxygen");
zero.initialTotal -= zero.stores.dissolved * 2;
zero.stores.dissolved = 0;
const z = advanceCycle(zero);
audit(z);
assert.ok(z.stores.dissolved >= 0);
const convergence = initializeCycle("oxygen", "leaves");
const coarse = oxygenAdvance(convergence, convergence, true, 0.125),
  fine = oxygenAdvance(convergence, convergence, true, 0.0625);
assert.ok(Math.abs(dissolvedOxygen(coarse) - dissolvedOxygen(fine)) < 0.03);
const n = advanceCycle(initializeCycle("nitrogen", "partners"));
assert.ok(n.stores.nodules > 0);
assert.equal(n.baseline.stores.nodules, 0);
assert.ok(n.fluxes.some((f) => "nitrite" in f.to));
assert.equal(
  n.fluxes.some((f) => "nitrite" in f.from),
  false,
);
const soil = advanceCycle(initializeCycle("nitrogen", "soil"));
assert.ok(soil.stores.nitrite < soil.baseline.stores.nitrite);
assert.ok(
  soil.fluxes.find((f) => f.process === "Denitrification").amount >
    soil.baseline.fluxes.find((f) => f.process === "Denitrification").amount,
);
const rain = advanceCycle(initializeCycle("nitrogen", "rain", 2));
assert.equal(rain.inputs, 20);
assert.ok(rain.stores.leached > rain.baseline.stores.leached);
assert.ok(rain.stores.runoff > 0);
let c = initializeCycle("carbon", "fuel");
const fossil = c.stores.fossil,
  air = c.stores.atmosphere;
c = advanceCycle(c);
assert.equal(fossil - c.stores.fossil, 12);
assert.equal(c.stores.atmosphere - air, 12);
let cleared = advanceCycle(initializeCycle("carbon", "clearing", 1));
assert.equal(cleared.time, 0);
assert.equal(cleared.stores.plants, 16);
assert.equal(cleared.stores.harvested, 16);
assert.ok(cleared.stores.atmosphere > 250);
const wood = cleared.stores.plants;
cleared = advanceCycle(cleared);
assert.ok(cleared.stores.plants > wood && cleared.stores.plants < 80);
let bio = cycleModels[2].initialize(cycleModels[2].defaults);
bio = cycleModels[2].apply(bio, cycleCommand("carbon", "ADVANCE"));
const geo = cycleModels[2].apply(bio, cycleCommand("carbon", "ACTIVITY"), {
  activity: "geology",
  variant: 0,
});
assert.deepEqual(
  cycleModels[2].apply(geo, cycleCommand("carbon", "ACTIVITY"), {
    activity: "route",
    variant: 0,
  }),
  bio,
);
let atom = initializeCycle("oxygen", "atoms");
atom = advanceCycle(atom);
assert.equal(atom.trace, "dissolved");
atom = advanceCycle(atom);
assert.equal(atom.trace, "water");
let long = initializeCycle("carbon", "geology");
long = advanceCycle(long);
assert.equal(long.trace, "buried");
long = advanceCycle(long);
assert.equal(long.trace, "fossil");
long = advanceCycle(long);
assert.equal(long.trace, "fossil");
console.log(
  `Three cycle models and ${activityCount} activity/scenario combinations: budgets, independent fixtures, determinism, atomic rejection, short-prompt retrieval and recipe round trips passed.`,
);
const { arrangeDocument } = load(
  "src/simulations/runtime/authoring/arrangement.ts",
);
for (const kind of ["oxygen", "nitrogen", "carbon"]) {
  const recipe = premadeRecipe(`${kind}-cycle`),
    doc = recipe.document;
  const arranged = arrangeDocument(doc, {
    template: "scene-with-sidebar",
    main: ["scene"],
    controls: ["action", "activity"],
    results: ["caption"],
    narrowOrder: ["scene", "caption", "action", "activity"],
    preserveLocked: true,
  });
  assert.deepEqual(
    arranged.nodes,
    doc.nodes,
    "Arrangement changed authored science or question",
  );
  assert.deepEqual(
    arranged.connections,
    doc.connections,
    "Arrangement changed wiring",
  );
  const scene = arranged.presentation.items.find(
    (i) => i.layoutId === "layout/scene",
  );
  assert.equal(scene.rect.width, 1080);
  const action = arranged.presentation.items.find(
    (i) => i.layoutId === "layout/action",
  );
  assert.ok(
    action.rect.y >= scene.rect.y + scene.rect.height,
    "Primary action competes beside scene",
  );
  const locked = structuredClone(doc);
  locked.presentation.items[0].locked = true;
  locked.presentation.items[0].rect.x = 24;
  assert.deepEqual(
    arrangeDocument(locked, {
      template: "vertical",
      main: ["scene"],
      controls: ["action", "activity"],
      results: ["caption"],
      narrowOrder: ["scene", "caption", "action", "activity"],
      preserveLocked: true,
    }).presentation.items[0].rect,
    locked.presentation.items[0].rect,
  );
}
console.log(
  "Scene-first arrangement preserves authored values, wiring and locked items.",
);

// Changing a variant through the geology chooser is a fresh investigation;
// returning to the exact biological activity restores its checkpoint.
const cm = cycleModels[2];
const land = cm.initialize({ activity: "clearing", variant: 0, seed: 17 });
const displaced = cm.apply(land, cycleCommand("carbon", "ADVANCE"));
const underground = cm.apply(displaced, cycleCommand("carbon", "ACTIVITY"), {
  activity: "geology",
  variant: 0,
});
const alternate = cm.apply(underground, cycleCommand("carbon", "ACTIVITY"), {
  activity: "clearing",
  variant: 1,
});
assert.equal(alternate.variant, 1);
assert.equal(alternate.injected, false);
const restartedGeo = cm.apply(underground, cycleCommand("carbon", "RESTART"));
assert.deepEqual(restartedGeo.biological, displaced);
assert.deepEqual(
  cm.apply(restartedGeo, cycleCommand("carbon", "ACTIVITY"), {
    activity: "clearing",
    variant: 0,
  }),
  displaced,
);
const { primaryLabel } = load(
  "src/simulations/domains/biogeochemistry/index.ts",
);
let depleted = initializeCycle("carbon", "fuel");
for (let i = 0; i < 10; i++) depleted = advanceCycle(depleted);
assert.equal(depleted.stores.fossil, 0);
assert.equal(primaryLabel(depleted), "Restart this activity");
console.log(
  "Carbon timeline variant changes, checkpoint retention after restart, and depleted-fuel recovery passed.",
);
