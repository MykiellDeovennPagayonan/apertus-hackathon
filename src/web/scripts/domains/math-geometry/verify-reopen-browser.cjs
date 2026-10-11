// Regression: the first desktop frame must not depend on ResizeObserver timing.
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const h = require("../../generation/helpers.cjs");

(async () => {
  const dir = path.resolve(
    "../../docs/agent-only/implementation/028-validation/developer/A1/reopen-fix",
    new Date().toISOString().replace(/[:.]/g, "-"),
  );
  fs.mkdirSync(dir, { recursive: true });
  const browser = await h.launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
      reducedMotion: "reduce",
    });
    await page.addInitScript(() => {
      const Observer = window.ResizeObserver;
      window.ResizeObserver = class extends Observer {
        constructor(callback) {
          super((entries, observer) => {
            const ready = entries.filter(
              (entry) => !entry.target.classList.contains("board-viewport"),
            );
            if (ready.length) callback(ready, observer);
          });
        }
      };
    });
    await page.goto(
      `${process.env.A1_URL || "http://127.0.0.1:43124"}/experiments?experiment=pythagorean`,
    );
    await page.locator(".pythagorean-scene svg").waitFor();
    await page.screenshot({
      path: path.join(dir, "desktop-before-observer.png"),
    });
    const scene = await page.locator(".pythagorean-scene svg").boundingBox();
    assert.ok(
      Math.abs(scene.x + scene.width / 2 - 720) < 50,
      "initial desktop scene must be centered before the viewport observer fires",
    );
    const geometry = await h.geometry(page);
    fs.writeFileSync(
      path.join(dir, "geometry.json"),
      JSON.stringify(geometry, null, 2),
    );
    console.log(dir);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
