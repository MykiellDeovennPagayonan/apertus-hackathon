const assert = require("node:assert/strict");
const fs = require("node:fs");
const recipe = require("../../src/simulations/pre-made/agent-conversation/recipe.json");
const origin = process.env.AGENT_TEST_ORIGIN || "http://127.0.0.1:43100";
const configuration = {
  schemaVersion: 1,
  agents: recipe.document.nodes
    .filter((n) => n.definition === "models/AIAgent")
    .map((n) => ({ ...n.configuration, id: n.id })),
  environment: recipe.document.nodes.find((n) => n.id === "environment")
    .configuration.topic,
  maxSteps: 2,
  maxWords: 100,
  capabilities: ["speak"],
};
async function request(body, overrides = {}) {
  const response = await fetch(`${origin}/api/agents`, {
    method: "POST",
    headers: {
      Origin: origin,
      "Content-Type": "application/json",
      ...overrides,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(125000),
  });
  return { status: response.status, body: await response.json() };
}
(async () => {
  assert.equal(
    (
      await request(
        { operation: "create", configuration },
        { Origin: "https://invalid.example" },
      )
    ).status,
    403,
  );
  const created = await request({ operation: "create", configuration });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const handle = created.body.handle;
  assert.equal(
    (
      await request({
        operation: "read",
        handle: { ...handle, token: "0".repeat(64) },
      })
    ).status,
    404,
  );
  let run = created.body.run;
  for (let i = 0; i < 2; i++) {
    const started = Date.now();
    const result = await request({
      operation: "step",
      handle,
      expectedRevision: run.revision,
    });
    assert.equal(result.status, 200, JSON.stringify(result.body));
    run = result.body.run;
    assert.equal(run.events.length, i + 1);
    assert.equal(run.events[i].actor, configuration.agents[i].id);
    assert.ok(run.events[i].text.length > 20);
    assert.ok(!("memories" in run));
    console.log(
      `Real ${run.model.model}: ${run.events[i].name}, ${Date.now() - started}ms, ${run.events[i].text.split(/\s+/).length} words`,
    );
  }
  assert.equal(run.status, "completed");
  assert.equal(
    (await request({ operation: "step", handle, expectedRevision: 0 })).status,
    409,
  );
  fs.writeFileSync(
    "/tmp/apertus-agent-live.json",
    JSON.stringify({ configuration, run }, null, 2),
  );
  console.log(
    "Live agent HTTP: actual Apertus responses, isolation, origin checks, bounded protocol, stale revision rejection and completion passed. Public evidence: /tmp/apertus-agent-live.json",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
