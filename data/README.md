# Recorded benchmark and human evaluation data

This directory collects the seven-model, 40-prompt benchmark campaign from 14 October 2026 and the four supplied human evaluation exports. Start with [summary.json](summary.json) for combined automatic measurements and human preferences by model.

The automatic campaign contains 280 attempts, with 254 rendered results. The human exports contain 157 reviewed ballots out of 160 possible answers; missing answers are excluded from preference denominators. The files preserve source references and SHA-256 hashes.

| File or directory | Contents |
| --- | --- |
| [summary.json](summary.json) | Combined model statistics, campaign totals, metric definitions, and source references |
| [benchmarking/runs](benchmarking/runs) | Byte-preserving snapshots of the seven original run manifests, including configuration, hardware metadata, per-prompt measurements, and original summaries |
| [benchmarking/model-statistics.json](benchmarking/model-statistics.json) | Render rates, first-validator results, repair counts, latency distributions, batch wall times, inference stages, recorded token usage, output constraints, Laya decisions, and failed simulation IDs |
| [benchmarking/prompt-results.json](benchmarking/prompt-results.json) | All 280 outcomes, exact prompts, timing and validation measurements, screenshot-review notes, error details, and original evidence paths |
| [benchmarking/simulation-matrix.json](benchmarking/simulation-matrix.json) | Forty simulations with each model's render outcome and aggregate coverage |
| [benchmarking/pipeline-evidence.json](benchmarking/pipeline-evidence.json) | Compact diagnostic evidence for all 280 attempts: inference events, Laya selection decisions, retrieved activities, capability rejections, argument failures, and error messages |
| [benchmarking/component-catalog-statistics.json](benchmarking/component-catalog-statistics.json) | Counts and category breakdowns from the existing authored-recipe component inventory |
| [human-evaluations](human-evaluations) | Four unchanged `evaluation-*.json` source exports plus derived statistics |
| [human-evaluations/model-statistics.json](human-evaluations/model-statistics.json) | Preferences, sole favorites, available-result rates, common-prompt rates, fractional tie credit, and reviewer-level counts |
| [human-evaluations/simulation-preferences.json](human-evaluations/simulation-preferences.json) | Preferences per simulation, reviewed/missing counts, none-preferred votes, unanimous choices, and individual ballots |

All timing values in the derived files are **milliseconds**. Rate fields use fractions from **0 to 1**. Latency statistics use successful generations only; P95 is nearest rank and standard deviation is the sample statistic. Batch wall time includes screenshot/test overhead. The common subset contains the 25 simulations that rendered under every model; the four human exports contain 99 reviewed ballots on that subset.

A first-validator pass can occur after JSON/schema repairs. A zero-repair completion requires a successful render with no schema repairs, validator returns, or deterministic repairs. These definitions are kept separate. Render success does not certify instruction fulfillment, scientific accuracy, or learner interaction. Qualitative screenshot notes are preserved rather than converted into an invented correctness score.

Human selections are nonexclusive. An evaluator can choose several models, so preference percentages do not sum to 100%. Missing ballots are not none-preferred votes. Fractional credit assigns each selected model `1 / number selected` as a separate tie-normalization check; it is not the original evaluation rubric. Distinct evaluator IDs identify the four exports, without proving demographic or participant independence.

The human exports do not embed screenshot versions or complete candidate exposure logs. Availability calculations use the seven fixed campaign runs. Raw manifest attachment paths remain relative to their original `src/playwright/runs/<run-id>` directory; derived evidence references and source metadata use repository-relative paths. Screenshots and browser traces remain in their existing locations. Token totals are recorded provider usage, with the number of contributing inference events stated; they are not estimates of cost or unreported reasoning tokens.

The component-catalog counts describe the source snapshot documented in the [existing inventory report](../docs/agent-only/benchmark/component-catalog-report.md). They concern authored premade recipes, not model-generated results or the current runtime catalog. The detailed model discussion remains in the [benchmark discussion](../docs/agent-only/benchmark/results/model-comparison-discussion-2026-10-14.md).

Rebuild derived statistics from the repository root:

```sh
node data/collect-statistics.mjs
```

The collector reuses the existing benchmark summary implementation. Original manifests are copied once; existing snapshots must match any still-present original. After the initial collection, frozen run snapshots and compact pipeline evidence allow rebuilding without ignored runner artifacts. Original benchmark reports provide the qualitative notes and reported batch wall times. Human input files are only `human-evaluations/evaluation-*.json`; derived files are not counted as additional evaluators. The collector rejects duplicate evaluator IDs, mismatched prompts, inconsistent counts, and preferences for failed results in the fixed campaign.

The command performs no model inference, provider requests, or learner interactions. It refreshes derived JSON files while preserving run snapshots and human source exports. Collection is bounded to the seven documented full batches; historical development trials are not mixed into their scores.
