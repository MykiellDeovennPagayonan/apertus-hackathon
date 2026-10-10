const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs");
const base = process.env.UX_TEST_URL || "http://localhost:43114",
  out = path.resolve(
    __dirname,
    "../../../../../docs/agent-only/implementation/026-validation/runs/builder-" +
      Date.now(),
  );
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await h.launch(),
    records = [];
  try {
    for (const [kind, slug] of [
      ["fishing", "shared-fishing-lake"],
      ["crowd", "crowd-exit"],
      ["voting", "voting-systems"],
      ["selection", "natural-selection"],
    ]) {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(30000);
      const r = { kind, status: "running" };
      records.push(r);
      try {
        await page.goto(base + "/experiments?experiment=" + slug);
        await page.locator(".collective-primary").waitFor();
        await page.getByText("Experiment options", { exact: true }).click();
        await page
          .getByRole("link", { name: "Remix in builder", exact: true })
          .click();
        await page
          .getByRole("button", { name: "Try lesson ↗", exact: true })
          .waitFor();
        await page.screenshot({ path: path.join(out, kind + "-builder.png") });
        await page
          .getByRole("button", { name: "Save experiment", exact: true })
          .click();
        await page
          .getByText("Saved on this device.", { exact: true })
          .first()
          .waitFor();
        await page
          .getByRole("button", { name: "Try lesson ↗", exact: true })
          .click();
        await page.locator('[data-collective="' + kind + '"]').waitFor();
        await page.screenshot({
          path: path.join(out, kind + "-try-lesson.png"),
        });
        await page.locator(".collective-primary").click();
        await page.waitForTimeout(250);
        await page.screenshot({
          path: path.join(out, kind + "-try-changed.png"),
        });
        await page
          .getByRole("button", { name: "Return to builder", exact: true })
          .click();
        await page.reload();
        await page
          .getByRole("button", { name: "Try lesson ↗", exact: true })
          .waitFor();
        await page
          .getByRole("button", { name: "Try lesson ↗", exact: true })
          .click();
        await page.locator('[data-collective="' + kind + '"]').waitFor();
        r.status = "passed";
      } catch (e) {
        r.status = "failed";
        r.error = e.stack;
        await page.screenshot({ path: path.join(out, kind + "-failure.png") });
      } finally {
        await context.close();
        fs.writeFileSync(
          path.join(out, "report.json"),
          JSON.stringify(records, null, 2),
        );
      }
      console.log(
        kind + ": " + r.status + (r.error ? " " + r.error.split("\n")[0] : ""),
      );
    }
  } finally {
    await browser.close();
  }
  assert.ok(records.every((r) => r.status === "passed"));
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
