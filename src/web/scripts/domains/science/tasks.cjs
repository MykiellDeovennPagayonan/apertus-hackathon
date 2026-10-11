const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { load } = require("../../test-loader.cjs");
const h = require("../../generation/helpers.cjs");
const learner = require("./learner.cjs");
const { scienceSpecs } = load("src/simulations/domains/science/index.ts");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43112",
  out = path.resolve(
    process.env.SCIENCE_TASK_EVIDENCE_DIR ||
      path.join(
        __dirname,
        "../../../../../docs/agent-only/implementation/023-validation/improvements-outcomes",
      ),
  );
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await h.launch(),
    report = [];
  try {
    for (const spec of scienceSpecs) {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(15000);
      const capture = (n) =>
        page.screenshot({ path: path.join(out, `${spec.slug}-${n}.png`) });
      const set = (k, v) => learner.set(page, spec, k, v);
      const steps = (n) => learner.steps(page, spec.kind, n);
      const state = () => learner.state(page);
      try {
        await page.goto(`${base}/experiments?experiment=${spec.slug}`);
        await page.locator(".science-scene").waitFor();
        if (spec.kind === "cell") {
          await set("error", 1);
          await learner.close(page);
          await steps(7);
          assert.match(
            await page.locator(".science-explanation").innerText(),
            /unequal/i,
          );
          await capture("unequal-daughters");
        }
        if (spec.kind === "immune") {
          await learner.begin(page, "immune");
          let first = 0;
          while ((await state()).immune.burden && first < 16) {
            await steps(1);
            first++;
          }
          assert.equal((await state()).immune.burden, 0);
          await page
            .getByRole("button", {
              name: "Try the same infection again",
              exact: true,
            })
            .click();
          let repeat = 0;
          while ((await state()).immune.burden && repeat < 16) {
            await steps(1);
            repeat++;
          }
          assert.ok(repeat < first);
          await capture("matched-memory");
          await set("antigen", 1);
          await learner.close(page);
          await page
            .getByRole("button", {
              name: "Try the same infection again",
              exact: true,
            })
            .click();
          let unmatched = 0;
          while ((await state()).immune.burden && unmatched < 16) {
            await steps(1);
            unmatched++;
          }
          assert.equal(unmatched, first);
          await capture("unmatched-antigen");
        }
        if (spec.kind === "genome") {
          await steps(2);
          const kids = (await state()).offspring;
          await set("parentA", 0);
          assert.deepEqual((await state()).offspring, kids);
          await set("mutation", 1);
          await learner.close(page);
          await steps(1);
          assert.equal((await state()).offspring[2].mutation, true);
          await set("zoom", 2);
          await learner.close(page);
          await capture("chromosome-provenance");
          await set("environment", 0);
          assert.equal((await state()).offspring[2].mutation, true);
          await capture("expression-condition");
        }
        if (spec.kind === "pollination") {
          await steps(8);
          const first = (await state()).pollen.transfers.reduce(
            (a, b) => a + b,
            0,
          );
          const d = await learner.open(page);
          await d
            .getByRole("button", {
              name: "Keep baseline and restart",
              exact: true,
            })
            .click();
          await set("overlap", 0);
          await d
            .getByRole("button", { name: "Run to baseline", exact: true })
            .click();
          assert.equal((await state()).time, 8);
          assert.ok(
            (await state()).pollen.transfers.reduce((a, b) => a + b, 0) < first,
          );
          assert.match(
            await d.locator(".science-comparison").innerText(),
            /Changed condition: Bloom overlap/,
          );
          await capture("bloom-comparison");
        }
        if (spec.kind === "invasive") {
          await page
            .getByRole("button", { name: "Inspect Patch 8", exact: true })
            .click();
          await learner.begin(page, "invasive");
          await steps(5);
          const d = await learner.open(page);
          await d
            .getByRole("button", {
              name: "Keep baseline and restart",
              exact: true,
            })
            .click();
          await set("barrier", 1);
          await d
            .getByRole("button", { name: "Run to baseline", exact: true })
            .click();
          assert.equal((await state()).invasive.origin, 7);
          assert.equal((await state()).time, 5);
          await learner.close(page);
          await page
            .getByRole("button", { name: "Inspect Patch 8", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Remove this plant", exact: true })
            .click();
          assert.equal((await state()).invasive.cover[7], 0);
          await learner.open(page);
          await page
            .getByRole("button", { name: "Restore native cover", exact: true })
            .click();
          assert.equal((await state()).invasive.native[7], 100);
          await capture("control-and-restoration");
        }
        if (spec.kind === "earth") {
          await set("classification", 1);
          await learner.close(page);
          await page
            .getByRole("button", { name: "Inspect Asthenosphere", exact: true })
            .last()
            .press("Enter");
          assert.match(
            await page.locator(".science-layer-note").innerText(),
            /solid rock/i,
          );
          const d = await learner.open(page);
          await d
            .getByRole("button", { name: "Advance mantle tracer", exact: true })
            .click();
          assert.equal((await state()).time, 1);
          await capture("mechanical-layers-and-tracer");
        }
        if (spec.kind === "plates") {
          for (let b = 0; b < 5; b++) {
            await set("boundary", b);
            await learner.close(page);
            assert.equal((await state()).time, 0);
            await steps(4);
            await capture(`boundary-${b}`);
          }
        }
        if (spec.kind === "volcano") {
          await steps(5);
          const d = await learner.open(page);
          await d
            .getByRole("button", {
              name: "Keep baseline and restart",
              exact: true,
            })
            .click();
          await set("preset", 1);
          await d
            .getByRole("button", { name: "Run to baseline", exact: true })
            .click();
          assert.equal((await state()).time, 5);
          assert.ok((await state()).volcano.ash > 0);
          assert.match(
            await d.locator(".science-comparison").innerText(),
            /Same seed and 5/,
          );
          await capture("eruption-comparison");
        }
        if (spec.kind === "water") {
          await set("paving", 0);
          await learner.close(page);
          await steps(8);
          const first = (await state()).water.runoff;
          const d = await learner.open(page);
          await d
            .getByRole("button", {
              name: "Keep baseline and restart",
              exact: true,
            })
            .click();
          const baseline = structuredClone((await state()).baseline);
          await set("paving", 90);
          await d
            .getByRole("button", { name: "Run to baseline", exact: true })
            .click();
          assert.equal((await state()).time, 8);
          assert.ok((await state()).water.runoff > first);
          assert.deepEqual((await state()).baseline, baseline);
          assert.match(
            await d.locator(".science-comparison").innerText(),
            /Changed condition: Paved surface/,
          );
          await capture("matched-paving-comparison");
          await d
            .getByLabel("Change one condition", { exact: true })
            .selectOption("rain");
          const input = d.getByLabel("Exact precipitation", { exact: true });
          const accepted = (await state()).settings.rain;
          await input.fill("-");
          await input.press("Tab");
          assert.equal((await state()).settings.rain, accepted);
          assert.ok(await d.getByRole("alert").count());
          await input.press("Escape");
          await learner.open(page);
          await set("rain", 20);
          assert.match(
            await page.locator(".science-comparison").innerText(),
            /does not isolate a single cause/,
          );
          await capture("multiple-condition-warning");
        }
        report.push({ slug: spec.slug, status: "passed" });
        console.log(
          `${spec.slug}: scientific outcome passed through learner controls`,
        );
      } catch (e) {
        report.push({ slug: spec.slug, status: "failed", error: e.message });
        console.error(spec.slug, e.message);
        await capture("failure").catch(() => {});
      } finally {
        await context.close();
        fs.writeFileSync(
          path.join(out, "report.json"),
          JSON.stringify(report, null, 2),
        );
      }
    }
    assert.equal(report.filter((r) => r.status === "passed").length, 9);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
