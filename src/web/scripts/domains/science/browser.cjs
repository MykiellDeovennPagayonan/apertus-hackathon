const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("../../test-loader.cjs");
const h = require("../../generation/helpers.cjs");
const { scienceSpecs } = load("src/simulations/domains/science/index.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43110";
const out = path.resolve(
  process.env.SCIENCE_EVIDENCE_DIR ||
    path.join(
      __dirname,
      "../../../../../docs/agent-only/implementation/023-validation/desktop",
    ),
);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await h.launch(),
    report = [];
  try {
    for (const spec of scienceSpecs) {
      if (process.env.SCIENCE_CASE && process.env.SCIENCE_CASE !== spec.slug)
        continue;
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "no-preference",
          acceptDownloads: true,
        }),
        page = await context.newPage(),
        errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.setDefaultTimeout(60000);
      const capture = async (name) =>
        page.screenshot({ path: path.join(out, `${spec.slug}-${name}.png`) });
      const begin = async () => {
        if (spec.kind === "immune")
          await page
            .getByRole("button", { name: "Introduce pathogen", exact: true })
            .click();
        if (spec.kind === "invasive")
          await page
            .getByRole("button", { name: "Introduce at patch 1", exact: true })
            .click();
      };
      const step = () =>
        page.getByRole("button", { name: spec.step, exact: true });
      try {
        await page.goto(`${base}/experiments?experiment=${spec.slug}`);
        await page.locator(".science-scene").first().waitFor();
        await page.waitForTimeout(400);
        await capture("opening");
        assert.equal(
          await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time"),
          "0",
        );
        assert.equal(
          await page.locator(".science-question").first().innerText(),
          spec.question,
        );
        const layouts = [];
        for (const viewport of [
          { width: 1440, height: 900 },
          { width: 1280, height: 800 },
          { width: 1920, height: 1080 },
          { width: 1366, height: 768 },
        ]) {
          await page.setViewportSize(viewport);
          await page.waitForTimeout(150);
          const geometry = await page.evaluate(() => {
            const rect = (e) => e.getBoundingClientRect().toJSON();
            const targets = [
              ...document.querySelectorAll(
                ".science-panel button,.science-panel select,.science-panel input",
              ),
            ].filter((e) => e.getBoundingClientRect().height > 0);
            const overlays = [
              ...document.querySelectorAll(
                ".workspace-composer,.board-camera-tools,.workspace-header-tools",
              ),
            ].map(rect);
            return {
              cards: [...document.querySelectorAll(".board-item")].map((e) => ({
                rect: rect(e),
                client: e.querySelector(".board-content")?.clientHeight,
                scroll: e.querySelector(".board-content")?.scrollHeight,
              })),
              targets: targets.map((e) => ({
                label: e.getAttribute("aria-label") || e.textContent,
                type: e.type,
                rect: rect(e),
              })),
              blocked: targets
                .filter((e) => {
                  const r = rect(e);
                  return overlays.some(
                    (o) =>
                      r.left < o.right &&
                      r.right > o.left &&
                      r.top < o.bottom &&
                      r.bottom > o.top,
                  );
                })
                .map((e) => e.getAttribute("aria-label") || e.textContent),
              overflow: document.documentElement.scrollWidth - innerWidth,
              scene: rect(document.querySelector(".science-scene")),
              scrolling: [
                ...document.querySelectorAll(".science-panel,.science-scene"),
              ]
                .filter(
                  (e) =>
                    ["auto", "scroll"].includes(
                      getComputedStyle(e).overflowY,
                    ) && e.scrollHeight > e.clientHeight + 2,
                )
                .map((e) => e.className),
            };
          });
          assert.equal(geometry.overflow, 0, "Page overflow");
          assert.deepEqual(
            geometry.blocked,
            [],
            "Workspace tools obscure controls",
          );
          assert.deepEqual(geometry.scrolling, [], "Learner card scrolling");
          assert.ok(
            geometry.scene.height >= 240 && geometry.scene.width >= 500,
            "Scene too small",
          );
          assert.ok(
            geometry.targets.every((t) => t.rect.height >= 43.5),
            `Small targets at ${viewport.width}×${viewport.height}: ${JSON.stringify(geometry.targets.filter((t) => t.rect.height < 43.5))}`,
          );
          layouts.push({ viewport, geometry });
          await capture(`opening-${viewport.width}x${viewport.height}`);
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        await begin();
        if (spec.kind !== "genome") {
          await page
            .getByLabel("Playback speed", { exact: true })
            .selectOption("2");
          await page.getByRole("button", { name: "Play", exact: true }).click();
          await page.waitForFunction(
            () =>
              Number(document.querySelector(".science-scene").dataset.time) >=
              1,
          );
          await page
            .getByRole("button", { name: "Pause", exact: true })
            .click();
          const paused = await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time");
          await page.waitForTimeout(1500);
          assert.equal(
            await page
              .locator(".science-scene")
              .first()
              .getAttribute("data-time"),
            paused,
          );
          await capture("paused");
          await page
            .getByRole("button", { name: "Restart experiment", exact: true })
            .click();
          await begin();
        }
        for (let i = 0; i < 5; i++) await step().click();
        await capture("changed");
        assert.equal(
          await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time"),
          "5",
        );
        await page
          .getByRole("combobox", { name: "Inspect an object", exact: true })
          .selectOption("1");
        await capture("selected");
        const numeric = page
          .locator(".science-conditions input[type=text]:visible")
          .first();
        if (await numeric.count()) {
          const accepted = await numeric.inputValue();
          await numeric.fill("-");
          await numeric.press("Tab");
          await page.locator(".science-panel [role=alert]").first().waitFor();
          assert.equal(
            await page
              .locator(".science-scene")
              .first()
              .getAttribute("data-time"),
            "5",
          );
          await capture("invalid-recovery");
          await numeric.press("Escape");
          assert.equal(await numeric.inputValue(), accepted);
          await numeric.focus();
          assert.ok(
            await numeric.evaluate(
              (e) => parseFloat(getComputedStyle(e).outlineWidth) >= 2,
            ),
          );
          await capture("keyboard-focus");
        }
        const more = page.getByRole("button", {
          name: "More conditions",
          exact: true,
        });
        if (await more.count()) {
          await more.click();
          await page.locator(".science-setup-dialog[open]").waitFor();
          await capture("setup");
          await page.keyboard.press("Escape");
          assert.equal(
            await page.locator(".science-setup-dialog[open]").count(),
            0,
          );
          await more.focus();
        }
        await page
          .getByRole("button", { name: "Keep baseline & restart", exact: true })
          .click();
        assert.equal(
          await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time"),
          "0",
        );
        await capture("baseline");
        await page
          .getByRole("button", { name: /Compare with baseline/ })
          .click();
        await capture("comparison");
        await page
          .getByRole("button", { name: "Close comparison", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Restart experiment", exact: true })
          .click();
        assert.equal(
          await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time"),
          "0",
        );
        await page.emulateMedia({ reducedMotion: "reduce" });
        await page.waitForTimeout(200);
        if (spec.kind !== "genome")
          assert.equal(
            await page
              .getByRole("button", { name: "Play", exact: true })
              .isDisabled(),
            true,
          );
        await begin();
        await step().focus();
        await step().press("Enter");
        assert.equal(
          await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time"),
          "1",
        );
        await capture("reduced-motion");
        await page
          .getByRole("button", { name: "Restart experiment", exact: true })
          .click();
        await page.emulateMedia({ reducedMotion: "no-preference" });
        await page.locator(".gas-experiment-tools summary").click();
        const downloading = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Save recipe", exact: true })
          .click();
        const download = await downloading;
        const saved = JSON.parse(
          fs.readFileSync(await download.path(), "utf8"),
        );
        loadRecipe(saved);
        assert.equal(
          saved.document.nodes.filter(
            (n) => n.definition === `prefabs/science/${spec.name}`,
          ).length,
          1,
        );
        fs.writeFileSync(
          path.join(out, `${spec.slug}-saved.json`),
          JSON.stringify(saved, null, 2),
        );
        await page
          .getByRole("button", { name: "Open recipe", exact: true })
          .click();
        await page
          .getByLabel("Open recipe file", { exact: true })
          .setInputFiles(await download.path());
        await page.waitForURL((url) => url.pathname === "/");
        await page.locator(".science-scene").first().waitFor();
        assert.equal(
          await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time"),
          "0",
        );
        if (
          !(await page.locator(".gas-experiment-tools").evaluate((e) => e.open))
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
        await page.locator(".science-scene").first().waitFor();
        await begin();
        await step().click();
        assert.equal(
          await page
            .locator(".science-scene")
            .first()
            .getAttribute("data-time"),
          "1",
        );
        await capture("try-lesson");
        assert.deepEqual(errors, []);
        report.push({
          slug: spec.slug,
          status: "pass",
          layouts,
          screenshotSource: "standalone Playwright; MCP unavailable",
        });
        console.log(`${spec.slug} passed`);
      } catch (e) {
        await capture("failure").catch(() => {});
        report.push({
          slug: spec.slug,
          status: "fail",
          error: e.message,
          errors,
        });
        console.error(spec.slug, e.message);
      } finally {
        await context.close();
        fs.writeFileSync(
          path.join(out, "report.json"),
          JSON.stringify(report, null, 2),
        );
      }
    }
  } finally {
    await browser.close();
  }
  if (report.some((r) => r.status === "fail")) process.exitCode = 1;
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
