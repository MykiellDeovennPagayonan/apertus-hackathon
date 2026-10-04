// Retain analyzed assertions and recipes, without bulky browser captures or logs.
const fs = require("node:fs");
const path = require("node:path");
const [rawDirectory, outputFile, manifestFile] = process.argv.slice(2);
if (!rawDirectory || !outputFile || !manifestFile)
  throw new Error(
    "Usage: node summarize-live.cjs RAW_DIR OUTPUT_JSON MANIFEST_JSON",
  );
const manifest = JSON.parse(fs.readFileSync(manifestFile, "utf8"));
const cases = fs
  .readdirSync(rawDirectory, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const resultFile = path.join(rawDirectory, entry.name, "result.json");
    if (!fs.existsSync(resultFile))
      return {
        case: entry.name,
        status: "interrupted",
        inference: "Unanalyzed; no pass claimed",
      };
    const result = JSON.parse(fs.readFileSync(resultFile, "utf8"));
    return {
      case: entry.name,
      prompt: result.prompt,
      startedAt: result.startedAt,
      finishedAt: result.finishedAt,
      status: result.status,
      error: result.error?.split("\n")[0],
      checks: result.checks.map((check) => ({
        ...check,
        label: check.label.replace(/: \{.*$/, " (see request summary)"),
      })),
      numerical: result.numerical,
      consoleErrors: result.consoleErrors,
      networkFailures: result.networkFailures,
      requests: result.requests.map((request) => ({
        prompt: request.prompt,
        correlationId: request.id,
        status: request.status,
        elapsedMs: request.elapsedMs,
        feedbackMs: request.feedbackMs,
        configuration: request.diagnostic?.configuration,
        operation: request.plan.operation,
        error: request.plan.error,
        commands: request.plan.commands,
        acceptedRecipe: request.plan.assembly,
        events: request.diagnostic?.events.map((event) => ({
          event: event.event,
          elapsedMs: event.elapsedMs,
          model: event.data?.model || event.data?.response?.model,
          attempt: event.data?.attempt,
          reason: event.data?.reason,
          question: event.data?.question,
          accepted: event.data?.accepted,
          decision: event.data?.decision,
          choice: event.data?.choice,
          responseContent: /schemaFailure/.test(event.event)
            ? event.data?.content
            : undefined,
        })),
      })),
      states: result.states.map(({ label, snapshot }) => ({
        label,
        correlationId: snapshot.correlationId,
        revision: snapshot.context?.revision,
        instances: snapshot.state?.instances.map((instance) => ({
          id: instance.id,
          provider: instance.provider,
          parameters: instance.parameters,
          outputs: Object.fromEntries(
            Object.entries(instance.outputs).filter(
              ([key]) => key !== "points",
            ),
          ),
        })),
      })),
    };
  });
fs.mkdirSync(path.dirname(outputFile), { recursive: true });
fs.writeFileSync(
  outputFile,
  JSON.stringify(
    {
      kind: "Agent B domain development verification",
      qualifyingIntegratedRound: false,
      candidate: manifest.fingerprint,
      models: manifest.models,
      rawDirectory,
      cleanup: "Pending visual analysis and task-owned directory removal",
      cases,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  JSON.stringify(
    cases.map(({ case: name, status, error }) => ({ name, status, error })),
  ),
);
