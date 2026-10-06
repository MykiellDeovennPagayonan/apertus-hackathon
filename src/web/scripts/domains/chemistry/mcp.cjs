// Direct client of the official Playwright MCP server. Every browser action goes through MCP.
// No inference interception, model fixtures, or authoritative state injection.
const fs = require("node:fs");
const path = require("node:path");
const { createRequire } = require("node:module");
const root = process.env.CHEMISTRY_MCP_ROOT || "/private/tmp/apertus-005-mcp";
const mcpRequire = createRequire(path.join(root, "package.json"));
const { Client } = mcpRequire("@modelcontextprotocol/sdk/client/index.js");
const { StdioClientTransport } = mcpRequire(
  "@modelcontextprotocol/sdk/client/stdio.js",
);
const outputDir =
  process.env.CHEMISTRY_RAW_DIR || "/private/tmp/chemistry-mcp-attempt001";
const base = process.env.CHEMISTRY_BASE_URL || "http://localhost:43112";
const canonicalCases = [
  {
    id: "DIL-001",
    provider: "Dilution",
    prompt: "What happens to salt water when I add more water?",
    followup: "Add another litre of water.",
  },
  {
    id: "CHEM-001",
    provider: "Conservation",
    prompt: "Help me see why chemical equations need balancing.",
    followup: "Balance it.",
  },
  {
    id: "RATE-001",
    provider: "ReactionRate",
    prompt: "Why do reactions happen faster when it’s warmer?",
    followup: "Compare it at 320 kelvin.",
  },
];
const cases =
  process.env.CHEMISTRY_VARIANTS === "true"
    ? [
        {
          ...canonicalCases[0],
          variant: "typo",
          prompt: "What happens to salt water when I add mor water?",
        },
        {
          ...canonicalCases[1],
          variant: "typo",
          prompt: "Help me see why chemical equatons need balancing.",
        },
        {
          ...canonicalCases[2],
          variant: "punctuation",
          prompt: "Why do reactions happen faster when it's warmer?",
        },
        {
          ...canonicalCases[1],
          variant: "registered-reaction",
          reactionId: "carbonDioxide",
          prompt: "Help me balance carbon plus oxygen into carbon dioxide.",
        },
        {
          ...canonicalCases[2],
          variant: "two-independent-runs",
          count: 2,
          prompt:
            "Compare two independent runs of A to B: first at 300 kelvin, second at 320 kelvin.",
          followup: "Make the second run 350 kelvin.",
        },
      ]
    : canonicalCases;
fs.mkdirSync(outputDir, { recursive: true });
const report = {
  transport: "Playwright MCP stdio",
  serverVersion: mcpRequire("@playwright/mcp/package.json").version,
  qualifying: false,
  scope:
    "Agent C development browser inspection, not a complete frozen fifteen-prompt round",
  startedAt: new Date().toISOString(),
  feedbackBudgetMs: 3000,
  requestBudgetMs: 190000,
  cases: [],
};

async function inspect(page, c, base, rawDir, width) {
  const record = {
    id: c.id,
    variant: c.variant ?? "canonical",
    width,
    requests: [],
    assertions: [],
    errors: [],
    result: "running",
  };
  const assert = (condition, message) => {
    if (!condition) throw new Error(message);
  };
  const near = (a, b) =>
    assert(Math.abs(a - b) <= 1e-9 + 1e-6 * Math.abs(b), `${a} != ${b}`);
  page.on("pageerror", (e) => record.errors.push(e.message));
  const snapshot = () => page.evaluate(() => window.__experimentSnapshot());
  const send = async (prompt, expectedOperations = ["create", "edit"]) => {
    const input = page.locator(".command-bar__input");
    await input.fill(prompt);
    const pending = page.waitForResponse(
      (r) =>
        r.url().endsWith("/api/apertus") && r.request().method() === "POST",
      { timeout: 190000 },
    );
    pending.catch(() => {});
    const started = Date.now();
    await page.locator(".command-bar__send").click();
    await page.locator(".command-bar__stop").waitFor({ timeout: 3000 });
    const feedbackLatencyMs = Date.now() - started;
    const response = await pending,
      payload = await response.json(),
      id = response.headers()["x-request-id"];
    const request = {
      prompt,
      submittedAt: new Date(started).toISOString(),
      latencyMs: Date.now() - started,
      feedbackLatencyMs,
      status: response.status(),
      correlationId: id,
      operation: payload.operation,
    };
    record.requests.push(request);
    if (id) {
      const result = await page.request.get(
        `${base}/api/planner-diagnostics?id=${encodeURIComponent(id)}`,
      );
      if (result.ok()) {
        const trace = await result.json();
        request.configuration = trace.configuration;
        request.events = trace.events.map((e) => ({
          event: e.event,
          elapsedMs: e.elapsedMs,
          ...(e.data?.model ? { model: e.data.model } : {}),
          ...(e.data?.attempt !== undefined ? { attempt: e.data.attempt } : {}),
          ...(e.data?.reason ? { reason: e.data.reason } : {}),
          ...(e.data?.supplied && e.data?.canonical
            ? { supplied: e.data.supplied, canonical: e.data.canonical }
            : {}),
        }));
        request.selections = trace.events
          .filter((e) => /^(?:edit\.)?layaSelection$/.test(e.event))
          .map((e) => e.data);
        request.intent = trace.events.find(
          (e) => e.event === "teachingIntent",
        )?.data;
      }
    }
    assert(response.status() === 200, JSON.stringify(payload));
    assert(
      expectedOperations.includes(payload.operation),
      JSON.stringify(payload),
    );
    await page.locator(".chemistry-experiment").first().waitFor();
    await page.waitForTimeout(250);
    const s = await snapshot();
    request.committedRevision = s.context.revision;
    request.recipe = s.recipe.assembly;
    request.observedState = s.state.instances.map((instance) => ({
      id: instance.id,
      provider: instance.provider,
      outputs: Object.fromEntries(
        Object.entries(instance.outputs).filter(
          ([name, value]) => !Array.isArray(value) || name === "atoms",
        ),
      ),
    }));
    if (payload.operation === "create") {
      for (const expected of [
        "teachingIntent",
        "layaSelection",
        "configuration",
        "stagedValidation",
      ])
        assert(
          request.events?.some((e) => e.event === expected),
          `Missing ${expected}`,
        );
      assert(
        request.selections?.some(
          (e) =>
            e.question === "assembly" &&
            e.decision?.choice === `prefabs/chemistry/${c.provider}`,
        ),
        "Laya did not accept the expected registered provider",
      );
    }
    return s.state.instances[0].outputs;
  };
  try {
    await page.goto(`${base}/`, { timeout: 90000 });
    await page.waitForFunction(
      () => typeof window.__experimentSnapshot === "function",
    );
    let o = await send(c.prompt);
    const initial = await snapshot();
    assert(
      initial.state.instances.length === (c.count ?? 1),
      "Wrong requested independent object count",
    );
    assert(
      initial.state.instances[0].provider === `prefabs/chemistry/${c.provider}`,
      "Wrong provider",
    );
    if (c.id === "DIL-001") {
      near(o.saltMass, 10);
      near(o.volume, 1);
      near(o.concentration, 10);
    }
    if (c.id === "CHEM-001") {
      assert(
        o.equation ===
          (c.reactionId === "carbonDioxide" ? "C + O₂ → CO₂" : "H₂ + O₂ → H₂O"),
        "Wrong initial equation",
      );
      assert(
        o.balanced === (c.reactionId === "carbonDioxide"),
        "Wrong initial balance status",
      );
    }
    if (c.id === "RATE-001") {
      near(o.temperature, 300);
      near(o.rateConstant, 0.1);
      near(o.halfLife, 6.931471805599453);
      assert(o.playing === false, "Must start paused");
      if (c.count === 2)
        near(initial.state.instances[1].outputs.temperature, 320);
    }
    await page.screenshot({
      path: `${rawDir}/${c.id}-${c.variant ?? "canonical"}-${width}-initial.png`,
      fullPage: true,
    });
    record.assertions.push(
      "Fresh Apertus intent/configuration + real accepted Laya selection; committed recipe; defaults",
    );
    o = await send(c.followup);
    if (c.id === "DIL-001") {
      near(o.saltMass, 10);
      near(o.volume, 2);
      near(o.concentration, 5);
    }
    if (c.id === "CHEM-001") {
      assert(
        o.equation ===
          (c.reactionId === "carbonDioxide"
            ? "C + O₂ → CO₂"
            : "2H₂ + O₂ → 2H₂O") && o.balanced,
        "Wrong water balance",
      );
      assert(
        JSON.stringify(o.atoms.map((a) => [a.element, a.left, a.right])) ===
          JSON.stringify(
            c.reactionId === "carbonDioxide"
              ? [
                  ["C", 1, 1],
                  ["O", 2, 2],
                ]
              : [
                  ["H", 4, 4],
                  ["O", 2, 2],
                ],
          ),
        "Wrong atom counts",
      );
    }
    if (c.id === "RATE-001") {
      near(o.temperature, c.count === 2 ? 300 : 320);
      near(o.rateConstant, c.count === 2 ? 0.1 : 0.2724610262406092);
      near(o.halfLife, c.count === 2 ? 6.931471805599453 : 2.5440232319606326);
      near(o.elapsed, 0);
      near(o.concentrationA + o.concentrationB, 1);
      if (c.count === 2)
        near((await snapshot()).state.instances[1].outputs.temperature, 350);
    }
    record.assertions.push(
      "Exact live follow-up; independent numerical oracle",
    );
    await page.screenshot({
      path: `${rawDir}/${c.id}-${c.variant ?? "canonical"}-${width}-followup.png`,
      fullPage: true,
    });
    const root = page.locator(".chemistry-experiment").first();
    const number = root.locator('input[type="number"]').first();
    if (c.id === "DIL-001") {
      await root
        .getByRole("button", { name: "Add 1 L of water", exact: true })
        .click();
      near((await snapshot()).state.instances[0].outputs.volume, 3);
      await number.fill("2");
      await root.getByRole("button", { name: "Apply", exact: true }).click();
      near((await snapshot()).state.instances[0].outputs.volume, 5);
      near((await snapshot()).state.instances[0].outputs.concentration, 2);
    }
    if (c.id === "CHEM-001") {
      await number.fill("3");
      await number.press("Tab");
      assert(
        !(await snapshot()).state.instances[0].outputs.balanced,
        "Valid coefficient edit must allow an unbalanced equation",
      );
      await root
        .getByRole("button", { name: "Balance it", exact: true })
        .click();
      assert(
        (await snapshot()).state.instances[0].outputs.balanced,
        "Balance button failed",
      );
    }
    if (c.id === "RATE-001") {
      await number.fill("310");
      await root.getByRole("button", { name: "Apply", exact: true }).click();
      near((await snapshot()).state.instances[0].outputs.temperature, 310);
      near((await snapshot()).state.instances[0].outputs.elapsed, 0);
      await root
        .getByRole("button", {
          name: "Compare from the start at 320 K",
          exact: true,
        })
        .click();
      near((await snapshot()).state.instances[0].outputs.temperature, 320);
      if (c.count === 2)
        near((await snapshot()).state.instances[1].outputs.temperature, 350);
    }
    record.assertions.push(
      "Primary button and valid numeric controls update the authoritative model; independent targets are preserved",
    );
    const beforeInvalid = await snapshot();
    await number.fill("0");
    if (c.id !== "CHEM-001")
      await root.getByRole("button", { name: "Apply", exact: true }).click();
    assert(
      JSON.stringify((await snapshot()).state.instances) ===
        JSON.stringify(beforeInvalid.state.instances),
      "Invalid input changed accepted state",
    );
    record.assertions.push("Invalid numeric UI input preserves accepted state");
    if (c.id === "RATE-001") {
      await root.getByRole("button", { name: "Step 1 s", exact: true }).click();
      near((await snapshot()).state.instances[0].outputs.elapsed, 1);
      await root.getByRole("button", { name: "Play", exact: true }).click();
      await page.waitForTimeout(500);
      await root.getByRole("button", { name: "Pause", exact: true }).click();
      const paused = (await snapshot()).state.instances[0].outputs.elapsed;
      assert(paused > 1, "Shared clock did not advance");
      await page.waitForTimeout(250);
      near((await snapshot()).state.instances[0].outputs.elapsed, paused);
      await root
        .getByRole("button", { name: "Run again", exact: true })
        .click();
      near((await snapshot()).state.instances[0].outputs.elapsed, 0);
      record.assertions.push(
        "Reduced-motion step, play/pause, frozen paused time and current-setting restart",
      );
    }
    const reset = root.getByRole("button", {
      name: "Reset experiment",
      exact: true,
    });
    await reset.click();
    const restored = await snapshot();
    assert(
      JSON.stringify(restored.state.instances) ===
        JSON.stringify(restored.state.initial),
      "Reset failed",
    );
    await reset.focus();
    await page.keyboard.press("Tab");
    assert(
      ["INPUT", "BUTTON", "SUMMARY", "TEXTAREA", "A"].includes(
        await page.evaluate(() => document.activeElement.tagName),
      ),
      "Keyboard focus lost",
    );
    assert(
      !(await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth + 1,
      )),
      "Horizontal overflow",
    );
    assert(
      (await root
        .locator("button, input")
        .evaluateAll(
          (els) =>
            els.filter((el) => el.getBoundingClientRect().height < 44).length,
        )) === 0,
      "Touch targets under 44px",
    );
    await root.getByText("Model assumptions", { exact: true }).click();
    await root.locator("details[open] p").last().scrollIntoViewIfNeeded();
    assert(
      await root.locator("details[open] p").last().isVisible(),
      "Model assumptions are inaccessible",
    );
    await page.screenshot({
      path: `${rawDir}/${c.id}-${c.variant ?? "canonical"}-${width}-assumptions.png`,
      fullPage: true,
    });
    assert(record.errors.length === 0, record.errors.join("; "));
    record.assertions.push(
      "Reset, keyboard access, assumptions, 44px targets, no page overflow/errors",
    );
    if (!c.variant) {
      const accepted = await snapshot();
      await send("Give this simulation a quantum tunneling solver.", [
        "unsupported",
        "clarify",
      ]);
      assert(
        JSON.stringify((await snapshot()).state.instances) ===
          JSON.stringify(accepted.state.instances),
        "Unsupported follow-up replaced the accepted state",
      );
      await page.getByRole("button", { name: /Back to the lab/ }).click();
      assert(
        (await snapshot()).context === null,
        "Switching away did not dispose the session",
      );
      await send(c.prompt);
      const repeated = await snapshot();
      assert(
        repeated.context.sessionId !== initial.context.sessionId,
        "Repeated creation reused a disposed session",
      );
      assert(
        repeated.state.instances.length === 1,
        "Repeated submission created duplicate instances",
      );
      await page.getByRole("button", { name: /Back to the lab/ }).click();
      await page.locator(".command-bar__input").fill(c.prompt);
      await page.locator(".command-bar__send").click();
      await page.locator(".command-bar__stop").waitFor({ timeout: 3000 });
      await page.locator(".command-bar__stop").click();
      await page.waitForTimeout(1000);
      assert(
        (await snapshot()).context === null,
        "Cancelled creation committed a session",
      );
      assert(
        (await page.locator(".command-bar__input").inputValue()) === c.prompt,
        "Cancellation lost the submitted prompt",
      );
      record.assertions.push(
        "Unsupported follow-up preserves state; switch-away disposal; repeated fresh creation; cancellation preserves prompt and cannot activate a scene",
      );
    }
    record.result = "passed";
  } catch (error) {
    record.result = "failed";
    record.error = error.message;
    await page
      .screenshot({
        path: `${rawDir}/${c.id}-${c.variant ?? "canonical"}-${width}-failure.png`,
        fullPage: true,
      })
      .catch(() => {});
  }
  return record;
}

(async () => {
  for (const width of process.env.CHEMISTRY_WIDTH
    ? [Number(process.env.CHEMISTRY_WIDTH)]
    : [1440, 390]) {
    for (const c of cases.filter(
      (c) => !process.env.CHEMISTRY_CASE || c.id === process.env.CHEMISTRY_CASE,
    )) {
      const session = `agent-c-${c.id}-${width}-${Date.now()}`;
      const client = new Client({ name: session, version: "1" });
      try {
        await client.connect(
          new StdioClientTransport({
            command: process.execPath,
            args: [
              path.join(root, "node_modules/@playwright/mcp/cli.js"),
              "--headless",
              "--isolated",
              "--executable-path",
              "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
              "--output-dir",
              outputDir,
            ],
            stderr: "pipe",
          }),
        );
        const discovered = await client.listTools();
        for (const name of [
          "browser_run_code_unsafe",
          "browser_resize",
          "browser_emulate_media",
          "browser_console_messages",
          "browser_network_requests",
        ])
          if (!discovered.tools.some((t) => t.name === name))
            throw new Error(`MCP does not expose ${name}`);
        const call = (name, args) =>
          client.callTool({ name, arguments: args }, undefined, {
            timeout: 240000,
          });
        await call("browser_resize", {
          width,
          height: width === 390 ? 844 : 900,
        });
        await call("browser_emulate_media", { reducedMotion: "reduce" });
        console.log(`MCP ${c.id} ${width}: exact creation and follow-up`);
        const code = `async (page) => (${inspect.toString()})(page, ${JSON.stringify(c)}, ${JSON.stringify(base)}, ${JSON.stringify(outputDir)}, ${width})`;
        const result = await call("browser_run_code_unsafe", { code });
        const text = result.content
          .filter((b) => b.type === "text")
          .map((b) => b.text)
          .join("\n");
        fs.writeFileSync(path.join(outputDir, `${session}.txt`), text);
        const match = text.match(/### Result\s*\n([\s\S]*?)(?=\n### |$)/);
        const record = match
          ? JSON.parse(match[1])
          : { id: c.id, width, result: "failed", error: text.slice(0, 1000) };
        record.session = session;
        record.console = await call("browser_console_messages", {
          level: "error",
        });
        record.network = await call("browser_network_requests", {
          static: false,
          filter: "/api/",
        });
        report.cases.push(record);
        console.log(
          `MCP ${c.id} ${width}: ${record.result}${record.error ? `: ${record.error}` : ""}`,
        );
      } catch (error) {
        report.cases.push({
          id: c.id,
          width,
          session,
          result: "failed",
          error: error.message,
        });
        console.log(`MCP ${c.id} ${width}: failed: ${error.message}`);
      } finally {
        await client.close();
        fs.writeFileSync(
          path.join(outputDir, "report.json"),
          JSON.stringify(report, null, 2),
        );
      }
    }
  }
  if (report.cases.some((c) => c.result !== "passed")) process.exitCode = 1;
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
