const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
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
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /Encountered two children|unique.*key|hydration|cannot be a descendant/i.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
  try {
    await page.goto(
      `${process.env.UX_TEST_URL || "http://127.0.0.1:43002"}/experiments/builder`,
    );
    assert.equal(
      await page
        .getByText("Open public catalog and Prebuilt workspace", {
          exact: true,
        })
        .count(),
      0,
    );
    await page.getByRole("button", { name: "Continue to layout →" }).click();
    await page.getByRole("button", { name: "Continue to canvas →" }).click();
    await page
      .getByRole("button", { name: "Cartesian plane", exact: false })
      .click();
    await page
      .getByRole("button", { name: "Open empty builder", exact: true })
      .click();
    await page.locator(".composition-graph").waitFor({ state: "visible" });
    assert.equal(await page.locator(".connection-node--view").count(), 1);
    // Existing geometry controls remain available through the original focused dialog.
    await page
      .getByRole("button", { name: "+ Add component", exact: true })
      .click();
    const primitiveLibrary = page.getByRole("dialog", {
      name: "Add a component",
      exact: true,
    });
    await primitiveLibrary.getByRole("searchbox").fill("Line");
    await primitiveLibrary
      .locator("article")
      .filter({ has: page.getByText("Line", { exact: true }) })
      .getByRole("button", { name: "Add component", exact: true })
      .click();
    assert.equal(
      await page.locator(".connection-node--view").count(),
      1,
      "line uses the initial canvas",
    );
    await page.getByRole("button", { name: "Edit Line", exact: true }).click();
    const lineSettings = page.getByRole("dialog", {
      name: "Line",
      exact: true,
    });
    await lineSettings
      .getByLabel("Name", { exact: true })
      .fill("Authored line");
    await page
      .getByRole("dialog", { name: "Authored line", exact: true })
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await page.getByRole("button", { name: "Undo", exact: true }).click(); // rename
    await page.getByRole("button", { name: "Undo", exact: true }).click(); // line + placement
    assert.equal(await page.locator(".connection-node--object").count(), 0);
    await page
      .getByRole("button", { name: "+ Add component", exact: true })
      .click();
    const library = page.getByRole("dialog", {
      name: "Add a component",
      exact: true,
    });
    await library.getByRole("searchbox").fill("Dilution Lab");
    const card = library
      .locator("article")
      .filter({ has: page.getByText("Dilution Lab", { exact: true }) });
    await page.screenshot({ path: "/tmp/unified-builder-library.png" });
    await card
      .getByRole("button", { name: "Add experiment", exact: true })
      .click();
    await library.waitFor({ state: "hidden" });
    assert.equal(await page.locator(".connection-node--composite").count(), 1);
    assert.equal(
      await page.locator(".connection-node--view").count(),
      1,
      "existing canvas retained",
    );
    await page.screenshot({ path: "/tmp/unified-builder-graph.png" });
    await page
      .getByRole("button", { name: "Edit Dilution Lab", exact: true })
      .click();
    const group = page.getByRole("dialog", {
      name: "Dilution Lab",
      exact: true,
    });
    await group.getByRole("button", { name: "Expand", exact: true }).click();
    await group.getByRole("button", { name: "Done", exact: true }).click();
    assert.ok((await page.locator(".connection-node").count()) > 8);
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.locator(".recipe-lesson").waitFor();
    await page.screenshot({ path: "/tmp/unified-builder-preview.png" });
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    await page.getByRole("button", { name: "Undo", exact: true }).click(); // expansion
    await page.getByRole("button", { name: "Undo", exact: true }).click(); // insertion
    assert.equal(await page.locator(".connection-node--composite").count(), 0);
    assert.equal(await page.locator(".connection-node--view").count(), 1);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    assert.equal(await page.locator(".connection-node--composite").count(), 1);
    // Two copies execute independently through the same Build preview.
    await page
      .getByRole("button", { name: "+ Add component", exact: true })
      .click();
    await library.getByRole("searchbox").fill("Dilution Lab");
    await card
      .getByRole("button", { name: "Add experiment", exact: true })
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const concentrations = page.locator(
      '.recipe-lesson section[aria-label="concentration g/L"] output',
    );
    assert.equal(await concentrations.count(), 2);
    const forms = page
      .locator(".recipe-lesson form")
      .filter({ has: page.locator('input[type="number"]') });
    // Keyboard focus reveals offscreen content on the spatial board.
    await forms
      .first()
      .getByRole("button", { name: "Apply", exact: true })
      .focus();
    await forms
      .first()
      .getByRole("button", { name: "Apply", exact: true })
      .click();
    assert.notEqual(
      await concentrations.nth(0).textContent(),
      await concentrations.nth(1).textContent(),
    );
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page
      .locator(".connection-node--composite .connection-node-heading")
      .click();
    await page
      .getByRole("button", { name: "Save as composite", exact: true })
      .click();
    const save = page.getByRole("dialog", {
      name: "Save selection as composite",
      exact: true,
    });
    await save.getByLabel("Name", { exact: true }).fill("My dilution");
    await save
      .getByRole("group", { name: "Exposed parameters", exact: true })
      .getByRole("checkbox")
      .first()
      .check();
    await save
      .getByRole("button", { name: "Save prebuilt", exact: true })
      .click();
    await save
      .getByRole("status")
      .filter({ hasText: "Saved My dilution" })
      .waitFor();
    await save.getByRole("button", { name: "Done", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    assert.equal(await page.locator(".connection-node--composite").count(), 1);
    await page
      .getByRole("button", { name: "+ Add component", exact: true })
      .click();
    await library.getByRole("button", { name: /Filters/ }).click();
    await library.getByLabel("Category").selectOption("saved");
    await library.getByText("My dilution", { exact: true }).waitFor();
    const savedCard = library
      .locator("article")
      .filter({ has: page.getByText("My dilution", { exact: true }) });
    await savedCard
      .getByRole("button", { name: "Details for My dilution" })
      .click();
    const savedDetails = library.getByRole("region", {
      name: "Details for My dilution",
    });
    await savedDetails.getByText("Customize exposed parameters").click();
    assert.equal(await savedDetails.locator("form").count(), 1);
    await savedDetails
      .getByRole("button", { name: "← Back to results" })
      .click();
    await library
      .getByRole("button", { name: "Import assembly", exact: true })
      .click();
    // Import validates and reviews the same catalog format before saving.
    const { load } = require("./test-loader.cjs");
    const recipe = load(
      "src/simulations/components/composites/catalog.ts",
    ).builtInRecipes.find((r) => r.title === "Dilution Lab");
    await library.locator('input[type="file"]').setInputFiles({
      name: "dilution.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(recipe)),
    });
    await library
      .getByRole("button", { name: "Save separate copy to library" })
      .click();
    await library
      .getByRole("region", { name: "Details for Dilution Lab (copy)" })
      .waitFor();

    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "/tmp/unified-builder-mobile.png" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth + 1,
      ),
    );
    assert.deepEqual(errors, []);
    console.log(
      "Unified manual builder: setup, initial canvas, catalog, editable composite graph, preview, atomic undo/redo, saved composite, recovery and mobile passed.",
    );
  } catch (e) {
    await page.screenshot({ path: "/tmp/unified-builder-failure.png" });
    console.error((await page.locator("body").innerText()).slice(-4500));
    throw e;
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
