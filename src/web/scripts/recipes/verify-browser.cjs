const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const cases = fs
  .readdirSync(path.join(__dirname, "cases"))
  .map((file) =>
    JSON.parse(fs.readFileSync(path.join(__dirname, "cases", file))),
  );
const url = process.env.UX_TEST_URL || "http://localhost:43100";
const captures =
  process.env.RECIPE_CAPTURE_DIR || "/tmp/apertus-recipe-captures";
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
  });
  page.setDefaultTimeout(15000);
  const errors = [];
  page.on("pageerror", (error) => {
    const message = `${page.url()}: ${error.stack || error.message}`;
    errors.push(message);
    console.error(message);
  });
  // Keyboard focus pans a card into the usable spatial workspace before interaction.
  async function clickLessonButton(name) {
    const button = page.getByRole("button", { name, exact: true });
    await button.focus();
    await button.click();
  }
  async function open(slug) {
    await page.goto(`${url}/experiments?experiment=${slug}`);
    await page.locator(".board-item").first().waitFor();
    await page.waitForTimeout(650);
  }
  try {
    for (const viewport of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 1024, height: 600 },
    ]) {
      await page.setViewportSize(viewport);
      for (const recipeCase of cases) {
        if (recipeCase.desktopOnly && viewport.width !== 1440) continue;
        await open(recipeCase.slug);
        assert.equal(
          await page.locator(".board-item").count(),
          recipeCase.visibleItems,
        );
        assert.equal(
          await page.locator(".workspace-identity h1").innerText(),
          recipeCase.title,
        );
        const geometry = await page
          .locator(recipeCase.visualSelector || ".board-item")
          .first()
          .evaluate((element, htmlVisual) => {
            const item = element.closest(".board-item") || element;
            const svg = htmlVisual
              ? element
              : element.querySelector("svg[viewBox]");
            return {
              item: item.getBoundingClientRect().toJSON(),
              svg: svg?.getBoundingClientRect().toJSON(),
            };
          }, Boolean(recipeCase.visualSelector));
        assert.ok(
          geometry.svg.width > (recipeCase.visualMinWidth ?? 180) &&
            geometry.svg.height > (recipeCase.visualMinHeight ?? 100),
          `${recipeCase.slug} ${viewport.width}: scene too small ${JSON.stringify(geometry)}`,
        );
        assert.ok(
          geometry.svg.bottom <= geometry.item.bottom + 2,
          `${recipeCase.slug}: scene is clipped`,
        );
        assert.equal(
          await page.locator('.board-item input[type="number"]').count(),
          0,
          `${recipeCase.slug}: native number input`,
        );
        const overflowing = await page
          .locator(".board-content")
          .evaluateAll((es) =>
            es
              .filter(
                (e) =>
                  e.scrollHeight > e.clientHeight + 2 ||
                  e.scrollWidth > e.clientWidth + 2,
              )
              .map((e) => ({
                component: e.parentElement.dataset.boardComponent,
                height: e.clientHeight,
                scroll: e.scrollHeight,
                width: e.clientWidth,
                scrollWidth: e.scrollWidth,
              })),
          );
        assert.deepEqual(
          overflowing,
          [],
          `${recipeCase.slug} ${viewport.width}: overflowing card ${JSON.stringify(overflowing)}`,
        );
        const scrollingCards = await page
          .locator(".board-item *")
          .evaluateAll((es) =>
            es
              .filter(
                (e) =>
                  [
                    getComputedStyle(e).overflowY,
                    getComputedStyle(e).overflowX,
                  ].some((v) => v === "auto" || v === "scroll") &&
                  (e.scrollHeight > e.clientHeight + 2 ||
                    e.scrollWidth > e.clientWidth + 2),
              )
              .map((e) => e.className),
          );
        assert.deepEqual(
          scrollingCards,
          [],
          `${recipeCase.slug}: scrolling inside cards`,
        );
        if (recipeCase.slug === "projectile") {
          const widths = await page
            .getByRole("button", { name: "Launch both", exact: true })
            .evaluate((e) => ({
              button: e.getBoundingClientRect().width,
              card: e.closest(".board-item").getBoundingClientRect().width,
            }));
          assert.ok(
            widths.button > widths.card * 0.85,
            `Launch button must fill its card: ${JSON.stringify(widths)}`,
          );
        }
        if (
          [
            "equal-groups",
            "fraction-builder",
            "fraction-number-line",
            "ratio",
            "area-perimeter",
            "coordinates",
            "probability",
          ].includes(recipeCase.slug)
        ) {
          if (viewport.width === 390) {
            const navigation = await page
              .locator(".board-workspace-tools")
              .boundingBox();
            const activity = await page
              .locator(".board-item")
              .first()
              .boundingBox();
            assert.ok(
              navigation.y + navigation.height <= activity.y + 2,
              `${recipeCase.slug}: navigation obscures activity`,
            );
          }
          // Opening controls must be readable and operable at the displayed scale.
          const fields = page.locator(
            ':is(.activity-control, .scalar-control) input[type="text"]',
          );
          assert.equal(
            await fields.count(),
            recipeCase.slug === "fraction-number-line" ||
              recipeCase.slug === "probability"
              ? 1
              : 2,
            `${recipeCase.slug}: excess opening fields`,
          );
          if (recipeCase.slug === "fraction-number-line") {
            const marker = await page
              .getByRole("button", {
                name: "Move fraction marker",
                exact: true,
              })
              .boundingBox();
            assert.ok(
              marker.width >= 43 && marker.width <= 60,
              "The fraction marker must retain its touch-sized handle after a viewBox change: " +
                JSON.stringify(marker),
            );
          }
          const targets = await fields.evaluateAll((es) =>
            es.map((e) => ({
              height: e.getBoundingClientRect().height,
              font: parseFloat(getComputedStyle(e).fontSize),
            })),
          );
          assert.ok(
            targets.every((t) => t.height >= 43 && t.font >= 24),
            `${recipeCase.slug}: small exact-value field ${JSON.stringify(targets)}`,
          );
          await page.emulateMedia({ reducedMotion: "reduce" });
          if (recipeCase.slug === "equal-groups") {
            await page
              .getByRole("textbox", { name: "Number of circles", exact: true })
              .fill("60");
            await page
              .getByRole("textbox", { name: "Number of baskets", exact: true })
              .fill("6");
            await clickLessonButton("Share circles");
            await page.getByText("60 ÷ 6 = 10", { exact: true }).waitFor();
          } else if (recipeCase.slug === "fraction-builder") {
            await page
              .getByRole("textbox", { name: "Bar A equal parts", exact: true })
              .fill("12");
            await page
              .getByRole("button", {
                name: "Bar A piece 12 of 12, unshaded",
                exact: true,
              })
              .focus();
            await page.keyboard.press("Enter");
          } else if (recipeCase.slug === "fraction-number-line") {
            await clickLessonButton("+ Add");
            await clickLessonButton("Show jumps");
            await page.getByText("3/4 + 1/4 = 1/1", { exact: true }).waitFor();
          } else if (recipeCase.slug === "ratio")
            await page
              .getByRole("textbox", { name: "Selected amount", exact: true })
              .fill("5");
          else if (recipeCase.slug === "area-perimeter")
            await page
              .getByRole("textbox", { name: "Width · m", exact: true })
              .fill("100");
          else if (recipeCase.slug === "coordinates") {
            await page
              .getByRole("textbox", { name: "X coordinate", exact: true })
              .fill("-10");
            await page
              .getByRole("button", {
                name: "Move coordinate point",
                exact: true,
              })
              .focus();
            await page.keyboard.press("ArrowRight");
            await page
              .getByText("Point (-9, 3) · x first, then y", { exact: true })
              .waitFor();
          } else {
            await clickLessonButton("Six-sided die");
            await page
              .getByRole("textbox", { name: "Number of trials", exact: true })
              .fill("10000");
            await clickLessonButton("Run 10,000 trials");
          }
          await page.waitForTimeout(100);
          const overflow = await page
            .locator(".board-content")
            .evaluateAll((es) =>
              es
                .filter(
                  (e) =>
                    e.scrollHeight > e.clientHeight + 2 ||
                    e.scrollWidth > e.clientWidth + 2,
                )
                .map((e) => ({
                  component: e.parentElement.dataset.boardComponent,
                  height: e.clientHeight,
                  scroll: e.scrollHeight,
                })),
            );
          assert.deepEqual(
            overflow,
            [],
            `${recipeCase.slug} ${viewport.width}: changed state overflow ${JSON.stringify(overflow)}`,
          );
          await page.screenshot({
            path: path.join(
              captures,
              `${recipeCase.slug}-changed-${viewport.width}x${viewport.height}.png`,
            ),
          });
          await page.emulateMedia({ reducedMotion: "no-preference" });
          await open(recipeCase.slug);
          const invalidFields = {
            "equal-groups": [
              ["Number of circles", "61"],
              ["Number of baskets", "7"],
            ],
            "fraction-builder": [
              ["Bar A equal parts", "0"],
              ["Bar B equal parts", "13"],
            ],
            "fraction-number-line": [["Target", "13/4"]],
            ratio: [
              ["Selected amount", "-1"],
              ["Whole amount", "0"],
            ],
            "area-perimeter": [
              ["Width · m", "0"],
              ["Height · m", "0"],
            ],
            coordinates: [
              ["X coordinate", "11"],
              ["Y coordinate", "-11"],
            ],
            probability: [["Number of trials", "10001"]],
          };
          for (const [name, value] of invalidFields[recipeCase.slug]) {
            const field = page.getByRole("textbox", { name, exact: true });
            await field.fill(value);
            await field.blur();
            assert.equal(await field.getAttribute("aria-invalid"), "true");
          }
          if (recipeCase.slug === "probability")
            assert.equal(
              await page
                .locator(
                  ":is(.activity-control, .scalar-control) .recipe-action--primary",
                )
                .isDisabled(),
              true,
              "An invalid trial draft must prevent running an old sample size",
            );
          await page.waitForTimeout(100);
          const invalidOverflow = await page
            .locator(".board-content")
            .evaluateAll((es) =>
              es
                .filter(
                  (e) =>
                    e.scrollHeight > e.clientHeight + 2 ||
                    e.scrollWidth > e.clientWidth + 2,
                )
                .map((e) => ({
                  component: e.parentElement.dataset.boardComponent,
                  height: e.clientHeight,
                  scroll: e.scrollHeight,
                })),
            );
          assert.deepEqual(
            invalidOverflow,
            [],
            `${recipeCase.slug} ${viewport.width}: invalid state overflow ${JSON.stringify(invalidOverflow)}`,
          );
          await page.screenshot({
            path: path.join(
              captures,
              `${recipeCase.slug}-invalid-${viewport.width}x${viewport.height}.png`,
            ),
          });
          await open(recipeCase.slug);
        }
        await page.screenshot({
          path: path.join(
            captures,
            `${recipeCase.slug}-${viewport.width}x${viewport.height}.png`,
          ),
        });
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    console.log("Checking equal groups interactions");
    await open("equal-groups");
    await clickLessonButton("Share circles");
    await page.getByText("14 ÷ 3 = 4 remainder 2", { exact: true }).waitFor();
    await clickLessonButton("Share again");
    const circles = page.getByRole("textbox", {
      name: "Number of circles",
      exact: true,
    });
    await circles.fill("60");
    await page
      .getByRole("textbox", { name: "Number of baskets", exact: true })
      .fill("1");
    await page.screenshot({
      path: path.join(captures, "equal-groups-maximum.png"),
    });
    await circles.fill("0");
    await page.getByText("0 ÷ 1 = 0", { exact: true }).waitFor();
    console.log("Checking fractions");
    await open("fraction-builder");
    await page
      .getByRole("button", {
        name: "Bar B piece 2 of 2, unshaded",
        exact: true,
      })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByText("3/4 < 2/2", { exact: true }).waitFor();
    await open("fraction-number-line");
    await clickLessonButton("Place marker at 3/4");
    await clickLessonButton("Check placement");
    await page.getByText("Yes! You placed 3/4.", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Move fraction marker", exact: true })
      .focus();
    await page.keyboard.press("ArrowRight");
    await page.getByText("Marker: 1/1 · 1", { exact: true }).waitFor();
    const target = page.getByRole("textbox", { name: "Target", exact: true });
    await target.fill("3/");
    await target.blur();
    assert.equal(await target.getAttribute("aria-invalid"), "true");
    await target.focus();
    await page.keyboard.press("Escape");
    assert.equal(await target.inputValue(), "3/4");
    await clickLessonButton("+ Add");
    await clickLessonButton("Show jumps");
    await page.getByText("3/4 + 1/4 = 1/1", { exact: true }).waitFor();
    await open("ratio");
    await page
      .getByRole("textbox", { name: "Selected amount", exact: true })
      .fill("5");
    await page
      .locator(".recipe-measurement-value")
      .filter({ hasText: /125/ })
      .waitFor();
    await open("area-perimeter");
    await page
      .getByRole("textbox", { name: "Width · m", exact: true })
      .fill("8");
    await page
      .locator(".recipe-measurement-value")
      .filter({ hasText: /32/ })
      .waitFor();
    await open("coordinates");
    await page
      .getByRole("textbox", { name: "X coordinate", exact: true })
      .fill("-4");
    await page
      .getByText("Point (-4, 3) · x first, then y", { exact: true })
      .waitFor();
    await open("probability");
    await clickLessonButton("Six-sided die");
    await page
      .getByRole("textbox", { name: "Number of trials", exact: true })
      .fill("600");
    await page
      .getByRole("button", { name: "Run 600 trials", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "600 die rolls", exact: true })
      .waitFor();
    assert.equal(
      await page.locator(".probability-scene [data-outcome]").count(),
      6,
    );
    await page.screenshot({
      path: path.join(captures, "probability-die-changed.png"),
    });
    for (const slug of [
      "equal-groups",
      "fraction-builder",
      "fraction-number-line",
      "ratio",
      "area-perimeter",
      "coordinates",
      "probability",
    ]) {
      await open(slug);
      await page.locator(".gas-experiment-tools summary").click();
      const downloading = page.waitForEvent("download");
      await page
        .getByRole("button", { name: "Save recipe", exact: true })
        .click();
      const download = await downloading;
      const saved = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
      assert.equal(saved.recipeVersion, 2);
      assert.equal(
        saved.document.nodes.find((n) => n.id === "model").definition,
        `models/${slug}`,
      );
      await page
        .getByRole("link", { name: "Remix in builder", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Try lesson ↗", exact: true })
        .click();
      await page.locator(".board-item").first().waitFor();
      assert.equal(
        await page.locator(":is(.activity-control, .scalar-control)").count(),
        ["ratio", "area-perimeter", "coordinates"].includes(slug) ? 2 : 1,
        `${slug}: independent task editor missing in remix`,
      );
      const builderValues = await page
        .locator(':is(.activity-control, .scalar-control) input[type="text"]')
        .evaluateAll((es) =>
          es.map((e) => ({
            font: parseFloat(getComputedStyle(e).fontSize),
            height: e.getBoundingClientRect().height,
          })),
        );
      assert.ok(
        builderValues.every((value) => value.font >= 24 && value.height >= 43),
        slug +
          ": builder form rules override exact-value presentation " +
          JSON.stringify(builderValues),
      );
      await page.screenshot({
        path: path.join(captures, `${slug}-builder-try-lesson.png`),
      });
    }
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open("equal-groups");
    await clickLessonButton("Share circles");
    await page.getByText("14 ÷ 3 = 4 remainder 2", { exact: true }).waitFor();
    await page.emulateMedia({ reducedMotion: "no-preference" });
    await open("arithmetic");
    assert.equal(
      await page
        .getByRole("button", {
          name: /Next step|Pause|Start this activity|Replay activity/,
        })
        .count(),
      0,
    );
    await page
      .getByRole("button", { name: /Circle 4, waiting to add/ })
      .click();
    await page
      .getByRole("button", { name: /Circle 5, waiting to add/ })
      .focus();
    await page.keyboard.press("Enter");
    await page.getByText("3 + 2 = 5", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "− Subtract", exact: true }).click();
    await page
      .getByRole("textbox", { name: "First number", exact: true })
      .fill("5");
    await page
      .getByRole("button", { name: /Circle 1, in result group/ })
      .click();
    await page
      .getByRole("button", { name: /Circle 2, in result group/ })
      .click();
    await page.getByText("5 − 2 = 3", { exact: true }).first().waitFor();
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.getByText("5 − 2 = ?", { exact: true }).waitFor();
    const first = page.getByRole("textbox", {
      name: "First number",
      exact: true,
    });
    await first.fill("");
    await first.blur();
    await page
      .getByRole("alert")
      .filter({ hasText: /Choose a whole number/ })
      .waitFor();
    await first.focus();
    await page.keyboard.press("Escape");
    assert.equal(await first.inputValue(), "5");
    await open("counting");
    for (let index = 1; index <= 5; index++)
      await page
        .getByRole("button", {
          name: new RegExp(`^Circle ${index}, not counted`),
        })
        .click();
    assert.equal(
      await page.locator(".math-readout--counting .math-equation").innerText(),
      "5",
    );
    await page
      .getByRole("button", { name: "Count again", exact: true })
      .click();
    assert.equal(
      await page.locator(".math-readout--counting .math-equation").innerText(),
      "0",
    );
    await page
      .getByRole("textbox", { name: "Number of circles", exact: true })
      .fill("20");
    assert.equal(
      await page
        .getByRole("button", { name: /^Circle \d+, not counted/ })
        .count(),
      20,
    );
    await page.getByRole("button", { name: /^Circle 20, not counted/ }).click();
    assert.equal(
      await page.locator(".math-readout--counting .math-equation").innerText(),
      "1",
    );
    await open("projectile");
    await page
      .getByRole("textbox", { name: "Exact ball 1 angle", exact: true })
      .fill("45");
    await page.getByText("Ball 1 · 45° · 20 m/s", { exact: true }).waitFor();
    await page
      .getByRole("button", { name: "Launch both", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Experiment options", exact: true })
      .count();
    await page.locator(".gas-experiment-tools summary").click();
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Save recipe", exact: true })
      .click();
    const download = await downloadPromise;
    const saved = JSON.parse(fs.readFileSync(await download.path(), "utf8"));
    assert.equal(saved.recipeVersion, 2);
    assert.equal(saved.document.presentation.items.length, 8);
    await page
      .getByRole("link", { name: "Remix in builder", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    await page.locator(".projectile-scene").waitFor();
    const builderScene = await page.locator(".projectile-scene").boundingBox();
    assert.ok(
      builderScene.width > 200 && builderScene.height > 120,
      "Builder Try lesson canvas collapsed",
    );
    assert.equal(
      await page
        .locator('.board-item[data-board-component="displays/Readout"]')
        .count(),
      4,
    );
    assert.equal(
      await page
        .locator('.board-item[data-board-component="controls/Slider"]')
        .count(),
      2,
    );
    await page
      .getByRole("textbox", { name: "Exact ball 1 angle", exact: true })
      .fill("40");
    await page.getByText("Ball 1 · 40° · 20 m/s", { exact: true }).waitFor();
    await page.screenshot({
      path: path.join(captures, "projectile-builder-try-lesson.png"),
    });
    await page.emulateMedia({ reducedMotion: "reduce" });
    await open("projectile");
    await page
      .getByRole("button", { name: "Launch both", exact: true })
      .click();
    const ball = page.locator(
      '.projectile-scene circle[data-entity="projectile/primary"]',
    );
    const still = await ball.getAttribute("cx");
    await page.waitForTimeout(200);
    assert.equal(await ball.getAttribute("cx"), still);
    await page.locator(".board-navigation-help > summary").click();
    await page
      .getByRole("button", {
        name: "Advance time by 0.25 seconds",
        exact: true,
      })
      .click();
    assert.notEqual(await ball.getAttribute("cx"), still);
    assert.deepEqual(errors, []);
    console.log(
      "Recipe browser acceptance: all eleven desktop/phone/short layouts; seven new activities in changed, maximum and invalid states; unobstructed mobile navigation; keyboard interaction; saved JSON; all seven remixes and builder Try lesson; reduced motion passed.",
    );
  } catch (error) {
    await page.screenshot({ path: path.join(captures, "failure.png") });
    console.error((await page.locator("body").innerText()).slice(-6000));
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
