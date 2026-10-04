// Static rendering of actual chemistry components with deterministic compiler fixtures.
// Development layout checks only: no services, inference, navigation, or acceptance.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const React = require("react");
const { renderToStaticMarkup } = require("react-dom/server");
const { chromium } = require("playwright");
const { load } = require("../physical-systems/integration-loader.cjs");
const { compileAssembly } = load("src/simulations/runtime/assembly.ts");
const { parseConfiguration } = load("src/lib/planner/creation.ts");
const { ChemistryLesson } = load(
  "src/simulations/components/views/chemistry/ChemistryLesson.tsx",
);
const { chemistry } = load("src/simulations/domains/chemistry/index.ts");

const rawDir =
  process.env.AGENT_C_RAW_DIR || "/private/tmp/apertus-006-agent-c-layout";
fs.mkdirSync(rawDir, { recursive: true });
const css = [
  "../../../src/simulations/components/views/experiment-lesson.css",
  "../../../src/simulations/components/views/chemistry/ChemistryLesson.css",
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
    for (const model of chemistry.models) {
      const { plan } = parseConfiguration(
        JSON.stringify({
          schemaVersion: 1,
          outcome: "configuration",
          confirmedComposition: model.ref,
          title: model.name,
          learningGoal: model.assumptions[0],
          objects: [
            {
              id: "object/case0",
              label: model.name,
              parameters: {},
              observations: [...model.requiredObservations],
            },
          ],
        }),
        model.ref,
        "measurements",
        "single",
      );
      const { instances } = compileAssembly(plan.assembly);
      const markup = renderToStaticMarkup(
        React.createElement(ChemistryLesson, {
          instance: instances[0],
          learningGoal: plan.assembly.learningGoal,
          dispatch: () => ({ accepted: true }),
        }),
      );
      assert.ok(markup.includes("Reset experiment"));
      const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${model.name}</title><style>body{margin:0;background:#eee9dc;font-family:Arial,sans-serif}${css}</style></head><body>${markup}</body></html>`;
      const name = model.ref.split("/").at(-1);
      for (const width of [1440, 390]) {
        const context = await browser.newContext({
          viewport: { width, height: width === 390 ? 844 : 900 },
          reducedMotion: "reduce",
        });
        try {
          const page = await context.newPage();
          await page.setContent(html);
          const lesson = page.locator(".experiment-lesson");
          assert.equal(await lesson.count(), 1);
          assert.equal(
            await page.evaluate(
              () => document.documentElement.scrollWidth > innerWidth,
            ),
            false,
            `${name} overflows at ${width}`,
          );
          assert.ok(await page.locator(".chem-primary").isVisible());
          assert.ok(
            await page
              .getByRole("button", { name: "Reset experiment" })
              .isVisible(),
          );
          await page.screenshot({
            path: path.join(rawDir, `${name}-${width}.png`),
            fullPage: true,
          });
          report.cases.push({ name, width, result: "passed" });
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
      `Agent C: six static desktop/mobile layout checks passed. Raw development captures: ${rawDir}. No live prompt acceptance claimed.`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
