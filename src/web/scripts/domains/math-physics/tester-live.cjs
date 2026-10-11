const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs"),
  { load } = require("../../test-loader.cjs");
const { cases, configurations } = require("./tester-cases.cjs"),
  { verifyRecipe } = require("./tester-verify.cjs");
const {
  base,
  snapshot,
  allocate,
  write,
  capture,
  finish,
  opening,
} = require("./tester-browser.cjs");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const { parseGenerationResult } = load("src/lib/planner/schema.ts"),
  { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
async function submit(page, prompt, followup, run) {
  await page
    .getByRole("textbox", {
      name: followup ? "Ask for a change…" : "Describe an experiment…",
      exact: true,
    })
    .fill(prompt);
  const pending = page.waitForResponse(
    (r) =>
      new URL(r.url()).pathname === "/api/apertus" &&
      r.request().method() === "POST" &&
      r.request().postDataJSON()?.prompt === prompt,
    { timeout: 300000 },
  );
  pending.catch(() => {});
  await page
    .getByRole("button", { name: followup ? "Apply" : "Create", exact: true })
    .click();
  const response = await pending,
    request = response.request().postDataJSON();
  run.record.requestId = request.requestId;
  write(run, "request.json", request);
  console.log(
    JSON.stringify({
      event: "request",
      at: new Date().toISOString(),
      requestId: request.requestId,
      prompt,
      directory: run.dir,
    }),
  );
  await page.waitForFunction(
    (id) => window.__testerWires?.[id],
    request.requestId,
    { timeout: 300000 },
  );
  const wire = await page.evaluate(
    (id) => window.__testerWires[id],
    request.requestId,
  );
  fs.writeFileSync(path.join(run.dir, "response-stream.txt"), wire.body);
  const result = wire.contentType.includes("application/x-ndjson")
    ? wire.body
        .trim()
        .split("\n")
        .map(JSON.parse)
        .find((x) => x.type === "result" && x.requestId === request.requestId)
        ?.result
    : JSON.parse(wire.body);
  write(run, "response.json", result);
  const diagnostics = await (
    await page.request.get(
      base +
        "/api/planner-diagnostics?id=" +
        encodeURIComponent(request.requestId),
    )
  ).json();
  write(run, "diagnostics.json", diagnostics);
  const events = (diagnostics.trace || diagnostics).events || [];
  run.record.apertus = events
    .filter((x) => /\.inference$/.test(x.event))
    .map((x) => x.data);
  run.record.laya = events
    .filter((x) => x.event === "composition.decision")
    .map((x) => x.data);
  assert.ok(
    run.record.apertus.some((x) => x.provider === "apertus"),
    "Missing observed actual Apertus inference",
  );
  assert.equal(response.status(), 200, JSON.stringify(result));
  parseGenerationResult(result, request);
  return result;
}
async function attempt(page, c, prompt, type, parent) {
  const run = allocate(c, "live-" + type);
  run.record.prompt = prompt;
  run.record.lease = process.env.TESTER_INFERENCE_LEASE;
  run.record.parentRequestId = parent?.requestId;
  const before =
    type === "followup" || type === "invalid" ? await snapshot(page) : null;
  try {
    const result = await submit(page, prompt, !!before, run);
    if (type === "invalid") {
      assert.ok(
        !["created", "updated", "runtime_action"].includes(result.status),
        "Unsupported input was accepted",
      );
      const after = await snapshot(page);
      assert.deepEqual(
        after.recipe,
        before.recipe,
        "Failed generation changed accepted recipe",
      );
      assert.deepEqual(
        after.state,
        before.state,
        "Failed generation changed accepted state",
      );
      await capture(page, run, "invalid-recovery");
    } else {
      assert.ok(
        ["created", "updated", "runtime_action"].includes(result.status),
        JSON.stringify(result),
      );
      if (!before) {
        assert.ok(
          run.record.laya.some(
            (x) => x.provider === "laya" && x.status === "accepted",
          ),
          "Missing real accepted Laya creation decision",
        );
      } else if (!run.record.laya.length)
        run.record.layaProvenance = {
          parentRequestId: parent.requestId,
          reason:
            "Active typed capability may reuse parent's Laya decision; no new Laya call claimed",
        };
      await opening(page, c, run);
      const accepted = await snapshot(page);
      loadRecipe(accepted.recipe);
      verifyRecipe(accepted.recipe, c, !before);
      if (before)
        c.followup(
          Number(type === "followup" ? run.record.followupIndex : 0),
          configurations(before.recipe, c),
          configurations(accepted.recipe, c),
        );
      write(run, "accepted.json", accepted);
    }
    finish(run);
    return { requestId: run.record.requestId, run, result };
  } catch (error) {
    await capture(page, run, "failure").catch(() => {});
    finish(run, error);
    throw error;
  }
}
if (require.main === module)
  (async () => {
    assert.ok(
      process.env.TESTER_INFERENCE_LEASE,
      "O must reserve shared inference queue first",
    );
    const c = cases.find((c) => c.id === process.env.TESTER_CASE);
    assert.ok(c, "Supply TESTER_CASE");
    const full =
        process.env.TESTER_FINAL_ROUND === "1" ||
        process.env.TESTER_FINAL_ROUND === "2",
      frozen = sourceFingerprint();
    const browser = await h.launch();
    try {
      for (let p = 0; p < (full ? 3 : 1); p++) {
        const context = await browser.newContext({
            viewport: { width: 1440, height: 900 },
            reducedMotion: "reduce",
          }),
          page = await context.newPage();
        page.setDefaultTimeout(30000);
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
        try {
          await page.goto(base + "/");
          await page.waitForFunction(
            () => typeof window.__experimentSnapshot === "function",
          );
          const parent = await attempt(page, c, c.prompts[p], "create", null);
          if (full && p === 0) {
            for (let i = 0; i < 2; i++) {
              // Follow-ups share the revised canonical lesson, never a reset fixture.
              const run = allocate(c, "live-followup");
              run.record.prompt = c.followups[i];
              run.record.followupIndex = i;
              run.record.lease = process.env.TESTER_INFERENCE_LEASE;
              run.record.parentRequestId = parent.requestId;
              const before = await snapshot(page);
              try {
                const result = await submit(page, c.followups[i], true, run);
                assert.ok(
                  ["updated", "runtime_action"].includes(result.status),
                );
                const after = await snapshot(page);
                loadRecipe(after.recipe);
                verifyRecipe(after.recipe, c);
                c.followup(
                  i,
                  configurations(before.recipe, c),
                  configurations(after.recipe, c),
                );
                await capture(page, run, "changed");
                write(run, "accepted.json", after);
                finish(run);
              } catch (error) {
                await capture(page, run, "failure").catch(() => {});
                finish(run, error);
                throw error;
              }
            }
            await attempt(page, c, c.invalid, "invalid", parent);
          }
          if (full)
            assert.equal(
              sourceFingerprint(),
              frozen,
              "Frozen candidate changed during qualifying round",
            );
        } finally {
          await context.close();
        }
      }
    } finally {
      await browser.close();
    }
  })().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
module.exports = { submit };
