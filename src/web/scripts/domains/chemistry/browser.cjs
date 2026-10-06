// Supplemental LIVE Playwright CLI checks. Plan 006 requires MCP for qualifying acceptance.
// No request interception, fixture responses, cached inference, or injected runtime state.
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const raw =
  process.env.CHEMISTRY_RAW_DIR || "/private/tmp/apertus-006-chemistry-live";
const base = process.env.CHEMISTRY_BASE_URL || "http://localhost:43112";
fs.mkdirSync(raw, { recursive: true });
const cases = [
  {
    id: "DIL-001",
    provider: "Dilution",
    prompt: "What happens to salt water when I add more water?",
    followup: "Add another litre of water.",
  },
  {
    id: "CHEM-001",
    provider: "Conservation",
    prompt: "Help me see why chemical equations need balancing.",
    followup: "Balance it.",
  },
  {
    id: "RATE-001",
    provider: "ReactionRate",
    prompt: "Why do reactions happen faster when it’s warmer?",
    followup: "Compare it at 320 kelvin.",
  },
];
const report = {
  qualifying: false,
  reason:
    "Supplemental Playwright CLI, not Playwright MCP; not a complete fifteen-case acceptance round",
  mode: "fresh-real-models",
  startedAt: new Date().toISOString(),
  feedbackBudgetMs: 3000,
  requestBudgetMs: 190000,
  cases: [],
};
const near = (a, b) =>
  assert.ok(Math.abs(a - b) <= 1e-9 + 1e-6 * Math.abs(b), `${a} != ${b}`);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    for (const width of process.env.CHEMISTRY_WIDTH
      ? [Number(process.env.CHEMISTRY_WIDTH)]
      : [1440, 390]) {
      for (const c of cases.filter(
        (c) =>
          !process.env.CHEMISTRY_CASE || c.id === process.env.CHEMISTRY_CASE,
      )) {
        const record = {
          id: c.id,
          width,
          height: width === 390 ? 844 : 900,
          requests: [],
          assertions: [],
          errors: [],
          result: "running",
        };
        report.cases.push(record);
        const context = await browser.newContext({
          viewport: { width, height: record.height },
          reducedMotion: "reduce",
        });
        const page = await context.newPage();
        page.on("pageerror", (error) => record.errors.push(error.message));
        const snapshot = () =>
          page.evaluate(() => window.__experimentSnapshot());
        const send = async (prompt) => {
          console.log(`${c.id} ${width}: submitting ${prompt}`);
          const input = page.locator(".command-bar__input");
          await input.fill(prompt);
          const submit = page.locator(".command-bar__send");
          await submit.waitFor({ state: "visible" });
          const pending = page.waitForResponse(
            (r) =>
              r.url().endsWith("/api/apertus") &&
              r.request().method() === "POST",
            { timeout: report.requestBudgetMs },
          );
          pending.catch(() => {});
          const started = Date.now();
          await submit.click();
          const response = await pending,
            payload = await response.json();
          const id = response.headers()["x-request-id"];
          const entry = {
            prompt,
            submittedAt: new Date(started).toISOString(),
            elapsedMs: Date.now() - started,
            status: response.status(),
            correlationId: id,
            operation: payload.operation,
          };
          record.requests.push(entry);
          if (id) {
            const diagnostic = await context.request.get(
              `${base}/api/planner-diagnostics?id=${encodeURIComponent(id)}`,
            );
            if (diagnostic.ok()) {
              const trace = await diagnostic.json();
              entry.modelConfiguration = trace.configuration;
              entry.events = trace.events.map((e) => ({
                event: e.event,
                elapsedMs: e.elapsedMs,
              }));
              entry.selections = trace.events
                .filter((e) => e.event === "layaSelection")
                .map((e) => e.data);
              entry.teachingIntent = trace.events.find(
                (e) => e.event === "teachingIntent",
              )?.data;
              entry.stagedValidation = trace.events.find(
                (e) => e.event === "stagedValidation",
              )?.data;
            }
          }
          assert.equal(response.status(), 200, JSON.stringify(payload));
          assert.ok(
            ["create", "edit"].includes(payload.operation),
            JSON.stringify(payload),
          );
          await page.waitForFunction(() =>
            Boolean(window.__experimentSnapshot?.().state?.instances?.length),
          );
          await page.locator(".chemistry-experiment").first().waitFor();
          if (payload.operation === "create") {
            const events = entry.events?.map((e) => e.event) ?? [];
            for (const event of [
              "teachingIntent",
              "layaSelection",
              "configuration",
              "stagedValidation",
            ])
              assert.ok(
                events.includes(event),
                `Missing fresh provenance ${event}`,
              );
          }
          await page.waitForTimeout(250);
          const s = await snapshot();
          entry.committedRevision = s.context.revision;
          entry.acceptedAssembly = s.recipe.assembly;
          return s.state.instances[0].outputs;
        };
        try {
          await page.goto(`${base}/`);
          let o = await send(c.prompt);
          assert.equal(
            (await snapshot()).state.instances.length,
            1,
            "Canonical prompt requires one editable object, not extra before/after snapshots",
          );
          assert.equal(
            (await snapshot()).state.instances[0].provider,
            `prefabs/chemistry/${c.provider}`,
          );
          if (c.id === "DIL-001") {
            near(o.saltMass, 10);
            near(o.volume, 1);
            near(o.concentration, 10);
          }
          if (c.id === "CHEM-001") {
            assert.equal(o.equation, "H₂ + O₂ → H₂O");
            assert.equal(o.balanced, false);
          }
          if (c.id === "RATE-001") {
            near(o.temperature, 300);
            near(o.rateConstant, 0.1);
            near(o.halfLife, 6.931471805599453);
            assert.equal(o.playing, false);
          }
          record.assertions.push(
            "Fresh real-model creation, committed provider, canonical defaults and required provenance",
          );
          await page.screenshot({
            path: path.join(raw, `${c.id}-${width}-initial.png`),
            fullPage: true,
          });
          o = await send(c.followup);
          if (c.id === "DIL-001") {
            near(o.saltMass, 10);
            near(o.volume, 2);
            near(o.concentration, 5);
          }
          if (c.id === "CHEM-001") {
            assert.equal(o.equation, "2H₂ + O₂ → 2H₂O");
            assert.equal(o.balanced, true);
            assert.deepEqual(
              o.atoms.map((a) => [a.element, a.left, a.right]),
              [
                ["H", 4, 4],
                ["O", 2, 2],
              ],
            );
          }
          if (c.id === "RATE-001") {
            near(o.temperature, 320);
            near(o.rateConstant, 0.2724610262406092);
            near(o.halfLife, 2.5440232319606326);
            near(o.elapsed, 0);
            near(o.concentrationA + o.concentrationB, 1);
            await page
              .getByRole("button", { name: "Step 1 s", exact: true })
              .click();
            near((await snapshot()).state.instances[0].outputs.elapsed, 1);
          }
          record.assertions.push(
            "Exact live follow-up and independent expected numerical outputs",
          );
          await page.screenshot({
            path: path.join(raw, `${c.id}-${width}-followup.png`),
            fullPage: true,
          });
          const root = page.locator(".chemistry-experiment");
          const reset = root.getByRole("button", {
            name: "Reset experiment",
            exact: true,
          });
          await reset.click();
          const s = await snapshot();
          assert.deepEqual(s.state.instances, s.state.initial);
          await reset.focus();
          await page.keyboard.press("Tab");
          assert.ok(
            ["INPUT", "BUTTON", "SUMMARY", "TEXTAREA", "A"].includes(
              await page.evaluate(() => document.activeElement.tagName),
            ),
          );
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth + 1,
            ),
            false,
            "Page overflows horizontally",
          );
          assert.equal(
            await root
              .locator("button, input")
              .evaluateAll(
                (els) =>
                  els.filter((e) => e.getBoundingClientRect().height < 44)
                    .length,
              ),
            0,
            "Touch targets under 44px",
          );
          assert.deepEqual(record.errors, []);
          record.assertions.push(
            "Reset, keyboard access, reduced-motion step, 44px targets, no horizontal overflow, no page errors",
          );
          record.result = "passed";
        } catch (error) {
          record.result = "failed";
          record.error = error.message;
          await page
            .screenshot({
              path: path.join(raw, `${c.id}-${width}-failure.png`),
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
          `${c.id} ${width}: ${record.result}${record.error ? `: ${record.error}` : ""}`,
        );
      }
    }
  } finally {
    await browser.close();
  }
  if (report.cases.some((c) => c.result !== "passed")) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
