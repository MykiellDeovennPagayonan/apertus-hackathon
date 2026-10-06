const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { createFreshDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
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
    await page.addInitScript((document) => {
      if (!localStorage.getItem("apertus-builder-draft-v1"))
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        );
    }, createFreshDocument());
    await page.goto(
      `${process.env.UX_TEST_URL || "http://127.0.0.1:43003"}/experiments/builder`,
    );
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document
            .authored,
      );
    const viewport = page.locator(".board-viewport");
    const bounds = await viewport.boundingBox();
    for (const next of ["Select", "Text", "Box"]) {
      await page
        .getByRole("button", { name: "Hand tool", exact: true })
        .click();
      assert.ok(
        await viewport.evaluate((el) => el.classList.contains("is-panning")),
      );
      await page
        .getByRole("button", { name: `${next} tool`, exact: true })
        .click();
      assert.equal(
        await viewport.evaluate((el) => el.classList.contains("is-panning")),
        false,
      );
      assert.equal(
        await page
          .getByRole("button", { name: `${next} tool`, exact: true })
          .getAttribute("aria-pressed"),
        "true",
      );
    }
    console.log("Pan switches to every drawing tool passed");
    const x = bounds.x + 350,
      y = bounds.y + 180;
    await page.getByRole("button", { name: "Box tool", exact: true }).click();
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 360, y + 180, { steps: 6 });
    await page.mouse.up();
    const box = page.locator('[data-drawing-kind="box"]');
    await box.waitFor();
    assert.equal(await page.locator(".board-item-tools").count(), 0);
    assert.equal((await draft()).nodes.length, 0);
    const inspector = page.getByRole("complementary", {
      name: "Box settings",
      exact: true,
    });
    await inspector.waitFor();
    const inspectorBounds = await inspector.boundingBox();
    assert.ok(
      inspectorBounds.x < bounds.x + 30,
      "Drawing settings sit on the left",
    );
    const customColor = inspector.getByLabel("Background custom color", {
      exact: true,
    });
    assert.deepEqual(
      await customColor.evaluate((el) => {
        const css = getComputedStyle(el);
        return { width: css.width, height: css.height, padding: css.padding };
      }),
      { width: "26px", height: "26px", padding: "2px" },
    );
    await inspector
      .getByRole("button", { name: "Background #1971c2", exact: true })
      .click();
    await inspector
      .getByRole("spinbutton", { name: "Corner radius", exact: true })
      .fill("16");
    const oldBox = await box.boundingBox();
    const handle = page.getByRole("button", {
      name: "Resize box se",
      exact: true,
    });
    const h = await handle.boundingBox();
    await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
    await page.mouse.down();
    await page.mouse.move(h.x + h.width / 2 + 70, h.y + h.height / 2 + 40, {
      steps: 4,
    });
    await page.mouse.up();
    assert.ok((await box.boundingBox()).width > oldBox.width);
    console.log("Box creation, native storage, inspector and resize passed");
    await page.getByRole("button", { name: "Text tool", exact: true }).click();
    await page.mouse.click(x + 30, y + 40);
    const editor = page.getByRole("textbox", {
      name: "Edit drawing text",
      exact: true,
    });
    await editor.waitFor({ timeout: 5000 });
    const oneLineHeight = (
      await page.locator('[data-drawing-kind="text"]').boundingBox()
    ).height;
    await editor.fill("Gas container\n");
    assert.ok(
      (await page.locator('[data-drawing-kind="text"]').boundingBox()).height >
        oneLineHeight,
      "Trailing Enter reserves a second line",
    );
    await editor.fill("Gas container");
    await page.keyboard.press("Escape");
    const text = page.locator('[data-drawing-kind="text"]');
    await text.waitFor();
    assert.equal(
      await text.locator(".drawing-text-content").textContent(),
      "Gas container",
    );
    assert.equal(
      await text
        .locator(".drawing-text-surface")
        .evaluate((el) => getComputedStyle(el).borderWidth),
      "0px",
    );
    await page
      .getByRole("button", { name: "Font size L", exact: true })
      .click();
    assert.equal(
      await text
        .locator(".drawing-text-content")
        .evaluate((el) => getComputedStyle(el).fontSize),
      "32px",
    );
    await page.locator(".drawing-selection-body").hover();
    assert.equal(
      await page
        .locator(".drawing-selection-body")
        .evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgba(0, 0, 0, 0)",
    );
    const selectedColor = page.getByRole("button", {
      name: "Text color #30362e",
      exact: true,
    });
    assert.equal(await selectedColor.textContent(), "✓");
    await selectedColor.hover();
    assert.equal(
      await selectedColor.evaluate(
        (el) => getComputedStyle(el).backgroundColor,
      ),
      "rgb(48, 54, 46)",
    );
    await text.locator(".drawing-text-surface").focus();
    const beforeNudge = (await draft()).presentation.items.find(
      (item) => item.kind === "text",
    ).rect.x;
    await page.keyboard.press("Shift+ArrowRight");
    assert.equal(
      (await draft()).presentation.items.find((item) => item.kind === "text")
        .rect.x,
      beforeNudge + 10,
    );
    await page.keyboard.press("Meta+z");
    await page
      .getByRole("button", { name: "Lock drawing", exact: true })
      .click();
    assert.equal(await page.locator(".drawing-handle").count(), 0);
    await page
      .getByRole("button", { name: "Unlock drawing", exact: true })
      .click();
    assert.equal(await page.locator(".drawing-handle").count(), 2);

    await page
      .getByRole("button", { name: "Send to back", exact: true })
      .click();
    assert.ok(
      Number(await text.evaluate((el) => getComputedStyle(el).zIndex)) <
        Number(await box.evaluate((el) => getComputedStyle(el).zIndex)),
    );
    await page
      .getByRole("button", { name: "Bring to front", exact: true })
      .click();
    await page.locator(".drawing-selection-body").dblclick();
    await editor.fill(
      "Gas container with enough explanatory text to wrap across several lines when the text area is narrowed.",
    );
    await page.keyboard.press("Escape");
    assert.ok(
      (await text.boundingBox()).width > 640,
      "Auto text grows beyond the former hidden wrap limit",
    );
    const autoHeight = (await text.boundingBox()).height;
    await page.getByLabel("Text sizing", { exact: true }).selectOption("wrap");
    await page.getByLabel("Text width", { exact: true }).fill("520");
    assert.ok(
      (await text.boundingBox()).height > autoHeight,
      "Fixed width wraps and grows vertically",
    );
    const th = await page
      .getByRole("button", { name: "Resize text e", exact: true })
      .boundingBox();
    await page.mouse.move(th.x + th.width / 2, th.y + th.height / 2);
    await page.mouse.down();
    await page.mouse.move(th.x + th.width / 2 - 250, th.y + th.height / 2, {
      steps: 5,
    });
    await page.mouse.up();
    assert.equal(
      await text
        .locator(".drawing-text-content")
        .evaluate((el) => getComputedStyle(el).overflowY),
      "visible",
    );
    await page.locator(".drawing-selection-body").dblclick();
    await editor.fill("Short");
    await page.keyboard.press("Escape");
    assert.ok(
      (await text.boundingBox()).height < autoHeight * 2,
      "Deleting wrapped text shrinks its height",
    );
    await page.getByLabel("Text sizing", { exact: true }).selectOption("auto");
    assert.ok(
      (await text.boundingBox()).width < 200,
      "Auto sizing can be restored after resizing",
    );
    console.log(
      "Inline text, font settings, layering, sizing, hover and palette passed",
    );
    await page
      .getByRole("button", { name: "copy drawing", exact: true })
      .click();
    await page.keyboard.press("Meta+v");
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-drawing-kind="text"]').count(), 2);
    await page.keyboard.press("Meta+z");
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-drawing-kind="text"]').count(), 1);
    await page.keyboard.press("Meta+Shift+z");
    await page.waitForTimeout(200);
    assert.equal(await page.locator('[data-drawing-kind="text"]').count(), 2);
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    assert.equal(
      await page.getByRole("toolbar", { name: "Drawing tools" }).isVisible(),
      false,
    );
    assert.equal(await page.locator(".connection-node").count(), 0);
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.reload();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    assert.equal(await page.locator('[data-drawing-kind="text"]').count(), 2);
    assert.equal((await draft()).presentation.version, 2);
    await page.locator(".drawing-text-surface").first().focus();
    await page
      .getByRole("complementary", { name: "Text settings", exact: true })
      .waitFor();
    await page.screenshot({ path: "/tmp/apertus-drawing-tools-build.png" });
    await page.setViewportSize({ width: 390, height: 844 });
    const mobileInspector = await page
      .locator(".drawing-inspector")
      .boundingBox();
    const mobileBoard = await viewport.boundingBox();
    assert.ok(
      mobileInspector.x >= 0 &&
        mobileInspector.x + mobileInspector.width <= 390,
      "Mobile settings fit the viewport",
    );
    assert.ok(
      mobileInspector.y + mobileInspector.height <=
        mobileBoard.y + mobileBoard.height - 60,
      "Mobile settings clear the navigation controls",
    );
    await page.screenshot({ path: "/tmp/apertus-drawing-tools-mobile.png" });
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.getByRole("button", { name: /Try lesson/ }).click();
    assert.equal(
      await page.getByRole("toolbar", { name: "Drawing tools" }).count(),
      0,
    );
    assert.equal(await page.locator(".drawing-inspector").count(), 0);
    assert.equal(
      await box.evaluate((el) => getComputedStyle(el).pointerEvents),
      "none",
    );
    assert.equal(await page.locator('[data-drawing-kind="text"]').count(), 2);
    await page.screenshot({ path: "/tmp/apertus-drawing-tools.png" });
    assert.deepEqual(errors, []);
    console.log(
      "Drawing tools browser: clipboard, undo/redo, Connections exclusion, reload and Try lesson passed",
    );
  } catch (error) {
    console.log(
      await page.evaluate(() => ({
        draft: JSON.parse(localStorage.getItem("apertus-builder-draft-v1"))
          ?.document.authored.presentation,
        active: document.activeElement?.outerHTML,
        editors: document.querySelectorAll(".drawing-text-editor").length,
      })),
    );
    await page.screenshot({ path: "/tmp/apertus-drawing-tools-failure.png" });
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
