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
  "../../../../../docs/agent-only/implementation/028-validation/developer/A4/peer-A3",
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
      (c) => !process.env.A4_PEER_CASE || c.id === process.env.A4_PEER_CASE,
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
        browser: "A4 independent reviewer: standalone Playwright fallback",
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
        const node=after.recipe.document.nodes.find(n=>n.definition===c.ref), st=after.state.state[node.id],o=after.state.outputs[node.id];
        const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8*Math.max(1,Math.abs(b)),`${a} != ${b}`);
        switch(c.id){
         case 'PHYS-01': near(o.effortForce,st.loadForce*st.pivotPercent/(100-st.pivotPercent));near(o.inputWork,o.outputWork);break;
         case 'PHYS-02': near(o.tension,st.loadForce/st.strands);near(o.rise,st.pull/st.strands);near(o.inputWork,o.outputWork);break;
         case 'PHYS-03': near(o.ratio,st.front/st.rear);near(o.wheelTurns,st.turns*st.front/st.rear);near(o.distance,2*Math.PI*st.wheelRadius*o.wheelTurns);near(o.torqueRatio*o.ratio,1);break;
         case 'PHYS-04': near(o.centreHeight,(st.bodyMass*st.height/2+st.loadMass*st.loadHeight)/(st.bodyMass+st.loadMass));near(o.criticalAngle,Math.atan(st.width/(2*o.centreHeight))*180/Math.PI);break;
         case 'PHYS-05': near(o.finalMomentum,st.mass1*st.speed1+st.mass2*st.speed2);near(o.kineticEnergy+o.internalEnergy,o.initialEnergy);break;
         case 'PHYS-06': near(o.requiredVolume,(st.mass+st.cargo)/st.density);break;
         case 'PHYS-07': near(o.speed,Math.sqrt(2*9.81*(st.surfaceHeight-st.holeHeight)));break;
         case 'PHYS-08': near(o.inputWork,o.outputWork);near(o.inputTravel*st.inputArea,o.outputTravel*st.outputArea);break;
         case 'PHYS-09': near(o.wideSpeed,st.flowRate/st.wideArea);near(o.narrowSpeed,st.flowRate/st.narrowArea);near(o.pressureDifference,st.density*(o.wideSpeed**2-o.narrowSpeed**2)/2);break;
         case 'PHYS-10': near(o.terminalSpeed,Math.sqrt(2*st.mass*9.81/(st.density*st.dragCoefficient*st.area)));break;
        }
        evidence.independentOracle='Published ideal law checked against accepted UI state';
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
        await page.waitForURL(url=>url.pathname==="/");
        await page.waitForFunction(id=>window.__experimentSnapshot?.()?.recipe?.id===id,exported.id);
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
        await dialog.getByRole("button", { name: "Close settings", exact: true }).click();
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
