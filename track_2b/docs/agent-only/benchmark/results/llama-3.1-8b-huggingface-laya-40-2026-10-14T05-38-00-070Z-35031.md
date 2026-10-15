# Full 40-prompt benchmark: Hugging Face llama-3.1-8b + local Laya

Run: `2026-10-14T05-38-00-070Z-35031`. **Finished.**

Model: `meta-llama/Llama-3.1-8B-Instruct:featherless-ai` through Hugging Face. Local Laya `aac6fef/laya-multilingual-mlx`; hybrid/required-laya policy; repair memory off. One scored attempt per prompt, no external retries. Existing bounded internal repairs remain enabled. Provider setup is unscored.

## Recorded configuration

| Setting | Value |
| --- | --- |
| Hosted endpoint | `https://router.huggingface.co/v1` |
| Model | `meta-llama/Llama-3.1-8B-Instruct:featherless-ai` |
| Output-token ceiling | 1024 |
| Reasoning effort | Provider/model default |
| Provider timeout | 120 s |
| Pipeline timeout | 240 s |
| Capture | 1440 × 1000; one worker; no retries |
| Pipeline source fingerprint | `0a6bea27a6428caf3065f345da8604b4d21bf076d5101418a08976268aa95b8c` |
| Source revision | `9f0c351b5aef3b063029509e425075facdb52f2e`; uncommitted changes: true |

All six hosted batches used this same pipeline fingerprint. Hosted models used their recorded provider settings; OpenAI and HF output budgets differ. First-pass validation does not imply zero JSON/schema repairs or complete semantic coverage.

## Summary

| Metric | Result |
| --- | --- |
| Render success | **39/40 — 97.5%** |
| First-validator pass, all prompts | **39/40 — 97.5%** |
| First-validator pass, among prompts reaching validation | **39/39 — 100.0%** |
| Validator returns to composer | 0 |
| Successful generations with zero repairs of any kind | 34/40 — 85.0% (34/39 successes) |
| JSON/schema repair attempts | 5 |
| Deterministic repairs | 0 |
| Mean generation time, successful results | 22.92 s |
| Median generation time, successful results | 18.36 s |
| P95 generation time, successful results | 58.28 s |
| Generation time range, successful results | 7.20 s–58.66 s |
| Scored batch wall time | 18 min 4.8 s |
| Timing samples | 39 successful generations |
| Missing terminal measurements | 0 |

First pass is recorded in [run.json](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/run.json) at `rows[].measurements.firstPass`, alongside `validationReached`, `firstValidatorOutcomes` and `composerFeedback`. A formatting/schema repair is distinct from a validator return; absent measurements are not counted as passes.

## Failures

| Prompt | Outcome | Observed reason |
| --- | --- | --- |
| 18 — hydraulics | ERROR / failed | {"at": "2026-10-14T05:45:23.492Z", "event": "error-details", "message": "Details\n\nHugging Face inference returned HTTP 502."} |

## Screenshot review

All captured results were visually inspected. Render success is separate from semantic accuracy; learner interactions were not exercised end to end.

## Per-prompt measurements and screenshots

| # | Prompt | Render | First validator | Generation / error-terminal seconds | JSON repairs | Validator returns | Screenshot review |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | projectile | PASS | PASS | 23.63 | 1 | 0 | Correct two-projectile comparison, two angle controls and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-01-projectile/attachments/result-97a0fb904fa0723fad21f79442614333d41197d9.png) |
| 2 | price-elasticity | PASS | PASS | 10.64 | 0 | 0 | Correct demand/revenue graphs with price control and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-02-price-elasticity/attachments/result-6292d456587ffbb4b18bed69c53c4e2f0a5d806a.png) |
| 3 | pythagorean | PASS | PASS | 19.24 | 0 | 0 | Correct ladder/right triangle with distance and height controls. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-03-pythagorean/attachments/result-6bf23fe3ab7bad4c1ac7a65cfeba2a67a8818ef8.png) |
| 4 | acid-base-titration | PASS | PASS | 15.41 | 0 | 0 | Correct titration apparatus and pH curve with titrant-volume control. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-04-acid-base-titration/attachments/result-3d615f2ffa99d26a467d93fbd82b2194f6a19291.png) |
| 5 | cost-and-profit | PASS | PASS | 15.73 | 0 | 0 | Correct cost/profit graphs; market-price and fixed-cost controls visible, production quantity not visibly adjustable. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-05-cost-and-profit/attachments/result-e9b3de5b86777726841357e616709f6835412c7e.png) |
| 6 | tree-height | PASS | PASS | 46.83 | 1 | 0 | Correct tree-height scene; angle/distance controls and bottom extras partly overlapped by composer. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-06-tree-height/attachments/result-36f2f7c8f61af2bf312dd5735cd64c6c54685c07.png) |
| 7 | galvanic-cell | PASS | PASS | 26.92 | 0 | 0 | Semantic failure: battery/voltage request rendered Beer-Lambert spectrophotometer instead of galvanic cell. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-07-galvanic-cell/attachments/result-5bf551d2e5a640179bdf75b17bec20e0eefe98c4.png) |
| 8 | craft-production | PASS | PASS | 13.11 | 0 | 0 | Correct single craft/assembly comparison with two main controls; large empty outcome panel. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-08-craft-production/attachments/result-c9283ce9e001d4d53a9ac082558d7409f1cc0fc3.png) |
| 9 | tile-patterns | PASS | PASS | 10.88 | 0 | 0 | Correct polygon tessellation with sides control; only one polygon choice shown at a time. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-09-tile-patterns/attachments/result-b863f158581392913cc6553da0411a29e865e0bd.png) |
| 10 | wildfire | PASS | PASS | 16.23 | 0 | 0 | Correct wildfire comparison and three main controls; empty outcome panel and extras partially off right edge. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-10-wildfire/attachments/result-52adc20fa0cab9dcf924a62ea8171f7840e0b81b.png) |
| 11 | can-material | PASS | PASS | 15.14 | 0 | 0 | Correct fixed-volume can/material curve with radius control; lower control near floating toolbar. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-11-can-material/attachments/result-d2c170e223d022b749632a8a7198300b41077ef3.png) |
| 12 | survey-sampling | PASS | PASS | 13.46 | 0 | 0 | Correct single sampling distribution with size control; no simultaneous small/large comparison. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-12-survey-sampling/attachments/result-facf43f868371c1b6cde88f73cf6565fba912ea0.png) |
| 13 | levers | PASS | PASS | 22.34 | 0 | 0 | Correct crowbar/pivot scene with one main slider and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-13-levers/attachments/result-b250297242860cece27db4a8cd099f99aacb8cc6.png) |
| 14 | pulleys | PASS | PASS | 17.93 | 0 | 0 | Correct pulley scene with strand selector and rope-pull control. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-14-pulleys/attachments/result-7791c4bddf7f551c4cb0b4107a96f2037b0933a4.png) |
| 15 | bicycle-gears | PASS | PASS | 18.36 | 0 | 0 | Correct bicycle-gears scene with front/rear teeth controls; progression not exercised. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-15-bicycle-gears/attachments/result-c6aa5cf00ef8d29e90fa7ecb197aca1a2df11339.png) |
| 16 | tipping | PASS | PASS | 23.96 | 0 | 0 | Correct tipping cabinet with tilt, shelf height and cabinet height controls. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-16-tipping/attachments/result-a7363299be6a9e51e2883cd0b789ec626a16f54c.png) |
| 17 | collisions | PASS | PASS | 29.24 | 0 | 0 | Correct two-cart scene with two speed controls and collide button; before-impact capture, mass adjustments not visible. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-17-collisions/attachments/result-7cedb18f3fa76a39c44670456993fcaa941f9596.png) |
| 18 | hydraulics | ERROR | Not reached | 8.44 | 0 | 0 | Provider HTTP 502 error page; no experiment rendered. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-18-hydraulics/attachments/result-c9a6639f713fcf8de788b7100f4d98b7ce671d37.png) |
| 19 | buoyancy | PASS | PASS | 58.66 | 1 | 0 | Correct solid-block versus hull scene with cargo control; captured hull is overloaded/submerged. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-19-buoyancy/attachments/result-5e0f7f5a3598f0e161f3af00124ef9b35deeb6bf.png) |
| 20 | doppler-siren | PASS | PASS | 25.19 | 0 | 0 | Correct moving-source wavefront scene with time and speed controls. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-20-doppler-siren/attachments/result-6491e69454f3bf75fe7e49de5acc6e2192f77fd5.png) |
| 21 | guitar-string | PASS | PASS | 17.56 | 0 | 0 | Correct single vibrating-string scene with length/wave-cycle controls; tension adjustment not exposed. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-21-guitar-string/attachments/result-d858685cb0d722076c38de083a9d41e4f3b4180b.png) |
| 22 | cooling-drinks | PASS | PASS | 35.42 | 0 | 0 | Correct two-drink cooling comparison at different room temperatures with shared playback and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-22-cooling-drinks/attachments/result-53e53f5587174dd6d1df2b3fd8d6bb37bbb7d077.png) |
| 23 | magnet-induction | PASS | PASS | 32.79 | 0 | 0 | Correct magnet/coil scene with position and signed-speed controls. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-23-magnet-induction/attachments/result-207ba9375b8616be9df9b6f37ce81cb3b1aa5c8b.png) |
| 24 | rc-circuit | PASS | PASS | 31.31 | 0 | 0 | Correct RC circuit with connection selector, advance/reset buttons; resistance/capacitance adjustments not exposed. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-24-rc-circuit/attachments/result-82b3a1782c65049ba91fa5da901513645423978a.png) |
| 25 | fraction-number-line | PASS | PASS | 11.10 | 1 | 0 | Correct fraction number line, target input and placement feedback. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-25-fraction-number-line/attachments/result-c67fba71f2ef7fe30ead8f04b4a3a583268d3b2e.png) |
| 26 | cell-division | PASS | PASS | 26.79 | 0 | 0 | Correct cell-division scene with stage buttons, error toggle and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-26-cell-division/attachments/result-f1158cea3863a1645511edac1c554fb74980d440.png) |
| 27 | area-perimeter | PASS | PASS | 17.48 | 1 | 0 | Correct rectangle type but only one rectangle; requested two-instance comparison absent. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-27-area-perimeter/attachments/result-c7ac473d345a328fad5c66d9d3b254bd42f0ddd3.png) |
| 28 | beer-lambert | PASS | PASS | 41.43 | 0 | 0 | Correct spectrophotometer with concentration and path-length controls and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-28-beer-lambert/attachments/result-3d8a5d68cfb0f51546fdb552e1c64e8429475e4c.png) |
| 29 | arithmetic | PASS | PASS | 10.51 | 0 | 0 | Semantic coverage failure: counting activity instead of add/subtract arithmetic task. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-29-arithmetic/attachments/result-a4ccf00b82d078cca2c427d1b402100d54c7db52.png) |
| 30 | gas-equilibrium | PASS | PASS | 20.22 | 0 | 0 | Correct gas-equilibrium chamber with temperature and volume controls. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-30-gas-equilibrium/attachments/result-0ff0d8a731ddb6621ca6822da158dc1c56e06684.png) |
| 31 | phase-change | PASS | PASS | 20.14 | 0 | 0 | Correct phase chamber/diagram; authored pressure control extends under composer/below capture. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-31-phase-change/attachments/result-5f1940c0079d0c5440fc388211cbf63c4f4a9c1e.png) |
| 32 | coordinates | PASS | PASS | 7.20 | 0 | 0 | Correct Cartesian point with x/y controls. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-32-coordinates/attachments/result-1f437c9a0382c2093c6e7c7169ef2cdadd4fccc9.png) |
| 33 | water-pressure | PASS | PASS | 18.10 | 0 | 0 | Correct outlet/stream scene with hole-height control; water-level adjustment inside extras. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-33-water-pressure/attachments/result-81029cb5ea1c223845fa640099e92a72c78dde43.png) |
| 34 | voting-systems | PASS | PASS | 17.35 | 0 | 0 | Correct election/voter scene; voting-rule controls inside extras, no visible winner output in capture. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-34-voting-systems/attachments/result-5d21324227db1dd198225a3ed3aaf76a074f74fc.png) |
| 35 | counting | PASS | PASS | 10.30 | 0 | 0 | Correct counting activity with circles input; defaults to five circles. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-35-counting/attachments/result-31173dd3424382c9f6160741a861fa01efad1169.png) |
| 36 | equal-groups | PASS | PASS | 11.72 | 0 | 0 | Division/sharing activity rather than requested groups-times-dots multiplication. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-36-equal-groups/attachments/result-66ef191b7db7baf25d87319503b99a9b241a627e.png) |
| 37 | pendulum | PASS | PASS | 23.83 | 0 | 0 | Correct pendulum and length/angle controls; period caption partly clipped. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-37-pendulum/attachments/result-a130dcb8926a4e5e4f3d46bff9e5edcb7eb5a192.png) |
| 38 | slope | PASS | PASS | 41.41 | 0 | 0 | Correct Cartesian slope/intercept graph and two controls; no tree. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-38-slope/attachments/result-dca8acbc2937a12e06ef93ce475565340381f5f8.png) |
| 39 | bridge | PASS | PASS | 17.99 | 0 | 0 | Correct bridge/truck scene with load-position and mass controls; no tree. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-39-bridge/attachments/result-ac62a29cd3bc5767f8d37c7fb537f53628f9e1d5.png) |
| 40 | shared-fishing-lake | PASS | PASS | 58.28 | 0 | 0 | Correct fishing lake with catch selector, 30-day playback button and compact extras; progression not exercised. [Image](../../../../src/playwright/runs/2026-10-14T05-38-00-070Z-35031/artifacts/benchmark-40-shared-fishing-lake/attachments/result-d578264443ae4ffbc9f3dd61867ef740e1cc1bd9.png) |

Successful timing is submission-to-render generationMs. Failed timing uses server terminal elapsedMs when available. Wall time includes screenshots/test overhead; provider setup is excluded. Hosted timing should not be interpreted as a like-for-like hardware comparison with the local Apertus run.

## Evaluation gallery

Current results: `src/eval/public/benchmarks/llama-3.1-8b/current.json`. Each successful image is saved in `llama-3.1-8b/images` inside src/eval. Failed latest attempts have no selectable image. Other models and unattempted prompts are preserved. Raw events, errors, configuration and measurements remain in the source run folder.
