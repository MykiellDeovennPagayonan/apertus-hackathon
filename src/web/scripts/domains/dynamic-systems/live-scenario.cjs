/** Fresh real Apertus + Laya development check through the planner and runtime. No mocks. */
const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("./loader.cjs");
const { planPrompt } = load("src/lib/planner/index.ts");
const runtime = load("src/simulations/runtime/session.ts");
const { useAssemblyStore } = load("src/simulations/runtime/assemblySession.ts");

process.env.PLANNER_MODE = "hybrid";
process.env.PLANNER_TIMEOUT_MS ??= "300000";
process.env.APERTUS_TIMEOUT_MS ??= "240000";
process.env.LAYA_TIMEOUT_MS ??= "30000";

const cases = [
  {
    id: "GROW-001",
    provider: "CompoundGrowth",
    prompt: "Show me how $100 grows with compound interest.",
    checkInitial(outputs) {
      assert.equal(outputs.principal, 100);
      assert.equal(outputs.annualRate, 0.05);
      assert.equal(outputs.years, 10);
    },
    edits: [
      {
        prompt: "Make the interest rate zero.",
        check(outputs) {
          assert.equal(outputs.compoundTotal, 100);
          assert.equal(outputs.simpleTotal, 100);
        },
      },
      {
        prompt: "Use 10 percent for 2 years.",
        check(outputs) {
          assert.ok(Math.abs(outputs.compoundTotal - 121) < 1e-9);
          assert.ok(Math.abs(outputs.simpleTotal - 120) < 1e-9);
        },
      },
    ],
  },
  {
    id: "TRAFFIC-001",
    provider: "RingTraffic",
    prompt: "How can a traffic jam start when there’s no accident?",
    checkInitial(outputs) {
      assert.equal(outputs.vehicleCount, 22);
      assert.equal(outputs.desiredHeadway, 1.1);
      assert.equal(outputs.playing, false);
    },
    edits: [
      {
        prompt: "Make the cars leave bigger gaps.",
        check(outputs) {
          assert.ok(outputs.desiredHeadway > 1.1);
          assert.equal(outputs.vehicleCount, 22);
        },
      },
    ],
  },
  {
    id: "QUEUE-001",
    provider: "CheckoutQueue",
    prompt: "Would a second cashier make the line much shorter?",
    checkInitial(outputs) {
      assert.equal(outputs.cashiers, 1);
      assert.equal(outputs.arrivalRate, 0.8);
      assert.equal(outputs.serviceRate, 1);
      assert.equal(outputs.duration, 60);
    },
    edits: [
      {
        prompt: "Add a second cashier.",
        before(outputs) {
          return {
            schedule: outputs.customers.map(({ id, arrival, service }) => ({
              id,
              arrival,
              service,
            })),
            averageWait: outputs.averageWait,
          };
        },
        check(outputs, before) {
          assert.equal(outputs.cashiers, 2);
          assert.deepEqual(
            outputs.customers.map(({ id, arrival, service }) => ({
              id,
              arrival,
              service,
            })),
            before.schedule,
          );
          assert.ok(outputs.averageWait <= before.averageWait);
        },
      },
    ],
  },
];

const output = () => useAssemblyStore.getState().instances[0].outputs;
async function planned(prompt, demo, context) {
  const events = [];
  const started = performance.now();
  const plan = await planPrompt(
    prompt,
    demo,
    context,
    AbortSignal.timeout(300000),
    (event, data) => events.push({ event, data }),
  );
  const result = runtime.executePlan(plan);
  assert.ok(result.accepted, result.error);
  return { plan, events, elapsedMs: performance.now() - started };
}

async function main() {
  const rows = [];
  for (const scenario of cases.filter(
    (candidate) =>
      !process.env.DYNAMIC_CASE || candidate.id === process.env.DYNAMIC_CASE,
  )) {
    runtime.disposeSession();
    const creation = await planned(scenario.prompt, null, null);
    assert.equal(creation.plan.operation, "create");
    assert.ok(
      creation.events.some((event) => event.event === "teachingIntent"),
      "Missing fresh Apertus teaching intent",
    );
    assert.ok(
      creation.events.some(
        (event) =>
          event.event === "layaSelection" &&
          event.data.question === "assembly" &&
          event.data.decision?.choice ===
            `prefabs/dynamic-systems/${scenario.provider}`,
      ),
      "Missing accepted real Laya provider selection",
    );
    assert.ok(
      creation.events.some((event) => event.event === "configuration"),
      "Missing fresh Apertus configuration",
    );
    assert.ok(
      creation.events.some((event) => event.event === "stagedValidation"),
      "Missing staged compiler validation",
    );
    assert.equal(
      useAssemblyStore.getState().instances[0].provider,
      `prefabs/dynamic-systems/${scenario.provider}`,
    );
    scenario.checkInitial(output());
    const edits = [];
    for (const edit of scenario.edits) {
      const before = edit.before?.(structuredClone(output()));
      const context = runtime.getExperimentContext();
      const run = await planned(edit.prompt, "assembly", context);
      console.error(
        `${scenario.id} edit ${JSON.stringify({ prompt: edit.prompt, plan: run.plan, outputs: output() })}`,
      );
      edit.check(output(), before);
      edits.push({
        prompt: edit.prompt,
        operation: run.plan.operation,
        elapsedMs: Math.round(run.elapsedMs),
      });
    }
    rows.push({
      id: scenario.id,
      exactPrompt: scenario.prompt,
      provider: useAssemblyStore.getState().instances[0].provider,
      creationElapsedMs: Math.round(creation.elapsedMs),
      apertureIntent: true,
      layaSelection: true,
      apertusConfiguration: true,
      stagedValidation: true,
      committedRevision: runtime.getExperimentContext().revision,
      edits,
      result: "pass",
    });
    console.error(
      `${scenario.id}: live Apertus + Laya creation and required edit(s) passed`,
    );
  }
  const report = {
    qualifying: false,
    scope:
      "Agent E live planner/runtime development check using the local registry overlay; shared UI integration and full browser rounds remain separate",
    generatedAt: new Date().toISOString(),
    rows,
  };
  if (process.argv[2])
    fs.writeFileSync(process.argv[2], `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
}

main()
  .catch((error) => {
    console.error(error.stack || error.message);
    process.exitCode = 1;
  })
  .finally(() => runtime.disposeSession());
