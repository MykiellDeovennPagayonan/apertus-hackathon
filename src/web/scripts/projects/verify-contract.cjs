const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path"),
  ts = require("typescript");
const { load } = require("../test-loader.cjs");
const { nameFields, publicPayload } = load("src/lib/projects/validation.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { parseDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const { reopenAcceptedRecipe, persistRecipe } = load(
  "src/app/experiments/_lib/recipePersistence.ts",
);
const recipe = premadeRecipe("area-perimeter");
function hookHarness(response, edit) {
  const refs = [],
    states = [];
  const react = {
    useState: (v) => [v, (v) => states.push(v)],
    useRef: (v) => {
      const ref = { current: v };
      refs.push(ref);
      return ref;
    },
    useCallback: (f) => f,
    useEffect: () => {},
  };
  const code = ts.transpileModule(
    fs.readFileSync(
      path.resolve(
        __dirname,
        "../../src/simulations/builder/composition/useBuilderAi.ts",
      ),
      "utf8",
    ),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText;
  const module = { exports: {} };
  const requireLocal = (name) => {
    if (name === "react") return react;
    if (name === "../../../lib/planner/browser")
      return { requestGeneration: () => response };
    const base = path.join("src/simulations/builder/composition", name);
    return load(
      fs.existsSync(path.resolve(__dirname, "../..", `${base}.ts`))
        ? `${base}.ts`
        : `${base}/index.ts`,
    );
  };
  new Function("require", "module", "exports", code)(
    requireLocal,
    module,
    module.exports,
  );
  // biome-ignore lint/correctness/useHookAtTopLevel: isolated harness supplies deterministic React hooks.
  const hook = module.exports.useBuilderAi({ doc: canonicalDocument(), edit });
  return { hook, refs, states };
}
async function main() {
  assert.equal(nameFields(" ＬＡＢ  One ").normalizedName, "lab one");
  assert.throws(() => nameFields(""));
  assert.throws(() => nameFields("a\nname"));
  assert.throws(() => nameFields("x".repeat(101)));
  assert.throws(
    () => publicPayload("experiment", canonicalDocument()),
    /Add at least one component/,
  );
  const doc = parseDocument(JSON.stringify(recipe));
  doc.recovery = "private recovery";
  doc.ownerId = "private owner";
  doc.authored.compatibility = {
    source: { private: "legacy copy" },
    notices: [],
  };
  const published = publicPayload("experiment", doc);
  assert.ok(!("recovery" in published));
  assert.ok(!("ownerId" in published));
  assert.ok(!published.authored.compatibility);
  const storage = new Map();
  global.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
  };
  global.sessionStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => storage.set(k, v),
  };
  global.navigator = { locks: { request: async (_key, fn) => fn() } };
  const portable = {
    apertusExportVersion: 1,
    publicationId: "a".repeat(64),
    payload: recipe,
  };
  assert.ok(parseDocument(JSON.stringify(portable)).authored);
  const source = parseDocument(JSON.stringify(recipe));
  storage.set(
    "apertus-builder-library-v1",
    JSON.stringify([{ id: recipe.id, document: source }]),
  );
  storage.set("apertus-accepted-recipe-id", recipe.id);
  assert.ok(await reopenAcceptedRecipe(), "valid guest lesson reopens");
  await persistRecipe({ recipe, serialize: () => JSON.stringify(recipe) });
  assert.equal(
    JSON.parse(storage.get("apertus-builder-library-v1")).length,
    1,
    "reopened revision updates existing local lesson",
  );
  const created = {
    status: "created",
    recipe,
    learnerExplanation: "Ready",
    coverage: { level: "full", explanation: "Ready" },
  };
  let harness = hookHarness(Promise.resolve(created), () => false);
  await harness.hook.onPrompt("build a lesson");
  assert.ok(harness.states.some((s) => s?.kind === "error"));
  assert.ok(
    !harness.states.some((s) => s?.kind === "success"),
    "rejected editor application is not success",
  );
  let finish;
  const delayed = new Promise((r) => (finish = r));
  let applied = false;
  harness = hookHarness(delayed, () => {
    applied = true;
    return true;
  });
  const pending = harness.hook.onPrompt("update a lesson");
  harness.refs[0].current.doc = {
    ...harness.refs[0].current.doc,
    lesson: { title: "Manual change", instruction: "Explore", explanation: "" },
  };
  finish(created);
  await pending;
  assert.equal(
    applied,
    false,
    "late AI result cannot replace intervening edits",
  );
  harness = hookHarness(
    Promise.resolve({ status: "runtime_action", message: "step" }),
    () => true,
  );
  await harness.hook.onPrompt("step");
  assert.ok(
    harness.states.some(
      (s) => s?.text === "Open Try lesson to apply runtime actions.",
    ),
  );
  assert.ok(!harness.states.some((s) => s?.text === "Action applied."));
  console.log(
    "Project contracts passed: Unicode names, private publication field stripping, guest lesson reopening/update, rejected/stale AI changes, and truthful runtime-action feedback.",
  );
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
