const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("../test-loader.cjs");
const { defaults, inspectSource, IMPORTED_HTML } = load(
  "src/simulations/creation-and-editing/runtime-engine/imported/contract.ts",
);
const { htmlRecipe } = load(
  "src/simulations/creation-and-editing/authoring-engine/compatibility/importedRecipe.ts",
);
const { parseRecipe } = load(
  "src/simulations/creation-and-editing/validator/parseRecipe.ts",
);
const { componentEvidence, htmlComponent } = load(
  "src/simulations/creation-and-editing/validator/componentEvidence.ts",
);
const { verifyComponent } = load(
  "src/simulations/creation-and-editing/validator/imported.ts",
);
const { verifyPublicationComponents } = load(
  "src/lib/projects/componentVerification.ts",
);
const { publicPayload } = load("src/lib/projects/validation.ts");
const { authoringBrief } = load("src/lib/projects/componentAuthoring.ts");
const { componentTrial, applyComponentSuggestions } = load(
  "src/simulations/creation-and-editing/authoring-engine/componentTrial.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/creation-and-editing/runtime-engine/DocumentRuntime.ts",
);
const { importedProvider } = load(
  "src/simulations/creation-and-editing/runtime-engine/imported/provider.ts",
);
const { CommunityRepository, ProjectRepository } = load(
  "src/lib/projects/Repository.ts",
);

(async () => {
  const source = fs.readFileSync(
    "public/component-authoring/v1/component-starter-v1.html",
    "utf8",
  );
  const manifest = inspectSource(source);
  const inputs = defaults(manifest.inputs),
    settings = defaults(manifest.settings);
  const requests = [];
  const runner = {
    request: async (kind) => {
      requests.push(kind);
    },
    close() {},
  };
  const report = await verifyComponent(
    source,
    runner,
    { inputs, settings, viewport: { width: 640, height: 360, pixelRatio: 1 } },
    new AbortController().signal,
    [],
    () => runner,
  );
  assert.equal(report.status, "passed");
  assert.deepEqual(report.inputs, inputs);
  assert.ok(requests.includes("dispose"));
  const recipe = htmlRecipe(source, inputs, settings, report);
  assert.equal(recipe.recipeVersion, 2);
  assert.equal(htmlComponent(recipe).definition, IMPORTED_HTML);
  assert.equal(publicPayload("composition", recipe).recipeVersion, 2);
  verifyPublicationComponents(recipe.document);
  const old = structuredClone(recipe);
  old.recipeVersion = 1;
  assert.equal(parseRecipe(old).recipeVersion, 2);
  assert.deepEqual(parseRecipe(old).document, recipe.document);
  assert.throws(
    () => publicPayload("composition", htmlRecipe(source, inputs, settings)),
    /checks/,
  );
  const tampered = structuredClone(recipe);
  tampered.document.nodes[0].configuration.source += "\n<!-- edited -->";
  assert.throws(
    () => verifyPublicationComponents(tampered.document),
    /HTML changed/,
  );
  const failed = structuredClone(recipe);
  failed.document.nodes[0].configuration.verification = JSON.stringify({
    ...report,
    status: "failed",
  });
  assert.throws(() => publicPayload("composition", failed), /technical checks/);
  const missingCheck = structuredClone(recipe);
  missingCheck.document.nodes[0].configuration.verification = JSON.stringify({
    ...report,
    checks: [],
  });
  assert.throws(
    () => componentEvidence(missingCheck.document.nodes[0]),
    /technical checks/,
  );
  const input = Object.keys(manifest.inputs)[0];
  if (input) {
    const changed = structuredClone(recipe);
    changed.document.nodes[0].configuration.inputs[input] =
      manifest.inputs[input].schema.minimum;
    if (changed.document.nodes[0].configuration.inputs[input] !== inputs[input])
      assert.throws(
        () => verifyPublicationComponents(changed.document),
        /changed/,
      );
  }
  const trial = componentTrial(recipe);
  assert.ok(trial.suggestions.length > 0);
  const document = applyComponentSuggestions(
    trial.document,
    trial.suggestions,
    trial.suggestions.map((s) => s.id),
  );
  assert.equal(recipe.document.nodes.length, 1);
  assert.equal(htmlComponent({ ...recipe, document }), undefined);
  const runtime = new DocumentRuntime(document);
  const numberSuggestion = trial.suggestions.find(
    (s) => s.definition === "controls/NumberInput",
  );
  if (numberSuggestion) {
    const port = numberSuggestion.to.port.slice(4);
    const value = manifest.inputs[port].schema.maximum;
    assert.equal(runtime.submit(numberSuggestion.id, { value }).accepted, true);
    assert.equal(runtime.getSnapshot().state.component.inputs[port], value);
    assert.equal(
      runtime.submit(numberSuggestion.id, { value: value + 1 }).accepted,
      false,
    );
    runtime.reset();
    assert.equal(
      runtime.getSnapshot().state.component.inputs[port],
      inputs[port],
    );
    const node = recipe.document.nodes[0];
    const state = importedProvider.apply(
      importedProvider.initialize(node),
      `set:${port}`,
      { value },
      node,
    );
    const synced = importedProvider.synchronize(
      state,
      { [port]: [inputs[port]] },
      node,
    );
    assert.equal(
      synced.inputs[port],
      inputs[port],
      "Connected values take precedence over manual controls",
    );
  }
  if (numberSuggestion) {
    const node = structuredClone(recipe.document.nodes[0]);
    const port = numberSuggestion.to.port.slice(4);
    const live = importedProvider.apply(
      importedProvider.initialize(node),
      `set:${port}`,
      { value: manifest.inputs[port].schema.maximum },
      node,
    );
    node.configuration.inputs[port] = 50;
    const authored = importedProvider.reinitialize(live, node);
    assert.equal(
      importedProvider.synchronize(authored, {}, node).inputs[port],
      50,
      "An authored input edit replaces temporary control values",
    );
  }
  runtime.dispose();
  assert.throws(
    () =>
      applyComponentSuggestions(trial.document, trial.suggestions, ["unknown"]),
    /no longer available/,
  );
  const workspaceTrial = componentTrial(recipe, recipe.document);
  const existingInput = workspaceTrial.suggestions.find((s) =>
    s.id.startsWith("existing-input/"),
  );
  assert.ok(existingInput, "Matching existing output is suggested");
  const alternativeControl = workspaceTrial.suggestions.find((s) =>
    s.id.endsWith("input-value"),
  );
  assert.throws(
    () =>
      applyComponentSuggestions(
        workspaceTrial.document,
        workspaceTrial.suggestions,
        [existingInput.id, alternativeControl.id],
      ),
    /choose one input source/,
  );

  const connectedDocument = applyComponentSuggestions(
    workspaceTrial.document,
    workspaceTrial.suggestions,
    [existingInput.id],
  );
  assert.equal(
    connectedDocument.nodes.length,
    2,
    "Using an existing endpoint does not add a helper component",
  );
  const connectedRuntime = new DocumentRuntime(connectedDocument);
  const originalState = connectedRuntime.getSnapshot().state.component;
  connectedRuntime.acceptImported("component", originalState.generation, {
    value: 23,
  });
  assert.equal(
    connectedRuntime.getSnapshot().state[existingInput.to.node].inputs.value,
    23,
  );
  connectedRuntime.dispose();
  const wrongUnits = htmlRecipe(
    source.replaceAll('"unit": ""', '"unit": "m"'),
    inputs,
    settings,
  );
  assert.equal(
    componentTrial(recipe, wrongUnits.document).suggestions.some((s) =>
      s.id.startsWith("existing-input/"),
    ),
    false,
    "Different units are not suggested",
  );
  const wrongBounds = htmlRecipe(
    source.replaceAll('"minimum": 0', '"minimum": -1'),
    inputs,
    settings,
  );
  assert.equal(
    componentTrial(recipe, wrongBounds.document).suggestions.some((s) =>
      s.id.startsWith("existing-input/"),
    ),
    false,
    "Different schema bounds are not suggested",
  );
  const complexManifest = structuredClone(manifest);
  complexManifest.settings.tint = {
    description: "Tint",
    schema: { type: "string", minLength: 1, maxLength: 10 },
    unit: "",
    default: "green",
  };
  complexManifest.inputs.enabled = {
    description: "Enabled",
    schema: { type: "boolean" },
    unit: "",
    required: false,
    default: false,
  };
  complexManifest.inputs.choice = {
    description: "Choice",
    schema: { type: "enum", values: ["first", null] },
    unit: "",
    required: false,
    default: "first",
  };
  complexManifest.inputs.data = {
    description: "Data",
    schema: {
      type: "object",
      properties: {
        count: { type: "integer", minimum: 0, maximum: 10 },
        values: {
          type: "array",
          items: { type: "number", minimum: 0, maximum: 10 },
          minItems: 1,
          maxItems: 2,
        },
      },
    },
    unit: "",
    required: false,
    default: { count: 1, values: [2] },
  };
  complexManifest.actions.ping = {
    description: "Ping",
    arguments: { type: "object", properties: {} },
  };
  complexManifest.actions.change = {
    description: "Change",
    arguments: {
      type: "object",
      properties: { amount: { type: "number", minimum: 0, maximum: 10 } },
    },
  };
  const complexSource = source.replace(
    /(<script type="application\/json" id="apertus-component">)[\s\S]*?(<\/script>)/,
    (_, open, close) => `${open}${JSON.stringify(complexManifest)}${close}`,
  );
  const complexInputs = { ...defaults(complexManifest.inputs), choice: null };
  const complexReport = await verifyComponent(
    complexSource,
    runner,
    {
      inputs: complexInputs,
      settings: defaults(complexManifest.settings),
      viewport: { width: 640, height: 360, pixelRatio: 1 },
    },
    new AbortController().signal,
    [],
    () => runner,
  );
  const complexRecipe = htmlRecipe(
    complexSource,
    complexInputs,
    defaults(complexManifest.settings),
    complexReport,
  );
  verifyPublicationComponents(complexRecipe.document);
  const changedSettings = structuredClone(complexRecipe);
  changedSettings.document.nodes[0].configuration.settings.tint = "blue";
  assert.throws(
    () => verifyPublicationComponents(changedSettings.document),
    /settings changed/,
  );
  const complexTrial = componentTrial(complexRecipe);
  const nullable = complexTrial.suggestions.find((s) =>
    s.id.endsWith("input-choice"),
  );
  assert.equal(
    JSON.parse(nullable.configuration.initial).value,
    null,
    "Null input values are preserved",
  );
  const complexDocument = applyComponentSuggestions(
    complexTrial.document,
    complexTrial.suggestions,
    complexTrial.suggestions.map((s) => s.id),
  );
  const complexRuntime = new DocumentRuntime(complexDocument);
  const objectControl = complexTrial.suggestions.find((s) =>
    s.id.endsWith("input-data"),
  );
  assert.equal(
    complexRuntime.submit(objectControl.id, {
      value: { count: 3, values: [4] },
    }).accepted,
    true,
  );
  assert.deepEqual(complexRuntime.getSnapshot().state.component.inputs.data, {
    count: 3,
    values: [4],
  });
  complexRuntime.dispose();

  const brief = authoringBrief(
    "Wave",
    "Show how frequency changes waves",
    "Contract text",
    "<html></html>",
  );
  assert.match(brief, /frequency changes waves/);
  assert.match(brief, /Contract text/);
  assert.match(brief, /```html/);
  assert.throws(() => authoringBrief("", "", "", ""), /Describe/);

  let filter;
  const db = {
    collection: () => ({
      find: (value) => {
        filter = value;
        return {
          sort() {
            return this;
          },
          limit() {
            return this;
          },
          async toArray() {
            return [];
          },
        };
      },
    }),
  };
  await new CommunityRepository(db).list({
    kind: "component",
    query: "wave",
    cursor: Buffer.from(
      JSON.stringify([new Date().toISOString(), "previous"]),
    ).toString("base64url"),
  });
  assert.equal(filter["payload.document.nodes.0.definition"], IMPORTED_HTML);
  assert.equal(filter.$or.length, 2, "Search survives the component filter");
  assert.equal(
    filter.$and.length,
    1,
    "Pagination survives the component filter",
  );
  await new CommunityRepository(db).list({ kind: "composition" });
  assert.equal(
    filter.$nor[0]["payload.document.nodes.0.definition"],
    IMPORTED_HTML,
  );

  const publications = [];
  const project = {
    projectId: recipe.id,
    projectType: "composition",
    name: recipe.title,
    payload: recipe,
    sharingAllowed: true,
    saveRevision: 1,
  };
  const publishingDB = {
    collection(name) {
      return {
        async findOne() {
          return name === "projects" ? project : null;
        },
        async findOneAndUpdate() {
          return { versionNumber: 1 };
        },
        async insertOne(row) {
          publications.push(row);
        },
        async updateOne() {},
      };
    },
  };
  const client = {
    startSession: () => ({
      withTransaction: (run) => run(),
      async endSession() {},
    }),
  };
  const repository = new ProjectRepository(publishingDB, "author/test");
  const candidate = {
    expectedRevision: 1,
    name: "Wave",
    description: "Test",
    tags: [],
    idempotencyKey: "publication/test",
    licenseAccepted: true,
  };
  project.payload = tampered;
  await assert.rejects(
    repository.publish(client, recipe.id, "composition", candidate, "Author"),
    /HTML changed/,
  );
  assert.equal(
    publications.length,
    0,
    "Stale evidence cannot publish through the API",
  );
  project.payload = htmlRecipe(source, inputs, settings);
  await assert.rejects(
    repository.publish(client, recipe.id, "composition", candidate, "Author"),
    /checks/,
  );
  const published = await repository.publish(
    client,
    recipe.id,
    "composition",
    { ...candidate, componentChecks: { component: report } },
    "Author",
  );
  assert.equal(published.contentKind, "component");
  assert.equal(publications.length, 1);
  assert.equal(
    project.payload.document.nodes[0].configuration.verification,
    undefined,
    "Publishing does not mutate the private project",
  );
  console.log(
    "HTML community: recipes, verification, suggestions, runtime controls, brief, filtering, and publication checks passed.",
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
