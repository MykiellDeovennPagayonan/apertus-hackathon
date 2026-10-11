const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const h = require("./helpers.cjs");
const { load } = require("../test-loader.cjs");
const { createFreshDocument } = load(
  "src/simulations/builder/document/canonical.ts",
);
const { AuthoringTransaction } = load(
  "src/simulations/runtime/authoring/transaction.ts",
);
const { finalizeRecipe } = load(
  "src/simulations/runtime/authoring/operations.ts",
);
const { publicDefinition } = load(
  "src/simulations/components/catalog/index.ts",
);
const { ConstructionPublisher } = load(
  "src/lib/planner/constructionPublisher.ts",
);
const { parseGenerationResult } = load("src/lib/planner/schema.ts");
const live = process.env.CONSTRUCTION_LIVE === "true";
const prompt = process.env.CONSTRUCTION_PROMPT || "Show me how springs work.";
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43125";
const out = path.resolve(
  process.env.CONSTRUCTION_EVIDENCE_DIR ||
    `../../docs/agent-only/implementation/025-validation/runs/${Date.now()}-${live ? "live" : "fixture"}`,
);
const draftKey = "apertus-builder-draft-v1";
let fresh = createFreshDocument();
const seedPath = process.env.CONSTRUCTION_SEED_RESULT;
if (seedPath) {
  const seed = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  fresh = load(
    "src/simulations/builder/composition/constructionPreview.ts",
  ).completedExperiment(fresh, seed);
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const stored = (page) =>
  page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)).document,
    draftKey,
  );

async function fixture(request) {
  const tx = new AuthoringTransaction(request.requestId);
  const execute = (op) => {
    const receipt = tx.execute({
      draftId: tx.draftId,
      expectedRevision: tx.revision,
      operationId: `op-${tx.revision}`,
      request: op,
    });
    assert.equal(receipt.status, "applied", JSON.stringify(receipt));
  };
  execute({
    tool: "insert_component",
    arguments: {
      definition: "models/SpringMass",
      version: 1,
      alias: "spring",
      configuration: publicDefinition("models/SpringMass").defaults,
    },
  });
  execute({
    tool: "insert_component",
    arguments: {
      definition: "appearance/SpringMass",
      version: 1,
      alias: "view",
      configuration: {},
    },
  });
  execute({
    tool: "connect",
    arguments: {
      from: { node: "spring", port: "appearance" },
      to: { node: "view", port: "model" },
    },
  });
  execute({
    tool: "add_control",
    arguments: {
      target: "spring",
      command: "set:stiffness",
      field: "value",
      widget: "slider",
      label: "Spring stiffness",
    },
  });
  execute({
    tool: "add_control",
    arguments: {
      target: "spring",
      command: "RELEASE",
      field: "",
      widget: "button",
      label: "Release the mass",
    },
  });
  execute({
    tool: "set_lesson",
    arguments: {
      title: "How springs work",
      instruction: "Change stiffness, then release the mass.",
      explanation: "A stiffer spring moves the mass back faster.",
    },
  });
  execute({
    tool: "arrange",
    arguments: {
      template: "scene-with-sidebar",
      main: [],
      controls: [],
      results: [],
      narrowOrder: [],
      preserveLocked: true,
    },
  });
  const events = [];
  const publisher = new ConstructionPublisher(
    request.requestId,
    fresh.authored,
    async (e) => events.push(e),
    new AbortController().signal,
  );
  await publisher.publish(tx.document, tx.revision, "arrangement");
  const final = publisher.finalize(tx.document);
  await publisher.publish(final, tx.revision, "checking");
  const result = {
    protocolVersion: 1,
    status: "created",
    requestId: request.requestId,
    expectedSessionId: null,
    expectedAuthoredRevision: null,
    recipe: finalizeRecipe(final, { id: "generated/spring-test" }),
    coverage: {
      level: "full",
      covered: ["spring"],
      omitted: [],
      explanation: "",
    },
  };
  if (process.env.CONSTRUCTION_FAILURE === "true")
    return [
      ...events.slice(0, 2),
      {
        type: "result",
        requestId: request.requestId,
        result: {
          protocolVersion: 1,
          requestId: request.requestId,
          status: "failed",
          message: "Test validation failure.",
          retryable: true,
        },
      },
    ];
  return [...events, { type: "result", requestId: request.requestId, result }];
}
(async () => {
  fs.mkdirSync(out, { recursive: true });
  const browser = await h.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 1000 },
    reducedMotion:
      process.env.CONSTRUCTION_REDUCED_MOTION === "true"
        ? "reduce"
        : "no-preference",
  });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error" && /Maximum update depth/.test(m.text()))
      errors.push(m.text());
  });
  let requestBody;
  page.on("request", (r) => {
    if (new URL(r.url()).pathname === "/api/apertus")
      requestBody = r.postDataJSON();
  });
  const report = {
    method: "local Playwright",
    mode: live ? "real inference" : "deterministic fixture",
    prompt,
    base,
    checks: [],
    errors,
  };
  await context.tracing.start({ screenshots: true, snapshots: true });
  try {
    await context.addInitScript(
      ({ fresh, key, live, navigation }) => {
        if (!localStorage.getItem(key))
          localStorage.setItem(
            key,
            JSON.stringify({ document: fresh, valid: fresh, saveId: null }),
          );
        window.__wire = [];
        window.__observed = [];
        const original = window.fetch;
        window.fetch = async (...args) => {
          let response = await original(...args);
          if (new URL(response.url).pathname === "/api/apertus") {
            if (!live) {
              const originalUrl = response.url,
                headers = response.headers;
              const lines = (await response.text()).trim().split("\n");
              let cancelled = false;
              response = new Response(
                new ReadableStream({
                  async start(controller) {
                    for (const line of lines) {
                      await new Promise((r) =>
                        setTimeout(r, navigation ? 1000 : 100),
                      );
                      if (cancelled) return;
                      controller.enqueue(new TextEncoder().encode(line + "\n"));
                    }
                    controller.close();
                  },
                  cancel() {
                    cancelled = true;
                  },
                }),
                { headers },
              );
              Object.defineProperty(response, "url", { value: originalUrl });
            }
            const clone = response.clone();
            void (async () => {
              const reader = clone.body.getReader(),
                decoder = new TextDecoder();
              let buffer = "";
              while (true) {
                const chunk = await reader.read();
                buffer += chunk.done
                  ? decoder.decode()
                  : decoder.decode(chunk.value, { stream: true });
                let index;
                while ((index = buffer.indexOf("\n")) >= 0) {
                  const line = buffer.slice(0, index);
                  buffer = buffer.slice(index + 1);
                  if (line.trim())
                    window.__wire.push({
                      time: performance.now(),
                      event: JSON.parse(line),
                    });
                }
                if (chunk.done) break;
              }
            })().catch(() => {});
          }
          return response;
        };
        const observe = () => {
          const graph = document.querySelector(".composition-graph");
          if (graph) {
            const state = {
              phase: graph.dataset.constructionPhase || null,
              busy: graph.classList.contains("is-constructing"),
              nodes: graph.querySelectorAll("[data-node-id]").length,
              wires: graph.querySelectorAll(".connection-wire").length,
            };
            const previous = window.__observed.at(-1);
            if (
              !previous ||
              JSON.stringify(state) !== JSON.stringify(previous.state)
            )
              window.__observed.push({ time: performance.now(), state });
          }
          requestAnimationFrame(observe);
        };
        requestAnimationFrame(observe);
      },
      {
        fresh,
        key: draftKey,
        live,
        navigation: process.env.CONSTRUCTION_NAVIGATION === "true",
      },
    );
    if (!live)
      await page.route("**/api/apertus", async (route) => {
        const request = route.request().postDataJSON();
        const events = await fixture(request);
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          headers: { "X-Request-ID": request.requestId },
          body: events.map((e) => JSON.stringify(e)).join("\n") + "\n",
        });
      });
    await page.goto(`${base}/experiments/builder`);
    const composer = page.locator(".builder-composer");
    await composer.locator("textarea").waitFor();
    await page.waitForFunction(
      (key) =>
        JSON.parse(localStorage.getItem(key) || "null")?.document?.authored !==
        undefined,
      draftKey,
    );
    await page.screenshot({ path: path.join(out, "opening.png") });
    const before = await stored(page);
    await composer.locator("textarea").fill(prompt);
    await composer.locator(".command-bar__send").click();
    await page.waitForFunction(() =>
      document
        .querySelector(".composition-graph")
        ?.classList.contains("is-constructing"),
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Undo", exact: true })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "+ Add component", exact: true })
        .isDisabled(),
      true,
    );
    await page.waitForFunction(
      () =>
        document.querySelectorAll(".is-constructing [data-node-id]").length >
          0 || window.__wire.some((e) => e.event.type === "result"),
      null,
      { timeout: 300000 },
    );
    const earlyResult = await page.evaluate(
      () => window.__wire.find((e) => e.event.type === "result")?.event.result,
    );
    if (earlyResult)
      assert.ok(
        ["created", "updated"].includes(earlyResult.status),
        JSON.stringify(earlyResult),
      );
    assert.equal(
      await page
        .getByRole("button", { name: /^Save (experiment|draft)$/ })
        .isDisabled(),
      true,
    );
    assert.equal(
      await page
        .getByRole("button", { name: "Try lesson ↗", exact: true })
        .isDisabled(),
      true,
    );
    const during = await stored(page);
    assert.deepEqual(
      during.authored,
      before.authored,
      "Preview must not be persisted",
    );
    await page.screenshot({ path: path.join(out, "components.png") });
    if (process.env.CONSTRUCTION_NAVIGATION === "true") {
      await page.getByRole("button", { name: "Zoom in", exact: true }).click();
      assert.equal(
        await page
          .getByRole("checkbox", { name: "Follow build", exact: true })
          .isChecked(),
        false,
      );
      await page.keyboard.press("ControlOrMeta+z");
      assert.deepEqual(
        (await stored(page)).authored.nodes,
        before.authored.nodes,
      );
      await page
        .getByRole("checkbox", { name: "Follow build", exact: true })
        .check();
      report.checks.push(
        "manual zoom pauses camera follow; keyboard Undo cannot mutate preview",
      );
    }
    if (process.env.CONSTRUCTION_FAILURE === "true") {
      await page.waitForFunction(
        () =>
          !document
            .querySelector(".composition-graph")
            ?.classList.contains("is-constructing"),
      );
      assert.deepEqual((await stored(page)).authored, before.authored);
      assert.equal(await composer.locator("textarea").inputValue(), prompt);
      report.checks.push(
        "failed validation rolls back preview and preserves prompt",
      );
    } else if (process.env.CONSTRUCTION_CANCEL === "true") {
      await composer.getByRole("button", { name: "Stop", exact: true }).click();
      await page.waitForFunction(
        () =>
          !document
            .querySelector(".composition-graph")
            ?.classList.contains("is-constructing"),
      );
      assert.deepEqual((await stored(page)).authored, before.authored);
      assert.equal(await composer.locator("textarea").inputValue(), prompt);
      report.checks.push("cancel preserves committed content and prompt");
    } else {
      await page.waitForFunction(
        () =>
          window.__observed.some(
            (o) =>
              o.state.busy &&
              ["connections", "arrangement", "checking"].includes(
                o.state.phase,
              ),
          ) || window.__wire.some((e) => e.event.type === "result"),
        null,
        { timeout: 300000 },
      );
      await page.screenshot({ path: path.join(out, "connections.png") });
      await page.waitForFunction(
        () =>
          !document
            .querySelector(".composition-graph")
            ?.classList.contains("is-constructing"),
        null,
        { timeout: 300000 },
      );
      report.camera = await page.evaluate(() => {
        const viewport = document.querySelector(
          ".composition-graph .builder-canvas-scroll",
        );
        const composer = document.querySelector(".builder-composer");
        return {
          viewport: viewport.getBoundingClientRect().toJSON(),
          composer: composer.getBoundingClientRect().toJSON(),
          reserved: getComputedStyle(
            viewport.closest(".composition-builder"),
          ).getPropertyValue("--builder-composer-height"),
        };
      });
      await page.waitForFunction(
        () => {
          const viewport = document.querySelector(
            ".composition-graph .builder-canvas-scroll",
          );
          const composer = document.querySelector(".builder-composer");
          if (!viewport || !composer) return false;
          const bounds = viewport.getBoundingClientRect(),
            prompt = composer.getBoundingClientRect();
          return [...viewport.querySelectorAll("[data-node-id]")].every(
            (node) => {
              const rect = node.getBoundingClientRect();
              return (
                rect.left >= bounds.left - 2 &&
                rect.right <= bounds.right + 2 &&
                rect.top >= bounds.top - 2 &&
                rect.bottom <= Math.min(bounds.bottom, prompt.top) + 2
              );
            },
          );
        },
        null,
        { timeout: 10000 },
      );
      report.checks.push(
        "final overview keeps blocks visible above the prompt bar",
      );
      const wire = await page.evaluate(() => window.__wire);
      const resultEvent = wire.find((e) => e.event.type === "result");
      assert.ok(resultEvent, "Missing final response");
      const result = parseGenerationResult(
        resultEvent.event.result,
        requestBody,
      );
      assert.equal(
        result.status,
        seedPath ? "updated" : "created",
        JSON.stringify(result),
      );
      const committed = await stored(page);
      const expected = structuredClone(result.recipe.document);
      expected.editor.zoom = committed.authored.editor.zoom;
      assert.deepEqual(committed.authored, expected);
      report.checks.push(
        "temporary preview never persisted",
        "final authoritative result committed once",
      );
      const observed = await page.evaluate(() => window.__observed);
      const phases = observed
        .filter((o) => o.state.busy)
        .map((o) => o.state.phase);
      if (!seedPath)
        assert.ok(
          phases.includes("components") &&
            phases.includes("connections") &&
            phases.includes("arrangement"),
          JSON.stringify(phases),
        );
      else {
        assert.ok(phases.includes("checking"));
        const field = process.env.CONSTRUCTION_EXPECT_FIELD;
        const control = process.env.CONSTRUCTION_EXPECT_CONTROL;
        const beforeModel = before.authored.nodes.find(
            (n) => n.definition === "models/SpringMass",
          ),
          afterModel = committed.authored.nodes.find(
            (n) => n.id === beforeModel.id,
          );
        if (control) {
          assert.deepEqual(afterModel.configuration, beforeModel.configuration);
          const added = committed.authored.nodes.filter(
            (node) => !before.authored.nodes.some((old) => old.id === node.id),
          );
          assert.equal(
            added.length,
            1,
            "Exactly one requested control is added",
          );
          assert.equal(added[0].definition, "controls/Slider");
          const wire = committed.authored.connections.find(
            (connection) =>
              connection.from.node === added[0].id &&
              connection.to.node === beforeModel.id,
          );
          assert.equal(wire?.to.port, `set:${control}`);
          assert.ok(
            before.authored.connections.every((old) =>
              committed.authored.connections.some(
                (wire) => JSON.stringify(wire) === JSON.stringify(old),
              ),
            ),
          );
          report.checks.push(
            `informal addition creates one connected ${control} slider without changing model settings`,
          );
        } else {
          assert.ok(
            afterModel.configuration[field] > beforeModel.configuration[field],
          );
          for (const key of Object.keys(beforeModel.configuration).filter(
            (k) => k !== field,
          ))
            assert.equal(
              afterModel.configuration[key],
              beforeModel.configuration[key],
              `Unrelated ${key} must be preserved`,
            );
          assert.deepEqual(
            committed.authored.connections,
            before.authored.connections,
          );
          report.checks.push(
            `natural follow-up increases ${field} and preserves unrelated content`,
          );
        }
      }
      if (live && !seedPath)
        assert.ok(
          observed.some(
            (o) =>
              o.state.busy && o.state.nodes > 0 && o.time < resultEvent.time,
          ),
          "Components must appear before server final result",
        );
      report.checks.push(
        seedPath
          ? "existing graph changes highlighted during generation"
          : "components, wires, arrangement observed during construction",
      );
      if (live) {
        const diagnostics = await (
          await page.request.get(
            `${base}/api/planner-diagnostics?id=${requestBody.requestId}`,
          )
        ).json();
        report.providers = diagnostics?.configuration;
        report.inferenceEvidence = diagnostics?.events?.filter(
          (e) =>
            e.event === "composition.decision" ||
            e.event === "selection.decision" ||
            e.event === "turn.executed" ||
            e.event === "operations" ||
            e.event === "budget" ||
            e.event === "result",
        );
        if (process.env.CONSTRUCTION_REQUIRE_LAYA !== "false")
          assert.ok(
            report.inferenceEvidence?.some(
              (e) =>
                e.event === "composition.decision" &&
                e.data.provider === "laya" &&
                e.data.status === "accepted",
            ),
            "Strict run needs accepted real Laya decision",
          );
        assert.equal(report.providers?.llm.provider, "apertus");
        assert.ok(
          diagnostics?.events?.some(
            (e) =>
              (e.event === "turn.executed" && e.data.status === "applied") ||
              (e.event === "operations" &&
                e.data.receipt?.status === "applied"),
          ),
        );
      }
      await page.screenshot({
        path: path.join(out, "completed-connections.png"),
      });
      await page.getByRole("button", { name: "Build", exact: true }).click();
      if (process.env.CONSTRUCTION_EXPECT_CONTROL) {
        const slider = page.getByRole("slider", { name: /mass/i });
        await slider.waitFor();
        assert.equal(await slider.isEnabled(), true);
        assert.equal(await slider.getAttribute("min"), "0.2");
        assert.equal(await slider.getAttribute("max"), "5");
        const value = Number(await slider.inputValue());
        await slider.focus();
        await slider.press("ArrowRight");
        assert.ok(
          Number(await slider.inputValue()) > value,
          "The new mass slider accepts interaction",
        );
        report.checks.push(
          "new mass slider is enabled, uses catalog limits, and accepts a value change",
        );
      }
      await page.screenshot({ path: path.join(out, "completed-build.png") });
      if (
        result.recipe.document.nodes.some(
          (n) => n.definition === "models/SpringMass",
        )
      ) {
        await page
          .getByRole("img", { name: /mass attached to a spring/ })
          .waitFor();
        const release = page.getByRole("button", { name: /^Release\b/i });
        const svg = page.getByRole("img", {
          name: /mass attached to a spring/,
        });
        const beforeX = await svg.locator("rect").getAttribute("x");
        await release.click();
        await sleep(200);
        const afterX = await svg.locator("rect").getAttribute("x");
        if (process.env.CONSTRUCTION_REDUCED_MOTION !== "true")
          assert.notEqual(afterX, beforeX, "Release must move the mass");
        report.checks.push("spring visual and release action work");
      } else {
        const runtime = load(
          "src/simulations/runtime/recipes/loadRecipe.ts",
        ).loadRecipe(result.recipe).runtime;
        assert.ok(runtime);
        runtime.dispose();
        report.checks.push("selected recipe loads a valid runtime");
      }
      await page
        .getByRole("button", { name: "Connections", exact: true })
        .click();
      await page.getByRole("button", { name: "Undo", exact: true }).click();
      assert.deepEqual(
        (await stored(page)).authored.nodes,
        before.authored.nodes,
      );
      assert.equal(
        await page
          .getByRole("button", { name: "Undo", exact: true })
          .isDisabled(),
        true,
      );
      await page.getByRole("button", { name: "Redo", exact: true }).click();
      assert.deepEqual(
        (await stored(page)).authored.nodes,
        committed.authored.nodes,
      );
      report.checks.push("one Undo restores baseline; Redo restores result");
      await page.setViewportSize({ width: 390, height: 844 });
      await page
        .getByRole("button", { name: "Fit to content", exact: true })
        .click();
      await page.screenshot({ path: path.join(out, "narrow.png") });
      await page.getByRole("button", { name: "Build", exact: true }).click();
      await page.screenshot({ path: path.join(out, "narrow-build.png") });
      await page
        .getByRole("button", { name: "Connections", exact: true })
        .click();
      await page.reload();
      await composer.locator("textarea").waitFor();
      assert.deepEqual(
        (await stored(page)).authored.nodes,
        committed.authored.nodes,
      );
      report.checks.push("committed content survives reload");
      if (process.env.CONSTRUCTION_FOLLOWUPS === "true") {
        await page.setViewportSize({ width: 1440, height: 1000 });
        for (const [followup, field] of [
          ["What happens if the spring is stronger?", "stiffness"],
          ["Make it stop bouncing so much.", "damping"],
        ]) {
          const previous = await stored(page);
          const previousModel = previous.authored.nodes.find(
            (n) => n.definition === "models/SpringMass",
          );
          await composer.locator("textarea").fill(followup);
          await composer.locator(".command-bar__send").click();
          await page.waitForFunction(() =>
            document
              .querySelector(".composition-graph")
              ?.classList.contains("is-constructing"),
          );
          await page.waitForFunction(
            () =>
              !document
                .querySelector(".composition-graph")
                ?.classList.contains("is-constructing"),
            null,
            { timeout: 300000 },
          );
          await page.waitForFunction(
            () => window.__wire.some((e) => e.event.type === "result"),
            null,
            { timeout: 10000 },
          );
          const latest = (await page.evaluate(() => window.__wire))
            .filter((e) => e.event.type === "result")
            .at(-1);
          assert.equal(
            latest.event.result.status,
            "updated",
            JSON.stringify(latest.event.result),
          );
          const next = await stored(page);
          const nextModel = next.authored.nodes.find(
            (n) => n.id === previousModel.id,
          );
          assert.ok(
            nextModel.configuration[field] > previousModel.configuration[field],
            `Expected increased ${field}`,
          );
          for (const key of ["mass", "amplitude"])
            assert.equal(
              nextModel.configuration[key],
              previousModel.configuration[key],
            );
          assert.deepEqual(
            next.authored.connections,
            previous.authored.connections,
          );
          await page.screenshot({
            path: path.join(out, `followup-${field}.png`),
          });
          report.checks.push(
            `natural follow-up increases ${field} and preserves unrelated content`,
          );
          const diagnostics = await (
            await page.request.get(
              `${base}/api/planner-diagnostics?id=${latest.event.requestId}`,
            )
          ).json();
          (report.followups ??= []).push({
            prompt: followup,
            status: latest.event.result.status,
            configuration: nextModel.configuration,
            events: diagnostics?.events?.filter(
              (e) =>
                e.event === "composition.decision" ||
                e.event === "turn.executed" ||
                e.event === "turn.done",
            ),
          });
        }
      }
      await page
        .getByRole("button", { name: "Try lesson ↗", exact: true })
        .click();
      await page
        .getByRole("button", { name: "Return to builder", exact: true })
        .waitFor();
      await page
        .getByRole("button", { name: "Return to builder", exact: true })
        .click();
      await composer.locator("textarea").waitFor();
      report.checks.push(
        "completed lesson opens in Try lesson and returns to builder",
      );
      fs.writeFileSync(
        path.join(out, "result.json"),
        JSON.stringify(result, null, 2),
      );
    }
    report.status = "pass";
    assert.deepEqual(errors, []);
  } catch (error) {
    report.status = "fail";
    report.failure = error.stack;
    throw error;
  } finally {
    if (requestBody) {
      report.diagnostics = await (
        await page.request.get(
          `${base}/api/planner-diagnostics?id=${requestBody.requestId}`,
        )
      )
        .json()
        .catch(() => null);
    }
    report.observations = await page
      .evaluate(() => window.__observed || [])
      .catch(() => []);
    report.wireTimeline = await page
      .evaluate(() =>
        window.__wire.map(({ time, event }) => ({
          time,
          type: event.type,
          phase: event.phase,
          sequence: event.sequence,
          status: event.result?.status,
        })),
      )
      .catch(() => []);
    fs.writeFileSync(
      path.join(out, "report.json"),
      JSON.stringify(report, null, 2),
    );
    await page
      .screenshot({ path: path.join(out, "last-state.png") })
      .catch(() => {});
    await context.tracing.stop({ path: path.join(out, "trace.zip") });
    await browser.close();
    console.log(
      JSON.stringify(
        {
          status: report.status,
          mode: report.mode,
          out,
          checks: report.checks,
          failure: report.failure,
        },
        null,
        2,
      ),
    );
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
