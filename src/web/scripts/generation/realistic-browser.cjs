const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const h = require("./helpers.cjs");
const { exercise } = require("./realistic-interactions.cjs");
const write = (dir, name, value) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2));

async function inspectLayout(page, dir, name) {
  const geometry = await h.geometry(page, false);
  write(dir, `${name}-geometry.json`, geometry);
  assert.equal(geometry.pageOverflow, false);
  for (const input of geometry.inputs)
    assert.notEqual(
      input.occluded,
      true,
      "A control is covered by another card or shell chrome",
    );
  for (const card of geometry.cards) {
    assert.ok(
      card.scrollWidth <= card.width + 2,
      `${card.id}: horizontal content overflow`,
    );
    assert.ok(
      card.scrollHeight <= card.height + 2,
      `${card.id}: vertical content overflow`,
    );
  }
  const visibleValues = await page.evaluate(() =>
    [
      ...document.querySelectorAll(
        ".board-item button, .board-item select, .board-item input, .board-item .recipe-measurement-value, .board-item .property-inspector__row dd",
      ),
    ]
      .filter((element) => element.getBoundingClientRect().width > 0)
      .map((element) => {
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(
          bounds.x + bounds.width / 2,
          bounds.y + bounds.height / 2,
        );
        return {
          text: element.textContent,
          visible: hit === element || element.contains(hit),
        };
      }),
  );
  write(dir, `${name}-visibility.json`, visibleValues);
  assert.ok(
    visibleValues.every((value) => value.visible),
    "An interaction or observation is covered by workspace chrome",
  );
  await h.capture(page, dir, name);
}

module.exports.verifyPage = async (page, recipe, c, dir) => {
  await h.poll(
    page,
    (s) => s.recipe?.id === recipe.id,
    "Generated lesson did not activate",
  );
  await inspectLayout(page, dir, "opening");
  const initialRuntimeState = (await h.snapshot(page)).state.state;
  write(dir, "initial-runtime-state.json", initialRuntimeState);
  const help = page.getByLabel("Board navigation help", { exact: true });
  await help.click();
  await page
    .getByText("About this lesson and its limits", { exact: true })
    .click();
  const details = await page.locator(".recipe-lesson-info").innerText();
  for (const assumption of recipe.assumptions)
    assert.ok(
      details.includes(assumption),
      "Model assumptions are not accessible to the learner",
    );
  await h.capture(page, dir, "assumptions");
  await help.click();
  await exercise(page, recipe, c, dir, h);
  await inspectLayout(page, dir, "changed");
  const inputs = page.locator(
    '.board-item input[inputmode="decimal"],.board-item input[inputmode="numeric"]',
  );
  for (let index = 0; index < (await inputs.count()); index++) {
    const input = inputs.nth(index);
    const accepted = await input.inputValue();
    const before = (await h.snapshot(page)).state;
    await input.focus();
    assert.ok(await input.evaluate((el) => document.activeElement === el));
    await input.fill("-");
    await input.press("Tab");
    assert.deepEqual(
      (await h.snapshot(page)).state,
      before,
      "An unfinished numeric edit changed accepted runtime state",
    );
    await inspectLayout(page, dir, `unfinished-input-${index + 1}`);
    await input.fill(accepted);
    await input.press("Tab");
  }
  write(dir, "runtime.json", await h.snapshot(page));
  await page.reload();
  await h.poll(
    page,
    (s) => s.recipe?.id === recipe.id,
    "Saved recipe did not restore",
  );
  assert.deepEqual((await h.snapshot(page)).recipe, recipe);
  assert.deepEqual(
    (await h.snapshot(page)).state.state,
    initialRuntimeState,
    "Exploration overwrote saved initial settings",
  );
  await h.exportRecipe(page, dir);
  for (const viewport of [
    { width: 1920, height: 1080 },
    { width: 1280, height: 720 },
  ]) {
    await page.setViewportSize(viewport);
    await inspectLayout(page, dir, `desktop-${viewport.width}`);
  }
  // Import into a fresh workspace: an existing saved ID must never be silently
  // overwritten merely because a file carries the same ID.
  const importedDir = path.join(dir, "import-replay");
  fs.mkdirSync(importedDir, { recursive: true });
  const browser = page.context().browser();
  assert.ok(browser);
  const importedContext = await browser.newContext({
    viewport: page.viewportSize(),
    reducedMotion: "reduce",
  });
  const importedPage = await importedContext.newPage();
  const importedRecord = { evidence: "native-export-import-replay" };
  h.recordPage(importedPage, importedRecord);
  await importedContext.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  try {
    await importedPage.goto(
      new URL("/experiments?experiment=arithmetic", h.base).href,
    );
    await importedPage.locator(".recipe-lesson").waitFor();
    await importedPage
      .locator('input[aria-label="Open recipe file"]')
      .setInputFiles(path.join(dir, "exported-recipe.json"));
    await importedPage.waitForURL(new URL("/", h.base).href);
    await h.poll(
      importedPage,
      (s) => s.recipe?.id === recipe.id,
      "Export did not import through the normal UI",
    );
    assert.deepEqual((await h.snapshot(importedPage)).recipe, recipe);
    await exercise(importedPage, recipe, c, importedDir, h);
    await inspectLayout(importedPage, importedDir, "imported-and-exercised");
    assert.deepEqual(importedRecord.browserErrors, []);
    assert.deepEqual(importedRecord.consoleErrors, []);
    assert.deepEqual(importedRecord.networkFailures, []);
  } finally {
    write(importedDir, "record.json", importedRecord);
    await importedContext.tracing.stop({
      path: path.join(importedDir, "trace.zip"),
    });
    await importedContext.close();
  }
};
