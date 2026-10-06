/** Run only by the official Playwright MCP server. All inference goes through normal UI. */
module.exports = async function scenario(
  page,
  {
    name,
    width,
    directory,
    baseUrl,
    promptOverride,
    creationOnly,
    expectedParameters,
    expectedGraph,
  },
) {
  const cases = {
    pendulum: {
      prompt: "Does a longer swing move more slowly?",
      provider: "Pendulum",
      followups: ["Make the second swing four times as long as the first."],
    },
    rolling: {
      prompt: "Why does a toy car roll farther on a smooth floor?",
      provider: "RollingTrack",
      followups: ["Make the rough floor twice as rough."],
    },
    circuit: {
      prompt: "What happens if I add another bulb to a circuit?",
      provider: "ResistiveCircuit",
      followups: ["Add a second bulb in series.", "Put them in parallel."],
    },
  };
  const config = cases[name];
  const result = {
    name,
    width,
    prompt: promptOverride || config.prompt,
    startedAt: new Date().toISOString(),
    requests: [],
    states: [],
    numerical: [],
    consoleErrors: [],
    networkFailures: [],
    checks: [],
    status: "running",
  };
  const check = (value, label) => {
    result.checks.push({ label, passed: !!value });
    if (!value) throw new Error(label);
  };
  const near = (label, actual, expected) => {
    const passed =
      Math.abs(actual - expected) <= 1e-6 * Math.max(1, Math.abs(expected));
    result.numerical.push({
      label,
      actual,
      expected,
      tolerance: "1e-6 relative, 1e-6 absolute near zero",
      passed,
    });
    if (!passed) throw new Error(`${label}: ${actual} != ${expected}`);
  };
  const snapshot = () => page.evaluate(() => window.__experimentSnapshot());
  const state = async (label) => {
    const s = await snapshot();
    result.states.push({ label, snapshot: s });
    return s.state.instances;
  };
  const send = async (prompt, creation = false, reject = false) => {
    const start = Date.now();
    const pending = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/apertus") && r.request().method() === "POST",
      { timeout: 185000 },
    );
    await page.getByRole("textbox").fill(prompt);
    await page
      .getByRole("button", { name: creation ? /^Create/ : /^Apply/ })
      .click();
    await page
      .getByRole("button", { name: /^Stop/ })
      .waitFor({ state: "visible", timeout: 2000 });
    const feedbackMs = Date.now() - start;
    const response = await pending;
    const plan = await response.json();
    const id = response.headers()["x-request-id"];
    const diagnostic = id
      ? await (
          await page.request.get(`${baseUrl}/api/planner-diagnostics?id=${id}`)
        ).json()
      : null;
    result.requests.push({
      prompt,
      id,
      status: response.status(),
      elapsedMs: Date.now() - start,
      feedbackMs,
      plan,
      diagnostic,
    });
    if (reject && !response.ok()) {
      // Still verify atomic rejection, disposal and cancellation after a model
      // failure. The failed rejection outcome remains a failing gate below.
      result.checks.push({
        label: `Unsupported follow-up should return clarify/unsupported, got HTTP ${response.status()}: ${JSON.stringify(plan)}`,
        passed: false,
      });
      await page
        .getByRole("button", { name: /^Apply/ })
        .waitFor({ state: "visible", timeout: 10000 });
      return plan;
    }
    check(
      response.ok(),
      `Inference HTTP ${response.status()}: ${JSON.stringify(plan)}`,
    );
    check(
      reject
        ? ["clarify", "unsupported"].includes(plan.operation)
        : plan.operation === (creation ? "create" : "edit"),
      `Expected ${creation ? "create" : "edit"}: ${JSON.stringify(plan)}`,
    );
    await page
      .getByRole("button", { name: /^Apply/ })
      .waitFor({ state: "visible", timeout: 10000 });
    await page.waitForFunction(
      () => window.__experimentSnapshot()?.context?.revision != null,
      { timeout: 10000 },
    );
    const s = await snapshot();
    if (creation) {
      const events = diagnostic?.events || [];
      for (const event of [
        "teachingIntent",
        "configuration",
        "stagedValidation",
      ])
        check(
          events.some((e) => e.event === event),
          `Missing fresh ${event} provenance`,
        );
      check(
        events.some(
          (e) =>
            e.event === "layaSelection" &&
            e.data.question === "assembly" &&
            e.data.response.model &&
            e.data.decision,
        ),
        "Missing actual accepted Laya mechanism selection",
      );
      check(
        events.some((e) => e.event === "intent.response" && e.data.model),
        "Missing fresh Apertus intent response",
      );
      check(
        events.some(
          (e) => e.event === "configuration.response" && e.data.model,
        ),
        "Missing fresh Apertus configuration response",
      );
      check(
        s.correlationId === id,
        "Committed runtime correlation differs from browser request",
      );
      check(
        s.demo === "assembly" ||
          s.context.composition.ref === "assemblies/GeneratedExperiment",
        "Assembly did not activate",
      );
      check(
        s.state.instances.every(
          (i) => i.provider === `prefabs/physical-systems/${config.provider}`,
        ),
        "Wrong physical mechanism",
      );
    }
    check(
      !(await page
        .getByText("Couldn't apply those changes.", { exact: true })
        .count()),
      "Runtime rejected inference plan",
    );
    return plan;
  };
  page.on("pageerror", (e) => result.consoleErrors.push(e.message));
  page.on("requestfailed", (r) => {
    if (!r.failure()?.errorText.includes("ERR_ABORTED"))
      result.networkFailures.push({
        url: r.url(),
        error: r.failure()?.errorText,
      });
  });
  try {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(baseUrl + "/");
    await page.getByRole("textbox").waitFor();
    await page.waitForFunction(
      () => typeof window.__experimentSnapshot === "function",
      { timeout: 30000 },
    );
    await send(result.prompt, true);
    let instances = await state("initial");
    await page.screenshot({ path: directory + "/initial.png", fullPage: true });
    if (creationOnly) {
      if (expectedGraph)
        check(
          (await page.locator(".physical-angle-graph").count()) > 0,
          "Requested angle-time graph is rendered",
        );
      if (expectedParameters) {
        check(
          instances.length === expectedParameters.length,
          "Variant object count",
        );
        for (let index = 0; index < expectedParameters.length; index++)
          for (const [key, value] of Object.entries(
            expectedParameters[index],
          )) {
            if (typeof value === "number")
              near(
                `Variant ${index + 1} ${key}`,
                instances[index].parameters[key],
                value,
              );
            else
              check(
                instances[index].parameters[key] === value,
                `Variant ${index + 1} ${key}`,
              );
          }
        if (name === "pendulum")
          for (let index = 1; index < instances.length; index++)
            near(
              `Variant period ratio ${index + 1}`,
              instances[index].outputs.period / instances[0].outputs.period,
              Math.sqrt(
                instances[index].parameters.length /
                  instances[0].parameters.length,
              ),
            );
      }
      if (await page.locator(".physical-angle-graph").count()) {
        await page.locator(".physical-angle-graph").scrollIntoViewIfNeeded();
        await page.screenshot({
          path: directory + "/graph.png",
          fullPage: true,
        });
      }
      result.status = "passed";
      return result;
    }
    if (name === "pendulum") {
      check(
        instances.length === 2,
        "Pendulum defaults require two independent objects",
      );
      near("First length", instances[0].parameters.length, 1);
      near("Second length", instances[1].parameters.length, 2);
      near("First amplitude", instances[0].parameters.amplitude, 5);
      near("Shared gravity", instances[1].parameters.gravity, 9.81);
      near("First period", instances[0].outputs.period, 2.0060666807106475);
      near("Second period", instances[1].outputs.period, 2.837006706885775);
      if (
        await page.getByRole("button", { name: "Pause", exact: true }).count()
      )
        await page.getByRole("button", { name: "Pause", exact: true }).click();
      await send(config.followups[0]);
      instances = await state("length-followup");
      near(
        "Length ratio",
        instances[1].parameters.length / instances[0].parameters.length,
        4,
      );
      near(
        "Period ratio",
        instances[1].outputs.period / instances[0].outputs.period,
        2,
      );
    } else if (name === "rolling") {
      check(
        instances.length === 2,
        "Floor defaults require two independent tracks",
      );
      near("Ramp height", instances[0].parameters.height, 0.5);
      near("Smooth resistance", instances[0].parameters.resistance, 0.05);
      near("Rough resistance", instances[1].parameters.resistance, 0.1);
      near("Smooth stop", instances[0].outputs.stoppingDistance, 10);
      near("Rough stop", instances[1].outputs.stoppingDistance, 5);
      near("Launch speed", instances[0].outputs.entrySpeed, 3.132091952673165);
      await send(config.followups[0]);
      instances = await state("rough-followup");
      near("Rough doubled", instances[1].parameters.resistance, 0.2);
      near("Rough stop halved", instances[1].outputs.stoppingDistance, 2.5);
      near("Smooth unchanged", instances[0].outputs.stoppingDistance, 10);
      near(
        "Entry speed unchanged",
        instances[1].outputs.entrySpeed,
        3.132091952673165,
      );
    } else {
      check(instances.length === 1, "Circuit defaults require one circuit");
      near("Initial voltage", instances[0].parameters.voltage, 6);
      near("Initial resistance", instances[0].parameters.resistance, 12);
      near("One-bulb current", instances[0].outputs.totalCurrent, 0.5);
      await send(config.followups[0]);
      instances = await state("series-followup");
      near("Two bulbs", instances[0].parameters.bulbs, 2);
      check(instances[0].parameters.topology === "series", "Expected series");
      near("Series current", instances[0].outputs.totalCurrent, 0.25);
      near("Series per-bulb power", instances[0].outputs.bulbPower, 0.75);
      await send(config.followups[1]);
      instances = await state("parallel-followup");
      near("Parallel current", instances[0].outputs.totalCurrent, 1);
      near("Parallel per-bulb power", instances[0].outputs.bulbPower, 3);
    }
    await page.screenshot({
      path: directory + "/followup.png",
      fullPage: true,
    });
    await page.locator(".physical-object-grid").scrollIntoViewIfNeeded();
    await page.screenshot({
      path: directory + "/measurements.png",
      fullPage: true,
    });
    if (name !== "circuit") {
      if (
        await page.getByRole("button", { name: "Pause", exact: true }).count()
      )
        await page.getByRole("button", { name: "Pause", exact: true }).click();
      const before = (await snapshot()).state.instances;
      await page.waitForTimeout(200);
      const after = (await snapshot()).state.instances;
      check(
        before.every(
          (i, index) => i.outputs.elapsed === after[index].outputs.elapsed,
        ),
        "Pause preserves simulation time",
      );
      await page
        .getByRole("button", { name: "Step 0.1 s", exact: true })
        .click();
      const stepped = (await snapshot()).state.instances;
      for (let index = 0; index < before.length; index++)
        near(
          `Step ${index}`,
          stepped[index].outputs.elapsed - before[index].outputs.elapsed,
          0.1,
        );
      await page
        .getByRole("button", { name: "Run again", exact: true })
        .click();
      check(
        (await snapshot()).state.instances.every(
          (i) => i.outputs.elapsed === 0,
        ),
        "Restart uses zero simulation time",
      );
    }
    await page
      .getByRole("button", { name: "Reset initial settings", exact: true })
      .click();
    instances = await state("reset");
    const initial = result.states[0].snapshot.state.instances;
    check(
      JSON.stringify(instances.map((i) => i.parameters)) ===
        JSON.stringify(initial.map((i) => i.parameters)),
      "Reset restores accepted initial configurations",
    );
    check(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
      "Page horizontal overflow",
    );
    const targetSizes = await page
      .locator(
        ".physical-systems-experiment button, .physical-systems-experiment input, .physical-systems-experiment select",
      )
      .evaluateAll((elements) =>
        elements
          .filter((e) => e.getBoundingClientRect().height > 0)
          .every((e) => e.getBoundingClientRect().height >= 44),
      );
    check(targetSizes, "Essential controls have 44px height");
    await page
      .getByRole("button", { name: "Reset initial settings", exact: true })
      .focus();
    check(
      await page
        .getByRole("button", { name: "Reset initial settings", exact: true })
        .evaluate((e) => e === document.activeElement),
      "Keyboard access",
    );
    await page.emulateMedia({ reducedMotion: "reduce" });
    if (name !== "circuit")
      check(
        !(await page.locator(".physical-motion-scene").isVisible()),
        "Reduced motion preserves numeric controls without moving illustration",
      );
    await page.emulateMedia({ reducedMotion: "no-preference" });
    if (
      name !== "circuit" &&
      (await page.getByRole("button", { name: "Pause", exact: true }).count())
    )
      await page.getByRole("button", { name: "Pause", exact: true }).click();
    const acceptedBeforeInvalid = await snapshot();
    const invalidLabel =
      name === "pendulum"
        ? "Length (m)"
        : name === "rolling"
          ? "Floor resistance μ"
          : "Number of bulbs";
    const invalidInput = page
      .getByRole("spinbutton", { name: invalidLabel, exact: true })
      .first();
    const acceptedInput = await invalidInput.inputValue();
    await invalidInput.fill(name === "rolling" ? "-1" : "0");
    await invalidInput
      .locator("..")
      .getByRole("button", { name: "Set", exact: true })
      .click();
    check(
      await invalidInput.evaluate((e) => !e.validity.valid),
      "Invalid numeric input is identified",
    );
    check(
      (await snapshot()).context.revision ===
        acceptedBeforeInvalid.context.revision,
      "Invalid control preserves revision",
    );
    await invalidInput.fill(acceptedInput);
    const unsupported =
      name === "pendulum"
        ? "Set the first swing length to zero metres."
        : name === "rolling"
          ? "Set the rough floor resistance to minus one."
          : "Set every bulb resistance to zero ohms.";
    await send(unsupported, false, true);
    const afterInvalid = await snapshot();
    check(
      afterInvalid.context.revision === acceptedBeforeInvalid.context.revision,
      "Unsupported inference preserves revision",
    );
    check(
      JSON.stringify(afterInvalid.state.instances.map((i) => i.parameters)) ===
        JSON.stringify(
          acceptedBeforeInvalid.state.instances.map((i) => i.parameters),
        ),
      "Unsupported inference preserves accepted settings",
    );
    await page.getByRole("button", { name: /Back to the lab/ }).click();
    check(
      (await snapshot()).context === null,
      "Switching home disposes the active experiment",
    );
    await page.getByRole("textbox").fill(config.prompt);
    await page.getByRole("button", { name: /^Create/ }).click();
    await page
      .getByRole("button", { name: /^Stop/ })
      .waitFor({ state: "visible", timeout: 2000 });
    await page.getByRole("button", { name: /^Stop/ }).click();
    await page.waitForTimeout(1500);
    check(
      (await snapshot()).context === null,
      "Cancelled creation cannot commit a session",
    );
    check(
      (await page.getByRole("textbox").inputValue()) === config.prompt,
      "Cancelled prompt remains available",
    );
    check(result.consoleErrors.length === 0, "No browser page errors");
    const failures = result.checks.filter((assertion) => !assertion.passed);
    result.status = failures.length ? "failed" : "passed";
    if (failures.length)
      result.error = failures.map((failure) => failure.label).join("\n");
  } catch (error) {
    result.status = "failed";
    result.error = String(error.stack || error);
    await page
      .screenshot({ path: directory + "/failure.png", fullPage: true })
      .catch(() => {});
  }
  result.finishedAt = new Date().toISOString();
  return result;
};
