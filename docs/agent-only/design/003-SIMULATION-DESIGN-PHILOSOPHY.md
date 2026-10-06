# Simulation design philosophy

Date: 2026-10-06  
Scope: premade experiments and simulations assembled in the experiment builder, including their learner presentation and remix experience.

This guide extends [the experiment builder philosophy](001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md) and [the component design philosophy](002-COMPONENT-DESIGN-PHILOSOPHY.md). It records the design principles clarified through the gas pressure redesign and the user's corrections during that work.

A good simulation makes a relationship easy to discover. The learner should immediately recognize what they can change, see what responds, and understand how the two are connected. The implementation should preserve that clarity when the experiment is opened in the builder, edited, saved, or remixed.

## 1. Begin with the learning question

Define the experiment's purpose before choosing controls or arranging components. Write one sentence describing the relationship the learner will explore.

For the gas experiment: **How does changing volume affect pressure when temperature and the amount of gas stay fixed?**

That question determines the initial experience: one adjustable quantity, a visible container, and a pressure measurement. Temperature and amount remain properties of the model, but they do not need learner controls in this lesson.

Do not automatically expose every capability of the underlying model. A model can support many investigations; a premade should make one investigation approachable. If a lesson requires comparing several variables, introduce them in a deliberate sequence or clearly distinguish their roles.

## 2. Make the primary action unmistakable

The main interaction should be apparent without opening settings or reading a long explanation. Name the quantity, show its current value and unit, and place the interaction near its visible effect.

“One action” means one meaningful experimental decision. A volume slider and an exact volume field are two ways to make that same decision. Adding temperature, particle visibility, playback, and reset beside them introduces additional decisions that must each justify their place.

For the gas premade, increasing or decreasing volume is the primary action. Save and remix belong to application options. Canvas navigation belongs to the workspace. Neither should compete visually with changing volume.

Playback belongs prominently in activities where starting, stopping, or stepping time is part of the investigation. An illustrative animation alone does not make playback the lesson's primary interaction. Respect reduced motion, and provide an appropriate way to control motion where needed.

## 3. Compose premades from the builder's components

A premade is an authored experiment with thoughtful defaults and presentation. Build it through the same component definitions, connections, recipe format, and canvas host used by the experiment builder.

For gas pressure, the composition has four responsibilities:

| Component | Responsibility |
| --- | --- |
| Gas model | Own the physical inputs and calculate pressure. |
| Display canvas and gas visual | Show the container and illustrative particles. |
| Volume slider | Submit changes to the model's volume. |
| Pressure readout | Display the model's pressure output and unit. |

The model can remain out of the learner's way while the three visible components occupy the canvas.

Do not solve a premade's presentation problem by creating a separate page with its own hardcoded slider, result, and layout. That can produce a cleaner screenshot while losing the builder's composition, selection, resizing, and remix behavior. Improve the recipe and the shared components that render it.

Keep premade selection modules consistent with the repository's ownership boundaries. Shared implementation belongs with the component system; premade modules select and export the pieces.

## 4. Keep inputs, results, and scenes independently editable

Related content should be placed together, but a shared subject does not require a shared enclosing panel.

The gas container, pressure readout, and volume input should be separate canvas items. Authors should be able to select, move, resize, and configure each without first dismantling a composite panel. Their connections express the relationship; proximity helps learners perceive it.

Use a group when the group has an instructional or authoring purpose. Tabs, conditional content, and repeated activities may need shared behavior. A panel added only to collect everything into a tidy rectangle is insufficient justification.

Judge independence in the actual builder. Separate React components inside one locked visual block do not provide independent authoring.

## 5. Improve the shared component at the source

When a slider or measurement looks poor, fix its reusable presentation. A premade-specific patch should not be required to make an ordinary input understandable.

A slider should provide:

- A clear label and one prominent current value with its unit.
- A track that uses the available width and a thumb that is easy to locate and operate.
- Visible limits where they help explain the available range.
- Keyboard adjustment with a sensible step, plus precise entry when useful.
- Predictable handling of incomplete or rejected numeric input.

Avoid repeating the current value above the slider and again in an equally prominent field beside it. Use the editable value as the displayed value when that serves both tasks clearly.

A measurement should provide a clear label, a visually dominant value, and a nearby unit. Its appearance should communicate that it is observed output. Choose precision intentionally and keep changing numbers easy to compare. Missing or invalid results must not look like valid zeroes.

Check the component in both learner and builder hosts. Shared form rules can override its typography, borders, or spacing. Inspect computed styles when the same component looks different between hosts; verify the resolved appearance rather than assuming its stylesheet wins.

## 6. Make the physical change legible

The scene should help explain what the control does. In the gas experiment, moving the piston changes the space available to the same gas sample. The pressure readout responds at the same time.

Keep stable references visible where they aid comparison. A fixed outer cylinder and a moving piston make compression easier to recognize than a small floating rectangle whose surrounding layout also changes.

Remove labels that merely name an obvious object. “Gas container” printed above the container adds little when the experiment title and interaction already establish its meaning. Retain accessible descriptions even when a visible label is unnecessary.

Distinguish explanatory illustration from quantitative evidence. Representative particles illustrate the model; they are not a literal count of molecules. The displayed pressure should come from the accepted model state, not from a visual approximation.

## 7. Give the experiment enough space to read

The scene should be large enough to inspect, and the main interaction should feel easy to reach. Empty space is useful when it separates decisions or establishes hierarchy. Excessive unused space around a tiny experiment weakens both.

Size each component for its content. A single slider should not occupy a tall card designed for an entire control panel. When an empty region appears, inspect the component's measured height, wrapper constraints, and board allocation before changing padding.

Increase the scene's presentation size when the visualization needs more presence. Keep that separate from changing the simulated quantity: enlarging the gas drawing by 20% must not increase the physical volume or alter pressure.

Verify requested visual scaling in the browser. SVG aspect ratios, available width, camera fitting, and height limits can make a 20% change to a CSS value produce a different change in the visible object. Preserve independently authored sizes when reopening a saved experiment.

## 8. Use the shared canvas with restrained workspace controls

The dotted canvas, spatial placement, and builder navigation establish continuity between creating and exploring an experiment. Keep that shared environment while giving the experiment visual priority.

Separate the responsibilities of model controls, scene camera controls, and workspace navigation. Labels, placement, and gesture handling should make their consequences clear. Resizing a scene, zooming the board, and reducing gas volume are three different operations.

Keep navigation and authoring utilities quiet and contextual. They must remain reachable without covering the scene, measurement, or primary control. A small experiment should not require learners to navigate several panels before they can explore it.

## 9. Preserve the task on smaller screens

Reflow independent components in a sensible order before shrinking the entire experiment. Keep the scene, observation, and input associated as the layout changes.

Check actual text size and target size after board scaling. A technically visible slider can still be too small to operate. Fitting content inside the viewport is insufficient if floating navigation covers the track or a result is separated from its control by a large blank region.

Test narrow and short viewports, keyboard focus, touch-sized targets, and reduced motion. Keep necessary panning available, but aim to make the primary interaction discoverable in the opening view.

## 10. Treat state and remix behavior as part of the design

The visible control, accepted model state, rendered scene, and measurement must agree. Rejected input should preserve the last accepted result and provide a clear recovery path. Opening settings or changing presentation should not silently restart the experiment.

Save and remix must preserve the intended component composition and model values. Remapping must keep component and layout identities valid. A successful route change into the builder does not prove that the recipe loaded correctly.

Inspect the remixed experiment, operate its input, and confirm that its scene and readout are still separate and connected. Also check the builder's **Try lesson** view; the learner experience must survive that route into the simulation.

## 11. Lessons from the gas redesign

The revisions exposed several distinct problems that styling alone could not solve:

- A custom standalone presentation simplified the activity but bypassed the builder's shared canvas and composition system.
- Returning to shared components inside one panel restored reuse but failed the requirement for independently editable inputs, results, and scenes.
- Separating the items exposed weak slider and readout presentation, which required changes to those shared components.
- A tall empty slider card came from the board skipping natural height measurement for standalone items.
- Builder form defaults overrode the slider's numeric value styling, so the improvement needed verification in both hosts.
- The scene still needed more visual presence after the controls were improved; component quality and overall layout quality require separate review.

Use these lessons as review questions for future premades. Simplification must preserve editability. Reuse must preserve clarity. A good component must also receive an appropriate size and position in the experiment.

## 12. Review before calling the simulation complete

Review the real learner and authoring flows against these criteria:

- The learning question and primary interaction are immediately understandable.
- Every visible experimental control supports the intended investigation.
- Inputs, observations, and scenes are independently editable where appropriate.
- The premade uses the shared recipe, component, and canvas systems.
- Controls show clear values, units, limits, focus, and accepted state.
- The scene visibly explains the effect of the interaction.
- Components fit their content, and the visualization has sufficient presence.
- Small screens retain readable content and unobstructed controls.
- Save, remix, and Try lesson preserve the composition and behavior.
- Browser captures and interaction checks cover representative states in both learner and builder views.

Assess the experience by what a learner can understand and do, and by what an author can still edit. Both are requirements of a well-designed simulation in this system.
