# 030 — Browser evidence and progress

Plan: [Apertus creation and follow-up improvement loop](../030-APERTUS-CREATION-AND-FOLLOW-UP-LOOP.md).

Status: latest-code closing verification finished with failures. The implementation mission is incomplete; no final pass is claimed.

## Latest-code verification — October 13, 2026

Same diagnostic server, configured local Apertus/Laya providers and 1440 × 1000 Playwright viewport. No provider settings, acceptance gates or inference responses were changed. No verification scripts were created.

- `tsc --noEmit`: passed, including after safe formatting/import-order cleanup.
- Existing `npm test` recipe/runtime suite: passed. Covers recipe round trips, independent instances, rejected state, counting/arithmetic, shared launches, save/reopen, gas and lever interactions. This does not establish inference correctness.
- `git diff --check`: passed.
- Inline enum-schema assertions: passed for string enums and numeric/null unions.
- Biome on all 15 changed files: passed with 37 warnings after safe formatting/import-order fixes (35 non-null assertions, one unused parameter, one optional-chain suggestion). Unsafe fixes were not applied.
- Default Turbopack production build: stopped after several minutes without progress beyond “Creating an optimized production build”; no pass claimed. Isolated `next build --webpack`: passed compilation, TypeScript, all 16 static-page generation steps and build tracing. Next temporarily added the isolated check build's type directories to `tsconfig.json`; those two generated entries were removed after checking.

The latest keyed edit-argument contract validates a closed object keyed by accepted operation IDs before building internal operations. The latest visibility stage uses existing confidence-gated Laya choices in batches of eight and leaves rejected choices to Apertus. These are implemented changes, not established improvements in inference accuracy.

| Case | Latest-code outcome | Evidence |
| --- | --- | --- |
| C01 | Functional pass; presentation failed | Request `bf5840fd-e7cd-4669-9369-acdab06aac85`: [opening](screenshots/C01-latest01-created.png), [changed](screenshots/C01-latest01-changed.png). Length 8 m and starting angle 45° produce period 5.900823 s, up from 4.563793 s. Extra gravity/action/measurement panels reduce the board to 45%. Both providers selected unnecessary visibility; the new classifier did not solve this failure. Opening screenshot visually inspected. |
| E01 | Failed safely | Clean request `5cb66d1b-b4f5-4ea3-be3c-2564439bdc95`: [before](screenshots/E01-latest02-before.png), [rejected](screenshots/E01-latest02-failed.png). Target selection repaired an invalid `remove` mode into `edit`, but selected the entire model rather than the angle control. Recipe validation rejected removal because the appearance requires its model. Repeated invalid repair stopped after 35.9 s. Browser assertions confirm the entire recipe, length 8 m and amplitude 45° survived. All linked images inspected. The earlier attempt interrupted by formatter-driven development refresh is excluded. |
| C02 | Passed with presentation limitation | [Opening](screenshots/C02-latest01-created.png), [settled change](screenshots/C02-latest01-settled.png): two trajectories on one baseline at 30°/60°, both 20 m/s. Changing ball 2 to 45° automatically restarts both runs; its range becomes 40.774720 m while ball 1 remains 35.311943 m. Assertions and visually inspected captures agree. Apertus selected both angle controls but omitted all readouts; comparison is visual, without numerical range labels. |
| C03 | Functional pass; presentation warning | Request `98aacd3a-20d5-4e35-8472-b94dd74a9866`: [opening](screenshots/C03-latest01-created.png), [changed](screenshots/C03-latest01-changed.png). Slope −2/intercept 3 gives y(0)=3 and y(1)=1; visible descending line crosses at 3. Captures inspected. Extra equation readout exposes raw `line-equation`/`vertical` properties and a redundant slope panel extends below the composer. |
| C04 | Passed | [Opening](screenshots/C04-latest01-created.png), [settled addition](screenshots/C04-latest01-settled.png), [subtraction using controls](screenshots/C04-latest01-subtracted.png). Add moves two circles into the original group of three: five result-zone objects. Visible Subtract control and action then produce 3 − 2 = 1 with two removed objects (runtime removed zone is 2). Controls were operated normally; this subtraction is creation interaction evidence, not a passed E02. |
| E02 | Failed safely; regression from earlier replay | [Rejected follow-up](screenshots/E02-latest01-after.png). Target shortlist includes model/control configuration, but field planning returns `{name: ...}` objects where field strings are required. Repair repeats the invalid response and terminates after 21.6 s. Whole-recipe equality and original add/3/2 state assertions passed. Earlier fix07 success does not hold for latest code. |
| C05 | Failed | Request `25dd12b8-58ee-4cc0-add3-94cb519650d7`: [rejection](screenshots/C05-latest01-failed.png), inspected. Correct ladder activity was selected, but assembly configuration returned boolean `distance`/`height` overrides instead of numbers. Repair repeated boolean `distance: false`; strict validation stopped after 21.5 s. No experiment was accepted. |
| E03 | Blocked by C05 | Latest closing parent creation failed. No triangle exists in that conversation to resize. Earlier resize failures remain historical; latest keyed argument generation and resize persistence are unverified. A substituted recipe would not be valid evidence. |
| C06 | Failed | Request `2bd92c12-22c6-492a-a60c-b3de6b435056`: [rejection](screenshots/C06-latest01-failed.png), inspected. Correct gas activity selected, but configuration put the control ID `set:volume` in numeric parameter overrides and returned metadata objects instead of boolean visibility values. Repairs repeated the unknown override; validation stopped after 21.5 s. No accepted experiment, so pressure/volume interaction could not be checked. |
| C07 | Failed | Request `e6809cc1-9ee3-45a9-926c-c78d9d6a313a`: [rejection](screenshots/C07-latest01-failed.png), inspected. Correct fraction activity selected, but configuration repeated `SET_FRACTION_COMPARISON` as an unknown parameter override. Bounded repair stopped after 18.6 s. No accepted fraction activity; comparison controls could not be checked. |

Actual browser diagnostics for all seven creations identify Apertus/local inference with `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`; each inference reports `constrained: false`. Laya `aac6fef/laya-multilingual-mlx` participated in selection/visibility, with acceptance and rejection recorded individually. This is evidence of participation, not enforced decoding or improved accuracy. Additional creation request IDs: C02 `b73c7aaa-1513-45be-bf55-3c7a989c319e`, C04 `8dbb1408-53be-4efb-ac0c-c215456c69fd`; E02 `7b5e3e6d-2bee-4cd2-90af-8d8a095f0c20`.

The latest closing outcomes supersede earlier replay pass claims for release readiness. Projectiles and circles meet the core teaching task; pendulum and line remain functional with presentation defects. Ladder, gas and fraction creation fail. Both executable follow-ups fail safely; triangle resizing is blocked by its failed parent. Latest resize application, save/reopen preservation after resize and recovery from invalid edit arguments remain unverified.

### F24 — Keyed arguments remain unreached by the closing follow-ups

The new edit-argument wire is a closed object keyed by the accepted candidate IDs. The application validates it before materializing internal operations. E01 fails earlier because target selection chooses the model; E02 fails earlier because field planning returns name/value objects instead of field strings. E03 has no accepted latest parent. Consequently the latest argument contract has type/build evidence but no successful live edit evidence. Do not treat flattening alone as a demonstrated reliability fix.

### F25 — Visibility decisions contaminate numeric configuration

The new Laya visibility stage ran in the actual app. On C01 it accepted unnecessary elapsed/position/last-period observations and restart actions, while Apertus retained the remaining extras. On C05–C07, the first incorrect transition is assembly configuration: numeric parameter overrides and boolean visibility maps are mixed. Validation correctly rejects the responses; repair repeats them. These regressions share the newly combined wire contract, not a missing scientific model. The next correction should address the existing configuration stage's separation of settings and visibility decisions and then replay these specific failures. Adding another classifier, weakening validation or retrying unchanged requests is not supported by this evidence.

Earlier continuation (historical): C04 passed on fix06; E02 passed on fix07 and a transfer probe. Those results preceded the latest wire changes. The closing outcomes above are authoritative for the current code.

## Run conditions

- Baseline C01/E01 started at `http://localhost:43100`, 2026-10-12, revision `0d7857b`, with only the new 030 documents untracked.
- Standalone interactive Playwright, headless Chromium 1234, desktop viewport 1440 × 1000, isolated anonymous browser contexts. The in-app Playwright tool is unavailable in this session. No verification scripts were created.
- Existing server configuration: Apertus/local MLX, `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`, Laya, hybrid/required-laya. Configuration alone does not prove actual inference participation.
- An isolated server at `http://localhost:43110` uses the same provider configuration with existing planner/browser diagnostics enabled and a separate build directory. Subsequent runs will use these diagnostics to record actual provider and selection evidence.
- Fix05/fix06 continuation: same isolated server, anonymous Chromium 1234 contexts at 1440 × 1000, interactive Playwright through a Node REPL. Local date October 13, 2026; working tree includes the earlier 030 changes plus the changes below. No verification script or new runner was created.

## Historical baseline and intermediate case ledger

Preserve baseline outcomes when adding replay outcomes. Link screenshots and findings as they become available.

| Case | Activity | Baseline | Latest replay | Evidence / finding |
| --- | --- | --- | --- | --- |
| C01 | Pendulum: angle and length | Functional pass; presentation failure | Functional pass; presentation failure (closing01) | [Baseline](screenshots/C01-baseline-created.png), [current opening](screenshots/C01-closing01-created.png), [changed](screenshots/C01-closing01-changed.png). Full-width readouts are legible, but inference adds Gravity and duplicate angle/period observations below the viewport. Length 8 m/angle 45° are accepted and motion changes. |
| C02 | Projectile angle/range comparison | Failed | Passed (closing01) | [Baseline failure](screenshots/C02-baseline-created.png), [opening](screenshots/C02-closing01-created.png), [changed](screenshots/C02-closing01-changed.png). Two independent angle controls and Launch both; second angle 60→45° changes range 35.31→40.77 m, first stays 35.31 m at 30°, both 20 m/s. No unwanted height readouts. |
| C03 | Line slope and y-intercept | Passed | Not run | [Created](screenshots/C03-baseline-created.png), [changed](screenshots/C03-baseline-controls-changed.png). Slope −2/intercept 3 give y(0)=3, y(1)=1. |
| C04 | Addition/subtraction with circles | Failed | Passed (fix06) | [Wrong activity](screenshots/C04-baseline-created.png). [Final creation](screenshots/C04-fix06-created.png), [addition completes](screenshots/C04-fix06-addition-complete.png): 3 + 2 = 5 with five circles. Earlier fix01 evidence is preserved. |
| C05 | Ladder and Pythagorean theorem | Functional pass; autosave failed | Passed | [Corrected creation](screenshots/C05-fix01-created.png). Name is 99 characters, autosave succeeds, and changing distance to 6 m gives √52 ≈ 7.21 m while height remains 4 m. |
| C06 | Gas pressure and volume | Failed core learning task | Passed (closing01) | [Baseline](screenshots/C06-baseline-created.png), [opening](screenshots/C06-closing01-created.png), [compressed](screenshots/C06-closing01-changed.png). Volume 1→0.5 L compresses the visual and doubles pressure 2.494→4.989 kPa; temperature stays 300 K. |
| C07 | Compare two fractions | Passed | Not run | [Created](screenshots/C07-baseline-created.png), [parts changed](screenshots/C07-baseline-parts-changed.png). Equal-whole bars show 3/4 > 1/2; repartitioning A gives 0/8 < 1/2. |
| E01 | Remove pendulum angle control/component | Failed against plan's control-removal interpretation | Failed before inference (closing01) | [Baseline](screenshots/E01-baseline-after.png), [latest failure](screenshots/E01-closing01-failed.png). Edit catalog exceeds the 28,000-character stage limit; the accepted length 8 m and angle 45° remain intact. Shared context diagnosis in progress. |
| E02 | Set circles to seven minus three | Failed on wrong parent activity | Passed (fix07) | [Configured](screenshots/E02-fix06-after.png), [final completion](screenshots/E02-fix07-subtraction-complete.png): seven circles, three taken away, four left. Browser assertions confirm counts and unchanged other components, wiring and presentation. Transfer initially failed, then passed after F15; see below. Earlier attempts remain preserved. |
| E03 | Enlarge triangle canvas | Failed | Failed (closing01); flat-contract replay running | [Earlier enlargement](screenshots/E03-fix03-after.png), [earlier reload loss](screenshots/E03-fix03-reopened.png), [current before](screenshots/E03-closing01-before.png), [rejection](screenshots/E03-closing01-failed.png). Distance 6 m/height 4 m were retained on rejection; nested numeric adjustments still failed JSON generation. |

## Finding and fix entries

### F01 — Lexical selection bypass overrides teaching intent

C04 diagnostics show correct arithmetic intent, Addition & subtraction ranked first, and rejected low-confidence Laya selection (confidence 0.1944). No `assembly_plan.response` occurred: `assemblyCreation.ts`'s `groundedIndex` bypass picked circle geometry based on one matching model-name term. Proposed fix: remove this bypass and select against the full accepted intent and real capability contracts. No topic-specific mapping is needed.

### Provider evidence

C03/C04 diagnostics identify actual Apertus local MLX inference events and Laya decision calls. C03 Laya selection was rejected and the Apertus assembly-plan stage selected the activity. Provider/model matches the configuration above. Do not interpret a rejected Laya result as an accepted decision.

### F02 — Generation violates the storage name contract

C05 works in memory but autosave reports “Choose a name between 1 and 100 characters.” Assembly creation permits 120-character titles while project validation and other authoring stages permit 100. Proposed fix: align assembly-generated titles with the existing storage contract, preserving the full learning question in instructions. Do not relax project validation.

### F03 — Follow-up tools lack presentation resizing

E03 has a correctly functioning scene but no resize capability in the shared authoring operations. Existing candidates offer configuration and arrangement, neither of which describes the requested presentation-size change. Proposed fix: a validated shared board-item resize operation exposed with actual current bounds. Keep model quantities unchanged, respect locked content and size limits, and preserve nearby content visibility.

### F04 — Repeated invalid responses do not improve during repair

E03 returned the identical invalid response on the initial call and three repairs. The shared transport replays the failed response as both an assistant turn and repair data. Proposed fix: rebuild repair requests from the original valid context plus concise schema feedback, without replaying the invalid answer; stop unchanged failures rather than spending further calls. Preserve strict schema validation.

### F05 — Presentation packs a readout into insufficient space

C01's shared learner layout pairs a 160-pixel readout with playback. The rendered value wraps and its label clips. Proposed fix: retain a full-width readout rather than forcing this compact pairing. Check the pendulum and another generated measurement; do not patch its specific numeric value.

### F06 — Comparison instances and command endpoints were counted incorrectly

A diagnostic replay reproduced C02. Selection chose the two-projectile activity twice, which would create four projectiles. Configuration then selected two angle setters and two launch endpoints; the schema rejected four endpoints even though they can belong to three visible controls. Changes: expose each homogeneous assembly's actual independent model count, validate the requested total across selected assemblies, and allow slots already represented by a selected activity to be marked covered. Bound command selection by real wired endpoints, not a fixed three-endpoint quota. Remove the lexical pruning that discarded essential actions after inference selected them.

### F07 — Readout names and authored defaults were lost in creation

C06's `pressureKPa` output was not recognized as pressure because presentation tokenization did not split camel case or use its visible Pressure label. A separate lexical coverage shortcut falsely reported absent observations. Changes: match existing display labels and split identifier words; remove the unsupported lexical coverage inference. Configuration now receives the recipe's actual authored defaults rather than stale exposed-parameter defaults. This preserves presentation choices such as the gas scene's authored dimensions.

### Applied changes awaiting replay

- `assemblyCreation.ts`: semantic selection instead of lexical bypass; instance-count contract; real observation metadata and authored defaults; storage-compatible title length; endpoint-based command bounds.
- `learnerPresentation.ts`: visible display labels/camel-case identifiers retained; full-width measurements instead of compact readout/playback pairing.
- `edit.ts`: explicit response schema for unconstrained inference, component categories/current presentation bounds, and general guidance for resizing and ambiguous removal targets.
- `operations.ts` / `turnSchema.ts`: validated presentation resizing through the existing transaction and geometry helpers; preserve model state, component minima, proportions, locked content, and neighboring content visibility.
- `transport.ts`: fresh corrective context and termination of an unchanged invalid response instead of repeating it three more times.
- `formatFixer.ts`: recognize the canonical resize operation; no prompt aliases or case-specific values added.

### F08 — Edit candidates expose overlapping and untyped settings

E02 fix01 reached the correct arithmetic parent but selected both `task` and `task.a`/`task.b` plus unrelated settings, then attempted string operands for numeric adjustments. Validation correctly rejected these responses; the previous working calculation remained intact. New diagnosis: intent selection receives field names without their value contracts and exposes object parents alongside children. Changes: expose editable leaves only, include their actual types/enum choices, distinguish persistent configuration from runtime actions, and keep strict patch validation. Repair termination now detects any earlier identical rejected response, including cycles between different errors.

Fix02 exposed another concrete failure: the model nested adjustment objects inside `fields`, rather than returning field-name strings, and repeatedly produced invalid JSON. The edit instructions were long, repetitive, and included unrelated topic-specific examples. Fix03 replaces them with one concise schema-grounded contract that explicitly separates fields from adjustments and removes those examples. No malformed output is coerced into a valid edit.

### F09 — Planner offers controls that authoring would reject

Fix03 produced valid JSON but selected `add_control` for an already-controlled arithmetic task. The authoring executor rejects duplicate controls, while `buildTurnTools` offered them anyway. Fix04 shares the existing control-availability rule between planning and authoring and accounts for effective default parameters. The next replay passed edit-intent validation and reached argument generation. No success is claimed until the resulting simulation is inspected.

Fix04 passed: the authored task is subtract/7/3, and operating Take away 3 circles completes with result 4, four tokens in the remaining zone and three in the removed zone. Assertions use values obtained through Playwright's existing browser diagnostics; no standalone script or API harness was created.

### F10 — Resize candidates lack a meaningful identity

E03 fix01 correctly recognized resizing but returned candidate `resize`, while the catalog identified the resize operations only as opaque `edit10`/`edit11`/`edit12`. The rejected response was never applied. Fix02 exposes stable `resize:<presentation-item-id>` candidate identities and includes each target's current bounds/node directly beside the candidate. This is general operation metadata, not a ladder-specific instruction or pixel size.

### F11 — A valid resize can still do nothing

E03 fix02 selected the correct scene, then supplied its existing 640 × 480 dimensions. The API reported updated, while the SVG stayed 304 × 211.594 px. Fix03 rejects unchanged presentation dimensions through the shared executor and tells argument generation to apply the requested change from current bounds. The screenshot comparison remains the final check; schema validity alone does not establish enlargement.

### F12 — Presentation matching confuses conditions and ordinal labels with observations

C02 became functional, but unnecessary height readouts overflowed the visible area. The display filter used the inferred learning question, which mentioned fixed height as a condition. It now uses the original request and accepted observations. A second replay retained only the secondary height readout: its label's `2` matched the prompt's instance count. Pure numeric label tokens are now excluded from semantic display matching. No projectile-specific output list was added.

### F13 — Follow-up commits preserve authored defaults rather than live settings

Reload after E03 fix03 preserved the enlarged board, but reset the learner's foot distance from 6 m to the authored 3 m. The earlier check compared authored configuration, so it missed this distinction; that pass claim has been corrected above. Follow-up request context now uses the existing validated `runtime.capture()` method, which captures configuration without animation checkpoints. Math boards receive the same capture hook through the existing `learningConfiguration` helper. Ordinary serialization remains unchanged. Replay must compare live model values before editing, after editing, and after reload.

### F14 — Decision selection drops available teaching metadata

Source diagnosis: `assemblyCreation.ts` passed model titles as supported concepts and an empty observation list to `selectCapability`. `selection/questions.ts` then omitted both interactions and observations from its criteria, even when catalog cards contained them. The shared decision provider therefore received less teaching evidence than the subsequent assembly-plan stage.

Change: pass teaching concepts (model title only when no teaching contract exists), actual observations, and wired interactions into the existing decision criteria. Match the goal, actions and observations together rather than treating a shared object word as sufficient. Affects assembly creation and the existing capability-selection caller in `planner/index.ts`; confidence gates and Apertus fallback remain unchanged. This corrects metadata loss; it does not establish better Laya accuracy.

Final C04 request `13dc192d-5d24-4d8f-87a7-43dcdc66ce1e` used the original prompt “Show me how to add or subract with circles”. Diagnostics show actual Apertus/local inference with `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`. Laya `aac6fef/laya-multilingual-mlx` participated but its choice was rejected (confidence 0.204). Apertus assembly selection accepted `activity1`, the arithmetic activity. [Creation](screenshots/C04-fix06-created.png) shows separate groups of three and two; [completed addition](screenshots/C04-fix06-addition-complete.png) shows five circles together. Playwright operated Add 2 circles and asserted five result-zone tokens. Both images were visually inspected at 1440 × 1000.

### F15 — Edit candidates give presentation changes more context than model changes

Before the change, E02 fix05 successfully configured and operated 7 − 3. The transfer probe was defined as “Now show nine take away four, keeping everything else the same”, from that completed calculation. Expected: the same model becomes subtract/9/4, with other content preserved. Observed: edit intent selected `resize:board/activity_1/layout/appearance` instead. Repair attempted a scale of 0.5 and malformed JSON, then terminated when an invalid answer repeated. [Rejected transfer](screenshots/E02-transfer01-failed.png) preserves the prior 7 − 3 calculation and the failure details. No invalid response was applied.

Source diagnosis: resize candidates carried inline component identity, but configure candidates required the model to join target IDs with a separate node list. The shared system instructions also devoted a disproportionate paragraph to resizing. The observed first incorrect transition was edit-operation selection, before value generation; the runtime arithmetic was correct.

Change in `edit.ts`: provide the same component ID, visible name, category and title beside all candidates with a resolvable target; include current configuration beside configure candidates. Replace the long resize paragraph with a concise distinction between model configuration and requested presentation sizing. Typed leaves, transaction validation, supported operations and repair termination remain intact. No words, operands, topic detectors or example requests from the arithmetic probe were added to production.

Replay of the identical transfer accepted the configure operation on its first response and configured subtract/9/4. Playwright operated Take away 4 circles and asserted five remaining tokens, four removed tokens and result 5. It also compared the other node configurations, connections and presentation against the accepted 7 − 3 activity: all unchanged. [Settled transfer](screenshots/E02-transfer01-fix06-settled.png) was visually inspected and shows all nine circles in their correct groups. The earlier `E02-transfer01-fix06-complete.png` capture occurred after logical completion but during visual animation; use the settled capture for visible object counts.

Final original E02 request `695134e0-49a5-41da-ab94-a318012c7107` used “can you set it to be 7 minus 3?” in the final C04 conversation. Edit intent and argument generation both passed on their first responses (about 12.6 seconds total). [Configured](screenshots/E02-fix06-after.png) and [completed subtraction](screenshots/E02-fix06-subtraction-complete.png) show 7 − 3 with four left and three removed. Browser assertions checked the operation, operands, result, token groups and preservation of other nodes, wiring and presentation. These checks use browser diagnostics and actual controls, not injected commands or manually edited state.

TypeScript initially exposed three existing assignments of `responsiveMinHeight` on the broader board-item union in `learnerPresentation.ts`. They now narrow to component items by their layout identity. `tsc --noEmit` and `git diff --check` passed after this correction. No new rendering behavior was introduced by the type narrowing.

### F16 — Resize sibling still fails JSON generation

Sibling probe: “Make the canvas showing the circles bigger”, from completed subtract/7/3 on the final C04 activity. The same desktop viewport was retained; original SVG bounds were 598 × 149.219 pixels. This probe checks the shared resize instructions changed during F15; it is not a new creation or a claimed E03 pass.

Fix06 selected the correct scene but supplied empty adjustments. Repair produced malformed nested JSON and an unrelated 0.5 scale, then failed safely. [Fix06 rejection](screenshots/E02-resize-transfer01-fix06-failed.png) retains the arithmetic activity. Fix07 restored explicit requirements for every selected dimension and enlargement/reduction direction; removed the “half is scale 0.5” example from shared repair instructions and supplied the general closing order for nested JSON.

Fix07 repair now proposed the correct scene at scale 1.5, but retained an extra object-closing brace in the selections array. It failed after the bounded repeated-response detection. [Fix07 rejection](screenshots/E02-resize-transfer01-fix07-failed.png) preserves the accepted calculation. Browser assertions compared the complete recipe before and after each rejection: unchanged. Neither response was coerced or applied. Stop further blind replays of this JSON-generation failure. Resize remains unresolved; this is evidence that clearer prompts alone do not establish reliability for this local model's nested structured output.

Final fix07 arithmetic regression: from accepted 9 − 4 on the transfer activity, submit the original E02 prompt “can you set it to be 7 minus 3?”. Request `d925287f-127e-4504-aea8-c36e512bc3e6` passed intent and argument generation without repair in about 13.6 seconds. Playwright operated Take away 3 circles and asserted result 4, four remaining tokens, three removed tokens, unchanged other nodes, connections and presentation. [Final completion](screenshots/E02-fix07-subtraction-complete.png) shows the settled four/three grouping at the same viewport. Final `tsc --noEmit` and `git diff --check` passed. Failed resize captures were also visually inspected.

### F17 — Edit metadata repeats component contracts until the context limit is exceeded

C01 closing01 worked in motion, but E01 failed before inference with “Inference context exceeds stage bounds.” Removing duplicate setting-name/unit lists was insufficient. Diagnostics showed 47 candidates, approximately 23,000 characters of repeated candidate metadata and 7,600 characters of document context, before the response schema, instructions and JSON string escaping.

Change: group selection candidates under each component, with identity, current configuration and live state supplied once. Keep each operation's actual field contracts and presentation bounds; retain full context for argument generation. The existing 28,000-character transport bound is unchanged. The grouped catalog is approximately 15,300 characters. The targeted replay reached Apertus, repaired an invalid mode, and removed the Angle readout while preserving live length 8 m and amplitude 45°. [Accepted replay](screenshots/E01-catalog01-after.png) is still a targeting failure against E01's control-removal interpretation, not a passed E01.

### F18 — Implicit scalar bindings were offered again as new controls

The catalog-size diagnosis also showed add_control candidates for already-bound sliders. `hasBoundControl` compared an omitted/default-empty parameter path against the explicit field name, while the actual control resolver infers the single compatible scalar leaf. Change: use that same single-leaf inference in the shared availability rule, and recognize empty-payload buttons. This removes duplicate slider/playback decisions from planning and rejects the same duplicates in authoring. Existing compound activity bindings remain supported. TypeScript passed; browser follow-up verification continues below.

### F19 — Presentation reinterprets accepted observations through lexical matching

C01 closing01 selected Gravity despite only length and starting angle being requested. Its inferred observation list included period/amplitude/frequency; presentation kept multiple angle/period readouts and an angle chart, producing a tall sidebar. This is a presentation failure even though motion, quantities and the full-width readouts work.

Change: the existing assembly configuration stage now selects actual display IDs alongside actual command IDs, using labels and their bound output contracts. It receives the original task and is instructed to choose essential observations without duplicate measurements or related investigations. Unselected displays are removed through the existing node-removal operation. `learnerPresentation` now only lays out that accepted selection; its lexical display/reset filtering is deleted. The shared scene, model, validation and clock remain unchanged. This replaces a second semantic guess with a contract-grounded choice in an existing stage, without a new inference framework or topic mappings. Final browser replays are pending.

### F20 — Numeric edits have unnecessary nesting in the inference wire format

E03 closing01, with the grouped catalog, reproduced malformed nested adjustment arrays. Repair selected the scene at scale 1.5 but repeatedly closed a selection object before the surrounding array. No resize or physical edit was accepted. The last valid live distance remained 6 m, height 4 m and ladder length √52 ≈ 7.21 m; original drawing bounds were 304 × 211.594 pixels.

Change: move numeric adjustments to a top-level list keyed by selected candidate and field. Selections now contain only candidate, scope and field-name strings. Validate the exact inference schema first, reject adjustments for unselected candidates, then associate validated adjustments with their selected operations in application memory. Existing duplicate-field, numeric-bound, mode, field-membership and transaction checks remain intact. This changes only the internal inference wire shape; no malformed output is repaired by coercion. Targeted E03 and final arithmetic replays are pending.

The first flat-wire replay generated syntactically valid resize arguments, but then cycled through an invalid mode and empty adjustments. Its failure is preserved in [flat-wire rejection](screenshots/E03-flat01-failed.png). Follow-up correction: optional root fields are named exactly, without an “optional” prefix in the key list; the redundant task label was removed. Resize selection may now defer unspecified dimensions to the existing argument stage, as configuration already does. Its argument schema contains only selected dimensions; compilation supplies any unselected dimension from current bounds. The shared executor still rejects unchanged sizes and validates bounds/locked content. No numeric or scientific validation was removed.

### F21 — A single edit stage mixes operation routing, field choice and value calculation

The next E03 replay selected resize and runtime setters together and timed out during repair; [rejection](screenshots/E03-values01-failed.png) preserves the working ladder. A separate bounded `edit_target` stage now shortlists exact operation IDs against the visible component catalog. Field/value planning receives only those candidates, with its mode and candidate enums narrowed accordingly. This reuses the existing transport, budgets, schemas and transaction executor; it adds one bounded inference call instead of a separate editing engine.

The first split-stage replay shortlisted the scene and both controls, while the next stage correctly selected only the scene. An initial requirement to retain every shortlisted candidate rejected that correct refinement; [failure](screenshots/E03-target01-failed.png) is preserved. That requirement was removed: the shortlist is advisory retrieval, while the final validated edit intent can discard unrequested candidates. It cannot introduce a new candidate outside the shortlist, except the existing explicit all_matching expansion for equivalent instances. The final argument stage still includes every operation in the accepted edit intent exactly once. Final replay is running.

### F22 — Field planning still repeats a candidate envelope inside an array

The refined shortlist correctly chose the scene, but field planning still generated malformed selection-array nesting; [rejection](screenshots/E03-shortlist01-failed.png) is preserved. Field selections are now a closed object keyed by shortlisted operation ID. Each value contains only scope and field names; those names are an enum of that operation's real editable leaves. The application builds the internal selection array only after validating this exact wire schema. Numeric adjustments remain a separate root list. Intermediate stage prose is no longer passed as routing evidence to field planning.

The keyed wire removed the syntax failure but exposed another contract error: fields were returned as name objects instead of strings. [Keyed-wire rejection](screenshots/E03-keyed01-failed.png) is preserved. No malformed or incorrectly typed response was applied.

### F23 — Repair feedback truncates namespaced paths

For `value.selections.resize:board/activity_1/layout/scene.fields[0]`, repair feedback split the validation message on the first colon. Its path became `value.selections.resize`, so the expected field schema was unavailable. The delimiter is now colon-plus-space, matching the validator's message format and preserving the namespaced candidate key. The repair can therefore receive the actual string enum for the failed field. Shared enum-to-JSON-schema translation also declares the type derived from its real values, retaining numeric/null unions. Inline self-checks for string and numeric/null enums passed; no verification script or new runner was created. Browser recovery replay is running.

### Infrastructure direction and remaining limits

The current path is browser request → validated/correlated API stream → teaching intent → catalog retrieval and capability selection → assembly configuration → validated authoring operations → runtime/rendering. Follow-ups instead select a target/operation against captured accepted state, generate its arguments, execute a transaction, validate the resulting recipe and commit it. These ownership boundaries already exist; the improvements should strengthen them rather than introduce another engine.

Recommended next changes, beyond the corrections applied here:

1. Generate operation-specific selection schemas from the same contracts the executor owns. Each candidate should permit only its own fields and adjustment types, reducing impossible combinations before execution. Keep the semantic target-selection step separate from value generation; this split already exists and should remain small.
2. Keep teaching metadata consistent across retrieval, Laya and Apertus. Catalog concepts/actions/observations should remain projected from their owners. Missing human-readable output metadata is a catalog gap to correct, rather than a prompt alias or benchmark-specific mapping.
3. Assess edits by actual state differences as well as schema validity. Extend existing validation at operation owners when a concrete failure demonstrates a missing invariant, as already done for no-op resize and duplicate controls. Preserve accepted live settings and reject incomplete or invalid edits atomically.

These are recommendations, not newly implemented subsystems. Neither valid JSON nor one successful transfer guarantees semantic fidelity. Laya still rejected its latest selection and the Apertus fallback carried creation. The resize sibling's repeated malformed nested output remains unresolved. A next investigation should establish whether the configured provider can actually enforce the required schema vocabulary; constrained decoding must be demonstrated, not inferred from accepting a schema parameter. The broader seven-creation/three-edit closing pass, reload persistence on this continuation and other outstanding case replays have not been completed. Existing baselines and replay results above remain distinct from final-code coverage.

Append an entry per observed failure/fix with:

- Case, attempt, prompt, and relevant pre-edit state.
- Expected behavior and observed behavior; screenshot links.
- First incorrect transition and supporting browser diagnostics.
- Shared cause, affected callers, proposed infrastructure change.
- Changed files and why the fix generalizes.
- Targeted Playwright replay and any justified sibling/transfer probe.
- Preserved state, unresolved gaps, and next action.

## Screenshots

Save actual Playwright captures under `screenshots/` when execution begins. Follow the plan's case/phase naming convention. Inspect each image and explain what it proves. Preserve before/after captures; never replace a failed baseline with a passing image.

Baseline captures are linked above. C01's changed-controls screenshot is also the before state for E01.

## Simulation pipeline refactor — October 13, 2026

The source migration and owner contracts are implemented; see [031 — Simulation pipeline refactor](../031-SIMULATION-PIPELINE-REFACTOR.md) for the final modules, checks, browser measurements and remaining limits.

The closing refactor pass created all seven requested lessons, with recorded interactions. The latest E01/E02 inference edits still fail safely and preserve the complete recipe/session. E03 enlarges the actual triangle SVG from 304 × 211.594 to 384 × 267.281 pixels while preserving live distance/height and wiring. Extra selected controls/readouts and an ungrounded comparison question remain presentation concerns. There is no complete ten-case functional pass.

The existing recipe/contract suite, TypeScript, generated registry freshness, production webpack build and diff checks pass. New contract assertions cover all 458 identities, all 49 built-ins alongside 90 premades, browser/server import boundaries, live sibling preservation, flat wire validation, single-dimension resizing, bounded target recovery and feedback that stays within the unchanged context bound.

Evidence remains under [refactor](refactor/): service-unavailable results, first real-provider results, closing passes and targeted corrections are separate. Exact generated/accepted recipe reopen checks prove the readable camera and retained ladder size/values; they are not substituted inference evidence. The task-owned browser/model services were stopped and temporary TypeScript build entries removed. No provider/model change, deployment, paid-provider check, commit or publish was performed.
