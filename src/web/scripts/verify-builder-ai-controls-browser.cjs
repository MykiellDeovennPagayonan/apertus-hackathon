const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const base = process.env.UX_TEST_URL || "http://localhost:43100";
const output = "/tmp/apertus-builder-toolbar";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (fs.existsSync(chromium.executablePath())
        ? chromium.executablePath()
        : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const authored = modelRecipe("models/Projectile").document;
    authored.presentation = convertToBoard(authored);
    const document = canonicalDocument(authored);
    await page.addInitScript(
      ({ document }) => {
        if (!localStorage.getItem("apertus-builder-draft-v1")) {
          localStorage.setItem(
            "apertus-builder-draft-v1",
            JSON.stringify({ document, valid: document }),
          );
        }
      },
      { document },
    );
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.goto(`${base}/experiments/builder`);
    const button = (name) => page.getByRole("button", { name, exact: true });
    const more = page.getByLabel("More document actions", { exact: true });
    const storage = page.locator(".composition-storage > summary");
    const title = page.getByRole("textbox", {
      name: "Experiment title",
      exact: true,
    });
    const composer = page.locator(".builder-composer");
    const input = composer.locator("textarea");
    const chips = composer.locator(".command-bar__quick-chip");
    await composer.waitFor();
    assert.equal(await composer.locator(".command-bar__ideas").count(), 0);
    assert.equal(await chips.count(), 3);
    assert.ok(await composer.locator('button[type="submit"]').isDisabled());
    const firstPrompt = (await chips.first().innerText())
      .replace("✨", "")
      .trim();
    await chips.first().click();
    assert.equal(await input.inputValue(), firstPrompt);
    assert.equal(await chips.count(), 0);
    assert.ok(await composer.locator('button[type="submit"]').isEnabled());
    assert.equal(
      await input.evaluate((el) => el === window.document.activeElement),
      true,
    );
    await input.fill("");
    await more.click();
    for (const name of [
      "New experiment",
      "Download recipe",
      "Clear canvas",
      "Publish",
    ]) {
      await button(name).waitFor();
    }
    assert.equal(
      await page.locator(".builder-file-menu .builder-file-menu").count(),
      0,
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await more.evaluate((el) => el === window.document.activeElement),
      true,
    );
    await more.click();
    await storage.click();
    assert.equal(
      await page.locator(".builder-file-menu").evaluate((el) => el.open),
      false,
    );
    await page.getByText(/You're working locally/).waitFor();
    await page.keyboard.press("Escape");
    assert.equal(
      await storage.evaluate((el) => el === window.document.activeElement),
      true,
    );
    await more.click();
    await title.click();
    assert.equal(
      await page.locator(".builder-file-menu").evaluate((el) => el.open),
      false,
    );
    const original = await title.inputValue();
    await title.fill("Projectile toolbar check");
    await title.blur();
    await button("Undo").click();
    assert.equal(await title.inputValue(), original);
    await button("Redo").click();
    await button("Build").click();
    await button("Try lesson ↗").click();
    await button("Return to builder").waitFor();
    assert.equal(await button("Return to builder").count(), 1);
    assert.equal(
      await page
        .getByRole("link", { name: "Experiments", exact: true })
        .count(),
      0,
    );
    assert.equal(
      await button("Return to builder").evaluate(
        (el) => el === window.document.activeElement,
      ),
      true,
    );
    assert.equal(await composer.count(), 0);
    assert.equal(await page.locator(".composition-tabs").count(), 0);
    await page.screenshot({ path: `${output}/lesson-desktop.png` });
    await button("Return to builder").click();
    assert.equal(await title.inputValue(), "Projectile toolbar check");
    assert.equal(
      await button("Try lesson ↗").evaluate(
        (el) => el === window.document.activeElement,
      ),
      true,
    );
    assert.equal(await button("Build").getAttribute("aria-pressed"), "true");
    assert.ok(await button("Undo").isEnabled());
    await button("Connections").click();
    for (const width of [1440, 1024, 768, 700, 390, 375, 320]) {
      await page.setViewportSize({ width, height: 900 });
      const metrics = await page.evaluate(() => {
        const header = window.document
          .querySelector(".composition-toolbar")
          .getBoundingClientRect();
        const nav = window.document
          .querySelector(".composition-tabs")
          .getBoundingClientRect();
        const controls = [
          ...window.document.querySelectorAll(
            ".composition-toolbar > button, .composition-tabs > button, .composition-tabs summary, .composition-mode-switch button",
          ),
        ];
        return {
          height: nav.bottom - header.top,
          overflow: window.document.documentElement.scrollWidth > innerWidth,
          clipped: controls.some((el) => {
            const r = el.getBoundingClientRect();
            return r.left < 0 || r.right > innerWidth;
          }),
        };
      });
      console.log(`Toolbar at ${width}px:`, metrics);
      assert.ok(
        metrics.height <= (width > 700 ? 112 : 164),
        JSON.stringify(metrics),
      );
      assert.equal(metrics.overflow, false);
      assert.equal(metrics.clipped, false);
      await more.click();
      const bounds = await page
        .locator(".builder-file-menu > div")
        .boundingBox();
      assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1);
      await page.screenshot({ path: `${output}/menu-${width}.png` });
      await page.keyboard.press("Escape");
      await page.screenshot({ path: `${output}/builder-${width}.png` });
      await button("Build").click();
      assert.equal(
        await page.evaluate(
          () => window.document.documentElement.scrollWidth > innerWidth,
        ),
        false,
      );
      assert.equal(
        await page
          .locator(".composition-tabs summary")
          .evaluateAll((els) =>
            els.some((el) => el.getBoundingClientRect().right > innerWidth),
          ),
        false,
      );
      await page.locator(".composition-settings-menu > summary").click();
      await button("Preview experiment appearance").click();
      assert.equal(await composer.count(), 0);
      await page.locator(".composition-settings-menu > summary").click();
      await button("Show builder controls").click();
      await composer.waitFor();
      await button("Try lesson ↗").click();
      await button("Return to builder").waitFor();
      const back = await button("Return to builder").boundingBox();
      assert.ok(back.x >= 0 && back.x + back.width <= width);
      await button("Return to builder").click();
      await button("Connections").click();
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    const guard = page.getByRole("dialog", {
      name: "Save changes before leaving?",
    });
    await page.getByRole("link", { name: "Experiments", exact: true }).click();
    await guard.waitFor();
    await guard.getByRole("button", { name: "Keep editing", exact: true }).click();
    assert.equal(await title.inputValue(), "Projectile toolbar check");
    await more.click();
    await button("Clear canvas").click();
    await guard.waitFor();
    await guard.getByRole("button", { name: "Keep editing", exact: true }).click();
    await more.click();
    const download = page.waitForEvent("download");
    await button("Download recipe").click();
    assert.equal((await download).suggestedFilename(), "experiment.json");
    await page.keyboard.press("ControlOrMeta+s");
    await page.getByText("Saved on device", { exact: true }).first().waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "Builder toolbar, preview return, suggestions, keyboard, responsive layout and unsaved-work checks passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
