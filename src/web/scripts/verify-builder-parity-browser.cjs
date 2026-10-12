const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const output = "/tmp/apertus-builder-parity";
fs.mkdirSync(output, { recursive: true });
(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ||
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  });
  try {
    for (const domain of ["gas", "fractions"]) {
      const page = await browser.newPage({
        viewport: { width: 1440, height: 1000 },
      });
      page.setDefaultTimeout(15000);
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      const button = (name) => page.getByRole("button", { name, exact: true });
      const library = page.getByRole("dialog", { name: "Add a component" });
      const settings = page.locator("dialog.component-dialog");
      const node = (id) => page.locator(`[data-node-id="${id}"]`);
      const draft = () =>
        page.evaluate(
          () =>
            JSON.parse(localStorage.getItem("apertus-builder-draft-v1"))
              .document,
        );
      const done = () =>
        settings.getByRole("button", { name: "Close settings", exact: true }).click();
      const select = async (id) => {
        await button("Fit to content").click();
        await node(id).locator(".connection-node-heading").dblclick();
        await settings.waitFor();
      };
      const add = async (name) => {
        await button("+ Add component").click();
        await library
          .getByRole("button", {
            name: new RegExp(`^\\+ ${name}(?:$|\\s)`),
          })
          .click();
        await page.waitForTimeout(80);
        return draft();
      };
      const connect = async (from, port, to, input) => {
        await button("Fit to content").click();
        await node(from)
          .locator(`[data-port-side="output"][data-port-id="${port}"]`)
          .click();
        await node(to)
          .locator(`[data-port-side="input"][data-port-id="${input}"]`)
          .click();
        await page.waitForTimeout(80);
      };
      const rename = async (id, name) => {
        await select(id);
        await settings.getByLabel("Label", { exact: true }).fill(name);
        await done();
      };
      await page.goto(
        (process.env.BUILDER_BASE_URL || "http://127.0.0.1:3000") +
          "/experiments/builder",
      );
      await button("2D").click();
      await button("Continue to layout →").click();
      await button("Continue to canvas →").click();
      await page
        .getByRole("button", {
          name: new RegExp(
            domain === "gas" ? "2D physical canvas" : "2D diagram",
          ),
        })
        .click();
      await button("Open empty builder").click();
      let doc = await add(domain === "gas" ? "Number input" : "Action button");
      const controlId = doc.scene.controls[0].id;
      assert.equal(doc.scene.objects.length, 0);
      assert.equal(doc.scene.controls[0].target, "");
      await button("Save draft").click();
      await page.getByText("Saved on device", { exact: true }).waitFor();
      await page.reload();
      await button("Continue draft").click();
      assert.equal((await draft()).scene.controls[0].id, controlId);
      doc = await add(domain === "gas" ? "Physical canvas" : "Diagram canvas");
      const canvas = doc.scene.workspace.canvases[0].id;
      const ids = [];
      for (let i = 0; i < (domain === "gas" ? 2 : 3); i++) {
        doc = await add(domain === "gas" ? "Gas container" : "Fraction bar");
        const id = doc.scene.objects.at(-1).id;
        ids.push(id);
        await connect(id, "geometry", canvas, "objects");
      }
      await connect(
        controlId,
        "value",
        ids[0],
        domain === "gas" ? "property:volume" : "action:subdivide",
      );
      await rename(controlId, domain === "gas" ? "A volume" : "Split A");
      const readouts = [];
      if (domain === "gas") {
        for (let i = 0; i < 2; i++) {
          doc = await add("Readout");
          const id = doc.scene.measurements.at(-1).id;
          readouts.push(id);
          await connect(ids[i], "output:pressureKPa", id, "data");
          await rename(id, `Pressure ${i === 0 ? "A" : "B"}`);
        }
      } else {
        await select(ids[1]);
        await settings.getByLabel("Partition count", { exact: true }).fill("4");
        await settings.getByLabel("Piece 2", { exact: true }).check();
        await done();
        await select(ids[2]);
        await settings.getByLabel("Partition count", { exact: true }).fill("3");
        await done();
        for (let i = 1; i < 3; i++) {
          doc = await add("Comparison");
          const id = doc.scene.measurements.at(-1).id;
          readouts.push(id);
          await connect(ids[0], "fraction-bar", id, "first");
          await connect(ids[i], "fraction-bar", id, "second");
          await rename(id, `Comparison A${i === 1 ? "B" : "C"}`);
        }
      }
      if (domain === "gas") {
        const next = await add("Physical canvas");
        await connect(
          ids[1],
          "geometry",
          next.scene.workspace.canvases[1].id,
          "objects",
        );
        doc = await add("Number input");
        const temperature = doc.scene.controls.at(-1).id;
        await connect(temperature, "value", ids[1], "property:temperature");
        await rename(temperature, "B temperature");
      }
      await page.locator(".composition-view-menu > summary").click();
      await button("Title and layout").click();
      await settings
        .getByLabel("Title", { exact: true })
        .fill(`${domain} composition parity`);
      await settings
        .getByLabel("Short instruction", { exact: true })
        .fill("Change independent objects and observe the results.");
      await done();
      await page.locator(".composition-view-menu > summary").click();
      await button("Build").click();
      const panel = page
        .locator(".composition-learner-panel")
        .filter({ visible: true });
      if (domain === "gas") {
        const readA = panel.getByLabel("Pressure A", { exact: true }),
          readB = panel.getByLabel("Pressure B", { exact: true });
        const initialA = await readA.textContent(),
          initialB = await readB.textContent();
        await panel.getByLabel("A volume", { exact: true }).fill("0.5");
        assert.notEqual(await readA.textContent(), initialA);
        assert.equal(await readB.textContent(), initialB);
        const changedA = await readA.textContent();
        await panel.getByLabel("B temperature", { exact: true }).fill("400");
        assert.notEqual(await readB.textContent(), initialB);
        assert.equal(await readA.textContent(), changedA);
        const changedB = await readB.textContent();
        await panel
          .getByRole("button", { name: "Reset experiment" })
          .first()
          .click();
        assert.equal(await readA.textContent(), initialA);
        assert.equal(
          await readB.textContent(),
          changedB,
          "reset stays on canvas A",
        );
        await panel
          .getByRole("button", { name: "Reset experiment" })
          .nth(1)
          .click();
        assert.equal(await readB.textContent(), initialB);
        await panel.getByLabel("A volume", { exact: true }).fill("0.8");
        await panel
          .getByRole("button", {
            name: "Use current settings as starting values",
          })
          .first()
          .click();
        await page.waitForTimeout(100);
        assert.equal((await draft()).scene.objects[0].inputs.volume, 0.8);
        const moveHandle = page.getByRole("button", {
          name: "Move Gas container 1",
          exact: true,
        });
        await moveHandle.focus();
        await page.keyboard.press("ArrowRight");
        await page.waitForTimeout(100);
        const moved = (await draft()).scene.objects[0];
        assert.equal(moved.display.x, 11);
        assert.equal(moved.inputs.volume, 0.8);
        await panel.getByLabel("A volume", { exact: true }).fill("0.6");
        const beforeDrag = await readA.textContent();
        const moveBox = await moveHandle.boundingBox();
        await page.mouse.move(
          moveBox.x + moveBox.width / 2,
          moveBox.y + moveBox.height / 2,
        );
        await page.mouse.down();
        await page.mouse.move(
          moveBox.x + moveBox.width / 2 + 30,
          moveBox.y + moveBox.height / 2 + 15,
          { steps: 5 },
        );
        await page.mouse.up();
        assert.equal(
          await readA.textContent(),
          beforeDrag,
          "display drag preserves runtime pressure",
        );
        await page.waitForTimeout(100);
        assert.equal(
          (await draft()).scene.objects[0].inputs.volume,
          0.8,
          "display edits do not capture experimental volume",
        );
      } else {
        assert.match(
          await panel.getByLabel("Comparison AB").textContent(),
          /1\/2 = 2\/4/,
        );
        assert.match(
          await panel.getByLabel("Comparison AC").textContent(),
          /1\/2 > 1\/3/,
        );
        await panel.getByRole("button", { name: "Split A" }).click();
        assert.match(
          await panel.getByLabel("Comparison AB").textContent(),
          /2\/4 = 2\/4/,
        );
        await page
          .getByRole("button", {
            name: "Fraction bar 1 piece 3 of 4, unshaded",
            exact: true,
          })
          .click();
        assert.match(
          await panel.getByLabel("Comparison AB").textContent(),
          /3\/4 > 2\/4/,
        );
        await panel
          .getByRole("button", {
            name: "Use current settings as starting values",
          })
          .first()
          .click();
        await page.waitForTimeout(100);
        assert.deepEqual((await draft()).scene.objects[0].shaded, [
          true,
          true,
          true,
          false,
        ]);
        await panel
          .getByRole("button", { name: "Reset experiment" })
          .first()
          .click();
        assert.match(
          await panel.getByLabel("Comparison AB").textContent(),
          /3\/4 > 2\/4/,
        );
      }
      // Check real SVG coordinate conversion after both zoom and responsive resizing.
      await page.setViewportSize({ width: 1100, height: 900 });
      const canvasView = page.locator("svg.composition-display").first();
      await page
        .getByRole("button", { name: "Zoom in", exact: true })
        .first()
        .click();
      const firstObject = () => draft().then((d) => d.scene.objects[0]);
      const label = (await firstObject()).label;
      const handle = page.getByRole("button", {
        name: `Move ${label}`,
        exact: true,
      });
      await handle.focus();
      const initialDisplay = (await firstObject()).display;
      const box = await handle.boundingBox();
      const start = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
      const delta = await canvasView.evaluate((svg) => {
        const m = svg.getScreenCTM();
        return { x: 5 * m.a, y: 3 * m.d };
      });
      const dragTo = async () => {
        await page.mouse.move(start.x, start.y);
        await page.mouse.down();
        await page.mouse.move(start.x + delta.x, start.y + delta.y, {
          steps: 5,
        });
      };
      await dragTo();
      await page.keyboard.press("Escape");
      await page.mouse.up();
      assert.deepEqual(
        (await firstObject()).display,
        initialDisplay,
        "cancel does not author geometry",
      );
      assert.equal(
        Number(await handle.getAttribute("x")),
        initialDisplay.x,
        "cancel restores preview",
      );
      await dragTo();
      await page.mouse.up();
      await page.waitForTimeout(100);
      const movedDisplay = (await firstObject()).display;
      assert.equal(
        movedDisplay.x,
        initialDisplay.x + 5,
        "zoomed drag aligns with SVG x",
      );
      assert.equal(
        movedDisplay.y,
        initialDisplay.y + 3,
        "resized drag aligns with SVG y",
      );
      await button("Undo").click();
      await page.waitForTimeout(100);
      assert.deepEqual(
        (await firstObject()).display,
        initialDisplay,
        "drag has one undo entry",
      );
      await button("Redo").click();
      await page.waitForTimeout(100);
      assert.deepEqual((await firstObject()).display, movedDisplay);
      if (domain === "fractions") {
        const resize = page.getByRole("button", {
          name: `Resize ${label}`,
          exact: true,
        });
        await resize.focus();
        await page.keyboard.press("Shift+ArrowUp");
        await page.keyboard.press("Shift+ArrowUp");
        await page.waitForTimeout(100);
        assert.equal((await firstObject()).display.height, 5);
        const pieces = page
          .locator(
            `[data-display-object="${ids[0]}"] .composition-fraction-pieces`,
          )
          .first();
        assert.ok(
          (await pieces.boundingBox()).height > 0,
          "minimum-height fraction pieces remain visible",
        );
        await page
          .getByRole("button", {
            name: "Fraction bar 1 piece 4 of 4, unshaded",
            exact: true,
          })
          .click();
        assert.match(
          await panel.getByLabel("Comparison AB").textContent(),
          /4\/4 > 2\/4/,
        );
        await panel
          .getByRole("button", { name: "Reset experiment" })
          .first()
          .click();
        await button("Undo").click();
        await button("Undo").click();
      }
      assert.ok(
        (await page.locator(".composition-toolbar h1").boundingBox()).width >=
          120,
        "title remains readable at medium widths",
      );
      await page.screenshot({
        path: `${output}/${domain}-medium.png`,
        fullPage: true,
      });
      await page.setViewportSize({ width: 1440, height: 1000 });
      await page.screenshot({
        path: `${output}/${domain}-composition.png`,
        fullPage: true,
      });
      await button("Save experiment").click();
      await page.getByText("Saved on device", { exact: true }).waitFor();
      await button("Try lesson ↗").click();
      assert.equal(
        await page
          .getByRole("button", { name: /^Move (Gas container|Fraction bar)/ })
          .count(),
        0,
      );
      assert.equal(
        await page
          .getByRole("button", {
            name: "Use current settings as starting values",
          })
          .count(),
        0,
      );
      await button("Return to builder").click();
      await button("Build").click();
      await page.setViewportSize({ width: 390, height: 844 });
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        "no mobile page overflow",
      );
      await page.screenshot({
        path: `${output}/${domain}-mobile.png`,
        fullPage: true,
      });
      assert.deepEqual(errors, []);
      await page.close();
    }
    console.log(
      "Physical and diagram browser parity: real authoring, detached draft save/recovery, typed connectors, multiple objects, measurements, runtime changes/reset/capture, direct authoring, learner permissions and mobile passed.",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
