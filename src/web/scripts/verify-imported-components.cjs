const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("./test-loader.cjs");
const contract = load("src/simulations/runtime/imported/contract.ts");
const { htmlRecipe } = load("src/simulations/runtime/imported/recipe.ts");
const { validateRecipe, insertRecipe, selectionRecipe } = load(
  "src/simulations/runtime/authoring/recipes.ts",
);
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { emptyAuthoredDocument } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { validateAuthoredDocument, validateConnection } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { parseDocument, serializeDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const source = fs.readFileSync(
  "public/component-authoring/v1/component-starter-v1.html",
  "utf8",
);
const manifest = contract.inspectSource(source);
assert.equal(manifest.apiVersion, 1);
const invalid = (change) => {
  const m = structuredClone(manifest);
  change(m);
  assert.throws(() => contract.validateManifest(m));
};
invalid((m) => {
  m.apiVersion = 2;
});
invalid((m) => {
  m.unknown = true;
});
invalid((m) => {
  m.inputs.value.schema.minimum = 101;
});
invalid((m) => {
  m.inputs.value.default = "1";
});
invalid((m) => {
  delete m.inputs.value.default;
});
invalid((m) => {
  m.actions.bad = { description: "Bad action", arguments: { type: "boolean" } };
});
invalid((m) => {
  m.outputs.value.schema = JSON.parse(
    '{"type":"object","properties":{"__proto__":{"type":"boolean"}}}',
  );
});
assert.throws(() =>
  contract.inspectSource(
    source.replace(
      "</head>",
      '<script src="https://example.com/code.js"></script></head>',
    ),
  ),
);
assert.throws(() =>
  contract.inspectSource(
    source.replace("</body>", "<template><iframe></iframe></template></body>"),
  ),
);
assert.throws(() =>
  contract.inspectSource(
    source.replace(
      "</head>",
      '<meta http-equiv="refresh" content="0;url=https://example.com"></head>',
    ),
  ),
);
assert.throws(() =>
  contract.inspectSource(
    source.replace(
      "</body>",
      '<img src="https://example.com/image.png"></body>',
    ),
  ),
);
assert.throws(() =>
  contract.inspectSource(
    source.replace(
      "</body>",
      '<script type="application/json" id="apertus-component">{}</script></body>',
    ),
  ),
);
assert.throws(() =>
  contract.inspectSource("x".repeat(contract.componentLimits.source + 1)),
);
const required = structuredClone(manifest);
required.inputs.value.required = true;
delete required.inputs.value.default;
contract.validateManifest(required);
assert.throws(() => contract.inputValues(required, {}), /Provide a value/);
assert.deepEqual(contract.inputValues(required, { value: 3 }), { value: 3 });
const recipe = htmlRecipe(source, { value: 5 }, {});
validateRecipe(recipe);
const document = insertRecipe(
  emptyAuthoredDocument(),
  recipe,
  () => {
    throw Error("unexpected dependency");
  },
  (id) => `inserted/${id}`,
);
const node = document.nodes[0];
assert.equal(publicDefinition(node).title, manifest.name);
assert.deepEqual(
  publicDefinition(node).outputs.value.schema,
  manifest.outputs.value.schema,
);
const runtime = new DocumentRuntime(document);
const generation = runtime.getSnapshot().state[node.id].generation;
runtime.acceptImported(node.id, generation, { value: 5 });
assert.equal(runtime.getSnapshot().outputs[node.id].value, 5);
assert.throws(() =>
  runtime.acceptImported(node.id, generation, { value: "invalid" }),
);
runtime.acceptImported(node.id, "stale", { value: 50 });
assert.equal(runtime.getSnapshot().outputs[node.id].value, 5);
runtime.reset();
assert.equal(runtime.getSnapshot().outputs[node.id].value, undefined);
const selection = selectionRecipe(document, [node.id], {
  id: "user/exported",
  title: "Exported",
  description: "Portable",
  tags: [],
});
validateRecipe(selection);
const reopened = parseDocument(serializeDocument(canonicalDocument(document)));
assert.equal(reopened.authored.nodes[0].configuration.source, source);
assert.deepEqual(reopened.authored.nodes[0].configuration.inputs, { value: 5 });
const second = structuredClone(node);
second.id = "second";
document.nodes.push(second);
document.connections.push({
  id: "link",
  kind: "value",
  from: { node: node.id, port: "value" },
  to: { node: second.id, port: "value" },
});
validateAuthoredDocument(document);
const connected = new DocumentRuntime(document);
connected.acceptImported(
  node.id,
  connected.getSnapshot().state[node.id].generation,
  { value: 7 },
);
assert.equal(connected.getSnapshot().state.second.inputs.value, 7);
connected.acceptImported(
  node.id,
  connected.getSnapshot().state[node.id].generation,
  {},
  "Stopped",
);
assert.ok(connected.getSnapshot().state.second.missing);
const mismatch = structuredClone(manifest);
mismatch.inputs.value.schema.maximum = 99;
second.configuration.source = source.replace(
  /(<script type="application\/json" id="apertus-component">)[\s\S]*?(<\/script>)/,
  `$1${JSON.stringify(mismatch)}$2`,
);
assert.throws(
  () => validateConnection(document, document.connections[0]),
  /schemas must match/,
);
second.configuration.source = source;
document.connections.push({
  id: "cycle",
  kind: "value",
  from: { node: second.id, port: "value" },
  to: { node: node.id, port: "value" },
});
assert.throws(() => validateAuthoredDocument(document), /cycle/i);
runtime.dispose();
connected.dispose();
console.log(
  "Imported component contracts, boundaries, runtime outputs, reset, connections, cycles, composites, and portable reopen passed.",
);
