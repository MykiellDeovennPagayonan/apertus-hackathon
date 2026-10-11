const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { load } = require("../../test-loader.cjs");
const { thermalOptics, thermalOpticsSpecs } = load(
  "src/simulations/domains/physics/thermalOptics.ts",
);
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts"),
  { serializeRecipe } = load(
    "src/simulations/runtime/recipes/serializeRecipe.ts",
  );
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { assemblyCapability } = load("src/simulations/runtime/assembly.ts");
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { acceptedCommandArguments } = load(
  "src/simulations/components/controls/commandPresentation.ts",
);
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
const { thermalOpticsRequirements } = load(
  "src/simulations/components/catalog/physicsThermalOptics.ts",
);
const root = path.resolve(__dirname, "../../..");
for (const c of require("./a4-cases.json")) {
  const m = thermalOptics.models.find((m) => m.ref === c.ref),
    recipe = JSON.parse(
      fs.readFileSync(
        path.join(root, "src/simulations/pre-made", c.slug, "recipe.json"),
      ),
    );
  assert.equal(assemblyCapability(m).ref, c.ref);
  assert.deepEqual(compositionIssues(recipe.document), [], c.id);
  const runtime = loadRecipe(recipe).runtime,
    spec = thermalOpticsSpecs.find((s) => s.key === c.kind);
  const control = spec
    ? spec.controls.find((c) => c.type === "Slider") ||
      spec.controls.find((c) => c.type === "Button")
    : { field: "time", command: "PT_COOLING_TIME", type: "Slider" };
  const value =
    control.type === "Button"
      ? undefined
      : control.field === "time"
        ? 10
        : control.field === "position"
          ? 0
          : control.field === "distance"
            ? 5
            : control.field === "entry"
              ? 30
              : control.field === "length"
                ? 0.325
                : control.field === "speed"
                  ? 10
                  : m.defaults[control.field];
  const submitted = runtime.submit(
    `control/${control.field}`,
    value === undefined ? {} : { value },
  );
  assert.equal(
    submitted.accepted,
    true,
    `${c.id}: ${JSON.stringify(submitted)}`,
  );
  const before = structuredClone(runtime.getSnapshot().state);
  assert.equal(
    runtime.dispatch([
      { node: "model0", command: control.command, arguments: { value: "bad" } },
    ]).accepted,
    false,
  );
  assert.deepEqual(
    runtime.getSnapshot().state,
    before,
    "rejected input preserves all accepted states",
  );
  const saved = JSON.parse(serializeRecipe(recipe, runtime.capture()));
  assert.deepEqual(loadRecipe(saved).runtime.getSnapshot().state, before);
  assert.deepEqual(saved.document.presentation, recipe.document.presentation);
  for (const ctr of spec?.controls || [
    { command: "PT_COOLING_TIME", type: "Slider" },
  ])
    if (ctr.type !== "Button")
      assert.ok(
        "value" in acceptedCommandArguments(ctr.command, before.model0),
      );
  const pair = structuredClone(recipe.document),
    first = pair.nodes.find((n) => n.id === "model0");
  pair.nodes.push({ ...structuredClone(first), id: "extra" });
  const independent = new DocumentRuntime(pair),
    original = structuredClone(independent.getSnapshot().state.model0);
  assert.equal(
    independent.dispatch([
      {
        node: "extra",
        command: control.command,
        arguments: value === undefined ? {} : { value },
      },
    ]).accepted,
    true,
  );
  assert.deepEqual(
    independent.getSnapshot().state.model0,
    original,
    "independent structural model editing",
  );
  assert.ok(thermalOpticsRequirements[c.ref]);
  for (const prompt of c.prompts)
    assert.ok(
      retrieveComponentBucket(prompt).some((card) => card.id === c.ref),
      `${c.id} missing from retrieval: ${prompt}`,
    );
  console.log(
    `${c.id}: provider, composition, live commands, rejection recovery, serialization, independent structure and 3 prompt retrievals PASS`,
  );
}
