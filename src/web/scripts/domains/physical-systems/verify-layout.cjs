// Static rendering of actual domain components with deterministic compiler fixtures.
// Development layout checks only: no services, app navigation, inference or acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { chromium } = require("playwright");
const { load } = require("./integration-loader.cjs");
const { compileAssembly } = load("src/simulations/runtime/assembly.ts");
const { parseConfiguration } = load("src/lib/planner/creation.ts");
const { PhysicalSystemsContent } = load(
  "src/simulations/components/views/physical-systems/PhysicalSystemsView.tsx",
);
const { physicalSystems } = load(
  "src/simulations/domains/physical-systems/index.ts",
);
const rawDir =
  process.env.AGENT_B_RAW_DIR || "/private/tmp/apertus-006-agent-b-layout";
fs.mkdirSync(rawDir, { recursive: true });
const css = [
  "../../../src/simulations/components/views/experiment-lesson.css",
  "../../../src/simulations/components/views/physical-systems/physical-systems.css",
]
  .map((file) => fs.readFileSync(path.resolve(__dirname, file), "utf8"))
  .join("\n");
const report = {
  kind: "development-static-layout",
  qualifying: false,
  cases: [],
};
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    for (const name of ["Pendulum", "RollingTrack", "ResistiveCircuit"]) {
      const model = physicalSystems.models.find((m) =>
        m.ref.endsWith(`/${name}`),
      );
      const parameters =
        name === "Pendulum"
          ? [{ length: 1 }, { length: 4 }]
          : name === "RollingTrack"
            ? [{ resistance: 0.05 }, { resistance: 0 }]
            : [{ bulbs: 2, topology: "parallel" }];
      const { plan } = parseConfiguration(
        JSON.stringify({
          schemaVersion: 1,
          outcome: "configuration",
          confirmedComposition: model.ref,
          title: model.name,
          learningGoal:
            "Explore the effect of one input while keeping other conditions the same.",
          objects: parameters.map((parameters, index) => ({
            id: `object/case${index}`,
            label: ["First", "Second"][index],
            parameters,
            observations: [...model.requiredObservations],
          })),
        }),
        model.ref,
        "measurements",
        parameters.length > 1 ? "comparison" : "single",
      );
      const { instances } = compileAssembly(plan.assembly);
      if (name === "RollingTrack")
        for (const instance of instances) {
          instance.state = model.step({ ...instance.state, playing: true }, 10);
          instance.outputs = model.measure(instance.state);
        }
      const markup = renderToStaticMarkup(
        React.createElement(PhysicalSystemsContent, {
          assembly: plan.assembly,
          instances,
        }),
      );
      assert.ok(markup.includes("Reset initial settings"));
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${name}</title><style>body{margin:0;background:#eee9dc;font-family:Arial,sans-serif}${css}</style></head><body>${markup}</body></html>`;
      for (const width of [1440, 390]) {
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          reducedMotion: "no-preference",
        });
        try {
          const page = await context.newPage();
          await page.setContent(html);
          assert.equal(await page.locator("main").count(), 1);
          const overflow = await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          );
          assert.equal(overflow, false, `${name} overflows at ${width}`);
          assert.ok(
            await page
              .getByRole("button", { name: "Reset initial settings" })
              .isVisible(),
          );
          const labels = await page
            .locator('input[type="number"]')
            .evaluateAll((inputs) =>
              inputs.every(
                (input) =>
                  !!document.querySelector(
                    `label[for="${CSS.escape(input.id)}"]`,
                  ),
              ),
            );
          assert.equal(labels, true);
          await page.screenshot({
            path: path.join(rawDir, `${name}-${width}.png`),
            fullPage: true,
          });
          await page.emulateMedia({ reducedMotion: "reduce" });
          if (name !== "ResistiveCircuit") {
            assert.equal(
              await page.locator(".physical-motion-scene").isVisible(),
              false,
            );
            assert.equal(
              await page.locator(".physical-reduced-note").isVisible(),
              true,
            );
          }
          report.cases.push({
            name,
            width,
            overflow,
            labels,
            reducedMotion: "passed",
            result: "passed",
          });
        } finally {
          await context.close();
        }
      }
    }
    fs.writeFileSync(
      path.join(rawDir, "report.json"),
      JSON.stringify(report, null, 2),
    );
    console.log(
      `Agent B: six static desktop/mobile layout checks passed. Raw development captures: ${rawDir}. No live prompt acceptance claimed.`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
