const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("../test-loader.cjs");
const recipe = require("../../src/simulations/pre-made/debate/recipe.json");
const { debateOrder } = load(
  "src/simulations/components/systems/debate/protocol.ts",
);
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
const origin = process.env.AGENT_TEST_ORIGIN || "http://127.0.0.1:43100";
const evidence = {
  configuration,
  startedAt: new Date().toISOString(),
  attempts: [],
  run: null,
  error: null,
};
const target =
  process.env.DEBATE_EVIDENCE_PATH || "/tmp/apertus-debate-live.json";
const save = () => fs.writeFileSync(target, JSON.stringify(evidence, null, 2));
async function request(body) {
  const response = await fetch(`${origin}/api/agents`, {
    method: "POST",
    headers: { Origin: origin, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(125000),
  });
  return { status: response.status, body: await response.json() };
}
(async () => {
  const created = await request({ operation: "create", configuration });
  assert.equal(created.status, 200, JSON.stringify(created.body));
  const handle = created.body.handle;
  let run = created.body.run;
  assert.equal(
    run.model.provider,
    "apertus",
    "Live acceptance requires Apertus, without provider switching",
  );
  for (let i = 0; i < 18; i++) {
    const started = Date.now();
    const result = await request({
      operation: "step",
      handle,
      expectedRevision: run.revision,
    });
    evidence.attempts.push({
      turn: i + 1,
      elapsedMs: Date.now() - started,
      status: result.status,
      error: result.body.error ?? null,
    });
    evidence.run = result.body.run ?? run;
    save();
    assert.equal(result.status, 200, JSON.stringify(result.body));
    run = result.body.run;
    const event = run.events[i];
    assert.equal(event.actor, debateOrder(configuration)[i]);
    const words = event.text.trim().split(/\s+/u).length;
    assert.ok(words >= setup.minWords && words <= setup.maxWords);
    if (i >= 6 && i < 12) {
      const team = configuration.agents.find((a) => a.id === event.actor).team;
      assert.ok(
        event.references.some(
          (id) =>
            configuration.agents.find(
              (a) => a.id === run.events.find((e) => e.id === id)?.actor,
            )?.team !== team,
        ),
      );
    }
    assert.ok(!("memories" in run));
    console.log(
      `${i + 1}/18 ${event.name}: ${Date.now() - started}ms, ${words} words, ${event.references.length} references`,
    );
  }
  assert.equal(run.status, "completed");
  evidence.run = run;
  save();
  console.log(
    `Live Apertus protocol completed. Review persona and engagement quality separately in ${target}.`,
  );
})().catch((error) => {
  evidence.error = error.message;
  save();
  console.error(error.message);
  process.exitCode = 1;
});
