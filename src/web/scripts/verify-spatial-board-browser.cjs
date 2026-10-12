const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { emptyAuthoredDocument, emptyLayout } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const authored = emptyAuthoredDocument();
const definition = publicDefinition("canvases/physical");
authored.scopes = [{ id: "main", label: "Main" }];
authored.nodes.push({
  id: "canvas",
  definition: definition.id,
  version: definition.version,
  label: "Canvas",
  scope: "main",
  configuration: structuredClone(definition.defaults),
});
authored.layout.children = [
  { ...emptyLayout("layout/canvas"), node: "canvas" },
];
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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.addInitScript(
      (document) =>
        !localStorage.getItem("apertus-builder-draft-v1") &&
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      document,
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
    await page
      .getByRole("button", { name: "Board settings", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: "Return to flow layout (original order)",
        exact: true,
      })
      .click();
    await page
      .getByRole("button", { name: "Preview board conversion" })
      .click();
    await page.getByRole("button", { name: "Use this board" }).click();
    await page
      .getByRole("button", { name: "Fit content", exact: true })
      .click();
    await page
      .locator(".board-item")
      .first()
      .click({ position: { x: 20, y: 20 } });
    const handle = page.locator(".board-item-tools > button").first();
    await handle.focus();
    await page.keyboard.press("ArrowRight");
    await page
      .getByRole("button", { name: "Board settings", exact: true })
      .click();
    await page.getByRole("radio", { name: "Custom boundary" }).click();
    await page.getByRole("button", { name: "Capture starting view" }).click();
    await page
      .getByRole("button", { name: "Close Board settings", exact: true })
      .click();
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document
            .authored,
      );
    await page.getByRole("button", { name: "Done editing boundary" }).click();
    const beforeDrag = await draft();
    let b = await handle.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 70, b.y + b.height / 2 + 40);
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.deepEqual(
      (await draft()).presentation,
      beforeDrag.presentation,
      "Escape cancels placement without a document edit",
    );
    await page
      .locator(".board-item")
      .first()
      .click({ position: { x: 20, y: 20 } });
    b = await handle.boundingBox();
    await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2);
    await page.mouse.down();
    await page.mouse.move(b.x + b.width / 2 + 80, b.y + b.height / 2 + 40, {
      steps: 8,
    });
    await page.mouse.up();
    assert.notDeepEqual(
      (await draft()).presentation.items[0].rect,
      beforeDrag.presentation.items[0].rect,
    );
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.deepEqual(
      (await draft()).presentation.items[0].rect,
      beforeDrag.presentation.items[0].rect,
      "One undo reverses the entire pointer gesture",
    );
    await page
      .getByRole("button", { name: "Fit content", exact: true })
      .click();
    await page
      .locator(".board-item")
      .first()
      .click({ position: { x: 20, y: 20 } });
    await page.getByRole("button", { name: "Duplicate", exact: true }).click();
    assert.equal(await page.locator(".board-item").count(), 2);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal(await page.locator(".board-item").count(), 1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    assert.equal(await page.locator(".board-item").count(), 2);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    // Moving outside a custom boundary succeeds and offers an immediate repair.
    await page
      .locator(".board-item")
      .first()
      .click({ position: { x: 20, y: 20 } });
    await handle.focus();
    for (let step = 0; step < 12; step++)
      await page.keyboard.press("Shift+ArrowRight");
    await page.locator(".board-view-warning").waitFor();
    await page.screenshot({ path: "/tmp/learner-view-warning.png" });
    assert.equal(await page.locator(".board-item.is-outside-view").count(), 1);
    await page
      .locator(".board-view-warning")
      .getByRole("button", { name: "Expand to fit" })
      .click();
    assert.equal(await page.locator(".board-view-warning").count(), 0);
    await page
      .getByRole("button", { name: "Board settings", exact: true })
      .click();
    await page
      .getByRole("radio", { name: "Fit all content", exact: true })
      .check();
    assert.equal((await draft()).presentation.learnerArea, undefined);
    await page.getByRole("button", { name: "Close Board settings" }).click();
    await handle.focus();
    for (let step = 0; step < 12; step++)
      await page.keyboard.press("Shift+ArrowRight");
    assert.equal(await page.locator(".board-view-warning").count(), 0);
    await page
      .getByRole("button", { name: "Fit content", exact: true })
      .click();
    await page.screenshot({
      path: "/tmp/spatial-board-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    assert.equal(await page.locator(".spatial-board").count(), 1);
    for (const width of [1024, 390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page
        .getByRole("button", { name: "Fit content", exact: true })
        .click();
      await page.screenshot({
        path: `/tmp/spatial-board-${width}.png`,
        fullPage: true,
      });
      assert.equal(
        await page.evaluate(
          () => document.documentElement.scrollWidth > innerWidth,
        ),
        false,
        `No page overflow at ${width}`,
      );
    }
    await page.setViewportSize({ width: 1024, height: 844 });
    const beforeLearner = await draft();
    await page.getByRole("button", { name: "Try lesson", exact: true }).click();
    await page.getByRole("button", { name: "Pan", exact: true }).click();
    const viewport = page.locator(".board-viewport");
    const bounds = await viewport.boundingBox();
    await page.mouse.move(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
    );
    await page.mouse.down();
    await page.mouse.move(bounds.x + 20000, bounds.y + 20000);
    await page.mouse.up();
    for (let j = 0; j < 4; j++)
      await page
        .getByRole("button", { name: "Zoom out", exact: true })
        .first()
        .click();
    assert.deepEqual(
      await draft(),
      beforeLearner,
      "Learner navigation does not mutate authored document",
    );
    await page
      .getByRole("button", { name: "Return to builder", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Board settings", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Learner navigation", exact: true })
      .selectOption("fixed");
    await page
      .getByRole("button", { name: "Close Board settings", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Try lesson", exact: true }).click();
    await page.locator(".board-readability").waitFor();
    assert.ok(
      await page.getByRole("button", { name: "Pan", exact: true }).isDisabled(),
    );
    await page
      .getByRole("button", { name: "Return to builder", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Board settings", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Learner navigation", exact: true })
      .selectOption("bounded");
    await page.reload();
    if (await continueDraft.isVisible()) await continueDraft.click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    assert.equal(await page.locator(".board-item").count(), 1);
    assert.deepEqual(errors, []);
    console.log(
      "Spatial board browser: conversion, keyboard placement, bounds, cancellation, mode switching, persistence and responsive widths passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
