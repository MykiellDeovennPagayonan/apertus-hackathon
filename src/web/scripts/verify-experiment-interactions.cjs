const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

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
  const page = await browser.newPage({
    viewport: { width: 1024, height: 603 },
  });
  const base = process.env.UX_TEST_URL || "http://localhost:43100";
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const stage = page.locator(".workspace-stage");
  async function open(demo) {
    await page.goto(`${base}/experiments?experiment=${demo}`);
    await page.locator(".experiment-workspace").waitFor();
    await stage.locator("svg, canvas").first().waitFor();
    assert.equal(await page.locator("#experiment-controls").isVisible(), false);
  }
  async function clearance() {
    // ResizeObserver reserves the new height before the next rendered frame.
    await page.waitForFunction(() => {
      const content = document
        .querySelector(".workspace-stage")
        .getBoundingClientRect();
      const composer = document
        .querySelector(".workspace-composer")
        .getBoundingClientRect();
      return composer.top - content.bottom >= 24;
    });
    const s = await stage.boundingBox(),
      c = await page.locator(".workspace-composer").boundingBox();
    assert.ok(
      c.y - s.y - s.height >= 24,
      `Composer clearance: ${c.y - s.y - s.height}`,
    );
  }
  try {
    await open("gas");
    const volume = stage.getByRole("slider", { name: "Volume", exact: true });
    await volume.focus();
    await page.keyboard.press("ArrowLeft");
    await page.waitForFunction(() =>
      document.querySelector(".learning-pressure").textContent.includes("2.63"),
    );
    assert.equal(await volume.inputValue(), "0.95");
    const pauseMotion = stage.getByRole("button", {
      name: "Pause motion",
      exact: true,
    });
    await pauseMotion.hover();
    assert.equal(
      await pauseMotion.evaluate((button) => getComputedStyle(button).color),
      "rgb(255, 251, 239)",
    );
    assert.equal(
      await pauseMotion.evaluate(
        (button) => getComputedStyle(button).backgroundColor,
      ),
      "rgb(31, 76, 70)",
    );
    await clearance();
    await page
      .getByRole("textbox")
      .fill(Array(10).fill("Expand the composer").join("\n"));
    await page.waitForFunction(
      () => document.querySelector("textarea").clientHeight > 100,
    );
    await clearance();
    await open("area-perimeter");
    await stage
      .getByRole("spinbutton", { name: "Width (m)", exact: true })
      .fill("8");
    assert.match(
      await stage.getByLabel("Area", { exact: true }).textContent(),
      /32 m²/,
    );
    assert.match(
      await stage.getByLabel("Perimeter", { exact: true }).textContent(),
      /24 m/,
    );
    assert.equal(await stage.locator("table").count(), 0);
    const width = stage.getByRole("spinbutton", {
      name: "Width (m)",
      exact: true,
    });
    await width.fill("-1");
    await width.blur();
    assert.match(await stage.getByRole("alert").textContent(), /0.1 to 100/);
    assert.match(
      await stage.getByLabel("Area", { exact: true }).textContent(),
      /32 m²/,
    );
    await open("coordinates");
    const point = stage.getByRole("button", { name: "Move coordinate point" });
    await point.focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowUp");
    assert.match(
      await stage.getByLabel("Point coordinates").textContent(),
      /\(3, 4\)/,
    );
    await page.keyboard.press("Shift+ArrowLeft");
    assert.match(
      await stage.getByLabel("Point coordinates").textContent(),
      /\(2.9, 4\)/,
    );
    for (const size of [
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(size);
      await point.scrollIntoViewIfNeeded();
      await page.waitForFunction(
        () =>
          document
            .querySelector('[aria-label="Move coordinate point"]')
            .getBoundingClientRect().width >= 43.9,
      );
      const box = await point.boundingBox();
      assert.ok(box.width >= 43.9 && box.height >= 43.9);
      await clearance();
    }
    await page.setViewportSize({ width: 1024, height: 603 });
    await open("projectile");
    await stage
      .getByRole("combobox", { name: "Selected ball" })
      .selectOption({ label: "Ball 2" });
    const angle = stage.getByRole("slider", { name: "Angle", exact: true });
    await angle.focus();
    await page.keyboard.press("ArrowRight");
    assert.match(
      await stage.locator(".projectile-legend").textContent(),
      /Ball 1 · 30°/,
    );
    assert.match(
      await stage.locator(".projectile-legend").textContent(),
      /Ball 2 · 61°/,
    );
    await open("ratio");
    await stage.getByRole("spinbutton", { name: "Selected parts" }).fill("6");
    assert.match(
      await stage.locator(".experiment-answer").textContent(),
      /150%/,
    );
    assert.match(await stage.locator("svg").textContent(), /Plus 50%/);
    await open("probability");
    await stage.getByRole("combobox").selectOption("die");
    const first = await stage.locator("tbody").textContent();
    await stage.getByRole("button", { name: "Run again", exact: true }).click();
    assert.notEqual(await stage.locator("tbody").textContent(), first);
    assert.equal(await stage.locator("tbody tr").count(), 6);
    await open("counting");
    await stage
      .getByRole("combobox", { name: "Mode", exact: true })
      .selectOption("try");
    await stage.getByRole("button", { name: /Circle 1,/ }).click();
    assert.match(
      await stage.locator(".math-readout").textContent(),
      /1 circle counted/,
    );
    await open("arithmetic");
    await stage
      .getByRole("combobox", { name: "Mode", exact: true })
      .selectOption("try");
    await stage
      .getByRole("button", { name: /waiting to add/ })
      .first()
      .click();
    assert.match(
      await stage.locator(".math-readout").textContent(),
      /4 circles/,
    );
    await open("equal-groups");
    await stage
      .getByRole("spinbutton", { name: "Baskets", exact: true })
      .fill("4");
    assert.equal(
      await stage
        .getByRole("spinbutton", { name: "Baskets", exact: true })
        .inputValue(),
      "4",
    );
    await stage.getByRole("button", { name: "Share", exact: true }).click();
    assert.equal(
      await stage.getByRole("button", { name: "Pause", exact: true }).count(),
      1,
    );
    await open("fraction-builder");
    const pieces = stage.getByRole("spinbutton", {
      name: "Bar A pieces",
      exact: true,
    });
    await pieces.focus();
    await pieces.blur();
    assert.match(await stage.locator(".math-readout").textContent(), /3\/4/);
    await pieces.fill("8");
    assert.match(await stage.locator(".math-readout").textContent(), /0\/8/);
    await open("fraction-number-line");
    await stage.getByRole("button", { name: /Next step/ }).click();
    await stage
      .getByRole("combobox", { name: "Activity", exact: true })
      .selectOption("place");
    await stage
      .getByRole("button", { name: "Check placement", exact: true })
      .click();
    assert.ok(await stage.locator(".math-feedback").textContent());
    await open("bridge");
    await stage.getByRole("slider", { name: "Load", exact: true }).focus();
    await page.keyboard.press("ArrowRight");
    assert.match(await stage.locator(".bridge-controls").textContent(), /11 t/);
    await open("town");
    await stage.getByRole("button", { name: "Pause", exact: true }).click();
    assert.equal(
      await stage.getByRole("button", { name: "Play", exact: true }).count(),
      1,
    );
    await clearance();
    assert.deepEqual(errors, []);
    console.log(
      "Primary interactions passed for all 13 experiments, including precise coordinates, touch targets, invalid input, independent projectiles, resampling, and composer clearance.",
    );
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
