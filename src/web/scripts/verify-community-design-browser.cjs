const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");

const base = process.env.UX_TEST_URL || "http://localhost:43100";
const output = "/tmp/apertus-community-design";
const entries = [
  {
    name: "A small change, a different orbit",
    description:
      "Explore how a changing force affects motion. Adjust the controls and follow the result.",
    tags: ["physics", "motion"],
  },
  {
    name: "The geometry of everyday things",
    description:
      "A hands-on exploration of shapes, proportions, and the patterns hiding in plain sight.",
    tags: ["math", "geometry"],
  },
  {
    name: "What makes a city move?",
    description:
      "Try a different approach to traffic, then compare what happens.",
    tags: ["systems", "motion"],
  },
].map((entry, i) => ({
  ...entry,
  publicationId: `design-${i}`,
  projectType: "experiment",
  authorName: ["Mira", "Leo", "Alex"][i],
  versionNumber: i + 1,
  publishedAt: "2026-10-10T12:00:00Z",
}));

(async () => {
  fs.mkdirSync(output, { recursive: true });
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      (fs.existsSync(chromium.executablePath())
        ? chromium.executablePath()
        : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"),
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.setDefaultTimeout(20000);
  let fail = false;
  await page.route("**/api/auth/session", (route) =>
    route.fulfill({ json: {} }),
  );
  await page.route("**/api/community?**", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const found = entries.filter(
      (entry) =>
        params.get("type") === entry.projectType &&
        (!params.get("q") ||
          entry.name.toLowerCase().includes(params.get("q").toLowerCase())) &&
        (!params.get("tag") || entry.tags.includes(params.get("tag"))),
    );
    return route.fulfill(
      fail
        ? {
            status: 503,
            json: { message: "The lab is temporarily unavailable." },
          }
        : { json: { entries: found, nextCursor: null } },
    );
  });
  const capture = (name) =>
    page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
  const noOverflow = async () =>
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
      "Page overflows horizontally",
    );
  try {
    await page.goto(`${base}/community`);
    await page.locator(".community-card").first().waitFor();
    assert.equal(await page.locator(".community-card").count(), 3);
    await noOverflow();
    await capture("community-desktop");
    await page
      .locator(".community-topics")
      .getByRole("button", { name: "physics", exact: true })
      .click();
    await page.waitForFunction(
      () => document.querySelectorAll(".community-card").length === 1,
    );
    await page.getByRole("button", { name: "Clear filters" }).click();
    await page.waitForFunction(
      () => document.querySelectorAll(".community-card").length === 3,
    );
    await page
      .getByRole("searchbox", { name: "Search community" })
      .fill("no-matching-project");
    await page.getByRole("heading", { name: "No matches this time" }).waitFor();
    await page
      .locator(".community-empty")
      .getByRole("button", { name: "Clear filters" })
      .click();
    await page.locator(".community-card").first().waitFor();
    await page.getByRole("button", { name: /Compositions/ }).click();
    await page
      .getByRole("heading", { name: "Be the first to share a composition" })
      .waitFor();
    await capture("community-empty");
    fail = true;
    await page
      .getByRole("button", { name: "Experiments", exact: true })
      .click();
    await page
      .getByRole("heading", { name: "We couldn’t load the lab" })
      .waitFor();
    fail = false;
    await page.getByRole("button", { name: "Try again", exact: true }).click();
    await page.locator(".community-card").first().waitFor();
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await capture("community-mobile");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${base}/experiments/builder?new=1`);
    await page
      .getByRole("heading", { name: "Your next idea starts here." })
      .waitFor();
    await noOverflow();
    await capture("builder-desktop");
    await page
      .getByRole("button", { name: "Browse starter experiments", exact: true })
      .click();
    const library = page.getByRole("dialog", {
      name: "Add a component",
      exact: true,
    });
    await library.waitFor();
    await library.getByRole("button", { name: "Filters", exact: true }).click();
    assert.equal(
      await library.getByLabel(/^Category/).inputValue(),
      "experiments",
    );
    assert.ok(
      (await library.locator(".catalog-card-grid article").count()) > 0,
      "Starter experiments should be available",
    );
    await capture("builder-starters");
    await page.keyboard.press("Escape");
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await capture("builder-mobile");
    const welcome = await page.locator(".builder-welcome").boundingBox();
    const composer = await page.locator(".builder-composer").boundingBox();
    const toolbar = await page.locator(".composition-tabs").boundingBox();
    assert.ok(
      welcome.y >= toolbar.y + toolbar.height &&
        welcome.y + welcome.height <= composer.y,
      "Welcome must fit between the toolbar and the AI assistant",
    );
    await page
      .getByRole("button", { name: "+ Add canvas", exact: true })
      .click();
    await library.waitFor();
    await library.getByRole("button", { name: "Filters", exact: true }).click();
    assert.equal(
      await library.getByLabel(/^Category/).inputValue(),
      "canvases",
    );
    assert.deepEqual(errors, []);
    console.log(
      `Community filters, recovery, and builder entry points passed. Screenshots: ${output}`,
    );
  } catch (error) {
    await capture("failure");
    throw error;
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
