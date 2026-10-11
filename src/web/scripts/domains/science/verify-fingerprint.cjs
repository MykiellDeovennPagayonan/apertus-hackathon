const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { sourceFingerprint } = require("./source-fingerprint.cjs");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "science-fingerprint-"));
const cwd = process.cwd();
try {
  const git = (...args) => execFileSync("git", args, { cwd: root });
  const web = path.join(root, "src/web");
  fs.mkdirSync(web, { recursive: true });
  fs.writeFileSync(path.join(web, "tracked.ts"), "initial");
  git("init", "-q");
  git("add", ".");
  git(
    "-c",
    "user.name=Test",
    "-c",
    "user.email=test@example.invalid",
    "commit",
    "-qm",
    "fixture",
  );
  const initial = sourceFingerprint(root);
  process.chdir(web);
  assert.equal(sourceFingerprint(root), initial, "Independent of caller cwd");
  fs.writeFileSync(path.join(web, "tracked.ts"), "edited");
  const edited = sourceFingerprint(root);
  assert.notEqual(edited, initial, "Tracked content changes are detected");
  git("add", ".");
  assert.equal(
    sourceFingerprint(root),
    edited,
    "Staging cannot hide content changes",
  );
  fs.writeFileSync(path.join(web, "new.ts"), "new");
  const added = sourceFingerprint(root);
  assert.notEqual(added, edited, "Untracked sources are included");
  fs.unlinkSync(path.join(web, "tracked.ts"));
  assert.notEqual(
    sourceFingerprint(root),
    added,
    "Deleted sources are detected",
  );
  assert.throws(() => sourceFingerprint(path.join(root, "missing")));
  console.log(
    "Science source fingerprint: cwd, tracked, staged, untracked, deletion checks passed",
  );
} finally {
  process.chdir(cwd);
  fs.rmSync(root, { recursive: true, force: true });
}
