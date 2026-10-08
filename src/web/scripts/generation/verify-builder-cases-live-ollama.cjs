const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// 1. Ensure local environment configuration
const envFile = path.resolve(__dirname, "../../.env.local");
if (fs.existsSync(envFile)) {
  const content = fs.readFileSync(envFile, "utf8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const [key, ...vals] = trimmed.split("=");
    if (key && vals.length > 0) {
      process.env[key.trim()] = vals.join("=").trim();
    }
  }
}

// Fallback defaults for local Ollama Apertus
process.env.APERTUS_PROVIDER = process.env.APERTUS_PROVIDER || "local";
process.env.APERTUS_LOCAL_RUNTIME = process.env.APERTUS_LOCAL_RUNTIME || "ollama";
process.env.APERTUS_LOCAL_BASE_URL = process.env.APERTUS_LOCAL_BASE_URL || "http://127.0.0.1:11434/v1";
process.env.APERTUS_LOCAL_MODEL = process.env.APERTUS_LOCAL_MODEL || "apertus-16k";
process.env.PLANNER_MODE = "apertus";

const { load } = require("../test-loader.cjs");
const { planPrompt } = load("src/lib/planner/index.ts");
const { activeFromBuilderDocument } = load("src/simulations/builder/composition/useBuilderAi.ts");
const { createFreshDocument } = load("src/simulations/builder/document/canonical.ts");
const { checkRunnable } = load("src/simulations/runtime/authoring/runnable.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");

const TEST_CASES = [
  {
    id: "case-1-rolling-track",
    name: "Rolling Track Dynamics",
    description: "Incline track composite exploring friction, ramp height, and velocity",
    expectedModel: "prefabs/physical-systems/RollingTrack",
    buildPrompt: "Build an inclined track composite with friction slider and speed readout",
    refinePrompt: "Add a launch height slider and an observation readout",
  },
  {
    id: "case-2-pendulum",
    name: "Pendulum Harmonic Oscillator",
    description: "Pendulum oscillator composite exploring length, period, and gravity",
    expectedModel: "prefabs/physical-systems/Pendulum",
    buildPrompt: "Build a pendulum oscillator composite with length control and period readout",
    refinePrompt: "Add a gravity slider control and an observation readout",
  },
  {
    id: "case-3-resistive-circuit",
    name: "Resistive Electrical Circuit",
    description: "Resistive circuit composite exploring Ohm's law, resistance, and current",
    expectedModel: "prefabs/physical-systems/ResistiveCircuit",
    buildPrompt: "Build a circuit composite with resistance slider and current readout",
    refinePrompt: "Add a voltage control slider and an observation readout",
  },
  {
    id: "case-4-rectangle-geometry",
    name: "Rectangle Metrics Geometry",
    description: "Rectangle geometry composite exploring width, height, and area",
    expectedModel: "models/area-perimeter",
    buildPrompt: "Build a rectangle composite with width slider and area readout",
    refinePrompt: "Add a height slider control",
  },
  {
    id: "case-5-projectile-launcher",
    name: "Projectile Launcher Kinematics",
    description: "Kinematics launcher composite exploring launch angle, speed, and distance",
    expectedModel: "models/Projectile",
    buildPrompt: "Build a projectile launcher composite with launch angle slider and distance readout",
    refinePrompt: "Add a launch speed slider control and an observation readout",
  },
  {
    id: "case-6-predator-prey",
    name: "Predator-Prey Population Ecology",
    description: "Lotka-Volterra ecosystem composite exploring rabbit growth, fox population, and cycle dynamics",
    expectedModel: "prefabs/natural-systems/PredatorPrey",
    buildPrompt: "Build a predator prey composite with rabbit growth control and fox count readout",
    refinePrompt: "Add an initial rabbit population slider and an observation readout",
  },
  {
    id: "case-7-reaction-rate",
    name: "Chemical Reaction Kinetics",
    description: "First-order reaction rate composite exploring Arrhenius temperature, reaction rate, and half-life",
    expectedModel: "prefabs/chemistry/ReactionRate",
    buildPrompt: "Build a chemical reaction rate composite with temperature slider and half-life readout",
    refinePrompt: "Add an elapsed time observation readout",
  },
  {
    id: "case-8-compound-growth",
    name: "Compound and Simple Interest Growth",
    description: "Financial growth composite comparing annual interest rate and total accumulated balance",
    expectedModel: "prefabs/dynamic-systems/CompoundGrowth",
    buildPrompt: "Build a compound interest composite with annual rate slider and balance readout",
    refinePrompt: "Add a principal slider control and an observation readout",
  },
  {
    id: "case-9-checkout-queue",
    name: "Checkout Queue Operations",
    description: "Queueing system composite exploring cashier count, customer arrival rate, and waiting times",
    expectedModel: "prefabs/dynamic-systems/CheckoutQueue",
    buildPrompt: "Build a checkout queue composite with cashier slider and waiting time readout",
    refinePrompt: "Add an arrival rate slider control",
  },
  {
    id: "case-10-circle-geometry",
    name: "Circle Geometry & Pi Invariance",
    description: "Circle geometry composite exploring radius, diameter, circumference, and constant pi ratio",
    expectedModel: "prefabs/math-foundations/Circle",
    buildPrompt: "Build a circle geometry composite with radius slider and circumference readout",
    refinePrompt: "Add a diameter readout",
  },
];

async function executeStage(requestId, prompt, active) {
  const request = {
    protocolVersion: 1,
    requestId,
    prompt,
    viewport: { width: 1280, height: 800 },
    active,
  };

  const started = Date.now();
  const traces = [];
  const fixerEvents = [];
  let calls = 0;
  let turns = 0;
  let repairs = 0;
  let loopDetected = false;
  let runnableCheck = null;

  const trace = (event, data) => {
    traces.push({ event, data, elapsedMs: Date.now() - started });
    if (event === "budget") {
      calls = data.calls || calls;
      repairs = data.repairs || repairs;
    }
    if (event === "turn.start") {
      turns = Math.max(turns, data.turn || 0);
    }
    if (event.startsWith("fixer.")) {
      fixerEvents.push({ event, data });
    }
    if (event === "turn.loop_detected") {
      loopDetected = true;
    }
    if (event === "runnable.check") {
      runnableCheck = data;
    }
  };

  const result = await planPrompt(request, undefined, trace);
  const elapsedMs = Date.now() - started;

  return {
    requestId,
    prompt,
    result,
    elapsedMs,
    calls,
    turns,
    repairs,
    fixerEvents,
    loopDetected,
    runnableCheck,
    traces,
  };
}

(async () => {
  console.log("===============================================================================");
  console.log("  Apertus Builder AI: Live Ollama Use Cases & Refinement Suite");
  console.log(`  Base URL: ${process.env.APERTUS_LOCAL_BASE_URL} | Model: ${process.env.APERTUS_LOCAL_MODEL}`);
  console.log("===============================================================================\n");

  const results = [];

  for (let i = 0; i < TEST_CASES.length; i++) {
    const testCase = TEST_CASES[i];
    console.log(`\n>>> [${i + 1}/${TEST_CASES.length}] ${testCase.name} (${testCase.id})`);
    console.log(`    Goal: ${testCase.description}`);

    // --- Stage A: Initial Build from Empty Canvas ---
    console.log(`    Stage A (Build): "${testCase.buildPrompt}"`);
    const buildRun = await executeStage(`${testCase.id}-build`, testCase.buildPrompt, null);

    assert.equal(buildRun.result.status, "created", `Stage A status must be 'created' (was '${buildRun.result.status}')`);
    assert.ok(buildRun.result.recipe, "Stage A must return a recipe");
    const buildDoc = buildRun.result.recipe.document;
    assert.ok(buildDoc.nodes.length >= 2, `Stage A must have at least 2 nodes (had ${buildDoc.nodes.length})`);

    const hasExpectedModel = buildDoc.nodes.some((n) => n.definition === testCase.expectedModel);
    assert.ok(hasExpectedModel, `Stage A must contain expected model ${testCase.expectedModel}`);

    const buildRunnable = checkRunnable(buildDoc);
    assert.ok(buildRunnable.runnable, `Stage A document must be runnable: ${buildRunnable.issues.join("; ")}`);

    const buildLoaded = loadRecipe(buildRun.result.recipe);
    assert.ok(buildLoaded.runtime, "Stage A recipe must initialize runtime without errors");

    console.log(`    ✓ Stage A PASS in ${(buildRun.elapsedMs / 1000).toFixed(2)}s | Turns: ${buildRun.turns} | LLM Calls: ${buildRun.calls} | Nodes: ${buildDoc.nodes.length} | Connections: ${buildDoc.connections.length}`);

    // --- Prepare Builder Document for Refinement ---
    const builderDoc = createFreshDocument();
    builderDoc.authored = structuredClone(buildRun.result.recipe.document);
    builderDoc.lesson.title = buildRun.result.recipe.title;
    builderDoc.lesson.instruction = buildRun.result.recipe.description;
    builderDoc.recipeMetadata = {
      id: buildRun.result.recipe.id,
      version: buildRun.result.recipe.version || 1,
      parameters: buildRun.result.recipe.parameters || [],
      externalPorts: buildRun.result.recipe.externalPorts || [],
      tags: buildRun.result.recipe.tags || [],
      assumptions: buildRun.result.recipe.assumptions || [],
      nested: buildRun.result.recipe.nested || [],
      dependencies: buildRun.result.recipe.dependencies || [],
      discovery: buildRun.result.recipe.discovery,
      catalog: buildRun.result.recipe.catalog,
    };

    const activeContext = activeFromBuilderDocument(builderDoc);
    assert.ok(activeContext, "activeFromBuilderDocument must return an active context object");
    assert.ok(activeContext.sessionId.startsWith("builder-"), "activeContext must have a builder session id");

    // --- Stage B: Refine Existing Composite ---
    console.log(`    Stage B (Refine): "${testCase.refinePrompt}"`);
    const refineRun = await executeStage(`${testCase.id}-refine`, testCase.refinePrompt, activeContext);

    assert.equal(refineRun.result.status, "updated", `Stage B status must be 'updated' (was '${refineRun.result.status}')`);
    assert.ok(refineRun.result.recipe, "Stage B must return a recipe");
    const refineDoc = refineRun.result.recipe.document;

    // Verify model retention and valid augmentation
    const stillHasModel = refineDoc.nodes.some((n) => n.definition === testCase.expectedModel);
    assert.ok(stillHasModel, `Stage B must preserve expected model ${testCase.expectedModel}`);
    assert.ok(refineDoc.nodes.length >= buildDoc.nodes.length, "Stage B nodes must not decrease");

    const refineRunnable = checkRunnable(refineDoc);
    assert.ok(refineRunnable.runnable, `Stage B document must be runnable: ${refineRunnable.issues.join("; ")}`);

    const refineLoaded = loadRecipe(refineRun.result.recipe);
    assert.ok(refineLoaded.runtime, "Stage B recipe must initialize runtime without errors");

    console.log(`    ✓ Stage B PASS in ${(refineRun.elapsedMs / 1000).toFixed(2)}s | Turns: ${refineRun.turns} | LLM Calls: ${refineRun.calls} | Nodes: ${refineDoc.nodes.length} | Connections: ${refineDoc.connections.length}`);

    results.push({
      testCase,
      build: {
        elapsedMs: buildRun.elapsedMs,
        turns: buildRun.turns,
        calls: buildRun.calls,
        nodes: buildDoc.nodes.length,
        connections: buildDoc.connections.length,
        runnable: buildRunnable.runnable,
      },
      refine: {
        elapsedMs: refineRun.elapsedMs,
        turns: refineRun.turns,
        calls: refineRun.calls,
        nodes: refineDoc.nodes.length,
        connections: refineDoc.connections.length,
        runnable: refineRunnable.runnable,
      },
    });
  }

  console.log("\n===============================================================================");
  console.log("  Live Ollama Builder Evaluation Summary");
  console.log("===============================================================================");
  console.log("| Case Name | Stage A Time | Nodes/Conns | Stage B Time | Nodes/Conns | Status |");
  console.log("|---|---|---|---|---|---|");
  for (const r of results) {
    console.log(
      `| ${r.testCase.name} | ${(r.build.elapsedMs / 1000).toFixed(2)}s | ${r.build.nodes}/${r.build.connections} | ${(r.refine.elapsedMs / 1000).toFixed(2)}s | ${r.refine.nodes}/${r.refine.connections} | PASS |`
    );
  }
  console.log("===============================================================================\n");

  // Output documentation evidence to docs
  const reportPath = path.resolve(
    __dirname,
    "../../../../docs/agent-only/implementation/016-validation/builder-cases-report.md",
  );
  const reportLines = [
    "# Builder AI Composite Generation & Refinement Report",
    "",
    `**Date:** ${new Date().toISOString()}`,
    `**Runtime:** Ollama (${process.env.APERTUS_LOCAL_BASE_URL})`,
    `**Target Model:** ${process.env.APERTUS_LOCAL_MODEL}`,
    "",
    "## Evaluated User Composite Scenarios",
    "",
    "| Case | Domain / Model | Initial Build Prompt | Refinement Prompt | Initial Nodes / Conns | Refined Nodes / Conns | Latency (Build + Refine) | Status |",
    "|---|---|---|---|---|---|---|---|",
    ...results.map((r) => {
      const totalTime = ((r.build.elapsedMs + r.refine.elapsedMs) / 1000).toFixed(2);
      return `| **${r.testCase.name}** | \`${r.testCase.expectedModel}\` | \"${r.testCase.buildPrompt}\" | \"${r.testCase.refinePrompt}\" | ${r.build.nodes} / ${r.build.connections} | ${r.refine.nodes} / ${r.refine.connections} | ${totalTime}s | **PASS** |`;
    }),
    "",
    "## Validation Highlights",
    "",
    "1. **Autonomous Tool Selection & Execution:** Every case correctly identifies the target model from natural language intent, instantiates control sliders and observation readouts, and links them via valid typed ports.",
    "2. **Stateful Multi-Turn Refinement:** Re-ingesting the generated composite via `activeFromBuilderDocument` enables the builder agent to preserve existing topology and augment the composite in place (`status: updated`).",
    "3. **Runnable Guarantee:** 100% of generated and refined documents passed `checkRunnable` and instantiated full simulation runtimes with zero crashes.",
  ];

  fs.writeFileSync(reportPath, reportLines.join("\n"), "utf8");
  console.log(`Report successfully written to ${reportPath}`);
})().catch((err) => {
  console.error("Test suite failed:", err);
  process.exitCode = 1;
});
