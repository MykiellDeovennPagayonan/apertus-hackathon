const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { cases } = require("./cases.cjs");
const h = require("./helpers.cjs");
const runs = Number(process.env.GENERATION_RUNS || 5);
assert.ok(Number.isInteger(runs) && runs >= 1 && runs <= 10);
(async () => {
  for (let run = 1; run <= runs; run++)
    for (const c of cases)
      assert.equal(
        fs.existsSync(path.join(h.out, `run-${run}`, c.id)),
        false,
        "Live evidence already exists. Set GENERATION_EVIDENCE_DIR to a fresh directory to preserve every attempt and failure.",
      );
  const browser = await h.launch();
  const records = [];
  fs.mkdirSync(h.out, { recursive: true });
  try {
    for (let run = 1; run <= runs; run++)
      for (const c of cases) {
        const dir = path.join(h.out, `run-${run}`, c.id);
        fs.mkdirSync(dir, { recursive: true });
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const record = {
          run,
          case: c.id,
          prompt: c.prompt,
          evidence: "live-model",
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
          await page.goto(new URL("/", h.base).href);
          const pending = page.waitForResponse(
            (r) =>
              new URL(r.url()).origin === new URL(h.base).origin &&
              new URL(r.url()).pathname === "/api/apertus" &&
              r.request().method() === "POST" &&
              r.request().postDataJSON()?.prompt === c.prompt,
            { timeout: 125000 },
          );
          await page
            .getByRole("textbox", {
              name: "Describe an experiment…",
              exact: true,
            })
            .fill(c.prompt);
          await page
            .getByRole("button", { name: "Create", exact: true })
            .click();
          const response = await pending;
          const request = response.request().postDataJSON();
          const result = await response.json();
          record.request = request;
          record.result = result;
          record.httpStatus = response.status();
          record.requestId = response.headers()["x-request-id"];
          assert.equal(response.status(), 200);
          assert.equal(record.requestId, request.requestId);
          h.assertCanonicalResult(result, c, request);
          await h.assertOpeningState(page, result, c);
          await h.capture(page, dir, "opening");
          record.geometry = await h.geometry(page);
          await h.exerciseAndAssert(page, c, dir);
          await h.exportRecipe(page, dir);
          assert.ok(
            record.navigation.every(
              (url) => !new URL(url).pathname.includes("/builder"),
            ),
          );
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
              await context.tracing.stop({ path: path.join(dir, "trace.zip") });
            } finally {
              await context.close();
            }
          }
        }
        fs.writeFileSync(
          path.join(h.out, "summary.json"),
          JSON.stringify(records, null, 2),
        );
      }
  } finally {
    await browser.close();
    fs.writeFileSync(
      path.join(h.out, "summary.json"),
      JSON.stringify(records, null, 2),
    );
  }
  assert.equal(records.length, runs * cases.length);
  assert.ok(
    records.every((r) => r.status === "passed"),
    "Live failures retained in summary.json",
  );
  console.log(
    `${records.length} live home creation/interaction attempts passed. Evidence: ${h.out}`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
