const assert = require("node:assert/strict");
const h = require("../../generation/helpers.cjs");
const learner = require("./learner.cjs");
const base = process.env.UX_TEST_URL || "http://localhost:43100";
(async () => {
  const browser = await h.launch();
  try {
    for (const reducedMotion of ["no-preference", "reduce"]) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion,
      });
      const page = await context.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${base}/experiments?experiment=cell-division`);
      await page.locator(".science-scene").waitFor();
      const back = page.getByRole("button", { name: "Back", exact: true });
      const toggle = page.getByRole("switch", { name: "Separation error" });
      const chromosome = page.locator('[data-chromosome="A-1"]');
      const x = () => chromosome.evaluate((e) => e.getCTM().e);
      const stage = async () =>
        Number(await page.locator(".science-scene").getAttribute("data-time"));
      assert.ok(await back.isDisabled());
      await learner.steps(page, "cell", 3);
      await page.waitForTimeout(1000);
      const before = await x();
      await learner.steps(page, "cell", 1);
      await page.waitForTimeout(250);
      const middle = await x();
      await page.waitForTimeout(800);
      const after = await x();
      assert.ok(after > before, "Chromatid moves toward the right pole");
      if (reducedMotion === "no-preference")
        assert.ok(
          middle > before && middle < after,
          "Transition includes intermediate positions",
        );
      else
        assert.ok(
          Math.abs(middle - after) < 1,
          "Reduced motion settles immediately",
        );
      await toggle.check();
      assert.equal(await stage(), 4);
      await page.waitForTimeout(1000);
      assert.ok(
        (await x()) < before,
        "Failed chromatid moves to the left pole",
      );
      await learner.steps(page, "cell", 3);
      assert.match(
        await page.locator(".science-explanation").innerText(),
        /unequal/i,
      );
      await back.click();
      assert.equal(await stage(), 6);
      assert.ok(await toggle.isChecked());
      await learner.steps(page, "cell", 1);
      await page
        .getByRole("button", { name: "Watch division again", exact: true })
        .click();
      assert.equal(await stage(), 0);
      assert.ok(await toggle.isChecked());
      assert.ok(await back.isDisabled());
      await toggle.uncheck();
      await learner.steps(page, "cell", 1);
      await back.click();
      assert.equal(await stage(), 0);
      await page.waitForTimeout(1000);
      await page.screenshot({
        path: `/tmp/cell-division-${reducedMotion}.png`,
      });
      assert.deepEqual(errors, []);
      await context.close();
      console.log(
        `Cell division ${reducedMotion}: animation, Back, live error toggle and replay passed`,
      );
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
