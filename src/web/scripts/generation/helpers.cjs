const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { chromium } = require("playwright");
const { load } = require("../test-loader.cjs");
const { parseGenerationResult } = load("src/lib/planner/schema.ts");
const { loadRecipe } = load("src/simulations/runtime/recipes/loadRecipe.ts");
const { validateAuthoredDocument } = load(
  "src/simulations/runtime/authoring/validate.ts",
);
const { AuthoringTransaction } = load(
  "src/simulations/runtime/authoring/transaction.ts",
);
const { finalizeRecipe } = load(
  "src/simulations/runtime/authoring/operations.ts",
);
const { premadeRecipe } = load("src/simulations/runtime/recipes/registry.ts");
const base = process.env.UX_TEST_URL || "http://localhost:43100";
const out = path.resolve(
  process.env.GENERATION_EVIDENCE_DIR || "/tmp/apertus-generation",
);
const snapshot = (page) => page.evaluate(() => window.__experimentSnapshot?.());
async function launch() {
  const override = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
  const installed = fs.existsSync(chromium.executablePath());
  const mac = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
  const executablePath =
    override ||
    (!installed && process.platform === "darwin" && fs.existsSync(mac)
      ? mac
      : undefined);
  return chromium.launch({
    headless: true,
    ...(executablePath ? { executablePath } : {}),
  });
}
async function poll(page, test, message, timeout = 15000) {
  const deadline = Date.now() + timeout;
  let last;
  while (Date.now() < deadline) {
    last = await snapshot(page);
    if (last && test(last)) return last;
    await page.waitForFunction(
      () =>
        new Promise((resolve) => requestAnimationFrame(() => resolve(true))),
    );
  }
  assert.fail(`${message}: ${JSON.stringify(last?.state)}`);
}
function models(recipe, definition) {
  return recipe.document.nodes.filter((n) => n.definition === definition);
}
function nodeByLabel(recipe, definition, alias) {
  const candidates = models(recipe, definition);
  const match = candidates.find(
    (n) => n.label.startsWith(`${alias} · `) || n.label === alias,
  );
  assert.ok(match, `Missing ${alias} ${definition}`);
  return match;
}
function assertCanonicalResult(source, c, request) {
  const result = parseGenerationResult(source, request);
  assert.equal(result.status, "created");
  assert.equal(result.coverage.level, c.coverage);
  assert.equal(result.requestId, request.requestId);
  validateAuthoredDocument(result.recipe.document, true);
  loadRecipe(result.recipe);
  const found = models(result.recipe, c.definition);
  assert.equal(found.length, c.id === "rectangles" ? 2 : 1);
  if (c.id === "arithmetic") {
    assert.deepEqual(found[0].configuration.task, {
      operation: "add",
      a: 7,
      b: 4,
    });
    assert.equal(found[0].configuration.looping, false);
  }
  if (c.id === "rectangles")
    for (const alias of ["A", "B"]) {
      const n = nodeByLabel(result.recipe, c.definition, alias);
      assert.equal(n.configuration.width, c.expected[alias].width);
      assert.equal(n.configuration.height, c.expected[alias].height);
    }
  if (c.id === "bridge") {
    const loadNode = models(result.recipe, "models/BridgeLoad")[0];
    assert.equal(loadNode.configuration.position, 0.5);
    assert.equal(loadNode.configuration.magnitude, 10);
    assert.match(
      result.coverage.explanation,
      /unavailable|not (?:available|supported)/i,
    );
    assert.match(
      result.recipe.document.lesson.explanation,
      /conceptual|heuristic/i,
    );
    assert.ok(
      !result.recipe.document.nodes.some((n) =>
        /deflection|millimet|\bmm\b/i.test(n.label),
      ),
    );
  }
  return result;
}
function layoutFor(document, id) {
  const visit = (l) =>
    l.node === id ? l : l.children.map(visit).find(Boolean);
  return visit(document.layout);
}
function component(page, recipe, node) {
  const layout = layoutFor(recipe.document, node.id);
  assert.ok(layout, `No layout for ${node.id}`);
  const item = recipe.document.presentation.items.find(
    (i) => i.layoutId === layout.id,
  );
  assert.ok(item);
  return page.locator(`[data-board-id=${JSON.stringify(item.id)}]`);
}
function boundControl(recipe, target, field) {
  const links = recipe.document.connections.filter(
    (c) => c.kind === "command" && c.to.node === target.id,
  );
  const control = recipe.document.nodes.find(
    (n) =>
      links.some((c) => c.from.node === n.id) &&
      (n.configuration.parameter === field ||
        links.some((c) => c.from.node === n.id && c.to.port === field)),
  );
  assert.ok(control, `Missing ${target.label} ${field} control`);
  return control;
}
async function exactField(page, recipe, target, field, focus = true) {
  const control = boundControl(recipe, target, field);
  const locator = component(page, recipe, control)
    .locator('input[inputmode="decimal"],input[inputmode="numeric"]')
    .first();
  if (focus) await locator.focus();
  await locator.waitFor({ state: "visible" });
  return locator;
}
async function assertRectangleReadouts(page, s, node, expected) {
  for (const [output, unit] of [
    ["area", "m²"],
    ["perimeter", "m"],
  ]) {
    const links = s.recipe.document.connections.filter(
      (c) => c.from.node === node.id && c.from.port === output,
    );
    assert.equal(
      links.length,
      1,
      `One independently bound ${output} observation`,
    );
    const observation = s.recipe.document.nodes.find(
      (n) => n.id === links[0].to.node,
    );
    assert.equal(observation.definition, "displays/Readout");
    const value = component(page, s.recipe, observation).locator(
      ".recipe-measurement-value",
    );
    assert.equal(Number.parseFloat(await value.innerText()), expected[output]);
    assert.equal(await value.locator("small").innerText(), unit);
  }
}
async function assertOpeningState(page, result, c, correlate = true) {
  const s = await poll(
    page,
    (s) => !!s.recipe && (!correlate || s.requestId === result.requestId),
    "Accepted request did not activate",
  );
  const nodes = models(s.recipe, c.definition);
  assert.equal(await page.locator(".recipe-lesson").count(), 1);
  assert.equal(
    await page
      .locator(".builder-shell,.composition-graph,.builder-workspace")
      .count(),
    0,
  );
  assert.ok(!new URL(page.url()).pathname.includes("/builder"));
  assert.equal(
    await page
      .getByRole("button", {
        name: /approve (?:preview|lesson)|apply generated/i,
      })
      .count(),
    0,
  );
  if (c.id === "arithmetic") {
    const state = s.state.state[nodes[0].id];
    assert.equal(state.a, 7);
    assert.equal(state.b, 4);
    assert.equal(state.sequence.cursor, 0);
    assert.equal(state.sequence.playing, false);
    assert.equal(await page.locator(".math-equation").innerText(), "7 + 4 = ?");
    await page.getByRole("button", { name: /^Add \d+ circles?$/ }).waitFor();
    assert.equal(
      await page
        .getByRole("textbox", { name: "First number", exact: true })
        .inputValue(),
      "7",
    );
    await page.waitForFunction((id) => {
      const end = performance.now() + 500;
      return new Promise((resolve, reject) => {
        const check = () => {
          const state = window.__experimentSnapshot?.().state.state[id];
          if (state.sequence.cursor !== 0)
            return reject(Error("Activity advanced before learner action"));
          if (performance.now() >= end) return resolve(true);
          requestAnimationFrame(check);
        };
        check();
      });
    }, nodes[0].id);
  }
  if (c.id === "rectangles")
    for (const alias of ["A", "B"]) {
      const n = nodeByLabel(s.recipe, c.definition, alias);
      assert.deepEqual(s.state.outputs[n.id], {
        area: c.expected[alias].area,
        perimeter: c.expected[alias].perimeter,
      });
      assert.equal(s.state.state[n.id].width, c.expected[alias].width);
      assert.equal(s.state.state[n.id].height, c.expected[alias].height);
      await assertRectangleReadouts(page, s, n, c.expected[alias]);
      const width = await exactField(page, s.recipe, n, "value.width", false);
      assert.equal(await width.inputValue(), String(c.expected[alias].width));
    }
  if (c.id === "bridge") {
    const n = nodes[0],
      loadNode = models(s.recipe, "models/BridgeLoad")[0];
    assert.deepEqual(s.state.outputs[n.id].response.supportShares, [5, 5]);
    assert.equal(s.state.state[loadNode.id].magnitude, 10);
    assert.equal(s.state.state[loadNode.id].position, 0.5);
    assert.match(await page.locator(".bridge-demo").innerText(), /10\s*t/);
    assert.match(
      await page.locator(".recipe-lesson > header").innerText(),
      /deflection|millimet|unavailable/i,
    );
    assert.match(
      await page.locator(".bridge-member-hint").innerText(),
      /select|choose|click|tap|beam/i,
    );
  }
  const scenes = await page
    .locator('[data-board-scene="true"] svg[viewBox]')
    .evaluateAll((es) => es.map((e) => e.getBoundingClientRect().toJSON()));
  assert.ok(scenes.length);
  for (const rect of scenes)
    assert.ok(
      rect.width > 180 && rect.height > 100,
      `Collapsed scene ${JSON.stringify(rect)}`,
    );
  return s;
}
async function settleLayout(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise((resolve) => {
      let previous = "",
        stable = 0,
        frames = 0;
      const check = () => {
        const signature = JSON.stringify(
          [
            ...document.querySelectorAll(
              ".board-item,.recipe-lesson > header,.workspace-composer",
            ),
          ].map((e) => e.getBoundingClientRect().toJSON()),
        );
        stable = signature === previous ? stable + 1 : 0;
        previous = signature;
        if (stable >= 3 || ++frames >= 60) return resolve();
        requestAnimationFrame(check);
      };
      requestAnimationFrame(check);
    });
  });
}
async function capture(page, dir, name) {
  await settleLayout(page);
  fs.mkdirSync(dir, { recursive: true });
  await page.screenshot({
    path: path.join(dir, `${name}.png`),
    fullPage: true,
  });
  const current = await snapshot(page);
  if (current)
    fs.writeFileSync(
      path.join(dir, `${name}-runtime.json`),
      JSON.stringify(current, null, 2),
    );
}
async function exerciseAndAssert(page, c, dir) {
  let s = await snapshot(page);
  const recipe = s.recipe;
  const model = models(recipe, c.definition)[0];
  if (c.id === "arithmetic") {
    let animation;
    if (
      await page.evaluate(
        () => !matchMedia("(prefers-reduced-motion: reduce)").matches,
      )
    ) {
      animation = page.evaluate(async (id) => {
        const read = () => window.__experimentSnapshot().state.state[id];
        const identities = JSON.stringify(read().tokens.map((t) => t.id));
        const circles = [
          ...document.querySelectorAll(".arithmetic-scene .math-token"),
        ];
        const cursors = [0];
        const deadline = performance.now() + 15000;
        while (performance.now() < deadline) {
          const state = read();
          if (JSON.stringify(state.tokens.map((t) => t.id)) !== identities)
            throw Error("Token identities changed during addition");
          if (circles.some((e) => !e.isConnected))
            throw Error("Circle DOM identity changed during addition");
          const previous = cursors.at(-1);
          if (state.sequence.cursor > previous + 1)
            throw Error("Normal motion skipped an addition step");
          if (state.sequence.cursor !== previous)
            cursors.push(state.sequence.cursor);
          if (state.sequence.cursor === 4)
            return {
              cursors,
              identities: JSON.parse(identities),
              stableDOMCircles: circles.length,
            };
          await new Promise(requestAnimationFrame);
        }
        throw Error("Normal motion did not complete");
      }, model.id);
      animation.catch(() => {});
    }
    await page.getByRole("button", { name: /^Add \d+ circles?$/ }).focus();
    await page.getByRole("button", { name: /^Add \d+ circles?$/ }).click();
    await poll(
      page,
      (s) =>
        s.state.state[model.id].result === 11 &&
        s.state.state[model.id].sequence.cursor === 4,
      "Addition did not complete",
    );
    assert.equal(
      await page.locator(".math-equation").innerText(),
      "7 + 4 = 11",
    );
    if (animation)
      fs.writeFileSync(
        path.join(dir, "arithmetic-motion.json"),
        JSON.stringify(await animation, null, 2),
      );
    await capture(page, dir, "completed");
    const first = page.getByRole("textbox", {
      name: "First number",
      exact: true,
    });
    await first.focus();
    await first.fill("8");
    await poll(
      page,
      (s) => s.state.state[model.id].a === 8 && s.state.state[model.id].b === 4,
      "Operand sibling changed",
    );
    await first.fill("-");
    assert.equal((await snapshot(page)).state.state[model.id].a, 8);
    await capture(page, dir, "invalid");
    await first.fill("8");
    await first.press("Tab");
    const add = page.getByRole("button", { name: /^Add \d+ circles?$/ });
    await add.focus();
    await add.press("Enter");
    await poll(
      page,
      (s) =>
        s.state.state[model.id].result === 12 &&
        s.state.state[model.id].sequence.cursor === 4 &&
        !s.state.state[model.id].sequence.playing,
      "Keyboard addition failed",
    );
    assert.equal(
      await page.locator(".math-equation").innerText(),
      "8 + 4 = 12",
    );
  } else if (c.id === "rectangles") {
    const A = nodeByLabel(recipe, c.definition, "A"),
      B = nodeByLabel(recipe, c.definition, "B");
    const width = await exactField(page, recipe, A, "value.width");
    await width.fill("7");
    await poll(
      page,
      (s) =>
        s.state.outputs[A.id].area === 28 &&
        s.state.outputs[A.id].perimeter === 22 &&
        s.state.outputs[B.id].area === 16,
      "A edit changed its sibling or peer",
    );
    const height = await exactField(page, recipe, B, "value.height");
    await height.fill("3");
    await poll(
      page,
      (s) =>
        s.state.outputs[B.id].area === 24 &&
        s.state.state[B.id].width === 8 &&
        s.state.outputs[A.id].area === 28,
      "B height edit failed",
    );
    s = await snapshot(page);
    assert.equal(s.state.state[A.id].height, 4);
    assert.deepEqual(s.state.outputs[A.id], { area: 28, perimeter: 22 });
    assert.deepEqual(s.state.outputs[B.id], { area: 24, perimeter: 22 });
    await assertRectangleReadouts(page, s, A, { area: 28, perimeter: 22 });
    await assertRectangleReadouts(page, s, B, { area: 24, perimeter: 22 });
    await width.focus();
    await width.fill("-");
    await capture(page, dir, "invalid");
    s = await snapshot(page);
    assert.equal(s.state.state[A.id].width, 7);
    assert.equal(s.state.outputs[B.id].area, 24);
    await width.fill("7");
    await width.press("Tab");
  } else {
    const loadNode = models(recipe, "models/BridgeLoad")[0];
    const initialResponses = structuredClone(
      s.state.outputs[model.id].response.responses,
    );
    const initialTruck = await page
      .locator(".bridge-demo text")
      .filter({ hasText: /^10 t$/ })
      .evaluate((e) => e.getCTM().e);
    const field = await exactField(page, recipe, loadNode, "MOVE_LOAD");
    await field.fill("0.25");
    await poll(
      page,
      (s) =>
        s.state.state[loadNode.id].position === 0.25 &&
        s.state.state[loadNode.id].magnitude === 10 &&
        s.state.outputs[model.id].response.supportShares[0] === 7.5 &&
        s.state.outputs[model.id].response.supportShares[1] === 2.5,
      "Load control or support shares disagree",
    );
    assert.notDeepEqual(
      (await snapshot(page)).state.outputs[model.id].response.responses,
      initialResponses,
    );
    await page.waitForFunction((x) => {
      const label = [...document.querySelectorAll(".bridge-demo text")].find(
        (e) => e.textContent.trim() === "10 t",
      );
      return label && label.getCTM().e < x - 5;
    }, initialTruck);
    const viewport = page.viewportSize();
    if (viewport.width >= 700 && viewport.height < 700) {
      await page.locator('summary[aria-label="Board navigation help"]').click();
      await page.getByRole("button", { name: "Starting view" }).click();
      await settleLayout(page);
    }
    const beams = page.locator(
      '.bridge-member[role="button"], [role="button"][aria-label^="Beam"], [role="button"][aria-label^="Inspect"]',
    );
    assert.ok(await beams.count(), "No accessible beam");
    const pointerTarget = await beams.evaluateAll((elements) => {
      for (let index = elements.length - 1; index >= 0; index--) {
        const element = elements[index];
        const line =
          element.querySelector("line:not([stroke='transparent'])") ||
          element.querySelector("line");
        if (!(line instanceof SVGGeometryElement)) continue;
        const matrix = line.getScreenCTM();
        if (!matrix) continue;
        for (const fraction of [0.5, 0.35, 0.65, 0.2, 0.8]) {
          const point = line
            .getPointAtLength(line.getTotalLength() * fraction)
            .matrixTransform(matrix);
          if (
            document
              .elementFromPoint(point.x, point.y)
              ?.closest('[role="button"]') === element
          )
            return { index, x: point.x, y: point.y };
        }
      }
      return null;
    });
    assert.ok(
      pointerTarget,
      "No unobstructed pointer target on the first beam",
    );
    const pointerBeam = beams.nth(pointerTarget.index);
    await pointerBeam.focus();
    if (page.viewportSize().width < 700) {
      const bounds = await pointerBeam.boundingBox();
      assert.ok(bounds, "Pointer beam has no touch bounds");
      await pointerBeam.tap({
        position: {
          x: pointerTarget.x - bounds.x,
          y: pointerTarget.y - bounds.y,
        },
      });
    } else await page.mouse.click(pointerTarget.x, pointerTarget.y);
    await poll(
      page,
      (s) => !!s.state.state[model.id].selectedMember,
      "Pointer beam inspection failed",
    );
    const beam = beams.nth(1);
    await beam.focus();
    await beam.press("Enter");
    await poll(
      page,
      (s) => !!s.state.state[model.id].selectedMember,
      "Keyboard beam inspection failed",
    );
    const selected = (await snapshot(page)).state.state[model.id]
      .selectedMember;
    const humanName = selected
      .split("/")
      .at(-1)
      .replace(/([a-z])([0-9])/gi, "$1 $2");
    assert.equal(
      await beam.getAttribute("aria-label"),
      `Inspect member ${humanName}`,
    );
    assert.equal(
      (
        await page.locator(".bridge-demo__inspector b").innerText()
      ).toLowerCase(),
      humanName.toLowerCase(),
    );
    assert.deepEqual(
      recipe.document,
      (await snapshot(page)).recipe.document,
      "Beam inspection preserves authored controls and layout",
    );
    assert.match(
      await page.locator(".bridge-demo__inspector").innerText(),
      /tension|compression|low|medium|high|conceptual/i,
    );
    assert.ok(selected);
    await capture(page, dir, "selected");
    await field.focus();
    await field.fill("-");
    assert.equal(
      (await snapshot(page)).state.state[loadNode.id].position,
      0.25,
    );
    await capture(page, dir, "invalid");
    await field.fill("0.25");
    await field.press("Tab");
  }
  await capture(page, dir, "changed");
  await page.getByText("Experiment options", { exact: true }).click();
  const reset = page.getByRole("button", {
    name: "Reset lesson",
    exact: true,
  });
  await reset.focus();
  await reset.click();
  await poll(
    page,
    (s) =>
      c.id === "arithmetic"
        ? s.state.state[model.id].a === 7 &&
          s.state.state[model.id].b === 4 &&
          s.state.state[model.id].sequence.cursor === 0
        : c.id === "rectangles"
          ? models(s.recipe, c.definition).every(
              (n) =>
                s.state.state[n.id].width === n.configuration.width &&
                s.state.state[n.id].height === n.configuration.height,
            )
          : s.state.state[models(recipe, "models/BridgeLoad")[0].id]
              .position === 0.5,
    "Reset did not restore authored state",
  );
  await capture(page, dir, "reset");
  await page.getByText("Experiment options", { exact: true }).click();
}
async function geometry(
  page,
  strict = true,
  sceneMinimum = { width: 180, height: 100 },
) {
  await settleLayout(page);
  const data = await page.evaluate(() => {
    const rect = (e) => e.getBoundingClientRect().toJSON();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      pageOverflow: document.documentElement.scrollWidth > innerWidth + 2,
      nativeNumbers: document.querySelectorAll(
        '.board-item input[type="number"]',
      ).length,
      cards: [...document.querySelectorAll(".board-content")].map((e) => ({
        id: e.closest(".board-item")?.getAttribute("data-board-id"),
        rect: rect(e),
        width: e.clientWidth,
        height: e.clientHeight,
        scrollWidth: e.scrollWidth,
        scrollHeight: e.scrollHeight,
      })),
      inputs: [
        ...document.querySelectorAll(".board-item input[inputmode]"),
      ].map((e) => ({
        rect: rect(e),
        fontSize: parseFloat(getComputedStyle(e).fontSize),
        minimumFontSize: e.closest(".task-control") ? 20 : 24,
        occluded: (() => {
          const r = e.getBoundingClientRect();
          const board = e.closest(".board-viewport");
          const clipping =
            board &&
            getComputedStyle(board).clipPath.match(
              /^inset\((\d+(?:\.\d+)?)px 0px (\d+(?:\.\d+)?)px(?: 0px)?\)$/,
            );
          const boardBounds = board?.getBoundingClientRect();
          if (
            clipping &&
            (r.top < boardBounds.top + Number(clipping[1]) ||
              r.bottom > boardBounds.bottom - Number(clipping[2]))
          )
            return null;
          if (
            r.x < 0 ||
            r.y < 0 ||
            r.right > innerWidth ||
            r.bottom > innerHeight
          )
            return null;
          const hit = document.elementFromPoint(
            r.x + r.width / 2,
            r.y + r.height / 2,
          );
          return !(hit === e || e.contains(hit));
        })(),
      })),
      scenes: [
        ...document.querySelectorAll('[data-board-scene="true"] svg[viewBox]'),
      ].map((element) => {
        const bounds = element.getBoundingClientRect();
        const chrome = [
          document.querySelector(".recipe-lesson > header"),
          document.querySelector(".workspace-composer"),
        ]
          .filter(Boolean)
          .map((item) => item.getBoundingClientRect());
        return {
          ...rect(element),
          chromeOccluded: chrome.some(
            (item) =>
              bounds.left < item.right &&
              bounds.right > item.left &&
              bounds.top < item.bottom &&
              bounds.bottom > item.top,
          ),
        };
      }),
    };
  });
  assert.equal(data.nativeNumbers, 0);
  assert.equal(data.pageOverflow, false);
  assert.deepEqual(
    data.cards.filter(
      (c) => c.scrollWidth > c.width + 2 || c.scrollHeight > c.height + 2,
    ),
    [],
    "Card content scrolls or clips",
  );
  if (strict)
    for (const input of data.inputs) {
      assert.ok(
        input.rect.height >= 43,
        `Exact field downscaled: ${JSON.stringify(input)}`,
      );
      assert.ok(input.fontSize >= input.minimumFontSize);
      if (input.occluded !== null)
        assert.equal(
          input.occluded,
          false,
          "Primary field is covered by chrome",
        );
    }
  for (const scene of data.scenes) {
    assert.ok(
      scene.width > sceneMinimum.width && scene.height > sceneMinimum.height,
      "Scene collapsed",
    );
    if (strict)
      assert.equal(
        scene.chromeOccluded,
        false,
        "Scene is covered by shell chrome",
      );
  }
  return data;
}
function recordPage(page, record) {
  record.navigation = [];
  record.browserErrors = [];
  record.consoleErrors = [];
  record.networkFailures = [];
  page.on("framenavigated", (f) => {
    if (f === page.mainFrame()) record.navigation.push(f.url());
  });
  page.on("pageerror", (e) => record.browserErrors.push(String(e.stack || e)));
  page.on("console", (m) => {
    if (m.type() === "error") record.consoleErrors.push(m.text());
  });
  page.on("requestfailed", (r) =>
    record.networkFailures.push({
      url: r.url(),
      reason: r.failure()?.errorText,
    }),
  );
}
async function saveEvidence(page, record, dir) {
  fs.mkdirSync(dir, { recursive: true });
  const s = await snapshot(page).catch(() => null);
  fs.writeFileSync(
    path.join(dir, "record.json"),
    JSON.stringify(record, null, 2),
  );
  if (s) {
    fs.writeFileSync(
      path.join(dir, "recipe.json"),
      JSON.stringify(s.recipe, null, 2),
    );
    fs.writeFileSync(
      path.join(dir, "runtime.json"),
      JSON.stringify(s, null, 2),
    );
  }
  fs.writeFileSync(path.join(dir, "dom.html"), await page.content());
  fs.writeFileSync(
    path.join(dir, "geometry.json"),
    JSON.stringify(
      await geometry(page, false).catch((e) => ({ error: String(e) })),
      null,
      2,
    ),
  );
  if (record.requestId) {
    const url = new URL("/api/planner-diagnostics", base);
    url.searchParams.set("id", record.requestId);
    const response = await page.request.get(url.href);
    const trace = await response.json().catch(() => null);
    fs.writeFileSync(
      path.join(dir, "planner-trace.json"),
      JSON.stringify(
        {
          status: response.status(),
          trace,
        },
        null,
        2,
      ),
    );
    return { status: response.status(), trace };
  }
}
async function exportRecipe(page, dir) {
  await page.getByText("Experiment options", { exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Save recipe", exact: true }).click();
  const download = await pending;
  const file = path.join(dir, "exported-recipe.json");
  await download.saveAs(file);
  const recipe = loadRecipe(JSON.parse(fs.readFileSync(file))).recipe;
  assert.deepEqual(recipe, (await snapshot(page)).recipe);
  await capture(page, dir, "options");
  await page.keyboard.press("Escape");
  return recipe;
}
function fixtureResult(c, request) {
  const slug = c.id === "rectangles" ? "area-perimeter" : c.id;
  const draft = new AuthoringTransaction(request.requestId);
  const lesson = structuredClone(premadeRecipe(slug).document.lesson);
  const coverage = {
    level: c.coverage,
    covered: [
      c.id === "rectangles"
        ? "area"
        : c.id === "bridge"
          ? "truss bridge"
          : "addition",
    ],
    omitted: c.coverage === "partial" ? ["Exact engineering deflection"] : [],
    explanation:
      c.coverage === "partial"
        ? "Exact engineering deflection in millimetres is unavailable. The response is conceptual/heuristic."
        : "",
  };
  if (coverage.explanation) {
    lesson.instruction += ` ${coverage.explanation}`;
    lesson.explanation += ` ${coverage.explanation}`;
  }
  const receipt = draft.execute({
    draftId: request.requestId,
    expectedRevision: 0,
    operationId: "fixture",
    request: [
      ...c.overrides.map((i) => ({
        tool: "insert_recipe",
        arguments: { recipe: slug, version: 1, ...i },
      })),
      { tool: "set_lesson", arguments: lesson },
      {
        tool: "arrange",
        arguments: {
          template: c.id === "rectangles" ? "comparison" : "scene-with-sidebar",
          main: [],
          controls: [],
          results: [],
          narrowOrder: [],
          preserveLocked: true,
        },
      },
    ],
  });
  assert.equal(receipt.status, "applied");
  return {
    protocolVersion: 1,
    status: "created",
    requestId: request.requestId,
    expectedSessionId: null,
    expectedAuthoredRevision: null,
    recipe: finalizeRecipe(draft.document, { id: `fixture/${c.id}` }),
    coverage,
  };
}
module.exports = {
  base,
  out,
  launch,
  poll,
  snapshot,
  models,
  nodeByLabel,
  component,
  exactField,
  assertCanonicalResult,
  assertOpeningState,
  exerciseAndAssert,
  geometry,
  recordPage,
  saveEvidence,
  exportRecipe,
  capture,
  fixtureResult,
};
