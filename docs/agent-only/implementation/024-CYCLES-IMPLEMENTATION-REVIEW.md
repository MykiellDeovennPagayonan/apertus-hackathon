# Oxygen, nitrogen and carbon cycles: implementation and UX review

Date: 2026-10-10  
Status: implemented; nine repeated live generations and the visible composer review passed.  
Governing requirement: [IMPORTANT.md](IMPORTANT.md).  
Research and proposed wireframes: [024 implementation plan](024-OXYGEN-NITROGEN-CARBON-CYCLES.md).

## Delivered experience

Three ordinary editable experiments are available in the experiment catalog:

- [Oxygen cycle](http://127.0.0.1:43110/experiments?experiment=oxygen-cycle): why can pond oxygen fall at night?
- [Nitrogen cycle](http://127.0.0.1:43110/experiments?experiment=nitrogen-cycle): how does atmospheric nitrogen become available to a plant?
- [Carbon cycle](http://127.0.0.1:43110/experiments?experiment=carbon-cycle): where can carbon go after a plant takes it from the air?

Each opening has one learning question, a large original SVG teaching scene, one timely explanation, one contextual primary action and one quiet investigation link. Geology adds a contextual return to the preserved biological activity. There is no default numerical dashboard, permanent inspector, play/speed/reset toolbar, or setup form to complete before starting.

The scene, explanation, primary action and investigation chooser are **separate authored nodes**, connected to the trusted model through ordinary attachment, value and command ports. They can be edited and arranged independently in the builder. Model output controls the pictures and captions; the AI does not generate executable equations or invent live measurements.

```text
  one current learning question
  +------------------------------------------------------------+
  |                                                            |
  |                original teaching scene                      |
  |      organisms / chemical carriers / accepted pathways       |
  |                                                            |
  +------------------------------------------------------------+
  one timely explanation                         [next action]
                                  another clearly named question
```

Comparisons appear only in investigations that ask a comparative question. Temperature shows dissolved oxygen with mg/L because it helps answer the solubility question. Ocean exploration shows stored carbon and transfer per modeled year because distinguishing stock from flux is its task. The ordinary openings show neither measurement panel.

On narrow screens the comparison plots stack vertically, chemical and carrier labels remain readable, and the lesson uses native vertical scrolling. Starting a new investigation returns focus to its question; cancelling restores the chooser trigger without changing the experiment. Process labels that would crowd the narrow diagram are omitted there; the state-dependent caption still names the relevant transformation.

## Investigation coverage

| Cycle | Focused activities | Visible result |
| --- | --- | --- |
| Oxygen | Day/night; matched light/dark; fewer/more plants; one parcel of leaves; cooler/warmer water; still/mixed water; an oxygen atom | Sun/moon and production path change, representative dissolved-O2 marks change, respiration remains visible, exchange direction and tracer carrier follow state |
| Nitrogen | Atmospheric route; compatible microbial partners; small/larger fertilizer inputs; matched rain across untreated, fixing-crop and fertilized scenarios; aerated/waterlogged soil | Marker enters nodules, plants, animal and dead material; growth changes over time; separate leaching and runoff marks accumulate; nitrification and denitrification have different visual emphasis |
| Carbon | Biological route; clearing with retained wood or partial burning, followed by gradual regrowth; finite fossil burning; separate geological time; ocean exchange | Marker changes stores, clearing changes vegetation and retains wood, fuel fill decreases as carbon appears in air, geological marker enters burial/fossil storage, ocean stock and transfer are distinct |

There are 21 activity/scenario combinations. The optional nitrogen-to-pond coupling remains outside this first version, as scoped in the plan. Rain does not silently deliver exported nitrogen to a decorative pond. Climate response, pH, detailed carbonate chemistry and global oxygen dynamics are also not invented.

## Model boundaries and checks

The models share a small conservative transfer kernel. Each proposed reaction declares its donors, products and coefficients. Competing withdrawals are limited together before committing a whole reaction; stores remain finite and nonnegative. Element totals include explicit added material, fertilizer or perturbations. Decomposition demand remains in the remaining organic store when oxygen limits respiration.

- Oxygen uses a weighted oxygen-atom budget across O2, water, CO2 and simplified organic material. Photosynthetic molecular oxygen comes from water. Physical comparison activities hold biology inactive. Freshwater equilibrium is the Benson/Krause expression in [USGS memorandum 2011.03, equation 7](https://water.usgs.gov/admin/memo/QW/qw11.03.pdf), checked against independent standard values at five temperatures. The pond is a fictional, well-mixed 100 L teaching system at 1 atm; biological rates are illustrative.
- Nitrogen uses a common elemental-N basis. Symbiotic fixation and plant uptake are distinct. Nitrite remains as an intermediate between ammonium and nitrate. Rain loss stores distinguish runoff from below-root leaching. Light/space limits growth, so adding nitrogen does not remove every limit. Denitrification uses an explicitly schematic donor-capacity ceiling; detailed carbon chemistry and gas speciation are omitted.
- Carbon uses normalized elemental-C units. Clearing immediately partitions existing biomass; burning has a finite source; regrowth takes modeled years. Geological intervals are separate, explicitly schematic periods. Returning from geology restores the exact biological checkpoint; restarting geology retains it, and choosing another variant starts that requested variant. Surface/deep dissolved inorganic carbon use an effective exchange model, rather than pretending to calculate climate or complete ocean chemistry.

Representative marks illustrate elemental pathways or relative availability; they are not molecular counts or real-world forecasts. Full assumptions remain in catalog/recipe metadata rather than competing with the opening question.

## Implementation locations

- [Domain contracts and activity handling](../../../src/web/src/simulations/domains/biogeochemistry/index.ts).
- [Conservative transfers and three process models](../../../src/web/src/simulations/components/systems/biogeochemistry/).
- [Original scene drawings](../../../src/web/src/simulations/components/visuals/biogeochemistry/).
- [Learner scenes, actions, captions and investigation dialogs](../../../src/web/src/simulations/components/views/biogeochemistry/).
- [Independent component contracts](../../../src/web/src/simulations/components/catalog/biogeochemistry.ts).
- Premade JSON ownership: [oxygen](../../../src/web/src/simulations/pre-made/oxygen-cycle/recipe.json), [nitrogen](../../../src/web/src/simulations/pre-made/nitrogen-cycle/recipe.json), [carbon](../../../src/web/src/simulations/pre-made/carbon-cycle/recipe.json).
- [Generation argument focusing](../../../src/web/src/lib/planner/compositionTools.ts) connects the contextual components' declared events instead of creating a redundant generic control for each command.
- [Arrangement](../../../src/web/src/simulations/runtime/authoring/arrangement.ts) respects the public `scene-first` presentation preference while preserving authored values, wiring and locked rectangles.
- [Builder preview](../../../src/web/src/simulations/builder/composition/CompositionBuilder.tsx) removes the AI editing composer while Try lesson or appearance preview is active.

Saving and Remix use the project's existing authored-recipe lifecycle. Saved starting values and wiring persist; incidental exploration time is not silently written into the authored recipe. Runtime capture also supports the model's current activity configuration through the standard provider contract.

## Simplify-and-review iterations

The actual app was opened and screenshots inspected before acceptance. Review found and corrected:

1. An inherited SVG height clipped the lower scene labels. The cycle scene now fits its assigned flex area.
2. Workspace navigation covered the investigation link, and canvas scaling reduced hit targets. The link was moved and the targets enlarged; the redundant component-card frames were removed.
3. Native modal focus could move the background board. Top-layer dialog focus now stays outside board camera calculations.
4. Burning initially changed amounts without a clear picture change. The source store now visibly shrinks and representative carbon marks accumulate in air. An empty fuel store offers restart.
5. Geological labels overlapped; soil paths crossed a chemical marker; scenario titles were duplicated. The scene labels and paths were simplified.
6. Rain comparisons needed visible amounts at the two destinations. Separate representative marks now make their differing losses visible.
7. Narrow plots needed readable labels and natural content height. They now stack and scroll vertically rather than shrinking or clipping.
8. Try lesson retained authoring prompts over the investigation link. Those prompts are absent while learning is being previewed.

These observations are the basis for the UX changes. Passing structural tests alone was not treated as usability evidence.

## Automated and browser evidence

The final full existing `pnpm --dir src/web test` suite passed, including the new cycle verifier. The final TypeScript check and formatting checks also passed.

| Check | Final result |
| --- | --- |
| Full project test suite | Passed; [retained output](024-validation/full-test.log) |
| `pnpm --dir src/web exec tsc --noEmit` | Passed |
| Biome check on the 23 new cycle TypeScript/TSX files | Passed |
| `git diff --check` | Passed |
| Premade browser flows | All three passed; four desktop sizes, every activity, keyboard, save/reopen and Remix → Try lesson |
| Narrow browser review | All three inspected at 390x844; [measurements](024-validation/narrow/report.json) |
| Actual Apertus/Laya generation | 9/9 passed; unchanged source fingerprint |

These are technical and agent-review results. They do not establish usability with independent learners.

New reproducible commands:

```sh
pnpm --dir src/web test:cycles
pnpm --dir src/web test:cycles:browser
pnpm --dir src/web test:cycles:live
```

The scientific suite covers independent conservation fixtures, the five solubility benchmarks, signed reverse exchange, fixed-step convergence, finite substrate depletion, retained nitrite, condition-dependent microbial pathways, rain budgets, clearing partitions, fossil-to-air transfer, gradual regrowth, timeline checkpoints and variant changes. It also checks all 21 scenarios for determinism, bounded measurements, prior-state immutability, atomic rejection, recipe round trips and short-prompt retrieval. Arrangement checks preserve model configuration, connections and locked rectangles.

The browser suite opens every premade at 1440x900, 1280x800, 1366x768 and 1920x1080; checks clipping, hit targets and accessible controls; operates every scenario; tests keyboard activation and dialog cancellation; downloads/reopens the authored recipe; and operates Remix → Try lesson. The final [desktop browser report](024-validation/browser/report.json) contains the results.

Screenshots were captured with **standalone Playwright using installed Chrome**. Playwright MCP/browser-control tools were unavailable in this session; no MCP verification is claimed. Narrow-screen evidence is supplemental actual-browser evidence, not a claim of testing physical phones or all browser/device combinations. No independent first-time learner study was conducted.

### Reviewed screenshots

| Opening | Meaningful changed state |
| --- | --- |
| [Oxygen opening](024-validation/browser/oxygen-opening-1440x900.png) | [Night](024-validation/browser/oxygen-changed.png), [temperature comparison](024-validation/browser/oxygen-temperature-0-changed.png) |
| [Nitrogen opening](024-validation/browser/nitrogen-opening-1440x900.png) | [Marked nitrogen](024-validation/browser/nitrogen-changed.png), [rain losses](024-validation/browser/nitrogen-rain-2-changed.png), [soil pathways](024-validation/browser/nitrogen-soil-0-changed.png) |
| [Carbon opening](024-validation/browser/carbon-opening-1440x900.png) | [Two burned parcels](024-validation/browser/carbon-fuel-two-parcels.png), [clearing](024-validation/browser/carbon-clearing-1-changed.png), [geology](024-validation/browser/carbon-geology-0-changed.png), [ocean](024-validation/browser/carbon-ocean-0-changed.png) |

[Narrow oxygen comparison](024-validation/narrow/cycle-oxygen-narrow-comparison.png), [narrow nitrogen comparison](024-validation/narrow/cycle-nitrogen-narrow-comparison.png) and [narrow carbon comparison](024-validation/narrow/cycle-carbon-narrow-comparison.png) show the stacked native-scroll layout.

[Builder connections](024-validation/browser/carbon-builder.png) and [Try lesson](024-validation/browser/carbon-try-lesson.png) show the independent nodes and learner preview.

### Actual Apertus and Laya

The acceptance batch uses these exact prompts, without a scientific specification, layout prescription or hidden instructions appended to the human request:

```text
show me the oxygen cycle
show me the nitrogen cycle
show me the carbon cycle
```

Each is sent three times through the real `/api/apertus` composition path. The harness checks actual accepted Laya selection and actual Apertus inference events, validates the returned recipe, imports that original accepted recipe into the app, then operates its generated primary action and comparison chooser. Each generated lesson is reviewed at three desktop sizes. No network response interception or mock provider is used.

The real providers are `aac6fef/laya-multilingual-mlx` and `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`. The manifest records a source fingerprint and rejects source changes during a batch. Full input, response, diagnostic, accepted-recipe, screenshot and trace files are retained in the ignored `024-validation` folder. Node/Chrome numerical comparison uses a documented absolute tolerance of 1e-9 for finite amounts while retaining exact structure and string checks; this handles a few ulps of `Math.exp` variation.

Exploratory/aborted batches remain retained separately. An early real oxygen generation failed because the model returned layout IDs as objects instead of strings. The final argument prompt supplies concrete string-array examples. An early browser oracle used exact floating-point equality, which incorrectly rejected a 2.5e-15 difference; the numerical tolerance was corrected. Other exploratory batches were stopped before source changes during the screenshot review. They are not included in the final acceptance count.

The final [acceptance manifest](024-validation/live-1791616050860/manifest.json) and [completion receipt](024-validation/live-1791616050860/completion.json) record **9 attempts, 9 passed, 0 failed**, with identical starting/ending fingerprint `d17eb348f5c711b6c81e1fbe20eb89d9168e38733743ca7bc5dd196f18227faf`. Each of the three prompts passed in all three rounds. Actual inference durations ranged from approximately 43 to 62 seconds in this local batch; this is not a production latency guarantee.

The third-round accepted openings and comparisons were also visually inspected:

| Generated cycle | Original accepted opening | Operated comparison |
| --- | --- | --- |
| Oxygen | [Opening](024-validation/live-1791616050860/run-3/oxygen-cycle/generated-opening-1440x900.png) | [Temperature](024-validation/live-1791616050860/run-3/oxygen-cycle/generated-comparison.png) |
| Nitrogen | [Opening](024-validation/live-1791616050860/run-3/nitrogen-cycle/generated-opening-1440x900.png) | [Soil oxygen](024-validation/live-1791616050860/run-3/nitrogen-cycle/generated-comparison.png) |
| Carbon | [Opening](024-validation/live-1791616050860/run-3/carbon-cycle/generated-opening-1440x900.png) | [Clearing](024-validation/live-1791616050860/run-3/carbon-cycle/generated-comparison.png) |

A separate actual browser-composer check typed `show me the oxygen cycle` into the landing page and submitted it through the normal streaming UI. It accepted a five-node lesson, with accepted Laya selection and 15 actual Apertus inference events in the [diagnostics](024-validation/composer/diagnostics.json), request ID `c35ccb0d-7385-4543-b708-ed306e5bec31`. Clicking “Advance through night” changed the sun to a moon, stopped the production path, retained respiration, and updated the caption and next action. The [completion receipt](024-validation/composer/completion.json) is separate from the nine-run batch.

Reviewed composer evidence: [human prompt](024-validation/composer/human-prompt.png), [accepted opening](024-validation/composer/accepted-opening.png), [night after clicking](024-validation/composer/accepted-changed.png). The final capture uses passive request observation and server diagnostics; it does not intercept or replace the app response. Supplementary capture attempts were retried because the initial instrumentation tried to read a response after navigation and then treated streamed NDJSON as a single JSON value; those instrumentation attempts are not acceptance runs.
