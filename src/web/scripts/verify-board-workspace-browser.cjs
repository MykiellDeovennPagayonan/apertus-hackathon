const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { emptyAuthoredDocument, emptyLayout } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const authored = emptyAuthoredDocument();
authored.scopes = [{ id: "main", label: "Main" }];
const def = publicDefinition("canvases/physical");
authored.nodes.push({
  id: "canvas",
  definition: def.id,
  version: def.version,
  label: "2D physical canvas",
  scope: "main",
  configuration: structuredClone(def.defaults),
});
authored.layout.children.push({
  ...emptyLayout("layout/canvas"),
  node: "canvas",
});
authored.presentation = convertToBoard(authored);
const document = canonicalDocument(authored);
(async () => {
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
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      ({ document }) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      { document },
    );
    await page.goto(
      `${process.env.UX_TEST_URL || "http://127.0.0.1:43002"}/experiments/builder`,
    );
    const continueDraft = page.getByRole("button", {
      name: "Continue draft",
      exact: true,
    });
    if (await continueDraft.isVisible()) await continueDraft.click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const viewport = page.locator(".board-viewport");
    const item = page.locator(".board-item").first();
    const handle = page.getByRole("button", {
      name: "Move 2D physical canvas",
      exact: true,
    });
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document
            .authored,
      );
    assert.equal(
      await page.locator(".board-item .recipe-author-label").count(),
      0,
      "The board heading replaces duplicate authoring chrome",
    );
    await page
      .getByRole("button", { name: "Fit content", exact: true })
      .click();
    await item.click({ position: { x: 30, y: 30 } });
    await handle.focus();
    await page.keyboard.press("Enter");
    const beforeSettings = await item.boundingBox();
    await page
      .getByRole("button", { name: "Board settings", exact: true })
      .click();
    assert.deepEqual(
      await item.boundingBox(),
      beforeSettings,
      "Opening settings does not resize or move content",
    );
    await page.keyboard.press("Escape");
    await page.waitForFunction(
      () => document.activeElement?.textContent?.trim() === "Board settings",
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Board settings", exact: true })
        .evaluate((el) => el === document.activeElement),
      true,
      "Escape returns focus to the settings trigger",
    );
    await page
      .getByRole("button", { name: "Edit 2D physical canvas", exact: true })
      .click();
    await page.locator("dialog[open]").waitFor();
    await page.keyboard.press("Escape");
    await page.getByLabel("Selection actions", { exact: true }).click();
    await page
      .getByRole("button", { name: "Lock placement", exact: true })
      .click();
    assert.equal((await draft()).presentation.items[0].locked, true);
    await page
      .getByRole("button", { name: "Unlock placement", exact: true })
      .click();
    await page.getByLabel("Selection actions", { exact: true }).press("Escape");
    await page.getByLabel("Position and size", { exact: true }).click();
    await page
      .getByLabel("Aspect ratio", { exact: true })
      .selectOption(String(4 / 3));
    await page.getByLabel("width", { exact: true }).fill("640");
    await page
      .getByRole("button", { name: "Apply placement", exact: true })
      .click();
    const resized = (await draft()).presentation.items[0];
    assert.equal(resized.rect.width, 640);
    assert.equal(resized.rect.height, 480);
    assert.equal(resized.aspectRatio, 4 / 3);
    await page.getByLabel("Position and size", { exact: true }).press("Escape");
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    const beforeNavigation = await draft();
    await page.getByRole("button", { name: "Pan", exact: true }).click();
    await viewport.focus();
    for (let n = 0; n < 40; n++) await page.keyboard.press("ArrowRight");
    assert.ok(
      (await item.boundingBox()).x < -1000,
      "Author navigation remains unbounded beyond all content",
    );
    assert.deepEqual(
      await draft(),
      beforeNavigation,
      "Camera changes do not edit the document",
    );
    await page
      .getByRole("button", { name: "Fit content", exact: true })
      .click();
    await page.getByLabel("Board navigation help", { exact: true }).click();
    assert.equal(
      await page
        .getByRole("button", { name: "Reset experiment", exact: true })
        .isVisible(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", {
          name: "Use current settings as starting values",
          exact: true,
        })
        .isVisible(),
      true,
    );
    await page
      .getByLabel("Board navigation help", { exact: true })
      .press("Escape");
    for (const [width, height] of [
      [1440, 900],
      [1024, 548],
      [390, 844],
      [320, 844],
    ]) {
      await page.setViewportSize({ width, height });
      await page
        .getByRole("button", { name: "Fit content", exact: true })
        .click();
      const panToggle = page.getByRole("button", { name: "Pan", exact: true });
      if ((await panToggle.getAttribute("aria-pressed")) === "true")
        await panToggle.click();
      await item.click({ position: { x: 30, y: 30 } });
      await handle.focus();
      await page.keyboard.press("Enter");
      await page.waitForTimeout(100);
      const bounds = await viewport.boundingBox();
      assert.equal(bounds.x, 0, `Canvas starts at the left edge at ${width}`);
      assert.equal(
        bounds.width,
        width,
        `Canvas fills the workspace at ${width}`,
      );
      assert.equal(
        Math.round(bounds.y + bounds.height),
        height,
        `Canvas reaches the viewport bottom at ${width}`,
      );
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollHeight > innerHeight,
        ),
        false,
        `No page scrolling at ${width}`,
      );
      for (const selector of [
        ".board-camera-tools",
        ".board-workspace-tools",
        ".board-selection",
      ]) {
        const box = await page.locator(selector).boundingBox();
        assert.ok(
          box.x >= 0 &&
            box.x + box.width <= width &&
            box.y >= bounds.y &&
            box.y + box.height <= height,
          `${selector} stays reachable at ${width}`,
        );
      }
      if (width < 700)
        assert.ok(
          (
            await page
              .getByRole("button", { name: "Board settings", exact: true })
              .boundingBox()
          ).height >= 44,
          "Touch utilities retain 44px targets",
        );
      await page.screenshot({
        path: `/tmp/build-workspace-${width}.png`,
        fullPage: true,
      });
      await page.getByLabel("Board navigation help", { exact: true }).click();
      const help = await page
        .locator(".board-navigation-help > div")
        .boundingBox();
      assert.ok(
        help.x >= 0 && help.x + help.width <= width && help.y >= bounds.y,
        `Navigation disclosure stays inside the workspace at ${width}`,
      );
      await page
        .getByLabel("Board navigation help", { exact: true })
        .press("Escape");
      await page
        .getByRole("button", { name: "Board settings", exact: true })
        .click();
      const settings = await page
        .getByRole("dialog", { name: "Board settings", exact: true })
        .boundingBox();
      assert.ok(
        settings.x >= 0 &&
          settings.x + settings.width <= width &&
          settings.y + settings.height <= height,
        `Settings stay reachable at ${width}`,
      );
      await page.keyboard.press("Escape");
      await page
        .getByRole("button", { name: "Clear selection", exact: true })
        .click();
      await page.screenshot({
        path: `/tmp/build-workspace-clean-${width}.png`,
        fullPage: true,
      });
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    await page.screenshot({
      path: "/tmp/build-workspace-connections.png",
      fullPage: true,
    });
    await page.getByRole("button", { name: "Build", exact: true }).click();
    assert.equal(
      await item.count(),
      1,
      "Switching tabs preserves a single live content host",
    );
    assert.deepEqual(errors, []);
    console.log(
      "Build workspace UX: full viewport canvas, floating tools, settings focus, component editing, placement, unbounded navigation and four responsive sizes passed",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
