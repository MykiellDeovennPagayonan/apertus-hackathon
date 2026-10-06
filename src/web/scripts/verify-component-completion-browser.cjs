const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { modelRecipe, builtInRecipe, createPublicNode } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { emptyLayout } = load("src/simulations/runtime/authoring/types.ts");
const output = "/private/tmp/component-completion";
fs.mkdirSync(output, { recursive: true });
async function fixture(browser, authored, options = {}) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
    ...options,
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      /unique.*key|hydration|cannot be a descendant|children.*title/i.test(
        message.text(),
      )
    )
      errors.push(message.text());
  });
  const document = canonicalDocument(authored);
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
  await page.locator(".recipe-lesson").waitFor();
  return { page, lesson: page.locator(".recipe-lesson"), errors };
}
async function noOverflow(page) {
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth + 1,
    ),
    "page stays within viewport",
  );
}
(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
    ...(fs.existsSync(chromium.executablePath())
      ? {}
      : {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }),
  });
  try {
    const reviews = [
      ["models/counting", "Choose a counting task"],
      ["models/equal-groups", "Choose an equal groups task"],
      ["models/fraction-number-line", "Choose a fraction task"],
      ["prefabs/chemistry/Conservation", "Reaction coefficients"],
      ["prefabs/chemistry/ReactionRate", "Reaction temperature"],
      ["prefabs/physical-systems/Pendulum", "Pendulum length"],
      ["prefabs/physical-systems/RollingTrack", "Ramp height"],
      ["prefabs/physical-systems/ResistiveCircuit", "Number of bulbs"],
      ["prefabs/natural-systems/DiffusionField", "Diffusion coefficient"],
      ["prefabs/natural-systems/PredatorPrey", "Starting rabbit population"],
      ["prefabs/natural-systems/PlantGrowth", "Available light"],
      ["prefabs/dynamic-systems/CompoundGrowth", "Starting balance"],
      ["prefabs/dynamic-systems/RingTraffic", "Following time gap"],
      ["prefabs/dynamic-systems/CheckoutQueue", "Customer arrival rate"],
    ];
    for (const [definition, label] of reviews) {
      const { page, lesson, errors } = await fixture(
        browser,
        modelRecipe(definition).document,
      );
      const form = lesson
        .locator("form")
        .filter({ has: page.getByText(label, { exact: false }) })
        .first();
      await form.waitFor();
      const input = form.getByRole("spinbutton").first();
      const initial = await input.inputValue();
      await input.fill("9999999");
      await form
        .getByRole("button", { name: /Apply changes|Start this activity/ })
        .click();
      await form.locator(".catalog-feedback--error").waitFor();
      assert.equal(await input.inputValue(), "9999999");
      assert.equal(await input.getAttribute("aria-invalid"), "true");
      await form
        .getByRole("button", { name: "Discard edits", exact: true })
        .click();
      assert.equal(await input.inputValue(), initial);
      await lesson
        .getByRole("button", { name: "Reset experiment", exact: true })
        .click();
      assert.equal(await input.inputValue(), initial);
      assert.ok(
        !(await lesson.textContent()).includes('"value":'),
        `${definition}: no JSON payload presentation`,
      );
      await page
        .getByRole("button", { name: "Try lesson ↗", exact: true })
        .click();
      assert.equal(await lesson.locator(".recipe-author-label").count(), 0);
      const primary = lesson.locator(".recipe-action--primary").first();
      assert.ok(
        await primary.evaluate(
          (button) => button.getBoundingClientRect().height >= 44,
        ),
      );
      const controls = await lesson
        .locator("input, select, button")
        .evaluateAll((elements) =>
          elements
            .filter(
              (el) =>
                el.getClientRects().length &&
                !el.getAttribute("aria-label") &&
                !el.labels?.length &&
                !(el.textContent || "").trim(),
            )
            .map((el) => el.outerHTML),
        );
      assert.deepEqual(
        controls,
        [],
        `${definition}: every visible control has a name`,
      );
      const slug = definition.split("/").at(-1);
      await page.screenshot({
        path: `${output}/${slug}-desktop.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await noOverflow(page);
      await input.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `${output}/${slug}-mobile.png` });
      // Text scaling should reflow controls while plots retain deliberate internal navigation.
      await page.addStyleTag({
        content: "html { font-size: 24px !important; }",
      });
      await noOverflow(page);
      assert.deepEqual(
        errors,
        [],
        `${definition}: no runtime or semantic rendering errors`,
      );
      await page.close();
    }
    // Accepted setter changes and external reset preserve a dirty draft with an explicit explanation.
    const growth = await fixture(
      browser,
      modelRecipe("prefabs/dynamic-systems/CompoundGrowth").document,
    );
    const growthForm = growth.lesson
      .locator("form")
      .filter({
        has: growth.page.getByText("Starting balance", { exact: false }),
      })
      .first();
    const balance = growthForm.getByRole("spinbutton");
    const original = await balance.inputValue();
    await balance.fill("1500");
    await growthForm
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    assert.equal(await balance.inputValue(), "1500");
    await balance.fill("1600");
    await growth.lesson
      .getByRole("button", { name: "Reset experiment", exact: true })
      .click();
    assert.equal(await balance.inputValue(), "1600");
    await growthForm
      .getByText(/activity changed while you were editing/)
      .waitFor();
    await growthForm
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    assert.equal(await balance.inputValue(), original);
    // Primary computed colors: WCAG text contrast and target sizing in the real host.
    const contrast = await growthForm
      .getByRole("button", { name: "Apply changes", exact: true })
      .evaluate((button) => {
        const style = getComputedStyle(button);
        const lum = (color) => {
          const rgb = color
            .match(/[\d.]+/g)
            .slice(0, 3)
            .map(Number)
            .map((value) => value / 255)
            .map((value) =>
              value <= 0.04045
                ? value / 12.92
                : ((value + 0.055) / 1.055) ** 2.4,
            );
          return rgb[0] * 0.2126 + rgb[1] * 0.7152 + rgb[2] * 0.0722;
        };
        const a = lum(style.color),
          b = lum(style.backgroundColor);
        return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
      });
    assert.ok(contrast >= 4.5, `primary text contrast: ${contrast}`);
    await growth.page.close();
    // Container sizing, independently of a wide browser viewport.
    const groups = await fixture(
      browser,
      modelRecipe("models/equal-groups").document,
    );
    const groupsSvg = groups.lesson.locator(".simulation-surface svg").first();
    await groupsSvg.evaluate(
      (svg) => (svg.closest(".recipe-scene-content").style.width = "300px"),
    );
    await groups.page.waitForFunction(() =>
      document
        .querySelector(".simulation-surface svg")
        ?.getAttribute("viewBox")
        ?.startsWith("0 0 400"),
    );
    await groups.page.screenshot({
      path: `${output}/groups-narrow-desktop.png`,
    });
    await groups.page.close();
    // Reduced motion: no automatic time advance, opt-in animation, and precise manual stepping.
    const reduced = await fixture(
      browser,
      modelRecipe("models/Projectile").document,
      { reducedMotion: "reduce", hasTouch: true },
    );
    await reduced.lesson.getByText(/Automatic motion is paused/).waitFor();
    const elapsed = reduced.lesson.getByRole("region", {
      name: "Elapsed time",
      exact: true,
    });
    await reduced.lesson
      .locator("details")
      .filter({
        has: reduced.page.getByText("More observations and model assumptions", {
          exact: true,
        }),
      })
      .locator("summary")
      .first()
      .click();
    assert.ok((await elapsed.textContent()).includes("0"));
    await reduced.page.waitForTimeout(400);
    assert.equal((await elapsed.locator("output").textContent()).trim(), "0s");
    await reduced.lesson
      .getByRole("button", {
        name: "Advance time by 0.25 seconds",
        exact: true,
      })
      .tap();
    assert.ok((await elapsed.textContent()).includes("0.25"));
    await reduced.lesson
      .getByRole("checkbox", { name: "Animate simulation", exact: true })
      .check();
    await reduced.page.waitForTimeout(400);
    assert.ok(!(await elapsed.textContent()).includes("0.25s"));
    assert.deepEqual(reduced.errors, []);
    await reduced.page.screenshot({
      path: `${output}/reduced-motion.png`,
      fullPage: true,
    });
    await reduced.page.close();
    // Camera navigation is accessible and does not edit the authored town.
    const town = await fixture(
      browser,
      builtInRecipe("recipes/TownLab").document,
    );
    const saved = () =>
      town.page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document,
      );
    const townBefore = await saved();
    for (const name of [
      "Rotate left",
      "Rotate right",
      "Zoom in",
      "Zoom out",
      "Reset camera",
    ]) {
      const action = town.lesson.getByRole("button", { name, exact: true });
      await action.focus();
      await action.press("Enter");
    }
    await town.lesson
      .getByRole("checkbox", { name: "Explore camera with gestures" })
      .check();
    await town.lesson
      .getByRole("checkbox", { name: "Explore camera with gestures" })
      .uncheck();
    assert.deepEqual(await saved(), townBefore);
    assert.deepEqual(town.errors, []);
    assert.ok(!(await town.lesson.textContent()).includes("town/citizen-"));
    assert.ok(
      !(await town.lesson.textContent()).includes("A plot is unavailable"),
    );
    await town.page.screenshot({
      path: `${output}/town-camera.png`,
      fullPage: true,
    });
    await town.page.close();
    // Geometry preview cancels cleanly; keyboard resize and rotation commit.
    const square = await fixture(
      browser,
      modelRecipe("prefabs/AuthoredSquare").document,
    );
    await square.page
      .getByRole("button", { name: "Select Square", exact: true })
      .focus();
    await square.page
      .getByRole("button", { name: "Select Square", exact: true })
      .press("Enter");
    const dialog = square.page.getByRole("dialog", {
      name: "Square",
      exact: true,
    });
    await dialog.waitFor();
    const config = () =>
      square.page.evaluate(
        () =>
          JSON.parse(
            localStorage.getItem("apertus-builder-draft-v1"),
          ).document.authored.nodes.find((n) => n.id === "model").configuration,
      );
    const before = await config();
    const resize = dialog.getByRole("button", {
      name: "Square resize",
      exact: true,
    });
    await resize.focus();
    await resize.press("ArrowRight");
    assert.ok((await config()).side > before.side);
    const rotate = dialog.getByRole("button", {
      name: "Square rotate",
      exact: true,
    });
    await rotate.focus();
    await rotate.press("ArrowRight");
    assert.equal((await config()).rotation, (before.rotation + 5) % 360);
    const accepted = await config();
    const center = dialog.getByRole("button", {
      name: "Square center",
      exact: true,
    });
    const box = await center.boundingBox();
    await square.page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await square.page.mouse.down();
    await square.page.mouse.move(
      box.x + box.width / 2 + 25,
      box.y + box.height / 2 - 15,
      { steps: 4 },
    );
    assert.deepEqual(
      await config(),
      accepted,
      "pointer preview does not persist",
    );
    await square.page.keyboard.press("Escape");
    await square.page.mouse.up();
    assert.deepEqual(
      await config(),
      accepted,
      "Escape preserves authored geometry",
    );
    assert.deepEqual(square.errors, []);
    await square.page.screenshot({
      path: `${output}/square-keyboard-cancellation.png`,
      fullPage: true,
    });
    await square.page.close();
    // Learner-safe repeater failure and deliberately unavailable formula.
    const document = modelRecipe("models/probability").document;
    const repeater = createPublicNode(
      "layout/Repeater",
      "repeater",
      "scope/lab",
    );
    repeater.configuration.itemKey = "missing";
    const formula = createPublicNode(
      "displays/Formula",
      "formula",
      "scope/lab",
    );
    formula.configuration.text = "";
    document.nodes.push(repeater, formula);
    document.layout.children.push(
      { ...emptyLayout("layout/repeater"), node: "repeater" },
      { ...emptyLayout("layout/formula"), node: "formula" },
    );
    document.connections.push({
      id: "repeat-values",
      kind: "value",
      from: { node: "model", port: "frequencies" },
      to: { node: "repeater", port: "value" },
    });
    const secondary = await fixture(browser, document);
    await secondary.page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    await secondary.lesson
      .getByText("These items are temporarily unavailable.", { exact: true })
      .waitFor();
    assert.ok(
      !(await secondary.lesson.textContent()).includes("stable item keys"),
    );
    await secondary.lesson
      .getByText("Formula unavailable", { exact: true })
      .waitFor();
    assert.deepEqual(secondary.errors, []);
    await secondary.page.close();
    console.log(
      `Component completion browser: ${reviews.length} activity/domain screens, draft rejection/reset/external change, named controls, 44px primary targets, contrast ${contrast.toFixed(2)}:1, narrow desktop sizing, mobile/text scaling, reduced motion/touch stepping and learner-safe secondary states passed. Captures: ${output}`,
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
