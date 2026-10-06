const assert = require("node:assert/strict");

function metrics(trace) {
  const events = trace.events;
  const stages = events
    .filter((e) => e.event === "stage")
    .map((e) => {
      const task = e.data.task;
      const matching = events.filter((e) => e.event.startsWith(`${task}.`));
      const schema = matching.filter((e) =>
        e.event.endsWith(".schemaValidated"),
      );
      const responses = matching.filter((e) => e.event.endsWith(".response"));
      const failures = matching.filter((e) =>
        /\.(schemaFailure|semanticFailure)$/.test(e.event),
      );
      return {
        task,
        firstAttemptSchemaValid: schema.some((e) => e.data.attempt === 0),
        firstAttemptCorrect: responses.some((e) => e.data.attempt === 0),
        acceptedAfterRepair: responses.some((e) => e.data.attempt > 0),
        failures: failures.map((e) => ({
          kind: e.event.split(".").pop(),
          ...e.data,
        })),
      };
    });
  const inference = events
    .filter((e) => e.event.endsWith(".inference"))
    .map((e) => e.data);
  const finalization = events.find((e) => e.event === "finalization");
  const budget = events.filter((e) => e.event === "budget").at(-1)?.data;
  return {
    stages,
    firstAttemptSchemaValid:
      stages.length > 0 && stages.every((s) => s.firstAttemptSchemaValid),
    firstAttemptCorrect:
      stages.length > 0 && stages.every((s) => s.firstAttemptCorrect),
    acceptedAfterRepair:
      !!finalization && stages.some((s) => s.acceptedAfterRepair),
    inference,
    budget: finalization?.data.budget ?? budget ?? null,
    laya: events.filter((e) => e.event === "selection.laya").map((e) => e.data),
    constraintProbes: events
      .filter((e) => e.event.endsWith(".constraintProbe"))
      .map((e) => e.data),
  };
}

function assertTrace(trace, record) {
  assert.equal(
    trace.id,
    record.requestId,
    "Diagnostics belong to this creation",
  );
  assert.equal(trace.prompt, record.prompt);
  const m = metrics(trace);
  assert.ok(
    m.stages.length >= 2,
    "Intent and configuration stages must be retained",
  );
  assert.ok(
    m.stages.every((s) => s.firstAttemptCorrect || s.acceptedAfterRepair),
  );
  assert.ok(m.budget.calls <= 6 && m.budget.repairs <= 2);
  assert.equal(m.budget.layaCalls, 0, "Explicit acceptance prompts skip Laya");
  assert.deepEqual(
    m.laya.map((e) => e.status),
    ["skipped"],
  );
  assert.ok(m.inference.length >= 2, "Actual model usage must be retained");
  return m;
}

function summary(records) {
  return {
    evidence: "live-model",
    attempts: records.length,
    passed: records.filter((r) => r.status === "passed").length,
    failed: records.filter((r) => r.status !== "passed").length,
    firstAttemptSchemaValid: records.filter(
      (r) => r.metrics?.firstAttemptSchemaValid,
    ).length,
    firstAttemptCorrect: records.filter(
      (r) => r.metrics?.firstAttemptCorrect && r.status === "passed",
    ).length,
    acceptedAfterRepair: records.filter(
      (r) => r.metrics?.acceptedAfterRepair && r.status === "passed",
    ).length,
    stages: records.flatMap((r) => r.metrics?.stages ?? []),
  };
}

module.exports = { metrics, assertTrace, summary };
