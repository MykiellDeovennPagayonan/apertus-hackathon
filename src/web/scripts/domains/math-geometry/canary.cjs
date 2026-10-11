// A1 pilot through ordinary Create UI; real responses, no fixture interception.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const h = require("../../generation/helpers.cjs");
const { submit } = require("../math-physics/tester-live.cjs");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/028-validation",
);
assert.match(
  fs.readFileSync(
    path.join(root, "coordination/inference.lock/owner.md"),
    "utf8",
  ),
  /^A1;/,
);
const dir = path.join(
  root,
  "developer/A1/canaries",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
fs.mkdirSync(dir, { recursive: true });
const run = {
  dir,
  record: {
    scenario: "MATH-02",
    started: new Date().toISOString(),
    sourceFingerprint: sourceFingerprint(),
    method:
      "Ordinary Create UI; standalone Playwright fallback; developer canary, not peer acceptance",
    status: "running",
  },
};
console.log(dir);
(async () => {
  const browser = await h.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  try {
    await page.addInitScript(() => {
      const original = window.fetch;
      window.__testerWires = {};
      window.fetch = async (...args) => {
        const response = await original(...args);
        if (new URL(response.url).pathname === "/api/apertus")
          response
            .clone()
            .text()
            .then((body) => {
              window.__testerWires[response.headers.get("X-Request-ID")] = {
                body,
                contentType: response.headers.get("Content-Type"),
              };
            })
            .catch(() => {});
        return response;
      };
    });
    await page.goto(process.env.UX_TEST_URL || "http://127.0.0.1:43124");
    const diagnostics = await page.request.get(
      `${process.env.UX_TEST_URL || "http://127.0.0.1:43124"}/api/planner-diagnostics?id=a1-preflight`,
    );
    assert.match(
      diagnostics.headers()["content-type"] || "",
      /application\/json/,
      "Start the app with PLANNER_DIAGNOSTICS=true before sending inference",
    );
    const result = await submit(
      page,
      "Show me how to figure out the ladder length if the wall is 4 metres high and the bottom is 3 metres away.",
      false,
      run,
    );
    assert.equal(result.status, "created", JSON.stringify(result));
    const model = result.recipe.document.nodes.find(
      (n) => n.definition === "prefabs/math-geometry/Pythagorean",
    );
    assert.ok(model, "Generated lesson must use the ladder model");
    assert.equal(model.configuration.distance, 3);
    assert.equal(model.configuration.height, 4);
    await page.waitForFunction(
      (id) => window.__experimentSnapshot?.()?.recipe?.id === id,
      result.recipe.id,
    );
    await page.screenshot({ path: path.join(dir, "opening.png") });
    fs.writeFileSync(
      path.join(dir, "accepted.json"),
      JSON.stringify(await h.snapshot(page), null, 2),
    );
    run.record.status = "generated; peer acceptance pending";
  } catch (error) {
    run.record.status = "failed";
    run.record.error = String(error.stack || error);
    await page
      .screenshot({ path: path.join(dir, "failure.png") })
      .catch(() => {});
    process.exitCode = 1;
  } finally {
    run.record.ended = new Date().toISOString();
    fs.writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify(run.record, null, 2),
    );
    console.log(JSON.stringify(run.record));
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
