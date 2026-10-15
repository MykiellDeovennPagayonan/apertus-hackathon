# Forty-prompt generation benchmark

All checkout-relative commands in this guide run from `track_2b/`, unless an explicit `cd` changes the working directory. From the submission repository root, run `cd track_2b` first.

For the selected-model command, automatic evaluator import, first-pass measurements and team JSON voting, see [the standalone evaluation app](../eval/README.md). The existing command below still targets an already running app.

This is the command-driven Playwright runner requested for the fixed flow. It uses Playwright directly, not an MCP agent. It does not build the app, run application tests, inspect PostgreSQL, or evaluate correctness.

## Run

From `track_2b/`, with the app already running:

```sh
make benchmark
```

This uses the Makefile's web port (`43100` by default). Override the target with `make benchmark BENCHMARK_URL=https://apertus-hackathon.vercel.app` or `make benchmark WEB_PORT=3000`. It does not install dependencies, start the app, or build anything.

Start the app separately, then from this folder:

```sh
npm run benchmark
```

The default app URL is `http://localhost:3000`. To use the hosted app:

```sh
BENCHMARK_URL=https://apertus-hackathon.vercel.app npm run benchmark
```

To watch the browser, append `-- --headed`. All 40 exact prompts are read from `docs/agent-only/benchmark/final-benchmark-list.md`; the runner refuses a missing/partial/duplicate list.

Each prompt runs once, in source order, in a fresh Chromium context. It opens `/`, fills “Describe an experiment…”, clicks Create, and waits for an editable composer and visible experiment. ERROR includes clarification/unsupported results that do not produce an experiment, visible alerts, browser/console errors, failed HTTP responses, network failures, and screenshot failures. Expected cancelled background GETs during navigation and generation-stream cancellation are logged. The app cancels its reader after receiving a final result, so that cancellation alone does not fail a rendered result; without a terminal result the row still times out. A partial but rendered result can PASS: intent and correctness are outside this run.

The test timeout is five minutes including page setup and generation, followed by a two-second render-error observation window within that budget. Screenshot/cleanup hooks have a separate bounded allowance. No external retry occurs; the application's own bounded internal repair behavior remains unchanged. Any failed row gives the command a nonzero exit code, even if the aggregate meets 95%.

## Progress and evidence

The console and `progress.log` show the current prompt and completed count, for example `17/40 complete — 15 PASS, 2 non-pass`. Every command creates a new folder:

```text
runs/<UTC timestamp>-<process ID>/
  report.md
  progress.log
  artifacts/
    <prompt>/
      prompt.png
      result.png
      error-details.png  (when available)
      events.jsonl
      trace.zip          (failed cases)
```

`report.md` updates after each start and result, lists all 40 statuses, embeds screenshots, links error evidence, and reports PASS/40. Target: 38/40 (95%); minimum: 36/40 (90%). ERROR, TIMEOUT, INTERRUPTED, and NOT_RUN never count as PASS. Interrupt with Ctrl+C; completed evidence remains. A hard kill may leave the current row RUNNING, so such a report is incomplete.

Events include generation request IDs, timestamps, HTTP status/method/path, console errors and available UI error details. Request/response bodies, headers and URL query strings are not written to the event log. Failure traces and screenshots can still contain private data. Run folders and authentication state are ignored by git; review/redact before sharing.

## Optional existing sign-in

Guest runs work. To reuse a verified benchmark account, save browser storage state through Playwright's existing interactive tooling:

```sh
mkdir -p .auth
npx playwright codegen --save-storage=.auth/benchmark.json http://localhost:3000
```

Sign in manually in the opened browser, then close it. Use the same origin when running:

```sh
BENCHMARK_STORAGE_STATE=.auth/benchmark.json npm run benchmark
```

Never commit that file. Each prompt receives that initial state but does not carry the previous experiment into the next context. With supplied storage state, the runner requires the app's Sign out button before submitting; an expired session produces ERROR. Memory capture is not evaluated.

## Installation on another machine

Node.js 22 or newer:

```sh
npm ci
npx playwright install chromium
```

This is the only runner dependency. No web build, provider preflight, database commands, correctness checks, or second verification loop is part of `npm run benchmark`.
