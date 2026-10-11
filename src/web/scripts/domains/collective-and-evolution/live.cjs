// Actual UI submissions, streamed fetch observation, real provider diagnostics.
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs"),
  { load } = require("../../test-loader.cjs");
const { sourceFingerprint } = require("../science/source-fingerprint.cjs");
const { parseGenerationResult } = load("src/lib/planner/schema.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { compositionIssues } = load("src/lib/planner/compositionQuality.ts");
const base = process.env.UX_TEST_URL || "http://localhost:43114";
const out = path.resolve(
  process.env.COLLECTIVE_EVIDENCE_DIR ||
    path.join(
      __dirname,
      "../../../../../docs/agent-only/implementation/026-validation/runs/live-" +
        Date.now(),
    ),
);
assert.ok(!fs.existsSync(out), "Use a fresh directory");
fs.mkdirSync(out, { recursive: true });
const prompts = {
  F1: ["fishing", "show me what happens when a town overfishes a lake"],
  F2: [
    "fishing",
    "theres 2000 fish and 5 fishermen, the lake makes 1 new fish a day for every 100 fish. what if they take more than 4 each?",
  ],
  F3: ["fishing", "what if just one fisherman starts taking twice as much"],
  F4: ["fishing", "can they agree to stop the lake running out?"],
  C1: ["crowd", "show me how adding an obstacle makes exit faster?"],
  C2: [
    "crowd",
    "people trying to leave through a small door, what happens if theres a pillar in the way",
  ],
  C3: ["crowd", "move the pillar closer to the exit"],
  C4: ["crowd", "does it still help when people are pushing more?"],
  V1: ["voting", "show me how different voting systems change who wins"],
  V2: [
    "voting",
    "make voters little dots and change their colours when their vote transfers",
  ],
  V3: ["voting", "same people but use ranked choice now"],
  V4: ["voting", "what if people can vote for more than one person"],
  N1: ["selection", "show me natural selection"],
  N2: [
    "selection",
    "little dots surviving and having babies, show how they evolve over generations",
  ],
  N3: ["selection", "make the environment darker and see what survives"],
  N4: ["selection", "what if they all start the same and theres no mutations"],
  CX: ["crowd", "make the pillar always speed things up"],
  VX: ["voting", "prove ranked voting always picks the best candidate"],
  NX: ["selection", "make every living dot turn dark so it adapts"],
};
const full = process.env.COLLECTIVE_LIVE_FULL === "true";
const policy = process.env.COLLECTIVE_POLICY || "required-laya";
const primary = ["F1", "C1", "V1", "N1"];
const tasks = full
  ? [
      ...Array.from({ length: 3 }, (_, i) =>
        primary.map((id) => ({ id, run: i + 1 })),
      ).flat(),
      ...["F2", "C2", "V2", "N2"].map((id) => ({ id, run: 1 })),
      ...["F3", "F4", "C3", "C4", "V3", "V4", "N3", "N4"].map((id) => ({
        id,
        run: 1,
        parent: id[0] + "1",
      })),
      ...["CX", "VX", "NX"].map((id) => ({
        id,
        run: 1,
        parent: id[0] + "1",
        negative: true,
      })),
    ]
  : (process.env.COLLECTIVE_LIVE_CASES || primary.join(","))
      .split(",")
      .map((id) => ({
        id,
        run: 1,
        parent: /[34X]$/.test(id) ? id[0] + "1" : undefined,
        negative: id.endsWith("X"),
      }));
// The complete planned scope is 27 strict requests here plus four normal-policy requests in a separate server/batch = 31.
const fingerprint = sourceFingerprint(),
  records = [],
  parents = {};
// Optional canaries may import provenance-linked, genuinely inferred parents.
// The final full batch always creates its own parents on the frozen revision.
const parentBatch = process.env.COLLECTIVE_PARENT_BATCH;
assert.ok(
  !full || !parentBatch,
  "A full frozen batch must create its own parents",
);
if (parentBatch)
  for (const id of primary) {
    const response = JSON.parse(
      fs.readFileSync(
        path.join(parentBatch, id + "-1", "response.json"),
        "utf8",
      ),
    );
    assert.ok(["created", "updated"].includes(response.status));
    parents[id] = { recipe: response.recipe, requestId: response.requestId };
  }
const write = (dir, name, value) =>
  fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2));
write(out, "manifest.json", {
  started: new Date().toISOString(),
  fingerprint,
  attempts: tasks.length,
  policy,
  base,
  prompts,
  tasks,
  parentBatch: parentBatch || null,
  transport:
    "actual learner UI; fetch observation only; local Playwright fallback (MCP unavailable)",
});
async function submit(page, prompt, followup) {
  const textbox = page.getByRole("textbox", {
    name: followup ? "Ask for a change…" : "Describe an experiment…",
    exact: true,
  });
  await textbox.fill(prompt);
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
  await page.waitForFunction(
    (id) => window.__collectiveWire?.id === id,
    request.requestId,
    { timeout: 300000 },
  );
  const wire = await page.evaluate(() => window.__collectiveWire);
  const result = wire.contentType?.includes("application/x-ndjson")
    ? wire.body
        .trim()
        .split("\n")
        .map(JSON.parse)
        .find((e) => e.type === "result" && e.requestId === request.requestId)
        ?.result
    : JSON.parse(wire.body);
  return { request, result, httpStatus: response.status() };
}
(async () => {
  const browser = await h.launch();
  try {
    for (const t of tasks) {
      assert.equal(
        sourceFingerprint(),
        fingerprint,
        "Do not mix source revisions",
      );
      const [kind, prompt] = prompts[t.id],
        dir = path.join(out, t.id + "-" + t.run);
      fs.mkdirSync(dir, { recursive: true });
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage(),
        record = { ...t, kind, prompt, status: "running" };
      records.push(record);
      await context.tracing.start({
        screenshots: true,
        snapshots: true,
        sources: true,
      });
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
                window.__collectiveWire = {
                  id: response.headers.get("X-Request-ID"),
                  contentType: response.headers.get("Content-Type"),
                  body,
                };
              })
              .catch(() => {});
          return response;
        };
      });
      console.log("Live " + t.id + " #" + t.run + " " + policy);
      try {
        await page.goto(base + "/");
        await page.waitForFunction(
          () => typeof window.__experimentSnapshot === "function",
        );
        if (t.parent) {
          const parent = parents[t.parent];
          assert.ok(parent, "Missing accepted parent " + t.parent);
          const input = path.join(dir, "parent-recipe.json");
          write(dir, "parent-recipe.json", parent.recipe);
          await page.goto(base + "/experiments?experiment=arithmetic");
          await page.locator(".recipe-lesson").waitFor();
          await page
            .getByLabel("Open recipe file", { exact: true })
            .setInputFiles(input);
          await page.locator('[data-collective="' + kind + '"]').waitFor();
          record.parentRequestId = parent.requestId;
        }
        if (t.parent && !t.negative) {
          await page.locator(".collective-primary").first().click();
          await page.waitForTimeout(250);
        }
        const before = t.parent ? await h.snapshot(page) : null;
        if (before) write(dir, "parent-runtime.json", before);
        const started = Date.now(),
          { request, result, httpStatus } = await submit(
            page,
            prompt,
            Boolean(t.parent),
          );
        record.requestId = request.requestId;
        record.durationMs = Date.now() - started;
        record.httpStatus = httpStatus;
        write(dir, "request.json", request);
        write(dir, "response.json", result);
        const response = await page.request.get(
            base +
              "/api/planner-diagnostics?id=" +
              encodeURIComponent(request.requestId),
          ),
          diagnostics = await response.json();
        write(dir, "diagnostics.json", diagnostics);
        const events = (diagnostics?.trace || diagnostics)?.events || [];
        record.laya = events.find(
          (e) => e.event === "composition.decision",
        )?.data;
        record.apertus = events
          .filter((e) => e.event.endsWith(".inference"))
          .map((e) => e.data);
        record.repairs = events
          .filter(
            (e) =>
              e.event.startsWith("fixer.") ||
              e.event.endsWith("schemaFailure") ||
              e.event.endsWith("semanticFailure"),
          )
          .map((e) => e.event);
        assert.equal(httpStatus, 200, JSON.stringify(result));
        parseGenerationResult(result, request);
        if (policy === "required-laya") {
          assert.ok(
            (t.negative || record.laya?.status === "accepted") &&
              record.laya.provider === "laya",
            "Missing actual accepted Laya",
          );
          if (!t.negative || ["created", "updated"].includes(result.status))
            assert.ok(
              events.some(
                (e) =>
                  /^turn_\d+\.inference$/.test(e.event) &&
                  e.data.provider === "apertus",
              ),
              "Missing actual Apertus authoring",
            );
        }
        if (t.negative) {
          assert.ok(
            [
              "unsupported",
              "clarification",
              "updated",
              "created",
              "rejected",
            ].includes(result.status),
          );
          if (result.status === "created" || result.status === "updated") {
            assert.match(
              result.coverage.explanation +
                " " +
                result.recipe.document.lesson.explanation +
                " " +
                result.recipe.assumptions.join(" "),
              {
                CX: /not always|not.*guarantee|cannot|help, hinder|conditional|can.*slow/i,
                VX: /cannot|no.*best|not.*best|no.*universal|not.*guarantee|doesn.t.*best|depends.*(?:preference|definition)|unsupported/i,
                NX: /inherit|offspring|not.*(?:individual|living)|cannot|unsupported/i,
              }[t.id],
            );
            loadRecipe(result.recipe);
            const model = result.recipe.document.nodes.find(
              (n) => n.definition === "prefabs/collective/" + kind,
            );
            assert.ok(model, "Overclaim changed the model");
            if (t.id === "NX") {
              const current = await h.snapshot(page),
                prior =
                  before.state.state[
                    before.recipe.document.nodes.find(
                      (n) => n.definition === "prefabs/collective/" + kind,
                    ).id
                  ];
              assert.deepEqual(
                current.state.state[model.id].organisms,
                prior.organisms,
                "Living individuals must not be recolored to adapt",
              );
            }
          } else if (before) {
            assert.deepEqual((await h.snapshot(page))?.recipe, before.recipe);
          }
          record.status = "expected-overclaim-handled";
        } else {
          assert.ok(
            ["created", "updated"].includes(result.status),
            JSON.stringify(result),
          );
          loadRecipe(result.recipe);
          assert.deepEqual(compositionIssues(result.recipe.document), []);
          const model = result.recipe.document.nodes.find(
            (n) => n.definition === "prefabs/collective/" + kind,
          );
          assert.ok(model, "Wrong model");
          record.configuration = model.configuration;
          if (before && !t.negative) {
            const prior = before.recipe.document.nodes.find(
              (n) => n.definition === model.definition,
            ).configuration;
            const requested = {
              F3: ["arrangement"],
              F4: ["policy"],
              C3: ["placement"],
              C4: ["friction"],
              V3: ["rule"],
              V4: ["rule"],
              N3: ["habitat"],
              N4: ["uniform", "mutationRate"],
            }[t.id];
            if (requested)
              for (const field of Object.keys(prior))
                if (!requested.includes(field))
                  assert.deepEqual(
                    model.configuration[field],
                    prior[field],
                    "Unrequested setting changed: " + field,
                  );
          }

          if (t.id === "F2")
            assert.equal(model.configuration.initialStock, 2000);
          if (t.id === "F3") assert.equal(model.configuration.arrangement, 1);
          if (t.id === "F4")
            assert.equal(
              model.configuration.policy,
              2,
              "Agreement must actually share daily renewal",
            );
          if (t.id === "C4") {
            const prior = before.recipe.document.nodes.find(
              (n) => n.definition === model.definition,
            ).configuration;
            assert.ok(
              model.configuration.friction > prior.friction,
              "Stronger conflicts require higher friction",
            );
            for (const field of ["count", "seed", "placement", "radius"])
              assert.equal(
                model.configuration[field],
                prior[field],
                "Preserve " + field,
              );
          }
          if (t.id === "C3") assert.equal(model.configuration.placement, 1);
          if (t.id === "V3") assert.equal(model.configuration.rule, 1);
          if (t.id === "V4") assert.equal(model.configuration.rule, 2);
          if (t.id === "N3") assert.ok(model.configuration.habitat > 0.5);
          if (t.id === "N4") {
            assert.equal(model.configuration.uniform, true);
            assert.equal(model.configuration.mutationRate, 0);
          }
          await page.locator('[data-collective="' + kind + '"]').waitFor();
          await page.waitForTimeout(300);
          const opening = await h.snapshot(page);
          if (before && ["F3", "F4", "V3", "V4", "N3"].includes(t.id)) {
            const oldNode = before.recipe.document.nodes.find(
                (n) => n.definition === "prefabs/collective/" + kind,
              ),
              old = before.state.state[oldNode.id],
              now = opening.state.state[model.id];
            if (t.id === "F3" || t.id === "F4") {
              assert.equal(now.stock, old.stock);
              assert.equal(now.day, old.day);
            }
            if (t.id.startsWith("V")) assert.deepEqual(now.voters, old.voters);
            if (t.id === "N3") assert.deepEqual(now.organisms, old.organisms);
          }
          await page.screenshot({ path: path.join(dir, "opening.png") });
          const controls = await page
            .locator(".collective-control button,.collective-control select")
            .count();
          assert.ok(controls <= 3, "Too many lesson controls");
          await page.locator(".collective-primary").first().click();
          await page.waitForTimeout(300);
          await page.screenshot({ path: path.join(dir, "changed.png") });
          write(dir, "runtime.json", await h.snapshot(page));
          parents[t.id] = {
            recipe: result.recipe,
            requestId: request.requestId,
          };
          record.status = record.repairs.length
            ? "passed-with-repair"
            : "passed";
        }
      } catch (e) {
        record.status = "failed";
        record.error = e.stack;
        await page
          .screenshot({ path: path.join(dir, "failure.png") })
          .catch(() => {});
      } finally {
        assert.equal(
          sourceFingerprint(),
          fingerprint,
          "Source changed during attempt",
        );
        write(out, "report.json", records);
        await context.tracing.stop({ path: path.join(dir, "trace.zip") });
        await context.close();
      }
      console.log(
        t.id +
          ": " +
          record.status +
          (record.error ? " " + record.error.split("\n")[0] : ""),
      );
    }
  } finally {
    await browser.close();
  }
  console.log("Live evidence: " + out);
  if (records.some((r) => r.status === "failed")) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
