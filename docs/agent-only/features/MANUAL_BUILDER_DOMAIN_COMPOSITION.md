# Physical and diagram composition

The physical canvas and diagram now use the same composition builder as Cartesian and town. The supported domain vocabulary is gas containers and fraction bars; these canvases are not general physics or drawing editors.

## Components and relationships

A new document contains an empty workspace. Canvas, object, control, and measurement components can be created independently and saved before connecting them.

- A physical canvas accepts independent gas containers, each containing one gas sample.
- A diagram canvas accepts independent fraction bars, each representing one equal whole.
- A display connection places one object on one canvas.
- Numeric controls and toggles bind to an instance property.
- Action buttons bind to fraction subdivision or a canvas reset action.
- Readouts observe typed outputs. A fraction comparison accepts two distinct bars on one canvas.

Canvases use one scene kind per document. Up to eight canvases, 64 objects, 40 controls, and 40 measurements are supported. Moving a bar across canvases is rejected if it would break a connected comparison. Disconnect the comparison first.

`definitions.ts` declares scene compatibility, domain schemas/defaults, gas property contracts from the existing gas schema, action contracts, and output types/units. Existing model and workspace validators enforce these definitions independently of the graph UI. New action controls carry an explicit action binding; old numeric/toggle controls remain readable.

## Gas

Each container owns amount (mmol), temperature (K), volume (L), and whether particle illustration motion is playing. Pressure (kPa) is calculated by the existing `IdealGasSystem`, including its validated unit conversion. Particles are a seeded representative illustration, not the source of pressure.

Each container has independent display bounds and particle visibility. Display resizing does not set physical volume. Gas control ranges derive from `gasInputSchema`; binding defaults and persisted units are validated against that contract.

## Fractions

A fraction bar owns a boolean shading mask containing 1–12 pieces. Partition count is the mask length, and numerator is the number of shaded pieces. Exact fraction and decimal outputs derive from this one state. Pair comparisons use the existing exact fraction comparison helper.

Subdivision repeats each piece's shading by the configured integer factor and preserves quantity. It rejects results exceeding 12 pieces without modifying state. The existing fraction system exports `updateFractionBar()` for both legacy boards and independent bars; composition does not manufacture a temporary comparison board.

Changing partition count is a different operation. It reconstructs a prefix-shaded mask with `min(previous numerator, new denominator)` shaded pieces and may change quantity. Settings explain this distinction. Direct shading validates the piece index and enforces the bar's learner permission in the runtime command path.

Display widths may differ; they do not alter the fraction or the equal-whole assumption. Arbitrary shading patterns survive subdivision, capture, reset, and serialization.

## Runtime ownership

`projectedScene()` includes objects placed on one canvas, their controls, and complete measurements. A paired measurement appears only when both inputs are present. Reset actions are projected to the corresponding canvas runtime.

`useSceneRuntime()` owns each canvas's transient state. It does not activate the legacy singleton gas/math sessions. `runtimeState.ts` stages domain commands and validates candidates before publication. The rendering and measurements read the same accepted object state.

Labels, colors, display bounds, permissions, particle visibility, graph navigation, and binding/panel changes preserve current domain state. Authored domain configuration changes reset the affected canvas to its new starting configuration. Other canvases continue independently. Moving an object to another canvas initializes it there from authored starts.

Hidden previews pause town and gas animation. An open settings visual remains active; it shares the domain runtime with the preview. Animation callbacks are disposed on unmount and change. Particle positions are excluded from authored documents and capture.

## Direct authoring

`DisplayScene.tsx` supplies a shared SVG presentation editor for both domains:

- Move using the object's title strip; resize using the selected corner handle.
- Arrow keys move/resize handles; Shift increases the increment.
- Pointer coordinates use the inverse SVG screen transformation.
- Preview movement is calculated from the drag's initial geometry with configurable snapping and bounded coordinates.
- Escape, pointer cancellation, or lost capture restore the starting display geometry.
- Release commits one document edit. Display commits preserve authored gas inputs and fraction shading, even after runtime experimentation.
- Selecting an object keeps the canvas in the same layout position during a drag. Minimum-height fraction bars retain visible, interactive pieces.
- Pan/zoom and Reset view affect local viewport navigation only.

Learner rendering has no author handles or capture action. Learners can use the authored property/action controls and permitted fraction shading, then Reset experiment to restore starts. Authors explicitly capture experimental domain values with **Use current settings as starting values**.

## Editing and storage

Both domains inherit shared connectors, settings dialogs, selection, grouping, copy/paste, history, and recovery. Removing a target disconnects surviving controls/readouts rather than deleting them. Copying remaps internal IDs and canvas action references; invalid cross-canvas pair bindings remain detached.

New composition documents use document, scene, and workspace version 2. Version-1 documents still validate and migrate when opened. Gas and fraction migrations preserve resolved starts, control/result identities and labels, layout, units, precision, visibility/shading permissions, and usable graph positions/groups. Deterministic identity allocation avoids collisions with legacy component IDs.

Physical/diagram documents and canvases carry display viewport settings without a town clock. Cartesian/town compatibility retains their existing settings. Supported migrations clone the source and are idempotent; opening a saved record does not rewrite it. Explicit saves use the existing Web Lock, expected-record conflict check, and single library replacement. Unknown future entries remain retained.

When only legacy fraction values exist, migration creates the same prefix-shaded masks as the old loader. Unstored historical shading patterns cannot be recovered.

## Verification

- `npm run test:builder:parity`: migration, ID collisions, detached drafts, units, mathematics, permissions, staged commands, runtime/display lifetimes, pair constraints, copy/delete, and round trips.
- `npm run test:builder:parity:browser`: real setup, connectors, detached draft save/recovery, multiple gas canvases, three fraction bars, measurements, independent commands/reset, capture, drag cancellation, SVG alignment after zoom/resizing, one-step undo/redo, minimum-height pieces, learner permissions, and desktop/medium/mobile layout.
- Existing composition/canvas checks cover Cartesian and town regressions plus shared editor operations.

Browser scripts accept `BUILDER_BASE_URL`; their default port is 3000. Captures from the parity script are written to `/tmp/apertus-builder-parity/`.

Local acceptance passed on 2026-10-05, including simulation/integration and existing Cartesian/town/editor browser regressions, TypeScript, and scoped lint. Production build passed with `pnpm build --webpack`; the default Turbopack build encountered a local loader-worker port permission error. See [the completed plan](../implementation/007-MANUAL_BUILDER_COMPOSITION_PARITY.md#12-local-completion-evidence--2026-10-05) for actual commands, outcomes, and verification limits.
