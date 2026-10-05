# 009 implementation evidence

## Manual builder integration correction

The original checkpoint below verified a separate catalog editor and did not establish the intended manual-builder workflow. That UI split has now been removed.

The normal 2D/3D setup creates a canonical document with its selected initial canvas and opens `CompositionBuilder`. Its existing Connections graph, viewport, wiring gestures, selection, history and Build tab now use public definitions and authored nodes. Add component contains all 154 public definitions, 41 built-in recipes, saved composites and recipe import. Composite insertion creates expandable graph groups; settings and advanced layout controls use focused dialogs. The separate `catalog-editor/` implementation and entry buttons have been deleted. Recipe storage moved to `builder/library/RecipeRepository.ts` without changing its local-storage key.

Original object geometry controls and canvas settings remain available through projections of authored data. Build preview uses the shared recipe runtime with authoring callbacks and capture. Older scenes translate at opening/recovery; version-3 documents and premade remixes open in the same manual editor. Canvas-targeted insertion validates compatibility, preserves destination settings, remaps scopes and references, and rejects incompatible hosts atomically.

Verification run for this correction:

- `npm test` — passed, including the new unified builder command suite.
- `npm run test:builder:browser` with `UX_TEST_URL=http://127.0.0.1:43002` — passed. This now runs unified manual-builder and spatial acceptance rather than the deleted editor workflow.
- Unified browser coverage: original setup, real initial canvas, existing line settings, catalog insertion, composite expansion, Build preview, independent dilution copies, atomic undo/redo, saved exposed parameters, recipe import, draft recovery and mobile layout. Desktop graph/library/preview and mobile screenshots were inspected.
- Spatial browser coverage: projectile/bridge/town premade remixes into the same editor, 3D setup, two bridge labs, keyboard load/member interactions, regeneration cancellation/replacement/undo, save/reload and mobile.
- `node scripts/builder/verify-unified-builder.cjs` — passed after the final destination-scope correction, including same-canvas reuse, authored canvas-setting preservation and incompatible-host rollback.
- `./node_modules/.bin/tsc --noEmit` — passed after final code changes.
- Scoped Biome checks — passed for changed builder code and verification scripts.
- `APERTUS_BROWSER_TEST_DIR=.next-unified-build ./node_modules/.bin/next build --webpack` — passed.
- `node scripts/builder/audit-public-catalog.cjs` — refreshed the source ledger.
- `git diff --check` — passed.

The browser-test server used a separate build directory from the existing development server. Older standalone scene-format browser scripts remain historical compatibility references; the current authoring acceptance command is `test:builder:browser`.

## Earlier catalog/runtime checkpoint

Date: 2026-10-05. This records the current working-tree implementation, including phases 4 and 5; it does not reuse 008's historical verification.

The public catalog contains 154 registered definitions and 41 built-in recipes. Its canonical version-3 documents expand recipes into independently editable nodes, connections, scopes, layout, resources and groups. The ledger covers the original 238 component files plus new implementations: 254 current files and 576 file/export records. It records explicit final owners and static, lazy-import and verification consumers. The permanent spatial verifier checks ledger inventory against the actual public component folder.

Catalog closure also includes Text Input, Entity Picker, Formula Display, Legend, bounded typed Literals, Field Selector, parsed bounded Expressions, explicit dimension-compatible Unit Conversion variants, and Theme resources. User-created prebuilts can expose selected child configuration fields with their authoritative schemas. The library has selection-aware compatibility filtering, contract/default previews, and prebuilt child/insertion previews. Layout authoring includes mobile columns, alignment, bounded typography, declared visibility/disabled bindings, and explicit theme bindings; identity remapping and validation cover those bindings.

Phase 4 adds Projectile and Projectile Comparison, fixed-interval sampling and trajectory/chart outputs, Pendulum and Rolling Comparison, the existing restricted Circuit Lab, explicit truss joints/members/load/response, Bridge Lab variants, Town Lab, Town Environment, Market, Daily Routine, and authored Scheduled Trip worlds. Projectile launcher/body/trajectory/vector layers, bridge beam/joint/support/truck layers, the member inspector, and town building/citizen/market/scenery/lighting attachments are ordinary public components. World rendering is lazy loaded; camera presets are presentation configuration.

Each inserted lab has an independent scope. Shared controls within a comparison use atomic command batches, and independent parameter controls explicitly restart their peers. Bridge response consumes public topology and load nodes. Town Navigation owns citizen motion, while building/routine/market nodes own authorable configuration. The Scheduled Trip clock uses the existing bounded authored route planner; mounting displays never creates another execution path.

Reference remapping covers declared configuration paths, including member endpoints, citizen destinations, appearance targets and `schedule.*.target`, as well as graph/layout/group identities. Both ports must permit cross-scope observation. Explicit external recipe bindings join compatible selected scopes where required. Market insertion is verified as an application to a selected town controller and World canvas.

Bridge topology validation accepts the generated five/eight-panel geometry, span scales 1/2, and one absent middle diagonal. Unsupported geometry, endpoints, counts or removals fail before publication or command commit. Regeneration builds and validates a complete replacement, checks outside dependencies, previews replacement counts in a native modal, and commits one undoable transaction while keeping load/control identities. Keyboard selection, dragging, cancellation and focus are exercised in the browser.

Phase 5 retires private Projectile/Bridge/Town controls, the old physical controls/whole lesson, and the singleton town environment/citizen assembly. Stable export names remain thin compatibility aliases. Public bridge/projectile/world renderers receive scoped snapshots and command callbacks. Premade lessons use recipe layouts. `SpatialRecipeView` and existing recipe adapters remain because the prompt/session protocol still uses their established stores; they stage full batches before committing. Legacy composition readers remain for saved documents. These compatibility paths are explicitly classified; no claim is made that the prompt protocol itself has been rewritten.

Legacy spatial recipes import as canonical graphs, including one to four projectile instances. Premade projectile, bridge and town entry points expose **Remix in builder**. Manual town migration preserves projected workspace trips, canvas clocks, configuration references and original source. Unsupported bindings remain disconnected drafts with recovery notices. The original imported representation can be exported from the builder. Failed configuration updates and batches preserve the accepted document/state.

Verification actually run from `src/web`:

- `npm test` — passed, including model/integration, migration, builder, graph/canvas, architecture, public-catalog and new spatial/catalog-closure checks.
- `./node_modules/.bin/tsc --noEmit` — passed.
- Scoped `biome check` over the 50 changed implementation/script/package files — passed; follow-up camera and ledger edits also pass their scoped check.
- `UX_TEST_URL=http://127.0.0.1:43002 node scripts/verify-public-catalog-browser.cjs` — passed (catalog contracts/previews, manually saved composite with an exposed parameter, independent dilution copies, undo/redo, persistence and mobile).
- `UX_TEST_URL=http://127.0.0.1:43002 node scripts/verify-spatial-catalog-browser.cjs` — passed (premade scenes, spatial remixes, keyboard load/member interaction, independent bridge insertion, native regeneration cancel/replace/undo, persistence and mobile).
- `BUILDER_BASE_URL=http://127.0.0.1:43002 npm run test:builder:browser` — both existing suites passed (physical/diagram parity and graph/town-trip workflows).
- `./node_modules/.bin/next build --webpack` — passed, including TypeScript, page data, static generation and build traces.
- `node scripts/builder/audit-public-catalog.cjs` — regenerated the current ownership ledger.
- `git diff --check` — passed.

The closure suite executes a 474-node multi-town document, then verifies that expansion beyond the 512-node limit fails without modifying it. Existing bounds remain 1,024 connections, depth 12 and 1 MB of document data. Runtime-provider coverage, seeded motion, copy/reset isolation, rollback, presentation invariance, applied external scopes, saved user recipes, array reference remapping, unsupported topology and legacy spatial imports have permanent checks.

Model limits remain explicit: no air resistance or unequal-height projectile solver; small-angle ideal pendulums; simplified rolling resistance; restricted series/parallel circuits; heuristic bridge scores rather than a structural solver; planar premade town navigation with its established street policy; and bounded authored obstacle navigation rather than arbitrary road networks. These are model capability limits, not hidden authoring features.

Environment notes: local server binding and Chrome startup required sandbox escalation for browser verification; both were approved. Production validation uses webpack. The earlier checkpoint recorded a default Turbopack build stall and unrelated repository-wide lint findings; this turn did not claim those had been fixed or rerun that stalled build.
