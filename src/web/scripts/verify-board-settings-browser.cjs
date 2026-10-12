const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { emptyLayout } = load("src/simulations/runtime/authoring/types.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
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
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const authored = modelRecipe("models/Projectile").document;
    const sceneDefinition = publicDefinition("canvases/town");
    authored.nodes.push({
      id: "town",
      definition: sceneDefinition.id,
      version: sceneDefinition.version,
      label: "Town",
      scope: authored.scopes[0].id,
      configuration: structuredClone(sceneDefinition.defaults),
    });
    authored.layout.children.push({
      ...emptyLayout("layout/town"),
      node: "town",
    });
    authored.presentation = convertToBoard(authored);
    authored.presentation.responsive = true;
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
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const trigger = page.getByRole("button", {
      name: "Board settings",
      exact: true,
    });
    const dialog = page.getByRole("dialog", {
      name: "Board settings",
      exact: true,
    });
    const presentation = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document
            .authored.presentation,
      );
    await trigger.click();
    await dialog.waitFor();
    assert.equal(await dialog.getByRole("heading", { level: 3 }).count(), 3);
    assert.equal(
      await dialog
        .getByRole("radio", { name: "Fit all content", exact: true })
        .evaluate((el) => getComputedStyle(el).width),
      "18px",
    );
    assert.equal(
      await dialog
        .getByRole("radio", { name: "Fit all content", exact: true })
        .evaluate((el) => getComputedStyle(el).height),
      "18px",
    );
    await dialog
      .getByRole("radio", { name: "Custom boundary", exact: true })
      .check();
    assert.ok((await presentation()).learnerArea);
    const dimensions = dialog.getByText("Exact boundary dimensions", {
      exact: true,
    });
    assert.equal(
      await dimensions.evaluate((el) => el.parentElement.open),
      false,
    );
    await dimensions.click();
    await dialog.getByLabel("width", { exact: true }).fill("1200");
    await dialog.getByLabel("height", { exact: true }).fill("800");
    await dialog
      .getByRole("button", { name: "Apply boundary", exact: true })
      .click();
    assert.equal((await presentation()).learnerArea.width, 1200);
    assert.equal((await presentation()).learnerArea.height, 800);
    await dialog
      .getByRole("button", { name: "Edit boundary on board", exact: true })
      .click();
    await dialog.waitFor({ state: "hidden" });
    await page
      .getByRole("button", { name: "Done editing boundary", exact: true })
      .click();
    await trigger.click();
    await dialog
      .getByRole("button", { name: "Capture starting view", exact: true })
      .click();
    assert.ok((await presentation()).startView);
    await dialog.locator(".board-start-view-saved").waitFor();
    await dialog
      .getByRole("combobox", { name: "Learner navigation", exact: true })
      .selectOption("fixed");
    assert.equal((await presentation()).navigation.mode, "fixed");
    await dialog
      .getByLabel("Space between narrow-screen rows", { exact: true })
      .fill("48");
    assert.equal((await presentation()).responsiveGap, 48);
    const scene = dialog
      .locator("details")
      .filter({ has: page.locator("summary", { hasText: "overlays" }) })
      .first();
    await scene.locator("summary").click();
    await scene
      .getByRole("combobox", { name: "Position", exact: true })
      .selectOption("left");
    assert.equal((await presentation()).immersive.overlays[0].anchor, "left");
    await scene.locator("summary").click();
    if (await dimensions.evaluate((el) => el.parentElement.open))
      await dimensions.click();
    fs.mkdirSync("/tmp/apertus-board-settings", { recursive: true });
    for (const width of [1440, 700, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const box = await dialog.boundingBox();
      assert.ok(
        box.x >= 0 &&
          box.x + box.width <= width &&
          box.y >= 0 &&
          box.y + box.height <= 800,
      );
      const done = dialog.getByRole("button", { name: "Done", exact: true });
      const doneBox = await done.boundingBox();
      assert.ok(doneBox.y + doneBox.height <= 800);
      await dialog.locator(".component-dialog-body").evaluate((el) => {
        el.scrollTop = 0;
      });
      await page.screenshot({
        path: `/tmp/apertus-board-settings/top-${width}.png`,
      });
      await dialog.locator(".component-dialog-body").evaluate((el) => {
        el.scrollTop = el.scrollHeight;
      });
      await page.screenshot({
        path: `/tmp/apertus-board-settings/bottom-${width}.png`,
      });
      await dialog.getByRole("button", { name: "Done", exact: true }).click();
      await trigger.click();
      await dialog.waitFor();
    }
    await page.keyboard.press("Escape");
    await dialog.waitFor({ state: "hidden" });
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === "Board settings",
    );
    const saved = await presentation();
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.reload();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    assert.deepEqual(await presentation(), saved);
    await trigger.click();
    await dialog
      .getByRole("radio", { name: "Fit all content", exact: true })
      .check();
    assert.equal((await presentation()).learnerArea, undefined);
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    assert.deepEqual(errors, []);
    console.log(
      "Board settings: boundary editing, capture, navigation, responsive spacing, overlay creation, persistence, focus and four viewport sizes passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
