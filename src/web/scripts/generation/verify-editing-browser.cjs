const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const h = require("./helpers.cjs");

const base = process.env.UX_TEST_URL || "http://127.0.0.1:43110";
const out = process.env.EDITING_EVIDENCE_DIR || "/tmp/apertus-editing-qa";
fs.mkdirSync(out, { recursive: true });

(async () => {
  const browser = await h.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  const responses = new Map();
  await page.route("**/api/apertus", async (route) => {
    const response = await route.fetch({ timeout: 180000 });
    responses.set(route.request().postDataJSON().prompt, await response.text());
    await route.fulfill({ response });
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  const report = [];
  await context.tracing.start({
    screenshots: true,
    snapshots: true,
    sources: true,
  });
  try {
    await page.goto(`${base}/experiments?experiment=projectile`);
    await page.waitForFunction(
      () => Boolean(window.__experimentSnapshot?.()?.recipe),
      { timeout: 60000 },
    );
    await page
      .getByRole("heading", { name: "Projectile motion", exact: true })
      .waitFor();
    await page.screenshot({
      path: path.join(out, "projectile-before.png"),
      fullPage: true,
    });
    for (const scenario of [
      {
        name: "moon",
        prompt: "set the gravity to that of the moon",
        gravity: 1.62,
      },
      { name: "half", prompt: "half the gravity pls", gravity: 0.81 },
    ]) {
      const before = await h.snapshot(page);
      const targets = before.recipe.document.nodes.filter(
        (node) => node.definition === "models/Projectile",
      );
      assert.equal(targets.length, 2);
      const pending = page.waitForResponse(
        (response) =>
          new URL(response.url()).pathname === "/api/apertus" &&
          response.request().postDataJSON()?.prompt === scenario.prompt,
        { timeout: 180000 },
      );
      pending.catch(() => {});
      await page.locator("textarea").fill(scenario.prompt);
      const started = Date.now();
      await page.getByRole("button", { name: "Apply", exact: true }).click();
      const response = await pending;
      const request = response.request().postDataJSON();
      assert.equal(request.purpose, "edit");
      const wire = responses.get(scenario.prompt);
      fs.writeFileSync(
        path.join(out, `${scenario.name}-response.ndjson`),
        wire,
      );
      const frames = response
        .headers()
        ["content-type"].includes("application/x-ndjson")
        ? wire
            .trim()
            .split("\n")
            .map((line) => JSON.parse(line))
        : [];
      const result = frames.length
        ? frames.find((frame) => frame.type === "result")?.result
        : JSON.parse(wire);
      assert.equal(result?.status, "updated", JSON.stringify(result));
      await page.waitForFunction(
        (id) => window.__experimentSnapshot?.()?.requestId === id,
        result.requestId,
        { timeout: 15000 },
      );
      const after = await h.snapshot(page);
      const expected = structuredClone(before.recipe.document);
      for (const node of expected.nodes)
        if (targets.some((target) => target.id === node.id))
          node.configuration.gravity = scenario.gravity;
      assert.deepEqual(
        after.recipe.document,
        expected,
        "Only gravity changes; components, layout, wiring, and lesson are preserved",
      );
      assert.equal(after.sessionId, before.sessionId);
      await page
        .locator(".command-bar__status--success")
        .filter({ hasText: /Updated gravity/ })
        .waitFor();
      assert.ok(
        !(await page.locator("body").innerText()).includes(
          "Couldn't complete the simulation change",
        ),
      );
      for (const target of targets)
        assert.equal(
          after.state.state[target.id].gravity,
          scenario.gravity,
          "The live physics uses the new gravity",
        );
      assert.ok(
        !frames.some(
          (frame) =>
            frame.type === "progress" &&
            ["choosing", "building"].includes(frame.stage),
        ),
        "Editing must not report creation stages",
      );
      const diagnostic = await page.request.get(
        `${base}/api/planner-diagnostics?id=${encodeURIComponent(result.requestId)}`,
      );
      assert.equal(diagnostic.status(), 200);
      const trace = await diagnostic.json();
      fs.writeFileSync(
        path.join(out, `${scenario.name}-trace.json`),
        JSON.stringify(trace, null, 2),
      );
      assert.ok(
        !trace.events.some(({ event }) =>
          [
            "bucket",
            "selection.start",
            "composition.decision",
            "turn.start",
          ].includes(event),
        ),
      );
      const calls = trace.events.filter(
        ({ event, data }) =>
          event.endsWith(".inference") && data.maxTokens !== 96,
      );
      if (scenario.name === "half")
        assert.equal(
          calls.length,
          1,
          "Relative arithmetic is computed by the application after intent interpretation",
        );
      await page.screenshot({
        path: path.join(out, `projectile-${scenario.name}.png`),
        fullPage: true,
      });
      report.push({
        prompt: scenario.prompt,
        status: result.status,
        gravity: scenario.gravity,
        elapsedMs: Date.now() - started,
        modelCalls: calls.length,
        nodes: after.recipe.document.nodes.length,
      });
      console.log(JSON.stringify(report.at(-1)));
    }
    assert.deepEqual(errors, [], "No browser runtime errors");
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(`Live Playwright editing QA passed. Evidence: ${out}`);
  } catch (error) {
    await page
      .screenshot({ path: path.join(out, "failure.png"), fullPage: true })
      .catch(() => {});
    fs.writeFileSync(
      path.join(out, "failure.txt"),
      `${error.stack}\n\n${await page
        .locator("body")
        .innerText()
        .catch(() => "")}`,
    );
    throw error;
  } finally {
    await context.tracing.stop({
      path: path.join(out, "playwright-trace.zip"),
    });
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
