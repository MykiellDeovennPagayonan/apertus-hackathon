const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ts = require("typescript");
const cache = new Map();
function load(relative) {
  const file = path.resolve(__dirname, "..", relative);
  if (file.endsWith(".json")) return require(file);
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const source = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      esModuleInterop: true,
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
    return load(path.relative(path.resolve(__dirname, ".."), resolved));
  };
  new Function("require", "module", "exports", source)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports;
}
module.exports = { load };
