const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs"),
  { load } = require("../../test-loader.cjs");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/028-validation",
);
assert.match(
  fs.readFileSync(
    path.join(root, "coordination/inference.lock/owner.md"),
    "utf8",
  ),
  /^A4;/,
);
const c = require("./a4-cases.json").find(
  (c) => c.id === (process.env.A4_CASE || "PHYS-17"),
);
assert.ok(c);
const dir = path.join(
  root,
  "developer/A4/live-ui",
  `${new Date().toISOString().replace(/[:.]/g, "-")}-${c.id}`,
);
fs.mkdirSync(dir, { recursive: true });
const write = (name, value) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2));
const record = {
  id: c.id,
  started: new Date().toISOString(),
  sourceFingerprint: sourceFingerprint(),
  method: "Ordinary prompt UI; standalone Playwright fallback",
  status: "running",
  peer: "Not tested",
};
write("manifest.json", record);
console.log(JSON.stringify({ directory: dir, ...record }));
(async () => {
  let browser, page;
  try {
    browser = await h.launch();
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    page = await context.newPage();
    page.setDefaultTimeout(30000);
    await page.addInitScript(() => {
      const original = window.fetch;
      window.__a4Wires = {};
      window.fetch = async (...args) => {
        const response = await original(...args);
        if (new URL(response.url).pathname === "/api/apertus") {
          const id = response.headers.get("X-Request-ID");
          response
            .clone()
            .text()
            .then((body) => {
              window.__a4Wires[id] = body;
            })
            .catch(() => {});
        }
        return response;
      };
    });
    await page.goto(process.env.UX_TEST_URL || "http://127.0.0.1:43125");
    await page.waitForFunction(
      () => typeof window.__experimentSnapshot === "function",
    );
    await page
      .getByRole("textbox", { name: "Describe an experiment…", exact: true })
      .fill(c.prompts[0]);
    const pending = page.waitForResponse(
      (r) =>
        new URL(r.url()).pathname === "/api/apertus" &&
        r.request().method() === "POST",
      { timeout: 270000 },
    );
    await page.getByRole("button", { name: "Create", exact: true }).click();
    const response = await pending,
      request = response.request().postDataJSON();
    record.requestId = request.requestId;
    write("request.json", request);
    console.log(
      JSON.stringify({
        event: "request",
        directory: dir,
        requestId: request.requestId,
      }),
    );
    await page.waitForFunction(
      (id) => typeof window.__a4Wires?.[id] === "string",
      request.requestId,
      { timeout: 270000 },
    );
    const body = await page.evaluate(
      (id) => window.__a4Wires[id],
      request.requestId,
    );
    fs.writeFileSync(path.join(dir, "response-stream.txt"), body);
    const result = response.headers()["content-type"].includes("ndjson")
      ? body
          .trim()
          .split("\n")
          .map(JSON.parse)
          .find((e) => e.type === "result")?.result
      : JSON.parse(body);
    write("result.json", result);
    const trace = await (
      await page.request.get(
        "http://127.0.0.1:43125/api/planner-diagnostics?id=" +
          encodeURIComponent(request.requestId),
      )
    ).json();
    write("trace.json", trace);
    record.observedInference = (trace?.events || [])
      .filter((e) => /\.inference$/.test(e.event))
      .map((e) => e.data);
    record.observedDecisions = (trace?.events || [])
      .filter((e) => e.event === "composition.decision")
      .map((e) => e.data);
    assert.equal(result?.status, "created", JSON.stringify(result));
    assert.ok(record.observedInference.some((e) => e.provider === "apertus"));
    assert.ok(
      record.observedDecisions.some(
        (e) => e.provider === "laya" && e.status === "accepted",
      ),
    );
    loadRecipe(result.recipe);
    assert.ok(
      result.recipe.document.nodes.some((n) => n.definition === c.ref),
      "Wrong scientific model",
    );
    await page.waitForFunction(() => !!window.__experimentSnapshot?.()?.recipe);
    await page.waitForFunction(
      () =>
        new Promise((resolve) => {
          let prior = "",
            stable = 0;
          const frame = () => {
            const next = [...document.querySelectorAll("[data-board-id]")]
              .map((n) => {
                const r = n.getBoundingClientRect();
                return [r.x, r.y, r.width, r.height]
                  .map((v) => Math.round(v * 10))
                  .join(",");
              })
              .join(";");
            stable = next && next === prior ? stable + 1 : 0;
            prior = next;
            if (stable >= 4) resolve(true);
            else requestAnimationFrame(frame);
          };
          requestAnimationFrame(frame);
        }),
    );
    await page.screenshot({ path: path.join(dir, "opening.png") });
    const accepted = await page.evaluate(() => window.__experimentSnapshot());
    write("accepted.json", accepted);
    assert.equal(accepted.recipe.id, result.recipe.id);
    if (c.id === "PHYS-17") {
      const models = result.recipe.document.nodes.filter(
        (n) => n.definition === c.ref,
      );
      assert.ok(
        models.length >= 2,
        "warm/cold comparison needs two independent cups",
      );
      const previous = accepted.state;
      const slider = page.getByRole("slider").first();
      await slider.focus();
      await slider.press("ArrowRight");
      await page.waitForFunction(
        (before) =>
          JSON.stringify(window.__experimentSnapshot?.()?.state) !== before,
        JSON.stringify(previous),
      );
      const changed = await page.evaluate(() => window.__experimentSnapshot());
      for (const m of models) {
        const state = changed.state.state[m.id],
          o = changed.state.outputs[m.id];
        assert.ok(
          Math.abs(
            o.temperature -
              (state.ambient +
                (state.initial - state.ambient) *
                  Math.exp(-state.coefficient * state.time)),
          ) < 1e-9,
        );
      }
      write("changed.json", changed);
      await page.screenshot({ path: path.join(dir, "changed.png") });
      record.learningTask =
        "Shared-time actual keyboard change and independent Newton cooling oracle passed; not peer acceptance";
    }
    record.status = "canonical canary created; not release acceptance";
  } catch (error) {
    record.status = "failed";
    record.error = String(error.stack || error);
    if (page)
      await page
        .screenshot({ path: path.join(dir, "failure.png") })
        .catch(() => {});
    process.exitCode = 1;
  } finally {
    record.ended = new Date().toISOString();
    record.endFingerprint = sourceFingerprint();
    write("manifest.json", record);
    console.log(JSON.stringify({ directory: dir, ...record }));
    if (browser) await browser.close();
  }
})();
