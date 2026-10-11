const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { ConstructionPublisher } = load(
  "src/lib/planner/constructionPublisher.ts",
);
const { parseConstructionUpdate, STREAM_FRAME_BYTE_LIMIT } = load(
  "src/lib/planner/construction.ts",
);
const { generationEventStream } = load("src/lib/planner/eventStream.ts");
const { requestGeneration } = load("src/lib/planner/browser.ts");
const { parseGenerationRequest } = load("src/lib/planner/schema.ts");
const { emptyAuthoredDocument } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { AuthoringTransaction } = load(
  "src/simulations/runtime/authoring/transaction.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { createFreshDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const {
  contentFingerprint,
  constructionPreview,
  completedExperiment,
  presentationPause,
} = load("src/simulations/builder/composition/constructionPreview.ts");
const { finalizeRecipe } = load(
  "src/simulations/runtime/authoring/operations.ts",
);
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { stepSpring, springFrequency } = load(
  "src/simulations/components/systems/exploration/spring.ts",
);
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { focusCompositionTools, requestedControlTools } = load(
  "src/lib/planner/compositionTools.ts",
);
const { buildTurnTools } = load("src/lib/planner/turnSchema.ts");
const { buildInitialCard } = load("src/lib/planner/bucket.ts");
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const originalFetch = global.fetch;
const originalEnv = { ...process.env };
const input = {
  protocolVersion: 1,
  requestId: "construction-test",
  prompt: "Show me how springs work.",
  destination: "builder",
  construction: "live",
  viewport: { width: 1280, height: 900 },
  active: null,
};
function result(document) {
  return {
    protocolVersion: 1,
    requestId: input.requestId,
    status: "created",
    expectedSessionId: null,
    expectedAuthoredRevision: null,
    recipe: finalizeRecipe(document, { id: "generated/test" }),
    coverage: {
      level: "full",
      covered: ["spring"],
      omitted: [],
      explanation: "",
    },
  };
}
(async () => {
  try {
    assert.equal(parseGenerationRequest(input).destination, "builder");
    assert.throws(
      () => parseGenerationRequest({ ...input, destination: "lesson" }),
      /builder/,
    );
    assert.throws(
      () => parseGenerationRequest({ ...input, construction: "pretend" }),
      /builder/,
    );
    const empty = emptyAuthoredDocument();
    const spring = new AuthoringTransaction("mass-control-regression");
    for (const operation of [
      {
        tool: "insert_component",
        arguments: {
          definition: "models/SpringMass",
          version: 1,
          configuration: publicDefinition("models/SpringMass").defaults,
          alias: "spring",
        },
      },
      {
        tool: "insert_component",
        arguments: {
          definition: "appearance/SpringMass",
          version: 1,
          configuration: {},
          alias: "visual",
        },
      },
      {
        tool: "connect",
        arguments: {
          from: { node: "spring", port: "appearance" },
          to: { node: "visual", port: "model" },
        },
      },
      {
        tool: "add_control",
        arguments: {
          target: "spring",
          command: "set:stiffness",
          field: "value",
          widget: "slider",
          label: "Stiffness",
        },
      },
      {
        tool: "add_control",
        arguments: {
          target: "spring",
          command: "RELEASE",
          field: "",
          widget: "button",
          label: "Release",
        },
      },
      {
        tool: "arrange",
        arguments: {
          template: "scene-with-sidebar",
          main: [],
          controls: [],
          results: [],
          narrowOrder: [],
          preserveLocked: true,
        },
      },
    ]) {
      const receipt = spring.execute({
        draftId: spring.draftId,
        expectedRevision: spring.revision,
        operationId: `mass-${spring.revision}`,
        request: operation,
      });
      assert.equal(receipt.status, "applied", receipt.summary);
    }
    const springBucket = spring.document.nodes.map((node) =>
      buildInitialCard(node.definition),
    );
    const springTools = buildTurnTools(spring.document, springBucket);
    for (const prompt of [
      "can you add mass changing",
      "add a mass control",
      "add a mass slider",
    ]) {
      const additions = requestedControlTools(
        spring.document,
        springTools,
        prompt,
      );
      assert.ok(additions.length > 0, prompt);
      assert.ok(
        additions.every(
          (tool) => tool.schema.properties.command.values[0] === "set:mass",
        ),
        prompt,
      );
      const focused = focusCompositionTools(
        spring.document,
        springBucket,
        springTools,
        "models/SpringMass",
        additions,
      );
      assert.ok(
        additions.every((tool) => focused.includes(tool)),
        "Completed spring must expose requested optional controls",
      );
    }
    assert.equal(
      requestedControlTools(
        spring.document,
        springTools,
        "make the mass heavier",
      ).length,
      0,
      "Parameter edits remain parameter edits",
    );
    const document = premadeRecipe("area-perimeter").document;
    const events = [];
    const publisher = new ConstructionPublisher(
      input.requestId,
      empty,
      async (e) => events.push(parseConstructionUpdate(e)),
      new AbortController().signal,
    );
    await publisher.publish(document, 1, "arrangement");
    const final = publisher.finalize(document);
    await publisher.publish(final, 1, "checking");
    assert.ok(
      events.filter((e) => e.phase === "components").length > 1,
      "Recipe expands piece by piece",
    );
    const componentEvents = events.filter((e) => e.phase === "components");
    assert.ok(
      componentEvents.every((e) => e.document.connections.length === 0),
      "New wiring waits for component phase",
    );
    assert.deepEqual(
      componentEvents.map((e) => e.document.nodes.length),
      componentEvents.map((_, i) => i + 1),
    );
    const connectionEvents = events.filter((e) => e.phase === "connections");
    assert.equal(connectionEvents.length, document.connections.length);
    assert.deepEqual(
      connectionEvents.map((e) => e.document.connections.length),
      connectionEvents.map((_, i) => i + 1),
    );
    assert.equal(events.at(-2).phase, "arrangement");
    assert.equal(events.at(-1).phase, "checking");
    assert.deepEqual(events.at(-1).document, final);
    assert.deepEqual(
      document,
      premadeRecipe("area-perimeter").document,
      "Presentation cannot mutate canonical recipe",
    );
    for (const e of events) validateAuthoredDocument(e.document);
    await assert.rejects(publisher.publish(document, 0), /regressed/);
    assert.throws(
      () =>
        parseConstructionUpdate({
          ...events[0],
          affected: { nodes: ["missing"], connections: [] },
        }),
      /identities/,
    );
    assert.throws(
      () => parseConstructionUpdate({ ...events[0], privateReasoning: "no" }),
      /Unknown/,
    );
    assert.throws(() =>
      parseConstructionUpdate({
        ...events[0],
        document: {
          ...events[0].document,
          nodes: [{ ...events[0].document.nodes[0], definition: "invented" }],
        },
      }),
    );
    const base = createFreshDocument();
    const fingerprint = contentFingerprint(base);
    const preview = constructionPreview(base, events[0]);
    assert.equal(contentFingerprint(base), fingerprint);
    assert.notEqual(contentFingerprint(preview), fingerprint);
    const zoomed = structuredClone(base);
    zoomed.editor.zoom = 0.5;
    zoomed.authored.editor.zoom = 0.5;
    assert.equal(contentFingerprint(zoomed), fingerprint);
    const completed = completedExperiment(zoomed, result(final));
    assert.equal(completed.editor.zoom, 0.5);
    assert.equal(
      contentFingerprint(base),
      fingerprint,
      "Commit preparation is isolated",
    );
    const aborted = new AbortController();
    const pause = presentationPause(aborted.signal, 10000);
    aborted.abort();
    await assert.rejects(pause);

    const wire = [
      ...events,
      {
        type: "result",
        requestId: input.requestId,
        result: {
          protocolVersion: 1,
          status: "unsupported",
          requestId: input.requestId,
          message: "Test finished.",
        },
      },
    ];
    const response = (list) =>
      new Response(
        generationEventStream(new AbortController().signal, async (writer) => {
          for (const event of list) await writer.send(event);
        }),
        {
          headers: {
            "Content-Type": "application/x-ndjson",
            "X-Request-ID": input.requestId,
          },
        },
      );
    global.fetch = async () => response(wire);
    const seen = [];
    await requestGeneration(
      input,
      new AbortController().signal,
      undefined,
      undefined,
      async (e) => {
        seen.push(e.sequence);
      },
    );
    assert.deepEqual(
      seen,
      events.map((e) => e.sequence),
    );
    for (const bad of [
      [events[1]],
      [events[0], events[0]],
      [events[0], { ...events[1], draftRevision: 0 }],
      [wire.at(-1), events[0]],
    ]) {
      global.fetch = async () => response(bad);
      await assert.rejects(
        requestGeneration(
          input,
          new AbortController().signal,
          undefined,
          undefined,
          () => {},
        ),
        /order|after/,
      );
    }
    global.fetch = async () => response([events[0]]);
    await assert.rejects(
      requestGeneration(
        input,
        new AbortController().signal,
        undefined,
        undefined,
        () => {},
      ),
      /ended before/,
    );
    global.fetch = async () => response([{ ...events[0], requestId: "wrong" }]);
    await assert.rejects(
      requestGeneration(
        input,
        new AbortController().signal,
        undefined,
        undefined,
        () => {},
      ),
      /correlation/,
    );
    const oversize = generationEventStream(
      new AbortController().signal,
      async (w) => w.send({ value: "x".repeat(STREAM_FRAME_BYTE_LIMIT) }),
    );
    await assert.rejects(new Response(oversize).text(), /byte budget/);
    let cancelledSignal;
    const stream = generationEventStream(
      new AbortController().signal,
      async (writer, signal) => {
        cancelledSignal = signal;
        for (let i = 0; i < 20; i++)
          await writer.send({ value: "x".repeat(500000) });
      },
    );
    await new Promise((r) => setTimeout(r, 5));
    await stream.cancel();
    assert.ok(
      cancelledSignal.aborted,
      "Cancellation releases a producer blocked by backpressure",
    );

    const operationDeadline = new AbortController();
    let blockedFinished = false;
    const deadlineStream = generationEventStream(
      new AbortController().signal,
      async (writer) => {
        try {
          for (let i = 0; i < 20; i++)
            await writer.send(
              { value: "x".repeat(500000) },
              operationDeadline.signal,
            );
        } finally {
          blockedFinished = true;
        }
      },
    );
    await new Promise((r) => setTimeout(r, 5));
    operationDeadline.abort();
    await new Promise((r) => setTimeout(r, 5));
    assert.ok(
      blockedFinished,
      "Operation deadline releases producer without consumer cancellation",
    );
    await assert.rejects(new Response(deadlineStream).text());

    const state = {
      mass: 1,
      stiffness: 20,
      damping: 0,
      amplitude: 0.3,
      displacement: 0.3,
      velocity: 0,
      playing: true,
    };
    assert.equal(
      springFrequency({ ...state, stiffness: 80 }) / springFrequency(state),
      2,
    );
    const quarter = stepSpring(state, Math.PI / (2 * Math.sqrt(20)));
    assert.ok(Math.abs(quarter.displacement) < 1e-12);
    assert.ok(Math.abs(quarter.velocity + 0.3 * Math.sqrt(20)) < 1e-12);
    const energy = (s) =>
      0.5 * s.mass * s.velocity ** 2 + 0.5 * s.stiffness * s.displacement ** 2;
    assert.ok(Math.abs(energy(quarter) - energy(state)) < 1e-12);
    for (const damping of [0.3, 2 * Math.sqrt(20), 10]) {
      let current = { ...state, damping };
      const initialEnergy = energy(current);
      for (let i = 0; i < 100; i++) {
        const next = stepSpring(current, 0.1);
        assert.ok(energy(next) <= energy(current) + 1e-12);
        current = next;
      }
      assert.ok(energy(current) < initialEnergy);
    }
    assert.deepEqual(stepSpring({ ...state, playing: false }, 0.1), {
      ...state,
      playing: false,
    });
    assert.throws(() => stepSpring(state, Infinity));
    // Independent RK4 integration oracle, not a copy of the closed-form implementation.
    let x = 0.3,
      v = 0;
    const dt = 0.0001,
      damp = 0.8;
    const acceleration = (x, v) => -20 * x - damp * v;
    for (let i = 0; i < 10000; i++) {
      const a1 = acceleration(x, v),
        x2 = x + (dt * v) / 2,
        v2 = v + (dt * a1) / 2;
      const a2 = acceleration(x2, v2),
        x3 = x + (dt * v2) / 2,
        v3 = v + (dt * a2) / 2;
      const a3 = acceleration(x3, v3),
        x4 = x + dt * v3,
        v4 = v + dt * a3;
      const a4 = acceleration(x4, v4);
      x += (dt * (v + 2 * v2 + 2 * v3 + v4)) / 6;
      v += (dt * (a1 + 2 * a2 + 2 * a3 + a4)) / 6;
    }
    const exact = stepSpring({ ...state, damping: damp }, 1);
    assert.ok(
      Math.abs(x - exact.displacement) < 1e-10 &&
        Math.abs(v - exact.velocity) < 1e-10,
    );
    const tx = new AuthoringTransaction("spring");
    const operation = (request) => {
      const receipt = tx.execute({
        draftId: tx.draftId,
        expectedRevision: tx.revision,
        operationId: `test-${tx.revision}`,
        request,
      });
      assert.equal(receipt.status, "applied", JSON.stringify(receipt.issues));
    };
    operation({
      tool: "insert_component",
      arguments: {
        definition: "models/SpringMass",
        version: 1,
        alias: "spring",
        configuration: publicDefinition("models/SpringMass").defaults,
      },
    });
    operation({
      tool: "insert_component",
      arguments: {
        definition: "appearance/SpringMass",
        version: 1,
        alias: "visual",
        configuration: {},
      },
    });
    operation({
      tool: "connect",
      arguments: {
        from: { node: "spring", port: "appearance" },
        to: { node: "visual", port: "model" },
      },
    });
    operation({
      tool: "add_control",
      arguments: {
        target: "spring",
        command: "set:stiffness",
        field: "value",
        widget: "slider",
        label: "Spring stiffness",
      },
    });
    operation({
      tool: "add_control",
      arguments: {
        target: "spring",
        command: "RELEASE",
        field: "",
        widget: "button",
        label: "Release the mass",
      },
    });
    validateAuthoredDocument(tx.document, true);
    const runtime = new DocumentRuntime(tx.document);
    const modelId = tx.handles.spring;
    assert.equal(
      runtime.dispatch([{ node: modelId, command: "RELEASE", arguments: {} }])
        .accepted,
      true,
    );
    runtime.step(0.1);
    assert.ok(runtime.getSnapshot().outputs[modelId].displacement < 0.3);
    runtime.dispose();
    // Operation choice and argument generation are separate bounded contracts.
    Object.assign(process.env, {
      LLM_PROVIDER: "apertus",
      APERTUS_PROVIDER: "local",
      APERTUS_LOCAL_RUNTIME: "mlx",
      APERTUS_BASE_URL: "http://127.0.0.1:43101/v1",
      APERTUS_MODEL: "fixture",
      LLM_STRUCTURED_OUTPUT: "strict-json",
    });
    const { focusedTurn } = load("src/lib/planner/focusedTurn.ts");
    const { GenerationBudget } = load("src/lib/planner/budget.ts");
    const { object, choice, num } = load(
      "src/simulations/runtime/parameterSchema.ts",
    );
    const tools = [
      {
        tool: "configure",
        schema: object({
          target: choice("spring"),
          changes: object({ stiffness: num(1, 100) }),
        }),
      },
      { tool: "set_lesson", schema: object({ title: choice("Springs") }) },
    ];
    let choices = 0,
      fieldsCalls = 0,
      argumentsCalls = 0;
    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      const input = JSON.parse(body.messages.at(-1).content);
      let content;
      if (input.candidates) {
        choices++;
        content = JSON.stringify({
          candidate: choices === 1 ? "candidate1" : "done",
        });
      } else if (input.availableSettings) {
        fieldsCalls++;
        content = JSON.stringify({ field: "stiffness" });
      } else {
        argumentsCalls++;
        content = JSON.stringify({
          target: "spring",
          changes: { stiffness: 40 },
        });
      }
      return Response.json({
        choices: [{ finish_reason: "stop", message: { content } }],
      });
    };
    const budget = new GenerationBudget();
    const edit = await focusedTurn(
      "Make the spring stronger",
      tools,
      {
        nodes: [
          {
            id: "spring",
            definition: "models/SpringMass",
            config: { stiffness: 20 },
          },
        ],
      },
      budget,
      0,
    );
    assert.deepEqual(edit.request, {
      tool: "configure",
      arguments: { target: "spring", changes: { stiffness: 40 } },
    });
    const done = await focusedTurn(
      "Make the spring stronger",
      tools,
      {},
      budget,
      1,
      undefined,
      true,
    );
    assert.equal(done.action, "done");
    assert.equal(done.request, null);
    assert.equal(choices, 2);
    assert.equal(argumentsCalls, 1);
    assert.equal(fieldsCalls, 1);
    assert.equal(budget.calls, 4);
    // Exercise the full planner loop: an optional control must survive completion,
    // and a later configure call must not discard or alter the requested extension.
    process.env.COMPOSITION_DECISION_POLICY = "required-laya";
    process.env.PLANNER_MODE = "hybrid";
    process.env.DECISION_PROVIDER = "laya";
    const { compose } = load("src/lib/planner/compose.ts");
    const operations = [];
    const extensionBudget = new GenerationBudget(undefined, (event, data) => {
      if (event === "turn.executed") operations.push(data.tool);
    });
    Object.defineProperty(extensionBudget, "decision", {
      value: {
        policy: { probabilityGate: 0.75, confidenceGate: 0.75 },
        provider: async ({ questions }) => {
          const key = "spring";
          assert.ok(key in questions.strategy.criteria);
          return {
            provider: "laya",
            model: "fixture",
            answers: {
              strategy: {
                choice: key,
                confidence: 1,
                probabilities: Object.fromEntries(
                  Object.keys(questions.strategy.criteria).map((choice) => [
                    choice,
                    choice === key ? 1 : 0,
                  ]),
                ),
              },
            },
          };
        },
      },
    });
    global.fetch = async (_url, options) => {
      const body = JSON.parse(options.body);
      const input = JSON.parse(body.messages.at(-1).content);
      assert.ok(
        input.exampleResponse,
        "No extra choice/configure calls after the control is connected",
      );
      const args = input.exampleResponse;
      if (args.command) {
        assert.equal(args.command, "set:mass");
        args.widget = "slider";
        args.label = "Mass";
      }
      return Response.json({
        choices: [
          { finish_reason: "stop", message: { content: JSON.stringify(args) } },
        ],
      });
    };
    const extended = await compose(
      {
        ...input,
        prompt: "can you add mass changing",
        active: {
          sessionId: "existing",
          authoredRevision: 1,
          recipe: finalizeRecipe(spring.document, { id: "generated/spring" }),
        },
      },
      {
        goal: "Explore changing mass",
        concepts: ["spring", "mass"],
        interactions: ["modify mass parameter"],
        observations: [],
        explicitConstraints: [],
        suggestedStructure: "single",
      },
      extensionBudget,
    );
    assert.equal(extended.status, "updated");
    assert.ok(
      !extended.coverage.omitted.some((item) => /mass/i.test(item)),
      "Spring mass is a supported quantity",
    );
    assert.deepEqual(operations, ["add_control", "arrange"]);
    assert.equal(extensionBudget.calls, 2);
    assert.equal(
      extended.recipe.document.nodes.length,
      spring.document.nodes.length + 1,
    );
    assert.deepEqual(
      extended.recipe.document.nodes.find(
        (node) => node.id === spring.handles.spring,
      ).configuration,
      spring.document.nodes.find((node) => node.id === spring.handles.spring)
        .configuration,
    );
    console.log(
      "Construction passed: staged real recipe, structural snapshots, order/correlation/bounds, cancellation/backpressure, isolated commit preparation, navigation, and independent spring physics/runtime.",
    );
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env))
      if (!(key in originalEnv)) delete process.env[key];
    Object.assign(process.env, originalEnv);
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
