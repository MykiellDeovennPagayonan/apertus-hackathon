const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { cases } = require("./cases.cjs");
const h = require("./helpers.cjs");
const profiles = [
  { name: "desktop", width: 1440, height: 900 },
  { name: "standard", width: 1280, height: 900 },
  { name: "short", width: 1024, height: 600 },
  { name: "phone", width: 390, height: 844 },
  { name: "narrow", width: 320, height: 568 },
].filter(
  (v) =>
    !process.env.GENERATION_UX_VIEWPORTS ||
    process.env.GENERATION_UX_VIEWPORTS.split(",").includes(v.name),
);
const accepted = path.resolve(process.env.GENERATION_ACCEPTED_DIR || h.out);
const allowFixtures = process.env.GENERATION_UX_ALLOW_FIXTURES === "1";
const selectedCases = cases.filter(
  (c) =>
    !process.env.GENERATION_UX_CASES ||
    process.env.GENERATION_UX_CASES.split(",").includes(c.id),
);
function input(c) {
  const file = path.join(
    accepted,
    allowFixtures ? "fixtures" : "run-1",
    c.id,
    "exported-recipe.json",
  );
  assert.ok(
    fs.existsSync(file),
    `Missing accepted export ${file}. Run test:generation:live first, or explicitly label a deterministic replay with GENERATION_UX_ALLOW_FIXTURES=1.`,
  );
  return file;
}
assert.ok(selectedCases.length, "GENERATION_UX_CASES selected no cases");
const inputs = new Map(selectedCases.map((c) => [c.id, input(c)]));

async function authoringGeometry(item) {
  return item.evaluate((element) => {
    const style = element.style;
    return {
      id: element.dataset.boardId,
      left: style.left,
      top: style.top,
      width: style.width,
      height: style.height,
    };
  });
}

async function editBoardItem(page, item) {
  const before = await authoringGeometry(item);
  const move = item.locator('.board-item-tools button[aria-label^="Move "]');
  await move.evaluate((button) => button.click());
  await move.dispatchEvent("keydown", {
    key: "ArrowRight",
    code: "ArrowRight",
    shiftKey: true,
    bubbles: true,
  });
  await page.waitForTimeout(50);
  const moved = await authoringGeometry(item);
  assert.notEqual(
    moved.left,
    before.left,
    `${before.id} did not move independently`,
  );

  await page
    .getByRole("button", { name: "Board settings", exact: true })
    .click();
  const placement = page.locator("details.board-placement-menu");
  if ((await placement.getAttribute("open")) === null)
    await placement.locator('summary[aria-label="Position and size"]').click();
  const form = page.locator(".board-geometry").filter({
    has: page.locator("strong", {
      hasText: await item.getAttribute("aria-label"),
    }),
  });
  const width = form.locator('input[name="width"]');
  await width.fill(String(Number(await width.inputValue()) + 16));
  await form.getByRole("button", { name: "Apply placement" }).click();
  await page.waitForTimeout(50);
  const resized = await authoringGeometry(item);
  assert.notEqual(resized.width, moved.width, `${before.id} did not resize`);
  await page.getByRole("button", { name: "Close board settings" }).click();
  return { before, moved, resized };
}

async function exerciseRemix(page, c, source, dir) {
  await page.getByText("Experiment options", { exact: true }).click();
  await page
    .getByRole("link", { name: "Remix in builder", exact: true })
    .click();
  await page.waitForURL("**/experiments/builder?remix=1");
  await page.getByRole("button", { name: "Build", exact: true }).click();
  const authored = page.locator('.board-item[data-board-authoring="true"]');
  await authored.first().waitFor();
  const scene = page
    .locator(
      '.board-item[data-board-authoring="true"][data-board-scene="true"]',
    )
    .first();
  const control = page
    .locator(
      '.board-item[data-board-authoring="true"][data-board-component^="controls/"]',
    )
    .first();
  const readout = page
    .locator(
      '.board-item[data-board-authoring="true"][data-board-component^="displays/"]',
    )
    .first();
  for (const target of [scene, control, readout])
    assert.ok(await target.count());
  const ids = await Promise.all(
    [scene, control, readout].map((target) =>
      target.getAttribute("data-board-id"),
    ),
  );
  assert.equal(
    new Set(ids).size,
    3,
    "Scene, control and readout must be independent items",
  );
  const boardEdits = [];
  for (const target of [scene, control, readout])
    boardEdits.push(await editBoardItem(page, target));
  fs.writeFileSync(
    path.join(dir, "remix-board-edits.json"),
    JSON.stringify(boardEdits, null, 2),
  );
  await h.capture(page, dir, "remix-edited");

  await page.getByRole("button", { name: "Connections", exact: true }).click();
  const authoring = {
    arithmetic: {
      component: "A · Arithmetic",
      field: "First value",
      value: "9",
    },
    rectangles: {
      component: "A · Area & perimeter",
      field: "Width",
      value: "7",
    },
    bridge: {
      component: "A · Bridge load",
      field: "Position",
      value: "0.25",
    },
  }[c.id];
  await page
    .getByRole("button", { name: `Edit ${authoring.component}`, exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: authoring.component,
    exact: true,
  });
  const field = dialog.getByRole("textbox", {
    name: authoring.field,
    exact: true,
  });
  await field.fill(authoring.value);
  await dialog.getByRole("button", { name: "Apply changes" }).click();
  await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
  await page
    .getByRole("button", { name: "Save experiment", exact: true })
    .click();
  await page
    .locator(".composition-save-state")
    .filter({ hasText: /Saved/i })
    .waitFor();
  await page.reload();
  await page
    .getByRole("button", { name: `Edit ${authoring.component}`, exact: true })
    .click();
  const reopened = page.getByRole("dialog", {
    name: authoring.component,
    exact: true,
  });
  assert.equal(
    await reopened
      .getByRole("textbox", { name: authoring.field, exact: true })
      .inputValue(),
    authoring.value,
    "Authored starting value did not survive builder reload",
  );
  await reopened.getByRole("button", { name: "Close settings", exact: true }).click();
  await h.capture(page, dir, "remix-reloaded");
  await page.getByRole("button", { name: "Try lesson ↗", exact: true }).click();
  await page.locator(".board-item").first().waitFor();
  await h.capture(page, dir, "try-lesson");
  await h.geometry(page);
  assert.ok(
    await page.locator('[data-board-scene="true"] svg[viewBox]').count(),
    "Try lesson has no scene",
  );
  const visibleValues = await page
    .locator(
      '.board-item input[inputmode="decimal"], .board-item input[inputmode="numeric"]',
    )
    .evaluateAll((elements) => elements.map((element) => element.value));
  assert.ok(
    visibleValues.includes(authoring.value),
    `Try lesson lost authored starting value ${authoring.value}: ${visibleValues}`,
  );
  assert.equal(source.document.connections.length > 0, true);
}
(async () => {
  if (!allowFixtures)
    assert.equal(
      fs.existsSync(path.join(h.out, "ux")),
      false,
      "UX evidence already exists. Use a fresh GENERATION_EVIDENCE_DIR and point GENERATION_ACCEPTED_DIR to the retained live exports.",
    );
  const browser = await h.launch();
  const records = [];
  try {
    for (const v of profiles)
      for (const c of selectedCases)
        for (const motion of c.id === "arithmetic"
          ? ["reduce", "no-preference"]
          : ["reduce"]) {
          const dir = path.join(h.out, "ux", c.id, v.name, motion);
          fs.mkdirSync(dir, { recursive: true });
          const context = await browser.newContext({
            viewport: { width: v.width, height: v.height },
            hasTouch: v.width < 700,
            reducedMotion: motion,
          });
          const page = await context.newPage();
          const record = {
            case: c.id,
            viewport: v,
            motion,
            evidence: allowFixtures
              ? "deterministic-UX-replay"
              : "accepted-live-recipe-UX-replay",
            status: "running",
            visualReview: "pending",
          };
          records.push(record);
          h.recordPage(page, record);
          await context.tracing.start({
            screenshots: true,
            snapshots: true,
            sources: true,
          });
          try {
            await page.goto(
              new URL("/experiments?experiment=arithmetic", h.base).href,
            );
            await page.locator(".recipe-lesson").waitFor();
            await page
              .locator('input[aria-label="Open recipe file"]')
              .setInputFiles(inputs.get(c.id));
            await page.waitForURL(new URL("/", h.base).href);
            const source = JSON.parse(fs.readFileSync(inputs.get(c.id)));
            await h.poll(
              page,
              (s) => s.recipe?.id === source.id,
              "Normal recipe import failed",
            );
            assert.deepEqual((await h.snapshot(page)).recipe, source);
            await h.assertOpeningState(page, { requestId: null }, c);
            record.geometry = await h.geometry(page);
            if (c.id === "rectangles" && v.width >= 1280) {
              const navigation = await page
                .locator(".board-camera-tools")
                .boundingBox();
              const results = await page
                .locator('[data-board-component="displays/Readout"]')
                .evaluateAll((elements) =>
                  elements.map(
                    (element) => element.getBoundingClientRect().bottom,
                  ),
                );
              assert.equal(results.length, 4);
              assert.ok(
                results.every((bottom) => bottom <= navigation.y - 8),
                "Both rectangles' area and perimeter must fit in the normal opening view",
              );
            }
            await h.capture(page, dir, "opening");
            await h.exerciseAndAssert(page, c, dir);
            await h.exportRecipe(page, dir);
            await page.reload();
            await h.poll(
              page,
              (s) => s.recipe?.id === source.id,
              "Reload lost accepted lesson",
            );
            await page.locator(".board-item").first().waitFor();
            await h.assertOpeningState(page, { requestId: null }, c);
            assert.deepEqual((await h.snapshot(page)).recipe, source);
            await h.capture(page, dir, "reload");
            if (v.name === "desktop" && motion === "reduce") {
              await exerciseRemix(page, c, source, dir);
            }
            assert.deepEqual(record.browserErrors, []);
            assert.deepEqual(record.consoleErrors, []);
            assert.deepEqual(record.networkFailures, []);
            record.status = "passed";
          } catch (error) {
            record.status = "failed";
            record.error = String(error.stack || error);
            await h.capture(page, dir, "failure").catch(() => {});
          } finally {
            try {
              await h.saveEvidence(page, record, dir);
            } catch (error) {
              record.status = "failed";
              record.evidenceError = String(error);
            } finally {
              try {
                await context.tracing.stop({
                  path: path.join(dir, "trace.zip"),
                });
              } finally {
                await context.close();
              }
            }
          }
        }
    for (const v of profiles)
      for (const slug of ["gas", "arithmetic"]) {
        const context = await browser.newContext({
          viewport: { width: v.width, height: v.height },
          hasTouch: v.width < 700,
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const dir = path.join(h.out, "ux", "baselines", slug, v.name);
        try {
          await page.goto(
            new URL(`/experiments?experiment=${slug}`, h.base).href,
          );
          await page.locator(".board-item").first().waitFor();
          await h.capture(page, dir, "opening");
          fs.writeFileSync(
            path.join(dir, "geometry.json"),
            JSON.stringify(
              await h.geometry(
                page,
                true,
                // The protected gas illustration has a smaller authored aspect
                // and size than generated full scene cards. Keep that baseline.
                slug === "gas" ? { width: 120, height: 60 } : undefined,
              ),
              null,
              2,
            ),
          );
        } finally {
          await context.close();
        }
      }
  } finally {
    await browser.close();
    fs.mkdirSync(h.out, { recursive: true });
    fs.writeFileSync(
      path.join(h.out, "ux-summary.json"),
      JSON.stringify(records, null, 2),
    );
  }
  assert.ok(records.length);
  assert.ok(
    records.every((r) => r.status === "passed"),
    "Inspect retained UX failures",
  );
  console.log(
    `UX automated checks passed for ${records.length} replay scenarios. Inspect captures and record visual review before Phase 5 signoff. ${h.out}`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
