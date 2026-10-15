# Full 40-prompt benchmark: Hugging Face mistral-small-3.1-24b + local Laya

Run: `2026-10-14T06-58-22-525Z-60750`. **Finished.**

Model: `mistralai/Mistral-Small-3.1-24B-Instruct-2503` through Hugging Face. Local Laya `aac6fef/laya-multilingual-mlx`; hybrid/required-laya policy; repair memory off. One scored attempt per prompt, no external retries. Existing bounded internal repairs remain enabled. Provider setup is unscored.

## Recorded configuration

| Setting | Value |
| --- | --- |
| Hosted endpoint | `https://router.huggingface.co/featherless-ai/v1` |
| Model | `mistralai/Mistral-Small-3.1-24B-Instruct-2503` |
| Output-token ceiling | 1024 |
| Reasoning effort | Provider/model default |
| Provider timeout | 120 s |
| Pipeline timeout | 240 s |
| Capture | 1440 × 1000; one worker; no retries |
| Pipeline source fingerprint | `0a6bea27a6428caf3065f345da8604b4d21bf076d5101418a08976268aa95b8c` |
| Source revision | `c4ab92e94ac1844e6d3683b1c0bdfd460c257350`; uncommitted changes: true |

All six hosted batches used this same pipeline fingerprint. Hosted models used their recorded provider settings; OpenAI and HF output budgets differ. First-pass validation does not imply zero JSON/schema repairs or complete semantic coverage.

## Summary

| Metric | Result |
| --- | --- |
| Render success | **39/40 — 97.5%** |
| First-validator pass, all prompts | **39/40 — 97.5%** |
| First-validator pass, among prompts reaching validation | **39/39 — 100.0%** |
| Validator returns to composer | 0 |
| Successful generations with zero repairs of any kind | 39/40 — 97.5% (39/39 successes) |
| JSON/schema repair attempts | 0 |
| Deterministic repairs | 0 |
| Mean generation time, successful results | 24.60 s |
| Median generation time, successful results | 24.09 s |
| P95 generation time, successful results | 50.30 s |
| Generation time range, successful results | 9.14 s–50.90 s |
| Scored batch wall time | 18 min 39.1 s |
| Timing samples | 39 successful generations |
| Missing terminal measurements | 0 |

First pass is recorded in [run.json](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/run.json) at `rows[].measurements.firstPass`, alongside `validationReached`, `firstValidatorOutcomes` and `composerFeedback`. A formatting/schema repair is distinct from a validator return; absent measurements are not counted as passes.

## Failures

| Prompt | Outcome | Observed reason |
| --- | --- | --- |
| 7 — galvanic-cell | ERROR / unsupported | {"at": "2026-10-14T07:02:43.013Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |

## Screenshot review

All captured results were visually inspected. Render success is separate from semantic accuracy; learner interactions were not exercised end to end.

## Per-prompt measurements and screenshots

| # | Prompt | Render | First validator | Generation / error-terminal seconds | JSON repairs | Validator returns | Screenshot review |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | projectile | PASS | PASS | 39.39 | 0 | 0 | Correct two-projectile comparison, two angle controls, distance readouts and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-01-projectile/attachments/result-0bf8d8d417be8c8d0e7535363ad576fd393d1957.png) |
| 2 | price-elasticity | PASS | PASS | 36.07 | 0 | 0 | Correct demand/revenue plots with price control and readouts; bottom readout near floating toolbar. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-02-price-elasticity/attachments/result-6b32156199ce1d23dbc096785d7691a5b4bc47ab.png) |
| 3 | pythagorean | PASS | PASS | 44.34 | 0 | 0 | Correct ladder/right triangle with distance and height controls. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-03-pythagorean/attachments/result-c7fec6c0100efbf102344722a012a8a7590687c8.png) |
| 4 | acid-base-titration | PASS | PASS | 24.44 | 0 | 0 | Correct titration apparatus/pH plot with pH/equivalence readouts; volume control hidden in extras. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-04-acid-base-titration/attachments/result-6d6420a175bdbc28cf9a2a120cd20d4332cffe85.png) |
| 5 | cost-and-profit | PASS | PASS | 29.64 | 0 | 0 | Correct cost/profit scene and output readouts; market-price/fixed-cost controls visible, production quantity not adjustable. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-05-cost-and-profit/attachments/result-dab1f1b40174331e27e2b40bd9418f93304b10dd.png) |
| 6 | tree-height | PASS | PASS | 25.33 | 0 | 0 | Correct tree-height scene; angle/distance controls and bottom extras partly overlapped by composer. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-06-tree-height/attachments/result-c7958cef055d74037107464b2490092a7f44f504.png) |
| 7 | galvanic-cell | ERROR | Not reached | 8.09 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-07-galvanic-cell/attachments/result-05f9f49efbfd762c6f1c6e7493a01f3dd8496cce.png) |
| 8 | craft-production | PASS | PASS | 24.09 | 0 | 0 | Correct single factory comparison with three main controls and production readouts. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-08-craft-production/attachments/result-67256605c8ccd3e97711d96e1220aebff50f471d.png) |
| 9 | tile-patterns | PASS | PASS | 14.19 | 0 | 0 | Correct polygon tessellation with sides control; only one polygon choice shown at a time. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-09-tile-patterns/attachments/result-7ea0ec4b936796d8455e3442dd36baac19f663f5.png) |
| 10 | wildfire | PASS | PASS | 21.23 | 0 | 0 | Correct treated/untreated wildfire with moisture control and outcome readouts; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-10-wildfire/attachments/result-2a7244e26402dfb27fc20db38a8e85bac1928021.png) |
| 11 | can-material | PASS | PASS | 25.96 | 0 | 0 | Correct fixed-volume can/material curve with radius control; lower control near floating toolbar. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-11-can-material/attachments/result-ad4df5759bfd33d8e61f3bf634ca47cd7a8cf4eb.png) |
| 12 | survey-sampling | PASS | PASS | 13.03 | 0 | 0 | Correct single sampling distribution and size control; no simultaneous small/large comparison, extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-12-survey-sampling/attachments/result-8c2ea6a5af774689e93098c543a37401572046d7.png) |
| 13 | levers | PASS | PASS | 19.85 | 0 | 0 | Correct crowbar/pivot scene with one main slider and uncluttered layout. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-13-levers/attachments/result-b2136e27aafffce469b6315c3d6533e36d0b496b.png) |
| 14 | pulleys | PASS | PASS | 17.50 | 0 | 0 | Correct pulley scene with strand selector and rope-pull control. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-14-pulleys/attachments/result-3a6d14dd3dd8afd1c483893e9bed4fd12f1fa172.png) |
| 15 | bicycle-gears | PASS | PASS | 31.96 | 0 | 0 | Correct bicycle-gears scene with front/rear teeth controls; progression not exercised. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-15-bicycle-gears/attachments/result-4d50d4160d9c6580de883da37cbec1b7104345b0.png) |
| 16 | tipping | PASS | PASS | 25.57 | 0 | 0 | Correct tipping cabinet with tilt, shelf height and cabinet height controls. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-16-tipping/attachments/result-adf180988a792df0b231cac2bae78cd282ff1a66.png) |
| 17 | collisions | PASS | PASS | 15.44 | 0 | 0 | Correct two-cart scene and two speed controls; before-impact capture, mass controls not visible. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-17-collisions/attachments/result-02501c471af147dc8c5940ef57d8408b31e02de1.png) |
| 18 | hydraulics | PASS | PASS | 12.65 | 0 | 0 | Correct two-piston hydraulic lift with three main controls. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-18-hydraulics/attachments/result-d45aac49a6b1ca0399001e49f16192d01a45a328.png) |
| 19 | buoyancy | PASS | PASS | 50.30 | 0 | 0 | Correct solid-block versus hull scene with cargo control; captured hull is overloaded/submerged. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-19-buoyancy/attachments/result-9b30b2eeb753087b945dbe8259568bc47508c21e.png) |
| 20 | doppler-siren | PASS | PASS | 19.52 | 0 | 0 | Correct Doppler scene with speed control; time adjustment not visible. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-20-doppler-siren/attachments/result-1ca1019e761dff07f968605ff1279a4602a51fef.png) |
| 21 | guitar-string | PASS | PASS | 17.64 | 0 | 0 | Correct string scene with length/harmonic controls; tension adjustment not visible. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-21-guitar-string/attachments/result-56ba375330d4e8be7ec2f649c5940adffeaf7e01.png) |
| 22 | cooling-drinks | PASS | PASS | 25.26 | 0 | 0 | Correct two-drink cooling comparison; all controls inside extras. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-22-cooling-drinks/attachments/result-8ea995c65434b11f8e36e49bcb7b1f6e53b48388.png) |
| 23 | magnet-induction | PASS | PASS | 25.25 | 0 | 0 | Correct magnet/coil scene with position and signed-speed controls. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-23-magnet-induction/attachments/result-433fc44dc777e49ba4932bbacef37b66204906fb.png) |
| 24 | rc-circuit | PASS | PASS | 26.75 | 0 | 0 | Correct RC circuit but only connection selector visible; resistance/capacitance adjustments not exposed. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-24-rc-circuit/attachments/result-dd4f851368a3713c35045cbe7894544fb1f0e22e.png) |
| 25 | fraction-number-line | PASS | PASS | 19.46 | 0 | 0 | Correct fraction number line, target input and placement feedback. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-25-fraction-number-line/attachments/result-1056ba5fdb0ccbf6fecb435a748b156651d0b6bb.png) |
| 26 | cell-division | PASS | PASS | 16.83 | 0 | 0 | Correct cell scene with explanatory observation; stage controls clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-26-cell-division/attachments/result-d214e51f3497af9d68d400bbbcc9fe9c87f1a1f0.png) |
| 27 | area-perimeter | PASS | PASS | 22.42 | 0 | 0 | Correct rectangle and dimension controls/readouts but only one instance; requested two-rectangle comparison absent. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-27-area-perimeter/attachments/result-46c2c1f3396858f7296f71519996e036edc37b44.png) |
| 28 | beer-lambert | PASS | PASS | 20.48 | 0 | 0 | Correct spectrophotometer with concentration control and output readouts; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-28-beer-lambert/attachments/result-577641aa33b7d8feae11e152cfe847962b5e403d.png) |
| 29 | arithmetic | PASS | PASS | 13.21 | 0 | 0 | Correct add/subtract circles activity. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-29-arithmetic/attachments/result-aaa9a45c75ead7d196e1afd568a8e6fc7a0d5309.png) |
| 30 | gas-equilibrium | PASS | PASS | 32.47 | 0 | 0 | Correct gas-equilibrium chamber with volume control and pressure/equilibrium/concentration readouts. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-30-gas-equilibrium/attachments/result-29501abe1c0e4cd6ce99a7b7deca1b86d65249d2.png) |
| 31 | phase-change | PASS | PASS | 26.17 | 0 | 0 | Correct phase chamber/diagram and readouts; stacked authored controls extend under composer/below capture. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-31-phase-change/attachments/result-e2e2280a0962a5013e7c631e08ab990a83d86f00.png) |
| 32 | coordinates | PASS | PASS | 9.14 | 0 | 0 | Correct Cartesian point with x/y controls. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-32-coordinates/attachments/result-dfd1185c72df22e43d36e4c23abe9dd3d90cc52f.png) |
| 33 | water-pressure | PASS | PASS | 15.46 | 0 | 0 | Correct outlet/stream scene with hole-height control; water-level adjustment inside extras. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-33-water-pressure/attachments/result-83b2efc66008807707b93fc042be774a67bf7363.png) |
| 34 | voting-systems | PASS | PASS | 40.29 | 0 | 0 | Correct voter/election scene with rule selector; no winner visible at capture. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-34-voting-systems/attachments/result-81e0b4f7b2481f260743d58e4dc4b94a43d761ec.png) |
| 35 | counting | PASS | PASS | 12.12 | 0 | 0 | Correct counting activity with circle-count input and count readout. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-35-counting/attachments/result-1657599965b25ea4bc1cc1d90d7684ad57bdbfc2.png) |
| 36 | equal-groups | PASS | PASS | 13.29 | 0 | 0 | Division/sharing activity rather than requested groups-times-dots multiplication. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-36-equal-groups/attachments/result-684c99f273e5aa366dd70e7d30f3cbf9dd63bd0b.png) |
| 37 | pendulum | PASS | PASS | 27.12 | 0 | 0 | Correct pendulum, length/angle controls and period readout; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-37-pendulum/attachments/result-3f67837ed460e18eef371072eaf247f7b3392bf4.png) |
| 38 | slope | PASS | PASS | 50.90 | 0 | 0 | Correct Cartesian slope/intercept graph and two controls; no tree. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-38-slope/attachments/result-89f73875fa43e3916abfdb86b1042993e503f94d.png) |
| 39 | bridge | PASS | PASS | 22.28 | 0 | 0 | Correct bridge/truck with load-position/mass controls; member-selection observation empty until interaction. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-39-bridge/attachments/result-e00a20cade433686123e0946192270f570351a4b.png) |
| 40 | shared-fishing-lake | PASS | PASS | 32.54 | 0 | 0 | Correct fishing lake with catch selector and compact extras; progression not exercised. [Image](../../../../src/playwright/runs/2026-10-14T06-58-22-525Z-60750/artifacts/benchmark-40-shared-fishing-lake/attachments/result-6802cd45860369d7d9f4cd6d31c4aef9a242b129.png) |

Successful timing is submission-to-render generationMs. Failed timing uses server terminal elapsedMs when available. Wall time includes screenshots/test overhead; provider setup is excluded. Hosted timing should not be interpreted as a like-for-like hardware comparison with the local Apertus run.

## Evaluation gallery

Current results: `src/eval/public/benchmarks/mistral-small-3.1-24b/current.json`. Each successful image is saved in `mistral-small-3.1-24b/images` inside src/eval. Failed latest attempts have no selectable image. Other models and unattempted prompts are preserved. Raw events, errors, configuration and measurements remain in the source run folder.
