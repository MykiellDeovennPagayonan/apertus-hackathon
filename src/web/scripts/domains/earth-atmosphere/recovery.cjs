const assert = require("node:assert/strict");
const h = require("../../generation/helpers.cjs"),
  e = require("./evidence.cjs"),
  { cases } = require("./cases.cjs"),
  { model } = require("./browser.cjs");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43115";
(async () => {
  const browser = await h.launch();
  let failures = 0;
  try {
    for (const c of cases) {
      const run = e.allocate("motion-keyboard-recovery", c.kind),
        context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "no-preference",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(30000);
      try {
        await page.goto(base + "/experiments?experiment=" + c.slug);
        await page.locator(`[data-earth="${c.kind}"]`).waitFor();
        await page.waitForFunction(
          (k) =>
            Object.values(
              window.__experimentSnapshot?.()?.state?.state || {},
            ).some((s) => s?.kind === k),
          c.kind,
        );
        assert.equal(
          (await model(page, c.kind)).playing,
          false,
          "Opening stays quiet",
        );
        if (c.kind !== "atmosphere") {
          const primary = page.locator(".ea-primary");
          await primary.focus();
          await page.keyboard.press("Enter");
          await page.waitForFunction(
            (k) =>
              Object.values(
                window.__experimentSnapshot?.()?.state?.state || {},
              ).some((s) => s?.kind === k && s.playing),
            c.kind,
          );
          await page
            .getByRole("button", { name: "Pause this stage", exact: true })
            .click();
          const paused = await model(page, c.kind);
          assert.equal(paused.playing, false);
          await page.waitForTimeout(250);
          assert.deepEqual(await model(page, c.kind), paused);
          await primary.click();
          await page.waitForFunction(
            (k) =>
              Object.values(
                window.__experimentSnapshot?.()?.state?.state || {},
              ).some((s) => s?.kind === k && !s.playing && s.phase === 1),
            c.kind,
          );
          await e.capture(page, run, "03-keyboard-animation");
        } else {
          await page
            .getByRole("slider", { name: "Altitude", exact: true })
            .focus();
          await page.keyboard.press("ArrowRight");
          assert.equal((await model(page, c.kind)).config.altitude, 1);
        }
        if (["rainbow", "earthquake"].includes(c.kind)) {
          await page.locator('.ea-3d[data-ready="true"] canvas').waitFor();
          const before = await model(page, c.kind);
          await page
            .getByRole("combobox", { name: "Scene view", exact: true })
            .selectOption("section");
          assert.deepEqual(await model(page, c.kind), before);
          assert.equal(
            await page
              .getByRole("combobox", { name: "Scene view", exact: true })
              .isDisabled(),
            false,
            "Choosing 2D is not a context-loss failure",
          );
          await page
            .getByRole("combobox", { name: "Scene view", exact: true })
            .selectOption("angled");
          await page.locator('.ea-3d[data-ready="true"] canvas').waitFor();
          await page.locator(".ea-3d canvas").evaluate((canvas) => {
            const gl = canvas.getContext("webgl2");
            const extension = gl?.getExtension("WEBGL_lose_context");
            if (!extension)
              throw new Error("WebGL context-loss test unavailable");
            extension.loseContext();
          });
          await page
            .getByText(
              "Spatial rendering is unavailable; the same lesson continues in 2D.",
              { exact: true },
            )
            .waitFor();
          assert.deepEqual(await model(page, c.kind), before);
          await e.capture(page, run, "10-context-loss-fallback");
          await page.locator(".ea-primary").click();
          await page.waitForFunction(
            (k) =>
              Object.values(
                window.__experimentSnapshot?.()?.state?.state || {},
              ).some((s) => s?.kind === k && !s.playing && s.phase === 2),
            c.kind,
          );
        }
        await e.capture(page, run, "11-recovered");
        run.record.checks = [
          "quiet opening",
          "keyboard operation",
          "animation pause/resume",
          ...(["rainbow", "earthquake"].includes(c.kind)
            ? [
                "camera independence",
                "intentional 2D selection",
                "actual WebGL context loss",
                "same runtime continues in 2D",
              ]
            : []),
        ];
        e.finish(run, "passed");
      } catch (err) {
        failures++;
        await e.capture(page, run, "failure").catch(() => {});
        e.finish(run, "failed", err);
      } finally {
        await context.close();
      }
      console.log(
        run.record.run,
        c.kind,
        run.record.status,
        run.record.error?.split("\n")[0] || "",
      );
    }
  } finally {
    await browser.close();
  }
  assert.equal(failures, 0);
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
