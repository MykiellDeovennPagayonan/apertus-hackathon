const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const manifest = require("./manifest.json");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43122";
const root = path.resolve(
  process.env.A2_EVIDENCE_DIR ||
    "../../docs/agent-only/implementation/028-validation/developer/A2/browser",
);
const snapshot = (page) =>
  page.evaluate(
    () => window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.(),
  );
const configuration = (s) =>
  s.recipe.document.nodes.find((n) =>
    n.definition.startsWith("prefabs/math-analysis/"),
  ).configuration;
(async () => {
  const browser = await h.launch();
  try {
    for (const c of manifest.filter(
      (c) => !process.env.A2_CASE || c.id === process.env.A2_CASE,
    )) {
      const dir = path.join(
        root,
        `${new Date().toISOString().replace(/[:.]/g, "-")}-${c.id}`,
      );
      fs.mkdirSync(dir, { recursive: true });
      const record = {
        scenario: c.id,
        started: new Date().toISOString(),
        sourceFingerprint: sourceFingerprint(),
        method: "Standalone Playwright fallback; browser MCP unavailable",
        captures: [],
        errors: [],
        status: "running",
      };
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(30000);
      page.on("pageerror", (error) => record.errors.push(String(error)));
      const capture = async (name) => {
        await page.evaluate(async () => {
          await document.fonts.ready;
          for (let frame = 0; frame < 3; frame++)
            await new Promise((resolve) => requestAnimationFrame(resolve));
        });
        await page.screenshot({ path: path.join(dir, name + ".png") });
        record.captures.push(name + ".png");
      };
      try {
        await page.goto(base + "/experiments?experiment=" + c.kind);
        await page.waitForFunction(
          (id) => window.__experimentSnapshot?.()?.recipe?.id === id,
          "prebuilt/" + c.kind,
        );
        await capture("01-opening");
        const before = await snapshot(page);
        fs.writeFileSync(
          path.join(dir, "opening.json"),
          JSON.stringify(before, null, 2),
        );
        if (process.env.A2_OPENING_ONLY === "true") {
          record.status = "opening captured";
          continue;
        }
        const controls = before.recipe.document.nodes.filter((n) =>
          n.definition.startsWith("controls/"),
        );
        const primary = controls[0];
        if (primary.definition === "controls/Slider") {
          await page.getByRole("slider").first().focus();
          await page.keyboard.press(c.id === "MATH-12" ? "End" : "ArrowRight");
        } else
          await page
            .getByRole("button", { name: primary.label, exact: true })
            .click();
        await page.waitForFunction(
          (old) =>
            JSON.stringify(
              window.__experimentSnapshot?.()?.state.state.model,
            ) !== old,
          JSON.stringify(before.state.state.model),
        );
        const after = await snapshot(page);
        await capture("02-changed");
        fs.writeFileSync(
          path.join(dir, "changed.json"),
          JSON.stringify(after, null, 2),
        );
        if (c.id === "MATH-12") {
          assert.equal(after.state.outputs.model.mean, 250);
          assert.equal(after.state.outputs.model.median, 130);
        }
        const exported = await h.exportRecipe(page, dir);
        await page
          .getByLabel("Open recipe file", { exact: true })
          .setInputFiles(path.join(dir, "exported-recipe.json"));
        await page.waitForFunction(
          (id) => window.__experimentSnapshot?.()?.recipe?.id === id,
          exported.id,
        );
        assert.deepEqual(
          configuration(await snapshot(page)),
          configuration({ recipe: exported }),
        );
        await capture("03-reopened");
        await page.getByText("Experiment options", { exact: true }).click();
        await page
          .getByRole("link", { name: "Remix in builder", exact: true })
          .click();
        const button = (name) =>
          page.getByRole("button", { name, exact: true });
        await button("Try lesson ↗").waitFor();
        await capture("04-builder");
        const model = exported.document.nodes.find(
          (n) => n.definition === `prefabs/math-analysis/${c.kind}`,
        );
        await page
          .getByRole("article", { name: /^Object:/ })
          .getByRole("button", { name: `Edit ${model.label}`, exact: true })
          .click();
        const dialog = page.getByRole("dialog");
        const edit = {
          "MATH-11": ["budget", "Budget", 120],
          "MATH-13": ["first", "First 1", 67],
          "MATH-14": ["probability", "Probability", 0.55],
          "MATH-15": ["predictionHours", "Prediction Hours", 4],
          "MATH-16": ["blueA", "Blue A", 7],
          "MATH-17": ["people", "People", 6],
          "MATH-18": ["annualPercent", "Annual Percent", 6],
          "MATH-19": ["time", "Time", 2],
          "MATH-20": ["capacity", "Capacity", 25],
        }[c.id];
        if (c.id === "MATH-12") {
          await dialog.getByLabel("Value", { exact: true }).first().fill("105");
          model.configuration.houses[0].value = 105;
        } else {
          await dialog
            .getByLabel(edit[1], { exact: true })
            .fill(String(edit[2]));
          if (c.id === "MATH-13") model.configuration.first[0] = edit[2];
          else model.configuration[edit[0]] = edit[2];
        }
        await dialog
          .getByRole("button", { name: "Apply changes", exact: true })
          .click();
        await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
        await capture("04b-builder-edited");
        await page
          .getByRole("textbox", { name: "Experiment title", exact: true })
          .fill(`A2 ${c.id} ${Date.now()}`);
        await button("Save experiment").click();
        await page
          .getByText("Saved on device", { exact: true })
          .first()
          .waitFor();
        await button("Try lesson ↗").click();
        await page.waitForFunction(() => !!window.__builderLessonSnapshot?.());
        assert.deepEqual(
          configuration(await snapshot(page)),
          configuration({ recipe: exported }),
        );
        await capture("05-try-lesson");
        await button("Return to builder").click();
        await page.reload();
        await button("Try lesson ↗").click();
        await page.waitForFunction(() => !!window.__builderLessonSnapshot?.());
        assert.deepEqual(
          configuration(await snapshot(page)),
          configuration({ recipe: exported }),
        );
        // The board measures its viewport after reload; capture the settled frame.
        await page.waitForTimeout(1000);
        await capture("06-saved-reopened");
        await page.setViewportSize({ width: 1280, height: 720 });
        await capture("07-short-desktop");
        await page.setViewportSize({ width: 390, height: 844 });
        await capture("08-narrow");
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          "horizontal overflow",
        );
        assert.deepEqual(record.errors, []);
        record.status = "automated checks passed";
        record.checks = [
          "primary keyboard/button interaction",
          "accepted values",
          "export/import",
          "independent model configuration edit through builder dialog",
          "builder save/reload",
          "Try lesson",
          "reduced motion",
          "narrow page overflow",
        ];
      } catch (error) {
        record.status = "failed";
        record.error = String(error.stack || error);
        await capture("failure").catch(() => {});
        process.exitCode = 1;
      } finally {
        record.ended = new Date().toISOString();
        fs.writeFileSync(
          path.join(dir, "manifest.json"),
          JSON.stringify(record, null, 2),
        );
        console.log(
          JSON.stringify({
            scenario: c.id,
            status: record.status,
            directory: dir,
            error: record.error,
          }),
        );
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
