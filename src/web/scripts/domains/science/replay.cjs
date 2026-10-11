// Accepted exports are replayed untouched. This does not count as model inference.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs"),
  { cases, paraphraseCases } = require("./cases.cjs");
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/023-validation",
);
const arg = process.argv.indexOf("--batch");
assert.ok(
  arg >= 0 && process.argv[arg + 1],
  "Provide --batch <retained live directory>",
);
const batch = path.resolve(process.argv[arg + 1]);
assert.ok(batch.startsWith(root + path.sep));
const records = JSON.parse(fs.readFileSync(path.join(batch, "report.json"))),
  out = path.join(root, `replay-${Date.now()}`);
fs.mkdirSync(out, { recursive: true });
(async () => {
  const browser = await h.launch(),
    report = [];
  try {
    for (const c of [...cases, ...paraphraseCases].filter((c) =>
      records.some((r) => r.case === c.id && r.status === "passed"),
    )) {
      const accepted = records.find(
        (r) => r.case === c.id && r.status === "passed",
      );
      assert.ok(accepted, `No passing accepted export for ${c.id}`);
      const input = path.join(
          batch,
          `run-${accepted.round}`,
          c.id,
          "accepted-recipe.json",
        ),
        recipe = JSON.parse(fs.readFileSync(input));
      for (const reducedMotion of ["reduce", "no-preference"]) {
        const dir = path.join(out, c.id, reducedMotion);
        fs.mkdirSync(dir, { recursive: true });
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            reducedMotion,
          }),
          page = await context.newPage();
        try {
          await page.goto(
            `${process.env.UX_TEST_URL || "http://127.0.0.1:43111"}/experiments?experiment=arithmetic`,
          );
          await page.locator(".recipe-lesson").waitFor();
          await page
            .getByLabel("Open recipe file", { exact: true })
            .setInputFiles(input);
          await page
            .locator(`.science-scene[data-science="${c.kind}"]`)
            .waitFor();
          await require("./live-browser.cjs").verifyPage(page, recipe, c, dir);
          report.push({
            case: c.id,
            reducedMotion,
            status: "passed",
            source: input,
            transport: "untouched accepted export; no inference",
          });
        } finally {
          await context.close();
          fs.writeFileSync(
            path.join(out, "report.json"),
            JSON.stringify(report, null, 2),
          );
        }
      }
    }
  } finally {
    await browser.close();
  }
  console.log(out);
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
