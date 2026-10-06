const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const ts = require("typescript");
const { execFileSync } = require("node:child_process");
const root = path.resolve(__dirname, "../..");
const repo = path.resolve(root, "../..");
const retired = [
  "src/lib/planner/creation.ts",
  "src/lib/apertus/client.ts",
  "src/lib/apertus/catalogSelection.ts",
  "src/lib/apertus/arguments.ts",
  "src/lib/apertus/educationalExamples.ts",
  "src/lib/laya/planner.ts",
  "src/lib/laya/questions.ts",
  "scripts/verify-creation.cjs",
  "scripts/verify-planner.cjs",
  "scripts/verify-apertus.cjs",
  "scripts/verify-browser.cjs",
  "scripts/verify-creation-browser.cjs",
  "scripts/evaluate-apertus-live.cjs",
  "scripts/evaluate-laya-live.cjs",
  "scripts/verify-creation-mcp.cjs",
  "scripts/creation-mcp-scenario.cjs",
  "scripts/record-creation-candidate.cjs",
];
for (const file of retired)
  assert.equal(
    fs.existsSync(path.join(root, file)),
    false,
    `Retired implementation remains: ${file}`,
  );
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? files(path.join(dir, e.name))
        : /\.(?:tsx?|cjs)$/.test(e.name)
          ? [path.join(dir, e.name)]
          : [],
    );
}
function references(file) {
  const ast = ts.createSourceFile(
    file,
    fs.readFileSync(file, "utf8"),
    ts.ScriptTarget.Latest,
    true,
  );
  const refs = [];
  const visit = (node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier
    )
      refs.push({
        ref: node.moduleSpecifier.text,
        typeOnly: !!(node.isTypeOnly || node.importClause?.isTypeOnly),
      });
    if (
      ts.isCallExpression(node) &&
      node.arguments[0] &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        ["require", "load"].includes(node.expression.getText(ast)))
    )
      refs.push({
        ref: node.arguments[0].text,
        loader: node.expression.getText(ast) === "load",
      });
    ts.forEachChild(node, visit);
  };
  visit(ast);
  return refs;
}
function resolve(file, entry) {
  if (!entry.loader && !entry.ref.startsWith(".")) return null;
  const base = entry.loader
    ? path.join(root, entry.ref)
    : path.resolve(path.dirname(file), entry.ref);
  const target = [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    `${base}.cjs`,
    path.join(base, "index.ts"),
    path.join(base, "index.tsx"),
  ].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
  assert.ok(
    target,
    `Dangling import/export/dynamic import/test loader: ${file} → ${entry.ref}`,
  );
  return target;
}
const graph = new Map();
for (const file of [
  ...files(path.join(root, "src")),
  ...files(path.join(root, "scripts")),
]) {
  const edges = references(file).map((entry) => ({
    ...entry,
    target: resolve(file, entry),
  }));
  graph.set(file, edges);
  if (
    file.includes("/simulations/runtime/") ||
    file.includes("/simulations/components/")
  )
    for (const e of edges)
      assert.ok(
        !e.target?.includes("/simulations/builder/"),
        `Authority imports builder: ${file} → ${e.target}`,
      );
}
const visited = new Set();
function pure(file) {
  if (visited.has(file)) return;
  visited.add(file);
  assert.ok(
    !/\/(?:builder)\/|\.tsx$|\/runtime\/(?:session|.*Session)\.ts$/.test(file),
    `Headless generation imported UI/singleton: ${file}`,
  );
  for (const edge of graph.get(file) || [])
    if (!edge.typeOnly) {
      assert.ok(
        !/^(?:react|react-dom|three|next|@react-three)(?:\/|$)/.test(edge.ref),
        `Headless generation imports ${edge.ref}`,
      );
      if (edge.target?.endsWith(".ts")) pure(edge.target);
    }
}
pure(path.join(root, "src/lib/planner/index.ts"));
pure(path.join(root, "src/simulations/runtime/authoring/operations.ts"));
const pkg = require("../../package.json");
for (const [name, command] of Object.entries(pkg.scripts))
  for (const match of command.matchAll(/\bnode\s+(scripts\/[\w./-]+\.cjs)/g))
    assert.ok(
      fs.existsSync(path.join(root, match[1])),
      `${name} points to deleted script ${match[1]}`,
    );
for (const command of ["contract", "architecture", "live", "ux"])
  assert.ok(pkg.scripts[`test:generation:${command}`]);
const inferenceMakefile = fs.readFileSync(
  path.join(repo, "src/inference/Makefile"),
  "utf8",
);
for (const match of inferenceMakefile.matchAll(/\bpnpm\s+(test[\w:-]*)/g))
  assert.ok(
    pkg.scripts[match[1]],
    `Inference command was retired: ${match[1]}`,
  );
const baseline = JSON.parse(
  fs.readFileSync(
    path.join(
      repo,
      "docs/agent-only/implementation/015-validation/baseline.json",
    ),
  ),
);
for (const [file, hash] of Object.entries(baseline.hashes)) {
  const current = fs.readFileSync(path.join(repo, file));
  if (
    /gas/i.test(file) ||
    !["arithmetic", "area-perimeter", "bridge"].some((slug) =>
      file.includes(`/pre-made/${slug}/`),
    )
  )
    assert.equal(
      crypto.createHash("sha256").update(current).digest("hex"),
      hash,
      `Protected baseline changed: ${file}`,
    );
  else {
    const before = JSON.parse(
      execFileSync("git", ["show", `HEAD:${file}`], {
        cwd: repo,
        encoding: "utf8",
      }),
    );
    const after = JSON.parse(current);
    const params = after.parameters;
    after.parameters = before.parameters;
    assert.deepEqual(
      after,
      before,
      `${file}: only exposure metadata may change`,
    );
    assert.ok(params.length);
  }
}
assert.equal(
  fs.existsSync(path.join(root, "src/simulations/pre-made/gas/recipe.json")),
  false,
  "Gas must retain its protected direct loader",
);
const report = {
  files: graph.size,
  headlessModules: visited.size,
  edges: [...graph].flatMap(([file, edges]) =>
    edges
      .filter((e) => e.target)
      .map((e) => ({
        from: path.relative(root, file),
        to: path.relative(root, e.target),
        typeOnly: !!e.typeOnly,
        loader: !!e.loader,
      })),
  ),
};
if (process.env.GENERATION_ARCHITECTURE_EVIDENCE)
  fs.writeFileSync(
    process.env.GENERATION_ARCHITECTURE_EVIDENCE,
    JSON.stringify(report, null, 2),
  );
console.log(
  `Generation architecture passed: ${graph.size} source/script files, ${visited.size} headless modules; retired references, package commands, authority/UI boundaries, protected hashes and unchanged recipe defaults checked.`,
);
