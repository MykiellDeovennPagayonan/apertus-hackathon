/** Full browser -> API -> planner transport -> runtime tests with deterministic model responses. */
const assert = require("node:assert/strict");
const http = require("node:http");
const { spawn, execFile } = require("node:child_process");
const { promisify } = require("node:util");
const path = require("node:path");
const fs = require("node:fs");
const { chromium } = require("playwright");
const create = (ref, parameters) => ({
  schemaVersion: 1,
  operation: "create",
  composition: { ref: `compositions/${ref}`, version: 1 },
  parameters,
  message: "Set up experiment",
});
async function main() {
  const requests = [];
  const provider = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    const payload = JSON.parse(body),
      { prompt, context } = JSON.parse(payload.messages[1].content);
    requests.push({ prompt, context });
    if (prompt === "delayed edit")
      await new Promise((resolve) => setTimeout(resolve, 600));
    let plan;
    if (!context) {
      if (/3\/4/.test(prompt))
        plan = create("FractionBuilderExperiment", {
          bars: [
            { n: 3, d: 4 },
            { n: 0, d: 4 },
          ],
        });
      else if (/share/.test(prompt))
        plan = create("EqualGroupsExperiment", {
          task: { mode: "share", groups: 3, perGroup: 0, total: 14 },
          looping: false,
        });
      else if (/rectangle/.test(prompt))
        plan = create("AreaPerimeterExperiment", { width: 6, height: 4 });
      else if (/bridge/.test(prompt))
        plan = create("BridgeExperiment", { loadPos: 0.5, loadTons: 10 });
      else
        plan = create("AngleComparisonExperiment", {
          angles: [30, 60],
          speed: 20,
          gravityPreset: "Moon",
        });
    } else if (/unsupported/i.test(prompt))
      plan = {
        schemaVersion: 1,
        operation: "unsupported",
        message: "A chemistry provider is unavailable.",
      };
    else if (/bad batch/i.test(prompt))
      plan = {
        schemaVersion: 1,
        operation: "edit",
        sessionId: context.sessionId,
        expectedRevision: context.revision,
        commands: [
          {
            target: "session",
            action: "SET_BAR_FRACTION",
            arguments: { value: { bar: 0, fraction: { n: 1, d: 2 } } },
          },
          {
            target: "session",
            action: "SUBDIVIDE_FRACTION",
            arguments: { value: { bar: 0, factor: 12 } },
          },
        ],
        message: "Invalid relational edit",
      };
    else
      plan = {
        schemaVersion: 1,
        operation: "edit",
        sessionId: context.sessionId,
        expectedRevision: context.revision,
        commands: [
          {
            target: "projectile/secondary",
            action: "SET_VELOCITY",
            arguments: { value: 25 },
          },
        ],
        message: "Speed up second projectile",
      };
    res.setHeader("Content-Type", "application/json");
    res.end(
      JSON.stringify({
        choices: [
          { finish_reason: "stop", message: { content: JSON.stringify(plan) } },
        ],
      }),
    );
  });
  await new Promise((resolve) => provider.listen(0, "127.0.0.1", resolve));
  const probe = http.createServer();
  await new Promise((resolve) => probe.listen(0, "127.0.0.1", resolve));
  const port = probe.address().port;
  await new Promise((resolve) => probe.close(resolve));
  const testEnv = {
    ...process.env,
    APERTUS_BROWSER_TEST_DIR: ".next-browser-tests",
    APERTUS_PROVIDER: "local",
    APERTUS_LOCAL_BASE_URL: `http://127.0.0.1:${provider.address().port}/v1`,
    APERTUS_TIMEOUT_MS: "10000",
  };
  const root = path.resolve(__dirname, "..");
  const generatedInputs = ["tsconfig.json", "next-env.d.ts"].map((name) => ({
    file: path.join(root, name),
    before: fs.existsSync(path.join(root, name))
      ? fs.readFileSync(path.join(root, name), "utf8")
      : null,
    generated: null,
  }));
  let app,
    browser,
    output = "";
  try {
    const build = await promisify(execFile)(
      process.execPath,
      [require.resolve("next/dist/bin/next"), "build", "--webpack"],
      { cwd: path.resolve(__dirname, ".."), env: testEnv, timeout: 60000 },
    );
    output = build.stdout + build.stderr;
    for (const input of generatedInputs) {
      input.generated = fs.existsSync(input.file)
        ? fs.readFileSync(input.file, "utf8")
        : null;
      if (input.before !== null && input.generated !== input.before)
        fs.writeFileSync(input.file, input.before);
    }
    app = spawn(
      process.execPath,
      [
        require.resolve("next/dist/bin/next"),
        "start",
        "--hostname",
        "127.0.0.1",
        "--port",
        String(port),
      ],
      {
        cwd: path.resolve(__dirname, ".."),
        env: testEnv,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    app.stdout.on("data", (chunk) => {
      output += chunk;
    });
    app.stderr.on("data", (chunk) => {
      output += chunk;
    });
    const base = `http://127.0.0.1:${port}`;
    let ready = false;
    const deadline = Date.now() + 60000;
    while (Date.now() < deadline) {
      try {
        const response = await fetch(base, {
          signal: AbortSignal.timeout(5000),
        });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {}
      if (app.exitCode !== null)
        throw new Error("Test app exited before startup");
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready)
      throw new Error("Test app failed to become ready within 60 seconds");
    const executable =
      process.env.BROWSER_EXECUTABLE_PATH ??
      (fs.existsSync(chromium.executablePath())
        ? undefined
        : fs.existsSync(
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
            )
          ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
          : undefined);
    browser = await chromium.launch({
      headless: true,
      ...(executable ? { executablePath: executable } : {}),
    });
    const page = await browser.newPage({
        viewport: { width: 1280, height: 900 },
      }),
      errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(base);
    await page.getByRole("link", { name: "Explore the experiments ↗" }).click();
    await page.getByRole("heading", { name: "Pick an experiment." }).waitFor();
    assert.equal(await page.locator(".experiment-catalog__card").count(), 12);
    await page.getByRole("link", { name: /Projectile motion/ }).click();
    await page
      .getByText("Experiment ready. Initial configuration applied.")
      .waitFor();
    assert.equal(
      requests.length,
      0,
      "Premade experiments load without inference",
    );
    await page.getByRole("button", { name: "Reset", exact: true }).waitFor();
    const table = page.getByRole("table");
    await table.waitFor();
    assert.equal(await table.getByRole("row").count(), 3);
    const secondary = table
      .getByRole("row")
      .filter({ hasText: "projectile/secondary" });
    assert.match(await secondary.innerText(), /60\s+20/);
    await page
      .getByPlaceholder("Ask Apertus to change something...")
      .fill("Make the second one faster");
    await page
      .getByPlaceholder("Ask Apertus to change something...")
      .press("Enter");
    await page
      .getByText("Requested changes applied to the experiment.")
      .waitFor();
    assert.match(await secondary.innerText(), /60\s+25/);
    const primary = table
      .getByRole("row")
      .filter({ hasText: "projectile/primary" });
    assert.match(await primary.innerText(), /30\s+20/);
    await page.getByLabel("Show projectile/secondary trajectory").uncheck();
    assert.match(await secondary.innerText(), /60\s+25/);
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    assert.match(await secondary.innerText(), /60\s+20/);
    await page
      .getByText("Inspect projectile/secondary", { exact: true })
      .click();
    await page.getByLabel("projectile/secondary speed").fill("28");
    assert.match(await secondary.innerText(), /60\s+28/);
    await page
      .getByPlaceholder("Ask Apertus to change something...")
      .fill("Unsupported chemistry");
    await page
      .getByPlaceholder("Ask Apertus to change something...")
      .press("Enter");
    await page.getByText("A chemistry provider is unavailable.").waitFor();
    assert.match(await secondary.innerText(), /60\s+28/);
    await page
      .getByPlaceholder("Ask Apertus to change something...")
      .fill("delayed edit");
    const delayedRequest = page.waitForRequest((request) =>
      request.url().endsWith("/api/apertus"),
    );
    await page
      .getByPlaceholder("Ask Apertus to change something...")
      .press("Enter");
    await delayedRequest;
    await page.getByRole("button", { name: "Reset", exact: true }).click();
    await page.getByText(/No changes applied.*Stale/).waitFor();
    assert.match(await secondary.innerText(), /60\s+20/);
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name: "Save recipe" }).click();
    const file = await (await download).path();
    assert.equal(JSON.parse(fs.readFileSync(file, "utf8")).schemaVersion, 1);
    await page.getByRole("button", { name: "← Experiments" }).click();
    await page.getByRole("heading", { name: "Pick an experiment." }).waitFor();
    assert.equal(await page.locator("input[type=file]").count(), 0);
    await page.goto(`${base}/experiments?experiment=fraction-builder`);
    await page
      .getByText("Experiment ready. Initial configuration applied.")
      .waitFor();
    await page.getByRole("button", { name: "Reset", exact: true }).waitFor();
    const bar = page.getByPlaceholder("Ask Apertus to change something...");
    await bar.fill("bad batch");
    await bar.press("Enter");
    await page.getByText(/No changes applied.*Subdivision/).waitFor();
    // Runtime relational failure must leave the rendered 3/4 configuration intact.
    assert.match(await page.locator("main").innerText(), /3\s*[/⁄]\s*4/);
    await page.goto(`${base}/experiments?experiment=equal-groups`);
    await page.locator("main").waitFor();
    await page.getByText(/14/).first().waitFor();
    await page.goto(`${base}/experiments?experiment=area-perimeter`);
    await page.getByRole("table").waitFor();
    assert.match(await page.getByRole("table").innerText(), /24/);
    assert.match(await page.getByRole("table").innerText(), /20/);
    await page.goto(`${base}/experiments?experiment=bridge`);
    await page.getByLabel("Drag bridge load").waitFor();
    const handle = page.getByLabel("Drag bridge load");
    await handle.focus();
    await handle.press("ArrowLeft");
    assert.deepEqual(errors, [], "Browser must not produce runtime errors");
    assert.ok(
      requests.some(
        (r) =>
          r.prompt === "Make the second one faster" &&
          r.context.instances[1].parameters.speed === 20,
      ),
    );
    console.log(
      "Browser creation, targeted edits, reset, visibility, inspector, preservation on errors, recipe export, math and bridge dragging passed.",
    );
  } catch (error) {
    console.error(output.slice(-4000));
    throw error;
  } finally {
    await browser?.close();
    app?.kill("SIGTERM");
    provider.closeAllConnections();
    await new Promise((resolve) => provider.close(resolve));
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
