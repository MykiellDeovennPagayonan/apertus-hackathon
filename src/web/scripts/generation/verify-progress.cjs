const assert = require("node:assert/strict");
const { load } = require("../test-loader.cjs");
const planner = load("src/lib/planner/index.ts");
const { POST } = load("src/app/api/apertus/route.ts");
const { requestGeneration } = load("src/lib/planner/browser.ts");
const { progressFromTrace } = load("src/lib/planner/progress.ts");
const { PlannerError } = load("src/lib/planner/errors.ts");
const input = {
  protocolVersion: 1,
  requestId: "progress-test",
  prompt: "Explore area",
  viewport: { width: 1280, height: 900 },
  active: null,
};
const result = {
  protocolVersion: 1,
  requestId: input.requestId,
  status: "unsupported",
  message: "Try another activity.",
};
const originalPlan = planner.planPrompt;
const originalFetch = global.fetch;
const request = (stream = true) =>
  new Request("http://localhost/api/apertus", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(stream ? { Accept: "application/x-ndjson" } : {}),
    },
    body: JSON.stringify(input),
  });
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
(async () => {
  try {
    assert.equal(
      progressFromTrace("stage", { task: "teaching_intent" }),
      "understanding",
    );
    assert.equal(progressFromTrace("turn.start", {}), "building");
    assert.equal(
      progressFromTrace("turn_2.semanticFailure", { content: "private" }),
      "adjusting",
    );
    assert.equal(progressFromTrace("inference", { content: "private" }), null);
    const gate = deferred();
    planner.planPrompt = async (_input, _signal, trace) => {
      trace("stage", { task: "teaching_intent", prompt: "private" });
      trace("stage", { task: "teaching_intent" });
      await gate.promise;
      trace("selection.start", {});
      trace("stage", { task: "configure_selected_recipe" });
      trace("validation.start", {});
      return result;
    };
    const response = await POST(request());
    assert.match(response.headers.get("Content-Type"), /ndjson/);
    const reader = response.body.getReader();
    assert.deepEqual(
      JSON.parse(new TextDecoder().decode((await reader.read()).value)),
      { type: "progress", requestId: input.requestId, stage: "understanding" },
    );
    gate.resolve();
    let remaining = "";
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      remaining += new TextDecoder().decode(chunk.value);
    }
    const events = remaining.trim().split("\n").map(JSON.parse);
    assert.deepEqual(
      events.filter((e) => e.type === "progress").map((e) => e.stage),
      ["choosing", "building", "checking"],
    );
    assert.deepEqual(events.at(-1).result, result);
    assert.ok(!remaining.includes("private"));
    const entered = deferred();
    planner.planPrompt = async (_input, signal, trace) => {
      trace("turn.start", {});
      entered.resolve(signal);
      await new Promise((resolve) =>
        signal.addEventListener("abort", resolve, { once: true }),
      );
      throw new PlannerError("Request cancelled.", 499);
    };
    const cancelResponse = await POST(request());
    const signal = await entered.promise;
    await cancelResponse.body.cancel();
    assert.ok(signal.aborted);
    planner.planPrompt = async () => {
      throw new PlannerError("Planner timed out.", 504);
    };
    const failed = await POST(request());
    const failure = JSON.parse((await failed.text()).trim()).result;
    assert.equal(failure.status, "failed");
    assert.equal(failure.retryable, true);
    planner.planPrompt = async () => result;
    assert.deepEqual(await (await POST(request(false))).json(), result);
    assert.equal(
      (
        await POST(
          new Request("http://localhost/api/apertus", {
            method: "POST",
            body: "bad",
          }),
        )
      ).status,
      400,
    );
    const encoder = new TextEncoder();
    const streamed = (events) => {
      const bytes = encoder.encode(
        events.map((e) => JSON.stringify(e)).join("\n"),
      );
      return new Response(
        new ReadableStream({
          start(controller) {
            for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
            controller.close();
          },
        }),
        {
          headers: {
            "Content-Type": "application/x-ndjson",
            "X-Request-ID": input.requestId,
          },
        },
      );
    };
    const terminal = { ...result, message: "Try café activities." };
    const progress = {
      type: "progress",
      requestId: input.requestId,
      stage: "building",
    };
    global.fetch = async (_url, options) => {
      assert.equal(options.headers.Accept, "application/x-ndjson");
      return streamed([
        progress,
        { type: "result", requestId: input.requestId, result: terminal },
      ]);
    };
    const seen = [];
    assert.deepEqual(
      await requestGeneration(
        input,
        new AbortController().signal,
        undefined,
        (stage) => seen.push(stage),
      ),
      terminal,
    );
    assert.deepEqual(seen, ["building"]);
    global.fetch = async () => streamed([progress]);
    await assert.rejects(
      requestGeneration(
        input,
        new AbortController().signal,
        undefined,
        () => {},
      ),
      /ended before/,
    );
    global.fetch = async () => streamed([{ ...progress, requestId: "wrong" }]);
    await assert.rejects(
      requestGeneration(
        input,
        new AbortController().signal,
        undefined,
        () => {},
      ),
      /correlation/,
    );
    global.fetch = async () =>
      streamed([{ ...progress, stage: "private-internals" }]);
    await assert.rejects(
      requestGeneration(
        input,
        new AbortController().signal,
        undefined,
        () => {},
      ),
      /Invalid generation progress/,
    );
    global.fetch = async () =>
      Response.json(result, { headers: { "X-Request-ID": input.requestId } });
    assert.deepEqual(
      await requestGeneration(
        input,
        new AbortController().signal,
        undefined,
        () => {},
      ),
      result,
    );
    console.log(
      "Generation progress passed: live delivery, deduplication, cancellation, errors, JSON compatibility, fragmented UTF-8, correlation and truncated streams.",
    );
  } finally {
    planner.planPrompt = originalPlan;
    global.fetch = originalFetch;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
