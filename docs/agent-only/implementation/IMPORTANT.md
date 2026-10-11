# IMPORTANT

Date: 2026-10-10  
Status: mandatory implementation and review requirement.  
Scope: all current and future UI work across the project: simulations, generated lessons, premades, shared components, learner experiences, builder tools, settings, and navigation.

**Simplicity must not be violated. The visuals should teach. Controls should make that learning easy. A technically correct simulation with an overwhelming interface is unfinished.**

This is a general, permanent requirement for implementation and review across the project. Apply it to new work and changes to existing interfaces. Conflicting implementation templates or acceptance assumptions must be corrected to follow this requirement.

## 1. Simplicity comes before feature exposure

Different tasks have different needs. A consistent visual system must not force every interface into the same layout, panel structure, control list, or information density. Choose the presentation around what the person needs to understand and do.

For simulations, the visuals should do the teaching, supported by very short explanations and essential controls. For builder tools and other application flows, make the current task, next action, and resulting change equally clear. Internal capabilities are not a reason to expose every setting or measurement.

**Do not disguise unnecessary complexity with fewer borders, smaller text, different colors, or a larger scene. Remove unnecessary decisions and information.**

## 2. Read these design guides before making UI decisions

- [001 — Experiment builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md): task clarity, predictable behavior, hierarchy, purposeful spacing, and useful progressive disclosure.
- [002 — Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md): consistent visual foundations without forcing every component into the same layout; distinguish authoring from learning.
- [003 — Simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md): begin with one learning question; do not automatically expose every model capability; justify every experimental control.
- [004 — Usability QA guide](../design/004-USABILITY-QA-GUIDE.md): inspect the opening interface before operating it; review outcome-only tasks; extra controls and instructions may indicate an unclear interaction.

Read the relevant sections again when a design starts accumulating controls. A previous reading is not evidence that the current design follows them.

## 3. Non-negotiable presentation rules

1. **Start with one clear task.** Write what the person should understand or accomplish before choosing the interface. For a simulation, state one learning question. Available features do not determine the visible control list.
2. **Give the task’s main content the space and attention.** In simulations, the visual is the main content. Movement, spatial relationships, color with accessible supporting cues, visible paths, and changing objects should explain the process. A learner should not need a dashboard to understand what happened.
3. **Use one short, timely explanation.** Describe the current visible change in familiar language. Avoid repeated headings, paragraphs of instructions, and several panels explaining the same state.
4. **Make one primary next action obvious.** Its label must say what happens: for example, “Next stage,” “Introduce infection,” or “Make it rain.” Do not require learners to choose among generic playback and configuration actions before learning begins.
5. **Expose only essential controls for the current task.** Begin with the primary action and, where needed, one or two directly relevant choices. One to three visible controls is a review guardrail, not a quota to fill. If the opening view needs more, simplify or sequence the activity before accepting the design. Count buttons, sliders, selects, toggles, tabs, and repeated object-selector lists together.
6. **Keep meaningful labels and accessible interaction.** Simplicity must not remove useful units, keyboard support, focus feedback, motion control where required, or understandable action names. An unexplained icon is not a simpler control.
7. **Make the interface fit its content.** Use the shared spacing rhythm, readable text, generous targets, clear grouping, and consistent colors and typography. Do not put a single action inside an oversized form card. Do not shrink text to accommodate unnecessary content.

## 4. What must be removed unless the current task requires it

- Default Observe / Track / Compare sections and fixed numerical readout slots.
- Permanent inspectors containing internal state, object IDs, or technical descriptions.
- Numerical readouts, technical metrics, and precision that do not help the person understand or complete the current task.
- Universal toolbars exposing step, play, pause, speed, overlays, baseline, compare, reset, and setup together.
- Duplicate scene labels, explanations, controls, values, and legends.
- Authoring settings and workspace utilities competing with the learner's primary action.

A quantity is visible only when the learner needs it to reason about the question. A comparison is visible only when comparing outcomes is the actual activity. An inspector appears only when inspecting a particular object helps the learner, with a brief explanation close to that object.

**Do not move an unnecessary dashboard into a “More” menu and call the problem solved.** A less frequent activity can have a clearly named contextual entry point. The resulting flow must also be simple. Everyday actions must remain discoverable.

Keep scientifically necessary calculations, invariants, histories, and diagnostic information internally. Hiding an unnecessary numerical display does not authorize an inaccurate model or disconnected visual feedback.

## 5. Tailor each flow to its purpose

Do not use a universal dashboard as the default for different activities. Decide separately which controls, observations, and explanations each task needs. A basic process demonstration may need only a visual and a next-stage action. A quantitative investigation may need a measurement and one adjustable quantity. A builder editing task may need a focused form. Each must justify its visible content.

Introduce additional decisions in a deliberate sequence when they become relevant. Contextual information should appear close to the object or action it explains. Preserve discoverability and recovery without displaying every possible action simultaneously.

Shared colors, typography, spacing, accessible interaction, and predictable behavior provide consistency. Identical layouts and identical numbers of panels do not.

## 6. Mandatory simplify-and-review loop

1. Record the current task, the visible result that communicates success, and the one primary action. For simulations, include the learning question and the visual change that teaches it.
2. List every proposed visible control and information block. For each, name the decision or understanding it supports. Remove anything without a specific answer.
3. Apply the removal test: **if removing it does not prevent the intended task, remove it from the default experience.**
4. Implement through the actual shared components and application flows. For simulations, preserve saved recipes, builder editing, saving, reopening, and Try lesson behavior.
5. Open the actual desktop experience. Inspect the first screen without reading implementation notes. Count competing actions, including workspace chrome. Confirm that the main content is dominant, text is readable, spacing is deliberate, and the next action is obvious.
6. Perform an outcome-only task without a walkthrough. Check whether the visible change explains the result. Test keyboard operation, reduced motion, recovery, and short desktop viewports without adding a toolbar to solve every case.
7. For generated lessons, run actual Apertus and Laya and inspect the resulting accepted recipe in the app. A polished premade does not prove generated lessons follow this requirement.
8. Capture opening and meaningful changed states using Playwright MCP when available. Inspect the screenshots, operate the flow, simplify again, and repeat. If MCP is unavailable, explicitly label any fallback evidence; do not claim the requested MCP verification occurred.
9. Present screenshots with an honest statement of what was reviewed and what remains unresolved. The user's criticism requires another iteration; automated passes cannot override it.

Prioritize desktop review for the current implementation work. Preserve the same simplicity principles at every supported viewport.

## 7. Release blockers — no exceptions for convenience

Do not mark the UX complete or ready for approval if any of the following is true:

- The person must navigate several panels to begin a basic task.
- Numerous competing controls make the first action or current task unclear.
- A universal panel layout is imposed despite different learning needs.
- Numbers or readouts distract from a process better explained visually.
- Understanding depends on reading a dashboard or a long tutorial.
- Small text, tight spacing, hidden essential actions, or unexplained icons create apparent simplicity at the expense of usability.
- Screenshots look tidy but the actual flow is confusing, or the visible feedback disagrees with accepted model state.
- Technical tests are presented as proof of usability, or known user objections remain unresolved.

Do not waive these requirements because a reusable template exists, the model exposes the data, implementation is faster, or tests pass. Refactor the presentation and sequence the learning activity instead.

**This rule is permanent and project-wide. It is not limited to a particular set of simulations. Technical correctness, feature completeness, or passing tests never excuse confusing controls, unnecessary information, or difficult navigation.**
