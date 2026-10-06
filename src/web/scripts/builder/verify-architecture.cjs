const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const { load } = require("../test-loader.cjs");
const root = path.resolve(__dirname, "../../src/simulations");
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : /\.tsx?$/.test(entry.name)
          ? [path.join(dir, entry.name)]
          : [],
    );
}
function imports(file, runtimeOnly = false) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const refs = [];
  function visit(node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) {
      if (
        node.moduleSpecifier &&
        !(runtimeOnly && (node.importClause?.isTypeOnly || node.isTypeOnly))
      )
        refs.push(node.moduleSpecifier.text);
    }
    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      ts.isStringLiteral(node.arguments[0])
    )
      refs.push(node.arguments[0].text);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return refs;
}
function resolve(from, ref) {
  const base = path.resolve(path.dirname(from), ref);
  return [base, `${base}.ts`, `${base}.tsx`, path.join(base, "index.ts")].find(
    (p) => fs.existsSync(p) && fs.statSync(p).isFile(),
  );
}
for (const directory of ["components", "runtime", "lessons"])
  for (const file of files(path.join(root, directory))) {
    for (const ref of imports(file))
      if (ref.startsWith(".")) {
        const target = resolve(file, ref);
        assert.ok(target, `Missing import ${ref} in ${file}`);
        assert.ok(
          !target.includes(`${path.sep}builder${path.sep}`),
          `${directory} imports builder: ${file} → ${target}`,
        );
      }
  }
// Loading definitions must not load rendering backends or singleton execution adapters.
const visited = new Set();
function pureDefinitions(file) {
  if (visited.has(file)) return;
  visited.add(file);
  assert.ok(!file.endsWith(".tsx"), `Definition loaded a renderer: ${file}`);
  for (const ref of imports(file, true)) {
    assert.ok(
      !/^(react|react-dom|three|next|@react-three)(\/|$)/.test(ref),
      `Definition loaded ${ref}`,
    );
    if (ref.startsWith(".")) {
      const target = resolve(file, ref);
      assert.ok(
        !/\/(?:session|\w+Session)\.ts$/.test(target),
        `Definition loaded a singleton: ${target}`,
      );
      if (target.endsWith(".ts")) pureDefinitions(target);
    }
  }
}
pureDefinitions(path.join(root, "components/registry.ts"));
for (const file of files(path.join(root, "pre-made"))) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  assert.ok(
    ast.statements.every(
      (node) =>
        ts.isImportDeclaration(node) ||
        ts.isExportDeclaration(node) ||
        ts.isVariableStatement(node),
    ),
    `Premade selection owns implementation: ${file}`,
  );
}
for (const name of [
  "model.ts",
  "definitions.ts",
  "workspace.ts",
  "town.ts",
  "measurements.ts",
  "CartesianScene.tsx",
  "DisplayScene.tsx",
  "TownScene.tsx",
  "CompositionLesson.tsx",
  "useSceneRuntime.ts",
  "runtimeState.ts",
])
  assert.ok(
    !fs.existsSync(path.join(root, "builder/composition", name)),
    `Retired owner remains: ${name}`,
  );
for (const name of [
  "Lesson.tsx",
  "ConnectionWorkspace.tsx",
  "ConnectionSettings.tsx",
  "ComponentLibrary.tsx",
  "connections.ts",
])
  assert.ok(
    !fs.existsSync(path.join(root, "builder", name)),
    `Retired UI remains: ${name}`,
  );
const docs = load("src/simulations/builder/document.ts");
const { composeLegacy } = load(
  "src/simulations/builder/document/migrations/composeLegacy.ts",
);
const { upgradeWorkspace } = load(
  "src/simulations/builder/editor/workspaceCommands.ts",
);
const { componentDefinitions, createObject } = load(
  "src/simulations/components/registry.ts",
);
const { definitions } = load("src/simulations/runtime/catalog.ts");
for (const fixture of require("./fixtures/documents.json")) {
  const source = JSON.parse(fixture.source),
    original = structuredClone(source);
  docs.validateDocument(source);
  assert.deepEqual(docs.parseDocument(fixture.source), source, fixture.name);
  assert.deepEqual(
    JSON.parse(docs.serializeDocument(source)),
    source,
    fixture.name,
  );
  const migrated = composeLegacy(source);
  upgradeWorkspace(migrated.scene);
  assert.deepEqual(
    migrated,
    fixture.migrated,
    `${fixture.name} migration changed`,
  );
  assert.deepEqual(source, original, `${fixture.name} opening modified source`);
}
for (const definition of Object.values(componentDefinitions)) {
  assert.equal(definitions.get(definition.id).composition, definition);
  const a = createObject(definition.kind, "a"),
    b = createObject(definition.kind, "b");
  assert.notEqual(a, b);
  for (const key of Object.keys(a))
    if (a[key] && typeof a[key] === "object") assert.notEqual(a[key], b[key]);
}
const { lineMeasure } = load(
  "src/simulations/components/systems/math-foundations/models.ts",
);
const { lineFromSlope, lineParameters, lineYAt } = load(
  "src/simulations/components/systems/LineGeometrySystem.ts",
);
for (const slope of [-20, -1, 0, 0.1, 20])
  for (const intercept of [-100, 0, 3, 100]) {
    const geometry = lineFromSlope(slope, intercept),
      recipe = lineMeasure({ slope, intercept, xMin: -5, xMax: 5 });
    assert.ok(Math.abs(recipe.yAtZero - lineYAt(geometry, 0)) < 1e-12);
    assert.ok(Math.abs(recipe.yAtOne - lineYAt(geometry, 1)) < 1e-12);
    assert.ok(Math.abs(recipe.rise - lineParameters(geometry).slope) < 1e-12);
    for (const p of recipe.points)
      assert.ok(Math.abs(p.y - lineYAt(geometry, p.x)) < 1e-12);
  }
const { planRoute, compileTown } = load(
  "src/simulations/components/systems/ScheduledTripSystem.ts",
);
const town = require("./fixtures/town.json");
for (const test of town.routes)
  assert.deepEqual(planRoute(town.scene, test.from, test.to), test.route);
const timeline = compileTown(town.scene);
for (const test of town.snapshots)
  assert.deepEqual(timeline(test.time), test.people);
// Runtime updates and reset use only their supplied canvas. Existing singleton session remains untouched.
const { projectedScene } = load(
  "src/simulations/runtime/composition/projectCanvas.ts",
);
const { updateRuntimeObject } = load(
  "src/simulations/runtime/composition/runtimeState.ts",
);
const { useGasStore } = load("src/simulations/runtime/gasSession.ts");
const gas = composeLegacy(docs.createDocument("gas"));
upgradeWorkspace(gas.scene);
const { addCanvas } = load(
  "src/simulations/builder/editor/workspaceCommands.ts",
);
const second = addCanvas(gas.scene, "second");
const extra = createObject("gas", "extra");
gas.scene.objects.push(extra);
gas.scene.workspace.placements.extra = second.id;
const a = projectedScene(gas.scene, gas.scene.workspace.canvases[0]),
  b = projectedScene(gas.scene, second),
  savedB = structuredClone(b),
  singleton = useGasStore.getState();
const updated = updateRuntimeObject(
  a,
  a.objects[0].id,
  "property",
  "volume",
  0.5,
);
assert.equal(updated.inputs.volume, 0.5);
assert.deepEqual(b, savedB);
assert.equal(useGasStore.getState(), singleton);
assert.notEqual(a.objects[0].inputs.volume, 0.5);
assert.throws(() =>
  updateRuntimeObject(a, a.objects[0].id, "property", "volume", -1),
);
assert.deepEqual(b, savedB);
console.log(
  "Shared ownership boundaries, pure registration, saved fixtures, geometry adapters, town routes/timeline, and canvas isolation passed.",
);
