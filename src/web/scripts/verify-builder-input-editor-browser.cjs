const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const fs = require("node:fs");
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
  const draft = () =>
    page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document,
    );
  try {
    await page.goto(
      `${process.env.UX_TEST_URL || "http://127.0.0.1:43002"}/experiments/builder`,
    );
    await page.getByRole("button", { name: "Continue to layout →" }).click();
    await page.getByRole("button", { name: "Continue to canvas →" }).click();
    await page
      .getByRole("button", { name: "Cartesian plane", exact: false })
      .click();
    await page
      .getByRole("button", { name: "Open empty builder", exact: true })
      .click();
    await page
      .locator('[data-port-id="objects"][data-port-side="input"]')
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("searchbox").fill("Line");
    await dialog
      .getByRole("button", { name: "Line · appearance + Add", exact: true })
      .click();
    const d = await draft();
    const line = d.authored.nodes.find(
      (n) => n.definition === "prefabs/AuthoredLine",
    );
    assert.ok(line, "Selecting a component creates it");
    assert.ok(
      d.authored.connections.some(
        (c) => c.from.node === line.id && c.to.port === "objects",
      ),
      "Created component is attached to clicked canvas",
    );
    const slope = page.locator(
      `[data-node-id="${line.id}"] [data-port-id="slope"][data-port-side="input"]`,
    );
    await slope.click();
    await page.screenshot({ path: "/tmp/builder-ux-manual-value.png" });
    const applyButton = dialog.getByRole("button", {
      name: "Apply value",
      exact: true,
    });
    const applyStyle = await applyButton.evaluate((el) => ({
      background: getComputedStyle(el).backgroundColor,
      color: getComputedStyle(el).color,
      height: el.getBoundingClientRect().height,
    }));
    assert.notEqual(applyStyle.background, "rgba(0, 0, 0, 0)");
    assert.equal(applyStyle.color, "rgb(255, 255, 255)");
    assert.ok(applyStyle.height >= 44);
    assert.equal(
      await dialog.getByRole("searchbox").count(),
      0,
      "Manual editing does not show the component browser",
    );
    await dialog.getByRole("spinbutton").fill("2.25");
    await dialog
      .getByRole("button", { name: "Use existing", exact: true })
      .click();
    assert.equal(await dialog.getByRole("spinbutton").count(), 0);
    await dialog
      .getByRole("button", { name: "Add component", exact: true })
      .click();
    await dialog.getByRole("searchbox").fill("Slider");
    await page.screenshot({ path: "/tmp/builder-ux-connect-picker.png" });
    await dialog
      .getByRole("button", { name: "Set value", exact: true })
      .click();
    assert.equal(
      await dialog.getByRole("spinbutton").inputValue(),
      "2.25",
      "Switching sources preserves the unfinished manual value",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/builder-ux-value-mobile.png" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page.setViewportSize({ width: 1440, height: 1000 });
    await dialog.getByRole("spinbutton").fill("3.5");
    await dialog
      .getByRole("button", { name: "Apply value", exact: true })
      .click();
    const changed = (await draft()).authored.nodes.find(
      (n) => n.id === line.id,
    ).configuration;
    assert.equal(
      (changed.b.y - changed.a.y) / (changed.b.x - changed.a.x),
      3.5,
    );
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.deepEqual(
      (await draft()).authored.nodes.find((n) => n.id === line.id)
        .configuration,
      line.configuration,
    );
    await slope.click();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator("dialog[open]").count(), 0);
    await page
      .locator(`[data-node-id="${line.id}"] .connection-node-heading`)
      .click();
    await page.screenshot({ path: "/tmp/builder-ux-selection.png" });
    const selection = page.getByRole("group", { name: "Selection actions" });
    assert.ok(
      (await selection.boundingBox()).height < 65,
      "Desktop selection toolbar stays one row",
    );
    await selection.getByRole("button", { name: "Clear selection" }).click();
    await page
      .getByRole("button", { name: "+ Add component", exact: true })
      .click();
    assert.equal(
      await dialog
        .getByRole("combobox", { name: "Destination canvas" })
        .isVisible(),
      false,
    );
    await page.screenshot({ path: "/tmp/builder-ux-library.png" });
    const navOverflow = await page
      .locator(".catalog-sections")
      .evaluate((el) => el.scrollHeight > el.clientHeight);
    assert.equal(
      navOverflow,
      false,
      "Desktop category navigation fits without vertical scrolling",
    );
    await dialog.getByRole("button", { name: "Filters", exact: true }).click();
    assert.equal(
      await dialog
        .getByRole("combobox", { name: "Destination canvas" })
        .isVisible(),
      true,
    );
    await dialog.getByRole("button", { name: "Filters", exact: true }).click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/builder-ux-library-mobile.png" });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await dialog
      .getByRole("button", { name: "Close library", exact: true })
      .click();
    assert.deepEqual(errors, []);
    await page.screenshot({ path: "/tmp/builder-input-editor.png" });
    console.log(
      "Input editor: add-and-connect, manual value, undo, Escape and runtime checks passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
