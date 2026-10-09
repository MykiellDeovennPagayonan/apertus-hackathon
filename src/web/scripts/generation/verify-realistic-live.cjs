const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const h = require("./helpers.cjs");
const { cases } = require("./realistic-cases.cjs");
const { load } = require("../test-loader.cjs");
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { parseGenerationResult } = load("src/lib/planner/schema.ts");
const runs = Number(process.env.GENERATION_RUNS || 5);
assert.ok(Number.isInteger(runs) && runs >= 1 && runs <= 10);
const root = path.resolve(
  __dirname,
  "../../../../docs/agent-only/implementation/019-validation",
);
const out = process.env.GENERATION_EVIDENCE_DIR
  ? path.resolve(process.env.GENERATION_EVIDENCE_DIR)
  : path.join(root, new Date().toISOString().replace(/[:.]/g, "-"));
assert.ok(
  out.startsWith(root + path.sep),
  "Evidence must live under ignored 019-validation",
);
assert.ok(
  !fs.existsSync(out),
  "Use a fresh evidence directory to preserve failed attempts",
);
execFileSync("git", [
  "check-ignore",
  path.join(out, "opening.png"),
  path.join(out, "trace.zip"),
  path.join(out, "report.json"),
]);
const write = (dir, name, value) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2));
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await h.launch();
  const records = [];
  try {
    for (let run = 1; run <= runs; run++)
      for (const c of cases.filter(
        (c) =>
          !process.env.GENERATION_CASE || c.id === process.env.GENERATION_CASE,
      )) {
        const dir = path.join(out, `run-${run}`, c.id);
        fs.mkdirSync(dir, { recursive: true });
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
          deviceScaleFactor: 1,
        });
        const page = await context.newPage();
        // Observe the actual fetch body without replacing requests or responses.
        // Keeping a clone avoids losing streamed bodies after SPA navigation.
        await page.addInitScript(() => {
          const original = window.fetch;
          window.fetch = async (...args) => {
            const response = await original(...args);
            if (new URL(response.url).pathname === "/api/apertus") {
              const id = response.headers.get("X-Request-ID");
              response
                .clone()
                .text()
                .then((body) => {
                  window.__realisticWire = {
                    id,
                    body,
                    contentType: response.headers.get("Content-Type"),
                  };
                })
                .catch(() => {});
            }
            return response;
          };
        });
        const record = {
          case: c.id,
          run,
          prompt: c.prompt,
          evidence: "live-model",
          browserVersion: browser.version(),
          status: "running",
        };
        records.push(record);
        h.recordPage(page, record);
        await context.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true,
        });
        console.log(`Live ${run}/${runs}: ${c.id}`);
        try {
          await page.goto(new URL("/", h.base).href);
          // Wait for the shell's effect: SSR fields can accept typing before
          // React hydrates, then lose that text without sending a request.
          await page.waitForFunction(
            () => typeof window.__experimentSnapshot === "function",
          );
          await page
            .getByRole("textbox", {
              name: "Describe an experiment…",
              exact: true,
            })
            .fill(c.prompt);
          const pending = page.waitForResponse(
            (r) =>
              new URL(r.url()).pathname === "/api/apertus" &&
              r.request().method() === "POST" &&
              r.request().postDataJSON()?.prompt === c.prompt,
            { timeout: 300000 },
          );
          pending.catch(() => {});
          await page
            .getByRole("button", { name: "Create", exact: true })
            .click();
          const response = await pending;
          const request = response.request().postDataJSON();
          await page.waitForFunction(
            (id) => window.__realisticWire?.id === id,
            request.requestId,
            { timeout: 300000 },
          );
          const wire = await page.evaluate(() => window.__realisticWire);
          write(dir, "wire-response.json", wire);
          const result = wire.contentType?.includes("application/x-ndjson")
            ? wire.body
                .trim()
                .split("\n")
                .map(JSON.parse)
                .find(
                  (event) =>
                    event.type === "result" &&
                    event.requestId === request.requestId,
                )?.result
            : JSON.parse(wire.body);
          record.httpStatus = response.status();
          write(dir, "request.json", request);
          write(dir, "response.json", result);
          const traceResponse = await page.request.get(
            new URL(
              `/api/planner-diagnostics?id=${encodeURIComponent(request.requestId)}`,
              h.base,
            ).href,
          );
          const diagnostics = await traceResponse.json();
          write(dir, "diagnostics.json", diagnostics);
          assert.equal(response.status(), 200, JSON.stringify(result));
          parseGenerationResult(result, request);
          assert.equal(result.status, "created");
          assert.deepEqual(compositionIssues(result.recipe.document), []);
          assert.ok(
            result.recipe.document.nodes.some(
              (n) => n.definition === c.definition,
            ),
          );
          const trace = diagnostics.trace || diagnostics;
          assert.ok(
            trace.events?.some(
              (e) =>
                e.event === "composition.decision" &&
                e.data.status === "accepted" &&
                e.data.provider === "laya" &&
                /laya/i.test(e.data.model),
            ),
            "Missing real accepted Laya inference",
          );
          assert.ok(
            trace.events?.some(
              (e) =>
                /^turn_\d+\.inference$/.test(e.event) &&
                e.data.provider === "apertus" &&
                /apertus/i.test(e.data.model),
            ),
            "Missing real Apertus inference",
          );
          record.durationMs = trace.events.find(
            (e) => e.event === "result",
          )?.elapsedMs;
          record.apertusStages = trace.events
            .filter((e) => e.event.endsWith(".inference"))
            .map((e) => e.data);
          record.layaDecision = trace.events.find(
            (e) => e.event === "composition.decision",
          )?.data;
          record.repairs =
            trace.events.filter((e) => e.event === "budget").at(-1)?.data
              .repairs ?? 0;
          record.syntaxRepairs = trace.events.filter(
            (e) => e.event === "fixer.json_syntax",
          ).length;
          record.formatRepairs = trace.events.filter((e) =>
            e.event.startsWith("fixer."),
          ).length;
          record.firstPass = !record.repairs && !record.formatRepairs;
          loadRecipe(result.recipe);
          write(dir, "accepted-recipe.json", result.recipe);
          await require("./realistic-browser.cjs").verifyPage(
            page,
            result.recipe,
            c,
            dir,
          );
          assert.deepEqual(record.browserErrors, []);
          assert.deepEqual(record.consoleErrors, []);
          assert.deepEqual(record.networkFailures, []);
          record.status = "passed";
        } catch (error) {
          record.status = "failed";
          record.error = error.stack;
          console.error(record.error);
          await page
            .screenshot({ path: path.join(dir, "failure.png"), fullPage: true })
            .catch(() => {});
        } finally {
          await context.tracing.stop({ path: path.join(dir, "trace.zip") });
          await context.close();
          write(out, "report.json", records);
        }
      }
  } finally {
    await browser.close();
  }
  console.log(`Evidence: ${out}`);
  assert.ok(
    records.length && records.every((r) => r.status === "passed"),
    `${records.filter((r) => r.status === "failed").length} live attempts failed`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
