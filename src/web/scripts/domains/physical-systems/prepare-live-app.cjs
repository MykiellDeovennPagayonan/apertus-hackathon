// Snapshot current executable sources to a separate dev app; never substitutes inference.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "../../..");
const target =
  process.env.AGENT_B_LIVE_APP || "/private/tmp/apertus-006-agent-b-app";
if (fs.existsSync(target))
  throw new Error(`Refusing to overwrite live app snapshot: ${target}`);
fs.mkdirSync(target, { recursive: true });
for (const name of [
  "src",
  "public",
  "package.json",
  "pnpm-lock.yaml",
  "next.config.ts",
  "tsconfig.json",
  "next-env.d.ts",
])
  fs.cpSync(path.join(root, name), path.join(target, name), {
    recursive: true,
  });
fs.symlinkSync(
  path.join(root, "node_modules"),
  path.join(target, "node_modules"),
  "dir",
);
const walk = (p) =>
  fs
    .readdirSync(p, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(p, e.name)) : [path.join(p, e.name)],
    );
const files = [
  ...walk(path.join(target, "src")),
  ...walk(path.join(target, "public")),
  ...["package.json", "pnpm-lock.yaml", "next.config.ts"].map((p) =>
    path.join(target, p),
  ),
].sort();
const h = crypto.createHash("sha256");
for (const f of files)
  h.update(path.relative(target, f))
    .update("\0")
    .update(fs.readFileSync(f))
    .update("\0");
const manifest = {
  fingerprint: h.digest("hex"),
  createdAt: new Date().toISOString(),
  sourceRoot: root,
  snapshot: target,
  files: files.map((f) => path.relative(target, f)),
  models: {
    apertus: "m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4",
    laya: "aac6fef/laya-multilingual-mlx",
  },
  settings: {
    maxTokens: 2048,
    temperature: 0,
    deadlineMs: 180000,
    layaTimeoutMs: 30000,
    layaGate: 0.9,
    layaCreationGate: 0.75,
  },
  feedbackBudgetMs: 2000,
};
fs.writeFileSync(
  path.join(target, "manifest.json"),
  JSON.stringify(manifest, null, 2),
);
console.log(
  JSON.stringify({ snapshot: target, fingerprint: manifest.fingerprint }),
);
