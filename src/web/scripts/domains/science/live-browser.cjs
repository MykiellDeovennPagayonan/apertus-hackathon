const assert = require("node:assert/strict"),
  path = require("node:path");
const { load } = require("../../test-loader.cjs");
const { scienceCommand, scienceObservation } = load(
  "src/simulations/domains/science/index.ts",
);
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { convertToBoard } = load("src/simulations/runtime/authoring/board.ts");
exports.verifyPage = async (page, recipe, c, dir) => {
  const scene = page
    .locator(`.science-scene[data-science="${c.kind}"]`)
    .first();
  await scene.waitFor({ timeout: 60000 });
  const appearance = recipe.document.nodes.find(
    (n) => n.definition === `appearance/science-${c.kind}`,
  );
  assert.equal(
    await scene.locator(".science-question").innerText(),
    String(
      appearance?.configuration.question || recipe.document.lesson.instruction,
    ),
  );
  const capture = (name) =>
      page.screenshot({ path: path.join(dir, `${name}.png`) }),
    model = recipe.document.nodes.find((n) => n.definition === c.definition);
  assert.ok(model);
  const board =
    recipe.document.presentation?.mode === "board"
      ? recipe.document.presentation
      : convertToBoard(recipe.document);
  const layoutFor = (l, id) =>
    l.node === id
      ? l
      : l.children.map((child) => layoutFor(child, id)).find(Boolean);
  const selector = (id) => {
    const layout = layoutFor(recipe.document.layout, id);
    assert.ok(layout, `No layout for ${id}`);
    const index = board.items.findIndex((i) => i.layoutId === layout.id);
    assert.ok(index >= 0);
    return `[data-board-index="${index}"] .recipe-component-item`;
  };
  const control = (op) => {
    const binding = recipe.document.connections.find(
      (x) =>
        x.kind === "command" &&
        x.to.node === model.id &&
        x.to.port === scienceCommand(c.kind, op),
    );
    assert.ok(binding, `Missing ${op} control`);
    return page.locator(selector(binding.from.node));
  };
  const oracle = loadRecipe(recipe).runtime;
  const dispatch = (op) =>
    assert.ok(
      oracle.dispatch([
        { node: model.id, command: scienceCommand(c.kind, op), arguments: {} },
      ]).accepted,
    );
  const agree = async () => {
    const expected = oracle.getSnapshot().outputs[model.id];
    for (const binding of recipe.document.connections.filter(
      (x) =>
        x.kind === "value" &&
        x.from.node === model.id &&
        ["summary", "explanation", "inspection"].includes(x.from.port),
    )) {
      await page.waitForFunction(
        ({ selector, value }) =>
          document
            .querySelector(selector)
            ?.querySelector(".recipe-event")
            ?.textContent.trim() === value.trim(),
        {
          selector: selector(binding.to.node),
          value: expected[binding.from.port],
        },
        { timeout: 10000 },
      );
    }
  };
  await agree();
  await capture("generated-opening");
  const visible = await scene.boundingBox();
  assert.ok(
    visible.width >= 400 && visible.height >= 200,
    "Generated scene too small",
  );
  if (c.kind === "immune") {
    await control("EXPOSE").getByRole("button").first().click();
    dispatch("EXPOSE");
  }
  if (c.kind === "invasive") {
    await control("INTRODUCE").getByRole("button").first().click();
    dispatch("INTRODUCE");
  }
  for (let i = 0; i < 3; i++) {
    await control("STEP").getByRole("button").first().click();
    dispatch("STEP");
  }
  assert.equal(await scene.getAttribute("data-time"), "3");
  await agree();
  await capture("generated-changed");
  const selectedButton = scene.locator("[role=button]").first();
  const selectedName = (
    await selectedButton.getAttribute("aria-label")
  ).replace(/^Inspect /, "");
  const selectedIndex = scienceObservation(
    oracle.getSnapshot().state[model.id],
  ).objects.findIndex((o) => o.name === selectedName);
  assert.ok(
    selectedIndex >= 0,
    "Selected scene object has a stable model identity",
  );
  await selectedButton.focus();
  await page.keyboard.press("Enter");
  assert.ok(
    oracle.dispatch([
      {
        node: model.id,
        command: scienceCommand(c.kind, "SELECT"),
        arguments: { value: selectedIndex },
      },
    ]).accepted,
  );
  await agree();
  await capture("generated-inspected");
  assert.equal(await page.locator(".recipe-error").count(), 0);
  const geometry = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth - innerWidth,
    scrolling: [...document.querySelectorAll(".recipe-component-item")]
      .filter(
        (e) =>
          ["auto", "scroll"].includes(getComputedStyle(e).overflowY) &&
          e.scrollHeight > e.clientHeight + 2,
      )
      .map((e) => e.getAttribute("data-component-definition")),
  }));
  assert.equal(geometry.overflow, 0);
  assert.deepEqual(geometry.scrolling, []);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.waitForTimeout(150);
  await capture("generated-1280x800");
  await page.setViewportSize({ width: 1440, height: 900 });
};
