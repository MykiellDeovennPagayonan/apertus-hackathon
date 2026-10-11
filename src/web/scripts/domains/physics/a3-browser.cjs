const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const h = require("../../generation/helpers.cjs");
const cases = [
  { id: "PHYS-01", slug: "levers", ref: "prefabs/physics/Lever" },
  ...require("./a3-cases.json"),
];
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43123";
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/028-validation/developer/A3/captures",
  new Date().toISOString().replace(/[:.]/g, "-"),
);
const snapshot = (page) =>
  page.evaluate(
    () => window.__experimentSnapshot?.() ?? window.__builderLessonSnapshot?.(),
  );
(async () => {
  fs.mkdirSync(root, { recursive: true });
  const browser = await h.launch();
  try {
    for (const c of cases.filter(
      (c) => !process.env.A3_CASE || c.id === process.env.A3_CASE,
    )) {
      const dir = path.join(root, c.id);
      fs.mkdirSync(dir);
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(30000);
      const evidence = {
        id: c.id,
        started: new Date().toISOString(),
        browser: "Standalone Playwright fallback; Node REPL js unavailable",
        status: "running",
        peer: "Not tested",
        captures: [],
        errors: [],
      };
      page.on("pageerror", (e) => evidence.errors.push(String(e)));
      const capture = async (name) => {
        await page.waitForFunction(
          () =>
            new Promise((resolve) => {
              let prior = "",
                stable = 0;
              const frame = () => {
                const rects = [...document.querySelectorAll("[data-board-id]")]
                  .map((n) => {
                    const r = n.getBoundingClientRect();
                    return [r.x, r.y, r.width, r.height]
                      .map((v) => Math.round(v * 10))
                      .join(",");
                  })
                  .join(";");
                stable = rects && rects === prior ? stable + 1 : 0;
                prior = rects;
                if (stable >= 4) resolve(true);
                else requestAnimationFrame(frame);
              };
              requestAnimationFrame(frame);
            }),
        );
        await page.screenshot({ path: path.join(dir, name + ".png") });
        evidence.captures.push(name + ".png");
      };
      try {
        await page.goto(base + "/experiments?experiment=" + c.slug);
        await page.waitForFunction(
          () => !!window.__experimentSnapshot?.()?.recipe,
        );
        await capture("opening");
        const before = await snapshot(page);
        assert.ok(
          before.recipe.document.nodes.some((n) => n.definition === c.ref),
        );
        const slider = page.getByRole("slider").first();
        await slider.focus();
        await slider.press("ArrowRight");
        await page.waitForFunction(
          (previous) =>
            JSON.stringify(window.__experimentSnapshot?.()?.state) !== previous,
          JSON.stringify(before.state),
        );
        const action = {
          "PHYS-01": "Lift / lower slightly",
          "PHYS-03": "Turn pedals / start again",
          "PHYS-05": "Collide / return to start",
          "PHYS-06": "Flood / seal the hull",
          "PHYS-09": "Follow water / start again",
          "PHYS-10": "Fall one second",
        }[c.id];
        if (action) {
          const previous = JSON.stringify((await snapshot(page)).state);
          await page.getByRole("button", { name: action, exact: true }).click();
          await page.waitForFunction(
            (previous) =>
              JSON.stringify(window.__experimentSnapshot?.()?.state) !==
              previous,
            previous,
          );
        }
        await capture("changed");
        const after = await snapshot(page);
        fs.writeFileSync(
          path.join(dir, "accepted.json"),
          JSON.stringify(after, null, 2),
        );
        await page.setViewportSize({ width: 1280, height: 720 });
        await capture("short-desktop");
        assert.ok(
          await page.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth + 1,
          ),
        );
        await page.setViewportSize({ width: 1440, height: 900 });
        const exported = await h.exportRecipe(page, dir);
        const importedSession = (await snapshot(page)).sessionId;
        await page
          .getByLabel("Open recipe file", { exact: true })
          .setInputFiles(path.join(dir, "exported-recipe.json"));
        await page.waitForFunction(
          ({ id, prior }) => {
            const s = window.__experimentSnapshot?.();
            return s?.recipe?.id === id && s.sessionId !== prior;
          },
          { id: exported.id, prior: importedSession },
        );
        assert.deepEqual(
          (await snapshot(page)).recipe.document.nodes
            .filter((n) => n.definition === c.ref)
            .map((n) => n.configuration),
          exported.document.nodes
            .filter((n) => n.definition === c.ref)
            .map((n) => n.configuration),
        );
        await page.getByText("Experiment options", { exact: true }).click();
        await page
          .getByRole("link", { name: "Remix in builder", exact: true })
          .click();
        const button = (name) =>
          page.getByRole("button", { name, exact: true });
        await button("Try lesson ↗").waitFor();
        await capture("builder");
        const edit = {
          "PHYS-01": ["loadForce", 150],
          "PHYS-02": ["loadForce", 250],
          "PHYS-03": ["wheelRadius", 0.4],
          "PHYS-04": ["bodyMass", 30],
          "PHYS-05": ["mass1", 3],
          "PHYS-06": ["mass", 12],
          "PHYS-07": ["density", 1100],
          "PHYS-08": ["loadForce", 1500],
          "PHYS-09": ["referencePressure", 120000],
          "PHYS-10": ["mass", 100],
        }[c.id];
        const model = exported.document.nodes.find(
          (n) => n.definition === c.ref,
        );
        await button(`Edit ${model.label}`).click();
        const dialog = page.getByRole("dialog");
        const label = edit[0]
          .replace(/([a-z])([A-Z])/g, "$1 $2")
          .replace(/^./, (v) => v.toUpperCase());
        await dialog.getByLabel(label, { exact: true }).fill(String(edit[1]));
        await dialog
          .getByRole("button", { name: "Apply changes", exact: true })
          .click();
        await dialog.getByRole("button", { name: "Done", exact: true }).click();
        model.configuration[edit[0]] = edit[1];
        await capture("builder-edited");
        await button("Save experiment").click();
        await page
          .getByText("Saved locally", { exact: true })
          .first()
          .waitFor();
        await button("Try lesson ↗").click();
        await capture("try-lesson");
        await button("Return to builder").click();
        await page.reload();
        await button("Try lesson ↗").click();
        await capture("saved-reopened");
        assert.deepEqual(
          (await snapshot(page)).recipe.document.nodes
            .filter((n) => n.definition === c.ref)
            .map((n) => n.configuration),
          exported.document.nodes
            .filter((n) => n.definition === c.ref)
            .map((n) => n.configuration),
        );
        assert.deepEqual(evidence.errors, []);
        evidence.status = "automated UI/persistence checks passed";
      } catch (error) {
        evidence.status = "failed";
        evidence.error = String(error.stack || error);
        await capture("failure").catch(() => {});
        process.exitCode = 1;
      } finally {
        evidence.ended = new Date().toISOString();
        fs.writeFileSync(
          path.join(dir, "manifest.json"),
          JSON.stringify(evidence, null, 2),
        );
        console.log(JSON.stringify({ directory: dir, ...evidence }));
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
