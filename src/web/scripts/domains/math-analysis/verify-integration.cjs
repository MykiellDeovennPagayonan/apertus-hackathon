const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("../../test-loader.cjs");
const { mathAnalysis, command } = load(
  "src/simulations/domains/math-analysis/models.ts",
);
const { mathAnalysisControls } = load(
  "src/simulations/components/catalog/mathAnalysis.ts",
);
const { assemblyCapability } = load("src/simulations/runtime/assembly.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { serializeRecipe } = load(
  "src/simulations/runtime/recipes/serializeRecipe.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { acceptedCommandArguments } = load(
  "src/simulations/components/controls/commandPresentation.ts",
);
const changed = {
  "feasible-choices": ["set_pens", 5],
  "house-prices": ["price", 1000],
  "score-spread": ["spread", 5],
  "survey-sampling": ["draw", undefined],
  "study-regression": ["score", 10],
  "conditional-bags": ["reveal", undefined],
  "teams-and-podiums": ["toggle", undefined],
  "loan-payments": ["next", undefined],
  "instantaneous-velocity": ["shrink", undefined],
  "accumulated-water": ["refine", undefined],
};
for (const model of mathAnalysis.models) {
  const kind = model.ref.split("/")[2],
    recipe = JSON.parse(
      fs.readFileSync(`src/simulations/pre-made/${kind}/recipe.json`),
    );
  assert.equal(assemblyCapability(model).ref, model.ref);
  assert.deepEqual(compositionIssues(recipe.document), [], kind);
  const runtime = loadRecipe(recipe).runtime;
  const [operation, value] = changed[kind];
  const index = mathAnalysisControls[kind].findIndex(
    (c) => c.operation === operation,
  );
  assert.ok(index >= 0);
  const result = runtime.submit(
    `input/${index}`,
    value === undefined ? {} : { value },
  );
  assert.equal(result.accepted, true, `${kind}: ${JSON.stringify(result)}`);
  const before = structuredClone(runtime.getSnapshot().state.model);
  const bad = runtime.dispatch([
    {
      node: "model",
      command: command(kind, "set_" + Object.keys(model.defaults)[0]),
      arguments: { value: "invalid" },
    },
  ]);
  assert.equal(bad.accepted, false);
  assert.deepEqual(runtime.getSnapshot().state.model, before);
  const saved = JSON.parse(serializeRecipe(recipe, runtime.capture()));
  const reopened = loadRecipe(saved).runtime;
  assert.deepEqual(reopened.getSnapshot().state.model, before, kind);
  assert.deepEqual(saved.document.presentation, recipe.document.presentation);
  for (const c of mathAnalysisControls[kind])
    if (c.type !== "Button") {
      const args = acceptedCommandArguments(command(kind, c.operation), before);
      assert.ok(args && "value" in args, kind);
    }
  const pair = structuredClone(recipe.document);
  pair.nodes.push({ ...structuredClone(pair.nodes[0]), id: "second" });
  const independent = new DocumentRuntime(pair);
  assert.equal(
    independent.dispatch([
      {
        node: "second",
        command: command(kind, operation),
        arguments: value === undefined ? {} : { value },
      },
    ]).accepted,
    true,
  );
  assert.deepEqual(independent.getSnapshot().state.model, model.defaults);
  // Structural observation edit preserves identities and recalculates summaries.
  if (kind === "house-prices" || kind === "study-regression") {
    const field = kind === "house-prices" ? "houses" : "students";
    const observation =
      kind === "house-prices"
        ? { id: "new-house", value: 130 }
        : { id: "new-student", x: 10, y: 40 };
    const next = [...before[field], observation];
    assert.equal(
      runtime.dispatch([
        {
          node: "model",
          command: command(kind, `set_${field}`),
          arguments: { value: next },
        },
      ]).accepted,
      true,
    );
    assert.deepEqual(
      runtime.getSnapshot().state.model[field].slice(0, -1),
      before[field],
    );
    const edited = JSON.parse(serializeRecipe(recipe, runtime.capture()));
    assert.deepEqual(
      loadRecipe(edited).runtime.getSnapshot().state.model[field],
      next,
    );
  }
  console.log(
    `${kind}: compiler, composition, atomic rejection, independent models, accepted controls and save/reopen passed`,
  );
}
