const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { requestStructured, clearStructuredCapabilities } = load(
  "src/lib/apertus/transport.ts",
);
const { GenerationBudget } = load("src/lib/planner/budget.ts");
const { metrics } = require("./live-metrics.cjs");
const { parseStageJson } = load("src/lib/planner/context.ts");
const { parseCreationResponse } = load("src/lib/planner/stages.ts");
const { parseIntent, parseIntentResponse, intentSources } = load(
  "src/lib/planner/schema.ts",
);
const originalFetch = global.fetch;
const env = { ...process.env };
const messages = [
  { role: "system", content: "Return bounded typed arguments" },
  { role: "user", content: "Set width to 7" },
];
const parse = (s) => {
  const value = JSON.parse(s);
  assert.deepEqual(Object.keys(value), ["width"]);
  assert.equal(typeof value.width, "number");
  return value;
};
function provider(values, calls) {
  global.fetch = async (_url, options) => {
    calls.push(JSON.parse(options.body));
    const next = values.shift();
    assert.notEqual(next, undefined, "No unchecked retry");
    if (next instanceof Response) return next;
    return Response.json({
      choices: [
        {
          finish_reason: next.finish ?? "stop",
          message: { content: next.content },
        },
      ],
      usage: { prompt_tokens: 40, completion_tokens: 10, total_tokens: 50 },
    });
  };
}
async function repairFault(name, bad) {
  const calls = [],
    events = [];
  provider([bad, { content: '{"width":7}' }], calls);
  const result = await requestStructured(
    messages,
    parse,
    "Fix only the exact issue",
    undefined,
    {
      stage: "arguments",
      budget: new GenerationBudget(),
      onEvent: (event, data) =>
        events.push({ event: `arguments.${event}`, data }),
    },
  );
  assert.deepEqual(result, { width: 7 });
  assert.equal(calls.length, 2, name);
  assert.deepEqual(calls[0].chat_template_kwargs, { enable_thinking: false });
  assert.equal(calls[1].messages.length, 2);
  assert.ok(calls[1].messages.every((m) => m.role !== "assistant"));
  assert.match(calls[1].messages[0].content, /Exact validation issue/);
  assert.equal(
    events.filter((e) => e.event.endsWith("schemaFailure")).length,
    1,
  );
  return events;
}
(async () => {
  process.env.APERTUS_PROVIDER = "local";
  process.env.APERTUS_STRUCTURED_OUTPUT = "strict-json";
  process.env.APERTUS_TIMEOUT_MS = "1000";
  clearStructuredCapabilities();
  assert.throws(
    () => parseStageJson('{"instances":[],"coverage":{}}]'),
    /Unexpected trailing "\]"/,
  );
  assert.throws(
    () => parseStageJson('{"instances":[{"overrides":{}]}'),
    /close } before \]/,
  );
  assert.deepEqual(parseStageJson(' {"width":7} \n'), { width: 7 });
  const creation = {
    instances: [{ alias: "A", overrides: {} }],
    coverage: {
      level: "full",
      covered: ["addition"],
      omitted: [],
      explanation: "",
    },
  };
  assert.deepEqual(
    parseCreationResponse(
      {
        instances: creation.instances,
        coverageLevel: "full",
        covered: creation.coverage.covered,
        omitted: [],
        explanation: "",
      },
      "arithmetic",
    ),
    creation,
  );
  assert.throws(() => parseCreationResponse(creation, "arithmetic"));
  assert.throws(() =>
    parseCreationResponse(
      {
        instances: creation.instances,
        coverageLevel: "unknown",
        covered: ["addition"],
        omitted: [],
        explanation: "",
      },
      "arithmetic",
    ),
  );
  assert.throws(
    () => parseStageJson(`${JSON.stringify(creation)}]`, "array"),
    /Expected one JSON array/,
  );
  assert.throws(
    () =>
      parseIntent(
        {
          goal: "Explore load",
          concepts: ["load"],
          interactions: [],
          observations: [],
          explicitConstraints: [
            { meaning: "Load", sourceText: "10‑tonne load" },
          ],
          suggestedStructure: "single",
        },
        "Start with a 10-tonne load.",
      ),
    /Constraint source text/,
  );
  const sourcePrompt = "Start with a 10-tonne load halfway across.";
  const sourceResponse = {
    goal: "Explore load",
    concepts: ["load"],
    interactions: [],
    observations: [],
    explicitConstraints: [{ meaning: "Load", sourceId: "source-1" }],
    suggestedStructure: "single",
  };
  assert.equal(
    parseIntentResponse(sourceResponse, sourcePrompt).explicitConstraints[0]
      .sourceText,
    sourcePrompt,
  );
  assert.throws(() =>
    parseIntentResponse(
      {
        ...sourceResponse,
        explicitConstraints: [{ meaning: "Load", sourceId: "invented" }],
      },
      sourcePrompt,
    ),
  );
  const longPrompt = "Load - and units. ".repeat(220);
  assert.equal(
    intentSources(longPrompt)
      .map((s) => s.text)
      .join(""),
    longPrompt,
  );
  assert.ok(intentSources(longPrompt).every((s) => s.text.length <= 500));
  const malformed = await repairFault("malformed JSON", {
    content: '{"width":',
  });
  await repairFault("wrong field", { content: '{"height":7}' });
  await repairFault("truncated output", {
    content: '{"width":7}',
    finish: "length",
  });
  let calls = [];
  provider([{ content: "no JSON" }, { content: "still no JSON" }], calls);
  await assert.rejects(
    () =>
      requestStructured(messages, parse, "Repair", undefined, {
        budget: new GenerationBudget(),
      }),
    (e) => e.status === 502,
  );
  assert.equal(calls.length, 2);
  calls = [];
  provider([new Response("Provider unavailable", { status: 503 })], calls);
  await assert.rejects(
    () => requestStructured(messages, parse, "Repair"),
    (e) => e.status === 502 && /HTTP 503/.test(e.message),
  );
  assert.equal(calls.length, 1, "HTTP failure must not retry schema repair");
  calls = [];
  const semantic = [];
  provider([{ content: '{"width":8}' }, { content: '{"width":7}' }], calls);
  await requestStructured(messages, parse, "Repair", undefined, {
    budget: new GenerationBudget(),
    stage: "arguments",
    verify: (v) => assert.equal(v.width, 7),
    onEvent: (event, data) =>
      semantic.push({ event: `arguments.${event}`, data }),
  });
  const trace = {
    events: [
      { event: "stage", data: { task: "arguments" } },
      ...semantic,
      {
        event: "finalization",
        data: { budget: { calls: 2, repairs: 1, layaCalls: 0 } },
      },
    ],
  };
  const m = metrics(trace);
  assert.equal(m.firstAttemptSchemaValid, true);
  assert.equal(m.firstAttemptCorrect, false);
  assert.equal(m.acceptedAfterRepair, true);
  assert.equal(
    semantic.filter((e) => e.event.endsWith("schemaFailure")).length,
    0,
  );
  assert.equal(
    semantic.filter((e) => e.event.endsWith("semanticFailure")).length,
    1,
  );
  assert.equal(
    metrics({
      events: [{ event: "stage", data: { task: "arguments" } }, ...malformed],
    }).firstAttemptSchemaValid,
    false,
  );
  const controller = new AbortController();
  let entered;
  const waiting = new Promise((resolve) => {
    entered = resolve;
  });
  global.fetch = async (_url, options) => {
    entered();
    return new Promise((_resolve, reject) =>
      options.signal.addEventListener(
        "abort",
        () => reject(options.signal.reason),
        { once: true },
      ),
    );
  };
  const running = requestStructured(
    messages,
    parse,
    "Repair",
    controller.signal,
  );
  await waiting;
  controller.abort();
  await assert.rejects(
    () => running,
    (e) => e.status === 499,
  );
  process.env.APERTUS_TIMEOUT_MS = "5";
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(
      () => requestStructured(messages, parse, "Repair"),
      (e) => e.status === 504,
    );
  } finally {
    clearTimeout(keepAlive);
  }

  // Ollama runtime transport assertions
  process.env.APERTUS_TIMEOUT_MS = "1000";
  process.env.APERTUS_LOCAL_RUNTIME = "ollama";
  const ollamaCalls = [];
  provider([{ content: '{"width":5}' }], ollamaCalls);
  const ollamaRes = await requestStructured(messages, parse, "Repair");
  assert.deepEqual(ollamaRes, { width: 5 });
  assert.equal(ollamaCalls[0].chat_template_kwargs, undefined, "Ollama omits MLX chat_template_kwargs");

  // Ollama 404 model not found mapping
  global.fetch = async () =>
    new Response(JSON.stringify({ error: "model not found" }), {
      status: 404,
      statusText: "Not Found",
      headers: { "Content-Type": "application/json" },
    });
  await assert.rejects(
    () => requestStructured(messages, parse, "Repair"),
    (e) => e.status === 503 && /Ollama model.*not found/.test(e.message),
  );

  // Ollama network failure error message
  global.fetch = async () => {
    throw new TypeError("fetch failed");
  };
  await assert.rejects(
    () => requestStructured(messages, parse, "Repair"),
    (e) => e.status === 502 && /Cannot reach local Ollama/.test(e.message),
  );

  // MLX network failure error message
  process.env.APERTUS_LOCAL_RUNTIME = "mlx";
  await assert.rejects(
    () => requestStructured(messages, parse, "Repair"),
    (e) => e.status === 502 && /make -C src\/inference run/.test(e.message),
  );

  console.log(
    "Fault injection passed: malformed JSON, wrong fields, truncation, bounded repair, HTTP failure, semantic/schema accounting, local deliberation disabled, Ollama/MLX transport parity, cancellation and timeout. These are deterministic fixtures, not live model evidence. Binding, operation retry and stale revisions are covered by verify-contract.cjs; browser Stop/supersession by lifecycle-browser.cjs.",
  );
})()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env))
      if (!(key in env)) delete process.env[key];
    Object.assign(process.env, env);
  });
