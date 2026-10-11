# Nine science simulations: implementation plan and desktop UX acceptance loop

Date: 2026-10-10
Status: **Nine simulations implemented; deterministic and production desktop checks pass. Reliable real-model composition and user acceptance remain incomplete.** See [current implementation and evidence](#current-implementation-and-evidence). The requirements below remain the acceptance contract, not a claim that every gate has passed.
Scope: SCI-01 through SCI-09; shared learner and builder experiences; actual Apertus/Laya composition; desktop-first visual and interaction review.

This is the single record for 023. Requirements remain below; implementation notes and evidence follow them. Earlier reports have been merged into the history sections rather than kept as separate documents.

- [Requirements and acceptance contract](#1-source-contracts-and-priority)
- [Current implementation, checks, and remaining limits](#current-implementation-and-evidence)
- [Current screenshots](#current-screenshot-review)
- [Historical implementation evidence](#historical-implementation-evidence)
- [Historical redesign round 1](#historical-redesign-round-1)
- [Historical screenshot review](#historical-screenshot-review)

## 1. Source contracts and priority

Implement all nine experiences in [Science simulation concepts](../simulations/science/01-SCIENCE-SIMULATION-CONCEPTS.md). Keep its scientific boundaries, initial scenarios, and model invariants intact.

The following are required reading and acceptance contracts:

- [001 — Experiment builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md): understandable next actions, progressive disclosure, stable workspace, explicit completion, and recovery.
- [002 — Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md): purposeful component families, dependable interaction states, readable controls, and consistent presentation across hosts.
- [003 — Simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md): one learning question, visible cause and effect, independent editable components, shared canvas, and verified remix behavior.
- [004 — Usability QA guide](../design/004-USABILITY-QA-GUIDE.md): outcome-only tasks; review opening appearance, actual interaction, and recovery; evidence-based Pass/Concern/Fail/Not tested findings.
- [014 — Premade refinement tracker](014-PREMADE-EXPERIMENT-REFINEMENT-TRACKER.md): authoritative JSON recipes, no learner-card scrolling or native number spinners, shared runtime, and resolved browser geometry checks.

**UX is a release requirement, not a final styling pass.** Correct calculations, a mounted scene, or green tests cannot compensate for confusing controls, poor spacing, inconsistent design, unreadable labels, or weak feedback. Do not mark a lesson complete while its primary task needs a workaround or its scene does not explain the result.

Desktop is the main acceptance target: 1440×900, 1280×800, and 1920×1080, with a 1366×768 short-screen check. Review browser zoom at 200% and keyboard use. Dedicated phone layouts and a mobile screenshot matrix are deferred; preserve shared responsive behavior.

This document authorizes the future implementation workflow through concrete review gates. Creating this plan does not establish that runtime work or live testing has occurred.

## 2. Opening experience and consistent visual system

Every lesson opens populated and paused, with one learning question, a brief invitation to act, an identifiable scene, and one obvious main action. A learner must be able to identify what changes and where its effect appears before opening setup.

Use this hierarchy within the existing spatial board, with independently authored components:

```text
Title · one learning question · short teaching-model note

┌───────────────────────────────────────┬─────────────────────────┐
│ Dominant scene                        │ Change / explore        │
│ Selectable objects                    │ Primary decision        │
│ Local labels and meaningful legend    │ Relevant controls       │
│                                       ├─────────────────────────┤
│                                       │ Selected object         │
│                                       │ Identity · state · why  │
├───────────────────────────────────────┴─────────────────────────┤
│ Playback / stage actions · current time or stage               │
│ What changed: 2–3 observations · concise event explanation      │
└───────────────────────────────────────────────────────────────┘
```

Use a single large scene by default. Open paired or aligned baseline/changed views when the comparison is the task; do not permanently halve every scene. Stage sequences, genome zoom, and layer inspection retain their domain-specific layout while sharing the control grammar.

### 2.1 Layout and spacing requirements

- Inherit application tokens: warm workspace and panel surfaces, dark text, restrained teal actions, fine borders, and the existing sans-serif typeface. Scientific object colors are semantic scene colors, not a new application theme.
- Use the established 4/8/12/16/20/24px spacing rhythm. Start with 16–24px panel padding, 8–12px gaps within a decision, and 20–24px between decisions. Measure the rendered result rather than treating these starting values as sufficient evidence.
- Give the scene approximately two-thirds of the available desktop content width; use a readable 300–360px control/inspection column where space permits. Reflow or move optional content at smaller widths before shrinking text or scaling controls.
- Primary text and control labels should normally render at 14–16px; reserve 12px for secondary metadata. Use existing heading hierarchy and tabular numerals for changing values. Keep labels readable at the actual board scale.
- Primary learner actions have at least 44px rendered target height. Keep slider tracks broad and thumbs easy to operate, with exact entry where it makes sense. Check final target sizes after board transforms.
- Align repeated labels, values, tracks, units, and action rows. Avoid arbitrary per-lesson padding, mixed field widths, and duplicated prominent values.
- Keep the question, main scene, primary action, and key feedback visible in the opening view at the primary viewport. On short screens, retain readable content and access through deliberate board navigation; do not hide or overlap actions to claim fit.
- Learner cards do not own internal scrollbars. Bound long histories through a compact summary and an explicit full-history surface. Authoring dialogs may have a deliberate scrolling region with reachable actions.
- Selection, inspection, playback, and changing readouts must not shift the scene or move a control under the pointer. Reserve stable inspection and observation space.
- Avoid nested cards, repeated headings, oversized empty wrappers, and large dashboards. Measure actual SVG/canvas bounds in learner, Build, and Try lesson; mounting an element is insufficient.

### 2.2 Control and interaction contract

| Interaction | Required behavior |
| --- | --- |
| Main action | One dominant action for the current phase: Next stage, Introduce pathogen, Breed offspring, Advance day, or Play. Secondary actions remain visibly available. |
| Playback | Play/Pause, one-step advancement, speed, and current time/stage share predictable placement. Speed changes pacing, not model rules. Static inspection need not acquire a clock. |
| Domain settings | Labels describe the affected condition; value, unit or qualitative scale, bounds, and expected effect are nearby. Show only the current investigation's controls initially. |
| Numeric editing | Reuse validated draft/accepted-value controls without native spinners. Incomplete or invalid text preserves the last accepted state and offers a local correction path. |
| Live versus restart changes | Live settings update accepted state immediately when supported. Seed, initial genome, or scenario changes use explicit Apply and restart wording. Opening setup alone never restarts. |
| Selection | Selected object has an outline/shape cue and a persistent name. Provide a keyboard-accessible object list or equivalent selection route alongside scene picking. |
| Inspection | Explain identity, current state, and the process affecting it. Preserve stable identity through movement and transformations. State when a selected object is replaced or no longer exists. |
| Overlays | Optional labels, paths, arrows, and provenance use consistent toggles with exposed selected state. Essential learning information cannot exist only in a hover tooltip. |
| Reset | Use Restart experiment for model reset and Reset view for camera recovery. Document exactly which initial configuration, observations, memory, and comparison runs are affected. |
| Comparison | Capture a named baseline with configuration, initial state, seed, and stopping criterion. Change one named condition and run to the same time/stage. Make retained versus changed conditions visible. |
| Errors | Preserve the surrounding lesson, last accepted result, and draft where appropriate. Explain the problem and next action; do not show missing output as zero or fabricate success. |

Keyboard focus must be visible. Use native semantics where possible, accessible names that match visible labels, non-color state cues, measured contrast, and reduced motion. Reduced motion retains explanatory stage changes and explicit stepping; it does not remove information.

Camera, workspace, and model controls must have different labels and gesture ownership. Resizing a scene or zooming the board must not alter scientific state.

## 3. Per-simulation implementation and UX contracts

All nine require one complete default lesson and a meaningful alternate scenario. The source concepts define the full first-version content; the controls below describe progressive presentation, not removal of required capabilities.

### SCI-01 — Cell Division

- **Opening:** one interphase cell, an explicit small teaching chromosome set, and Next stage. A readable stage strip includes DNA replication before mitosis; distinguish the cell cycle from mitotic stages.
- **Learner flow:** select chromosome A → advance replication → alignment → separation → inspect both daughter sets. Keep A selected through its copied descendants with clear identity labels.
- **Controls:** stage/playback, chromosome labels, and spindle overlay; separation error belongs in setup with explicit restart.
- **Feedback:** current stage, chromosome count versus DNA amount with stated counting convention, transition explanation, and daughter allocation. Avoid ambiguous counts during anaphase.
- **Model:** trusted stage machine owns replication, spindle attachment, separation, and cytokinesis. Visual interpolation reads accepted stage state.
- **Acceptance:** normal daughters have matching chromosome sets; error scenario reports the actual unequal allocation. Stage navigation and replay cannot duplicate chromosomes. Mitosis is distinct from the meiosis lesson in SCI-03.

### SCI-02 — Immune Defense

- **Opening:** recognizable fictional tissue actors with a compact legend; Introduce pathogen is dominant. State that timing and actor counts are compressed.
- **Learner flow:** expose tissue → inspect encounter/recognition/activation → observe memory → repeat the same exposure under matched challenge conditions.
- **Controls:** exposure/playback, inspect actor, recognition overlay; Repeat exposure is unavailable until its defined preconditions are met, with a nearby reason. Antigen identity and initial burden belong in setup.
- **Feedback:** burden, responding actor types, memory identity, and first/repeat exposure alignment. Separate binding from clearance visually and in events.
- **Model:** bounded actor transitions with antigen-specific recognition, innate containment, adaptive response, and stored memory. Repeat challenge retains memory while restoring documented challenge conditions.
- **Acceptance:** matched memory changes response; unmatched antigen gets no universal bonus. Restart clears memory explicitly. Never imply guaranteed protection or medical prediction.

### SCI-03 — Genome to Organism

- **Opening:** fictional organism, one selected trait, and a zoom breadcrumb from organism through cell/chromosomes/gene/DNA. Introduce the genome as a partial teaching representation.
- **Learner flow:** trace trait → inspect alleles → explore environment-dependent expression → choose parents → form gametes → breed → compare siblings and parental segment provenance.
- **Controls:** contextual zoom/trait controls; separate Inspect traits and Breed offspring task surfaces. Environment, permitted variant edit, parents, recombination, and mutation remain accessible without one giant form.
- **Feedback:** genotype, tissue-specific expression, modeled function, phenotype, and lineage. Keep DNA → RNA → function/trait explanation near the selected gene; account for functional RNA genes.
- **Model:** diploid loci and stable chromosome segments; separate meiosis/gamete/fertilization transitions; seeded crossover and mutation with lineage records. Existing descendants remain immutable when a parent is edited.
- **Acceptance:** every offspring allele has parent provenance or a mutation event; environmental expression changes do not rewrite DNA. Cover simple inheritance, multigene traits, and environment-dependent expression. Dominance describes a trait relationship rather than an inherently stronger allele.

### SCI-04 — Pollination Network

- **Opening:** two fictional flower species and pollinators in a readable patch. Invite the learner to follow a pollinator; Advance day begins progression.
- **Learner flow:** follow visits and pollen origin → inspect compatible transfer → change bloom overlap or patch arrangement → compare delayed fruit development.
- **Controls:** day/playback and follow selection; add/remove patch and bloom timing have visible location/period previews and keyboard alternatives. Pollinator availability is an additional exploration control.
- **Feedback:** visit history, compatible transfer count, flowering availability, fertilization stage, and developing fruit. Overlay the network on the scene rather than substituting a graph.
- **Model:** finite pollen loads and provenance, species compatibility, bloom windows, fertilization, and resource-dependent delayed fruit development.
- **Acceptance:** incompatible pollen never counts as successful transfer; visits do not instantly create fruit. Changed overlap must affect the pathway for an explicit modeled reason.

### SCI-05 — Invasive Species Spread

- **Opening:** a native habitat map with suitability cues and a clearly previewed introduction site. Explain introduction versus establishment before showing spread.
- **Learner flow:** introduce once → advance seasons → inspect provenance → compare immediate versus delayed removal using the same seeded initial habitat.
- **Controls:** introduce, advance season, selected-patch removal, barrier placement, and native restoration. Use a location picker/grid alternative to precision dragging. Initial suitability/range/repeated introductions belong in setup.
- **Feedback:** occupied patches, native cover, treatment effort remaining, surviving propagules, and recolonization source. Distinguish native, established invasive, propagule, unsuitable, and treated states with patterns/labels.
- **Model:** spatial dispersal, suitability-dependent establishment, competition, regeneration, and bounded intervention effort. Barriers affect dispersal separately from suitability.
- **Acceptance:** spread obeys configured rules and provenance; recolonization requires a source. Removal preview states whether residual propagules survive. Explain the scenario's harmful impact rather than equating non-native with invasive.

### SCI-06 — Inside Earth

- **Opening:** large readable cutaway, selected crust, named layers, and an obvious layer inspection/peel control. Include exaggerated crust thickness and schematic-flow notes.
- **Learner flow:** inspect compositional layers → switch to mechanical classification → identify lithosphere/asthenosphere → follow a mantle tracer.
- **Controls:** classification switch, layer selection/peeling, arrows, follow tracer, and playback when tracing. Camera recovery stays separate.
- **Feedback:** material, state, depth band, and relation between classifications. Switching view keeps a sensible selection or announces its mapping.
- **Model:** inspectable layered geometry and prescribed flow field; no implied geodynamic solver or hidden coupling to other lessons.
- **Acceptance:** mantle predominantly solid, outer core liquid, inner core solid; lithosphere includes crust and uppermost mantle. Layer selection works by keyboard; transparency and arrows cannot obscure labels.

### SCI-07 — Plate Boundaries

- **Opening:** a named boundary preset with synchronized surface and cross-section; motion arrows explain plate directions and geological timescale.
- **Learner flow:** advance one scenario → inspect resulting features → compare continental collision with subduction; then explore divergence and transform motion.
- **Controls:** familiar scenario names, relative motion, geological step/playback, cross-section visibility, and feature selection. Applying a preset explicitly restarts its geometry.
- **Feedback:** boundary type, plate types, elapsed model time, named features, and formation events. Arrows remain meaningful when plate orientation changes.
- **Model:** scenario-specific kinematics and feature stages; both views derive from one snapshot.
- **Acceptance:** all five source presets work. Collision/transform do not acquire a generic slab or volcanic arc. Lithospheric plates are represented consistently; no hazard forecasting claim.

### SCI-08 — Volcano's Life Cycle

- **Opening:** reservoir/conduit/vent cutaway with an effusive teaching preset. Main action starts the activity; a quiet preset chooser offers explosive comparison.
- **Learner flow:** inspect reservoir → advance supply/storage/outflow → observe deposits → compare explosive pathways and reduced activity.
- **Controls:** preset, bounded magma supply, playback/step, surface/cutaway switch; qualitative viscosity, gas, and conduit conditions in setup.
- **Feedback:** activity state, reservoir trend, material pathways, deposit accumulation, and event explanation. Simplified pressure indicators are labeled as model indicators.
- **Model:** explicit reservoir supply/outflow budget and preset-specific transitions. Lava/ash/deposits render recorded events, never independent visual spawning.
- **Acceptance:** outflow cannot exceed available magma; both presets have distinct explained outcomes. Changing the camera does not restart activity. No universal schedule, eruption threshold, or real-world forecast.

### SCI-09 — Water Cycle

- **Opening:** populated watershed with recognizable atmosphere, vegetation, soil, groundwater, river, and outlet. Explain whether the teaching system is open or closed.
- **Learner flow:** follow one tracer → apply matched rainfall → compare vegetation with increased paving → explain changed runoff, infiltration, and groundwater pathways.
- **Controls:** precipitation and surface cover are the opening decision; sunlight, vegetation, soil permeability, and paved extent remain available in a focused conditions surface. Show how surface-cover fractions remain valid.
- **Feedback:** a few key stores/flows near the scene, optional full budget, labeled transfers, and tracer history. A tracer is illustrative, not the authoritative volume.
- **Model:** finite nonnegative stores and capped transfers for evaporation, transpiration, condensation, precipitation, infiltration, percolation, runoff, and discharge; explicit open-system boundary accounting.
- **Acceptance:** initial water plus inputs minus outputs equals final stored water within a declared numerical tolerance at every step. Paving affects configured pathways under identical rainfall. Clouds show condensed droplets/ice; groundwater occupies pores/fractures; no mandatory identical loop for every drop.

## 4. Architecture and file plan

Reuse the existing recipe/document loader, catalog, command validation, model registration, shared board, controls, inspection, and persistence. Audit current contracts before creating new primitives. Similar visuals are not evidence that an existing model supplies the required science.

| Boundary | Implementation responsibility |
| --- | --- |
| Typed configuration/state | Versioned schemas, explicit defaults, bounds, units, stable IDs, seed, provenance, and reset behavior. |
| Trusted systems | Pure transitions/calculations; stages, budgets, actor/spatial events, atomic validation, and accepted outputs. |
| Runtime integration | Register domain contributions and providers through existing assembly APIs. Support more than one independent instance without shared singleton state. |
| Presentation | SVG/2D for cells, tissue, genomes, patches, and watershed; use 3D only where cutaway inspection improves the task. Reliable picking and readable labels take precedence over effects. |
| Shared controls/displays | Reusable playback/stage actions, bound settings, inspector, event summary, and comparison controls where contracts match. Inputs, scene, and observations remain separate nodes. |
| Public authoring catalog | Data-only supported configuration/actions/outputs, connection constraints, scientific assumptions, and meaningful descriptions. |
| Premades | One complete authoritative `recipe.json` per lesson with explicit nodes, connections, metadata, learning copy, defaults, and board placement. |
| AI composition | Laya selects catalog-supported capabilities; Apertus supplies supported structured arguments through the existing pipeline. Neither invents executable science nor steps the simulation. |
| Persistence | Save/reopen/remix preserve configuration, IDs, connection remapping, and authored presentation. Explicitly distinguish saved setup from an exported runtime checkpoint if checkpoints are supported. |

Proposed locations, to confirm against actual registration APIs during implementation:

- `src/web/src/simulations/domains/biology/`, `genetics/`, and `earth-science/`; extend existing `ecology/` for pollination and invasive spread where appropriate.
- `src/web/src/simulations/components/systems/<domain>/` for model owners and `components/visuals/<domain>/` for scene adapters.
- `src/web/src/simulations/components/controls/` and `components/views/` for shared interaction/presentation patterns; scope styles and use explicit variants.
- `src/web/src/simulations/pre-made/{cell-division,immune-defense,genome-to-organism,pollination-network,invasive-species,inside-earth,plate-boundaries,volcano-life-cycle,water-cycle}/recipe.json`.
- `src/web/scripts/domains/science/{cases,verify,browser,live,replay}.cjs` for the new acceptance harness.
- `docs/agent-only/implementation/023-validation/` for durable local evidence, with raw artifacts ignored deliberately and a reviewable Markdown evidence report linked here.

The science harness files and their commands **do not exist yet**. Implement them before invoking the planned commands below. The existing `test:generation:realistic:live` runner covers five other prompts and restricts evidence to `019-validation`; it cannot establish coverage of these nine. Reuse its transport observation, trace handling, and validation patterns without relabeling its results.

Do not create route-specific runtimes or loaders that inject missing lesson content, or a monolithic uneditable lesson panel. Earth lessons may share assets and terminology but run independently unless an explicit later recipe declares a coupling. Preserve unrelated working-tree changes and protected Gas behavior.

## 5. Implementation sequence and gates

1. **Inventory:** read current registration, catalog, JSON recipe, board, validation, and provider contracts. Record the audience, outcome task, default state, important alternate states, and simplifications for every SCI ID.
2. **Shared interaction prototype:** implement one stage lesson (Cell Division) and one spatial lesson (Water Cycle) with real models. Review playback, inspector, observations, spacing, and comparison. Fix shared components before multiplying a weak pattern across nine lessons.
3. **Model gate:** add the meaningful invariants from section 3, deterministic replay, atomic rejected-action tests, and independent-instance checks. Keep rendering out of scientific calculations.
4. **Lesson batches:** complete biology/genetics, ecology, then Earth science. For each lesson author the complete ordinary recipe, catalog contract, and first-use flow; immediately review it in the running app.
5. **Authoring gate:** enter Remix → inspect independent nodes/connections → edit a supported value → save/export and reopen → Try lesson → operate the result. Verify undo where applicable and no duplicated instances.
6. **Live generation gate:** run the actual required-Laya/Apertus pipeline for all nine with section 6 evidence. Inspect the actual accepted generated composition and its layout, not only the curated premade.
7. **Desktop UX loop:** execute section 7 until every essential task passes and every blocking/major finding is resolved. Recheck related lessons after a shared control or stylesheet change.
8. **Completion gate:** record final artifact paths, checks, screenshots, findings, scientific boundaries, and remaining testing gaps. Update the refinement tracker only for lessons that passed.

## 6. Actual Apertus and Laya: commands and proof

Run these from the repository root. Check whether the intended services already exist; reuse healthy services rather than stopping unrelated sessions. Install missing local environments through the existing inference setup targets when necessary; record download/setup requirements if unavailable.

### 6.1 Start and check actual services

In separate terminals, only for services that are absent:

```sh
make run-apertus
make run-laya
```

Check actual readiness and a real Apertus completion:

```sh
make -C src/inference smoke
make -C src/inference smoke-laya
```

Record the reported Apertus and Laya model identities, runtime, endpoint, and successful inference evidence without exposing credentials. A readiness response alone does not prove that generation used either model.

Start an isolated validation web server:

```sh
APERTUS_BROWSER_TEST_DIR=.next-science-validation \
COMPOSITION_DECISION_POLICY=required-laya \
PLANNER_MODE=hybrid DECISION_PROVIDER=laya LLM_PROVIDER=apertus \
APERTUS_PROVIDER=local APERTUS_LOCAL_RUNTIME=mlx \
APERTUS_LOCAL_BASE_URL=http://127.0.0.1:43101/v1 \
APERTUS_LOCAL_MODEL=m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4 \
LAYA_BASE_URL=http://127.0.0.1:43102 \
DECISION_TIMEOUT_MS=20000 APERTUS_MAX_TOKENS=1536 \
PLANNER_DIAGNOSTICS=true NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS=true \
pnpm --dir src/web dev --hostname 127.0.0.1 --port 43110
```

These diagnostics are validation-only. Explicitly record any runtime/model/port substitution. Freeze code, catalog, provider settings, and styles throughout each acceptance batch; hot reload or a mid-batch fix invalidates it as a final batch.

### 6.2 Live harness requirements

Implement `live.cjs` with three complete serial rounds of all nine prompts: **27 fresh generations** per final frozen batch. This is a practical repeatability check, not a guarantee of future model success. Include one natural request per concept and retain prompt text; add paraphrase/modified-condition cases during development to expose brittle routing.

For each attempt record request ID, timestamps, prompt, revision/source fingerprint, non-secret provider configuration, actual provider/model receipts, Laya decisions, Apertus calls and repairs, accepted recipe, validation result, failures, and artifact locations. Require actual Laya inference and Apertus inference on the admitted composition path. A template lookup with no model calls, fixture, cached response, transport mock, or replay is separate coverage and cannot satisfy this gate.

The harness must fail when provider proof is missing, a fallback replaces the required provider, unsupported definitions appear, accepted composition lacks required interactions, or the resulting recipe cannot run. Capture bounded failures and recovery; retain unsuccessful attempts rather than silently retrying until only successes remain.

Suggested natural requests, to author as real test cases:

| SCI ID | Generation request |
| --- | --- |
| SCI-01 | Show how one cell copies its chromosomes and divides into two cells. Let me follow a chromosome through the stages. |
| SCI-02 | Help me see how immune cells react the first time and the next time the same fictional pathogen appears. |
| SCI-03 | Make a fictional organism genetics lesson where I can trace traits to genes, change the environment, and compare offspring from two parents. |
| SCI-04 | Show how pollinators carry pollen between flowers and what happens when their flowering periods stop overlapping. |
| SCI-05 | Let me introduce an invasive plant into a habitat and compare removing it early with removing it several seasons later. |
| SCI-06 | Let me inspect Earth's layers, compare compositional and mechanical layers, and follow a mantle tracer. |
| SCI-07 | Help me compare plate boundaries using a surface view and cross-section, including collision and subduction. |
| SCI-08 | Show a volcano cutaway where I can compare effusive and explosive activity and inspect magma and deposits. |
| SCI-09 | Show water moving through a watershed and let me compare vegetation with pavement during the same rainfall. |

Save accepted exports before replay. Use replay to inspect deterministic behavior, alternate viewports, and motion preferences without pretending it is another generation. Preserve the actual generated layout; a hand-arranged replay cannot pass as the original composition.

## 7. Desktop Playwright MCP review and improvement loop

**Required evidence:** inspect the running app and capture screenshots through Playwright MCP. Scripted Playwright checks supplement this review; they do not substitute for the requested MCP screenshots. At plan-writing time, no Playwright MCP tool is exposed in this session and no screenshots have been captured. During implementation, discover the actual available MCP tools and use their real schemas. If unavailable, continue independent model/implementation work, mark MCP-dependent gates Not tested, and report the missing capability; do not claim MCP verification.

### 7.1 One review iteration

1. Open the real learner route at 1440×900. Before consulting implementation details, record what the title, scene, control hierarchy, and labels communicate. Use the outcome task in section 7.2, without supplying a click sequence.
2. Capture the opening viewport through MCP. Inspect the image: visual hierarchy, spacing rhythm, alignment, scene size, readable labels, discoverable controls, clear values/units, quiet navigation, and unnecessary chrome.
3. Operate the main control and select an object. Capture the changed/selected state and note the actual model transition, visual effect, readouts, and explanation. Exercise pause/step/speed where applicable.
4. Run the meaningful alternate condition or matched comparison. Capture the outcome and inspect whether a learner can explain its cause from the scene. Confirm the baseline and changed runs use the declared initial state, seed, and horizon.
5. Exercise relevant invalid input, incomplete draft, unavailable action, reset, selection loss, setup cancellation, and provider-error recovery. Capture the most consequential recovery state. Inspect focus behavior and accepted-state agreement.
6. Complete the task with keyboard input, including object selection and dialogs. Capture visible focus. Repeat relevant transitions with reduced motion.
7. Enter Remix, inspect and edit independent components, save/export/reopen, and launch **Try lesson using the builder button**. Capture both builder and resulting lesson; measure visible geometry and operate the modified experiment.
8. Repeat layout/primary-task checks at 1280×800, 1920×1080, and the short viewport. Check 200% zoom for reachable controls and legible reflow; include captures of any layout concern.
9. Inspect accepted live-generated compositions from section 6 using the same criteria. A polished curated recipe does not prove generated layouts are usable.
10. Record each finding using guide 004. Fix the root cause in shared controls, host sizing, authored layout, labels, or interaction behavior; do not conceal it with an unrelated instruction or screenshot-only patch.
11. Rerun affected model/contract checks and the exact failed browser scenario. Capture the repaired state in a new iteration directory; retain the old evidence. Inspect the new screenshot rather than assuming the code change worked.
12. Continue while any blocking/major failure or essential-task concern remains. After a shared fix, compare all nine visually and behaviorally. Run a fresh complete live batch after any change that affects generation or final accepted layout.

### 7.2 Outcome-only review tasks

| Simulation | Task and expected observable outcome |
| --- | --- |
| Cell Division | Follow one chromosome into the daughter cells and explain which process distributes its copies; matching daughter sets and provenance are visible. |
| Immune Defense | Explain why a repeated matching exposure behaves differently; identity-specific memory and response timing are inspectable. |
| Genome to Organism | Explain why siblings have different markings and why environment can alter expression; parental segments and unchanged inherited DNA are visible. |
| Pollination Network | Determine what changes when bloom periods stop overlapping; compatible transfers and later fruit development show the modeled consequence. |
| Invasive Species | Compare early and delayed removal; establishment/spread and explicit recolonization sources explain the difference. |
| Inside Earth | Explain why lithosphere includes more than crust; both classifications and material states support the answer. |
| Plate Boundaries | Determine which convergence scenario forms a slab and volcanic arc; synchronized views distinguish it from continental collision. |
| Volcano | Compare where material goes in the two presets; reservoir changes and actual deposits explain the difference. |
| Water Cycle | Determine where water goes after paving under the same rainfall; pathways and the budget support the comparison. |

### 7.3 Evidence and stopping rule

Organize evidence as `023-validation/<batch>/iteration-<n>/<SCI-ID>/<host>/<viewport>/`. Use descriptive files such as `opening.png`, `selected.png`, `changed.png`, `comparison.png`, `invalid-recovery.png`, `keyboard-focus.png`, `builder.png`, and `try-lesson.png`. Mark inapplicable states explicitly. Record whether each image came from MCP or the scripted harness.

For every capture include route, recipe/export identity, seed, time/stage, viewport, browser version, motion preference, source fingerprint, and reproduction steps. Keep a manifest linking screenshots to findings and fixes. Screenshots establish appearance; interaction assertions establish behavior; neither establishes first-time human understanding.

The acceptance ledger has one row per SCI ID and criterion, using Pass/Concern/Fail/Not tested. **Do not average scores across lessons.** Each lesson must pass opening clarity, control operation, visible cause/effect, spacing/consistency, inspection, recovery, desktop fit, keyboard/reduced motion, remix/reopen/Try lesson, model invariants, and required live-provider proof.

Stop only when all nine meet those gates, no blocking or major finding remains, and essential-task concerns have been fixed and rechecked. Resolve minor findings or explicitly describe their limited impact. Missing required evidence prevents completion. Human participant testing remains a separately stated gap if unavailable; an agent cannot promise that a user will never be dissatisfied.

If repeated changes do not resolve a problem, revise the interaction/layout design instead of repeating blind tests. If an external dependency prevents progress, retain all useful work and report the exact blocked gate honestly.

## 8. Command loop for the implementation agent

Existing commands below are runnable today; science-specific commands require section 4's harness to be implemented first. Execute from the repository root.

After model/recipe changes, perform focused verification:

```sh
pnpm --dir src/web recipes:generate
node src/web/scripts/domains/science/verify.cjs
pnpm --dir src/web test:recipes
pnpm --dir src/web test:public-catalog
pnpm --dir src/web exec tsc --noEmit
```

Run scoped Biome from `src/web` with the actual changed source/script paths, and fix failures. Do not use an invented placeholder path as a command.

Against the isolated running server, run the planned browser and live harnesses:

```sh
UX_TEST_URL=http://127.0.0.1:43110 \
node src/web/scripts/domains/science/browser.cjs

UX_TEST_URL=http://127.0.0.1:43110 GENERATION_RUNS=3 \
node src/web/scripts/domains/science/live.cjs
```

The live harness prints the newly created batch directory. Replay that specific directory using the proposed harness's documented argument:

```sh
UX_TEST_URL=http://127.0.0.1:43110 \
node src/web/scripts/domains/science/replay.cjs \
  --batch docs/agent-only/implementation/023-validation/ACTUAL-BATCH-DIRECTORY
```

Replace `ACTUAL-BATCH-DIRECTORY` with the emitted path. Each harness must return nonzero on a required failure, preserve artifacts, and emit a criterion-level result. The browser harness includes all nine, configured viewports, relevant recovery, scientific state assertions, and authoring round trips.

Use this decision loop rather than an unconditional command retry:

```text
Implement or fix one diagnosed issue
  → run affected scientific/contract checks
  → exercise the affected running desktop flow
  → capture and inspect Playwright MCP screenshots
  → record appearance, behavior, findings, and remaining gaps
  → unresolved issue? fix its cause and repeat the affected checks
  → all nine locally pass? freeze sources and run the full live batch
  → inspect accepted exports, replay, and generated layouts
  → live or UX failure? retain batch, diagnose, fix, run a new full batch
  → all required gates pass? finish broader regressions and evidence report
```

After focused gates pass, run broader verification once on the final candidate:

```sh
pnpm --dir src/web test
pnpm --dir src/web test:gas-recipe
APERTUS_BROWSER_TEST_DIR=.next-science-build \
pnpm --dir src/web exec next build --webpack
```

Run existing browser regressions for affected shared controls/board/generation hosts with `UX_TEST_URL` set to the validation server. An unrelated historical failure must be reproduced and documented; never call a failed suite green. Broaden or repeat testing when changes or unresolved concerns justify it.

## 9. Definition of done and report

Checked items reflect verified implementation. Combined UX, zoom, real-provider, and MCP gates stay open where evidence is incomplete.

- [x] All nine populated, scientifically bounded lessons are ordinary editable JSON recipes.
- [x] Their trusted models pass core invariants, seeded replay where applicable, reset, invalid-action, and independent-instance checks.
- [ ] Consistent controls, spacing, typography, values, labels, inspection, and states work in learner and builder hosts.
- [x] Every desktop outcome task is independently operable in agent review, with visible and explainable consequences.
- [ ] Keyboard, reduced motion, short viewport, and zoom retain access to essential content.
- [x] Save/export/reopen/remix/Try lesson preserve authored composition and supported behavior.
- [ ] A final frozen 27-attempt batch records actual Apertus and Laya use, all failures/repairs, accepted exports, and per-lesson results.
- [ ] Playwright MCP screenshots have been opened, analyzed, linked to findings, and recaptured after fixes.
- [ ] All required criteria pass per lesson, with no unresolved blocking/major findings or missing mandatory evidence.
- [ ] A cross-lesson consistency review and affected shared-component regressions pass.
- [x] Final checks, scientific assumptions, minor issues, and testing limits are recorded honestly in [the current evidence section](#current-implementation-and-evidence).

The final report leads with what was delivered and the remaining limitations, links to the evidence manifest and screenshots, summarizes actual live-provider results and UX corrections, and gives rerun commands. Do not replace evidence with “looks good,” “intuitive,” or a promise of user satisfaction.


<a id="current-implementation-and-evidence"></a>

## 10. Current implementation and evidence

This iteration addresses the code review of `learnerPresentation.ts` and the missing investigation controls. Implementation and deterministic checks pass. User acceptance and reliable real-model generation remain separate gates.

### Changes

- Removed the hardcoded `learnerQuestions` map. A science appearance has an editable `question` configuration field, limited to 180 characters. Without an override, it displays the recipe's lesson instruction. The planner is instructed to author a question specific to the requested investigation. Saving, reopening, Remix, and Try lesson preserve it.
- Kept model-state captions in trusted code. These describe accepted scientific states; they do not match or interpret the learner's wording. Fixed educational narration and arbitrary prompt understanding serve different purposes.
- Restored condition controls for all nine lessons. A task button opens a native dialog with one condition editor at a time, precise numeric entry where applicable, and explicit restart actions. Optional authored `fields` restrict the dialog to the conditions needed for a lesson. Every action follows declared command bindings.
- Added restart-with-current-conditions as a model command. Authored reset still restores authored conditions and clears retained results. Baseline comparisons preserve their snapshots, show both accepted scenes, and flag unequal seeds/time, multiple changed conditions, and differing antigen-specific memory. Matching time/seed alone is not a claim that all histories are scientifically equivalent.
- Implemented distinct observation, inspection, and comparison panel configurations. Interactive scene objects now inspect the trusted model in all nine scenes; baseline scenes remain read-only.
- Broadened science discovery vocabulary and added 27 varied prompts plus unrelated negative cases. These are retrieval tests, not proof of successful AI composition. No full-prompt lookup, confidence bypass, or silent template substitution was introduced.
- Corrected live browser checks to compare an inspector's output text rather than its entire card. An untouched accepted immune recipe was replayed successfully against the trusted runtime after this correction.
- Replaced the live harness's source fingerprint. The old command resolved `src/web` relative to a caller already inside `src/web`, producing the SHA-256 of empty input. It did **not** prove a frozen batch. The replacement resolves the repository root explicitly and hashes tracked and untracked nonignored web file contents, including staged edits and deletions. It checks before and after every attempt and stops if sources change. Regression checks exercise each of those cases.

### Verified

| Check | Result | Evidence |
| --- | --- | --- |
| Full repository web test suite | Pass | `pnpm --dir src/web test`; includes protected historical markup, Gas, contracts, and science checks |
| TypeScript | Pass | `pnpm --dir src/web exec tsc --noEmit` |
| Production build | Pass | `.next-science-audit`; `next build --webpack` |
| Authored questions, capture/reopen, fallback, configured panels, baseline isolation | Pass | `scripts/domains/science/verify-presentation.cjs` |
| Varied vocabulary retrieval | 27/27 pass | With and without inferred intent; unrelated cases exclude science |
| Production opening, keyboard/dialog focus, four desktop sizes, Remix and Try lesson | 9/9 pass | [Browser report](023-validation/improvements-production-browser-final/report.json) |
| Production scientific outcomes through learner controls | 9/9 pass | [Outcome report](023-validation/improvements-production-outcomes/report.json) |
| Real Apertus/Laya varied wording | 8/27 end-to-end pass; 9/27 API accepted; focused water follow-up 1/1 pass | [Report](023-validation/improvements-paraphrases-2/report.json), [frozen-source receipt](023-validation/improvements-paraphrases-2/completion.json) |

The outcome tasks include chromosome separation errors, matched/unmatched immune memory, parental provenance and mutation/environment, shorter bloom overlap, removal/barriers/restoration, mechanical Earth layers and mantle tracer, all five plate boundaries, effusive/explosive deposits, and matched paving/rainfall comparisons. Numeric invalid drafts preserve the accepted state; multiple changed conditions produce a warning.

Screenshots of all nine opening scenes were visually inspected in this iteration. The comparison dialog intentionally scrolls to show its full evidence; opening learner cards do not require internal scrolling. Automated geometry checks are not user acceptance.

### Real-model wording results

The `generated-*.png` screenshots show **separate AI-generated recipes imported for validation**, not replacements for the authored premades. For example, `improvements-water-inspection-replay/` uses the generated question “How does water move from clouds to soil and groundwater?” with two sliders and three output cards. The authored Water Cycle keeps its large scene, “Compare watersheds” dialog, and “Follow the water” action. Generated layouts can still be more cluttered; functional passes do not establish design acceptance.


The complete varied-wording batch recorded **27 fresh attempts: 8 end-to-end passes and 19 failures**. Nine API requests produced accepted recipes. Sixteen failed the required-Laya selection gate; two failed Apertus argument validation (one control label and one oversized intent-concepts list). The ninth accepted recipe failed browser inspection because the water scene lacked selectable objects.

That browser failure exposed a real UI defect, not a reason to relax the harness. Water now has keyboard/click targets for the cloud, surface water, soil moisture, groundwater, river, and tracer, bound to their actual model identities. A regression check requires an interactive object in every science scene and no interactive objects in read-only comparison scenes. The full batch report is retained unchanged; a later replay does not turn an earlier failure into a fresh successful inference.

| Lesson | API accepted | Initial generation + browser pass |
| --- | --- | --- |
| cell-division | 0/3 | 0/3 |
| immune-defense | 2/3 | 2/3 |
| genome-to-organism | 1/3 | 1/3 |
| pollination-network | 2/3 | 2/3 |
| invasive-species | 1/3 | 1/3 |
| inside-earth | 1/3 | 1/3 |
| plate-boundaries | 0/3 | 0/3 |
| volcano-life-cycle | 1/3 | 1/3 |
| water-cycle | 1/3 | 0/3 |

The batch started and ended with fingerprint `6cd9741d808645180ff834d7b8fcc733224117860d75188f151b8f13ba9550e5`. It predates the final water inspection correction. Provider selection and argument failures remain unresolved; this does not meet the original live acceptance requirement.

After the water correction, [one fresh real-provider request](023-validation/improvements-water-followup/report.json) for `water-cycle-paraphrase-3` passed generation, stepping, trusted-output agreement, keyboard inspection, and the alternate viewport check. Its [completion receipt](023-validation/improvements-water-followup/completion.json) proves unchanged sources for that focused run. This is an additional 1/1 check, not a replacement 27-attempt batch or a repair of the unresolved selection/argument failures.

The eight passing accepted exports were [replayed unchanged in both motion preferences](023-validation/replay-1791612668989/report.json): 16/16 checks passed. The original accepted water export that exposed the defect also [replayed successfully in both preferences](023-validation/improvements-water-inspection-replay/report.json) after the correction. These are browser replays, not additional inference attempts.

### Remaining acceptance limits

The real-model batch exercises the unchanged required-Laya gate and actual local Apertus composition. Accepted exports receive browser state/output/inspection smoke checks. Those smoke checks do not prove that generated controls fully support every requested learning goal. Earlier accepted generated lessons still used more generic controls and observation panels than the curated lessons.

The wording failures in the complete batch include Laya rejection of supported topics and invalid Apertus labels or intent arguments. Retrieval success cannot fix those later stages by itself. They must remain visible in the report rather than being counted as successful generation.

Historical batches remain available, but their empty fingerprints cannot establish source stability. `improvements-paraphrases-1` was stopped while incomplete and cannot be used as final acceptance evidence. Historical raw responses and model receipts still record actual attempts.

Standalone Playwright is used. Playwright MCP, actual 200% browser zoom, dedicated mobile polish, and user UX acceptance remain unverified. The original requirement for three complete fresh rounds across all nine canonical prompts is not satisfied by one varied-wording batch.

### Repeat

From `src/web`, with the actual local services and required-Laya development server running:

```sh
pnpm test:science
pnpm test
pnpm exec tsc --noEmit
UX_TEST_URL=http://127.0.0.1:43112 SCIENCE_EVIDENCE_DIR=../../docs/agent-only/implementation/023-validation/<new-browser-directory> node scripts/domains/science/redesign-browser.cjs
UX_TEST_URL=http://127.0.0.1:43112 SCIENCE_TASK_EVIDENCE_DIR=../../docs/agent-only/implementation/023-validation/<new-outcome-directory> pnpm test:science:tasks
UX_TEST_URL=http://127.0.0.1:43113 GENERATION_EVIDENCE_DIR=../../docs/agent-only/implementation/023-validation/<new-frozen-directory> pnpm test:science:paraphrases:live
```

Keep application and harness sources unchanged throughout a live batch. Evidence directories are ignored by Git; the scripts and this record are repeatable, but raw local receipts/screenshots must be retained separately for sharing.


<a id="current-screenshot-review"></a>

## 11. Current screenshot review

User UX acceptance remains pending. Open [the current production review app](http://127.0.0.1:43112/experiments).


| Lesson | Production opening | Scientific outcome |
| --- | --- | --- |
| Cell division | [Opening](023-validation/improvements-production-browser-final/cell-division-opening-1440x900.png) | [Separation error](023-validation/improvements-production-outcomes/cell-division-unequal-daughters.png) |
| Immune defense | [Opening](023-validation/improvements-production-browser-final/immune-defense-opening-1440x900.png) | [Memory comparison](023-validation/improvements-production-outcomes/immune-defense-matched-memory.png) |
| Genome to organism | [Opening](023-validation/improvements-production-browser-final/genome-to-organism-opening-1440x900.png) | [Inheritance](023-validation/improvements-production-outcomes/genome-to-organism-chromosome-provenance.png) |
| Pollination network | [Opening](023-validation/improvements-production-browser-final/pollination-network-opening-1440x900.png) | [Bloom comparison](023-validation/improvements-production-outcomes/pollination-network-bloom-comparison.png) |
| Invasive species | [Opening](023-validation/improvements-production-browser-final/invasive-species-opening-1440x900.png) | [Control and restoration](023-validation/improvements-production-outcomes/invasive-species-control-and-restoration.png) |
| Inside Earth | [Opening](023-validation/improvements-production-browser-final/inside-earth-opening-1440x900.png) | [Layers and tracer](023-validation/improvements-production-outcomes/inside-earth-mechanical-layers-and-tracer.png) |
| Plate boundaries | [Opening](023-validation/improvements-production-browser-final/plate-boundaries-opening-1440x900.png) | [Alternate boundary](023-validation/improvements-production-outcomes/plate-boundaries-boundary-4.png) |
| Volcano life cycle | [Opening](023-validation/improvements-production-browser-final/volcano-life-cycle-opening-1440x900.png) | [Eruption comparison](023-validation/improvements-production-outcomes/volcano-life-cycle-eruption-comparison.png) |
| Water cycle | [Opening](023-validation/improvements-production-browser-final/water-cycle-opening-1440x900.png) | [Matched paving comparison](023-validation/improvements-production-outcomes/water-cycle-matched-paving-comparison.png) |


<a id="historical-implementation-evidence"></a>

## 12. Historical implementation evidence

This record describes an earlier iteration. Its status, ports, commands, and screenshots are historical; use the current implementation section for the latest results.

<details>
<summary>Earlier notes and evidence</summary>

Implementation date: 2026-10-10. See [the implementation plan](023-NINE-SCIENCE-SIMULATIONS.md) and [screenshot review](#current-screenshot-review).

### What is implemented

Nine independent, editable, ordinary JSON recipes now use the shared catalog, runtime, spatial board, and builder. Scenes, conditions, playback, inspection, and observations are separate components with explicit bindings. The protected Gas implementation is unchanged.

| Lesson | Route | Main scientific feedback |
| --- | --- | --- |
| Cell division | `/experiments?experiment=cell-division` | Stable chromosome identity, DNA versus chromosome counts, normal/error daughter allocation |
| Immune defense | `/experiments?experiment=immune-defense` | Innate/adaptive timing, antigen identity, binding versus clearance, matching/unmatched memory |
| Genome to organism | `/experiments?experiment=genome-to-organism` | Three diploid loci, parental homolog provenance, crossover, explicit germline mutation, environment-dependent expression |
| Pollination network | `/experiments?experiment=pollination-network` | Flowering windows, finite donor pollen, compatible transfer, delayed fertilization/fruit |
| Invasive species | `/experiments?experiment=invasive-species` | 24 inspectable patches, recorded propagule sources, barriers, removal policy, restoration, finite effort |
| Inside Earth | `/experiments?experiment=inside-earth` | Compositional/mechanical layers, solid mantle, liquid outer core, prescribed mantle tracer |
| Plate boundaries | `/experiments?experiment=plate-boundaries` | Five presets, coordinated surface/cross-section, appropriate slab/arc/ridge/mountain/offset features |
| Volcano life cycle | `/experiments?experiment=volcano-life-cycle` | Effusive/explosive presets, finite magma reservoir and supply/outflow accounting |
| Water cycle | `/experiments?experiment=water-cycle` | Surface/soil/groundwater/atmosphere/channel stores, active tracer paths, open watershed budget |

### UX decisions and refinements

- One visible learning question, a large scene, a small conditions panel, consistent playback, selected-object inspection, and causal observations.
- Shared spacing and warm colors; explicit selection outlines, keyboard object selectors, visible focus, and generous control targets measured at desktop board scale.
- Precise numeric entry and sliders share accepted values. Incomplete numeric drafts preserve the model and offer Escape recovery. No native number spinners.
- Advanced conditions use a native modal instead of expanding a learner card into the floating workspace controls. Restart settings have an explicit Apply and restart action.
- Retained baselines keep an isolated state, settings, seed, metrics, and horizon. The comparison dialog displays both scenes and marks unequal horizons and changed conditions.
- Reduced motion preserves explicit stepping. Playback is unavailable under reduced motion; the shared host owns animation.
- Inspections name objects and explain their state and cause. Genome parent edits preserve existing descendants; flower appearance reflects bloom availability.
- Scene host sizing, desktop layout, action labels, output schemas, discovery vocabulary, and accepted generic-control values were corrected during review.

### Verification status

Final results are being consolidated here. Raw evidence is intentionally ignored by Git under `023-validation/`; it remains available locally for review. Test scripts are tracked and repeatable.

**Playwright MCP: not tested.** This session exposes no Playwright MCP tools. Screenshots and browser checks use the installed standalone Playwright package. They do not satisfy or impersonate the explicitly requested MCP gate.

### Repeatable commands

From the repository root:

```sh
pnpm --dir src/web test:science
pnpm --dir src/web test
pnpm --dir src/web exec tsc --noEmit
APERTUS_BROWSER_TEST_DIR=.next-science-build pnpm --dir src/web exec next build --webpack

UX_TEST_URL=http://127.0.0.1:43111 \
SCIENCE_EVIDENCE_DIR=docs/agent-only/implementation/023-validation/desktop-<new-iteration> \
pnpm --dir src/web test:science:browser

UX_TEST_URL=http://127.0.0.1:43111 \
SCIENCE_TASK_EVIDENCE_DIR=docs/agent-only/implementation/023-validation/outcomes-<new-iteration> \
pnpm --dir src/web test:science:tasks

UX_TEST_URL=http://127.0.0.1:43110 GENERATION_RUNS=3 \
GENERATION_EVIDENCE_DIR=docs/agent-only/implementation/023-validation/live-<new-frozen-batch> \
pnpm --dir src/web test:science:live

UX_TEST_URL=http://127.0.0.1:43111 \
pnpm --dir src/web test:science:replay --batch \
docs/agent-only/implementation/023-validation/live-<accepted-batch>
```

Use the actual local services and the server environment specified in plan section 6.1. The actual model IDs used here are `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` and `aac6fef/laya-multilingual-mlx`.

Keep planner diagnostics on the local development server. Production intentionally returns 404 for `/api/planner-diagnostics`, even with the environment flag enabled. The production attempt in `live-final-1` was retained and stopped because its provider receipts could not be read; it cannot pass the proof-of-provider gate. The final live batch uses port 43110, while production screenshot review uses 43111.

### Review loop

1. Keep both actual model services running; freeze application and test sources for a complete live batch.
2. Run model/recipe regression checks and a production build.
3. Capture and inspect all nine opening/changed states at 1440×900, 1280×800, 1920×1080, and 1366×768. Check target sizes, overflow, scrolling, and floating-tool collisions.
4. Exercise invalid drafts, selection, setup/Escape, baseline/reset, keyboard, reduced motion, export/reopen, Remix, and the actual Try lesson button.
5. Run the scientific outcome tasks and inspect alternate-state screenshots.
6. Run three complete rounds of fresh real-provider generation, preserving every attempt, response, diagnostic trace, accepted recipe, browser trace, and screenshot. Missing provider proof or unusable required controls fails an attempt.
7. Replay untouched accepted exports at alternate viewports and motion preferences; replay is not fresh model inference.
8. Fix blocking findings in the model, shared host, declared control metadata, or authored layout. Retain old evidence. Repeat affected checks and run a fresh complete live batch after any generation/layout change.
9. Run Playwright MCP review when that capability is available. Keep that gate pending until real MCP captures exist.

### Scientific limits

These are bounded educational models, with visible assumptions rather than real-world predictions. The genome is fictional and partial; sequences are illustrative. Earth flow and plate motion are prescribed schematic kinematics. Immune timing and actor counts are compressed. Volcano behavior is not a hazard forecast. The tracer represents an illustrative path and does not replace the watershed volume budget. Model receipts and successful repeated prompts do not guarantee success on every future prompt.

</details>


<a id="historical-redesign-round-1"></a>

## 13. Historical redesign round 1

This record describes an earlier iteration. Its status, ports, commands, and screenshots are historical; use the current implementation section for the latest results.

<details>
<summary>Earlier notes and evidence</summary>

Date: 2026-10-10
Status: implemented first design round; awaiting the user’s opinion before a second round.
Requirement: [IMPORTANT](IMPORTANT.md).

Open the [local review app](http://127.0.0.1:43111/experiments). The screenshots below show the actual production app at 1440×900, with normal motion preferences. They are unmodified captures from standalone Playwright. **Playwright MCP was unavailable; no MCP verification is claimed.**

### What changed

The repeated conditions/playback/inspection/metrics dashboard has been removed from the nine premades. Each now has a subject-specific flow, a larger teaching visual, and one short contextual explanation. Opening views have one or two lesson form/action controls, with direct selection of meaningful scene objects where appropriate. Shared workspace navigation remains separate from those lesson controls.

Advanced model capabilities and scientific calculations remain available internally and through authoring; they do not automatically become learner controls. The simulations remain ordinary editable recipes with independent scene, explanation, and action components.

### Verification and limits

- All nine opening views and meaningful changed states passed the new browser checks.
- All nine passed desktop geometry checks at 1440×900, 1280×800, and 1366×768: readable scene size, controls at least 44px within measurement tolerance, no obstructed action centers, and no internally clipped board content.
- All nine passed native Remix in builder → Try lesson → interaction checks.
- Keyboard layer/object selection, preset restart, contextual removal, and the first/repeat immune challenge passed. Explicit plate playback paused correctly. Immune playback also paused correctly and cleared the first challenge in 10 steps and the matching repeat in 6.
- The full regression suite passed. After final polish, science invariants, recipe/save/reopen checks, and the production build passed again.
- These checks establish functioning interactions; they do not establish the user’s design approval. The next design round is deliberately waiting for feedback.
- This round reviews the nine authored premades. It does not claim a fresh nine-prompt Apertus/Laya generation batch or that every generated recipe has passed the new simplicity review. The earlier live-generation evidence remains separate.

[Browser report](023-validation/redesign-round-1/report.json) · [Immune playback evidence](023-validation/redesign-round-1/immune-playback.json)

Repeat the review with:

```sh
UX_TEST_URL=http://127.0.0.1:43111 pnpm --dir src/web test:science:browser
pnpm --dir src/web test:science
pnpm --dir src/web test:recipes
```

### Screenshots of all nine

#### Cell division

One next-stage action, visible chromosome continuity, and a short stage caption.

![Cell division: default opening](023-validation/redesign-round-1/cell-division-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=cell-division) · [Changed state](023-validation/redesign-round-1/cell-division-changed.png) · [1280×800](023-validation/redesign-round-1/cell-division-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/cell-division-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/cell-division-builder.png) · [Try lesson](023-validation/redesign-round-1/cell-division-try-lesson.png)

#### Immune defense

Introduce an infection, watch or pause its response, then repeat it after clearance. Only the current action appears.

![Immune defense: default opening](023-validation/redesign-round-1/immune-defense-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=immune-defense) · [Changed state](023-validation/redesign-round-1/immune-defense-changed.png) · [1280×800](023-validation/redesign-round-1/immune-defense-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/immune-defense-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/immune-defense-builder.png) · [Try lesson](023-validation/redesign-round-1/immune-defense-try-lesson.png)

[Alternate activity state](023-validation/redesign-round-1/immune-defense-alternate.png)

#### Genome to organism

A family diagram, one offspring action, and one choice for looking inside the selected organism. The authored seed demonstrates visible variation without changing the inheritance rules.

![Genome to organism: default opening](023-validation/redesign-round-1/genome-to-organism-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=genome-to-organism) · [Changed state](023-validation/redesign-round-1/genome-to-organism-changed.png) · [1280×800](023-validation/redesign-round-1/genome-to-organism-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/genome-to-organism-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/genome-to-organism-builder.png) · [Try lesson](023-validation/redesign-round-1/genome-to-organism-try-lesson.png)

[Alternate activity state](023-validation/redesign-round-1/genome-to-organism-alternate.png)

#### Pollination network

One next-day action. Flower buds, blooms, pollen routes, and fruit show the process.

![Pollination network: default opening](023-validation/redesign-round-1/pollination-network-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=pollination-network) · [Changed state](023-validation/redesign-round-1/pollination-network-changed.png) · [1280×800](023-validation/redesign-round-1/pollination-network-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/pollination-network-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/pollination-network-builder.png) · [Try lesson](023-validation/redesign-round-1/pollination-network-try-lesson.png)

#### Invasive species

Select a habitat patch and introduce a plant. Removal appears when the selected patch contains plants or seeds.

![Invasive species: default opening](023-validation/redesign-round-1/invasive-species-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=invasive-species) · [Changed state](023-validation/redesign-round-1/invasive-species-changed.png) · [1280×800](023-validation/redesign-round-1/invasive-species-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/invasive-species-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/invasive-species-builder.png) · [Try lesson](023-validation/redesign-round-1/invasive-species-try-lesson.png)

[Alternate activity state](023-validation/redesign-round-1/invasive-species-alternate.png)

#### Inside Earth

Select a layer directly. A short explanation follows the selection; one choice switches material and behavior views.

![Inside Earth: default opening](023-validation/redesign-round-1/inside-earth-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=inside-earth) · [Changed state](023-validation/redesign-round-1/inside-earth-changed.png) · [1280×800](023-validation/redesign-round-1/inside-earth-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/inside-earth-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/inside-earth-builder.png) · [Try lesson](023-validation/redesign-round-1/inside-earth-try-lesson.png)

[Alternate activity state](023-validation/redesign-round-1/inside-earth-alternate.png)

#### Plate boundaries

Choose a plate interaction and move or pause the plates. Reduced motion offers a single advance action.

![Plate boundaries: default opening](023-validation/redesign-round-1/plate-boundaries-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=plate-boundaries) · [Changed state](023-validation/redesign-round-1/plate-boundaries-changed.png) · [1280×800](023-validation/redesign-round-1/plate-boundaries-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/plate-boundaries-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/plate-boundaries-builder.png) · [Try lesson](023-validation/redesign-round-1/plate-boundaries-try-lesson.png)

[Alternate activity state](023-validation/redesign-round-1/plate-boundaries-alternate.png)

#### Volcano life cycle

Choose an eruption type and advance the visible activity. No reservoir, lava, or ash dashboard.

![Volcano life cycle: default opening](023-validation/redesign-round-1/volcano-life-cycle-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=volcano-life-cycle) · [Changed state](023-validation/redesign-round-1/volcano-life-cycle-changed.png) · [1280×800](023-validation/redesign-round-1/volcano-life-cycle-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/volcano-life-cycle-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/volcano-life-cycle-builder.png) · [Try lesson](023-validation/redesign-round-1/volcano-life-cycle-try-lesson.png)

[Alternate activity state](023-validation/redesign-round-1/volcano-life-cycle-alternate.png)

#### Water cycle

Follow a drop through a landscape with one action and a short explanation. No Track/Compare panels or water-budget readouts.

![Water cycle: default opening](023-validation/redesign-round-1/water-cycle-default.png)

[Open experiment](http://127.0.0.1:43111/experiments?experiment=water-cycle) · [Changed state](023-validation/redesign-round-1/water-cycle-changed.png) · [1280×800](023-validation/redesign-round-1/water-cycle-opening-1280x800.png) · [1366×768](023-validation/redesign-round-1/water-cycle-opening-1366x768.png) · [Builder](023-validation/redesign-round-1/water-cycle-builder.png) · [Try lesson](023-validation/redesign-round-1/water-cycle-try-lesson.png)

### Feedback requested

Is this simpler, visual-led direction right? Which experiments still feel confusing, too similar, or visually weak? No second design round has been started.

</details>


<a id="historical-screenshot-review"></a>

## 14. Historical screenshot review

This record describes an earlier iteration. Its status, ports, commands, and screenshots are historical; use the current implementation section for the latest results.

<details>
<summary>Earlier notes and evidence</summary>

**Historical UX status: rejected by the user.** The screenshots below record the overloaded presentation that prompted the correction. They are not UX acceptance evidence. Follow [IMPORTANT](IMPORTANT.md) before presenting a replacement for review.

Open the [running review app](http://127.0.0.1:43111/experiments). These are unmodified screenshots of the actual app, captured with standalone Playwright. Playwright MCP was unavailable in this session; no MCP verification is claimed.

Each lesson includes precise conditions, explicit stepping, object inspection, causal observations, and retained baseline comparison. Mobile polish and a real 200% browser-zoom audit are outside this completed desktop pass.

### Review index

| Lesson | Open lesson | Changed state | Alternate scenario | Builder |
| --- | --- | --- | --- | --- |
| Cell division | [Review](http://127.0.0.1:43111/experiments?experiment=cell-division) | [Screenshot](023-validation/desktop-final-3/cell-division-changed.png) | [Screenshot](023-validation/outcomes-final/cell-division-unequal-allocation.png) | [Screenshot](023-validation/desktop-final-3/cell-division-builder.png) |
| Immune defense | [Review](http://127.0.0.1:43111/experiments?experiment=immune-defense) | [Screenshot](023-validation/desktop-final-3/immune-defense-changed.png) | [Screenshot](023-validation/outcomes-final/immune-defense-matched-memory.png) | [Screenshot](023-validation/desktop-final-3/immune-defense-builder.png) |
| Genome to organism | [Review](http://127.0.0.1:43111/experiments?experiment=genome-to-organism) | [Screenshot](023-validation/desktop-final-3/genome-to-organism-changed.png) | [Screenshot](023-validation/outcomes-final/genome-to-organism-germline-provenance.png) | [Screenshot](023-validation/desktop-final-3/genome-to-organism-builder.png) |
| Pollination network | [Review](http://127.0.0.1:43111/experiments?experiment=pollination-network) | [Screenshot](023-validation/desktop-final-3/pollination-network-changed.png) | [Screenshot](023-validation/outcomes-final/pollination-network-short-bloom-overlap.png) | [Screenshot](023-validation/desktop-final-3/pollination-network-builder.png) |
| Invasive species | [Review](http://127.0.0.1:43111/experiments?experiment=invasive-species) | [Screenshot](023-validation/desktop-final-3/invasive-species-changed.png) | [Screenshot](023-validation/outcomes-final/invasive-species-late-removal-seeds.png) | [Screenshot](023-validation/desktop-final-3/invasive-species-builder.png) |
| Inside Earth | [Review](http://127.0.0.1:43111/experiments?experiment=inside-earth) | [Screenshot](023-validation/desktop-final-3/inside-earth-changed.png) | [Screenshot](023-validation/outcomes-final/inside-earth-mechanical-asthenosphere.png) | [Screenshot](023-validation/desktop-final-3/inside-earth-builder.png) |
| Plate boundaries | [Review](http://127.0.0.1:43111/experiments?experiment=plate-boundaries) | [Screenshot](023-validation/desktop-final-3/plate-boundaries-changed.png) | [Screenshot](023-validation/outcomes-final/plate-boundaries-boundary-4.png) | [Screenshot](023-validation/desktop-final-3/plate-boundaries-builder.png) |
| Volcano life cycle | [Review](http://127.0.0.1:43111/experiments?experiment=volcano-life-cycle) | [Screenshot](023-validation/desktop-final-3/volcano-life-cycle-changed.png) | [Screenshot](023-validation/outcomes-final/volcano-life-cycle-explosive-comparison.png) | [Screenshot](023-validation/desktop-final-3/volcano-life-cycle-builder.png) |
| Water cycle | [Review](http://127.0.0.1:43111/experiments?experiment=water-cycle) | [Screenshot](023-validation/desktop-final-3/water-cycle-changed.png) | [Screenshot](023-validation/outcomes-final/water-cycle-paving-comparison.png) | [Screenshot](023-validation/desktop-final-3/water-cycle-builder.png) |

### Cell division

![Cell division: actual desktop opening](023-validation/desktop-final-3/cell-division-opening.png)

[1280×800](023-validation/desktop-final-3/cell-division-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/cell-division-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/cell-division-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/cell-division-selected.png) · [Baseline comparison](023-validation/desktop-final-3/cell-division-comparison.png) · [Try lesson](023-validation/desktop-final-3/cell-division-try-lesson.png)

### Immune defense

![Immune defense: actual desktop opening](023-validation/desktop-final-3/immune-defense-opening.png)

[1280×800](023-validation/desktop-final-3/immune-defense-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/immune-defense-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/immune-defense-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/immune-defense-selected.png) · [Baseline comparison](023-validation/desktop-final-3/immune-defense-comparison.png) · [Try lesson](023-validation/desktop-final-3/immune-defense-try-lesson.png)

### Genome to organism

![Genome to organism: actual desktop opening](023-validation/desktop-final-3/genome-to-organism-opening.png)

[1280×800](023-validation/desktop-final-3/genome-to-organism-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/genome-to-organism-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/genome-to-organism-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/genome-to-organism-selected.png) · [Baseline comparison](023-validation/desktop-final-3/genome-to-organism-comparison.png) · [Try lesson](023-validation/desktop-final-3/genome-to-organism-try-lesson.png)

### Pollination network

![Pollination network: actual desktop opening](023-validation/desktop-final-3/pollination-network-opening.png)

[1280×800](023-validation/desktop-final-3/pollination-network-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/pollination-network-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/pollination-network-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/pollination-network-selected.png) · [Baseline comparison](023-validation/desktop-final-3/pollination-network-comparison.png) · [Try lesson](023-validation/desktop-final-3/pollination-network-try-lesson.png)

### Invasive species

![Invasive species: actual desktop opening](023-validation/desktop-final-3/invasive-species-opening.png)

[1280×800](023-validation/desktop-final-3/invasive-species-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/invasive-species-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/invasive-species-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/invasive-species-selected.png) · [Baseline comparison](023-validation/desktop-final-3/invasive-species-comparison.png) · [Try lesson](023-validation/desktop-final-3/invasive-species-try-lesson.png)

### Inside Earth

![Inside Earth: actual desktop opening](023-validation/desktop-final-3/inside-earth-opening.png)

[1280×800](023-validation/desktop-final-3/inside-earth-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/inside-earth-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/inside-earth-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/inside-earth-selected.png) · [Baseline comparison](023-validation/desktop-final-3/inside-earth-comparison.png) · [Try lesson](023-validation/desktop-final-3/inside-earth-try-lesson.png)

### Plate boundaries

![Plate boundaries: actual desktop opening](023-validation/desktop-final-3/plate-boundaries-opening.png)

[1280×800](023-validation/desktop-final-3/plate-boundaries-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/plate-boundaries-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/plate-boundaries-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/plate-boundaries-selected.png) · [Baseline comparison](023-validation/desktop-final-3/plate-boundaries-comparison.png) · [Try lesson](023-validation/desktop-final-3/plate-boundaries-try-lesson.png)

### Volcano life cycle

![Volcano life cycle: actual desktop opening](023-validation/desktop-final-3/volcano-life-cycle-opening.png)

[1280×800](023-validation/desktop-final-3/volcano-life-cycle-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/volcano-life-cycle-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/volcano-life-cycle-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/volcano-life-cycle-selected.png) · [Baseline comparison](023-validation/desktop-final-3/volcano-life-cycle-comparison.png) · [Try lesson](023-validation/desktop-final-3/volcano-life-cycle-try-lesson.png)

### Water cycle

![Water cycle: actual desktop opening](023-validation/desktop-final-3/water-cycle-opening.png)

[1280×800](023-validation/desktop-final-3/water-cycle-opening-1280x800.png) · [1920×1080](023-validation/desktop-final-3/water-cycle-opening-1920x1080.png) · [1366×768](023-validation/desktop-final-3/water-cycle-opening-1366x768.png) · [Selection](023-validation/desktop-final-3/water-cycle-selected.png) · [Baseline comparison](023-validation/desktop-final-3/water-cycle-comparison.png) · [Try lesson](023-validation/desktop-final-3/water-cycle-try-lesson.png)

### Additional scenario screenshots

[Immune: first challenge](023-validation/outcomes-final/immune-defense-first-clearance.png) · [Immune: unmatched antigen](023-validation/outcomes-final/immune-defense-unmatched-antigen.png) · [Water: vegetated watershed](023-validation/outcomes-final/water-cycle-vegetated.png) · [Volcano: effusive](023-validation/outcomes-final/volcano-life-cycle-effusive.png)

[Genome: cell](023-validation/outcomes-final/genome-to-organism-zoom-1.png) · [Chromosomes](023-validation/outcomes-final/genome-to-organism-zoom-2.png) · [Gene](023-validation/outcomes-final/genome-to-organism-zoom-3.png) · [DNA](023-validation/outcomes-final/genome-to-organism-zoom-4.png)

See [implementation evidence and repeatable commands](#historical-implementation-evidence) for scientific checks, browser results, actual provider receipts, and remaining gates.

</details>
