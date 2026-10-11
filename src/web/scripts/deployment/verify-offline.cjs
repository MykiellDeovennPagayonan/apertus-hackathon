const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { offlineEnabled, requireLocalEndpoint } = load("src/lib/deployment.ts");
const { readLlmConfig } = load("src/lib/llm/config.ts");
const { readDecisionConfig } = load("src/lib/decisions/config.ts");
const { createProviderRequest, readProviderResponse } = load(
  "src/lib/llm/adapters.ts",
);
const { requestStructured, clearStructuredCapabilities } = load(
  "src/lib/apertus/transport.ts",
);

const env = {
  OFFLINE: "true",
  APERTUS_LOCAL_RUNTIME: "llamacpp",
  APERTUS_LOCAL_BASE_URL: "http://apertus:43101/v1",
};
const savedEnv = { ...process.env };
const savedFetch = global.fetch;
(async () => {
  try {
    // Supply the actual ESM adapter namespace to the CommonJS TypeScript loader.
    const adapter = await import("@auth/mongodb-adapter");
    const Module = require("node:module");
    const originalLoad = Module._load;
    Module._load = function (name, ...args) {
      return name === "@auth/mongodb-adapter"
        ? adapter
        : originalLoad.call(this, name, ...args);
    };
    let server;
    try {
      const { authConfigured, getLibrarySession } = load(
        "src/lib/auth/server.ts",
      );
      const { getDatabase } = load("src/lib/database/client.ts");
      const { projectRequest } = load("src/lib/projects/http.ts");
      const { handleLibraryRequest } = load("src/lib/library/http.ts");
      const { handleAccountRequest } = load("src/lib/auth/account-http.ts");
      server = {
        authConfigured,
        getLibrarySession,
        getDatabase,
        projectRequest,
        handleLibraryRequest,
        handleAccountRequest,
      };
    } finally {
      Module._load = originalLoad;
    }
    const {
      authConfigured,
      getLibrarySession,
      getDatabase,
      projectRequest,
      handleLibraryRequest,
      handleAccountRequest,
    } = server;
    assert.equal(offlineEnabled({}), false);
    assert.equal(offlineEnabled({ OFFLINE: "false" }), false);
    assert.throws(() => offlineEnabled({ OFFLINE: "yes" }));
    for (const url of [
      "http://apertus:43101/v1",
      "http://localhost:43101",
      "http://192.168.1.2:43101",
      "http://[::1]:43101",
      "https://apertus.local",
    ])
      requireLocalEndpoint(url);
    for (const url of [
      "https://example.com/v1",
      "http://8.8.8.8",
      "http://999.1.1.1",
      "http://172.32.0.1",
    ])
      assert.throws(() => requireLocalEndpoint(url));
    for (const extra of [
      { LLM_PROVIDER: "openai", OPENAI_API_KEY: "fixture" },
      { APERTUS_PROVIDER: "huggingface" },
      { APERTUS_LOCAL_BASE_URL: "https://example.com/v1" },
    ])
      assert.throws(() => readLlmConfig({ ...env, ...extra }));
    assert.throws(() =>
      readDecisionConfig({ OFFLINE: "true", DECISION_PROVIDER: "jev" }),
    );
    assert.throws(() =>
      readDecisionConfig({
        OFFLINE: "true",
        LAYA_BASE_URL: "https://example.com",
      }),
    );
    const config = readLlmConfig(env);
    assert.equal(config.localRuntime, "llamacpp");
    const schema = {
      type: "object",
      properties: { value: { enum: [7] } },
      required: ["value"],
      additionalProperties: false,
    };
    const request = createProviderRequest(
      config,
      [{ role: "user", content: "Return JSON" }],
      64,
      schema,
    );
    assert.equal(request.url, "http://apertus:43101/v1/chat/completions");
    assert.deepEqual(request.body.response_format, {
      type: "json_schema",
      schema,
    });
    assert.equal(request.body.chat_template_kwargs.enable_thinking, false);
    assert.equal(request.body.reasoning_effort, "none");
    const raw = {
      model: config.model,
      choices: [{ message: { content: '{"value":7}' }, finish_reason: "stop" }],
      usage: { prompt_tokens: 20, completion_tokens: 5, total_tokens: 25 },
    };
    assert.equal(readProviderResponse(config, raw).usage.totalTokens, 25);

    let calls = 0;
    clearStructuredCapabilities();
    global.fetch = async (url, options) => {
      assert.equal(url, request.url);
      assert.ok(JSON.parse(options.body).response_format.schema);
      calls++;
      return Response.json(
        calls === 1
          ? {
              choices: [
                {
                  message: {
                    content: '{"marker":"schema-enforced","value":1}',
                  },
                  finish_reason: "stop",
                },
              ],
            }
          : raw,
      );
    };
    const result = await requestStructured(
      [{ role: "user", content: "Return JSON" }],
      JSON.parse,
      "Fix JSON",
      undefined,
      { config, schema },
    );
    assert.deepEqual(result, { value: 7 });
    assert.equal(
      calls,
      2,
      "Capability probe precedes schema-constrained inference",
    );

    Object.assign(process.env, env, {
      MONGODB_URI: "mongodb://should-never-connect",
      MONGODB_DB_NAME: "fixture",
      NEXTAUTH_URL: "https://apertus.local",
      NEXTAUTH_SECRET: "x".repeat(32),
    });
    assert.equal(
      authConfigured(),
      false,
      "Configured credentials cannot override offline mode",
    );
    assert.equal(await getLibrarySession(), null);
    assert.throws(() => getDatabase(), /disabled/);
    global.fetch = () => {
      throw Error("Unexpected network access");
    };
    assert.equal(
      (
        await projectRequest(
          new Request("https://apertus.local/api/community"),
          [],
          true,
        )
      ).status,
      503,
    );
    assert.equal(
      (
        await handleLibraryRequest(
          new Request("https://apertus.local/api/library/simulations"),
          "simulations",
        )
      ).status,
      503,
    );
    assert.equal(
      (
        await handleAccountRequest(
          new Request("https://apertus.local/api/account/register", {
            method: "POST",
          }),
          "register",
          () => {
            throw Error("Unexpected delivery");
          },
        )
      ).status,
      503,
    );
    console.log(
      "Offline deployment checks passed: runtime selection, llama.cpp schema probe, local endpoint policy, and database/account/community guards.",
    );
  } finally {
    global.fetch = savedFetch;
    for (const key of Object.keys(process.env))
      if (!(key in savedEnv)) delete process.env[key];
    Object.assign(process.env, savedEnv);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
