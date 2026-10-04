// Development-only registry overlay. It never mutates shared sources or substitutes inference.
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
    !input.includes("import { dynamicSystems }")
  ) {
    assert.ok(
      input.includes("  physicalSystems,"),
      "Shared registry shape changed",
    );
    assert.match(input, /"physical-circuit": true,/);
    input = `import { dynamicSystems } from "../domains/dynamic-systems";\n${input}`;
    input = input.replace(
      "  physicalSystems,",
      "  physicalSystems,\n  dynamicSystems,",
    );
    input = input.replace(
      /"physical-circuit": true,/,
      '"physical-circuit": true,\n  "dynamic-growth": true,\n  "dynamic-traffic": true,\n  "dynamic-queue": true,',
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
    ].find(
      (candidate) =>
        fs.existsSync(candidate) && fs.statSync(candidate).isFile(),
    );
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
