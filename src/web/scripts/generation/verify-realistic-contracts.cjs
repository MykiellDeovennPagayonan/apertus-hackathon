const assert = require("node:assert/strict");
const { idealPendulumPeriod } = require("./pendulum-oracle.cjs");
const { load } = require("../test-loader.cjs");
const { cases } = require("./realistic-cases.cjs");
const { sampleSignal, sumSignals } = load(
  "src/simulations/components/systems/exploration/signals.ts",
);
const { eclipseGeometry } = load(
  "src/simulations/components/systems/exploration/eclipse.ts",
);
const { publicDefinitions } = load(
  "src/simulations/components/catalog/index.ts",
);
const { compositionRequirements } = load(
  "src/simulations/components/catalog/explorationTeaching.ts",
);
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
const { AuthoringTransaction } = load(
  "src/simulations/runtime/authoring/transaction.ts",
);
const { emptyAuthoredDocument } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { finalizeRecipe } = load(
  "src/simulations/runtime/authoring/operations.ts",
);
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { expandResponsiveContent } = load(
  "src/simulations/runtime/authoring/responsiveLayout.ts",
);
const { arrangeDocument } = load(
  "src/simulations/runtime/authoring/arrangement.ts",
);
const { explorationProviders } = load(
  "src/simulations/runtime/authoring/explorationProviders.ts",
);
assert.throws(() =>
  explorationProviders.get("models/SinusoidalSignal").measure({
    amplitude: "1",
    frequency: 200,
    phase: 0,
    duration: 0.02,
  }),
);
assert.throws(() =>
  explorationProviders.get("data/SignalSuperposition").synchronize(
    {},
    {
      first: [
        [
          { x: 0, y: 0 },
          { x: "0.01", y: 1 },
        ],
      ],
      second: [
        [
          { x: 0, y: 0 },
          { x: 0.01, y: 1 },
        ],
      ],
    },
  ),
);
const { requiresLayaComposition } = load(
  "src/lib/planner/compositionPolicy.ts",
);
const { selectCompositionStrategy } = load(
  "src/lib/planner/selection/compositionStrategy.ts",
);
const { parseArgumentJson } = load("src/lib/planner/argumentJson.ts");
assert.deepEqual(parseArgumentJson('{"label":"Length (m)")}').value, {
  label: "Length (m)",
});
assert.equal(parseArgumentJson('{"label":"literal ) stays"}').removed, 0);
assert.throws(() => parseArgumentJson('{"label":"truncated"'));
assert.throws(
  () => eclipseGeometry({ moonAngle: 90, moonOffset: -100, moonDistance: 100 }),
  /overlap/,
);
const near = (a, b) => assert.ok(Math.abs(a - b) < 1e-8, `${a} != ${b}`);
const signal = { amplitude: 1, frequency: 200, phase: 0, duration: 0.02 };
assert.ok(
  sumSignals(sampleSignal(signal), sampleSignal({ ...signal, phase: 180 }))
    .residualPeak < 1e-12,
);
near(sumSignals(sampleSignal(signal), sampleSignal(signal)).residualPeak, 2);
assert.ok(
  sumSignals(
    sampleSignal(signal),
    sampleSignal({ ...signal, phase: 180, amplitude: 0.5 }),
  ).residualPeak > 0.49,
);
assert.ok(
  sumSignals(
    sampleSignal(signal),
    sampleSignal({ ...signal, phase: 180, frequency: 210 }),
  ).residualPeak > 0.5,
);
assert.throws(
  () =>
    sumSignals(
      sampleSignal(signal),
      sampleSignal({ ...signal, duration: 0.01 }),
    ),
  /matching/,
);
assert.throws(() => sampleSignal({ ...signal, amplitude: Infinity }));
const enormous = [
  { x: 0, y: 1e200 },
  { x: 1, y: 1e200 },
];
assert.equal(sumSignals(enormous, enormous).residualRms, 2e200);
const overflow = [
  { x: 0, y: Number.MAX_VALUE },
  { x: 1, y: Number.MAX_VALUE },
];
assert.throws(() => sumSignals(overflow, overflow));

assert.match(
  eclipseGeometry({ moonAngle: 180, moonOffset: 0, moonDistance: 100 }).event,
  /Solar/,
);
assert.match(
  eclipseGeometry({ moonAngle: 0, moonOffset: 0, moonDistance: 100 }).event,
  /lunar/,
);
assert.equal(
  eclipseGeometry({ moonAngle: 90, moonOffset: 0, moonDistance: 100 }).event,
  "No eclipse",
);
assert.equal(
  eclipseGeometry({ moonAngle: 180, moonOffset: 120, moonDistance: 100 }).event,
  "No eclipse",
);
assert.throws(() =>
  eclipseGeometry({ moonAngle: NaN, moonOffset: 0, moonDistance: 100 }),
);
assert.throws(() =>
  requiresLayaComposition({
    COMPOSITION_DECISION_POLICY: "required-laya",
    LLM_PROVIDER: "openai",
  }),
);
for (const c of cases) {
  const intent = {
    goal: c.prompt,
    concepts: [],
    interactions: [],
    observations: [],
    explicitConstraints: [],
    suggestedStructure: "single",
  };
  const bucket = retrieveComponentBucket(c.prompt, intent);
  assert.ok(
    bucket.some((b) => b.id === c.definition),
    `Missing ${c.definition} in ${c.id} bucket`,
  );
  const draft = new AuthoringTransaction(c.id, emptyAuthoredDocument(), {
    operations: 32,
    receipts: 48,
  });
  let i = 0;
  const exec = (request) => {
    const r = draft.execute({
      draftId: draft.draftId,
      expectedRevision: draft.revision,
      operationId: `op${++i}`,
      request,
    });
    assert.equal(r.status, "applied", JSON.stringify(r.issues));
  };
  const insert = (def, alias) =>
    exec({
      tool: "insert_component",
      arguments: { definition: def, version: 1, alias, configuration: {} },
    });
  const add = (id) => {
    const req = compositionRequirements[id];
    const alias = "model";
    insert(id, alias);
    if (req.appearance) {
      insert(req.appearance, "view");
      exec({
        tool: "connect",
        arguments: {
          from: { node: alias, port: "appearance" },
          to: { node: "view", port: "model" },
        },
      });
    }
    for (const command of req.commands) {
      const schema = publicDefinitions.get(id).commands[command].arguments;
      const field =
        schema.type === "object" && schema.properties.value ? "value" : "";
      const type = field ? schema.properties.value.type : "";
      exec({
        tool: "add_control",
        arguments: {
          target: alias,
          command,
          field,
          widget: !field
            ? "button"
            : type === "boolean"
              ? "toggle"
              : type === "enum"
                ? "select"
                : "number",
          label: command,
        },
      });
    }
    for (const output of req.observations)
      exec({
        tool: "add_observation",
        arguments: {
          source: alias,
          output,
          widget: output === "event" ? "inspector" : "readout",
          label: output,
        },
      });
  };
  if (c.id === "sound") {
    insert("models/SinusoidalSignal", "first");
    insert("models/SinusoidalSignal", "second");
    insert(c.definition, "sum");
    insert("appearance/SignalSuperposition", "view");
    for (const alias of ["first", "second"]) {
      exec({
        tool: "connect",
        arguments: {
          from: { node: alias, port: "points" },
          to: { node: "sum", port: alias },
        },
      });
      for (const field of ["phase", "amplitude", "frequency"])
        exec({
          tool: "add_control",
          arguments: {
            target: alias,
            command: `set:${field}`,
            field: "value",
            widget: "number",
            label: `${alias} ${field}`,
          },
        });
    }
    exec({
      tool: "connect",
      arguments: {
        from: { node: "sum", port: "appearance" },
        to: { node: "view", port: "model" },
      },
    });
    exec({
      tool: "add_observation",
      arguments: {
        source: "sum",
        output: "residualPeak",
        widget: "readout",
        label: "Residual pressure",
      },
    });
  } else add(c.definition);
  assert.deepEqual(compositionIssues(draft.document), []);
  const roleIds = (category) =>
    draft.document.nodes
      .filter(
        (node) => publicDefinitions.get(node.definition).category === category,
      )
      .map((node) => node.id);
  const arrangement = {
    template: "scene-with-sidebar",
    main: roleIds("appearance"),
    controls: roleIds("controls"),
    results: roleIds("displays"),
    narrowOrder: [],
    preserveLocked: true,
  };
  const arranged = arrangeDocument(draft.document, arrangement);
  assert.deepEqual(arranged.nodes, draft.document.nodes);
  assert.deepEqual(arranged.connections, draft.document.connections);
  assert.deepEqual(
    new DocumentRuntime(arranged).getSnapshot(),
    new DocumentRuntime(draft.document).getSnapshot(),
    "Layout changed authoritative runtime state",
  );
  const controlItem = arranged.presentation.items.find((item) => {
    const visit = (layout) =>
      layout.id === item.layoutId
        ? layout
        : layout.children.map(visit).find(Boolean);
    const layout = visit(arranged.layout);
    return (
      publicDefinitions.get(
        arranged.nodes.find((node) => node.id === layout?.node)?.definition,
      )?.category === "controls"
    );
  });
  const beforeLayout = structuredClone(arranged.presentation);
  const expanded = expandResponsiveContent(arranged.presentation, {
    [controlItem.id]: controlItem.rect.height + 150,
  });
  assert.deepEqual(
    arranged.presentation,
    beforeLayout,
    "Learner form expansion mutated authored layout",
  );
  const grown = expanded.items.find((item) => item.id === controlItem.id);
  for (const item of expanded.items.filter((item) => item.id !== grown.id)) {
    const overlapX =
      grown.rect.x < item.rect.x + item.rect.width &&
      grown.rect.x + grown.rect.width > item.rect.x;
    const overlapY =
      grown.rect.y < item.rect.y + item.rect.height &&
      grown.rect.y + grown.rect.height > item.rect.y;
    assert.ok(
      !overlapX || !overlapY,
      "Growing a form covered a neighboring card",
    );
  }
  const locked = arranged.presentation.items[0];
  locked.locked = true;
  const originalRect = structuredClone(locked.rect);
  assert.deepEqual(
    arrangeDocument(arranged, arrangement).presentation.items[0].rect,
    originalRect,
    "Arrangement moved an authored locked item",
  );
  const recipe = finalizeRecipe(arranged, { id: `test/${c.id}` });
  loadRecipe(recipe);
  const runtime = new DocumentRuntime(recipe.document);
  const first = draft.handles.first || draft.handles.model;
  if (c.id === "sound") {
    const second = draft.handles.second;
    assert.ok(
      runtime.dispatch([
        { node: second, command: "set:phase", arguments: { value: 180 } },
      ]).accepted,
    );
    assert.ok(
      runtime.getSnapshot().outputs[draft.handles.sum].residualPeak < 1e-12,
    );
    assert.equal(runtime.getSnapshot().state[first].phase, 0);
    const baseline = structuredClone(runtime.getSnapshot());
    assert.equal(
      runtime.dispatch([
        { node: second, command: "set:phase", arguments: { value: 0 } },
        { node: first, command: "set:amplitude", arguments: { value: -1 } },
      ]).accepted,
      false,
    );
    assert.deepEqual(runtime.getSnapshot(), baseline);
  }
  if (c.id === "pendulum") {
    assert.ok(
      runtime.dispatch([
        { node: first, command: "PEND_SET_LENGTH", arguments: { value: 4 } },
      ]).accepted,
    );
    near(
      runtime.getSnapshot().outputs[first].period,
      idealPendulumPeriod(
        4,
        9.81,
        runtime.getSnapshot().state[first].amplitude,
      ),
    );
  }
  // A rejected batch leaves draft graph and revision intact.
  const original = structuredClone(draft.document),
    rev = draft.revision;
  const rejected = draft.execute({
    draftId: draft.draftId,
    expectedRevision: rev,
    operationId: "bad",
    request: [
      { tool: "configure", arguments: { target: first, changes: {} } },
      {
        tool: "connect",
        arguments: {
          from: { node: first, port: "nonexistent" },
          to: { node: first, port: "nonexistent" },
        },
      },
    ],
  });
  assert.equal(rejected.status, "rejected");
  assert.equal(draft.revision, rev);
  assert.deepEqual(draft.document, original);
}
(async () => {
  const intent = {
    goal: "Explore",
    concepts: [],
    interactions: [],
    observations: [],
    explicitConstraints: [],
    suggestedStructure: "single",
  };
  const budget = {
    consumeDecisionCall() {},
    check() {},
    signal: new AbortController().signal,
    decision: {
      policy: { probabilityGate: 0.75, confidenceGate: 0 },
      provider: async () => ({
        provider: "laya",
        model: "test",
        answers: {
          strategy: {
            choice: "pendulum",
            probabilities: { pendulum: 0.97, unclear: 0.03 },
          },
        },
        durationMs: 1,
      }),
    },
  };
  assert.equal(
    (
      await selectCompositionStrategy(
        "pendulum sim",
        intent,
        [
          {
            id: "prefabs/physical-systems/Pendulum",
            title: "Pendulum",
            summary: "Swing",
            limitations: [],
          },
        ],
        budget,
      )
    ).structure,
    "single",
  );
  await assert.rejects(
    selectCompositionStrategy("x", intent, [], {
      ...budget,
      decision: {
        ...budget.decision,
        provider: async () => {
          throw new Error("down");
        },
      },
    }),
    /unavailable/,
  );
  console.log(
    "Realistic component contracts, physics oracles, retrieval, graph parity, isolation, atomic rollback and required-provider failures passed (deterministic).",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
