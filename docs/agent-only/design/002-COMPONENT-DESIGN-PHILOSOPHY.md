# Component design: presentation and interaction philosophy

Date: 2026-10-05  
Scope: the visible presentation, interaction, and states of experiment components in authoring and learner experiences.

Status: design guidance for future component redesigns. This document does not claim that all existing components already implement these patterns. Spatial workspace architecture, infinite-canvas navigation, learner boundaries, and immersive 3D presentation require a separate implementation proposal after discussion.

This guide extends [Experiment builder: design philosophy and interaction guide](001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md). The shared commitment is to make purpose, state, available actions, and consequences understandable at the point of use.

## 1. Start with what the component helps someone do

A component is a small learning interface. Its visual design should express its role in the experiment.

A slider helps someone change a quantity. A measurement helps someone observe a result. A chart helps someone recognize a relationship. A table helps someone inspect and compare observations. A spatial object helps someone reason about position, shape, motion, or interaction.

Before designing the container, establish the component's main task, the information needed to perform it, and the feedback that confirms its result. These decisions determine hierarchy and arrangement.

The standard is that someone encountering a component can quickly understand:

- What this represents.
- What its current state means.
- What they can change or inspect.
- How it relates to nearby content.
- What happens when they interact with it.

A consistent visual system should support these answers without forcing every component into the same layout.

## 2. Distinguish authoring representation from learner presentation

Components appear in different contexts with different responsibilities.

| Context | Main concern | Presentation priority |
| --- | --- | --- |
| Connections graph | How the experiment is assembled | Identity, inputs, outputs, connection state, and selection. |
| Build surface | How the experiment is presented | Position, size, grouping, presentation settings, and a faithful content preview. |
| Learner experience | How someone explores the experiment | Meaningful content, permitted interactions, and useful feedback. |
| Settings surface | How the component is configured | Clear fields, validation, explicit actions, and recoverable drafts. |

Share names, visual cues, and terminology across these contexts. Avoid exposing authoring machinery in the learner presentation unless it is itself part of the learning activity.

An Edit action can belong to the builder's selected-component chrome. It should not become a permanent element inside a learner-facing measurement. Similarly, a graph port is useful in Connections but usually has no purpose on the displayed chart.

## 3. Establish a visual grammar by component family

Create reusable patterns around similar tasks. Begin with a representative component from each family, validate its states, and then extend the pattern.

### Controls

Controls should show what changes, its present value, and how to adjust it. Labels and units belong close to the interaction.

For a slider, provide a clear label, visible current value, sensible range, and a numeric editing path when precise entry is meaningful. A learner should not need delicate pointer positioning to enter an exact value.

Group controls that describe one decision. Separate controls with different consequences. Continuous adjustments and actions that restart or rebuild an experiment need distinguishable behavior and wording.

### Measurements and results

Make the observed value the visual focus, followed by its unit and explanatory label. Choose precision deliberately and keep numeric alignment stable as values change.

Provide enough context to understand the number. A bare “12.4” is weak information; a clearly labeled measurement with a unit and relevant comparison is more useful.

Do not make results look editable unless editing is supported. An unavailable result should show an explicit unavailable state instead of a plausible zero.

### Charts

Give the plotted information most of the available area. Titles, axes, units, legends, and view controls should support interpretation without surrounding a small plot with excessive chrome.

Associate series through more than color when distinction matters: labels, line patterns, or markers can also identify them. Hover details should have an equivalent path for touch and keyboard interaction when they expose essential information.

Keep graph-view navigation distinct from changing model parameters. Reset view should restore the camera or plot bounds; resetting the experiment is a separate action.

### Tables

Prioritize readable column headings, units, alignment, and comparison. Numeric columns should be easy to scan vertically. Show empty data, missing values, and invalid observations distinctly.

Use a bounded scrolling region for substantial datasets. Preserve headings where useful, and keep sorting or row-selection affordances explicit. Dense data may justify a denser presentation than a control panel, but density should not depend on illegibly small text.

### Spatial objects and canvas views

Let objects belong to the scene that gives them meaning. A line, draggable point, or physical body generally should not receive a card around itself inside the scene.

Use selection outlines, handles, labels, and context-sensitive actions only where they clarify interaction. Essential drag affordances should be discoverable without hover.

Keep presentation units separate from domain units: resizing a view changes the space available to display a scene, while changing an object's dimensions changes the experiment. Their controls and feedback should make the distinction clear.

### Instructions and grouped content

Use instructions to support the current activity. Place relevant guidance near the interaction it explains, while longer lesson context can occupy a dedicated content area.

A group should express a relationship: several controls affect one model, or several observations explain one outcome. Group labels and spacing should make that relationship understandable.

## 4. Shared foundations, purposeful variation

Inherit the application's warm palette, sans-serif typography, restrained teal accent, fine borders, and soft corners. Reuse existing tokens rather than introducing an independent theme for each component.

| Visual element | Intended role |
| --- | --- |
| Title | Identify the component or subject. |
| Main value, plot, or scene | Communicate the primary content. |
| Label and unit | Explain meaning at the point of use. |
| Supporting text | Explain a decision or state that is not obvious. |
| Border or background | Group related content or separate interactive regions. |
| Accent | Identify the main action, selection, or active mode. |
| Shadow | Indicate elevation for overlays or floating controls. |

Use the builder's established spacing rhythm as a starting point. Adjust density to the content rather than applying one padding value universally.

Avoid giving every nested element a border, background, title, and shadow. A panel containing controls may provide enough framing for the entire group. Repeating that framing around every control makes relationships harder to read.

## 5. Put interaction near its effect

The author or learner should be able to associate an action with the content it changes.

Place a slider's value beside its track, a chart's view tools near its plot, and an object's direct-manipulation handles on the object. Avoid detached settings when the adjustment is central to the activity.

Keep advanced configuration available through an explicit route. A component's most common interaction should remain directly accessible.

For consequential actions, explain the result through the label: Apply value, Reset view, Clear observations, or Restart experiment. Ambiguous labels such as Apply or Reset may be acceptable in an unmistakable context, but should not force someone to guess which state changes.

## 6. Make state legible and behavior dependable

Every component redesign needs a state inventory, not just a default screenshot.

| State | Design responsibility |
| --- | --- |
| Ready | Show useful content and clear available interactions. |
| Hover | Reinforce an affordance without revealing the only route to it. |
| Keyboard focus | Make the active target unmistakable. |
| Selected in the builder | Distinguish authored selection from learner state. |
| Editing | Preserve drafts and communicate how changes are committed. |
| Dragging | Show what is moving and the relevant constraints. |
| Disabled or locked | Explain the restriction where its cause is not apparent. |
| Empty or unconnected | Explain what is needed to produce useful content. |
| Loading | Communicate progress without presenting fabricated results. |
| Invalid or unavailable | Explain the problem and provide an appropriate recovery path. |

Do not simulate success visually before the underlying change has been accepted. Validation, document state, runtime state, and displayed feedback must agree.

Changing presentation settings should not unexpectedly reset the simulation. Repeated edits should preserve the author's mental model of which state is temporary, which state is authored, and what will be saved.

## 7. Separate live exploration from explicit submission

Different interactions warrant different commit behavior.

A slider used for exploration can update continuously when the model supports that behavior. A text or numeric field may need a local draft so incomplete input is not immediately treated as an invalid experiment. An operation that rebuilds content should use an explicit action where accidental repetition would be disruptive.

Choose the interaction according to its consequences. Document the choice and apply it consistently within a component family.

Provide recovery. Authoring changes should use the builder's undoable document operations where applicable. Learner-facing resets should have a clear scope. Switching tabs or opening configuration should not silently erase unfinished input.

## 8. Design incomplete states for their audience

A missing connection is an authoring concern. In the builder, explain which input is missing and offer an action that helps resolve it.

In the learner experience, follow an intentional presentation policy: a meaningful waiting state, an unavailable observation, or an author-configured omission may be appropriate. Do not expose raw component IDs or internal wiring errors as instructional content.

Distinguish absence from a valid zero, empty dataset, paused simulation, or completed activity. These states may look similar in code but carry different meanings to a learner.

Errors should preserve useful surrounding context. One failed observation should not automatically replace the entire experiment with an undifferentiated error panel.

## 9. Remain usable across sizes and input methods

A component should have a considered compact presentation and a useful minimum size. Resizing should preserve its primary content and essential controls.

Reflow controls, move labels, or simplify supporting information before making text too small. Charts and tables may need explicit internal navigation when their information cannot fit; they should not silently overflow their assigned area.

Support keyboard, pointer, and touch interaction for essential actions. Dragging should have an alternative when it is the only way to set an important value. Accessible names and visible labels should describe the same concept.

Use readable focus indicators, sufficient contrast, and more than color for meaningful distinctions. Respect reduced-motion preferences. Essential information should not depend on a transient animation or tooltip.

These are review requirements for redesigns, not a claim that existing components have passed a complete accessibility audit.

## 10. Fit different hosts without owning the whole application

Component content should be separable from its host's positioning, selection handles, and navigation. This allows the same component to appear in a lesson layout, an authoring preview, or a future spatial workspace with consistent behavior.

Define which interactions belong inside the component and which belong to the host. A chart's internal pan, a 3D scene's camera, and the workspace's navigation cannot all claim the same gesture without an explicit interaction policy.

Components should expose meaningful sizing and interaction needs to their host. The host should control placement and authoring chrome without duplicating those responsibilities inside each component.

The planned discussion of an infinite canvas and immersive 3D will establish those host-level rules separately. This document leaves coordinates, camera bounds, fullscreen transitions, and overlay placement undecided.

## 11. Implementation approach

Start with a slider, numerical observation, chart, data table, and spatial object. Design the default, editing, empty, invalid, compact, and selected states together.

Extract shared patterns where the behavior and meaning truly match: field labels and units, primary and secondary actions, result formatting, empty-state guidance, focus treatment, and component framing.

Keep domain-specific visualization and behavior with the relevant component. A generic wrapper should not impose chart controls on a table or force a scene into a form layout.

Use scoped styles and explicit variants. Inspect shared-form defaults and computed styles so the intended primary action does not accidentally render as unstyled text. Preserve existing runtime contracts and validation while changing presentation.

Review related components together after each family is updated. Consistency is a relationship between components, not a property that can be verified by looking at each one separately.

## 12. Completion criteria for a component redesign

A redesign is ready for review when:

- Its purpose and primary interaction are understandable from the displayed surface.
- Labels, units, values, and actions have a clear visual hierarchy.
- Authoring controls and learner interactions are appropriately distinguished.
- Its relevant states have been designed and exercised.
- Editing, validation, reset, and undo behavior match the interface's promises.
- Compact layouts retain essential information and reachable controls.
- Keyboard and touch interaction have been considered alongside pointer use.
- The component fits coherently with others in its family.
- Browser captures and interaction checks cover representative real content.

Assess the resulting experiment as well as the individual component. A beautiful control can still be misplaced, disconnected from its effect, or overwhelming when repeated. The goal is a coherent learning experience assembled from dependable, understandable parts.

## 13. Spatial workspace implementation (2026-10-06)

The builder and experiment now share the spatial board host. Authored scenes own their drawing rectangles; navigation tools and authoring headings float around them instead of consuming scene height. Scene resizing changes presentation only. Workspace zoom, scene camera navigation, and domain parameters remain separate operations.

Plain panel, row, column, and grid groups offer **Arrange contents separately**. This preserves the original layout and model connections, records independent placement in the board presentation, and supports undo, reload, and copied references. Tabs, repeaters, conditional groups, and inherited theme or typography containers keep their existing semantics. Board groups can still move together, while resizing one selected scene affects only that scene.

Flow recipes without saved board placement open in a spatial workspace with measured content heights and a readable first view. Narrow viewports stack content in the workspace; pan, zoom, and Find content provide navigation. The prompt has reserved space below the workspace. Saved board coordinates and learner boundaries remain authoritative. Scene toolbar positions are local view state and can be adjusted by dragging their move handle or using arrow keys; Escape restores their position.

Verification covers independent scene sizing, icon dimensions, movable tools, separation, undo and redo, layout serialization and remapping, immersive scenes, responsive workspace bounds, and prompt clearance. Browser captures should continue to be reviewed alongside interaction checks.

Builder **Try lesson** uses the workspace host for both saved boards and flow layouts, independently of the simulated mobile authoring preview. Scene component wrappers retain their drawing height in authoring and learner modes. Regression checks must enter through the builder button and compare actual canvas dimensions and rendered object geometry; checking only for a mounted SVG misses a canvas collapsed to zero height.
