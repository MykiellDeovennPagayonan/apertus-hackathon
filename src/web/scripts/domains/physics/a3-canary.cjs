const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path"),
  crypto = require("node:crypto");
const root = path.resolve(
  __dirname,
  "../../../../../docs/agent-only/implementation/028-validation",
);
assert.match(
  fs.readFileSync(
    path.join(root, "coordination/inference.lock/owner.md"),
    "utf8",
  ),
  /^A3;/,
);
const id = process.env.A3_CASE || "PHYS-01";
const c =
  id === "PHYS-01"
    ? {
        id,
        prompts: [
          "Why is it easier to lift something with a longer crowbar? Let me move the pivot around.",
        ],
      }
    : require("./a3-cases.json").find((c) => c.id === id);
assert.ok(c);
const request = {
  protocolVersion: 1,
  requestId: "a3-" + crypto.randomUUID(),
  prompt: c.prompts[0],
  destination: "lesson",
  viewport: { width: 1440, height: 900 },
  active: null,
};
const dir = path.join(
  root,
  "developer/A3/canaries",
  new Date().toISOString().replace(/[:.]/g, "-") + "-" + id,
);
fs.mkdirSync(dir, { recursive: true });
fs.writeFileSync(
  path.join(dir, "request.json"),
  JSON.stringify(request, null, 2),
);
const record = {
  id,
  requestId: request.requestId,
  started: new Date().toISOString(),
  method: "Direct ordinary product API /api/apertus; not prompt-UI acceptance",
  status: "running",
};
const base = process.env.UX_TEST_URL || "http://127.0.0.1:43123";
console.log(JSON.stringify({ directory: dir, ...record }));
(async () => {
  try {
    const response = await fetch(base + "/api/apertus", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(270000),
    });
    const body = await response.text();
    fs.writeFileSync(path.join(dir, "response.json"), body);
    record.httpStatus = response.status;
    const result = JSON.parse(body);
    record.resultStatus = result.status;
    const diagnostic = await fetch(
      base +
        "/api/planner-diagnostics?id=" +
        encodeURIComponent(request.requestId),
    );
    const trace = await diagnostic.json();
    fs.writeFileSync(
      path.join(dir, "trace.json"),
      JSON.stringify(trace, null, 2),
    );
    record.observedInference = (trace?.events || [])
      .filter((e) => /\.inference$/.test(e.event))
      .map((e) => e.data);
    record.observedDecisions = (trace?.events || [])
      .filter((e) => e.event === "composition.decision")
      .map((e) => e.data);
    record.status =
      response.ok && result.status === "created"
        ? "created; developer canary only"
        : "failed";
  } catch (error) {
    record.status = "failed";
    record.error = String(error.stack || error);
  } finally {
    record.ended = new Date().toISOString();
    fs.writeFileSync(
      path.join(dir, "manifest.json"),
      JSON.stringify(record, null, 2),
    );
    console.log(JSON.stringify({ directory: dir, ...record }));
    if (record.status === "failed") process.exitCode = 1;
  }
})();
