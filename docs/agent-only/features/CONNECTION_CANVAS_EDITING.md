# Connection Canvas Editing

The Cartesian, town, physical, and diagram composition workspaces support free navigation, multiple selection, saved groups, internal component copy/paste, batch deletion, and labeled undo/redo history.

## Navigation and selection

- Drag empty space or scroll to pan without camera bounds.
- The drawing surface extends roughly 1,000 world pixels beyond the furthest components and expands to cover newly explored space.
- Card positions accept finite coordinates, including negative coordinates, without the previous 3,000-pixel movement limit.
- Click a card heading to select it without opening settings.
- Double-click the heading or click its Edit button to open component settings.
- Shift-click, Ctrl-click, or Command-click toggles additional selections.
- Shift-drag empty space to add intersecting cards to the selection.
- Ctrl/Command+A selects all components; Escape clears selection and transient connection/menu state.

## Component actions

| Action | Shortcut |
| --- | --- |
| Copy selected components | Ctrl/Command+C |
| Paste copied components | Ctrl/Command+V |
| Delete selected components | Delete or Backspace |
| Create a group | Ctrl/Command+G |
| Ungroup | Ctrl/Command+Shift+G |
| Undo | Ctrl/Command+Z |
| Redo | Ctrl/Command+Shift+Z or Ctrl+Y |

Copy, paste, delete, and grouping are also available through the selection toolbar or the right-click menu. Ungroup is available in the right-click menu.

Component copy/paste uses an internal builder clipboard. It does not replace the operating system's text clipboard. Standard text-field editing retains its usual copy, paste, select-all, delete, and undo behavior.

## Groups and batch operations

Groups are flat sets of component identities stored in the experiment's optional `editor.groups` field. Existing documents without groups remain valid. Groups survive draft restoration, local saves, JSON export, and import.

Selecting a member selects its whole group. Dragging a selected card moves the complete selection; dragging a group label moves the selected group and any other selected components. Relative positions are preserved. Creating a group from existing groups merges their membership; ungrouping preserves the components and their connections.

Copying assigns fresh component identities and remaps connections between copied components. Valid connections to uncopied components are retained. Full copied groups receive fresh group identities. Repeated pastes offset graph positions by another 40 world pixels.

Connections that would violate workspace rules remain disconnected in the pasted draft: examples include an extra ground in a scene, duplicate departure times for the same person, an intersection spanning different planes, or a fraction comparison spanning different diagram canvases.

Batch deletion removes the selected components and cleans placements, graph positions, and group membership. Surviving controls and measurements referring to deleted components are disconnected rather than silently removed. Deleted building destinations retain their last entrance coordinates as a fallback for surviving trips.

## History

Each paste, batch deletion, group/ungroup operation, connection change, arrangement, or completed group drag is one labeled document-history action. Undo/redo restores the document snapshot, including connections and groups. A new edit clears the redo branch.

The Action history menu lists applied and undone actions. History is maintained for the current editing session, with up to 100 undo entries. Camera navigation is excluded from document history; undo/redo preserves the current workspace zoom. Continuous settings edits can share an undo entry, and pointer release or focus leaving a field ends that edit group.

## Implementation

- [CompositionGraph.tsx](../../../src/web/src/simulations/builder/composition/CompositionGraph.tsx): selection, drag gestures, context menu, and component shortcuts.
- [editor.ts](../../../src/web/src/simulations/builder/composition/editor.ts): group membership, clipboard remapping, and batch deletion.
- [ConnectionViewport.tsx](../../../src/web/src/simulations/builder/ConnectionViewport.tsx): unrestricted camera movement and expanding drawing surface, shared with legacy builders.
- [Builder.tsx](../../../src/web/src/simulations/builder/Builder.tsx): document snapshots, history menu, and undo/redo shortcuts.
- [document.ts](../../../src/web/src/simulations/builder/document.ts): finite positions and optional group validation.

## Verification

- `npm run test:canvas`: position validation, group expansion, copy remapping, persistence, deletion, and detached references.
- `npm run test:canvas:browser`: selection, group movement, clipboard actions, context menu, shortcuts, selection rectangle, long-distance movement/panning, and mobile overflow.
- Existing builder/composition checks cover compatibility with legacy templates, wiring, live geometry, learner previews, storage, and town behavior.

Physical/diagram-specific contracts and checks are described in [Physical and diagram composition](MANUAL_BUILDER_DOMAIN_COMPOSITION.md). Canvas reset action references are remapped during copy/paste and disconnected when their canvas is removed.

The physical/diagram browser checks also verify direct object drags after canvas zoom and responsive resizing, cancellation, and one-step undo/redo. Selecting an object reserves the Edit selected component toolbar space so selection does not shift the SVG during a drag.
