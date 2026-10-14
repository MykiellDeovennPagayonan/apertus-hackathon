# Llama replacement and benchmark alert correction

Date: 2026-10-14

All first-prompt trials used the same prompt: “Show me 2 projectiles distance comparison based on angles.” Different prompts did not cause the differences in results.

The original HF failures were provider-routing rejections, addressed in [the routing investigation](hf-routing-fix.md). Gemma 3 subsequently had a working route but returned `unsupported` before validation. The user requested another replacement.

## Corrected browser measurement

Saved traces for all six created generations in `seven-model-first-prompt-rerun-2026-10-13T18-37-54-284Z` identify the “Pick an experiment.” alert as Next.js's `#__next-route-announcer__` in a shadow root. This is a clipped screen-reader navigation announcement. Playwright's visibility check nevertheless includes its nonzero bounding box. It is not a generation error.

The benchmark now excludes only that specific announcer ID from alert collection. It continues to fail on genuine visible alerts, console errors, page errors, HTTP errors, network errors, unsupported results, and missing required telemetry. No inference, validation, or application behavior changed for this correction.

Original run statuses and evidence remain unchanged. Their six browser failures were false positives; each simulation was created and passed initial validation without repairs. They have not been regenerated with the corrected check, so do not present them as fresh corrected-browser PASS runs.

## Replacement

The current seven-model lineup replaces `gemma-3-12b` with `llama-3.1-8b`: `meta-llama/Llama-3.1-8B-Instruct:featherless-ai`. Its 8B size is close to Apertus and adds a distinct family alongside Qwen. It uses the existing HF token and router, with no new endpoint deployment. The weights use Meta's Llama license, not an unrestricted open-source license. [Official model card](https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct).

Live Hub metadata listed Featherless as a conversational provider. A small authenticated diagnostic request returned HTTP 200. One real first-prompt attempt with repair memory off then produced:

| Generation | Browser check | Submission to render | First-pass validation | Schema repairs | Composer feedback |
| --- | --- | --- | --- | --- | --- |
| Created | PASS | 28.8 seconds | Yes, both required stages | 0 | 0 |

Evidence: `src/playwright/runs/2026-10-13T18-46-00-718Z-41948/`, including the report, screenshot, trace, and measurements. This is one prompt, not a complete 40-question score.

Model configuration, profile tests, evaluator README, and implementation plan reflect the replacement. Historical Gemma artifacts remain available under their original identities.

## Verification

The focused profile/artifact tests pass. The runner fixture now includes a clipped navigation announcer on every case, an intentional HTTP failure, and a genuine visible error alert. Expected results are 38 PASS and 2 ERROR, preserving validation measurements and checking that navigation announcements pass while actual alerts fail. No provider calls are made by the fixture.
