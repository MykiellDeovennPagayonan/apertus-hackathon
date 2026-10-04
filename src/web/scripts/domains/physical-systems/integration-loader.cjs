// Development-only registry overlay. Never writes shared sources, intercepts inference,
// creates cached responses, or counts as live prompt acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const root = path.resolve(__dirname, "../../..");
const cache = new Map();
function load(relative) {
  const file = path.resolve(root, relative);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  let input = fs.readFileSync(file, "utf8");
  if (
    relative === "src/simulations/runtime/assembly.ts" &&
    !input.includes("import { physicalSystems }")
  ) {
    assert.ok(
      input.includes("  mathFoundations,"),
      "Shared registry changed: update the overlay explicitly",
    );
    assert.match(input, /circle:\s*true,/);
    input =
      'import { physicalSystems } from "../domains/physical-systems";\n' +
      input;
    input = input.replace(
      "  mathFoundations,",
      "  mathFoundations,\n  physicalSystems,",
    );
    input = input.replace(
      /circle:\s*true,/,
      'circle: true,\n "physical-pendulum": true,\n "physical-track": true,\n "physical-circuit": true,',
    );
  }
  const source = ts.transpileModule(input, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const localRequire = (name) => {
    if (!name.startsWith(".")) return require(name);
    if (name.endsWith(".css")) return {};
    const base = path.resolve(path.dirname(file), name);
    const resolved = [
      base,
      `${base}.ts`,
      `${base}.tsx`,
      path.join(base, "index.ts"),
    ].find((p) => fs.existsSync(p) && fs.statSync(p).isFile());
    assert.ok(resolved, `Cannot resolve ${name} from ${file}`);
    return load(path.relative(root, resolved));
  };
  new Function("require", "module", "exports", source)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
module.exports = { load };
