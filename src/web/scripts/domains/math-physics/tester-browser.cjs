const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const { cases, configurations } = require("./tester-cases.cjs");
const { verifyRecipe } = require("./tester-verify.cjs");
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/028-validation/tester-runs",
);
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43115";
const snapshot = (page) =>
  page.evaluate(
    () => window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.(),
  );
const write = (run, name, value) =>
  fs.writeFileSync(
    path.join(run.dir, name),
    JSON.stringify(value, null, 2) + "\n",
  );
function allocate(c, kind) {
  const dir = path.join(
    root,
    `${new Date().toISOString().replace(/[:.]/g, "-")}-${c.id}-${kind}`,
  );
  fs.mkdirSync(dir, { recursive: true });
  const run = {
    dir,
    record: {
      scenario: c.id,
      kind,
      sourceFingerprint: sourceFingerprint(),
      started: new Date().toISOString(),
      status: "running",
      browserMethod:
        "Standalone Playwright fallback; Playwright MCP unavailable",
      task: c.task,
      captures: [],
      reviewedCaptures: [],
      correctness: "Not tested",
      usability: "Not tested",
      participantEvidence: "Not tested",
    },
  };
  write(run, "manifest.json", run.record);
  console.log(
    JSON.stringify({ event: "started", directory: dir, ...run.record }),
  );
  return run;
}
async function capture(page, run, name) {
  const file = name + ".png";
  await page.screenshot({ path: path.join(run.dir, file) });
  run.record.captures.push(file);
  write(run, "manifest.json", run.record);
  console.log(
    JSON.stringify({
      event: "capture",
      scenario: run.record.scenario,
      directory: run.dir,
      file,
      reviewed: false,
      at: new Date().toISOString(),
    }),
  );
}
function finish(run, error) {
  Object.assign(run.record, {
    ended: new Date().toISOString(),
    status: error ? "failed" : "automated-checks-passed",
    ...(error ? { error: String(error.stack || error) } : {}),
  });
  write(run, "manifest.json", run.record);
  console.log(
    JSON.stringify({ event: "finished", directory: run.dir, ...run.record }),
  );
}
async function opening(page, c, run) {
  await page.waitForFunction(
    () =>
      !!(window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.())
        ?.recipe,
  );
  await capture(page, run, "01-opening");
  const controls = await page
    .locator("button,input,select,textarea,a[href]")
    .evaluateAll((nodes) =>
      nodes
        .filter((n) => {
          const r = n.getBoundingClientRect();
          return (
            r.width &&
            r.height &&
            r.bottom > 0 &&
            r.top < innerHeight &&
            getComputedStyle(n).visibility !== "hidden"
          );
        })
        .map((n) => ({
          tag: n.tagName,
          role: n.getAttribute("role"),
          type: n.getAttribute("type"),
          label:
            n.getAttribute("aria-label") ||
            n.labels?.[0]?.textContent ||
            n.textContent,
          bounds: n.getBoundingClientRect().toJSON(),
        })),
    );
  write(run, "opening-controls.json", controls);
  write(run, "opening-review.json", {
    task: c.task,
    verdict: "Not tested",
    instruction:
      "Review 01-opening.png before model/formula inspection. Record task, primary action, competing actions, labels and hierarchy separately from automated checks.",
    visibleInteractiveCount: controls.length,
  });
}
async function exercise(page, c, run) {
  assert.equal(
    process.env.TESTER_OPENING_REVIEWED,
    c.id,
    "First review opening capture; supply reviewed scenario ID",
  );
  const before = await snapshot(page);
  verifyRecipe(before.recipe, c);
  write(run, "accepted-before.json", before);
  const slider = page.getByRole("slider").first();
  await slider.focus();
  await page.keyboard.press("ArrowRight");
  const after = await snapshot(page);
  assert.notDeepEqual(
    after.state,
    before.state,
    "Keyboard action must change accepted model state",
  );
  await capture(page, run, "02-keyboard-change");
  write(run, "accepted-after.json", after);
  const scene = page
    .locator('[data-board-scene="true"] svg,[data-board-scene="true"] canvas')
    .first();
  const bounds = await scene.boundingBox();
  assert.ok(
    bounds && bounds.width > 100 && bounds.height > 100,
    "Scene must have meaningful geometry",
  );
  for (const viewport of [
    { width: 1280, height: 720 },
    { width: 390, height: 844 },
  ]) {
    await page.setViewportSize(viewport);
    await capture(page, run, `viewport-${viewport.width}x${viewport.height}`);
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Page horizontal overflow",
    );
  }
  await page.setViewportSize({ width: 1440, height: 900 });
  const exported = await h.exportRecipe(page, run.dir);
  await page
    .getByLabel("Open recipe file", { exact: true })
    .setInputFiles(path.join(run.dir, "exported-recipe.json"));
  await page.waitForFunction(
    (id) => window.__experimentSnapshot?.()?.recipe?.id === id,
    exported.id,
  );
  assert.deepEqual(
    configurations((await snapshot(page)).recipe, c),
    configurations(exported, c),
  );
  await capture(page, run, "03-reopened");
  await page.getByText("Experiment options", { exact: true }).click();
  await page
    .getByRole("link", { name: "Remix in builder", exact: true })
    .click();
  const button = (name) => page.getByRole("button", { name, exact: true });
  await button("Try lesson ↗").waitFor();
  await capture(page, run, "04-builder");
  await button("Connections").click();
  const model = (await snapshot(page)).recipe.document.nodes.find(
    (n) => n.definition === c.definition,
  );
  await button("Edit " + model.label).click();
  const dialog = page.getByRole("dialog").last();
  await dialog
    .getByLabel("Label", { exact: true })
    .fill(model.label + " reviewed");
  await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
  await button("Undo").click();
  await button("Edit " + model.label).waitFor();
  await button("Redo").click();
  await button("Edit " + model.label + " reviewed").waitFor();
  await button("Save experiment").click();
  await page
    .getByText("Saved on device", { exact: true })
    .first()
    .waitFor();
  await button("Try lesson ↗").click();
  assert.deepEqual(
    configurations((await snapshot(page)).recipe, c),
    configurations(exported, c),
  );
  await capture(page, run, "05-try-lesson");
  await button("Return to builder").click();
  await page.reload();
  await button("Try lesson ↗").click();
  assert.deepEqual(
    configurations((await snapshot(page)).recipe, c),
    configurations(exported, c),
  );
  await capture(page, run, "06-saved-reopened");
  Object.assign(run.record, {
    keyboard: "ArrowRight changed accepted state",
    persistence: "recipe import, builder save/reload, Try lesson",
    motion: "reduced",
    accountPersistence: "Not tested",
    independentPhysicalEdit: "Not tested",
    scientificOutputs: "Not tested",
    sceneResize: "Not tested",
  });
}
if (require.main === module)
  (async () => {
    const c = cases.find((c) => c.id === process.env.TESTER_CASE);
    assert.ok(c, "Supply TESTER_CASE");
    const run = allocate(c, "browser");
    let browser, page;
    try {
      browser = await h.launch();
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      });
      page = await context.newPage();
      page.setDefaultTimeout(30000);
      h.recordPage(page, run.record);
      await page.goto(base + "/experiments?experiment=" + c.slug);
      await opening(page, c, run);
      if (process.env.TESTER_OPENING_ONLY !== "true")
        await exercise(page, c, run);
      finish(run);
    } catch (error) {
      if (page) await capture(page, run, "failure").catch(() => {});
      finish(run, error);
      process.exitCode = 1;
    } finally {
      if (browser) await browser.close();
    }
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = {
  base,
  snapshot,
  allocate,
  write,
  capture,
  finish,
  opening,
  exercise,
};
