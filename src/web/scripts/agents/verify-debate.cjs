const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const recipe = require("../../src/simulations/pre-made/debate/recipe.json");
const { createAgentRun, AgentRunner } = load(
  "src/simulations/runtime/agents/runner.ts",
);
const { MemoryRunRepository } = load(
  "src/simulations/runtime/agents/memoryRepository.ts",
);
const { debateEnvironment, debatePolicy } = load(
  "src/simulations/components/systems/debate/environment.ts",
);
const { validateDebateConfiguration, debateOrder } = load(
  "src/simulations/components/systems/debate/protocol.ts",
);
const { validateRunConfiguration } = load(
  "src/simulations/components/systems/AgentSystems.ts",
);
const { runView } = load("src/simulations/runtime/agents/contracts.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { serializeRecipe } = load(
  "src/simulations/runtime/recipes/serializeRecipe.ts",
);
const { AgentEffects } = load("src/simulations/runtime/agents/client.ts");
const { agentProviders } = load("src/simulations/runtime/agents/providers.ts");
const setup = recipe.document.nodes.find(
  (n) => n.id === "environment",
).configuration;
const configuration = {
  schemaVersion: 1,
  agents: recipe.document.nodes
    .filter((n) => n.definition === "models/AIAgent")
    .map((n) => ({ ...n.configuration, id: n.id })),
  environment: setup.topic,
  maxSteps: 18,
  maxWords: setup.maxWords,
  capabilities: ["speak"],
  scenario: {
    kind: "debate",
    version: 1,
    scope: setup.scope,
    minWords: setup.minWords,
    outputTokens: setup.outputTokens,
    visibility: "sequential-public",
  },
};
const expectedOrder = [
  "P1",
  "O1",
  "P2",
  "O2",
  "P3",
  "O3",
  "O1",
  "P1",
  "O2",
  "P2",
  "O3",
  "P3",
  "P1",
  "O1",
  "P2",
  "O2",
  "P3",
  "O3",
].map((seat) => `agent/${seat}`);
const identity = {
  provider: "fixture",
  model: "scripted-debate",
  connection: "test",
};
const metadata = {
  model: identity,
  elapsedMs: 12,
  inputTokens: 100,
  outputTokens: 80,
};
const proposal = (observation) => ({
  action: "speak",
  text: Array(80).fill("argument").join(" "),
  references: observation.requiredReferenceActors
    ? [
        observation.events.find((e) =>
          observation.requiredReferenceActors.includes(e.actor),
        ).id,
      ]
    : [],
  memory: `PRIVATE-${observation.actor.id}`,
  plan: [],
});
let calls = 0;
const model = {
  generate: async (observation) => {
    calls++;
    assert.ok(
      !JSON.stringify(observation).includes("PRIVATE-") ||
        observation.memory.notes === `PRIVATE-${observation.actor.id}`,
    );
    assert.ok(!JSON.stringify(observation.events).includes("PRIVATE-"));
    assert.equal(observation.outputTokens, 1024);
    return { proposal: proposal(observation), metadata };
  },
};
const makeRunner = (repo, adapter = model) =>
  new AgentRunner(repo, adapter, debateEnvironment, undefined, debatePolicy);
const signal = () => new AbortController().signal;
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { resolve, promise };
};
const tick = () => new Promise((r) => setImmediate(r));
(async () => {
  validateRunConfiguration(configuration);
  assert.deepEqual(debateOrder(configuration), expectedOrder);
  for (const patch of [
    { maxSteps: 17 },
    { capabilities: ["setMetric"] },
    { agents: configuration.agents.slice(1) },
    { scenario: { ...configuration.scenario, version: 2 } },
    { scenario: { ...configuration.scenario, minWords: 151 } },
  ])
    assert.throws(() =>
      validateDebateConfiguration({ ...configuration, ...patch }),
    );
  const repo = new MemoryRunRepository();
  await repo.create(createAgentRun("debate", "owner", configuration, identity));
  const runner = makeRunner(repo);
  let run = await repo.read("debate", "owner");
  for (let i = 0; i < 18; i++) {
    const previous = run;
    run = await runner.step(run.id, "owner", run.revision, signal());
    assert.equal(run.events.length, i + 1);
    assert.equal(run.events[i].actor, expectedOrder[i]);
    assert.equal(run.status, i === 17 ? "completed" : "ready");
    assert.equal(Object.keys(run.receipts).length, i + 1);
    assert.equal(previous.events.length, i);
    if (i >= 6 && i < 12) {
      const event = run.events[i];
      const actor = configuration.agents.find((a) => a.id === event.actor);
      assert.ok(
        event.references.some(
          (id) =>
            configuration.agents.find(
              (a) => a.id === run.events.find((e) => e.id === id).actor,
            ).team !== actor.team,
        ),
      );
    }
    await assert.rejects(
      runner.step(run.id, "owner", previous.revision, signal()),
      /changed/,
    );
  }
  assert.equal(calls, 18);
  await assert.rejects(
    runner.step(run.id, "owner", run.revision, signal()),
    /ended/,
  );
  const publicRun = runView(run);
  assert.ok(!JSON.stringify(publicRun).includes("PRIVATE-"));
  assert.deepEqual(publicRun.configuration, configuration);
  assert.equal(publicRun.usage.inputTokens, 1800);
  const rebuttal = structuredClone(run);
  rebuttal.events = rebuttal.events.slice(0, 6);
  const actor = configuration.agents.find(
    (a) => a.id === debatePolicy.selectActor(rebuttal),
  );
  const observation = debateEnvironment.observe(rebuttal, actor);
  for (const patch of [
    { references: [] },
    { references: [rebuttal.events[1].id] },
    { references: ["invented"] },
    { text: "too short" },
    { text: "word ".repeat(151) },
    { action: "setMetric", key: "score", value: 1 },
  ]) {
    assert.throws(() =>
      debateEnvironment.apply(
        rebuttal,
        actor,
        { ...proposal(observation), ...patch },
        "bad",
      ),
    );
    assert.equal(rebuttal.events.length, 6);
  }
  assert.throws(
    () =>
      debateEnvironment.apply(
        rebuttal,
        configuration.agents[0],
        proposal(observation),
        "bad",
      ),
    /scheduled/,
  );
  const failing = new MemoryRunRepository();
  await failing.create(
    createAgentRun("failure", "owner", configuration, identity),
  );
  await assert.rejects(
    makeRunner(failing, {
      generate: async () => {
        throw new Error("provider down");
      },
    }).step("failure", "owner", 0, signal()),
  );
  const failed = await failing.read("failure", "owner");
  assert.equal(failed.events.length, 0);
  const retried = await makeRunner(failing).step(
    "failure",
    "owner",
    failed.revision,
    signal(),
  );
  assert.equal(retried.events[0].id, "failure:1");
  assert.equal(retried.attempts, 2);

  const { runtime } = loadRecipe(JSON.parse(serializeRecipe(recipe)));
  runtime.dispose(); // Replace HTTP effects with the injected scripted transport.
  const sessionProvider = new Map(agentProviders).get("models/DebateSession");
  assert.equal(runtime.getSnapshot().state.environment.agents.length, 6);
  const transportRepo = new MemoryRunRepository();
  const transportRunner = makeRunner(transportRepo);
  const operations = [];
  let ids = 0,
    gate = null;
  const handles = new Map();
  const store = {
    read: (key) => handles.get(key) ?? null,
    write: (key, handle) => handles.set(key, handle),
  };
  const transport = async (body) => {
    operations.push(body.operation);
    if (body.operation === "create") {
      const id = `client-${++ids}`;
      const state = createAgentRun(id, "owner", body.configuration, identity);
      await transportRepo.create(state);
      return { handle: { id }, run: runView(state) };
    }
    if (body.operation === "step") {
      if (gate) await gate.promise;
      return {
        run: runView(
          await transportRunner.step(
            body.handle.id,
            "owner",
            body.expectedRevision,
            signal(),
          ),
        ),
      };
    }
    if (body.operation === "cancel")
      return {
        run: runView(await transportRunner.cancel(body.handle.id, "owner")),
      };
    return { run: runView(await transportRepo.read(body.handle.id, "owner")) };
  };
  const publish = (_node, generation, patch) => {
    const snapshot = structuredClone(runtime.getSnapshot());
    if (snapshot.state.environment.generation !== generation) return;
    Object.assign(snapshot.state.environment, patch);
    snapshot.outputs.environment.session = structuredClone(
      snapshot.state.environment,
    );
    runtime.adoptSnapshot(snapshot);
  };
  const effects = new AgentEffects(
    runtime.getSnapshot,
    () => runtime.document,
    publish,
    transport,
    store,
  );
  const command = (name) => {
    const result = runtime.dispatch([
      {
        node: "environment",
        command: name === "RESET" ? "RESTART" : name,
        arguments: {},
      },
    ]);
    assert.equal(result.accepted, true, result.error);
    effects.reconcile();
  };
  effects.reconcile();
  assert.equal(operations.length, 0);
  gate = deferred();
  command("PLAY");
  await tick();
  command("PAUSE");
  gate.resolve();
  gate = null;
  for (let i = 0; i < 20 && runtime.getSnapshot().state.environment.busy; i++)
    await tick();
  assert.equal(runtime.getSnapshot().state.environment.view.count, 1);
  assert.equal(runtime.getSnapshot().state.environment.playing, false);
  command("PLAY");
  for (
    let i = 0;
    i < 100 && runtime.getSnapshot().state.environment.view.count < 18;
    i++
  )
    await tick();
  assert.equal(runtime.getSnapshot().state.environment.view.count, 18);
  const beforeReplay = operations.length;
  command("REPLAY");
  command("NEXT");
  assert.equal(runtime.getSnapshot().state.environment.view.count, 1);
  command("PLAY");
  assert.equal(runtime.getSnapshot().state.environment.view.count, 18);
  assert.equal(operations.length, beforeReplay);
  command("RESET");
  assert.equal(runtime.getSnapshot().state.environment.history.length, 1);
  command("RESUME");
  await tick();
  await tick();
  assert.equal(runtime.getSnapshot().state.environment.view.count, 18);
  assert.equal(operations.at(-1), "read");
  command("RESET");
  command("NEXT");
  for (let i = 0; i < 20 && runtime.getSnapshot().state.environment.busy; i++)
    await tick();
  assert.equal(runtime.getSnapshot().state.environment.view.id, "client-2");
  assert.equal(runtime.getSnapshot().state.environment.history[0].count, 18);
  const pendingGate = deferred();
  gate = pendingGate;
  command("NEXT");
  command("RESET");
  pendingGate.resolve();
  gate = null;
  await tick();
  await tick();
  assert.equal(
    runtime.getSnapshot().state.environment.view,
    null,
    "Stale responses cannot enter the restarted generation",
  );
  const snapshot = sessionProvider.apply(
    { ...runtime.getSnapshot().state.environment, view: publicRun },
    "REPLAY",
    {},
    recipe.document.nodes.find((n) => n.id === "environment"),
  );
  assert.equal(snapshot.view.count, 0);
  const edited = structuredClone(runtime.document);
  edited.nodes.find((node) => node.id === "environment").configuration.topic =
    "Should schools ban phones during lesson hours?";
  runtime.updateDocument(edited);
  assert.ok(
    runtime
      .getSnapshot()
      .state.environment.history.some((run) => run.id === "client-2"),
  );
  assert.equal(runtime.getSnapshot().state.environment.view, null);
  assert.equal(
    runtime.getSnapshot().state.environment.topic,
    "Should schools ban phones during lesson hours?",
  );
  const swapped = structuredClone(configuration);
  [swapped.agents[0].team, swapped.agents[3].team] = [
    swapped.agents[3].team,
    swapped.agents[0].team,
  ];
  validateDebateConfiguration(swapped);
  assert.equal(swapped.agents[0].persona, configuration.agents[0].persona);
  assert.equal(debateOrder(swapped)[0], configuration.agents[1].id);
  const { resolveAgentScenario } = load(
    "src/simulations/runtime/agents/scenarios.ts",
  );
  assert.equal(resolveAgentScenario(configuration).policy, debatePolicy);
  assert.throws(
    () =>
      resolveAgentScenario({
        ...configuration,
        scenario: { kind: "unsupported", version: 1 },
      }),
    /Unsupported/,
  );
  effects.dispose();
  runtime.dispose();
  console.log(
    "Debate: eighteen-turn protocol, team references, speech bounds, privacy, failure/retry, deduplication, autoplay/pause, replay, restart, stale results, retained runs, and server resume passed (scripted model).",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
