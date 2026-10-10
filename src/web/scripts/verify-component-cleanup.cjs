// Compatibility guard for implementation 018. Capture only before changing contracts.
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("./test-loader.cjs");
const { publicDefinitions } = load(
  "src/simulations/components/catalog/index.ts",
);
const { assemblyModels } = load("src/simulations/runtime/assembly.ts");
const catalog = load("src/lib/planner/catalog.ts");
const bucket = load("src/lib/planner/bucket.ts");
const registry = load("src/simulations/runtime/recipes/registry.ts");
const fixture = path.join(
  __dirname,
  "fixtures/component-cleanup-contracts.json",
);
const appearances = assemblyModels.map((m) => `appearance/${m.presentation}`);

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}
const hash = (value) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical(value)))
    .digest("hex");
const prompts = [
  "compare friction and stopping distance",
  "addition with three and two",
  "bridge load and selected member",
  "pendulum length and period",
  "dilution concentration",
  "plant growth and water",
  "invent a teleportation engine",
];

function contracts() {
  return {
    definitions: Object.fromEntries(
      [...publicDefinitions].map(([id, definition]) => {
        // This is the only allowed metadata correction; all remaining fields are protected.
        const normalized = appearances.includes(id)
          ? {
              ...definition,
              lifecycle: {
                ...definition.lifecycle,
                authored: [],
                presentation: [],
              },
            }
          : definition;
        return [id, hash(normalized)];
      }),
    ),
    initialCards: Object.fromEntries(
      [...publicDefinitions.keys()].map((id) => [
        id,
        hash(bucket.buildInitialCard(id)),
      ]),
    ),
    compositeCards: Object.fromEntries(
      registry
        .listPremadeRecipes()
        .map(({ slug }) => [slug, hash(bucket.buildCompositeCard(slug))]),
    ),
    buckets: Object.fromEntries(
      prompts.map((prompt) => [
        prompt,
        hash(bucket.retrieveComponentBucket(prompt)),
      ]),
    ),
    capabilityCards: hash(catalog.capabilityCards()),
    compatibleComponents: hash(catalog.compatibleComponents()),
  };
}

if (process.argv.includes("--capture")) {
  fs.mkdirSync(path.dirname(fixture), { recursive: true });
  fs.writeFileSync(
    fixture,
    `${JSON.stringify(canonical(contracts()), null, 2)}\n`,
  );
  console.log("Captured public contracts and AI projections before cleanup.");
} else {
  // Implementation 021 adds agent capabilities. Protect every historical contract
  // while admitting only these explicit additions; never recapture the baseline.
  // Implementation 022 adds four authored systems. Verify the historical catalog
  // in isolation so approved additions cannot displace old top-12 retrieval cards.
  // Implementation 023 explicitly admits nine science models, their views and controls.
  // Historical hashes remain unchanged; the science suite checks new contracts.
  // Implementation 024 admits three cycle models and their independent UI nodes.
  // Their own contracts and real round trips are covered by test:systems/test:recipes.
  const newSlugs = new Set([
    "nutrient-limitation",
    "craft-production",
    "wildfire",
    "food-web",
    "cell-division",
    "immune-defense",
    "genome-to-organism",
    "pollination-network",
    "invasive-species",
    "inside-earth",
    "plate-boundaries",
    "volcano-life-cycle",
    "water-cycle",
    "oxygen-cycle",
    "nitrogen-cycle",
    "carbon-cycle",
  ]);
  const newModels = assemblyModels.filter((m) =>
    ["ecology", "social-systems", "science", "biogeochemistry"].includes(
      m.ref.split("/")[1],
    ),
  );
  assert.equal(
    newModels.filter((m) => m.ref.startsWith("prefabs/science/")).length,
    9,
  );
  assert.equal(newModels.length, 16);
  assert.equal(
    newModels.filter((m) => m.ref.startsWith("prefabs/biogeochemistry/"))
      .length,
    3,
  );
  const newIds = newModels.flatMap((m) => [
    m.ref,
    `appearance/${m.presentation}`,
    `resources/${m.ref.replaceAll("/", "-")}`,
  ]);
  newIds.push(
    "controls/FoodWebPopulation",
    "displays/ScienceObservations",
    ...newModels
      .filter((m) => m.ref.startsWith("prefabs/science/"))
      .map((m) => `controls/${m.presentation}`),
  );
  for (const kind of ["oxygen", "nitrogen", "carbon"])
    newIds.push(
      `controls/cycle-${kind}-action`,
      `controls/cycle-${kind}-activity`,
      `displays/cycle-${kind}-caption`,
    );
  // Implementation 025 adds spring capabilities without changing historical contracts.
  newIds.push("models/SpringMass", "appearance/SpringMass");
  const restored = new Map(newIds.map((id) => [id, publicDefinitions.get(id)]));
  const allRecipes = registry.listPremadeRecipes;
  const historicalRecipes = allRecipes().filter(
    (entry) => !newSlugs.has(entry.slug),
  );
  for (const [id, definition] of restored) {
    assert.ok(definition, id);
    publicDefinitions.delete(id);
  }
  registry.listPremadeRecipes = () => historicalRecipes;
  let current;
  try {
    current = canonical(contracts());
  } finally {
    registry.listPremadeRecipes = allRecipes;
    for (const [id, definition] of restored)
      publicDefinitions.set(id, definition);
  }
  const added = [
    "models/AIAgent",
    "models/AgentSession",
    "models/DebateSession",
    "controls/AgentActions",
    "displays/AgentProfile",
    "displays/AgentTranscript",
  ];
  for (const id of added) {
    assert.ok(current.definitions[id] && current.initialCards[id], id);
    delete current.definitions[id];
    delete current.initialCards[id];
  }
  assert.ok(current.compositeCards["agent-conversation"]);
  delete current.compositeCards["agent-conversation"];
  assert.ok(current.compositeCards.debate);
  delete current.compositeCards.debate;
  assert.deepEqual(
    current,
    JSON.parse(fs.readFileSync(fixture, "utf8")),
    "Public contracts or AI projections changed beyond the allowed appearance lifecycle correction",
  );
  for (const id of appearances) {
    const definition = publicDefinitions.get(id);
    if (
      id.startsWith("appearance/science-") ||
      id.startsWith("appearance/cycle-")
    ) {
      assert.deepEqual(definition.lifecycle.authored, ["question"], id);
      assert.deepEqual(
        Object.keys(definition.configuration.properties),
        ["question"],
        id,
      );
      assert.equal(definition.configuration.properties.question.maxLength, 180);
    } else {
      assert.deepEqual(definition.lifecycle.authored, [], id);
      assert.deepEqual(definition.configuration.properties, {}, id);
    }
    assert.deepEqual(definition.lifecycle.presentation, [], id);
  }
  // Each appearance owns its lifecycle metadata, even when initialized from the same factory.
  const first = publicDefinitions.get(appearances[0]);
  const second = publicDefinitions.get(appearances[1]);
  assert.notEqual(first.lifecycle, second.lifecycle);
  assert.notEqual(first.lifecycle.authored, second.lifecycle.authored);
  const React = require("react");
  const { renderToStaticMarkup } = require("react-dom/server");
  const { builtInRecipes } = load(
    "src/simulations/components/composites/catalog.ts",
  );
  const { RecipeLesson } = load(
    "src/simulations/components/views/RecipeLesson.tsx",
  );
  const markupBaseline = JSON.parse(
    fs.readFileSync(
      path.join(__dirname, "fixtures/component-cleanup-markup.json"),
      "utf8",
    ),
  );
  const rendered = Object.fromEntries(
    builtInRecipes.map((recipe) => {
      const ids = new Map();
      const html = renderToStaticMarkup(
        React.createElement(RecipeLesson, { document: recipe.document }),
      )
        .replace(/_R_[a-zA-Z0-9]+_/g, (id) => {
          if (!ids.has(id)) ids.set(id, `react-id-${ids.size}`);
          return ids.get(id);
        })
        .replace(/ data-stck="[^"]*"/g, "");
      return [
        recipe.id,
        crypto.createHash("sha256").update(html).digest("hex"),
      ];
    }),
  );
  if (process.argv.includes("--capture-markup")) {
    fs.writeFileSync(
      path.join(__dirname, "fixtures/component-cleanup-markup.json"),
      `${JSON.stringify(rendered, null, 2)}\n`,
    );
  } else {
    assert.ok(rendered["prebuilt/models-SpringMass"]);
    delete rendered["prebuilt/models-SpringMass"];
    assert.deepEqual(
      rendered,
      markupBaseline,
      "Built-in recipe markup changed beyond React IDs/dynamic stack traces",
    );
  }
  console.log(
    `${builtInRecipes.length} built-in recipes preserve their pre-refactor initial markup.`,
  );
  const { defaultAssembly, compileAssembly } = load(
    "src/simulations/runtime/assembly.ts",
  );
  const session = load("src/simulations/runtime/session.ts");
  const { useAssemblyStore } = load(
    "src/simulations/runtime/assemblySession.ts",
  );
  const { naturalCommand, NaturalControls } = load(
    "src/simulations/components/controls/natural-systems/NaturalControls.tsx",
  );
  const assembly = defaultAssembly("prefabs/natural-systems/PlantGrowth");
  session.activateSession("assembly", compileAssembly(assembly).definition);
  try {
    const messages = [];
    const command = naturalCommand((message) => messages.push(message));
    const instance = useAssemblyStore.getState().instances[0];
    assert.equal(command(instance, "PLANT_SET_LIGHT", 0.6).accepted, true);
    const before = useAssemblyStore.getState();
    const rejected = command(instance, "PLANT_SET_LIGHT", 2);
    assert.equal(rejected.accepted, false);
    assert.equal(messages.at(-1), rejected.error);
    assert.equal(
      useAssemblyStore.getState(),
      before,
      "Rejected command leaves accepted state untouched",
    );
    // Exercise the retained form adapter, not just its dispatcher.
    const controls = NaturalControls({
      instance,
      command,
      boundActions: ["PLANT_SET_LIGHT"],
    });
    const numericControl = controls.props.children[0][0];
    const form = numericControl.type(numericControl.props);
    assert.equal(form.props.onSubmit({ value: 2 }).accepted, false);
    assert.equal(useAssemblyStore.getState(), before);
  } finally {
    session.disposeSession();
  }
  const { mathBoardFor, readyBridge, readyTown, projectileInstance } = load(
    "src/simulations/components/views/recipe/snapshotAdapters.ts",
  );
  assert.equal(
    mathBoardFor({ id: "test", demo: "arithmetic", sequence: {} }, "counting"),
    undefined,
  );
  assert.equal(readyBridge({ ready: false }), undefined);
  assert.equal(readyTown({ ready: false }), undefined);
  assert.throws(
    () => projectileInstance({ id: "wrong-model" }),
    /Projectile snapshot/,
  );
  console.log(
    "Component cleanup: all public contracts and AI cards/buckets preserved; appearance lifecycle corrected.",
  );
  console.log(
    "Natural controls propagate actual acceptance and preserve state on rejection; snapshot adapters reject mismatched models.",
  );
}
