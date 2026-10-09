const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { readDecisionConfig } = load("src/lib/decisions/config.ts");
const { createDecisionProvider } = load("src/lib/decisions/factory.ts");
const { selectCapability } = load(
  "src/lib/planner/selection/selectCapability.ts",
);
const { acceptChoice } = load("src/lib/planner/selection/acceptance.ts");
const { readSelectionPolicy } = load("src/lib/planner/selection/policy.ts");
const { GenerationBudget } = load("src/lib/planner/budget.ts");
// Exercise the public provider contract while retaining compact transport fixtures.
const createDecisionClient = (config, signal) => (payload) =>
  createDecisionProvider(config)(payload, signal);
const dependencies = () => {
  const config = readDecisionConfig();
  return {
    provider: createDecisionProvider(config),
    policy: readSelectionPolicy(config.provider),
  };
};
const savedFetch = global.fetch;
const savedEnv = { ...process.env };
const payload = {
  state: "Teach area",
  questions: {
    capability: {
      type: "choice",
      instructions: "Choose a lesson",
      criteria: { area: "Area", unclear: "No fit" },
    },
  },
};
const answer = {
  type: "choice",
  choice: "area",
  probabilities: { area: 0.95, unclear: 0.05 },
  confidence: 0.85,
};
const jev = { DECISION_PROVIDER: "jev", TYPESAFE_API_KEY: "fixture-secret" };
const result = {
  model: "jev-1.13.0",
  answers: { capability: answer },
  usage: { input_tokens: 42, output_tokens: 12 },
};
const makeBudget = () => ({
  decisionCalls: 0,
  signal: new AbortController().signal,
  check() {
    this.signal.throwIfAborted();
  },
  consumeDecisionCall() {
    this.check();
    if (this.decisionCalls >= 1)
      throw new Error("Decision selection budget exhausted");
    this.decisionCalls++;
  },
  trace() {},
});
(async () => {
  assert.equal(readDecisionConfig({}).provider, "laya");
  assert.equal(readDecisionConfig({}).baseUrl, "http://127.0.0.1:43102");
  assert.equal(readDecisionConfig({ LAYA_TIMEOUT_MS: "2000" }).timeout, 2000);
  assert.equal(
    readDecisionConfig({ LAYA_TIMEOUT_MS: "2000", DECISION_TIMEOUT_MS: "1000" })
      .timeout,
    1000,
  );
  assert.equal(
    readDecisionConfig({
      ...jev,
      LAYA_BASE_URL: "invalid",
      LAYA_CREATION_ACCEPTANCE_GATE: "bad",
    }).model,
    "jev-1.13.0",
  );
  assert.equal(
    readDecisionConfig({ JEV_BASE_URL: "invalid" }).provider,
    "laya",
  );
  for (const env of [
    { DECISION_PROVIDER: "bad" },
    { DECISION_PROVIDER: "jev" },
    { ...jev, JEV_MODEL: " " },
    { ...jev, JEV_BASE_URL: "http://example.com/v1" },
    { ...jev, JEV_BASE_URL: "https://user:pass@example.com/v1" },
    { ...jev, JEV_BASE_URL: "https://example.com/v1?key=foo" },
    { DECISION_TIMEOUT_MS: "0" },
    { DECISION_TIMEOUT_MS: "30001" },
  ])
    assert.throws(() => readDecisionConfig(env));
  for (const provider of ["laya", "jev"]) {
    const config = readDecisionConfig(provider === "jev" ? jev : {});
    global.fetch = async (url, options) => {
      assert.equal(options.cache, "no-store");
      assert.equal(options.redirect, "error");
      const body = JSON.parse(options.body);
      assert.deepEqual(body.questions, payload.questions);
      if (provider === "jev") {
        assert.equal(url, "https://api.typesafe.ai/v1/systemone");
        assert.equal(options.headers.Authorization, "Bearer fixture-secret");
        assert.equal(body.model, "jev-1.13.0");
        return Response.json(result);
      }
      assert.equal(url, "http://127.0.0.1:43102/api/decide");
      assert.equal(options.headers.Authorization, undefined);
      assert.equal(body.model, undefined);
      return Response.json({
        result: { answers: result.answers },
        model: "local-laya",
        timing: { inference_ms: 5 },
      });
    };
    const response = await createDecisionClient(
      config,
      new AbortController().signal,
    )(payload);
    assert.equal(response.provider, provider);
    assert.deepEqual(response.answers, result.answers);
    assert.deepEqual(
      response.usage,
      provider === "jev" ? result.usage : undefined,
    );
  }
  const config = readDecisionConfig(jev);
  const client = () =>
    createDecisionClient(config, new AbortController().signal)(payload);
  for (const malformed of [
    { ...result, answers: {} },
    { ...result, answers: { extra: answer } },
    { ...result, answers: { capability: { ...answer, confidence: 2 } } },
    { ...result, answers: { capability: { ...answer, type: "score" } } },
    { ...result, usage: { input_tokens: -1, output_tokens: 1 } },
    { ...result, model: "" },
  ]) {
    global.fetch = async () => Response.json(malformed);
    await assert.rejects(client, /Invalid/);
  }
  global.fetch = async () => new Response("x".repeat(64001));
  await assert.rejects(client, /size limit/);
  global.fetch = async () => new Response("{bad json");
  await assert.rejects(client, /Invalid decision response JSON/);
  let calls = 0;
  global.fetch = async () => {
    calls++;
    return Response.json(result);
  };
  await assert.rejects(
    () =>
      createDecisionClient(
        config,
        new AbortController().signal,
      )({ ...payload, state: "x".repeat(64001) }),
    /size limit/,
  );
  const cancelled = new AbortController();
  cancelled.abort();
  await assert.rejects(
    () => createDecisionClient(config, cancelled.signal)(payload),
    /abort/i,
  );
  assert.equal(calls, 0);
  global.fetch = async (_, options) =>
    new Promise((_, reject) =>
      options.signal.addEventListener(
        "abort",
        () => reject(options.signal.reason),
        { once: true },
      ),
    );
  // Keep Node alive while AbortSignal.timeout's unref'ed timer fires.
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(
      () =>
        createDecisionClient(
          readDecisionConfig({ ...jev, DECISION_TIMEOUT_MS: "10" }),
          new AbortController().signal,
        )(payload),
      /timeout/i,
    );
  } finally {
    clearTimeout(keepAlive);
  }
  assert.ok(acceptChoice(answer, payload.questions.capability, 0.75, 0.75));
  assert.equal(
    acceptChoice(
      { ...answer, confidence: 0.1 },
      payload.questions.capability,
      0.75,
      0.75,
    ),
    null,
  );
  assert.equal(
    acceptChoice(
      { ...answer, probabilities: { area: 1.1, unclear: -0.1 } },
      payload.questions.capability,
      0.75,
    ),
    null,
  );
  const cards = [
    {
      recipeSlug: "area",
      summary: "Area",
      supports: ["area"],
      limitations: [],
    },
  ];
  Object.assign(process.env, jev);
  const events = [];
  const budget = makeBudget();
  budget.trace = (event, data) => events.push({ event, data });
  global.fetch = async () => Response.json(result);
  assert.equal(
    (await selectCapability("Teach area", {}, cards, budget, dependencies))
      .capability,
    cards[0],
  );
  assert.equal(events[0].data.provider, "jev");
  assert.ok(!JSON.stringify(events).includes("fixture-secret"));
  await assert.rejects(
    () => selectCapability("Teach area", {}, cards, budget, dependencies),
    /budget exhausted/,
  );
  for (const status of [401, 422, 429, 529]) {
    let attempts = 0;
    global.fetch = async () => {
      attempts++;
      return new Response(null, { status });
    };
    assert.equal(
      (
        await selectCapability(
          "Teach area",
          {},
          cards,
          makeBudget(),
          dependencies,
        )
      ).status,
      "unavailable",
    );
    assert.equal(
      attempts,
      1,
      "Unavailable decisions fall back without retries",
    );
  }
  global.fetch = async () =>
    Response.json({
      ...result,
      answers: { capability: { ...answer, confidence: 0.1 } },
    });
  assert.equal(
    (
      await selectCapability(
        "Teach area",
        {},
        cards,
        makeBudget(),
        dependencies,
      )
    ).status,
    "rejected",
  );
  // Selection depends on a contract, not on fetch or environment variables.
  global.fetch = async () => {
    throw new Error("Unexpected HTTP call");
  };
  const injected = () => ({
    provider: async () => ({ ...result, provider: "jev", durationMs: 1 }),
    policy: { probabilityGate: 0.75, confidenceGate: 0.75 },
  });
  assert.equal(
    (await selectCapability("Teach area", {}, cards, makeBudget(), injected))
      .status,
    "selected",
  );
  for (const env of [
    { DECISION_CREATION_ACCEPTANCE_GATE: "NaN" },
    { DECISION_CONFIDENCE_GATE: "1.1" },
    { LAYA_ACCEPTANCE_GATE: "0" },
  ]) {
    assert.throws(
      () => readSelectionPolicy("laya", env),
      (error) => error.kind === "configuration",
    );
  }
  assert.deepEqual(readSelectionPolicy("laya", {}), {
    probabilityGate: 0.75,
    confidenceGate: 0,
  });
  assert.deepEqual(
    readSelectionPolicy("jev", { LAYA_CREATION_ACCEPTANCE_GATE: "bad" }),
    { probabilityGate: 0.75, confidenceGate: 0.75 },
  );
  assert.equal(
    readSelectionPolicy("laya", {
      LAYA_CREATION_ACCEPTANCE_GATE: "0.8",
      DECISION_CREATION_ACCEPTANCE_GATE: "0.9",
    }).probabilityGate,
    0.9,
  );
  const broken = await selectCapability(
    "Teach area",
    {},
    cards,
    makeBudget(),
    () => {
      readDecisionConfig({ DECISION_PROVIDER: "jev" });
    },
  );
  assert.equal(broken.status, "unavailable");
  assert.equal(broken.kind, "configuration");
  const snapshot = new GenerationBudget();
  const originalDependencies = snapshot.decision;
  process.env.DECISION_PROVIDER = "laya";
  process.env.DECISION_CONFIDENCE_GATE = "0";
  assert.equal(
    snapshot.decision,
    originalDependencies,
    "A request keeps its resolved dependencies",
  );
  assert.equal(snapshot.decision.policy.confidenceGate, 0.75);
  delete process.env.DECISION_CONFIDENCE_GATE;
  process.env.DECISION_PROVIDER = "jev";
  global.fetch = async () => {
    throw new Error("fixture-secret");
  };
  await assert.rejects(
    client,
    (error) =>
      error.kind === "transport" && !error.message.includes("fixture-secret"),
  );
  // The client still propagates cancellation during an active network call.
  const inFlight = new AbortController();
  global.fetch = async (_, options) => {
    inFlight.abort();
    throw options.signal.reason;
  };
  await assert.rejects(
    () => createDecisionProvider(config)(payload, inFlight.signal),
    /abort/i,
  );
  // A provider that ignores cancellation must not turn it into success or fallback.
  const duringSelection = new AbortController();
  const runningBudget = makeBudget();
  runningBudget.signal = duringSelection.signal;
  await assert.rejects(
    () =>
      selectCapability("Teach area", {}, cards, runningBudget, () => ({
        ...injected(),
        provider: async () => {
          duringSelection.abort();
          return { ...result, provider: "jev", durationMs: 1 };
        },
      })),
    /abort/i,
  );
  const abortBudget = makeBudget();
  global.fetch = async () => {
    throw new DOMException("Aborted", "AbortError");
  };
  const controller = new AbortController();
  controller.abort();
  abortBudget.signal = controller.signal;
  await assert.rejects(
    () => selectCapability("Teach area", {}, cards, abortBudget, dependencies),
    /abort/i,
  );
  console.log(
    "Decision providers passed: local compatibility, Jev wire format, gates, malformed responses, budgets, cancellation, timeout and unavailable fallback (mocked evidence).",
  );
})()
  .finally(() => {
    global.fetch = savedFetch;
    for (const key of Object.keys(process.env))
      if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  })
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
