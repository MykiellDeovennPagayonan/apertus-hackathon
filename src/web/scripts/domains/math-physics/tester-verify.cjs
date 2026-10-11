const assert = require("node:assert/strict");
const fs = require("node:fs");
const {
  cases,
  near,
  ladderOracle,
  leverOracle,
  configurations,
  checkConfiguration,
} = require("./tester-cases.cjs");
function selfCheck() {
  for (const c of cases)
    for (const sample of c.samples) {
      checkConfiguration(c, sample);
      const oracle =
        c.id === "MATH-02" ? ladderOracle(sample) : leverOracle(sample);
      near(
        oracle[c.id === "MATH-02" ? "length" : "effortForce"],
        sample[c.id === "MATH-02" ? "length" : "effortForce"],
      );
    }
  const ladder = ladderOracle({ distance: 3, height: 4 });
  assert.deepEqual(
    [ladder.distanceArea, ladder.heightArea, ladder.ladderArea],
    [9, 16, 25],
  );
  const lever = leverOracle({
    length: 1.2,
    pivotPercent: 100 / 6,
    loadForce: 100,
    lifted: true,
  });
  near(lever.loadTorque + lever.effortTorque, 0);
  near(lever.effortTravel / lever.loadTravel, 5);
  near(lever.effortWork, lever.loadWork);
}
function verifyRecipe(recipe, c, initial = false) {
  const configs = configurations(recipe, c);
  assert.ok(
    configs.length >= 1 && configs.length <= 2,
    "Wrong model instance count",
  );
  for (const config of configs) checkConfiguration(c, config);
  if (initial) {
    assert.equal(configs.length, 1);
    for (const [key, value] of Object.entries(c.initial))
      near(configs[0][key], value);
  }
  return configs;
}
if (require.main === module) {
  selfCheck();
  if (process.argv[2]) {
    const c = cases.find((c) => c.id === process.argv[3]);
    assert.ok(c, "Supply scenario ID after recipe path");
    verifyRecipe(JSON.parse(fs.readFileSync(process.argv[2])), c);
  }
  console.log(
    "Independent pilot reference self-check passed; no production model/runtime verdict claimed.",
  );
}
module.exports = { selfCheck, verifyRecipe };
