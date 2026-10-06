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
  try {
    const page = await browser.newPage();
    const errors = [];
    const warnings = [];
    page.on("pageerror", (error) => errors.push(error.message));
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text());
      if (message.type() === "warning") warnings.push(message.text());
    });
    const base = process.env.UX_TEST_URL || "http://localhost:43100";
    for (const size of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(size);
      await page.goto(`${base}/experiments?experiment=town`);
      await page
        .locator("canvas")
        .waitFor()
        .catch(async (error) => {
          console.error("Browser errors:", errors);
          console.error(await page.locator("body").innerText());
          throw error;
        });
      await page.waitForFunction(() => {
        const canvas = document.querySelector("canvas");
        return canvas?.width > 0 && canvas?.height > 0;
      });
      const canvas = await page.locator("canvas").boundingBox();
      assert.equal(canvas.x, 0);
      assert.equal(canvas.y, 0);
      assert.equal(canvas.width, size.width);
      assert.equal(canvas.height, size.height);
      const controls = await page.locator("#experiment-controls").boundingBox();
      const composer = await page.locator(".workspace-composer").boundingBox();
      assert.ok(
        controls.y + controls.height < composer.y,
        "Right panel clears the prompt overlay",
      );
      assert.ok(controls.x >= 0 && controls.x + controls.width <= size.width);
      assert.ok(
        controls.width <= (size.width <= 650 ? size.width - 20 : 340),
        "Controls stay in the compact right panel",
      );
      assert.ok(controls.x + controls.width > size.width - 24);
      assert.equal(
        await page.locator("#experiment-controls .town-controls").count(),
        1,
      );
      await page.screenshot({ path: `/tmp/apertus-town-${size.width}.png` });
      await page.keyboard.press("Escape");
      await page.locator("#experiment-controls").waitFor({ state: "hidden" });
      await page.getByRole("button", { name: "More settings" }).click();
      await page.getByRole("button", { name: "Reset town" }).click();
      // Exercise disposal of labels and the renderer when leaving the simulation.
      await page.getByRole("button", { name: /Experiments/ }).click();
      await page.locator("canvas").waitFor({ state: "detached" });
    }
    assert.deepEqual(
      errors,
      [],
      "No browser errors during town rendering, reset, and teardown",
    );
    assert.ok(
      !warnings.some((warning) => warning.includes("PCFSoftShadowMap")),
    );
    console.log(
      "Town: full-viewport desktop/mobile canvas, overlay controls, settings, reset, and teardown passed.",
    );
    if (warnings.some((warning) => warning.includes("THREE.Clock"))) {
      console.log(
        "Known upstream warning remains: React Three Fiber 9 constructs THREE.Clock.",
      );
    }
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
