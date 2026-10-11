const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { configuredModelIdentity, createAgentModel } = load(
  "src/lib/agents/model.ts",
);
const savedEnv = { ...process.env },
  savedFetch = global.fetch;
const observation = {
  environment: "Accessible transport",
  actor: {
    id: "alice",
    name: "Alice",
    persona: "Practical",
    objective: "Improve access",
    expertise: "Transport",
  },
  events: [
    {
      id: "event-1",
      sequence: 1,
      actor: "bob",
      name: "Bob",
      kind: "speak",
      text: "How can crossings be safer?",
      references: [],
      audience: "public",
    },
  ],
  memory: { notes: "Consider crossings.", sources: [] },
  plan: { steps: [], completed: 0 },
  metrics: {},
  allowed: ["speak"],
  maxWords: 80,
};
const proposal = {
  action: "speak",
  text: "Use shorter crossings and visible pedestrian signals.",
  references: ["event-1"],
  memory: "Check accessibility.",
  plan: ["Ask about access needs."],
};
(async () => {
  try {
    for (const provider of ["apertus", "openai", "anthropic"]) {
      for (const key of Object.keys(process.env))
        if (/^(LLM_|APERTUS_|OPENAI_|ANTHROPIC_)/.test(key))
          delete process.env[key];
      Object.assign(process.env, {
        LLM_PROVIDER: provider,
        LLM_MODEL: "agent-fixture",
        LLM_TIMEOUT_MS: "2000",
        LLM_STRUCTURED_OUTPUT: "strict-json",
        APERTUS_PROVIDER: "local",
        APERTUS_LOCAL_RUNTIME: "mlx",
        OPENAI_API_KEY: "fixture",
        ANTHROPIC_API_KEY: "fixture",
      });
      let calls = 0;
      let mode = "repair";
      global.fetch = async (_url, request) => {
        const body = JSON.parse(request.body);
        calls++;
        if (mode === "partial" && calls === 2)
          throw new Error("Connection lost.");
        const content = JSON.stringify(
          calls === 1 || mode === "invalid"
            ? { ...proposal, references: ["invisible-event"] }
            : proposal,
        );
        if (provider === "openai") {
          assert.equal(body.store, false);
          return Response.json({
            model: "agent-fixture",
            status: "completed",
            output: [
              {
                type: "message",
                content: [{ type: "output_text", text: content }],
              },
            ],
            usage: { input_tokens: 100, output_tokens: 50 },
          });
        }
        if (provider === "anthropic")
          return Response.json({
            model: "agent-fixture",
            content: [{ type: "text", text: content }],
            stop_reason: "end_turn",
            usage: { input_tokens: 100, output_tokens: 50 },
          });
        return Response.json({
          model: "agent-fixture",
          choices: [{ message: { content }, finish_reason: "stop" }],
          usage: { prompt_tokens: 100, completion_tokens: 50 },
        });
      };
      const identity = configuredModelIdentity();
      const generated = await createAgentModel(identity).generate(
        observation,
        new AbortController().signal,
      );
      assert.equal(calls, 2, "Invalid references require bounded repair");
      assert.deepEqual(generated.proposal, proposal);
      assert.equal(generated.metadata.inputTokens, 200);
      assert.equal(generated.metadata.outputTokens, 100);
      process.env.LLM_MAX_TOKENS = "2048";
      assert.throws(() => createAgentModel(identity), /changed/);
      delete process.env.LLM_MAX_TOKENS;
      const abort = new AbortController();
      abort.abort();
      await assert.rejects(
        createAgentModel(identity).generate(observation, abort.signal),
      );
      assert.equal(calls, 2);
      mode = "invalid";
      calls = 0;
      await assert.rejects(
        createAgentModel(identity).generate(
          observation,
          new AbortController().signal,
        ),
        (error) => {
          assert.equal(
            error.metadata.inputTokens,
            200,
            "Exhausted repair retains all observed usage",
          );
          assert.equal(error.metadata.outputTokens, 100);
          assert.equal(error.metadata.inputTokensComplete, true);
          return true;
        },
      );
      assert.equal(calls, 2);
      mode = "partial";
      calls = 0;
      await assert.rejects(
        createAgentModel(identity).generate(
          observation,
          new AbortController().signal,
        ),
        (error) => {
          assert.equal(
            error.metadata.inputTokens,
            100,
            "Keep known usage before a transport failure",
          );
          assert.equal(error.metadata.outputTokens, 50);
          assert.equal(
            error.metadata.inputTokensComplete,
            false,
            "Missing usage makes the total incomplete",
          );
          assert.equal(error.metadata.outputTokensComplete, false);
          return true;
        },
      );
    }
    console.log(
      "Agent model adapters: Apertus/OpenAI/Anthropic wire paths, focused semantic repair, token accounting, pinned non-secret settings and cancellation passed (mocked provider evidence).",
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
