// Supplemental Playwright CLI; never qualifying MCP acceptance evidence.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { load } = require("../../test-loader.cjs");
const { defaultAssembly } = load("src/simulations/runtime/assembly.ts");
const live = process.argv.includes("--live");
const rawDir =
  process.env.AGENT_A_RAW_DIR || "/private/tmp/apertus-006-agent-a-browser";
fs.mkdirSync(rawDir, { recursive: true });
const cases = [
  {
    id: "ALG-001",
    provider: "Equation",
    prompt: "Show me how to solve 2x + 3 = 11.",
    followups: ["Subtract 3 from both sides.", "Divide both sides by 2."],
  },
  {
    id: "LINE-001",
    provider: "Line",
    prompt: "What happens to a line when I change its slope?",
    followups: ["Make the slope 2 and the intercept 3."],
  },
  {
    id: "PI-001",
    provider: "Circle",
    prompt: "Why is pi the same for every circle?",
    followups: ["Double the radius."],
  },
];
const report = {
  qualifying: false,
  mode: live ? "fresh-live-model-cli" : "mock-ui-cli",
  startedAt: new Date().toISOString(),
  cases: [],
};
const near = (a, b) =>
  assert.ok(Math.abs(a - b) < 1e-6 * Math.max(1, Math.abs(b)), `${a} != ${b}`);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    for (const width of process.env.AGENT_A_WIDTH
      ? [Number(process.env.AGENT_A_WIDTH)]
      : [1440, 390])
      for (const c of cases.filter(
        (c) => !process.env.AGENT_A_CASE || c.id === process.env.AGENT_A_CASE,
      )) {
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        const record = {
          id: c.id,
          width,
          requests: [],
          errors: [],
          assertions: [],
          result: "running",
        };
        report.cases.push(record);
        page.on("pageerror", (e) => record.errors.push(e.message));
        if (!live)
          await page.route("**/api/apertus", async (route) => {
            const input = route.request().postDataJSON();
            let plan;
            if (!input.demo)
              plan = {
                schemaVersion: 1,
                operation: "create",
                composition: {
                  ref: "assemblies/GeneratedExperiment",
                  version: 1,
                },
                parameters: {},
                assembly: defaultAssembly(
                  `prefabs/math-foundations/${c.provider}`,
                ),
                message: "Mock UI fixture; not model evidence.",
              };
            else {
              const target = input.context.instances[0].id;
              const command = (action, value) => ({
                target,
                action,
                arguments: { value },
              });
              const commands =
                input.prompt === "Subtract 3 from both sides."
                  ? [command("SUBTRACT_BOTH", 3)]
                  : input.prompt === "Divide both sides by 2."
                    ? [command("DIVIDE_BOTH", 2)]
                    : c.provider === "Line"
                      ? [command("SET_SLOPE", 2), command("SET_INTERCEPT", 3)]
                      : [command("SET_RADIUS", 2)];
              plan = {
                schemaVersion: 1,
                operation: "edit",
                sessionId: input.context.sessionId,
                expectedRevision: input.context.revision,
                commands,
                message: "Apply requested fixture edit.",
              };
            }
            await route.fulfill({
              json: plan,
              headers: { "x-request-id": "mock-ui-only" },
            });
          });
        const snapshot = () =>
          page.evaluate(() => window.__experimentSnapshot());
        const send = async (prompt) => {
          const started = Date.now();
          const submit = page.locator(".command-bar").getByRole("button", {
            name: /^(Create|Apply)/,
          });
          await submit.waitFor({ state: "visible" });
          for (
            let attempt = 0;
            attempt < 20 && !(await submit.isEnabled());
            attempt++
          ) {
            await page.getByRole("textbox").fill(prompt);
            if (!(await submit.isEnabled())) await page.waitForTimeout(250);
          }
          assert.equal(await submit.isEnabled(), true, "Prompt UI did not hydrate");
          const pending = page.waitForResponse(
            (r) =>
              r.url().endsWith("/api/apertus") &&
              r.request().method() === "POST",
            { timeout: 190000 },
          );
          pending.catch(() => {});
          await submit.click({ timeout: 10000 });
          const response = await pending,
            plan = await response.json();
          record.requests.push({
            prompt,
            status: response.status(),
            elapsedMs: Date.now() - started,
            correlationId: response.headers()["x-request-id"],
            plan,
          });
          assert.equal(response.status(), 200, JSON.stringify(plan));
          assert.ok(
            ["create", "edit"].includes(plan.operation),
            JSON.stringify(plan),
          );
          await page
            .getByRole("button", { name: "Reset experiment", exact: true })
            .waitFor();
          await page.waitForTimeout(200);
        };
        try {
          await page.goto(
            process.env.AGENT_A_BASE_URL || "http://localhost:43110/",
          );
          await send(c.prompt);
          let s = await snapshot();
          assert.equal(s.context.instances.length, 1);
          assert.ok(s.recipe.assembly);
          assert.equal(
            s.state.instances[0].provider,
            `prefabs/math-foundations/${c.provider}`,
          );
          if (c.provider === "Equation")
            assert.equal(s.state.instances[0].outputs.equation, "2x + 3 = 11");
          if (c.provider === "Line") {
            near(s.state.instances[0].outputs.yAtZero, 0);
            near(s.state.instances[0].outputs.yAtOne, 1);
          }
          if (c.provider === "Circle") {
            near(s.state.instances[0].outputs.radius, 1);
            near(s.state.instances[0].outputs.ratio, Math.PI);
          }
          await page.screenshot({
            path: path.join(rawDir, `${c.id}-${width}-initial.png`),
            fullPage: true,
          });
          record.assertions.push(
            "Canonical defaults, compiled recipe and implemented provider",
          );
          for (const followup of c.followups) {
            await send(followup);
            s = await snapshot();
            if (followup === "Subtract 3 from both sides.")
              assert.equal(s.state.instances[0].outputs.equation, "2x = 8");
          }
          const o = s.state.instances[0].outputs;
          if (c.provider === "Equation") {
            assert.equal(o.equation, "x = 4");
            assert.equal(o.substitution, true);
          }
          if (c.provider === "Line") {
            near(o.yAtZero, 3);
            near(o.yAtOne, 5);
          }
          if (c.provider === "Circle") {
            near(o.diameter, 4);
            near(o.circumference, 12.566370614359172);
            near(o.ratio, Math.PI);
          }
          record.assertions.push(
            "Required followups and independent expected results",
          );
          if (c.provider === "Equation") {
            await page
              .getByLabel("Divide both sides by", { exact: true })
              .fill("0");
            await page
              .getByLabel("Divide both sides by", { exact: true })
              .press("Enter");
            await page
              .getByText("Cannot divide both sides by zero", { exact: true })
              .waitFor();
            assert.equal(
              (await snapshot()).state.instances[0].outputs.equation,
              "x = 4",
            );
            await page.getByRole("button", { name: "Undo last step" }).click();
            assert.equal(
              (await snapshot()).state.instances[0].outputs.equation,
              "2x = 8",
            );
          }
          if (c.provider === "Line") {
            await page.getByLabel("Slope", { exact: true }).fill("-1");
            await page.getByLabel("Slope", { exact: true }).press("Enter");
            near((await snapshot()).state.instances[0].outputs.yAtOne, 2);
          }
          if (c.provider === "Circle") {
            await page
              .getByRole("button", { name: "Unroll circumference" })
              .click();
            await page.getByRole("button", { name: "Show diameter" }).waitFor();
          }
          await page.getByRole("button", { name: "Reset experiment" }).click();
          s = await snapshot();
          assert.deepEqual(s.state.instances, s.state.initial);
          await page.getByRole("button", { name: "Reset experiment" }).focus();
          await page.keyboard.press("Tab");
          assert.ok(
            ["INPUT", "BUTTON", "SUMMARY"].includes(
              await page.evaluate(() => document.activeElement.tagName),
            ),
          );
          assert.equal(
            await page.evaluate(
              () =>
                document.documentElement.scrollWidth > window.innerWidth + 1,
            ),
            false,
            "Horizontal overflow",
          );
          assert.equal(
            await page.evaluate(() => {
              const identity = document.querySelector(".workspace-identity"),
                toolbar = document.querySelector(".workspace-toolbar");
              if (!identity || !toolbar) return true;
              const a = identity.getBoundingClientRect(),
                b = toolbar.getBoundingClientRect();
              return !(
                a.left < b.right &&
                a.right > b.left &&
                a.top < b.bottom &&
                a.bottom > b.top
              );
            }),
            true,
            "Experiment title and toolbar overlap",
          );
          assert.equal(
            await page
              .locator(
                ".math-foundations-experiment button, .math-foundations-experiment input",
              )
              .evaluateAll(
                (elements) =>
                  elements.filter(
                    (el) => el.getBoundingClientRect().height < 44,
                  ).length,
              ),
            0,
          );
          record.assertions.push(
            "Direct controls, reset, keyboard access, 44px targets, no page overflow, reduced-motion static lesson",
          );
          await page.screenshot({
            path: path.join(rawDir, `${c.id}-${width}-reset.png`),
            fullPage: true,
          });
          assert.deepEqual(record.errors, []);
          record.result = "passed";
        } catch (e) {
          record.result = "failed";
          record.error = e.message;
          await page
            .screenshot({
              path: path.join(rawDir, `${c.id}-${width}-failure.png`),
              fullPage: true,
            })
            .catch(() => {});
        } finally {
          await context.close();
          fs.writeFileSync(
            path.join(rawDir, "report.json"),
            JSON.stringify(report, null, 2),
          );
        }
        console.log(
          `${record.id} ${width}: ${record.result}${record.error ? `: ${record.error}` : ""}`,
        );
      }
  } finally {
    await browser.close();
  }
  if (report.cases.some((r) => r.result !== "passed")) process.exitCode = 1;
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
