// Submit the learner's exact wording through the normal UI. Observe responses;
// never replace requests, provider results, recipes, or runtime state.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs"),
  { load } = require("../../test-loader.cjs");
const { parseGenerationResult } = load("src/lib/planner/schema.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const e = require("./evidence.cjs"),
  { cases } = require("./cases.cjs"),
  { exercise, model } = require("./browser.cjs");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43115";
const followupCanary = process.env.EARTH_LIVE_FOLLOWUPS === "true";
const full = process.env.EARTH_LIVE_FULL === "true",
  frozen = sourceFingerprint();
const batch = "live-" + Date.now(),
  records = [];
async function submit(page, prompt, followup, run) {
  await page
    .getByRole("textbox", {
      name: followup ? "Ask for a change…" : "Describe an experiment…",
      exact: true,
    })
    .fill(prompt);
  await e.capture(page, run, "01-prompt");
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
  e.write(run.dir, "request.json", request);
  run.record.requestId = request.requestId;
  await page.waitForFunction(
    (id) => window.__earthWire?.id === id,
    request.requestId,
    { timeout: 300000 },
  );
  const wire = await page.evaluate(() => window.__earthWire);
  fs.writeFileSync(path.join(run.dir, "response-stream.txt"), wire.body);
  const result = wire.contentType?.includes("application/x-ndjson")
    ? wire.body
        .trim()
        .split("\n")
        .map(JSON.parse)
        .find((x) => x.type === "result" && x.requestId === request.requestId)
        ?.result
    : JSON.parse(wire.body);
  return { request, result, httpStatus: response.status() };
}
function assertFollowup(kind, index, old, now) {
  const allowed = {
    earthquake: [["fault"], ["speed"]],
    tsunami: [["depth"], []],
    atmosphere: [
      ["altitude", "uv"],
      ["ozone", "uv", "altitude"],
    ],
    greenhouse: [["absorption"], ["solar"]],
    lightning: [["intracloud"], ["distance"]],
    rainbow: [["secondary"], ["elevation"]],
    weather: [["scenario"], ["moisture"]],
  }[kind][index];
  for (const field of Object.keys(old))
    if (!allowed.includes(field))
      assert.deepEqual(
        now[field],
        old[field],
        "Unrequested setting changed: " + field,
      );
  if (kind === "earthquake" && index === 0) assert.equal(now.fault, 0);
  if (kind === "earthquake" && index === 1) assert.ok(now.speed < old.speed);
  if (kind === "tsunami" && index === 0) assert.ok(now.depth > old.depth);
  if (kind === "atmosphere" && index === 0)
    assert.ok(now.altitude >= 15 && now.altitude <= 35);
  if (kind === "atmosphere" && index === 1) assert.ok(now.ozone < old.ozone);
  if (kind === "greenhouse" && index === 0)
    assert.ok(now.absorption > old.absorption);
  if (kind === "greenhouse" && index === 1) assert.equal(now.solar, old.solar);
  if (kind === "lightning" && index === 0) assert.equal(now.intracloud, true);
  if (kind === "lightning" && index === 1) assert.ok(now.distance > 0);
  if (kind === "rainbow" && index === 0) assert.equal(now.secondary, true);
  if (kind === "rainbow" && index === 1)
    assert.ok(now.elevation > old.elevation);
  if (kind === "weather" && index === 0) assert.equal(now.scenario, 1);
  if (kind === "weather" && index === 1) assert.ok(now.moisture < old.moisture);
}
async function attempt(page, c, prompt, followup, index, parent) {
  if (full)
    assert.equal(
      sourceFingerprint(),
      frozen,
      "Freeze source for the complete batch",
    );
  const run = e.allocate(
    followup ? "live-followup" : "live-prompt",
    c.kind,
    prompt,
  );
  Object.assign(run.record, {
    batch,
    finalBatch: full,
    parentRequestId: parent?.requestId,
  });
  records.push(run.record);
  console.log("Starting", run.record.run, c.kind, prompt);
  const before = followup ? await h.snapshot(page) : null;
  const errors = [];
  const onError = (err) => errors.push(err.message);
  page.on("pageerror", onError);
  await page.context().tracing.start({ screenshots: true, snapshots: true });
  try {
    const started = Date.now(),
      { request, result, httpStatus } = await submit(
        page,
        prompt,
        followup,
        run,
      );
    Object.assign(run.record, { durationMs: Date.now() - started, httpStatus });
    e.write(run.dir, "response.json", result);
    const diagnostics = await (
      await page.request.get(
        base +
          "/api/planner-diagnostics?id=" +
          encodeURIComponent(request.requestId),
      )
    ).json();
    e.write(run.dir, "diagnostics.json", diagnostics);
    const events = (diagnostics?.trace || diagnostics)?.events || [];
    run.record.laya = events.find(
      (x) => x.event === "composition.decision",
    )?.data;
    run.record.apertus = events
      .filter((x) =>
        /^(turn_\d+|runtime_command_selection|runtime_command_arguments)\.inference$/.test(
          x.event,
        ),
      )
      .map((x) => x.data);
    run.record.repairs = events
      .filter(
        (x) =>
          x.event.startsWith("fixer.") ||
          x.event.endsWith("formatNormalized") ||
          x.event.endsWith("semanticFailure") ||
          x.event.endsWith("schemaFailure"),
      )
      .map((x) => x.event);
    assert.equal(httpStatus, 200, JSON.stringify(result));
    parseGenerationResult(result, request);
    if (!followup || run.record.laya) {
      assert.equal(run.record.laya?.provider, "laya");
      assert.equal(run.record.laya?.status, "accepted");
    } else {
      assert.ok(
        parent?.requestId,
        "Active capability must come from a verified real parent",
      );
      run.record.layaProvenance = {
        parentRequestId: parent.requestId,
        reason:
          "Typed active-lesson follow-up reuses the parent capability; no new Laya selection is claimed.",
      };
    }
    assert.ok(
      run.record.apertus.some((x) => x.provider === "apertus"),
      "Missing actual Apertus authoring",
    );
    assert.ok(
      ["created", "updated", ...(followup ? ["runtime_action"] : [])].includes(
        result.status,
      ),
      JSON.stringify(result),
    );
    await page.waitForTimeout(100);
    const recipe = result.recipe || (await h.snapshot(page)).recipe;
    loadRecipe(recipe);
    assert.deepEqual(compositionIssues(recipe.document), []);
    const node = recipe.document.nodes.find(
      (n) => n.definition === c.definition,
    );
    assert.ok(node, "Wrong scientific model");
    assert.equal(
      recipe.document.nodes.filter((n) =>
        n.definition.startsWith("prefabs/earth-atmosphere/"),
      ).length,
      1,
    );
    const actual = await model(page, c.kind);
    for (const control of await page.locator(".ea-choice select").all()) {
      const projection = await control.evaluate((select) => ({
        field: select.dataset.earthSetting,
        value: select.value,
      }));
      assert.equal(
        projection.value,
        String(actual.config[projection.field]),
        "The visible control must reflect its actual accepted value",
      );
    }
    run.record.configuration = actual.config;
    if (followup) {
      assertFollowup(
        c.kind,
        index,
        Object.values(before.state.state).find((s) => s?.kind === c.kind)
          .config,
        actual.config,
      );
      if (c.kind === "tsunami" && index === 1) assert.equal(actual.phase, 5);
      if (c.kind === "lightning" && index === 1) assert.equal(actual.phase, 6);
    }
    await page.locator(`[data-earth="${c.kind}"]`).waitFor();
    if (followup) {
      await e.capture(page, run, "02-updated");
      e.write(run.dir, "runtime.json", await h.snapshot(page));
    } else await exercise(page, c.kind, run);
    run.record.consoleErrors = errors;
    assert.deepEqual(errors, []);
    e.finish(run, run.record.repairs.length ? "passed-with-repair" : "passed");
    return { requestId: request.requestId, recipe };
  } catch (error) {
    await e.capture(page, run, "failure").catch(() => {});
    e.finish(run, "failed", error);
    return null;
  } finally {
    page.off("pageerror", onError);
    e.write(run.dir, "console.json", errors);
    await page
      .context()
      .tracing.stop({ path: path.join(run.dir, "trace.zip") });
    if (full)
      assert.equal(
        sourceFingerprint(),
        frozen,
        "Source changed during final attempt",
      );
    e.write(e.root, batch + ".json", { fingerprint: frozen, full, records });
    console.log(
      "Finished",
      run.record.run,
      run.record.status,
      run.record.error?.split("\n")[0] || "",
    );
  }
}
exports.submit = submit;
if (require.main === module)
  (async () => {
    const browser = await h.launch();
    try {
      for (const c of cases.filter(
        (c) => !process.env.EARTH_CASE || c.kind === process.env.EARTH_CASE,
      )) {
        const tasks = full
          ? [
              ...Array.from({ length: 5 }, () => ({
                prompt: c.prompts[0],
                followups: true,
              })),
              ...c.prompts
                .slice(1)
                .flatMap((prompt) =>
                  Array.from({ length: 2 }, () => ({ prompt })),
                ),
            ]
          : [{ prompt: c.prompts[0] }];
        for (let n = 0; n < tasks.length; n++) {
          const context = await browser.newContext({
              viewport: { width: 1440, height: 900 },
              reducedMotion: "reduce",
            }),
            page = await context.newPage();
          page.setDefaultTimeout(60000);

          await page.addInitScript(() => {
            const original = window.fetch;
            window.fetch = async (...args) => {
              const response = await original(...args);
              if (new URL(response.url).pathname === "/api/apertus")
                response
                  .clone()
                  .text()
                  .then((body) => {
                    window.__earthWire = {
                      id: response.headers.get("X-Request-ID"),
                      contentType: response.headers.get("Content-Type"),
                      body,
                    };
                  })
                  .catch(() => {});
              return response;
            };
          });
          const errors = [];
          page.on("pageerror", (err) => errors.push(err.message));
          try {
            await page.goto(base + "/");
            const parent = await attempt(
              page,
              c,
              tasks[n].prompt,
              false,
              0,
              null,
            );
            if (parent && (full || followupCanary) && n < 2)
              for (let i = 0; i < c.followups.length; i++) {
                await page
                  .getByText("Experiment options", { exact: true })
                  .click();
                await page
                  .getByRole("button", { name: "Reset lesson", exact: true })
                  .click();
                await page
                  .getByText("Experiment options", { exact: true })
                  .click();
                const steps =
                  c.kind === "rainbow"
                    ? 4
                    : c.kind === "lightning"
                      ? 5
                      : c.kind === "tsunami" && i === 1
                        ? 4
                        : 0;
                for (let step = 0; step < steps; step++)
                  await page.locator(".ea-primary").click();
                await attempt(page, c, c.followups[i], true, i, parent);
              }
          } finally {
            await context.close();
          }
        }
      }
    } finally {
      await browser.close();
    }
    assert.ok(
      records.every((r) => r.status.startsWith("passed")),
      "See numbered evidence for failed actual UI attempts",
    );
    if (full) assert.equal(records.length, process.env.EARTH_CASE ? 13 : 91);
  })().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
