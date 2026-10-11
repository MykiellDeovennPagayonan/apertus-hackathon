const fs = require("node:fs"),
  path = require("node:path");
(async () => {
  const rows = [];
  for (const criteria of [
    {
      "natural-selection": "Natural selection",
      unclear: "None of these topics",
    },
    {
      "natural-selection":
        "Simulating evolution by natural selection: organisms vary, survive and reproduce with inherited traits.",
      unclear: "The request is unrelated to natural selection or evolution.",
    },
    {
      "natural-selection": "Natural selection and evolution",
      "fishing-lake": "Shared lake overfishing",
      "crowd-exit": "Crowd flow at a narrow exit",
      voting: "Alternate voting systems",
      unclear: "None of these topics",
    },
    {
      match: "The user wants to see natural selection.",
      unclear: "The user wants a completely different topic.",
    },
  ]) {
    const request = {
      state: "show me natural selection",
      questions: {
        strategy: {
          type: "choice",
          instructions: "Select the simulation matching the user request.",
          criteria,
        },
      },
    };
    const response = await fetch("http://127.0.0.1:43102/api/decide", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(request),
      signal: AbortSignal.timeout(20000),
    });
    const result = await response.json();
    rows.push({ request, result });
    console.log(JSON.stringify(result));
  }
  const out = path.resolve(
    __dirname,
    "../../../../../docs/agent-only/implementation/026-validation/runs/laya-probe-" +
      Date.now(),
  );
  fs.mkdirSync(out, { recursive: true });
  fs.writeFileSync(
    path.join(out, "results.json"),
    JSON.stringify(rows, null, 2),
  );
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
