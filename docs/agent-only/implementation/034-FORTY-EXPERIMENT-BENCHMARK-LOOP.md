# 034 — Fixed forty-prompt Playwright benchmark loop

Date: 2026-10-13  
Status: command-driven runner implemented; no live benchmark results claimed.

Runner: [src/playwright](../../../src/playwright/README.md). Inputs: [all 40 exact prompts](../benchmark/final-benchmark-list.md).

## Scope

Use the already-running application. The user selected a command-driven Playwright runner rather than an agent-operated MCP workflow. Each prompt gets one submission and a five-minute test timeout. Only successful generation and visible rendering without observed errors are scored. Scientific correctness, fidelity to the requested features, control behavior, usability, and pgvector population are outside this run.

Do not add a second verification loop: no web builds, linters, type checks, application tests, CLI smoke checks, direct API probes, SQL commands, migrations, memory-processing commands, code fixes, or infrastructure changes during a benchmark run. The Playwright runner itself is the requested command. Dependency/browser installation is setup work performed separately.

## Command

From the repository root, with the app already running on the Makefile's web port (`43100` by default):

```sh
make benchmark
```

Override with `make benchmark BENCHMARK_URL=https://apertus-hackathon.vercel.app`. This target only launches the runner; it has no install, build, or server-start prerequisite.

From `src/playwright`, with the app already running:

```sh
npm run benchmark
```

Default: `http://localhost:3000`. To change the target:

```sh
BENCHMARK_URL=https://apertus-hackathon.vercel.app npm run benchmark
```

Use `-- --headed` to watch Chromium. Optional existing account storage state and installation instructions are documented in the runner README.

## Fixed loop

1. Read all 40 exact prompts from the benchmark file; refuse a partial or duplicate list.
2. Open a fresh browser context and the app root for the next prompt. Reuse supplied initial authentication state, not the previous experiment.
3. Fill the creation composer, save a prompt screenshot, and click Create once.
4. Wait for terminal error or a rendered experiment with its composer enabled. Observe render errors for two seconds within the five-minute test budget.
5. Save the result screenshot and available UI error details. Capture console/page errors, HTTP failures, network failures and generation request IDs. Keep failure traces.
6. Write PASS, ERROR, or TIMEOUT, elapsed time and evidence links to the Markdown report. Print progress such as `17/40 complete — 15 PASS, 2 non-pass`.
7. Continue through all 40 without external retries or fixes. The application's existing internal repair budget remains unchanged.
8. Write the final score and keep this run's folder intact. A subsequent command creates a new folder.

The test timeout covers page setup and generation; bounded screenshot/cleanup hooks can add time afterward. ERROR includes unsupported/clarification outcomes without a rendered experiment, visible alerts, browser/console errors, failed HTTP responses, network failures and screenshot failures. Expected aborted background GETs and generation-stream cleanup are logged; cancellation alone does not fail a rendered final result. Without a terminal result the row still times out. A rendered partial result may PASS because correctness and prompt fidelity are excluded.

## Evidence and progress

Each run creates `src/playwright/runs/<UTC timestamp>-<process ID>/` containing:

- `report.md`: all 40 prompt statuses, elapsed times, exact prompts, error messages, embedded screenshots and linked evidence; updated after each prompt starts and ends.
- `progress.log`: timestamps, current prompt, completed count and PASS/non-pass totals.
- `artifacts/<prompt>/`: prompt/result/error-detail screenshots, `events.jsonl`, and failure traces where available.

Keep NOT_RUN rows in the report before completion. On Ctrl+C, preserve completed evidence and interrupted status. A hard kill can leave the current row RUNNING; never call that an actual result. Reports update atomically and previous run folders are not overwritten.

Run folders and authentication state are ignored by git. Screenshots, logs and especially failure traces can contain private data; redact before sharing. Event logs omit bodies, headers and URL query strings.

## Score

Denominator is always 40. ERROR, TIMEOUT, INTERRUPTED and NOT_RUN are non-pass.

| PASS count | Result |
| --- | --- |
| 38–40 | Meets 95% target |
| 36–37 | Meets 90% minimum; misses target |
| 0–35 | Below minimum |

Any failed test causes a nonzero command exit code, even when the aggregate meets the target. PASS means rendered without observed errors during this bounded observation, not scientifically correct or faithful to the entire prompt.

## Failure discussion and later runs

After the sweep, discuss each error using its screenshot, message, request ID and browser evidence. Separate known facts from hypotheses. Browser logs may show the symptom without proving a backend root cause; missing evidence stays unknown.

Propose implementation fixes for confirmed generation/render defects, independent repeats for suspected variability, or infrastructure work for demonstrated outages/timeouts/capacity limits. Do not perform those changes inside the benchmark command. Preserve the original failures and compare a later complete 40-prompt run with the previous report, including regressions and changed configuration.

More pgvector data is only a relevant hypothesis for supported missing corrections; the current repair-memory verifier supports argument envelopes and numeric strings corrected to the same JSON number. Database population, extraction and injection need separate evidence and are not inferred from this score. See [repair-memory design](../features/COMPOSER_REPAIR_MEMORY.md) for the separately scoped learning-loop work.

Once 38/40 is reached, another full run with unchanged settings can establish repeatability for this benchmark. Higher success over time is the aim, not a promised monotonic result. Keep every run's score rather than reporting only the best.
