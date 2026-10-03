/** Executed by the official Playwright MCP browser_run_code_unsafe tool, never by a CLI browser. */
module.exports = async function scenario(
  page,
  { name, width, directory, baseUrl },
) {
  const configs = {
    division: "Show me how division works",
    ball: "Show me how throwing a ball works",
    gas: "Show me how gas pressure works",
  };
  const evidence = {
    name,
    width,
    startedAt: new Date().toISOString(),
    status: "running",
    requests: [],
    states: [],
    numerical: [],
    consoleErrors: [],
    networkFailures: [],
    screenshots: [],
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const same = (a, b, label) =>
    assert(JSON.stringify(a) === JSON.stringify(b), label);
  const near = (label, actual, expected, tolerance, relative = false) => {
    const error = Math.abs(actual - expected),
      permitted = relative ? tolerance * Math.abs(expected) : tolerance;
    evidence.numerical.push({
      label,
      actual,
      expected,
      absoluteError: error,
      relativeError: expected ? error / Math.abs(expected) : null,
      tolerance,
      relative,
      passed: error <= permitted,
    });
    assert(error <= permitted, `${label}: ${actual} differs from ${expected}`);
  };
  const snapshot = () => page.evaluate(() => window.__experimentSnapshot());
  const capture = async (label) => {
    const state = await snapshot();
    evidence.states.push({ label, snapshot: state });
    const filename = `${directory}/${evidence.states.length}-${label.replaceAll(/[^a-z0-9]+/gi, "-")}.png`;
    await page.screenshot({ path: filename, fullPage: true });
    evidence.screenshots.push(filename);
    return state.state;
  };
  const send = async (prompt) => {
    const start = Date.now();
    const pending = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/apertus") && r.request().method() === "POST",
      { timeout: 125000 },
    );
    await page.getByRole("textbox").fill(prompt);
    await page.getByRole("button", { name: "Send", exact: true }).click();
    const response = await pending,
      plan = await response.json(),
      id = response.headers()["x-request-id"];
    const request = {
      prompt,
      id,
      status: response.status(),
      elapsedMs: Date.now() - start,
      plan,
    };
    evidence.requests.push(request);
    if (id) {
      const diagnostic = await page.request.get(
        `${baseUrl}/api/planner-diagnostics?id=${id}`,
      );
      request.inference = await diagnostic.json();
    }
    assert(response.ok(), JSON.stringify(plan));
    assert(
      !["clarify", "unsupported"].includes(plan.operation),
      JSON.stringify(plan),
    );
    await page.waitForFunction(
      () => !document.querySelector('button[aria-label="Send"]')?.disabled,
    );
    assert(
      !(await page.getByText(/No changes applied/).count()),
      "Runtime rejected plan",
    );
    return plan;
  };
  const slider = async (label, value, min, step) => {
    const control = page.getByRole("slider", { name: label, exact: true });
    await control.focus();
    await control.press("Home");
    for (let i = 0; i < Math.round((value - min) / step); i++)
      await control.press("ArrowRight");
  };
  const reset = () =>
    page.getByRole("button", { name: "Reset", exact: true }).click();
  const share = async () => {
    await page.getByRole("button", { name: "Share", exact: true }).click();
    await page
      .getByRole("status")
      .filter({ hasText: "Sharing complete" })
      .waitFor({ timeout: 30000 });
    // The status reflects mathematical completion; let the final token's
    // presentation transition settle before recording visual evidence.
    await page.waitForTimeout(400);
  };
  const grouping = (s, counts, remainder) => {
    same(
      counts.map((_, i) => s.board.tokens.filter((t) => t.zone === i).length),
      counts,
      "Incorrect basket counts",
    );
    assert(
      s.board.tokens.filter((t) => t.zone < 0).length === remainder,
      "Incorrect leftover count",
    );
    assert(
      s.board.tokens.length === s.board.total,
      "Counter conservation failed",
    );
  };
  const ballOracle = (s) => {
    for (const [i, b] of s.instances.entries()) {
      const radians = (b.launch.angle * Math.PI) / 180,
        v = b.launch.velocity,
        g = b.gravity;
      near(
        `ball ${i + 1} range`,
        b.metrics.range,
        (v * v * Math.sin(2 * radians)) / g,
        0.001,
      );
      near(
        `ball ${i + 1} height`,
        b.metrics.maxHeight,
        (v * v * Math.sin(radians) ** 2) / (2 * g),
        0.001,
      );
      near(
        `ball ${i + 1} duration`,
        b.metrics.duration,
        (2 * v * Math.sin(radians)) / g,
        0.001,
      );
    }
  };
  page.on("pageerror", (e) => evidence.consoleErrors.push(e.message));
  page.on("console", (m) => {
    if (m.type() === "error") evidence.consoleErrors.push(m.text());
  });
  page.on("requestfailed", (r) =>
    evidence.networkFailures.push({
      url: r.url().split("?")[0],
      error: r.failure()?.errorText,
    }),
  );
  try {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 900 });
    await page.goto(`${baseUrl}/experiments`);
    await send(configs[name]);
    await page.getByRole("button", { name: "Reset", exact: true }).waitFor();
    let s = await capture("initial");
    const initial = await snapshot();
    assert(
      initial.correlationId === evidence.requests[0].id,
      "Missing runtime/request correlation",
    );
    const events = evidence.requests[0].inference.events;
    assert(
      events.some((e) => e.event === "intent.response"),
      "Missing live Apertus teaching response",
    );
    assert(
      events.some((e) => e.event === "layaSelection" && e.data.decision),
      "Missing accepted Laya selection",
    );
    assert(
      events.some((e) => e.event === "configuration.response"),
      "Missing live Apertus configuration",
    );
    assert(
      events.some((e) => e.event === "stagedValidation" && e.data.accepted),
      "Missing staged validation",
    );
    if (name === "division") {
      assert(
        s.board.total === 12 &&
          s.board.groups === 3 &&
          !s.board.sequence.looping,
        "Wrong division defaults",
      );
      await share();
      s = await capture("12-shared");
      grouping(s, [4, 4, 4], 0);
      assert(
        await page.getByText("12 ÷ 3 = 4", { exact: true }).isVisible(),
        "Missing equation",
      );
      await send("What about leftovers?");
      assert(
        (await snapshot()).state.board.total === 14,
        "Leftovers must configure 14 counters",
      );
      await share();
      s = await capture("14-shared");
      grouping(s, [4, 4, 4], 2);
      await page.getByRole("button", { name: "Replay", exact: true }).click();
      await page
        .getByRole("status")
        .filter({ hasText: "Sharing complete" })
        .waitFor({ timeout: 30000 });
      await page.waitForTimeout(400);
      grouping((await snapshot()).state, [4, 4, 4], 2);
      const input = page.getByRole("spinbutton", {
        name: "Counters",
        exact: true,
      });
      await input.fill("15");
      await input.press("Enter");
      await share();
      s = await capture("15-shared");
      grouping(s, [5, 5, 5], 0);
      await reset();
      s = await capture("reset");
      assert(
        s.board.total === 12 &&
          s.board.groups === 3 &&
          s.board.sequence.cursor === 0,
        "Wrong division reset",
      );
    } else if (name === "ball") {
      assert(
        s.angle === 45 &&
          s.velocity === 20 &&
          s.gravity === 9.81 &&
          s.instances.length === 1,
        "Wrong ball defaults",
      );
      ballOracle(s);
      await page.waitForFunction(
        () => window.__experimentSnapshot().state.primary.elapsed > 0,
      );
      await page.waitForFunction(() => {
        const s = window.__experimentSnapshot().state;
        return s.primary.elapsed >= s.primary.metrics.duration;
      });
      assert(
        (await page.locator(".projectile-scene polyline").count()) > 0,
        "Completed trajectory disappeared",
      );
      await slider("Angle", 30, 0, 1);
      s = await capture("30-degrees");
      assert(s.angle === 30, "Angle control failed");
      ballOracle(s);
      await send("Compare 30 and 60 degrees.");
      s = await capture("comparison");
      assert(s.instances.length === 2, "Comparison missing");
      same(
        s.instances.map((i) => i.launch.angle),
        [30, 60],
        "Comparison angles wrong",
      );
      near(
        "equal ranges",
        s.instances[0].metrics.range,
        s.instances[1].metrics.range,
        0.001,
      );
      ballOracle(s);
      await send("Change only the second ball to 45 degrees.");
      s = await capture("second-only");
      same(
        s.instances.map((i) => i.launch.angle),
        [30, 45],
        "Wrong target changed",
      );
      assert(
        s.instances.every(
          (i) => i.launch.velocity === 20 && i.gravity === 9.81,
        ),
        "Independent inputs changed",
      );
      ballOracle(s);
      await reset();
      s = await capture("reset");
      assert(
        s.instances.length === 1 && s.angle === 45 && s.velocity === 20,
        "Wrong ball reset",
      );
    } else {
      same(
        s.inputs,
        { amount: 1, temperature: 300, volume: 1, playing: true },
        "Wrong gas defaults",
      );
      near(
        "baseline pressure",
        s.metrics.pressureKPa,
        2.4943387854,
        0.000001,
        true,
      );
      await page.waitForFunction(
        (p) =>
          JSON.stringify(window.__experimentSnapshot().state.particles) !== p,
        JSON.stringify(s.particles),
      );
      await slider("Volume", 0.5, 0.25, 0.05);
      s = await capture("half-volume");
      near(
        "half volume pressure",
        s.metrics.pressureKPa,
        4.9886775708,
        0.000001,
        true,
      );
      assert(
        s.inputs.temperature === 300 && s.inputs.amount === 1,
        "Held-fixed inputs changed",
      );
      await reset();
      await send("Heat it up.");
      s = await capture("350-K");
      assert(
        s.inputs.temperature === 350 &&
          s.inputs.volume === 1 &&
          s.inputs.amount === 1,
        "Heating policy failed",
      );
      near(
        "heated pressure",
        s.metrics.pressureKPa,
        2.9100619163,
        0.000001,
        true,
      );
      await reset();
      await send("Add more gas.");
      s = await capture("1-5-mmol");
      assert(
        s.inputs.amount === 1.5 &&
          s.inputs.temperature === 300 &&
          s.inputs.volume === 1,
        "Amount policy failed",
      );
      near(
        "added gas pressure",
        s.metrics.pressureKPa,
        3.7415081781,
        0.000001,
        true,
      );
      await page
        .getByRole("button", { name: "Pause motion", exact: true })
        .click();
      const positions = (await snapshot()).state.particles;
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      same(
        (await snapshot()).state.particles,
        positions,
        "Paused particles moved",
      );
      await slider("Volume", 0.5, 0.25, 0.05);
      s = await capture("paused-volume");
      near(
        "paused pressure",
        s.metrics.pressureKPa,
        7.4830163562,
        0.000001,
        true,
      );
      same(
        s.particles,
        positions,
        "Volume changed normalized positions while paused",
      );
      assert(
        s.particles.every((p) => p.x >= 0 && p.x <= 1 && p.y >= 0 && p.y <= 1),
        "Particles escaped",
      );
      // Record a single pressure-increasing edit immediately before asking why.
      await page
        .getByRole("slider", { name: "Volume", exact: true })
        .press("ArrowLeft");
      const explanatory = await snapshot();
      const plan = await send("Why did the pressure increase?");
      assert(plan.operation === "explain", "Explanation mutated state");
      same(
        (await snapshot()).state.inputs,
        explanatory.state.inputs,
        "Explanation changed inputs",
      );
      evidence.explanation = {
        text: plan.message,
        recentChange: explanatory.context.recentChange,
      };
      assert(
        /volum|smaller|compress/i.test(plan.message),
        "Explanation does not refer to volume change",
      );
      assert(
        /temperature/i.test(plan.message) &&
          /amount|gas|moles/i.test(plan.message),
        "Explanation misses held-fixed inputs",
      );
      await reset();
      s = await capture("reset");
      same(
        s.inputs,
        { amount: 1, temperature: 300, volume: 1, playing: true },
        "Wrong gas reset",
      );
      await page.emulateMedia({ reducedMotion: "reduce" });
      const still = (await snapshot()).state.particles;
      await page.evaluate(
        () =>
          new Promise((resolve) =>
            requestAnimationFrame(() => requestAnimationFrame(resolve)),
          ),
      );
      same(
        (await snapshot()).state.particles,
        still,
        "Reduced-motion particles moved",
      );
      await page
        .getByRole("slider", { name: "Volume", exact: true })
        .press("ArrowLeft");
      assert(
        (await snapshot()).state.metrics.pressureKPa > s.metrics.pressureKPa,
        "Reduced-motion inputs stopped working",
      );
    }
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      )),
      "Horizontal page overflow",
    );
    assert(evidence.consoleErrors.length === 0, "Browser console errors");
    assert(evidence.networkFailures.length === 0, "Network failures");
    await page
      .getByRole("button", { name: "← Experiments", exact: true })
      .click();
    await page
      .getByRole("textbox", {
        name: "What would you like to explore?",
        exact: true,
      })
      .waitFor();
    assert((await snapshot()).context === null, "Session not disposed");
    evidence.status = "passed";
  } catch (error) {
    evidence.status = "failed";
    evidence.error = String(error.stack || error);
    await page.screenshot({ path: `${directory}/failure.png`, fullPage: true });
  } finally {
    evidence.finishedAt = new Date().toISOString();
  }
  return evidence;
};
