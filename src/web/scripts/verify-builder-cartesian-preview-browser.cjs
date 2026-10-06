const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const authored = modelRecipe("prefabs/AuthoredLine").document;
authored.nodes = authored.nodes.filter((node) =>
  ["model", "canvas"].includes(node.id),
);
authored.connections = authored.connections.filter(
  (link) => link.kind === "attachment",
);
authored.layout.children = [authored.layout.children[0].children[0]];
authored.nodes.find((node) => node.id === "canvas").configuration = {
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
  grid: true,
  snap: 0.5,
};
authored.presentation = convertToBoard(authored);
const document = canonicalDocument(authored);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromium.executablePath())
      ? {}
      : {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }),
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1024, height: 768 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.addInitScript(
      ({ document }) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      { document },
    );
    await page.goto(
      `${process.env.UX_TEST_URL || "http://127.0.0.1:43002"}/experiments/builder`,
    );
    await page
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const metrics = () =>
      page.locator(".board-item[data-board-scene=true]").evaluate((item) => {
        const svg = item.querySelector(".composition-cartesian");
        const plane = item.querySelector(".composition-plane");
        return {
          sceneHeight: item.clientHeight,
          planeHeight: plane.clientHeight,
          svgHeight: svg.clientHeight,
          svgWidth: svg.clientWidth,
          lines: svg.querySelectorAll("line").length,
          linePoints: svg
            .querySelector('polyline[stroke="#4367b2"]')
            ?.getAttribute("points"),
          viewBox: svg.getAttribute("viewBox"),
          ancestors: [svg.parentElement.parentElement.clientHeight],
        };
      });
    await page.locator(".composition-cartesian").waitFor();
    const build = await metrics();
    assert.ok(build.svgHeight > 300, JSON.stringify(build));
    await page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    await page.waitForTimeout(300);
    const learner = await metrics();
    await page.screenshot({
      path: "/tmp/builder-cartesian-try.png",
      fullPage: true,
    });
    assert.ok(
      learner.svgHeight > 300,
      `Learner canvas must retain its height: ${JSON.stringify(learner)}`,
    );
    assert.ok(
      Math.abs(learner.svgHeight - build.svgHeight) <= 2,
      JSON.stringify({ build, learner }),
    );
    assert.ok(
      Math.abs(learner.planeHeight - learner.sceneHeight) <= 2,
      JSON.stringify(learner),
    );
    assert.ok(learner.lines > 10, "Grid and line remain rendered");
    assert.ok(
      learner.linePoints,
      "The connected line remains visible in the learner plane",
    );
    assert.equal(
      learner.linePoints,
      build.linePoints,
      "Switching modes preserves the rendered line geometry",
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(250);
    assert.ok(
      (await metrics()).svgHeight > 300,
      "The learner plane retains its drawing height on mobile",
    );
    await page.screenshot({
      path: "/tmp/builder-cartesian-try-mobile.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Return to builder", exact: true })
      .click();
    assert.ok((await metrics()).svgHeight > 300);
    assert.deepEqual(errors, []);
    console.log(
      "Builder Cartesian preview: line and full-size plane survive Try lesson and return passed",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
