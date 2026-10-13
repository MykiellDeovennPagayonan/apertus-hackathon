# 011 — Spatial experiment board and immersive 3D implementation plan

Date: 2026-10-05  
Status: proposed implementation plan; no implementation is claimed by this document.  
Scope: spatial presentation in Build and the learner simulation/experiment screen, learner navigation boundaries, and immersive 3D with controller overlays.

## 1. Mandatory design requirements

All implementation, visual decisions, interaction flows, and review criteria in this plan must abide by both design guides:

1. [001 — Experiment builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md).
2. [002 — Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md).

Read both before implementing a phase. They are requirements for this work, not optional background reading. Each phase must demonstrate task clarity, appropriate visual hierarchy, predictable interaction, recoverable edits, and useful responsive behavior.

In particular:

- Keep the experiment content visually dominant. Preserve the recently improved compact toolbars, focused input editor, and spacious component browsing.
- Make authoring placement distinct from interaction with component content.
- Present advanced board and presentation settings through progressive disclosure.
- Use existing application tokens and shared component patterns. Do not introduce a second visual system for board tools or immersive overlays.
- Keep primary actions clear, preserve unfinished input where appropriate, and expose meaningful recovery paths.
- Design empty, selected, editing, dragging, disabled, loading, error, and narrow-screen states alongside the normal state.
- Inspect the running interface and transitions in a browser. Passing model tests alone does not satisfy the design requirements.

If an engineering shortcut conflicts with these requirements, revise the approach or explicitly record the unresolved tradeoff. Do not silently weaken the UX to fit an implementation detail.

## 2. Objective and expected experience

Replace the top-level scrolling experiment presentation with a spatial board. Authors arrange canvas views, controls, results, instructions, and supported groups at deliberate locations. Learners use the authored composition, with navigation governed by the experiment's presentation settings.

The board is effectively infinite during authoring: navigation and placement have no ordinary fixed page edge. Storage and rendering still use finite, validated coordinates and practical zoom limits.

Authors can define an optional rectangular learner area and a starting view. Learners cannot navigate beyond a configured area. A 3D scene can expand to fill the experiment viewport, with selected controls presented as overlays. An immersive-only presentation can omit the learner's return-to-board action.

Example target flow:

1. Add a Cartesian view to an empty board.
2. Place a slope control alongside it and an equation result beneath it.
3. Move and resize these items without changing their connections or model values.
4. Set the learner area around the composition and capture its starting view.
5. Preview the activity at desktop and mobile sizes.
6. Add a 3D scene with a chosen controller overlay.
7. Enter immersive view, interact with the simulation, and return to the previous board view without restarting it.

## 3. Confirmed scope and proposed defaults

The requested direction includes spatial placement, author-defined learner boundaries, immersive 3D, an optional restriction on exiting immersive presentation, and room for controller overlays.

The following defaults are proposed so implementation has a concrete baseline. They are not previously confirmed product decisions and should remain explicit configuration choices:

| Question | Proposed default |
| --- | --- |
| Learner navigation | Pan and zoom within configured bounds. |
| Fixed presentation | Optional per experiment, with an explicit responsive framing policy. |
| New authoring surface | Spatial board for new experiments after rollout gates pass. |
| Existing experiments | Preserve their existing layout until a validated spatial conversion is accepted. |
| Learner area | Optional during authoring; when absent, derive a finite presentation extent from visible content. |
| Initial learner view | Author-set framing when available; otherwise fit the content extent. |
| 3D expansion | User-triggered in ordinary board mode. |
| Immersive-only presentation | Starts in a chosen 3D scene and hides the learner's board-return action. |
| Overlay contents | Explicitly selected existing controls/results; no automatic inclusion of every component. |

Do not interpret immersive-only as permission to trap browser or operating-system navigation. The restriction applies to the experiment's own return-to-board control. Authors must always retain a route back to editing.

## 4. Current architecture and integration points

The current authored document uses `formatVersion: 3`, a recursive `Layout`, and graph editor positions. The experiment wrapper also carries versioned document data and editor metadata. These existing positions describe the Connections graph; they must not become Build positions.

Relevant implementation areas:

| Area | Existing source | Planned responsibility |
| --- | --- | --- |
| Experiment wrapper | `src/web/src/simulations/builder/document/types.ts` | Versioning and integration with authored presentation data. |
| Authored document and layout | `src/web/src/simulations/creation-and-editing/authoring-engine/document.ts` | Spatial presentation schema and references. |
| Document parsing and validation | `builder/document/serialization.ts`, `builder/document/validateDocument.ts`, `runtime/authoring/validate.ts` | Version-aware normalization, validation, and recovery. |
| Build shell | `builder/composition/CompositionBuilder.tsx` | Board tools, selection, settings, and preview entry. |
| Graph navigation | `builder/ConnectionViewport.tsx` | Reference implementation for gesture behavior; extract only truly shared utilities. |
| Graph editing | `builder/composition/CompositionGraph.tsx` | Remains independent; avoid changing its layout semantics. |
| Learner rendering | `components/views/RecipeLesson.tsx` | Shared component rendering hosted by layout, board, or immersive presentation. |
| Runtime state | `runtime/authoring/runtime.ts` | One simulation state across presentation transitions. |
| Overlay infrastructure | `components/views/ControlsOverlay.tsx` | Existing portal target to evaluate for immersive overlays. |
| Editor commands | `builder/editor/` | Atomic placement and presentation operations. |
| History and storage | `builder/history/`, `builder/persistence/` | Undo, save, restore, and compatible recovery. |

Paths abbreviated in the table are relative to `src/web/src/simulations/`. These are integration points, not a requirement to put the entire feature into existing large files.

Before code changes, read applicable `AGENTS.md` instructions and relevant installed framework documentation. Preserve pre-existing working-tree changes. This plan does not authorize discarding unrelated work.

## 5. Separate the coordinate systems and identities

Maintain four explicit concepts:

1. **Connections positions:** graph-node arrangement used for wiring.
2. **Board placement:** the rectangle and stacking order of displayed content.
3. **Board camera:** the viewport's center and zoom.
4. **Component-local state:** chart bounds, object coordinates, 3D camera, and simulation values.

Dragging a board item changes its placement. Dragging a point inside a Cartesian view changes component-local state. Panning the board changes the board camera. None should implicitly rewrite the others.

Use a stable board-item ID distinct from a runtime node ID. A board item should reference a presentation/layout subtree so existing grouping, tabs, disclosures, repeater context, visibility bindings, typography, and disabled state can be preserved. A simple control can be represented by a leaf subtree.

Do not flatten all runtime nodes into visible tiles: resources, models without standalone presentation, and objects already rendered inside a canvas are not necessarily board items.

For the initial release, require each presented subtree to have one normal board host. Reuse in immersive overlays needs an explicit host-switching policy, not accidental duplicate mounting.

## 6. Proposed persisted schema

Introduce a versioned presentation block with a discriminated mode: existing flow layout or spatial board. Final naming and version numbers must be chosen during the schema phase after auditing every consumer.

Conceptual shape:

```ts
type Rect = { x: number; y: number; width: number; height: number };
type Camera = { centerX: number; centerY: number; zoom: number };

type SpatialPresentation = {
  mode: "board";
  items: Array<{
    id: string;
    layoutId: string;
    rect: Rect;
    zIndex: number;
    locked: boolean;
    groupId?: string;
  }>;
  groups: Array<{ id: string; label: string; members: string[] }>;
  learnerArea?: Rect;
  startView: { frame: Rect; alignment: "center" };
  navigation: {
    mode: "bounded" | "fixed";
    minZoom: number;
    maxZoom: number;
  };
  immersive: {
    startup: "board" | "scene";
    sceneItemId?: string;
    allowReturnToBoard: boolean;
    overlays: Array<{
      id: string;
      sceneItemId: string;
      contentItemIds: string[];
      anchor: "left" | "right" | "bottom";
      collapsedByDefault: boolean;
    }>;
  };
};
```

This is a design sketch, not a copy-ready contract. In particular, settle responsive start framing and fixed-view constraints before freezing the schema.

Persist board content and learner presentation settings as authored document data. Keep transient selection, drag previews, open menus, and immersive transition state out of the exported document. Persist the author's last camera separately as editor/session metadata where recovery requires it. Learner panning must not mark the authored experiment dirty.

Validation must reject non-finite coordinates, non-positive dimensions, unsupported zoom ranges, missing references, duplicate hosts, invalid group membership, cyclic groups, and overlays referencing unsupported content. Establish practical numerical limits without presenting ordinary page edges to the author.

Delete, copy, paste, duplicate, group, ungroup, and composite import/export must remove or remap spatial references. The new metadata must not survive as dangling references after its content is removed.

## 7. Migration and compatibility

Audit all strict version checks, canonicalization paths, recipe readers, local persistence, exports, imports, and public lesson loaders before choosing a version bump. A required new field cannot be added safely by updating the TypeScript type alone.

Migration behavior:

- Old documents continue to load in their existing flow presentation.
- Offer a deliberate Convert to board action in Build.
- Convert logical top-level presentation groups into board items, preserving their internal layout and bindings.
- Use deterministic placement and component-family size hints. Do not make serialization depend on a browser measurement being available.
- Allow optional browser measurement to improve a conversion preview, with deterministic fallback for headless and imported documents.
- Show the proposed arrangement before committing. Conversion is one undoable operation.
- Retain a recovery copy or existing recovery mechanism until the new document has been successfully saved.
- Do not silently overwrite historical built-in recipe versions.
- Preserve collapsed sections, hidden content, empty authored containers, and repeaters as meaningful structures.

Define the reverse path explicitly. Arbitrary spatial overlaps cannot be losslessly converted into a linear layout. Retain the original flow representation where appropriate and explain what is preserved before switching back.

## 8. Board camera and navigation

Implement pure, tested geometry helpers before wiring gestures.

For viewport center `V`, camera center `C`, and zoom `z`:

```text
screenPoint = V + (worldPoint - C) * z
worldPoint  = C + (screenPoint - V) / z
```

Use a single transform owner for board placement. Compute dragging and resizing in world coordinates so movement remains correct at every zoom level.

Required behavior:

- Pan on empty workspace and through an explicit pan tool.
- Zoom around the pointer or pinch midpoint while keeping that world point stable, unless boundary clamping prevents it.
- Provide zoom buttons, zoom status, Fit content, and Return to starting view.
- Remember the author camera when switching between Connections and Build.
- Keep camera navigation out of authored undo history; Capture starting view is an explicit document edit.
- Handle pointer cancellation, lost capture, interrupted gestures, and viewport resize without committing partial geometry.
- Keep page-level scrolling disabled only for the board region. Component tables and long text retain deliberate internal scrolling.

Avoid implementing an infinite board as an enormous DOM element with huge native scroll dimensions. Render a viewport and transform the world content within it.

## 9. Gesture ownership and component interaction

Specify an interaction contract rather than resolving conflicts with scattered event propagation patches.

| Gesture/context | Owner and effect |
| --- | --- |
| Drag empty board | Board pans. |
| Drag authoring move handle | Selected board item moves. |
| Drag resize handle | Board item resizes. |
| Drag a slider or scene object | Component receives its normal interaction. |
| Temporary pan modifier on a neutral surface | Board navigation, without changing a component. |
| Wheel over a scrolling table | Table scrolls. |
| Wheel over neutral board | Board navigation according to the documented device mapping. |
| Explicit zoom modifier | Board zoom, unless an active component interaction claims it. |
| Gesture inside an active 3D scene | Scene camera or object interaction. |
| Escape during a drag | Cancel the transient operation before exiting broader modes. |

Finalize trackpad, mouse-wheel, touch, and keyboard mappings in a browser prototype. Display concise help for the chosen gestures. Do not require a modifier-only shortcut for an essential action.

In Build, default to working component content with explicit authoring handles. In the learner view, hide placement handles entirely. A locked board item remains interactive as content unless separately disabled by the experiment.

Keyboard placement must be available through numeric position/size fields and movement commands. Space must not activate panning while the person is typing or using a control that requires it.

## 10. Placement, selection, and grouping

Provide move, resize, multi-select, align, distribute where useful, snap, lock placement, and stacking controls through a compact contextual surface.

Implementation rules:

- Keep pointer-move previews local; commit one history entry on completion.
- Escape restores the pre-drag rectangle.
- Multi-item movement preserves relative offsets.
- Snapping works in world coordinates and has a discoverable toggle.
- Minimum dimensions come from presentation requirements of component families.
- Resizing a viewport never changes a model's physical dimensions or values.
- Board groups are independent of runtime/composite ownership and graph groups.
- Copy/paste remaps item references and offsets placements without detaching bindings.
- New content appears in the visible authoring region when possible, with a predictable non-overlapping placement strategy.
- A component added to an existing canvas stays an object inside that canvas unless it has a separate presentation role.

Selection tools must not shift the board or obscure its primary interaction area. Keep numeric geometry fields in settings instead of permanently surrounding every component.

## 11. Learner area, starting view, and navigation limits

Use a focused Edit learner area mode with visible bounds, resize handles, numeric dimensions, and a dimmed outside region. Authors remain able to navigate outside the area.

Provide Set area from content, Capture starting view, and Preview learner navigation. Saving a boundary with required content outside it must produce an actionable explanation, not silently hide that content.

For a learner rectangle `[left, right] × [top, bottom]`, viewport width `W`, height `H`, and zoom `z`, the visible world dimensions are `W/z` and `H/z`. When the viewport fits inside the rectangle, clamp the camera center to:

```text
centerX ∈ [left + W/(2z), right - W/(2z)]
centerY ∈ [top  + H/(2z), bottom - H/(2z)]
```

When the viewport is larger than the permitted area on an axis, center that axis and use neutral letterboxing/masking. Do not expose outside authored content or produce reversed clamp ranges. Apply boundary constraints after pan, zoom, pinch, orientation change, resize, start-view restore, and immersive exit.

Bounds are presentation constraints, not a security boundary for document contents. Content that must not be delivered to a learner needs a separate data/publication policy.

Resolve the fixed-view tradeoff explicitly: fitting a large board can make controls unreadable. For the first release, either require a suitable authored frame with a readable compact presentation or flag the incompatible viewport and provide an author correction path. Do not silently enable navigation when fixed mode forbids it, or shrink interactive controls without a minimum usability policy.

## 12. Shared component rendering and runtime continuity

Extract or expose a reusable presentation host from the existing lesson renderer while retaining its binding, visibility, disabled-state, theme, and layout behavior.

A board host supplies geometry and authoring chrome. A component supplies its content and domain interaction. Immersive presentation supplies a different viewport and overlay host. All use the same experiment runtime instance and command pathways.

Do not recreate the runtime when:

- Panning or zooming the board.
- Moving or resizing a view.
- Selecting a component.
- Opening presentation settings.
- Entering or leaving immersive presentation.

Reparenting rendered content can remount local component state. Prototype the hosting strategy with a stateful control and a running 3D scene before committing to portals or conditional rendering. Preserve local camera and draft state explicitly where mounting continuity cannot be guaranteed.

## 13. Immersive 3D presentation

Distinguish application immersive mode from optional browser fullscreen. The required feature is a scene that fills the experiment viewport. Browser fullscreen is a separate enhancement whose platform behavior must be verified during implementation.

Normal transition:

1. Capture the board camera and focus return target.
2. Promote the selected supported scene to the immersive host.
3. Preserve simulation time, object state, scene camera, and active values.
4. Mount or transfer the configured overlay content without duplicate controllers.
5. On exit, restore the board camera, reclamp for the current viewport, and restore sensible focus.

Immersive-only presentation starts directly in the selected scene. `allowReturnToBoard: false` removes the learner's in-app board-return action. It must not remove access to overlay controls, required lesson navigation, author editing, or platform escape behavior.

Validate missing scenes, unsupported scene types, deleted overlay references, and invalid startup combinations before publishing/running. If scene initialization fails, show a useful recovery surface instead of an empty trapped viewport.

Escape handling must have a defined priority: active popup or dialog, transient component interaction, then immersive exit if permitted. Do not globally intercept Escape to enforce an application presentation preference.

## 14. Controller overlays

Authors choose controls, observations, and supported instructional content for each immersive scene. Store references to existing content rather than copying values or creating independent controller instances.

First-release placements: left, right, and bottom. Each overlay supports a clear title when useful, a collapse affordance, and a readable compact arrangement. Start with anchored layouts rather than arbitrary draggable overlays.

Requirements:

- Reserve usable scene area where controls would otherwise cover essential content.
- Make the relationship between an overlay and its scene unambiguous.
- Prevent overlay pointer gestures from rotating or dragging the scene underneath.
- Keep essential controls reachable when a panel is collapsed.
- Respect narrow viewports, orientation changes, and safe-area insets.
- Bound and scroll long overlay content internally; do not let it displace the scene indefinitely.
- Keep reset scope explicit: board view, scene camera, and experiment reset are different actions.
- Preserve drafts, bindings, and runtime continuity through overlay transitions.

For mobile, prefer a compact bottom surface with an explicit expanded state. Do not cover most of the scene permanently with the desktop side panel.

## 15. Performance and accessibility requirements

Separate camera updates and drag previews from document mutations. Avoid serializing the entire experiment on every pointer event.

Measure a representative multi-view experiment before selecting optimization thresholds. Record frame behavior, interaction latency, DOM/render cost, and runtime continuity on documented hardware. Offscreen presentation culling must not stop simulation stepping or discard local state accidentally.

Maintain a component navigator with search and a stable keyboard order independent of arbitrary spatial coordinates. Focusing an offscreen item should reveal it within learner bounds. DOM traversal should follow an intentional authored or documented reading order, not stacking order.

Support keyboard alternatives to drag/resize, visible focus, semantic controls, reduced motion, and useful announcements for committed placement changes. Preserve browser zoom. Validate touch targets and contrast rather than assuming compact toolbar styling satisfies them.

Do not declare a universal accessibility or performance pass from a single desktop screenshot.

## 16. Delivery phases and exit gates

### Phase A — Architecture and interaction prototype

Audit document consumers and rendering ownership. Prototype one scene, slider, result, and instruction block on a viewport. Resolve gesture ownership and demonstrate transition into and out of a 3D host.

Exit gate: reviewed desktop and mobile captures; written decisions for fixed-view framing, versioning, and host continuity; no production data migration yet.

### Phase B — Schema, validation, and commands

Implement version-aware presentation data, reference validation, pure geometry helpers, and atomic placement commands. Extend lifecycle operations and serialization.

Exit gate: round-trip fixtures, malformed metadata rejection, copy/delete/remap coverage, independent graph/board positions, and old-document compatibility pass.

### Phase C — Spatial Build authoring

Implement board navigation, placement handles, resizing, selection, grouping, settings, and insertion placement. Integrate the current input editor and library without regressing their flow.

Exit gate: a complete authoring scenario survives undo/redo and save/reload; component gestures remain correct at multiple zoom levels; narrow layouts have reachable tools and no page overflow.

### Phase D — Learner presentation and limits

Implement the shared board renderer, starting view, boundary editing/preview, camera clamping, and proposed navigation modes. Add the explicit legacy conversion workflow.

Exit gate: boundaries hold across all navigation and resize paths; converted lessons retain content and bindings; learner navigation does not mutate the authored document.

### Phase E — Immersive scenes and overlays

Implement scene promotion, startup policy, return policy, overlay configuration, error recovery, and runtime/focus preservation.

Exit gate: ordinary and immersive-only scenarios both work; overlays remain usable on mobile; entering and exiting never creates duplicate runtimes or resets the experiment unexpectedly.

### Phase F — Rollout and design review

Run complete regression checks, production build, performance scenarios, and visual review against both design guides. Enable the board for new experiments only after the preceding gates pass. Preserve legacy loading and document recovery paths.

Exit gate: evidence is recorded in this document or an adjacent verification report, with known limitations and tested environments. Do not label a phase implemented before its required behavior and checks are complete.

## 17. Verification matrix

| Area | Required scenarios |
| --- | --- |
| Geometry | Coordinate round trips; pointer-centered zoom; negative positions; extreme valid zoom; viewport larger than boundary. |
| Editing | Move/resize at different zooms; cancellation; multi-select; snapping; locking; one history entry per completed gesture. |
| Lifecycle | Copy/paste; delete; group/ungroup; composite import/export; missing-reference recovery. |
| Compatibility | Legacy flow documents; old recipe versions; conversion preview; conversion undo; new-document round trip. |
| Gestures | Slider drag; chart pan; table scroll; text selection; 3D orbit; board pan; touch cancellation. |
| Learner limits | Each edge/corner; zoom out; pinch; viewport resize; starting-view restore; immersive exit. |
| State | Unsaved field draft; running simulation; paused simulation; local scene camera; no dirty state from learner navigation. |
| Immersive | Enter/exit; startup in scene; disabled board return; unsupported/missing scene; overlay failure recovery. |
| Responsive | 1440px desktop; 1024px tablet; 390px and 320px mobile; short landscape viewport; increased text/browser zoom. |
| Accessibility | Keyboard navigation; reachable offscreen content; focus restoration; visible states; touch targets; screen-reader labels. |
| Visual | Default/selected/dragging states; empty board; boundary editor; component settings; mobile overlays. |

Add focused command tests under `src/web/scripts/builder/` and browser scenarios under `src/web/scripts/`, following existing test-loader and browser conventions. Register durable suites in package scripts when implemented. Use isolated Next output directories for previews/builds and clean up generated configuration changes afterward.

The current builder, composition, public-catalog, spatial-catalog, and UX regression suites remain required coverage. Run TypeScript, scoped lint/format checks, appropriate full tests, and a production build before rollout. Record exact commands and outcomes when executed; this plan does not claim those future checks have passed.

## 18. Explicit exclusions and follow-up work

Initial delivery does not include collaborative editing, arbitrary board rotation, freeform/nonrectangular learner boundaries, multiple boards per experiment, animated camera tours, or arbitrary floating overlay placement. Consider these only after the core interaction contract is stable.

A minimap and named navigation bookmarks are later candidates if large experiments demonstrate a real navigation need. Avoid permanent UI for hypothetical complexity.

The feature is complete when authors can deliberately compose a spatial experiment, learners can operate it within the intended navigation limits, and immersive scenes preserve the same experiment state with accessible controls. The resulting experience must satisfy both linked design philosophies as well as the technical contracts above.
