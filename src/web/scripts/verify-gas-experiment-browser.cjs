const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromium.executablePath())
      ? {}
      : {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }),
  });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const base = process.env.UX_TEST_URL || "http://localhost:43100";
  const captures = process.env.GAS_SCREENSHOT_DIR || "/tmp/apertus-gas";
  fs.mkdirSync(captures, { recursive: true });
  try {
    await page.goto(`${base}/experiments?experiment=gas`);
    const experiment = page.getByRole("main", {
      name: "Gas pressure",
    });
    await experiment.waitFor();
    const slider = experiment.getByRole("slider", {
      name: "Volume",
      exact: true,
    });
    const pressure = experiment.getByLabel("Pressure", { exact: true });
    assert.equal(await experiment.getByRole("slider").count(), 1);
    assert.equal(await experiment.locator(".board-item").count(), 3);
    const owners = await Promise.all(
      [slider, pressure, experiment.locator("[data-gas-volume]")].map(
        (locator) =>
          locator.evaluate((element) =>
            element.closest(".board-item").getAttribute("data-board-index"),
          ),
      ),
    );
    assert.equal(
      new Set(owners).size,
      3,
      "Canvas, result and input must have separate board items",
    );
    assert.equal(await experiment.locator(".spatial-board").count(), 1);
    assert.equal(await page.locator(".workspace-composer").count(), 1);
    assert.equal(
      await experiment.getByRole("slider", { name: "Temperature" }).count(),
      0,
    );
    assert.equal(await slider.inputValue(), "1");
    assert.match(await pressure.textContent(), /2.49/);
    const particleCount = await experiment.locator("[data-particle]").count();
    const startingWidth = Number(
      await experiment.locator("[data-gas-volume]").getAttribute("width"),
    );
    await slider.focus();
    await page.keyboard.press("ArrowLeft");
    assert.equal(await slider.inputValue(), "0.95");
    assert.match(await pressure.textContent(), /2.63/);
    await page.keyboard.press("Home");
    assert.equal(await slider.inputValue(), "0.25");
    assert.match(await pressure.textContent(), /9.98/);
    assert.equal(
      Number(
        await experiment.locator("[data-gas-volume]").getAttribute("width"),
      ),
      startingWidth / 4,
    );
    assert.equal(
      await experiment.locator("[data-particle]").count(),
      particleCount,
    );
    await page.screenshot({ path: `${captures}/compressed.png` });
    await page.keyboard.press("End");
    assert.equal(await slider.inputValue(), "2");
    assert.match(await pressure.textContent(), /1.25/);
    assert.equal(
      Number(
        await experiment.locator("[data-gas-volume]").getAttribute("width"),
      ),
      startingWidth * 2,
    );
    await page.keyboard.press("ArrowRight");
    assert.equal(await slider.inputValue(), "2");
    await page.screenshot({ path: `${captures}/expanded.png` });
    await slider.fill("1");
    for (const [name, width, height] of [
      ["desktop", 1280, 900],
      ["compact", 1024, 603],
      ["mobile", 390, 844],
      ["narrow", 320, 568],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(400);
      const geometry = await page.evaluate(() => {
        const control = document
          .querySelector("input[type=range]")
          .getBoundingClientRect();
        const stage = document
          .querySelector(".workspace-stage")
          .getBoundingClientRect();
        const main = document
          .querySelector(".recipe-lesson")
          .getBoundingClientRect();
        return {
          left: control.left,
          right: control.right,
          bottom: control.bottom,
          top: control.top,
          stageTop: stage.top,
          stageBottom: stage.bottom,
          mainWidth: main.width,
          viewport: innerWidth,
          overflow: document.documentElement.scrollWidth > innerWidth,
        };
      });
      assert.equal(geometry.overflow, false, name);
      assert.ok(geometry.left >= 0 && geometry.right <= width, name);
      assert.ok(
        geometry.top >= geometry.stageTop &&
          geometry.bottom <= geometry.stageBottom,
        name,
      );
      assert.ok(geometry.mainWidth <= geometry.viewport, name);
      await page.screenshot({ path: `${captures}/${name}.png` });
    }
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.getByText("Experiment options", { exact: true }).click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Save recipe", exact: true })
      .click();
    const download = await downloadPromise;
    const recipe = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
    assert.match(recipe.composition.ref, /Gas/);
    await page.getByRole("link", { name: "Remix in builder" }).click();
    await page.waitForURL("**/experiments/builder?remix=1");
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.locator("[data-gas-volume]").first().waitFor();
    assert.equal(await page.locator(".board-item").count(), 3);
    assert.equal(
      await page.getByRole("slider", { name: "Volume", exact: true }).count(),
      1,
    );
    const builderNumber = page.getByRole("spinbutton", {
      name: "Exact volume",
      exact: true,
    });

    assert.ok(
      await builderNumber.evaluate(
        (element) => parseFloat(getComputedStyle(element).fontSize) >= 24,
      ),
      "The shared slider's value styling must survive builder form defaults",
    );
    await page.screenshot({ path: `${captures}/builder.png` });
    assert.deepEqual(errors, []);
    console.log(
      `Gas UX verified: single control, keyboard limits, pressure response, fixed conditions, responsive layout, save and remix. Captures: ${captures}`,
    );
  } catch (error) {
    console.error((await page.locator("body").innerText()).slice(0, 5000));
    await page.screenshot({ path: `${captures}/failure.png` });
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
