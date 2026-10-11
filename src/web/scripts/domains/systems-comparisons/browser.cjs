const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { load } = require("../../test-loader.cjs");
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { modelProvider } = load("src/simulations/runtime/assembly.ts");
const url = process.env.UX_TEST_URL || "http://127.0.0.1:43100";
const captures =
  process.env.SYSTEMS_CAPTURE_DIR || "/tmp/apertus-systems-review/final";
fs.mkdirSync(captures, { recursive: true });
const cases = [
  {
    slug: "nutrient-limitation",
    attribute: "data-biomass",
    sceneValue: (o) => o.biomass,
    states: [
      ["limiter-raised", { nitrogen: 80 }],
      ["nonlimiter-raised", { nitrogen: 40, phosphorus: 150 }],
      ["phosphorus-limited", { nitrogen: 100, phosphorus: 30 }],
      ["co-limited", { nitrogen: 40, phosphorus: 40 }],
      ["balanced", { nitrogen: 100, phosphorus: 100, potassium: 100 }],
    ],
  },
  {
    slug: "craft-production",
    attribute: "data-completed",
    sceneValue: (o) => o.assemblyCompleted,
    states: [
      ["bottleneck", { delay: 100 }],
      ["disruption", { delay: 0, disruption: 100 }],
      [
        "minimal-specialization",
        { specialization: 0, delay: 0, disruption: 0 },
      ],
      ["balanced-specialists", { specialization: 100 }],
    ],
  },
  {
    slug: "wildfire",
    attribute: "data-treated-area",
    sceneValue: (o) => o.treatedArea,
    states: [
      ["no-treatment", { coverage: 0 }],
      ["treated", { coverage: 50 }],
      ["treatment-crossed", { wind: 100, moisture: 0 }],
      ["wider-treatment", { coverage: 100, wind: 35, moisture: 40 }],
    ],
  },
  {
    slug: "food-web",
    attribute: "data-producer",
    sceneValue: (o) => o.producer,
    states: [
      ["predator-reduced", { pressure: 40 }],
      ["predator-removed", { pressure: 0 }],
      ["higher-pressure", { pressure: 150 }],
    ],
  },
];
const report = [];
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
    for (const c of cases) {
      const context = await browser.newContext({
        viewport: { width: 1440, height: 900 },
        reducedMotion: "reduce",
        acceptDownloads: true,
      });
      const page = await context.newPage();
      page.setDefaultTimeout(20000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      page.on("console", (m) => {
        if (m.type() === "error") errors.push(m.text());
      });
      page.on("requestfailed", (r) => {
        if (
          r.url().startsWith(url) &&
          !r.failure()?.errorText.includes("ERR_ABORTED")
        )
          errors.push(`${r.url()}: ${r.failure()?.errorText}`);
      });
      const recipe = premadeRecipe(c.slug),
        modelNode = recipe.document.nodes.find((n) => n.id === "model"),
        model = modelProvider(modelNode.definition);
      let accepted = { ...modelNode.configuration },
        stage = "opening";
      const scene = page.locator(".systems-scene");
      const controlNodes =
        c.slug === "food-web"
          ? [
              {
                id: "input/pressure",
                configuration: { label: "Selected population" },
              },
            ]
          : recipe.document.nodes.filter(
              (n) => n.definition === "controls/Slider",
            );
      const controlKeys = controlNodes.map((n) => n.id.slice(6));
      const field = (key) =>
        page.getByRole("textbox", {
          name:
            "Exact " +
            controlNodes
              .find((n) => n.id === `input/${key}`)
              .configuration.label.toLowerCase(),
          exact: true,
        });
      const verify = async () => {
        const expected = model.measure(accepted);
        await assertEventually(async () =>
          assert.equal(
            await scene.getAttribute(c.attribute),
            String(c.sceneValue(expected)),
          ),
        );
        for (const node of recipe.document.nodes.filter((n) =>
          n.id.startsWith("result/"),
        )) {
          const key = node.id.slice(7);
          const unit = model.outputs[key].unit;
          const label =
            unit && node.configuration.label.endsWith(` ${unit}`)
              ? node.configuration.label.slice(0, -unit.length - 1)
              : node.configuration.label;
          const display =
            node.definition === "displays/Readout"
              ? page
                  .locator(".recipe-measurement")
                  .filter({ has: page.getByText(label, { exact: true }) })
              : page
                  .locator(`[data-component-definition="${node.definition}"]`)
                  .filter({ hasText: String(expected[key]) });
          await display.first().waitFor();
          if (node.definition === "displays/Readout")
            assert.equal(
              parseFloat(await display.locator("output").innerText()),
              expected[key],
            );
        }
        assert.ok(
          (await page.locator(".recipe-status").allTextContents()).some((t) =>
            t.includes(expected.conclusion),
          ),
          "Explanation disagrees with accepted model",
        );
        for (const key of controlKeys)
          assert.equal(await field(key).inputValue(), String(accepted[key]));
      };
      const geometry = async (name) => {
        const g = await page.evaluate(() => {
          const box = (e) => e.getBoundingClientRect().toJSON();
          const intersects = (a, b) =>
            a.left < b.right - 2 &&
            a.right > b.left + 2 &&
            a.top < b.bottom - 2 &&
            a.bottom > b.top + 2;
          const cards = [...document.querySelectorAll(".board-item")];
          const texts = [
            ...document.querySelectorAll(".systems-scene svg text"),
          ].map((e) => ({ label: e.textContent, rect: box(e) }));
          const collisions = texts.flatMap((a, i) =>
            texts
              .slice(i + 1)
              .filter((b) => intersects(a.rect, b.rect))
              .map((b) => [a.label, b.label]),
          );
          const tools = [
            ...document.querySelectorAll(
              ".board-camera-tools,.board-workspace-tools,.command-bar,.workspace-identity,.workspace-header-tools",
            ),
          ].filter((e) => e.getBoundingClientRect().height > 0);
          return {
            horizontalOverflow:
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
            cards: cards.map((e) => ({
              rect: box(e),
              height: e.querySelector(".board-content").clientHeight,
              scrollHeight: e.querySelector(".board-content").scrollHeight,
              width: e.querySelector(".board-content").clientWidth,
              scrollWidth: e.querySelector(".board-content").scrollWidth,
            })),
            scrolling: [...document.querySelectorAll(".board-item *")]
              .filter(
                (e) =>
                  ["auto", "scroll"].some((v) =>
                    [
                      getComputedStyle(e).overflowX,
                      getComputedStyle(e).overflowY,
                    ].includes(v),
                  ) &&
                  (e.scrollHeight > e.clientHeight + 2 ||
                    e.scrollWidth > e.clientWidth + 2),
              )
              .map((e) => e.className),
            targets: [...document.querySelectorAll(".board-item input")]
              .filter((e) => e.getBoundingClientRect().height > 0)
              .map((e) => ({
                type: e.type,
                rect: box(e),
                font: parseFloat(getComputedStyle(e).fontSize),
                scale: e.getBoundingClientRect().width / e.offsetWidth,
              })),
            scene: box(document.querySelector(".systems-scene")),
            collisions,
            obscured: cards.flatMap((e) =>
              tools
                .filter((t) => intersects(box(e), box(t)))
                .map((t) => t.className),
            ),
          };
        });
        assert.ok(g.horizontalOverflow <= 2);
        assert.deepEqual(g.scrolling, []);
        assert.deepEqual(g.collisions, [], `${c.slug}: text collisions`);
        assert.deepEqual(
          g.obscured,
          [],
          `${c.slug}: workspace overlay hides a card`,
        );
        assert.ok(
          g.cards.every(
            (r) =>
              r.scrollHeight <= r.height + 2 && r.scrollWidth <= r.width + 2,
          ),
          JSON.stringify(g.cards),
        );
        assert.ok(
          g.cards.every((r) => r.rect.top >= 75 && r.rect.bottom <= 810),
          `${c.slug}: card outside useful viewport ${JSON.stringify(g.cards)}`,
        );
        assert.ok(g.scene.width >= 520 && g.scene.height >= 300);
        assert.ok(
          g.targets.every(
            (t) =>
              t.rect.height >= 44 &&
              (t.type !== "text" || t.font * t.scale >= 16),
          ),
          `${c.slug}: small control targets`,
        );
        report.push({ slug: c.slug, state: name, ...g });
        console.log(
          JSON.stringify({
            slug: c.slug,
            state: name,
            scene: { width: g.scene.width, height: g.scene.height },
            minTargetHeight: Math.min(...g.targets.map((t) => t.rect.height)),
            collisions: g.collisions,
            obscured: g.obscured,
          }),
        );
      };
      const capture = async (name) => {
        stage = name;
        await page.waitForTimeout(200);
        await geometry(name);
        await page.screenshot({
          path: path.join(captures, `${c.slug}-${name}-1440x900.png`),
        });
      };
      try {
        await page.goto(`${url}/experiments`, {
          waitUntil: "domcontentloaded",
        });
        const card = page.locator(
          `.experiment-catalog__card[href="/experiments?experiment=${c.slug}"]`,
        );
        await card.waitFor();
        assert.equal(await card.locator("h2").innerText(), recipe.title);
        assert.equal(await card.locator("p").innerText(), recipe.description);
        await card.click();
        await scene.waitFor();
        await page.waitForTimeout(650);
        assert.equal(await page.locator(".board-item").count(), 4);
        assert.equal(
          await page.locator(".workspace-identity h1").innerText(),
          recipe.title,
        );
        assert.equal(
          await page.locator(".board-item input[type=text]").count(),
          controlNodes.length,
        );
        assert.equal(
          await scene
            .getByRole(
              ["food-web", "wildfire", "craft-production"].includes(c.slug)
                ? "group"
                : "img",
            )
            .count(),
          1,
        );
        await verify();
        await capture("opening");
        if (c.slug === "food-web") {
          await page
            .getByRole("combobox", { name: "Explore an organism", exact: true })
            .selectOption("0");
          accepted.selection = 0;
          await verify();
        }
        for (const key of controlKeys) {
          const input = field(key);
          await input.focus();
          const focus = await input.evaluate((e) => ({
            width: getComputedStyle(e).outlineWidth,
            style: getComputedStyle(e).outlineStyle,
            color: getComputedStyle(e).outlineColor,
            background: getComputedStyle(e).backgroundColor,
          }));
          assert.ok(
            parseFloat(focus.width) >= 2 &&
              focus.style !== "none" &&
              focus.color !== focus.background,
            "Missing visible keyboard focus",
          );
          const slider = page.getByRole("slider", {
            name:
              c.slug === "food-web"
                ? "Adjust selected population"
                : controlNodes.find((n) => n.id === `input/${key}`)
                    .configuration.label,
            exact: true,
          });
          await slider.focus();
          await slider.press(
            accepted[key] === model.parameters.properties[key].maximum
              ? "ArrowLeft"
              : "ArrowRight",
          );
          accepted[key] +=
            accepted[key] === model.parameters.properties[key].maximum ? -1 : 1;
          await verify();
          await input.focus();
          await input.press("ControlOrMeta+A");
          await input.pressSequentially("-");
          await input.press("Tab");
          await page
            .getByRole("alert")
            .filter({ hasText: "Current value" })
            .waitFor();
          const expected = model.measure(accepted);
          assert.equal(
            await scene.getAttribute(c.attribute),
            String(c.sceneValue(expected)),
          );
          await capture(`invalid-${key}`);
          await input.focus();
          await input.press("Escape");
          assert.equal(await input.inputValue(), String(accepted[key]));
          await input.press("ControlOrMeta+A");
          await input.pressSequentially(String(model.defaults[key]));
          await input.press("Tab");
          accepted[key] = model.defaults[key];
          await verify();
        }
        if (c.slug === "craft-production") {
          for (let i = 1; i < 8; i++) {
            const button = page.getByRole("button", {
              name: "Follow item →",
              exact: true,
            });
            await button.focus();
            await button.press("Enter");
            await scene
              .getByText(
                `Stage ${i + 1} of 8 · ${model.measure(accepted).scene.stages[i].name}`,
                { exact: true },
              )
              .waitFor();
          }
          await page
            .getByRole("button", { name: "Follow another item", exact: true })
            .click();
        }
        for (const [name, patch] of c.states) {
          for (const [key, value] of Object.entries(patch)) {
            const input = field(key);
            await input.focus();
            await input.press("ControlOrMeta+A");
            await input.pressSequentially(String(value));
            await input.press("Tab");
            accepted[key] = value;
          }
          await verify();
          await capture(name);
        }
        await page.locator(".board-navigation-help > summary").click();
        await page
          .getByRole("button", { name: "Reset experiment", exact: true })
          .click();
        accepted = { ...model.defaults };
        await verify();
        await page.locator(".board-navigation-help > summary").click();
        await capture("reset");
        // Save exports authored starting values, per the shared recipe-session contract.
        // Exploration stays local; capture durability is verified in the model/runtime suite.
        const firstKey = controlKeys[0],
          changed = c.states[0][1][firstKey] ?? 50;
        if (c.slug === "food-web") {
          await page
            .getByRole("combobox", { name: "Explore an organism", exact: true })
            .selectOption("0");
          accepted.selection = 0;
        }
        await field(firstKey).fill(String(changed));
        await field(firstKey).press("Tab");
        accepted[firstKey] = changed;
        await verify();
        await page.locator(".gas-experiment-tools summary").click();
        const downloading = page.waitForEvent("download");
        await page
          .getByRole("button", { name: "Save recipe", exact: true })
          .click();
        const download = await downloading;
        const saved = JSON.parse(
          fs.readFileSync(await download.path(), "utf8"),
        );
        const reopened = loadRecipe(saved);
        assert.deepEqual(
          reopened.runtime.getSnapshot().state.model,
          model.defaults,
        );
        assert.equal(
          saved.document.nodes.filter((n) => n.definition === model.ref).length,
          1,
        );
        assert.equal(
          saved.document.nodes.filter((n) =>
            n.definition.startsWith("appearance/"),
          ).length,
          1,
        );
        assert.equal(
          saved.document.nodes.filter((n) =>
            ["controls/Slider", "controls/FoodWebPopulation"].includes(
              n.definition,
            ),
          ).length,
          controlNodes.length,
        );
        assert.equal(
          saved.document.connections.length,
          recipe.document.connections.length,
        );
        fs.writeFileSync(
          path.join(captures, `${c.slug}-saved.json`),
          JSON.stringify(saved, null, 2),
        );
        await page
          .getByRole("button", { name: "Open recipe", exact: true })
          .click();
        await page
          .getByLabel("Open recipe file", { exact: true })
          .setInputFiles(await download.path());
        accepted = { ...model.defaults };
        await verify();
        if (
          !(await page.locator(".gas-experiment-tools").evaluate((e) => e.open))
        )
          await page.locator(".gas-experiment-tools summary").click();
        await page
          .getByRole("link", { name: "Remix in builder", exact: true })
          .click();
        accepted = { ...model.defaults };
        await page
          .getByRole("button", { name: "Try lesson ↗", exact: true })
          .waitFor();
        await page.waitForTimeout(300);
        await page.screenshot({
          path: path.join(captures, `${c.slug}-remix.png`),
        });
        await page
          .getByRole("button", { name: "Try lesson ↗", exact: true })
          .click();
        await scene.waitFor();
        assert.equal(
          await page
            .locator(".scalar-control,.food-population-control")
            .count(),
          controlNodes.length,
        );
        await verify();
        if (c.slug === "food-web") {
          await page
            .getByRole("combobox", { name: "Explore an organism", exact: true })
            .selectOption("0");
          accepted.selection = 0;
        }
        const next = changed === 100 ? 40 : 100;
        await field(firstKey).fill(String(next));
        await field(firstKey).press("Tab");
        accepted[firstKey] = next;
        await verify();
        await page.screenshot({
          path: path.join(captures, `${c.slug}-try-lesson.png`),
        });
        assert.deepEqual(errors, [], `${c.slug}: browser errors`);
      } catch (e) {
        await page
          .screenshot({
            path: path.join(captures, `failure-${c.slug}-${stage}.png`),
          })
          .catch(() => {});
        throw e;
      } finally {
        await context.close();
        fs.writeFileSync(
          path.join(captures, "geometry.json"),
          JSON.stringify(report, null, 2),
        );
      }
    }
  } finally {
    await browser.close();
  }
  console.log(
    "Four systems desktop browser: all critical states, every keyboard control, focus, invalid drafts, reset, saved/reopened snapshots, independent builder remix and Try lesson passed.",
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
async function assertEventually(check) {
  let failure;
  for (let i = 0; i < 30; i++) {
    try {
      await check();
      return;
    } catch (e) {
      failure = e;
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw failure;
}
