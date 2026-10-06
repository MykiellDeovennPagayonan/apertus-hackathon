// Fixed development variants, submitted through the normal UI with fresh models.
const { spawnSync } = require("node:child_process");
const path = require("node:path");
const root = process.env.AGENT_B_VARIANT_RAW_DIR;
if (!root)
  throw new Error(
    "Set a unique AGENT_B_VARIANT_RAW_DIR outside the repository",
  );
const variants = [
  {
    id: "pendulum-typo",
    name: "pendulum",
    prompt: "Does a longer swng move more slowly?",
    expected: [{ length: 1 }, { length: 2 }],
  },
  {
    id: "rolling-typo",
    name: "rolling",
    prompt: "Why does a toy car roll farther on a smoth floor?",
    expected: [{ resistance: 0.05 }, { resistance: 0.1 }],
  },
  {
    id: "circuit-typo",
    name: "circuit",
    prompt: "What happens if I add anothr bulb to a circuit?",
    expected: [{ voltage: 6, resistance: 12, bulbs: 1 }],
  },
  {
    id: "pendulum-structure",
    name: "pendulum",
    prompt:
      "Compare three swings with lengths 1 metre, 2 metres and 4 metres, and show an angle over time graph.",
    expected: [{ length: 1 }, { length: 2 }, { length: 4 }],
  },
];
for (const variant of variants) {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "verify-live-mcp.cjs")],
    {
      stdio: "inherit",
      env: {
        ...process.env,
        AGENT_B_CASE: variant.name,
        AGENT_B_WIDTH: "390",
        AGENT_B_LIVE_RAW_DIR: path.join(root, variant.id),
        AGENT_B_PROMPT: variant.prompt,
        AGENT_B_CREATION_ONLY: "true",
        AGENT_B_EXPECTED: JSON.stringify(variant.expected),
        AGENT_B_EXPECT_GRAPH: String(variant.id === "pendulum-structure"),
      },
    },
  );
  if (result.status !== 0) process.exitCode = 1;
}
