// Local Playwright fallback; no callable Playwright MCP is available.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs");
const base = process.env.UX_TEST_URL || "http://localhost:43114";
const out = path.resolve(
  process.env.COLLECTIVE_EVIDENCE_DIR ||
    path.join(
      __dirname,
      "../../../../../docs/agent-only/implementation/026-validation/runs/browser-" +
        Date.now(),
    ),
);
fs.mkdirSync(out, { recursive: true });
const cases = [
  ["fishing", "shared-fishing-lake"],
  ["crowd", "crowd-exit"],
  ["voting", "voting-systems"],
  ["selection", "natural-selection"],
];
const state = async (page) => {
  await page.waitForFunction(
    () => window.__experimentSnapshot?.()?.state?.state?.model,
  );
  return (await h.snapshot(page)).state.state.model;
};
async function geometry(page) {
  return page.evaluate(() => {
    const rect = (e) => e.getBoundingClientRect().toJSON();
    const root = document.querySelector(".collective-scene");
    const controls = [
      ...document.querySelectorAll(
        ".collective-control button,.collective-control select",
      ),
    ].filter((e) => rect(e).height > 0);
    return {
      scene: rect(root),
      gridOverflow: (() => {
        const grid = document.querySelector(".voter-grid");
        return grid ? grid.scrollWidth - grid.clientWidth : 0;
      })(),
      overflow: document.documentElement.scrollWidth - innerWidth,
      clipping: [...document.querySelectorAll(".board-content")]
        .filter((e) => e.scrollHeight > e.clientHeight + 3)
        .map((e) => ({ height: e.clientHeight, scroll: e.scrollHeight })),
      controls: controls.map((e) => ({
        label: e.textContent,
        rect: rect(e),
        reachable:
          e ===
            document.elementFromPoint(
              rect(e).x + rect(e).width / 2,
              rect(e).y + rect(e).height / 2,
            ) ||
          e.contains(
            document.elementFromPoint(
              rect(e).x + rect(e).width / 2,
              rect(e).y + rect(e).height / 2,
            ),
          ),
      })),
    };
  });
}
(async () => {
  const browser = await h.launch(),
    records = [];
  try {
    for (const [kind, slug] of cases.filter(
      ([k]) =>
        !process.env.COLLECTIVE_CASE || process.env.COLLECTIVE_CASE === k,
    )) {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage(),
        errors = [];
      page.setDefaultTimeout(60000);
      page.on("pageerror", (e) => errors.push(e.message));
      const record = { kind, status: "running", captures: [], layouts: [] };
      records.push(record);
      const capture = async (label) => {
        const file = kind + "-" + label + ".png";
        await page.screenshot({ path: path.join(out, file), fullPage: true });
        record.captures.push(file);
      };
      try {
        await page.goto(base + "/experiments?experiment=" + slug);
        await page.locator('[data-collective="' + kind + '"]').waitFor();
        await state(page);
        for (const viewport of [
          { width: 1440, height: 900 },
          { width: 1280, height: 800 },
          { width: 1366, height: 768 },
          { width: 1920, height: 1080 },
          { width: 390, height: 844 },
        ]) {
          await page.setViewportSize(viewport);
          await page.waitForTimeout(300);
          const measured = await geometry(page);
          assert.ok(
            measured.gridOverflow <= 1,
            "Voter columns clipped inside their panel",
          );
          record.layouts.push({ viewport, geometry: measured });
          await capture("opening-" + viewport.width + "x" + viewport.height);
          if (viewport.width === 390) {
            await page
              .locator(".collective-primary")
              .evaluate((e) => e.scrollIntoView({ block: "center" }));
            await page.waitForTimeout(300);
            assert.ok(
              await page.locator(".collective-primary").evaluate((e) => {
                const r = e.getBoundingClientRect(),
                  hit = document.elementFromPoint(
                    r.x + r.width / 2,
                    r.y + r.height / 2,
                  );
                return hit === e || e.contains(hit);
              }),
              "Phone action obscured",
            );
            await capture("phone-controls");
            const old = await state(page);
            await page.locator(".collective-primary").click();
            const next = await state(page);
            if (kind === "fishing") assert.ok(next.day > old.day);
            if (kind === "crowd")
              assert.ok(next.lanes.every((l) => l.finished > 0));
            if (kind === "voting")
              assert.ok(next.rounds.length > old.rounds.length);
            if (kind === "selection")
              assert.ok(next.generation > old.generation);
            await capture("phone-result");
            await page
              .getByRole("button", {
                name:
                  kind === "crowd"
                    ? "Run this again"
                    : kind === "voting"
                      ? "Restart this run"
                      : "Start again",
                exact: true,
              })
              .click();
            await page
              .locator(".board-viewport")
              .evaluate((e) => (e.scrollTop = 0));
          }
        }
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.waitForTimeout(200);
        await page.locator(".collective-primary").press("Enter");
        await page.waitForTimeout(250);
        record.changed = await state(page);
        await capture("changed");
        const changedGeometry = await geometry(page);
        assert.ok(
          changedGeometry.scene.top >= 80,
          "Changed scene moved behind chrome",
        );
        assert.deepEqual(
          changedGeometry.clipping,
          [],
          "Changed content clipped",
        );
        record.changedGeometry = changedGeometry;
        if (kind === "fishing") {
          assert.equal(record.changed.stock, 2000);
          assert.equal(record.changed.day, 30);
          await page.getByLabel("Catch arrangement").selectOption("2");
          await page.locator(".collective-primary").click();
          record.overfishing = await state(page);
          assert.ok(record.overfishing.stock < 2000);
          await capture("overfishing");
          await page
            .getByRole("button", { name: "Start again", exact: true })
            .click();
          assert.equal((await state(page)).day, 0);
        }
        if (kind === "crowd") {
          assert.ok(record.changed.lanes.every((l) => l.finished > 0));
          await page
            .getByRole("button", { name: "Try another placement" })
            .click();
          assert.deepEqual(
            (await state(page)).lanes[0].people,
            (await state(page)).lanes[1].people,
          );
          await page.locator(".collective-primary").click();
          record.otherPlacement = await state(page);
          await capture("closer-result");
        }
        if (kind === "voting") {
          assert.equal(record.changed.rounds[0].winner, 0);
          await page.getByLabel("Voting rule").selectOption("1");
          await page.locator(".collective-primary").click();
          await capture("ranked-elimination");
          await page.locator(".collective-primary").click();
          assert.equal((await state(page)).rounds.at(-1).winner, 1);
          await capture("ranked-transfer");
          await page.getByLabel("Voting rule").selectOption("2");
          await page.locator(".collective-primary").click();
          await capture("approval");
          await page.locator(".voter-dot").first().focus();
          await page.keyboard.press("ArrowRight");
          await page.keyboard.press("Enter");
          assert.match(
            await page.locator(".vote-detail").innerText(),
            /Voter 2/,
          );
          await capture("ballot-inspection");
        }
        if (kind === "selection") {
          assert.equal(record.changed.generation, 1);
          for (let i = 0; i < 11; i++)
            await page.locator(".collective-primary").click();
          record.evolved = await state(page);
          await capture("generation-12");
          await page.getByLabel("Habitat", { exact: true }).selectOption("0.9");
          const before = await state(page);
          assert.deepEqual(before.organisms, record.evolved.organisms);
          await capture("habitat-changed");
          for (let i = 0; i < 12; i++)
            await page.locator(".collective-primary").click();
          await capture("generation-24-dark");
        }
        record.finalGeometry = await geometry(page);
        assert.equal(record.finalGeometry.overflow, 0);
        assert.ok(record.finalGeometry.controls.length <= 3);
        for (const l of record.layouts.filter(
          (l) => l.viewport.width >= 1000,
        )) {
          assert.equal(l.geometry.overflow, 0);
          assert.deepEqual(l.geometry.clipping, []);
          for (const c of l.geometry.controls)
            assert.ok(c.reachable, "Obscured " + c.label);
        }
        assert.deepEqual(errors, []);
        record.status = "passed";
      } catch (e) {
        record.status = "failed";
        record.error = e.stack;
        await capture("failure");
      } finally {
        fs.writeFileSync(
          path.join(out, "report.json"),
          JSON.stringify(records, null, 2),
        );
        await context.close();
      }
      console.log(
        kind +
          ": " +
          record.status +
          (record.error ? " " + record.error.split("\n")[0] : ""),
      );
    }
    // Motion-enabled states and pause/resume: these are real UI actions, not state injection.
    for (const [kind, slug] of cases.filter(
      ([k]) =>
        k !== "voting" &&
        (!process.env.COLLECTIVE_CASE || process.env.COLLECTIVE_CASE === k),
    )) {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "no-preference",
        }),
        page = await context.newPage();
      try {
        await page.goto(base + "/experiments?experiment=" + slug);
        await page.locator(".collective-primary").waitFor();
        await state(page);
        await page.locator(".collective-primary").click();
        await page.waitForTimeout(kind === "selection" ? 400 : 650);
        await page.screenshot({
          path: path.join(out, kind + "-motion-intermediate.png"),
        });
        if (kind === "selection") {
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(out, "selection-offspring-spawning.png"),
          });
          await page.waitForTimeout(1100);
        } else {
          await page
            .getByRole("button", { name: "Pause", exact: true })
            .click();
          const paused = await state(page);
          await page.waitForTimeout(350);
          assert.deepEqual(await state(page), paused);
          await page.screenshot({ path: path.join(out, kind + "-paused.png") });
          await page.locator(".collective-primary").click();
          await page.waitForFunction(
            () =>
              !window.__experimentSnapshot?.()?.state?.state?.model?.playing,
            {},
            { timeout: 60000 },
          );
        }
        await page.screenshot({
          path: path.join(out, kind + "-motion-finished.png"),
        });
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
  assert.ok(
    records.every((r) => r.status === "passed"),
    "See " + out + "/report.json",
  );
  console.log("Browser evidence: " + out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
