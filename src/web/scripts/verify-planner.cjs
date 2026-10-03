const assert = require("node:assert/strict");
const { load } = require("./test-loader.cjs");
const { acceptChoice } = load("src/lib/laya/decisions.ts");
const { readLayaConfig } = load("src/lib/laya/config.ts");
const { selectWithLaya } = load("src/lib/laya/planner.ts");
const { parseArguments, assembleArguments } = load(
  "src/lib/apertus/arguments.ts",
);
const { planPrompt } = load("src/lib/planner/index.ts");
const { POST } = load("src/app/api/apertus/route.ts");
const runtime = load("src/simulations/runtime/session.ts");
const { useProjectileStore } = load(
  "src/simulations/runtime/projectileSession.ts",
);
const context = {
  sessionId: "test-session",
  revision: 7,
  composition: { ref: "compositions/AngleComparisonExperiment", version: 1 },
  instances: [
    {
      id: "projectile/primary",
      label: "Primary projectile",
      parameters: { angle: 30, speed: 20 },
      outputs: {},
      actions: ["SET_ANGLE", "SET_VELOCITY"],
    },
    {
      id: "projectile/secondary",
      label: "Second projectile",
      parameters: { angle: 60, speed: 20 },
      outputs: {},
      actions: ["SET_ANGLE", "SET_VELOCITY"],
    },
  ],
  views: [],
  assumptions: [],
};
const selection = { action: "SET_ANGLE", target: "projectile/secondary" };
const prompt = "set the secnd ball to forty-five degres";
function answer(question, choice, probability = 0.99) {
  const keys = Object.keys(question.criteria);
  return {
    choice,
    probabilities: Object.fromEntries(
      keys.map((k) => [
        k,
        k === choice ? probability : (1 - probability) / (keys.length - 1),
      ]),
    ),
  };
}
const q = {
  type: "choice",
  instructions: "Choose",
  criteria: { edit: "Edit", unclear: "Unclear" },
};
assert.equal(acceptChoice(answer(q, "edit"), q, 0.9).choice, "edit");
for (const a of [
  answer(q, "edit", 0.6),
  answer(q, "unclear"),
  { choice: "edit", probabilities: { edit: 1 } },
  { choice: "edit", probabilities: { edit: NaN, unclear: 0 } },
  { choice: "edit", probabilities: { edit: 0.99, unclear: 0.99 } },
  { choice: "injected", probabilities: { edit: 1, unclear: 0 } },
])
  assert.equal(acceptChoice(a, q, 0.9), null);
assert.throws(() => readLayaConfig({ LAYA_BASE_URL: "file:///tmp" }));
assert.throws(() => readLayaConfig({ LAYA_ACCEPTANCE_GATE: "1" }));
const args = {
  schemaVersion: 1,
  outcome: "arguments",
  confirmedSelection: selection,
  arguments: { value: 45 },
  message: "Set angle to 45 degrees.",
};
for (const invalid of [
  { ...args, arguments: { value: 100 } },
  { ...args, arguments: { value: "45" } },
  { ...args, target: "projectile/primary" },
  { ...args, arguments: { value: 45, script: "code" } },
  { ...args, schemaVersion: 2 },
  { ...args, outcome: "conflict" },
  { ...args, message: "" },
])
  assert.throws(() =>
    parseArguments(JSON.stringify(invalid), selection, "projectile", context),
  );
assert.throws(() =>
  parseArguments(
    JSON.stringify(args),
    { ...selection, target: "missing" },
    "projectile",
    context,
  ),
);
assert.throws(() =>
  parseArguments(
    JSON.stringify(args),
    { ...selection, target: "session" },
    "projectile",
    context,
  ),
);

async function main() {
  let captures = [];
  const provider = async (request) => {
    captures.push(request);
    const [id, question] = Object.entries(request.questions)[0];
    const choice = {
      intent: "edit",
      target: selection.target,
      action: selection.action,
    }[id];
    return { model: "fixture", answers: { [id]: answer(question, choice) } };
  };
  assert.deepEqual(
    await selectWithLaya(prompt, "projectile", context, provider, 0.9),
    selection,
  );
  assert.deepEqual(
    captures.map((r) => Object.keys(r.questions)[0]),
    ["intent", "target", "action"],
  );
  assert.deepEqual(captures[1].state.previous_decisions, { intent: "edit" });
  assert.deepEqual(captures[2].state.previous_decisions, {
    intent: "edit",
    target: selection.target,
  });
  for (const r of captures) {
    assert.equal(r.state.request, prompt);
    assert.equal(Object.values(r.questions)[0].type, "choice");
  }
  assert.ok(
    !Object.hasOwn(captures[2].questions.action.criteria, "SET_GRAVITY"),
  );
  assert.ok(!Object.hasOwn(captures[2].questions.action.criteria, "RESET"));
  captures = [];
  const low = async (request) => {
    captures.push(request);
    const [id, question] = Object.entries(request.questions)[0];
    return {
      model: "fixture",
      answers: { [id]: answer(question, "edit", 0.6) },
    };
  };
  assert.equal(
    await selectWithLaya(prompt, "projectile", context, low, 0.9),
    null,
  );
  assert.equal(captures.length, 1);
  const parsed = parseArguments(
    JSON.stringify(args),
    selection,
    "projectile",
    context,
  );
  const plan = assembleArguments(parsed, selection, "projectile", context);
  assert.equal(plan.expectedRevision, 7);
  assert.deepEqual(plan.commands, [{ ...selection, arguments: { value: 45 } }]);

  const originalFetch = global.fetch,
    saved = { ...process.env };
  let layaCalls = 0,
    focusedCalls = 0,
    broadCalls = 0,
    behavior = "ok",
    activePrompt = prompt,
    proposal = selection;
  const reply = (object) =>
    Response.json({
      choices: [{ message: { content: JSON.stringify(object) } }],
    });
  const broadPlan = {
    schemaVersion: 1,
    operation: "clarify",
    message: "Broader Apertus planning",
  };
  try {
    process.env.PLANNER_MODE = "hybrid";
    process.env.LAYA_API_TOKEN = "private-token";
    process.env.LAYA_BASE_URL = "http://laya.test";
    process.env.APERTUS_LOCAL_BASE_URL = "http://apertus.test/v1";
    global.fetch = async (url, options) => {
      const body = JSON.parse(options.body);
      if (String(url).includes("laya.test")) {
        layaCalls++;
        assert.equal(options.headers.Authorization, "Bearer private-token");
        assert.equal(body.state.request, activePrompt);
        if (behavior === "unavailable")
          return new Response("unavailable", { status: 503 });
        if (behavior === "malformed-laya") return Response.json({ result: {} });
        if (behavior === "oversize") return new Response("x".repeat(64001));
        if (behavior === "wait-laya")
          return new Promise((_, reject) =>
            options.signal.addEventListener(
              "abort",
              () => reject(options.signal.reason),
              { once: true },
            ),
          );
        const [id, question] = Object.entries(body.questions)[0];
        const choice = {
          intent: behavior === "compound" ? "other" : "edit",
          target: proposal.target,
          action: proposal.action,
        }[id];
        return Response.json({
          result: {
            answers: {
              [id]: answer(question, choice, behavior === "low" ? 0.6 : 0.99),
            },
          },
          model: "fixture",
        });
      }
      const user = JSON.parse(body.messages[1].content);
      assert.equal(user.prompt, activePrompt);
      if (user.proposal) {
        focusedCalls++;
        assert.deepEqual(user.proposal, proposal);
        assert.ok(
          !body.messages[0].content.includes(
            "Selected catalog and dependencies",
          ),
        );
        assert.ok(body.messages[0].content.includes("conflict"));
        if (behavior === "wait-apertus")
          return new Promise((_, reject) =>
            options.signal.addEventListener(
              "abort",
              () => reject(options.signal.reason),
              { once: true },
            ),
          );
        if (behavior === "http-failure")
          return new Response("failed", { status: 500 });
        if (behavior === "invalid-args")
          return reply({ ...args, arguments: { value: 100 } });
        if (behavior === "retarget")
          return reply({ ...args, target: "projectile/primary" });
        if (behavior === "conflict")
          return reply({
            schemaVersion: 1,
            outcome: "conflict",
            message: "Wrong target or compound request",
          });
        if (behavior === "clarify" || behavior === "unsupported")
          return reply({
            schemaVersion: 1,
            outcome: behavior,
            message: "Need clarification or unavailable mechanism",
          });
        if (behavior === "relative")
          return reply({
            ...args,
            confirmedSelection: proposal,
            arguments: { value: 25 },
          });
        if (behavior === "repair" && body.messages.length === 2)
          return reply({ ...args, arguments: { value: "45" } });
        return reply({ ...args, confirmedSelection: proposal });
      }
      broadCalls++;
      assert.deepEqual(user, {
        prompt: activePrompt,
        currentDemo: "projectile",
        context,
      });
      return reply(broadPlan);
    };
    const response = await POST(
      new Request("http://app.test/api/apertus", {
        method: "POST",
        body: JSON.stringify({ prompt, demo: "projectile", context }),
      }),
    );
    assert.equal(response.status, 200);
    assert.equal((await response.json()).commands[0].arguments.value, 45);
    assert.equal(layaCalls, 3);
    assert.equal(focusedCalls, 1);
    assert.equal(broadCalls, 0);
    for (const text of [
      "change the second launch angle to forty five degrees",
      "mettre le deuxième projectile à quarante-cinq degrés",
    ]) {
      activePrompt = text;
      assert.equal(
        (await planPrompt(text, "projectile", context)).commands[0].arguments
          .value,
        45,
      );
    }
    activePrompt = "increase the second projectile speed by five m/s";
    proposal = { ...selection, action: "SET_VELOCITY" };
    behavior = "relative";
    assert.equal(
      (await planPrompt(activePrompt, "projectile", context)).commands[0]
        .arguments.value,
      25,
    );
    activePrompt = prompt;
    proposal = selection;
    for (const failure of [
      "unavailable",
      "malformed-laya",
      "oversize",
      "low",
      "compound",
    ]) {
      behavior = failure;
      const before = broadCalls;
      assert.equal(
        (await planPrompt(prompt, "projectile", context)).message,
        broadPlan.message,
      );
      assert.equal(broadCalls, before + 1);
    }
    for (const outcome of ["clarify", "unsupported"]) {
      behavior = outcome;
      const before = broadCalls;
      assert.equal(
        (await planPrompt(prompt, "projectile", context)).operation,
        outcome,
      );
      assert.equal(broadCalls, before);
    }
    behavior = "conflict";
    proposal = { ...selection, target: "projectile/primary" };
    let before = broadCalls;
    assert.equal(
      (await planPrompt(prompt, "projectile", context)).message,
      broadPlan.message,
    );
    assert.equal(broadCalls, before + 1);
    proposal = selection;
    assert.equal(
      parseArguments(
        JSON.stringify({
          ...args,
          confirmedSelection: { ...selection, target: "projectile/primary" },
        }),
        selection,
        "projectile",
        context,
      ).outcome,
      "conflict",
    );
    assert.throws(() =>
      parseArguments(
        JSON.stringify({ ...args, confirmedSelection: undefined }),
        selection,
        "projectile",
        context,
      ),
    );
    for (const failure of ["invalid-args", "retarget", "http-failure"]) {
      behavior = failure;
      before = broadCalls;
      const focusedBefore = focusedCalls;
      await assert.rejects(
        planPrompt(prompt, "projectile", context),
        (e) => e.status === 502,
      );
      assert.equal(broadCalls, before);
      assert.equal(
        focusedCalls - focusedBefore,
        failure === "http-failure" ? 1 : 2,
      );
    }
    behavior = "repair";
    assert.equal(
      (await planPrompt(prompt, "projectile", context)).operation,
      "edit",
    );
    for (const waiting of ["wait-laya", "wait-apertus"]) {
      behavior = waiting;
      const controller = new AbortController(),
        pending = planPrompt(prompt, "projectile", context, controller.signal);
      await new Promise((resolve) => setImmediate(resolve));
      await assert.rejects(
        planPrompt(prompt, "projectile", context),
        (e) => e.status === 429,
      );
      before = broadCalls;
      controller.abort();
      await assert.rejects(pending, (e) => e.status === 499);
      assert.equal(broadCalls, before);
    }
    behavior = "wait-laya";
    process.env.LAYA_TIMEOUT_MS = "10";
    const keepAlive = setTimeout(() => {}, 100);
    assert.equal(
      (await planPrompt(prompt, "projectile", context)).message,
      broadPlan.message,
    );
    clearTimeout(keepAlive);
    // The total hybrid deadline also covers a hanging Apertus interpretation.
    process.env.LAYA_TIMEOUT_MS = "3000";
    process.env.PLANNER_TIMEOUT_MS = "10";
    behavior = "wait-apertus";
    const deadlineKeepAlive = setTimeout(() => {}, 100);
    await assert.rejects(
      planPrompt(prompt, "projectile", context),
      (e) => e.status === 504,
    );
    clearTimeout(deadlineKeepAlive);
    delete process.env.PLANNER_TIMEOUT_MS;
    behavior = "ok";
    process.env.PLANNER_MODE = "apertus";
    const beforeLaya = layaCalls;
    await planPrompt(prompt, "projectile", context);
    assert.equal(layaCalls, beforeLaya);
    process.env.PLANNER_MODE = "laya";
    await assert.rejects(
      planPrompt(prompt, "projectile", context),
      (e) => e.status === 503,
    );
  } finally {
    global.fetch = originalFetch;
    for (const key of Object.keys(process.env))
      if (!(key in saved)) delete process.env[key];
    Object.assign(process.env, saved);
  }
  // Verify the assembled plan changes only the requested instance and that stale
  // configurations are still rejected by the authoritative runtime.
  runtime.disposeSession();
  assert.equal(
    runtime.executePlan({
      schemaVersion: 1,
      operation: "create",
      composition: context.composition,
      parameters: { angles: [30, 60] },
      message: "Initialize",
    }).accepted,
    true,
  );
  const liveContext = runtime.getExperimentContext();
  const livePlan = assembleArguments(
    parsed,
    selection,
    "projectile",
    liveContext,
  );
  assert.equal(runtime.executePlan(livePlan).accepted, true);
  assert.equal(useProjectileStore.getState().instances[0].launch.angle, 30);
  assert.equal(useProjectileStore.getState().instances[1].launch.angle, 45);
  assert.equal(runtime.executePlan(livePlan).accepted, false);
  runtime.disposeSession();
  console.log(
    "Planner checks passed: semantic selections, focused arguments, conflict, repair, fallback, cancellation, capacity, atomic edits, stale revisions. Fixtures do not establish model accuracy.",
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
