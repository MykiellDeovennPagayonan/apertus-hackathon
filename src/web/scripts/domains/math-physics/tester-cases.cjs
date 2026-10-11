const assert = require("node:assert/strict");
const near = (actual, expected) =>
  assert.ok(
    Number.isFinite(actual) &&
      Math.abs(actual - expected) <= 1e-9 * Math.max(1, Math.abs(expected)),
    `${actual} != ${expected}`,
  );
const cases = [
  {
    id: "MATH-02",
    slug: "pythagorean",
    definition: "prefabs/math-geometry/Pythagorean",
    task: "Make the ladder longer while keeping its wall contact at 4 metres.",
    prompts: [
      "Show me how to figure out the ladder length if the wall is 4 metres high and the bottom is 3 metres away.",
      "A ladder reaches 4 metres up a wall with its foot 3 metres from the wall. How long must it be?",
      "Let me explore the ladder length for a 4-metre wall contact and a 3-metre ground distance.",
    ],
    followups: [
      "Move the bottom to 6 metres away, keeping the wall contact at 4 metres.",
      "Add another ladder reaching the same height with its foot 3 metres away so I can compare them.",
    ],
    invalid: "Put the ladder foot minus 2 metres away from the wall.",
    initial: { distance: 3, height: 4 },
    samples: [
      { distance: 3, height: 4, length: 5 },
      { distance: 5, height: 12, length: 13 },
      { distance: 6, height: 8, length: 10 },
    ],
    followup(index, before, after) {
      if (index === 0) {
        assert.equal(after.length, before.length);
        near(after[0].distance, 6);
        near(after[0].height, 4);
      } else {
        assert.equal(after.length, before.length + 1);
        assert.deepEqual(after[0], before[0]);
        assert.ok(after.some((x) => x.distance === 3 && x.height === 4));
      }
    },
  },
  {
    id: "PHYS-01",
    slug: "levers",
    definition: "prefabs/physics/Lever",
    task: "Reduce the force needed to lift the same load by moving the pivot; compare both end movements during a slight lift.",
    prompts: [
      "Why is it easier to lift something with a longer crowbar? Let me move the pivot around.",
      "Let me move the fulcrum of a crowbar and see how much force I need to lift the load.",
      "Show how a longer lever helps lift a heavy object, with an adjustable pivot.",
    ],
    followups: [
      "Double the total bar length while keeping the load arm at 0.2 metres and the load at 100 newtons.",
      "Add a second lever with its pivot halfway along, keeping both loads at 100 newtons.",
    ],
    invalid: "Put the pivot exactly at the effort end.",
    initial: { length: 1.2, pivotPercent: 100 / 6, loadForce: 100 },
    samples: [
      { length: 1.2, pivotPercent: 100 / 6, loadForce: 100, effortForce: 20 },
      { length: 1.2, pivotPercent: 50, loadForce: 100, effortForce: 100 },
      {
        length: 2.4,
        pivotPercent: 100 / 12,
        loadForce: 100,
        effortForce: 100 / 11,
      },
    ],
    followup(index, before, after) {
      if (index === 0) {
        assert.equal(after.length, before.length);
        near(after[0].length, 2.4);
        near(after[0].pivotPercent, 100 / 12);
        near(after[0].loadForce, 100);
      } else {
        assert.equal(after.length, before.length + 1);
        assert.deepEqual(after[0], before[0]);
        assert.ok(
          after.some((x) => x.pivotPercent === 50 && x.loadForce === 100),
        );
      }
    },
  },
];
// Reference coordinates and signed cross-products, independent of runtime code.
function leverOracle(config) {
  const left = (-config.length * config.pivotPercent) / 100,
    right = config.length + left;
  const angle = config.lifted ? Math.PI / 36 : 0;
  const load = { x: left * Math.cos(angle), y: -left * Math.sin(angle) };
  const effort = { x: right * Math.cos(angle), y: -right * Math.sin(angle) };
  const loadTorque = load.x * -config.loadForce;
  const effortForce = loadTorque / effort.x;
  return {
    effortForce,
    loadTorque,
    effortTorque: effort.x * -effortForce,
    loadTravel: load.y,
    effortTravel: -effort.y,
    loadWork: config.loadForce * load.y,
    effortWork: effortForce * -effort.y,
  };
}
function ladderOracle(config) {
  // Bisection of the squared-distance constraint avoids duplicating hypot.
  const area = config.distance ** 2 + config.height ** 2;
  let low = 0,
    high = config.distance + config.height;
  for (let i = 0; i < 80; i++) {
    const mid = (low + high) / 2;
    if (mid * mid < area) low = mid;
    else high = mid;
  }
  return {
    length: (low + high) / 2,
    distanceArea: config.distance ** 2,
    heightArea: config.height ** 2,
    ladderArea: area,
  };
}
function configurations(recipe, c) {
  return recipe.document.nodes
    .filter((n) => n.definition === c.definition)
    .map((n) => n.configuration);
}
function checkConfiguration(c, config) {
  const limits =
    c.id === "MATH-02"
      ? { distance: [0.1, 20], height: [0.1, 20] }
      : { length: [0.4, 4], pivotPercent: [5, 95], loadForce: [1, 1000] };
  for (const [field, [min, max]] of Object.entries(limits))
    assert.ok(
      Number.isFinite(config[field]) &&
        config[field] >= min &&
        config[field] <= max,
      `Invalid ${field}`,
    );
}
module.exports = {
  cases,
  near,
  ladderOracle,
  leverOracle,
  configurations,
  checkConfiguration,
};
