process.env.PLANNER_MODE = "apertus"; // This suite tests the explicit Apertus-only adapter.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith(".")) return require(name);
    if (name.endsWith(".css")) return {};
    const base = path.resolve(path.dirname(file), name);
    const resolved = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
    ].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    assert.ok(resolved, `Cannot resolve ${name} from ${file}`);
    return load(path.relative(path.resolve(__dirname, ".."), resolved));
  };
  new Function("require", "module", "exports", source)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
const http = require("node:http");
const { readConfig } = load("src/lib/apertus/config.ts");
const { parsePlan } = load("src/lib/planner/schema.ts");
const { POST } = load("src/app/api/apertus/route.ts");
const { planPrompt } = load("src/lib/apertus/client.ts");
const plan = {
  schemaVersion: 1,
  operation: "create",
  composition: { ref: "compositions/ProjectileExperiment", version: 1 },
  parameters: { angle: 40 },
  message: "Launch at 40 degrees.",
};
assert.deepEqual(parsePlan(plan), plan);
for (const invalid of [
  { ...plan, parameters: { angle: 120 } },
  { ...plan, composition: { ref: "compositions/Missing", version: 1 } },
  { ...plan, parameters: { speed: Infinity } },
  { ...plan, parameters: { script: "alert(1)" } },
  { ...plan, schemaVersion: 2 },
  {
    ...plan,
    composition: { ref: "compositions/ProjectileExperiment", version: 2 },
  },
  {
    ...plan,
    instances: [
      {
        id: "x",
        prefab: { ref: "prefabs/Unimplemented", version: 1 },
        parameters: { angle: 20, speed: 20, gravityPreset: "Earth" },
      },
    ],
  },
])
  assert.throws(() => parsePlan(invalid));
assert.throws(() => parsePlan(plan, "town"));
assert.throws(() => readConfig({ APERTUS_PROVIDER: "typo" }));
assert.throws(() => readConfig({ APERTUS_PROVIDER: "huggingface" }));
assert.throws(() =>
  readConfig({ APERTUS_LOCAL_BASE_URL: "file:///tmp/model" }),
);
assert.equal(readConfig({}).provider, "local");
assert.equal(
  readConfig({
    APERTUS_PROVIDER: "huggingface",
    APERTUS_HF_MODEL: "served-model",
    HF_TOKEN: "test-token",
  }).baseUrl,
  "https://router.huggingface.co/v1",
);

async function main() {
  let mode = "valid",
    captured,
    calls = 0;
  const server = http.createServer(async (req, res) => {
    calls++;
    let body = "";
    for await (const chunk of req) body += chunk;
    captured = {
      path: req.url,
      auth: req.headers.authorization,
      body: JSON.parse(body),
    };
    if (mode === "slow") {
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    if (mode === "failure") {
      res.writeHead(503);
      res.end("private upstream details");
      return;
    }
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          {
            finish_reason: mode === "truncated" ? "length" : "stop",
            message: {
              reasoning: "ignored",
              content:
                mode === "invalid" ||
                (mode === "repair" && captured.body.messages.length === 2)
                  ? "invalid JSON"
                  : JSON.stringify(plan),
            },
          },
        ],
      }),
    );
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const previous = { ...process.env };
  Object.assign(process.env, {
    APERTUS_PROVIDER: "local",
    APERTUS_LOCAL_BASE_URL: `http://127.0.0.1:${server.address().port}/v1`,
    APERTUS_TIMEOUT_MS: "1000",
    APERTUS_MAX_CONCURRENT_REQUESTS: "1",
  });
  const request = (input) =>
    new Request("http://localhost/api/apertus", {
      method: "POST",
      body: JSON.stringify(input),
    });
  try {
    assert.equal((await POST(request({ prompt: "" }))).status, 400);
    assert.equal(
      (await POST(request({ prompt: "hello", demo: "unknown" }))).status,
      400,
    );
    assert.equal(
      (await POST(request({ prompt: "hello", context: { nested: {} } })))
        .status,
      400,
    );
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/apertus", {
            method: "POST",
            body: "{",
          }),
        )
      ).status,
      400,
    );
    assert.equal(
      (await POST(request({ prompt: "x".repeat(17000) }))).status,
      413,
    );
    assert.equal(calls, 0);
    const response = await POST(request({ prompt: "launch at 40 degrees" }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), plan);
    assert.equal(captured.path, "/v1/chat/completions");
    assert.equal(captured.auth, undefined);
    assert.equal(captured.body.stream, false);
    mode = "invalid";
    const beforeRepair = calls;
    assert.equal((await POST(request({ prompt: "hello" }))).status, 502);
    assert.equal(
      calls - beforeRepair,
      2,
      "Invalid output gets exactly one repair request",
    );
    assert.equal(captured.body.messages.length, 4);
    assert.match(captured.body.messages[0].content, /Validation error/);
    assert.equal(
      captured.body.messages[3].content,
      captured.body.messages[1].content,
      "Repair preserves original learner request as the final user message",
    );
    mode = "repair";
    assert.equal((await POST(request({ prompt: "launch" }))).status, 200);
    mode = "truncated";
    assert.match(
      (await (await POST(request({ prompt: "hello" }))).json()).error,
      /output limit/,
    );
    mode = "failure";
    assert.equal((await POST(request({ prompt: "hello" }))).status, 502);
    mode = "valid";
    assert.equal(
      (await POST(request({ prompt: "change", demo: "town" }))).status,
      400,
    );
    Object.assign(process.env, {
      APERTUS_PROVIDER: "huggingface",
      APERTUS_HF_BASE_URL: process.env.APERTUS_LOCAL_BASE_URL,
      APERTUS_HF_MODEL: "served-model",
      HF_TOKEN: "test-token",
    });
    assert.equal((await POST(request({ prompt: "hello" }))).status, 200);
    assert.equal(captured.auth, "Bearer test-token");
    assert.equal(captured.body.model, "served-model");
    process.env.APERTUS_PROVIDER = "local";
    mode = "slow";
    const inFlight = planPrompt("hello", null, null);
    await assert.rejects(
      planPrompt("hello", null, null),
      (error) => error.status === 429,
    );
    await inFlight;
    process.env.APERTUS_TIMEOUT_MS = "10";
    await assert.rejects(
      planPrompt("hello", null, null),
      (error) => error.status === 504,
    );
    const controller = new AbortController();
    controller.abort();
    await assert.rejects(planPrompt("hello", null, null, controller.signal));
    mode = "valid";
    process.env.APERTUS_TIMEOUT_MS = "1000";
    assert.deepEqual(await planPrompt("hello", null, null), plan);
    console.log(
      "Apertus validation, routing, provider switching, capacity, timeout, and cancellation checks passed.",
    );
  } finally {
    for (const key of Object.keys(process.env))
      if (!(key in previous)) delete process.env[key];
    Object.assign(process.env, previous);
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
