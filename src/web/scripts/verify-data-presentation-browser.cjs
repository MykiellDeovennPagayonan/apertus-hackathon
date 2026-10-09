const assert = require("node:assert/strict");
const fs = require("node:fs");
const { chromium } = require("playwright");
const { load } = require("./test-loader.cjs");
const { modelRecipe, createPublicNode } = load(
  "src/simulations/components/composites/catalog.ts",
);
const { canonicalDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { DocumentRuntime } = load(
  "src/simulations/runtime/authoring/runtime.ts",
);
const { emptyAuthoredDocument, emptyLayout } = load(
  "src/simulations/runtime/authoring/types.ts",
);
async function open(browser, document) {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(
    (document) =>
      localStorage.setItem(
        "apertus-builder-draft-v1",
        JSON.stringify({ document, valid: document }),
      ),
    canonicalDocument(document),
  );
  await page.goto(
    `${process.env.UX_TEST_URL || "http://127.0.0.1:43002"}/experiments/builder`,
  );
  // Canonical saved drafts now open directly in the unified builder.
  await page.getByRole("button", { name: "Build", exact: true }).click();
  await page.locator(".recipe-lesson").waitFor();
  return { page, errors };
}
function tablesFixture() {
  const d = emptyAuthoredDocument();
  d.scopes.push({ id: "scope/data", label: "Observations" });
  d.lesson.title = "Inspect and compare observations";
  d.layout.kind = "stack";
  function add(label, kind, rows, configuration = {}) {
    const id = label.toLowerCase().replaceAll(" ", "-");
    const display = createPublicNode(`displays/${kind}`, id, "scope/data");
    display.label = label;
    Object.assign(display.configuration, { label, ...configuration });
    d.nodes.push(display);
    d.layout.children.push({ ...emptyLayout(`layout/${id}`), node: id });
    if (rows !== undefined) {
      const resource = createPublicNode(
        "resources/Dataset",
        `source/${id}`,
        "scope/data",
      );
      resource.configuration.rows = JSON.stringify(rows);
      d.resources.push(resource);
      d.connections.push({
        id: `link/${id}`,
        kind: "value",
        from: { node: resource.id, port: "rows" },
        to: { node: id, port: "value" },
      });
    }
  }
  add(
    "Measurements",
    "DataTable",
    Array.from({ length: 80 }, (_, i) => ({
      id: `sample-${i}`,
      distance: i === 1 ? null : i === 2 ? "wrong" : i / 10,
    })),
    {
      columns: [
        { key: "id", label: "Observation", type: "string" },
        {
          key: "distance",
          label: "Distance",
          unit: "m",
          type: "number",
          precision: 2,
        },
      ],
    },
  );
  add("Empty observations", "DataTable", []);
  add("Waiting observations", "Chart", undefined);
  add("Invalid grid", "Heatmap", [{ id: "a", value: 2 }]);
  add(
    "Two series",
    "Chart",
    [
      { id: "a", time: 0, current: 0, comparison: 1 },
      { id: "b", time: 1, current: null, comparison: 2 },
      { id: "c", time: 2, current: 3, comparison: 2 },
    ],
    {
      xKey: "time",
      xLabel: "Model time",
      xUnit: "s",
      yLabel: "Distance",
      yUnit: "m",
      columns: [
        { key: "time", label: "Model time", unit: "s", type: "number" },
        { key: "current", label: "Current", unit: "m", type: "number" },
        { key: "comparison", label: "Comparison", unit: "m", type: "number" },
      ],
    },
  );
  return d;
}
async function inspectGeometry(page) {
  assert.deepEqual(
    await page
      .locator(".data-display svg")
      .evaluateAll((svgs) =>
        svgs.flatMap((svg) =>
          [...svg.querySelectorAll("*")].flatMap((el) =>
            [...el.attributes]
              .filter(
                (a) =>
                  [
                    "x",
                    "y",
                    "cx",
                    "cy",
                    "height",
                    "width",
                    "d",
                    "points",
                    "viewBox",
                  ].includes(a.name) && /NaN|Infinity/.test(a.value),
              )
              .map((a) => a.value),
          ),
        ),
      ),
    [],
  );
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
    const { page, errors } = await open(browser, tablesFixture());
    const displays = page.locator(".data-display");
    const table = displays.filter({
      has: page.locator("figcaption", { hasText: /^Measurements$/ }),
    });
    await page.screenshot({
      path: "/tmp/component-data-initial.png",
      fullPage: true,
    });
    await table.getByRole("columnheader", { name: "Distance (m)" }).waitFor();
    assert.equal(await table.locator("tbody tr").count(), 80);
    assert.equal(
      await table
        .locator("tbody tr")
        .first()
        .locator("td")
        .nth(1)
        .textContent(),
      "0",
    );
    assert.equal(await table.getByText("Missing", { exact: true }).count(), 1);
    assert.equal(await table.getByText("Invalid", { exact: true }).count(), 1);
    const region = table.locator(".data-table-scroll");
    assert.ok(
      await region.evaluate(
        (el) => el.scrollHeight > el.clientHeight && el.clientHeight <= 301,
      ),
    );
    assert.equal(
      await table
        .locator("th")
        .first()
        .evaluate((el) => getComputedStyle(el).position),
      "sticky",
    );
    assert.equal(
      await table
        .locator("td.data-number")
        .first()
        .evaluate((el) => getComputedStyle(el).textAlign),
      "right",
    );
    await region.focus();
    await region.press("End");
    await page.waitForTimeout(200);
    assert.ok(
      await region.evaluate((el) => el.scrollTop > 0),
      "Table scroll works with keyboard",
    );
    assert.ok(
      (
        await displays.filter({ hasText: "Empty observations" }).textContent()
      ).includes("No observations yet"),
    );
    assert.ok(
      (
        await displays.filter({ hasText: "Waiting observations" }).textContent()
      ).includes("Connect a data source"),
    );
    assert.ok(
      (
        await displays.filter({ hasText: "Invalid grid" }).textContent()
      ).includes("cannot be displayed"),
    );
    const chart = displays.filter({
      has: page.locator("figcaption", { hasText: /^Two series$/ }),
    });
    assert.equal(await chart.locator(".data-series-legend li").count(), 2);
    assert.ok(await chart.locator("path[stroke-dasharray='8 4']").count());
    await chart.locator("summary").focus();
    await chart.locator("summary").press("Enter");
    assert.equal(await chart.locator("details").getAttribute("open"), "");
    assert.equal(await chart.locator("tbody tr").count(), 3);
    await inspectGeometry(page);
    await page.screenshot({
      path: "/tmp/component-data-build.png",
      fullPage: true,
    });
    await page
      .getByRole("button", { name: "Edit Measurements", exact: true })
      .click();
    const settings = page.locator(".data-settings");
    await settings
      .getByLabel("Display title", { exact: true })
      .fill("Measured distances");
    await settings
      .locator("summary", { hasText: "Column headings and units" })
      .click();
    await settings
      .getByRole("button", { name: "Add column", exact: true })
      .click();
    await settings
      .getByRole("button", { name: "Apply display settings", exact: true })
      .click();
    await settings.getByRole("alert").waitFor();
    await page.screenshot({ path: "/tmp/component-data-settings-desktop.png" });
    assert.equal(
      await settings.getByLabel("Display title", { exact: true }).inputValue(),
      "Measured distances",
      "Rejected settings preserve their draft",
    );
    assert.equal(
      await page
        .locator(".data-display")
        .filter({
          has: page.locator("figcaption", { hasText: /^Measurements$/ }),
        })
        .count(),
      1,
    );
    await settings
      .getByRole("button", { name: "Discard edits", exact: true })
      .click();
    await settings
      .getByLabel("Display title", { exact: true })
      .fill("Measured distances");
    await settings
      .getByRole("group", { name: "Column 2", exact: true })
      .getByLabel("Heading", { exact: true })
      .fill("Travel distance");
    await page.setViewportSize({ width: 390, height: 844 });
    const apply = settings.getByRole("button", {
      name: "Apply display settings",
      exact: true,
    });
    await apply.scrollIntoViewIfNeeded();
    assert.equal(
      await apply.evaluate((el) => getComputedStyle(el).backgroundColor),
      "rgb(40, 94, 86)",
    );
    assert.ok(
      await apply.evaluate((el) => el.getBoundingClientRect().height >= 44),
    );
    await page.screenshot({ path: "/tmp/component-data-settings-mobile.png" });
    assert.ok(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth + 1,
      ),
    );
    await page.setViewportSize({ width: 1440, height: 1000 });

    await settings
      .getByRole("button", { name: "Apply display settings", exact: true })
      .click();
    await page.keyboard.press("Escape");
    await page
      .locator(".data-display")
      .filter({
        has: page.locator("figcaption", { hasText: /^Measured distances$/ }),
      })
      .getByRole("columnheader", { name: "Travel distance (m)" })
      .waitFor();
    await page.getByRole("button", { name: "Undo", exact: true }).click();
    await table.getByRole("columnheader", { name: "Distance (m)" }).waitFor();

    await page
      .getByRole("button", { name: "Try lesson ↗", exact: true })
      .click();
    assert.equal(await page.locator(".recipe-author-label").count(), 0);
    assert.ok(
      (
        await displays.filter({ hasText: "Waiting observations" }).textContent()
      ).includes("when observations are available"),
    );
    assert.equal(
      await chart.locator("details").getAttribute("open"),
      "",
      "Changing host preserves observations disclosure",
    );
    await page.screenshot({
      path: "/tmp/component-data-learner.png",
      fullPage: true,
    });
    for (const width of [390, 768]) {
      await page.setViewportSize({ width, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await chart.scrollIntoViewIfNeeded();
      await page.screenshot({ path: `/tmp/component-data-${width}.png` });
    }
    await page.setViewportSize({ width: 1440, height: 1000 });
    await chart.evaluate((el) => {
      el.style.width = "300px";
    });
    const plot = chart.locator(".data-plot-scroll");
    assert.ok(await plot.evaluate((el) => el.scrollWidth > el.clientWidth));
    await plot.focus();
    for (let i = 0; i < 8; i++) await plot.press("ArrowRight");
    await page.waitForTimeout(200);
    assert.ok(await plot.evaluate((el) => el.scrollLeft > 0));
    await chart.screenshot({ path: "/tmp/component-data-compact.png" });
    assert.deepEqual(errors, []);
    await page.close();
    for (const [definition, kind] of [
      ["models/probability", "Histogram"],
      ["prefabs/natural-systems/DiffusionField", "Heatmap"],
      ["prefabs/natural-systems/PredatorPrey", "Chart"],
    ]) {
      const authored = modelRecipe(definition).document;
      // Put observations in their own visible group for host-size review.
      authored.layout = {
        ...emptyLayout("data-review"),
        kind: "stack",
        children: authored.layout.children
          .flatMap((group) => group.children)
          .filter(
            (child) =>
              child.node &&
              authored.nodes.find((n) => n.id === child.node)?.definition ===
                `displays/${kind}`,
          ),
      };
      const { page, errors } = await open(browser, authored);
      const display = page.locator(".data-display").first();
      await display.locator("svg.data-plot").waitFor();
      await display.locator("summary").click();
      assert.ok(await display.locator("tbody tr").count());
      if (kind === "Heatmap") {
        const field = new DocumentRuntime(authored).getSnapshot().outputs.model
          .field;
        assert.equal(
          await display.locator("tbody tr").count(),
          field.length * field[0].length,
        );
        assert.ok((await display.textContent()).includes("mass units/m²"));
      }
      await inspectGeometry(page);
      await page
        .getByRole("button", { name: "Try lesson ↗", exact: true })
        .click();
      await page.screenshot({
        path: `/tmp/component-data-${kind.toLowerCase()}-desktop.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth + 1,
        ),
      );
      await display.scrollIntoViewIfNeeded();
      await display.screenshot({
        path: `/tmp/component-data-${kind.toLowerCase()}-mobile.png`,
      });
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "Data display browser UX: real probability/diffusion/population outputs, metadata/units, truthful cells, bounded keyboard scrolling, sticky headings, patterned series, observation disclosure preservation, author/learner states, compact/mobile overflow and finite SVG geometry passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
