// Record a source/configuration candidate without reading secrets or environment files.
const fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto"),
  cp = require("node:child_process");
const root = path.resolve(__dirname, "../../..");
const files = cp
  .execFileSync(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { cwd: root },
  )
  .toString()
  .split("\0")
  .filter((f) => f.startsWith("src/") && fs.existsSync(path.join(root, f)))
  .sort();
const hash = crypto.createHash("sha256");
for (const f of files)
  hash
    .update(f)
    .update("\0")
    .update(fs.readFileSync(path.join(root, f)))
    .update("\0");
const fingerprint = hash.digest("hex");
const diff = cp.execFileSync("git", ["diff", "--binary", "HEAD"], {
  cwd: root,
});
const workingTreeFingerprint = crypto
  .createHash("sha256")
  .update(diff)
  .update(fingerprint)
  .digest("hex");
const dir = path.join(
  root,
  "docs/agent-only/implementation/005-validation",
  `candidate-${fingerprint.slice(0, 12)}`,
);
fs.mkdirSync(dir, { recursive: true });
const manifest = {
  recordedAt: new Date().toISOString(),
  sourceRevision: cp
    .execFileSync("git", ["rev-parse", "HEAD"], { cwd: root })
    .toString()
    .trim(),
  sourceFingerprint: fingerprint,
  workingTreeFingerprint,
  sourceFiles: files,
  platform: process.platform,
  architecture: process.arch,
  node: process.version,
  protocol: {
    endToEndTimeoutMs: 120000,
    targetLatencyMs: 60000,
    viewports: [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ],
    projectileAbsoluteTolerance: 0.001,
    gasRelativeTolerance: 0.000001,
    requiredBrowser: "Playwright MCP",
    consecutiveQualifyingPasses: 0,
  },
  configuration: {
    plannerMode: "hybrid",
    apertusModel: "m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4",
    temperature: 0,
    maxTokens: 1024,
    layaModel: "aac6fef/laya-multilingual-mlx",
    layaCreationGate: 0.75,
    layaEditGate: 0.9,
    layaTimeoutMs: 30000,
    policyVersion: 1,
    registryVersion: 1,
  },
  acceptance: {
    pass01: "Not run",
    pass02: "Not run",
    mcpServer: "@playwright/mcp@0.0.83 over isolated stdio sessions",
    blocker: null,
  },
};
const file = path.join(dir, "manifest.json");
if (!fs.existsSync(file))
  fs.writeFileSync(file, JSON.stringify(manifest, null, 2));
console.log(dir);
