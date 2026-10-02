const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const runtime = load("src/simulations/runtime/session.ts");
const { parsePlan, validateContext } = load("src/lib/apertus/schema.ts");
const { useProjectileStore } = load(
  "src/simulations/runtime/projectileSession.ts",
);
const { useMathStore } = load("src/simulations/runtime/mathSession.ts");
const { useBridgeStore } = load("src/simulations/runtime/bridgeSession.ts");
const { useTownStore } = load("src/simulations/runtime/townSession.ts");
const { useElementaryStore } = load(
  "src/simulations/runtime/elementarySession.ts",
);
const { resolveRecipe, parseRecipe } = load(
  "src/simulations/runtime/resolver.ts",
);
const { definitions } = load("src/simulations/runtime/catalog.ts");
const { stageComposition } = load("src/simulations/runtime/validation.ts");
const { selectCapabilities } = load("src/lib/apertus/catalogSelection.ts");
const { MeasurementSamplingSystem } = load(
  "src/simulations/components/systems/MeasurementSamplingSystem.ts",
);
const create = (ref, parameters = {}, extra = {}) => ({
  schemaVersion: 1,
  operation: "create",
  composition: { ref: `compositions/${ref}`, version: 1 },
  parameters,
  message: "Configure experiment",
  ...extra,
});
const run = (plan) => {
  const result = runtime.executePlan(plan);
  assert.equal(result.accepted, true, result.error);
  return result;
};
const fresh = (plan) => {
  runtime.disposeSession();
  return run(plan);
};
const edit = (commands) => {
  const context = runtime.getExperimentContext();
  return {
    schemaVersion: 1,
    operation: "edit",
    sessionId: context.sessionId,
    expectedRevision: context.revision,
    commands,
    message: "Edit experiment",
  };
};
fresh(
  create("AngleComparisonExperiment", {
    angles: [30, 60],
    speed: 20,
    gravityPreset: "Moon",
  }),
);
const initial = useProjectileStore.getState();
assert.deepEqual(
  initial.instances.map((i) => [i.launch.angle, i.launch.velocity, i.gravity]),
  [
    [30, 20, 1.62],
    [60, 20, 1.62],
  ],
);
assert.equal(initial.instances[1].id, "projectile/secondary");
const initialRecipe = runtime.saveRecipe();
const context = runtime.getExperimentContext();
validateContext(context);
useProjectileStore.getState().step(0.5);
assert.equal(
  runtime.getExperimentContext().revision,
  context.revision,
  "Ticks do not change configuration revision",
);
const primaryBefore = useProjectileStore.getState().instances[0];
run(
  edit([
    {
      target: "projectile/secondary",
      action: "SET_VELOCITY",
      arguments: { value: 25 },
    },
  ]),
);
assert.deepEqual(
  useProjectileStore.getState().instances[0],
  primaryBefore,
  "Targeted relaunch preserves primary motion and configuration",
);
assert.equal(useProjectileStore.getState().instances[1].launch.velocity, 25);
const stale = {
  schemaVersion: 1,
  operation: "edit",
  sessionId: context.sessionId,
  expectedRevision: context.revision,
  commands: [
    {
      target: "projectile/secondary",
      action: "SET_ANGLE",
      arguments: { value: 75 },
    },
  ],
  message: "Stale edit",
};
assert.equal(runtime.executePlan(stale).accepted, false);
const before = useProjectileStore.getState();
assert.equal(
  runtime.dispatchBatch("projectile", [
    { type: "SET_ANGLE", value: 40 },
    { type: "SET_VELOCITY", value: 99 },
  ]).accepted,
  false,
);
assert.equal(
  useProjectileStore.getState(),
  before,
  "Invalid batch never commits intermediate changes",
);
const outputs = structuredClone(
  before.instances.map((i) => ({
    metrics: i.metrics,
    motion: i.motion,
    transform: i.transform,
  })),
);
run(
  edit([
    {
      target: "projectile/secondary",
      action: "SET_TRAJECTORY_VISIBLE",
      arguments: { value: false },
    },
  ]),
);
assert.deepEqual(
  useProjectileStore.getState().instances.map((i) => ({
    metrics: i.metrics,
    motion: i.motion,
    transform: i.transform,
  })),
  outputs,
);
assert.equal(
  runtime.dispatchCommand("projectile", { type: "RESET" }).accepted,
  true,
);
assert.deepEqual(useProjectileStore.getState().instances, initial.initial);
assert.equal(
  runtime.saveRecipe(),
  initialRecipe,
  "Saving is the initial recipe, separate from later edits",
);
const replacementBefore = useProjectileStore.getState(),
  sessionBefore = runtime.getExperimentContext();
assert.equal(
  runtime.executePlan(
    create("AngleComparisonExperiment", { angles: [20, 100] }),
  ).accepted,
  false,
);
assert.equal(useProjectileStore.getState(), replacementBefore);
assert.deepEqual(runtime.getExperimentContext(), sessionBefore);
runtime.loadRecipe(initialRecipe);
assert.deepEqual(useProjectileStore.getState().instances, initial.initial);
assert.notEqual(runtime.getExperimentContext().sessionId, context.sessionId);
const assembly = create(
  "ProjectileExperiment",
  {},
  {
    instances: [20, 40, 60].map((angle, index) => ({
      id: `projectile/custom-${index}`,
      prefab: { ref: "prefabs/Projectile", version: 1 },
      parameters: { angle, speed: 20 + index, gravityPreset: "Mars" },
    })),
    views: [
      { ref: "views/SVGWorldView", version: 1, binding: "world" },
      { ref: "views/ResultsTableView", version: 1, binding: "results" },
      { ref: "views/TimeSeriesView", version: 1, binding: "time-series" },
    ],
  },
);
fresh(assembly);
assert.equal(useProjectileStore.getState().instances.length, 3);
run(
  edit([
    {
      target: "projectile/custom-2",
      action: "SET_VELOCITY",
      arguments: { value: 30 },
    },
  ]),
);
assert.deepEqual(
  useProjectileStore.getState().instances.map((i) => i.launch.velocity),
  [20, 21, 30],
);
runtime.loadRecipe(runtime.saveRecipe());
assert.deepEqual(
  useProjectileStore.getState().instances.map((i) => i.launch.velocity),
  [20, 21, 22],
);
for (const malformed of [
  { ...assembly, instances: [assembly.instances[0], assembly.instances[0]] },
  {
    ...assembly,
    instances: [
      {
        ...assembly.instances[0],
        prefab: { ref: "prefabs/SpringMass", version: 1 },
      },
    ],
  },
  {
    ...assembly,
    views: [{ ref: "views/ThreeWorldView", version: 1, binding: "world" }],
  },
  {
    ...assembly,
    views: [{ ref: "views/TimeSeriesView", version: 1, binding: "world" }],
  },
  {
    ...assembly,
    instances: [
      {
        ...assembly.instances[0],
        parameters: {
          ...assembly.instances[0].parameters,
          nestedPrefab: "recursive",
        },
      },
    ],
  },
])
  assert.throws(() => parsePlan(malformed));
assert.throws(() =>
  parseRecipe(
    JSON.stringify({ ...JSON.parse(initialRecipe), instances: null }),
  ),
);
assert.throws(() =>
  parseRecipe(JSON.stringify({ ...JSON.parse(initialRecipe), views: false })),
);
assert.throws(() =>
  parseRecipe(
    JSON.stringify({ ...JSON.parse(initialRecipe), callbacks: "code" }),
  ),
);
const conflict = structuredClone(resolveRecipe(JSON.parse(initialRecipe)));
const sampler = definitions.get("systems/MeasurementSamplingSystem");
const writes = sampler.writes;
sampler.writes = ["projectile.position"];
assert.throws(() => stageComposition(conflict), /conflicting writers/);
sampler.writes = writes;
assert.equal(
  runtime.executePlan({
    schemaVersion: 1,
    operation: "unsupported",
    message: "Spring motion is unavailable",
  }).accepted,
  true,
);
const currentContext = runtime.getExperimentContext();
assert.deepEqual(runtime.getExperimentContext(), currentContext);
for (const [ref, params, verify] of [
  [
    "FractionBuilderExperiment",
    {
      bars: [
        { n: 3, d: 4 },
        { n: 0, d: 4 },
      ],
    },
    () =>
      assert.deepEqual(useMathStore.getState().board.bars[0].value, {
        n: 3,
        d: 4,
      }),
  ],
  [
    "EqualGroupsExperiment",
    {
      task: { mode: "share", groups: 3, perGroup: 0, total: 14 },
      looping: false,
    },
    () => {
      const b = useMathStore.getState().board;
      assert.equal(b.quotient, 4);
      assert.equal(b.remainder, 2);
      assert.equal(b.total, 14);
    },
  ],
  [
    "CountingExperiment",
    { task: { mode: "count", target: 8 }, looping: false },
    () => assert.equal(useMathStore.getState().board.target, 8),
  ],
  [
    "ArithmeticExperiment",
    { task: { operation: "subtract", a: 9, b: 4 }, looping: false },
    () => assert.equal(useMathStore.getState().board.result, 5),
  ],
  [
    "FractionNumberLineExperiment",
    { task: { mode: "place", a: { n: 5, d: 4 }, b: { n: 0, d: 1 } } },
    () => assert.deepEqual(useMathStore.getState().board.a, { n: 5, d: 4 }),
  ],
  [
    "BridgeExperiment",
    { loadPos: 0.2, loadTons: 22, spanScale: 2, dense: true },
    () => {
      const s = useBridgeStore.getState();
      assert.equal(s.loadTons, 22);
      assert.equal(s.truss.load.magnitude, 22);
      assert.equal(s.truss.panels, 8);
    },
  ],
  [
    "TownExperiment",
    { time: 20, speed: 2, playing: false },
    () => {
      assert.equal(useTownStore.getState().time, 20);
      assert.equal(useTownStore.getState().playing, false);
    },
  ],
  [
    "RatioExperiment",
    { numerator: 3, denominator: 4 },
    () => assert.equal(useElementaryStore.getState().outputs.percentage, 75),
  ],
  [
    "AreaPerimeterExperiment",
    { width: 6, height: 4 },
    () => {
      assert.equal(useElementaryStore.getState().outputs.area, 24);
      assert.equal(useElementaryStore.getState().outputs.perimeter, 20);
    },
  ],
  [
    "CoordinateExperiment",
    { x: -3, y: 4 },
    () => assert.equal(useElementaryStore.getState().parameters.x, -3),
  ],
  [
    "ProbabilityExperiment",
    { preset: "die", seed: 42, trials: 1000 },
    () => {
      const f = useElementaryStore.getState().outputs.frequencies;
      assert.equal(
        f.reduce((n, r) => n + r.observed, 0),
        1000,
      );
      assert.ok(f.every((r) => r.expected === 1000 / 6));
    },
  ],
]) {
  fresh(create(ref, params));
  verify();
  validateContext(runtime.getExperimentContext());
  const saved = runtime.saveRecipe();
  assert.equal(
    runtime.dispatchCommand(runtime.getActiveDefinition().demo, {
      type: "RESET",
    }).accepted,
    true,
  );
  verify();
  runtime.loadRecipe(saved);
  verify();
}
fresh(
  create("FractionBuilderExperiment", {
    bars: [
      { n: 3, d: 4 },
      { n: 0, d: 4 },
    ],
  }),
);
const mathBefore = useMathStore.getState(),
  revBefore = runtime.getExperimentContext().revision;
assert.equal(
  runtime.dispatchBatch("fraction-builder", [
    { type: "SET_BAR_FRACTION", value: { bar: 0, fraction: { n: 1, d: 2 } } },
    { type: "SUBDIVIDE_FRACTION", value: { bar: 0, factor: 12 } },
  ]).accepted,
  false,
);
assert.equal(useMathStore.getState(), mathBefore);
assert.equal(runtime.getExperimentContext().revision, revBefore);
for (const params of [
  { width: 0, height: 2 },
  { width: 3, height: Infinity },
])
  assert.throws(() => parsePlan(create("AreaPerimeterExperiment", params)));
assert.throws(() =>
  parsePlan(create("RatioExperiment", { numerator: 1, denominator: 0 })),
);
assert.throws(() =>
  parsePlan(
    create("ArithmeticExperiment", {
      task: { operation: "subtract", a: 2, b: 9 },
    }),
  ),
);
fresh(create("AngleComparisonExperiment", { angles: [30, 60] }));
const i = useProjectileStore.getState().instances[0];
const probe = { target: i.id, observable: "y", interval: 0.1, maxSamples: 3 };
assert.equal(
  MeasurementSamplingSystem(probe, i.launch, i.gravity, 20).rows.length,
  3,
);
assert.deepEqual(
  MeasurementSamplingSystem(probe, i.launch, i.gravity, 0).rows,
  [{ time: 0, value: 0 }],
);
assert.throws(() =>
  MeasurementSamplingSystem(
    { ...probe, observable: "private" },
    i.launch,
    i.gravity,
    1,
  ),
);
assert.ok(
  selectCapabilities("show 3/4", null).some(
    (d) => d.ref === "compositions/FractionBuilderExperiment",
  ),
);
assert.ok(
  selectCapabilities("share 14 between 3 groups", null).some(
    (d) => d.ref === "systems/EqualGroupingSystem",
  ),
);
assert.ok(
  selectCapabilities("compare launches on the Moon", null).some(
    (d) => d.ref === "traits/LaunchSettings",
  ),
);
assert.equal(selectCapabilities("run a chemical reaction", null).length, 0);
const React = require("react"),
  { renderToStaticMarkup } = require("react-dom/server");
for (const [ref, params, view] of [
  [
    "AngleComparisonExperiment",
    { angles: [30, 60], gravityPreset: "Moon" },
    "ProjectileObservationViews",
  ],
  [
    "RatioExperiment",
    { numerator: 3, denominator: 4 },
    "ElementaryExperimentView",
  ],
  [
    "ProbabilityExperiment",
    { preset: "die", seed: 42, trials: 1000 },
    "ElementaryExperimentView",
  ],
]) {
  fresh(create(ref, params));
  const Component = load(`src/simulations/components/views/${view}.tsx`)[view];
  const html = renderToStaticMarkup(React.createElement(Component));
  assert.ok(!html.includes("NaN"));
  assert.ok(html.includes("<table"));
  if (ref === "RatioExperiment") assert.ok(html.includes("75"));
}
runtime.disposeSession();
console.log(
  "Integration: independent instances, atomic rollback, stale plans, resets, bindings, recipes, all experiments, datasets and rendering passed.",
);

const { premadeExperiments } = load(
  "src/app/experiments/_lib/premadeExperiments.ts",
);
const { templateNames } = load("src/simulations/runtime/capabilities.ts");
for (const [demo, preset] of Object.entries(premadeExperiments)) {
  const result = fresh(create(templateNames[demo], preset.parameters));
  assert.equal(result.demo, demo);
}
runtime.disposeSession();
console.log(
  "All twelve premade experiments load with valid initial configurations.",
);
