// Standalone Playwright fallback: MCP is unavailable in this session.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const h = require("../../generation/helpers.cjs");
const { load } = require("../../test-loader.cjs");
const { activities } = load("src/simulations/domains/biogeochemistry/index.ts");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43110";
const out = path.resolve(
  process.env.CYCLE_EVIDENCE_DIR ||
    path.join(
      __dirname,
      "../../../../../docs/agent-only/implementation/024-validation/browser",
    ),
);
fs.mkdirSync(out, { recursive: true });
async function state(page, model = "model") {
  await page.waitForFunction(
    (id) => window.__experimentSnapshot?.()?.state?.state?.[id],
    model,
  );
  return (await h.snapshot(page)).state.state[model];
}
async function geometry(page) {
  const g = await page.evaluate(() => {
    const rect = (e) => e.getBoundingClientRect().toJSON();
    const controls = [
      ...document.querySelectorAll(
        ".cycle-actions button,.cycle-activity > button",
      ),
    ].filter((e) => rect(e).height > 0);
    return {
      scene: rect(document.querySelector(".cycle-scene")),
      overflow: document.documentElement.scrollWidth - innerWidth,
      clipping: [...document.querySelectorAll(".board-content")]
        .filter((e) => e.scrollHeight > e.clientHeight + 3)
        .map((e) => ({ height: e.clientHeight, scroll: e.scrollHeight })),
      controls: controls.map((e) => {
        const r = rect(e),
          hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
        return {
          label: e.textContent,
          rect: r,
          reachable: e === hit || e.contains(hit),
        };
      }),
    };
  });
  assert.equal(g.overflow, 0, "Horizontal page overflow");
  assert.ok(
    g.scene.top >= 75,
    "Learning question moved behind workspace chrome",
  );
  assert.deepEqual(g.clipping, [], "Clipped content");
  assert.ok(g.controls.length <= 3, "Too many learner controls");
  for (const c of g.controls) {
    assert.ok(c.rect.height >= 43.5, "Small target");
    assert.ok(c.reachable, `Obscured action: ${c.label}`);
  }
  return g;
}
async function investigate(page, activity, variant = 0) {
  await page.locator(".cycle-activity > button").first().click();
  const d = page.locator(".cycle-dialog[open]");
  await d.getByLabel("Question", { exact: true }).selectOption(activity);
  if (await d.getByLabel("Scenario", { exact: true }).count())
    await d
      .getByLabel("Scenario", { exact: true })
      .selectOption(String(variant));
  await d
    .getByRole("button", { name: "Start investigation", exact: true })
    .click();
  await page.waitForFunction(
    (a) => document.querySelector(".cycle-scene")?.dataset.activity === a,
    activity,
  );
}
exports.state = state;
exports.geometry = geometry;
exports.investigate = investigate;
if (require.main === module)
  (async () => {
    const browser = await h.launch(),
      report = [];
    try {
      for (const kind of ["oxygen", "nitrogen", "carbon"]) {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            reducedMotion: "reduce",
          }),
          page = await context.newPage(),
          errors = [];
        page.on("pageerror", (e) => errors.push(e.message));
        const capture = (n) =>
          page.screenshot({ path: path.join(out, `${kind}-${n}.png`) });
        try {
          await page.goto(`${base}/experiments?experiment=${kind}-cycle`);
          await page.locator(".cycle-scene").waitFor();
          const layouts = [];
          for (const viewport of [
            { width: 1440, height: 900 },
            { width: 1280, height: 800 },
            { width: 1366, height: 768 },
            { width: 1920, height: 1080 },
          ]) {
            await page.setViewportSize(viewport);
            await page.waitForTimeout(180);
            layouts.push({ viewport, geometry: await geometry(page) });
            await capture(`opening-${viewport.width}x${viewport.height}`);
          }
          await page.setViewportSize({ width: 1440, height: 900 });
          await page.waitForTimeout(200);
          const opening = await state(page);
          await page.locator(".cycle-activity > button").first().press("Enter");
          await page
            .locator(".cycle-dialog[open]")
            .getByLabel("Question", { exact: true })
            .selectOption(activities[kind][1].id);
          await page.keyboard.press("Escape");
          assert.deepEqual(
            await state(page),
            opening,
            "Cancel mutated the experiment",
          );
          assert.ok(
            await page
              .locator(".cycle-activity > button")
              .first()
              .evaluate((e) => e === document.activeElement),
            "Focus not restored",
          );
          await page.locator(".cycle-primary").first().press("Enter");
          assert.ok((await state(page)).time > 0);
          await capture("changed");
          for (const activity of activities[kind])
            for (let v = 0; v < (activity.variants?.length || 1); v++) {
              await investigate(page, activity.id, v);
              assert.equal((await state(page)).time, 0);
              await page.locator(".cycle-primary").first().click();
              await geometry(page);
              await capture(`${activity.id}-${v}-changed`);
              if (kind === "carbon" && activity.id === "fuel") {
                const first = Number(
                  await page.locator("[data-fuel-fill]").getAttribute("width"),
                );
                await page.locator(".cycle-actions .cycle-primary").click();
                assert.ok(
                  Number(
                    await page
                      .locator("[data-fuel-fill]")
                      .getAttribute("width"),
                  ) < first,
                );
                assert.equal(
                  await page
                    .getByLabel("Carbon transferred from fuel to air", {
                      exact: true,
                    })
                    .count(),
                  2,
                );
                await capture("fuel-two-parcels");
              }
              if (kind === "carbon" && activity.id === "geology") {
                await page
                  .getByRole("button", {
                    name: "Return to biological time",
                    exact: true,
                  })
                  .click();
                assert.notEqual((await state(page)).activity, "geology");
              }
            }
          // Native save/reopen preserves the authored starting activity; exploratory progress resets.
          await page.locator(".gas-experiment-tools summary").click();
          const downloadPromise = page.waitForEvent("download");
          await page
            .getByRole("button", { name: "Save recipe", exact: true })
            .click();
          const download = await downloadPromise,
            file = path.join(out, `${kind}-saved.json`);
          await download.saveAs(file);
          await page
            .getByLabel("Open recipe file", { exact: true })
            .setInputFiles(file);
          await page.waitForURL((url) => !url.searchParams.has("experiment"));
          await page.locator(".cycle-scene").waitFor();
          if (
            !(await page
              .locator(".gas-experiment-tools")
              .evaluate((e) => e.open))
          )
            await page.locator(".gas-experiment-tools summary").click();
          await page
            .getByRole("link", { name: "Remix in builder", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Try lesson ↗", exact: true })
            .waitFor();
          await capture("builder");
          await page
            .getByRole("button", { name: "Try lesson ↗", exact: true })
            .click();
          await page.locator(".cycle-scene").waitFor();
          await page.locator(".cycle-primary").first().click();
          assert.equal(
            await page.locator(".builder-composer").count(),
            0,
            "Try lesson exposes editing prompts",
          );
          await geometry(page);
          await capture("try-lesson");
          assert.deepEqual(errors, []);
          report.push({
            kind,
            status: "passed",
            layouts,
            activities: activities[kind].length,
          });
          console.log(
            `${kind}: opening, four desktop sizes, activities, keyboard, cancel, save/reopen, remix and Try lesson passed`,
          );
        } catch (e) {
          report.push({ kind, status: "failed", error: e.stack, errors });
          await capture("failure").catch(() => {});
          console.error(kind, e.message);
        } finally {
          await context.close();
          fs.writeFileSync(
            path.join(out, "report.json"),
            JSON.stringify(
              {
                base,
                capture: "standalone Playwright; MCP unavailable",
                lessons: report,
              },
              null,
              2,
            ),
          );
        }
      }
    } finally {
      await browser.close();
    }
    assert.equal(report.filter((r) => r.status === "passed").length, 3);
  })().catch((e) => {
    console.error(e);
    process.exitCode = 1;
  });
