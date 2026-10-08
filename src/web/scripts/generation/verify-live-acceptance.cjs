const assert = require("node:assert/strict");
const path = require("node:path");
const fs = require("node:fs");

// Load .env.local
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

const { load } = require("../test-loader.cjs");
const { planPrompt } = load("src/lib/planner/index.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");

(async () => {
  console.log("Starting live evaluation of Acceptance Prompt A against Ollama (apertus-16k)...");
  const prompt = "I wanna know the difference if I have higher friction or weight in momentum";
  const request = {
    protocolVersion: 1,
    requestId: "live-acceptance-prompt-a",
    prompt,
    viewport: { width: 1280, height: 800 },
    active: null,
  };

  const started = Date.now();
  const traces = [];
  const trace = (event, data) => {
    traces.push({ event, data, elapsedMs: Date.now() - started });
    console.log(`[Trace +${Date.now() - started}ms] ${event}:`, JSON.stringify(data).slice(0, 160));
  };

  try {
    const result = await planPrompt(request, undefined, trace);
    const elapsed = Date.now() - started;
    console.log(`Live evaluation finished in ${(elapsed / 1000).toFixed(1)}s`);
    console.log("Result status:", result.status);

    if (result.status === "created") {
      console.log("Recipe title:", result.recipe.title);
      console.log("Coverage level:", result.coverage.level);
      console.log("Covered:", result.coverage.covered);
      console.log("Omitted:", result.coverage.omitted);
      console.log("Explanation:", result.coverage.explanation);
      console.log("Nodes count:", result.recipe.document.nodes.length);
      console.log("Nodes definitions:", result.recipe.document.nodes.map(n => n.definition));

      assert.ok(
        !result.recipe.document.nodes.some(n =>
          n.definition.includes("arithmetic") || n.definition.includes("Bridge")
        ),
        "Arithmetic or bridge must NEVER be relabeled as momentum",
      );

      const loaded = loadRecipe(result.recipe);
      assert.ok(loaded.runtime, "Runtime initialized successfully");

      // Save evidence
      const outDir = path.resolve(__dirname, "../../../../docs/agent-only/implementation/016-validation");
      fs.writeFileSync(
        path.join(outDir, "live-acceptance-prompt-a.json"),
        JSON.stringify({ result, traces, elapsedMs: elapsed }, null, 2),
      );
      console.log("Saved evidence to 016-validation/live-acceptance-prompt-a.json");
    } else if (result.status === "unsupported") {
      console.log("Returned unsupported as expected if no model fits:", result.message);
    }
    console.log("Live test execution complete.");
  } catch (error) {
    console.error("Live test failed with error:", error);
    process.exitCode = 1;
  }
})();
