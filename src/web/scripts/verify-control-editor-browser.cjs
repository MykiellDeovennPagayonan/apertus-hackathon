const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { addCatalogComponent } = load(
  "src/simulations/builder/editor/compositeCommands.ts",
);
const url = process.env.UX_TEST_URL || "http://localhost:43100";
const captures = "/tmp/apertus-controls";
fs.mkdirSync(captures, { recursive: true });
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
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    const authored = premadeRecipe("coordinates").document;
    addCatalogComponent(authored, "controls/Slider", "extra-slider", "", [
      "model",
    ]);
    const document = canonicalDocument(authored);
    await page.addInitScript(
      (document) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      document,
    );
    await page.goto(url + "/experiments/builder");
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const preview = page.locator(".control-unconfigured");
    await preview.waitFor();
    assert.equal(await preview.getByRole("slider").count(), 1);
    assert.equal(await preview.getByRole("slider").isDisabled(), true);
    await page.screenshot({ path: captures + "/unconfigured-slider.png" });
    await preview
      .getByRole("button", { name: "Set up control", exact: true })
      .click();
    let dialog = page.getByRole("dialog");
    await dialog
      .getByRole("combobox", { name: "Target parameter", exact: true })
      .waitFor();
    assert.equal(
      await dialog.getByRole("textbox", { name: "Label", exact: true }).count(),
      1,
    );
    assert.equal(
      await dialog.getByText("Starting configuration", { exact: true }).count(),
      0,
    );
    const target = dialog.getByRole("combobox", {
      name: "Target parameter",
      exact: true,
    });
    const options = await target
      .locator("option")
      .evaluateAll((es) =>
        es.map((e) => ({ value: e.value, label: e.textContent })),
      );
    const choice = options.find((o) => o.label.endsWith(" · x"));
    assert.ok(choice, "An explicit x parameter is offered");
    await target.selectOption(choice.value);
    await dialog
      .getByRole("textbox", { name: "Label", exact: true })
      .fill("Horizontal input");
    await dialog
      .getByRole("textbox", { name: "Minimum", exact: true })
      .fill("-5");
    await dialog
      .getByRole("textbox", { name: "Maximum", exact: true })
      .fill("5");
    await dialog
      .getByRole("textbox", { name: "Step", exact: true })
      .fill("0.5");
    await page.screenshot({ path: captures + "/slider-settings.png" });
    await dialog
      .getByRole("button", { name: "Apply control settings", exact: true })
      .click();
    await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
    assert.equal(await page.locator(".control-unconfigured").count(), 0);
    const input = page.getByRole("textbox", {
      name: "Horizontal input",
      exact: true,
    });
    await input.fill("4.5");
    await input.blur();
    assert.equal(
      await page
        .getByRole("textbox", { name: "X coordinate", exact: true })
        .inputValue(),
      "4.5",
    );
    assert.equal(
      await page
        .getByRole("textbox", { name: "Y coordinate", exact: true })
        .inputValue(),
      "3",
    );
    await page
      .getByRole("textbox", { name: "Y coordinate", exact: true })
      .fill("-7");
    await input.fill("4");
    await input.blur();
    assert.equal(
      await page
        .getByRole("textbox", { name: "Y coordinate", exact: true })
        .inputValue(),
      "-7",
    );
    await input.fill("6");
    await input.blur();
    assert.equal(await input.getAttribute("aria-invalid"), "true");
    assert.equal(
      await page
        .getByRole("textbox", { name: "X coordinate", exact: true })
        .inputValue(),
      "4",
    );
    await input.press("Escape");
    assert.equal(await input.inputValue(), "4");
    // Reopen settings from the board, remove exact entry, and retain a usable slider.
    await page
      .locator('[data-board-component="controls/Slider"]')
      .last()
      .focus();
    await page
      .locator('[data-board-component="controls/Slider"]')
      .last()
      .getByRole("button", { name: /Edit/ })
      .click();
    dialog = page.getByRole("dialog");
    await dialog
      .getByRole("checkbox", { name: "Show exact number input" })
      .uncheck();
    await dialog
      .getByRole("button", { name: "Apply control settings", exact: true })
      .click();
    await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
    assert.equal(
      await page
        .getByRole("textbox", { name: "Horizontal input", exact: true })
        .count(),
      0,
    );
    const range = page.getByRole("slider", {
      name: "Horizontal input",
      exact: true,
    });
    assert.equal(await range.getAttribute("min"), "-5");
    assert.equal(await range.getAttribute("step"), "0.5");
    await range.focus();
    await range.press("ArrowLeft");
    assert.equal(
      await page
        .getByRole("textbox", { name: "X coordinate", exact: true })
        .inputValue(),
      "3.5",
    );
    await page.screenshot({ path: captures + "/configured-controls.png" });
    const saved = await page.evaluate(
      () =>
        JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document,
    );
    const slider = saved.authored.nodes.find((n) => n.id === "extra-slider");
    assert.equal(slider.configuration.parameter, "value.x");
    assert.equal(slider.configuration.showNumber, false);
    // Replace the widget in place and verify its identity in both builder views.
    await page
      .locator('[data-board-component="controls/Slider"]')
      .last()
      .focus();
    await page
      .locator('[data-board-component="controls/Slider"]')
      .last()
      .getByRole("button", { name: /Edit/ })
      .click();
    dialog = page.getByRole("dialog");
    assert.equal(
      await dialog.locator(".component-dialog-type").textContent(),
      "Control · Slider",
    );
    const typeSelector = dialog.getByRole("combobox", {
      name: "Control type",
      exact: true,
    });
    assert.equal(await typeSelector.inputValue(), "controls/Slider");
    assert.equal(
      await typeSelector
        .locator('option[value="controls/Toggle"]')
        .evaluate((option) => option.disabled),
      true,
    );
    await typeSelector.selectOption("controls/NumberInput");
    await dialog
      .getByRole("button", { name: "Change to Number input", exact: true })
      .click();
    assert.equal(
      await dialog.locator(".component-dialog-type").textContent(),
      "Control · Number input",
    );
    assert.equal(
      await dialog
        .getByRole("checkbox", { name: "Show exact number input" })
        .count(),
      0,
    );
    await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
    assert.equal(
      await page
        .getByRole("slider", { name: "Horizontal input", exact: true })
        .count(),
      0,
    );
    await page
      .getByRole("textbox", { name: "Horizontal input", exact: true })
      .fill("4");
    assert.equal(
      await page
        .getByRole("textbox", { name: "X coordinate", exact: true })
        .inputValue(),
      "3.5",
    );
    await page
      .getByRole("textbox", { name: "Horizontal input", exact: true })
      .press("Enter");
    assert.equal(
      await page
        .getByRole("textbox", { name: "X coordinate", exact: true })
        .inputValue(),
      "4",
    );
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    const connectionCard = page.locator('[data-node-id="extra-slider"]');
    await connectionCard
      .getByText("Control · Number input", { exact: true })
      .waitFor();
    await connectionCard
      .getByRole("button", { name: "Edit Horizontal input", exact: true })
      .click();
    dialog = page.getByRole("dialog");
    assert.equal(
      await dialog
        .getByRole("combobox", { name: "Control type", exact: true })
        .inputValue(),
      "controls/NumberInput",
    );
    await page.screenshot({ path: captures + "/control-type-settings.png" });
    await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await connectionCard
      .getByText("Control · Slider", { exact: true })
      .waitFor();
    await page.goto(url + "/experiments?experiment=ratio");
    await page
      .getByRole("textbox", { name: "Selected amount", exact: true })
      .fill("5");
    await page
      .getByRole("textbox", { name: "Selected amount", exact: true })
      .press("Enter");
    await page
      .locator(".recipe-measurement-value")
      .filter({ hasText: /125/ })
      .waitFor();
    // A control group keeps valid and invalid drafts local until the learner applies them.
    const groupPage = await browser.newPage({
      viewport: { width: 1440, height: 1000 },
    });
    groupPage.setDefaultTimeout(15000);
    groupPage.on("pageerror", (error) => errors.push(error.message));
    const arithmetic = premadeRecipe("arithmetic").document;
    const activity = arithmetic.nodes.find(
      (n) => n.definition === "controls/ArithmeticActivity",
    );
    activity.definition = "controls/Form";
    activity.configuration = {
      label: "Arithmetic form",
      mode: "submit",
      initial: '{"value":{"operation":"add","a":3,"b":2}}',
      fields: [
        { parameter: "value.a", label: "First number", widget: "NumberInput" },
        { parameter: "value.b", label: "Second number", widget: "NumberInput" },
      ],
    };
    const groupDocument = canonicalDocument(arithmetic);
    await groupPage.addInitScript(
      (document) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      groupDocument,
    );
    await groupPage.goto(url + "/experiments/builder");
    await groupPage.getByRole("button", { name: "Build", exact: true }).click();
    const form = groupPage.locator(".catalog-form--form");
    const first = form.getByRole("textbox", {
      name: "First number",
      exact: true,
    });
    await first.fill("5");
    await first.blur();
    await groupPage
      .getByRole("heading", { name: "Add 2 circles to 3", exact: true })
      .waitFor();
    await form.locator("button[type=submit]").click();
    await groupPage
      .getByRole("heading", { name: "Add 2 circles to 5", exact: true })
      .waitFor();
    await first.fill("999");
    await first.blur();
    assert.equal(await first.getAttribute("aria-invalid"), "true");
    assert.equal(await form.locator("button[type=submit]").isDisabled(), true);
    await form
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    assert.equal(await first.inputValue(), "5");
    assert.equal(await form.locator("button[type=submit]").isDisabled(), false);
    await groupPage
      .locator('[data-board-component="controls/Form"]')
      .getByRole("button", { name: /Edit/ })
      .click();
    const groupDialog = groupPage.getByRole("dialog");
    const fieldLabel = groupDialog.getByRole("textbox", {
      name: "value.a label",
      exact: true,
    });
    await fieldLabel.fill("");
    await fieldLabel.pressSequentially("Left operand");
    assert.equal(await fieldLabel.inputValue(), "Left operand");
    await groupDialog
      .getByRole("button", { name: "Apply control settings", exact: true })
      .click();
    await groupDialog
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    assert.equal(
      await form
        .getByRole("textbox", { name: "Left operand", exact: true })
        .inputValue(),
      "5",
    );
    await groupPage.screenshot({ path: captures + "/control-group.png" });
    await groupPage.close();
    assert.deepEqual(errors, []);
    console.log(
      "Control editor browser: visible unconfigured slider, explicit target selection, one label, dedicated bounds/step, live typing and sibling synchronization, invalid draft recovery, range-only display and persisted settings passed.",
    );
  } catch (error) {
    await page.screenshot({ path: captures + "/failure.png" });
    console.error((await page.locator("body").innerText()).slice(-5000));
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
