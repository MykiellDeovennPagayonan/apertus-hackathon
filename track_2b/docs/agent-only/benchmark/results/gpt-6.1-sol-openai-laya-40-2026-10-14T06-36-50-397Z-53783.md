# Full 40-prompt benchmark: OpenAI gpt-6.1-sol + local Laya

Run: `2026-10-14T06-36-50-397Z-53783`. **Finished.**

Model: `gpt-6.1-sol` through OpenAI. Local Laya `aac6fef/laya-multilingual-mlx`; hybrid/required-laya policy; repair memory off. One scored attempt per prompt, no external retries. Existing bounded internal repairs remain enabled. Provider setup is unscored.

## Recorded configuration

| Setting | Value |
| --- | --- |
| Hosted endpoint | `https://api.openai.com/v1` |
| Model | `gpt-6.1-sol` |
| Output-token ceiling | 4096 |
| Reasoning effort | low |
| Provider timeout | 120 s |
| Pipeline timeout | 240 s |
| Capture | 1440 × 1000; one worker; no retries |
| Pipeline source fingerprint | `0a6bea27a6428caf3065f345da8604b4d21bf076d5101418a08976268aa95b8c` |
| Source revision | `c4ab92e94ac1844e6d3683b1c0bdfd460c257350`; uncommitted changes: true |

All six hosted batches used this same pipeline fingerprint. Hosted models used their recorded provider settings; OpenAI and HF output budgets differ. First-pass validation does not imply zero JSON/schema repairs or complete semantic coverage.

## Summary

| Metric | Result |
| --- | --- |
| Render success | **32/40 — 80.0%** |
| First-validator pass, all prompts | **32/40 — 80.0%** |
| First-validator pass, among prompts reaching validation | **32/32 — 100.0%** |
| Validator returns to composer | 0 |
| Successful generations with zero repairs of any kind | 32/40 — 80.0% (32/32 successes) |
| JSON/schema repair attempts | 0 |
| Deterministic repairs | 0 |
| Mean generation time, successful results | 28.50 s |
| Median generation time, successful results | 19.40 s |
| P95 generation time, successful results | 66.41 s |
| Generation time range, successful results | 12.92 s–120.12 s |
| Scored batch wall time | 20 min 35.0 s |
| Timing samples | 32 successful generations |
| Missing terminal measurements | 0 |

First pass is recorded in [run.json](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/run.json) at `rows[].measurements.firstPass`, alongside `validationReached`, `firstValidatorOutcomes` and `composerFeedback`. A formatting/schema repair is distinct from a validator return; absent measurements are not counted as passes.

## Failures

| Prompt | Outcome | Observed reason |
| --- | --- | --- |
| 5 — cost-and-profit | ERROR / unsupported | {"at": "2026-10-14T06:40:16.418Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |
| 7 — galvanic-cell | ERROR / unsupported | {"at": "2026-10-14T06:40:52.735Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |
| 10 — wildfire | ERROR / unsupported | {"at": "2026-10-14T06:42:06.016Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |
| 16 — tipping | ERROR / unsupported | {"at": "2026-10-14T06:45:25.929Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |
| 17 — collisions | ERROR / unsupported | {"at": "2026-10-14T06:45:42.578Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |
| 21 — guitar-string | ERROR / unsupported | {"at": "2026-10-14T06:47:16.967Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |
| 24 — rc-circuit | ERROR / unsupported | {"at": "2026-10-14T06:48:18.626Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |
| 27 — area-perimeter | ERROR / unsupported | {"at": "2026-10-14T06:49:12.612Z", "event": "error-details", "message": "Details\n\nThe offered activities cannot support this request."} |

## Screenshot review

All captured results were visually inspected. Render success is separate from semantic accuracy; learner interactions were not exercised end to end.

## Per-prompt measurements and screenshots

| # | Prompt | Render | First validator | Generation / error-terminal seconds | JSON repairs | Validator returns | Screenshot review |
| ---: | --- | --- | --- | ---: | ---: | ---: | --- |
| 1 | projectile | PASS | PASS | 17.96 | 0 | 0 | Correct two-projectile scene with two angle controls; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-01-projectile/attachments/result-68950c1ca3659a158a0b51453cb8a26271b82f6b.png) |
| 2 | price-elasticity | PASS | PASS | 66.41 | 0 | 0 | Correct demand/revenue plots with price control; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-02-price-elasticity/attachments/result-f833866534adf2d48c108ae2c8de3f370aa36a7f.png) |
| 3 | pythagorean | PASS | PASS | 14.51 | 0 | 0 | Correct ladder/right triangle with distance and height controls. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-03-pythagorean/attachments/result-31362d776446f4f5e528526a2be57a99d6efdf5d.png) |
| 4 | acid-base-titration | PASS | PASS | 39.27 | 0 | 0 | Correct titration apparatus and pH curve; controls hidden in extras. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-04-acid-base-titration/attachments/result-66c93b03b13a12fde78810f4cca3ec2345bd4522.png) |
| 5 | cost-and-profit | ERROR | Not reached | 34.75 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-05-cost-and-profit/attachments/result-c540b91a8335c4a6e8d0d192b7f2bac0b6b0a461.png) |
| 6 | tree-height | PASS | PASS | 16.30 | 0 | 0 | Correct tree-height scene; angle/distance controls and bottom extras partly overlapped by composer. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-06-tree-height/attachments/result-ecbd2f39fbc68de03d86b7297900b875530f64c7.png) |
| 7 | galvanic-cell | ERROR | Not reached | 9.91 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-07-galvanic-cell/attachments/result-5906c89ba8a3cfe503b33d04139153e3f4d96e4a.png) |
| 8 | craft-production | PASS | PASS | 18.46 | 0 | 0 | Correct factory comparison but main control/outcome panels empty; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-08-craft-production/attachments/result-a5b966dafbc10c11a3cd5d083c93b14cef57dfe4.png) |
| 9 | tile-patterns | PASS | PASS | 21.87 | 0 | 0 | Correct polygon tessellation with sides control; only one polygon choice shown at a time. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-09-tile-patterns/attachments/result-036ddc6d7a5b8ac090d43823a37e6e6eb8b2e900.png) |
| 10 | wildfire | ERROR | Not reached | 18.65 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-10-wildfire/attachments/result-03b35c7c39eeffb1dd7decac7919a013e1644f48.png) |
| 11 | can-material | PASS | PASS | 43.71 | 0 | 0 | Correct can/material curve and radius control; extras off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-11-can-material/attachments/result-4fe6fdb02abbc3863f7e8817cdf75112dbc772e4.png) |
| 12 | survey-sampling | PASS | PASS | 19.37 | 0 | 0 | Correct single sampling distribution and size control; no simultaneous small/large comparison, extras partly off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-12-survey-sampling/attachments/result-6d36af1967f6bc9fa8d94ed1a26d6b3deb794e2e.png) |
| 13 | levers | PASS | PASS | 15.67 | 0 | 0 | Correct crowbar/pivot scene with one main slider and uncluttered layout. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-13-levers/attachments/result-d3dab97fb1421fd8db68c5da8f32850025730723.png) |
| 14 | pulleys | PASS | PASS | 61.05 | 0 | 0 | Correct pulley scene with strand selector and rope-pull control. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-14-pulleys/attachments/result-1f8bacadc4eeaba8683bff663c780726fb679cdf.png) |
| 15 | bicycle-gears | PASS | PASS | 16.81 | 0 | 0 | Correct bicycle-gears scene with front/rear teeth controls; progression not exercised. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-15-bicycle-gears/attachments/result-cd18d19493e398551d119920bec43bb93afa8e37.png) |
| 16 | tipping | ERROR | Not reached | 11.91 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-16-tipping/attachments/result-449ad233e3fdb3b58559e33c3f048ee8baae300c.png) |
| 17 | collisions | ERROR | Not reached | 9.27 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-17-collisions/attachments/result-973c32c425f8a537412a7335e8ec2b219941488f.png) |
| 18 | hydraulics | PASS | PASS | 14.45 | 0 | 0 | Correct two-piston hydraulic lift with three main controls. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-18-hydraulics/attachments/result-55aaab39598e7e570ba678d4eb4add116acf77bf.png) |
| 19 | buoyancy | PASS | PASS | 27.69 | 0 | 0 | Correct floating sealed hull versus sinking solid-block comparison; no cargo control exposed. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-19-buoyancy/attachments/result-3681150b8eac1297a1453ed4441924a836ee01e0.png) |
| 20 | doppler-siren | PASS | PASS | 20.15 | 0 | 0 | Correct moving-source wavefront scene with time and speed controls. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-20-doppler-siren/attachments/result-1f8558cb9e9f2f299b82679c05d97e48da58cdd0.png) |
| 21 | guitar-string | ERROR | Not reached | 8.95 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-21-guitar-string/attachments/result-1d54fecdf0b7cde2d7f7ec04e6f16fcc633d2f84.png) |
| 22 | cooling-drinks | PASS | PASS | 13.03 | 0 | 0 | Correct two-drink cooling comparison at different room temperatures with shared playback and compact extras. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-22-cooling-drinks/attachments/result-02ad689e6b5d4322e80e94dae3c41b94225260b0.png) |
| 23 | magnet-induction | PASS | PASS | 25.43 | 0 | 0 | Correct magnet/coil scene with position and signed-speed controls. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-23-magnet-induction/attachments/result-da370b8cc696f04ddf6d40475e7f0e7d91d6915a.png) |
| 24 | rc-circuit | ERROR | Not reached | 8.25 | 0 | 0 | Unsupported error page; no activity rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-24-rc-circuit/attachments/result-f36f46fc7c4833e5405a99ff752ac19f04921407.png) |
| 25 | fraction-number-line | PASS | PASS | 12.92 | 0 | 0 | Correct fraction number line, target input and placement feedback. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-25-fraction-number-line/attachments/result-1ad52b7ae9d0fa0c33bace52321aed253370030b.png) |
| 26 | cell-division | PASS | PASS | 14.21 | 0 | 0 | Correct cell scene but stage controls/secondary panel clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-26-cell-division/attachments/result-20f822ee19e89355f2ff008739c92a1ad95ec43b.png) |
| 27 | area-perimeter | ERROR | Not reached | 12.36 | 0 | 0 | Unsupported error page; no rectangles rendered. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-27-area-perimeter/attachments/result-df186e49c01bf4b0d60f156c176967fdfd67ea36.png) |
| 28 | beer-lambert | PASS | PASS | 14.95 | 0 | 0 | Correct spectrophotometer with concentration control; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-28-beer-lambert/attachments/result-25db6271e551b0ae27c108cf1efe97c247545852.png) |
| 29 | arithmetic | PASS | PASS | 19.43 | 0 | 0 | Correct add/subtract circles activity. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-29-arithmetic/attachments/result-80b3ba880b12b0e8dd7605f11a70b8e3e661a8eb.png) |
| 30 | gas-equilibrium | PASS | PASS | 19.35 | 0 | 0 | Correct gas-equilibrium scene with volume control. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-30-gas-equilibrium/attachments/result-0ed947f5ec025bf93cf4181bb6374e471d87cf09.png) |
| 31 | phase-change | PASS | PASS | 25.05 | 0 | 0 | Correct phase diagram/chamber with temperature and pressure controls. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-31-phase-change/attachments/result-002590abc562187f086be3b7755a8ce1ec432c51.png) |
| 32 | coordinates | PASS | PASS | 18.02 | 0 | 0 | Correct Cartesian point with x/y controls. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-32-coordinates/attachments/result-e05696efa775ae27048909ba414bf9351a47ed17.png) |
| 33 | water-pressure | PASS | PASS | 120.12 | 0 | 0 | Correct water stream scene; all controls collapsed inside extras. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-33-water-pressure/attachments/result-58bd83db1cf584859727282566b8b19816568f2f.png) |
| 34 | voting-systems | PASS | PASS | 27.80 | 0 | 0 | Correct voter/election scene with ranked-choice rule selector and compact extras; no winner visible in capture. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-34-voting-systems/attachments/result-616fbccabefde2e9819d78b889335149c3ea2b96.png) |
| 35 | counting | PASS | PASS | 64.90 | 0 | 0 | Correct counting activity with circles input; defaults to five circles. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-35-counting/attachments/result-e35dc9c0490bca4459fec559cdff6dbd1a8a3af3.png) |
| 36 | equal-groups | PASS | PASS | 44.01 | 0 | 0 | Division/sharing activity rather than requested groups-times-dots multiplication. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-36-equal-groups/attachments/result-78884435348c9c30cb96c3f951384544baef5d27.png) |
| 37 | pendulum | PASS | PASS | 18.37 | 0 | 0 | Correct pendulum and length/angle controls; extra controls clipped at right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-37-pendulum/attachments/result-a54146a164510a4739d264cfdec34df77e95ccd3.png) |
| 38 | slope | PASS | PASS | 21.94 | 0 | 0 | Correct Cartesian slope/intercept graph and two controls; no tree. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-38-slope/attachments/result-3092f1aa96eca935c69c69f96676390a9042a115.png) |
| 39 | bridge | PASS | PASS | 16.43 | 0 | 0 | Correct bridge/truck and load-position control; extras clipped off right edge. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-39-bridge/attachments/result-acb980a28a1387022008a5bbbb485053baeb494b.png) |
| 40 | shared-fishing-lake | PASS | PASS | 22.46 | 0 | 0 | Correct fishing lake scene; all controls collapsed inside extras. [Image](../../../../src/playwright/runs/2026-10-14T06-36-50-397Z-53783/artifacts/benchmark-40-shared-fishing-lake/attachments/result-d580ffbf9a1109e4b7125ae8f07dc9214187fff6.png) |

Successful timing is submission-to-render generationMs. Failed timing uses server terminal elapsedMs when available. Wall time includes screenshots/test overhead; provider setup is excluded. Hosted timing should not be interpreted as a like-for-like hardware comparison with the local Apertus run.

## Evaluation gallery

Current results: `src/eval/public/benchmarks/gpt-6.1-sol/current.json`. Each successful image is saved in `gpt-6.1-sol/images` inside src/eval. Failed latest attempts have no selectable image. Other models and unattempted prompts are preserved. Raw events, errors, configuration and measurements remain in the source run folder.
