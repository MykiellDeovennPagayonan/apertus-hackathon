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
const base = process.env.UX_TEST_URL || "http://localhost:43100";
const output = "/tmp/apertus-builder-surfaces";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (fs.existsSync(chromium.executablePath())
        ? chromium.executablePath()
        : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    const authored = modelRecipe("models/Projectile").document;
    authored.presentation = convertToBoard(authored);
    const document = canonicalDocument(authored);
    await page.addInitScript(
      (document) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      document,
    );
    await page.route("**/api/auth/session", (r) => r.fulfill({ json: {} }));
    await page.goto(`${base}/experiments/builder`);
    const button = (name) => page.getByRole("button", { name, exact: true });
    const library = page.getByRole("dialog", {
      name: "Add a component",
      exact: true,
    });
    const capture = (name) =>
      page.screenshot({ path: `${output}/${name}.png` });
    const bounds = async (dialog) => {
      const metrics = await dialog.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        const footer = el
          .querySelector(":scope > footer")
          .getBoundingClientRect();
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: innerWidth,
          height: innerHeight,
          overflow: el.scrollWidth - el.clientWidth,
          footer: footer.bottom,
        };
      });
      assert.ok(
        metrics.left >= 0 &&
          metrics.right <= metrics.width + 1 &&
          metrics.top >= 0 &&
          metrics.bottom <= metrics.height + 1,
        JSON.stringify(metrics),
      );
      assert.ok(metrics.overflow <= 1, JSON.stringify(metrics));
      assert.ok(metrics.footer <= metrics.height, JSON.stringify(metrics));
    };
    await button("+ Add component").waitFor();
    const navTop = await page
      .locator(".composition-tabs")
      .evaluate((el) => el.getBoundingClientRect().top);
    await page.keyboard.press("ControlOrMeta+s");
    await page.getByText("Saved on device", { exact: true }).waitFor();
    assert.equal(
      await page
        .locator(".composition-tabs")
        .evaluate((el) => el.getBoundingClientRect().top),
      navTop,
    );
    assert.equal(await page.locator(".builder-feedback:visible").count(), 0);
    await capture("workspace-saved");
    await page.getByLabel("More document actions", { exact: true }).click();
    assert.equal(
      await page
        .locator('.builder-file-menu input[type="file"]:visible')
        .count(),
      0,
    );
    assert.equal(
      await page.getByRole("button", { name: /^Open Projectile/ }).count(),
      0,
    );
    await capture("more-menu");
    await button("Open saved experiment…").click();
    const saved = page.getByRole("dialog", {
      name: "Open saved experiment",
      exact: true,
    });
    await saved.waitFor();
    await bounds(saved);
    await capture("saved-picker");
    await saved.getByRole("button", { name: /^Open / }).click();
    await saved.waitFor({ state: "hidden" });
    await button("+ Add component").click();
    const search = library.getByRole("searchbox", {
      name: "Search components",
      exact: true,
    });
    assert.equal(
      await search.evaluate((el) => el === window.document.activeElement),
      true,
    );
    assert.equal(
      await library
        .getByRole("button", { name: "Build with AI", exact: true })
        .count(),
      0,
    );
    assert.ok(
      await search.evaluate(
        (el) => Number.parseFloat(getComputedStyle(el).paddingLeft) >= 40,
      ),
    );
    assert.equal(
      await search.evaluate((el) => getComputedStyle(el).fontWeight),
      "400",
    );
    await bounds(library);
    await capture("library-desktop");
    await search.fill("fraction bar");
    await library
      .getByRole("button", { name: "Details for Fraction bar", exact: true })
      .click();
    const detail = library.getByRole("region", {
      name: "Details for Fraction bar",
      exact: true,
    });
    await detail.waitFor();
    assert.equal(await detail.locator(".catalog-schematic").count(), 0);
    assert.equal(await detail.locator(".catalog-port-group").count(), 3);
    assert.equal(
      await detail
        .getByRole("heading", { name: "Fraction bar", exact: true })
        .evaluate((el) => el === window.document.activeElement),
      true,
    );
    await bounds(library);
    await capture("component-details-desktop");
    await detail
      .getByRole("button", { name: "Back to results", exact: true })
      .click();
    assert.equal(await search.inputValue(), "fraction bar");
    assert.equal(
      await library
        .getByRole("button", { name: "Details for Fraction bar", exact: true })
        .evaluate((el) => el === window.document.activeElement),
      true,
    );
    await library
      .getByRole("button", { name: "Clear component search", exact: true })
      .click();
    assert.equal(await search.inputValue(), "");
    assert.equal(
      await search.evaluate((el) => el === window.document.activeElement),
      true,
    );
    await search.fill("line exploration");
    await library
      .getByRole("button", {
        name: "Details for Line exploration",
        exact: true,
      })
      .click();
    await library
      .getByRole("heading", { name: "Included components (7)", exact: true })
      .waitFor();
    await capture("assembly-details-desktop");
    await library
      .getByRole("button", { name: "Back to results", exact: true })
      .click();
    await library
      .getByRole("button", { name: "Clear component search", exact: true })
      .click();
    await library
      .getByRole("button", { name: "Close library", exact: true })
      .click();
    const slider = document.authored.nodes.find(
      (n) => n.definition === "controls/Slider",
    );
    const openSlider = async () => {
      await button("Connections").click();
      await button("Fit to content").click();
      await page
        .locator(`[data-node-id="${slider.id}"] .connection-node-heading`)
        .dblclick();
    };
    await openSlider();
    const settings = page.locator("dialog.component-dialog[open]").filter({
      has: page.getByRole("button", { name: "Close settings", exact: true }),
    });
    await settings.waitFor();
    assert.equal(await settings.locator(".settings-section").count(), 3);
    assert.equal(
      await settings
        .getByText("Saved on this device.", { exact: true })
        .count(),
      0,
    );
    await bounds(settings);
    await capture("slider-settings-desktop");
    await settings.getByLabel("Minimum", { exact: true }).fill("0");
    await settings.getByLabel("Maximum", { exact: true }).fill("80");
    await settings
      .getByRole("button", { name: "Apply control settings", exact: true })
      .click();
    await page.waitForFunction(
      (id) =>
        JSON.parse(
          localStorage.getItem("apertus-builder-draft-v1"),
        ).document.authored.nodes.find((n) => n.id === id).configuration.max ===
        80,
      slider.id,
    );
    await settings
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await button("Undo").click();
    const undo = await page.evaluate(
      (id) =>
        JSON.parse(
          localStorage.getItem("apertus-builder-draft-v1"),
        ).document.authored.nodes.find((n) => n.id === id).configuration.max,
      slider.id,
    );
    assert.notEqual(undo, 80);
    await openSlider();
    await settings.getByLabel("Minimum", { exact: true }).fill("90");
    await settings.getByLabel("Maximum", { exact: true }).fill("10");
    await settings
      .getByRole("button", { name: "Apply control settings", exact: true })
      .click();
    await settings.locator(".settings-form-error").waitFor();
    assert.equal(
      await settings
        .locator(".settings-form-error")
        .evaluate((el) => el === window.document.activeElement),
      true,
    );
    const rejected = await page.evaluate(
      (id) =>
        JSON.parse(
          localStorage.getItem("apertus-builder-draft-v1"),
        ).document.authored.nodes.find((n) => n.id === id).configuration.max,
      slider.id,
    );
    assert.equal(rejected, undo);
    await settings.getByLabel("Minimum", { exact: true }).fill("0");
    await settings.getByLabel("Maximum", { exact: true }).fill("90");
    await settings
      .getByRole("button", { name: "Apply control settings", exact: true })
      .click();
    await settings.locator(".settings-form-error").waitFor({ state: "hidden" });
    await settings
      .getByRole("button", { name: "Close settings", exact: true })
      .click();
    await button("Fit to content").click();
    await page
      .locator(
        '[data-node-id="appearance"] [data-port-side="input"][data-port-id="model"]',
      )
      .click();
    const connection = page.getByRole("dialog", {
      name: "Projectile scene · model",
      exact: true,
    });
    await connection.waitFor();
    await bounds(connection);
    assert.equal(
      await connection.locator(".input-editor-connection").count(),
      1,
    );
    await capture("connection-dialog-desktop");
    await connection
      .getByRole("button", { name: "Use existing", exact: true })
      .click();
    const compatibleSearch = connection.getByRole("searchbox");
    assert.ok(
      await compatibleSearch.evaluate(
        (el) => Number.parseFloat(getComputedStyle(el).paddingLeft) >= 36,
      ),
    );
    await page.setViewportSize({ width: 390, height: 800 });
    await bounds(connection);
    await capture("connection-dialog-mobile");
    await page.keyboard.press("Escape");
    await connection.waitFor({ state: "hidden" });
    for (const width of [1024, 768, 390, 320]) {
      await page.setViewportSize({ width, height: 800 });
      await button("+ Add component").click();
      await bounds(library);
      await capture(`library-${width}`);
      await search.fill("fraction bar");
      await library
        .getByRole("button", { name: "Details for Fraction bar", exact: true })
        .click();
      await bounds(library);
      await capture(`details-${width}`);
      await library
        .getByRole("button", { name: "Close library", exact: true })
        .click();
      await openSlider();
      await bounds(settings);
      await capture(`settings-${width}`);
      await settings
        .getByRole("button", { name: "Close settings", exact: true })
        .click();
      await page.locator(".composition-settings-menu > summary").click();
      await capture(`lesson-menu-${width}`);
      await page.keyboard.press("Escape");
      await page.getByLabel("More document actions", { exact: true }).click();
      await capture(`more-${width}`);
      await page.keyboard.press("Escape");
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await button("+ Add component").click();
    await library
      .getByRole("button", { name: "Import assembly", exact: true })
      .click();
    const imported = {
      ...modelRecipe("models/Projectile"),
      id: "user/surfaces-test",
      title: "Surfaces test assembly",
    };
    await library
      .getByLabel("Assembly JSON file", { exact: true })
      .setInputFiles({
        name: "assembly.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(imported)),
      });
    await library
      .getByRole("button", { name: "Save to library", exact: true })
      .click();
    const success = library.locator(".builder-feedback.is-success:visible");
    await success.waitFor();
    assert.equal(await success.count(), 1);
    assert.equal(
      await success.evaluate((el) => getComputedStyle(el).position),
      "absolute",
    );
    await success.hover();
    await page.waitForTimeout(5500);
    assert.ok(await success.isVisible());
    await library.locator("header h2").hover();
    await success.waitFor({ state: "hidden", timeout: 8000 });
    await library
      .getByRole("button", { name: "Close library", exact: true })
      .click();
    await page.getByLabel("More document actions", { exact: true }).click();
    await page.locator('.builder-file-menu input[type="file"]').setInputFiles({
      name: "bad.json",
      mimeType: "application/json",
      buffer: Buffer.from("bad json"),
    });
    const notice = page.locator(".builder-feedback--floating:visible");
    await notice.waitFor();
    assert.equal(
      await page
        .locator(".composition-tabs")
        .evaluate((el) => el.getBoundingClientRect().top),
      navTop,
    );
    await capture("persistent-error");
    await page.waitForTimeout(5500);
    assert.ok(await notice.isVisible());
    await notice
      .getByRole("button", { name: "Dismiss notification", exact: true })
      .click();
    await notice.waitFor({ state: "hidden" });
    assert.deepEqual(errors, []);
    console.log(
      "Builder surfaces: search, detail navigation, settings apply/undo, saved picker, persistent errors and responsive dialogs passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
