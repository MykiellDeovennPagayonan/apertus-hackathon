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
const { createDrawing } = load("src/simulations/runtime/authoring/drawings.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const authored = emptyAuthoredDocument();
authored.scopes = [{ id: "main", label: "Main" }];
const def = publicDefinition("canvases/physical");
authored.nodes.push({
  id: "instruction",
  definition: def.id,
  version: def.version,
  label: "Instruction",
  scope: "main",
  configuration: structuredClone(def.defaults),
});
authored.layout.children.push({
  ...emptyLayout("layout/instruction"),
  node: "instruction",
});
authored.presentation = convertToBoard(authored);
authored.presentation.version = 2;
authored.presentation.items[0].rect = { x: 0, y: 0, width: 240, height: 180 };
const box = createDrawing("box", { x: 300, y: 0, width: 160, height: 120 }, 1);
const text = createDrawing("text", { x: 600, y: 0, width: 140, height: 60 }, 2);
text.text = "Third item";
authored.presentation.items.push(box, text);
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
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      document,
    );
    await page.goto(
      `${process.env.UX_TEST_URL || "http://127.0.0.1:43003"}/experiments/builder`,
    );
    const continueDraft = page.getByRole("button", {
      name: "Continue draft",
      exact: true,
    });
    if (await continueDraft.isVisible()) await continueDraft.click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const viewport = page.locator(".board-viewport");
    const component = page.locator(".board-item");
    const boxElement = page.locator('[data-drawing-kind="box"]');
    const textElement = page.locator('[data-drawing-kind="text"]');
    const bounds = await viewport.boundingBox();
    const blank = {
      x: bounds.x + bounds.width - 30,
      y: bounds.y + bounds.height - 80,
    };
    const selection = page.locator(".board-selection > strong");
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document
            .authored.presentation,
      );
    const region = async (elements) => {
      const rects = await Promise.all(elements.map((el) => el.boundingBox()));
      return {
        x: Math.min(...rects.map((r) => r.x)) - 12,
        y: Math.min(...rects.map((r) => r.y)) - 12,
        right: Math.max(...rects.map((r) => r.x + r.width)) + 12,
        bottom: Math.max(...rects.map((r) => r.y + r.height)) + 12,
      };
    };
    const drag = async (r, reverse = false) => {
      await page.mouse.move(reverse ? r.right : r.x, reverse ? r.bottom : r.y);
      await page.mouse.down();
      await page.mouse.move(reverse ? r.x : r.right, reverse ? r.y : r.bottom, {
        steps: 6,
      });
      assert.equal(await page.locator(".board-marquee").count(), 1);
      await page.mouse.up();
      assert.equal(await page.locator(".board-marquee").count(), 0);
    };
    await drag(await region([component, boxElement]));
    assert.equal(await selection.textContent(), "2 selected");
    assert.ok(
      await component.evaluate((el) => el.classList.contains("is-selected")),
    );
    assert.equal(await page.locator(".drawing-selection").count(), 1);
    await page.keyboard.down("Shift");
    await drag(await region([textElement]));
    await page.keyboard.up("Shift");
    assert.equal(await selection.textContent(), "3 selected");
    const mixedItems = [component, boxElement, textElement];
    const boxes = () => Promise.all(mixedItems.map((el) => el.boundingBox()));
    const close = (actual, expected) =>
      assert.ok(
        Math.abs(actual - expected) < 1,
        `${actual} should equal ${expected}`,
      );
    const heading = component.locator(".board-item-tools button").first();
    for (const origin of [boxElement, textElement, heading]) {
      const saved = (await draft()).items;
      const before = await boxes();
      const handle = await origin.boundingBox();
      await page.mouse.move(
        handle.x + handle.width / 2,
        handle.y + handle.height / 2,
      );
      await page.mouse.down();
      await page.mouse.move(
        handle.x + handle.width / 2 + 48,
        handle.y + handle.height / 2 + 24,
        { steps: 6 },
      );
      const live = await boxes();
      for (let i = 0; i < before.length; i++) {
        close(live[i].x - before[i].x, 48);
        close(live[i].y - before[i].y, 24);
      }
      assert.deepEqual(
        (await draft()).items,
        saved,
        "Dragging previews every item without saving early",
      );
      await page.mouse.up();
      const released = await boxes();
      for (let i = 0; i < before.length; i++) {
        close(released[i].x, live[i].x);
        close(released[i].y, live[i].y);
      }
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      assert.deepEqual(
        (await draft()).items,
        saved,
        "One undo restores the entire mixed drag",
      );
    }
    // Cancelling a drawing-led mixed drag restores every preview together.
    const beforeCancel = await boxes();
    const drawingBounds = await boxElement.boundingBox();
    await page.mouse.move(drawingBounds.x + 40, drawingBounds.y + 40);
    await page.mouse.down();
    await page.mouse.move(drawingBounds.x + 100, drawingBounds.y + 70, {
      steps: 4,
    });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    const cancelled = await boxes();
    for (let i = 0; i < cancelled.length; i++) {
      close(cancelled[i].x, beforeCancel[i].x);
      close(cancelled[i].y, beforeCancel[i].y);
    }
    // Restore the selection after Escape for the existing rectangle checks.
    await drag(await region(mixedItems));
    console.log(
      "Mixed selections preview and commit together from drawings and components; undo and cancellation passed",
    );
    await page.mouse.click(blank.x, blank.y);
    assert.equal(await selection.count(), 0);
    await drag(await region([component, boxElement]), true);
    assert.equal(await selection.textContent(), "2 selected");
    // Escape abandons the rectangle and preserves the preceding selection.
    await page.mouse.move(blank.x - 80, blank.y - 60);
    await page.mouse.down();
    await page.mouse.move(blank.x, blank.y, { steps: 3 });
    await page.keyboard.press("Escape");
    await page.mouse.up();
    assert.equal(await selection.textContent(), "2 selected");
    assert.equal(await page.locator(".board-marquee").count(), 0);
    await page.getByLabel("Selection actions", { exact: true }).click();
    await page.getByRole("button", { name: "Group", exact: true }).click();
    await page.mouse.click(blank.x, blank.y);
    await drag(await region([boxElement]));
    assert.equal(
      await selection.textContent(),
      "2 selected",
      "Marquee expands existing groups",
    );
    const before = await draft();
    const background = await viewport.evaluate(
      (el) => el.style.backgroundPosition,
    );
    const componentBounds = await component.boundingBox();
    await page.mouse.move(componentBounds.x + 70, componentBounds.y + 20);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(componentBounds.x + 150, componentBounds.y + 55, {
      steps: 5,
    });
    assert.ok(
      await viewport.evaluate((el) =>
        el.classList.contains("is-right-panning"),
      ),
    );
    await page.mouse.up({ button: "right" });
    assert.equal(await selection.textContent(), "2 selected");
    assert.deepEqual(
      (await draft()).items,
      before.items,
      "Right dragging moves the camera only",
    );
    assert.notEqual(
      await viewport.evaluate((el) => el.style.backgroundPosition),
      background,
    );
    assert.equal(
      await viewport.evaluate((el) =>
        el.classList.contains("is-right-panning"),
      ),
      false,
    );
    await page.mouse.click(blank.x, blank.y, { button: "right" });
    assert.equal(
      await selection.textContent(),
      "2 selected",
      "Right click preserves selection",
    );
    const cameraBeforeCancel = await viewport.evaluate(
      (el) => el.style.backgroundPosition,
    );
    await page.mouse.move(blank.x, blank.y);
    await page.mouse.down({ button: "right" });
    await page.mouse.move(blank.x - 80, blank.y - 30, { steps: 4 });
    await page.keyboard.press("Escape");
    await page.mouse.up({ button: "right" });
    assert.equal(
      await viewport.evaluate((el) => el.style.backgroundPosition),
      cameraBeforeCancel,
    );
    await page.screenshot({ path: "/tmp/apertus-board-selection.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Board selection: mixed items, Shift addition, reverse drag, clearing, Escape, groups and right-button panning passed",
    );
  } catch (error) {
    await page.screenshot({ path: "/tmp/apertus-board-selection-failure.png" });
    console.log(
      await page.locator(".board-viewport").count(),
      await page.locator(".board-selection").allTextContents(),
    );
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
