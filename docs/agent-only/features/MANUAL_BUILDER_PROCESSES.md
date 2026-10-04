# Manual Builder Processes

The manual builder is organized around an experiment document that describes components and their relationships. The connection graph, settings dialogs, and live Cartesian plane are different ways to view or change that document.

Its flexibility comes from treating the plane, objects, controls, and results as independent pieces. Authors compose those pieces through connections, and the resulting relationships drive the working lesson.

This walkthrough follows a concrete example: two lines on a Cartesian plane, a slider controlling one line's slope, and a readout showing their intersection.

## 1. Creating an experiment

Setup chooses the experiment type and presentation layout. A Cartesian experiment document holds:

- **Objects:** Lines and squares, including their starting geometry and appearance.
- **Controls:** Sliders, number inputs, and toggles with property bindings.
- **Measurements:** Equations, areas, intersections, and other supported outputs.
- **Workspace:** Canvases, object placements, and canvas arrangement.
- **Lesson content:** Title, instruction, and explanation.
- **Editor metadata:** Connection card positions and workspace zoom.

These have separate responsibilities. Moving a line's card in the connection workspace changes editor metadata. Moving its endpoint on the plane changes mathematical geometry. Authors can therefore arrange the workspace without changing the lesson's mathematics.

The document model and validation are implemented in [document.ts](../../../src/web/src/simulations/builder/document.ts).

## 2. Adding components before connecting them

Adding a line creates an object with a unique ID, two points, a label, and drawing settings. Adding a slider creates a control with no target yet. Adding an intersection creates a measurement with two initially empty inputs.

A component can exist while the author decides where it belongs. Incomplete connections are accepted in drafts, and the builder reports which connections remain to complete.

The graph generates a card for each component and derives ports from its capabilities:

- A line accepts slope and intercept changes.
- A line provides geometry, calculated outputs, and a line source for intersections.
- A plane accepts geometry.
- An intersection accepts two lines.

Cards are initially packed into columns by role. Their spacing accounts for port count and card height. Adding a component checks for overlap and reveals its card in the workspace.

Component creation is coordinated by [CompositionBuilder.tsx](../../../src/web/src/simulations/builder/composition/CompositionBuilder.tsx). Object definitions and capabilities live in [model.ts](../../../src/web/src/simulations/builder/composition/model.ts).

## 3. Connecting ports changes the experiment

The graph distinguishes three kinds of relationship:

| Connection | Purpose |
| --- | --- |
| Display | Places an object on a canvas |
| Changes & trips | Binds a control to a property or connects town behavior |
| Observations | Connects a calculated output to a measurement |

Connecting a line's geometry output to a plane records a relationship equivalent to:

```text
placements[lineId] = canvasId
```

Connecting the slider to that line's slope records:

```text
slider.target = lineId
slider.property = "slope"
```

Connecting two lines to an intersection records:

```text
intersection.target = firstLineId
intersection.other = secondLineId
intersection.output = "intersection"
```

These stored relationships are the source of the visible wires. The graph reads the document and reconstructs its connections. Reconnecting a port changes actual experiment behavior; the same slider can target a different compatible object without rebuilding its UI.

The connection operations are implemented in [graph.ts](../../../src/web/src/simulations/builder/composition/graph.ts).

## 4. Connector interaction

Authors can drag an output to an input or click an output followed by an input. During connection selection, compatible destination cards are highlighted. A temporary wire follows the pointer during dragging, and Escape cancels the operation.

The wires use curved SVG paths. Separate hit areas make them easier to select, and keyboard activation is supported. Selecting a wire exposes a disconnect action that removes the corresponding document relationship.

Moving cards updates wire positions because their endpoints are calculated from the cards' current port positions. Workspace zoom is accounted for when translating pointer movement into card movement.

The interaction is implemented in [CompositionGraph.tsx](../../../src/web/src/simulations/builder/composition/CompositionGraph.tsx), with shared navigation in [ConnectionViewport.tsx](../../../src/web/src/simulations/builder/ConnectionViewport.tsx).

## 5. Validation at multiple stages

While choosing a connection, the builder checks whether it makes sense. When committing it, the builder checks again before updating the document. The updated document then undergoes broader validation.

For the two-line example, validation checks that:

- The slider is numeric and slope is a numeric property.
- The line has a finite slope.
- The starting slope fits the supported range.
- The intersection uses two distinct lines.
- Both lines share a plane once placed.

Connecting a control also fills in suitable minimum, maximum, and step values from the target property's definition.

Moving a line to another plane is rejected when it would break an existing intersection relationship. The author must resolve that relationship first.

These checks provide useful defaults and immediate feedback. Document validation also checks imported documents and settings edits independently of the connector UI.

Connection checks live in [graph.ts](../../../src/web/src/simulations/builder/composition/graph.ts); workspace validation lives in [workspace.ts](../../../src/web/src/simulations/builder/composition/workspace.ts).

## 6. Assembling a runnable scene for each canvas

Before rendering a preview, `projectedScene()` builds a scene for each canvas. It:

1. Selects the objects placed on that canvas.
2. Includes controls targeting those objects or that canvas's town clock.
3. Includes measurements whose required objects are present.
4. Attaches the canvas's settings and clock configuration.
5. For town scenes, assembles connected trip components into each person's schedule.

An intersection is included only when both lines are present in the projected scene.

Each canvas receives its own runtime state. Several planes can belong to one authored workspace while operating as separate experiments, with independent bounds and settings. The workspace supports up to eight canvases, arranged side by side or stacked. Its canvases must use the same space kind as the scene.

Projection is implemented in [workspace.ts](../../../src/web/src/simulations/builder/composition/workspace.ts), and preview assembly in [CompositionLesson.tsx](../../../src/web/src/simulations/builder/composition/CompositionLesson.tsx).

## 7. Updating geometry through a control

Changing the slope slider follows this process:

```text
Slider value
    → runtime command
    → validate property and value
    → update line points
    → render updated line
    → calculate updated intersection
```

The line is represented by two points. When slope or intercept changes through a control, the implementation reconstructs those points as:

```text
A = (0, intercept)
B = (1, slope + intercept)
```

This gives the line the requested equation. The renderer draws from runtime geometry, and the measurement reads from the same geometry. The drawing, equation, and intersection therefore remain tied to one mathematical state.

Storing lines as points also supports vertical lines naturally. Their equation can be displayed as `x = constant`, while slope and intercept controls are rejected because those values are not finite.

Intersection calculations distinguish parallel lines from coincident lines and return appropriate messages rather than misleading coordinates.

Property updates are implemented in [model.ts](../../../src/web/src/simulations/builder/composition/model.ts). Result calculations live in [measurements.ts](../../../src/web/src/simulations/builder/composition/measurements.ts).

## 8. Dragging geometry on the Cartesian plane

Dragging an endpoint follows a continuous preview and final commit process:

1. Capture the pointer and retain the object's geometry at the start of the drag.
2. Convert screen coordinates into SVG coordinates using the inverse screen transformation.
3. Convert SVG coordinates into mathematical coordinates.
4. Apply configurable snapping and coordinate limits.
5. Construct updated geometry and validate it through the runtime.
6. Update the preview while dragging.
7. On release, commit the geometry to the authored document when authoring is enabled.

Movement is calculated from the original drag state, avoiding repeated accumulation of small movement errors. The coordinate conversion keeps interaction aligned when the SVG resizes.

Lines expose two endpoint handles and support moving the whole line. Squares expose center, resize, and rotation handles. Arrow keys move line endpoints and square centers.

Both axes share a scale, preserving the shape of squares. Thin lines have wider invisible selection areas. Geometry is clipped to the plotting region, while selected handles are rendered separately.

Pan and zoom change local viewing bounds. Reset restores the authored bounds. Grid tick intervals adapt to the visible range using readable steps based on 1, 2, 5, and 10.

The plane and its interaction logic are implemented in [CartesianScene.tsx](../../../src/web/src/simulations/builder/composition/CartesianScene.tsx).

## 9. Authoring and experimentation have different lifetimes

The runtime keeps learner interactions separate from authored starting configuration.

Learners can change controls and drag permitted objects, then reset to the authored starting state. Those interactions do not commit new starting geometry to the document.

Authors can experiment with controls and explicitly select **Use current settings as starting values** to capture the runtime state. Geometry edits made through authoring handles commit directly at the end of the interaction.

The runtime distinguishes configuration changes from many presentation changes. Updating a label or line color can refresh the display while preserving current runtime geometry. Changing authored geometry establishes new starting configuration.

The distinction is implemented in [useSceneRuntime.ts](../../../src/web/src/simulations/builder/composition/useSceneRuntime.ts), with capture and authoring behavior coordinated by [CompositionLesson.tsx](../../../src/web/src/simulations/builder/composition/CompositionLesson.tsx).

## 10. Editing, undo, and recovery

Document edits operate on a cloned document. The builder records undo history, clears redo history after new edits, and validates the result. Grouped edits can share an undo step.

The builder maintains both the current document and the last valid document. If an edit produces an invalid configuration, the preview continues using the last valid version and shows an error.

Draft autosaving stores both versions. Recovery can restore the valid experiment while retaining an incomplete copy for repair. Before replacing the current work, the builder attempts to preserve a recovery copy under a separate saved identity.

Graph zoom is treated as editor navigation metadata and does not create an undo step.

These processes are coordinated in [Builder.tsx](../../../src/web/src/simulations/builder/Builder.tsx).

## 11. Saving and importing

Explicit saving validates and snapshots the document. It uses a browser lock to coordinate library updates across tabs and compares the current saved entry against the version the editor expects.

If another tab changed that entry, saving reports a conflict rather than silently overwriting it. The complete library record is replaced with one `localStorage.setItem()` call. Unsupported stored entries are retained.

JSON export provides a portable copy. Import parses and validates documents. Existing line and town examples can be migrated into editable composition components when opened. Invalid imported text is retained for repair and retry.

Local saving is implemented in [storage.ts](../../../src/web/src/simulations/builder/storage.ts), and legacy conversion in [migration.ts](../../../src/web/src/simulations/builder/composition/migration.ts).

## 12. Trying the lesson

Saving a draft permits unfinished connections. Trying the lesson requires a title, instruction, and completion of the required workspace connections.

The builder then uses the same lesson renderer with authoring disabled. This keeps the preview and learner experience closely aligned while applying learner interaction permissions.

Completion checks are implemented in `validateRunnableDocument()` in [document.ts](../../../src/web/src/simulations/builder/document.ts).

## 13. Physical canvases and diagrams

Physical and diagram workspaces now follow this same component process. Add empty canvases, independent gas containers or fraction bars, generic property controls/action buttons, and separate readouts/comparisons. Each canvas has its own runtime; new documents use version 2 while old gas/fraction documents migrate in memory on opening.

Display placement and size are separate from physical volume and fraction quantity. Gas pressure uses the existing ideal-gas system. Fractions use one authoritative shading mask and exact comparison; subdivision preserves value. Display handles commit geometry without capturing experimental domain values. Explicit capture persists gas inputs or the exact fraction mask.

Display drags keep the canvas layout steady when selecting an object, support cancellation without changing authored geometry, and create one undo entry on release. Even a fraction bar resized to its minimum height retains interactive pieces.

See [Physical and diagram composition](MANUAL_BUILDER_DOMAIN_COMPOSITION.md) for contracts, migration, permissions, editing, and verification details.

## Why the process feels flexible

Components declare their capabilities. Connections establish explicit relationships. The workspace assembles those relationships into scenes. One runtime state drives both geometry and measurements.

This lets authors edit what learners manipulate, where it appears, and what gets measured through a consistent set of concepts. The current Cartesian component vocabulary is bounded to lines and squares, but the separation between model, relationships, rendering, and runtime provides clear places to extend it.

## Exploration scope

The original Cartesian walkthrough was based on source-code inspection. Physical/diagram parity was subsequently implemented and has separate domain, integration, and browser checks; see the domain composition feature document for commands and scope.
