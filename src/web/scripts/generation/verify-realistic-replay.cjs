// Native import of accepted live recipes; UX replay is not a new inference attempt.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const h = require("./helpers.cjs");
const { cases } = require("./realistic-cases.cjs");
const { verifyPage } = require("./realistic-browser.cjs");
const { load } = require("../test-loader.cjs");
const { arrangeDocument } = load(
  "src/simulations/runtime/authoring/arrangement.ts",
);
const { publicDefinitions } = load(
  "src/simulations/components/catalog/index.ts",
);
const root = path.resolve(
  __dirname,
  "../../../../docs/agent-only/implementation/019-validation",
);
assert.ok(
  process.env.REALISTIC_REPLAY_DIR,
  "Set REALISTIC_REPLAY_DIR to a retained live run directory",
);
const source = path.resolve(process.env.REALISTIC_REPLAY_DIR);
assert.ok(source.startsWith(root + path.sep));
const out = path.join(
  root,
  `replay-${new Date().toISOString().replace(/[:.]/g, "-")}`,
);
execFileSync("git", ["check-ignore", path.join(out, "opening.png")]);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await h.launch();
  const records = [];
  try {
    for (const c of cases.filter(
      (c) =>
        !process.env.GENERATION_CASE || c.id === process.env.GENERATION_CASE,
    )) {
      const input = path.join(source, "run-1", c.id, "accepted-recipe.json");
      let recipe = JSON.parse(fs.readFileSync(input));
      const rearrange = process.env.REALISTIC_REPLAY_REARRANGE === "1";
      if (rearrange) {
        const ids = (category) =>
          recipe.document.nodes
            .filter(
              (node) =>
                publicDefinitions.get(node.definition).category === category,
            )
            .map((node) => node.id);
        const document = arrangeDocument(recipe.document, {
          template: "scene-with-sidebar",
          main: ids("appearance"),
          controls: ids("controls"),
          results: ids("displays"),
          narrowOrder: [],
          preserveLocked: true,
        });
        assert.deepEqual(document.nodes, recipe.document.nodes);
        assert.deepEqual(document.connections, recipe.document.connections);
        recipe = { ...recipe, document };
      }
      const diagnostics = JSON.parse(
        fs.readFileSync(path.join(path.dirname(input), "diagnostics.json")),
      );
      const events = (diagnostics.trace || diagnostics).events;
      assert.ok(
        events.some(
          (e) =>
            e.event === "composition.decision" &&
            e.data.provider === "laya" &&
            e.data.status === "accepted",
        ),
      );
      assert.ok(
        events.some(
          (e) =>
            /^turn_\d+\.inference$/.test(e.event) &&
            e.data.provider === "apertus",
        ),
      );
      for (const motion of ["reduce", "no-preference"]) {
        const dir = path.join(out, c.id, motion);
        fs.mkdirSync(dir, { recursive: true });
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: motion,
        });
        const page = await context.newPage();
        const record = {
          case: c.id,
          motion,
          source: input,
          evidence: rearrange
            ? "live-graph-layout-only-UX-replay"
            : "accepted-live-export-UX-replay",
          status: "running",
        };
        records.push(record);
        const replayInput = path.join(dir, "replay-recipe.json");
        fs.writeFileSync(replayInput, JSON.stringify(recipe, null, 2));
        h.recordPage(page, record);
        await context.tracing.start({
          screenshots: true,
          snapshots: true,
          sources: true,
        });
        console.log(`Replay: ${c.id}, ${motion}`);
        try {
          await page.goto(
            new URL("/experiments?experiment=arithmetic", h.base).href,
          );
          await page.locator(".recipe-lesson").waitFor();
          await page
            .locator('input[aria-label="Open recipe file"]')
            .setInputFiles(replayInput);
          await page.waitForURL(new URL("/", h.base).href);
          await h.poll(
            page,
            (s) => s.recipe?.id === recipe.id,
            "Native import failed",
          );
          await h.capture(page, dir, "motion-preference-opening");
          // Numerical comparisons use explicit stepping, independent of wall-clock speed.
          await page.emulateMedia({ reducedMotion: "reduce" });
          // The normal-motion opening may have advanced the clock. Restore the
          // saved starting state through the learner UI before comparing reloads.
          await page.getByText("Experiment options", { exact: true }).click();
          await page
            .getByRole("button", { name: "Reset lesson", exact: true })
            .click();
          await page.getByText("Experiment options", { exact: true }).click();
          await verifyPage(page, recipe, c, dir);
          assert.deepEqual(record.browserErrors, []);
          assert.deepEqual(record.consoleErrors, []);
          assert.deepEqual(record.networkFailures, []);
          record.status = "passed";
        } catch (error) {
          record.status = "failed";
          record.error = error.stack;
          console.error(record.error);
          await h.capture(page, dir, "failure").catch(() => {});
        } finally {
          await context.tracing.stop({ path: path.join(dir, "trace.zip") });
          await context.close();
          fs.writeFileSync(
            path.join(out, "report.json"),
            JSON.stringify(records, null, 2),
          );
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(`Evidence: ${out}`);
  assert.ok(
    records.length && records.every((r) => r.status === "passed"),
    "UX replay failed",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
