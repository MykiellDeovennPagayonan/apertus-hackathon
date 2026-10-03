// Live collaboration evaluation; both services are real. No mock provider.
const fs = require("node:fs");
const { load } = require("./test-loader.cjs");
const { planPrompt } = load("src/lib/planner/index.ts");
const { readLayaConfig } = load("src/lib/laya/config.ts");
const { interpretArguments, assembleArguments } = load(
  "src/lib/apertus/arguments.ts",
);
const runtime = load("src/simulations/runtime/session.ts");
const { useProjectileStore } = load(
  "src/simulations/runtime/projectileSession.ts",
);
const { useBridgeStore } = load("src/simulations/runtime/bridgeSession.ts");
const { useTownStore } = load("src/simulations/runtime/townSession.ts");

const cases = [
  {
    id: "typo-number-words",
    demo: "projectile",
    prompt: "set the secnd ball to forty-five degres",
    check: () =>
      useProjectileStore.getState().instances[1].launch.angle === 45 &&
      useProjectileStore.getState().instances[0].launch.angle === 30,
  },
  {
    id: "relative",
    demo: "projectile",
    prompt: "Increase the second projectile's speed by five m/s",
    check: () =>
      useProjectileStore.getState().instances[1].launch.velocity === 25,
  },
  {
    id: "pause",
    demo: "projectile",
    prompt: "Freeze the simulation clock",
    check: () => useProjectileStore.getState().playing === false,
  },
  {
    id: "compound",
    demo: "projectile",
    prompt: "Set the second projectile to 45 degrees and pause the simulation",
    check: () =>
      useProjectileStore.getState().instances[1].launch.angle === 45 &&
      useProjectileStore.getState().playing === false,
  },
  {
    id: "ambiguous",
    demo: "projectile",
    prompt: "Set its angle to 45 degrees",
    noChange: true,
  },
  {
    id: "unspecified-amount",
    demo: "projectile",
    prompt: "Make the second projectile a little faster",
    noChange: true,
  },
  {
    id: "out-of-range",
    demo: "projectile",
    prompt: "Set the second projectile angle to 120 degrees",
    noChange: true,
  },
  {
    id: "negation",
    demo: "projectile",
    prompt: "Do not change the second projectile's angle",
    noChange: true,
  },
  {
    id: "unit-conversion",
    demo: "bridge",
    prompt: "Set the bridge load to five thousand kilograms",
    check: () => useBridgeStore.getState().loadTons === 5,
  },
  {
    id: "time",
    demo: "town",
    prompt: "Set the town time to half past eight in the evening",
    check: () => useTownStore.getState().time === 20.5,
  },
  {
    id: "multilingual",
    demo: "projectile",
    prompt: "Mets le deuxième projectile à quarante-cinq degrés",
    check: () => useProjectileStore.getState().instances[1].launch.angle === 45,
  },
];

async function main() {
  const previousMode = process.env.PLANNER_MODE;
  process.env.PLANNER_MODE = "hybrid";
  const originalFetch = global.fetch;
  const rows = [];
  const focusedRows = [];
  let trace = [];
  global.fetch = async (url, options) => {
    const request = JSON.parse(options.body);
    const stage = request.questions
      ? "selection"
      : JSON.parse(request.messages[1].content).proposal
        ? "arguments"
        : "broad-planning";
    const started = performance.now();
    try {
      const response = await originalFetch(url, options);
      const data = await response.clone().json();
      trace.push({
        stage,
        question: request.questions,
        previous_decisions: request.state?.previous_decisions,
        proposal: request.messages
          ? JSON.parse(request.messages[1].content).proposal
          : undefined,
        model: data.model ?? request.model,
        status: response.status,
        result: data.result,
        content: data.choices?.[0]?.message?.content,
        timing: data.timing,
        usage: data.usage,
        elapsed_ms: performance.now() - started,
      });
      return response;
    } catch (error) {
      trace.push({
        stage,
        error: error.message,
        elapsed_ms: performance.now() - started,
      });
      throw error;
    }
  };
  try {
    for (const item of process.argv.includes("--focused-only") ? [] : cases) {
      runtime.disposeSession();
      const ref = {
        projectile: "AngleComparisonExperiment",
        bridge: "BridgeExperiment",
        town: "TownExperiment",
      }[item.demo];
      const parameters =
        item.demo === "projectile" ? { angles: [30, 60], speed: 20 } : {};
      const initialized = runtime.executePlan({
        schemaVersion: 1,
        operation: "create",
        composition: { ref: `compositions/${ref}`, version: 1 },
        parameters,
        message: "Evaluation",
      });
      if (!initialized.accepted) throw new Error(initialized.error);
      const context = runtime.getExperimentContext();
      trace = [];
      const started = performance.now();
      let plan,
        error,
        correct = false,
        schemaValid = false,
        applied = false;
      try {
        plan = await planPrompt(item.prompt, item.demo, context);
        schemaValid = true;
        const result = runtime.executePlan(plan);
        applied = result.accepted && plan.operation === "edit";
        if (!result.accepted) error = result.error;
        correct = item.noChange
          ? !applied &&
            ["clarify", "unsupported"].includes(plan.operation) &&
            runtime.getExperimentContext().revision === context.revision
          : result.accepted && plan.operation === "edit" && item.check();
      } catch (e) {
        error = e.message;
      }
      rows.push({
        id: item.id,
        prompt: item.prompt,
        schemaValid,
        correct,
        applied,
        error,
        plan,
        trace,
        elapsed_ms: performance.now() - started,
      });
      console.error(
        `${item.id}: ${correct ? "pass" : "fail"}, ${rows.at(-1).elapsed_ms.toFixed(0)} ms`,
      );
    }
    // Isolate the argument model with evaluator-supplied proposals, explicitly
    // separate from real Laya selection coverage in the hybrid results above.
    const focusedCases = [
      [
        "typo-number-words",
        "SET_ANGLE",
        "projectile/secondary",
        "arguments",
        45,
      ],
      ["relative", "SET_VELOCITY", "projectile/secondary", "arguments", 25],
      ["pause", "SET_PLAYING", "session", "arguments", false],
      ["unit-conversion", "SET_LOAD", "bridge/load", "arguments", 5],
      ["time", "SET_TIME", "session", "arguments", 20.5],
      ["typo-number-words", "SET_ANGLE", "projectile/primary", "conflict"],
      ["unspecified-amount", "SET_VELOCITY", "projectile/secondary", "clarify"],
      ["negation", "SET_ANGLE", "projectile/secondary", "clarify"],
    ];
    for (const [id, action, target, outcome, value] of focusedCases) {
      const item = cases.find((c) => c.id === id);
      runtime.disposeSession();
      const ref = {
        projectile: "AngleComparisonExperiment",
        bridge: "BridgeExperiment",
        town: "TownExperiment",
      }[item.demo];
      runtime.executePlan({
        schemaVersion: 1,
        operation: "create",
        composition: { ref: `compositions/${ref}`, version: 1 },
        parameters:
          item.demo === "projectile" ? { angles: [30, 60], speed: 20 } : {},
        message: "Focused evaluation",
      });
      trace = [];
      const started = performance.now();
      let result,
        error,
        correct = false;
      try {
        result = await interpretArguments(
          item.prompt,
          item.demo,
          runtime.getExperimentContext(),
          { action, target },
          AbortSignal.timeout(Number(process.env.APERTUS_TIMEOUT_MS ?? 120000)),
        );
        correct =
          result.outcome === outcome &&
          (outcome !== "arguments" || result.arguments.value === value);
        if (correct && outcome === "arguments") {
          const applied = runtime.executePlan(
            assembleArguments(
              result,
              { action, target },
              item.demo,
              runtime.getExperimentContext(),
            ),
          );
          correct = applied.accepted && item.check();
        }
      } catch (e) {
        error = e.message;
      }
      focusedRows.push({
        id,
        proposal_source: "evaluator-supplied",
        proposal: { action, target },
        expected_outcome: outcome,
        correct,
        result,
        error,
        trace,
        elapsed_ms: performance.now() - started,
      });
      console.error(`focused ${id} (${target}): ${correct ? "pass" : "fail"}`);
    }
    const timings = rows.map((r) => r.elapsed_ms).sort((a, b) => a - b);
    const report = {
      mode: process.argv.includes("--focused-only")
        ? "live-apertus-arguments"
        : "live-laya-apertus",
      timestamp: new Date().toISOString(),
      gate: readLayaConfig().gate,
      correct: rows.filter((r) => r.correct).length,
      total: rows.length,
      focused_requests: rows.filter((r) =>
        r.trace.some((t) => t.stage === "arguments"),
      ).length,
      broad_requests: rows.filter((r) =>
        r.trace.some((t) => t.stage === "broad-planning"),
      ).length,
      invalid_or_wrong_mutations: rows.filter((r) => !r.correct && r.applied)
        .length,
      latency_ms: {
        median: timings[Math.floor(timings.length / 2)],
        p95: timings[
          Math.min(timings.length - 1, Math.ceil(timings.length * 0.95) - 1)
        ],
      },
      rows,
      focused_task_evaluation: {
        proposal_source:
          "evaluator-supplied (not a Laya selection accuracy measurement)",
        correct: focusedRows.filter((r) => r.correct).length,
        total: focusedRows.length,
        rows: focusedRows,
      },
    };
    if (process.argv[2])
      fs.writeFileSync(process.argv[2], `${JSON.stringify(report, null, 2)}\n`);
    else console.log(JSON.stringify(report, null, 2));
    if (rows.some((r) => !r.correct) || focusedRows.some((r) => !r.correct))
      process.exitCode = 1;
  } finally {
    global.fetch = originalFetch;
    if (previousMode === undefined) delete process.env.PLANNER_MODE;
    else process.env.PLANNER_MODE = previousMode;
    runtime.disposeSession();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
