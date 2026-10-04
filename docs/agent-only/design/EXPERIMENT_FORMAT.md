# Experiment screen format

Date: 2026-10-04. Status: required presentation contract for new and revised experiments.

Read this with [APPLICATION_DESIGN.md](APPLICATION_DESIGN.md), [COMPONENT_CONTRACTS.md](../COMPONENT_CONTRACTS.md), and the applicable implementation plan. This document defines how an experiment should be arranged on screen. Domain plans still define the model, parameters, commands, outputs, and scientific acceptance criteria.

## 1. Purpose

Every experiment should feel like one focused interactive lesson. A learner should be able to answer these questions from the initial screen:

1. What am I looking at?
2. What should I try first?
3. What changed after I acted?

The standard is established by the cleaner Agent A lessons and by Fraction Builder, Projectile Motion, and Gas Pressure: one dominant visual, nearby controls, immediate results, and secondary detail kept out of the main learning path.

Scientific completeness does not require every input, measurement, table, graph, and assumption to be visible at once. The first screen should show the smallest useful set needed to understand and manipulate the concept.

## 2. Required screen anatomy

Use this hierarchy for every experiment:

```text
Experiment workspace
├── Workspace title supplied by the application shell
├── One-sentence learning goal
├── Primary lesson area
│   ├── Dominant scene, diagram, or graph
│   └── Primary control and result panel
│       ├── Clear first action
│       ├── Two to four essential controls
│       ├── Key results with labels and units
│       └── Reset and playback when relevant
├── Inline feedback for accepted or rejected changes
├── Follow-up prompt composer supplied by the application shell
└── Secondary details
    ├── Exact or uncommon inputs
    ├── Full result tables
    ├── Optional supporting graphs
    ├── Model assumptions and limitations
    └── Diagnostic or export tools
```

The workspace shell already presents the experiment title and follow-up composer. Domain views must not repeat a large page title or create another application shell inside the experiment.

## 3. Desktop format

At 1440×900, the primary lesson should use a two-column composition:

```text
┌──────────────────────────────────────────────────────────────┐
│ One-sentence learning goal                                   │
├──────────────────────────────────────┬───────────────────────┤
│                                      │ First action          │
│       Dominant visual or graph       │ Essential controls    │
│                                      │ Key results           │
│                                      │ Reset / playback      │
├──────────────────────────────────────┴───────────────────────┤
│ Optional details or assumptions                              │
└──────────────────────────────────────────────────────────────┘
```

Use these layout targets:

- Overall lesson width: approximately 1100–1180 CSS pixels, constrained by the workspace.
- Primary grid: `minmax(0, 1fr) 300px`, with a 20–24px gap.
- Scene: the strongest visual area, normally at least twice the width of the panel.
- Panel: one coherent surface with 16–20px padding.
- Scene height: responsive to the available workspace, normally capped around 420–500px.
- Touch targets: at least 44×44 CSS pixels for essential actions.
- Body and control text: approximately 16px; small supporting text should remain readable.

The core loop—observe, act, see the result—must fit within the available desktop workspace without requiring vertical scrolling. Advanced controls and long explanations may extend below it or open in **More settings**.

Do not create a vertical report made from a full-width scene card, separate playback row, several object cards, a graph card, and a result table. Combine the essential parts into the primary lesson area.

## 4. Mobile format

At 390×844, switch to one reading order:

```text
Learning goal
→ Compact scene or graph
→ First action and key result
→ Essential controls
→ Optional details
```

Mobile rules:

- Use one column with 12–16px gaps.
- Keep the scene compact enough that the primary action is visible in the initial viewport or after one short scroll.
- Preserve a minimum 44px touch target.
- Use 16px text for editable inputs to avoid browser zoom behavior.
- Do not shrink SVG labels until they become difficult to read. Adapt the diagram or use a mobile-specific view box.
- Do not cause page-level horizontal overflow. An intentionally scrollable diagram must be labeled and must not hide the main action.
- Keep the scene before the controls unless the scene cannot be understood without setting an initial value.
- Show an explicit scroll cue when the primary action begins below the initial viewport.
- Keep the fixed prompt composer from covering controls, feedback, or results.

Do not force every advanced result into one mobile viewport. Preserve a clear core interaction and make the remaining material easy to reach.

## 5. Visual hierarchy

Each screen should have one visual focus and one primary action.

### Dominant visual

The scene, diagram, or graph should communicate the model state before the learner reads a table. It should:

- Use the largest continuous area on the screen.
- Show stable object identities across edits.
- Use consistent scales for comparisons unless a scale change is clearly labeled.
- Place labels close to the objects or curves they describe.
- Use text, symbols, line styles, or shapes in addition to color.
- Reflect authoritative runtime outputs; it must not run a second solver in the view.

### Primary panel

The panel should support the scene rather than compete with it. It should contain:

- A short prompt such as “Try this,” “Change the line,” or “Your next step.”
- One visually strong action when the lesson has a natural first step.
- Two to four controls needed for the main comparison.
- Only the measurements needed to interpret the immediate result.
- Reset, pause, step, or run-again controls when the model requires them.

Avoid placing a full scientific inventory in the primary panel. A long definition list with every internal output makes the lesson read like diagnostics.

### Results

Show key results beside the control that changes them. Use concise result cells or a short definition list with:

- A plain-language label.
- A readable value.
- The correct unit.
- Tabular numerals for changing values.
- A short state-linked explanation when it improves understanding.

Prefer “Concentration: 5 g/L” and “The salt stayed at 10 g while the volume doubled” over an unlabeled numeric table.

## 6. Progressive disclosure

Keep the following out of the initial lesson surface unless the prompt specifically requests them:

- Exact-value inputs that duplicate a slider or primary button.
- Full per-object output tables.
- Secondary graphs.
- Every model parameter.
- Long assumptions or derivations.
- Runtime identifiers, provider names, recipes, inference traces, and diagnostics.

Place these in one of two locations:

1. A local disclosure such as **Enter exact values**, **Explore the graph**, or **How this model works**.
2. The workspace’s **More settings** panel through the existing controls overlay.

Do not hide information that is necessary to understand the result, such as units, a key approximation, or whether a temperature change restarts a run.

## 7. Controls and actions

Controls should describe the learner’s action, not the implementation.

- Use labels such as **Add 1 L of water**, **Add a second bulb**, and **Subtract 3 from both sides**.
- Show the current value and unit for sliders and numeric controls.
- Provide exact entry when precision matters, but it may be disclosed.
- Clearly distinguish **Reset**, **Run again**, **Pause**, and **Step**.
- Keep rejected changes inline with the affected task and preserve the last accepted state.
- Keep comparison identities stable: “Swing 2,” “Rough track,” and “Bulb 2” must remain the same objects after edits.
- Do not present several equally prominent primary buttons.

Static lessons should not display fake playback controls. Dynamic experiments should provide pause and a meaningful step or replay action.

## 8. Domain examples

These examples define the intended composition, not a hardcoded experiment template.

### Equation balance

- Scene: symbolic equation and visual balance.
- Panel: the next valid operation, result/check, undo, and reset.
- Details: arbitrary exact operations and model assumptions.

### Line slope

- Scene: coordinate graph, equation, and rise/run marker.
- Panel: slope and intercept controls with a one-sentence interpretation.
- Details: exact values and secondary line options.

### Fraction Builder

- Scene: the two fraction bars and immediate fraction readout.
- Primary controls: shade, split, and compare actions.
- Details: setup controls and additional observations.

### Projectile Motion

- Scene: trajectory and comparison legend.
- Primary controls: angle, launch speed, play/reset, and essential range/height metrics.
- Details: full graph, tables, trajectory toggles, and assumptions.

### Gas Pressure

- Scene: gas container and representative particles.
- Panel: volume control and large pressure result.
- Details: temperature, amount of gas, particle visibility, and assumptions.

### Pendulum comparison

- Scene: all pendulums on one length scale.
- Panel: length controls, period comparison, pause/step, and reset.
- Details: angle-time graph unless the prompt explicitly requests it.

### Rolling resistance

- Scene: smooth and rough tracks on one distance scale.
- Panel: resistance controls and the two stopping distances.
- Details: exact coefficients, full motion readings, and assumptions.

### Electric circuit

- Scene: battery, wiring, and bulbs.
- Panel: add-bulb action, series/parallel selector, total current, and per-bulb power.
- Details: full bulb table and electrical assumptions.

### Dilution

- Scene: beaker with visible volume and concentration cues.
- Panel: **Add 1 L of water** plus salt, volume, and concentration results.
- Details: arbitrary water amount and full assumptions.

### Chemical balancing

- Scene: equation and molecule groups.
- Panel: **Balance it**, coefficient controls, and compact element-match indicators.
- Details: full atom table and registered-reaction limitations.

### Reaction rate

- Scene: concentration-over-time graph as the dominant visual.
- Panel: temperature, **Compare at 320 K**, half-life, rate constant, and playback.
- Details: full A/B conservation readings and model assumptions.

## 9. Shared implementation contract

The integration owner should provide a shared lesson-frame component rather than asking each domain to copy Agent A’s CSS. A suitable conceptual interface is:

```tsx
<ExperimentLessonFrame
  learningGoal={goal}
  scene={scene}
  panel={primaryControlsAndResults}
  feedback={feedback}
  details={secondaryContent}
/>
```

The actual implementation may use compound components or named slots, but it must preserve the same screen hierarchy.

Domain owners supply:

- The authoritative visual projection.
- Domain actions and controls.
- Key result formatting.
- Domain-specific accessible labels.
- Optional details and assumptions.

The integration owner supplies:

- Shared desktop and mobile geometry.
- Panel styling and spacing.
- Feedback placement.
- Connection to **More settings**.
- Workspace-level viewport constraints.
- Cross-domain visual consistency and final UX signoff.

Domain CSS must remain scoped, but it should style domain content inside the shared frame instead of recreating the frame.

Mixed-domain assemblies should render each requested mechanism without silently hiding one domain. They may use multiple coordinated lesson sections when one combined scene is not meaningful, but each section should still follow the same scene/panel/details hierarchy.

## 10. Instructions for implementation agents

Include this requirement in every domain assignment:

> Follow `docs/agent-only/design/EXPERIMENT_FORMAT.md`. Use the shared experiment lesson frame established by Agent A and the reference Fraction Builder, Projectile Motion, and Gas Pressure screens. Present one dominant scene or graph and one adjacent primary panel on desktop. Keep the first action, two to four essential controls, and key results visible within the 1440×900 workspace. Do not render a vertical sequence of full-width scene, object, result, and graph cards. Put exact inputs, complete tables, optional graphs, assumptions, and secondary controls behind disclosure or in More settings. On mobile, use scene → primary action/results → controls → details, with no page-level horizontal overflow.

The exact learner prompts in `docs/PROMPT_CATALOG.md` must remain unchanged. These are presentation instructions for the implementation agent, not text to append to creation prompts.

## 11. Review checklist

An experiment is not visually complete until all answers below are yes.

### Initial screen

- Is the learning goal one concise sentence?
- Is there one obvious dominant scene or graph?
- Is the first action easy to identify without reading documentation?
- Are the key result and its unit visible near the action?
- Does the core loop fit in the 1440×900 workspace?

### Controls and results

- Are only two to four essential controls initially prominent?
- Does every input show a label, current value, and unit where relevant?
- Are reset, replay, pause, and step correctly distinguished?
- Does feedback appear without moving the learner away from the scene?
- Are advanced controls and long tables disclosed?

### Mobile

- Does the screen follow scene → action/result → controls → details?
- Can the learner reach the first action in the initial viewport or one short scroll?
- Are labels and graph text readable at 390×844?
- Are essential targets at least 44px?
- Is there no page-level horizontal overflow or content hidden behind the composer?

### Educational clarity

- Does the visual use the authoritative model state?
- Are approximations stated close to the affected result?
- Are comparison objects and colors consistently identified?
- Can a learner understand the change without opening assumptions?
- Are diagnostic and implementation details absent from the lesson flow?

### Verification

- Inspect the initial state, a meaningful edit, reset, and invalid input at 1440×900 and 390×844.
- Capture evidence of the initial scene and the changed result.
- Score first-action clarity, scene readability, control discoverability, feedback/results, and mobile/accessibility.
- Treat any score below 4/5 as unfinished.
- Reinspect after layout changes; source review alone does not establish visual acceptance.

## 12. Common failure patterns

Revise the screen when any of these are present:

- A dashboard of several equally weighted cards.
- Controls separated from the visual effect by a long scroll.
- A full table used where two or three key results would teach the concept better.
- Repeated headings or nested experiment shells.
- A graph placed below several control cards even though it is the main observation.
- Playback controls occupying a separate section without visual connection to the animation.
- Every object receiving a large independent control panel for a simple comparison.
- Desktop content technically reachable but unable to complete the core loop in one screen.
- Mobile content merely scaled down instead of recomposed.
- Successful numerical verification being treated as sufficient UX approval.

The intended result is a consistent family of lessons. Different subjects may require different visuals and controls, but their information hierarchy, spacing, first-action clarity, result placement, and responsive behavior should feel like the same application.
