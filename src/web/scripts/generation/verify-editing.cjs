const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { planPrompt } = load("src/lib/planner/index.ts");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const {
  RecipeSession,
  activateRecipeSession,
  acceptGenerationResult,
  disposeRecipeSession,
} = load("src/simulations/runtime/recipeSession.ts");
const { parseGenerationResult } = load("src/lib/planner/schema.ts");
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
let calls;
function provider(intent, argumentsFor, invalidFirst = false) {
  calls = [];
  let argumentAttempts = 0;
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    const input = JSON.parse(
      body.messages.find((message) => message.role === "user").content,
    );
    calls.push(input);
    assert.ok(
      ["edit_intent", "edit_arguments"].includes(input.task),
      "Edits must never invoke creation or topic selection",
    );
    const result =
      input.task === "edit_intent"
        ? intent(input)
        : argumentsFor(input, argumentAttempts++ === 0 && invalidFirst);
    return Response.json({
      choices: [
        { finish_reason: "stop", message: { content: JSON.stringify(result) } },
      ],
    });
  };
}
function request(recipe, prompt, destination, runtimeContext = {}) {
  return {
    protocolVersion: 1,
    requestId: "editing-regression",
    purpose: "edit",
    prompt,
    destination,
    viewport: { width: 1280, height: 900 },
    active: {
      sessionId:
        destination === "builder" ? "builder-editing" : "editing-session",
      authoredRevision: 1,
      interactionRevision: 2,
      recipe,
      runtimeContext,
    },
  };
}
function intent(candidate, fields, scope = "selected", adjustments = []) {
  return () => ({
    mode: "edit",
    selections: [{ candidate, scope, fields, adjustments }],
    message: "Apply the requested change",
  });
}
function args(changes) {
  return (input) => ({
    operations: [
      {
        candidate: input.operations[0].candidate,
        arguments: {
          target: input.operations[0].argumentSchema.properties.target.enum[0],
          changes,
        },
      },
    ],
  });
}
(async () => {
  Object.assign(process.env, {
    LLM_PROVIDER: "apertus",
    APERTUS_PROVIDER: "local",
    LLM_STRUCTURED_OUTPUT: "strict-json",
    PLANNER_MODE: "hybrid",
    COMPOSITION_DECISION_POLICY: "required-laya",
    LAYA_BASE_URL: "invalid",
  });
  try {
    const recipe = premadeRecipe("projectile");
    const before = structuredClone(recipe);
    const primary = recipe.document.nodes.find(
      (node) => node.id === "projectile/primary",
    );
    const secondary = recipe.document.nodes.find(
      (node) => node.id === "projectile/secondary",
    );
    for (const destination of [undefined, "builder"]) {
      provider(
        intent(`configure:${primary.id}`, ["gravity"], "all_matching"),
        args({ gravity: 1.62 }),
      );
      const result = await planPrompt(
        request(recipe, "set the gravity to that of the moon", destination),
      );
      assert.equal(result.status, "updated");
      assert.equal(calls.length, 2);
      const expected = structuredClone(recipe);
      for (const node of expected.document.nodes)
        if ([primary.id, secondary.id].includes(node.id))
          node.configuration.gravity = 1.62;
      assert.deepEqual(
        result.recipe,
        expected,
        "Shared edits preserve metadata, layout, and unrelated state",
      );
      assert.ok(
        !Object.hasOwn(result, "coverage"),
        "An edit does not invent new teaching coverage",
      );
      assert.match(
        result.learnerExplanation,
        /1\.62 m\/s² across 2 components/,
      );
    }
    const numericIntent = intent(`configure:${primary.id}`, ["gravity"], "all_matching", [
      { field: "gravity", operation: "set", operand: 1.62 },
    ]);
    delete numericIntent.message;
    provider(numericIntent);
    const numeric = await planPrompt(request(recipe, "use Moon gravity"));
    assert.equal(
      calls.length,
      1,
      "Resolved numeric assignments do not need a second model call",
    );
    assert.equal(
      numeric.recipe.document.nodes.find((node) => node.id === secondary.id)
        .configuration.gravity,
      1.62,
    );
    provider(
      intent(`configure:${primary.id}`, ["gravity"], "all_matching", [
        { field: "gravity", operation: "scale", operand: 0.5 },
      ]),
    );
    const relative = await planPrompt(
      request(recipe, "half the gravity pls", undefined, {
        [primary.id]: { gravity: 6 },
        [secondary.id]: { gravity: 8 },
      }),
    );
    assert.equal(
      calls.length,
      1,
      "Relative arithmetic needs intent interpretation only",
    );
    assert.equal(
      relative.recipe.document.nodes.find((node) => node.id === primary.id)
        .configuration.gravity,
      3,
    );
    assert.equal(
      relative.recipe.document.nodes.find((node) => node.id === secondary.id)
        .configuration.gravity,
      4,
    );
    assert.equal(relative.expectedInteractionRevision, 2);
    assert.throws(
      () =>
        parseGenerationResult(
          { ...relative, expectedInteractionRevision: 3 },
          request(recipe, "half it"),
        ),
      /dependencies/,
    );

    provider(
      intent(`configure:${primary.id}`, ["gravity"]),
      args({ gravity: 1.62 }),
    );
    const single = await planPrompt(
      request(recipe, "only ball 1 should use Moon gravity"),
    );
    assert.deepEqual(
      single.recipe.document.nodes.find((node) => node.id === secondary.id),
      secondary,
    );

    const arithmetic = premadeRecipe("arithmetic");
    const arithmeticNode = arithmetic.document.nodes.find(
      (node) => node.definition === "models/arithmetic",
    );
    provider(
      intent(`configure:${arithmeticNode.id}`, ["task.a"]),
      args({ "task.a": 7 }),
    );
    const nested = await planPrompt(
      request(arithmetic, "make the first number seven"),
    );
    assert.deepEqual(
      nested.recipe.document.nodes.find((node) => node.id === arithmeticNode.id)
        .configuration.task,
      { ...arithmeticNode.configuration.task, a: 7 },
    );

    provider(
      (input) => ({
        mode: "edit",
        selections: [
          {
            candidate: input.candidates.find(
              (candidate) => candidate.operation === "set_lesson",
            ).id,
            scope: "selected",
            fields: ["title"],
          },
        ],
        message: "Rename the lesson",
      }),
      (input) => ({
        operations: [
          {
            candidate: input.operations[0].candidate,
            arguments: { title: "Moon launch" },
          },
        ],
      }),
    );
    const renamed = await planPrompt(request(recipe, "call this Moon launch"));
    assert.deepEqual(renamed.recipe.document.lesson, {
      ...recipe.document.lesson,
      title: "Moon launch",
    });
    assert.equal(renamed.recipe.title, "Moon launch");

    provider(
      (input) => ({
        mode: "runtime",
        selections: [
          {
            candidate: input.candidates.find(
              (candidate) =>
                candidate.node === primary.id && candidate.command === "LAUNCH",
            ).id,
            scope: "selected",
            fields: [],
          },
        ],
        message: "Launch ball 1",
      }),
      (input) => ({
        operations: [
          { candidate: input.operations[0].candidate, arguments: {} },
        ],
      }),
    );
    const runtime = await planPrompt(request(recipe, "launch ball 1 now"));
    assert.equal(runtime.status, "runtime_action");
    assert.deepEqual(runtime.commands, [
      { node: primary.id, command: "LAUNCH", arguments: {} },
    ]);

    provider(() => ({
      mode: "clarify",
      selections: [],
      message: "Which ball should change?",
    }));
    const clarification = await planPrompt(
      request(recipe, "make that different"),
    );
    assert.equal(clarification.status, "clarification");
    assert.equal(calls.length, 1);
    assert.equal(clarification.message, "Which ball should change?");
    provider((input) => {
      assert.deepEqual(input.clarification, {
        prompt: "use Moon gravity",
        question: "Which ball should change?",
      });
      return intent(`configure:${primary.id}`, ["gravity"], "all_matching", [
        { field: "gravity", operation: "set", operand: 1.62 },
      ])();
    });
    const continued = await planPrompt({
      ...request(recipe, "both"),
      clarification: {
        prompt: "use Moon gravity",
        question: "Which ball should change?",
      },
    });
    assert.equal(
      continued.recipe.document.nodes.find((node) => node.id === secondary.id)
        .configuration.gravity,
      1.62,
    );
    provider(intent(`configure:${primary.id}`, ["__proto__"]));
    await assert.rejects(
      planPrompt(request(recipe, "change a setting")),
      /actual editable fields/,
    );

    provider(
      intent(`configure:${primary.id}`, ["gravity"], "all_matching"),
      (input, invalid) =>
        args(invalid ? { gravity: 1.62, velocity: 30 } : { gravity: 1.62 })(
          input,
        ),
      true,
    );
    const repaired = await planPrompt(request(recipe, "use Moon gravity"));
    assert.equal(repaired.status, "updated");
    assert.equal(calls.length, 3);
    assert.equal(
      repaired.recipe.document.nodes.find((node) => node.id === primary.id)
        .configuration.velocity,
      primary.configuration.velocity,
    );
    provider(
      intent(`configure:${primary.id}`, ["gravity"]),
      args({ gravity: -1 }),
    );
    await assert.rejects(
      planPrompt(request(recipe, "use negative gravity")),
      /invalid stage arguments/,
    );
    assert.equal(calls.length, 3);
    assert.deepEqual(
      recipe,
      before,
      "Rejected operations leave the source untouched",
    );

    const session = activateRecipeSession(recipe);
    const context = session.requestContext();
    assert.ok(
      Object.hasOwn(context.runtimeContext, primary.id),
      "All registered models supply live edit context",
    );
    provider(
      intent(`configure:${primary.id}`, ["gravity"], "all_matching"),
      args({ gravity: 1.62 }),
    );
    const sessionRequest = {
      ...request(recipe, "use Moon gravity"),
      active: context,
    };
    const update = await planPrompt(sessionRequest);
    acceptGenerationResult(update, sessionRequest);
    assert.equal(session.runtime.getSnapshot().state[primary.id].gravity, 1.62);
    assert.ok(session.undo());
    assert.equal(session.runtime.getSnapshot().state[primary.id].gravity, 9.81);
    assert.ok(session.redo());
    assert.equal(session.runtime.getSnapshot().state[primary.id].gravity, 1.62);
    const revision = session.authoredRevision;
    const sameRequest = {
      ...request(recipe, "use Moon gravity"),
      active: session.requestContext(),
    };
    provider(
      intent(`configure:${primary.id}`, ["gravity"], "all_matching", [
        { field: "gravity", operation: "set", operand: 1.62 },
      ]),
    );
    acceptGenerationResult(await planPrompt(sameRequest), sameRequest);
    assert.equal(
      session.authoredRevision,
      revision,
      "An idempotent edit does not create another history entry",
    );
    disposeRecipeSession();
    console.log(
      "Editing passed: shared and selected scope, Moon values, live relative arithmetic, nested siblings, lesson wording, runtime actions, clarification, bounded repair, rollback, metadata, revisions and undo/redo. Natural-language understanding is covered by live Playwright QA.",
    );
  } finally {
    global.fetch = originalFetch;
    disposeRecipeSession();
    for (const key of Object.keys(process.env))
      if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
