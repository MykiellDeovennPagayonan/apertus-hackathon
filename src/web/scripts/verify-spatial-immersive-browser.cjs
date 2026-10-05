const assert = require("node:assert/strict");
const fs = require("node:fs");
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
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const authored = emptyAuthoredDocument();
authored.scopes = [{ id: "main", label: "Main" }];
for (const [id, definition] of [
  ["scene", "canvases/town"],
  ["text", "displays/Text"],
]) {
  const def = publicDefinition(definition);
  authored.nodes.push({
    id,
    definition,
    version: def.version,
    label: id === "scene" ? "Town scene" : "Activity instructions",
    scope: "main",
    configuration: structuredClone(def.defaults),
  });
  authored.layout.children.push({ ...emptyLayout(`layout/${id}`), node: id });
}
const modelDefinition = publicDefinition("models/Projectile");
authored.nodes.push({
  id: "model",
  definition: modelDefinition.id,
  version: modelDefinition.version,
  label: "Projectile",
  scope: "main",
  configuration: structuredClone(modelDefinition.defaults),
});
const controlDefinition = publicDefinition("controls/NumberInput");
authored.nodes.push({
  id: "control",
  definition: controlDefinition.id,
  version: controlDefinition.version,
  label: "Launch angle",
  scope: "main",
  configuration: {
    ...structuredClone(controlDefinition.defaults),
    initial: '{"value":45}',
    label: "Launch angle",
  },
});
authored.layout.children.push({
  ...emptyLayout("layout/control"),
  node: "control",
});
authored.connections.push({
  id: "angle-command",
  kind: "command",
  from: { node: "control", port: "submit" },
  to: { node: "model", port: "set:angle" },
});
authored.presentation = convertToBoard(authored);
const p = authored.presentation;
p.immersive.overlays = [
  {
    id: "overlay",
    sceneItemId: p.items[0].id,
    contentItemIds: [p.items[1].id, p.items[2].id],
    anchor: "right",
    collapsedByDefault: false,
  },
];
validateAuthoredDocument(authored);
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
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.addInitScript(
      ({ document }) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      { document },
    );
    await page.goto("http://127.0.0.1:43002/experiments/builder");
    await page
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.locator(".board-item canvas").waitFor();
    const number = page.locator('[data-board-index="2"] input[type="number"]');
    await page.getByRole("button", { name: "Find content" }).count();
    await number.fill("37");
    const original = await page.locator(".board-item canvas").elementHandle();
    await page
      .getByRole("button", { name: "Expand scene", exact: true })
      .click();
    await page.locator(".is-immersive canvas").waitFor();
    assert.ok(
      await original.evaluate((el) => el.isConnected),
      "Scene canvas remains mounted",
    );
    assert.equal(await page.locator(".is-overlay:visible").count(), 2);
    assert.equal(
      await number.inputValue(),
      "37",
      "Unsubmitted control draft survives scene promotion",
    );
    await page.screenshot({
      path: "/tmp/spatial-immersive-desktop.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Hide controls", exact: true })
      .click();
    assert.equal(await page.locator(".is-overlay:visible").count(), 0);
    await page
      .getByRole("button", { name: "Show controls", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page
      .getByRole("combobox", { name: "Immersive content", exact: true })
      .selectOption(p.items[2].id);
    await page
      .getByRole("button", { name: "Expand controls", exact: true })
      .click();
    assert.equal(await number.inputValue(), "37");
    await page.screenshot({
      path: "/tmp/spatial-immersive-mobile.png",
      fullPage: true,
    });
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
    );
    await page
      .getByRole("button", { name: "Return to board", exact: true })
      .click();
    assert.ok(await original.evaluate((el) => el.isConnected));
    await page
      .getByRole("button", { name: "Board settings", exact: true })
      .click();
    await page
      .getByLabel("Start presentation", { exact: true })
      .selectOption(p.items[0].id);
    await page.getByLabel("Allow learner return to board").uncheck();
    await page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("button", { name: "Return to board", exact: true })
        .count(),
      0,
    );
    await page.locator(".is-immersive canvas").waitFor();
    assert.equal(
      await page
        .getByRole("button", { name: "Return to builder", exact: true })
        .count(),
      1,
    );
    assert.deepEqual(errors, []);
    console.log(
      "Immersive browser: same mounted canvas, overlay collapse, mobile sizing, scene startup and author escape passed",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
