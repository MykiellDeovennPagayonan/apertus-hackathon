const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { load } = require("../../test-loader.cjs");
const { modelProvider } = load("src/simulations/runtime/assembly.ts");
const captures =
  process.env.SYSTEMS_CAPTURE_DIR || "/tmp/apertus-systems-review/ux-redesign";
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43100";
fs.mkdirSync(captures, { recursive: true });
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
    viewport: { width: 1440, height: 900 },
    reducedMotion: "reduce",
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const capture = async (name) => {
    await page.waitForTimeout(200);
    const geometry = await page.evaluate(() => ({
      overflow: document.documentElement.scrollWidth > innerWidth,
      cards: [...document.querySelectorAll(".board-content")].map((e) => ({
        h: e.clientHeight,
        sh: e.scrollHeight,
        w: e.clientWidth,
        sw: e.scrollWidth,
      })),
      small: [
        ...document.querySelectorAll(".systems-scene button,.factory-station"),
      ]
        .filter((e) => e.getBoundingClientRect().height < 44)
        .map((e) => e.textContent),
    }));
    assert.equal(geometry.overflow, false);
    assert.ok(
      geometry.cards.every((e) => e.sh <= e.h + 2 && e.sw <= e.w + 2),
      JSON.stringify(geometry),
    );
    assert.deepEqual(geometry.small, []);
    await page.screenshot({
      path: path.join(captures, `${name}-1440x900.png`),
    });
  };
  try {
    await page.goto(`${base}/experiments?experiment=wildfire`);
    await page
      .getByRole("group", {
        name: "Untreated and fuel-treated wildfire patch maps",
        exact: true,
      })
      .waitFor();
    const model = modelProvider("prefabs/ecology/Wildfire");
    let state = { ...model.defaults };
    const verify = async () => {
      const expected = model.measure(state);
      await page.waitForFunction(
        (value) =>
          document
            .querySelector(".wildfire-scene")
            ?.getAttribute("data-treated-area") === String(value),
        expected.treatedArea,
      );
      await page.waitForFunction(
        (mask) =>
          [...document.querySelectorAll(".fire-tree")]
            .map((e) => (e.getAttribute("aria-pressed") === "true" ? "1" : "0"))
            .join("") === mask,
        expected.scene.treatment,
      );
      assert.equal(await page.locator('.fire-tree[tabindex="0"]').count(), 1);
    };
    const reference = await page
      .locator(".fire-reference-tree")
      .evaluateAll((cells) => cells.map((e) => e.innerHTML));
    assert.equal(await page.locator(".fire-tree").count(), 160);
    // User requested the original compact 19-unit cells, not an enlarged planner.
    assert.equal(
      await page.locator(".fire-tree .fire-cell").first().getAttribute("width"),
      "19",
    );
    await capture("wildfire-clickable-original-grids");
    await page
      .getByRole("button", { name: "Clear treatment", exact: true })
      .click();
    state = model.apply(state, "FIRE_CLEAR_PATCHES");
    const tree = (i) => page.locator(`[data-tree="${i}"]`);
    await tree(0).focus();
    await tree(0).press("ArrowRight");
    await tree(1).press("ArrowDown");
    await tree(17).press("Space");
    state = model.apply(state, "FIRE_TOGGLE_PATCH", 17);
    await verify();
    await tree(17).click();
    state = model.apply(state, "FIRE_TOGGLE_PATCH", 17);
    await verify();
    for (let i = 0; i < 160; i++) {
      await tree(i).focus();
      await tree(i).press("Enter");
      state = model.apply(state, "FIRE_TOGGLE_PATCH", i);
      await verify();
    }
    assert.equal(state.patches.length, 160);
    await capture("wildfire-all-trees-treated");
    await page
      .getByRole("button", { name: "Clear treatment", exact: true })
      .click();
    state = model.apply(state, "FIRE_CLEAR_PATCHES");
    const firebreak = Array.from({ length: 160 }, (_, i) => i).filter(
      (i) => i % 16 >= 6 && i % 16 <= 9,
    );
    for (const i of firebreak) {
      await tree(i).click();
      state = model.apply(state, "FIRE_TOGGLE_PATCH", i);
    }
    await verify();
    await capture("wildfire-custom-firebreak");
    const contained = model.measure(state).treatedArea;
    for (const i of firebreak.filter(
      (i) => Math.floor(i / 16) === 4 || Math.floor(i / 16) === 5,
    )) {
      await tree(i).click();
      state = model.apply(state, "FIRE_TOGGLE_PATCH", i);
    }
    await verify();
    assert.ok(
      model.measure(state).treatedArea > contained,
      "A gap lets fire spread farther",
    );
    assert.deepEqual(
      await page
        .locator(".fire-reference-tree")
        .evaluateAll((cells) => cells.map((e) => e.innerHTML)),
      reference,
    );
    await capture("wildfire-gap-comparison");
    await page.locator(".board-navigation-help > summary").click();
    await page
      .getByRole("button", { name: "Reset experiment", exact: true })
      .click();
    state = { ...model.defaults };
    await verify();
    await page.goto(`${base}/experiments?experiment=craft-production`);
    await page.locator(".factory-scene").waitFor();
    const layouts = await page
      .locator(".factory-floor")
      .evaluateAll((floors) =>
        floors.map((floor) =>
          [...floor.querySelectorAll("[data-station-position]")].map((e) =>
            e.getAttribute("data-station-position"),
          ),
        ),
      );
    assert.deepEqual(layouts[0], layouts[1]);
    assert.equal(layouts[0].length, 8);
    await capture("production-matching-topdown-factories");
    for (const name of [
      "Cut",
      "Shape",
      "Fit",
      "Join",
      "Finish",
      "Check",
      "Pack",
      "Label",
    ]) {
      const button = page.getByRole("button", {
        name: `Visit ${name} station`,
        exact: true,
      });
      await button.focus();
      await button.press("Enter");
      assert.equal(await button.getAttribute("aria-pressed"), "true");
    }
    await page
      .getByRole("button", { name: "Watch a chair", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Visit Cut station", exact: true })
      .waitFor({ state: "visible" });
    await page.waitForFunction(
      () =>
        document
          .querySelector('.factory-station[aria-pressed="true"]')
          ?.getAttribute("aria-label") !== "Visit Label station",
    );
    await page
      .getByRole("button", { name: "Pause chair journey", exact: true })
      .click();
    const stage = await page
      .locator('.factory-station[aria-pressed="true"]')
      .getAttribute("aria-label");
    await page.waitForTimeout(1500);
    assert.equal(
      await page
        .locator('.factory-station[aria-pressed="true"]')
        .getAttribute("aria-label"),
      stage,
    );
    const delay = page.getByRole("textbox", {
      name: "Exact slowest-stage delay",
      exact: true,
    });
    await delay.fill("100");
    await delay.press("Tab");
    await page
      .getByRole("button", { name: "Visit Join station", exact: true })
      .click();
    await page.getByText("Slow station", { exact: true }).waitFor();
    await capture("production-slow-joining-station");
    assert.deepEqual(errors, []);
    console.log(
      "Spatial Playwright: all 160 compact wildfire cells by keyboard, custom firebreaks and gaps, paired comparison/reset; every factory station, chair playback/pause, and visible bottleneck queues passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
