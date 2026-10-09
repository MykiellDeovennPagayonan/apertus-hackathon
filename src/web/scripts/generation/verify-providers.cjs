const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { readLlmConfig } = load("src/lib/llm/config.ts");
const { createProviderRequest } = load("src/lib/llm/adapters.ts");
const { requestStructured } = load("src/lib/apertus/transport.ts");
const { GenerationBudget } = load("src/lib/planner/budget.ts");
const { startTrace, readTrace } = load("src/lib/planner/diagnostics.ts");
const savedEnv = { ...process.env };
const savedFetch = global.fetch;
const messages = [
  { role: "system", content: "Return arguments" },
  { role: "user", content: "Set width to 7" },
];
const schema = {
  type: "object",
  additionalProperties: false,
  properties: {
    width: { type: "integer", minimum: 1, maximum: 20 },
    label: { type: "string", minLength: 2 },
  },
  required: ["width"],
};
const parse = (content) => {
  const value = JSON.parse(content);
  assert.equal(typeof value.width, "number");
  assert.ok(value.width >= 1 && value.width <= 20);
  assert.ok(!("label" in value));
  return value;
};
function configure(provider) {
  for (const key of Object.keys(process.env))
    if (/^(LLM_|APERTUS_|OPENAI_|ANTHROPIC_)/.test(key))
      delete process.env[key];
  Object.assign(process.env, {
    LLM_PROVIDER: provider,
    LLM_MODEL: provider === "openai" ? "gpt-5.6-luna" : "test-model",
    OPENAI_API_KEY: "fixture-openai-secret",
    ANTHROPIC_API_KEY: "fixture-anthropic-secret",
    LLM_TIMEOUT_MS: "1000",
  });
}
function response(provider, content, overrides = {}) {
  return Response.json(
    provider === "openai"
      ? {
          model: "gpt-5.6-luna",
          status: "completed",
          output: [
            { type: "reasoning" },
            {
              type: "message",
              content: [{ type: "output_text", text: content }],
            },
          ],
          usage: { input_tokens: 40, output_tokens: 10, total_tokens: 50 },
          ...overrides,
        }
      : {
          model: "test-model",
          stop_reason: "end_turn",
          content: [
            { type: "thinking", thinking: "ignored" },
            { type: "text", text: content },
          ],
          usage: {
            input_tokens: 40,
            output_tokens: 10,
            cache_creation_input_tokens: 2,
            cache_read_input_tokens: 3,
          },
          ...overrides,
        },
  );
}
(async () => {
  const legacy = readLlmConfig({});
  assert.equal(legacy.provider, "apertus");
  assert.equal(legacy.connection, "local");
  assert.equal(legacy.maxTokens, 1024);
  assert.equal(
    readLlmConfig({ LLM_PROVIDER: "apertus", LLM_MODEL: "other-local-model" })
      .model,
    "other-local-model",
  );
  const hf = readLlmConfig({
    APERTUS_PROVIDER: "huggingface",
    HF_TOKEN: "fixture",
    LLM_MODEL: "hosted-model",
  });
  assert.equal(hf.connection, "huggingface");
  assert.equal(hf.model, "hosted-model");
  assert.equal(
    readLlmConfig({
      LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "fixture",
      APERTUS_PROVIDER: "invalid",
    }).model,
    "gpt-5.6-luna",
    "Unselected provider is not configured",
  );
  for (const env of [
    { LLM_PROVIDER: "unknown" },
    { LLM_PROVIDER: "openai" },
    { LLM_PROVIDER: "anthropic", ANTHROPIC_API_KEY: "fixture" },
    { LLM_MODEL: " " },
    { LLM_MAX_TOKENS: "0" },
    { LLM_TIMEOUT_MS: "NaN" },
    { LLM_MAX_CONCURRENT_REQUESTS: "17" },
    { LLM_CONTEXT_TOKENS: "0" },
    { LLM_STRUCTURED_OUTPUT: "unknown" },
    {
      LLM_PROVIDER: "openai",
      OPENAI_API_KEY: "fixture",
      OPENAI_REASONING_EFFORT: "unknown",
    },
  ])
    assert.throws(() => readLlmConfig(env));
  const precedence = readLlmConfig({
    APERTUS_MAX_TOKENS: "100",
    LLM_MAX_TOKENS: "200",
    APERTUS_STRUCTURED_OUTPUT: "auto",
    LLM_STRUCTURED_OUTPUT: "strict-json",
  });
  assert.equal(precedence.maxTokens, 200);
  assert.equal(precedence.structuredOutput, "strict-json");

  for (const provider of ["openai", "anthropic"]) {
    configure(provider);
    const calls = [],
      events = [];
    const contents =
      provider === "openai" ? ['{"width":7,"label":null}'] : ['{"width":7}'];
    global.fetch = async (url, options) => {
      calls.push({ url, options, body: JSON.parse(options.body) });
      assert.ok(
        contents.length,
        "No extra capability probe or unchecked retry",
      );
      return response(provider, contents.shift());
    };
    const budget = new GenerationBudget();
    const result = await requestStructured(
      messages,
      parse,
      "Repair",
      budget.signal,
      {
        budget,
        schema,
        stage: "arguments",
        onEvent: (event, data) => events.push({ event, data }),
      },
    );
    assert.deepEqual(result, { width: 7 });
    assert.equal(calls.length, 1);
    assert.equal(calls[0].options.redirect, "error");
    assert.equal(calls[0].body.chat_template_kwargs, undefined);
    assert.equal(events[0].data.provider, provider);
    assert.equal(events[0].data.constrained, true);
    assert.equal(
      events[0].data.usage.totalTokens,
      provider === "openai" ? 50 : 55,
    );
    if (provider === "openai") {
      assert.equal(calls[0].url, "https://api.openai.com/v1/responses");
      assert.equal(
        calls[0].options.headers.Authorization,
        "Bearer fixture-openai-secret",
      );
      assert.equal(calls[0].body.store, false);
      assert.equal(calls[0].body.reasoning.effort, "none");
      assert.equal(calls[0].body.temperature, undefined);
      assert.equal(calls[0].body.max_tokens, undefined);
      assert.equal(calls[0].body.max_output_tokens, 768);
      assert.deepEqual(calls[0].body.input, messages);
      assert.deepEqual(calls[0].body.text.format.schema.required, [
        "width",
        "label",
      ]);
      assert.deepEqual(
        calls[0].body.text.format.schema.properties.label.anyOf[1],
        { type: "null" },
      );
    } else {
      assert.equal(calls[0].url, "https://api.anthropic.com/v1/messages");
      assert.equal(
        calls[0].options.headers["x-api-key"],
        "fixture-anthropic-secret",
      );
      assert.equal(calls[0].options.headers["anthropic-version"], "2023-06-01");
      assert.equal(calls[0].body.system, messages[0].content);
      assert.deepEqual(calls[0].body.messages, [messages[1]]);
      assert.equal(
        calls[0].body.output_config.format.schema.properties.width.minimum,
        undefined,
      );
      assert.match(
        calls[0].body.output_config.format.schema.properties.width.description,
        /minimum/,
      );
    }
    assert.deepEqual(
      schema.properties.width,
      { type: "integer", minimum: 1, maximum: 20 },
      "Original validation schema is preserved",
    );

    // Root arrays, enums, nested optional properties, and nullable required fields.
    const nestedSchema = {
      type: "array",
      items: {
        anyOf: [
          {
            type: "object",
            properties: {
              kind: { enum: ["width"] },
              amount: { type: "number" },
              optional: { type: "boolean" },
              nullable: { anyOf: [{ type: "number" }, { type: "null" }] },
            },
            required: ["kind", "amount", "nullable"],
            additionalProperties: false,
          },
        ],
      },
    };
    const adapter = createProviderRequest(
      readLlmConfig(),
      messages,
      200,
      nestedSchema,
    );
    const value = [
      {
        kind: "width",
        amount: 7,
        nullable: null,
        ...(provider === "openai" ? { optional: null } : {}),
      },
    ];
    assert.deepEqual(
      JSON.parse(adapter.restore(JSON.stringify({ result: value }))),
      [{ kind: "width", amount: 7, nullable: null }],
    );
    assert.throws(() => adapter.restore('{"result":[],"unexpected":true}'));

    // Validation repair uses the original messages; provider never changes mid-generation.
    contents.push(
      '{"width":99}',
      provider === "openai" ? '{"width":7,"label":null}' : '{"width":7}',
    );
    await requestStructured(messages, parse, "Repair", undefined, {
      budget: new GenerationBudget(),
      schema,
    });
    const repaired = calls.at(-1).body;
    assert.match(
      provider === "openai" ? repaired.input[0].content : repaired.system,
      /Exact validation issue/,
    );
    const pinned = new GenerationBudget();
    assert.equal(pinned.llmConfig.provider, provider);
    process.env.LLM_PROVIDER = provider === "openai" ? "anthropic" : "openai";
    assert.equal(pinned.llmConfig.provider, provider);
    process.env.LLM_PROVIDER = provider;

    process.env.LLM_STRUCTURED_OUTPUT = "strict-json";
    contents.push('{"width":7}');
    await requestStructured(messages, parse, "Repair", undefined, { schema });
    assert.equal(calls.at(-1).body.text, undefined);
    assert.equal(calls.at(-1).body.output_config, undefined);
    delete process.env.LLM_STRUCTURED_OUTPUT;

    let failureCalls = 0;
    for (const status of [400, 401, 403, 404, 429, 500, 503]) {
      global.fetch = async () => {
        failureCalls++;
        return new Response("secret provider error", { status });
      };
      await assert.rejects(
        () =>
          requestStructured(messages, parse, "Repair", undefined, { schema }),
        (error) =>
          error.status === (status === 429 ? 429 : 502) &&
          error.message.includes(`HTTP ${status}`) &&
          !error.message.includes("secret"),
      );
    }
    assert.equal(failureCalls, 7, "HTTP failures never become schema retries");
    global.fetch = async () =>
      response(
        provider,
        "",
        provider === "openai"
          ? { output: [{ type: "message", content: [{ type: "refusal" }] }] }
          : { stop_reason: "refusal" },
      );
    await assert.rejects(
      () => requestStructured(messages, parse, "Repair", undefined, { schema }),
      (error) => error.status === 422,
    );
    global.fetch = async () => {
      throw new TypeError("fixture network failure");
    };
    await assert.rejects(
      () => requestStructured(messages, parse, "Repair"),
      (error) =>
        error.status === 502 &&
        error.message.includes(provider === "openai" ? "OpenAI" : "Anthropic"),
    );

    let attempts = 0;
    global.fetch = async () =>
      response(
        provider,
        '{"width":7}',
        attempts++ === 0
          ? provider === "openai"
            ? {
                status: "incomplete",
                incomplete_details: { reason: "max_output_tokens" },
              }
            : { stop_reason: "max_tokens" }
          : {},
      );
    await requestStructured(messages, parse, "Repair", undefined, { schema });
    assert.equal(attempts, 2, "Truncation is repaired once");
    attempts = 0;
    global.fetch = async () => {
      attempts++;
      return response(provider, '{"width":');
    };
    await assert.rejects(
      () => requestStructured(messages, parse, "Repair", undefined, { schema }),
      (error) =>
        error.status === 502 && /invalid stage arguments/.test(error.message),
    );
    assert.equal(attempts, 2);
    global.fetch = async () => new Response("x".repeat(128001));
    await assert.rejects(
      () => requestStructured(messages, parse, "Repair"),
      /response exceeds bounds/,
    );

    // Cancellation, timeout, and concurrency are shared by all adapters.
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
    const controller = new AbortController();
    const running = requestStructured(
      messages,
      parse,
      "Repair",
      controller.signal,
    );
    await waiting;
    await assert.rejects(
      () => requestStructured(messages, parse, "Repair"),
      (error) => error.status === 429,
    );
    controller.abort();
    await assert.rejects(
      () => running,
      (error) => error.status === 499,
    );
    process.env.LLM_TIMEOUT_MS = "5";
    const keepAlive = setTimeout(() => {}, 1000);
    try {
      await assert.rejects(
        () => requestStructured(messages, parse, "Repair"),
        (error) => error.status === 504,
      );
    } finally {
      clearTimeout(keepAlive);
    }
    process.env.LLM_TIMEOUT_MS = "1000";
    process.env.LLM_CONTEXT_TOKENS = "45";
    global.fetch = async () => response(provider, '{"width":7}');
    await assert.rejects(
      () => requestStructured(messages, parse, "Repair"),
      /configured context capacity/,
    );
    delete process.env.LLM_CONTEXT_TOKENS;

    // Exercise the real HTTP route and planner with native cloud envelopes.
    process.env.PLANNER_MODE = "apertus";
    const stages = [
      {
        goal: "Explore addition",
        concepts: ["addition"],
        interactions: [],
        observations: [],
        explicitConstraints: [],
        suggestedStructure: "single",
      },
      {
        instances: [{ alias: "A", overrides: {} }],
        coverageLevel: "full",
        covered: ["addition"],
        omitted: [],
        explanation: "",
      },
    ];
    const stageCalls = [];
    const originalModel = process.env.LLM_MODEL;
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      stageCalls.push({ url, body });
      const stage = stages.shift();
      assert.ok(stage, "No unexpected planner call");
      const nativeSchema =
        provider === "openai"
          ? body.text.format.schema
          : body.output_config.format.schema;
      const checkSchema = (node) => {
        if (node.properties) {
          if (provider === "openai")
            assert.deepEqual(node.required, Object.keys(node.properties));
          assert.equal(node.additionalProperties, false);
          Object.values(node.properties).forEach(checkSchema);
        }
        if (node.items) checkSchema(node.items);
        if (node.anyOf) node.anyOf.forEach(checkSchema);
      };
      checkSchema(nativeSchema);
      if (stageCalls.length === 1) {
        process.env.LLM_PROVIDER =
          provider === "openai" ? "anthropic" : "openai";
        process.env.LLM_MODEL = "changed-during-generation";
      }
      return response(provider, JSON.stringify(stage));
    };
    const { POST } = load("src/app/api/apertus/route.ts");
    const requestId = `cloud-route-${provider}`;
    const generated = await POST(
      new Request("http://localhost/api/apertus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          protocolVersion: 1,
          requestId,
          prompt: "Help me learn addition. Start with 3 circles and add 2.",
          viewport: { width: 1440, height: 900 },
          active: null,
        }),
      }),
    );
    const generatedBody = await generated.json();
    assert.equal(generated.status, 200, JSON.stringify(generatedBody));
    assert.equal(generated.headers.get("X-Request-ID"), requestId);
    assert.equal(generatedBody.status, "created");
    assert.ok(
      generatedBody.recipe.document.nodes.some(
        (node) => node.definition === "models/arithmetic",
      ),
    );
    assert.equal(stageCalls.length, 2);
    assert.ok(stageCalls.every((call) => call.body.model === originalModel));
    assert.ok(
      stageCalls.every((call) =>
        call.url.includes(
          provider === "openai" ? "api.openai.com" : "api.anthropic.com",
        ),
      ),
    );
    process.env.LLM_PROVIDER = provider;
    process.env.LLM_MODEL = originalModel;

    process.env.PLANNER_DIAGNOSTICS = "true";
    process.env.NODE_ENV = "development";
    startTrace(`fixture-${provider}`, "fixture");
    const trace = readTrace(`fixture-${provider}`);
    assert.equal(trace.configuration.llm.provider, provider);
    assert.ok(!JSON.stringify(trace).includes("fixture-openai-secret"));
    assert.ok(!JSON.stringify(trace).includes("fixture-anthropic-secret"));
  }
  configure("apertus");
  process.env.LLM_STRUCTURED_OUTPUT = "strict-json";
  global.fetch = async (_url, options) => {
    assert.equal(JSON.parse(options.body).model, "test-model");
    return Response.json({
      choices: [{ finish_reason: "stop", message: { content: '{"width":7}' } }],
    });
  };
  assert.deepEqual(
    await requestStructured(messages, parse, "Repair"),
    { width: 7 },
    "Switching back to Apertus uses legacy transport",
  );
  configure("openai");
  delete process.env.OPENAI_API_KEY;
  global.fetch = async () => {
    throw new Error("Configuration must fail before network access");
  };
  await assert.rejects(
    () => requestStructured(messages, parse, "Repair"),
    (error) => error.status === 503 && /OPENAI_API_KEY/.test(error.message),
  );
  console.log(
    "Provider fixtures passed: env selection and precedence, MLX/HF compatibility, OpenAI Responses and Anthropic Messages, schema translation, optional/nullable fields, repairs, truncation, refusals, HTTP failures, bounds, cancellation, timeout, concurrency, pinned settings, redacted diagnostics and switching back to Apertus. No live cloud calls.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = savedFetch;
    for (const key of Object.keys(process.env))
      if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  });
