// Supplemental Playwright CLI only. This cannot satisfy the Playwright MCP gate.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs"),
  path = require("node:path");
const live = process.argv.includes("--live");
const output = path.resolve(
  process.env.CREATION_EVIDENCE_DIR || "/tmp/005-browser",
);
fs.mkdirSync(output, { recursive: true });
const suite = {
  qualifying: false,
  mode: live ? "live-model-cli" : "mock-ui-cli",
  startedAt: new Date().toISOString(),
  cases: [],
};
const configs = {
  division: {
    prompt: "Show me how division works",
    ref: "EqualGroupsExperiment",
    parameters: {
      task: { mode: "share", total: 12, groups: 3, perGroup: 0 },
      looping: false,
    },
  },
  ball: {
    prompt: "Show me how throwing a ball works",
    ref: "ProjectileExperiment",
    parameters: { angle: 45, speed: 20, gravityPreset: "Earth" },
  },
  gas: {
    prompt: "Show me how gas pressure works",
    ref: "GasPressureExperiment",
    parameters: { amount: 1, temperature: 300, volume: 1, playing: true },
  },
};
const near = (a, b) =>
  assert.ok(Math.abs(a - b) <= 1e-6 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    for (const width of [1440, 390])
      for (const [name, c] of Object.entries(configs)) {
        const context = await browser.newContext({
            viewport: { width, height: width === 390 ? 844 : 900 },
          }),
          page = await context.newPage();
        const record = {
          name,
          width,
          status: "running",
          requests: [],
          checks: [],
          errors: [],
          network: [],
        };
        suite.cases.push(record);
        const dir = path.join(output, `${name}-${width}`);
        fs.mkdirSync(dir, { recursive: true });
        await context.tracing.start({ screenshots: true, snapshots: true });
        page.on("pageerror", (e) => record.errors.push(e.message));
        page.on("requestfailed", (r) =>
          record.network.push({
            url: r.url().split("?")[0],
            error: r.failure()?.errorText,
          }),
        );
        if (!live)
          await page.route("**/api/apertus", async (route) => {
            const r = route.request().postDataJSON();
            let result;
            if (!r.demo)
              result = {
                schemaVersion: 1,
                operation: "create",
                composition: { ref: `compositions/${c.ref}`, version: 1 },
                parameters: c.parameters,
                message: "Educational defaults.",
              };
            else {
              const cmd = (action, value, target = "session") => ({
                target,
                action,
                arguments: { value },
              });
              const changes = {
                "What about leftovers?": [
                  cmd("SET_GROUPING_TASK", {
                    mode: "share",
                    total: 14,
                    groups: 3,
                    perGroup: 0,
                  }),
                ],
                "Compare 30 and 60 degrees.": [
                  cmd("SET_ANGLE", 30, "projectile/primary"),
                  cmd("COMPARE_ANGLE", 60),
                ],
                "Change only the second ball to 45 degrees.": [
                  cmd("SET_ANGLE", 45, "projectile/secondary"),
                ],
                "Heat it up.": [cmd("SET_TEMPERATURE", 350)],
                "Add more gas.": [cmd("SET_AMOUNT", 1.5)],
              };
              result = changes[r.prompt]
                ? {
                    schemaVersion: 1,
                    operation: "edit",
                    sessionId: r.context.sessionId,
                    expectedRevision: r.context.revision,
                    commands: changes[r.prompt],
                    message: "Educational change.",
                  }
                : {
                    schemaVersion: 1,
                    operation: "explain",
                    message:
                      "Pressure increased when volume decreased; temperature and amount stayed fixed.",
                  };
            }
            await route.fulfill({
              json: result,
              headers: { "x-request-id": "mock-ui-only" },
            });
          });
        const snap = () => page.evaluate(() => window.__experimentSnapshot());
        const check = async (label) => {
          const s = await snap();
          record.checks.push({ label, state: s });
          return s.state;
        };
        const send = async (prompt) => {
          const started = Date.now(),
            pending = page.waitForResponse(
              (r) =>
                r.url().endsWith("/api/apertus") &&
                r.request().method() === "POST",
              { timeout: 125000 },
            );
          await page.getByRole("textbox").fill(prompt);
          await page.getByRole("button", { name: "Send", exact: true }).click();
          const response = await pending,
            plan = await response.json(),
            id = response.headers()["x-request-id"];
          record.requests.push({
            prompt,
            id,
            status: response.status(),
            elapsedMs: Date.now() - started,
            plan,
          });
          if (live && id) {
            const trace = await page.request.get(
              `http://127.0.0.1:3000/api/planner-diagnostics?id=${id}`,
            );
            fs.writeFileSync(
              path.join(dir, `inference-${record.requests.length}.json`),
              await trace.text(),
            );
          }
          assert.equal(response.status(), 200, JSON.stringify(plan));
          assert.ok(
            !["clarify", "unsupported"].includes(plan.operation),
            JSON.stringify(plan),
          );
          await page.waitForFunction(
            () =>
              !document.querySelector('button[aria-label="Send"]')?.disabled,
          );
        };
        const slider = async (label, value, min, step) => {
          const s = page.getByRole("slider", { name: label, exact: true });
          await s.focus();
          await s.press("Home");
          for (let i = 0; i < Math.round((value - min) / step); i++)
            await s.press("ArrowRight");
        };
        const reset = () =>
          page.getByRole("button", { name: "Reset", exact: true }).click();
        const share = async () => {
          await page
            .getByRole("button", { name: "Share", exact: true })
            .click();
          await page
            .getByRole("status")
            .filter({ hasText: "Sharing complete" })
            .waitFor({ timeout: 30000 });
        };
        try {
          await page.goto("http://127.0.0.1:3000/experiments");
          await send(c.prompt);
          await page
            .getByRole("button", { name: "Reset", exact: true })
            .waitFor();
          let s = await check("initial");
          await page.screenshot({
            path: path.join(dir, "initial.png"),
            fullPage: true,
          });
          if (name === "division") {
            assert.equal(s.board.total, 12);
            assert.equal(s.board.groups, 3);
            await share();
            s = await check("12/3");
            assert.deepEqual(
              [0, 1, 2].map(
                (i) => s.board.tokens.filter((t) => t.zone === i).length,
              ),
              [4, 4, 4],
            );
            await send("What about leftovers?");
            await share();
            s = await check("14/3");
            assert.equal(s.board.tokens.filter((t) => t.zone < 0).length, 2);
            const input = page.getByRole("spinbutton", {
              name: "Counters",
              exact: true,
            });
            await input.fill("15");
            await input.press("Enter");
            await share();
            s = await check("15/3");
            assert.deepEqual(
              [0, 1, 2].map(
                (i) => s.board.tokens.filter((t) => t.zone === i).length,
              ),
              [5, 5, 5],
            );
            await reset();
            assert.equal((await check("reset")).board.total, 12);
          } else if (name === "ball") {
            assert.equal(s.angle, 45);
            assert.equal(s.velocity, 20);
            near(s.gravity, 9.81);
            near(s.primary.metrics.range, 40.7747196738);
            near(s.primary.metrics.maxHeight, 10.1936799185);
            await slider("Angle", 30, 0, 1);
            s = await check("30 degrees");
            near(s.primary.metrics.range, 35.311943069);
            near(s.primary.metrics.maxHeight, 5.096839959);
            await send("Compare 30 and 60 degrees.");
            s = await check("comparison");
            assert.equal(s.instances.length, 2);
            near(s.instances[0].metrics.range, s.instances[1].metrics.range);
            near(s.instances[1].metrics.maxHeight, 15.2905198777);
            await send("Change only the second ball to 45 degrees.");
            s = await check("targeted edit");
            assert.equal(s.instances[0].launch.angle, 30);
            assert.equal(s.instances[1].launch.angle, 45);
            assert.ok(s.instances.every((i) => i.launch.velocity === 20));
            await reset();
            assert.equal((await check("reset")).instances.length, 1);
          } else {
            near(s.metrics.pressureKPa, 2.4943387854);
            assert.equal(s.particles.length, 40);
            await page.waitForFunction(
              (p) =>
                JSON.stringify(
                  window.__experimentSnapshot().state.particles,
                ) !== p,
              JSON.stringify(s.particles),
            );
            await slider("Volume", 0.5, 0.25, 0.05);
            near(
              (await check("half volume")).metrics.pressureKPa,
              4.9886775708,
            );
            await reset();
            await send("Heat it up.");
            s = await check("heat");
            assert.equal(s.inputs.temperature, 350);
            assert.equal(s.inputs.volume, 1);
            assert.equal(s.inputs.amount, 1);
            near(s.metrics.pressureKPa, 2.9100619163);
            await reset();
            await send("Add more gas.");
            s = await check("add gas");
            assert.equal(s.inputs.amount, 1.5);
            assert.equal(s.inputs.temperature, 300);
            near(s.metrics.pressureKPa, 3.7415081781);
            await page
              .getByRole("button", { name: "Pause motion", exact: true })
              .click();
            const paused = (await snap()).state.particles;
            await page.evaluate(
              () =>
                new Promise((resolve) =>
                  requestAnimationFrame(() => requestAnimationFrame(resolve)),
                ),
            );
            assert.deepEqual((await snap()).state.particles, paused);
            await slider("Volume", 0.5, 0.25, 0.05);
            s = await check("paused volume edit");
            near(s.metrics.pressureKPa, 7.4830163562);
            assert.deepEqual(s.particles, paused);
            assert.ok(
              s.particles.every(
                (p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1,
              ),
            );
            await send("Why did the pressure increase?");
            assert.equal(record.requests.at(-1).plan.operation, "explain");
            await reset();
            s = await check("reset");
            assert.equal(s.inputs.amount, 1);
            assert.equal(s.inputs.temperature, 300);
            assert.equal(s.inputs.volume, 1);
          }
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            "Horizontal page overflow",
          );
          assert.deepEqual(record.errors, []);
          await page.screenshot({
            path: path.join(dir, "final.png"),
            fullPage: true,
          });
          record.status = "passed";
        } catch (e) {
          record.status = "failed";
          record.error = e.stack;
          await page.screenshot({
            path: path.join(dir, "failure.png"),
            fullPage: true,
          });
          process.exitCode = 1;
        } finally {
          fs.writeFileSync(
            path.join(dir, "result.json"),
            JSON.stringify(record, null, 2),
          );
          await context.tracing.stop({ path: path.join(dir, "trace.zip") });
          await context.close();
        }
        console.log(
          `${suite.mode}: ${name} ${width}: ${record.status} ${record.error?.split("\n")[0] || ""}`,
        );
      }
  } finally {
    await browser.close();
    suite.finishedAt = new Date().toISOString();
    fs.writeFileSync(
      path.join(output, "suite.json"),
      JSON.stringify(suite, null, 2),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
