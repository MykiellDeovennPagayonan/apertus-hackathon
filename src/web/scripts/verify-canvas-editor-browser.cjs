const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { fixture } = require("./verify-canvas-editor.cjs");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(
      (process.env.BUILDER_BASE_URL || "http://127.0.0.1:3000") +
        "/experiments/builder",
    );
    await page
      .getByText("Open or import an experiment", { exact: true })
      .click();
    await page.getByLabel("Import experiment or recipe").setInputFiles({
      name: "canvas.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(fixture())),
    });
    const heading = (id) =>
      page.locator(`[data-node-id="${id}"] .connection-node-heading`);
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document,
      );
    const key = (value) => page.keyboard.press(value);
    const wait = () => page.waitForTimeout(100);
    await heading("line-a").waitFor();
    await page
      .getByRole("button", { name: "Fit to content", exact: true })
      .click();
    await heading("line-a").click();
    assert.equal(
      await page.locator("dialog.component-dialog").isVisible(),
      false,
      "single click only selects",
    );
    await heading("line-b").click({ modifiers: ["Shift"] });
    assert.equal(await page.locator(".connection-node.is-selected").count(), 2);
    await key("Control+g");
    await wait();
    assert.equal((await draft()).editor.groups.length, 1);
    const original = await draft();
    // Drag one member: all members move by the same amount and produce one history action.
    const box = await heading("line-a").boundingBox();
    await page.mouse.move(box.x + 60, box.y + 40);
    await page.mouse.down();
    await page.mouse.move(box.x + 180, box.y + 100, { steps: 12 });
    await page.mouse.up();
    await wait();
    const moved = await draft();
    const delta = (id) => ({
      x: moved.editor.positions[id].x - original.editor.positions[id].x,
      y: moved.editor.positions[id].y - original.editor.positions[id].y,
    });
    assert.ok(Math.abs(delta("line-a").x - delta("line-b").x) < 1e-8);
    assert.ok(Math.abs(delta("line-a").y - delta("line-b").y) < 1e-8);
    assert.ok(delta("line-a").x > 0);
    await key("Control+z");
    await wait();
    assert.deepEqual(
      (await draft()).editor.positions,
      original.editor.positions,
    );
    await key("Control+Shift+z");
    await wait();
    assert.deepEqual((await draft()).editor.positions, moved.editor.positions);
    await key("Control+c");
    await key("Control+v");
    await wait();
    const pasted = await draft();
    assert.equal(pasted.scene.objects.length, 4);
    assert.equal(pasted.editor.groups.length, 2);
    assert.equal(await page.locator(".connection-node.is-selected").count(), 2);
    await key("Delete");
    await wait();
    assert.equal((await draft()).scene.objects.length, 2);
    await key("Control+z");
    await wait();
    assert.equal((await draft()).scene.objects.length, 4);
    await key("Control+y");
    await wait();
    assert.equal((await draft()).scene.objects.length, 2);
    await page
      .getByRole("button", { name: "Fit to content", exact: true })
      .click();
    await heading("line-a").click();
    await heading("line-a").click({ button: "right" });
    await page
      .getByRole("menuitem", { name: "Ungroup · Ctrl/⌘ Shift G", exact: true })
      .click();
    await wait();
    assert.equal((await draft()).editor.groups.length, 0);
    await key("Control+z");
    await wait();
    assert.equal((await draft()).editor.groups.length, 1);
    // Open settings explicitly and preserve normal text editing/delete behavior.
    await page
      .getByRole("button", { name: "Edit Line 1", exact: true })
      .click();
    const dialog = page.locator("dialog.component-dialog");
    await dialog.waitFor();
    const input = dialog.getByLabel("Name", { exact: true });
    await input.fill("Renamed line");
    await key("Control+a");
    await key("Delete");
    assert.equal(
      (await draft()).scene.objects.length,
      2,
      "Delete inside a text field must not remove components",
    );
    await input.fill("Line 1");
    await dialog.getByRole("button", { name: "Done", exact: true }).click();
    await page
      .getByRole("button", { name: "Fit to content", exact: true })
      .click();
    // Pan far beyond old bounds in both directions.
    const canvas = page.getByRole("region", {
      name: "Connections canvas",
      exact: true,
    });
    const bounds = await canvas.boundingBox();
    await page.mouse.move(bounds.x + bounds.width - 20, bounds.y + 80);
    const pan = () =>
      page
        .locator(".builder-canvas")
        .evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).e);
    const p0 = await pan();
    await page.mouse.wheel(20000, 0);
    await wait();
    const p1 = await pan();
    assert.ok(p1 < p0 - 19000, "rightward navigation is unbounded");
    await page.mouse.wheel(-40000, 0);
    await wait();
    const p2 = await pan();
    assert.ok(p2 > p1 + 39000, "leftward navigation is unbounded");
    await page
      .getByRole("button", { name: "Fit to content", exact: true })
      .click();
    await page.locator(".builder-action-history > summary").click();
    assert.ok((await page.locator(".builder-action-history li").count()) > 0);
    await page.locator(".builder-action-history > summary").click();
    await page.screenshot({ path: "/tmp/apertus-canvas-editor.png" });
    // Shift-drag a selection rectangle without panning the camera.
    await canvas.focus();
    await key("Escape");
    const region = await canvas.boundingBox();
    await page.mouse.move(region.x + 8, region.y + 50);
    await page.keyboard.down("Shift");
    await page.mouse.down();
    await page.mouse.move(
      region.x + region.width - 8,
      region.y + region.height - 8,
      { steps: 12 },
    );
    await page.mouse.up();
    await page.keyboard.up("Shift");
    assert.equal(
      await page.locator(".connection-node.is-selected").count(),
      5,
      "selection rectangle selects all intersecting cards",
    );
    // A long drag crosses the old card-position wall; one undo restores it.
    const beforeLongDrag = await draft();
    const far = await heading("line-a").boundingBox();
    await page.mouse.move(far.x + 50, far.y + 40);
    await page.mouse.down();
    await page.mouse.move(far.x + 5000, far.y + 40, { steps: 16 });
    await page.mouse.up();
    await wait();
    assert.ok((await draft()).editor.positions["line-a"].x > 3000);
    await key("Control+z");
    await wait();
    assert.deepEqual(
      (await draft()).editor.positions,
      beforeLongDrag.editor.positions,
    );
    // Selection actions remain within a narrow viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("button", { name: "Fit to content", exact: true })
      .click();
    const overflow = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      elements: Array.from(document.querySelectorAll("body *"))
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return (
            r.width > 0 &&
            r.right > innerWidth + 1 &&
            !el.closest(".builder-canvas")
          );
        })
        .map((el) => ({
          tag: el.tagName,
          class: el.className,
          width: el.getBoundingClientRect().width,
        }))
        .slice(0, 12),
    }));
    assert.ok(overflow.width <= overflow.viewport, JSON.stringify(overflow));
    await page.screenshot({ path: "/tmp/apertus-canvas-editor-mobile.png" });

    assert.deepEqual(errors, []);
    console.log(
      "Canvas browser: selection, multi-selection, grouping, group movement, copy/paste, deletion, undo/redo, context menu, text editing and unbounded navigation passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
