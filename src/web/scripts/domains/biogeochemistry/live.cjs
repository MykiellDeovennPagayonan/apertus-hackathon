// Real HTTP composition, followed by native recipe import. No response interception or mocks.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  { execFileSync } = require("node:child_process");
const { load } = require("../../test-loader.cjs"),
  h = require("../../generation/helpers.cjs"),
  { cases, paraphraseCases } = require("./cases.cjs");
const selectedCases =
  process.env.GENERATION_PROMPTS === "paraphrases" ? paraphraseCases : cases;
const { parseGenerationResult } = load("src/lib/planner/schema.ts"),
  { compositionIssues } = load("src/lib/planner/compositionQuality.ts"),
  { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43110",
  api = process.env.GENERATION_API_URL || base,
  runs = Number(process.env.GENERATION_RUNS || 3);
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/024-validation",
);
const out = path.resolve(
  process.env.GENERATION_EVIDENCE_DIR || path.join(root, `live-${Date.now()}`),
);
assert.ok(out.startsWith(root + path.sep));
assert.ok(!fs.existsSync(out), "Preserve previous batches");
assert.ok(Number.isInteger(runs) && runs >= 1 && runs <= 10);
execFileSync("git", ["check-ignore", path.join(out, "report.json")]);
fs.mkdirSync(out, { recursive: true });
const write = (dir, name, data) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(data, null, 2));
const {
  sourceFingerprint: digest,
} = require("../science/source-fingerprint.cjs");
const fingerprint = digest();
write(out, "manifest.json", {
  started: new Date().toISOString(),
  fingerprint,
  runs,
  promptSet: process.env.GENERATION_PROMPTS || "canonical",
  expectedAttempts:
    runs *
    selectedCases.filter(
      (c) =>
        !process.env.GENERATION_CASE || process.env.GENERATION_CASE === c.id,
    ).length,
  apiUrl: api,
  browserUrl: base,
  transport: "real HTTP /api/apertus, native recipe import",
  browserEvidence: "standalone Playwright; MCP unavailable",
  browserNumericTolerance: 1e-9,
});
(async () => {
  const browser = await h.launch(),
    records = [];
  try {
    for (let round = 1; round <= runs; round++)
      for (const c of selectedCases.filter(
        (c) =>
          !process.env.GENERATION_CASE || process.env.GENERATION_CASE === c.id,
      )) {
        const dir = path.join(out, `run-${round}`, c.id);
        fs.mkdirSync(dir, { recursive: true });
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            reducedMotion: "reduce",
          }),
          page = await context.newPage();
        page.setDefaultTimeout(60000);
        const request = {
          protocolVersion: 1,
          requestId: `cycles-${c.id}-${round}-${Date.now()}`,
          prompt: c.prompt,
          viewport: { width: 1440, height: 900 },
          active: null,
        };
        const record = {
          case: c.id,
          round,
          requestId: request.requestId,
          prompt: c.prompt,
          status: "running",
          evidence: "actual-apertus-and-laya",
          browserVersion: browser.version(),
        };
        records.push(record);
        write(dir, "request.json", request);
        await context.tracing.start({ screenshots: true, snapshots: true });
        console.log(`Live ${round}/${runs}: ${c.id}`);
        try {
          assert.equal(digest(), fingerprint, "Sources changed before attempt");
          const start = Date.now();
          const response = await page.request.post(`${api}/api/apertus`, {
            data: request,
            timeout: 300000,
          });
          const result = await response.json();
          write(dir, "response.json", result);
          record.httpStatus = response.status();
          record.durationMs = Date.now() - start;
          const diagnostic = await page.request.get(
            `${api}/api/planner-diagnostics?id=${encodeURIComponent(request.requestId)}`,
          );
          const diagnostics = await diagnostic.json();
          write(dir, "diagnostics.json", diagnostics);
          const events = (diagnostics.trace || diagnostics).events || [];
          record.laya = events.find(
            (e) => e.event === "composition.decision",
          )?.data;
          record.apertus = events
            .filter((e) => e.event.endsWith(".inference"))
            .map((e) => e.data);
          record.repairs = events
            .filter((e) => e.event.startsWith("fixer."))
            .map((e) => e.event);
          assert.equal(response.status(), 200, JSON.stringify(result));
          parseGenerationResult(result, request);
          assert.equal(result.status, "created", JSON.stringify(result));
          assert.deepEqual(compositionIssues(result.recipe.document), []);
          assert.ok(
            result.recipe.document.nodes.some(
              (n) => n.definition === c.definition,
            ),
          );
          loadRecipe(result.recipe);
          load("src/lib/projects/validation.ts").nameFields(
            result.recipe.title,
          );
          assert.ok(
            record.laya?.status === "accepted" &&
              record.laya.provider === "laya" &&
              /laya/i.test(record.laya.model),
            "Missing actual Laya selection",
          );
          assert.ok(
            events.some(
              (e) =>
                /^turn_\d+\.inference$/.test(e.event) &&
                e.data.provider === "apertus" &&
                /apertus/i.test(e.data.model),
            ),
            "Missing actual Apertus composition",
          );
          const input = path.join(dir, "accepted-recipe.json");
          write(dir, "accepted-recipe.json", result.recipe);
          await page.goto(`${base}/experiments?experiment=arithmetic`);
          await page.locator(".recipe-lesson").waitFor();
          await page
            .getByLabel("Open recipe file", { exact: true })
            .setInputFiles(input);
          await page.locator(`.cycle-scene[data-cycle="${c.kind}"]`).waitFor();
          await require("./live-browser.cjs").verifyPage(
            page,
            result.recipe,
            c,
            dir,
          );
          assert.equal(digest(), fingerprint, "Sources changed during batch");
          record.status = "passed";
          console.log(`${c.id} passed in ${record.durationMs}ms`);
        } catch (e) {
          record.status = "failed";
          record.error = e.stack;
          console.error(`${c.id}: ${e.message}`);
          await page
            .screenshot({ path: path.join(dir, "failure.png") })
            .catch(() => {});
        } finally {
          await context.tracing.stop({ path: path.join(dir, "trace.zip") });
          await context.close();
          write(out, "report.json", records);
        }
        assert.equal(
          digest(),
          fingerprint,
          "Sources changed during batch; stop and preserve this batch",
        );
      }
  } finally {
    await browser.close();
  }
  console.log(out);
  write(out, "completion.json", {
    completed: new Date().toISOString(),
    fingerprint,
    finalFingerprint: digest(),
    attempts: records.length,
    passed: records.filter((r) => r.status === "passed").length,
    failed: records.filter((r) => r.status === "failed").length,
  });
  assert.ok(
    records.length && records.every((r) => r.status === "passed"),
    `${records.filter((r) => r.status === "failed").length} live attempts failed`,
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
