const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { MongoClient } = require("mongodb");
const { load } = require("../test-loader.cjs");
const { MongoRunRepository } = load("src/lib/agents/mongoRepository.ts");
const { createAgentRun, AgentRunner } = load(
  "src/simulations/runtime/agents/runner.ts",
);
const { AgentModelError } = load("src/simulations/runtime/agents/contracts.ts");
const recipe = require("../../src/simulations/pre-made/agent-conversation/recipe.json");
(async () => {
  assert.ok(
    process.env.MONGODB_TEST_URI,
    "Set MONGODB_TEST_URI to a disposable MongoDB test server.",
  );
  const client = new MongoClient(process.env.MONGODB_TEST_URI, {
    serverSelectionTimeoutMS: 5000,
  });
  const db = client.db(`agent_test_${randomUUID().replaceAll("-", "")}`);
  try {
    await client.connect();
    const repository = new MongoRunRepository(db);
    const configuration = {
      schemaVersion: 1,
      agents: recipe.document.nodes
        .filter((n) => n.definition === "models/AIAgent")
        .map((n) => ({ ...n.configuration, id: n.id })),
      environment: "Travel",
      maxSteps: 2,
      maxWords: 80,
      capabilities: ["speak"],
    };
    const identity = {
      provider: "fixture",
      model: "deterministic",
      connection: "test",
    };
    const run = createAgentRun(randomUUID(), "alice", configuration, identity);
    await repository.create(run);
    await assert.rejects(repository.read(run.id, "bob"), /unavailable/);
    const next = structuredClone(run);
    next.revision++;
    const writes = await Promise.allSettled([
      repository.replace(next, 0),
      repository.replace(next, 0),
    ]);
    assert.equal(
      writes.filter((result) => result.status === "fulfilled").length,
      1,
    );
    const runner = new AgentRunner(repository, {
      generate: async () => ({
        proposal: {
          action: "speak",
          text: "Improve accessible walking routes.",
          references: [],
          memory: "Consider mobility access.",
          plan: [],
        },
        metadata: {
          model: identity,
          elapsedMs: 1,
          inputTokens: null,
          outputTokens: null,
        },
      }),
    });
    const accepted = await runner.step(
      run.id,
      "alice",
      1,
      new AbortController().signal,
    );
    const reopened = await new MongoRunRepository(db).read(run.id, "alice");
    assert.deepEqual(reopened, accepted);
    assert.equal(reopened.events.length, 1);
    assert.equal(Object.keys(reopened.receipts).length, 1);
    assert.equal(Object.keys(reopened.attemptReceipts).length, 1);
    assert.equal(
      Object.values(reopened.attemptReceipts)[0].outcome,
      "accepted",
    );
    assert.equal(
      reopened.memories[configuration.agents[0].id].notes,
      "Consider mobility access.",
    );
    const failedRunner = new AgentRunner(repository, {
      generate: async () => {
        throw new AgentModelError("Invalid model result.", 502, {
          model: identity,
          elapsedMs: 10,
          inputTokens: 30,
          outputTokens: 8,
        });
      },
    });
    await assert.rejects(
      failedRunner.step(
        run.id,
        "alice",
        reopened.revision,
        new AbortController().signal,
      ),
      /Invalid model result/,
    );
    const failed = await new MongoRunRepository(db).read(run.id, "alice");
    assert.equal(failed.events.length, 1);
    assert.equal(Object.keys(failed.receipts).length, 1);
    const failureReceipt = Object.values(failed.attemptReceipts).find(
      (r) => r.outcome === "failed",
    );
    assert.equal(failureReceipt.inputTokens, 30);
    const recovered = await runner.step(
      run.id,
      "alice",
      failed.revision,
      new AbortController().signal,
    );
    const restored = await new MongoRunRepository(db).read(run.id, "alice");
    assert.deepEqual(restored, recovered);
    assert.deepEqual(
      Object.values(restored.attemptReceipts).map((r) => r.outcome),
      ["accepted", "failed", "accepted"],
    );
    assert.equal(restored.status, "completed");
    console.log(
      "Mongo agent aggregate: real CAS concurrency, owner isolation, receipt/memory/event atomic commit and repository reopen passed.",
    );
  } finally {
    await db.dropDatabase().catch(() => {});
    await client.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
