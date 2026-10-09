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
const { listPremadeRecipes } = load(
  "src/simulations/runtime/recipes/registry.ts",
);
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
      listPremadeRecipes().map(({ slug }) => [
        slug,
        hash(bucket.buildCompositeCard(slug)),
      ]),
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
  const current = canonical(contracts());
  const added = [
    "models/AIAgent",
    "models/AgentSession",
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
  assert.deepEqual(
    current,
    JSON.parse(fs.readFileSync(fixture, "utf8")),
    "Public contracts or AI projections changed beyond the allowed appearance lifecycle correction",
  );
  for (const id of appearances) {
    const definition = publicDefinitions.get(id);
    assert.deepEqual(definition.lifecycle.authored, [], id);
    assert.deepEqual(definition.lifecycle.presentation, [], id);
    assert.deepEqual(definition.configuration.properties, {}, id);
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
  } else
    assert.deepEqual(
      rendered,
      markupBaseline,
      "Built-in recipe markup changed beyond React IDs/dynamic stack traces",
    );
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
