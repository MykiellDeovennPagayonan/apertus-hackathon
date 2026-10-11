const assert = require("node:assert/strict");
const { load } = require("../../test-loader.cjs");
const { retrieveComponentBucket } = load("src/lib/planner/bucket.ts");
for (const c of require("./a3-cases.json")) {
  for (const prompt of c.prompts) {
    assert.ok(
      retrieveComponentBucket(prompt).some((card) => card.id === c.ref),
      `${c.id}: typed model missing from catalog for ${prompt}`,
    );
  }
}
console.log(
  "PHYS-02–10 all 27 canonical/paraphrase catalog retrieval checks passed; not live acceptance.",
);
