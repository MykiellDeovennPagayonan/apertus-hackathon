const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { chromium } = require("playwright");
const { webpack } = require("next/dist/compiled/webpack/webpack");
const web = path.resolve(__dirname, "..");

// Bundle the real controls with React; no test route or fixture behavior enters production.
async function bundle(directory) {
  const loader = path.join(directory, "typescript-loader.cjs");
  fs.writeFileSync(
    loader,
    `const ts = require(${JSON.stringify(require.resolve("typescript"))});
module.exports = function(source) {
  return ts.transpileModule(source, { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext,
    jsx: ts.JsxEmit.ReactJSX
  }}).outputText;
};`,
  );
  const compiler = webpack({
    mode: "development",
    devtool: false,
    entry: path.join(__dirname, "fixtures/component-cleanup.tsx"),
    output: { path: directory, filename: "fixture.js" },
    resolve: {
      extensions: [".tsx", ".ts", ".js"],
      modules: [path.join(web, "node_modules"), "node_modules"],
    },
    module: {
      rules: [{ test: /\.tsx?$/, exclude: /node_modules/, use: loader }],
    },
  });
  await new Promise((resolve, reject) =>
    compiler.run((error, stats) => {
      compiler.close((closeError) => {
        if (error || closeError) return reject(error || closeError);
        if (stats.hasErrors())
          return reject(
            new Error(stats.toString({ all: false, errors: true })),
          );
        resolve();
      });
    }),
  );
  return fs.readFileSync(path.join(directory, "fixture.js"), "utf8");
}

(async () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "component-cleanup-"),
  );
  let browser;
  try {
    const script = await bundle(directory);
    browser = await chromium.launch({
      headless: true,
      ...(fs.existsSync(chromium.executablePath())
        ? {}
        : {
            executablePath:
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          }),
    });
    const page = await browser.newPage();
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.route("http://component-fixture.test/**", (route) =>
      route.fulfill({
        contentType: "text/html",
        body: '<html><body><div id="root"></div></body></html>',
      }),
    );
    await page.goto("http://component-fixture.test/");
    await page.addScriptTag({ content: script });
    const exact = page.getByRole("textbox", {
      name: "Numeric value",
      exact: true,
    });
    const accepted = page.getByTestId("accepted");
    const count = async () =>
      Number(await page.getByTestId("commands").textContent());
    const external = (value) =>
      page.evaluate(
        (value) => window.numericFixture.externalValue(value),
        value,
      );
    await exact.waitFor();
    await exact.fill("6");
    assert.equal(await accepted.textContent(), "6");
    const beforeExternal = await count();
    await external(2);
    await page.waitForFunction(
      () =>
        document.querySelector('[aria-label="Numeric value"]').value === "2",
    );
    assert.equal(
      await count(),
      beforeExternal,
      "Synchronization sends no command",
    );
    assert.equal(
      await exact.evaluate((input) => input === document.activeElement),
      true,
      "External updates preserve focus",
    );
    await exact.fill("7");
    assert.equal(
      await accepted.textContent(),
      "2",
      "Rejected input leaves model unchanged",
    );
    await external(3);
    assert.equal(
      await exact.inputValue(),
      "7",
      "Rejected draft remains editable",
    );
    assert.equal(await exact.getAttribute("aria-invalid"), "true");
    await exact.press("Escape");
    assert.equal(await exact.inputValue(), "3");
    await exact.fill("-");
    const beforeIncomplete = await count();
    await external(4);
    assert.equal(
      await exact.inputValue(),
      "-",
      "Incomplete edits survive external changes",
    );
    assert.equal(await count(), beforeIncomplete);
    await exact.press("Escape");
    await exact.fill("1.");
    assert.equal(
      await exact.inputValue(),
      "1.",
      "Accepted decimal formatting remains editable",
    );
    await exact.press("2");
    assert.equal(await accepted.textContent(), "1.2");
    await exact.press("Enter");
    assert.equal(await exact.inputValue(), "1.2");
    await exact.fill("");
    await exact.press("Tab");
    assert.equal(
      await exact.inputValue(),
      "",
      "Empty input remains recoverable after blur",
    );
    await exact.press("Escape");
    assert.equal(await exact.inputValue(), "1.2");
    const range = page.getByRole("slider", {
      name: "Adjust numeric value",
      exact: true,
    });
    await range.fill("10");
    assert.equal(await accepted.textContent(), "10");
    const sibling = page.getByRole("slider", {
      name: "Sibling slider",
      exact: true,
    });
    await sibling.fill("0");
    assert.equal(await accepted.textContent(), "0");
    await sibling.fill("7");
    assert.equal(await accepted.textContent(), "0");
    assert.ok(
      await page.getByRole("alert").count(),
      "Both range adapters report rejection",
    );
    const form = page.locator("form");
    const submitted = form.getByRole("textbox", {
      name: "Submitted value",
      exact: true,
    });
    await submitted.fill("9");
    await external(2);
    assert.equal(
      await submitted.inputValue(),
      "9",
      "Explicit-submit draft survives activity changes",
    );
    assert.ok(
      (await form.textContent()).includes("changed while you were editing"),
    );
    await form
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    assert.equal(await submitted.inputValue(), "2");
    await submitted.fill("7");
    await form
      .getByRole("button", { name: "Apply changes", exact: true })
      .click();
    assert.equal(await accepted.textContent(), "2");
    assert.ok((await form.textContent()).includes("Seven is rejected"));
    assert.deepEqual(errors, []);
    console.log(
      "Numeric browser regression: acceptance, external updates, focus, incomplete/rejected drafts, decimals, Escape/Enter/blur, ranges, bounds, and explicit-submit rejection/discard passed.",
    );
  } finally {
    await browser?.close();
    fs.rmSync(directory, { recursive: true, force: true });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
