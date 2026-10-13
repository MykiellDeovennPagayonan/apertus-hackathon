# Multi model benchmark and evaluation app implementation plan

Date: 2026-10-14  
Status: implemented; the live model campaign has not started. See [implementation and verification evidence](036-validation/implementation-report.md).

Build a standalone application at `src/eval` for the team's screenshot evaluation. Extend the existing forty-prompt Playwright benchmark so each generation records its automatic measurements and publishes its screenshots into the evaluation app. Run one model and one prompt at a time. Preserve every batch so later models can be added without repeating earlier generations.

## 1. Agreed scope

- Create a new app under `src/eval`, rather than a route in `src/web`.
- Use all forty exact prompts from `docs/agent-only/benchmark/final-benchmark-list.md`.
- One command runs the full forty-prompt batch for the selected model.
- Capture pass/fail, generation time, first-pass validation, and screenshots in every batch, including the first Apertus batch.
- Automatically make completed artifacts available to the evaluation app; manual screenshot upload is not the primary workflow.
- Show all available candidates for the same question together, with multiple favorites selectable.
- Hide model names in the voting interface and shuffle candidate positions for a new evaluation session. Model-named image folders are explicitly acceptable.
- Autosave each evaluator's progress in their browser and download JSON for the team to send to the organizer. No central vote database or account system.
- Review completed stages before starting the next group of models. Do not automatically launch all seven models in one command.

The first Apertus-only batch provides the automatic measurements and a screenshot review. Comparative preference becomes useful once another model's batch is added. Do not add a separate human pass/fail rubric in the initial version: automatic pass/fail and human preference are separate records.

## 2. Model order

| Stage | Batch | Model | Connection |
| --- | --- | --- | --- |
| 1 | `apertus-1.5-8b` | Apertus 1.5 8B, keeping the current text model and quantization | Existing Apertus connection |
| 2 | `llama-3.1-8b` | `meta-llama/Llama-3.1-8B-Instruct:featherless-ai` | Hugging Face |
| 2 | `qwen3-8b` | `Qwen/Qwen3-8B:featherless-ai` | Hugging Face |
| 3 | `gpt-6-luna` | `gpt-6-luna` | OpenAI |
| 3 | `gpt-6.1-sol` | `gpt-6.1-sol` | OpenAI |
| 4 | `qwen3-32b` | `Qwen/Qwen3-32B` | Hugging Face |
| 4 | `mistral-small-3.1-24b` | `mistralai/Mistral-Small-3.1-24B-Instruct-2503` | HF direct Featherless route |

Finish and review Apertus first, then Llama and Qwen 8B, then the two GPT models, then Qwen 32B and Mistral. Within each stage every model runs separately and sequentially. Seven complete batches produce 280 generation attempts per project configuration.

The project's example configuration, inference defaults, and Raspberry Pi model lock reference Apertus 1.5 **8B**, not 7B. Resolve the actual runtime configuration before the batch rather than assuming a default is the live model.

Routing investigation on 2026-10-14 replaced Gemma 4 E4B with Gemma 3 12B and Mistral 3.2 with Mistral 3.1 24B after live HF route rejection. Qwen8 retains its weights and pins Featherless. Gemma 3 was subsequently replaced with Llama 3.1 8B after repeated unsupported outcomes for the first prompt. The original first-prompt artifacts remain unchanged.

Llama 3.1 8B keeps the replacement slot near Apertus's parameter count and supplies a distinct model family from Qwen. It is available as downloadable weights under Meta's Llama license; do not describe that license as unrestricted open source. Official references: [Llama model card](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct), [Qwen 8B model card](https://huggingface.co/Qwen/Qwen3-8B), [Qwen 32B endpoint](https://endpoints.huggingface.co/new/Qwen/Qwen3-32B?accelerator=gpu), [OpenAI model catalog](https://developers.openai.com/api/docs/models), and [Mistral model card](https://huggingface.co/mistralai/Mistral-Small-3.1-24B-Instruct-2503).

Hugging Face weights being available does not guarantee shared-provider inference. Before a paid batch, resolve an accessible provider route, its structured-output support, and its billing. If a dedicated endpoint is needed, establish that deployment and cost separately; do not silently create one. The user supplies `HF_TOKEN` and later `OPENAI_API_KEY` through server environment variables, never through the evaluator frontend or exported artifacts.

## 3. Reuse and change boundaries

| Existing location | Implementation responsibility |
| --- | --- |
| `src/playwright/benchmarks.mjs` | Keep the current forty-prompt parsing and integrity checks |
| `src/playwright/benchmark.spec.mjs` | Preserve fresh contexts, sequential execution, no external retries, screenshot evidence, and browser error checks; add generation timestamps and metric collection |
| `src/playwright/reporter.mjs` | Preserve Markdown/progress reports; add machine-readable incremental batch output and publication into `src/eval` |
| `src/playwright/playwright.config.mjs` | Keep one worker, zero retries, fixed viewport, and complete prompt sweep |
| `Makefile` and runner package scripts | Add the selected-model batch command and evaluator development command without changing existing benchmark behavior |
| `src/web/src/simulations/creation-and-editing/input/inference/config.ts`, `apertusConfig.ts`, `adapters.ts` | Reuse existing local/HF chat-completions and OpenAI Responses transport; make only compatibility changes demonstrated by the selected models |
| `src/web/src/simulations/creation-and-editing/budget.ts`, `input/inference/transport.ts`, `composer/`, `validator/`, `pipeline.ts` | Capture validation and repair provenance across the creation paths |
| `src/web/src/simulations/creation-and-editing/input/api.ts`, `diagnostics.ts` | Attach bounded benchmark measurements to request IDs and persist terminal measurements, including failures |
| `src/eval/` | New standalone app, batch catalog, screenshot comparison, local ballots, JSON export |
| Runner/evaluator documentation and ignore rules | Document execution, credential setup, generated artifact handling, and result sharing |

Read `src/web/AGENTS.md` and the installed Next.js documentation before changing web code. Apply [IMPORTANT.md](IMPORTANT.md) and the linked project design guides to the new evaluator interface. Inspect all callers before changing shared inference or validation contracts.

Use the existing stack and installed tools where practical. Avoid extracting shared UI libraries or introducing a generic evaluation framework. The evaluator serves generated static artifacts; it does not call model APIs.

## 4. Measurements and denominators

### Completion success

Preserve the existing operational definition: a final experiment is rendered, the composer is available, and the bounded observation finds no qualifying browser, network, HTTP, or visible errors. A partial but rendered result can pass; preserve coverage separately. Clarification or unsupported outcomes without a final experiment fail.

Store the detailed status as `PASS`, `ERROR`, `TIMEOUT`, `INTERRUPTED`, or `NOT_RUN`. Success is PASS/40 for each complete batch. Incomplete batches remain explicitly incomplete; pending rows are never successful. A failed prompt does not stop the remaining prompts. Preserve the existing nonzero exit status for failed rows even if artifact publication succeeds.

### Generation time

Record a monotonic client timestamp at submission and at the final usable render. This interval is the primary generation latency; exclude page setup, prompt screenshots, the post-render observation delay, and screenshot cleanup. Preserve existing Playwright test duration as a separate field.

Also capture server pipeline elapsed time and available per-inference timing. For failures, record elapsed time to failure; for timeouts, record the timeout outcome and elapsed observation, not a fabricated completed-generation time. Report successful-render median and p95 with sample count, and failure/timeout counts separately.

### First-pass validation

Record the initial validator outcome and whether validation feedback required the composer to revise its output. Do not infer this from `budget.repairs === 0`: that counter also includes response parsing/schema repairs and automatic connection repairs.

Store independent fields for validation reached, first validator outcome, composer feedback count, schema/response repair count, and deterministic repair count. A run that requires composer correction after validation fails first-pass validation even if it eventually succeeds. A run that never reaches validation has an unknown first validator outcome, not a pass. When a path validates multiple authored stages, record stage outcomes and make the run-level result pass only when all required first attempts pass. Count actual validation checks rather than treating a `validation.start` trace alone as acceptance.

Report first-pass successes/40 as the primary batch rate, and first-pass successes/attempts reaching validation as a secondary rate. Keep the broader zero-repair completion rate separate if derived later. Record missing measurements as unknown; missing telemetry must never become a successful measurement.

### Human preference

Votes select zero or more successful screenshot candidates for one prompt from a fixed evaluation dataset. Use explicit “None preferred” to distinguish a reviewed question with no favorites from an unanswered question. Record candidate exposure and selected IDs, not only model totals. Failed generations remain in the automatic results and appear as anonymous unavailable candidates; error-detail images are evidence, not successful screenshot candidates.

Human screenshot preference does not establish scientific accuracy, prompt coverage, or interaction correctness. Those require separate evaluation if requested later.

## 5. Durable batch artifacts

Keep the existing immutable evidence at `src/playwright/runs/<run-id>/`. Add a versioned `run.json` manifest, updated atomically after each result, and automatically publish completed screenshots and manifests into the evaluator's generated assets.

Proposed layout:

```text
src/eval/public/benchmarks/
  index.json
  <model-slug>/
    <run-id>/
      run.json
      images/<prompt-id>.png
```

Each batch stores its run ID, prompt-source hash, code revision and dirty state, resolved model/provider, endpoint identity without secrets, project configuration, viewport, start/end times, and all forty rows. Each row links prompt ID and exact text to request ID, terminal status, coverage, timing, validation measurements, screenshot path, and bounded error details. Record quantization/runtime/hardware for local inference and reasoning/structured-output/token/deadline settings for all models where applicable.

Publish only completed files and atomically update the catalog; use fixed model slugs and validated prompt/run IDs for output paths. Never overwrite a previous run. Missing screenshots have explicit availability states. A publication error preserves the original evidence and reports the failure; retrying publication must not regenerate model outputs.

The current development diagnostics retain only fifty traces and 240 events per trace, and are unavailable in production. Persist bounded measurements promptly, independently of trace retention. For the initial local benchmark, reuse request IDs and the local-only diagnostics boundary where possible. Do not enable the existing full diagnostic endpoint publicly to obtain metrics. If the runner supports a production target, require an explicit safe measurement path or reject missing metrics instead of claiming full measurement coverage.

## 6. Selected model batch command

Proposed interface, to implement:

```sh
make benchmark-model MODEL=apertus-1.5-8b
make eval
```

The batch command resolves the selected server-side model profile, starts an isolated local web process with those settings, waits for readiness, runs the existing forty-prompt sweep against that process, publishes artifacts, and cleans up only the process it started. Do not mutate a running application's global environment or assume the currently open web app uses the requested model. Reuse an already running inference service where appropriate.

Validate credentials, model configuration, artifact destinations, and measurement capability before starting the sweep. A small provider compatibility smoke check belongs to setup and is labeled separately from scored prompt attempts. Keep failed benchmark outcomes intact; never silently retry a failed prompt to improve the score.

Use the current fixed five-minute test budget initially. Make pipeline/provider limits explicit in the run manifest and resolve any conflict before the full batch; changes create a new configuration identity. Stop between model stages for result review, as requested.

## 7. Evaluation app behavior

The main task is “Choose the screenshots you prefer for this question.” Show the exact question, large anonymous image cards with accessible checkbox selection, progress, and a clear Next question action. Show all available candidates in one comparison view with scrolling and readable image sizes rather than tiny thumbnails. Keep model identity, generation speed, success percentages, repair counts, and aggregate votes out of this voting view to avoid influencing preference. Provide organizer measurements separately.

At session creation, snapshot the chosen run IDs and available candidates. Default to the newest complete batch per model; adding a new batch offers a new dataset/session rather than silently changing an existing ballot. Shuffle positions per prompt for a new session and persist the order across refreshes. Sessions on an Apertus-only dataset remain distinguishable from later comparative sessions.

Store a generated evaluator/session ID, dataset identity, candidate order, ballots, and current question in local storage. Votes reference stable artifact IDs regardless of display position. Editing a selection replaces that question's ballot instead of adding duplicate votes. Browser storage errors must be visible and must not falsely show “saved.” Do not silently discard malformed or incompatible saved state.

Download a versioned JSON file containing session/evaluator ID, dataset and prompt hash, run/model mapping, automatic measurements, per-question candidate exposure and display order, selected IDs or none-preferred state, and export time. Allow partial export with an explicit completion count. Exports contain no credentials. The organizer combines teammates' files later; a central aggregation service is outside this version.

## 8. Implementation sequence

1. Define manifest and ballot contracts and metric semantics. Resolve required model profiles and document provider availability prerequisites.
2. Build `src/eval` with small fixture batches: gallery, multi-selection, persistent shuffled order, autosave, JSON export, and empty/single-model/failure states.
3. Add backend measurement collection across creation paths and terminal failures. Keep instrumentation from changing generation behavior.
4. Extend runner/reporter and add selected-model orchestration and automatic artifact publication. Retain current benchmark reports and checks.
5. Verify the complete flow using fixtures and a small setup smoke run. Build the evaluator before the first scored Apertus batch.
6. Run the full Apertus batch and review its automatic measurements and screenshots. Retain failures and discuss fixes as separate work.
7. Add the remaining models in the agreed stages, reviewing each stage before continuing. Preserve all existing batches and ballots.

The initial campaign uses the current project configuration. If testing the effect of a specific improvement later, define a named baseline and improved configuration and run the same prompts with each model under both. Seven models and two configurations require 560 generation attempts. Never attribute changes to an improvement from model-only comparisons or reuse artifacts across changed pipeline settings as though they were equivalent.

Hold validator rules, prompt set, renderer, decision engine, capture viewport, and repair limits constant for a model comparison. Record unavoidable provider differences. For repair-memory comparisons, freeze and identify the memory snapshot; prevent one model's evaluation run from training memory for later models. Local and hosted timing includes different hardware/network conditions and must be labeled accordingly.

## 9. Verification and acceptance

- Focused measurement checks cover first-attempt acceptance, validator feedback followed by success, schema repair without validator feedback, deterministic repair, failure before validation, and timeout. Assert counts and unknown states explicitly.
- Runner checks cover forty-row integrity, failed-row continuation, request correlation, generation latency boundaries, atomic manifest updates, and publication without overwriting prior batches.
- Evaluator checks cover multiple favorites, none preferred, refresh persistence, position-to-artifact mapping, JSON export, and preserved sessions when the dataset grows.
- Exercise the actual desktop voting task with realistic screenshots, keyboard selection, visible focus, readable image sizes, short viewports, and recovery. Capture and inspect opening and selected states; follow the project's usability review requirements.
- For each scored batch, confirm forty outcome rows, resolved model identity, complete metric availability or explicit unknowns, and screenshot availability states. Interrupted batches remain incomplete.
- Confirm no credential values enter public assets, logs, manifests, or vote exports. Model-named paths remain intentionally allowed by the user.
- A teammate can open the new app, review screenshots anonymously, select several favorites, refresh without losing work, and export an attributable JSON file. A later model batch appears in a new dataset without regenerating earlier outputs.

## 10. Excluded from the first version

No parallel generation, centralized vote storage, evaluator accounts, pairwise tournament, live model generation from the voting app, automatic paid endpoint provisioning, automatic model substitution, scientific correctness grading, or full statistical analysis dashboard. Provider access, exact hosted costs, and live compatibility must be established during setup before the corresponding batches run.
