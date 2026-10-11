const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("../test-loader.cjs");
const { retrieveCapabilities } = load("src/lib/planner/catalog.ts");
const { GenerationBudget } = load("src/lib/planner/budget.ts");
const { selectCapability } = load(
  "src/lib/planner/selection/selectCapability.ts",
);
const out = path.resolve(
  process.env.GENERATION_EVIDENCE_DIR ||
    "/tmp/apertus-generation-live-selection",
);
assert.equal(fs.existsSync(out), false, "Use a fresh evidence directory");
const prompt = "Help me compare arithmetic and rectangle area.";
const intent = {
  goal: "Compare arithmetic and rectangle area",
  concepts: ["arithmetic", "area"],
  interactions: [],
  observations: [],
  explicitConstraints: [],
  suggestedStructure: "comparison",
};
const ranked = retrieveCapabilities(prompt, intent);
assert.ok(
  ranked.length > 1 && ranked[0].score < ranked[1].score + 8,
  "Genuinely ambiguous verified shortlist",
);
const events = [];
const budget = new GenerationBudget(undefined, (event, data) =>
  events.push({ event, data }),
);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const selected = await selectCapability(
    prompt,
    intent,
    ranked.map((r) => r.card),
    budget,
    () => budget.decision,
  );
  const capability =
    selected.status === "selected" ? selected.capability : null;
  const result = {
    evidence: "live-decision-selection",
    prompt,
    intent,
    ranked,
    selected: capability?.recipeSlug ?? null,
    events,
  };
  fs.writeFileSync(
    path.join(out, "selection.json"),
    JSON.stringify(result, null, 2),
  );
  assert.equal(budget.decisionCalls, 1);
  assert.equal(budget.calls, 0);
  const event = events.find((e) => e.event === "selection.decision");
  assert.ok(
    event && ["accepted", "rejected"].includes(event.data.status),
    "The real decision service must answer, not fall back from unavailability",
  );
  assert.ok(
    !capability ||
      ranked.some((r) => r.card.recipeSlug === capability.recipeSlug),
  );
  console.log(
    `Real ambiguous decision selection: ${event.data.status}; selected=${capability?.recipeSlug ?? "none"}. Evidence: ${out}. This verifies selection transport and gating, not multi-domain creation.`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
