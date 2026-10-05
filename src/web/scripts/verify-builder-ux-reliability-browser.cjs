const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { builtInRecipes } = load(
  "src/simulations/components/composites/catalog.ts",
);
const DRAFT = "apertus-builder-draft-v1";
async function main() {
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
    hasTouch: true,
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const draft = () =>
    page.evaluate(
      (key) => JSON.parse(localStorage.getItem(key)).document,
      DRAFT,
    );
  const screenshot = (name) =>
    page.screenshot({ path: `/tmp/builder-r1-r4-${name}.png` });
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
    const originalTitle = (await draft()).lesson.title;
    await page
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .fill("Smooth authoring check");
    await page
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .blur();
    assert.equal(
      (await draft()).authored.lesson.title,
      "Smooth authoring check",
    );
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal((await draft()).lesson.title, originalTitle);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    const more = page.locator(".composition-document-menu > summary");
    await more.click();
    await page.keyboard.press("Escape");
    assert.equal(
      await page
        .locator(".composition-document-menu")
        .evaluate((menu) => menu.open),
      false,
    );
    assert.equal(
      await more.evaluate((summary) => document.activeElement === summary),
      true,
    );
    const library = page.getByRole("dialog", {
      name: "Add a component",
      exact: true,
    });
    const openLibrary = () =>
      page
        .getByRole("button", { name: "+ Add component", exact: true })
        .click();
    await openLibrary();
    await screenshot("library-desktop");
    const sectionNames = await library
      .locator(".catalog-results > section")
      .evaluateAll((sections) =>
        sections.map((s) => s.getAttribute("data-section")),
      );
    assert.equal(sectionNames[0], "objects");
    assert.equal(sectionNames.at(-1), "experiments");
    await library.getByRole("searchbox").fill("line");
    const objectCard = library
      .locator("article")
      .filter({ has: page.getByText("Line", { exact: true }) });
    const activityCard = library
      .locator("article")
      .filter({ has: page.getByText("Line exploration", { exact: true }) });
    assert.equal(await objectCard.count(), 1);
    assert.equal(await activityCard.count(), 1);
    await objectCard
      .getByText("Object · 1 component", { exact: true })
      .waitFor();
    await activityCard.getByText("Experiment", { exact: true }).waitFor();
    await screenshot("line-search");
    await activityCard
      .getByRole("button", { name: "Details for Line exploration" })
      .scrollIntoViewIfNeeded();
    const resultsScroll = await library
      .locator(".catalog-results")
      .evaluate((results) => results.scrollTop);
    await activityCard
      .getByRole("button", { name: "Details for Line exploration" })
      .click();
    const details = library.getByRole("region", {
      name: "Details for Line exploration",
    });
    assert.equal(
      await details.locator("h3").evaluate((h) => document.activeElement === h),
      true,
    );
    await details
      .getByRole("heading", { name: "Included components (7)" })
      .waitFor();
    await screenshot("activity-details");
    await details.getByRole("button", { name: "← Back to results" }).click();
    assert.equal(
      await activityCard
        .getByRole("button", { name: "Details for Line exploration" })
        .evaluate((button) => button === document.activeElement),
      true,
    );
    assert.equal(await library.getByRole("searchbox").inputValue(), "line");
    assert.equal(
      await library
        .locator(".catalog-results")
        .evaluate((results) => results.scrollTop),
      resultsScroll,
    );
    await library.getByRole("searchbox").fill("no such component 198237");
    await library
      .getByRole("heading", { name: "No components found" })
      .waitFor();
    await library.getByRole("button", { name: "Reset filters" }).click();
    await library.getByRole("searchbox").fill("line");
    await objectCard
      .getByRole("button", { name: "Add component", exact: true })
      .click();
    assert.equal((await draft()).authored.nodes.length, 2);
    // Build fills the authoring workspace; runtime actions are disclosed beside
    // camera controls rather than occupying a permanent lesson footer.
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page
      .getByRole("region", { name: "Cartesian plane authoring controls" })
      .waitFor();
    await page.getByRole("button", { name: "Select Line" }).waitFor();
    assert.equal(await page.locator(".recipe-runtime-actions").count(), 0);
    const previewBox = await page.locator(".composition-preview").boundingBox();
    assert.equal(previewBox.width, page.viewportSize().width);
    await page.getByLabel("Board navigation help", { exact: true }).click();
    assert.ok(
      await page
        .getByRole("button", { name: "Reset experiment", exact: true })
        .isVisible(),
    );
    await page
      .getByLabel("Board navigation help", { exact: true })
      .press("Escape");
    await screenshot("build-authoring");
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    // Import keeps bad input recoverable, reviews valid metadata, and handles
    // duplicate identities explicitly before saving.
    await openLibrary();
    await library.getByRole("button", { name: "Import assembly" }).click();
    const importRegion = library.getByRole("region", {
      name: "Import assembly",
    });
    const invalidFile = path.join("/tmp", "apertus-invalid-recipe.json");
    const validFile = path.join("/tmp", "apertus-line-recipe.json");
    fs.writeFileSync(invalidFile, "{ invalid json");
    fs.writeFileSync(
      validFile,
      JSON.stringify(
        builtInRecipes.find((recipe) => recipe.title === "Line exploration"),
      ),
    );
    await importRegion
      .getByLabel("Assembly JSON file")
      .setInputFiles(invalidFile);
    await importRegion
      .getByRole("paragraph")
      .filter({ hasText: "This file isn't valid JSON." })
      .waitFor();
    assert.ok(
      await importRegion.getByLabel("Retained assembly JSON").inputValue(),
    );
    await importRegion
      .getByLabel("Assembly JSON file")
      .setInputFiles(validFile);
    await importRegion
      .getByText("This identity already exists in the library.", {
        exact: false,
      })
      .waitFor();
    await importRegion
      .getByRole("button", { name: "Save separate copy to library" })
      .click();
    await library
      .getByRole("region", { name: /Details for Line exploration \(copy\)/ })
      .waitFor();
    assert.equal(
      await page.evaluate(() =>
        JSON.parse(localStorage.getItem("apertus-composites-v1") || "[]").some(
          (recipe) => recipe.title === "Line exploration (copy)",
        ),
      ),
      true,
    );
    await screenshot("import-review-success");
    await library.getByRole("button", { name: "Close library" }).click();
    // Double-click and the always-visible pencil both open the same settings.
    const line = page.locator(".connection-node[data-node-id]").filter({
      has: page.getByRole("button", { name: "Edit Line", exact: true }),
    });
    const pencil = line.getByRole("button", { name: "Edit Line", exact: true });
    const pencilBox = await pencil.boundingBox();
    assert.equal(Math.round(pencilBox.width), Math.round(pencilBox.height));
    assert.ok(pencilBox.width >= 40);
    await line.locator(".connection-node-heading").dblclick();
    await page
      .getByRole("dialog", { name: "Line", exact: true })
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await pencil.tap();
    await page
      .getByRole("dialog", { name: "Line", exact: true })
      .getByRole("button", { name: "Done", exact: true })
      .tap();
    await pencil.focus();
    await page.keyboard.press("Enter");
    await page
      .getByRole("dialog", { name: "Line", exact: true })
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await openLibrary();
    await library.getByRole("searchbox").fill("Line exploration");
    await activityCard
      .getByRole("button", { name: "Add experiment", exact: true })
      .click();
    const groupNode = page.locator(".connection-node--composite");
    assert.equal(
      await groupNode.locator('[data-port-side="output"]').count(),
      3,
    );
    const groupId = await groupNode.getAttribute("data-node-id");
    const heading = groupNode.locator(".connection-node-heading");
    await heading.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(
      ([key, id]) =>
        !!JSON.parse(localStorage.getItem(key)).document.editor.positions[id],
      [DRAFT, groupId],
    );
    const moved = (await draft()).editor.positions[groupId];
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal((await draft()).editor.positions[groupId], undefined);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    assert.deepEqual((await draft()).editor.positions[groupId], moved);
    const headingBox = await heading.boundingBox();
    await page.mouse.move(headingBox.x + 70, headingBox.y + 45);
    await page.mouse.down();
    await page.mouse.move(headingBox.x + 110, headingBox.y + 70, { steps: 5 });
    await page.mouse.up();
    assert.notDeepEqual((await draft()).editor.positions[groupId], moved);
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.deepEqual((await draft()).editor.positions[groupId], moved);
    await page.getByRole("button", { name: "Arrange", exact: true }).click();
    const arranged = (await draft()).editor.positions[groupId];
    await screenshot("graph-desktop");
    // Projected appearance port wires to an external compatible plane without expansion.
    await groupNode
      .getByRole("button", {
        name: "Connect from Line exploration: Line appearance",
        exact: true,
      })
      .click();
    await page
      .locator(".connection-node--view")
      .getByRole("button", { name: /Connect to Cartesian plane: objects/ })
      .click();
    assert.ok(
      (await draft()).authored.connections.some(
        (c) =>
          c.from.node.endsWith("/model") &&
          c.to.node !== c.from.node.replace(/model$/, "canvas") &&
          c.to.port === "objects",
      ),
    );
    await groupNode
      .getByRole("button", { name: "Edit Line exploration", exact: true })
      .click();
    const settings = page.getByRole("dialog", {
      name: "Line exploration",
      exact: true,
    });
    await settings
      .getByText("Expose inputs and outputs", { exact: false })
      .click();
    const portChoices = settings.getByRole("group", {
      name: "Composite interface",
    });
    const intercept = portChoices.getByRole("checkbox", {
      name: /Line: intercept Output/,
    });
    await intercept.uncheck();
    await settings.getByRole("button", { name: "Expand", exact: true }).click();
    await settings.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(await groupNode.count(), 0);
    const expandedEdit = page.getByRole("button", {
      name: "Edit Line exploration",
      exact: true,
    });
    await expandedEdit.click();
    await settings
      .getByRole("button", { name: "Collapse", exact: true })
      .click();
    await settings.getByRole("button", { name: "Done", exact: true }).click();
    assert.equal(
      await groupNode.locator('[data-port-side="output"]').count(),
      2,
    );
    await page
      .getByRole("button", { name: "Save experiment", exact: true })
      .click();
    await page
      .getByRole("status")
      .filter({ hasText: "Saved on this device" })
      .first()
      .waitFor();
    await page.reload();
    await page
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    assert.deepEqual((await draft()).editor.positions[groupId], arranged);
    assert.equal(
      await groupNode.locator('[data-port-side="output"]').count(),
      2,
    );
    await heading.click();
    await page.getByRole("button", { name: "Copy", exact: true }).click();
    await page.getByRole("button", { name: "Paste", exact: true }).click();
    assert.equal(await groupNode.count(), 2);
    // Removing the original group leaves no position or interface references behind.
    await page
      .getByRole("button", { name: "Edit Line exploration", exact: true })
      .first()
      .click();
    await settings
      .getByRole("button", { name: "Ungroup", exact: true })
      .click();
    await page
      .locator("dialog[open]")
      .getByRole("button", { name: "Done", exact: true })
      .click();
    assert.equal((await draft()).editor.positions[groupId], undefined);
    const current = await draft();
    assert.deepEqual(current.editor, current.authored.editor);
    // Essential actions and catalog controls remain usable on a narrow touch viewport.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.equal(await page.locator(".composition-toolbar").count(), 1);
    await screenshot("graph-mobile");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await openLibrary();
    await library.getByRole("searchbox").fill("line");
    await screenshot("library-mobile");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await activityCard
      .getByRole("button", { name: "Details for Line exploration" })
      .click();
    await screenshot("details-mobile");
    assert.ok(
      await details
        .getByRole("button", { name: "Add experiment", exact: true })
        .isVisible(),
    );
    await library
      .getByRole("button", { name: "Close library", exact: true })
      .click();
    await page.setViewportSize({ width: 320, height: 700 });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await more.click();
    const menuBox = await page
      .locator(".composition-document-menu > div")
      .boundingBox();
    assert.ok(menuBox.x >= 0 && menuBox.x + menuBox.width <= 320);
    await page.keyboard.press("Escape");
    await openLibrary();
    await screenshot("library-320px");
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Builder R1–R9 browser: discovery, details, shared insertion behavior, import recovery/review/duplicates, Build authoring, component editing, wiring, history, group interfaces, persistence and responsive layouts passed.",
    );
  } catch (error) {
    await screenshot("failure");
    console.error((await page.locator("body").innerText()).slice(-2200));
    console.error(errors);
    console.error(
      await page.evaluate(() => ({
        width: innerWidth,
        scroll: document.documentElement.scrollWidth,
        offenders: [
          ...document.querySelectorAll(
            ".composition-toolbar *, .composition-tabs *",
          ),
        ]
          .filter((e) => e.getBoundingClientRect().right > innerWidth + 1)
          .map((e) => ({
            tag: e.tagName,
            className: e.className,
            text: e.textContent.slice(0, 80),
            right: e.getBoundingClientRect().right,
          })),
      })),
    );
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
