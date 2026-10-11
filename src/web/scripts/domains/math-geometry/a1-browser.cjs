// A1 developer browser evidence for MATH-01–10 premades (standalone Playwright; not peer acceptance).
// Usage: A1_URL=http://127.0.0.1:43121 A1_SLUGS=tree-height,cube-nets node scripts/domains/math-geometry/a1-browser.cjs
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const h = require("../../generation/helpers.cjs");
const { load } = require("../../test-loader.cjs");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");

const base = process.env.A1_URL || "http://127.0.0.1:43121";
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/028-validation/developer/A1/browser",
);
const press = (key, times) => ({ kind: "keys", key, times });
const click = (name) => ({ kind: "click", name });
const steps = {
  "decimal-place-value": [click("× 10")],
  pythagorean: [press("ArrowRight", 10)],
  "tree-height": [press("ArrowRight", 15)],
  "scale-floor-plan": [press("ArrowRight", 4)],
  "flip-turn-slide": [click("Flip across the mirror line")],
  "tile-patterns": [press("ArrowLeft", 1)],
  "cube-nets": [click("Try another shape"), click("Fold it")],
  "can-material": [press("ArrowRight", 18)],
  "box-packing": [click("Mix two directions")],
  "fencing-garden": [press("ArrowRight", 6)],
};
const slugs = (process.env.A1_SLUGS || Object.keys(steps).join(","))
  .split(",")
  .filter(Boolean);
const snapshot = (page) =>
  page.evaluate(
    () => window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.(),
  );
const modelState = (snap) => {
  const node = snap.recipe.document.nodes.find((n) =>
    n.definition.startsWith("prefabs/math-geometry/"),
  );
  assert.ok(node, "math-geometry model must be present");
  const state = snap.state?.state?.[node.id];
  assert.ok(state, "accepted model state must be present");
  return { id: node.id, state };
};

async function run(browser, slug, dir) {
  const record = { slug, started: new Date().toISOString(), captures: [] };
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  page.setDefaultTimeout(30000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  const capture = async (name) => {
    const file = `${slug}-${name}.png`;
    await page.screenshot({ path: path.join(dir, file), fullPage: false });
    record.captures.push(file);
  };
  try {
    await page.goto(`${base}/experiments?experiment=${slug}`);
    await page.waitForFunction(
      () =>
        !!(
          window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.()
        )?.recipe,
    );
    await page.waitForTimeout(400);
    await capture("01-opening");
    record.openingControls = await page
      .locator(
        '[data-board-scene="true"] ~ * button, main button, main input, main select',
      )
      .evaluateAll((nodes) =>
        nodes
          .filter((n) => {
            const r = n.getBoundingClientRect();
            return r.width && r.height && r.top < innerHeight && r.bottom > 0;
          })
          .map(
            (n) =>
              n.getAttribute("aria-label") ||
              n.textContent?.trim() ||
              n.tagName,
          ),
      );
    const before = modelState(await snapshot(page));
    for (const step of steps[slug]) {
      if (step.kind === "click")
        await page
          .getByRole("button", { name: step.name, exact: true })
          .click();
      else {
        const slider = page.getByRole("slider").first();
        await slider.focus();
        for (let i = 0; i < step.times; i++)
          await page.keyboard.press(step.key);
      }
    }
    await page.waitForTimeout(300);
    const after = modelState(await snapshot(page));
    assert.notDeepEqual(
      after.state,
      before.state,
      "primary action must change accepted state",
    );
    record.before = before.state;
    record.after = after.state;
    await capture("02-changed");
    const scene = await page
      .locator('[data-board-scene="true"] svg')
      .first()
      .boundingBox();
    assert.ok(
      scene && scene.width > 300 && scene.height > 150,
      "scene geometry",
    );
    record.sceneBox = scene;
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      await capture(`viewport-${viewport.width}x${viewport.height}`);
      record[`overflow${viewport.width}`] = await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      );
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.getByText("Experiment options", { exact: true }).click();
    const pendingDownload = page.waitForEvent("download");
    pendingDownload.catch(() => {});
    await page
      .getByRole("button", { name: "Save recipe", exact: true })
      .click();
    const exportedFile = path.join(dir, `${slug}-exported.json`);
    await (await pendingDownload).saveAs(exportedFile);
    const exported = loadRecipe(
      JSON.parse(fs.readFileSync(exportedFile, "utf8")),
    ).recipe;
    assert.deepEqual(exported, (await snapshot(page)).recipe);
    await page.keyboard.press("Escape");
    const previousSession = (await snapshot(page)).sessionId;
    await page
      .getByLabel("Open recipe file", { exact: true })
      .setInputFiles(exportedFile);
    await page.waitForFunction(
      ({ id, previousSession }) => {
        const current = window.__experimentSnapshot?.();
        return (
          current?.recipe?.id === id && current.sessionId !== previousSession
        );
      },
      { id: exported.id, previousSession },
    );
    const reopened = modelState(await snapshot(page));
    assert.deepEqual(
      reopened.state,
      before.state,
      "learner export preserves authored starting values",
    );
    await page.waitForURL(`${base}/`);
    await page.waitForFunction(
      () => !!document.querySelector(".recipe-lesson"),
    );
    record.reopenedGeometry = await h.geometry(page);
    await capture("03-reopened");
    await page.getByText("Experiment options", { exact: true }).click();
    await page
      .getByRole("link", { name: "Remix in builder", exact: true })
      .click();
    const button = (name) => page.getByRole("button", { name, exact: true });
    await button("Try lesson ↗").waitFor();
    await button("Build").click();
    await capture("04-builder");
    for (const step of steps[slug]) {
      if (step.kind === "click") await button(step.name).click();
      else {
        await page.getByRole("slider").first().focus();
        for (let i = 0; i < step.times; i++)
          await page.keyboard.press(step.key);
      }
    }
    assert.deepEqual(
      modelState(await snapshot(page)).state,
      after.state,
      "builder controls match the learner",
    );
    await page.getByLabel("Board navigation help", { exact: true }).click();
    await button("Use current settings as starting values").click();
    await page.getByLabel("Board navigation help", { exact: true }).click();
    await page
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .fill(`A1 ${slug} ${Date.now()}`);
    await button("Save experiment").click();
    await page
      .getByText("Saved on this device.", { exact: true })
      .first()
      .waitFor();
    await button("Try lesson ↗").click();
    await page.waitForFunction(() => !!window.__builderLessonSnapshot?.());
    const tried = modelState(await snapshot(page));
    assert.deepEqual(
      tried.state,
      after.state,
      "Try lesson shows the same accepted state",
    );
    await capture("05-try-lesson");
    await button("Return to builder").click();
    await page.reload();
    await button("Try lesson ↗").click();
    await page.waitForFunction(() => !!window.__builderLessonSnapshot?.());
    assert.deepEqual(
      modelState(await snapshot(page)).state,
      after.state,
      "saved builder starting values survive reload",
    );
    await capture("06-saved-reopened");
    record.status = "automated-checks-passed";
  } catch (error) {
    record.status = "failed";
    record.error = String(error.stack || error).slice(0, 2000);
    await capture("failure").catch(() => {});
  } finally {
    record.consoleErrors = errors.slice(0, 20);
    record.ended = new Date().toISOString();
    await context.close();
  }
  return record;
}

(async () => {
  const dir = path.join(root, new Date().toISOString().replace(/[:.]/g, "-"));
  fs.mkdirSync(dir, { recursive: true });
  const browser = await h.launch();
  const results = [];
  try {
    for (const slug of slugs) {
      const result = await run(browser, slug, dir);
      results.push(result);
      console.log(
        JSON.stringify({
          slug,
          status: result.status,
          error: result.error?.split("\n")[0],
        }),
      );
    }
  } finally {
    await browser.close();
  }
  fs.writeFileSync(
    path.join(dir, "manifest.json"),
    `${JSON.stringify(
      {
        method:
          "Standalone Playwright (Playwright MCP not used); developer evidence, not peer acceptance",
        base,
        reducedMotion: true,
        results,
      },
      null,
      2,
    )}\n`,
  );
  console.log(dir);
  if (results.some((r) => r.status !== "automated-checks-passed"))
    process.exitCode = 1;
})();
