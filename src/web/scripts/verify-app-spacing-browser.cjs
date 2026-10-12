const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromium.executablePath())
      ? chromium.executablePath()
      : "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    const page = await browser.newPage({
      viewport: { width: 1440, height: 900 },
    });
    page.setDefaultTimeout(15000);
    const project = {
      projectId: "spacing",
      projectType: "composition",
      name: "Projectile spacing test",
      description: "A reusable experiment with controls and observations.",
      tags: ["physics"],
      payload: modelRecipe("models/Projectile"),
      sharingAllowed: true,
      saveRevision: 1,
      createdAt: "2026-01-01T00:00:00Z",
      updatedAt: "2026-01-01T00:00:00Z",
    };
    const publication = {
      ...project,
      publicationId: "spacing",
      seriesId: "spacing-series",
      versionNumber: 1,
      authorId: "spacing-user",
      authorName: "Test author",
      publishedAt: project.createdAt,
      visibility: "published",
      license: "CC-BY-4.0",
      contentHash: "fixture",
      payloadFormatVersion: 3,
    };
    await page.route("**/api/auth/session", (route) =>
      route.fulfill({
        json: {
          user: {
            id: "spacing-user",
            name: "Test author",
            email: "test@example.test",
          },
          expires: "2099-01-01T00:00:00Z",
        },
      }),
    );
    await page.route("**/api/projects**", (route) => {
      const path = new URL(route.request().url()).pathname;
      return route.fulfill({
        json: path.endsWith("name-check")
          ? { available: true }
          : path.endsWith("recovery")
            ? { entries: [] }
            : path === "/api/projects"
              ? { entries: [project], nextCursor: null }
              : { entry: project },
      });
    });
    await page.route("**/api/community**", (route) =>
      route.fulfill({
        json:
          new URL(route.request().url()).pathname === "/api/community/spacing"
            ? { entry: publication }
            : { entries: [publication], nextCursor: null },
      }),
    );
    fs.mkdirSync("/tmp/apertus-app-spacing", { recursive: true });
    for (const width of [1440, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      for (const [path, ready] of [
        ["/", ".landing"],
        ["/experiments", ".pg-shell"],
        ["/projects", ".project-grid"],
        ["/community", ".project-grid"],
        ["/community/spacing", ".project-actions"],
        ["/auth/sign-in", ".auth-card"],
      ]) {
        await page.goto(
          `${process.env.UX_TEST_URL || "http://localhost:43100"}${path}`,
        );
        await page.locator(ready).first().waitFor();
        if (
          !(await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ))
        ) {
          await page.screenshot({
            path: `/tmp/apertus-app-spacing/overflow-${width}.png`,
          });
          console.log(
            await page.evaluate(() =>
              [...document.querySelectorAll("body *")]
                .filter((el) => {
                  const rect = el.getBoundingClientRect();
                  return rect.width > 0 && rect.right > innerWidth + 1;
                })
                .slice(0, 10)
                .map((el) => ({
                  tag: el.tagName,
                  className: el.className,
                  width: el.getBoundingClientRect().width,
                  right: el.getBoundingClientRect().right,
                })),
            ),
          );
        }
        if (path === "/experiments" && width < 700) {
          const nav = await page.locator(".site-header").boundingBox();
          const catalog = await page
            .locator(".experiment-catalog")
            .boundingBox();
          assert.ok(
            nav.y + nav.height <= catalog.y,
            "Navigation overlaps the catalog",
          );
        }
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
          `${path} overflows at ${width}`,
        );
        await page.screenshot({
          path: `/tmp/apertus-app-spacing/${path.replaceAll("/", "-") || "home"}-${width}.png`,
        });
      }
      await page.goto(
        `${process.env.UX_TEST_URL || "http://localhost:43100"}/projects`,
      );
      await page
        .getByRole("button", { name: "Details & sharing", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Save & review publication", exact: true })
        .click();
      const dialog = page.locator(".project-dialog[open]");
      await dialog.waitFor();
      const metrics = await dialog.evaluate((el) => ({
        left: el.getBoundingClientRect().left,
        right: el.getBoundingClientRect().right,
        width: innerWidth,
        overflow: el.scrollWidth - el.clientWidth,
        padding: parseFloat(
          getComputedStyle(el.querySelector(".component-dialog-body"))
            .paddingLeft,
        ),
      }));
      assert.ok(
        metrics.left >= 0 &&
          metrics.right <= metrics.width &&
          metrics.overflow <= 1 &&
          metrics.padding >= 18,
        JSON.stringify(metrics),
      );
      assert.equal(
        await dialog
          .locator('input[type="checkbox"]')
          .evaluate((el) => getComputedStyle(el).width),
        "18px",
      );
      await page.screenshot({
        path: `/tmp/apertus-app-spacing/publication-${width}.png`,
      });
      await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
    }
    console.log(
      "Main pages and publication dialog: desktop, 390px and 320px spacing and overflow checks passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
