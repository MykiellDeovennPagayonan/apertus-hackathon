# Premade experiment refinement tracker

Date: 2026-10-10

Scope: every premade currently offered in the Experiments tab.  
Priority: learner UX first, supported by clean code, shared components, and explicit recipes.

**Gas pressure is always the example to follow. Never touch its implementation while refining another experiment.** Preserve its source, recipe, loader, defaults, layout, and behavior. A shared-component change must also preserve the gas experience. Any future change to gas needs a separate, explicit user instruction.

## 1. Inventory and status

The inventory follows the current [Experiments catalog](../../../src/web/src/app/experiments/_lib/premadeExperiments.ts). Update this table whenever an experiment is added, removed, or refined. Builder-only reusable assemblies are outside this inventory.

**Refined** records the accepted refinement of the current learner experience. It does not mean that every architecture requirement in implementation 013 has been completed across the whole application. **Not yet** means that the experiment still needs this refinement process; it is not a claim that the existing model is broken.

| Experiment in the tab | Slug | Status | Recipe / current implementation | Refinement delivered or next work |
| --- | --- | --- | --- | --- |
| Gas pressure | `gas` | **Refined — protected reference** | [gas-pressure.recipe.json](../../../src/web/src/simulations/pre-made/gas/gas-pressure.recipe.json) | The quality baseline: one volume decision, a clear physical effect, and one pressure observation. Preserve it exactly. |
| Projectile motion | `projectile` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/projectile/recipe.json) | Explicit two-ball comparison, readable trajectories on a stable scale, two angle controls, four measurements, and a launch button that fills its action card. |
| Truss bridge | `bridge` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/bridge/recipe.json) | Explicit truss composition, larger and clearer scene, load position and mass controls, readable beam inspection, and guidance for selecting a beam. |
| Counting circles / counting numbers | `counting` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/counting/recipe.json) | Clear tap-to-count instruction, counted total, one validated circle-count field, and Count again. Circles and card content fit without internal scrolling. |
| Addition & subtraction | `arithmetic` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/arithmetic/recipe.json) | Bordered circle groups, clear operation and operand controls, visible calculation, and one Add circles / Take away circles action. Circles move one at a time; Try again appears after completion. |
| Living town | `town` | **Not yet** | [Current premade selection](../../../src/web/src/simulations/pre-made/town/index.ts) | Refine the learning question, routine controls, 3D scene guidance, observations, and responsive presentation; materialize one explicit JSON recipe. |
| Equal groups | `equal-groups` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/equal-groups/recipe.json) | One Share circles action distributes stable circles one at a time, shows equal basket counts and a separate remainder, supports Share again and immediate reduced motion; validated circle/basket entry. |
| Fraction builder | `fraction-builder` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/fraction-builder/recipe.json) | Equal-sized, directly shaded bars; one equal-part control for each bar; shade directly on the scene; exact comparison, keyboard shading, and a compact scene. |
| Fraction number line | `fraction-number-line` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/fraction-number-line/recipe.json) | Place, Add, and Subtract modes; one exact fraction field per operand, readable ticks and jumps, and a draggable marker with arrow-key movement, Check placement feedback, and Show jumps / Try again. |
| Ratios & percentages | `ratio` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/ratio/recipe.json) | Selected amount and positive whole controls; a filled whole bar, explicit extra wholes/remainder, a percentage readout with % units, and valid zero/over-100% states. |
| Area & perimeter | `area-perimeter` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/area-perimeter/recipe.json) | Width and height in metres alongside a proportional rectangle; shaded area and contrasting perimeter edge; independent area/perimeter readouts arranged side by side. |
| Coordinate plotting | `coordinates` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/coordinates/recipe.json) | Exact decimal x/y entry, a touch-sized draggable point, one-unit arrow-key movement, projection guides, labeled coordinates, and independent horizontal/vertical readouts. |
| Probability trials | `probability` | **Refined** | [recipe.json](../../../src/web/src/simulations/pre-made/probability/recipe.json) | Staged coin/die and trial-count choices; one Run trials action creates a fresh reproducible sample; a readable count/percentage chart and independent observed-versus-expected summary. |
| Two perspectives, one city | `agent-conversation` | **Implemented — prior batch** | [recipe.json](../../../src/web/src/simulations/pre-made/agent-conversation/recipe.json) | Existing agent conversation; this batch preserves it and checks its HTML scene rather than its decorative SVG. |
| Three-versus-three AI debate | `debate` | **Implemented — prior batch** | [recipe.json](../../../src/web/src/simulations/pre-made/debate/recipe.json) | Existing authored debate; no new learner refinement claimed in this batch. |
| Nutrients & plant growth | `nutrient-limitation` | **Reviewed — desktop** | [recipe.json](../../../src/web/src/simulations/pre-made/nutrient-limitation/recipe.json) | Shared-scale plants, sufficient-resource bars, co-limitation, validated inputs, biomass/height and causal explanation. |
| Craft or assembly line? | `craft-production` | **Reviewed — desktop** | [recipe.json](../../../src/web/src/simulations/pre-made/craft-production/recipe.json) | Equal workers/shift; follow an item through stages; queues, idle time, output, defects; bottleneck and interruption counterexamples. |
| Wildfire & fuel treatment | `wildfire` | **Reviewed — desktop** | [recipe.json](../../../src/web/src/simulations/pre-made/wildfire/recipe.json) | Identical ignition/weather; paired patterned landscapes; treatment, intensity, burned area and community outcomes, including treatment crossing. |
| Food-web connections | `food-web` | **Reviewed — desktop** | [recipe.json](../../../src/web/src/simulations/pre-made/food-web/recipe.json) | Readable three-organism feeding paths, searchable access to all 24 Yellowstone nodes, sourced species details and a guided wolf-removal scenario. |

**Count: 19 premades; 12 previously refined, 4 desktop-reviewed, 2 prior agent implementations, 1 not yet (Living town).** Counting is currently titled “Counting circles” in the catalog; this is the counting-numbers activity discussed during refinement.

Gas retains its existing filename and loading path as a deliberate protected exception. Do not rename or migrate it to satisfy a generic convention during this work. The earlier gas-migration plan in implementation 013 and the uniform-shell feature document does not override the user's later instruction to leave gas untouched.

## 2. Design contracts to follow

Read these before refining the next experiment. They work together; visual polish alone does not satisfy them.

| Document | What it requires from a refinement |
| --- | --- |
| [001 — Experiment builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md) | Make the next action clear, reveal complexity in response to intent, use space purposefully, emphasize the primary action, preserve editing drafts, and support recovery. Check the actual builder flow. |
| [002 — Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md) | Give each component a clear task and visual grammar. Keep labels, units, and feedback close to the interaction. Design ready, focused, editing, invalid, empty, disabled, and unavailable states. Improve reusable components at their source. |
| [003 — Simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md) | Begin with one learning question and the smallest useful set of controls. Make the change visible, size the scene and controls appropriately, preserve independent editing, and verify save, remix, and Try lesson. |
| [Uniform experiment shell and premade recipes](../features/UNIFORM_EXPERIMENT_SHELL_AND_PREMADE_RECIPES.md) | Use the same shell, canvas host, options, bottom chat, runtime, and persistence paths. Let the recipe own composition and presentation. Keep accepted inputs, scene, and results consistent. |
| [013 — Premade JSON recipe convention](013-PREMADE-JSON-RECIPE-CONVENTION.md) | One authoritative JSON file per migrated premade; generated registry, generic loader and serializer, explicit starting values and connections, enforced dependency boundaries, and removal of obsolete selection scaffolding. Apply the gas protection above. |

The user's explicit UX rules below take precedence over earlier examples that allowed card scrolling or native number fields.

## 3. Yeses and nos

| Yes — required | No — forbidden |
| --- | --- |
| **Follow gas's clarity every time:** an obvious decision, visible effect, and meaningful observation. | **Never touch gas's implementation** as part of another refinement, including renaming its recipe or changing its loading behavior. |
| Size cards and their contents together. Reflow the board when space is limited. | **No scrollbars inside cards**, whether vertical or horizontal. Do not conceal the scrollbar while leaving a scrollable or clipped card behind. |
| Use `type="text"` with an appropriate numeric/decimal input mode, local draft handling, and numeric validation. | **No native `type="number"` inputs or spinner arrows.** Hiding arrows with CSS is not the requested solution. |
| Show the last accepted model value and useful validation/recovery. | Do not treat an empty or invalid draft as zero or display an unaccepted value as active model state. |
| Use clear borders or backgrounds where they identify groups and interaction boundaries. | Do not leave arithmetic groups visually ambiguous or surround every nested element with another panel. |
| Put concise instructions beside the action they explain. Make the main action understandable without trial and error. | Do not rely on a distant paragraph, hover-only cue, raw IDs, or technical property dumps to explain the activity. |
| Use a properly sized primary button. A wide action card needs an action that uses its width. | No tiny button stranded on the left of a mostly empty card. |
| Keep only controls that serve the learning question; disclose less frequent configuration through the standard options. | No panels of Start, Next step, Replay, Restart, Pause, and extra toggles when one clear activity action is enough. |
| Animate to explain the operation: move circles one at a time, keep identities stable, and respect reduced motion. | No decorative animation that hides the result, a second simulation clock, or forced motion for people who request reduced motion. |
| Use one `pre-made/<slug>/recipe.json` for each newly migrated experiment. Put implementation in shared components/runtime. | No premade TypeScript/CSS implementation, nested re-export trees, duplicated recipe copies, or domain-specific loaders. Gas's protected existing file is the explicit exception. |
| Author nodes, versions, configuration, connections, labels, lesson text, and board presentation explicitly in JSON. | No loader that invents controls, filters generated controls, injects defaults or copy, or patches a lesson's layout by slug. |
| Use the existing shared experiment shell, component catalog, authored runtime, canvas, and builder. | No standalone page, private shell, route-owned composition, or different rendering privileges for premades. |
| Keep scenes, controls, and observations independently editable and correctly connected in remix. | Do not lock the whole experiment into one panel merely to make the screenshot tidy. |
| Verify readable content, usable targets, and unobstructed actions on narrow and short screens. | Do not shrink everything until it technically fits but becomes difficult to read or operate. |
| Fix layout constraints and measure resolved browser geometry. | Do not call a redesign complete because screenshots look plausible or the page itself has no overflow. |

Board navigation/panning is distinct from card scrolling. A learner may navigate the shared board; individual cards must show their content without internal scrollbars or clipping. Large authoring dialogs and data browsers have their own design contracts and are not permission to make learner cards scroll.

## 4. Repeatable refinement process

1. **Inventory the actual entry.** Confirm the catalog title, slug, current source, aliases, supported model commands, and builder consumers. Record the row here. Preserve unrelated edits and all gas implementation files.
2. **Define the learning question.** Describe what the learner changes and what they should observe. Decide which model conditions stay fixed. Remove controls that do not help answer that question.
3. **Inspect the experience before styling.** Open the learner view and builder remix. Record confusing actions, poor boundaries, empty space, clipping, scrolling cards, spinner fields, and misleading state. Check the actual resolved CSS and wrapper sizes.
4. **Refine shared components.** Improve the reusable input, readout, scene, or action at its source. Keep domain calculations in their model owners. Use validated text entry, readable measurements, visible focus, meaningful empty/zero states, and recoverable errors.
5. **Materialize one authored recipe.** Persist the complete expanded document, starting configuration, connections, labels, instructions, assumptions, dependencies, catalog metadata, and desktop/narrow board presentation in `recipe.json`. Do not generate the learner composition during loading.
6. **Connect the generic path.** Regenerate the registry and load through the shared validator/loader. Remove obsolete premade re-exports and current duplicate defaults. Keep necessary historical readers in the designated compatibility area; track remaining legacy execution debt explicitly.
7. **Test the main activity and its states.** Check the first-use action, changed values, completion, repeat/reset, zero/minimum/maximum values, invalid/unfinished text, keyboard interaction, and reduced motion. An animation must remain tied to the accepted model state.
8. **Inspect multiple layouts.** At minimum, check desktop, phone, and a short viewport. Verify that every card has no internal scrolling, all text and controls fit, the main button uses its space, and navigation does not cover the activity. Inspect both opening and changed states.
9. **Verify the complete round trip.** Save and reopen/import the recipe. Remix it into editable components, operate the controls, and run Try lesson. Verify instance isolation, connections, authored presentation, reset behavior, and atomic rejection of malformed inputs.
10. **Run appropriate regressions and record evidence.** Use the checks below. Review shared-component changes against gas without editing it. Mark the row Refined only after the experience has been reviewed, and record any remaining architecture or validation work separately.

## 5. Reference code and verification

Paths are implementation references, not permission to copy an experiment into a separate UI.

| Responsibility | Reference |
| --- | --- |
| **Protected quality reference** | [Gas recipe](../../../src/web/src/simulations/pre-made/gas/gas-pressure.recipe.json) — read and learn from it; do not edit. |
| Shared shell and recipe activation | [ExperimentsShell.tsx](../../../src/web/src/app/experiments/_components/ExperimentsShell.tsx), [ExperimentView.tsx](../../../src/web/src/simulations/legacy/components/views/ExperimentView.tsx) |
| Current Experiments inventory | [premadeExperiments.ts](../../../src/web/src/app/experiments/_lib/premadeExperiments.ts) — migrated entries project recipe metadata. Remaining handwritten entries still need migration. |
| Shared registry and loader | [registry.ts](../../../src/web/src/simulations/registry/recipes/premade.ts), [loadRecipe.ts](../../../src/web/src/simulations/creation-and-editing/runtime-engine/loadRecipe.ts), [schema.ts](../../../src/web/src/simulations/creation-and-editing/validator/parseRecipe.ts) |
| Canonical recipe export | [serializeRecipe.ts](../../../src/web/src/simulations/creation-and-editing/authoring-engine/serializeRecipe.ts), [builder serialization adapter](../../../src/web/src/simulations/builder/document/serialization.ts) |
| Authored execution and board contract | [runtime.ts](../../../src/web/src/simulations/creation-and-editing/runtime-engine/DocumentRuntime.ts), [board.ts](../../../src/web/src/simulations/creation-and-editing/authoring-engine/presentation/board.ts) |
| Reusable learner renderer and canvas | [RecipeLesson.tsx](../../../src/web/src/simulations/creation-and-editing/simulation/RecipeLesson.tsx), [SpatialBoard.tsx](../../../src/web/src/simulations/creation-and-editing/simulation/board/SpatialBoard.tsx) |
| Numeric text entry and task editing | [NumberField.tsx](../../../src/web/src/simulations/registry/controls/NumberField.tsx), [SchemaForm.tsx](../../../src/web/src/simulations/registry/controls/SchemaForm.tsx), [TaskControl.tsx](../../../src/web/src/simulations/legacy/components/controls/TaskControl.tsx) |
| Arithmetic interaction and animation | [ArithmeticScene.tsx](../../../src/web/src/simulations/legacy/components/views/ArithmeticScene.tsx), [CounterTokenVisual.tsx](../../../src/web/src/simulations/legacy/components/visuals/CounterTokenVisual.tsx), [ArithmeticSystem.ts](../../../src/web/src/simulations/legacy/components/systems/ArithmeticSystem.ts) |
| Other refined scenes | [CountingScene.tsx](../../../src/web/src/simulations/legacy/components/views/CountingScene.tsx), [ProjectileScene.tsx](../../../src/web/src/simulations/legacy/components/views/ProjectileScene.tsx), [BridgeScene.tsx](../../../src/web/src/simulations/legacy/components/views/BridgeScene.tsx) |
| Reusable presentation styles | [recipe-lesson.css](../../../src/web/src/simulations/creation-and-editing/simulation/recipe-lesson.css), [board.css](../../../src/web/src/simulations/creation-and-editing/simulation/board/board.css) |
| Historical compatibility home | [runtime/recipes/compatibility](../../../src/web/src/simulations/runtime/recipes/compatibility/) — historical compositions and command translation are not new premade sources. |
| Deterministic discovery | [generate-registry.cjs](../../../src/web/scripts/recipes/generate-registry.cjs) and its generated static mapping |
| Structure, runtime, and round-trip checks | [verify-structure.cjs](../../../src/web/scripts/recipes/verify-structure.cjs), [verify-contract.cjs](../../../src/web/scripts/recipes/verify-contract.cjs) |
| Browser acceptance | [verify-browser.cjs](../../../src/web/scripts/recipes/verify-browser.cjs), [recipe cases](../../../src/web/scripts/recipes/cases/) |
| Gas preservation regression | [verify-gas-recipe.cjs](../../../src/web/scripts/verify-gas-recipe.cjs) — run read-only verification; preserve the implementation. |

Run from `src/web`:

```sh
pnpm recipes:generate
pnpm test:recipes
pnpm test:recipes:browser
pnpm test
pnpm exec tsc --noEmit
```

Browser acceptance requires a running local app. Set `UX_TEST_URL` to its address when needed. `RECIPE_CAPTURE_DIR` controls capture output. Run scoped formatting/lint checks on changed source files as well. Passing automated checks supports a review; it does not replace inspecting the actual interactions and screenshots.

Keep validation status separate from refinement status. The card-layout browser checks cover all eleven migrated premades at desktop, phone, and short viewport sizes, including overflow and native-number-input assertions and launch-button width. A focused browser check of the latest arithmetic animation also passed: intermediate circle positions, sequential addition, subtraction completion, and the immediate reduced-motion path. TypeScript validation passed after that revision. Keep these checks in future regression coverage; this is scoped evidence, not a claim that all premades or all builder entry points have passed the same review.

## 6. Work done

- **Gas pressure — Refined, preserved.** Established the design reference: simple volume input, visible piston/gas response, and prominent pressure output. Its existing implementation is protected and has not been migrated or rewritten in this batch.
- **Projectile motion — Refined.** Moved the complete two-ball authored experiment into one JSON recipe. Kept independent angle inputs and distance/height outputs, improved scene presentation, removed overflowing control cards, replaced spinner fields with validated text entry, and made Launch both fill its action card.
- **Counting circles / numbers — Refined.** Moved the activity into one JSON recipe. Added a clear tap-to-count instruction and bounded text entry, simplified the controls, and made the circle scene and observation fit without internal card scrolling.
- **Truss bridge — Refined.** Moved the expanded truss, load, appearances, controls, connections, and presentation into one JSON recipe. Improved the scene's presence and readability, removed scrolling control cards, and replaced the generic empty inspection dump with guidance to select a beam.
- **Addition & subtraction — Refined.** Moved the activity into one JSON recipe. Removed the crowded playback/control collection, introduced clear bordered groups and numeric text fields, and added an obvious Add circles / Take away circles action with completion and Try again. The follow-up animation moves stable circle identities one at a time using the existing model clock, with a reduced-motion path.
- **Shared infrastructure.** Added generic recipe validation, registry generation, loading, serialization, builder round trips, and scoped runtime integration for the eleven migrated lessons. Removed their premade re-export trees and moved retained historical compositions into the compatibility area. Added structure, behavioral, round-trip, and browser checks.

Living town is the remaining Not yet row and was explicitly excluded from this batch. Global retirement of legacy execution adapters and migration of other catalog/builder experiments remain separate architecture work; neither is permission to change gas.

## 7. Seven mathematics refinements — 2026-10-06

The seven remaining mathematics premades now load from one explicit JSON each. Their old premade re-export trees were removed; required historical compositions moved into `runtime/recipes/compatibility/compositions/`. Catalog metadata and starting values come from the recipes. Gas and Town implementation files remain unchanged, and their catalog positions are preserved.

The new task controls use validated numeric text fields with local drafts. Scenes, task controls, and observations remain independently editable. Sharing animates stable circle identities using the existing clock and completes immediately under reduced motion. Fraction bars support both direct shading and exact shaded counts. Fraction placement has an exact selector alongside ticks. Probability choices are staged until Run trials, and its observations describe the completed sample.

Phone layouts reserve a navigation row so tools cannot cover the activity. Authored responsive sizes and side-by-side readouts avoid shrinking controls or introducing card scrolling. Browser checks exercise opening, changed, maximum, and invalid states at 1440×900, 390×844, and 1024×600, in addition to all seven Save recipe → Remix → Try lesson flows. A disposed-session rendering regression covers the activation transition that previously assembled a legacy model using another session's defaults.

Validation evidence and remaining architecture scope are recorded in [013-validation/seven-mathematics-refinements.md](013-validation/seven-mathematics-refinements.md). This batch does not retire every historical execution adapter or migrate Town, and does not authorize any Gas migration.


## 8. UX correction after screenshot review — 2026-10-06

The previous seven-mathematics validation demonstrated working model commands and round trips. It did **not** establish an acceptable learner experience. The user rejected the oversized form cards, generic small fields, and unnecessary controls in those captures. Treat that review as the reason for this follow-up, not as a minor visual preference.

The acceptance reference remains gas: a clear change, a visible effect, and a meaningful observation. This pass replaces the seven task forms with large, bordered exact values and the existing gas-style slider presentation. Fraction shading happens on the bars; there are only two equal-part controls, rather than four numeric fields. A number-line fraction is one field, not a numerator/denominator form; a touch-sized draggable marker and arrow keys replace its redundant position dropdown. Probability retains one sample action, with staged choices and invalid drafts preventing execution.

Authored scene, task, and observation nodes remain separate. Compact opening card sizes replace the prior maximum-sized forms. Shared responsive cards expand for validation and additional operands; small-screen layouts place paired quantities side by side at their actual readable scale. Scene SVGs fit their authored bounds. Short instructions identify the next action instead of describing every supported feature at once.

Stricter browser checks enforce the number of opening fields, exact-value target heights and font sizes, no internal card scrolling, invalid-state expansion, unfinished-fraction recovery, keyboard marker movement, and the existing saved JSON / remix / Try lesson flows. Evidence for this correction is recorded in [014-validation/seven-mathematics-ux-correction.md](014-validation/seven-mathematics-ux-correction.md), independently of the older `013-validation` captures.


## 8. Four systems desktop review — 2026-10-10

The four new systems use explicit JSON recipes, shared authored execution and independent scene/control/result components. They passed deterministic boundary/counterexample checks, the full non-browser suite, and a 34-state Playwright desktop review with catalog, invalid input, keyboard, reset, saved-file import and Save recipe → Remix → Try lesson coverage. Two written screenshot critique rounds corrected control-column overflow, explanation placement/typography, food-web arrowheads, plant-height scaling and visible factory handoffs/queues.

Evidence, geometry, calibrated assumptions and reproducible commands are recorded in [022 — Four systems simulations, section 12](022-FOUR-SYSTEMS-SIMULATIONS.md#12-evidence-record). Phone acceptance is deferred. Broader browser acceptance remains explicitly blocked by baseline-identical mobile navigation overlap in Area & perimeter and compact Gas clipping; these failures were reproduced against an unchanged archived app. Gas implementation and experience have not been changed to clear the gate. The existing checks retain these assertions.


### Four systems follow-up: spacing and actual food-web exploration

The user-requested follow-up replaces the six-role food illustration with a 24-node Yellowstone explorer, including 18 actual named animals, 55 feeding links, species details and independent combined interventions. Shared systems spacing now uses consistent insets/gaps, resized cards, and validation feedback that replaces the range hint in place. All four opening screenshots and detailed exploration evidence are retained in [022-validation/refinement](022-validation/refinement/); [section 13 of the implementation record](022-FOUR-SYSTEMS-SIMULATIONS.md#13-user-requested-spacing-and-food-web-expansion--2026-10-10) records the critique and engineering decisions. The additional Playwright loop covers all 24 organism controls, focused layouts, species dialogs, bounds/rejection, navigation, combined interventions and reset. Protected Gas and the prior broader browser acceptance limits remain unchanged.


### User-rejected presentation replaced with learning interactions

Section 14 of [022](022-FOUR-SYSTEMS-SIMULATIONS.md) supersedes the prior food-web and production presentation. Food-web exploration uses explicit feeding paths and a searchable organism browser. Production now uses an illustrated chair factory with selectable stations and a watch/pause journey. Wildfire adds authoritative selectable treatment patches and a separate comparison step. Nutrients remain unchanged. Final visual evidence is retained in [022-validation/ux-redesign](022-validation/ux-redesign/). Geometry passing alone is not represented as proof of student comprehension.


Latest user-directed comparison refinement: section 15 of [022](022-FOUR-SYSTEMS-SIMULATIONS.md) supersedes section 14's wildfire planner and factory illustration. Wildfire preserves the original compact paired grids and lets learners treat individual trees directly on the right-hand map. Production uses equal overhead factories with matching eight-station layouts, small workers, independent chair building on the left and directional handoffs on the right. [Screenshots and desktop QA](022-validation/compact-grids-topdown/) include custom firebreak/gap outcomes and slow-station queues. Food and nutrients retain their reviewed presentation.

Factory spacing follow-up: section 16 of [022](022-FOUR-SYSTEMS-SIMULATIONS.md) records slightly taller matching rooms, smaller workers/workbenches and greater row separation, with preserved station targets. [Latest screenshots](022-validation/factory-spacing/) and the desktop Playwright state matrix pass.
