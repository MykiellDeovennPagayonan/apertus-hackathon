const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const runtime = load("src/simulations/runtime/session.ts");
const { useGasStore } = load("src/simulations/runtime/gasSession.ts");
const { useMathStore } = load("src/simulations/runtime/mathSession.ts");
const { useProjectileStore } = load(
  "src/simulations/runtime/projectileSession.ts",
);
const { IdealGasSystem } = load(
  "src/simulations/components/systems/IdealGasSystem.ts",
);
const { gasParticles } = load(
  "src/simulations/components/systems/GasParticleIllustrationSystem.ts",
);
const { learningPolicies } = load(
  "src/simulations/components/resources/LearningPolicies.ts",
);
const { resolveRecipe } = load("src/simulations/runtime/resolver.ts");
const { stageComposition } = load("src/simulations/runtime/validation.ts");
const { planCreation, parseTeachingIntent, parseConfiguration } = load(
  "src/lib/planner/creation.ts",
);
const { parsePlan } = load("src/lib/planner/schema.ts");
const { planPrompt } = load("src/lib/planner/index.ts");
const create = (name, parameters) => ({
  schemaVersion: 1,
  operation: "create",
  composition: { ref: `compositions/${name}`, version: 1 },
  parameters,
  message: "Create an experiment.",
});
const apply = (demo, type, value, target) => {
  const result = runtime.dispatchCommand(demo, {
    type,
    ...(value === undefined ? {} : { value }),
    ...(target ? { target } : {}),
  });
  assert.ok(result.accepted, result.error);
};
const near = (actual, expected, tolerance = 1e-6) =>
  assert.ok(
    Math.abs(actual - expected) <= tolerance * Math.abs(expected),
    `${actual} != ${expected}`,
  );
// Independent numeric constants calculated in SI, never compared to another runtime helper.
assert.ok(runtime.executePlan(create("GasPressureExperiment", {})).accepted);
near(useGasStore.getState().metrics.pressureKPa, 2.4943387854);
apply("gas", "SET_VOLUME", 0.5);
near(useGasStore.getState().metrics.pressureKPa, 4.9886775708);
assert.equal(useGasStore.getState().inputs.temperature, 300);
assert.equal(useGasStore.getState().inputs.amount, 1);
assert.equal(runtime.getExperimentContext().recentChange.before.volume, 1);
apply("gas", "RESET");
apply("gas", "SET_TEMPERATURE", 350);
near(useGasStore.getState().metrics.pressureKPa, 2.9100619163);
apply("gas", "RESET");
apply("gas", "SET_AMOUNT", 1.5);
near(useGasStore.getState().metrics.pressureKPa, 3.7415081781);
useGasStore.getState().step(0.04);
apply("gas", "SET_PLAYING", false);
const paused = structuredClone(useGasStore.getState().particles);
useGasStore.getState().step(0.05);
assert.deepEqual(useGasStore.getState().particles, paused);
apply("gas", "SET_VOLUME", 0.5);
near(useGasStore.getState().metrics.pressureKPa, 7.4830163562);
assert.deepEqual(useGasStore.getState().particles, paused);
apply("gas", "RESET");
assert.deepEqual(useGasStore.getState().inputs, learningPolicies.gas);
assert.deepEqual(useGasStore.getState().particles, gasParticles(1));
assert.equal(runtime.getExperimentContext().recentChange, undefined);
apply("gas", "SET_VOLUME", 0.25);
apply("gas", "SET_TEMPERATURE", 600);
for (let i = 0; i < 300; i++) useGasStore.getState().step(0.05);
assert.ok(
  useGasStore
    .getState()
    .particles.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1),
);
const before = runtime.getDiagnosticSnapshot();
assert.equal(
  runtime.dispatchBatch("gas", [
    { type: "SET_AMOUNT", value: 2 },
    { type: "SET_VOLUME", value: 0 },
  ]).accepted,
  false,
);
assert.deepEqual(runtime.getDiagnosticSnapshot(), before);
for (const [key, value] of [
  ["volume", 0],
  ["temperature", 99],
  ["amount", Infinity],
  ["playing", "true"],
])
  assert.throws(() =>
    IdealGasSystem({ ...learningPolicies.gas, [key]: value }),
  );
const staged = resolveRecipe(create("GasPressureExperiment", {}));
for (const missing of ["GasMetrics", "GasState"]) {
  const broken = structuredClone(staged);
  broken.components.traits = broken.components.traits.filter(
    (t) => t !== missing,
  );
  assert.throws(() => stageComposition(broken));
}
const bad = structuredClone(staged);
bad.instances.push({ ...bad.instances[0] });
assert.throws(() => stageComposition(bad));
// Generated reset configuration differs from baseline and must survive multiple edits.
assert.ok(
  runtime.executePlan(
    create("GasPressureExperiment", { temperature: 400, volume: 0.75 }),
  ).accepted,
);
apply("gas", "SET_VOLUME", 1.5);
apply("gas", "RESET");
assert.equal(useGasStore.getState().inputs.volume, 0.75);
assert.equal(useGasStore.getState().inputs.temperature, 400);
const stale = runtime.getExperimentContext();
apply("gas", "SET_VOLUME", 1);
assert.equal(
  runtime.executePlan({
    schemaVersion: 1,
    operation: "edit",
    sessionId: stale.sessionId,
    expectedRevision: stale.revision,
    commands: [
      { target: "session", action: "SET_AMOUNT", arguments: { value: 4 } },
    ],
    message: "Stale",
  }).accepted,
  false,
);
// Sharing conservation at every animation step, remainder, UI-equivalent input and reset.
runtime.disposeSession();
assert.ok(
  runtime.executePlan(
    create("EqualGroupsExperiment", learningPolicies.division),
  ).accepted,
);
function share(total, expected, remainder) {
  apply("equal-groups", "SET_PLAYING", true);
  for (let i = 0; i < 100; i++) {
    const b = useMathStore.getState().board;
    assert.equal(b.tokens.length, total);
    assert.equal(
      b.tokens.filter((t) => t.zone >= 0).length +
        b.tokens.filter((t) => t.zone < 0).length,
      total,
    );
    if (!b.sequence.playing) break;
    useMathStore.getState().step(0.8);
  }
  const b = useMathStore.getState().board;
  assert.deepEqual(
    b.baskets.map((_, i) => b.tokens.filter((t) => t.zone === i).length),
    expected,
  );
  assert.equal(b.tokens.filter((t) => t.zone < 0).length, remainder);
}
share(12, [4, 4, 4], 0);
apply("equal-groups", "SET_GROUPING_TASK", learningPolicies.leftovers);
share(14, [4, 4, 4], 2);
apply("equal-groups", "REPLAY");
share(14, [4, 4, 4], 2);
apply("equal-groups", "SET_GROUPING_TASK", {
  ...learningPolicies.leftovers,
  total: 15,
});
share(15, [5, 5, 5], 0);
apply("equal-groups", "RESET");
assert.equal(useMathStore.getState().board.total, 12);
assert.equal(useMathStore.getState().board.groups, 3);
// Independent ballistic oracle and stable per-instance targeting.
runtime.disposeSession();
assert.ok(
  runtime.executePlan(create("ProjectileExperiment", learningPolicies.ball))
    .accepted,
);
function ballistic() {
  for (const i of useProjectileStore.getState().instances) {
    const rad = (i.launch.angle * Math.PI) / 180,
      v = i.launch.velocity,
      g = i.gravity;
    assert.ok(
      Math.abs(i.metrics.range - (v * v * Math.sin(2 * rad)) / g) < 0.001,
    );
    assert.ok(
      Math.abs(i.metrics.maxHeight - (v * v * Math.sin(rad) ** 2) / (2 * g)) <
        0.001,
    );
    assert.ok(
      Math.abs(i.metrics.duration - (2 * v * Math.sin(rad)) / g) < 0.001,
    );
  }
}
ballistic();
apply("projectile", "SET_ANGLE", 30);
ballistic();
apply("projectile", "COMPARE_ANGLE", 60);
ballistic();
apply("projectile", "SET_ANGLE", 45, "projectile/secondary");
ballistic();
assert.equal(useProjectileStore.getState().instances[0].launch.angle, 30);
assert.ok(
  useProjectileStore
    .getState()
    .instances.every((i) => i.launch.velocity === 20),
);
apply("projectile", "RESET");
assert.equal(useProjectileStore.getState().instances.length, 1);
assert.equal(useProjectileStore.getState().angle, 45);
const explainBefore = runtime.getDiagnosticSnapshot();
assert.ok(
  runtime.executePlan({
    schemaVersion: 1,
    operation: "explain",
    message: "Explanation.",
  }).accepted,
);
assert.deepEqual(runtime.getDiagnosticSnapshot(), explainBefore);
// Model-contract tests are mocks; these do NOT qualify as live-model acceptance.
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
const intent = (ref) => ({
  schemaVersion: 1,
  kind: "create",
  learningGoal: "Explore a relationship",
  representation: ref,
  relationship: "Change an input and observe",
  initialExample: "Use registered defaults",
  interactions: ["Change input"],
  observations: ["Read output"],
  playing: false,
  explanation: "A supported experiment",
  assumptions: ["Trusted bounded model"],
});
const providerFor = (ref) => async (request) => {
  const [key, q] = Object.entries(request.questions)[0],
    selected = key === "assembly" ? ref : "lesson";
  return {
    model: "mock-laya",
    answers: {
      [key]: {
        choice: selected,
        probabilities: Object.fromEntries(
          Object.keys(q.criteria).map((k) => [k, k === selected ? 1 : 0]),
        ),
      },
    },
  };
};
const contentResponse = (result) =>
  new Response(
    JSON.stringify({
      model: "mock-apertus",
      choices: [
        {
          message: {
            content:
              typeof result === "string" ? result : JSON.stringify(result),
          },
        },
      ],
    }),
    { status: 200 },
  );
(async () => {
  process.env.APERTUS_PROVIDER = "local";
  let calls = 0;
  for (const [name, parameters] of [
    ["EqualGroupsExperiment", learningPolicies.division],
    ["ProjectileExperiment", learningPolicies.ball],
    ["GasPressureExperiment", learningPolicies.gas],
  ]) {
    const ref = `compositions/${name}`,
      queue = [
        intent(ref),
        {
          schemaVersion: 1,
          outcome: "configuration",
          confirmedComposition: ref,
          parameters,
          message: "Configured defaults.",
        },
      ];
    global.fetch = async () => {
      calls++;
      return contentResponse(queue.shift());
    };
    const events = [];
    const result = await planCreation(
      "A human concept",
      providerFor(ref),
      0.9,
      new AbortController().signal,
      (event, data) => events.push({ event, data }),
    );
    assert.equal(result.composition.ref, ref);
    assert.deepEqual(result.parameters, parameters);
    assert.ok(events.some((e) => e.event === "stagedValidation"));
    assert.equal(events.filter((e) => e.event === "layaSelection").length, 1);
  }
  assert.equal(calls, 6);
  assert.throws(() =>
    parseTeachingIntent(
      JSON.stringify({
        ...intent("compositions/GasPressureExperiment"),
        code: "execute()",
      }),
    ),
  );
  assert.equal(
    parseConfiguration(
      JSON.stringify({
        schemaVersion: 1,
        outcome: "configuration",
        confirmedComposition: "compositions/ProjectileExperiment",
        parameters: {},
        message: "Wrong selection",
      }),
      "compositions/GasPressureExperiment",
    ).outcome,
    "conflict",
  );
  const ref = "compositions/GasPressureExperiment";
  // A confident wrong selection can be rejected; the one broader restart remains joint-model.
  calls = 0;
  let queue = [
    intent(ref),
    { schemaVersion: 1, outcome: "conflict", message: "Wrong mechanism" },
    intent(ref),
    {
      schemaVersion: 1,
      outcome: "configuration",
      confirmedComposition: ref,
      parameters: learningPolicies.gas,
      message: "Gas",
    },
  ];
  global.fetch = async () => {
    calls++;
    return contentResponse(queue.shift());
  };
  assert.equal(
    (
      await planCreation(
        "Gas",
        providerFor(ref),
        0.9,
        new AbortController().signal,
      )
    ).operation,
    "create",
  );
  assert.equal(calls, 4);
  // One repair budget shared by intent and configuration: no second repair.
  calls = 0;
  queue = ["bad JSON", intent(ref), "bad config"];
  global.fetch = async () => {
    calls++;
    return contentResponse(queue.shift());
  };
  await assert.rejects(
    planCreation("Gas", providerFor(ref), 0.9, new AbortController().signal),
  );
  assert.equal(calls, 3);
  // Cancellation after inference prevents Laya or fallback.
  const controller = new AbortController();
  calls = 0;
  let layaCalls = 0;
  global.fetch = async () => {
    calls++;
    controller.abort();
    return contentResponse(intent(ref));
  };
  await assert.rejects(
    planCreation(
      "Gas",
      async () => {
        layaCalls++;
        throw Error("unexpected");
      },
      0.9,
      controller.signal,
    ),
  );
  assert.equal(calls, 1);
  assert.equal(layaCalls, 0);
  calls = 0;
  global.fetch = async () => {
    calls++;
    return new Response("", { status: 503 });
  };
  await assert.rejects(
    planCreation("Gas", providerFor(ref), 0.9, new AbortController().signal),
  );
  assert.equal(calls, 1);
  // A transport failure in hybrid edit must never start fallback inference.
  process.env.PLANNER_MODE = "hybrid";
  calls = 0;
  await assert.rejects(
    planPrompt("Change angle", "projectile", runtime.getExperimentContext()),
  );
  assert.equal(calls, 1);
  parsePlan({
    schemaVersion: 1,
    operation: "explain",
    message: "Actual state explanation",
  });
  console.log(
    "005 deterministic runtime, numerical, creation-contract, repair, cancellation and atomicity checks passed. Mock inference is not acceptance evidence.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env))
      if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
    runtime.disposeSession();
  });
