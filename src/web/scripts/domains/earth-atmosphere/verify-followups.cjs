// Deterministic regression for the live-discovered missing-state failure.
// This verifies context and contracts; it is not live inference evidence.
const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const { planPrompt } = load("src/lib/planner/index.ts");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { activateRecipeSession, disposeRecipeSession } = load(
  "src/simulations/runtime/recipeSession.ts",
);
const { cases } = require("./cases.cjs");
const originalFetch = global.fetch,
  originalEnv = { ...process.env };
(async () => {
  let session;
  try {
    for (const c of cases) {
      const s = activateRecipeSession(premadeRecipe(c.slug));
      try {
        const node = s.document.nodes.find(
          (n) => n.definition === c.definition,
        );
        const context = s.requestContext().runtimeContext[node.id];
        assert.equal(context.kind, c.kind);
        assert.deepEqual(context.config, node.configuration);
        assert.ok(
          JSON.stringify(s.requestContext().runtimeContext).length < 4000,
        );
        assert.equal(context.phase, 0);
        assert.equal(
          context.energy.elapsed,
          0,
          "Keep bounded energy integration state, including elapsed model time",
        );
        if (c.kind === "earthquake") {
          assert.ok(
            s.runtime.dispatch([
              {
                node: node.id,
                command: "EA_EARTHQUAKE_SET_speed",
                arguments: { value: 0.6 },
              },
            ]).accepted,
          );
          assert.equal(
            s.requestContext().runtimeContext[node.id].config.speed,
            0.6,
          );
          assert.equal(
            s.document.nodes.find((n) => n.id === node.id).configuration.speed,
            1,
            "Incidental exploration must not rewrite authored startup",
          );
        }
      } finally {
        disposeRecipeSession(s);
      }
    }
    Object.assign(process.env, {
      PLANNER_MODE: "hybrid",
      COMPOSITION_DECISION_POLICY: "required-laya",
      DECISION_PROVIDER: "laya",
      LLM_PROVIDER: "apertus",
      APERTUS_PROVIDER: "local",
      APERTUS_LOCAL_RUNTIME: "mlx",
      APERTUS_STRUCTURED_OUTPUT: "strict-json",
    });
    session = activateRecipeSession(premadeRecipe("earthquake-formation"));
    const queue = [
      {
        goal: "Slow the current lesson",
        concepts: ["playback rate"],
        interactions: ["slower animation"],
        observations: ["fault movement"],
        explicitConstraints: [],
        suggestedStructure: "single",
      },
      { scope: "same-topic" },
      { mode: "runtime" },
      { selections: ["speed"] },
      { command_arguments: { value: 0.5 } },
    ];
    const providerCalls = [],
      decisions = [];
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      if (String(url).endsWith("/api/decide")) {
        decisions.push(body);
        assert.deepEqual(Object.keys(body.questions), ["strategy"]);
        const probabilities = Object.fromEntries(
          Object.keys(body.questions.strategy.criteria).map((k) => [
            k,
            k === "earthquake" ? 1 : 0,
          ]),
        );
        return Response.json({
          model: "fixture-laya",
          result: {
            answers: {
              strategy: {
                type: "choice",
                choice: "earthquake",
                confidence: 1,
                probabilities,
              },
            },
          },
        });
      }
      providerCalls.push(body);
      assert.ok(queue.length, "No unchecked retry");
      return Response.json({
        choices: [
          {
            finish_reason: "stop",
            message: { content: JSON.stringify(queue.shift()) },
          },
        ],
        usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
      });
    };
    const result = await planPrompt({
      protocolVersion: 1,
      requestId: "earth-state-context-contract",
      prompt: "show it slower",
      viewport: { width: 1440, height: 900 },
      active: session.requestContext(),
    });
    assert.equal(result.status, "runtime_action", JSON.stringify(result));
    assert.equal(result.commands[0].command, "EA_EARTHQUAKE_SET_speed");
    assert.equal(result.commands[0].arguments.value, 0.5);
    assert.equal(decisions.length, 1);
    assert.equal(providerCalls.length, 5);
    assert.equal(queue.length, 0);
    queue.push(
      {
        goal: "Slow the current lesson",
        concepts: ["playback rate"],
        interactions: ["slower animation"],
        observations: ["fault movement"],
        explicitConstraints: [],
        suggestedStructure: "single",
      },
      { scope: "same-topic" },
      { mode: "runtime" },
      { selections: ["speed"] },
      {
        runtime_command_arguments: {
          command: "EA_EARTHQUAKE_SET_locking",
          arguments: { value: 0.5 },
        },
      },
      { arguments: { value: 0.5 } },
    );
    const checkedEcho = await planPrompt({
      protocolVersion: 1,
      requestId: "earth-command-echo-contract",
      prompt: "show it slower",
      viewport: { width: 1440, height: 900 },
      active: session.requestContext(),
    });
    assert.equal(checkedEcho.status, "runtime_action");
    assert.equal(checkedEcho.commands[0].command, "EA_EARTHQUAKE_SET_speed");
    assert.equal(checkedEcho.commands[0].arguments.value, 0.5);
    assert.equal(
      providerCalls.length,
      11,
      "A mismatched echoed command must require provider repair",
    );
    assert.equal(decisions.length, 2, "One decision call per request");
    assert.equal(queue.length, 0);
    const argumentsCall = providerCalls.at(-1);
    assert.match(JSON.stringify(argumentsCall.messages), /currentValue/);
    assert.match(
      JSON.stringify(argumentsCall.messages),
      /\\"currentValue\\":1/,
    );
    console.log(
      "Seven bounded active model contexts, actual explored settings, preserved authored startup and current-setting inference contract passed (deterministic fixtures).",
    );
  } finally {
    if (session) disposeRecipeSession(session);
    global.fetch = originalFetch;
    for (const k of Object.keys(process.env))
      if (!(k in originalEnv)) delete process.env[k];
    Object.assign(process.env, originalEnv);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
