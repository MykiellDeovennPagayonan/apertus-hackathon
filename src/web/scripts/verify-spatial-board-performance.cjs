const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { emptyAuthoredDocument, emptyLayout } = load(
  "src/simulations/runtime/authoring/types.ts",
);
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const d = emptyAuthoredDocument();
d.scopes = [{ id: "main", label: "Main" }];
for (let i = 0; i < 28; i++) {
  const def = publicDefinition(i < 4 ? "canvases/cartesian" : "displays/Text");
  d.nodes.push({
    id: `item-${i}`,
    definition: def.id,
    version: def.version,
    label: `View ${i + 1}`,
    scope: "main",
    configuration: structuredClone(def.defaults),
  });
  d.layout.children.push({
    ...emptyLayout(`layout/item-${i}`),
    node: `item-${i}`,
  });
}
d.presentation = convertToBoard(d);
const document = canonicalDocument(d);
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
      viewport: { width: 1440, height: 1000 },
    });
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
    await page.locator(".board-viewport").focus();
    const sample = await page.evaluate(async () => {
      const el = document.querySelector(".board-viewport");
      const frames = [];
      let last = performance.now();
      for (let i = 0; i < 90; i++) {
        el.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: i % 2 ? "ArrowLeft" : "ArrowRight",
            bubbles: true,
          }),
        );
        await new Promise(requestAnimationFrame);
        const now = performance.now();
        if (i > 10) frames.push(now - last);
        last = now;
      }
      frames.sort((a, b) => a - b);
      return {
        items: document.querySelectorAll(".board-item").length,
        elements: el.querySelectorAll("*").length,
        medianFrameMs: frames[Math.floor(frames.length * 0.5)],
        p95FrameMs: frames[Math.floor(frames.length * 0.95)],
      };
    });
    assert.equal(sample.items, 28);
    console.log(
      JSON.stringify(
        {
          environment: `${os.platform()} ${os.arch()} ${os.cpus()[0].model}`,
          browser: await browser.version(),
          mode: "development, headless, 1440x1000, 4 Cartesian views and 24 instruction items",
          ...sample,
        },
        null,
        2,
      ),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
