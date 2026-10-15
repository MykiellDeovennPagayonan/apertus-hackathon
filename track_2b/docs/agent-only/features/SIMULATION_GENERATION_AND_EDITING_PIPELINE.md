# Simulation creation and editing pipeline

The implementation lives in `src/web/src/simulations/creation-and-editing/`. Component identities and recipe sources live in the adjacent `registry/`; preserved scientific scenes, systems and compatibility implementations live in `legacy/`. Domain contributions remain in `domains/`, and recipe JSON/assets remain in `pre-made/`.

## Entry and state ownership

The Next.js [Apertus route](../../../src/web/src/app/api/apertus/route.ts) delegates Web request handling to [input/api.ts](../../../src/web/src/simulations/creation-and-editing/input/api.ts). That boundary preserves request byte limits, UTF-8 validation, request correlation, cancellation, progress/construction streams and exactly one terminal result. [server.ts](../../../src/web/src/simulations/creation-and-editing/server.ts) exposes the server orchestration entry; browser consumers import [input/browser.ts](../../../src/web/src/simulations/creation-and-editing/input/browser.ts) and data contracts directly.

[pipeline.ts](../../../src/web/src/simulations/creation-and-editing/pipeline.ts) validates requests, limits concurrent generation, creates one budget and coordinates creation or editing. Creation and editing share authoring transactions, recipe validation and registry lookup. There is no remaining implementation under `lib/planner`, `lib/apertus`, `lib/llm` or `lib/decisions`.

Inference configuration/adapters and structured response transport live in `input/inference/`. The existing transport owns bounded repair, issue feedback and repeated-response termination. Stage owners supply schemas and validators; they do not add another retry transport. The budget freezes the provider/model for a request. No provider settings or model IDs changed during migration.

## Creation

[interpretCreation.ts](../../../src/web/src/simulations/creation-and-editing/intent-interpreter/interpretCreation.ts) interprets the learning goal and preserves exact constraint source text. [composer/create.ts](../../../src/web/src/simulations/creation-and-editing/composer/create.ts) coordinates existing supported strategies:

- [assemblyCandidates.ts](../../../src/web/src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts) ranks complete premade/built-in activities and projects model counts and capability cards. `assemblyPlan.ts` selects supported activity instances using the existing decision-provider hint and structured selection call.
- [createFromAssemblies.ts](../../../src/web/src/simulations/creation-and-editing/composer/createFromAssemblies.ts) assembles selected recipes without inventing wiring. `choosePresentation.ts` selects actual control/observation identities; `configureAssembly.ts` supplies exposed starting values. Their inference wires are separate and flat: presentation is keyed by validated item IDs with boolean values; configuration is keyed by validated setting IDs with executor-owned value schemas. The application maps those IDs back to control endpoints, observations and recipe parameter names. Recipes with no exposed parameters do not invoke configuration inference. Decision uncertainty falls back to the existing structured transport. Explicitly requested capabilities cannot be permanently excluded by a contradictory visibility decision.
- [composeFromComponents.ts](../../../src/web/src/simulations/creation-and-editing/composer/composeFromComponents.ts) retains the bounded operation strategy. `component-selection/selectRecipe.ts` retains recipe capability selection needed by the existing compatible-additions strategy; `recipeCreation.ts` applies its authoring batches. Both use shared finalization and validation.

`authoring-engine/finalizeRecipe.ts` constructs a fully expanded recipe, recomputes dependencies through serialization and validates executable state. Authoring operations and transactions mutate an isolated draft. Browser activation happens only after correlated result validation.

## Editing

[composer/edit.ts](../../../src/web/src/simulations/creation-and-editing/composer/edit.ts) is the bounded edit coordinator:

1. `input/context.ts` projects captured live configuration over authored keys. `component-selection/editCandidates.ts` groups operation candidates and visible identity/context without repeating unrestricted metadata for every operation.
2. `selectEditTargets.ts` selects operation identities. `intent-interpreter/interpretEdit.ts` validates persistent edit, immediate runtime action, replacement, unsupported and clarification semantics.
3. `composer/editPlan.ts` narrows a flat boolean field-selection wire to the accepted targets. Validated field IDs map to executor-owned field names; paired numeric adjustment keys compute from current values. Invalid field objects are rejected rather than coerced. Target mode is owned by selection, not reinterpreted during field planning.
4. `composer/editArguments.ts` generates a closed, flat object keyed by argument IDs. Each argument uses its executor-owned value schema; the application supplies the accepted target and command envelope. Repair feedback names exactly those argument keys. Nested configuration patches preserve live siblings, including single-dimension resizes.
5. `validator/edit.ts` checks field overlap, mode/scope consistency, numeric adjustments, expanded targets, transactional application and runnable results. It does not call the composer or network. Rejected draft operations never mutate accepted state.

When a selected proposal cannot produce a valid document/recipe after bounded validation/repair, orchestration can reselect targets once against the complete catalog with the rejection evidence. The original validation cause survives transport wrapping; syntax/value repair does not trigger unrelated target reselection. A previously rejected target set cannot be repeated unchanged. It does not reselect after cancellation, deadline, unavailable configuration or unrelated transport failures. The same request budget bounds recovery. Runtime commands validate against an isolated runtime using captured state before returning a correlated action result.

## Registry and compatibility

[registry/index.ts](../../../src/web/src/simulations/registry/index.ts) integrates native controls, displays, canvases, authored objects, domain declarations and [legacyDefinitions.ts](../../../src/web/src/simulations/registry/legacyDefinitions.ts). Duplicate identities fail initialization. Registered contracts are cloned and frozen after metadata integration; lookup supports stable IDs/versions and imported-component instance contracts. Core declarations and lookup do not import React or inference configuration.

Shared public/parameter/control/observation contracts are in `registry/contracts/`. Native control implementations are in `registry/controls/`; object declarations are in `registry/objects/`. `registry/models/domainModels.ts` adapts existing domain contributions. Legacy declarations import shared contracts directly and do not import the registry root.

[discovery.ts](../../../src/web/src/simulations/registry/discovery.ts) owns browsing metadata/ranking and active discovery eligibility. Historical controls and automatically generated domain-model presets remain identity-resolvable but are excluded from active discovery. `presets.ts` provides the preset application inventory separately from runtime component lookup.

`registry/recipes/` separates schema defaults, model-recipe construction, learning-state capture, built-in registration and generated premade imports. All 90 premade JSON sources retain their paths. The existing `recipes:generate` command writes `premade.generated.ts`; its `--check` option verifies freshness.

The assembly compatibility adapter consumes fully expanded model recipes and rejects unexpected nesting. It does not import built-in registration, avoiding a startup cycle through spatial recipe construction.

## Execution, rendering and application adapters

`runtime-engine/` owns document state, commands, providers, stepping, session identity/revisions and recipe capture. `simulation/` owns generic lesson/board rendering, node routing, responsive learner layout and construction projections. Domain equations stay with their existing implementations.

`RecipeSession` remains the owner of accepted browser state. It verifies session/authored/interaction revisions before accepting edits and commands. The experiments shell and manual builder retain activation, history and persistence ownership; their imports now point directly to the new owners. Existing project/library storage and Python inference serving are unchanged.

## Verification and evidence

Use the existing `npm test` runner, `tsc --noEmit`, `recipes:generate -- --check` and the production build. The recipe checks cover premade and built-in lookup/runtime construction, round trips, independent copies, rejected state, session save/reopen and extracted edit contracts. Deterministic contract tests are not live-inference evidence.

Historical browser probes and implementation diaries are omitted from the submission. A successful type check or recipe round trip does not establish semantic creation/edit reliability. See the [recorded benchmark data](../../../data/README.md) for the frozen campaign and the [technical report](../../../technical_report.md) for results and limitations. Follow-up edits require separate live verification; do not infer their success from fresh-creation scores.
