# Screenshot evaluation app

This standalone app displays automatically imported benchmark screenshots, supports anonymous multi-select preference voting, saves progress in the evaluator's browser, and exports JSON. It needs Node.js 22 or later and no npm dependencies.

From the repository root:

```sh
make eval
```

Open `http://127.0.0.1:43110`. To serve the app to teammates on your network, run `EVAL_HOST=0.0.0.0 make eval` and give them your machine's address and port. Keep the server running during evaluation. Alternatively, copy `src/eval/public` with its generated `benchmarks` folder to a static web host; the app expects to be served at the origin root. Never distribute the web app's environment file or runner failure traces.

## Run a model batch

Install existing runner dependencies once with `npm ci --prefix src/playwright`, then install Chromium with `cd src/playwright && npx playwright install chromium`. Install the web app dependencies with `make install` if needed. Keep the required inference and decision services running separately.

Set credentials and provider settings in the server environment or the existing ignored `src/web/.env.local`. `make benchmark-model` loads that file; direct invocation must also use Node's `--env-file-if-exists` option. Keys never go into the evaluator.

```sh
make benchmark-model MODEL=apertus-1.5-8b
# Review the Apertus results before proceeding.
make benchmark-model MODEL=llama-3.1-8b
make benchmark-model MODEL=qwen3-8b
# Supply OPENAI_API_KEY and review the smaller-model results first.
make benchmark-model MODEL=gpt-6-luna
make benchmark-model MODEL=gpt-6.1-sol
# Review the GPT results first.
make benchmark-model MODEL=qwen3-32b
make benchmark-model MODEL=mistral-small-3.1-24b
```

Every command runs one selected model against all forty prompts, one prompt at a time with no external retries. It owns an isolated web process on a temporary loopback port and uses `.next-benchmark` build output. Existing web/inference processes are left running. Do not run multiple model commands concurrently. A short, unscored provider setup call occurs before the scored sweep and can consume billed tokens. Provider schema probes may also consume tokens; their timings remain in inference evidence.

For HF profiles set `HF_TOKEN`. The default router is `https://router.huggingface.co/v1`; configure `APERTUS_HF_BASE_URL` for an accessible dedicated chat-completions endpoint. `BENCHMARK_HF_MODEL` can specify a provider-qualified model ID or endpoint alias for the selected HF batch. The resolved model is recorded; the command never silently substitutes models or provisions paid infrastructure. Check access and billing with your provider first. For OpenAI profiles use `OPENAI_API_KEY` and optionally `OPENAI_REASONING_EFFORT`; the existing Responses API adapter is reused.

The benchmark defaults to `none` reasoning for [GPT-6 Luna](https://developers.openai.com/api/docs/models/gpt-6-luna) and `low` for [GPT-6.1 Sol](https://developers.openai.com/api/docs/models/gpt-6.1-sol), which does not support `none`. Reasoning-enabled OpenAI calls retain the configured `LLM_MAX_TOKENS` output ceiling because reasoning and the JSON answer share that budget; tiny per-stage JSON limits would otherwise truncate the answer. Record these settings when comparing quality, latency and cost.

Hugging Face is the default for open-weight benchmark models; the two GPT profiles use OpenAI. Laya stays local. On 2026-10-14 the user explicitly authorized completion of the interrupted local Apertus batch because the exact v1.5 checkpoint has no shared HF route. That batch is a documented local exception, not a hosted timing comparison. The Apertus profile defaults to HF even if the application normally uses local inference. For an explicitly authorized local batch, set `BENCHMARK_APERTUS_LOCAL=true`; it uses `APERTUS_LOCAL_MODEL` and `APERTUS_LOCAL_BASE_URL` and records that local configuration. It identifies Apertus v1.5 8B. This campaign requires `REPAIR_MEMORY_MODE=off` to prevent cross-model learning contamination. Keep the same decision provider, pipeline policy, timeouts, output limits, and viewport across models. The `required-laya` policy retains its hybrid/Laya requirements across every LLM provider, so the same composition policy can be used for all models. Use `BENCHMARK_INFERENCE_HARDWARE` and `BENCHMARK_QUANTIZATION` to record local inference hardware and quantization. The runner machine's hardware is captured separately and is not assumed to be the inference server.

## Verified HF routes and quantization

The current seven-model lineup uses Llama 3.1 8B through Featherless in place of Gemma: Gemma 4 E4B was unavailable through the router, and Gemma 3 12B repeatedly returned unsupported for the first prompt. It also uses Mistral Small 3.1 24B through HF's direct Featherless route in place of Mistral 3.2. Earlier artifacts retain their original identities. Qwen3-8B stays the same model and explicitly selects Featherless; automatic provider selection had rejected it for this account. Its chat template disables thinking so the small JSON-stage budget produces an answer instead of reasoning-only output. See [HF provider selection](https://huggingface.co/docs/inference-providers/providers/featherless-ai) and [Featherless thinking controls](https://featherless.ai/docs/chat-template-kwargs).

The Mistral profile selects `https://router.huggingface.co/featherless-ai/v1` when the HF base URL is unset or the standard router URL. A custom `APERTUS_HF_BASE_URL` is preserved. Requests still use the same `HF_TOKEN`; no Featherless subscription or dedicated endpoint was created.

The application’s existing local Apertus MXFP4 build is a 4-bit quantization, and was used for the explicitly authorized local Apertus exception. Keep local and hosted latency interpretations separate. HF shared Inference Providers choose their deployed weights/precision: the normal chat-completion request does not select a 4-bit artifact. To control that exactly, deploy a compatible GGUF quantization such as Q4_K_M on a dedicated [HF llama.cpp endpoint](https://huggingface.co/docs/inference-endpoints/en/engines/llama_cpp), or serve quantized weights locally. Dedicated hosting is separately billed and has not been provisioned. As verified on 2026-10-14, shared HF inference exposes Apertus 8B Instruct 2509, while Apertus v1.5 8B and its text adaptations have no shared-provider mapping. The v1.5 profile requires an accessible dedicated HF endpoint before scoring. Using the older model requires an explicit lineup change and a distinct model identity; do not substitute them as equivalent.

## Artifacts and recovery

To test only the first prompt for a selected model, run:

```sh
REPAIR_MEMORY_MODE=off node --env-file-if-exists=src/web/.env.local src/playwright/run-model.mjs qwen3-8b --first
```

This makes one first-prompt generation attempt, preserving the application's bounded internal repair behavior, and skips the extra provider setup generation. The run is labeled `first-prompt`; the other 39 questions remain NOT_RUN. Screenshots are published, but this incomplete batch is excluded from the evaluator's default complete-dataset voting and is not a forty-prompt score.

Original evidence is at `src/playwright/runs/<run-id>/`, including the existing Markdown report, events, screenshots and new `run.json`. Public manifests and screenshots are imported into `src/eval/public/benchmarks/<model-slug>/<run-id>/`. Paths intentionally include model names; evaluators should not inspect them. Failed generations remain recorded and are not selectable successful screenshots.

Pass/fail, submission-to-render time, server timing, first validator outcomes, composer feedback, schema repairs, and deterministic repairs are collected in the same generation. Missing measurements remain unknown. The existing `make benchmark` command still targets an already running app and produces its original reports; it does not promise complete telemetry or automatically assign a model identity.

The gallery accumulates models across separate benchmark executions. Start with Apertus; when Qwen, Llama, or another model finishes its forty questions, its screenshots appear beside every existing model automatically. It checks for additions every thirty seconds, on browser refresh, and when returning to the tab. Different execution dates, pipeline settings, or source revisions do not hide other models; their configuration stays attached to measurements. Models must use the same forty prompts.

Each model contributes its newest complete screenshot set. Adding a model updates the current evaluation without starting over: selections, current question, and relative order of earlier candidates survive. New candidates are inserted in randomized positions. Existing votes retain the candidate IDs originally shown and are marked for review; Updating a selection immediately records the vote against all currently displayed models; there is no separate confirmation button. JSON exports include model identities and exposure per vote. If the same model is rerun, its latest set replaces that model's gallery entry, while the prior evaluation remains saved as history so votes do not silently move to different images.

If screenshot publication fails, retry the import without calling any model:

```sh
node src/playwright/publish.mjs src/playwright/runs/<run-id>
```

Interrupted batches are retained but excluded from default voting. Incomplete or missing telemetry is explicit, not a successful first pass. Generated evidence is ignored by git. A new scored run always has a new run ID; completed evidence is not overwritten.

## Votes and JSON export

Select any number of favorites or “None preferred” for a reviewed question. Changing a vote replaces that question's ballot. “Download JSON” works at any point and records the number of reviewed questions. The export includes evaluator/session IDs, exact prompts, candidate display order, run/model mapping, automatic measurements, selected candidates, and timestamps. Teammates send those files to the organizer for later analysis. Export is also the fallback when browser storage is unavailable or full.

Local storage belongs to one browser/origin. Keep the evaluator URL stable and download before clearing browser data. Existing malformed saved data is never silently overwritten; recover/back up it before clearing the app's `apertus-evaluation-v1` storage entry. Human screenshots assess visual preference, not scientific correctness or interactions.

## Verification

```sh
npm --prefix src/eval test
node src/web/scripts/recipes/verify-benchmark.cjs
node --test src/playwright/tests/*.test.mjs
node src/eval/tests/browser.mjs
```

Browser checks use the existing Playwright installation, fixture batches, and the actual evaluator server. They make no provider calls and do not count as benchmark generations.

`node src/playwright/tests/runner.mjs` additionally exercises the actual full forty-prompt Playwright spec and reporter against a deterministic local fixture app, including a deliberate HTTP failure and a genuine visible alert. It takes about ninety seconds, makes no provider calls, and deletes its fixture run afterward.

Creation-interface changes and the local verification protocol are documented in [creation-interface-loop.md](../../docs/agent-only/implementation/036-validation/creation-interface-loop.md). Focused development probes (`--cases=4,17,24`) are excluded from the complete model gallery.
