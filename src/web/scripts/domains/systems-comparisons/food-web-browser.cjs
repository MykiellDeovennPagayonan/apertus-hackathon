const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { load } = require("../../test-loader.cjs");
const { foodWebSpecies } = load(
  "src/simulations/components/systems/ecology/foodWebSpecies.ts",
);
const { modelProvider } = load("src/simulations/runtime/assembly.ts");
const model = modelProvider("prefabs/ecology/FoodWeb");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43100";
const captures =
  process.env.SYSTEMS_CAPTURE_DIR ||
  "/tmp/apertus-systems-review/exploration-final";
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
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  let state = { ...model.defaults };
  const scene = page.locator(".food-explorer");
  const selector = page.getByRole("combobox", {
    name: "Explore an organism",
    exact: true,
  });
  const input = page.getByRole("textbox", {
    name: "Exact selected population",
    exact: true,
  });
  const verify = async () => {
    const species = foodWebSpecies[state.selection],
      expected = model.measure(state);
    await page.waitForFunction(
      ({ id, value }) =>
        document
          .querySelector(".food-explorer")
          ?.getAttribute("data-selected") === id &&
        document
          .querySelector(".food-explorer")
          ?.getAttribute("data-producer") === String(value),
      { id: species.id, value: expected.producer },
    );
    assert.equal(await input.inputValue(), String(state[species.id]));
    const output = page
      .locator(".recipe-measurement")
      .filter({
        has: page.getByText("Population after the change", { exact: true }),
      })
      .locator("output");
    assert.equal(
      parseFloat(await output.innerText()),
      expected.selectedPopulation,
    );
  };
  const geometry = async () => {
    const result = await page.evaluate(() => {
      const cards = [...document.querySelectorAll(".board-content")];
      const targets = [
        ...document.querySelectorAll(
          ".food-explorer-toolbar button,.food-population-control button,.food-population-control select,.food-population-control input,.food-path-card",
        ),
      ].filter((e) => e.getBoundingClientRect().height > 0);
      const nodes = [...document.querySelectorAll(".food-path-card")];
      const overlaps = [];
      for (let i = 0; i < nodes.length; i++) {
        const a = nodes[i].getBoundingClientRect();
        for (const node of nodes.slice(i + 1)) {
          const b = node.getBoundingClientRect();
          if (
            Math.min(a.right, b.right) - Math.max(a.left, b.left) > 1 &&
            Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) > 1
          )
            overlaps.push([
              nodes[i].getAttribute("aria-label"),
              node.getAttribute("aria-label"),
            ]);
        }
      }
      return {
        overlaps,
        overflow: document.documentElement.scrollWidth > innerWidth,
        cards: cards.map((e) => ({
          height: e.clientHeight,
          scrollHeight: e.scrollHeight,
          width: e.clientWidth,
          scrollWidth: e.scrollWidth,
        })),
        small: targets
          .filter((e) => e.getBoundingClientRect().height < 44)
          .map((e) => ({
            label: e.textContent,
            height: e.getBoundingClientRect().height,
          })),
      };
    });
    assert.equal(result.overflow, false);
    assert.deepEqual(result.overlaps, [], "Organism targets must not overlap");
    assert.ok(
      result.cards.every(
        (c) => c.scrollHeight <= c.height + 2 && c.scrollWidth <= c.width + 2,
      ),
      JSON.stringify(result),
    );
    assert.deepEqual(result.small, []);
  };
  const capture = async (name) => {
    await page.waitForTimeout(150);
    await geometry();
    await page.screenshot({
      path: path.join(captures, `food-web-${name}-1440x900.png`),
    });
  };
  const choose = async (index) => {
    await selector.selectOption(String(index));
    state.selection = index;
    await verify();
  };
  const set = async (value) => {
    await input.fill(String(value));
    await input.press("Tab");
    state[foodWebSpecies[state.selection].id] = value;
    await verify();
  };
  try {
    await page.goto(`${base}/experiments?experiment=food-web`);
    await scene.waitFor();
    await page.waitForTimeout(700);
    assert.equal(
      await page.getByRole("button", { name: /^Explore / }).count(),
      3,
    );
    await capture("one-feeding-path");
    await page
      .getByRole("button", { name: "What if wolves disappear?", exact: true })
      .click();
    state.pressure = 0;
    state.selection = 12;
    await verify();
    assert.ok(model.measure(state).selectedPopulation > 100);
    await capture("guided-wolf-removal");
    await page
      .getByRole("button", { name: "Restore whole web", exact: true })
      .click();
    state = { ...model.defaults };
    await verify();
    await choose(0);
    await choose(8);
    await page
      .getByRole("button", { name: "← Previous organism", exact: true })
      .click();
    state.selection = 0;
    await verify();
    await page
      .getByRole("button", { name: "← Previous organism", exact: true })
      .click();
    state.selection = 12;
    await verify();
    for (let i = 0; i < foodWebSpecies.length; i++) {
      await choose(i);
      await geometry();
      const slider = page.getByRole("slider", {
        name: "Adjust selected population",
        exact: true,
      });
      await slider.focus();
      await slider.press("ArrowRight");
      state[foodWebSpecies[i].id] = 101;
      await verify();
      await set(0);
      await set(150);
      await set(100);
      await input.fill("151");
      await input.press("Tab");
      await page
        .getByRole("alert")
        .filter({ hasText: "Current value" })
        .waitFor();
      assert.equal(
        await scene.getAttribute("data-producer"),
        String(model.measure(state).producer),
      );
      await geometry();
      await input.focus();
      await input.press("Escape");
      await verify();
    }
    await choose(0);
    await set(0);
    await page
      .getByRole("button", { name: "Explore Elk", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    state.selection = 12;
    await verify();
    assert.equal(await scene.locator(".food-path-card").count(), 3);
    assert.ok(
      model.measure(state).selectedPopulation > 100,
      "Wolf removal releases elk while its starting setting remains at baseline",
    );
    await capture("elk-connections");
    await page
      .getByRole("button", { name: "Species details", exact: true })
      .click();
    const dialog = page.getByRole("dialog", { name: "Organism details" });
    await dialog.waitFor();
    assert.match(await dialog.innerText(), /Cervus canadensis/);
    assert.match(await dialog.innerText(), /Feeds on/);
    assert.match(await dialog.innerText(), /Eaten by/);
    await page.screenshot({
      path: path.join(captures, "food-web-species-details-1440x900.png"),
    });
    await dialog
      .getByRole("button", { name: "Willows →", exact: true })
      .click();
    state.selection = 19;
    await verify();
    assert.equal(await dialog.isVisible(), false);
    await set(50);
    assert.equal(state.pressure, 0);
    await capture("combined-interventions");
    await page
      .getByRole("button", { name: "← Previous organism", exact: true })
      .click();
    state.selection = 12;
    await verify();
    await choose(8);
    await capture("grizzly-alternative-foods");
    await page
      .getByRole("button", { name: "Restore whole web", exact: true })
      .click();
    state = { ...model.defaults };
    await verify();
    for (let i = 0; i < foodWebSpecies.length; i++) {
      await choose(i);
      await page
        .getByRole("button", { name: "Species details", exact: true })
        .click();
      await dialog.waitFor();
      assert.ok(
        (await dialog.innerText()).includes(foodWebSpecies[i].scientific),
      );
      assert.equal(
        await dialog
          .getByRole("link", { name: "Species source ↗", exact: true })
          .getAttribute("href"),
        foodWebSpecies[i].source,
      );
      await page.keyboard.press("Escape");
      assert.equal(await dialog.isVisible(), false);
      assert.equal(
        await page
          .getByRole("button", { name: "Species details", exact: true })
          .evaluate((e) => document.activeElement === e),
        true,
      );
    }
    await choose(23);
    await set(0);
    await capture("decomposition-removed");
    assert.ok(model.measure(state).producer < 100);
    await page
      .getByRole("button", { name: "Restore whole web", exact: true })
      .click();
    state = { ...model.defaults };
    await verify();
    await page
      .getByRole("button", { name: "Browse 24 organisms", exact: true })
      .click();
    const directory = page.getByRole("dialog", {
      name: "Browse Yellowstone organisms",
    });
    assert.equal(
      await directory.locator(".food-directory-list button").count(),
      24,
    );
    await page.screenshot({
      path: path.join(captures, "food-web-organism-browser-1440x900.png"),
    });
    await directory
      .getByRole("textbox", { name: "Find an organism" })
      .fill("lynx");
    assert.equal(
      await directory.locator(".food-directory-list button").count(),
      1,
    );
    await directory.getByRole("button", { name: /Canada lynx/ }).click();
    state.selection = 2;
    await verify();
    assert.equal(await directory.isVisible(), false);
    await capture("restored-web");
    assert.deepEqual(errors, []);
    console.log(
      "Food-web exploration browser: all 24 selectors, keyboard controls, min/max and invalid drafts; 24 sourced species dialogs with Escape/focus recovery; feeding-path and selector history, guided wolf removal, searchable organism browsing, multiple interventions, alternative diets, nutrient return and whole-web reset passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
