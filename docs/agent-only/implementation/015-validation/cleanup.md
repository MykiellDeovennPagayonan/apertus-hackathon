# Phase 3 cleanup audit

Recorded 2026-10-06. The replacement handles the three scoped lesson families through typed recipe arguments and shared authoring tools. Neither planner mode can call the retired broad generator.

## Physically removed

Production: `lib/planner/creation.ts`; `lib/apertus/client.ts`, `catalogSelection.ts`, `arguments.ts`, `educationalExamples.ts`; `lib/laya/planner.ts`, `questions.ts`.

Verification: `scripts/verify-browser.cjs`, `verify-apertus.cjs`, `verify-planner.cjs`, `verify-creation.cjs`, `verify-creation-browser.cjs`, `verify-creation-mcp.cjs`, `creation-mcp-scenario.cjs`, `evaluate-apertus-live.cjs`, `evaluate-laya-live.cjs`, `record-creation-candidate.cjs`. Their obsolete planner/creation package commands were removed; `test:browser` now runs the canonical generation fixture browser checks. Historical implementation documents and recorded evaluations remain untouched.

`schema.ts`, `browser.ts`, and `index.ts` were rewritten in place. API and home callers use the canonical protocol. `src/inference/Makefile` planner smoke now calls the new live runner with one pass. The web README and example environment describe the current bounded generator and runnable commands.

## Shared bodies extracted

Builder `editor/compositeCommands.ts` and `insertionPlan.ts` are thin reexports of pure runtime implementations. `connectionCommands.ts` resolves graph endpoints, then calls shared connection functions. Graph selection and UI/history stay in builder. No second insertion or mutation implementation was added.

Arithmetic and rectangle configuration/command schemas now live in `components/catalog/scopedLearningContracts.ts`; public definitions and legacy capabilities consume the same schemas. Creation defaults remain separate from accepted premade values. The only changes to the three scoped recipe JSON files are parameter exposure metadata; initial documents, presentation, tags, and authored values match HEAD. All other premades and protected gas hashes match the captured baseline.

## Retained compatibility and retirement owners

These are deliberately retained active consumers, not new-generation fallbacks. The owning subsystem/path is recorded rather than inventing a person responsible for retirement. Removal requires migration of the listed consumers and saved-format fixtures.

| Retained source | Verified consumers | Retirement owner/boundary |
| --- | --- | --- |
| `runtime/legacyPlan.ts` | Runtime `session.ts`, historical integration/domain tests, and test-only configuration decoder. Home imports legacy demo identity types for gas/town premade adapters. | Runtime saved-format compatibility. Retire after legacy activation/readers and fixtures migrate. |
| `runtime/session.ts` legacy `executePlan` branches | Home opens gas/town through these branches; legacy ExperimentView, domain controls/views, and compatibility tests still use session APIs. Scoped creation and migrated premade activation delegate to `recipeSession.ts`. | Runtime/browser compatibility. No generator imports or invokes legacy planning. |
| `runtime/capabilities.ts` | GasPressureExperiment, gas/elementary/math sessions, catalog, resolver/validation, builder descriptors/command validators, unscoped learning definitions and historical tests. | Component schema and legacy-runtime owners. Scoped arithmetic/rectangle contracts are extracted; protected gas and unscoped contracts are retained. |
| `runtime/resolver.ts` | Builder legacy import, serialization, document types/validation, composeLegacy migration, spatialMigration, legacyPlan/session and legacy fixture tests. | Builder saved-format migration. Retire only after all existing formats are supported by canonical readers. |
| `views/LegacyRecipeView.tsx` | ExperimentView legacy launch/render paths. | Shared view compatibility for existing lessons and historical formats. |
| `views/SpatialRecipeView.tsx` | ExperimentView, ThreeWorldView, BridgeControls, ProjectileControls, TownControls. | Spatial compatibility, including the live town exception. |
| Old domain stores/sessions | Legacy views and controls above; gasSession remains protected. | Domain runtime owners. Reuse the trusted math while readers migrate; do not replace it merely to delete filenames. |
| `scripts/compatibility/legacyConfiguration.ts` | Chemistry verification/layout, physical-systems verification/layout, and math-foundations verification. No production imports. | Historical fixture compatibility. Holds only old interpretation/argument fixture decoding, never inference or fallback execution. |
| Laya client/config/decisions and Python service | New lazy shortlist selector, probability/confidence validation and service tests. | Active optional provider infrastructure; not obsolete. |
| Gas direct loader and town metadata | Premade catalog/home/legacy view paths. | Protected/live exceptions explicitly outside the scoped migration. |

## Proof

`baseline.json` captures recipe and gas source hashes. `baseline-dependencies.json` is an explicitly labelled reconstruction from clean HEAD of the original planner/authoring dependency roots. `final-dependencies.json` records all current source/script imports, exports, dynamic imports, and test-loader references; its larger scope is not an apples-to-apples code-size comparison.

`pnpm test:generation:architecture` resolves 521 source/script files and 152 headless modules. It checks retired file absence; relative imports/exports/dynamic imports/test loaders; package and inference CLI entry points; runtime/components-to-builder boundaries; headless generation exclusion of rendering, React, Next, and browser singleton sessions; protected hashes; and scoped JSON changes restricted to parameter exposure.

`pnpm test` checks existing saved readers, builder insertion/graph/serialization, gas and all migrated premade contracts alongside the new transaction and transport assertions. The public source ledger was regenerated through `scripts/builder/audit-public-catalog.cjs` and its closure test passes.
