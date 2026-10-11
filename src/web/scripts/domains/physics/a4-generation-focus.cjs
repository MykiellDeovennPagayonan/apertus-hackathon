const assert = require("node:assert/strict");
const fs = require("node:fs");
const { load } = require("../../test-loader.cjs");
const { focusCompositionTools } = load("src/lib/planner/compositionTools.ts");
const { buildTurnTools } = load("src/lib/planner/turnSchema.ts");
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
const recipe = require("../../../src/simulations/pre-made/cooling-drinks/recipe.json");
const bucket = retrieveComponentBucket(
  "Hot drink cooling in warm and cold rooms: compare temperature over time",
);
const root = "prefabs/physics/Cooling";
const evidence = [];
const run = (name, document, check, definition = root, cards = bucket) => {
  const tools = buildTurnTools(document, cards);
  const focused = focusCompositionTools(document, cards, tools, definition);
  let verdict = "PASS";
  try {
    check(focused);
  } catch (error) {
    verdict = "FAIL";
    evidence.push({ name, verdict, error: error.message, focused });
    return;
  }
  evidence.push({ name, verdict, focused });
};
const missingScene = structuredClone(recipe.document);
missingScene.nodes = missingScene.nodes.filter((n) => n.id !== "appearance1");
missingScene.connections = missingScene.connections.filter(
  (c) => c.to.node !== "appearance1",
);
run(
  "Every comparison instance gets its own attached appearance",
  missingScene,
  (tools) => {
    assert.ok(
      tools.length &&
        tools.every(
          (t) =>
            t.tool === "insert_component" &&
            t.schema.properties.definition.values.includes(
              "appearance/physics-cooling",
            ),
        ),
      "Missing second scene must focus insertion, rather than broad configure tools",
    );
  },
);
const missingTimeLink = structuredClone(recipe.document);
missingTimeLink.connections = missingTimeLink.connections.filter(
  (c) => c.id !== "link/time1",
);
run(
  "The declared comparison reuses the existing native shared-time source",
  missingTimeLink,
  (tools) => {
    assert.ok(
      tools.length &&
        tools.every(
          (t) =>
            t.tool === "connect" &&
            t.schema.properties.from.properties.node.values.includes(
              "control/time",
            ) &&
            t.schema.properties.to.properties.node.values.includes("model1"),
        ),
      "Comparison time source must connect to the second model rather than force a duplicate control",
    );
  },
);
const unattached = structuredClone(recipe.document);
unattached.connections = unattached.connections.filter(
  (c) => c.id !== "link/appearance1",
);
run(
  "Reuse a free scene and attach it to the missing model",
  unattached,
  (tools) => {
    assert.ok(
      tools.length &&
        tools.every(
          (t) =>
            t.tool === "connect" &&
            t.schema.properties.from.properties.node.values.includes(
              "model1",
            ) &&
            t.schema.properties.to.properties.node.values.includes(
              "appearance1",
            ),
        ),
    );
  },
);
const conduction = structuredClone(
  require("../../../src/simulations/pre-made/heat-conduction/recipe.json")
    .document,
);
conduction.connections = conduction.connections.filter(
  (c) => c.id !== "link/time1",
);
run(
  "Conduction also reuses its shared time slider",
  conduction,
  (tools) => {
    assert.ok(
      tools.length &&
        tools.every(
          (t) =>
            t.tool === "connect" &&
            t.schema.properties.from.properties.node.values.includes(
              "control/time",
            ) &&
            t.schema.properties.from.properties.port.values.includes(
              "submit",
            ) &&
            t.schema.properties.to.properties.node.values.includes("model1"),
        ),
    );
  },
  "prefabs/physics/Conduction",
  retrieveComponentBucket("Heat conduction through metal and wood"),
);
const lens = structuredClone(
  require("../../../src/simulations/pre-made/lens-images/recipe.json").document,
);
for (const id of ["model0", "appearance0"])
  lens.nodes.push({
    ...structuredClone(lens.nodes.find((n) => n.id === id)),
    id: id.replace("0", "1"),
  });
lens.connections.push({
  id: "second-appearance",
  kind: "attachment",
  from: { node: "model1", port: "appearance" },
  to: { node: "appearance1", port: "model" },
});
run(
  "Ordinary comparisons keep independent controls",
  lens,
  (tools) => {
    assert.ok(
      tools.length &&
        tools.every(
          (t) =>
            t.tool === "add_control" &&
            t.schema.properties.target.values.includes("model1") &&
            t.schema.properties.command.values.includes("PT_LENS_DISTANCE"),
        ),
    );
  },
  "prefabs/physics/Lens",
  retrieveComponentBucket("Magnifying glass lens images"),
);
const output = process.env.A4_FOCUS_EVIDENCE;
if (output)
  fs.writeFileSync(
    output,
    JSON.stringify(
      {
        recorded: new Date().toISOString(),
        scope:
          "Real planner/schema functions on incomplete authored graph; development prerequisite proof, not live inference",
        evidence,
      },
      null,
      2,
    ),
  );
console.log(
  JSON.stringify(
    evidence.map(({ name, verdict }) => ({ name, verdict })),
    null,
    2,
  ),
);
if (
  !process.env.A4_CAPTURE_KNOWN_DEFECT &&
  evidence.some((e) => e.verdict === "FAIL")
)
  process.exitCode = 1;
