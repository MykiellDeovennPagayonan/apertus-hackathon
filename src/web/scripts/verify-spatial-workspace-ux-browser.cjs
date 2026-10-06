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
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43002";
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
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    const authored = modelRecipe("prefabs/AuthoredGasContainer").document;
    authored.presentation = convertToBoard(authored);
    const document = canonicalDocument(authored);
    await page.addInitScript(
      ({ document }) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      { document },
    );
    await page.goto(`${base}/experiments/builder`);
    await page
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document
            .authored,
      );
    await page
      .locator(".board-item-tools")
      .getByRole("button", { name: "Move Gas container", exact: true })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByLabel("Selection actions", { exact: true }).click();
    await page
      .getByRole("button", { name: "Arrange contents separately", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Fit content", exact: true })
      .click();
    const separated = await draft();
    assert.deepEqual(separated.presentation.separatedLayouts, ["layout/scene"]);
    assert.ok(
      separated.presentation.items.some((i) => i.layoutId === "layout/canvas"),
    );
    assert.ok(
      separated.presentation.items.some(
        (i) => i.layoutId === "layout/display/pressureKPa",
      ),
    );
    const scene = page.locator('.board-item[data-board-scene="true"]');
    await scene.waitFor();
    const metrics = await scene.evaluate((el) => {
      const content = el.querySelector(".board-content");
      const svg = el.querySelector(".composition-display");
      const icon = el.querySelector(".scene-icon-button svg");
      const button = icon.closest("button");
      return {
        overflow: content.scrollHeight - content.clientHeight,
        width: svg.clientWidth,
        height: svg.clientHeight,
        sceneWidth: el.clientWidth,
        sceneHeight: el.clientHeight,
        icon: getComputedStyle(icon).width,
        padding: getComputedStyle(button).padding,
      };
    });
    assert.ok(
      metrics.overflow <= 1,
      `Scene should not scroll: ${JSON.stringify(metrics)}`,
    );
    assert.ok(Math.abs(metrics.width - metrics.sceneWidth) <= 2);
    assert.ok(Math.abs(metrics.height - metrics.sceneHeight) <= 2);
    assert.equal(metrics.icon, "22px");
    assert.equal(metrics.padding, "0px");
    await scene.locator(".board-item-tools button").first().focus();
    await page.keyboard.press("Enter");
    const before = await draft();
    await page.getByLabel("Position and size", { exact: true }).click();
    await page.getByLabel("width", { exact: true }).fill("800");
    await page.getByLabel("height", { exact: true }).fill("560");
    await page
      .getByRole("button", { name: "Apply placement", exact: true })
      .click();
    const after = await draft();
    for (const i of before.presentation.items.filter(
      (i) => i.layoutId !== "layout/canvas",
    ))
      assert.deepEqual(
        after.presentation.items.find((j) => j.id === i.id).rect,
        i.rect,
        "Resizing a scene preserves sibling positions and sizes",
      );
    assert.deepEqual(
      after.nodes,
      before.nodes,
      "Scene resize does not change model state",
    );
    await page.getByLabel("Position and size", { exact: true }).press("Escape");
    const grip = scene.getByRole("button", {
      name: "Move canvas navigation tools",
      exact: true,
    });
    await grip.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowDown");
    assert.notEqual(
      await scene
        .locator(".scene-toolbar")
        .evaluate((el) => el.style.translate),
      "0px",
    );
    await page.keyboard.press("Escape");
    assert.equal(
      await scene
        .locator(".scene-toolbar")
        .evaluate((el) => el.style.translate),
      "0px",
    );
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal((await draft()).presentation.separatedLayouts, undefined);
    await page.getByRole("button", { name: "Redo", exact: true }).click();
    await page.reload();
    await page
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page.screenshot({
      path: "/tmp/spatial-ux-builder.png",
      fullPage: true,
    });
    // Enter through the builder button: this is a separate route from the
    // experiment catalogue and must keep the full spatial workspace.
    const beforeTrying = await draft();
    await page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    await page
      .locator(".composition-builder.is-expanded .spatial-board.is-workspace")
      .waitFor();
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 1024, height: 603 },
      { width: 390, height: 844 },
    ]) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(250);
      const bounds = await page
        .locator(".composition-preview")
        .evaluate((el) => {
          const rect = el.getBoundingClientRect();
          return {
            width: rect.width,
            bottom: rect.bottom,
            border: getComputedStyle(el).borderTopWidth,
            pageOverflow: document.documentElement.scrollHeight - innerHeight,
            runtimeFooter: !!el.querySelector(".recipe-runtime-actions"),
            titleVisible:
              el
                .querySelector(".recipe-lesson > header")
                .getBoundingClientRect().height > 0,
          };
        });
      assert.ok(bounds.width >= viewport.width - 2, JSON.stringify(bounds));
      assert.ok(bounds.bottom <= viewport.height + 1, JSON.stringify(bounds));
      assert.ok(bounds.pageOverflow <= 1, JSON.stringify(bounds));
      assert.equal(bounds.border, "0px");
      assert.equal(bounds.runtimeFooter, false);
      assert.equal(bounds.titleVisible, true);
      const zoom = await page
        .locator(".board-camera-tools output")
        .textContent();
      assert.ok(
        parseInt(zoom, 10) >= 75,
        `Try lesson opens at a readable scale: ${zoom}`,
      );
      await page.screenshot({
        path: `/tmp/spatial-ux-try-${viewport.width}.png`,
        fullPage: true,
      });
    }
    await page
      .getByRole("button", { name: "Return to builder", exact: true })
      .click();
    await page
      .locator(
        ".composition-builder:not(.is-expanded) .spatial-board.is-workspace",
      )
      .waitFor();
    assert.deepEqual(
      (await draft()).presentation,
      beforeTrying.presentation,
      "Trying the lesson preserves the authored placement",
    );
    await page.setViewportSize({ width: 1440, height: 900 });
    const flowPage = await browser.newPage({
      viewport: { width: 1024, height: 603 },
    });
    flowPage.on("pageerror", (error) => errors.push(error.message));
    const flowDocument = canonicalDocument(
      modelRecipe("prefabs/AuthoredGasContainer").document,
    );
    await flowPage.addInitScript(
      ({ document }) =>
        localStorage.setItem(
          "apertus-builder-draft-v1",
          JSON.stringify({ document, valid: document }),
        ),
      { document: flowDocument },
    );
    await flowPage.goto(`${base}/experiments/builder`);
    await flowPage
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    await flowPage.getByRole("button", { name: "Build", exact: true }).click();
    await flowPage
      .getByRole("navigation", { name: "Builder panels" })
      .getByText("Lesson settings", { exact: true })
      .click();
    await flowPage
      .getByRole("button", { name: "Mobile preview", exact: true })
      .click();
    await flowPage
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    await flowPage
      .locator(
        ".composition-builder.is-expanded .spatial-board.is-workspace.is-auto-layout",
      )
      .waitFor();
    assert.equal(
      await flowPage.locator(".composition-preview.is-mobile").count(),
      0,
      "Trying a lesson leaves the simulated mobile authoring frame",
    );
    await flowPage.screenshot({
      path: "/tmp/spatial-ux-try-flow.png",
      fullPage: true,
    });
    await flowPage
      .getByRole("button", { name: "Return to builder", exact: true })
      .click();
    await flowPage.locator(".composition-preview.is-mobile").waitFor();
    await flowPage.close();
    for (const demo of [
      "gas",
      "projectile",
      "bridge",
      "town",
      "counting",
      "arithmetic",
      "equal-groups",
      "fraction-builder",
      "fraction-number-line",
      "ratio",
      "area-perimeter",
      "coordinates",
      "probability",
    ]) {
      await page.goto(`${base}/experiments?experiment=${demo}`);
      await page.locator(".spatial-board.is-workspace").waitFor();
      await page.waitForTimeout(500);
      if (demo === "gas") {
        const volume = page.getByRole("slider", {
          name: "Volume",
          exact: true,
        });
        await volume.focus();
        await page.keyboard.press("ArrowLeft");
        const nextVolume = Number(await volume.inputValue());
        assert.ok(
          nextVolume < 1 && nextVolume > 0,
          "Keyboard changes the live volume control",
        );
        const pressure = ((8.314462618 * 300) / 1000 / nextVolume).toFixed(3);
        await page.waitForFunction(
          (expected) =>
            document
              .querySelector('[aria-label="Pressure"]')
              ?.textContent.includes(expected),
          pressure,
        );
      }
      if (demo === "projectile") {
        const angles = page.getByRole("slider", {
          name: "Launch angle",
          exact: true,
        });
        await angles.first().focus();
        await page.keyboard.press("ArrowRight");
        assert.ok(
          Number(await angles.first().inputValue()) > 30,
          "Keyboard adjusts the first projectile angle",
        );
        assert.equal(
          await angles.nth(1).inputValue(),
          "60",
          "Changing the first projectile preserves the comparison projectile",
        );
      }
      if (demo === "town") {
        await page.getByRole("button", { name: "Pause", exact: true }).click();
        assert.equal(
          await page.getByRole("button", { name: "Play", exact: true }).count(),
          1,
        );
      }

      const scrolls = await page
        .locator(".board-content")
        .evaluateAll((elements) =>
          elements.map((el) => ({
            height: el.clientHeight,
            scroll: el.scrollHeight,
            text: el.textContent.slice(0, 80),
          })),
        );
      assert.ok(
        scrolls.every((item) => item.scroll <= item.height + 1),
        `${demo} cards have no accidental overflow: ${JSON.stringify(scrolls)}`,
      );
      await page.getByLabel("Board navigation help", { exact: true }).click();
      await page
        .getByRole("button", { name: "Starting view", exact: true })
        .click();
      await page
        .getByLabel("Board navigation help", { exact: true })
        .press("Escape");
      assert.ok(
        Number.parseInt(
          await page.getByLabel("Board zoom", { exact: true }).textContent(),
          10,
        ) >= 75,
        "Initial view keeps content readable",
      );
      await page.screenshot({
        path: `/tmp/spatial-ux-${demo}-initial.png`,
        fullPage: true,
      });
      for (const [width, height] of [
        [1440, 900],
        [1024, 603],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(200);
        const bounds = await page.locator(".board-viewport").boundingBox();
        const composer = await page
          .locator(".workspace-composer")
          .boundingBox();
        assert.ok(
          bounds.y + bounds.height < composer.y,
          "Workspace reserves prompt space",
        );
        assert.equal(
          await page.evaluate(
            () =>
              document.documentElement.scrollWidth > innerWidth ||
              document.documentElement.scrollHeight > innerHeight,
          ),
          false,
        );
        assert.equal(
          await page
            .locator(".workspace-stage")
            .evaluate((el) => el.scrollHeight > el.clientHeight),
          false,
        );
        await page
          .getByRole("button", { name: "Fit content", exact: true })
          .click();
        await page.screenshot({
          path: `/tmp/spatial-ux-${demo}-${width}.png`,
          fullPage: true,
        });
      }
      await page.setViewportSize({ width: 1440, height: 900 });
    }
    assert.deepEqual(errors, []);
    console.log(
      "Spatial workspace UX: independent scene sizing, readable icons, movable tools, separation, undo/redo, reload and learner prompt clearance passed",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
