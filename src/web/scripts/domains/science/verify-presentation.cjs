const assert = require("node:assert/strict");
require("./verify-fingerprint.cjs");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { load } = require("../../test-loader.cjs");
const { scienceSpecs, scienceCommand } = load(
  "src/simulations/domains/science/index.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { Appearance } = load(
  "src/simulations/components/views/recipe/RecipeAppearance.tsx",
);
const { SnapshotContext } = load(
  "src/simulations/components/views/recipe/contexts.tsx",
);
const { ScienceObservations, ScienceControls } = load(
  "src/simulations/components/views/SciencePanels.tsx",
);
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
const { ScienceScene } = load(
  "src/simulations/components/visuals/science/ScienceScene.tsx",
);
const render = (runtime, Component, node) =>
  renderToStaticMarkup(
    React.createElement(
      SnapshotContext.Provider,
      { value: runtime.getSnapshot() },
      React.createElement(Component, { runtime, node }),
    ),
  );
for (const spec of scienceSpecs) {
  const recipe = structuredClone(premadeRecipe(spec.slug));
  const appearance = recipe.document.nodes.find((n) => n.id === "appearance");
  const question = "How does changing this condition affect the outcome?";
  appearance.configuration.question = question;
  const { runtime } = loadRecipe(recipe);
  const sceneProps = {
    instance: { id: "scene", state: runtime.getSnapshot().state.model },
  };
  assert.match(
    renderToStaticMarkup(
      React.createElement(ScienceScene, { ...sceneProps, onCommand: () => {} }),
    ),
    /role="button"/,
    `${spec.slug}: scene offers actual object inspection`,
  );
  assert.ok(
    !renderToStaticMarkup(
      React.createElement(ScienceScene, sceneProps),
    ).includes('role="button"'),
    `${spec.slug}: read-only comparison scenes offer no fake controls`,
  );
  assert.ok(render(runtime, Appearance, appearance).includes(question));
  const reopened = loadRecipe({
    ...recipe,
    document: runtime.capture(),
  }).runtime;
  assert.ok(
    render(
      reopened,
      Appearance,
      reopened.document.nodes.find((n) => n.id === "appearance"),
    ).includes(question),
  );
  appearance.configuration.question = "";
  recipe.document.lesson.instruction =
    "What changes in this specific investigation?";
  const generated = loadRecipe(recipe).runtime;
  assert.ok(
    render(
      generated,
      Appearance,
      generated.document.nodes.find((n) => n.id === "appearance"),
    ).includes(recipe.document.lesson.instruction),
  );
  const obs = runtime.document.nodes.find((n) => n.id === "observations");
  const inspection = { ...obs, configuration: { panel: "inspection" } };
  const markup = render(runtime, ScienceObservations, inspection);
  assert.ok(markup.includes("Inspect an object"));
  assert.ok(
    !markup.includes("science-explanation"),
    "Inspection is distinct from caption mode",
  );
  if (spec.kind === "cell") {
    const playback = runtime.document.nodes.find((n) => n.id === "playback");
    const conditions = runtime.document.nodes.find(
      (n) => n.id === "conditions",
    );
    assert.match(
      render(runtime, ScienceControls, playback),
      /disabled=""[^>]*>Back/,
    );
    assert.match(render(runtime, ScienceControls, conditions), /role="switch"/);
    assert.ok(
      !render(runtime, ScienceControls, conditions).includes("<dialog"),
    );
    const markup = renderToStaticMarkup(
      React.createElement(ScienceScene, sceneProps),
    );
    assert.equal(
      (markup.match(/data-chromosome=/g) || []).length,
      8,
      "Chromosome copies keep stable elements across stages",
    );
  }
  const step = (command) =>
    assert.ok(
      runtime.dispatch([
        {
          node: "model",
          command: scienceCommand(spec.kind, command),
          arguments: {},
        },
      ]).accepted,
    );
  if (spec.kind === "immune") step("EXPOSE");
  if (spec.kind === "invasive") step("INTRODUCE");
  step("STEP");
  step("STEP");
  step("BASELINE");
  const before = structuredClone(runtime.getSnapshot().state.model.baseline);
  step("RESTART");
  assert.deepEqual(runtime.getSnapshot().state.model.baseline, before);
  assert.match(
    render(runtime, ScienceObservations, {
      ...obs,
      configuration: { panel: "comparison" },
    }),
    /Unmatched runs/,
  );
  if (spec.kind === "immune") step("EXPOSE");
  if (spec.kind === "invasive") step("INTRODUCE");
  step("STEP");
  step("STEP");
  assert.match(
    render(runtime, ScienceObservations, {
      ...obs,
      configuration: { panel: "comparison" },
    }),
    /Same seed and 2/,
  );
  assert.deepEqual(
    runtime.getSnapshot().state.model.baseline,
    before,
    "Comparison never mutates retained state",
  );
  const conditions = runtime.document.nodes.find((n) => n.id === "conditions");
  assert.ok(
    conditions,
    `${spec.slug}: investigation is independently editable`,
  );
  for (const field of spec.settings)
    assert.ok(
      runtime.document.connections.some(
        (c) =>
          c.kind === "command" &&
          c.from.node === conditions.id &&
          c.to.port ===
            scienceCommand(spec.kind, `SET_${field.key.toUpperCase()}`),
      ),
      `${spec.slug}: ${field.key} is operable`,
    );
}
const paraphrases = require("./cases.cjs").paraphraseCases;
for (const c of paraphrases) {
  assert.ok(
    retrieveComponentBucket(c.prompt).some((x) => x.id === c.definition),
    `${c.id}: discoverable without an AI-supplied vocabulary repair`,
  );
  const intent = {
    goal: c.prompt,
    concepts: [],
    interactions: [],
    observations: [],
    explicitConstraints: [],
    suggestedStructure: "single",
  };
  assert.ok(
    retrieveComponentBucket(c.prompt, intent).some(
      (x) => x.id === c.definition,
    ),
    `${c.id}: discoverable with intent`,
  );
}
for (const prompt of [
  "Calculate mortgage interest",
  "Build a shopping checkout queue",
  "Show the area of a rectangle",
])
  assert.ok(
    !retrieveComponentBucket(prompt).some((x) =>
      x.id.startsWith("prefabs/science/"),
    ),
    "Unrelated prompts do not acquire science providers",
  );
console.log(
  "Science presentation: authored questions and save/reopen, instruction fallback, distinct inspection/comparison, retained snapshots, connected investigations, and 27 paraphrases passed. No live inference is claimed.",
);
