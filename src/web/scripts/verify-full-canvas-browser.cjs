const assert = require("node:assert/strict");
const { chromium } = require("playwright");

(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  try {
    for (const viewport of [
      { width: 1280, height: 800 },
      { width: 1024, height: 603 },
      { width: 390, height: 844 },
      { width: 320, height: 568 },
    ]) {
      await page.setViewportSize(viewport);
      for (const experiment of ["fraction-number-line", "counting", "gas"]) {
        await page.goto(
          `${process.env.UX_TEST_URL || "http://localhost:43100"}/experiments?experiment=${experiment}`,
        );
        await page.locator(".board-item").first().waitFor();
        await page.waitForFunction(() => {
          const board = document.querySelector(".board-viewport");
          return board?.getBoundingClientRect().height === innerHeight;
        });
        assert.equal(await page.locator(".recipe-lesson > header").count(), 0);
        const canvas = await page
          .locator(".board-viewport")
          .evaluate((board) => {
            const bounds = board.getBoundingClientRect();
            return {
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              clip: getComputedStyle(board).clipPath,
              // Catch visual clipping even when the element still measures full-screen.
              coversTop: document
                .elementsFromPoint(innerWidth / 2, 2)
                .includes(board),
              coversBottom: document
                .elementsFromPoint(2, innerHeight - 2)
                .includes(board),
            };
          });
        assert.deepEqual(canvas, {
          x: 0,
          y: 0,
          ...viewport,
          clip: "none",
          coversTop: true,
          coversBottom: true,
        });
        await page.getByText("Experiment options", { exact: true }).click();
        assert.equal(
          await page
            .getByRole("button", { name: "Save recipe", exact: true })
            .isVisible(),
          true,
        );
        await page.getByText("Experiment options", { exact: true }).click();
        if (experiment === "counting" && viewport.width === 1280) {
          await page
            .getByRole("button", { name: "Circle 1, not counted", exact: true })
            .click();
          assert.match(
            await page.locator(".math-readout").innerText(),
            /1 circle counted out of 5/,
          );
          await page
            .getByRole("button", { name: "Count again", exact: true })
            .click();
          assert.match(
            await page.locator(".math-readout").innerText(),
            /0 circles counted/,
          );
        }
        if (experiment === "fraction-number-line" && viewport.width === 1024) {
          await page.screenshot({ path: "/tmp/full-canvas-fraction.png" });
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(
      "Full canvas: no description, full viewport, no clipping, and floating options passed at four screen sizes.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
