# 031 — Simulation pipeline refactor

Date: October 13, 2026.

The structural refactor is implemented. **The full functional mission is incomplete:** the latest real-model E01/E02 edits still fail safely. This report separates the completed source migration and deterministic checks from actual browser outcomes; no ten-case pass is claimed.

## Implemented ownership

The original manifest's 554 existing files were moved, with their resolved import/export consumers, literal script loaders, recipe generator and current ownership documentation updated. Production orchestration now lives under `src/web/src/simulations/creation-and-editing/`; native contracts/components/recipes live under `simulations/registry/`; preserved scientific implementation and compatibility files live under `simulations/legacy/`. Domain contribution implementations and recipe JSON/assets retain their original application paths.

The old planner, inference-adapter and decision-provider implementation directories are absent. The old catalog/composite barrels were split into declaration integration, native metadata, domain projections, defaults, model recipes, learning capture and built-in registration. No forwarding exports, duplicate planner, new dependency, event bus, empty module placeholders or replacement runtime were added.

`pipeline.ts` admits and budgets requests and exposes `createSimulation`/`editSimulation`. The API delegates byte parsing, correlation and streaming to `input/api.ts`. Creation separates intent, retrieval/selection, presentation, configuration and application. Editing separates captured context, target candidates, intent, field planning, values, transactional validation and result coordination.

## Shared corrections after relocation

- Presentation and value configuration use separate validated flat wires. Recipes with no exposed parameters skip configuration inference instead of inviting unsupported values.
- Private operation IDs are short and retain their operation names. Field masks and argument IDs map to authoritative executor contracts; they never change saved component IDs or recipe versions. Targets/command envelopes come from the accepted plan. Invalid field objects, unknown keys and invalid values remain rejected.
- Configuration patches use captured live values and retain untouched nested siblings. A computed height-only resize retains width without putting an undeclared width into the inference wire.
- Existing structured transport retains repair bounds and repeated-response termination. It now retains the validation cause, so only invalid resulting documents/recipes trigger one bounded target reselection. Unchanged rejected target sets cannot be repeated. Syntax/value failures and unavailable services do not start another target loop.
- Stage-specific repair feedback supplies the current wire/schema and omits repeated whole-catalog/context material. This fixes a demonstrated repair-context overflow without increasing the 28,000-character transport bound.
- Early edit progress is restored. Domain output descriptions and command/model meanings are projected from their owners into selection metadata. No topic detectors, case IDs, benchmark numbers, fixture responses or prompt-specific production branches were introduced.
- Registry definitions are cloned/frozen; native and preserved declaration identities are disjoint and duplicate registration fails. Retired aliases and automatically generated model presets stay resolvable but leave active discovery.
- The assembly compatibility adapter no longer imports built-in registration, breaking the production startup cycle through spatial recipe generation.
- Shared runtime inspection releases providers. Authoring/control projections and finalization use that runtime-owned inspection rather than retaining duplicate runtimes.
- Responsive desktop boards fit their opening width without shrinking the whole investigation to accommodate a tall sidebar. The exact generated pendulum was reopened through the file UI and visibly returned from 45% to a readable 100% view; accepted quantities survived reload.

The [current walkthrough](../features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md) and [manifest extraction notes](../features/SIMULATION_PIPELINE_REFACTOR_FILE_MANIFEST.md#8-implemented-extraction-details) describe the final owners. File relocation and behavior changes are distinguished above for review; no commit or deployment was made.

## Deterministic verification

The existing `npm test` runner covers all 90 premade recipes, all 49 built-ins, all 458 public identities, independent instances, rejected-state preservation, builder/session round trips, saved compatibility identities and scientific interactions already covered by the repository. Added assertions exercise the extracted contracts through the actual structured transport with deterministic in-memory responses: field-object rejection, live sibling preservation, flat presentation/settings/argument mappings, no configuration call for parameterless recipes, height-only resizing, scoped repair feedback and bounded target recovery.

Static runtime-import checks establish that the data registry reaches neither React scenes nor server inference configuration; browser transport/rendering/builder consumers do not reach server configuration/transport/entry modules. Recipe generation freshness and TypeScript are checked. The production webpack build is checked because the first extraction exposed an eager initialization cycle that the test loader did not catch; that cycle was fixed.

These assertions are contract/regression tests. They are not evidence that an unconstrained language model understood a user request.

## Real browser conditions and preserved outcomes

Playwright used the actual application at `127.0.0.1:43100`, 1440 × 1000 viewport, anonymous fresh contexts. Apertus remained `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` through the configured local MLX adapter; hybrid Laya remained `aac6fef/laya-multilingual-mlx` with existing acceptance gates. Diagnostics confirm real provider/model calls. The constraint probe still reports no demonstrated schema enforcement; client/server validators remain authoritative.

The first service-unavailable pass is preserved under [refactor](030-validation/refactor/report.json). The existing cached services were then started with offline cache access, without model downloads, provider/mode changes or Python serving changes. [live01](030-validation/refactor/live01/report.json) preserves the first real-provider failures after relocation. [closing01](030-validation/refactor/closing01/report.json) was incomplete after its response-header observer timed out; the missing early edit progress event was fixed. [closing02](030-validation/refactor/closing02/report.json) records every original creation/follow-up. [edit-replay03](030-validation/refactor/edit-replay03/report.json) and [edit-final04](030-validation/refactor/edit-final04/report.json) preserve targeted replays following concrete contract/metadata changes. No blind inference campaign or new verification runner was created.

| Probe | Observed outcome | Evidence / limits |
| --- | --- | --- |
| C01 — Pendulum | Created; motion and both requested controls work; presentation warning | [Opening](030-validation/refactor/closing02/C01-after.png). In the later replay, length 5.199 m and starting angle 30.9° at unchanged gravity produce period 4.6586575 s; angle changes from 30.8938° to 21.9413° over 0.5666 s. [Motion/control observations](030-validation/refactor/edit-final04/C01-motion-and-controls.json). Extra gravity/actions/readouts remain selected. [Readable exact-recipe reopen](030-validation/refactor/pendulum-readable-reopen.png) fixes the tiny opening camera; it does not establish better semantic visibility selection. |
| C02 — Two projectiles | Accepted comparison and angle interactions; text warning | [Opening](030-validation/refactor/closing02/C02-after.png), [changed](030-validation/refactor/closing02/C02-interaction.png). Independent 30°/60° launches at 20 m/s initially have equal 35.311943 m range; changing their angles changes ranges coherently. The inferred question names 30°/45° while the actual defaults are 30°/60°: generated narrative is not fully grounded in accepted values. |
| C03 — Adjustable line | Accepted and interactive | [Opening](030-validation/refactor/closing02/C03-after.png), [changed](030-validation/refactor/closing02/C03-interaction.png). Native controls change slope/intercept from 1/0 to 1.4/2, and outputs/geometry agree. |
| C04 — Circles arithmetic | Created valid interactive arithmetic | [Opening](030-validation/refactor/closing02/C04-after.png). Circles and operands agree with the selected calculation; direct repository tests cover addition/subtraction execution. The requested 7 − 3 edit remains unresolved below. |
| C05 — Ladder theorem | Accepted geometry and live values | [Opening](030-validation/refactor/closing02/C05-after.png). The ladder is the hypotenuse of the wall/floor triangle; labels and computed length agree. |
| C06 — Gas pressure/volume | Accepted inverse relation | [Opening](030-validation/refactor/closing02/C06-after.png), [changed](030-validation/refactor/closing02/C06-interaction.png). Volume 1 → 1.05 with amount/temperature unchanged changes pressure 2.4943387854 → 2.375560748. |
| C07 — Fractions | Accepted common-whole comparison | [Opening](030-validation/refactor/closing02/C07-after.png). 3/4 > 1/2 agrees with equal-sized bar visuals. Denominator controls update the comparison; the existing model resets shading when partitions change. |
| E01 — Remove angle component | **Unresolved; failed safely** | [Latest rejection](030-validation/refactor/edit-final04/E01-after.png). The provider still selected an invalid model removal; repair also exposed repeated-context overflow. [Recorded diagnostics/state](030-validation/refactor/edit-final04/E01.json). Full recipe and session remained unchanged. The later scoped-feedback correction is covered by a regression assertion, not a claimed successful E01 inference replay. |
| E02 — Set 7 minus 3 | **Unresolved; failed safely** | [Latest rejection](030-validation/refactor/edit-final04/E02-after.png). The provider selected lesson editing instead of model configuration and generated an invalid scope. [Recorded diagnostics/state](030-validation/refactor/edit-final04/E02.json). Full recipe and session remained unchanged; no 7 − 3 browser success is claimed. |
| E03 — Enlarge triangle view | Actual drawing enlargement observed | [Before](030-validation/refactor/edit-final04/E03-before.png), [after](030-validation/refactor/edit-final04/E03-after.png), [measurement/state](030-validation/refactor/edit-final04/E03.json). SVG grows from 304 × 211.594 to 384 × 267.281 pixels at the same viewport. Live distance 3.1 m and height 4 m, ladder geometry and wiring survive. The authored opening value was 3 m; the edit correctly captures the already changed live 3.1 m value. Control initial JSON is normalized accordingly. [Exact accepted recipe reopened](030-validation/refactor/ladder-resize-reopen.png) retains that size and values. |

All linked closing creation images and the E03/readable-reopen evidence were visually inspected. Before/after JSON comparisons independently confirm E01/E02 rejection preserves the entire recipe/session. Reload of the exact generated pendulum and import of the exact accepted resized ladder were browser persistence/rendering checks, not substituted creation/edit inference evidence.

## Remaining limits

E01 target fidelity and E02 operation/field fidelity have no successful latest-code browser replay. Extra inferred controls/readouts and invented numbers in lesson questions are not solved by relocating code or validating JSON. The latest camera and feedback-size corrections passed their relevant checks, but do not establish model semantic reliability. The plan's complete ten-case functional acceptance remains open; no model/provider change, constrained-decoding claim, paid-provider check, Pi deployment, publishing or production release was performed.

Final local results: `npm test`, `tsc --noEmit`, `node scripts/recipes/generate-registry.cjs --check`, `next build --webpack` and `git diff --check` passed. Task-owned development/Apertus/Laya processes were stopped. The build's temporary `tsconfig.json` entries were removed; application/inference environment files were not changed.
