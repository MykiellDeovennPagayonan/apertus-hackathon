const assert = require("node:assert/strict");
const h = require("../../generation/helpers.cjs"),
  e = require("./evidence.cjs"),
  { cases } = require("./cases.cjs");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43115";
async function model(page, kind) {
  return page.evaluate((k) => {
    const s =
      window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.();
    return Object.values(s?.state?.state || {}).find((x) => x?.kind === k);
  }, kind);
}
async function exercise(page, kind, run) {
  const scene = page.locator(`[data-earth="${kind}"]`).first();
  await scene.waitFor();
  await page.waitForFunction(
    (k) =>
      Object.values(
        (window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.())
          ?.state?.state || {},
      ).some((s) => s?.kind === k),
    kind,
  );
  if (kind === "rainbow" || kind === "earthquake")
    await page.locator('.ea-3d[data-ready="true"] canvas').waitFor();
  await e.capture(page, run, "02-opening");
  run.record.openingControls = await page
    .locator(
      ".ea-controls button,.ea-controls select,.ea-controls input,.ea-camera select",
    )
    .count();
  assert.ok(run.record.openingControls <= 3);
  if (kind === "atmosphere") {
    await page
      .getByRole("slider", { name: "Altitude", exact: true })
      .fill("25");
    assert.equal((await model(page, kind)).config.altitude, 25);
    await e.capture(page, run, "03-mechanism");
    await page
      .getByRole("button", { name: "See how ozone protects us", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Ozone amount", exact: true })
      .selectOption("0.3");
  } else {
    for (let i = 0; i < 3; i++) {
      await page.locator(".ea-primary").click();
      await page.waitForFunction(
        (k) =>
          Object.values(
            (
              window.__experimentSnapshot?.() ??
              window.__builderLessonSnapshot?.()
            )?.state?.state || {},
          ).some((s) => s?.kind === k && !s.playing),
        kind,
      );
    }
    assert.equal((await model(page, kind)).phase, 3);
    await e.capture(page, run, "03-mechanism");
    for (let i = 0; i < 4; i++) {
      const s = await model(page, kind);
      if (
        s.phase >=
        (kind === "earthquake" || kind === "tsunami" || kind === "rainbow"
          ? 5
          : 6)
      )
        break;
      await page.locator(".ea-primary").click();
      await page.waitForFunction(
        (k) =>
          Object.values(
            (
              window.__experimentSnapshot?.() ??
              window.__builderLessonSnapshot?.()
            )?.state?.state || {},
          ).some((s) => s?.kind === k && !s.playing),
        kind,
      );
    }
    const choice = page.locator(".ea-choice select");
    if (await choice.count()) await choice.selectOption({ index: 1 });
  }
  await e.capture(page, run, "04-changed-condition");
  const state = await model(page, kind);
  e.write(run.dir, "assertions.json", {
    state,
    caption: await page.locator(".ea-caption").first().innerText(),
  });
  if (kind === "rainbow" || kind === "earthquake") {
    const before = await model(page, kind);
    await page
      .getByRole("combobox", { name: "Scene view", exact: true })
      .selectOption("section");
    assert.deepEqual(await model(page, kind), before);
    await e.capture(page, run, "08-2d-explanation");
  }
}
exports.exercise = exercise;
exports.model = model;
if (require.main === module)
  (async () => {
    const browser = await h.launch();
    let failures = 0;
    try {
      for (const c of cases.filter(
        (c) => !process.env.EARTH_CASE || c.kind === process.env.EARTH_CASE,
      )) {
        const run = e.allocate("premade-browser", c.kind),
          context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            reducedMotion: "reduce",
          }),
          page = await context.newPage(),
          errors = [];
        page.setDefaultTimeout(60000);
        page.on("pageerror", (err) => errors.push(err.message));
        await context.tracing.start({ screenshots: true, snapshots: true });
        try {
          await page.goto(base + "/experiments?experiment=" + c.slug);
          await exercise(page, c.kind, run);
          const geometry = [];
          for (const viewport of [
            { width: 1280, height: 720 },
            { width: 1920, height: 1080 },
            { width: 390, height: 844 },
          ]) {
            await page.setViewportSize(viewport);
            await page.locator(".ea-controls").scrollIntoViewIfNeeded();
            await page.waitForFunction(
              () =>
                document.querySelector(".ea-scene")?.getBoundingClientRect()
                  .width > 100,
            );
            await e.capture(
              page,
              run,
              `viewport-${viewport.width}x${viewport.height}`,
            );
            geometry.push(
              await page.evaluate(() => ({
                viewport: { width: innerWidth, height: innerHeight },
                overflow: document.documentElement.scrollWidth - innerWidth,
                scene: document
                  .querySelector(".ea-scene")
                  .getBoundingClientRect()
                  .toJSON(),
                controls: [
                  ...document.querySelectorAll(
                    ".ea-controls button,.ea-controls select",
                  ),
                ].map((n) => ({
                  text: n.textContent,
                  rect: n.getBoundingClientRect().toJSON(),
                })),
              })),
            );
            assert.ok(geometry.at(-1).overflow <= 1);
            const controls = page.locator(
              ".ea-controls button,.ea-controls select,.ea-controls input",
            );
            for (let i = 0; i < (await controls.count()); i++) {
              const control = controls.nth(i);
              await control.focus();
              const target = await control.evaluate((n) => {
                const r = n.getBoundingClientRect(),
                  hit = document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  );
                return {
                  width: r.width,
                  height: r.height,
                  reachable: hit === n || n.contains(hit),
                };
              });
              assert.ok(
                target.width >= 43 && target.height >= 31,
                "Usable target size",
              );
              assert.ok(
                target.reachable,
                "Floating tools must not cover a lesson control",
              );
            }
          }
          e.write(run.dir, "geometry.json", geometry);
          assert.deepEqual(errors, []);
          e.finish(run, "passed");
        } catch (error) {
          failures++;
          await e.capture(page, run, "failure").catch(() => {});
          e.finish(run, "failed", error);
        } finally {
          e.write(run.dir, "console.json", errors);
          await context.tracing.stop({ path: run.dir + "/trace.zip" });
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
