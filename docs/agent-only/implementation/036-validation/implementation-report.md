# Multi model evaluation implementation and verification

Date: 2026-10-14  
Status: evaluator and benchmark integration implemented; live model batches pending.

## Delivered behavior

The standalone `src/eval` app needs Node.js and no new dependencies. It loads generated batch artifacts, shows all available screenshots for one question together, shuffles their anonymous positions for a new session, supports multiple favorites and explicit none-preferred votes, saves ballots locally, preserves earlier sessions, and exports versioned JSON with candidate exposure and model mapping. Full-size image links retain readable screenshot detail. Model names intentionally remain in public paths as requested.

`make benchmark-model MODEL=<slug>` selects one of the seven agreed profiles, validates configuration and credentials, launches its own isolated loopback web process, checks measurement and decision readiness, performs an explicit unscored provider smoke call, runs all forty prompts sequentially without external retries, and imports screenshots and manifests into `src/eval/public/benchmarks`. It stops its own web process and leaves separately managed inference services running. Paid endpoints are never provisioned automatically.

The original `make benchmark` remains available for an already running app. Existing progress logs, Markdown reports, screenshots, failure evidence, and nonzero exit codes are preserved. New incremental `run.json` artifacts keep pass/fail, request IDs, generation-only latency, observation time, server measurements, coverage, and resolved configuration. Failed and incomplete evidence is retained. Publication can be repeated separately without model regeneration; completed batch contents cannot be replaced with different results.

## Measurement and compatibility changes

- Explicit validation events capture initial stage outcomes independently of schema repairs, composer feedback, and deterministic runnable repairs. Every terminal outcome has bounded measurement counters even after the trace event limit is reached. Missing measurements remain unknown.
- The local development-only `/api/benchmark` endpoint exposes sanitized configuration and counters, without prompts, response bodies, API keys, or full traces. Production and non-loopback host requests are rejected.
- The hybrid/Laya composition requirement now applies independently of the LLM provider. The decision-engine requirements and validation behavior remain enforced, allowing GPT and HF models to use the same policy.
- Luna defaults to no reasoning and Sol to low reasoning in the selected-model profiles. Reasoning-enabled OpenAI calls use the configured output ceiling so reasoning cannot exhaust a tiny JSON-stage token allowance before emitting the answer.
- Local llama.cpp wire-format settings are confined to local connections; inherited local runtime settings cannot change the hosted HF schema envelope.
- Batch provenance records pipeline and decision settings, capture parameters, revision, dirty state, source fingerprint, actual model configuration, and hardware/quantization declarations. Different prompt sets, pipeline settings, or source revisions are rejected as a combined voting dataset.
- Session IDs use browser cryptographic random bytes, including on an HTTP LAN origin. Local storage failures visibly require JSON export; malformed saved data is preserved instead of overwritten.

## Verification performed

| Check | Result |
| --- | --- |
| Evaluator state tests | Passed: multi-select edits, none preferred, exposure-aware export, refresh state, newer batch selection, preserved old sessions, incompatible datasets and malformed state |
| Artifact/profile tests | Passed: atomic publication, repeat publication, immutable completed outcomes, traversal rejection, latency summaries, credential requirements and model selection |
| Backend benchmark checks | Passed: initial validation, composer retry, schema-only repair, deterministic repair, failure before validation, timeout/unknown outcomes, trace-cap independence, secret exclusion and local-only access |
| Web TypeScript check | Passed with `tsc --noEmit` |
| Actual evaluator browser flow | Passed with Chromium: keyboard selection, multiple favorites, refresh, failed candidates, JSON download, seven-model dataset, previous-session recovery, short viewport and storage failure |
| Actual forty-prompt runner | Passed against a local fixture app: 39 PASS and one intentional ERROR, all forty request IDs and measurements, no external retries, generation latency excluding the two-second render observation |
| Diff whitespace check and script syntax checks | Passed |
| Existing registry/creation contract command | Reached an unrelated stale assertion at `src/web/scripts/recipes/verify-contract.cjs:366`: it reads `candidates.requiredCapabilities.includes(...)`, while the unchanged `assemblyCandidates` implementation returns `ranked` and `cards` |

The existing contract command passed its earlier catalog, recipe, save/reopen, interaction, rendering-boundary and mocked repair-memory checks before that assertion. Its database checks were skipped because an isolated test database was not configured. No unrelated retrieval implementation or test assertions were changed.

Browser evidence uses the directly installed Playwright library as a fallback; Playwright MCP verification was not performed. Desktop and short-viewport screenshots were captured and visually inspected. Fixture images are explicitly labeled and are not model-generated benchmark results.

Local screenshot evidence, ignored by git:

- [Desktop voting](../../../../src/eval/test-output/voting-desktop.png)
- [Automatic measurements](../../../../src/eval/test-output/measurements-desktop.png)
- [Short viewport voting](../../../../src/eval/test-output/voting-small.png)

## Run and operational limits

```sh
make eval
make benchmark-model MODEL=apertus-1.5-8b
```

Open `http://127.0.0.1:43110` for the evaluator. Start the required inference/decision services separately and use the existing server environment for credentials. Follow the agreed stage review order before later models. See [setup and usage](../../../../src/eval/README.md).

No live Apertus, Hugging Face, or OpenAI generations were executed during implementation. Provider access, billing and real structured-output compatibility remain setup checks for each selected model. The unscored setup call itself can consume billed tokens. Browser-only ballots must be downloaded before clearing storage; screenshots establish visual preference rather than scientific or interactive correctness. The initial campaign keeps repair memory off; frozen-memory or baseline-versus-improved campaigns remain separately scoped.
