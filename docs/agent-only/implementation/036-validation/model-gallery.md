# Model-based screenshot gallery

Date: 2026-10-14

The evaluator now accumulates completed models across separate benchmark executions. An Apertus batch followed by Qwen and Llama batches produces one comparison gallery with all three models for every prompt. Execution IDs remain screenshot and measurement provenance; evaluators do not need to choose a generation run or start a new evaluation to see newly added models.

The catalog retains every published execution. The gallery groups those records by model and uses the latest complete forty-question set for each model. A newer execution of one model does not remove other models. Incomplete first-prompt diagnostics remain excluded from full evaluation. Failed candidates remain explicit and unselectable.

The app checks for new models every thirty seconds, on refresh, and when returning to the tab. Added models join the current saved evaluation while preserving its current question, favorites, none-preferred choices, and the relative order of earlier candidates. New anonymous candidates are inserted at randomized positions. Routine checks with no additions do not rebuild the gallery or interrupt keyboard focus.

Each vote stores its candidate exposure. When models are added, previous selections remain saved but need review; the evaluator can update them or confirm the selection. JSON exports distinguish an earlier vote against two models from a later vote against all seven. Existing saved evaluations without exposure fields remain readable. If an existing model receives replacement screenshots, the original evaluation is preserved as history rather than assigning its votes to new images.

The gallery still checks that all models use the same forty prompts. It no longer rejects models merely because they were generated under different source revisions or pipeline settings. Those settings stay in the exported measurements for analysis.

Verification:

- State tests cover addition of multiple models, preserved favorites and exposure, immediate vote saving, refresh persistence, same-model replacement, differing configurations, and malformed saved data.
- Local browser fixtures exercise a live gallery growing from two to seven models without refresh or a new session, alongside keyboard voting, JSON downloads, responsive layout, and browser storage failure.
- Artifact/profile tests verify existing publication and model configuration remain intact.

No model generations were rerun, and existing benchmark images and measurements were not changed. Only Apertus currently has a complete real forty-prompt set; further complete model batches will be added automatically.

## Per-prompt current gallery

The gallery now uses `index.json.models` and `<model>/current.json`. Terminal outcomes from focused and full runs update individual prompt entries, leaving unattempted prompts and other models intact. Active images are `<model>/images/<prompt>.png` with a source-run cache version; sourceRunId and sourceConfiguration remain attached to each row. Newer failures clear older successes. Historical publications remain archived but are not gallery choices. Replaced current images are not displayed as historical screenshots. Unit checks cover focused merging, older-run imports, model preservation and vote provenance; browser checks and a standalone-copy check passed before the full40 run 2026-10-14T03-44-57-140Z-19945.
