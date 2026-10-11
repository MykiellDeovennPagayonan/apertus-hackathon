const assert = require("node:assert/strict");
const h = require("../../generation/helpers.cjs"),
  e = require("./evidence.cjs"),
  { submit } = require("./live-ui.cjs");
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43115";
const tasks = [
  {
    prompt: "ozone",
    allowed: ["atmosphere"],
    expected:
      "Clarify scope or teach a scoped ozone introduction; no uniquely specified depletion claim.",
  },
  {
    prompt: "rainbow",
    allowed: ["rainbow"],
    expected: "A simple optical introduction is reasonable.",
  },
  {
    prompt: "earth layers",
    allowed: ["InsideEarth"],
    expected: "Inside Earth or clarification; do not force atmospheric layers.",
  },
  {
    prompt: "predict tomorrow's earthquake",
    parent: "earthquake-formation",
    expected: "Unsupported prediction; preserve accepted work.",
  },
  {
    prompt: "will a tsunami hit my town today",
    parent: "tsunami-formation",
    expected:
      "No local real-time forecast; preserve work on refusal or explicitly limit to formation.",
  },
  {
    prompt: "greenhouse effect because of the ozone hole",
    allowed: ["greenhouse"],
    expected:
      "Correct the misconception; ozone depletion does not cause the greenhouse effect.",
  },
  {
    prompt: "lightning is two clouds rubbing together right?",
    allowed: ["lightning"],
    expected:
      "Explain ice-particle charging; do not affirm clouds rubbing together.",
  },
  {
    prompt: "simulate all weather on earth accurately",
    expected:
      "Clarify or honestly scope the simplified parcel lesson; no global accuracy claim.",
  },
  {
    prompt: "I meant ozone, not warming",
    parent: "greenhouse-effect",
    allowed: ["atmosphere"],
    expected:
      "Replace the topic only after a valid atmospheric lesson is ready.",
  },
];
(async () => {
  const browser = await h.launch();
  let failures = 0;
  try {
    for (const t of tasks) {
      const run = e.allocate(
        "live-boundary",
        t.parent || t.allowed?.[0] || "scope",
        t.prompt,
      );
      run.record.expected = t.expected;
      const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          reducedMotion: "reduce",
        }),
        page = await context.newPage();
      page.setDefaultTimeout(60000);
      await page.addInitScript(() => {
        const original = window.fetch;
        window.fetch = async (...args) => {
          const r = await original(...args);
          if (new URL(r.url).pathname === "/api/apertus")
            r.clone()
              .text()
              .then(
                (body) =>
                  (window.__earthWire = {
                    id: r.headers.get("X-Request-ID"),
                    contentType: r.headers.get("Content-Type"),
                    body,
                  }),
              )
              .catch(() => {});
          return r;
        };
      });
      try {
        await page.goto(
          base + (t.parent ? "/experiments?experiment=" + t.parent : "/"),
        );
        if (t.parent) await page.locator(".ea-scene").waitFor();
        const before = await h.snapshot(page);
        const { request, result, httpStatus } = await submit(
          page,
          t.prompt,
          Boolean(t.parent),
          run,
        );
        e.write(run.dir, "response.json", result);
        run.record.httpStatus = httpStatus;
        run.record.requestId = request.requestId;
        const diagnostics = await (
          await page.request.get(
            base +
              "/api/planner-diagnostics?id=" +
              encodeURIComponent(request.requestId),
          )
        ).json();
        e.write(run.dir, "diagnostics.json", diagnostics);
        assert.ok(
          result && result.requestId === request.requestId,
          "Correlated result required",
        );
        if (["created", "updated"].includes(result.status)) {
          const document = result.recipe.document,
            model = document.nodes.find(
              (n) =>
                n.definition.startsWith("prefabs/earth-atmosphere/") ||
                n.definition === "prefabs/science/InsideEarth",
            );
          assert.ok(model);
          if (t.allowed)
            assert.ok(
              t.allowed.some((k) => model.definition.endsWith("/" + k)),
              "Wrong topic for boundary request",
            );
          const explanation = [
            result.coverage.explanation,
            document.lesson.explanation,
            ...result.recipe.assumptions,
          ].join(" ");
          if (
            t.prompt.includes("today") ||
            t.prompt.includes("accurately") ||
            t.prompt.includes("predict")
          )
            assert.match(
              explanation,
              /not |cannot|unavailable|simplif|illustrat|no .*forecast|not.*predict/i,
              "Must explain capability limit",
            );
          if (t.prompt.includes("because of"))
            assert.doesNotMatch(
              document.lesson.explanation,
              /ozone (?:hole|depletion) (?:causes|creates|drives) (?:the )?greenhouse/i,
            );
          if (t.prompt.includes("rubbing"))
            assert.doesNotMatch(
              document.lesson.explanation,
              /lightning (?:forms|is caused) (?:when|by) (?:two )?clouds rub/i,
            );
          await page.locator(".ea-scene,[data-science]").first().waitFor();
        } else if (result.status === "runtime_action") {
          assert.fail(
            "This boundary request requires a scoped lesson, clarification or refusal, not an unrelated runtime command",
          );
        } else if (before)
          assert.deepEqual(
            (await h.snapshot(page)).recipe,
            before.recipe,
            "Rejected request preserves accepted lesson",
          );
        await e.capture(page, run, "02-boundary-result");
        run.record.resultStatus = result.status;
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
        t.prompt,
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
