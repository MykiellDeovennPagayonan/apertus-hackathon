const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs");
const manifest = require("./manifest.json");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const root = path.resolve(
  "../../docs/agent-only/implementation/028-validation",
);
const lock = path.join(root, "coordination/inference.lock/owner.md");
assert.match(
  fs.readFileSync(lock, "utf8"),
  /^A2;/,
  "A2 must hold the shared inference lease",
);
const c = manifest.find((c) => c.id === (process.env.A2_CASE || "MATH-12"));
assert.ok(c);
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43122";
const dir = path.join(
  root,
  "developer/A2/canaries",
  new Date().toISOString().replace(/[:.]/g, "-") + "-" + c.id,
);
fs.mkdirSync(dir, { recursive: true });
const record = {
  scenario: c.id,
  sourceFingerprint: sourceFingerprint(),
  started: new Date().toISOString(),
  method:
    "Canonical prompt through ordinary Create UI; standalone Playwright fallback",
  prompt: c.canonical,
  status: "running",
};
console.log(JSON.stringify({ directory: dir, ...record }));
(async () => {
  const browser = await h.launch();
  const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    }),
    page = await context.newPage();
  try {
    await page.addInitScript(() => {
      const original = window.fetch;
      window.__a2Wires = {};
      window.fetch = async (...args) => {
        const response = await original(...args);
        if (new URL(response.url).pathname === "/api/apertus")
          response
            .clone()
            .text()
            .then((body) => {
              window.__a2Wires[response.headers.get("X-Request-ID")] = body;
            })
            .catch(() => {});
        return response;
      };
    });
    await page.goto(base + "/");
    await page
      .getByRole("textbox", { name: "Describe an experiment…", exact: true })
      .fill(c.canonical);
    await page.screenshot({ path: path.join(dir, "01-prompt.png") });
    const pending = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/apertus" &&
        r.request().method() === "POST" &&
        r.request().postDataJSON()?.prompt === c.canonical,
      { timeout: 270000 },
    );
    pending.catch(() => {});
    await page.getByRole("button", { name: "Create", exact: true }).click();
    const response = await pending,
      request = response.request().postDataJSON();
    record.requestId = request.requestId;
    record.httpStatus = response.status();
    fs.writeFileSync(
      path.join(dir, "request.json"),
      JSON.stringify(request, null, 2),
    );
    await page.waitForFunction(
      (id) => window.__a2Wires?.[id],
      request.requestId,
      { timeout: 270000 },
    );
    const body = await page.evaluate(
      (id) => window.__a2Wires[id],
      request.requestId,
    );
    fs.writeFileSync(path.join(dir, "response-stream.txt"), body);
    const result = response
      .headers()
      ["content-type"]?.includes("application/x-ndjson")
      ? body
          .trim()
          .split("\n")
          .map(JSON.parse)
          .find((e) => e.type === "result")?.result
      : JSON.parse(body);
    fs.writeFileSync(
      path.join(dir, "result.json"),
      JSON.stringify(result ?? null, null, 2),
    );
    record.resultStatus = result?.status;
    const trace = await (
      await page.request.get(
        base +
          "/api/planner-diagnostics?id=" +
          encodeURIComponent(request.requestId),
      )
    ).json();
    fs.writeFileSync(
      path.join(dir, "trace.json"),
      JSON.stringify(trace, null, 2),
    );
    const events = (trace.trace || trace).events || [];
    record.inference = events
      .filter((e) => /\.inference$/.test(e.event))
      .map((e) => e.data);
    record.decisions = events
      .filter((e) => e.event === "composition.decision")
      .map((e) => e.data);
    assert.ok(
      record.inference.some((e) => e.provider === "apertus"),
      "Actual Apertus metadata required",
    );
    assert.equal(result?.status, "created", JSON.stringify(result));
    assert.ok(
      result.recipe.document.nodes.some(
        (n) => n.definition === `prefabs/math-analysis/${c.kind}`,
      ),
      "Generated lesson must use the scientific model",
    );
    await page.waitForFunction(
      (id) => window.__experimentSnapshot?.()?.recipe?.id === id,
      result.recipe.id,
    );
    await page.evaluate(async () => {
      await document.fonts.ready;
      for (let frame = 0; frame < 3; frame++)
        await new Promise((resolve) => requestAnimationFrame(resolve));
    });
    await page.screenshot({ path: path.join(dir, "02-generated-opening.png") });
    if (c.id === "MATH-12") {
      await page.getByRole("slider").first().focus();
      await page.keyboard.press("End");
      const modelId = result.recipe.document.nodes.find(
        (n) => n.definition === "prefabs/math-analysis/house-prices",
      ).id;
      await page.waitForFunction(
        (id) =>
          window.__experimentSnapshot?.()?.state.outputs[id]?.mean === 250,
        modelId,
      );
      const changed = await page.evaluate(() => window.__experimentSnapshot());
      assert.equal(changed.state.outputs[modelId].median, 130);
      fs.writeFileSync(
        path.join(dir, "changed.json"),
        JSON.stringify(changed, null, 2),
      );
      await page.screenshot({
        path: path.join(dir, "03-generated-changed.png"),
      });
      record.learningTask = "Keyboard End: accepted mean250, median130";
    }
    record.status = "generated; peer/live acceptance pending";
  } catch (error) {
    record.status = "failed";
    record.error = String(error.stack || error);
    await page
      .screenshot({ path: path.join(dir, "failure.png") })
      .catch(() => {});
    process.exitCode = 1;
  } finally {
    record.ended = new Date().toISOString();
    record.sourceFingerprintAfter = sourceFingerprint();
    fs.writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify(record, null, 2),
    );
    console.log(JSON.stringify({ directory: dir, ...record }));
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
