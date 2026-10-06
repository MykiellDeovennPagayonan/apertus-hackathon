// Deterministic browser integration only. This is not live inference or Phase 4 acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { cases } = require("./cases.cjs");
const h = require("./helpers.cjs");
(async () => {
  const browser = await h.launch();
  const records = [];
  try {
    for (const c of cases) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
      });
      const page = await context.newPage();
      const dir = path.join(h.out, "fixtures", c.id);
      const record = {
        case: c.id,
        evidence: "deterministic-browser-fixture",
        status: "running",
      };
      records.push(record);
      h.recordPage(page, record);
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
      try {
        let accepted;
        await page.route("**/api/apertus", async (route) => {
          const request = route.request().postDataJSON();
          accepted = h.fixtureResult(c, request);
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            headers: {
              "x-request-id": request.requestId,
              "cache-control": "no-store",
            },
            body: JSON.stringify(accepted),
          });
        });
        await page.goto(new URL("/", h.base).href);
        await page
          .getByRole("textbox", {
            name: "Describe an experiment…",
            exact: true,
          })
          .fill(c.prompt);
        await page.getByRole("button", { name: "Create", exact: true }).click();
        await h.poll(
          page,
          (s) => !!accepted && s.requestId === accepted.requestId,
          "Fixture activation failed",
        );
        await h.assertOpeningState(page, accepted, c);
        await h.capture(page, dir, "opening");
        await h.exerciseAndAssert(page, c, dir);
        await h.exportRecipe(page, dir);
        await page.reload();
        await h.poll(page, (s) => !!s.recipe, "Saved recipe failed to reopen");
        assert.deepEqual((await h.snapshot(page)).recipe, accepted.recipe);
        assert.deepEqual(record.browserErrors, []);
        assert.deepEqual(record.consoleErrors, []);
        assert.deepEqual(record.networkFailures, []);
        assert.ok(
          record.navigation.every(
            (url) => !new URL(url).pathname.includes("/builder"),
          ),
        );
        record.status = "passed";
      } catch (error) {
        record.status = "failed";
        record.error = String(error.stack || error);
        await h.capture(page, dir, "failure").catch(() => {});
      } finally {
        try {
          await h.saveEvidence(page, record, dir);
        } finally {
          try {
            await context.tracing.stop({ path: path.join(dir, "trace.zip") });
          } finally {
            await context.close();
          }
        }
      }
    }
    await require("./lifecycle-browser.cjs")(browser, records);
  } finally {
    await browser.close();
    fs.mkdirSync(h.out, { recursive: true });
    fs.writeFileSync(
      path.join(h.out, "fixture-summary.json"),
      JSON.stringify(records, null, 2),
    );
  }
  assert.ok(
    records.every((r) => r.status === "passed"),
    "Inspect fixture-summary.json",
  );
  console.log(
    "Deterministic home activation, real controls, numeric oracles, export and reload passed. No live-model claim.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
