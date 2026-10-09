const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { AgentRunner, createAgentRun } = load(
  "src/simulations/runtime/agents/runner.ts",
);
const { MemoryRunRepository } = load(
  "src/simulations/runtime/agents/memoryRepository.ts",
);
const { observeAgent, applyAgentProposal, parseAgentProposal } = load(
  "src/simulations/components/systems/AgentSystems.ts",
);
const { runView, AgentModelError } = load(
  "src/simulations/runtime/agents/contracts.ts",
);
const { activationEligible } = load(
  "src/simulations/components/behaviors/AgentActivation.ts",
);
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { AgentEffects } = load("src/simulations/runtime/agents/client.ts");
const recipe = require("../../src/simulations/pre-made/agent-conversation/recipe.json");
const configuration = {
  schemaVersion: 1,
  agents: recipe.document.nodes
    .filter((n) => n.definition === "models/AIAgent")
    .map((n) => ({ ...n.configuration, id: n.id })),
  environment: "Improve everyday travel",
  maxSteps: 4,
  maxWords: 80,
  capabilities: ["speak"],
};
const identity = {
  provider: "fixture",
  model: "deterministic",
  connection: "test",
};
const speech = (
  text = "A safer crossing would make walking to the bus stop easier.",
) => ({
  action: "speak",
  text,
  references: [],
  memory: "Remember access needs.",
  plan: ["Ask about costs."],
});
const metadata = {
  model: identity,
  elapsedMs: 1,
  inputTokens: null,
  outputTokens: null,
};
const fixture = {
  generate: async (observation) => ({
    proposal: speech(`${observation.actor.name} suggests a safe crossing.`),
    metadata,
  }),
};
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
const tick = () => new Promise((r) => setImmediate(r));

(async () => {
  const repository = new MemoryRunRepository();
  const initial = createAgentRun("run", "owner", configuration, identity);
  assert.notEqual(
    initial.memories[configuration.agents[0].id],
    initial.memories[configuration.agents[1].id],
  );
  await repository.create(initial);
  await assert.rejects(repository.read("run", "other"), /unavailable/);
  const runner = new AgentRunner(repository, fixture);
  const first = await runner.step(
    "run",
    "owner",
    0,
    new AbortController().signal,
  );
  assert.equal(first.events.length, 1);
  assert.equal(first.revision, 2);
  assert.equal(first.events[0].actor, configuration.agents[0].id);
  assert.equal(first.memories[configuration.agents[1].id].notes, "");
  assert.ok(!JSON.stringify(runView(first)).includes("Remember access needs"));
  await assert.rejects(
    runner.step("run", "owner", 0, new AbortController().signal),
    /changed/,
  );
  const second = await runner.step(
    "run",
    "owner",
    first.revision,
    new AbortController().signal,
  );
  assert.equal(second.events[1].actor, configuration.agents[1].id);
  const hidden = structuredClone(second);
  hidden.events[0].audience = [configuration.agents[0].id];
  assert.ok(
    !observeAgent(hidden, configuration.agents[1]).events.some(
      (e) => e.id === hidden.events[0].id,
    ),
  );
  assert.throws(
    () =>
      applyAgentProposal(
        hidden,
        configuration.agents[1],
        { ...speech(), references: [hidden.events[0].id] },
        "bad",
      ),
    /visible/,
  );
  assert.throws(
    () => parseAgentProposal({ ...speech(), action: "exec", code: "evil" }),
    /Unsupported/,
  );
  assert.throws(
    () =>
      applyAgentProposal(
        second,
        configuration.agents[0],
        { ...speech(), text: "word ".repeat(81) },
        "bad",
      ),
    /at most/,
  );
  assert.equal(second.events.length, 2);
  const metricRun = createAgentRun(
    "metric",
    "owner",
    { ...configuration, capabilities: ["setMetric"] },
    identity,
  );
  metricRun.metrics = { temperature: 20 };
  const metric = {
    action: "setMetric",
    key: "temperature",
    value: 22,
    references: [],
    memory: "",
    plan: [],
  };
  const changed = applyAgentProposal(
    metricRun,
    configuration.agents[0],
    metric,
    "metric-event",
  );
  assert.equal(changed.metrics.temperature, 22);
  assert.equal(metricRun.metrics.temperature, 20);
  assert.throws(
    () =>
      applyAgentProposal(initial, configuration.agents[0], metric, "denied"),
    /cannot/,
  );
  assert.throws(
    () =>
      applyAgentProposal(
        metricRun,
        configuration.agents[0],
        { ...metric, key: "unknown" },
        "missing",
      ),
    /existing/,
  );

  const gate = deferred(),
    entered = deferred();
  const slow = new AgentRunner(repository, {
    generate: async () => {
      entered.resolve();
      await gate.promise;
      return { proposal: speech(), metadata };
    },
  });
  const pending = slow.step(
    "run",
    "owner",
    second.revision,
    new AbortController().signal,
  );
  await entered.promise;
  await assert.rejects(
    runner.step("run", "owner", second.revision, new AbortController().signal),
    /changed/,
  );
  await slow.cancel("run", "owner");
  gate.resolve();
  await assert.rejects(pending, /stale/);
  const cancelledRun = await repository.read("run", "owner");
  assert.equal(cancelledRun.events.length, 2);
  assert.equal(
    Object.values(cancelledRun.attemptReceipts).at(-1).outcome,
    "cancelled",
  );
  assert.equal(runView(cancelledRun).usage.inputTokens, null);

  const failureRepo = new MemoryRunRepository();
  await failureRepo.create(
    createAgentRun("failure", "owner", configuration, identity),
  );
  await assert.rejects(
    new AgentRunner(failureRepo, {
      generate: async () => {
        throw new Error("transport");
      },
    }).step("failure", "owner", 0, new AbortController().signal),
  );
  const failed = await failureRepo.read("failure", "owner");
  assert.equal(failed.status, "failed");
  assert.equal(failed.events.length, 0);
  const recovered = await new AgentRunner(failureRepo, fixture).step(
    "failure",
    "owner",
    failed.revision,
    new AbortController().signal,
  );
  assert.equal(recovered.events.length, 1);
  assert.deepEqual(
    Object.values(recovered.attemptReceipts).map((r) => r.outcome),
    ["failed", "accepted"],
  );
  assert.equal(
    runView(recovered).usage.inputTokens,
    null,
    "Unknown failed usage must not be reported as zero",
  );

  const budgetRepo = new MemoryRunRepository();
  await budgetRepo.create(
    createAgentRun(
      "budget",
      "owner",
      { ...configuration, maxSteps: 1 },
      identity,
    ),
  );
  let budgetCalls = 0;
  const budgetRunner = new AgentRunner(
    budgetRepo,
    {
      generate: async (...args) => {
        budgetCalls++;
        return fixture.generate(...args);
      },
    },
    undefined,
    undefined,
    {
      selectActor: () => configuration.agents[0].id,
      completed: () => false,
    },
  );
  const capped = await budgetRunner.step(
    "budget",
    "owner",
    0,
    new AbortController().signal,
  );
  assert.equal(
    capped.status,
    "completed",
    "Policies cannot override the hard action cap",
  );
  await assert.rejects(
    budgetRunner.step(
      "budget",
      "owner",
      capped.revision,
      new AbortController().signal,
    ),
    /ended/,
  );
  const legacyCapped = structuredClone(capped);
  legacyCapped.status = "ready";
  legacyCapped.revision++;
  await budgetRepo.replace(legacyCapped, capped.revision);
  await assert.rejects(
    budgetRunner.step(
      "budget",
      "owner",
      legacyCapped.revision,
      new AbortController().signal,
    ),
    /action budget/,
  );
  assert.equal(budgetCalls, 1, "Exhausted runs must not call the model");

  const usageRepo = new MemoryRunRepository();
  await usageRepo.create(
    createAgentRun("usage", "owner", configuration, identity),
  );
  const knownUsage = { ...metadata, inputTokens: 100, outputTokens: 20 };
  let usageCalls = 0;
  const usageRunner = new AgentRunner(usageRepo, {
    generate: async () => {
      usageCalls++;
      if (usageCalls === 1)
        throw new AgentModelError("Invalid model result.", 502, knownUsage);
      return {
        proposal: usageCalls === 2 ? speech("word ".repeat(81)) : speech(),
        metadata: knownUsage,
      };
    },
  });
  let usageState = await usageRepo.read("usage", "owner");
  for (let i = 0; i < 2; i++) {
    await assert.rejects(
      usageRunner.step(
        "usage",
        "owner",
        usageState.revision,
        new AbortController().signal,
      ),
    );
    usageState = await usageRepo.read("usage", "owner");
    assert.equal(usageState.events.length, 0);
  }
  usageState = await usageRunner.step(
    "usage",
    "owner",
    usageState.revision,
    new AbortController().signal,
  );
  assert.deepEqual(
    Object.values(usageState.attemptReceipts).map((r) => r.outcome),
    ["failed", "failed", "accepted"],
  );
  assert.equal(
    Object.keys(usageState.receipts).length,
    1,
    "Action receipts remain separate from attempts",
  );
  assert.equal(runView(usageState).usage.inputTokens, 300);
  assert.equal(runView(usageState).usage.outputTokens, 60);
  const partialUsage = structuredClone(usageState);
  Object.values(partialUsage.attemptReceipts)[0].inputTokensComplete = false;
  assert.equal(runView(partialUsage).usage.inputTokens, null);
  assert.equal(runView(partialUsage).usage.outputTokens, 60);
  const legacyUsage = structuredClone(usageState);
  delete legacyUsage.attemptReceipts;
  assert.equal(
    runView(legacyUsage).usage.inputTokens,
    null,
    "Legacy runs with missing attempts cannot claim complete totals",
  );

  let clock = 100;
  const leases = new MemoryRunRepository(10, 1000000, () => clock);
  await leases.create(
    createAgentRun("lease", "owner", configuration, identity, clock),
  );
  const leaseGate = deferred(),
    leaseEntered = deferred();
  const expired = new AgentRunner(
    leases,
    {
      generate: async () => {
        leaseEntered.resolve();
        await leaseGate.promise;
        return { proposal: speech(), metadata };
      },
    },
    undefined,
    () => clock,
  );
  const oldWork = expired.step(
    "lease",
    "owner",
    0,
    new AbortController().signal,
  );
  await leaseEntered.promise;
  const reserved = await leases.read("lease", "owner");
  clock += 126000;
  const reclaimed = await new AgentRunner(
    leases,
    fixture,
    undefined,
    () => clock,
  ).step("lease", "owner", reserved.revision, new AbortController().signal);
  leaseGate.resolve();
  await assert.rejects(oldWork, /stale/);
  assert.equal(reclaimed.events.length, 1);
  assert.deepEqual(
    Object.values(reclaimed.attemptReceipts).map((r) => r.outcome),
    ["expired", "accepted"],
  );

  const candidate = await failureRepo.read("failure", "owner");
  const a = structuredClone(candidate),
    b = structuredClone(candidate);
  a.revision++;
  b.revision++;
  const races = await Promise.allSettled([
    failureRepo.replace(a, candidate.revision),
    failureRepo.replace(b, candidate.revision),
  ]);
  assert.equal(races.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(
    activationEligible(
      { kind: "interval", id: "clock", time: 3, interval: 5 },
      0,
    ),
    false,
  );
  assert.equal(
    activationEligible({ kind: "goal", id: "goal", complete: true }),
    false,
  );

  const { AgentWorkQueue } = load(
    "src/simulations/runtime/agents/scheduler.ts",
  );
  const { DatasetRetrieval, AgentToolRegistry, goalReached } = load(
    "src/simulations/runtime/agents/capabilities.ts",
  );
  const queue = new AgentWorkQueue(1, 1),
    queueGate = deferred();
  const running = queue.submit(
    "first",
    new AbortController().signal,
    () => queueGate.promise,
  );
  const queuedSignal = new AbortController();
  const queued = queue.submit(
    "second",
    queuedSignal.signal,
    async () => "should not execute",
  );
  await assert.rejects(
    queue.submit("first", new AbortController().signal, async () => null),
    /already scheduled/,
  );
  await assert.rejects(
    queue.submit("third", new AbortController().signal, async () => null),
    /full/,
  );
  queuedSignal.abort();
  await assert.rejects(queued, /cancelled/);
  queueGate.resolve("done");
  assert.equal(await running, "done");
  const knowledge = new DatasetRetrieval([
    { id: "public", text: "Safe walking routes", audience: "public" },
    { id: "private", text: "Secret walking route", audience: ["alice"] },
  ]);
  assert.deepEqual(
    knowledge.retrieve("walking route", "bob", 4).map((item) => item.id),
    ["public"],
  );
  const tools = new AgentToolRegistry();
  tools.register({
    id: "knowledge",
    arguments: {
      type: "object",
      properties: { query: { type: "string", maxLength: 400 } },
    },
    execute: async (args, actor) => knowledge.retrieve(args.query, actor, 4),
  });
  await assert.rejects(
    tools.execute(
      "knowledge",
      { query: "walking" },
      "bob",
      [],
      new AbortController().signal,
    ),
    /denied/,
  );
  assert.equal(
    (
      await tools.execute(
        "knowledge",
        { query: "walking" },
        "bob",
        ["knowledge"],
        new AbortController().signal,
      )
    ).length,
    1,
  );
  assert.equal(
    goalReached(
      { temperature: 22 },
      { metric: "temperature", relation: "atLeast", value: 21 },
    ),
    true,
  );
  const storage = new MemoryRunRepository();
  await storage.create(
    createAgentRun("storage", "owner", configuration, identity),
  );
  let writes = 0;
  const failingStore = {
    create: (run) => storage.create(run),
    read: (id, owner) => storage.read(id, owner),
    replace: async (run, rev) => {
      if (++writes === 2) throw new Error("storage unavailable");
      return storage.replace(run, rev);
    },
  };
  await assert.rejects(
    new AgentRunner(failingStore, {
      generate: async () => ({ proposal: speech(), metadata: knownUsage }),
    }).step("storage", "owner", 0, new AbortController().signal),
    /storage unavailable/,
  );
  const storageFailure = await storage.read("storage", "owner");
  assert.equal(storageFailure.events.length, 0);
  assert.equal(Object.keys(storageFailure.receipts).length, 0);
  assert.equal(
    Object.values(storageFailure.attemptReceipts)[0].outcome,
    "failed",
  );
  assert.equal(runView(storageFailure).usage.inputTokens, 100);

  // Renderer-independent client lifecycle, without making actual network calls.
  const runtime = loadRecipe(recipe).runtime;
  assert.equal(runtime.getSnapshot().outputs.environment.count, 0);
  let calls = 0;
  const clientRepo = new MemoryRunRepository();
  const clientRunner = new AgentRunner(clientRepo, fixture);
  const transport = async (body) => {
    calls++;
    if (body.operation === "create") {
      const run = createAgentRun(
        "client",
        "owner",
        body.configuration,
        identity,
      );
      await clientRepo.create(run);
      return { handle: { id: "client" }, run: runView(run) };
    }
    if (body.operation === "step")
      return {
        run: runView(
          await clientRunner.step(
            "client",
            "owner",
            body.expectedRevision,
            new AbortController().signal,
          ),
        ),
      };
    return { run: runView(await clientRepo.read("client", "owner")) };
  };
  const effects = new AgentEffects(
    runtime.getSnapshot,
    () => runtime.document,
    (node, generation, patch) => {
      const snapshot = structuredClone(runtime.getSnapshot());
      if (snapshot.state[node].generation !== generation) return;
      Object.assign(snapshot.state[node], patch);
      snapshot.outputs[node].session = structuredClone(snapshot.state[node]);
      runtime.adoptSnapshot(snapshot);
    },
    transport,
  );
  effects.reconcile();
  assert.equal(calls, 0, "Construction and extra views must not infer");
  const snapshot = structuredClone(runtime.getSnapshot());
  snapshot.state.environment.request = 1;
  runtime.adoptSnapshot(snapshot);
  effects.reconcile();
  effects.reconcile();
  for (let i = 0; i < 10 && runtime.getSnapshot().state.environment.busy; i++)
    await tick();
  assert.equal(calls, 2);
  assert.equal(runtime.getSnapshot().state.environment.view.count, 1);
  effects.reconcile();
  assert.equal(calls, 2);
  const { agentProviders } = load(
    "src/simulations/runtime/agents/providers.ts",
  );
  const sessionProvider = new Map(agentProviders).get("models/AgentSession");
  for (const phase of ["create", "step"]) {
    let state = structuredClone(runtime.getSnapshot().state.environment);
    state.generation = `cancel-${phase}`;
    state.request = 1;
    state.busy = false;
    state.cancelled = false;
    if (phase === "create") {
      state.handle = null;
      state.view = null;
    }
    const gate = deferred();
    const operations = [];
    let activeSignal;
    const cancelledEffects = new AgentEffects(
      () => ({ state: { environment: state } }),
      () => runtime.document,
      (_node, generation, patch) => {
        if (state.generation === generation) Object.assign(state, patch);
      },
      async (body, signal) => {
        operations.push(body.operation);
        if (body.operation === phase) {
          activeSignal = signal;
          await gate.promise;
        }
        return { handle: { id: "client" }, run: runView(first) };
      },
    );
    cancelledEffects.reconcile();
    assert.equal(state.busy, true);
    state = sessionProvider.apply(state, "CANCEL");
    cancelledEffects.reconcile();
    assert.equal(activeSignal.aborted, true);
    assert.equal(state.busy, false);
    assert.equal(state.request, 0);
    assert.equal(state.cancelled, true);
    assert.throws(() => sessionProvider.apply(state, "NEXT"), /Restart/);
    assert.throws(() => sessionProvider.apply(state, "PLAY"), /Restart/);
    const cancelledState = structuredClone(state);
    gate.resolve();
    await tick();
    cancelledEffects.reconcile();
    assert.deepEqual(
      state,
      cancelledState,
      "Late responses must not replace cancelled state",
    );
    assert.deepEqual(
      operations,
      phase === "create" ? ["create"] : ["step", "cancel"],
      "Cancellation must never reschedule work",
    );
    if (state.view?.events.length) {
      const cancelledReplay = sessionProvider.apply(state, "REPLAY");
      assert.equal(cancelledReplay.cancelled, false);
      assert.equal(
        sessionProvider.apply(cancelledReplay, "NEXT").view.count,
        1,
      );
    }
    const fresh = sessionProvider.initialize(
      runtime.document.nodes.find((n) => n.id === "environment"),
    );
    state = { ...fresh, agents: configuration.agents };
    state = sessionProvider.apply(state, "NEXT");
    assert.equal(
      state.cancelled,
      false,
      "Restart admits new explicit commands",
    );
    assert.equal(state.request, 1);
    cancelledEffects.dispose();
  }
  assert.throws(
    () =>
      sessionProvider.apply(
        { ...runtime.getSnapshot().state.environment, busy: true },
        "REPLAY",
      ),
    /Wait for the current response/,
    "Replay cannot replace the projection while a response is pending",
  );
  let replay = sessionProvider.apply(
    runtime.getSnapshot().state.environment,
    "REPLAY",
  );
  assert.equal(replay.view.events.length, 0);
  replay = sessionProvider.apply(replay, "NEXT");
  assert.equal(replay.view.events.length, 1);
  assert.equal(calls, 2, "Replay never invokes the model");
  effects.dispose();
  runtime.dispose();
  console.log(
    "Agent core: independent state, private visibility, action permissions, atomic revisions, concurrent writers, cancellation, lease fencing, recovery, numeric environment actions, and renderer-independent execution passed.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
