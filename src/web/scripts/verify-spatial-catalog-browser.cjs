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
      viewport: { width: 1440, height: 960 },
    }),
    errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const base = process.env.UX_TEST_URL || "http://127.0.0.1:43002";
  try {
    for (const demo of ["projectile", "bridge", "town"]) {
      await page.goto(`${base}/experiments?experiment=${demo}`);
      await page.locator(".recipe-lesson").waitFor();
      await page
        .locator(".recipe-lesson svg, .recipe-lesson canvas")
        .first()
        .waitFor();
      if (demo === "bridge") {
        const handle = page.getByRole("button", { name: "Drag bridge load" });
        await handle.waitFor();
        await handle.focus();
        await page.keyboard.press("ArrowRight");
        const member = page
          .getByRole("button", { name: /Inspect member/ })
          .first();
        await member.focus();
        await page.keyboard.press("Enter");
        await page.locator(".bridge-demo__inspector").waitFor();
      }
      await page
        .getByRole("link", { name: "Remix in builder", exact: true })
        .click();
      await page.locator(".composition-builder").waitFor();
      assert.ok((await page.locator(".connection-node").count()) > 0);
    }
    await page.evaluate(() => localStorage.clear());
    await page.goto(`${base}/experiments/builder`);
    await page.getByRole("button", { name: "3D", exact: true }).click();
    await page.getByRole("button", { name: "Continue to layout →" }).click();
    await page.getByRole("button", { name: "Continue to canvas →" }).click();
    await page
      .getByRole("button", { name: "Open empty builder", exact: true })
      .click();
    for (let i = 0; i < 2; i++) {
      await page
        .getByRole("button", { name: "+ Add component", exact: true })
        .click();
      const library = page.getByRole("dialog", {
        name: "Add a component",
        exact: true,
      });
      await library.getByRole("searchbox").fill("Bridge Lab");
      await library
        .locator("article")
        .filter({ has: page.getByText("Bridge Lab", { exact: true }) })
        .first()
        .getByRole("button", { name: "Insert", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Edit Bridge Lab", exact: true })
        .last()
        .click();
      const group = page.getByRole("dialog", {
        name: "Bridge Lab",
        exact: true,
      });
      await group.getByRole("button", { name: "Expand", exact: true }).click();
      await group.getByRole("button", { name: "Done", exact: true }).click();
    }
    const count = await page.locator(".connection-node").count();
    assert.ok(count > 60);
    await page
      .getByRole("button", { name: /^Edit .*response/i })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Dense truss", exact: true })
      .click();
    await page
      .getByRole("dialog", { name: "Replace truss topology" })
      .waitFor();
    await page.keyboard.press("Escape");
    assert.equal(await page.locator(".connection-node").count(), count);
    await page
      .getByRole("button", { name: "Dense truss", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Replace topology", exact: true })
      .click();
    assert.ok((await page.locator(".connection-node").count()) > count);
    await page
      .getByRole("dialog")
      .filter({
        has: page.getByRole("button", { name: "Dense truss", exact: true }),
      })
      .getByRole("button", { name: "Done", exact: true })
      .click();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    assert.equal(await page.locator(".connection-node").count(), count);
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page
      .getByRole("button", { name: "Drag bridge load" })
      .first()
      .waitFor();
    await page
      .getByRole("button", { name: "Drag bridge load" })
      .first()
      .focus();
    await page.keyboard.press("ArrowRight");
    await page
      .getByRole("button", { name: "Connections", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Save experiment", exact: true })
      .click();
    await page.reload();
    await page
      .getByRole("button", { name: "Continue draft", exact: true })
      .click();
    assert.equal(await page.locator(".connection-node").count(), count);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page
      .getByRole("button", { name: "Drag bridge load" })
      .first()
      .waitFor();
    assert.deepEqual(errors, []);
    console.log(
      "Browser: premade spatial recipes, keyboard load/selection, two bridge insertion, cancel/replace/undo generation, save/reload and mobile passed.",
    );
  } catch (e) {
    await page.screenshot({ path: "/tmp/unified-spatial-failure.png" });
    console.error((await page.locator("body").innerText()).slice(-3500));
    throw e;
  } finally {
    await browser.close();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
