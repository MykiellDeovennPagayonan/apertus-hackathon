# Hugging Face routing investigation and fixes

Date: 2026-10-14  
Scope: the three HF models rejected during first-prompt trials, plus hosted 4-bit availability.

Subsequent update: Gemma 3 was replaced with Llama 3.1 8B, and the “Pick an experiment.” failures below were traced to Next's navigation announcer. See [replacement and alert correction](llama-replacement-and-alert-correction.md). Original results below are retained as historical evidence.

## Confirmed causes

The HF token is valid. Read-only Hub model metadata, the authenticated router model catalog, and bounded diagnostic generation calls established different failures:

| Original model | Actual router response | Resolution |
| --- | --- | --- |
| Qwen3-8B | Bare model ID returns HTTP 400 with `model_not_supported`: no provider enabled for automatic routing | Keep the exact model; explicitly select `Qwen/Qwen3-8B:featherless-ai` |
| Gemma 4 E4B IT | HTTP 400 with `model_not_supported`; the gateway classifies the model as unavailable for chat. Hub metadata has no inference provider mapping | Replace the slot with `google/gemma-3-12b-it:deepinfra`, under the user's authorization to switch unavailable models |
| Mistral Small 3.2 24B | Generic router and explicit Featherless suffix reject the chat model; direct Featherless route also rejects this exact model | Replace with Mistral Small 3.1 24B through `https://router.huggingface.co/featherless-ai/v1` |

Mistral 3.1 has a live Featherless provider mapping, but the generic `/v1` router also rejects its chat classification. The direct HF provider route succeeds. A model's ability to converse and its eligibility in the HF router registry are separate properties; these errors do not establish that the underlying instruct model cannot chat.

Qwen8's explicit route returned HTTP 200 but initially used the tiny output allowance entirely for reasoning. `chat_template_kwargs.enable_thinking=false` produced a JSON answer with the same bounded allowance. The adapter now adds this field for Qwen3 models explicitly routed through Featherless, while preserving other hosted providers' request formats. [HF Featherless routing](https://huggingface.co/docs/inference-providers/providers/featherless-ai), [Featherless thinking controls](https://featherless.ai/docs/chat-template-kwargs).

## Code and model configuration changes

- `src/playwright/models.mjs`: seven current profiles, with `gemma-3-12b` and `mistral-small-3.1-24b` replacing the unavailable versions. Qwen8 keeps its checkpoint and pins Featherless. Mistral's direct provider URL replaces only the default router URL; explicitly customized endpoint URLs remain intact.
- `input/inference/adapters.ts`: verified non-thinking Qwen/Featherless requests and correct provider names in connection errors.
- `input/inference/config.ts`: hosted HF requests identify themselves as Hugging Face in errors, rather than Apertus.
- Setup documentation and implementation plan now reflect the current seven-model lineup. Earlier artifacts keep their original model identities and failures.

No provider account preferences were changed, no additional API key was introduced, and no dedicated paid endpoint was created.

## Live checks after the fix

All three fixed/replacement routes returned HTTP 200 for small diagnostic requests. Each then ran the real first benchmark prompt through the existing app:

| Model | Provider access | First-prompt pipeline outcome |
| --- | --- | --- |
| Qwen3-8B via Featherless | Working | Created and rendered; browser benchmark retained the visible “Pick an experiment.” alert failure |
| Gemma 3 12B via DeepInfra | Working | Reached interpretation, assembly planning, and input selection; returned `unsupported` for this prompt |
| Mistral Small 3.1 24B via direct HF Featherless route | Working | Created and rendered; browser benchmark retained the same visible-alert failure |

Routing is verified independently of benchmark quality. These are first-prompt trials, not full forty-prompt scores. The validator and browser checks were not weakened to make the results pass.

Generated private evidence remains under `src/playwright/runs/hf-routing-investigation/` and `src/playwright/runs/hf-fixed-first-prompt-2026-10-13T18-28-38-375Z/summary.json`. Each trial includes its report, screenshot, request correlation, usage, validation counters, and resolved endpoint/model settings.

Focused profile and adapter checks pass for the provider-qualified model IDs, direct route selection, preserved custom endpoints, Qwen non-thinking request body, and hosted provider labels. The web TypeScript check also passed. Existing full-contract check limitations remain documented in the original implementation report.

## Four bit quantization

The current local Apertus build is already MXFP4: approximately 4-bit weights, with scale overhead giving 4.25 bits per weight. [Model card](https://huggingface.co/m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4).

The shared HF chat-completion API exposes model and provider selection, not arbitrary deployment quantization. Its provider owns the deployed precision unless it serves a separate, explicitly identified quantized checkpoint. Selecting a model repository containing 4-bit files does not deploy those files automatically. [Documented chat parameters](https://huggingface.co/docs/inference-providers/en/tasks/chat-completion).

For exact 4-bit control in the cloud, a dedicated HF Inference Endpoint can load a compatible GGUF artifact using llama.cpp. Its deployment settings let you choose the quantized file, such as Q4_K_M. This applies to Apertus or other small models when a suitable GGUF and supported architecture are available. The current MLX-format weights require an MLX runtime; a GGUF endpoint uses a different compatible conversion/quantization. [HF llama.cpp deployment guide](https://huggingface.co/docs/inference-endpoints/en/engines/llama_cpp), [existing Apertus 1.5 Q4 GGUF](https://huggingface.co/Colby/apertus-v1.5-8b-text-Q4_K_M-GGUF).

The shared router currently lists an older Apertus 8B checkpoint, not the Apertus 1.5 build in this project. Retain local Apertus 1.5 for this campaign unless a separately deployed endpoint is chosen. Record quantization per run and treat unknown shared-provider precision as unknown; do not label all hosted comparisons 4-bit without evidence.
