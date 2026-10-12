const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { parseDocument } = load(
  "src/simulations/builder/document/serialization.ts",
);
const base = process.env.UX_TEST_URL || "http://localhost:43100";
const output = "/tmp/apertus-builder-recovery";
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
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const authored = modelRecipe("models/Projectile").document;
    authored.presentation = convertToBoard(authored);
    authored.editor.zoom = 0.65;
    authored.editor.pan = { x: -100, y: 80 };
    authored.editor.positions.model = { x: 450, y: 300 };
    const document = canonicalDocument(authored);
    await page.addInitScript((d) => {
      if (!localStorage.getItem("apertus-builder-draft-v1"))
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document: d, valid: d }),
        );
    }, document);
    await page.route("**/api/auth/session", (r) => r.fulfill({ json: {} }));
    await page.goto(`${base}/experiments/builder`);
    const button = (name) => page.getByRole("button", { name, exact: true });
    const more = page.getByLabel("More document actions", { exact: true });
    const title = page.getByRole("textbox", {
      name: "Experiment title",
      exact: true,
    });
    const composer = page.locator(".builder-composer");
    const prompt = composer.locator("textarea");
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document,
      );
    const transform = () =>
      page.locator(".builder-canvas").evaluate((el) => el.style.transform);
    const capture = (name) =>
      page.screenshot({ path: `${output}/${name}.png` });
    await title.waitFor();
    assert.equal(await transform(), "translate(-100px, 80px) scale(0.65)");
    const canvas = page.getByRole("region", {
      name: "Connections canvas",
      exact: true,
    });
    await canvas.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForFunction(
      () =>
        JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document
          .editor.pan.x === -180,
    );
    const view = await transform();
    const before = await draft();
    await page.keyboard.press("ControlOrMeta+s");
    await page.getByText("Saved on device", { exact: true }).waitFor();
    await page.reload();
    await title.waitFor();
    assert.equal(await transform(), view);
    assert.deepEqual(
      (await draft()).authored.editor.positions,
      before.authored.editor.positions,
    );
    await more.click();
    const download = page.waitForEvent("download");
    await button("Download recipe").click();
    const exported = await download;
    const path = await exported.path();
    const parsed = parseDocument(fs.readFileSync(path, "utf8"));
    assert.deepEqual(parsed.authored.editor, before.authored.editor);
    for (const width of [1440, 1024, 700, 375, 320]) {
      await page.setViewportSize({ width, height: 800 });
      const geometry = await canvas.evaluate((el) => ({
        bottom: el.getBoundingClientRect().bottom,
        height: innerHeight,
        scroll: document.documentElement.scrollHeight,
        overflow: document.documentElement.scrollWidth > innerWidth,
      }));
      assert.ok(
        Math.abs(geometry.bottom - geometry.height) <= 1,
        JSON.stringify(geometry),
      );
      assert.equal(geometry.overflow, false);
      assert.ok(geometry.scroll <= geometry.height + 1);
      await capture(`canvas-${width}`);
      await title.fill(`Unsaved at ${width}`);
      await more.click();
      await button("New experiment").click();
      const guard = page.getByRole("dialog", {
        name: "Save changes before leaving?",
        exact: true,
      });
      await guard.waitFor();
      const rect = await guard.boundingBox();
      assert.ok(rect.x >= 0 && rect.x + rect.width <= width + 1);
      assert.ok(rect.y >= 0 && rect.y + rect.height <= 800);
      await capture(`unsaved-${width}`);
      const copy = page.waitForEvent("download");
      await guard
        .getByRole("button", { name: "Download a copy", exact: true })
        .click();
      await copy;
      assert.ok(await guard.isVisible());
      await guard
        .getByRole("button", { name: "Keep editing", exact: true })
        .click();
      assert.equal(await title.inputValue(), `Unsaved at ${width}`);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await more.click();
    await button("New experiment").click();
    const guard = page.getByRole("dialog", {
      name: "Save changes before leaving?",
      exact: true,
    });
    await page.evaluate(() => {
      window.builderTestSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (key === "apertus-builder-library-v1")
          throw new Error("Storage test failure");
        return window.builderTestSetItem.call(this, key, value);
      };
    });
    await guard
      .getByRole("button", { name: "Save & continue", exact: true })
      .click();
    await guard.getByRole("alert").waitFor();
    assert.ok(await guard.isVisible());
    await capture("unsaved-save-failure");
    await page.evaluate(() => {
      Storage.prototype.setItem = window.builderTestSetItem;
      delete window.builderTestSetItem;
    });
    await guard
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    await more.click();
    await button("New experiment").click();
    await page.evaluate(() => {
      const original = navigator.locks.request.bind(navigator.locks);
      window.builderTestOriginalLock = original;
      navigator.locks.request = async (...args) => {
        if (args[0] === "apertus-builder-library-v1")
          await new Promise((resolve) => {
            window.builderTestReleaseSave = resolve;
          });
        return original(...args);
      };
    });
    await guard
      .getByRole("button", { name: "Save & continue", exact: true })
      .click();
    await guard.getByRole("button", { name: "Saving…", exact: true }).waitFor();
    assert.ok(
      await guard
        .getByRole("button", { name: "Keep editing", exact: true })
        .isDisabled(),
    );
    assert.ok(
      await guard
        .getByRole("button", {
          name: "Close Save changes before leaving?",
          exact: true,
        })
        .isDisabled(),
    );
    await page.keyboard.press("Escape");
    assert.ok(await guard.isVisible());
    await page.mouse.click(10, 10);
    assert.ok(await guard.isVisible());
    await page.evaluate(() => {
      navigator.locks.request = window.builderTestOriginalLock;
      window.builderTestReleaseSave();
      delete window.builderTestOriginalLock;
      delete window.builderTestReleaseSave;
    });
    await guard.waitFor({ state: "hidden" });
    await more.click();
    await button("Open saved experiment…").click();
    await button("Open Unsaved at 320").click();
    let outcome = "clarification";
    let release;
    await page.route("**/api/apertus", async (route) => {
      const request = route.request().postDataJSON();
      if (outcome === "pending")
        await new Promise((resolve) => {
          release = resolve;
        });
      await route
        .fulfill({
          status: 422,
          headers: {
            "Content-Type": "application/json",
            "X-Request-ID": request.requestId,
          },
          json: {
            protocolVersion: 1,
            requestId: request.requestId,
            status: "failed",
            message:
              outcome === "timeout"
                ? "Apertus timed out. Please try again."
                : "Laya could not select a supported composition confidently. Please clarify the experiment.",
            retryable: outcome === "timeout",
          },
        })
        .catch(() => {});
    });
    await prompt.fill("Add a chart");
    await composer
      .getByRole("button", { name: "Update experiment", exact: true })
      .click();
    await composer
      .getByText("What should the chart show?", { exact: true })
      .waitFor();
    assert.ok(!(await composer.innerText()).includes("Laya"));
    const choices = composer
      .getByRole("group", { name: "Suggested data sources" })
      .getByRole("button");
    assert.ok((await choices.count()) > 0);
    await capture("chart-clarification");
    await choices.first().click();
    assert.match(await prompt.inputValue(), /Projectile/);
    await composer
      .getByRole("button", { name: "Add from library", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Add a component", exact: true })
      .waitFor();
    await button("Close library").click();
    outcome = "timeout";
    await composer
      .getByRole("button", { name: "Update experiment", exact: true })
      .click();
    await composer
      .getByRole("button", { name: "Try again", exact: true })
      .waitFor();
    assert.match(await composer.innerText(), /No changes were applied/);
    await capture("request-failure");
    await page.setViewportSize({ width: 320, height: 700 });
    await page.waitForFunction(() => {
      const composer = document.querySelector(".builder-composer");
      return composer.getBoundingClientRect().bottom <= window.innerHeight;
    });
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    const recoveryCard = composer.locator(".command-bar__status");
    const recoveryBounds = await recoveryCard.boundingBox();
    assert.ok(recoveryBounds && recoveryBounds.x >= 0);
    assert.ok(recoveryBounds.x + recoveryBounds.width <= 320);
    assert.ok(recoveryBounds.y >= 0);
    await capture("request-failure-mobile");
    await page.setViewportSize({ width: 1440, height: 900 });
    outcome = "pending";
    await composer
      .getByRole("button", { name: "Try again", exact: true })
      .click();
    const stop = composer.getByRole("button", { name: "Stop", exact: true });
    await stop.waitFor();
    await stop.hover();
    await page.waitForFunction(
      () =>
        getComputedStyle(document.querySelector(".command-bar__stop"))
          .backgroundColor === "rgb(38, 56, 48)",
    );
    const stopStyle = await stop.evaluate((el) => ({
      color: getComputedStyle(el).color,
      bg: getComputedStyle(el).backgroundColor,
    }));
    assert.equal(stopStyle.color, "rgb(255, 255, 255)");
    assert.equal(stopStyle.bg, "rgb(38, 56, 48)");
    await capture("stop-hover");
    await stop.click();
    release?.();
    await composer
      .getByText("Stopped — your prompt is still here.", { exact: true })
      .waitFor();
    assert.match(await prompt.inputValue(), /Projectile/);
    assert.deepEqual(errors, []);
    console.log(
      "Builder recovery UX: exact viewport reload/export, full-height canvas, unsaved-copy and save-failure handling, chart clarification, retry and Stop contrast passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
