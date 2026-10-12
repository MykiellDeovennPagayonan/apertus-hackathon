const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const { load } = require("../../test-loader.cjs");
const h = require("../../generation/helpers.cjs");
const learner = require("./learner.cjs");
const { scienceSpecs } = load("src/simulations/domains/science/index.ts");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43112";
const out = path.resolve(
  process.env.SCIENCE_EVIDENCE_DIR ||
    path.join(
      __dirname,
      "../../../../../docs/agent-only/implementation/023-validation/improvements-browser",
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
        page = await context.newPage(),
        errors = [];
      page.setDefaultTimeout(15000);
      page.on("pageerror", (e) => errors.push(e.message));
      const capture = (n) =>
        page.screenshot({ path: path.join(out, `${spec.slug}-${n}.png`) });
      try {
        await page.goto(`${base}/experiments?experiment=${spec.slug}`);
        await page.locator(".science-scene").waitFor();
        assert.equal(
          await page.locator(".science-question").innerText(),
          spec.question,
        );
        const layouts = [];
        for (const viewport of [
          { width: 1440, height: 900 },
          { width: 1280, height: 800 },
          { width: 1366, height: 768 },
          { width: 1920, height: 1080 },
        ]) {
          await page.setViewportSize(viewport);
          await page.waitForTimeout(200);
          const g = await page.evaluate(() => {
            const rect = (e) => e.getBoundingClientRect().toJSON();
            const controls = [
              ...document.querySelectorAll(
                ".science-panel button,.science-panel select,.science-panel input",
              ),
            ].filter((e) => rect(e).height > 0);
            return {
              scene: rect(document.querySelector(".science-scene")),
              overflow: document.documentElement.scrollWidth - innerWidth,
              clipping: [...document.querySelectorAll(".board-content")]
                .filter((e) => e.scrollHeight > e.clientHeight + 3)
                .map((e) => ({
                  height: e.clientHeight,
                  scroll: e.scrollHeight,
                })),
              controls: controls.map((e) => {
                const r = rect(e),
                  hit = document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  );
                return {
                  name: e.textContent,
                  rect: r,
                  reachable: e === hit || e.contains(hit),
                };
              }),
            };
          });
          assert.equal(g.overflow, 0);
          assert.deepEqual(g.clipping, []);
          assert.ok(g.scene.width >= 500 && g.scene.height >= 280);
          assert.ok(
            g.controls.length <= 3,
            "Opening has more than three competing controls",
          );
          for (const c of g.controls) {
            assert.ok(c.rect.height >= 43.5, "Small target");
            assert.ok(c.reachable, "Obscured control");
          }
          layouts.push({ viewport, geometry: g });
          await capture(`opening-${viewport.width}x${viewport.height}`);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        if (spec.kind === "cell") {
          await page
            .getByRole("switch", { name: "Separation error" })
            .waitFor();
          assert.ok(
            await page
              .getByRole("button", { name: "Back", exact: true })
              .isDisabled(),
          );
        } else {
          const dialog = await learner.open(page);
          assert.ok(
            await dialog
              .getByRole("button", { name: "Done", exact: true })
              .isVisible(),
          );
          await page.keyboard.press("Escape");
          assert.equal(
            await page.locator(".science-investigation[open]").count(),
            0,
          );
          assert.equal(
            (await learner.state(page)).time,
            0,
            "Opening conditions never advances the model",
          );
          assert.ok(
            await page
              .locator(".science-investigation-trigger")
              .evaluate((e) => e === document.activeElement),
            "Dialog returns keyboard focus",
          );
        }
        if (spec.kind === "earth") {
          await page
            .getByRole("button", { name: "Inspect Mantle", exact: true })
            .last()
            .press("Enter");
          assert.match(
            await page.locator(".science-layer-note").innerText(),
            /solid rock/i,
          );
        } else {
          await learner.begin(page, spec.kind);
          await learner.steps(page, spec.kind, spec.kind === "genome" ? 2 : 3);
          assert.equal(
            (await learner.state(page)).time,
            spec.kind === "genome" ? 2 : 3,
          );
        }
        await capture("changed");
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
        await page.locator(".science-scene").waitFor();
        assert.equal(
          await page.locator(".science-question").innerText(),
          spec.question,
        );
        assert.equal(
          await page.locator(".science-scene").getAttribute("data-time"),
          "0",
        );
        if (spec.kind !== "cell") {
          await learner.open(page);
          await learner.close(page);
        }
        if (spec.kind !== "earth") {
          await learner.begin(page, spec.kind);
          await learner.steps(page, spec.kind, 1);
          assert.equal(
            await page.locator(".science-scene").getAttribute("data-time"),
            "1",
          );
        }
        await capture("try-lesson");
        assert.deepEqual(errors, []);
        report.push({ slug: spec.slug, status: "passed", layouts });
        console.log(
          `${spec.slug}: opening, four desktop sizes, modal keyboard/focus, remix and Try lesson passed`,
        );
      } catch (e) {
        await capture("failure").catch(() => {});
        report.push({
          slug: spec.slug,
          status: "failed",
          error: e.message,
          errors,
        });
        console.error(spec.slug, e.message);
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
    // Default-motion playback still has an operable pause in the same location.
    const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "no-preference",
      }),
      page = await context.newPage();
    await page.goto(`${base}/experiments?experiment=plate-boundaries`);
    await page
      .getByRole("button", { name: "Move the plates", exact: true })
      .click();
    await page.waitForFunction(
      () => Number(document.querySelector(".science-scene")?.dataset.time) > 0,
    );
    await page
      .getByRole("button", { name: "Pause movement", exact: true })
      .click();
    const time = await page.locator(".science-scene").getAttribute("data-time");
    await page.waitForTimeout(1200);
    assert.equal(
      await page.locator(".science-scene").getAttribute("data-time"),
      time,
    );
    await context.close();
    assert.equal(report.filter((r) => r.status === "passed").length, 9);
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
