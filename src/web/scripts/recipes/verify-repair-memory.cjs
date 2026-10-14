const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const { load } = require("../test-loader.cjs");

// Invoked by the existing contract runner; no standalone evaluator or live provider.
module.exports = async function verifyRepairMemory() {
  const { fingerprint, contractKey, GUIDANCE, verifiedCorrections } = load(
    "src/simulations/creation-and-editing/memory/context.ts",
  );
  const { RepairMemory, memoryScope, createRequestMemory } = load(
    "src/lib/repair-memory/runtime.ts",
  );
  const { validateVector, embed } = load("src/lib/repair-memory/embeddings.ts");
  const { memoryMode } = load("src/lib/repair-memory/config.ts");
  const { validateValue, object, num } = load(
    "src/simulations/registry/contracts/parameterSchema.ts",
  );
  const { requestStructured } = load(
    "src/simulations/creation-and-editing/input/inference/transport.ts",
  );
  const { GenerationBudget } = load(
    "src/simulations/creation-and-editing/budget.ts",
  );
  const vector = Array(384).fill(0);
  vector[0] = 1;
  assert.throws(() => validateVector(Array(384).fill(0)));
  assert.throws(() => validateVector([1, 2]));
  assert.throws(() => validateVector([...vector.slice(1), NaN]));
  assert.equal(
    memoryMode({ OFFLINE: "true", REPAIR_MEMORY_MODE: "prevent" }),
    "off",
  );
  assert.equal(memoryMode({}), "off");
  assert.throws(() => memoryMode({ REPAIR_MEMORY_MODE: "unknown" }));
  assert.equal(fingerprint({ b: 2, a: 1 }), fingerprint({ a: 1, b: 2 }));
  const schema = {
    type: "object",
    additionalProperties: false,
    properties: { arg1: { type: "number", minimum: 0, maximum: 100 } },
    required: ["arg1"],
  };
  const context = {
    tools: ["configure"],
    revision: "test-v1",
    fields: { arg1: "model:mass" },
  };
  const renamed = {
    ...schema,
    properties: { arg9: schema.properties.arg1 },
    required: ["arg9"],
  };
  assert.equal(
    contractKey(schema, context),
    contractKey(renamed, { ...context, fields: { arg9: "model:mass" } }),
  );
  assert.notEqual(
    contractKey(schema, context),
    contractKey(schema, { ...context, fields: { arg1: "model:temperature" } }),
  );
  assert.notEqual(
    contractKey(schema, context),
    contractKey(schema, { ...context, revision: "test-v2" }),
  );
  let saved = [];
  let lookups = 0;
  const lesson = {
    id: randomUUID(),
    revision: 1,
    guidance: GUIDANCE.evaluated_numbers,
  };
  const dependencies = {
    embed: async () => vector,
    lookup: async () => {
      lookups++;
      return [lesson];
    },
    save: async (episodes) => {
      saved = structuredClone(episodes);
    },
  };
  const memory = new RepairMemory(
    "account:alice",
    "repair",
    undefined,
    dependencies,
  );
  const stage = memory.begin("edit_arguments", schema, "test-model", context);
  assert.equal(await stage.guidance(new AbortController().signal, true), "");
  stage.reject('{"arg1":"12"}', "schema", "value.arg1: expected number", {
    code: "invalid_value",
    path: "value.arg1",
  });
  assert.ok(
    (await stage.guidance(new AbortController().signal)).includes(
      "JSON number",
    ),
  );
  await stage.guidance(new AbortController().signal);
  stage.injected();
  assert.equal(lookups, 1);
  stage.accept('{"arg1":12}', true);
  await memory.finish("updated");
  await memory.finish("failed");
  assert.equal(saved.length, 1);
  assert.equal(saved[0].outcome, "updated");
  assert.equal(saved[0].usedLessons.length, 1);
  const episode = saved[0];
  const verified = verifiedCorrections(episode);
  assert.equal(verified.length, 1);
  assert.equal(verified[0].kind, "evaluated_numbers");
  assert.deepEqual(verifiedCorrections({ ...episode, outcome: "failed" }), []);
  assert.deepEqual(verifiedCorrections({ ...episode, complete: false }), []);
  assert.deepEqual(verifiedCorrections({ ...episode, scope: "shared" }), []);
  const wrongNumber = structuredClone(episode);
  wrongNumber.attempts.at(-1).content = '{"arg1":99}';
  assert.deepEqual(verifiedCorrections(wrongNumber), []);
  const semantic = structuredClone(episode);
  semantic.attempts[0].issue.phase = "semantic";
  assert.deepEqual(verifiedCorrections(semantic), []);
  const copiedNumber = structuredClone(episode);
  copiedNumber.attempts[0].content = '{"arg1":"12+0"}';
  assert.deepEqual(verifiedCorrections(copiedNumber), []);
  const envelope = structuredClone(episode);
  envelope.attempts[0].content = '{"arguments":{"arg1":12}}';
  assert.equal(verifiedCorrections(envelope)[0].kind, "flat_arguments");
  const changedMass = structuredClone(envelope);
  changedMass.schema.properties = { mass: { type: "number" } };
  changedMass.schema.required = ["mass"];
  changedMass.attempts[0].content = '{"arguments":{"mass":10}}';
  changedMass.attempts.at(-1).content = '{"mass":1}';
  assert.deepEqual(verifiedCorrections(changedMass), []);
  for (const content of [
    '{"arguments":{"arg1":10}}',
    '{"arguments":{"arg1":12,"dropped":true}}',
    '{"arguments":{}}',
    '{"arguments":{"arg1":12},"dropped":true}',
  ]) {
    envelope.attempts[0].content = content;
    assert.deepEqual(verifiedCorrections(envelope), []);
  }
  let guestWrites = 0;
  const guest = new RepairMemory(null, "repair", undefined, {
    ...dependencies,
    save: async () => guestWrites++,
  });
  const guestStage = guest.begin(
    "edit_arguments",
    schema,
    "test-model",
    context,
  );
  guestStage.reject('{"arg1":"12"}', "schema", "invalid value");
  guestStage.accept('{"arg1":12}', true);
  await guest.finish("updated");
  assert.equal(guestWrites, 0);
  const unavailable = new RepairMemory("account:alice", "repair", undefined, {
    embed: async () => {
      throw new Error("unavailable");
    },
    lookup: async () => {
      throw new Error("should not run");
    },
    save: async () => {
      throw new Error("unavailable");
    },
  });
  const unavailableStage = unavailable.begin(
    "edit_arguments",
    schema,
    "test-model",
    context,
  );
  unavailableStage.reject("{}", "schema", "invalid response");
  assert.equal(
    await unavailableStage.guidance(new AbortController().signal),
    "",
  );
  await unavailable.finish("failed");
  const bounded = new RepairMemory(
    "account:alice",
    "record",
    undefined,
    dependencies,
  );
  const boundedStage = bounded.begin(
    "edit_arguments",
    schema,
    "test-model",
    context,
  );
  boundedStage.reject("x".repeat(6001), "schema", "invalid response");
  boundedStage.reject('{"arg1":"12"}', "schema", "invalid response");
  boundedStage.accept('{"arg1":12}', true);
  await bounded.finish("updated");
  assert.equal(saved[0].complete, false);
  const nulMemory = new RepairMemory(
    "account:alice",
    "record",
    undefined,
    dependencies,
  );
  const nulStage = nulMemory.begin(
    "edit_arguments",
    schema,
    "test-model",
    context,
  );
  nulStage.reject('{"arg1":"\0"}', "schema", "invalid response");
  nulStage.accept('{"arg1":12}', true);
  await nulMemory.finish("updated");
  assert.equal(saved[0].complete, false);
  assert.ok(!saved[0].attempts[0].content.includes("\0"));

  const originalFetch = global.fetch;
  const originalEnv = { ...process.env };
  try {
    process.env.OFFLINE = "false";
    process.env.REPAIR_MEMORY_MODE = "off";
    assert.equal(await createRequestMemory(), undefined);
    assert.equal(await memoryScope(Promise.resolve(null)), null);
    assert.equal(
      await memoryScope(Promise.resolve({ user: { id: "alice" } })),
      "account:alice",
    );
    await assert.rejects(
      memoryScope(Promise.resolve({ user: { id: "../../another-account" } })),
      /Invalid private/,
    );
    await assert.rejects(memoryScope(new Promise(() => {})), /timed out/);
    process.env.REPAIR_MEMORY_EMBEDDING_URL =
      "http://127.0.0.1:9999/v1/embeddings";
    process.env.REPAIR_MEMORY_EMBEDDING_MODEL = "contract-embedding";
    process.env.REPAIR_MEMORY_EMBEDDING_REVISION = "weights-v1";
    const { planPrompt } = load(
      "src/simulations/creation-and-editing/pipeline.ts",
    );
    process.env.PLANNER_MODE = "invalid";
    let finalOutcome;
    await assert.rejects(
      planPrompt(
        {
          protocolVersion: 1,
          requestId: "contract/memory-final",
          purpose: "create",
          prompt: "Explore motion",
          destination: "lesson",
          active: null,
          viewport: { width: 1440, height: 900 },
        },
        undefined,
        undefined,
        undefined,
        {
          begin: () => undefined,
          finish: async (outcome) => {
            finalOutcome = outcome;
          },
        },
      ),
      /PLANNER_MODE/,
    );
    assert.equal(finalOutcome, "failed");
    process.env.PLANNER_MODE = originalEnv.PLANNER_MODE ?? "hybrid";
    global.fetch = async () =>
      Response.json({
        model: "contract-embedding",
        data: [{ index: 0, embedding: vector }],
      });
    assert.deepEqual(
      await embed("Verified correction", new AbortController().signal),
      vector,
    );
    global.fetch = async () =>
      Response.json({
        model: "wrong-model",
        data: [{ index: 0, embedding: vector }],
      });
    await assert.rejects(
      embed("Verified correction", new AbortController().signal),
      /model mismatch/,
    );
    global.fetch = async () => new Response("x".repeat(64001));
    await assert.rejects(
      embed("Verified correction", new AbortController().signal),
      /exceeds bounds/,
    );
    const config = {
      provider: "apertus",
      connection: "local",
      localRuntime: "mlx",
      label: "Memory contract",
      baseUrl: "http://contract.invalid/v1",
      model: "contract",
      structuredOutput: "strict-json",
      timeout: 10000,
      maxTokens: 1024,
      concurrency: 1,
    };
    let calls = 0;
    let captured;
    const activeMemory = new RepairMemory(
      "account:alice",
      "repair",
      undefined,
      {
        ...dependencies,
        save: async (episodes) => {
          captured = episodes;
        },
      },
    );
    const budget = new GenerationBudget();
    budget.memory = activeMemory;
    Object.defineProperty(budget, "llmConfig", { value: config });
    global.fetch = async (_url, options) => {
      calls++;
      const payload = JSON.parse(options.body);
      if (calls === 2) {
        assert.ok(
          payload.messages.some((message) =>
            message.content.includes("advisory_repair_memory"),
          ),
        );
        assert.ok(
          payload.messages.some((message) =>
            message.content.includes("original contract"),
          ),
        );
      }
      return Response.json({
        choices: [
          {
            message: { content: calls === 1 ? '{"arg1":"12"}' : '{"arg1":12}' },
          },
        ],
      });
    };
    const result = await requestStructured(
      [{ role: "user", content: "original contract" }],
      (content) => {
        const value = JSON.parse(content);
        validateValue(object({ arg1: num(0, 100) }), value);
        return value;
      },
      "Return a JSON number",
      budget.signal,
      {
        budget,
        schema,
        stage: "edit_arguments",
        memoryContext: context,
        verify: (value) => assert.equal(value.arg1, 12),
      },
    );
    assert.equal(result.arg1, 12);
    assert.equal(calls, 2);
    assert.equal(budget.repairs, 1);
    await activeMemory.finish("updated");
    assert.equal(captured[0].attempts[0].issue.code, "invalid_value");
    assert.equal(captured[0].attempts[0].issue.path, "value.model:mass");
    assert.equal(verifiedCorrections(captured[0]).length, 1);
    const { proposeCorrections } = load("src/lib/repair-memory/extraction.ts");
    process.env.APERTUS_PROVIDER = "local";
    process.env.APERTUS_LOCAL_RUNTIME = "mlx";
    global.fetch = async (_url, options) => {
      const payload = JSON.parse(options.body);
      assert.ok(!JSON.stringify(payload).includes('"arg1":"12"'));
      return Response.json({
        choices: [
          { message: { content: '{"corrections":["evaluated_numbers"]}' } },
        ],
      });
    };
    assert.deepEqual(
      await proposeCorrections(captured[0], new AbortController().signal),
      ["evaluated_numbers"],
    );
    global.fetch = async () =>
      Response.json({
        choices: [
          {
            message: {
              content: '{"corrections":["invented"],"status":"active"}',
            },
          },
        ],
      });
    await assert.rejects(
      proposeCorrections(captured[0], new AbortController().signal),
    );

    if (process.env.REPAIR_MEMORY_TEST_DATABASE_URL) {
      const url = new URL(process.env.REPAIR_MEMORY_TEST_DATABASE_URL);
      assert.equal(process.env.REPAIR_MEMORY_TEST_CONFIRM, "disposable");
      assert.equal(url.hostname, "127.0.0.1");
      assert.equal(url.port, "55447");
      assert.equal(url.pathname, "/repair_memory_test");
      process.env.REPAIR_MEMORY_DATABASE_URL = url.href;
      const repository = load("src/lib/repair-memory/postgres.ts");
      const {
        saveEpisodes,
        commitCorrections,
        lookupLessons,
        withMemoryClient,
        inspectLesson,
        shareLesson,
        cleanupMemory,
        enablePreventive,
        retireLesson,
      } = repository;
      const scope = `account:test_${randomUUID().replaceAll("-", "")}`;
      const privateEpisode = {
        ...episode,
        id: randomUUID(),
        occurrence: randomUUID(),
        scope,
      };
      try {
        await withMemoryClient(async (client) => {
          await client.query(
            "DO $$ BEGIN CREATE ROLE repair_memory_contract_runtime; EXCEPTION WHEN duplicate_object THEN NULL; END $$",
          );
          await client.query(
            "DO $$ BEGIN CREATE ROLE repair_memory_contract_worker; EXCEPTION WHEN duplicate_object THEN NULL; END $$",
          );
          await client.query(
            "GRANT USAGE ON SCHEMA public TO repair_memory_contract_runtime, repair_memory_contract_worker",
          );
          await client.query(
            "GRANT INSERT ON composer_repair_episodes TO repair_memory_contract_runtime",
          );
          await client.query(
            "GRANT SELECT (id) ON composer_repair_episodes TO repair_memory_contract_runtime",
          );
          await client.query(
            "GRANT SELECT ON composer_repair_lessons TO repair_memory_contract_runtime, repair_memory_contract_worker",
          );
          await client.query(
            "GRANT SELECT ON composer_repair_episodes TO repair_memory_contract_worker",
          );
          await client.query(
            "GRANT UPDATE (processing, processing_failures, lesson_ids) ON composer_repair_episodes TO repair_memory_contract_worker",
          );
          await client.query(
            "GRANT INSERT (id,scope_key,lesson_key,stage,contract_key,family,kind,guidance,proof,embedding,embedding_version), UPDATE (updated_at) ON composer_repair_lessons TO repair_memory_contract_worker",
          );
        });
        const { Pool } = require("pg");
        const switchDatabaseRole = async (role) => {
          await globalThis.repairMemoryPool.pool.end();
          globalThis.repairMemoryPool = {
            url: url.href,
            pool: new Pool({
              connectionString: url.href,
              max: 1,
              options: role ? `-c role=${role}` : undefined,
              connectionTimeoutMillis: 1000,
              statement_timeout: 100,
              query_timeout: 150,
            }),
          };
        };
        await switchDatabaseRole("repair_memory_contract_runtime");
        await saveEpisodes([privateEpisode]);
        await saveEpisodes([privateEpisode]);
        const permissionCorrection = verifiedCorrections(privateEpisode)[0];
        await assert.rejects(
          commitCorrections(privateEpisode, [
            { verified: permissionCorrection, vector },
          ]),
          (error) => error.code === "42501",
        );
        await switchDatabaseRole("repair_memory_contract_worker");
        assert.equal(
          await commitCorrections(privateEpisode, [
            { verified: permissionCorrection, vector },
          ]),
          true,
        );
        await assert.rejects(
          withMemoryClient((client) =>
            client.query(
              "UPDATE composer_repair_lessons SET reviewer='unauthorized' WHERE scope_key=$1",
              [scope],
            ),
          ),
          (error) => error.code === "42501",
        );
        await switchDatabaseRole();
        let count = await withMemoryClient((client) =>
          client.query(
            "SELECT count(*)::int n FROM composer_repair_episodes WHERE scope_key=$1",
            [scope],
          ),
        );
        assert.equal(count.rows[0].n, 1);
        const correction = verifiedCorrections(privateEpisode)[0];
        const concurrent = {
          ...privateEpisode,
          id: randomUUID(),
          occurrence: privateEpisode.occurrence,
        };
        await saveEpisodes([concurrent]);
        const outcomes = await Promise.all([
          commitCorrections(concurrent, [{ verified: correction, vector }]),
          commitCorrections(concurrent, [{ verified: correction, vector }]),
        ]);
        assert.equal(outcomes.filter(Boolean).length, 1);
        const lessons = await lookupLessons(
          scope,
          episode.stage,
          episode.contract,
          correction.family,
          vector,
          false,
        );
        assert.equal(lessons.length, 1);
        const id = lessons[0].id;
        assert.deepEqual(
          await lookupLessons(
            "account:other",
            episode.stage,
            episode.contract,
            correction.family,
            vector,
            false,
          ),
          [],
        );
        await assert.rejects(inspectLesson(id, "account:other"), /unavailable/);
        await assert.rejects(enablePreventive(id, scope), /three independent/);
        for (let i = 0; i < 2; i++) {
          const extra = {
            ...privateEpisode,
            id: randomUUID(),
            occurrence: randomUUID(),
          };
          await saveEpisodes([extra]);
          if (i === 0) {
            process.env.REPAIR_MEMORY_MODE = "record";
            global.fetch = async (url) =>
              String(url).endsWith("/v1/embeddings")
                ? Response.json({
                    model: "contract-embedding",
                    data: [{ index: 0, embedding: vector }],
                  })
                : Response.json({
                    choices: [
                      {
                        message: {
                          content: '{"corrections":["evaluated_numbers"]}',
                        },
                      },
                    ],
                  });
            const { processMemoryBatch } = load(
              "src/lib/repair-memory/extraction.ts",
            );
            assert.deepEqual(await processMemoryBatch(), {
              processed: 1,
              failed: 0,
            });
            assert.deepEqual(await processMemoryBatch(), {
              processed: 0,
              failed: 0,
            });
          } else
            await commitCorrections(extra, [{ verified: correction, vector }]);
        }
        await enablePreventive(id, scope);
        assert.equal(
          (
            await lookupLessons(
              scope,
              episode.stage,
              episode.contract,
              null,
              vector,
              true,
            )
          ).length,
          1,
        );
        const inspected = await inspectLesson(id, scope);
        const digest = fingerprint({
          key: inspected.lesson_key,
          guidance: inspected.guidance,
          proof: inspected.proof,
        });
        await assert.rejects(
          shareLesson(id, scope, "test-reviewer", "wrong-digest"),
          /Review/,
        );
        for (const [reviewer, reviewedAt, reviewedDigest] of [
          [null, new Date(), digest],
          ["test-reviewer", new Date(), null],
          ["test-reviewer", null, digest],
          ["", new Date(), digest],
          ["test-reviewer", new Date(), "invalid"],
        ]) {
          await assert.rejects(
            withMemoryClient((client) =>
              client.query(
                `INSERT INTO composer_repair_lessons
                  (id, scope_key, lesson_key, stage, contract_key, family, kind,
                   guidance, proof, embedding, embedding_version, reviewer, reviewed_at, reviewed_digest)
                 SELECT $1, 'shared', lesson_key, stage, contract_key, family, kind,
                   guidance, proof, embedding, embedding_version, $2, $3, $4
                 FROM composer_repair_lessons WHERE id=$5`,
                [randomUUID(), reviewer, reviewedAt, reviewedDigest, id],
              ),
            ),
            (error) => error.code === "23514",
          );
        }
        await shareLesson(id, scope, "test-reviewer", digest);
        assert.equal(
          (
            await lookupLessons(
              "account:other",
              episode.stage,
              episode.contract,
              correction.family,
              vector,
              false,
            )
          ).length,
          1,
        );
        assert.equal(
          (
            await lookupLessons(
              scope,
              episode.stage,
              episode.contract,
              correction.family,
              vector,
              false,
            )
          ).length,
          1,
        );
        const shared = await lookupLessons(
          null,
          episode.stage,
          episode.contract,
          correction.family,
          vector,
          false,
        );
        await retireLesson(shared[0].id, "shared", "test complete");
        assert.deepEqual(
          await lookupLessons(
            null,
            episode.stage,
            episode.contract,
            correction.family,
            vector,
            false,
          ),
          [],
        );
        const rollback = {
          ...privateEpisode,
          id: randomUUID(),
          occurrence: randomUUID(),
        };
        await saveEpisodes([rollback]);
        const distinct = { ...correction, key: fingerprint("rollback-case") };
        await assert.rejects(
          commitCorrections(rollback, [
            { verified: distinct, vector },
            { verified: correction, vector: [] },
          ]),
        );
        count = await withMemoryClient((client) =>
          client.query(
            "SELECT count(*)::int n FROM composer_repair_lessons WHERE scope_key=$1 AND lesson_key=$2",
            [scope, distinct.key],
          ),
        );
        assert.equal(count.rows[0].n, 0);
        const pending = await withMemoryClient((client) =>
          client.query(
            "SELECT processing FROM composer_repair_episodes WHERE id=$1",
            [rollback.id],
          ),
        );
        assert.equal(pending.rows[0].processing, "pending");
        await retireLesson(id, scope, "test contradiction");
        const afterRetire = {
          ...privateEpisode,
          id: randomUUID(),
          occurrence: randomUUID(),
        };
        await saveEpisodes([afterRetire]);
        await commitCorrections(afterRetire, [
          { verified: correction, vector },
        ]);
        assert.equal((await inspectLesson(id, scope)).status, "retired");
      } finally {
        await globalThis.repairMemoryPool.pool.end();
        delete globalThis.repairMemoryPool;
        await cleanupMemory(scope);
        await withMemoryClient((client) =>
          client.query(
            "DELETE FROM composer_repair_lessons WHERE scope_key='shared' AND lesson_key=$1",
            [verified[0].key],
          ),
        );
      }
      console.log(
        "Repair memory: isolated pgvector persistence, transactions, account isolation, sharing, retirement, and preventive evidence passed.",
      );
    } else
      console.log(
        "Repair memory: database checks skipped (set the isolated test database variables).",
      );
  } finally {
    global.fetch = originalFetch;
    if (globalThis.repairMemoryPool) {
      await globalThis.repairMemoryPool.pool.end();
      delete globalThis.repairMemoryPool;
    }
    for (const key of Object.keys(process.env))
      if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
  console.log(
    "Repair memory: bounded identity, structured issues, verified corrections, bounded evidence, deduplication, optional failures, embeddings, and real transport hooks passed.",
  );
};
