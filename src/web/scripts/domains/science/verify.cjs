const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const {
  scienceModels,
  scienceSpecs,
  scienceAdvance,
  scienceCommand,
  scienceObservation,
} = load("src/simulations/domains/science/index.ts");
const { waterTotal } = load(
  "src/simulations/components/systems/science/environment.ts",
);
const { measureModel, compileAssembly, defaultAssembly } = load(
  "src/simulations/runtime/assembly.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
let assertions = 0;
const ok = (v, message) => {
  assert.ok(v, message);
  assertions++;
};
for (const [i, m] of scienceModels.entries()) {
  const spec = scienceSpecs[i];
  compileAssembly(defaultAssembly(m.ref));
  let s = m.initialize(m.defaults),
    copy = structuredClone(s);
  const r = loadRecipe(premadeRecipe(spec.slug));
  ok(
    r.runtime.getSnapshot().state.model.kind === spec.kind,
    "Ordinary recipe loads provider",
  );
  const run = (op, v) => (s = m.apply(s, scienceCommand(spec.kind, op), v));
  if (spec.kind === "immune") run("EXPOSE");
  if (spec.kind === "invasive") run("INTRODUCE");
  const starting = structuredClone(s);
  for (let tick = 0; tick < spec.limit; tick++) {
    const before = structuredClone(s);
    s = scienceAdvance(s);
    assert.deepEqual(before, JSON.parse(JSON.stringify(before)));
    measureModel(m, s);
    if (s.water) {
      const d = s.water;
      ok(
        Math.abs(230 + d.input - d.output - waterTotal(d)) < 1e-8,
        "Water budget conserved at each step",
      );
      ok(
        [d.atmosphere, d.surface, d.soil, d.ground, d.river].every(
          (x) => x >= 0,
        ),
        "Nonnegative water stores",
      );
    }
    if (s.volcano)
      ok(
        Math.abs(
          100 +
            s.volcano.supplied -
            s.volcano.reservoir -
            s.volcano.lava -
            s.volcano.ash,
        ) < 1e-8,
        "Magma supply/outflow conserved",
      );
    if (s.invasive)
      ok(
        s.invasive.cover.every((v, j) => v === 0 || s.invasive.sources[j] >= 0),
        "Established invasion has propagule provenance",
      );
  }
  let replay = structuredClone(starting);
  for (let tick = 0; tick < spec.limit; tick++) replay = scienceAdvance(replay);
  assert.deepEqual(replay, s);
  assert.deepEqual(m.initialize(m.defaults), copy);
  for (const f of spec.settings) {
    const prev = structuredClone(s);
    assert.throws(() =>
      m.apply(s, scienceCommand(spec.kind, "SET"), {
        key: f.key,
        value: f.max + 1,
      }),
    );
    assert.deepEqual(s, prev);
  }
  assert.throws(() => m.apply(s, scienceCommand(spec.kind, "SELECT"), 29));
  if (spec.kind === "cell") {
    ok(
      scienceObservation(s).metrics[0].includes("Matching"),
      "Normal daughter sets match",
    );
    run("SET", { key: "error", value: 1 });
    for (let j = 0; j < 7; j++) s = scienceAdvance(s);
    ok(
      scienceObservation(s).metrics[0].includes("Unequal"),
      "Error daughter allocation distinguished",
    );
  }
  if (spec.kind === "immune") {
    ok(s.immune.memory.includes(0), "Matching memory formed");
    ok(s.immune.burden === 0, "First exposure cleared");
    const firstClearance = s.immune.clearance;
    run("EXPOSE");
    for (let j = 0; j < 16; j++) s = scienceAdvance(s);
    ok(
      s.immune.clearance < firstClearance,
      "Repeat matching exposure clears earlier",
    );
    const memory = structuredClone(s.immune.memory);
    run("SET", { key: "antigen", value: 1 });
    ok(
      !s.immune.memory.includes(1),
      "Changed antigen not recognized automatically",
    );
    assert.deepEqual(s.immune.memory, memory);
  }
  if (spec.kind === "genome") {
    for (const c of s.offspring) {
      ok(c.alleles.length === 6, "Diploid loci");
      ok(
        c.sources.every((source) => /^A[12]|^B[12]/.test(source)),
        "Allele provenance",
      );
    }
    const kids = structuredClone(s.offspring);
    run("SET", { key: "environment", value: 0 });
    assert.deepEqual(s.offspring, kids);
    run("SET", { key: "parentA", value: 0 });
    assert.deepEqual(s.offspring, kids);
  }
  if (spec.kind === "pollination") {
    ok(
      s.pollen.transfers.reduce((a, b) => a + b, 0) > 0,
      "Default route includes compatible transfer",
    );
    ok(s.pollen.fruits.some(Boolean), "Delayed fruit development occurs");
  }
  if (spec.kind === "earth") {
    ok(
      scienceObservation(s).objects[1].state.includes("solid"),
      "Mantle solid",
    );
    run("SET", { key: "classification", value: 1 });
    ok(
      scienceObservation(s).objects[0].state.includes("uppermost mantle"),
      "Lithosphere spans crust/mantle",
    );
  }
  if (spec.kind === "plates")
    for (let b = 0; b < 5; b++) {
      run("SET", { key: "boundary", value: b });
      ok(s.time === 0, "Preset restarts geometry");
      for (let j = 0; j < 4; j++) s = scienceAdvance(s);
      const text = scienceObservation(s).metrics.join(" ");
      ok(
        b < 2 ? text.includes("slab") : !text.includes("→ slab"),
        "Preset appropriate features",
      );
    }
  console.log(
    spec.slug +
      " invariants, seeded replay, invalid-action isolation and recipe integration passed",
  );
}
// Causal comparison with identical seeds and horizons.
for (const [kind, key, low, high, metric] of [
  ["water", "paving", 0, 90, (s) => s.water.runoff],
  [
    "pollination",
    "overlap",
    0,
    100,
    (s) => s.pollen.transfers.reduce((a, b) => a + b, 0),
  ],
]) {
  const m = scienceModels.find((m) => m.presentation === `science-${kind}`);
  let a = m.initialize(m.defaults),
    b = m.initialize(m.defaults);
  a = m.apply(a, scienceCommand(kind, "SET"), { key, value: low });
  b = m.apply(b, scienceCommand(kind, "SET"), { key, value: high });
  for (let j = 0; j < 8; j++) {
    a = scienceAdvance(a);
    b = scienceAdvance(b);
  }
  ok(metric(b) > metric(a), kind + " meaningful causal contrast");
}
console.log(`${assertions} scientific assertions passed across nine models.`);

// Catalog retrieval must offer the matching provider for ordinary learner vocabulary.
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
for (const c of require("./cases.cjs").cases)
  ok(
    retrieveComponentBucket(c.prompt).some((x) => x.id === c.definition),
    c.id + " discoverable without exact title",
  );
const provider = (kind) =>
  scienceModels.find((m) => m.presentation === `science-${kind}`);
const apply = (kind, s, op, value) =>
  provider(kind).apply(s, scienceCommand(kind, op), value);
const initial = (kind) => provider(kind).initialize(provider(kind).defaults);
const advance = (s, n) => {
  for (let i = 0; i < n; i++) s = scienceAdvance(s);
  return s;
};
for (const kind of [
  "cell",
  "immune",
  "genome",
  "pollination",
  "invasive",
  "earth",
  "plates",
  "volcano",
  "water",
]) {
  let s = initial(kind);
  if (kind === "immune") s = apply(kind, s, "EXPOSE");
  if (kind === "invasive") s = apply(kind, s, "INTRODUCE");
  s = advance(s, 3);
  const before = structuredClone(s),
    matched = apply(kind, s, "BASELINE");
  assert.deepEqual(matched.baseline.snapshot, {
    ...before,
    baseline: undefined,
  });
  assert.deepEqual(matched.settings, before.settings);
  assert.equal(matched.seed, before.seed);
  assert.equal(matched.time, 0);
  ok(
    !matched.baseline.snapshot.baseline,
    kind + " retains an isolated bounded baseline",
  );
}
let immune = apply("immune", initial("immune"), "EXPOSE");
assert.throws(() => apply("immune", immune, "SET_ANTIGEN", 1));
immune = advance(immune, 16);
immune = apply("immune", immune, "SET_ANTIGEN", 1);
immune = apply("immune", immune, "EXPOSE");
ok(!immune.immune.challengeMemory, "Unmatched repeat has no memory bonus");
const first = immune.immune.firstClearance;
immune = advance(immune, 16);
ok(
  immune.immune.clearance === first,
  "Unmatched antigen follows the first-response timing",
);
let habitat = apply("invasive", initial("invasive"), "SELECT", 17);
habitat = apply("invasive", habitat, "INTRODUCE");
habitat = apply("invasive", habitat, "SET_REPEAT", 1);
habitat = advance(habitat, 1);
ok(
  habitat.invasive.origin === 17 && habitat.invasive.sources[17] === 17,
  "Repeated introduction preserves selected source",
);
let vacant = apply("invasive", initial("invasive"), "SET_REPEAT", 1);
vacant = advance(vacant, 4);
ok(
  vacant.invasive.cover.every((v) => v === 0),
  "Repeat mode cannot invent a first source",
);
let quick = apply("invasive", habitat, "SET_RESIDUAL", 1),
  thorough = apply("invasive", habitat, "SET_RESIDUAL", 0);
quick = apply("invasive", quick, "REMOVE");
thorough = apply("invasive", thorough, "REMOVE");
ok(
  quick.invasive.propagules[17] > 0 && thorough.invasive.propagules[17] === 0,
  "Removal policy distinguishes surviving seeds",
);
let dry = initial("water");
dry = apply("water", dry, "SET_RAIN", 0);
dry = apply("water", dry, "SET_SUNLIGHT", 0);
dry = advance(dry, 3);
ok(
  dry.water.tracer === 0,
  "Tracer stays in atmosphere when condensation is absent",
);
const { acceptedCommandArguments } = load(
  "src/simulations/components/controls/commandPresentation.ts",
);
for (const spec of scienceSpecs) {
  const s = initial(spec.kind);
  for (const f of spec.settings)
    assert.deepEqual(
      acceptedCommandArguments(
        scienceCommand(spec.kind, `SET_${f.key.toUpperCase()}`),
        s,
      ),
      { value: f.initial },
    );
}
console.log(
  "Science discovery, exact accepted control values, memory specificity, retained baselines, surviving seeds and active tracer paths passed.",
);

console.log(
  `${assertions} counted science and catalog assertions passed, plus recipe/state round trips and exact-value adapter checks.`,
);
