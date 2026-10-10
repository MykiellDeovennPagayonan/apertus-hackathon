# Four systems simulations: implementation plan and desktop UX review loop

Date: 2026-10-10  
Status: **Implemented and reviewed at 1440×900; broader browser acceptance has two verified pre-existing failures**  
Scope: desktop learner experience and builder/remix parity for four new premade simulations.

## 1. Source documents and authority

The simulations to implement are:

1. [Craft production versus an assembly line](../simulations/social-systems/02-CRAFT-PRODUCTION-VERSUS-ASSEMBLY-LINE.md)
2. [Wildfire spread and prescribed burning](../simulations/science/02-WILDFIRE-AND-PRESCRIBED-BURNING.md)
3. [Food-web dynamics](../simulations/science/03-FOOD-WEB-DYNAMICS.md)
4. [Nutrients as a limiting resource](../simulations/science/04-NUTRIENTS-AS-A-LIMITING-RESOURCE.md)

The implementation must follow these design and QA contracts:

- [001 — Experiment builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md): make the next action clear, reveal complexity in response to intent, keep task space stable, use one visually dominant completion action, preserve drafts, and support recovery.
- [002 — Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md): give each component a clear task and visual grammar, keep labels and feedback near the interaction, support ready/focused/changed/invalid/unavailable states, and improve reusable primitives at their source.
- [003 — Simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md): begin with one learning question, expose the smallest useful variable set, make cause and effect visible, keep controls/scene/observations independently editable, and verify the complete learner-to-builder round trip.
- [004 — Usability QA guide](../design/004-USABILITY-QA-GUIDE.md): judge intuitive use through observable discoverability, understanding, predictability, feedback, recovery, and efficiency. Separate measured behavior from assumptions about first-time users.
- [014 — Premade refinement tracker](014-PREMADE-EXPERIMENT-REFINEMENT-TRACKER.md): use the shared shell, authored runtime, and one authoritative `recipe.json`; prohibit native number spinners and internal card scrolling; preserve independent components and inspect resolved browser geometry.

Where these documents offer a general pattern and a source simulation document states a specific learning goal, the specific learning goal determines the lesson content. Existing Gas remains the quality reference and must not be modified.

## 2. Product goal and non-goals

The learner should understand the relationship under study by changing one clearly named condition and reading an immediate visual comparison. The opening screen should answer, without interacting:

1. What question am I testing?
2. What can I change?
3. Where will I see the effect?
4. Which two conditions are being compared fairly?

This batch is desktop-only. The primary review viewport is 1440×900. Shared responsive CSS must not be intentionally broken, but phone-specific composition, screenshots, and acceptance are deferred. The simulations are bounded teaching models. They do not attempt industrial forecasting, operational fire prediction, ecosystem forecasting, or fertilizer recommendations.

The work does not create standalone routes, private runtimes, slug-specific loader behavior, or monolithic lesson components that cannot be edited in the builder.

## 3. Cross-simulation UX structure

Every simulation uses the same first-use hierarchy:

```text
Lesson question and one-sentence instruction

┌──────────────────────────────────────────┬──────────────────────┐
│ Dominant visual comparison               │ Change one condition │
│                                          │ [clear controls]     │
│ Same baseline / changed scenario         │                      │
│ Legends and labels inside the visual     ├──────────────────────┤
│                                          │ What happened        │
│                                          │ [2–3 key readouts]   │
└──────────────────────────────────────────┴──────────────────────┘

One plain-language causal explanation below or beside the comparison
```

The visual owns most of the board. The controls are a compact decision surface, and the readouts confirm what is already visible rather than replacing it. No card contains its own scrollbar. No critical meaning depends only on red/green color. Values use familiar units or explicit “relative level” language.

Each control must update a complete accepted model state. The scene, result summary, and numeric readouts must derive from the same snapshot so they cannot disagree. Reset uses the generic authored reset behavior. Invalid text drafts must leave the last accepted state visible and explain how to recover.

## 4. Simulation experience contracts

### 4.1 Craft production versus an assembly line

**Learning question:** Why can specialization increase total output, and why can a slow or disrupted station remove that advantage?

**Opening comparison:** Two factories use the same product, eight workers, and one eight-hour shift. Craft workers each complete whole items. Assembly workers repeat named stages and pass items along.

**Primary controls:**

- Division of work: broad tasks → narrow specialization.
- Slowest-stage delay: balanced stages → strong bottleneck.
- Temporary disruption: normal shift → serious interruption.

The three controls are conceptually distinct and stay visible. Product variety, fatigue policy, breaks, and worker learning are later extensions and should not crowd this first implementation.

**Dominant visual:** parallel production lanes. A highlighted item can be followed from start to finish. The assembly lane visibly shows stations, flow direction, work-in-progress queues, idle stations, and completed output. The craft lane shows each worker controlling the whole item.

**Required observations:** completed items, unfinished items, idle time, and defect rate for both approaches. A one-sentence conclusion must change when the bottleneck or disruption makes craft competitive.

**Critical states to review:** balanced/high specialization; severe bottleneck; severe disruption; minimal specialization. The assembly line must not be hard-coded to win.

### 4.2 Wildfire spread and prescribed burning

**Learning question:** How can an earlier fuel treatment change a later wildfire under the same ignition and weather?

**Opening comparison:** untreated and treated landscapes appear side by side. Both share the same ignition point, vegetation pattern, wind, and moisture. A community or protected area is visibly marked at the far side.

**Primary controls:**

- Treatment width or coverage.
- Relative wind severity.
- Relative fuel moisture.

Treatment placement and age are important later investigations, but adding them to the opening controls would weaken the first-use path. A future advanced panel can introduce them after the core comparison is sound.

**Dominant visual:** paired patch maps with vegetation/fuel texture, ignition direction, treated cells, fire intensity levels, and the community marker. The comparison must distinguish unburned, treated, low-intensity, and high-intensity cells with pattern/labels as well as color.

**Required observations:** area burned in each landscape, peak intensity, whether the community is reached, and percent reduction. The explanation must explicitly state that prescribed treatment can reduce severity without guaranteeing containment.

**Critical states to review:** no treatment; effective moderate treatment; extreme wind/dry fuel where fire crosses treatment; wider treatment. The no-treatment maps should match under identical conditions.

### 4.3 Food-web dynamics

**Learning question:** How can reducing a predator change a species with which it has no direct feeding link?

**Opening comparison:** a stable fictional ecosystem is the baseline. The learner changes top-predator pressure and compares the resulting population indices with the baseline.

**Primary control:** top-predator pressure. One strong control is preferable to exposing every interaction coefficient. Later investigations can swap the disturbance to producer productivity or a feeding link.

**Dominant visual:** a labeled energy-flow web beside aligned baseline/current population bars. Arrow direction is stated in the scene: resource or prey → consumer. Roles use labels and shapes in addition to color. Directly affected nodes receive one visual treatment; indirectly affected nodes receive another, with a compact key.

**Required observations:** predator, herbivore, producer, generalist/omnivore, specialist, and decomposer population indices; direct herbivore change; indirect producer change; causal explanation. Decomposition remains visible so the scene does not imply a one-way chain.

**Critical states to review:** stable baseline; predator reduction; near-removal; higher predator pressure. The display must avoid implying that every relationship has equal strength or that the scenario predicts a real habitat.

### 4.4 Nutrients as a limiting resource

**Learning question:** Will adding more of any nutrient always increase plant growth?

**Opening comparison:** current nutrient conditions versus a balanced reference, with light and water clearly labeled as fixed and suitable.

**Primary controls:** relative nitrogen, phosphorus, and potassium availability. Each uses a descriptive nutrient name, a relative scale, and an exact accepted value. Sliders support fast exploration; validated text values support precision and keyboard use.

**Dominant visual:** current and balanced plant silhouettes at a shared scale, three nutrient availability bars, and a prominent current-limiter label. Deficiency cues affect leaves, but biomass and height remain separate readouts so height alone is not treated as growth.

**Required observations:** limiting resource, biomass index, height, and visible health/deficiency state. The causal explanation identifies why increasing a non-limiting nutrient has little effect.

**Critical states to review:** nitrogen limitation; phosphorus limitation; co-limitation; balanced near-ceiling nutrition; increasing a nutrient that is already sufficient.

## 5. Architecture and responsibility boundaries

The implementation should extend the existing authored recipe path. Responsibilities remain separated as follows:

| Layer | Responsibility | Must not do |
| --- | --- | --- |
| Pure model/system | Validate inputs, calculate next state, calculate observations | Render UI, inspect DOM, depend on recipe slug |
| Domain contribution | Declare schemas, defaults, commands, outputs, assumptions, dependencies, presentation identity | Duplicate calculations or own component state |
| Visual adapter | Render a snapshot with semantic SVG/HTML and accessible labels | Recalculate authoritative results or mutate state |
| Shared control | Hold a local draft, validate/submit through runtime, show accepted value and errors | Patch model state directly |
| Recipe JSON | Compose model, appearance, controls, readouts, instructions, assumptions, and board geometry | Hide code, synthesize missing nodes during loading |
| Registry/runtime | Discover, validate, persist, execute, and round-trip recipes generically | Branch on one of the four slugs |
| Browser QA | Operate public UI and measure rendered behavior | Replace visual critique with pass/fail assertions |

The model transition follows an ACID-like interaction contract appropriate to an in-memory educational runtime:

- **Atomic:** one submitted command either produces one complete next snapshot or leaves the previous snapshot intact.
- **Consistent:** schemas, state invariants, and output contracts are validated before publication.
- **Isolated:** each authored model instance owns its state; changing one recipe or remixed instance cannot leak into another.
- **Durable within the product contract:** accepted authored configuration is serializable through Save recipe, import/reopen, Remix, and Try lesson.

SOLID is applied through narrow model modules, declarative domain contracts, interchangeable visual adapters, and dependency on runtime interfaces instead of routes. A new scenario should be addable without modifying the behavior of an existing model.

## 6. Planned file map

The exact names can be adjusted during implementation if an existing abstraction is a better fit, but the responsibilities and locations should remain stable.

### 6.1 New source files

| Planned path | Purpose |
| --- | --- |
| `src/web/src/simulations/domains/social-systems/index.ts` | Production model contract, schema, commands, outputs, assumptions, and presentation identity. |
| `src/web/src/simulations/domains/ecology/index.ts` | Wildfire, food-web, and nutrient model registration. Split into individual files if the index becomes more than registration/composition. |
| `src/web/src/simulations/components/systems/social-systems/production.ts` | Pure production calculations and invariants. |
| `src/web/src/simulations/components/systems/ecology/wildfire.ts` | Deterministic patch spread and paired-scenario metrics. |
| `src/web/src/simulations/components/systems/ecology/foodWeb.ts` | Fictional-web response model and direct/indirect effect classification. |
| `src/web/src/simulations/components/systems/ecology/nutrients.ts` | Limiting-resource, co-limitation, biomass, height, and deficiency calculations. |
| `src/web/src/simulations/components/visuals/social-systems/ProductionComparisonVisual.tsx` | Parallel production lanes and work-in-progress visualization. |
| `src/web/src/simulations/components/visuals/ecology/WildfireComparisonVisual.tsx` | Paired landscape/fire visualization. |
| `src/web/src/simulations/components/visuals/ecology/FoodWebVisual.tsx` | Energy-flow graph and aligned population comparison. |
| `src/web/src/simulations/components/visuals/ecology/NutrientLimitationVisual.tsx` | Plant, nutrient bars, and limiting-resource cue. |
| `src/web/src/simulations/components/views/systems-comparisons.css` | Shared visual grammar scoped to these comparisons. Split where selectors cease to be shared. |
| `src/web/src/simulations/pre-made/craft-production/recipe.json` | Complete authored production lesson. |
| `src/web/src/simulations/pre-made/wildfire/recipe.json` | Complete authored wildfire lesson. |
| `src/web/src/simulations/pre-made/food-web/recipe.json` | Complete authored food-web lesson. |
| `src/web/src/simulations/pre-made/nutrient-limitation/recipe.json` | Complete authored nutrient lesson. |
| `src/web/scripts/domains/systems-comparisons/verify.cjs` | Deterministic model and contract checks for boundary and causal cases. |
| `src/web/scripts/domains/systems-comparisons/browser.cjs` | Desktop interaction, geometry, accessibility, round-trip, and screenshot checks. |
| `src/web/scripts/recipes/cases/*.json` | One browser acceptance case per recipe if the generic recipe suite remains the cleanest coverage point. |

### 6.2 Existing files likely to change

| Existing path | Planned change |
| --- | --- |
| `src/web/src/simulations/runtime/assembly.ts` | Add explicit domain contributions and presentation contract identities. |
| `src/web/src/simulations/components/catalog/index.ts` | Registration should flow from domain contributions. Change only if the generic registration needs a domain-neutral extension. |
| `src/web/src/simulations/components/views/recipe/RecipeAppearance.tsx` | Map presentation identities to visual adapters. Refactor to a registry if four mappings make the table unwieldy. |
| `src/web/src/simulations/components/views/RecipeLesson.tsx` | Import the scoped comparison stylesheet unless an existing supported colocation pattern is cleaner. |
| `src/web/src/simulations/runtime/types.ts` | Extend the premade slug type if static typing requires explicit new identifiers. |
| `src/web/src/app/experiments/_lib/premadeExperiments.ts` | No manual catalog entry should be needed. Change only for a generic typing issue. |
| `src/web/src/simulations/runtime/recipes/premadeRegistry.generated.ts` | Regenerated by `pnpm recipes:generate`; never hand-edit. |
| `src/web/package.json` | Add focused verification scripts only if direct commands would otherwise be undiscoverable. |
| `docs/agent-only/implementation/014-PREMADE-EXPERIMENT-REFINEMENT-TRACKER.md` | Add four rows and evidence only after each simulation passes its full review. |
| This document | Record decisions, screenshot critique, verification output, and remaining gaps. |

### 6.3 Shared files to read and preferably not change

- `src/web/src/simulations/components/controls/NumberField.tsx`
- `src/web/src/simulations/components/controls/ScalarControl.tsx`
- `src/web/src/simulations/components/views/recipe-lesson.css`
- `src/web/src/simulations/components/views/board/board.css`
- `src/web/src/simulations/runtime/authoring/runtime.ts`
- `src/web/src/simulations/runtime/recipes/loadRecipe.ts`
- `src/web/src/simulations/runtime/recipes/schema.ts`
- `src/web/src/simulations/pre-made/gas/gas-pressure.recipe.json`

If a shared defect is found, fix it at the shared source with regression coverage. Do not add recipe-specific CSS overrides to conceal a broken generic control or board constraint.

## 7. Implementation sequence and gates

### Phase 0 — Baseline and inventory

Before editing production code:

1. Record Git status and preserve unrelated changes.
2. Run current recipe and TypeScript checks to distinguish pre-existing failures from new ones.
3. Launch the app and capture Gas plus one modern recipe at 1440×900 as visual references.
4. Inspect Save recipe → Remix → Try lesson once so the new recipes target the real round trip.

**Gate:** baseline results and reference captures are recorded.

### Phase 1 — Model contracts before visuals

For each simulation:

1. Define the smallest authored configuration that answers the learning question.
2. Define commands with explicit min/max/unit contracts and plain-language descriptions.
3. Write pure initialization, transition, measurement, and capture functions.
4. Test default, minimum, maximum, and the critical counterexample where the obvious outcome does not hold.
5. State model assumptions beside the domain contract and in the recipe.

**Gate:** causal direction is tested, boundary values remain finite, invalid commands reject atomically, and every declared output exists.

### Phase 2 — Visual adapters in isolation

Build one dominant visual per model from model outputs only. Start with semantic structure and labels, then visual styling. SVG elements receive an accessible name; important results also exist as text outside the SVG. Use CSS variables and shared palette roles. Verify pattern/label legibility for wildfire and role labels for the food web.

**Gate:** default and critical changed snapshots render without authoritative calculations inside React.

### Phase 3 — Author one complete recipe at a time

Implement in this order: nutrient limitation, production, wildfire, food web. Nutrients validates the simplest new domain/visual path; production adds a comparison; wildfire adds grid semantics; food web is last because network layout has the highest visual-density risk.

For each recipe:

1. Add model and appearance nodes.
2. Add only the opening controls listed in its experience contract.
3. Add two or three independent readouts and one causal status message.
4. Connect commands and outputs explicitly.
5. Add assumptions, concise instruction, explanation, catalog metadata, and desktop board rectangles.
6. Regenerate the static registry.
7. Run structure and contract checks before starting the next recipe.

**Gate:** the recipe opens from the real catalog, saves, reopens, remixes to separate nodes, and runs through Try lesson.

### Phase 4 — First desktop UX pass

Capture every opening state and first changed state at 1440×900. Review the whole viewport. Fix comprehension and task-flow problems before decorative details.

**Gate:** question, controls, comparison, and result are visible without card scrolling; visual and textual results agree.

### Phase 5 — Adversarial states and polish

Run the critical states from section 4, including cases where treatment fails, assembly loses, a non-limiting nutrient is increased, and indirect food-web effects are visible. Check keyboard use, focus, invalid drafts, reset, reduced motion, and builder round trips.

**Gate:** assertions pass, two screenshot-review rounds find no high-severity issue, and remaining issues are fixed or documented.

## 8. Playwright implementation and usage

Use the installed Playwright CLI and the repository’s browser-test style. The focused script should use `playwright` directly, Chromium in headless mode, the existing Chrome fallback, `UX_TEST_URL`, and a configurable capture directory.

### 8.1 Local commands

From `src/web`, run the application:

```sh
pnpm dev --hostname 127.0.0.1 --port 43100
```

Then run the focused desktop review:

```sh
UX_TEST_URL=http://127.0.0.1:43100 \
SYSTEMS_CAPTURE_DIR=/tmp/apertus-systems-review \
node scripts/domains/systems-comparisons/browser.cjs
```

The generic recipe regression remains:

```sh
RECIPE_CAPTURE_DIR=/tmp/apertus-recipe-captures \
UX_TEST_URL=http://127.0.0.1:43100 \
pnpm test:recipes:browser
```

Playwright MCP may be used for exploratory inspection if available, especially for navigating, reading accessibility names, and taking extra screenshots during critique. The committed acceptance path remains the CLI script so the same interactions and geometry assertions can be rerun.

### 8.2 Capture matrix

| Simulation | Opening | Changed state | Counterexample/adversarial state |
| --- | --- | --- | --- |
| Craft production | `craft-production-opening-1440x900.png` | `craft-production-bottleneck-1440x900.png` | `craft-production-disruption-1440x900.png` |
| Wildfire | `wildfire-opening-1440x900.png` | `wildfire-treated-1440x900.png` | `wildfire-treatment-crossed-1440x900.png` |
| Food web | `food-web-opening-1440x900.png` | `food-web-predator-reduced-1440x900.png` | `food-web-predator-removed-1440x900.png` |
| Nutrients | `nutrients-opening-1440x900.png` | `nutrients-limiter-raised-1440x900.png` | `nutrients-nonlimiter-raised-1440x900.png` |

Also capture each builder remix and Try lesson once after learner screenshots pass. On failure, capture `failure-<slug>-<stage>.png` before closing the browser.

### 8.3 Browser actions to automate

For every recipe, the script must:

1. Navigate to `/experiments?experiment=<slug>` from a clean context.
2. Wait for `.board-item`, the lesson heading, and the dominant visual’s accessible name.
3. Record console errors, page errors, failed local asset requests, and hydration errors.
4. Assert the expected number of board items and opening controls.
5. Focus the primary field and change it with the keyboard, not only programmatic injection.
6. Wait for meaningful result text or a model-derived attribute to change.
7. Confirm the visual, readouts, and causal status message agree with the accepted value.
8. Enter an unfinished or invalid draft where text entry is supported. Verify an inline error and confirm the prior accepted result remains visible.
9. Reset and verify authored defaults return.
10. Save/export, remix, and run Try lesson; verify model, appearance, controls, readouts, and connections remain separate.

### 8.4 Geometry and accessibility measurements

At 1440×900, collect and assert:

- `document.documentElement.scrollWidth <= clientWidth + 2`.
- Every `.board-content` has no vertical or horizontal overflow beyond 2 px.
- No descendant inside a board card uses `overflow: auto|scroll` while actually overflowing.
- The dominant visual is at least 520 px wide and 300 px high after board scaling, unless review supports a better explicit threshold.
- Primary targets are at least 44 px high; exact-value text is at least 16 px at rendered scale.
- Labels, legends, and result values do not intersect by bounding-box checks.
- Workspace tools and composer do not cover a board item or active control.
- Focused controls have a visible outline distinguishable from their background.
- Every icon-only control has an accessible name; every dominant SVG has a role/name; changing conclusions use an existing live output pattern.
- Categories remain distinguishable by label, position, symbol, or pattern rather than color alone.

The script should print compact JSON geometry evidence for every state.

## 9. Screenshot critique loop

Automated checks catch broken behavior and geometry. They do not decide whether the screen explains the idea. Each capture goes through this written critique.

### Pass A — five-second hierarchy

Look at the full screenshot for five seconds, then answer from memory:

- What is being compared?
- Which control should be changed first?
- Where is the result?
- Which condition is held constant?

If an answer is unclear, adjust layout, heading, instruction, grouping, or emphasis before reviewing color and polish.

### Pass B — causal legibility

Compare opening and changed screenshots side by side:

- Is the changed variable visibly different?
- Is its effect visible before reading numbers?
- Do readouts confirm the same story?
- Does the explanation name the mechanism rather than restating numbers?
- Is the counterexample believable and clearly explained?

If the visual moves but the mechanism is unclear, add an in-scene cue such as a queue, broken fuel path, direct/indirect highlight, or lowest-resource marker. Do not add a paragraph to compensate for a weak visualization.

### Pass C — density and reading order

Trace the eye path from title to instruction to control to effect to explanation. Remove repeated legends, duplicate numbers, technical labels, large empty cards, and secondary controls that compete with the learning question. The control/result column should not visually overpower the scene.

### Pass D — feedback and recovery

Review focused, changed, invalid, and reset states. The accepted value, pending draft, error, and active result must remain distinct. Recovery must not require a reload.

### Pass E — visual craft

After A–D pass, refine spacing, alignment, border roles, typography, palette, patterns, icon consistency, and restrained motion. Decoration must clarify grouping, state, or flow.

For each failed pass, write:

> Observed: [specific visible behavior]. Impact: [task or concept made harder]. Change: [smallest useful correction].

Apply the smallest structural correction, rerun the interaction, and recapture the same state. Keep `round-1`, `round-2`, and `final` capture directories until final evidence is recorded.

## 10. Definition of done

A simulation is complete only when:

- Model boundaries and causal counterexamples pass deterministic tests.
- Recipe structure and runtime contracts pass.
- It opens from the real catalog with accurate metadata.
- Opening, changed, counterexample, invalid, reset, remix, and Try lesson states work.
- At 1440×900, cards have no clipping or internal scrolling and the primary action remains visible.
- Keyboard operation and focus feedback work for every opening control.
- Visual, readouts, and explanation agree after every accepted input.
- Fixed conditions and simplifying assumptions are visible without overwhelming the task.
- Two screenshot-critique rounds contain no unresolved high-severity UX finding.
- Gas and the existing recipe suite regressions pass without modifying Gas.
- This document records evidence, findings, fixes, and remaining limitations.

Passing TypeScript, unit checks, or screenshots alone is insufficient. Completion requires model correctness, runtime integration, builder editability, browser behavior, and visual-comprehension evidence.

## 11. Planned verification commands

Run from `src/web`:

```sh
pnpm recipes:generate
node scripts/domains/systems-comparisons/verify.cjs
pnpm test:recipes
pnpm test:gas-recipe
pnpm exec tsc --noEmit
pnpm biome check <changed-source-files>
```

With the local application running:

```sh
UX_TEST_URL=http://127.0.0.1:43100 \
SYSTEMS_CAPTURE_DIR=/tmp/apertus-systems-review/final \
node scripts/domains/systems-comparisons/browser.cjs

UX_TEST_URL=http://127.0.0.1:43100 \
RECIPE_CAPTURE_DIR=/tmp/apertus-recipe-captures \
pnpm test:recipes:browser
```

Broader `pnpm test` runs after the focused suite is green. Repeating already-green checks without a code change is unnecessary.

## 12. Evidence record

### 12.1 Delivered architecture

All four catalog lessons use one authoritative `pre-made/<slug>/recipe.json`, the generated registry, the shared loader/runtime, and the shared learner/builder shell. There are no new routes or slug-dependent model/rendering branches.

- Pure deterministic calculations live in `components/systems/ecology/{nutrients,wildfire,foodWeb}.ts` and `components/systems/social-systems/production.ts`.
- `domains/ecology` and `domains/social-systems` register versioned models, explicit output schemas, bounded integer inputs, absolute setter commands, defaults, assumptions, and dependencies. `domains/comparisonModel.ts` shares validation and registration plumbing only; it contains no domain calculations.
- Four registered appearance adapters consume the measured scene snapshot. Controls, scene, readouts, and causal status remain separate authored nodes connected in JSON and independently editable in the builder.
- Numeric controls reuse the existing draft/accepted-value primitive. Compact range/exact-field presentation is explicitly opted into by the new command metadata; existing controls retain their markup and presentation. Status text can respect an authored font size. The shared status-card minimum now allows a 96-pixel explanation card, checked against a rejected 95-pixel card.
- Saved recipes retain the existing application contract: **Save recipe exports authored starting values**, rather than silently replacing them with the current exploration. Runtime capture → serialize → reopen tests separately verify accepted configurations and independent instances.

### 12.2 Model checks and calibrated teaching conditions

All model setters are tested at both bounds and reject negative values, values above the maximum, fractions, strings, NaN, Infinity, and unknown operations. Every combined min/max corner is measured through the output-contract validator. Empty initialization yields documented defaults; input state is not mutated. Runtime tests exercise atomic invalid submission, accepted-value projection, capture/serialization/reopening, instance isolation, and reset.

| Model | Teaching constants and counterexamples |
| --- | --- |
| Nutrients | Supplies 0–150; sufficient supply 100. Biomass is `min(N,P,K,100)`. Illustrative height is `round(12 + 48√(biomass/100))` cm. Opening 40/100/100 produces biomass 40 and height 42 cm. Raising an already sufficient nutrient does not change growth; raising the limiter helps; tied shortages require both resources; above-sufficient supply plateaus. Plant silhouette height uses the same height measure, not the biomass index. |
| Production | Eight workers, eight stages, 480-minute shift, 80 minutes per whole craft item. Stage duration is `10/(1+1.2×specialization/100)` minutes, with the Join delay multiplier `1+delay/20`. Join can be interrupted at minute 240 for up to 240 minutes; one craft worker receives the same interruption. Source and intermediate queues are unlimited. Completed output, unfinished items and idle time derive from the event schedule. Defect percentages are explicitly illustrative assumptions. High specialization wins at balanced flow; severe delay, severe interruption and minimal specialization remove that advantage. A separate closed-form balanced-line throughput oracle ensures zero interruption cannot introduce a delay. |
| Wildfire | Fixed 10×16 vegetation map, ignition at row 5/column 0, identical weather, and a central treatment strip of 0–6 columns. Downwind heat uses neighboring patches and threshold 0.25. Treatment retention is `0.15+wind/180`, versus 0.92 untreated; local heating multipliers are 0.18 and 0.28. Intensity is capped at 1.8 and shown as a relative index. Opening width 50/wind 35/moisture 40 gives 84% versus 34% burned, peak indices 174 versus 117, and protects the treated community. With wind 100/moisture 0, fire reaches both communities. Zero treatment yields identical maps; stronger treatment does not increase burning. |
| Food web | Fictional bounded equilibrium indices, baseline 100, pressure 0–150. With `release=1-pressure/100`, grazers respond by +75×release, grasses −48, generalists −12, specialists −40 and decomposers +18. Predator removal releases grazers directly and lowers grasses indirectly; stronger predation reverses that cascade. Alternative diets make the generalist response smaller than the specialist response. Feeding arrows connect prey/resource to consumer; there is no direct hunter-to-grass feeding link. This is not a time-series forecast. |

### 12.3 Browser QA and screenshot critique

Baseline recipe/runtime checks and TypeScript passed before implementation. Gas and Ratio were captured and the existing Save recipe → Remix → Try lesson flow was exercised before changing shared controls. Screenshot artifacts are retained locally:

- Baseline: `/tmp/apertus-systems-review/baseline/`.
- First critique: `/tmp/apertus-systems-review/round-1/`.
- Second critique and full state matrix: `/tmp/apertus-systems-review/round-2/`.
- Final captures, downloaded recipes and geometry: `/tmp/apertus-systems-review/final/`.

**Round 1 findings and corrections:**

1. **Observed:** stacked slider labels, exact fields, endpoints and repeated units made the right column taller than the available screen; production readouts ran behind the composer and nutrient/wildfire cards extended below the viewport. **Impact:** learners could not read the complete result without moving the canvas. **Change:** pair each slider and exact field beneath one full-width label, keep one meaningful scale/help line, reserve validation space, and resize authored control/result cards. No scrollbar or overflow-hiding workaround was added.
2. **Observed:** the food-web explanation overlapped the lower navigation area while the result column had excess empty space. **Impact:** the causal explanation lost its place in the reading order. **Change:** place the explanation immediately below the observations in the right column and resize the scene and summary independently.
3. **Observed:** food-web arrowheads met or disappeared beneath consumer nodes. **Impact:** prey-to-consumer direction was ambiguous. **Change:** compute endpoints at node boundaries with a visible gap and retain a clear arrow-direction legend.
4. **Observed:** the factory's amber item was static, and queue counts alone did not show accumulated work. **Impact:** the promised handoff mechanism could not be explored. **Change:** add keyboard-operable Follow item, move the same highlight through all eight stages, draw queue chips and emphasize the delayed/interrupted Join station. Stage following is local presentation state; it does not change authoritative shift outputs.
5. **Observed:** the current plant's silhouette used the biomass ratio while its label showed a nonlinear height. **Impact:** the visual contradicted the height readout. **Change:** scale both plants by the accepted height output on the same 60-cm reference.

**Round 2 findings and corrections:**

1. **Observed:** explanations inherited the shared 13-pixel status style after the layout became compact. **Impact:** the causal mechanism was less legible than the main scene and control labels. **Change:** author 16-pixel status text through the existing layout settings, shorten the production counterexample, and preserve the previous default for other lessons.
2. **Observed:** the highlighted factory item could compete with flow arrows when placed between stations. **Impact:** the current stage was hard to identify. **Change:** place the amber marker below its current station, show “Stage n of 8 · name,” and label the lane as an end-of-shift snapshot. Queue chips sit above the corresponding station.

Final screenshots were inspected again for opening, critical changed states, causal counterexamples, invalid states, reset, Remix and Try lesson. The production counterexample visibly accumulates a queue before Join and idle workers after it. Severe wildfire weather visibly crosses the treatment. Predator removal highlights the direct grazer and indirect grass changes with solid/dashed outlines. Nutrient co-limitation and non-limiter changes preserve the correct growth response. No unresolved high-severity finding remains in the four desktop lessons.

The committed Playwright suite starts from the actual catalog for each lesson, checks title/description, keyboard focus and slider operation for every control, invalid-draft rejection and Escape recovery, every critical state, reset, all eight production handoffs, actual file download/import, Remix, Try lesson, and another accepted input in the reopened lesson. It checks scene/readout agreement and records browser exceptions and failed requests. This is measured behavior plus screenshot critique, **not an observed first-time-user study**.

### 12.4 Final desktop geometry

`/tmp/apertus-systems-review/final/geometry.json` contains 34 opening/changed/invalid/reset state measurements at 1440×900, with separate Remix and Try lesson captures.

| Lesson | Scene width × height, rendered pixels | Lowest card edge |
| --- | --- | --- |
| Nutrients | 792 × 510 | 771 |
| Production | 792 × 530 | 805 |
| Wildfire | 792 × 483 | 793 |
| Food web | 792 × 549 | 773 |

Every exact field and slider has a rendered target height of at least 54 pixels; exact values render at about 23 pixels. There is no document horizontal overflow, internal card scrolling, clipped content, SVG text collision, or intersection between lesson cards and navigation/composer/heading tools in these states. Critical controls and outcomes remain visible in the opening frame.

### 12.5 Verification and explicit acceptance limits

- `pnpm test` — passed, including recipe structure/contracts, new systems tests, Gas model/reset/export tests, historical component/markup checks, builder/runtime/generation checks, and agent suites.
- `pnpm test:recipes`, `pnpm test:gas-recipe`, `pnpm exec tsc --noEmit` — passed.
- Scoped Biome checks and `git diff --check` — passed.
- `test:systems:browser` — passed for all four lessons, including catalog selection, saved-file reopening and learner → builder → learner parity. Log: `/tmp/apertus-systems-review/final-browser.log`.
- Existing generic recipe browser checks pass their desktop pass, including the four new cases. The runner now supports explicit HTML scene selectors for the pre-existing agent lessons instead of mistaking their decorative avatar SVG for the whole scene. Default viewport coverage remains unchanged; new cases explicitly defer phone/short-view acceptance as specified.

**The broader browser gate in section 10 remains blocked by two pre-existing failures.** These are not waived or represented as passing:

1. `test:recipes:browser` reaches Area & perimeter at 390×844 and fails “navigation obscures activity.” An isolated `git archive HEAD` app on port 43101 has exactly the same geometry as the current app: activity top 96/bottom 298; Find content top 124/bottom 170. Baseline/current screenshots: `/tmp/apertus-systems-review/{baseline,current}-area-mobile.png`.
2. `verify-gas-experiment-browser.cjs` passes desktop volume/pressure/particle checks, then fails the compact 1024×603 control-within-viewport assertion. The unchanged archived baseline fails the same assertion at line 145. Logs and captures: `/tmp/apertus-systems-review/baseline-gas.log`, `baseline-gas/`, and `gas-regression/`. Gas source, recipe, defaults, loader and layout were preserved. Changing its compact experience would violate the explicit Gas-protection instruction in this document and tracker 014.

The four new desktop lessons are implemented and reviewed. Overall section-10 acceptance cannot be called fully green until those existing failures are addressed under the appropriate scope. No phone usability acceptance is claimed for the new lessons. The models remain bounded teaching examples, and the UX review has not included a novice participant study.


## 13. User-requested spacing and food-web expansion — 2026-10-10

This follow-up supersedes the six-role food-web implementation and its calibration recorded in section 12. It implements the user's request for actual named animals and free exploration. Sections 12.3–12.5 retain the original review history and existing broader browser limitations.

### 13.1 Spacing critique and corrections

The previous cards mixed small inherited insets with large authored heights. Controls were compressed inside their cards while some conclusions reserved much more height than their text needed. Invalid drafts added wrapped feedback beneath repeated scale hints, moving the board.

All four systems now use a 20-unit card inset, consistent control gaps, natural top alignment, and readable explanations. The three short conclusions place their heading beside the explanation. Their authored control and observation cards were resized together. Invalid feedback replaces the scale hint in place and states the allowed range, accepted value and Escape recovery. No content clipping or internal scrolling workaround was added. These selectors apply to the four systems; protected Gas presentation remains unchanged.

The first spacing screenshot round exposed conclusion overflow and excessive gaps after increasing the inset. A second round corrected those card dimensions and reduced between-control spacing. The final food-web review found animal icons crowding names; icons now occupy a separate part of each node. The dense focused views use two columns when an organism has more than four food sources or consumers.

### 13.2 Explore an actual ecosystem

The food web opens with 24 nodes: 18 named Yellowstone animals, four producer groups, dead matter and decomposer fungi. It includes 55 authored feeding relationships and four separately marked nutrient-return relationships. Animals include gray wolves, cougars, Canada lynx, golden eagles, red-tailed hawks, great horned owls, coyotes, red foxes, grizzly and black bears, ravens, magpies, elk, mule deer, bison, snowshoe hares, meadow voles and red squirrels.

Click or keyboard-select any node to explore its food sources and consumers. Follow another node, return to the previous organism, switch to the whole web, or open species details. Details include scientific names, ecology notes, a primary-source link, and separately grouped clickable food and consumer lists. The organism selector provides another route to all 24 nodes. Sources are the National Park Service's Yellowstone nature pages and Cornell Lab of Ornithology's species life histories, linked on each record.

Change any organism's starting level from 0 to 150; 0 removes it and 100 restores its baseline setting. Changes accumulate across organisms. Restore one organism or the entire web. The accepted starting level is separate from the measured "After feeding effects" outcome, so changing wolves can affect elk without silently changing the elk control. A removed node explicitly reads "Removed". Solid and dashed outlines distinguish direct and indirect responses; dotted arrows return nutrients rather than feeding or energy.

`foodWebSpecies.ts` owns typed species and relationship data; `foodWeb.ts` owns the pure bounded response calculation. The registered model owns authoritative population settings and selection, including validated atomic compound population commands. The independent `FoodWebPopulation` public control uses declared value/event connections. Graph focus, navigation history and the native details dialog are presentation state. The standard JSON recipe, runtime, builder and save/import paths remain shared.

Diet weights and response coefficients are illustrative teaching assumptions, not measured Yellowstone population predictions. Direct effects are one graph pass, indirect effects a second pass weighted by 0.6. Consumer resource responses use normalized diet weights and coefficient 0.55; browsing/predation uses coefficient 0.65. Nutrient return uses coefficient 0.3. Derived indices are bounded to 0–200; explicit interventions remain at their accepted 0–150 values. Seasonal diets, migration, reproduction and competition are not simulated. This is a selected ecosystem web, not every Yellowstone organism.

### 13.3 Review evidence and checks

Permanent screenshots and measured geometry are in [022-validation/refinement](022-validation/refinement/). Key reviewed states:

- [Whole Yellowstone web](022-validation/refinement/food-web-whole-web-1440x900.png)
- [Wolf removal and elk connections](022-validation/refinement/food-web-elk-connections-1440x900.png)
- [Species details and navigable diets](022-validation/refinement/food-web-species-details-1440x900.png)
- [Combined interventions](022-validation/refinement/food-web-combined-interventions-1440x900.png)
- [Grizzly alternative food sources](022-validation/refinement/food-web-grizzly-alternative-foods-1440x900.png)
- [Decomposition removed](022-validation/refinement/food-web-decomposition-removed-1440x900.png)
- [Nutrients](022-validation/refinement/nutrient-limitation-opening-1440x900.png), [production](022-validation/refinement/craft-production-opening-1440x900.png), [wildfire](022-validation/refinement/wildfire-opening-1440x900.png)

The four-lesson Playwright suite passes 34 critical desktop states, keyboard controls, invalid drafts, reset, saved-file import, Remix and Try lesson. The added explorer suite checks all 24 organism selectors and focused layouts, non-overlapping node targets, keyboard sliders, both population bounds, invalid input recovery, all 24 scientific names and source links, native dialog Escape/focus recovery, graph navigation, combined interventions, alternative diets, nutrient return and whole-web reset. Browser exceptions are checked. Logs and geometry are retained alongside the screenshots; the complete changed-state matrix remains in `/tmp/apertus-systems-review/refinement-final/`.

At 1440×900 the three comparison scenes retain a width of 792 pixels, and the expanded food scene is 754×546 pixels. The lowest card edges are 775, 803, 796 and 805 pixels respectively. Compact fields/sliders remain at least 54 pixels high in the three comparisons and 46.9 pixels in the food web; explorer buttons, selectors and nodes pass the 44-pixel rendered target check. No card scrolling, document horizontal overflow, scene text collisions or navigation/composer obstruction were detected in the measured states.

Pure-model tests now validate all 24 selectable organisms, all individual setter bounds and invalid compound commands, combined interventions, complete state capture/serialization/reopening, reset, graph referential integrity and alternate-diet counterexamples. Small models retain exhaustive corner coverage; the 25-field food model checks each field's boundaries and combined all-min/all-max states rather than claiming an exhaustive 2^25 search.

Desktop QA remains measured interaction and screenshot critique, not a novice participant study. The existing Area & perimeter phone-navigation and Gas compact-viewport failures documented in section 12.5 remain outside this change; no phone acceptance is claimed.

Final follow-up checks: `pnpm test`, `pnpm exec tsc --noEmit`, scoped Biome checks, `git diff --check`, and both systems Playwright suites passed. The generated recipe registry and source ledger were refreshed. The full non-browser log is [tests.log](022-validation/refinement/tests.log).


## 14. Teaching-first redesign after user rejection — 2026-10-10

The user rejected the section-13 presentation: the overview was a cramped collection of crossing lines, production looked like a table, and wildfire did not permit choosing treatment locations. Passing geometry and interaction checks had not established that students could understand the experience. This section supersedes the food-web overview, production scene and wildfire interaction described above. The nutrient lesson is preserved.

### Food web: follow a readable path

The opening now shows meadow grasses → elk → gray wolf. There are three large organism cards and two arrows, with a plain-language sentence stating the feeding relationships. Click a food or consumer to continue the path; select another food source or consumer to explore alternatives. Previous organism works for card navigation and the main organism selector. Species details retain the scientific name, ecology note, primary source and complete food/consumer lists.

A searchable organism browser gives access to all 24 nodes without drawing every relationship at once. The 55 authored feeding relationships and four nutrient returns remain in the shared data/model. The student explores individual connections progressively. Plant/fungi links explicitly describe nutrient return rather than energy cycling. Dead matter is described as material from dead plants and animals.

The "What if wolves disappear?" action removes wolves and focuses on elk, showing the resulting population changes across the path. Cards say "Population unchanged," "Removed," or "more/fewer than baseline," rather than displaying 24 unexplained indices. The selected population readout is a percentage of its own usual population. The visible control explains 100 = usual, 0 = none, and 150 = 50% more. The initial explanation states the wolf–elk–grass mechanism; the removal explanation states that fewer wolves leave more elk grazing. It no longer places instructions under "Why it happens."

### Production: explore an illustrated factory floor

The scene compares a craft workshop with an assembly factory making chairs. Eight craft workers have independent benches and finished chairs. Eight assembly workers stand beside a conveyor route that passes through timber cutting, shaping, fitting, joining, finishing, checking, packing and labeling. The chair drawing acquires parts, color, a box and a label as it progresses through the operations.

Every assembly station is keyboard/click selectable. "Watch a chair" advances the highlighted operation; pause and manual following remain available. Slow Join is marked on the floor. Waiting-chair stacks derive from the model queues, and workers waiting for parts change appearance. Detailed queue information appears for the selected station. The large completion totals and shared readouts still derive from the deterministic eight-hour event schedule. The journey illustrates operation order, not a replay of every event in that shift.

### Wildfire: choose an actual treatment plan

The lesson opens with 40 clickable tree patches. Each patch represents a 2×2 stand in the existing 10×16 fire model. Click or press Enter to reduce that patch's fuel; select it again to restore trees. Clear treatment creates an empty plan. A width preset supplies a quick connected firebreak and explicitly replaces a custom plan. Both presets and custom plans use the same patch grid, so the first custom edit changes exactly the selected patch.

"Compare wildfire" shows untreated and treated maps under identical ignition, vegetation, wind and moisture. Students can return to their plan, open a gap, and compare again. A tested four-column firebreak yields 34% burned and does not let fire reach the community; a gap through its center yields 78% burned and reaches the community under the same conditions. These are outputs of the illustrative teaching model, not real fire predictions.

Selected patches are validated authoritative model state, with explicit toggle/clear commands, unique bounded patch IDs, atomic rejection, complete capture/reopen and reset. Changing wind or moisture retains the custom plan; changing the width preset replaces it. The measured scene sends a 40-character treatment mask: this preserves the runtime's existing 30-entry per-array output limit while supporting every patch. The model's configurable state retains the validated patch-ID array. The shared Save recipe action continues to save authored starting conditions; preserving an explored plan uses the existing runtime capture/serialization contract. No change was made to that shared lifecycle or to protected Gas.

### QA critique and evidence

The redesign loop found and corrected:

1. Factory completion text collided with the bottom-row station labels. It now occupies a separate footer strip.
2. Scene/card heights left a clipped factory footnote and put the wildfire explanation under canvas tools. The authored rectangles and content spacing were resized; no overflow hiding was used.
3. A 31st selected wildfire patch was rejected by the shared output validator. Compact scene serialization now supports all 40 selections without relaxing the guard, with an explicit runtime regression check.
4. The wildfire comparison needed room for the mode controls and legend. A bounded comparison height preserves both maps, controls, outcomes and explanation in the opening desktop viewport.
5. The new native search dialog contained an intentionally hidden input. Geometry checks now measure visible targets; closed-dialog controls are not treated as interactive screen elements.

Permanent evidence is in [022-validation/ux-redesign](022-validation/ux-redesign/). Screenshots show the opening path, guided wolf removal, searchable organism browser, species details, illustrated factory, slow joining station, editable treatment plan, connected firebreak and comparison with a gap. The full changed-state matrix remains in `/tmp/apertus-systems-review/ux-redesign/`.

Validation covers the 34-state desktop matrix, actual saved-file import, Remix and Try lesson; all 24 organisms with numeric bounds, keyboard controls, invalid draft recovery, source dialogs, Escape/focus recovery, feeding-path/selector history and guided wolf removal; and all 40 wildfire patch buttons, custom firebreak/gap comparisons, reset, every factory station, playback/pause and bottleneck queues. The pure-model suite checks accepted state, atomic invalid rejection, placement-sensitive fire response, complete plan capture/reopen, preset replacement and all 40 patches within the unchanged output contract.

The screenshot review remains a developer critique with measured behavior, not a student usability study. The pre-existing broader browser failures and desktop-only scope recorded in section 12.5 remain explicit.


Final section-14 gate: `pnpm test`, TypeScript, scoped Biome, `git diff --check`, and the complete `pnpm test:systems:browser` chain passed. [Browser log](022-validation/ux-redesign/browser.log), [test log](022-validation/ux-redesign/tests.log), [geometry](022-validation/ux-redesign/geometry.json).

- [Readable food path](022-validation/ux-redesign/food-web-one-feeding-path-1440x900.png), [guided wolf removal](022-validation/ux-redesign/food-web-guided-wolf-removal-1440x900.png), [searchable organism browser](022-validation/ux-redesign/food-web-organism-browser-1440x900.png).
- [Factory floor](022-validation/ux-redesign/production-factory-floor-1440x900.png), [slow joining station and waiting workers](022-validation/ux-redesign/production-slow-joining-station-1440x900.png).
- [Editable tree patches](022-validation/ux-redesign/wildfire-treatment-planner-1440x900.png), [connected firebreak comparison](022-validation/ux-redesign/wildfire-custom-comparison-1440x900.png), [gap changes the outcome](022-validation/ux-redesign/wildfire-gap-comparison-1440x900.png).


## 15. Compact clickable wildfire grids and matching overhead factories

The user's latest direction supersedes section 14's large treatment planner and unequal workshop/factory illustration. The food-web feeding paths and nutrient presentation remain as reviewed.

Wildfire keeps the original paired 10×16 landscapes, compact 19-unit cells, tree/fire symbols, treatment stripes, community icons and comparison readouts. The right-hand map is always editable: clicking one cell treats that individual tree before the fire, and clicking it again restores fuel. Both outcomes update immediately. There is no separate planning screen or enlarged treatment grid. Clear treatment and Restore width preset provide recovery. One map cell is in the keyboard tab order; arrows move between cells, Home/End move to row boundaries, and Enter/Space toggle treatment. Visible hover/focus outlines and pressed state distinguish the interaction.

The pure model owns all 160 independently selectable cells. Shared map dimensions drive the model, command bounds and visual navigation. Presets select the same cells as manual treatment, rather than expanding selection to 2×2 stands. Captures retain validated, unique cell IDs. The scene sends a bounded 160-character treatment mask; the shared output guard is unchanged. The untreated map remains the reference throughout edits.

Production now shows two equal overhead factory floors with matching walls, loading bays, stock shelves, eight workbench positions and eight small overhead workers. In the craft factory, every worker builds a complete chair independently. In the assembly factory, directional conveyor arrows connect the same benches and an amber marker follows a chair through the operations. Station selection and watch/pause controls remain keyboard-operable. The joining delay highlights the slow bench, queues and waiting workers while the independent factory keeps producing. Counts stay below the floor and in the comparison readouts.

The Playwright/screenshot critique corrected factory content overflow, an explanation card overlapping the canvas tools, the selected station background covering its worker, and unused space between the wildfire map and explanation. Layout fixes resize the drawings/authored rectangles; content is not clipped to disguise overflow. Compact tree targets intentionally preserve the user's requested original map scale; toolbar and factory station targets retain the desktop minimum size checks.

Evidence is retained in [022-validation/compact-grids-topdown](022-validation/compact-grids-topdown/):

- [Original grids with individual tree selection](022-validation/compact-grids-topdown/wildfire-clickable-original-grids-1440x900.png).
- [A connected custom firebreak](022-validation/compact-grids-topdown/wildfire-custom-firebreak-1440x900.png) and [the same plan with a gap](022-validation/compact-grids-topdown/wildfire-gap-comparison-1440x900.png).
- [Matching overhead factories](022-validation/compact-grids-topdown/production-matching-topdown-factories-1440x900.png) and [a slow joining station](022-validation/compact-grids-topdown/production-slow-joining-station-1440x900.png).

Validation covers the four-lesson desktop state matrix and save/reopen/Remix/Try flows, the complete 24-organism explorer, all 160 tree cells by keyboard, pointer toggling and undo, roving focus, model/output agreement, a connected firebreak and a gap, reference-map stability and reset, matching factory station positions, every station's keyboard interaction, playback/pause, and slow-station queues. Pure tests cover cell bounds, atomic invalid rejection, complete plan capture/reopen, preset replacement and all 160 accepted selections within the unchanged output budget. Full non-browser tests, TypeScript, scoped Biome and the refreshed source-ledger/catalog check are recorded alongside the screenshots.

Desktop screenshot critique and automated interaction checks are not a student participant study. The pre-existing broader browser failures described in section 12.5 remain outside this change; phone acceptance is not claimed.


## 16. Factory breathing room

The next user review requested slightly larger rooms and smaller workers. Both matching factory floors are now 266 units tall (previously 252), with 100 units between station rows (previously 80). Overhead workers render at 65% of their previous size; workbenches shrink from 42×22 to 36×18. Station hit areas remain 58×68 and keyboard-operable, so smaller symbols do not reduce interaction targets. Conveyor turns, arrows, exit labels and footer positions follow the revised floor geometry. The shorter journey caption leaves room for queue and waiting feedback.

[Default roomier factories](022-validation/factory-spacing/production-roomier-floors-1440x900.png), [queued work](022-validation/factory-spacing/production-roomier-queues-1440x900.png), and [slow joining station](022-validation/factory-spacing/production-roomier-bottleneck-1440x900.png) were visually inspected. The four-lesson desktop Playwright matrix passed, including collisions, card overflow, canvas obstruction, invalid inputs, reset, saved-file import, Remix and Try lesson. A focused factory review also checked all eight stations at maximum delay, keyboard selection, watch/pause behavior, target sizes and browser exceptions. TypeScript and scoped Biome passed. Logs and geometry are in [022-validation/factory-spacing](022-validation/factory-spacing/). Desktop-only scope and prior broader-browser exclusions remain as documented above.
