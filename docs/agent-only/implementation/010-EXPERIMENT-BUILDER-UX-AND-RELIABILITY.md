# Experiment builder: UX and reliability improvement plan

Date: 2026-10-05  
Status: R1–R9 implemented and verified.

## R5–R9 implementation evidence

Implemented on 2026-10-05 for the requested R5–R9 scope.

- **R5:** Card eligibility and final insertion now use one clone-based insertion planner. It validates destinations, external bindings, authored-document validity, and runtime construction before an edit is accepted. Stale canvas choices remain visible with a direct recovery action, and rejected plans leave the document and history unchanged.
- **R6:** Details open in a focused library view with a contents schematic, grouped component list, declared connections, parameters, assumptions, insertion summary, and Add action. Returning restores the result query, scroll position, and originating control; details never mutate the experiment.
- **R7:** Import is a dedicated file/drop workflow with filename and progress states, parse and validation feedback, metadata/component/dependency review, retained JSON recovery, explicit duplicate-copy handling, immediate reveal of the saved entry, and same-file retry support.
- **R8:** Builder operations use severity-aware feedback with local alerts, quiet success status, readable recovery text, sanitized primary messages, stable diagnostic codes, and copyable technical details. Rejected edits say that the experiment is unchanged, and connection errors remain in the connection workspace.
- **R9:** Build is a bounded, responsive lesson surface using shared application tokens. Authoring shows component labels, edit actions, selection outlines, actionable disconnected placeholders, and intentional empty-layout placeholders. Runtime actions live together in a footer. Canvas reuse removes newly emptied generated wrappers while preserving authored empty containers.

Verification completed:

- `pnpm test` — full suite passed, with R5–R9 insertion, import identity, diagnostics, and layout-pruning contracts added to `verify-builder-ux-reliability.cjs`.
- `./node_modules/.bin/tsc --noEmit` and scoped Biome checks passed.
- `node scripts/verify-builder-ux-reliability-browser.cjs` — import recovery/review/duplicate-copy handling, focused details, Build authoring, visible primitive Line, editing, wiring, history, persistence, and responsive layouts passed.
- `node scripts/verify-unified-builder-browser.cjs` and `node scripts/verify-spatial-catalog-browser.cjs` — broader builder and spatial authoring regressions passed. Desktop Build and import Details screenshots were visually inspected.
- `APERTUS_BROWSER_TEST_DIR=.next-builder-r5-r9 ./node_modules/.bin/next build --webpack` — production compilation, type checking, and static generation passed.

## R1–R4 implementation evidence

Implemented on 2026-10-05 for the requested R1–R4 scope.

- **R1:** Compact, accessible pencil actions; two-line node names without changing port geometry; editable document title with undo/redo; visible save state; secondary document actions with keyboard dismissal; Connections/Build segmented control; compact graph utilities; deliberate mobile controls down to 320px. Removed overlapping builder-wide button styling and consolidated the affected toolbar styles.
- **R2:** Explicit discovery metadata independent of runtime IDs, with audited single-object definitions marked by their registry adapter. Basic objects precede controls, displays, canvases, models, resources, composites and experiments. The library has persistent search/filters, section navigation and counts, concise cards, authored summaries, empty-result recovery, and focused Details with restored query, focus and scroll position. Eligibility checks reuse insertion commands and cache results while browsing.
- **R3:** Line adds one object to a compatible plane. Line exploration is a curated version-2 activity with seven components: line, plane, slope/intercept sliders, reset, equation and slope results. Its original 14-component version 1 remains resolvable. Square and fraction-bar activities have distinct exploration titles. Stable definition and recipe IDs are preserved.
- **R4:** Component and group positions share validation, synchronization and lifecycle rules. Declared composite ports persist, project before boundary wiring exists, resolve to real child endpoints, and can be edited through Expose inputs and outputs. Existing boundary ports remain visible. Optional ports can be connected afterward; legacy required insertion bindings keep their existing behavior. Compatible explicit canvas wiring carries the object's runtime scope and its controls together. Copy/export remap group positions and interfaces; ungroup/delete remove stale metadata; paste preserves occupied singleton destinations.

Verification completed:

- `pnpm test` — full suite passed, including `verify-builder-ux-reliability.cjs`.
- `./node_modules/.bin/tsc --noEmit` — passed.
- Scoped Biome checks and `git diff --check` — passed.
- `node scripts/verify-unified-builder-browser.cjs` — full manual-builder flow passed.
- `node scripts/verify-spatial-catalog-browser.cjs` — spatial/3D authoring regression passed.
- `node scripts/verify-builder-ux-reliability-browser.cjs` — title history, menu dismissal, discovery ordering, Line/activity distinction, Details focus and scroll restoration, empty results, pointer/touch/keyboard/double-click editing, declared-port wiring, move/arrange/undo/redo, interface editing, expand/collapse, save/reload, copy/paste/ungroup, and 1440px/390px/320px layouts passed.
- `APERTUS_BROWSER_TEST_DIR=.next-builder-ux-build ./node_modules/.bin/next build --webpack` — production compilation, type checking and static generation passed.
- `node scripts/builder/audit-public-catalog.cjs` — refreshed the source ledger.

Desktop and mobile screenshots were inspected. The dedicated browser regression is included in `test:builder:browser` and can also be run with `test:builder:ux`. The investigation below is retained as the original rationale and follow-up plan; its original observations describe the pre-implementation state.

## Purpose and scope

Improve the experiment builder as a complete authoring experience: discover components, understand what will be inserted, place and connect them, configure their behavior, compose the lesson, recover from errors, and save the result.

This document records the user's nine screenshot concerns and the nine recommendation areas from the code review. The original request used seven numbered points, with several concerns combined. The nine concerns below are organized by the nine supplied screenshots so none are lost.

The connections canvas already has a useful interaction foundation. Preserve its working navigation, selection, and wiring behaviors while improving the surrounding controls and repairing the documented failures.

### Evidence and limitations

- Reviewed the current working tree, including existing uncommitted builder and catalog changes. Those changes predate this document and must be preserved.
- Ran `node scripts/builder/verify-unified-builder.cjs` from `src/web`; the existing checks passed.
- Ran targeted in-memory diagnostics through `scripts/test-loader.cjs` for primitive insertion, composite insertion, collapsed graph ports, and group position validation.
- Confirmed 154 registered public definitions and 41 built-in recipes in the reviewed state. These counts are observations, not limits or future acceptance criteria.
- Confirmed that the generated Line recipe has 14 nodes.
- Confirmed that a primitive Line inserts onto an existing Cartesian canvas with the correct attachment.
- Confirmed that an independently inserted Line recipe has zero exposed graph inputs and outputs when collapsed, while insertion onto an existing canvas produces an output for the already-created boundary connection.
- Confirmed that storing a collapsed group's position causes `invalid editor position` validation failure.
- Confirmed that insertion with a missing destination ID raises `The destination canvas is no longer available.`
- The exact preceding actions behind screenshot 6 and the full authored document behind screenshot 7 were not available. Their precise histories were not reproduced in a browser. Related code paths are identified below without treating inference as confirmation.

## The nine user concerns

| ID | Screenshot | Concern | Relevant recommendation sections |
| --- | --- | --- | --- |
| U1 | 1 | The Edit button is awkward; the top controls interrupt the application's clean visual design. | R1 |
| U2 | 2 | The Add component modal is bland, poorly spaced, difficult to browse, and does not clearly distinguish primitives from composites. Long scrolling needs sections. | R2, R3, R5 |
| U3 | 3 | Individual cards repeat text, have weak hierarchy, expose low-value technical detail, and use unattractive disclosure controls. | R2 |
| U4 | 4 | Import is an essentially unstyled native file input. | R7 |
| U5 | 5 | Preview contents appears not to work. | R6 |
| U6 | 6 | Errors are unclear, poorly placed, and do not look like errors; the destination-canvas message gives no useful recovery. | R5, R8 |
| U7 | 7 | Build mode produces an unattractive, disjointed page with empty panels and confusing content. | R9 |
| U8 | 8 | Composite interactions fail with a raw identifier and `invalid editor position`. | R4, R8 |
| U9 | 9 | A supposedly simple Line has 14 children and cannot be connected as expected to the Cartesian plane. Composite insertion and connection behavior are confusing. | R3, R4, R5 |

## R1. Refine the connections toolbar and node header

### Current behavior and cause

The node Edit action has small text and narrow padding but inherits the builder-wide `min-height: 40px`. The resulting tall, narrow button competes with the node title and reduces its available width.

The document toolbar, builder tabs, and graph toolbar form three stacked control regions. Many unrelated actions share the same bordered-button appearance, making their priority difficult to read.

### Proposed design

1. Use a compact square pencil action aligned with the node header. Provide an accessible name such as `Edit Cartesian plane`, a tooltip, visible focus, and an adequate hit area. Keep it available on touch; do not rely on hover alone.
2. Preserve double-click as a shortcut to settings, without making it the only discoverable route.
3. Give document actions a clear hierarchy: back navigation, editable title, save state, undo/redo, Save, and a primary Try lesson action.
4. Put history, file import/export, and setup navigation into an appropriate secondary menu. Keep frequently used actions immediately available.
5. Use a deliberate Connections / Build segmented control with Add component nearby.
6. Group graph utilities consistently: find/jump, arrange, zoom, fit, and help. Avoid using a full-width control row when a compact contextual group is sufficient.
7. Reuse application colors, spacing, border treatments, and typography. Reduce competing outlines instead of adding decoration to every control.

### Implementation considerations

- Scope button styles to component roles rather than broad descendant selectors that unintentionally affect node actions, dialog controls, and lesson controls.
- Consolidate overlapping builder/composition CSS when modifying the affected selectors. Avoid adding another overriding layer for each defect.
- Keep graph position and port geometry calculations consistent with any node-header size changes.
- Define responsive overflow behavior deliberately so the toolbar does not wrap into several arbitrary rows.

### Acceptance criteria

- Long node names remain readable and the edit action has consistent dimensions.
- Pointer, touch, keyboard, and double-click editing still work.
- The active mode, primary action, and save state are visually identifiable.
- Narrow layouts preserve essential actions without horizontal page overflow.

### Reference files

- [ConnectionNode.tsx](../../../src/web/src/simulations/builder/ConnectionNode.tsx): node heading, edit action, and port markup.
- [connections.css](../../../src/web/src/simulations/builder/connections.css): `.connection-node-edit`, node headings, and graph controls.
- [CompositionBuilder.tsx](../../../src/web/src/simulations/builder/composition/CompositionBuilder.tsx): document toolbar and mode navigation.
- [CompositionGraph.tsx](../../../src/web/src/simulations/builder/composition/CompositionGraph.tsx): workspace header, jump, arrange, and graph interaction handlers.
- [builder.css](../../../src/web/src/simulations/builder/builder.css) and [composition.css](../../../src/web/src/simulations/builder/composition/composition.css): shared and overlapping button/layout rules.
- [ExperimentsShell.css](../../../src/web/src/app/experiments/_components/ExperimentsShell.css): neighboring application visual conventions.

## R2. Rebuild library organization, cards, and component metadata

### Current behavior and cause

The All view renders recipes before public definitions. Definitions are returned in registry order, without a user-oriented grouping or ranking policy. With 195 entries in the reviewed state, this creates a long and expensive browsing task.

Cards mix title, technical category, placement, repeated description, compatibility explanation, insertion, preview, parameter customization, export, and raw port information. Generic definitions use the title itself as their description, so some repeated text is supplied by the data rather than introduced by rendering.

Native `details` markers and select arrows provide functionality but do not match the desired visual treatment. A generic Done footer does not explain the primary task of choosing and adding a component.

### Proposed information architecture

Default browsing should show basic building blocks first, with reusable composites and complete experiments later. Use a category rail with section anchors and counts so users can jump directly instead of scrolling through every section.

| Proposed section | Purpose |
| --- | --- |
| Shapes and objects | Individual geometric and physical objects, including Line. |
| Controls | Sliders, number inputs, toggles, buttons, and forms. |
| Displays | Text, readouts, formulas, charts, tables, and status. |
| Canvases | Cartesian, physical, diagram, and other supported spaces. |
| Models and behaviors | Calculation and simulation components. |
| Layout and resources | Panels, stacks, grids, tabs, reusable data, and appearance settings. |
| Composites | Reusable assemblies with an intentional exposed interface. |
| Complete experiments | Prepared activities with their own presentation and controls. |

These are proposed browsing groups, not a requirement to rename runtime categories or IDs. Audit the actual definitions before assigning type badges: a registered definition is not automatically a simple primitive.

### Proposed card and browsing behavior

- Keep search and category navigation visible while the result area scrolls.
- Use category chips or a compact category selector on narrow screens.
- Give each card a useful icon or schematic, a clear name, an explicit type badge, one descriptive sentence, concise placement information, and Add / Details actions.
- Put primitive matches ahead of similarly named prepared experiments for simple object queries such as `line`.
- Move port lists, assumptions, parameter schemas, and export into a detail view.
- Replace duplicate placeholder descriptions with useful authored copy. Example: `Number input — Let learners enter a number to change a connected value.`
- Show meaningful empty results, the active filters, and a clear way to reset them.
- Replace default disclosure markers with a consistent chevron while preserving native keyboard semantics where practical.
- Style native selects consistently before considering custom controls. A custom select requires complete keyboard, focus, and screen-reader behavior.

### Metadata work

Define explicit discovery metadata where existing fields are insufficient: user-facing kind, browsing group, concise summary, placement expectations, and optional preview representation. Keep this separate from runtime identity and execution contracts.

Do not infer component type from whether its ID contains `prefabs`, or equate every recipe with the same user-facing concept. A reusable assembly and a complete activity can share storage machinery while needing different presentation.

### Acceptance criteria

- Users can identify whether an entry adds one object or a collection before insertion.
- Default browsing groups basic entries before composites and complete experiments.
- Search for Line clearly distinguishes the object from the prepared activity.
- Cards do not repeat their title as the description.
- Technical details do not dominate the browsing surface.
- Search, category changes, empty states, and keyboard navigation work at desktop and narrow widths.

### Reference files

- [CompositionLibrary.tsx](../../../src/web/src/simulations/builder/composition/CompositionLibrary.tsx): current modal, cards, filters, disclosures, and action ordering.
- [libraryChoices.ts](../../../src/web/src/simulations/builder/composition/libraryChoices.ts): definition filtering and current registration-order behavior.
- [useComponentCatalog.ts](../../../src/web/src/simulations/builder/composition/useComponentCatalog.ts): catalog state, recipes, search, and compatibility.
- [generic.ts](../../../src/web/src/simulations/components/catalog/generic.ts): `base()` currently sets `description: title`.
- [catalog/index.ts](../../../src/web/src/simulations/components/catalog/index.ts): public definition registration and adapted metadata.
- [types.ts](../../../src/web/src/simulations/runtime/authoring/types.ts): public definition, recipe, and document contracts.
- [ComponentDialog.tsx](../../../src/web/src/simulations/builder/ComponentDialog.tsx): dialog lifecycle, focus restoration, and footer.
- [composition.css](../../../src/web/src/simulations/builder/composition/composition.css): catalog grid, card typography, inputs, and modal layout.

## R3. Separate simple objects from generated lesson bundles

### Confirmed cause of the 14-child Line

`modelRecipe()` generates a complete recipe from a model's commands and outputs. The reviewed Line recipe contains:

| Contents | Count |
| --- | ---: |
| Authored line model | 1 |
| Cartesian canvas | 1 |
| Slope slider, intercept slider, reset button | 3 |
| Equation, y-at-zero, y-at-one, rise, run, slope, intercept, intersection readouts | 8 |
| Assumptions text | 1 |
| Total | 14 |

The single-object definition also exists. A diagnostic insertion of `prefabs/AuthoredLine` added one node to the existing canvas and created the expected `appearance → objects` attachment.

### Proposed behavior

- Reserve the display name Line for the individual object.
- Name the prepared activity Line exploration or Slope and intercept experiment, with an Experiment badge.
- Describe what the bundle includes before insertion. Internal counts can be secondary information in Details.
- Make simple-object insertion the natural result of browsing Shapes and objects or searching for Line.
- Curate generated recipes. Exposing every command and output is useful for technical inspection but does not automatically produce a good learning activity.
- Hide empty assumptions sections and omit optional readouts that do not serve the activity's purpose.

### Compatibility and persistence

Prefer changing titles and discovery metadata without changing stable definition IDs or recipe identities. If structural recipe changes require a new version, preserve the ability to resolve existing saved versions. Do not silently reinterpret already-saved experiments as a different assembly.

### Acceptance criteria

- Adding Line produces one line, using the selected compatible canvas.
- Adding the prepared activity clearly advertises its extra controls and displays.
- Existing saved recipes remain resolvable.
- The object and experiment are distinguishable in search, history, graph labels, and details.

### Reference files

- [Line.ts](../../../src/web/src/simulations/components/definitions/Line.ts): single-object definition and geometry defaults.
- [composites/catalog.ts](../../../src/web/src/simulations/components/composites/catalog.ts): `modelRecipe()`, automatic controls/readouts, recipe titles, and built-in recipe generation.
- [catalog/index.ts](../../../src/web/src/simulations/components/catalog/index.ts): adapted Line ports and commands.
- [compositeCommands.ts](../../../src/web/src/simulations/builder/editor/compositeCommands.ts): `addCatalogComponent()` and `insertComposite()`.
- [libraryChoices.ts](../../../src/web/src/simulations/builder/composition/libraryChoices.ts): future search ordering policy.

## R4. Repair composite positions and define usable composite interfaces

### Confirmed position-validation bug

The graph renders collapsed groups as movable nodes. Movement records positions under those group IDs. `validateAuthoredDocument()` accepts editor positions only when the ID belongs to a component, so a valid group position fails validation with a raw group identifier.

A targeted diagnostic reproduced this failure by inserting Line, assigning a finite `{x, y}` position to its group, and validating the document.

### Position fix requirements

- Accept positions for valid components and valid groups, while continuing to reject unknown IDs and non-finite coordinates.
- Establish consistent ownership and synchronization of editor metadata between the experiment envelope and authored document.
- Preserve/remap group positions through copy, paste, save, import, and reload.
- Remove obsolete position entries when groups are deleted or dissolved.
- Verify move, arrange, collapse, expand, undo, and redo as complete transactions.

### Confirmed interface problem

Collapsed graph ports are derived from existing connections that cross a group's boundary. A self-contained group has no boundary connections, so its collapsed node has no ports through which a first outside connection can be created.

The Line recipe inserted independently reproduced zero visible inputs and outputs. Inserting it onto an existing Cartesian canvas produced an output because the insertion itself created a crossing connection. This makes discoverability depend on historical wiring.

### Proposed interface model

- Persist an intentional exposed interface for reusable composites, referring to real child endpoints.
- Show declared ports even before they are connected.
- Preserve current boundary connections when projecting collapsed groups.
- Offer an Expose inputs and outputs editor with readable labels and compatibility information.
- Do not indiscriminately expose every child port; that would recreate internal complexity on the collapsed node.
- Distinguish required dependencies from optional ports. Decide explicitly which must be resolved during insertion and which may be connected afterward.
- Keep Expand available for inspecting and editing internal components.

For a complete experiment that owns a canvas, distinguish insertion with its own canvas from reuse of a selected canvas. The whole group is not itself necessarily a drawable object. A user should not have to discover this distinction through a failed wire.

### Acceptance criteria

- A newly inserted collapsed composite can be moved and arranged without validation failure.
- Valid exposed ports are visible before any outside connections exist.
- Compatible wiring can be created through those ports without expanding the group.
- Collapse/expand preserves wiring, and serialization preserves interfaces and positions.
- Ungroup/delete followed by save or insertion does not leave invalid editor metadata.

### Reference files

- [authoredGraph.ts](../../../src/web/src/simulations/builder/graph/authoredGraph.ts): collapsed groups, boundary port projection, and endpoint resolution.
- [CompositionGraph.tsx](../../../src/web/src/simulations/builder/composition/CompositionGraph.tsx): `endMove()`, Arrange, keyboard movement, and selection.
- [validate.ts](../../../src/web/src/simulations/runtime/authoring/validate.ts): group validation and editor-position validation.
- [selection.ts](../../../src/web/src/simulations/builder/editor/selection.ts): grouping, ungrouping, deletion, copy, and paste.
- [recipes.ts](../../../src/web/src/simulations/runtime/authoring/recipes.ts): recipe expansion, identity remapping, external ports, and node removal.
- [connectionCommands.ts](../../../src/web/src/simulations/builder/editor/connectionCommands.ts): resolved endpoint wiring and validation.
- [types.ts](../../../src/web/src/simulations/runtime/authoring/types.ts): group and exposed-port schema changes.
- [useDocumentHistory.ts](../../../src/web/src/simulations/builder/history/useDocumentHistory.ts): atomic edits and editor metadata synchronization.

## R5. Make destination selection and insertion predictable

### Current behavior and evidence

The catalog keeps a destination ID in local state. Opening the library without a target does not reset it, and there is no reconciliation when the corresponding canvas is removed. Deletion or undo can therefore leave a stale reference.

`insertComposite()` rejects a nonempty destination ID that no longer resolves. That condition was reproduced. It is a plausible explanation for screenshot 6, but the user's exact action sequence remains unconfirmed.

Recipe compatibility currently checks external bindings and reports recipes without external ports as compatible. It does not use the chosen destination to predict insertion failures. Primitive compatibility is also based on selection/placement heuristics rather than a complete insertion plan.

### Proposed behavior and architecture

Use one shared insertion-planning/checking function for card eligibility, explanatory text, and final execution. Its result should include allowed placement modes, selected destination validity, required bindings, and a readable reason if insertion is blocked.

Show a concise insertion summary before the action:

- `Adds one line to Cartesian plane.`
- `Adds a separate experiment with its own canvas.`
- `Choose a physical canvas for this component.`

Reconcile the destination when opening the library and when the document changes. If an explicitly selected destination disappears while the modal is open, show a local recovery message and require a valid choice rather than silently inserting elsewhere.

Validate again at execution time and apply all changes atomically. Rejection must preserve the document, selected entry, and entered configuration.

### Acceptance criteria

- An enabled insertion action agrees with the insertion command for the current state.
- Incompatible canvases have a readable explanation and a route to a valid destination.
- Removing or undoing a destination cannot leave an invisible stale choice.
- Choosing an existing canvas preserves its authored settings.
- Failed insertion does not create partial nodes, scopes, layout containers, or history entries.

### Reference files

- [useComponentCatalog.ts](../../../src/web/src/simulations/builder/composition/useComponentCatalog.ts): destination state, `componentCompatibility()`, `recipeCompatibility()`, and insertion.
- [CompositionBuilder.tsx](../../../src/web/src/simulations/builder/composition/CompositionBuilder.tsx): `openLibrary()` and target selection.
- [compositeCommands.ts](../../../src/web/src/simulations/builder/editor/compositeCommands.ts): destination lookup, canvas reuse, scope changes, and validation.
- [recipes.ts](../../../src/web/src/simulations/runtime/authoring/recipes.ts): expansion and external binding behavior.
- [useDocumentHistory.ts](../../../src/web/src/simulations/builder/history/useDocumentHistory.ts): transaction acceptance and rejection.

## R6. Make component previews visible and useful

### Confirmed cause

Preview contents sets `recipePreview`, but the resulting section is rendered after every card and the import controls. There is no focused detail transition or automatic focus transfer. In a long list, the result is outside the visible area and the click appears ineffective.

The current preview is a list of node labels and definition titles, not a visual or interactive preview.

### Proposed behavior

- Open a dedicated detail view within the library, or a detail pane when screen width permits.
- Display the selected component's name, description, schematic/visual preview, contents grouped by purpose, exposed parameters, ports, and insertion behavior.
- Keep Add and its destination summary available in the detail view.
- Preserve query, filters, category, and scroll position when returning to results.
- Move focus into the details view and restore it to the originating card when returning.
- Distinguish View contents from Try preview. If interactive previews are offered, use an isolated runtime that cannot mutate the active experiment.
- Define loading and failure states for renderers that require asynchronous assets or cannot preview independently.

### Acceptance criteria

- The result of clicking Details or Preview is immediately visible.
- Keyboard users receive a meaningful focus transition.
- Returning to results restores browsing context.
- Previewing creates no document edits or history entries.

### Reference files

- [CompositionLibrary.tsx](../../../src/web/src/simulations/builder/composition/CompositionLibrary.tsx): preview button and bottom-of-catalog section.
- [useComponentCatalog.ts](../../../src/web/src/simulations/builder/composition/useComponentCatalog.ts): preview selection state.
- [ComponentDialog.tsx](../../../src/web/src/simulations/builder/ComponentDialog.tsx): existing dialog lifecycle and focus restoration.
- [RecipeLesson.tsx](../../../src/web/src/simulations/components/views/RecipeLesson.tsx): possible reuse for isolated interactive previews.
- [runtime.ts](../../../src/web/src/simulations/runtime/authoring/runtime.ts): runtime construction and state isolation.

## R7. Design a complete import workflow

### Current behavior

Import is a native file input inside the catalog. The outer input has styling, but the browser's file-picker button remains exposed. The imported JSON is validated and saved locally; users are told to find it in the library afterward.

Failed input is retained, which is useful recovery behavior, but the current textarea presentation is too technical for the primary path. File reading itself also needs to participate in the same error presentation as parsing and validation.

### Proposed flow

1. Open Import from an obvious library action.
2. Choose a file using a styled accessible control; optionally support drag-and-drop with the file chooser remaining available.
3. Show the filename and validation state.
4. Present the parsed name, kind, included components, version/dependencies, and any problems.
5. Save the validated component to the library under a clear action.
6. Reveal the imported item and offer Add to experiment immediately.

Define duplicate identity/version behavior explicitly using the repository's existing persistence rules. Do not silently overwrite user-authored content.

On failure, retain recoverable input, explain the issue, and offer retry or another file. Put raw JSON and detailed validation information behind a technical-details control.

### Acceptance criteria

- File selection is visually consistent and keyboard accessible.
- Read, parse, dependency, validation, and persistence failures are distinguishable.
- Failed imports do not alter the active experiment or corrupt the library.
- Success reveals the imported entry without a manual search.
- Retrying the same file and cancelling the picker behave predictably.

### Reference files

- [CompositionLibrary.tsx](../../../src/web/src/simulations/builder/composition/CompositionLibrary.tsx): file input and recovery textarea.
- [useComponentCatalog.ts](../../../src/web/src/simulations/builder/composition/useComponentCatalog.ts): `importRecipe()`, retention, and browser-lock coordination.
- [RecipeRepository.ts](../../../src/web/src/simulations/builder/library/RecipeRepository.ts): library persistence and identity handling.
- [recipes.ts](../../../src/web/src/simulations/runtime/authoring/recipes.ts): recipe validation and dependency contracts.
- [composition.css](../../../src/web/src/simulations/builder/composition/composition.css): import and feedback presentation.

## R8. Introduce clear, contextual errors and useful diagnostics

### Current behavior and cause

The builder combines `error`, `notice`, and catalog `feedback` into one yellow output. Feedback may contain success or failure messages, yet any feedback receives alert semantics. Rejected history edits can become notices. Raw exception messages, including UUID-based paths, reach the main interface.

This mixes severity, scope, and purpose. A failure can appear far from the action that caused it, and a successful operation can be announced like an error.

### Proposed feedback contract

Represent feedback with severity, a stable code, action, user-facing title/body, affected component/destination where available, recovery actions, and optional diagnostic details. Keep raw exceptions available to diagnostics without requiring users to understand internal IDs.

| Situation | Presentation |
| --- | --- |
| Insertion rejected | Inline library error beside destination/configuration, preserving entered values. |
| Connection rejected | Contextual explanation near the attempted connection or connection status area. |
| Invalid document prevents preview/save | Persistent document-level banner with a route to the affected item. |
| Import failed | Import-local error with retry and retained input. |
| Import/save succeeded | Quiet status message, announced politely. |

Example destination message: `The selected canvas was removed. Choose another canvas or create a new one.`

Example movement fallback: `Couldn't move Line exploration. Its position could not be saved. Your experiment is unchanged.` Only claim the experiment is unchanged when the transaction actually rejected the edit atomically.

### Diagnostics

- Record the failed action, stable error code, relevant definition/group identifiers, and underlying validation detail.
- Provide a Copy technical details action where useful.
- Avoid dumping entire documents by default; diagnostics should be scoped to the failure.
- Distinguish a rejected edit from a document whose preview is genuinely using a previous valid revision.
- Deduplicate messages and clear transient feedback when its action context is resolved.
- Pair severity color with iconography and text. Use alert semantics for urgent failures and status semantics for success.

### Acceptance criteria

- Users can identify what failed, whether anything changed, and what to do next.
- Success is not rendered or announced as an error.
- Internal IDs do not dominate primary messages.
- The failure remains visible in the active dialog or workspace where it occurred.
- Diagnostic details retain enough context to investigate the underlying defect.

### Reference files

- [CompositionBuilder.tsx](../../../src/web/src/simulations/builder/composition/CompositionBuilder.tsx): global notice selection and accessibility roles.
- [useComponentCatalog.ts](../../../src/web/src/simulations/builder/composition/useComponentCatalog.ts): string feedback and exception forwarding.
- [useDocumentHistory.ts](../../../src/web/src/simulations/builder/history/useDocumentHistory.ts): edit rejection versus last-valid-preview state.
- [CompositionGraph.tsx](../../../src/web/src/simulations/builder/composition/CompositionGraph.tsx): connection feedback and graph status.
- [validate.ts](../../../src/web/src/simulations/runtime/authoring/validate.ts): low-level validation messages.
- [composition.css](../../../src/web/src/simulations/builder/composition/composition.css): current `.composition-notice` and connection-status styling.

## R9. Turn Build into a coherent lesson composition surface

### Current behavior and evidence

Build mounts `RecipeLesson` with authoring enabled. The renderer uses hardcoded white panels, blue-gray borders, and its own typography/color choices, which diverge from the surrounding application.

Recipe expansion appends a complete layout tree. Reusing an existing canvas removes the inserted canvas entry but can retain its enclosing panel. `LayoutView` still renders labeled containers even when their useful content has been removed. This is a concrete route to empty structural panels.

The screenshot's missing line and additional number-line content cannot be conclusively attributed without its authored document. During implementation, inspect node definitions, attachment endpoints, layout ownership, and runtime state together before changing rendering behavior.

### Proposed authoring experience

- Present a bounded lesson page with deliberate margins, readable content widths, and desktop/mobile preview sizes.
- Show selection outlines and component labels during authoring, with a consistent route to settings.
- Let authors place canvases, controls, and results using the existing stack/grid/panel/tab model through understandable layout controls.
- Give disconnected components actionable placeholders rather than silent blank space.
- Separate authoring affordances from Try lesson, which should show the learner experience.
- Use shared application tokens for default lesson surfaces while respecting explicit authored themes.
- Group Reset and Capture starting values with appropriate runtime/authoring actions rather than leaving unrelated buttons at the bottom of arbitrary content.

### Layout and insertion requirements

- Define how a reusable assembly contributes layout when inserted into an existing lesson.
- Preserve intentionally authored empty containers; remove empty generated wrappers only when their origin and purpose make this safe.
- Keep the reused canvas in its intended location and avoid creating duplicate scene panels.
- Curate default controls/readouts and collapse secondary information intentionally.
- Verify nested layouts and mobile behavior with realistic multi-component documents.

### Acceptance criteria

- Adding a primitive Line produces a visible line on the selected plane without unrelated lesson panels.
- Reusing a canvas for a recipe does not leave accidental empty scene wrappers.
- The learner preview and authoring view have clear, predictable differences.
- Disconnected components explain the missing connection in authoring mode.
- Desktop and mobile layouts remain usable with multiple canvases and control groups.
- Authored themes, runtime reset, and capture continue to work.

### Reference files

- [CompositionBuilder.tsx](../../../src/web/src/simulations/builder/composition/CompositionBuilder.tsx): Build tab and authoring callbacks.
- [RecipeLesson.tsx](../../../src/web/src/simulations/components/views/RecipeLesson.tsx): `NodeView`, `LayoutView`, runtime controls, and selection context.
- [recipe-lesson.css](../../../src/web/src/simulations/components/views/recipe-lesson.css): hardcoded panel and form styling.
- [composites/catalog.ts](../../../src/web/src/simulations/components/composites/catalog.ts): generated scene/control/details layouts.
- [recipes.ts](../../../src/web/src/simulations/runtime/authoring/recipes.ts): layout append behavior.
- [compositeCommands.ts](../../../src/web/src/simulations/builder/editor/compositeCommands.ts): canvas reuse and layout pruning.
- [CompositionCanvas.tsx](../../../src/web/src/simulations/components/views/CompositionCanvas.tsx): canvas provider routing.
- [CartesianView.tsx](../../../src/web/src/simulations/components/views/CartesianView.tsx): Cartesian geometry rendering and author interaction.
- [runtime.ts](../../../src/web/src/simulations/runtime/authoring/runtime.ts): snapshot construction and document updates.

## Delivery sequence

### Pass 1: Restore reliable authoring operations

Implement R4 position validation and lifecycle handling, R5 shared insertion checks, and R6 visible contents navigation. Define and implement composite exposed interfaces with explicit handling of required versus optional dependencies. Introduce enough of R8's feedback model to make failures local and understandable.

These changes should establish trustworthy operations before catalog presentation encourages more use of broken paths.

### Pass 2: Rebuild discovery and insertion UX

Implement R2's metadata and category organization, R3's primitive/experiment distinction, and R7's import flow. Complete component details, destination summaries, and query/context preservation. Keep stable identities and saved-document compatibility explicit.

### Pass 3: Unify the workspace and lesson presentation

Implement R1's toolbar/node refinement and R9's Build presentation/layout behavior. Complete R8's severity styling and diagnostics consistently across graph, library, import, and document actions.

Review actual rendered workflows at representative desktop and narrow widths. Code-level assertions alone are insufficient for spacing, hierarchy, visibility, and focus problems.

## Verification plan

The existing unified-builder checks passed during investigation. They cover useful lower-level behavior but do not establish that the complete screenshot workflows succeed.

| Workflow | Required assertion |
| --- | --- |
| Search and add Line | Primitive is distinguishable, adds one object, and renders on the selected plane. |
| Insert prepared Line experiment | Included content and canvas behavior match the insertion summary. |
| Move and arrange a collapsed composite | Valid position persists through save/reload and undo/redo. |
| Connect a fresh collapsed composite | Declared ports exist before a boundary connection and resolve to correct child endpoints. |
| Expand, collapse, copy, paste, ungroup, delete | Wiring and identities remain valid; obsolete positions are removed. |
| Remove/undo selected destination | Library reconciles state and provides a valid recovery path. |
| Reject incompatible insertion | No partial document mutation or accepted history action. |
| Open contents from early and late catalog entries | Details are immediately visible and returning preserves browsing context. |
| Import valid, invalid, duplicate, and unsupported data | Clear states, recoverable failures, explicit identity handling, and immediate access after success. |
| Build after canvas reuse | No accidental empty wrappers; expected objects and controls render. |
| Keyboard and narrow-screen use | Focus, accessible names, scrolling, and essential actions remain usable. |
| Error versus success feedback | Correct location, severity, announcements, recovery, and diagnostic detail. |

### Existing verification entry points

- [verify-unified-builder.cjs](../../../src/web/scripts/builder/verify-unified-builder.cjs): command-level insertion, graph, copy, deletion, and destination checks.
- [verify-unified-builder-browser.cjs](../../../src/web/scripts/verify-unified-builder-browser.cjs): full builder interactions and browser preview flows.
- [verify-public-catalog.cjs](../../../src/web/scripts/builder/verify-public-catalog.cjs): public catalog contracts.
- [verify-public-catalog-browser.cjs](../../../src/web/scripts/verify-public-catalog-browser.cjs): catalog browser behavior.
- [verify-spatial-catalog.cjs](../../../src/web/scripts/builder/verify-spatial-catalog.cjs): spatial component coverage.
- [verify-spatial-catalog-browser.cjs](../../../src/web/scripts/verify-spatial-catalog-browser.cjs): spatial browser workflows.
- [test-loader.cjs](../../../src/web/scripts/test-loader.cjs): existing loader used for targeted in-memory diagnostics.
- [package.json](../../../src/web/package.json): supported verification commands.

## Implementation constraints and completion criteria

- Preserve existing uncommitted work and inspect overlapping changes before editing.
- Follow [src/web/AGENTS.md](../../../src/web/AGENTS.md), including the installed Next.js guidance before writing application code.
- Keep stable runtime identities separate from improved display names and discovery categories.
- Treat new persisted composite-interface fields as schema work: define migration/default behavior and round-trip tests.
- Keep document mutation atomic and preserve undo/redo semantics.
- Preserve the existing dialog's useful native focus trapping and Escape behavior while improving internal navigation.
- Avoid hiding genuine validation failures as a substitute for repairing the invalid state or command.
- Do not introduce broad renderer or runtime rewrites solely to restyle the builder.

Completion means all nine user concerns have a verified workflow outcome, the nine recommendation areas have either been implemented or explicitly scoped with a reason, and the final visual review demonstrates a coherent experience across Connections, Library, Import, Build, and Try lesson.
