const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
const cases = require("./manifest.json");
for (const c of cases) {
  for (const prompt of [c.canonical, ...c.paraphrases]) {
    const cards = retrieveComponentBucket(prompt);
    assert.ok(
      cards.some((card) => card.id === `prefabs/math-analysis/${c.kind}`),
      `${c.id}: scientific model unavailable to inference for ${prompt}`,
    );
  }
}
console.log(
  "A2 all 30 canonical/paraphrase catalog retrieval checks passed; this is not live inference acceptance",
);
