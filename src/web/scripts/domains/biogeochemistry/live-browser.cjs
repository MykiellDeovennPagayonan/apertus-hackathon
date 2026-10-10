const assert = require("node:assert/strict"),
  path = require("node:path");
const { load } = require("../../test-loader.cjs");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { cycleCommand } = load(
  "src/simulations/domains/biogeochemistry/index.ts",
);
const { state, geometry, investigate } = require("./browser.cjs");
exports.verifyPage = async (page, recipe, c, dir) => {
  const model = recipe.document.nodes.find(
    (n) => n.definition === c.definition,
  );
  const oracle = loadRecipe(recipe).runtime;
  // V8's Math.exp differs by a few ulps between Node and Chrome. Preserve
  // exact structure/string checks and compare all finite amounts within 1e-9.
  const compare = (actual, expected, location = "state") => {
    if (typeof expected === "number") {
      assert.ok(
        Number.isFinite(actual) && Math.abs(actual - expected) <= 1e-9,
        `${location}: ${actual} differs from ${expected}`,
      );
    } else if (expected && typeof expected === "object") {
      assert.deepEqual(
        Object.keys(actual).sort(),
        Object.keys(expected).sort(),
        location,
      );
      for (const key of Object.keys(expected))
        compare(actual[key], expected[key], `${location}.${key}`);
    } else assert.equal(actual, expected, location);
  };
  const agree = async () =>
    compare(await state(page, model.id), oracle.getSnapshot().state[model.id]);
  const capture = (n) => page.screenshot({ path: path.join(dir, `${n}.png`) });
  assert.equal(
    recipe.document.nodes.length,
    5,
    "Cycle opening needs model, scene, caption, action and activity only",
  );
  await agree();
  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 1280, height: 800 },
    { width: 1366, height: 768 },
  ]) {
    await page.setViewportSize(viewport);
    await page.waitForTimeout(180);
    await geometry(page);
    await capture(`generated-opening-${viewport.width}x${viewport.height}`);
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForTimeout(200);
  for (let i = 0; i < 3; i++) {
    await page.locator(".cycle-actions .cycle-primary").press("Enter");
    assert.ok(
      oracle.dispatch([
        {
          node: model.id,
          command: cycleCommand(c.kind, "ADVANCE"),
          arguments: {},
        },
      ]).accepted,
    );
    await agree();
  }
  await capture("generated-changed");
  // Use the generated activity wiring, not merely the polished premade wiring.
  const target =
    c.kind === "oxygen"
      ? "temperature"
      : c.kind === "nitrogen"
        ? "soil"
        : "clearing";
  await investigate(page, target);
  assert.ok(
    oracle.dispatch([
      {
        node: model.id,
        command: cycleCommand(c.kind, "ACTIVITY"),
        arguments: { value: { activity: target, variant: 0 } },
      },
    ]).accepted,
  );
  await agree();
  await page.locator(".cycle-actions .cycle-primary").click();
  assert.ok(
    oracle.dispatch([
      {
        node: model.id,
        command: cycleCommand(c.kind, "ADVANCE"),
        arguments: {},
      },
    ]).accepted,
  );
  await agree();
  await geometry(page);
  await capture("generated-comparison");
  assert.equal(await page.locator(".recipe-error").count(), 0);
};
