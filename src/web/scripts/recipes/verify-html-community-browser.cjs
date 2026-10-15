const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const {
  chromium,
  expect,
} = require("../../../playwright/node_modules/@playwright/test");
const source = fs.readFileSync(
  "public/component-authoring/v1/component-starter-v1.html",
  "utf8",
);
const artifacts = path.resolve(
  "../../docs/agent-only/implementation/037-validation",
);
fs.mkdirSync(artifacts, { recursive: true });
const url = process.env.COMPONENT_TEST_URL || "http://127.0.0.1:43137";

(async () => {
  const browser = await chromium.launch({ headless: true });
  try {
    const context = await browser.newContext({
      viewport: { width: 1280, height: 900 },
      acceptDownloads: true,
    });
    await context.route("**/api/auth/session", (route) =>
      route.fulfill({ json: {} }),
    );
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(`${url}/community/components/new`);
    await expect(
      page.getByRole("heading", { name: "Create an HTML component" }),
    ).toBeVisible();
    await page
      .getByLabel("Component name", { exact: true })
      .fill("Value visual");
    await page
      .getByLabel("What should it do?")
      .fill(
        "Show a value that users can adjust and output it for other components.",
      );
    await page.screenshot({
      path: path.join(artifacts, "authoring-desktop.png"),
      fullPage: true,
    });
    const downloadPromise = page.waitForEvent("download");
    await page
      .getByRole("button", { name: "Download AI brief (.md)", exact: true })
      .click();
    const download = await downloadPromise;
    assert.ok(download.suggestedFilename().endsWith(".md"));
    const brief = fs.readFileSync(await download.path(), "utf8");
    assert.match(brief, /Value visual/);
    assert.match(brief, /users can adjust/);
    assert.match(brief, /apertus.register/);
    await page.getByLabel("Upload component HTML").setInputFiles({
      name: "invalid.html",
      mimeType: "text/html",
      buffer: Buffer.from(
        "<!doctype html><html><body>Missing manifest</body></html>",
      ),
    });
    await expect(page.locator("main").getByRole("alert")).toContainText(
      "manifest",
    );
    await page
      .getByText("Review or replace retained HTML", { exact: true })
      .click();
    await page.getByLabel("Retained component HTML").fill(source);
    await page.getByRole("button", { name: "Check replacement HTML" }).click();
    await expect(
      page.getByText(
        "Technical checks passed. Try the component before saving.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 20000 });
    const preview = page.frameLocator(
      'iframe[title="Preview Component starter"]',
    );
    await expect(preview.getByLabel("Current value")).toHaveText("1");
    await page.getByText("Suggested connections (2)", { exact: true }).click();
    await page.getByLabel("value → Number input", { exact: true }).check();
    await page.getByLabel("value → readout", { exact: true }).check();
    await page
      .getByRole("button", { name: "Try selected connections" })
      .click();
    const trial = page.getByRole("region", {
      name: "Component connection trial",
    });
    await expect(trial).toBeVisible();
    const trialInput = trial.getByRole("textbox", {
      name: "value",
      exact: true,
    });
    await trialInput.fill("42");
    await trialInput.press("Tab");
    const apply = trial.getByRole("button", { name: /Apply/ });
    if (await apply.count()) await apply.first().click();
    await expect(
      page
        .frameLocator('iframe[title="Component starter"]')
        .getByLabel("Current value"),
    ).toHaveText("42", { timeout: 10000 });
    await page.screenshot({
      path: path.join(artifacts, "connection-trial-desktop.png"),
      fullPage: true,
    });
    await page.getByRole("button", { name: "Stop trial" }).click();
    await page
      .getByRole("button", { name: "Save component to library" })
      .click();
    await expect(
      page.getByText("Saved to My components on this device."),
    ).toBeVisible();
    const stored = await page.evaluate(() =>
      JSON.parse(localStorage.getItem("apertus-composites-v1")),
    );
    assert.equal(stored.length, 1);
    assert.equal(stored[0].document.nodes.length, 1);
    assert.equal(stored[0].recipeVersion, 2);
    assert.equal(
      JSON.parse(stored[0].document.nodes[0].configuration.verification).status,
      "passed",
    );
    await page.getByLabel("Upload component HTML").setInputFiles({
      name: "missing-output.html",
      mimeType: "text/html",
      buffer: Buffer.from(
        source.replace(
          "apertus.emit('value', inputs.value);",
          "// Omit output for this failure fixture.",
        ),
      ),
    });
    await expect(
      page.getByText("Component needs fixing. Your file is retained.", {
        exact: true,
      }),
    ).toBeVisible({ timeout: 20000 });
    await expect(
      page.getByRole("button", { name: "Save component to library" }),
    ).toBeDisabled();
    await expect(
      page.getByRole("button", { name: "Copy fixes for AI" }),
    ).toBeVisible();
    const clockSource = source
      .replace('"clock": false', '"clock": true')
      .replace(
        "dispose() {",
        "step({ time, delta }) { inputs.value = Math.min(100, inputs.value + delta); render(); },\n      dispose() {",
      );
    await page.getByLabel("Upload component HTML").setInputFiles({
      name: "clock.html",
      mimeType: "text/html",
      buffer: Buffer.from(clockSource),
    });
    await expect(
      page.getByText(
        "Technical checks passed. Try the component before saving.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 20000 });
    await page
      .getByRole("button", { name: "Run preview", exact: true })
      .click();
    await expect
      .poll(async () =>
        Number(
          await page
            .frameLocator('iframe[title="Preview Component starter"]')
            .getByLabel("Current value")
            .textContent(),
        ),
      )
      .toBeGreaterThan(1);
    await page.getByRole("button", { name: "Pause", exact: true }).click();
    await page.reload();
    assert.equal(
      await page.evaluate(
        () => JSON.parse(localStorage.getItem("apertus-composites-v1")).length,
      ),
      1,
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.setViewportSize({ width: 390, height: 720 });
    await expect(
      page.getByRole("button", {
        name: "Download AI brief (.md)",
        exact: true,
      }),
    ).toBeVisible();
    await page.getByLabel("Component name", { exact: true }).focus();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("What should it do?")).toBeFocused();
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    );
    await page.screenshot({
      path: path.join(artifacts, "authoring-narrow.png"),
      fullPage: true,
    });
    assert.deepEqual(errors, []);
    await context.close();

    const account = await browser.newContext({
      viewport: { width: 1280, height: 900 },
    });
    await account.route("**/api/auth/session", (route) =>
      route.fulfill({
        json: {
          user: {
            id: "test-author",
            name: "Test author",
            email: "test@example.invalid",
          },
          expires: "2099-01-01T00:00:00Z",
        },
      }),
    );
    let project, publication, savedRecipe;
    const now = new Date().toISOString();
    await account.route("**/api/library/components", async (route) => {
      if (route.request().method() === "GET")
        return route.fulfill({ json: { entries: [] } });
      savedRecipe = route.request().postDataJSON().recipe;
      project = {
        projectId: savedRecipe.id,
        projectType: "composition",
        contentKind: "component",
        name: savedRecipe.title,
        description: savedRecipe.description,
        tags: savedRecipe.tags,
        payload: savedRecipe,
        sharingAllowed: false,
        saveRevision: 1,
        createdAt: now,
        updatedAt: now,
      };
      return route.fulfill({
        json: { entry: { recipe: savedRecipe, revision: 1 } },
      });
    });
    await account.route("**/api/projects/**", async (route) => {
      const request = route.request();
      if (request.url().includes("name-check"))
        return route.fulfill({ json: { available: true } });
      if (request.url().includes("publications")) {
        const candidate = request.postDataJSON();
        assert.equal(candidate.componentChecks.component.status, "passed");
        assert.equal(candidate.licenseAccepted, true);
        publication = {
          publicationId: "test-publication",
          seriesId: "test-series",
          versionNumber: 1,
          authorId: "test-author",
          authorName: "Test author",
          projectType: "composition",
          contentKind: "component",
          name: candidate.name,
          description: candidate.description,
          tags: candidate.tags,
          payload: savedRecipe,
          contentHash: "test",
          payloadFormatVersion: 2,
          publishedAt: now,
          visibility: "published",
          license: "CC-BY-4.0",
        };
        return route.fulfill({ json: { entry: publication } });
      }
      if (request.method() === "PUT") {
        const body = request.postDataJSON();
        assert.equal(body.sharingAllowed, true);
        assert.equal(body.expectedRevision, 1);
        project = { ...project, sharingAllowed: true, saveRevision: 2 };
      }
      return route.fulfill({ json: { entry: project } });
    });
    await account.route("**/api/projects", async (route) => {
      const body = route.request().postDataJSON();
      assert.equal(body.basedOnPublicationId, "test-publication");
      assert.equal(body.expectedRevision, null);
      assert.equal(body.payload.document.nodes.length, 1);
      return route.fulfill({
        json: {
          entry: {
            ...body,
            saveRevision: 1,
            createdAt: now,
            updatedAt: now,
            basedOn: {
              publicationId: "test-publication",
              name: publication.name,
              authorName: "Test author",
            },
          },
        },
      });
    });
    const signed = await account.newPage();
    signed.on("pageerror", (error) => errors.push(error.message));
    await signed.goto(`${url}/community/components/new`);
    await signed.getByRole("button", { name: "I already have HTML" }).click();
    await signed.getByLabel("Upload component HTML").setInputFiles({
      name: "component.html",
      mimeType: "text/html",
      buffer: Buffer.from(source),
    });
    await expect(
      signed.getByRole("button", {
        name: "Review community publication",
        exact: true,
      }),
    ).toBeEnabled({ timeout: 20000 });
    await signed
      .getByRole("button", {
        name: "Review community publication",
        exact: true,
      })
      .click();
    const dialog = signed.getByRole("dialog", {
      name: "Review community publication",
    });
    await expect(dialog).toBeVisible();
    await expect(
      dialog.getByText(
        "Technical checks passed. Try the component before saving.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 20000 });
    await dialog.getByRole("checkbox").check();
    await dialog.getByRole("button", { name: "Publish snapshot" }).click();
    await expect(
      signed.getByRole("dialog", { name: "Published to the community" }),
    ).toBeVisible();
    assert.ok(publication);
    await signed.getByRole("button", { name: "Done", exact: true }).click();
    await account.route("**/api/community**", async (route) => {
      const requestURL = new URL(route.request().url());
      if (requestURL.pathname === "/api/community/test-publication")
        return route.fulfill({ json: { entry: publication } });
      return route.fulfill({
        json: {
          entries:
            requestURL.searchParams.get("kind") === "component" ||
            requestURL.pathname.includes("series")
              ? [publication]
              : [],
          nextCursor: null,
        },
      });
    });
    await signed.goto(`${url}/community`);
    await signed
      .getByRole("button", { name: "Components", exact: true })
      .click();
    await expect(
      signed.getByText("HTML component", { exact: true }),
    ).toBeVisible();
    await signed
      .getByRole("link", { name: "Try & add to My components" })
      .click();
    await signed
      .getByRole("button", { name: "Try component", exact: true })
      .click();
    await expect(
      signed.getByText(
        "Technical checks passed. Try the component before saving.",
        { exact: true },
      ),
    ).toBeVisible({ timeout: 20000 });
    await signed.screenshot({
      path: path.join(artifacts, "community-component-preview.png"),
      fullPage: true,
    });
    await signed.getByRole("button", { name: "Add to My components" }).click();
    await expect(
      signed.getByText("Added to My components in your account."),
    ).toBeVisible();
    assert.deepEqual(errors, []);
    await account.close();
    console.log(
      "Browser passed: tailored Markdown, invalid upload recovery, runtime controls, independent local save/reload, narrow/keyboard layout, host clock, failed-runtime recovery, mocked account publication and community reuse. No live database writes.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
