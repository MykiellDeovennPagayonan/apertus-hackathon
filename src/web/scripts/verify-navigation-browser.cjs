const assert = require("node:assert/strict");
const { cases } = require("./generation/cases.cjs");
const { launch, fixtureResult, base } = require("./generation/helpers.cjs");

(async () => {
  const browser = await launch();
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(20000);
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} }),
    );
    await page.route("**/api/community**", (route) =>
      route.fulfill({ json: { entries: [], nextCursor: null } }),
    );
    await page.route("**/api/apertus", (route) => {
      const request = route.request().postDataJSON();
      return route.fulfill({
        headers: { "x-request-id": request.requestId },
        json: fixtureResult(cases[0], request),
      });
    });

    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [path, current] of [
        ["/", "Home"],
        ["/experiments", "Experiments"],
        ["/community", "Community"],
        ["/projects", "My projects"],
      ]) {
        await page.goto(`${base}${path}`);
        const nav = page.getByRole("navigation", { name: "Main navigation" });
        await nav.waitFor();
        assert.deepEqual(await nav.getByRole("link").allTextContents(), [
          "Home",
          "Experiments",
          "Community",
          "My projects",
        ]);
        assert.equal(
          await nav.locator('[aria-current="page"]').innerText(),
          current,
        );
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${path} overflows at ${width}`,
        );
        const header = await page.locator(".site-header").boundingBox();
        const main = await page.locator("main").first().boundingBox();
        assert.ok(
          header.y + header.height <= main.y + 1,
          `${path} header overlaps content`,
        );
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(base);
    assert.equal(
      await page
        .getByRole("link", { name: "Resume your last experiment →" })
        .count(),
      0,
    );
    await page
      .getByRole("textbox", { name: "Describe an experiment…", exact: true })
      .fill(cases[0].prompt);
    await page.getByRole("button", { name: "Create", exact: true }).click();
    await page.waitForURL("**/experiments?resume=1").catch(async (error) => {
      console.error(await page.locator("body").innerText());
      throw error;
    });
    await page.locator(".experiment-workspace").waitFor();
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.locator(".landing").waitFor();
    await page.reload();
    await page.locator(".landing").waitFor();
    assert.equal(await page.locator(".experiment-workspace").count(), 0);
    await page
      .getByRole("link", { name: "Resume your last experiment →" })
      .click();
    await page.locator(".experiment-workspace").waitFor();
    await page.reload();
    await page.locator(".experiment-workspace").waitFor();
    await page
      .getByRole("link", { name: "← Experiments", exact: true })
      .click();
    await page.getByRole("heading", { name: "Pick an experiment." }).waitFor();
    await page.waitForURL(
      (url) => url.pathname === "/experiments" && url.search === "",
    );
    assert.equal(new URL(page.url()).pathname, "/experiments");
    assert.equal(new URL(page.url()).search, "");
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page.locator(".landing").waitFor();
    await page
      .getByRole("link", { name: "Resume your last experiment →" })
      .waitFor();

    await page.goto(`${base}/experiments/builder?new=1`);
    await page
      .getByRole("textbox", { name: "Experiment title", exact: true })
      .fill("Unsaved navigation check");
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page
      .getByRole("heading", { name: "Save changes before leaving?" })
      .waitFor();
    assert.equal(new URL(page.url()).pathname, "/experiments/builder");
    await page
      .getByRole("button", { name: "Keep editing", exact: true })
      .click();
    assert.equal(
      await page
        .getByRole("textbox", { name: "Experiment title", exact: true })
        .inputValue(),
      "Unsaved navigation check",
    );
    await page.getByRole("link", { name: "Home", exact: true }).click();
    await page
      .getByRole("button", { name: "Discard changes", exact: true })
      .click();
    await page.locator(".landing").waitFor();
    console.log(
      "Navigation: shared headers, active sections, mobile layout, explicit resume, workspace exits, and unsaved builder guard passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
