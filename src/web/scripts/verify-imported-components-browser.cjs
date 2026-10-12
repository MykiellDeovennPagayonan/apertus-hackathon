const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const source = fs.readFileSync(
  "public/component-authoring/v1/component-starter-v1.html",
  "utf8",
);
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43129";
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
    viewport: { width: 1280, height: 900 },
  });
  page.setDefaultTimeout(20000);
  page.on("console", (message) => {
    if (message.type() === "error")
      console.log("Browser console:", message.text());
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    await page.goto(`${base}/experiments/builder`);
    await page.getByRole("button", { name: "Build", exact: true }).waitFor();
    const library = page
      .getByRole("button", {
        name: /Add component|Component library|Browse components/,
      })
      .first();
    if (await library.count()) await library.click();
    await page
      .getByRole("button", { name: "Import assembly", exact: true })
      .click();
    const choose = page.getByLabel("Component HTML or assembly JSON file");
    await choose.setInputFiles({
      name: "component.html",
      mimeType: "text/html",
      buffer: Buffer.from(source),
    });
    await page
      .getByText("Technical checks passed. Try the component before saving.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await page
        .frameLocator('iframe[title="Preview Component starter"]')
        .locator("#result")
        .innerText(),
      "1",
    );
    await page
      .getByRole("button", { name: "Try narrow size", exact: true })
      .click();
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({
      path: "/tmp/imported-component-preview.png",
      fullPage: true,
    });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page
      .getByRole("button", { name: "Save component to library", exact: true })
      .click();
    await page
      .getByRole("button", {
        name: /Insert|Use component|Add to experiment|Add composite|^Add component$/,
      })
      .last()
      .click();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page
      .frameLocator('iframe[title="Component starter"]')
      .locator("#result")
      .waitFor();
    assert.equal(
      await page
        .frameLocator('iframe[title="Component starter"]')
        .locator("#result")
        .innerText(),
      "1",
    );
    await page.reload();
    await page.getByRole("button", { name: "Build", exact: true }).click();
    await page
      .frameLocator('iframe[title="Component starter"]')
      .locator("#result")
      .waitFor();
    assert.equal(
      await page
        .frameLocator('iframe[title="Component starter"]')
        .locator("#result")
        .innerText(),
      "1",
    );
    assert.deepEqual(errors, []);
    console.log("Imported HTML preview, saving, insertion, and reload passed.");
    const starterResponse = await page.request.get(
      `${base}/component-authoring/v1/component-starter-v1.html`,
    );
    assert.match(
      starterResponse.headers()["content-disposition"],
      /attachment/,
    );
    assert.match(
      starterResponse.headers()["content-security-policy"],
      /sandbox/,
    );
    const failures = [
      [
        "invalid-output",
        source.replace(
          "apertus.emit('value', inputs.value)",
          "apertus.emit('value', 'wrong type')",
        ),
        "output.invalid",
      ],
      [
        "missing-output",
        source.replace(
          "apertus.emit('value', inputs.value)",
          "/* missing output */",
        ),
        "output.missing",
      ],
      [
        "parent-access",
        source.replace(
          "initialize(context) {",
          "initialize(context) { parent.document.body.textContent = 'COMPROMISED';",
        ),
        "runtime.handler",
      ],
      [
        "handler-timeout",
        source.replace(
          "initialize(context) { inputs = context.inputs; render(); }",
          "initialize(context) { return new Promise(() => {}); }",
        ),
        "runtime.handler_timeout",
      ],
      [
        "missing-handler",
        source.replace("resize(viewport)", "wrongHandler(viewport)"),
        "runtime.handler",
      ],
      [
        "external-fetch",
        source.replace(
          "initialize(context) {",
          "async initialize(context) { await fetch('https://example.invalid/blocked');",
        ),
        "runtime.handler",
      ],
    ];
    const failurePage = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    failurePage.setDefaultTimeout(15000);
    await failurePage.goto(`${base}/experiments/builder`);
    await failurePage
      .getByRole("button", { name: "Build", exact: true })
      .waitFor();
    await failurePage
      .getByRole("button", { name: /Add component/ })
      .first()
      .click();
    await failurePage
      .getByRole("button", { name: "Import assembly", exact: true })
      .click();
    for (const [name, html, code] of failures) {
      await failurePage
        .getByLabel("Component HTML or assembly JSON file")
        .setInputFiles({
          name: `${name}.html`,
          mimeType: "text/html",
          buffer: Buffer.from(html),
        });
      await failurePage
        .getByText("Component needs fixing. Your file is retained.", {
          exact: true,
        })
        .waitFor();
      await failurePage
        .getByText("Outputs and technical details", { exact: true })
        .click();
      const report = await failurePage
        .getByLabel("Verification report")
        .inputValue();
      assert.ok(report.includes(code), `${name}: ${report}`);
      assert.equal(
        await failurePage
          .getByRole("button", {
            name: "Save component to library",
            exact: true,
          })
          .isDisabled(),
        true,
      );
      assert.ok(
        !(await failurePage.locator("body").innerText()).includes(
          "COMPROMISED",
        ),
      );
    }
    // Replacing a failed file starts a new run and permits a valid component again.
    await failurePage
      .getByLabel("Component HTML or assembly JSON file")
      .setInputFiles({
        name: "repaired.html",
        mimeType: "text/html",
        buffer: Buffer.from(source),
      });
    await failurePage
      .getByText("Technical checks passed. Try the component before saving.", {
        exact: true,
      })
      .waitFor();
    await failurePage
      .getByRole("textbox", { name: "Preview inputs", exact: true })
      .fill("7");
    await failurePage
      .getByRole("button", { name: "Apply inputs", exact: true })
      .click();
    await failurePage
      .getByText("Technical checks passed. Try the component before saving.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await failurePage
        .frameLocator('iframe[title="Preview Component starter"]')
        .locator("#result")
        .innerText(),
      "7",
    );
    const transformManifest = (change, code = source) =>
      code.replace(
        /(<script type="application\/json" id="apertus-component">)([\s\S]*?)(<\/script>)/,
        (_, start, json, end) => {
          const manifest = JSON.parse(json);
          change(manifest);
          return start + JSON.stringify(manifest) + end;
        },
      );
    const arraySource = transformManifest((manifest) => {
      const schema = {
        type: "array",
        items: { type: "number", minimum: 0, maximum: 100 },
        minItems: 0,
        maxItems: 3,
      };
      manifest.inputs.value.schema = schema;
      manifest.inputs.value.default = [1];
      manifest.outputs.value.schema = schema;
    });
    await failurePage
      .getByLabel("Component HTML or assembly JSON file")
      .setInputFiles({
        name: "array.html",
        mimeType: "text/html",
        buffer: Buffer.from(arraySource),
      });
    await failurePage
      .getByText("Technical checks passed. Try the component before saving.", {
        exact: true,
      })
      .waitFor();
    await failurePage
      .getByRole("textbox", { name: "Preview inputs", exact: true })
      .fill('{"value":[2,3]}');
    await failurePage
      .getByRole("button", { name: "Apply inputs", exact: true })
      .click();
    await failurePage
      .getByText("Technical checks passed. Try the component before saving.", {
        exact: true,
      })
      .waitFor();
    assert.equal(
      await failurePage
        .frameLocator('iframe[title="Preview Component starter"]')
        .locator("#result")
        .innerText(),
      "2,3",
    );
    const actionSource = transformManifest(
      (manifest) => {
        manifest.actions.setValue = {
          description: "Set current value",
          arguments: {
            type: "object",
            properties: { value: { type: "number", minimum: 0, maximum: 100 } },
          },
        };
      },
      source.replace(
        "reset(context)",
        "action(name, arguments_) { inputs = {value: arguments_.value}; render(); }, reset(context)",
      ),
    );
    await failurePage
      .getByLabel("Component HTML or assembly JSON file")
      .setInputFiles({
        name: "action.html",
        mimeType: "text/html",
        buffer: Buffer.from(actionSource),
      });
    await failurePage
      .getByText("Technical checks passed. Try the component before saving.", {
        exact: true,
      })
      .waitFor();
    await failurePage.getByText("Try actions", { exact: true }).click();
    await failurePage
      .getByRole("textbox", { name: "Set current value", exact: true })
      .fill("9");
    await failurePage
      .getByRole("button", { name: "setValue", exact: true })
      .click();
    await failurePage.waitForFunction(() =>
      document
        .querySelector('[aria-label="Verification report"]')
        ?.value.includes('"id": "manual-action:setValue"'),
    );
    await failurePage
      .frameLocator('iframe[title="Preview Component starter"]')
      .locator("#result")
      .filter({ hasText: "9" })
      .waitFor();
    const clockSource = transformManifest(
      (manifest) => {
        manifest.clock = true;
      },
      source.replace(
        "reset(context)",
        "step({delta}) { inputs.value += delta; render(); }, reset(context)",
      ),
    );
    await failurePage
      .getByLabel("Component HTML or assembly JSON file")
      .setInputFiles({
        name: "clock.html",
        mimeType: "text/html",
        buffer: Buffer.from(clockSource),
      });
    await failurePage
      .getByText("Technical checks passed. Try the component before saving.", {
        exact: true,
      })
      .waitFor();
    await failurePage
      .getByRole("button", { name: "Run preview", exact: true })
      .click();
    await failurePage
      .frameLocator('iframe[title="Preview Component starter"]')
      .locator("#result")
      .filter({ hasNotText: /^1$/ })
      .waitFor();
    await failurePage
      .getByRole("button", { name: "Pause", exact: true })
      .click();
    await failurePage.waitForTimeout(100);
    const paused = await failurePage
      .frameLocator('iframe[title="Preview Component starter"]')
      .locator("#result")
      .innerText();
    await failurePage.waitForTimeout(200);
    assert.equal(
      await failurePage
        .frameLocator('iframe[title="Preview Component starter"]')
        .locator("#result")
        .innerText(),
      paused,
    );
    await failurePage.close();
    console.log("Structured inputs, actions, host clock, and pause passed.");
    console.log(
      "Output failures, timeout, missing handlers, parent isolation, CSP fetch restriction, replacement, input updates, and download policy passed.",
    );
  } catch (e) {
    console.error("Page errors:", errors);
    console.error((await page.locator("body").innerText()).slice(-4000));
    await page.screenshot({
      path: "/tmp/imported-component-failure.png",
      fullPage: true,
    });
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
