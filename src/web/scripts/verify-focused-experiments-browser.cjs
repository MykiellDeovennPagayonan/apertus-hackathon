const assert = require("node:assert/strict");
const { chromium } = require("playwright");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  page.setDefaultTimeout(15000);
  console.log("Browser connected");
  const errors = [];
  page.on("console", (message) => {
    if (message.type() === "error") console.log(message.text());
  });
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const kind of ["projectile", "counting"]) {
      await page.goto("http://localhost:43100/experiments?experiment=" + kind);
      const main = page.getByRole("main", {
        name: kind === "projectile" ? "Projectile motion" : "Counting circles",
      });
      await main.waitFor();
      await page.waitForTimeout(800);
      assert.equal(await page.locator(".workspace-composer").count(), 1);
      assert.equal(
        await main.locator(".board-item").count(),
        kind === "projectile" ? 7 : 3,
      );
      if (kind === "projectile") {
        const sliders = main.getByRole("slider");
        assert.equal(await sliders.count(), 2);
        assert.equal(await sliders.nth(0).inputValue(), "30");
        assert.equal(await sliders.nth(1).inputValue(), "60");
        const firstHeightDisplay = main.locator(
          '.recipe-measurement[aria-label="Ball 1 height"]',
        );
        const firstHeight = await firstHeightDisplay.innerText();
        await sliders.nth(0).fill("45");
        assert.equal(await sliders.nth(0).inputValue(), "45");
        assert.notEqual(await firstHeightDisplay.innerText(), firstHeight);
        assert.equal(await sliders.nth(1).inputValue(), "60");
      } else {
        await main
          .getByRole("button", { name: "Circle 1, not counted", exact: true })
          .click();
        assert.match(
          await main.locator(".math-readout").innerText(),
          /1 circle counted out of 5/,
        );
        await main
          .getByRole("button", { name: "Count again", exact: true })
          .click();
        assert.match(
          await main.locator(".math-readout").innerText(),
          /0 circles counted/,
        );
      }
      await page.screenshot({ path: "/tmp/" + kind + "-desktop.png" });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(500);
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      await page.screenshot({ path: "/tmp/" + kind + "-mobile.png" });
      await page.setViewportSize({ width: 1280, height: 800 });
      await page.getByText("Experiment options", { exact: true }).click();
      const downloaded = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Save recipe", exact: true })
        .click();
      const recipe = JSON.parse(
        require("node:fs").readFileSync(
          await (await downloaded).path(),
          "utf8",
        ),
      );
      assert.match(
        recipe.composition.ref,
        kind === "projectile" ? /Projectile/ : /Counting/,
      );
      await page.getByRole("link", { name: "Remix in builder" }).click();
      await page.waitForURL("**/experiments/builder?remix=1");
      await page.getByRole("button", { name: "Build", exact: true }).click();
      await page.waitForTimeout(700);
      assert.equal(
        await page.locator(".board-item").count(),
        kind === "projectile" ? 7 : 3,
      );
      await page.screenshot({ path: "/tmp/" + kind + "-builder.png" });
      await page
        .getByRole("button", { name: "Try lesson ↗", exact: true })
        .click();
      await page.waitForTimeout(500);
      assert.equal(
        await page.locator(".board-item").count(),
        kind === "projectile" ? 7 : 3,
      );
      if (kind === "projectile") {
        const sliders = page.getByRole("slider");
        assert.equal(await sliders.count(), 2);
        await sliders.nth(1).fill("40");
        assert.equal(await sliders.nth(1).inputValue(), "40");
      } else {
        await page
          .getByRole("button", { name: "Circle 1, not counted", exact: true })
          .click();
        assert.match(
          await page.locator(".math-readout").innerText(),
          /1 circle counted/,
        );
      }
      await page.screenshot({ path: "/tmp/" + kind + "-try-lesson.png" });
      console.log(
        kind +
          " learner interactions, mobile and independent remix components passed",
      );
    }
    assert.deepEqual(errors, []);
  } catch (error) {
    console.log(errors);
    console.log(await page.locator("body").innerText());
    await page.screenshot({ path: "/tmp/focused-failure.png" });
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
