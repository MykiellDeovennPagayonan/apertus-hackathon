const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs"),
  e = require("./evidence.cjs"),
  { cases } = require("./cases.cjs"),
  { exercise } = require("./browser.cjs");
const snapshot = (page) =>
  page.evaluate(
    () => window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.(),
  );
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43115";
(async () => {
  const browser = await h.launch();
  let failures = 0;
  try {
    for (const c of cases.filter(
      (c) => !process.env.EARTH_CASE || c.kind === process.env.EARTH_CASE,
    )) {
      const run = e.allocate("builder-persistence", c.kind),
        context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(30000);
      const button = (name) => page.getByRole("button", { name, exact: true });
      try {
        await page.goto(base + "/experiments?experiment=" + c.slug);
        await page.locator(`[data-earth="${c.kind}"]`).waitFor();
        if (process.env.EARTH_BUILDER_GENERATED === "true") {
          const sources = fs
            .readdirSync(path.join(e.root, "runs"))
            .filter((n) => /^\d+$/.test(n))
            .sort((a, b) => Number(b) - Number(a));
          const source = sources.find((n) => {
            const m = JSON.parse(
              fs.readFileSync(path.join(e.root, "runs", n, "manifest.json")),
            );
            return (
              m.kind === "live-prompt" &&
              m.topic === c.kind &&
              m.status.startsWith("passed")
            );
          });
          assert.ok(source, "Need an actual accepted inference recipe");
          const response = JSON.parse(
            fs.readFileSync(path.join(e.root, "runs", source, "response.json")),
          );
          e.write(run.dir, "generated-source-recipe.json", response.recipe);
          run.record.generatedSource = {
            run: source,
            requestId: response.requestId,
          };
          await page
            .getByLabel("Open recipe file", { exact: true })
            .setInputFiles(path.join(run.dir, "generated-source-recipe.json"));
          await page.waitForFunction(
            (id) => window.__experimentSnapshot?.()?.recipe?.id === id,
            response.recipe.id,
          );
          await page.getByText("Recipe opened.", { exact: true }).waitFor();
          await page.waitForURL(base + "/");
          await page.locator(`[data-earth="${c.kind}"]`).waitFor();
        }
        const original = await snapshot(page);
        e.write(run.dir, "original.json", original.recipe);
        await page.getByText("Experiment options", { exact: true }).click();
        await page
          .getByRole("link", { name: "Remix in builder", exact: true })
          .click();
        await button("Try lesson ↗").waitFor();
        await e.capture(page, run, "05-builder");
        if (process.env.EARTH_BUILDER_GENERATED === "true")
          await page
            .getByLabel("Experiment title", { exact: true })
            .fill(`${c.kind} reviewed remix ${run.record.run}`);
        await button("Connections").click();
        const editButtons = await page
          .getByRole("button", { name: /^Edit / })
          .allTextContents();
        e.write(run.dir, "edit-buttons.json", editButtons);
        const caption = original.recipe.document.nodes.find((n) =>
          n.definition.endsWith("-caption"),
        );
        await button("Edit " + caption.label).click();
        const dialog = page.getByRole("dialog").last();
        await dialog
          .getByLabel("Label", { exact: true })
          .fill("Current explanation · edited");
        await dialog.getByRole("button", { name: "Done", exact: true }).click();
        await button("Undo").click();
        await button("Edit " + caption.label).waitFor();
        await button("Redo").click();
        await button("Edit Current explanation · edited").waitFor();
        const modelNode = original.recipe.document.nodes.find(
          (n) => n.definition === c.definition,
        );
        await button("Edit " + modelNode.label).click();
        const modelDialog = page.getByRole("dialog").last();
        const speed = modelDialog.getByLabel("Speed", { exact: true });
        const beforeInvalid = (await snapshot(page)).recipe.document.nodes.find(
          (n) => n.definition === c.definition,
        ).configuration.speed;
        await speed.fill("3");
        await speed.press("Tab");
        const apply = modelDialog.getByRole("button", {
          name: "Apply changes",
          exact: true,
        });
        if (!(await apply.isDisabled())) await apply.click();
        assert.equal(
          (await snapshot(page)).recipe.document.nodes.find(
            (n) => n.definition === c.definition,
          ).configuration.speed,
          beforeInvalid,
          "Invalid authored value must preserve accepted configuration",
        );
        await speed.fill("0.5");
        await modelDialog
          .getByRole("button", { name: "Apply changes", exact: true })
          .click();
        await modelDialog
          .getByRole("button", { name: "Done", exact: true })
          .click();
        await button("Build").click();
        const draft = () =>
          page.evaluate(
            () =>
              JSON.parse(localStorage.getItem("apertus-builder-draft-v1"))
                .document.authored,
          );
        const beforeMove = await draft();
        const item = page
          .locator(".board-item")
          .filter({ has: page.locator(".ea-caption") })
          .first();
        await item.click({ position: { x: 12, y: 12 } });
        await page.getByLabel("Position and size", { exact: true }).click();
        const placement = page.locator(".board-placement-menu");
        await placement.getByLabel("x", { exact: true }).fill("5");
        await placement.getByLabel("width", { exact: true }).fill("1040");
        await placement
          .getByRole("button", { name: "Apply placement", exact: true })
          .click();
        await page.waitForTimeout(150);
        const moved = await draft();
        assert.notDeepEqual(moved.presentation, beforeMove.presentation);
        assert.deepEqual(
          moved.nodes,
          beforeMove.nodes,
          "Presentation movement must not change physical parameters",
        );
        await button("Undo").click();
        assert.deepEqual((await draft()).presentation, beforeMove.presentation);
        await button("Redo").click();
        assert.deepEqual((await draft()).presentation, moved.presentation);
        await e.capture(page, run, "05b-presentation-edit");
        await button("Save experiment").click();
        await page
          .getByText("Saved on this device.", { exact: true })
          .first()
          .waitFor();
        await button("Try lesson ↗").click();
        await exercise(page, c.kind, run);
        await e.capture(page, run, "06-try-lesson");
        await button("Return to builder").click();
        await page.reload();
        await button("Try lesson ↗").waitFor();
        await button("Try lesson ↗").click();
        await page.locator(`[data-earth="${c.kind}"]`).waitFor();
        const reopened = await snapshot(page);
        assert.equal(reopened.recipe.document.nodes.length, 4);
        assert.equal(
          reopened.recipe.document.nodes.find(
            (n) => n.definition === c.definition,
          ).configuration.speed,
          0.5,
        );
        assert.ok(
          reopened.recipe.document.nodes.some(
            (n) => n.label === "Current explanation · edited",
          ),
        );
        assert.equal(
          reopened.recipe.document.connections.length,
          original.recipe.document.connections.length,
        );
        e.write(run.dir, "reopened.json", reopened.recipe);
        await e.capture(page, run, "07-reopened");
        await button("Return to builder").click();
        const downloading = page.waitForEvent("download");
        await button("Download recipe").click();
        const download = await downloading;
        const nativeFile = run.dir + "/exported-recipe.json";
        await download.saveAs(nativeFile);
        await page.goto(base + "/experiments?experiment=arithmetic");
        await page
          .getByLabel("Open recipe file", { exact: true })
          .setInputFiles(nativeFile);
        await page.locator(`[data-earth="${c.kind}"]`).waitFor();
        await exercise(page, c.kind, run);
        const imported = await snapshot(page);
        assert.equal(
          imported.recipe.document.nodes.find(
            (n) => n.definition === c.definition,
          ).configuration.speed,
          0.5,
        );
        await e.capture(page, run, "09-native-roundtrip");
        Object.assign(run.record, {
          storage: "Guest device storage",
          accountStorage: "Not tested",
          checks: [
            "independent caption edit",
            "Undo/Redo",
            "save",
            "Try lesson controls",
            "reload/reopen",
          ],
        });
        e.finish(run, "passed");
      } catch (err) {
        failures++;
        await e.capture(page, run, "failure").catch(() => {});
        e.finish(run, "failed", err);
      } finally {
        await context.close();
      }
      console.log(
        run.record.run,
        c.kind,
        run.record.status,
        run.record.error?.split("\n")[0] || "",
      );
    }
  } finally {
    await browser.close();
  }
  assert.equal(failures, 0);
})().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
