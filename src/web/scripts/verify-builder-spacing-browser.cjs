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
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromium.executablePath())
      ? chromium.executablePath()
      : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(10000);
    const authored = modelRecipe("models/Projectile").document;
    authored.presentation = convertToBoard(authored);
    await page.addInitScript((doc) => {
      if (!localStorage.getItem("apertus-builder-draft-v1"))
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document: doc, valid: doc }),
        );
    }, canonicalDocument(authored));
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.goto(
      `${process.env.UX_TEST_URL || "http://localhost:43100"}/experiments/builder`,
    );
    fs.mkdirSync("/tmp/apertus-builder-spacing", { recursive: true });
    await page
      .getByRole("button", { name: "+ Add component", exact: true })
      .click();
    const library = page.getByRole("dialog", {
      name: "Add a component",
      exact: true,
    });
    const search = library.getByRole("searchbox", {
      name: "Search components",
      exact: true,
    });
    assert.ok(
      await search.evaluate(
        (el) => parseFloat(getComputedStyle(el).paddingLeft) >= 44,
      ),
    );
    assert.ok(
      await library
        .locator("header")
        .evaluate((el) => parseFloat(getComputedStyle(el).paddingLeft) >= 20),
    );
    await page.screenshot({ path: "/tmp/apertus-builder-spacing/library.png" });
    await library
      .getByRole("button", { name: "Close library", exact: true })
      .click();
    await page
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .fill("Spacing check");
    await page.getByLabel("More document actions", { exact: true }).click();
    await page
      .getByRole("button", { name: "New experiment", exact: true })
      .click();
    const guard = page.getByRole("dialog", {
      name: "Save changes before leaving?",
      exact: true,
    });
    const discard = guard.getByRole("button", {
      name: "Discard changes",
      exact: true,
    });
    await discard.hover();
    const padding = await discard.evaluate((el) => [
      getComputedStyle(el).paddingLeft,
      getComputedStyle(el).paddingRight,
    ]);
    assert.ok(padding.every((value) => parseFloat(value) >= 14));
    await page.screenshot({
      path: "/tmp/apertus-builder-spacing/discard-hover.png",
    });
    await guard
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const tools = page.getByRole("toolbar", {
        name: "Board navigation",
        exact: true,
      });
      const help = page.getByLabel("Board navigation help", { exact: true });
      const [toolbarBox, helpBox] = await Promise.all([
        tools.boundingBox(),
        help.boundingBox(),
      ]);
      assert.ok(
        helpBox.x >= toolbarBox.x &&
          helpBox.x + helpBox.width <= toolbarBox.x + toolbarBox.width,
      );
      assert.equal(
        await help.evaluate((el) => getComputedStyle(el, "::before").content),
        "none",
      );
      await help.click();
      await page.screenshot({
        path: `/tmp/apertus-builder-spacing/navigation-${width}.png`,
      });
      await help.press("Escape");
    }
    console.log(
      "Search icon padding, dialog header spacing, discard hover padding and contained help controls passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
