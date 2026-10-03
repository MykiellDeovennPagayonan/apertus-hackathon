const assert = require("node:assert/strict");
const { chromium } = require("playwright");
const fs = require("node:fs");
async function main() {
  const browser = await chromium.launch({
    headless: true,
    ...(fs.existsSync(chromium.executablePath())
      ? {}
      : {
          executablePath:
            "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        }),
  });
  let page;
  try {
    page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const base = process.env.UX_TEST_URL || "http://localhost:43100";
    await page.goto(base);
    await page.waitForLoadState("networkidle");
    const prompt = page.getByRole("textbox");
    await page
      .getByRole("button", {
        name: "Gas pressure",
        exact: true,
      })
      .click();
    assert.equal(await prompt.inputValue(), "Show me how gas pressure works");
    await page.route("**/api/apertus", async (route) => {
      const { prompt } = route.request().postDataJSON();
      if (prompt === "slow request") {
        await new Promise((r) => setTimeout(r, 1000));
      }
      if (prompt === "failed request")
        return route.fulfill({
          status: 500,
          json: { error: "Please try again" },
        });
      await route.fulfill({
        json: {
          schemaVersion: 1,
          operation: "create",
          composition: {
            ref: "compositions/GasPressureExperiment",
            version: 1,
          },
          parameters: {},
          message: "Gas ready",
        },
      });
    });
    await prompt.press("Enter");
    await page.locator(".experiment-workspace").waitFor();
    assert.equal(await page.getByRole("textbox").inputValue(), "");
    await page.getByRole("button", { name: "Last request" }).click();
    await page
      .getByText("Show me how gas pressure works", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Edit and reuse" }).click();
    assert.equal(
      await page.getByRole("textbox").inputValue(),
      "Show me how gas pressure works",
    );
    await page.getByRole("textbox").fill("slow request");
    await page.getByRole("textbox").press("Enter");
    await page.getByRole("button", { name: "Stop", exact: true }).click();
    assert.equal(await page.getByRole("textbox").inputValue(), "slow request");
    await page.getByText("Stopped — your prompt is still here.").waitFor();
    await page.getByRole("textbox").fill("failed request");
    await page.getByRole("textbox").press("Enter");
    await page
      .getByText("Couldn't complete your request.", { exact: true })
      .waitFor();
    await page.getByRole("button", { name: "Details", exact: true }).click();
    await page.getByText("Please try again", { exact: true }).waitFor();
    await page.getByRole("button", { name: "Close prompt panel" }).click();
    assert.equal(
      await page.getByRole("textbox").inputValue(),
      "failed request",
    );
    await page.getByRole("textbox").press("Shift+Enter");
    assert.match(await page.getByRole("textbox").inputValue(), /\n/);
    await page.goto(`${base}/experiments`);
    assert.equal(await page.getByRole("textbox").count(), 0);
    assert.equal(await page.locator(".experiment-catalog__card").count(), 13);
    for (const size of [
      { width: 1440, height: 900 },
      { width: 390, height: 844 },
      { width: 1024, height: 603 },
    ]) {
      await page.setViewportSize(size);
      for (const demo of [
        "gas",
        "projectile",
        "equal-groups",
        "area-perimeter",
        "fraction-builder",
        "counting",
        "arithmetic",
        "fraction-number-line",
        "ratio",
        "coordinates",
        "probability",
        "bridge",
        "town",
      ]) {
        await page.goto(`${base}/experiments?experiment=${demo}`);
        await page
          .locator(".workspace-stage svg, .workspace-stage canvas")
          .first()
          .waitFor();
        if (demo === "gas") {
          const field = page.getByRole("textbox");
          const form = page.locator(".command-bar__form");
          const initial = await form.boundingBox();
          assert.ok(
            initial.height <= 68,
            `Resting form should be compact: ${initial.height}`,
          );
          assert.equal(
            await field.evaluate((el) => getComputedStyle(el).resize),
            "none",
          );
          await field.fill("First line\nSecond line\nThird line");
          await page.waitForFunction(
            () => document.querySelector("textarea").clientHeight > 60,
          );
          assert.ok((await form.boundingBox()).height > initial.height);
          await field.fill(
            Array(25).fill("More lines of text to explore").join("\n"),
          );
          const box = await field.boundingBox();
          assert.ok(box.height <= (size.width < 600 ? 120 : 160));
          assert.equal(
            await field.evaluate((el) => getComputedStyle(el).overflowY),
            "auto",
          );
          await page.screenshot({
            path: `/tmp/apertus-composer-expanded-${size.width}.png`,
          });
          await field.fill("");
          await page.waitForFunction(
            () => document.querySelector("textarea").clientHeight <= 42,
          );
          await page
            .getByRole("button", { name: "Ideas", exact: true })
            .click();
          await page
            .getByRole("button", { name: "Heat it up", exact: false })
            .click();
          assert.equal(await field.inputValue(), "Heat it up");
          assert.equal(await page.locator(".command-bar__popover").count(), 0);
          await field.fill("");
        }
        const stage = await page.locator(".workspace-stage").boundingBox();
        assert.equal(stage.width, size.width);
        assert.ok(stage.height > 100 && stage.height < size.height);
        const composerBounds = await page
          .locator(".workspace-composer")
          .boundingBox();
        assert.ok(
          composerBounds.y - (stage.y + stage.height) >= 24,
          "The scrollable experiment must leave a real gap above the composer",
        );
        assert.equal(
          await page.locator("#experiment-controls").isVisible(),
          false,
        );
        await page
          .getByRole("button", { name: "More settings", exact: true })
          .click();
        assert.equal(
          await page.locator("#experiment-controls").isVisible(),
          true,
        );
        assert.deepEqual(
          await page.locator(".workspace-stage").boundingBox(),
          stage,
          "Controls must not resize scene",
        );
        const panel = await page.locator("#experiment-controls").boundingBox();
        assert.ok(panel.x >= 0 && panel.x + panel.width <= size.width);
        const input = await page.getByRole("textbox").boundingBox();
        assert.ok(
          input.y > size.height / 2 && input.y + input.height < size.height,
        );
        assert.equal(
          await page.evaluate(
            () => document.documentElement.scrollWidth > innerWidth,
          ),
          false,
        );
        if (
          [
            "gas",
            "counting",
            "arithmetic",
            "equal-groups",
            "fraction-builder",
            "area-perimeter",
          ].includes(demo)
        )
          await page.screenshot({
            path: `/tmp/apertus-${demo}-${size.width}.png`,
          });
        await page.keyboard.press("Escape");
        if (
          [
            "gas",
            "counting",
            "arithmetic",
            "equal-groups",
            "fraction-builder",
            "area-perimeter",
          ].includes(demo)
        ) {
          await page.screenshot({
            path: `/tmp/apertus-${demo}-${size.width}-closed.png`,
          });
        }
        if (["gas", "equal-groups", "fraction-builder"].includes(demo)) {
          const result = page.locator(
            ".workspace-stage .learning-pressure, .workspace-stage .math-readout",
          );
          await result.scrollIntoViewIfNeeded();
          const readout = await result.boundingBox();
          const composer = await page
            .locator(".workspace-composer")
            .boundingBox();
          assert.ok(
            readout.y + readout.height <= composer.y - 24,
            "Results must not be covered by the prompt",
          );
        }

        assert.equal(
          await page.locator("#experiment-controls").isVisible(),
          false,
        );
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "Workspace UX passed: landing creation, library, retained text, stop, errors, multiline, all experiment overlays at desktop/mobile sizes, no runtime errors.",
    );
  } catch (error) {
    console.error(await page.locator("body").innerText());
    await page.screenshot({ path: "/tmp/apertus-ux-failure.png" });
    throw error;
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
