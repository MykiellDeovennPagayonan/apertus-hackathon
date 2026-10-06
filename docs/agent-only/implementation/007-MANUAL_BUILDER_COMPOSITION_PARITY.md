# 007 — Manual builder composition parity

Date: 2026-10-05.
Status: implemented and verified locally on 2026-10-05 for gas and fractions. See section 12 for acceptance evidence and build limitations. Not deployed.

## 1. Intended outcome

Bring **2D physical canvas** and **2D diagram** to the same authoring standards as **Cartesian plane**: independent components, explicit connections, validated instance bindings, per-canvas runtime ownership, direct authoring, and consistent editing and persistence.

An author must be able to create pieces in any order, connect them to define the experiment, retain incomplete drafts, and try the lesson using the same renderer with authoring disabled. Adding a component must add the named component rather than an undisclosed complete experiment.

Use the process described in [Manual Builder Processes](../features/MANUAL_BUILDER_PROCESSES.md) and the editor behavior described in [Connection Canvas Editing](../features/CONNECTION_CANVAS_EDITING.md) as the baseline. Preserve existing Cartesian and town behavior while extending the shared composition path.

This plan covers the currently available gas and fraction domains. General rigid-body physics, arbitrary diagram primitives, mixed-domain canvases, and new AI creation workflows are outside this change. Existing recipes and generated experiments remain supported through their current runtime paths and the manual-builder migration adapters.

The sections below retain the implementation contract and original gap analysis. The completed behavior is documented in [Physical and diagram composition](../features/MANUAL_BUILDER_DOMAIN_COMPOSITION.md). This work does not authorize deployment.

## 2. Initial architecture and gaps

Initial source inspection found two manual-builder paths, before physical/diagram parity was implemented:

- Cartesian and town documents are converted by `Builder.tsx` into `CompositionScene` documents. `CompositionBuilder`, `compositionGraph()`, `projectedScene()`, and `useSceneRuntime()` handle independently identified components and their relationships.
- Gas and fractions use a legacy recipe plus `presentation.controls` and `presentation.results`. `ConnectionWorkspace` projects a single model into a fixed view, and `LegacyLessonSession` activates shared gas or math session stores.

The legacy graph represents real bindings and supports rebinding. Its restrictions are structural: one model, session-level targets, no independent canvas placement, and no detached control or measurement records.

| Standard | Cartesian baseline | Physical/diagram gap | Required outcome |
| --- | --- | --- | --- |
| Component identity | Independent line, square, canvas, control, measurement | One gas model or one two-bar board | Independent gas containers and fraction bars |
| Creation order | Components may precede their connections | Controls/results require a model | All supported components can be created detached |
| Placement | Stored object-to-canvas relationship | Fixed model-to-view relationship | Connect, disconnect, and reassign display placement |
| Bindings | Specific target ID and property | Session target; fraction bar index | Stable target IDs and declared capabilities |
| Observations | Independent measurements, including two-input intersection | Single pressure or built-in pair comparison | Typed readouts and independent two-input comparisons |
| Runtime ownership | Separate projected runtime per canvas | Module-level active gas/math store | Independent runtime state without cross-canvas leakage |
| Direct authoring | Validated transient interaction and final commit | Fixed placement and domain interaction | Author placement and resize with final commit |
| Editing | Groups, copy/paste, batch deletion, labeled history | Legacy subset | Same shared editor operations |
| Persistence | Shared validation, history, recovery, storage | Already largely shared | Preserve these foundations and migrate documents |

### Existing pieces to reuse

- `components/prefabs/GasContainer.ts`: gas sample and container construction.
- `components/systems/IdealGasSystem.ts`: validated gas calculations and unit conversion.
- `components/systems/GasParticleIllustrationSystem.ts`: representative particle animation.
- `components/visuals/GasContainerVisual.tsx` and `GasParticleVisual.tsx`: reusable rendering.
- `components/prefabs/MathBoards.ts` and `traits/MathBoards.ts`: fraction bar construction and state.
- `components/systems/FractionBuilderSystem.ts` and `fractionMath.ts`: validated fraction operations and exact comparison.
- `components/visuals/FractionBarVisual.tsx`: accessible piece interaction through a supplied command callback.
- `builder/Builder.tsx`, `history.ts`, and `storage.ts`: document edits, last-valid preview, recovery, saving, and conflict handling.

## 3. Decisions for the first implementation

### 3.1 Authoring atoms

The first physical-domain atom is **Gas container**, containing one gas sample. Multiple containers are independent authored instances. Amount, temperature, and volume are owned by that instance; pressure is derived by the existing ideal-gas system. Particle positions are transient illustration state.

Do not expose sample-to-container wiring in this release. Internal `GasSample` separation remains reusable; explicit containment can be added when lessons require transfer or independent sample/container composition. The palette must clearly describe the single sample included by a gas container.

The first diagram-domain atom is **Fraction bar**. A bar owns its partition count and shaded-piece mask. Its numerator is derived from the mask. Mathematical fraction, decimal value, and comparisons are derived outputs; they are not independently writable fields.

The existing two-bar board becomes a preset and migration result assembled from two bars and a comparison measurement. It is not the only available authoring unit.

### 3.2 Canvas and mathematical configuration

Introduce `physical` and `diagram` scene kinds alongside `cartesian` and `town`. A workspace contains one scene kind, matching the existing same-kind restriction. Use kind-specific canvas settings rather than requiring physical/diagram scenes to carry Cartesian axis settings or a town clock.

Canvas viewport, object display placement, and visual scale do not change the gas model or fraction value. Object display bounds are distinct from graph card positions and domain configuration.

- Dragging or visually resizing a gas container changes display geometry, not volume.
- Changing gas volume uses a validated property command; the existing container illustration may reflect that volume within its display bounds.
- Dragging or resizing a fraction bar changes display geometry, not its partitioning or shaded fraction.
- Comparison retains the equal-whole assumption. Visual widths may vary, but the UI must explain that widths are presentation and each bar represents one equal whole.
- Physical animation remains an illustration; do not infer pressure from particle collisions or pretend this is a general physics solver.

### 3.3 Relationships and scope

Retain explicit placements and bounded bindings rather than introducing arbitrary executable graph nodes.

- A placed object belongs to one canvas at a time, matching current Cartesian behavior.
- A property control has one target ID and property key.
- An action button has one target ID, action key, and validated fixed arguments.
- A readout has one target ID and output key.
- Fraction comparison has two distinct bar IDs on the same diagram canvas, analogous to line intersection.
- Intersections remain restricted to two lines on one Cartesian canvas.
- Multiple controls may address the same property and must reflect the same runtime value.
- Reset belongs to the canvas runtime, with an always-accessible learner reset action. An optional authored reset button targets its canvas explicitly.

Detached components and partially connected pair measurements are valid drafts. Missing required connections prevent Try lesson, with actionable messages.

### 3.4 Serialization and compatibility

Introduce a version-2 experiment document for the new composition contract, with explicit supported scene/workspace schema versions. Retain a version-1 decoder and migrate supported old documents in memory before applying current validation.

Migration must be deterministic and must not rewrite saved library entries just because they were opened. A supported old document should migrate once; applying migration again must preserve identities and structure. Saving writes the current format through existing conflict-aware storage. Unsupported future entries remain retained in the library.

Version changes require coordinated updates to import, export, draft recovery, and storage validation; changing only TypeScript interfaces is insufficient.

## 4. Shared component contracts

Create a bounded builder component definition interface. Proposed supporting modules such as `composition/definitions.ts`, `physical.ts`, and `diagram.ts` are additions, not existing APIs.

| Contract | Must declare |
| --- | --- |
| Identity | Kind, provider/schema version, label, compatible scene kinds |
| Authored state | Strict schema, defaults, domain configuration, display geometry, appearance, learner permissions |
| Properties | Value type, range, step, unit, current-value reader, supported setter |
| Actions | Argument schema, target kind, validated domain operation |
| Outputs | Value type, unit, authoritative calculation/source |
| Placement | Accepted canvas kind and relevant relationship rules |
| Runtime | Initialize, apply command, derive outputs, reset, capture; optional bounded animation step |
| Presentation | Graph capabilities, settings fields, compatible renderer |

Reuse existing runtime capability schemas, units, and domain systems wherever compatible. Avoid creating a second source of gas ranges or a competing fraction algorithm. Keep definitions explicit and finite; no dynamic code loading, expressions, or user-provided functions.

Extend controls beyond the current numeric/toggle-only `SceneControl` contract using a discriminated binding:

- Property binding: slider, number input, or toggle, with compatible type and range.
- Action binding: button with validated fixed arguments, such as `{ factor: 2 }` for subdivision.
- Canvas action binding: reset scoped to a canvas runtime.

Typed outputs must distinguish numeric measurements, exact fractions, text/equations, points, booleans, and supported object-source ports. Units belong to definitions and persisted bindings must be checked against them. Precision changes formatting only.

Port compatibility must be checked during selection, at connection commit, and during full document validation. Preserve vertical-line rules, intersection rules, town destinations, and trip scheduling constraints.

Keep measurement forms bounded: single-source readout, line intersection, and fraction comparison. Do not expand this into an arbitrary computation graph.

## 5. Runtime and interaction lifecycle

Generalize the projected-scene/runtime boundary instead of mounting more legacy global sessions. New manual composition previews must not call `activateSession()` or route their commands through the singleton gas/math stores.

Each canvas owns an independently initialized runtime. Objects are addressed by stable IDs inside that runtime. Reuse pure calculation and state-update helpers from the existing domain code; legacy experiments continue using their existing stores.

```text
Authored document
    → validated relationships and placements
    → per-canvas projection
    → independent runtime state
    → scoped validated commands
    → domain systems and derived outputs
    → renderer and measurements
```

Required lifetime rules:

1. Labels, colors, graph navigation, and control-panel presentation refresh without resetting current domain state.
2. Authored domain configuration changes establish a new starting configuration for the affected canvas. Other canvases retain their runtime state.
3. Pure display-position/size edits preserve domain state and animated illustration continuity where possible.
4. Rebinding controls/readouts preserves object state unless domain configuration changes.
5. Moving an object between canvases clears its old runtime ownership and initializes it from authored state in the destination; reject incompatible pair-measurement moves before mutation.
6. Learner commands update transient state only. Reset restores all authored starts on that canvas.
7. Author direct placement/resize interactions preview transiently and commit one document edit on release. Cancellation restores the pre-interaction state.
8. Domain experimentation becomes authored only through explicit capture. Capture includes gas inputs and the exact fraction shading mask, excluding particle positions, derived outputs, and viewport navigation.
9. Animation callbacks dispose on replacement/unmount and pause while previews are hidden, following the established application policy.

Use one transient interaction owner per drag. Convert screen coordinates through the actual SVG transformation, calculate movement from the initial drag snapshot, validate candidate state, and support keyboard positioning. Reuse shared helpers where appropriate without copying all of `CartesianScene.tsx` into each renderer.

## 6. Physical canvas vertical slice

Deliver the following palette:

- Physical canvas.
- Gas container.
- Slider, number input, toggle, action button, readout.

Capabilities:

| Gas capability | Behavior |
| --- | --- |
| `volume` | Numeric property in L; use existing range |
| `temperature` | Numeric property in K; use existing range |
| `amount` | Numeric property in mmol; use existing range |
| `playing` | Toggle particle illustration motion |
| `pressureKPa` | Numeric output in kPa derived by `IdealGasSystem` |

Particle visibility is per-object appearance, distinct from `playing`. Rendering, controls, readouts, and capture must address the selected container ID.

Canonical authoring example:

```text
Container A → Physical canvas 1
Container B → Physical canvas 1
Volume slider → Container A.volume
Temperature number input → Container B.temperature
Pressure A readout ← Container A.pressureKPa
Pressure B readout ← Container B.pressureKPa
```

Pass condition: changing A's volume changes only A's state, illustration, controls, and pressure. With amount and temperature fixed, halving a supported starting volume doubles pressure. A second physical canvas maintains independent state and reset.

## 7. Diagram vertical slice

Deliver the following palette:

- Diagram canvas.
- Fraction bar.
- Action button, number input for supported integer properties, readout, comparison.

Capabilities:

| Fraction capability | Behavior |
| --- | --- |
| Direct piece toggle | Target bar ID and validated piece index; subject to learner permission |
| Partition count | Integer 1–12; authored edit and optional number control |
| Subdivide | Target bar ID and integer factor 2–12; resulting parts must remain at most 12 |
| Fraction output | Exact derived numerator/denominator |
| Decimal output | Derived numeric value, formatted at readout precision |
| Comparison | Exact relation between two distinct bars on one canvas |

Changing partition count through a plain setter reconstructs a deterministic prefix-shaded mask using `min(previousNumerator, newDenominator)` shaded pieces. Document that this may change quantity. Subdivision remains the quantity-preserving operation: duplicate each piece's shading, producing equivalent numerator and denominator. Preserve arbitrary existing shading masks through reset, capture, serialization, and compatible operations.

Canonical authoring example:

```text
Bars A, B, C → Diagram canvas 1
Split button ×2 → Bar A.subdivide
Fraction readout ← Bar A.fraction
Comparison 1 ← Bar A, Bar B
Comparison 2 ← Bar A, Bar C
```

Pass condition: bar ordering and labels do not affect bindings. Starting with A = 1/2 and B = 2/4, comparison is equality. Subdividing A produces 2/4 with the same value. Toggling a piece updates its exact fraction and all dependent measurements. Unsupported subdivision is rejected without any partial mutation.

## 8. Editing, validation, and migration

### Shared editor behavior

Extend `CompositionGraph`, `CompositionLibrary`, settings dialogs, `CompositionLesson`, and the editor helpers for the new component kinds. Both domains inherit:

- Click/drag connectors, compatible destination highlighting, cancellation, selectable wires, disconnect.
- Card layout based on actual port height, add/reveal behavior, pan/zoom, keyboard access.
- Multiple selection, groups, copy/paste, batch deletion, and labeled undo/redo.
- One history entry for a completed drag, paste, batch deletion, or grouped settings change.
- Preservation of surviving controls and measurements as detached components after target deletion.
- Clean graph positions/group membership and deterministic internal-reference remapping on copy.

A connection rejected by compatibility or validation must leave the document unchanged. Full validation handles imports and settings edits independently of the connector UI. Preserve the last-valid preview and retain invalid text/drafts for repair.

### Migration mapping

| Old document data | Current composition result |
| --- | --- |
| Gas recipe | Physical canvas plus one gas container with resolved starting inputs |
| Gas controls | Instance property bindings; reset becomes canvas action |
| Gas pressure result | Container pressure output readout |
| Particle presentation flag | Container particle visibility |
| Fraction recipe/board | Diagram canvas plus two independently identified bars |
| Fraction values | Deterministic masks matching the old constructed bars |
| Split A / Split B | Subdivide action buttons targeting the corresponding bar IDs |
| Comparison result | Separate comparison measurement referencing both bars |
| Direct-shading flag | Per-bar learner shading permission |
| Lesson, layout, labels, units, precision | Preserve equivalent current fields |
| Graph positions/groups | Remap old object/view identities; place newly exposed components without overlap |
| Existing Cartesian/town composition | Convert shared envelope/contracts without changing geometry, trips, bindings, or permissions |

Resolve recipe defaults before migration. When the source contains only fraction values, construct the same prefix-shaded bars as the legacy loader; do not claim a missing historical shading pattern can be recovered.

Do not apply the current `composeLegacy()` fallback to gas/fractions: it currently chooses Cartesian for line and town otherwise. Implement exhaustive template dispatch and reject unsupported inputs explicitly.

## 9. Phased delivery and gates

| Phase | Work and principal files | Exit gate |
| --- | --- | --- |
| 0 — Baseline | Inspect current source; record revision/dirty-tree scope; inspect `verify-builder`, `verify-composition`, `verify-composition-graph`, and `verify-canvas-editor` scripts | Existing Cartesian/town behavior and legacy migration expectations recorded |
| 1 — Contracts | `document.ts`, `composition/model.ts`, `workspace.ts`, proposed definitions/adapters, explicit v1 migration | New schema validates detached drafts and rejects invalid references/types/units; existing documents remain readable |
| 2 — Runtime | `useSceneRuntime.ts`, `CompositionLesson.tsx`, scoped domain helpers | Two instances and two canvases execute independently; presentation edits preserve domain state; reset/capture defined |
| 3 — Gas | Physical renderer, gas settings/definitions, library/graph extensions | Full gas canonical example passes through the manual UI, including direct authoring |
| 4 — Fractions | Diagram renderer, bar settings/actions, comparison calculation, library/graph extensions | Three-bar canonical example passes with exact arithmetic and preserved shading masks |
| 5 — Migration and editor parity | `migration.ts`, `Builder.tsx`, `editor.ts`, storage/import/recovery boundaries, setup/catalog copy | Old gas/fraction fixtures migrate correctly; both domains use shared editor operations and persistence |
| 6 — Acceptance | Domain, graph, lifecycle, persistence, browser, and regression verification | All acceptance rows below have evidence; documentation reflects shipped behavior |

Integrate incrementally after each gate. Add migration fixtures early, then complete user-facing conversion in phase 5. Avoid a prolonged second composition editor for the new domains. Remove dead manual-builder legacy branches only after compatibility coverage passes; preserve runtime paths still used by other application flows.

## 10. Verification and acceptance

Extend existing scripts rather than creating tests that only repeat implementation details. New browser cases must use the actual manual authoring flow and persisted documents. This scope does not require model inference; do not inherit unrelated AI live-evaluation requirements from other plans.

| Area | Required evidence |
| --- | --- |
| Atomic creation | Add a slider/readout before any object; save/reopen detached draft; connect later |
| Placement | Add two canvases; connect/disconnect/reassign an object; invalid paired moves leave the document unchanged |
| Numeric contracts | Reject incompatible toggles, nonfinite values, out-of-range inputs, mismatched units, and invalid starting ranges |
| Action contracts | Validate fixed arguments and target kind; reject invalid fraction subdivision atomically |
| Gas mathematics | Independently check ideal-gas pressure and inverse-volume/linear-temperature relationships within declared tolerance |
| Fraction mathematics | Check exact comparisons, arbitrary masks, quantity-preserving subdivision, partition-change policy, and 12-part bound |
| Runtime isolation | Commands/reset on A do not alter B; second canvas and simultaneous mounted previews do not share active state |
| Lifecycle | Label/color changes preserve current values; capture/reset round-trip starts; replaced scenes dispose animation callbacks |
| Direct editing | SVG resizing/zoom retains pointer alignment; drag cancel restores state; release creates one undo step; keyboard movement works |
| Permissions | Learners cannot use author handles or change authored starts; per-bar shading permission is enforced by command handling |
| Graph semantics | Reconnect changes actual targets; disconnect preserves component; wires reconstruct from saved relationships |
| Copy/delete/history | Fresh IDs, correct internal remapping, valid external bindings, detached invalid bindings, group cleanup, undo/redo restoration |
| Persistence | Save/reload, JSON round-trip, migration idempotence, last-valid recovery, cross-tab conflict, unknown-entry retention |
| Accessibility/layout | Accessible labels, keyboard connectors/actions, focus return, compact/mobile scene readability, no page overflow |
| Regressions | Cartesian endpoint drag, vertical lines, square geometry, intersections, multiple planes; town objects, trips, destinations, clock |

Run focused checks after each slice, then the existing full simulation suite, relevant builder/composition/canvas browser scripts, TypeScript checking, lint for changed code, and the production build at the acceptance gate. Use the repository's package manager and inspect script prerequisites before running browser checks. Record actual commands and outcomes; a listed check is not a passing result.

## 11. Completion checklist

- [x] Both setup choices produce composition documents with no implicit populated model.
- [x] Canvases, objects, controls, and measurements can be independently created and connected.
- [x] Gas instances and fraction bars use stable identity-based routing.
- [x] Multiple canvases have independent runtime ownership and reset.
- [x] Domain systems remain authoritative for values and measurements.
- [x] Display geometry is separate from graph metadata and mathematical configuration.
- [x] Direct authoring, learner permissions, experimentation, capture, and reset have consistent lifetimes.
- [x] Copy/paste, grouping, batch deletion, history, and recovery match the shared editor baseline.
- [x] Existing gas/fraction/Cartesian/town documents migrate without unsolicited storage writes.
- [x] Acceptance evidence exists and regressions are resolved.
- [x] Update `MANUAL_BUILDER_PROCESSES.md`, `CONNECTION_CANVAS_EDITING.md`, and user-facing builder documentation to describe the implemented capabilities and limits.

The release is complete when both new domains support the full create → connect → validate → project → experiment → capture/reset → save/reopen process through the shared composition builder.


## 12. Local completion evidence — 2026-10-05

Baseline revision: `5e685d9`. The working tree already contained the composition builder, gas/fraction parity implementation, feature documentation, and verification scripts, alongside unrelated application edits. Continued from that implementation; preserved the existing edits and did not commit or deploy.

All seven delivery phases are complete for the bounded gas/fraction scope. The shared implementation uses `definitions.ts` for domain contracts, `runtimeState.ts`/`useSceneRuntime.ts` for scoped commands and state lifetime, `DisplayScene.tsx` for direct display editing, and exhaustive legacy conversion in `migration.ts`. It does not add other experiment families.

Acceptance review found and fixed two interaction defects:

- Fraction bars resized to the valid minimum height of 5 had a zero-height piece area. The title and gap now shrink within the display bounds, leaving pieces visible and interactive.
- Selecting an object could insert the Edit selected component button above the SVG during a drag. Reserving that button's space keeps the canvas transformation stable during the gesture.

Medium-width toolbar titles also retain a minimum readable width. Isolated Next.js output directories are ignored by Git.

### Executed checks

All commands ran from `src/web` with pnpm. Browser commands used `BUILDER_BASE_URL=http://127.0.0.1:3197` and local Chrome.

| Command | Result and evidence |
| --- | --- |
| `pnpm test` | Passed: simulation/integration plus builder documents, migration, graph, editor, storage/conflicts, and parity. |
| `pnpm test:builder:parity` | Passed: independent SI pressure expectation, inverse volume and linear temperature, invalid values/units, exact comparisons, arbitrary masks, partition setter policy, rejected action atomicity, permissions, detached drafts, migration/idempotence, projections, copy/delete, and round trips. |
| `pnpm test:builder:parity:browser` | Passed: manual create/connect/save/recovery, multiple objects/canvases, independent commands and resets, capture, direct editing, Escape cancellation, SVG alignment after zoom/resizing, one-step undo/redo, minimum-height piece interaction, learner authoring restrictions, and desktop/medium/mobile layouts. |
| `pnpm test:builder:browser` | Passed: gas/fraction authoring plus Cartesian/town graph regressions. |
| `pnpm test:composition:browser` | Passed again after the shared selection-layout change: multiple planes, pointer wires, dialog geometry editing, calculations, history, disconnection, recovery, town trips, and mobile layout. |
| `pnpm test:canvas:browser` | Passed: shared selection, grouping, group movement, clipboard, deletion, history, context menu, text editing, and unbounded navigation. |
| `pnpm exec tsc --noEmit` | Passed. |
| Scoped `pnpm exec biome check` | Passed for builder source, parity scripts, and the reused fraction system/visual. |
| `APERTUS_BROWSER_TEST_DIR=.next-parity-build pnpm build --webpack` | Passed production compilation, TypeScript, and prerendering, including `/experiments/builder`. |

Default `pnpm build` (Turbopack) was attempted but failed because its loader worker could not bind a local port (`Operation not permitted`), including an escalated retry. The webpack production build passed; this is not a claim that the default Turbopack build passed.

The domain browser captures are in `/tmp/apertus-builder-parity/` (desktop, medium, and mobile for each domain). Existing regression captures are in `/tmp/apertus-graph-browser/` and `/tmp/apertus-canvas-editor.png`. These are local review artifacts, not repository assets.

Runtime lifetime, hidden-animation cleanup, and equivalent renderer ownership are supported by the focused configuration/merge tests, browser lifetime/regression checks, and source review of effect cleanup. This verification uses local Chrome; it does not claim a cross-browser or general accessibility certification. Existing version-1 entries are migrated in memory and saved only through the explicit conflict-aware storage path.
