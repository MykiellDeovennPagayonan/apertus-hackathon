const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const { cases } = require("./cases.cjs");
const { AuthoringTransaction } = load(
  "src/simulations/runtime/authoring/transaction.ts",
);
const { finalizeRecipe } = load(
  "src/simulations/runtime/authoring/operations.ts",
);
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { parseRecipe } = load("src/simulations/runtime/recipes/schema.ts");
const { serializeRecipe } = load(
  "src/simulations/runtime/recipes/serializeRecipe.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const {
  RecipeSession,
  activateRecipeSession,
  acceptGenerationResult,
  disposeRecipeSession,
} = load("src/simulations/runtime/recipeSession.ts");
const {
  parseGenerationRequest,
  parseGenerationResult,
  parseIntent,
  REQUEST_BYTE_LIMIT,
} = load("src/lib/planner/schema.ts");
const { toJsonSchema } = load("src/lib/apertus/structuredSchema.ts");
const { planPrompt } = load("src/lib/planner/index.ts");
const { requestStructured, clearStructuredCapabilities } = load(
  "src/lib/apertus/transport.ts",
);
const { GenerationBudget } = load("src/lib/planner/budget.ts");
const { coverageFor } = load("src/lib/planner/coverage.ts");
const { capabilityCards, retrieveCapabilities } = load(
  "src/lib/planner/catalog.ts",
);
const { acceptChoice } = load("src/lib/planner/selection/acceptance.ts");
const { arrangeDocument } = load(
  "src/simulations/runtime/authoring/arrangement.ts",
);
const { object, choice, num } = load(
  "src/simulations/runtime/parameterSchema.ts",
);
const apply = (draft, request, id = `op-${draft.revision}`) =>
  draft.execute({
    draftId: draft.draftId,
    expectedRevision: draft.revision,
    operationId: id,
    request,
  });
const arrange = {
  tool: "arrange",
  arguments: {
    template: "comparison",
    main: [],
    controls: [],
    results: [],
    narrowOrder: [],
    preserveLocked: true,
  },
};
function direct(c) {
  const draft = new AuthoringTransaction(`direct-${c.id}`);
  const slug = c.id === "rectangles" ? "area-perimeter" : c.id;
  const operations = c.overrides.map((i) => ({
    tool: "insert_recipe",
    arguments: { recipe: slug, version: 1, ...i },
  }));
  operations.push(
    { tool: "set_lesson", arguments: premadeRecipe(slug).document.lesson },
    arrange,
  );
  assert.equal(apply(draft, operations).status, "applied");
  return { draft, recipe: finalizeRecipe(draft.document) };
}
const authored = cases.map(direct);
const rectangle = authored[1];
assert.equal(
  rectangle.recipe.document.presentation.items.length,
  10,
  "Every scene, field, and result is independent",
);
const runtime = loadRecipe(rectangle.recipe).runtime;
assert.deepEqual(runtime.getSnapshot().outputs["A/model"], {
  area: 24,
  perimeter: 20,
});
assert.deepEqual(runtime.getSnapshot().outputs["B/model"], {
  area: 16,
  perimeter: 20,
});
assert.ok(runtime.submit("A/input/width", { value: 7 }).accepted);
assert.equal(runtime.getSnapshot().state["A/model"].height, 4);
assert.deepEqual(runtime.getSnapshot().outputs["A/model"], {
  area: 28,
  perimeter: 22,
});
assert.deepEqual(runtime.getSnapshot().outputs["B/model"], {
  area: 16,
  perimeter: 20,
});
assert.ok(runtime.submit("B/input/height", { value: 3 }).accepted);
assert.equal(runtime.getSnapshot().state["B/model"].width, 8);
assert.deepEqual(runtime.getSnapshot().outputs["B/model"], {
  area: 24,
  perimeter: 22,
});
const accepted = structuredClone(runtime.getSnapshot());
assert.equal(runtime.submit("A/input/width", { value: 0 }).accepted, false);
assert.deepEqual(runtime.getSnapshot(), accepted);
runtime.updateDocument(rectangle.draft.document);
assert.deepEqual(
  runtime.getSnapshot(),
  accepted,
  "Presentation does not reset exploration",
);
const before = rectangle.draft.document;
for (const template of ["vertical", "scene-with-sidebar", "comparison"]) {
  const laidOut = arrangeDocument(before, { ...arrange.arguments, template });
  const items = laidOut.presentation.items;
  for (let i = 0; i < items.length; i++)
    for (let j = i + 1; j < items.length; j++) {
      const a = items[i].rect;
      const b = items[j].rect;
      assert.ok(
        a.x + a.width <= b.x ||
          b.x + b.width <= a.x ||
          a.y + a.height <= b.y ||
          b.y + b.height <= a.y,
        `${template}: independently selectable cards must not overlap`,
      );
    }
  assert.deepEqual(laidOut.nodes, before.nodes);
}
const lockedDocument = structuredClone(before);
lockedDocument.presentation.items[0].locked = true;
const lockedItem = structuredClone(lockedDocument.presentation.items[0]);
const withLock = arrangeDocument(lockedDocument, arrange.arguments);
assert.deepEqual(
  withLock.presentation.items.find((i) => i.id === lockedItem.id),
  lockedItem,
);
const rev = rectangle.draft.revision;
const bad = [
  { tool: "configure", arguments: { target: "A", changes: { width: 9 } } },
  { tool: "configure", arguments: { target: "B", changes: { height: 0 } } },
];
assert.equal(apply(rectangle.draft, bad, "bad").status, "rejected");
assert.deepEqual(rectangle.draft.document, before);
assert.equal(rectangle.draft.revision, rev);
assert.equal(
  rectangle.draft.execute({
    draftId: rectangle.draft.draftId,
    expectedRevision: 0,
    operationId: "stale",
    request: arrange,
  }).status,
  "rejected",
);
const envelope = {
  draftId: rectangle.draft.draftId,
  expectedRevision: rev,
  operationId: "once",
  request: {
    tool: "configure",
    arguments: { target: "A", changes: { width: 9 } },
  },
};
const receipt = rectangle.draft.execute(envelope);
assert.equal(receipt.status, "applied");
assert.deepEqual(rectangle.draft.execute(envelope), receipt);
assert.equal(
  rectangle.draft.execute({ ...envelope, request: arrange }).status,
  "rejected",
);
const crossed = apply(
  rectangle.draft,
  {
    tool: "connect",
    arguments: {
      from: { node: "A/input/width", port: "submit" },
      to: { node: "B/model", port: "SET_DIMENSIONS" },
    },
  },
  "crossed",
);
assert.equal(crossed.status, "rejected");
assert.match(crossed.issues[0].message, /scope/);
const changed = finalizeRecipe(rectangle.draft.document);
assert.deepEqual(parseRecipe(serializeRecipe(changed)), changed);
assert.deepEqual(
  JSON.parse(serializeDocument(parseDocument(serializeRecipe(changed)))),
  changed,
);
assert.equal(
  changed.document.groups
    .find((g) => g.members.includes("A/model"))
    .parameters.find((p) => p.name === "width").default,
  9,
);
// Adding a readout uses real ports; no invented outputs or disconnected placeholders.
assert.equal(
  apply(
    rectangle.draft,
    {
      tool: "add_observation",
      arguments: {
        source: "B",
        output: "area",
        widget: "readout",
        label: "B area again",
      },
    },
    "area-again",
  ).status,
  "applied",
);
assert.equal(
  apply(
    rectangle.draft,
    {
      tool: "add_observation",
      arguments: {
        source: "B",
        output: "deflection",
        widget: "readout",
        label: "Fake",
      },
    },
    "fake",
  ).status,
  "rejected",
);
const bridge = authored[2];
const bridgeRuntime = loadRecipe(bridge.recipe).runtime;
assert.ok(
  bridgeRuntime.submit("A/control/MOVE_LOAD", { value: 0.25 }).accepted,
);
assert.equal(bridgeRuntime.getSnapshot().state["A/load"].magnitude, 10);
assert.deepEqual(
  bridgeRuntime.getSnapshot().outputs["A/model"].response.supportShares,
  [7.5, 2.5],
);
const topologySnapshot = bridge.draft.document;
assert.equal(
  apply(
    bridge.draft,
    {
      tool: "regenerate_truss",
      arguments: { target: "A", spanScale: 2, dense: true },
    },
    "topology",
  ).status,
  "applied",
);
finalizeRecipe(bridge.draft.document);
const outside = new AuthoringTransaction("outside", topologySnapshot);
assert.equal(
  apply(
    outside,
    {
      tool: "add_observation",
      arguments: {
        source: "A/generated/b0",
        output: "data",
        widget: "inspector",
        label: "Joint inspection",
      },
    },
    "external",
  ).status,
  "applied",
);
const outsideBefore = outside.document;
assert.equal(
  apply(
    outside,
    {
      tool: "regenerate_truss",
      arguments: { target: "A/model", spanScale: 2, dense: true },
    },
    "blocked-topology",
  ).status,
  "rejected",
);
assert.deepEqual(outside.document, outsideBefore);
const arithmetic = loadRecipe(authored[0].recipe).runtime;
assert.equal(arithmetic.getSnapshot().state["A/model"].sequence.cursor, 0);
arithmetic.step(0.5);
assert.equal(arithmetic.getSnapshot().state["A/model"].sequence.cursor, 0);
for (let i = 0; i < 4; i++)
  assert.ok(
    arithmetic.dispatch([
      { node: "A/model", command: "NEXT_STEP", arguments: {} },
    ]).accepted,
  );
assert.equal(arithmetic.getSnapshot().state["A/model"].result, 11);
assert.ok(arithmetic.reset().accepted);
assert.equal(arithmetic.getSnapshot().state["A/model"].a, 7);
for (const slug of ["arithmetic", "area-perimeter", "bridge"]) {
  const d = new AuthoringTransaction(`defaults-${slug}`);
  assert.equal(
    apply(d, {
      tool: "insert_recipe",
      arguments: { recipe: slug, version: 1, alias: "Fresh", overrides: {} },
    }).status,
    "applied",
  );
  const source = premadeRecipe(slug);
  for (const param of source.parameters)
    assert.deepEqual(
      d.document.nodes.find((n) => n.id === `Fresh/${param.node}`)
        .configuration[param.field],
      param.default,
    );
}
const session = new RecipeSession(rectangle.recipe);
assert.equal(session.interactionRevision, 0);
session.runtime.step(0.1);
assert.equal(session.interactionRevision, 0);
assert.ok(session.runtime.submit("B/input/width", { value: 10 }).accepted);
assert.equal(session.interactionRevision, 1);
const coverage = {
  level: "full",
  covered: ["area", "perimeter"],
  omitted: [],
  explanation: "",
};
session.acceptUpdate({
  protocolVersion: 1,
  status: "updated",
  requestId: "edit",
  expectedSessionId: session.sessionId,
  expectedAuthoredRevision: 0,
  recipe: changed,
  coverage,
});
assert.equal(session.authoredRevision, 1);
assert.equal(
  session.runtime.getSnapshot().state["B/model"].width,
  10,
  "Unchanged scope keeps exploration",
);
assert.equal(
  session.recipe.document.nodes.find((n) => n.id === "B/model").configuration
    .width,
  8,
  "Exploration is not captured",
);
assert.equal(session.undo(), true);
assert.equal(session.authoredRevision, 2);
assert.equal(session.redo(), true);
const request = {
  protocolVersion: 1,
  requestId: "request",
  prompt: "Compare rectangles",
  viewport: { width: 1440, height: 900 },
  active: session.requestContext(),
};
assert.deepEqual(parseGenerationRequest(request), request);
assert.throws(() =>
  parseGenerationRequest({ ...request, viewport: { width: 0, height: 900 } }),
);
assert.throws(() =>
  parseGenerationRequest({ ...request, prompt: "x".repeat(4001) }),
);
assert.throws(() => parseGenerationRequest({ ...request, extra: true }));
assert.ok(
  new TextEncoder().encode(
    JSON.stringify({
      ...request,
      active: { ...request.active, recipe: bridge.recipe },
    }),
  ).byteLength > 16000,
);
const invalidResult = {
  protocolVersion: 1,
  status: "updated",
  requestId: "request",
  expectedSessionId: session.sessionId,
  expectedAuthoredRevision: session.authoredRevision,
  recipe: changed,
  coverage,
};
parseGenerationResult(invalidResult, request);
assert.throws(() =>
  parseGenerationResult({ ...invalidResult, requestId: "wrong" }, request),
);
const protocolSession = activateRecipeSession(rectangle.recipe);
const runtimeRequest = { ...request, active: protocolSession.requestContext() };
protocolSession.runtime.submit("A/input/width", { value: 7 });
assert.throws(
  () =>
    acceptGenerationResult(
      {
        protocolVersion: 1,
        status: "runtime_action",
        requestId: "request",
        expectedSessionId: protocolSession.sessionId,
        expectedInteractionRevision: 0,
        commands: [{ node: "A/model", command: "RESET", arguments: {} }],
        message: "Reset",
      },
      runtimeRequest,
    ),
  /changed/,
);
assert.throws(() => activateRecipeSession({ bad: true }));
assert.equal(
  load("src/simulations/runtime/recipeSession.ts").getRecipeSession(),
  protocolSession,
);
assert.equal(
  new TextEncoder().encode("🙂".repeat(300000)).byteLength > REQUEST_BYTE_LIMIT,
  true,
);
const schema = toJsonSchema(
  object(
    {
      amount: num(1, 20, "t", true),
      mode: choice("a", "b"),
      optional: { type: "boolean" },
    },
    ["optional"],
  ),
);
assert.deepEqual(schema.required, ["amount", "mode"]);
assert.equal(schema.additionalProperties, false);
assert.deepEqual(schema.properties.mode.enum, ["a", "b"]);
assert.equal(schema.properties.amount.minimum, 1);
assert.equal(schema.properties.amount.type, "integer");
const sampleIntent = {
  goal: "Explore",
  concepts: ["area"],
  interactions: [],
  observations: [],
  explicitConstraints: [],
  suggestedStructure: "single",
};
assert.throws(() =>
  parseIntent(
    {
      ...sampleIntent,
      explicitConstraints: [{ meaning: "Width", sourceText: "not in request" }],
    },
    "Compare rectangles",
  ),
);
assert.equal(
  retrieveCapabilities(
    "Explain weight, friction, and momentum",
    sampleIntent,
    true,
  ).length,
  0,
);
assert.equal(
  retrieveCapabilities("Explore rectangle area", sampleIntent).length,
  1,
);
assert.equal(
  retrieveCapabilities("Compare arithmetic and rectangle area", sampleIntent)
    .length,
  2,
);
const card = capabilityCards().find((c) => c.recipeSlug === "bridge");
const partial = coverageFor(cases[2].prompt, sampleIntent, card, {
  level: "full",
  covered: ["bridge load response"],
  omitted: [],
  explanation: "",
});
assert.equal(partial.level, "partial");
assert.match(partial.explanation, /unavailable.*conceptual/i);
const question = {
  type: "choice",
  instructions: "pick",
  criteria: { arithmetic: "sum", bridge: "bridge", unclear: "none" },
};
assert.equal(
  acceptChoice(
    {
      choice: "bridge",
      probabilities: { arithmetic: 0.1, bridge: 0.7, unclear: 0.2 },
    },
    question,
    0.9,
  ),
  null,
);
assert.equal(
  acceptChoice(
    {
      choice: "missing",
      probabilities: { arithmetic: 0, bridge: 1, unclear: 0 },
    },
    question,
    0.75,
  ),
  null,
);
assert.equal(
  acceptChoice(
    {
      choice: "bridge",
      probabilities: { arithmetic: NaN, bridge: 1, unclear: 0 },
    },
    question,
    0.75,
  ),
  null,
);
console.log(
  "Shared operations: independent instances, multi-field preservation, atomic rollback, receipts, scopes, topology, typed observations, exact state, round trips, presentation invariance and revisions passed.",
);

const originalFetch = global.fetch;
const originalEnv = { ...process.env };
function mockInference(queue, calls, decisionChoice = null) {
  global.fetch = async (url, options) => {
    const body = JSON.parse(options.body);
    if (
      String(url).includes("/api/decide") ||
      String(url).endsWith("/systemone")
    ) {
      calls.push({ decision: true, body });
      const criteria = Object.keys(body.questions.capability.criteria);
      const answers = {
        capability: {
          type: "choice",
          confidence: 1,
          choice: decisionChoice ?? "unclear",
          probabilities: Object.fromEntries(
            criteria.map((k) => [
              k,
              k === (decisionChoice ?? "unclear") ? 1 : 0,
            ]),
          ),
        },
      };
      return Response.json(
        String(url).endsWith("/systemone")
          ? {
              model: "fixture-jev",
              answers,
              usage: { input_tokens: 42, output_tokens: 8 },
            }
          : { model: "fixture-laya", result: { answers } },
      );
    }
    calls.push(body);
    const next = queue.shift();
    const queued =
      typeof next === "function"
        ? next(JSON.parse(body.messages.find((m) => m.role === "user").content))
        : next;
    const stageMessage = body.messages.find((m) => m.role === "user")?.content;
    const task = stageMessage?.startsWith("{")
      ? JSON.parse(stageMessage).task
      : undefined;
    const value =
      task === "configure_selected_recipe" && queued?.coverage
        ? {
            ...Object.fromEntries(
              Object.entries(queued).filter(([key]) => key !== "coverage"),
            ),
            coverageLevel: queued.coverage.level,
            covered: queued.coverage.covered,
            omitted: queued.coverage.omitted,
            explanation: queued.coverage.explanation,
          }
        : queued;
    assert.notEqual(value, undefined, "Unexpected model call");
    return Response.json({
      model: "fixture-apertus",
      choices: [
        {
          finish_reason: "stop",
          message: {
            content: typeof value === "string" ? value : JSON.stringify(value),
          },
        },
      ],
      usage: { prompt_tokens: 123, completion_tokens: 20, total_tokens: 143 },
    });
  };
}
(async () => {
  process.env.APERTUS_STRUCTURED_OUTPUT = "strict-json";
  process.env.PLANNER_MODE = "hybrid";
  process.env.LAYA_BASE_URL = "invalid";
  // Explicit quantities equal to authored defaults do not require redundant overrides.
  const defaultCalls = [];
  mockInference(
    [
      { ...sampleIntent, concepts: ["addition"] },
      {
        instances: [{ alias: "A", overrides: {} }],
        coverage: {
          level: "full",
          covered: ["addition"],
          omitted: [],
          explanation: "",
        },
      },
    ],
    defaultCalls,
  );
  const defaultResult = await planPrompt({
    ...request,
    requestId: "explicit-defaults",
    active: null,
    prompt: "Help me learn addition. Start with 3 circles and add 2.",
  });
  assert.equal(defaultResult.status, "created");
  assert.deepEqual(
    defaultResult.recipe.document.nodes.find(
      (n) => n.definition === "models/arithmetic",
    ).configuration.task,
    premadeRecipe("arithmetic").document.nodes.find(
      (n) => n.definition === "models/arithmetic",
    ).configuration.task,
  );
  assert.equal(defaultCalls.length, 2);
  for (const c of cases) {
    const calls = [];
    const traces = [];
    const intent = {
      ...sampleIntent,
      goal: c.prompt.slice(0, 70),
      concepts: [
        c.id === "rectangles"
          ? "area"
          : c.id === "arithmetic"
            ? "addition"
            : "truss bridge",
      ],
      suggestedStructure: c.id === "rectangles" ? "comparison" : "single",
    };
    mockInference(
      [
        intent,
        {
          instances: c.overrides,
          ...(c.id === "bridge"
            ? {
                lesson: {
                  title: "Unsupported engineering result",
                  instruction: "Show a fabricated unavailable measurement.",
                  explanation: "Invented engineering output.",
                },
              }
            : {}),
          coverage: {
            level: "full",
            covered: intent.concepts,
            omitted: [],
            explanation: "",
          },
        },
      ],
      calls,
    );
    const result = await planPrompt(
      {
        ...request,
        requestId: `fixture-${c.id}`,
        prompt: c.prompt,
        active: null,
      },
      undefined,
      (event, data) => traces.push({ event, data }),
    );
    assert.equal(result.status, "created");
    assert.equal(result.coverage.level, c.coverage);
    assert.equal(
      calls.length,
      2,
      "Clear creation uses two focused calls and skips invalid Laya configuration",
    );
    assert.ok(calls.every((c) => !c.decision));
    assert.ok(
      calls.every((c) => !JSON.stringify(c.messages).includes("generated/b0")),
      "Topology stays out of model context",
    );
    assert.ok(
      traces.some(
        (t) => t.event === "selection.decision" && t.data.status === "skipped",
      ),
    );
    if (c.id === "bridge") {
      assert.ok(
        result.recipe.document.lesson.explanation.includes(
          result.coverage.explanation,
        ),
      );
      assert.equal(
        result.recipe.document.lesson.title,
        premadeRecipe("bridge").document.lesson.title,
      );
      assert.ok(
        !result.recipe.document.lesson.instruction.includes("fabricated"),
      );
      assert.ok(
        !result.recipe.document.lesson.explanation.includes(
          "Invented engineering",
        ),
      );
    }
  }
  const calls = [];
  mockInference(
    [
      {
        ...sampleIntent,
        goal: "Quantum entanglement",
        concepts: ["quantum entanglement"],
      },
    ],
    calls,
  );
  assert.equal(
    (
      await planPrompt({
        ...request,
        prompt: "Explain quantum entanglement",
        active: null,
      })
    ).status,
    "unsupported",
  );
  assert.equal(calls.length, 1);
  const repairCalls = [];
  mockInference(
    [
      "```json\n{}\n```",
      sampleIntent,
      { instances: cases[1].overrides, coverage },
    ],
    repairCalls,
  );
  const repaired = await planPrompt({
    ...request,
    prompt: cases[1].prompt,
    active: null,
  });
  assert.equal(repaired.status, "created");
  assert.equal(repairCalls.length, 3);
  assert.ok(
    !repairCalls[1].messages.some((m) => m.role === "assistant"),
    "Repair does not replay failed output",
  );
  assert.match(repairCalls[1].messages[0].content, /Exact validation issue/);
  const invalid = [];
  mockInference(["{}", "{}"], invalid);
  await assert.rejects(
    () => planPrompt({ ...request, prompt: "Show addition", active: null }),
    /invalid stage/,
  );
  assert.equal(invalid.length, 2);
  process.env.LAYA_BASE_URL = "http://localhost:43102";
  const ambiguous = [];
  mockInference(
    [sampleIntent, { instances: cases[1].overrides, coverage }],
    ambiguous,
    "area-perimeter",
  );
  const selected = await planPrompt({
    ...request,
    prompt: "Compare arithmetic and rectangle area",
    active: null,
  });
  assert.equal(selected.status, "created");
  assert.equal(ambiguous.filter((c) => c.decision).length, 1);
  const fallback = [];
  mockInference(
    [
      sampleIntent,
      { selected: "area-perimeter" },
      { instances: cases[1].overrides, coverage },
    ],
    fallback,
  );
  assert.equal(
    (
      await planPrompt({
        ...request,
        prompt: "Compare arithmetic and rectangle area",
        active: null,
      })
    ).status,
    "created",
  );
  assert.equal(fallback.filter((c) => c.decision).length, 1);
  // Exercise both adapters through the real planner orchestration with fixture HTTP.
  process.env.DECISION_PROVIDER = "jev";
  process.env.TYPESAFE_API_KEY = "fixture-key";
  const jevCalls = [];
  mockInference(
    [sampleIntent, { instances: cases[1].overrides, coverage }],
    jevCalls,
    "area-perimeter",
  );
  const jevSelected = await planPrompt({
    ...request,
    prompt: "Compare arithmetic and rectangle area",
    active: null,
  });
  assert.equal(jevSelected.status, "created");
  assert.equal(jevCalls.filter((call) => call.decision).length, 1);
  const jevFallback = [];
  mockInference(
    [
      sampleIntent,
      { selected: "area-perimeter" },
      { instances: cases[1].overrides, coverage },
    ],
    jevFallback,
  );
  assert.equal(
    (
      await planPrompt({
        ...request,
        prompt: "Compare arithmetic and rectangle area",
        active: null,
      })
    ).status,
    "created",
  );
  assert.equal(jevFallback.filter((call) => call.decision).length, 1);
  process.env.DECISION_PROVIDER = "laya";
  const aborted = new AbortController();
  aborted.abort();
  await assert.rejects(
    () => planPrompt({ ...request, active: null }, aborted.signal),
    /cancelled/,
  );
  const budget = new GenerationBudget();
  for (let i = 0; i < 6; i++) budget.consumeCall();
  assert.throws(() => budget.consumeCall(), /budget/);
  const followupCalls = [];
  mockInference(
    [
      {
        mode: "edit",
        selections: [
          {
            candidate: "configure:A/model",
            scope: "selected",
            fields: ["width"],
          },
        ],
        message: "Changed starting width",
      },
      {
        operations: [
          {
            candidate: "configure:A/model",
            arguments: { target: "A/model", changes: { width: 9 } },
          },
        ],
      },
    ],
    followupCalls,
  );
  const followup = await planPrompt({
    ...request,
    prompt: "Start A at width 9",
    active: { ...session.requestContext(), recipe: rectangle.recipe },
  });
  assert.equal(followup.status, "updated");
  assert.equal(
    followup.recipe.document.nodes.find((n) => n.id === "A/model").configuration
      .width,
    9,
  );
  const runtimeIntent = (input) => ({
    mode: "runtime",
    selections: [
      {
        candidate: input.candidates.find(
          (c) => c.mode === "runtime" && c.node === "A/model",
        ).id,
        scope: "selected",
        fields: [],
      },
    ],
    message: "Change width now",
  });
  const runtimeArguments = (width) => (input) => ({
    operations: [
      {
        candidate: input.operations[0].candidate,
        arguments: input.operations[0].argumentSchema.properties.value
          ? { value: { width, height: 4 } }
          : { width, height: 4 },
      },
    ],
  });
  const actionCalls = [];
  mockInference([runtimeIntent, runtimeArguments(7)], actionCalls);
  const action = await planPrompt({
    ...request,
    prompt: "Set A width to 7 now",
    active: { ...session.requestContext(), recipe: rectangle.recipe },
  });
  assert.equal(action.status, "runtime_action");
  const editRepairCalls = [],
    editRepairEvents = [];
  mockInference(
    [runtimeIntent, runtimeArguments("invalid"), runtimeArguments(7)],
    editRepairCalls,
  );
  const repairedRuntimeAction = await planPrompt(
    {
      ...request,
      prompt: "Set A width to 7 now",
      active: { ...session.requestContext(), recipe: rectangle.recipe },
    },
    undefined,
    (event, data) => editRepairEvents.push({ event, data }),
  );
  assert.equal(repairedRuntimeAction.status, "runtime_action");
  assert.deepEqual(repairedRuntimeAction.commands, action.commands);
  assert.equal(
    editRepairCalls.length,
    3,
    "Invalid arguments still get one bounded repair",
  );
  assert.ok(
    editRepairEvents.some((e) => e.event === "edit_arguments.schemaFailure"),
  );
  const arithmeticFollowupSession = activateRecipeSession(authored[0].recipe);
  const arithmeticFollowupCalls = [];
  mockInference(
    [
      (input) => ({
        mode: "runtime",
        selections: [
          {
            candidate: input.candidates.find(
              (c) =>
                c.node === "A/model" && c.command === "SET_ARITHMETIC_TASK",
            ).id,
            scope: "selected",
            fields: [],
          },
        ],
        message: "Try 7 and 8",
      }),
      (input) => ({
        operations: [
          {
            candidate: input.operations[0].candidate,
            arguments: { value: { operation: "add", a: 7, b: 8 } },
          },
        ],
      }),
    ],
    arithmeticFollowupCalls,
  );
  const arithmeticFollowup = await planPrompt({
    ...request,
    requestId: "arithmetic-followup-7-and-8",
    prompt: "what if its 7 and 8?",
    active: arithmeticFollowupSession.requestContext(),
  });
  assert.equal(arithmeticFollowup.status, "runtime_action");
  assert.deepEqual(arithmeticFollowup.commands, [
    {
      node: "A/model",
      command: "SET_ARITHMETIC_TASK",
      arguments: { value: { operation: "add", a: 7, b: 8 } },
    },
  ]);
  assert.deepEqual(
    arithmeticFollowupCalls.map(
      (call) => JSON.parse(call.messages[1].content).task,
    ),
    ["edit_intent", "edit_arguments"],
  );
  disposeRecipeSession(arithmeticFollowupSession);
  const semanticCalls = [];
  mockInference(
    [
      sampleIntent,
      {
        instances: [
          {
            alias: "A",
            overrides: {
              task: { operation: "add", a: 7, b: 18 },
              looping: false,
            },
          },
        ],
        coverage: {
          level: "full",
          covered: ["addition"],
          omitted: [],
          explanation: "",
        },
      },
      {
        instances: cases[0].overrides,
        coverage: {
          level: "full",
          covered: ["addition"],
          omitted: [],
          explanation: "",
        },
      },
    ],
    semanticCalls,
  );
  assert.equal(
    (await planPrompt({ ...request, prompt: cases[0].prompt, active: null }))
      .status,
    "created",
  );
  assert.equal(
    semanticCalls.length,
    3,
    "Semantically invalid arithmetic gets one focused repair before accepting the candidate",
  );
  const quantities = [];
  mockInference(
    [
      sampleIntent,
      {
        instances: [
          {
            alias: "A",
            overrides: {
              task: { operation: "add", a: 8, b: 4 },
              looping: false,
            },
          },
        ],
        coverage: {
          level: "full",
          covered: ["addition"],
          omitted: [],
          explanation: "",
        },
      },
      {
        instances: cases[0].overrides,
        coverage: {
          level: "full",
          covered: ["addition"],
          omitted: [],
          explanation: "",
        },
      },
    ],
    quantities,
  );
  assert.equal(
    (await planPrompt({ ...request, prompt: cases[0].prompt, active: null }))
      .status,
    "created",
  );
  assert.equal(
    quantities.length,
    3,
    "Wrong explicit quantities require repair even when schema-valid",
  );
  const extended = [];
  mockInference(
    [
      sampleIntent,
      { instances: cases[1].overrides, coverage, extend: true },
      {
        status: "authored",
        operations: [
          {
            tool: "add_observation",
            arguments: {
              source: "A/model",
              output: "area",
              widget: "readout",
              label: "Area comparison note",
            },
          },
        ],
        message: "Added an observed area",
      },
    ],
    extended,
  );
  const extension = await planPrompt({
    ...request,
    prompt: "Compare rectangle areas and add another area observation",
    active: null,
  });
  assert.equal(extended.length, 3);
  assert.equal(
    extension.recipe.document.nodes.filter(
      (n) => n.definition === "displays/Readout",
    ).length,
    5,
  );
  const rejectedExtension = [];
  mockInference(
    [
      sampleIntent,
      { instances: cases[1].overrides, coverage, extend: true },
      {
        status: "unsupported",
        operations: [],
        message:
          "A time-history plot is unavailable because rectangle changes are not time samples.",
      },
    ],
    rejectedExtension,
  );
  const reduced = await planPrompt({
    ...request,
    prompt: "Compare rectangle area and add a time history plot",
    active: null,
  });
  assert.equal(reduced.status, "created");
  assert.equal(reduced.coverage.level, "partial");
  assert.ok(
    reduced.recipe.document.lesson.explanation.includes(
      reduced.coverage.explanation,
    ),
  );
  // Holding a transport proves concurrency rejection and request-wide deadline propagation.
  const hold = new AbortController();
  let entered;
  const waiting = new Promise((resolve) => (entered = resolve));
  global.fetch = async (_url, options) => {
    entered();
    return new Promise((_resolve, reject) =>
      options.signal.addEventListener(
        "abort",
        () => reject(options.signal.reason),
        { once: true },
      ),
    );
  };
  const running = planPrompt(
    { ...request, prompt: "Show addition", active: null },
    hold.signal,
  );
  await waiting;
  await assert.rejects(
    () => planPrompt({ ...request, active: null }),
    (error) => error.status === 429,
  );
  hold.abort();
  await assert.rejects(
    () => running,
    (error) => error.status === 499,
  );
  process.env.PLANNER_TIMEOUT_MS = "10";
  const keepAlive = setTimeout(() => {}, 1000);
  try {
    await assert.rejects(
      () => planPrompt({ ...request, active: null }),
      (error) => error.status === 504,
    );
  } finally {
    clearTimeout(keepAlive);
  }
  delete process.env.PLANNER_TIMEOUT_MS;
  // Actual constraint probing requires conflicting output and validates union/optional subset.
  process.env.APERTUS_STRUCTURED_OUTPUT = "auto";
  clearStructuredCapabilities();
  const probeCalls = [];
  mockInference(
    [{ marker: "schema-enforced", value: 1 }, { selected: "area-perimeter" }],
    probeCalls,
  );
  const value = await requestStructured(
    [{ role: "user", content: "pick" }],
    (s) => JSON.parse(s),
    "JSON only",
    undefined,
    { schema: { type: "object" }, budget: new GenerationBudget() },
  );
  assert.equal(value.selected, "area-perimeter");
  assert.ok(probeCalls[1].response_format);
  clearStructuredCapabilities();
  const ignored = [];
  mockInference(
    [
      { marker: "schema-ignored", value: 99, extra: true },
      { selected: "area-perimeter" },
    ],
    ignored,
  );
  await requestStructured(
    [{ role: "user", content: "pick" }],
    (s) => JSON.parse(s),
    "JSON only",
    undefined,
    { schema: { type: "object" }, budget: new GenerationBudget() },
  );
  assert.equal(
    ignored[1].response_format,
    undefined,
    "HTTP 200 with ignored schema is strict-JSON fallback",
  );
  // Byte envelope and active document validation happen before inference.
  const { POST } = load("src/app/api/apertus/route.ts");
  let response = await POST(
    new Request("http://localhost/api/apertus", {
      method: "POST",
      body: JSON.stringify({
        ...request,
        active: null,
        prompt: "x".repeat(4001),
      }),
    }),
  );
  assert.equal(response.status, 400);
  assert.equal(response.headers.get("cache-control"), "no-store");
  response = await POST(
    new Request("http://localhost/api/apertus", {
      method: "POST",
      body: "🙂".repeat(300000),
    }),
  );
  assert.equal(response.status, 413);
  console.log(
    "Deterministic inference fixtures: exact selection, optional Laya/fallback, truthful partial/zero coverage, strict parsing, fresh repair, call budgets, cancellation, authored/runtime follow-ups, schema probing, bounded API envelopes and correlation passed. These are not live-model acceptance evidence.",
  );
})()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    global.fetch = originalFetch;
    for (const k of Object.keys(process.env))
      if (!(k in originalEnv)) delete process.env[k];
    Object.assign(process.env, originalEnv);
    session.dispose();
    disposeRecipeSession();
  });
