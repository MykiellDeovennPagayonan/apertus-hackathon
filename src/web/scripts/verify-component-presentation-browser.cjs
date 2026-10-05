const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { builtInRecipe, createPublicNode, modelRecipe } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { emptyLayout } = load("src/simulations/runtime/authoring/types.ts");

async function openFixture(browser, authored) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  const document = canonicalDocument(authored);
  await page.addInitScript(
    ({ document }) => {
      localStorage.setItem(
        "apertus-builder-draft-v1",
        JSON.stringify({ document, valid: document }),
      );
    },
    { document },
  );
  await page.goto(
    `${process.env.UX_TEST_URL || "http://127.0.0.1:43002"}/experiments/builder`,
  );
  await page
    .getByRole("button", { name: "Continue draft", exact: true })
    .click();
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.locator(".recipe-lesson").waitFor();
  return { page, errors };
}

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
  try {
    for (const demo of ["arithmetic", "fraction-builder"]) {
      const authored = modelRecipe(`models/${demo}`).document;
      const { page, errors } = await openFixture(browser, authored);
      const lesson = page.locator(".recipe-lesson");
      assert.equal(
        await lesson
          .locator("fieldset")
          .filter({ has: page.locator("legend", { hasText: /^value$/ }) })
          .count(),
        0,
      );
      assert.equal(
        await lesson
          .locator("fieldset")
          .evaluateAll(
            (elements) =>
              elements.filter((el) => !el.querySelector("input, select"))
                .length,
          ),
        0,
      );
      assert.ok(await lesson.locator(".math-equation").textContent());
      const form = lesson.locator("form").filter({
        has: page.getByRole("button", {
          name:
            demo === "arithmetic" ? "Start this activity" : "Compare fractions",
          exact: true,
        }),
      });
      const input = form.getByRole("spinbutton").first();
      const original = await input.inputValue();
      await input.fill("999");
      await form
        .getByRole("button", {
          name:
            demo === "arithmetic" ? "Start this activity" : "Compare fractions",
          exact: true,
        })
        .click();
      await form.locator(".catalog-feedback--error").waitFor();
      assert.equal(
        await input.inputValue(),
        "999",
        "Rejected draft remains editable",
      );
      assert.equal(await input.getAttribute("aria-invalid"), "true");
      await form
        .getByRole("button", { name: "Discard edits", exact: true })
        .click();
      assert.equal(await input.inputValue(), original);
      if (demo === "arithmetic") {
        assert.equal(
          await lesson
            .getByRole("button", { name: "Play", exact: true })
            .count(),
          1,
        );
        await lesson.getByRole("button", { name: "Play", exact: true }).click();
        await lesson
          .getByRole("button", { name: "Pause", exact: true })
          .click();
        assert.ok((await lesson.textContent()).includes("Paused"));
        await input.fill("4");
        await form
          .getByRole("button", { name: "Start this activity", exact: true })
          .click();
        assert.ok(
          (await lesson.locator(".math-equation").textContent()).startsWith(
            "4 +",
          ),
        );
        await lesson
          .getByRole("button", { name: "Restart activity", exact: true })
          .click();
        assert.equal(
          await input.inputValue(),
          original,
          "Clean task fields follow reset",
        );
      } else {
        assert.ok((await lesson.textContent()).includes("First fraction"));
        assert.ok((await lesson.textContent()).includes("Shaded parts"));
        await input.fill("0");
        await form
          .getByRole("button", { name: "Compare fractions", exact: true })
          .click();
        assert.ok(
          (await lesson.locator(".math-equation").textContent()).startsWith(
            "0/",
          ),
        );
      }
      await page.screenshot({
        path: `/tmp/component-${demo}-desktop.png`,
        fullPage: true,
      });
      await page
        .getByRole("button", { name: "Try lesson ↗", exact: true })
        .click();
      assert.equal(
        await lesson.locator(".recipe-author-label").count(),
        0,
        "Learner presentation has no author chrome",
      );
      await page.screenshot({
        path: `/tmp/component-${demo}-learner.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      await page.screenshot({
        path: `/tmp/component-${demo}-mobile.png`,
        fullPage: false,
      });
      await form.getByRole("spinbutton").first().scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `/tmp/component-${demo}-mobile-controls.png`,
      });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      assert.deepEqual(errors, []);
      await page.close();
    }
    // Exact slider entry shares accepted model state and follows external resets.
    const gasFixture = await openFixture(
      browser,
      modelRecipe("prefabs/AuthoredGasContainer").document,
    );
    const gasLesson = gasFixture.page.locator(".recipe-lesson");
    const slider = gasLesson.locator(".catalog-slider").first();
    const exact = slider.getByRole("spinbutton");
    const range = slider.getByRole("slider");
    const initial = await exact.inputValue();
    await exact.fill("1.5");
    assert.equal(await range.inputValue(), "1.5");
    await exact.fill("999999");
    await gasLesson.locator(".catalog-feedback--error").first().waitFor();
    assert.equal(
      await range.inputValue(),
      "1.5",
      "Rejected entry does not fabricate a slider value",
    );
    await exact.press("Escape");
    assert.equal(await exact.inputValue(), "1.5");
    await gasLesson
      .getByRole("button", {
        name: "Restore starting values",
        exact: true,
      })
      .click();
    assert.equal(await exact.inputValue(), initial);
    const measurement = gasLesson.locator(".recipe-measurement");
    assert.equal(await measurement.locator("small").textContent(), "kPa");
    await gasFixture.page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    await gasFixture.page.screenshot({
      path: "/tmp/component-slider-measurement.png",
      fullPage: true,
    });
    assert.deepEqual(gasFixture.errors, []);
    await gasFixture.page.close();
    // Tabs keep mounted fields, keyboard navigation, and explicit tab/panel linkage.
    const tabbed = modelRecipe("models/arithmetic").document;
    tabbed.layout = {
      ...emptyLayout("tabs"),
      kind: "tabs",
      children: tabbed.layout.children,
    };
    const { page, errors } = await openFixture(browser, tabbed);
    const tabs = page.locator(".recipe-lesson [role=tab]");
    await tabs.nth(1).click();
    const input = page
      .locator(".recipe-lesson [role=tabpanel]:not([hidden])")
      .getByRole("spinbutton")
      .first();
    await input.fill("7");
    await tabs.nth(0).click();
    await tabs.nth(0).press("ArrowRight");
    assert.equal(
      await input.inputValue(),
      "7",
      "Tab changes preserve dirty drafts",
    );
    assert.equal(await tabs.nth(1).getAttribute("aria-selected"), "true");
    assert.ok(await tabs.nth(1).getAttribute("aria-controls"));
    assert.deepEqual(errors, []);
    await page.close();
    // Object selection reflects accepted runtime state and inspectors avoid raw dumps.
    const bridge = structuredClone(builtInRecipe("recipes/BridgeLab").document);
    const response = bridge.nodes.find(
      (node) => node.definition === "models/BridgeResponse",
    );
    const member = bridge.nodes.find(
      (node) => node.definition === "models/TrussMember",
    );
    assert.ok(response && member);
    const picker = createPublicNode(
      "controls/EntityPicker",
      "control/member-picker",
      response.scope,
    );
    picker.configuration = {
      ...picker.configuration,
      label: "Inspect bridge member",
      targetDefinition: "models/TrussMember",
    };
    const inspector = createPublicNode(
      "displays/Inspector",
      "display/member-properties",
      response.scope,
    );
    inspector.configuration = {
      ...inspector.configuration,
      label: "Member properties",
      precision: 2,
    };
    const invalidMember = structuredClone(member);
    invalidMember.id = "unconnected-member";
    invalidMember.label = "Unconnected member";
    bridge.nodes.push(picker, inspector, invalidMember);
    bridge.connections.push(
      {
        id: "link/member-picker",
        kind: "command",
        from: { node: picker.id, port: "submit" },
        to: { node: response.id, port: "SELECT_MEMBER" },
      },
      {
        id: "link/member-properties",
        kind: "value",
        from: { node: member.id, port: "data" },
        to: { node: inspector.id, port: "value" },
      },
    );
    bridge.layout.children
      .find((layout) => layout.id === "layout/controls")
      .children.unshift({
        ...emptyLayout("layout/member-picker"),
        node: picker.id,
      });
    bridge.layout.children
      .find((layout) => layout.id === "layout/scene")
      .children.push({
        ...emptyLayout("layout/member-properties"),
        node: inspector.id,
      });
    const bridgeFixture = await openFixture(browser, bridge);
    const bridgeLesson = bridgeFixture.page.locator(".recipe-lesson");
    const memberSelect = bridgeLesson.getByLabel("Inspect bridge member");
    assert.match(
      await memberSelect.locator(`option[value="${member.id}"]`).textContent(),
      /^Truss member \d+$/,
      "Internal generated IDs receive meaningful picker labels",
    );
    await memberSelect.selectOption(member.id);
    assert.equal(await memberSelect.inputValue(), member.id);
    assert.ok(
      (await bridgeLesson.textContent()).includes("Selected: Truss member"),
    );
    const memberInspector = bridgeLesson.locator(".bridge-demo__inspector");
    await memberInspector.waitFor();
    assert.equal(
      (await memberInspector.textContent()).includes("generated/"),
      false,
      "Specialized inspection also hides generated IDs",
    );
    const properties = bridgeLesson.getByRole("region", {
      name: "Member properties",
    });
    assert.ok((await properties.textContent()).includes("Type"));
    assert.equal(
      (await properties.textContent()).includes("generated/"),
      false,
      "Known references do not expose generated path IDs",
    );
    assert.equal(
      (await properties.textContent()).includes('{"'),
      false,
      "Structured values never fall through to JSON text",
    );
    await bridgeFixture.page.screenshot({
      path: "/tmp/component-inspector-selection-build.png",
      fullPage: true,
    });
    await memberSelect.selectOption(invalidMember.id);
    await bridgeLesson.getByRole("alert").waitFor();
    assert.equal(
      await memberSelect.inputValue(),
      member.id,
      "Rejected object selection preserves the accepted value",
    );
    assert.match(
      await bridgeLesson.getByRole("alert").textContent(),
      /Unknown/,
    );
    await bridgeLesson
      .getByRole("button", { name: "Restart activity", exact: true })
      .click();
    await bridgeFixture.page.waitForFunction(
      () => document.querySelector(".entity-picker select")?.value === "",
    );
    assert.equal(
      await memberSelect.inputValue(),
      "",
      "External reset restores the picker to authoritative state",
    );
    await bridgeFixture.page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    assert.equal(await bridgeLesson.locator(".recipe-author-label").count(), 0);
    await bridgeFixture.page.screenshot({
      path: "/tmp/component-inspector-selection-learner.png",
      fullPage: true,
    });
    await bridgeFixture.page.setViewportSize({ width: 390, height: 844 });
    await properties.scrollIntoViewIfNeeded();
    assert.ok(
      await bridgeFixture.page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await bridgeFixture.page.screenshot({
      path: "/tmp/component-inspector-selection-mobile.png",
      fullPage: false,
    });
    assert.deepEqual(bridgeFixture.errors, []);
    await bridgeFixture.page.close();
    console.log(
      "Component UX: arithmetic/fraction hierarchy, draft rejection/recovery, playback acceptance, reset synchronization, compact overflow, keyboard tabs, draft preservation, accepted object selection and structured inspection passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
