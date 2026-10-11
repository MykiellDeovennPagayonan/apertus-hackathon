const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { execFileSync } = require("node:child_process");

// Resolve from this file, never from the caller's working directory. Include
// tracked contents (including staged edits) and untracked, nonignored sources.
exports.sourceFingerprint = (
  root = path.resolve(__dirname, "../../../../.."),
) => {
  const git = (args) => execFileSync("git", args, { cwd: root });
  const files = git([
    "ls-files",
    "--cached",
    "--others",
    "--exclude-standard",
    "-z",
    "--",
    "src/web",
  ])
    .toString()
    .split("\0")
    .filter(Boolean);
  if (!files.length)
    throw new Error("No web sources found for source fingerprint");
  const hash = crypto.createHash("sha256").update(git(["rev-parse", "HEAD"]));
  for (const file of [...new Set(files)].sort()) {
    const absolute = path.join(root, file);
    hash.update(file).update("\0");
    hash.update(
      fs.existsSync(absolute) ? fs.readFileSync(absolute) : "<deleted>",
    );
    hash.update("\0");
  }
  return hash.digest("hex");
};
