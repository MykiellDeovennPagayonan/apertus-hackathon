const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const output = "/tmp/apertus-graph-browser";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    args: [
      "--use-gl=angle",
      "--use-angle=swiftshader",
      "--enable-unsafe-swiftshader",
    ],
  });
  try {
    const context = await browser.newContext({
      viewport: { width: 1440, height: 1000 },
    });
    const page = await context.newPage();
    page.setDefaultTimeout(15000);
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    const button = (name) => page.getByRole("button", { name, exact: true });
    const library = page.getByRole("dialog", { name: "Add a component" });
    const settings = page.locator("dialog.component-dialog");
    const graph = page.getByRole("region", { name: "Block workspace" });
    const draft = () =>
      page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).document,
      );
    const stable = async () => {
      await page.waitForFunction(() =>
        localStorage.getItem("apertus-builder-draft-v1"),
      );
    };
    const node = (id) => page.locator(`[data-node-id="${id}"]`);
    const create = async (town) => {
      await button(town ? "3D" : "2D").click();
      await button("Continue to layout →").click();
      await button("Continue to canvas →").click();
      if (!town)
        await page.getByRole("button", { name: /Cartesian plane/ }).click();
      await button("Open empty builder").click();
      await graph.waitFor();
      await stable();
      assert.equal(
        await button("Connections").getAttribute("aria-pressed"),
        "true",
      );
    };
    const add = async (kind) => {
      await button("+ Add component").click();
      await library
        .getByRole("button", { name: new RegExp("^\\+ " + kind) })
        .click();
      await page.waitForTimeout(100);
      assert.equal(await library.isVisible(), false);
      assert.equal(await settings.isVisible(), false);
      return draft();
    };
    const fit = () => button("Fit to content").click();
    const connect = async (from, port, to, input, drag = false) => {
      await fit();
      const source = node(from).locator(
          `[data-port-side="output"][data-port-id="${port}"]`,
        ),
        target = node(to).locator(
          `[data-port-side="input"][data-port-id="${input}"]`,
        );
      if (drag) {
        const a = await source.boundingBox(),
          b = await target.boundingBox();
        await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
        await page.mouse.down();
        await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, {
          steps: 12,
        });
        await page.mouse.up();
      } else {
        await source.click();
        await target.click();
      }
      await page.waitForTimeout(100);
    };
    const select = async (id) => {
      await fit();
      await node(id).locator(".connection-node-heading").dblclick();
      await settings.waitFor();
    };
    const done = () =>
      settings.getByRole("button", { name: "Close settings", exact: true }).click();
    const noOverflow = async () =>
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "no horizontal page overflow",
      );
    const lesson = async (title) => {
      await page.locator(".composition-view-menu > summary").click();
      await button("Title and layout").click();
      await settings.getByLabel("Title", { exact: true }).fill(title);
      await settings
        .getByLabel("Short instruction", { exact: true })
        .fill("Change the pieces and compare their calculated results.");
      await done();
      await page.locator(".composition-view-menu > summary").click();
    };
    await page.goto(
      (process.env.BUILDER_BASE_URL || "http://127.0.0.1:3000") +
        "/experiments/builder",
    );
    await create(false);
    assert.equal((await draft()).scene.workspace.canvases.length, 0);
    assert.equal(await graph.locator(".connection-node").count(), 0);
    await page.screenshot({ path: `${output}/empty-graph.png` });
    let doc = await add("Cartesian plane");
    const a = doc.scene.workspace.canvases[0].id;
    doc = await add("Cartesian plane");
    const b = doc.scene.workspace.canvases[1].id;
    doc = await add("Line");
    const line = doc.scene.objects[0].id;
    doc = await add("Line");
    const line2 = doc.scene.objects[1].id;
    doc = await add("Square");
    const square = doc.scene.objects[2].id;
    assert.equal(Object.keys(doc.scene.workspace.placements).length, 0);
    await connect(line, "geometry", a, "objects", true);
    assert.equal(
      (await draft()).scene.workspace.placements[line],
      a,
      "dragging a wire binds geometry",
    );
    await connect(line2, "geometry", a, "objects");
    await connect(square, "geometry", b, "objects");
    await select(line);
    assert.equal(
      await settings.locator(".component-visual-editor svg").count(),
      1,
      "connected canvas inside settings popup",
    );
    await settings.getByLabel("Slope", { exact: true }).fill("2");
    await settings.getByLabel("Y intercept", { exact: true }).fill("1");
    await page.screenshot({ path: `${output}/line-settings.png` });
    const point = settings.locator(".composition-handle").first();
    const box = await point.boundingBox();
    const before = (await draft()).scene.objects[0];
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    await page.mouse.move(
      box.x + box.width / 2 + 25,
      box.y + box.height / 2 - 18,
      { steps: 8 },
    );
    await page.mouse.up();
    await page.waitForTimeout(100);
    assert.notDeepEqual(
      (await draft()).scene.objects[0].a,
      before.a,
      "modal handle dragging edits starting geometry",
    );
    await done();
    await button("Undo").click();
    assert.deepEqual(
      (await draft()).scene.objects[0].a,
      before.a,
      "one undo restores the whole drag",
    );
    await select(square);
    await settings.getByLabel("Side length", { exact: true }).fill("4");
    await settings.getByLabel("Filled square").check();
    await done();
    doc = await add("Slider");
    const slider = doc.scene.controls.at(-1).id;
    await connect(slider, "value", line, "property:slope", true);
    doc = await add("Readout");
    const area = doc.scene.measurements.at(-1).id;
    await connect(square, "output:area", area, "data");
    await select(area);
    await settings.getByLabel("Label", { exact: true }).fill("Square area");
    await done();
    doc = await add("Intersection");
    const intersection = doc.scene.measurements.at(-1).id;
    await connect(line, "line", intersection, "first");
    await connect(line2, "line", intersection, "second");
    await button("Arrange").click();
    await page.waitForTimeout(100);
    await fit();
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${output}/connections-desktop.png` });

    // Moving a node never opens its dialog and remains undoable.
    await fit();
    const heading = node(a).locator(".connection-node-heading");
    const hb = await heading.boundingBox();
    const previousPosition = (await draft()).editor.positions[a];
    await page.mouse.move(hb.x + 50, hb.y + 30);
    await page.mouse.down();
    await page.mouse.move(hb.x + 95, hb.y + 50, { steps: 10 });
    await page.mouse.up();
    assert.equal(await settings.isVisible(), false);
    assert.notDeepEqual((await draft()).editor.positions[a], previousPosition);
    await button("Undo").click();
    await lesson("Two connected planes");
    await button("Build").click();
    assert.equal(await page.locator(".composition-canvas-panel").count(), 2);
    assert.equal(
      await page.getByLabel("Square area", { exact: true }).textContent(),
      "16",
    );
    const planes = page.locator(".composition-canvas-panel");
    assert.equal(
      await planes.nth(0).locator("svg [aria-label='Select Line 1']").count(),
      1,
    );
    assert.equal(
      await planes.nth(1).locator("svg [aria-label='Select Line 1']").count(),
      0,
    );
    await page.screenshot({ path: `${output}/two-planes-build.png` });
    await noOverflow();
    const savedSlope = (await draft()).scene.objects[0];
    await page.getByLabel("Slider", { exact: true }).fill("3");
    assert.deepEqual(
      (await draft()).scene.objects[0],
      savedSlope,
      "learner interaction does not rewrite authored starts",
    );
    await button("Connections").click();
    await button("Build").click();
    assert.equal(
      await page.getByLabel("Slider", { exact: true }).inputValue(),
      "3",
      "tab switching retains the runtime",
    );
    const shape = planes
      .nth(0)
      .getByRole("button", { name: "Select Line 1", exact: true });
    await shape.focus();
    await page.keyboard.press("Enter");
    assert.equal(
      await settings.isVisible(),
      false,
      "selecting geometry must allow direct manipulation in Build",
    );
    await planes.nth(0).locator(".composition-handle").first().focus();
    await page.keyboard.press("ArrowRight");
    assert.notDeepEqual((await draft()).scene.objects[0].a, savedSlope.a);
    await button("Undo").click();
    await button("Save experiment").click();
    await page.getByText("Saved on device", { exact: true }).waitFor();
    const savedId = await page.evaluate(
      () => JSON.parse(localStorage.getItem("apertus-builder-draft-v1")).saveId,
    );
    const reopened = await context.newPage();
    await reopened.goto(
      (process.env.BUILDER_BASE_URL || "http://127.0.0.1:3000") +
        "/experiments/builder?lesson=" +
        encodeURIComponent(savedId),
    );
    await reopened
      .getByRole("button", { name: "Return to builder", exact: true })
      .waitFor();
    assert.equal(
      await reopened.getByLabel("Square area", { exact: true }).textContent(),
      "16",
    );
    await reopened
      .getByRole("button", { name: "Return to builder", exact: true })
      .click();
    assert.equal(await reopened.locator(".connection-node--view").count(), 2);
    await reopened.close();
    await button("Try lesson ↗").click();
    await button("Return to builder").click();
    await button("Connections").click();
    // Click near a curved wire even when zoomed out, then delete only the connection.
    await fit();
    const wirePath = graph.getByRole("button", {
      name: /Square 1 → Cartesian plane 2: Display/,
    });
    const clickWire = async (wire) => {
      const point = await wire.evaluate((el) => {
        const length = el.getTotalLength();
        const matrix = el.getScreenCTM();
        for (const fraction of [0.5, 0.4, 0.6, 0.3, 0.7]) {
          const p = el
            .getPointAtLength(length * fraction)
            .matrixTransform(matrix);
          const next = el
            .getPointAtLength(length * fraction + 1)
            .matrixTransform(matrix);
          const distance = Math.hypot(next.x - p.x, next.y - p.y);
          const x = p.x - (6 * (next.y - p.y)) / distance;
          const y = p.y + (6 * (next.x - p.x)) / distance;
          if (document.elementFromPoint(x, y) === el) return { x, y };
        }
        return null;
      });
      assert.ok(
        point,
        "wire has a usable hit area six screen pixels off its curve",
      );
      await page.mouse.click(point.x, point.y);
      assert.equal(await wire.getAttribute("aria-pressed"), "true");
      assert.equal(
        await wire.evaluate((el) => getComputedStyle(el).outlineStyle),
        "none",
        "selected wire has no blue focus rectangle",
      );
      assert.equal(
        await wire.evaluate((el) => getComputedStyle(el).stroke),
        "rgba(0, 0, 0, 0)",
        "selection has no wide highlight halo",
      );
      assert.equal(
        await graph.locator(".connection-node.is-selected").count(),
        0,
      );
    };
    const beforeDelete = await draft();
    await node(square).locator(".connection-node-heading").click();
    await clickWire(wirePath);
    await page.screenshot({ path: `${output}/selected-connection.png` });
    await page.keyboard.press("Delete");
    assert.equal((await draft()).scene.workspace.placements[square], undefined);
    assert.deepEqual(
      (await draft()).scene.objects,
      beforeDelete.scene.objects,
      "wire deletion keeps components",
    );
    assert.equal(await wirePath.count(), 0);
    await button("Undo").click();
    assert.equal((await draft()).scene.workspace.placements[square], b);
    await button("Redo").click();
    assert.equal((await draft()).scene.workspace.placements[square], undefined);
    await button("Undo").click();
    await wirePath.focus();
    assert.equal(
      await wirePath.evaluate((el) => getComputedStyle(el).outlineStyle),
      "none",
    );
    await page.keyboard.press("Backspace");
    assert.equal((await draft()).scene.workspace.placements[square], undefined);
    await button("Undo").click();
    await clickWire(wirePath);
    await page.keyboard.press("Escape");
    await page.keyboard.press("Delete");
    assert.equal(
      (await draft()).scene.workspace.placements[square],
      b,
      "Escape cancels wire selection",
    );
    await clickWire(wirePath);
    await button("Delete connection").click();
    assert.equal((await draft()).scene.workspace.placements[square], undefined);
    await button("Undo").click();
    // The same deletion gesture detaches a readout rather than deleting its card.
    const areaWire = graph.getByRole("button", {
      name: /Square 1 → Square area: area/,
    });
    await areaWire.focus();
    await page.keyboard.press("Delete");
    const detached = (await draft()).scene.measurements.find(
      (m) => m.id === area,
    );
    assert.equal(detached.target, "");
    await button("Undo").click();
    assert.equal(
      (await draft()).scene.measurements.find((m) => m.id === area).target,
      square,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await fit();
    await noOverflow();
    await select(line);
    await settings.getByLabel("Slope", { exact: true }).fill("1.5");
    await page.screenshot({ path: `${output}/line-settings-mobile.png` });
    await page.keyboard.press("Escape");
    assert.equal(await settings.isVisible(), false);
    await noOverflow();
    await page.screenshot({ path: `${output}/connections-mobile.png` });
    // Saved document reopening migrates/loads without losing identities or graph positions.
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.reload();
    await button("Continue draft").click();
    await graph.waitFor();
    assert.equal((await draft()).scene.workspace.canvases.length, 2);
    assert.equal((await draft()).scene.workspace.placements[square], b);
    // Town objects and trips use the same graph, with deterministic departure playback.
    await page.getByLabel("More document actions", { exact: true }).click();
    await button("New experiment").click();
    await create(true);
    doc = await add("3D scene");
    const townCanvas = doc.scene.workspace.canvases[0].id;
    doc = await add("Ground");
    const ground = doc.scene.objects[0].id;
    doc = await add("House");
    const house = doc.scene.objects[1].id;
    doc = await add("Person");
    const person = doc.scene.objects[2].id;
    for (const id of [ground, house, person])
      await connect(id, "geometry", townCanvas, "objects");
    await select(house);
    await settings.getByLabel("X position", { exact: true }).fill("8");
    await done();
    await select(person);
    await settings.getByLabel("Spawn time (hours)", { exact: true }).fill("2");
    await done();
    doc = await add("Scheduled trip");
    const trip = doc.scene.workspace.trips.at(-1).id;
    await connect(person, "person", trip, "person");
    await connect(house, "destination", trip, "destination");
    await select(trip);
    await settings.getByLabel("Departure time", { exact: true }).fill("3");
    await done();
    assert.equal((await draft()).scene.workspace.trips[0].person, person);
    assert.equal((await draft()).scene.workspace.trips[0].target, house);
    await button("Arrange").click();
    await page.waitForTimeout(100);
    await fit();
    await page.waitForTimeout(100);
    await page.screenshot({ path: `${output}/town-connections.png` });
    await lesson("Build a town trip");
    await button("Build").click();
    await page.locator(".composition-town canvas").waitFor();
    await page.screenshot({ path: `${output}/town-build.png` });
    await noOverflow();
    await button("Try lesson ↗").click();
    await button("Return to builder").click();
    // Pre-graph recoverable drafts must migrate through the recovery path too.
    const { load } = require("./test-loader.cjs");
    const docs = load("src/simulations/builder/document.ts");
    const { composeLegacy } = load(
      "src/simulations/builder/document/migrations/composeLegacy.ts",
    );
    const legacy = composeLegacy(docs.createDocument("line"));
    for (const invalid of [false, true]) {
      const recoveryContext = await browser.newContext({
        viewport: { width: 1440, height: 1000 },
      });
      const recoveryPage = await recoveryContext.newPage();
      recoveryPage.on("pageerror", (e) => errors.push(e.message));
      const candidate = structuredClone(legacy);
      if (invalid) candidate.scene.objects[0].a.x = "invalid";
      await recoveryPage.addInitScript(
        ({ candidate, legacy }) =>
          localStorage.setItem(
            "apertus-builder-draft-v1",
            JSON.stringify({
              document: candidate,
              valid: legacy,
              selected: "",
            }),
          ),
        { candidate, legacy },
      );
      await recoveryPage.goto(
        (process.env.BUILDER_BASE_URL || "http://127.0.0.1:3000") +
          "/experiments/builder",
      );
      await recoveryPage
        .getByRole("button", { name: "Continue draft", exact: true })
        .click();
      await recoveryPage
        .getByRole("region", { name: "Block workspace" })
        .waitFor();
      assert.equal(
        await recoveryPage.locator(".connection-node--view").count(),
        1,
      );
      assert.equal(
        await recoveryPage.locator(".connection-node--object").count(),
        1,
      );
      if (invalid)
        assert.ok(
          await recoveryPage.evaluate(() =>
            JSON.parse(
              localStorage.getItem("apertus-builder-draft-v1"),
            ).recovery.includes("invalid"),
          ),
        );
      await recoveryContext.close();
    }
    assert.deepEqual(errors, []);
    console.log(
      "Graph browser: multiple canvases, pointer wires, modal geometry dragging, calculated outputs, node movement, undo, disconnect, recovery, town trips and mobile layout passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
