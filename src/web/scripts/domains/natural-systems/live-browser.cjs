// Fresh real-model development check through the normal UI. No response interception or state injection.
const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");
const base = process.env.NATURAL_BASE_URL || "http://127.0.0.1:43113";
const raw =
  process.env.NATURAL_RAW_DIR || "/private/tmp/apertus-006-agent-d-live";
fs.mkdirSync(raw, { recursive: true });
const cases = [
  {
    id: "DIFF-001",
    provider: "DiffusionField",
    prompt: "Show me how a drop of dye spreads through water.",
    followup: "Make the dye spread twice as fast.",
  },
  {
    id: "ECO-001",
    provider: "PredatorPrey",
    prompt: "What happens to foxes when there are fewer rabbits?",
    followup: "Start with half as many rabbits.",
  },
  {
    id: "PLANT-001",
    provider: "PlantGrowth",
    prompt: "Will a plant keep growing faster if I give it more light?",
    followup: "Give it more light but keep the water the same.",
  },
];
const report = {
  qualifying: false,
  reason:
    "Agent D development live-model check; not a complete fifteen-prompt round or Playwright MCP acceptance",
  startedAt: new Date().toISOString(),
  cases: [],
};
const near = (actual, expected) => {
  if (Math.abs(actual - expected) > 1e-9 + 1e-6 * Math.abs(expected))
    throw new Error(`${actual} != ${expected}`);
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    for (const width of process.env.NATURAL_WIDTH
      ? [Number(process.env.NATURAL_WIDTH)]
      : [1440, 390])
      for (const spec of cases.filter(
        (entry) => !process.env.NATURAL_CASE || entry.id === process.env.NATURAL_CASE,
      )) {
        const record = {
          id: spec.id,
          width,
          requests: [],
          assertions: [],
          errors: [],
          result: "running",
        };
        report.cases.push(record);
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => record.errors.push(error.message));
        const snapshot = () =>
          page.evaluate(() => window.__experimentSnapshot());
        const send = async (prompt, expected) => {
          await page.locator(".command-bar__input").fill(prompt);
        const pending = page.waitForResponse(
            (response) =>
              response.url().endsWith("/api/apertus") &&
              response.request().method() === "POST",
          { timeout: 190000 },
        );
        pending.catch(() => {});
          const started = Date.now();
          await page.locator(".command-bar__send").click();
          await page.locator(".command-bar__stop").waitFor({ timeout: 3000 });
          const response = await pending;
          const payload = await response.json();
          const correlationId = response.headers()["x-request-id"];
          const request = {
            prompt,
            status: response.status(),
            operation: payload.operation,
            latencyMs: Date.now() - started,
            correlationId,
          };
          if (correlationId) {
            const diagnostics = await context.request.get(
              `${base}/api/planner-diagnostics?id=${encodeURIComponent(correlationId)}`,
            );
            if (diagnostics.ok()) {
              const trace = await diagnostics.json();
              request.events = trace.events.map((event) => ({
                event: event.event,
                elapsedMs: event.elapsedMs,
                model: event.data?.model,
                question: event.data?.question,
                decision: event.data?.decision,
              }));
            }
          }
          record.requests.push(request);
          if (response.status() !== 200 || payload.operation !== expected)
            throw new Error(JSON.stringify(payload));
        await page
          .locator(".natural-systems-experiment")
          .waitFor({ timeout: 15000 });
        await page.waitForFunction(
          () => typeof window.__experimentSnapshot === "function",
          undefined,
          { timeout: 15000 },
        );
        const current = await snapshot();
          if (expected === "create") {
            for (const event of [
              "teachingIntent",
              "layaSelection",
              "configuration",
              "stagedValidation",
            ])
              if (!request.events?.some((entry) => entry.event === event))
                throw new Error(`Missing ${event}`);
            const laya = request.events.find(
              (entry) =>
                entry.event === "layaSelection" &&
                entry.question === "assembly",
            );
            if (
              !laya?.decision ||
              laya.decision.choice !==
                `prefabs/natural-systems/${spec.provider}`
            )
              throw new Error(
                "Laya did not select the expected natural provider",
              );
            if (current.correlationId !== correlationId)
              throw new Error("Correlation ID did not commit");
          }
          return current;
        };
        try {
        await page.goto(`${base}/`, { timeout: 90000 });
        let current = await send(spec.prompt, "create");
          let instance = current.state.instances[0];
          if (
            current.state.instances.length !== 1 ||
            instance.provider !== `prefabs/natural-systems/${spec.provider}`
          )
            throw new Error("Wrong committed assembly");
          if (spec.id === "DIFF-001") {
            near(instance.parameters.diffusionCoefficient, 0.05);
            near(instance.outputs.totalMass, 1);
            near(instance.outputs.elapsed, 0);
          }
          if (spec.id === "ECO-001") {
            near(instance.parameters.initialRabbits, 40);
            near(instance.parameters.initialFoxes, 9);
            near(instance.outputs.initialRabbitDerivative, 12.8);
            near(instance.outputs.initialFoxDerivative, 0.9);
          }
          if (spec.id === "PLANT-001") {
            near(instance.parameters.light, 0.4);
            near(instance.parameters.water, 0.6);
            near(instance.parameters.nutrients, 0.8);
            near(instance.outputs.growthRate, 0.4);
          }
          record.assertions.push(
            "Exact creation used fresh Apertus intent/configuration, accepted real Laya provider selection, staged validation and canonical defaults",
          );
          await page.screenshot({
            path: path.join(raw, `${spec.id}-${width}-initial.png`),
            fullPage: true,
          });
          current = await send(spec.followup, "edit");
          instance = current.state.instances[0];
          if (spec.id === "DIFF-001") {
            near(instance.parameters.diffusionCoefficient, 0.1);
            near(instance.outputs.comparisonCoefficient, 0.05);
            near(instance.outputs.elapsed, 0);
          }
          if (spec.id === "ECO-001") {
            near(instance.parameters.initialRabbits, 20);
            near(instance.parameters.initialFoxes, 9);
            near(instance.outputs.initialRabbitDerivative, 6.4);
            near(instance.outputs.initialFoxDerivative, -0.9);
          }
          if (spec.id === "PLANT-001") {
            if (instance.parameters.light <= 0.6)
              throw new Error(
                "Follow-up did not raise light above unchanged water",
              );
            near(instance.parameters.water, 0.6);
            near(instance.outputs.growthRate, 0.6);
            if (!instance.outputs.limitingResources.includes("water"))
              throw new Error("Water is not shown as limiting");
          }
          record.assertions.push(
            "Exact follow-up changed the intended instance and retained unrelated settings with independently checked outputs",
          );
          await page.getByRole("button", { name: "Step", exact: true }).click();
          if ((await snapshot()).state.instances[0].outputs.elapsed <= 0)
            throw new Error("Paused step did not advance");
          await page
            .getByRole("button", {
              name: "Reset initial settings",
              exact: true,
            })
            .click();
          current = await snapshot();
          if (
            JSON.stringify(current.state.instances) !==
            JSON.stringify(current.state.initial)
          )
            throw new Error("Reset did not restore accepted recipe");
          if (
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            )
          )
            throw new Error("Horizontal page overflow");
          const short = await page
            .locator(
              ".natural-systems-experiment button, .natural-systems-experiment input",
            )
            .evaluateAll(
              (elements) =>
                elements.filter(
                  (element) =>
                    element.getBoundingClientRect().height > 0 &&
                    element.getBoundingClientRect().height < 44,
                ).length,
            );
          if (short) throw new Error(`${short} controls are shorter than 44px`);
          if (record.errors.length) throw new Error(record.errors.join("; "));
          record.assertions.push(
            "Step, reset, reduced-motion static result, responsive overflow and 44px controls",
          );
          await page.screenshot({
            path: path.join(raw, `${spec.id}-${width}-followup.png`),
            fullPage: true,
          });
          record.result = "passed";
        } catch (error) {
          record.result = "failed";
          record.error = error.message;
          await page
            .screenshot({
              path: path.join(raw, `${spec.id}-${width}-failure.png`),
              fullPage: true,
            })
            .catch(() => {});
        } finally {
          await context.close();
          fs.writeFileSync(
            path.join(raw, "report.json"),
            JSON.stringify(report, null, 2),
          );
        }
        console.log(
          `${spec.id} ${width}: ${record.result}${record.error ? `: ${record.error}` : ""}`,
        );
      }
  } finally {
    await browser.close();
  }
  if (report.cases.some((entry) => entry.result !== "passed"))
    process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
