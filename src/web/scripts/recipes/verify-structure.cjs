const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
require("node:child_process").execFileSync(process.execPath, [
  path.join(__dirname, "generate-registry.cjs"),
  "--check",
]);
const root = path.resolve(__dirname, "../../src");
const cases = fs
  .readdirSync(path.join(__dirname, "cases"))
  .map((file) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, "cases", file))),
  );
for (const { slug } of cases) {
  assert.match(slug, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.deepEqual(
    fs.readdirSync(path.join(root, "simulations/pre-made", slug)),
    ["recipe.json"],
  );
}
function files(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((entry) =>
      entry.isDirectory()
        ? files(path.join(dir, entry.name))
        : [path.join(dir, entry.name)],
    );
}
for (const file of files(root).filter((file) => /\.(ts|tsx)$/.test(file))) {
  if (file.endsWith("premadeRegistry.generated.ts")) continue;
  const source = fs.readFileSync(file, "utf8");
  assert.ok(
    !/pre-made\/[^"']+\/recipe\.json/.test(source),
    `${file}: direct premade import`,
  );
  if (file.includes("/components/"))
    assert.ok(
      !/runtime\/recipes\/registry/.test(source),
      `${file}: component imports registry`,
    );
}
console.log(
  "Recipe structure: single JSON ownership, deterministic registry and production import boundaries passed. Gas remains protected and Town remains outside this migration.",
);
