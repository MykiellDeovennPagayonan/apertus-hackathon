# Application design and implementation conventions

Date: 2026-10-03. Status: design contract for new work; not a claim that the current UI satisfies every rule.

Applies to prompt creation, the experiment workspace, follow-up editing, controls, visualizations, and failure/recovery states. Read alongside [component contracts](../COMPONENT_CONTRACTS.md), [plan 006](../implementation/006-COMPOSABLE_SIMULATION_EXPANSION.md), and [prompt catalog](../../PROMPT_CATALOG.md).

## 1. Product experience

The application turns a short question into an experiment a learner can manipulate. Start with what the learner wants to explore. The AI chooses supported objects, mechanisms, controls, and observations; trusted runtime systems produce the results.

The first successful screen should answer three questions: What am I looking at? What can I change? What happened when I changed it? A generated experiment needs a concise title, one-sentence learning goal, obvious first action, readable scene, and a small set of relevant results.

Use the normal prompt flow to create new experiments. Example prompt chips populate or submit that same flow with clearly communicated behavior. Premade catalog cards remain a distinct route for opening saved examples; they must not impersonate AI creation. Do not add fifteen premade cards as a substitute for the assembly work.

## 2. Information architecture

Keep route entrypoints small and preserve the existing `/experiments` workspace and `/playground` compatibility behavior unless explicitly changing navigation.

Suggested experiment hierarchy:

1. Experiment title, short learning goal, and creation/status feedback.
2. Main scene or graph, occupying the strongest visual area.
3. Primary controls adjacent to the affected scene.
4. Key numerical results with labels and units.
5. Follow-up prompt input and a few relevant suggestions.
6. Collapsible explanation, model assumptions, and advanced settings.

On desktop, a scene and adjacent control/result panel may share a row. On mobile, use a single reading order with an accessible path between scene, controls, and results. Avoid fixed-height desktop panels that create nested scroll traps. Sticky playback/input controls must not cover content, focus targets, or results when the mobile keyboard opens.

Keep component IDs, JSON, inference traces, registry choices, and debugging controls out of the main learning flow. Put inspect/export tools in a clearly separate details surface. Units, model assumptions, and approximation labels are educational content and must remain accessible.

## 3. Visual language

Preserve the existing warm paper palette, dark readable text, restrained green accents, subtle borders, and serif display headings. Extend the current system before introducing new visual themes or dependencies.

Existing tokens in `src/web/src/app/globals.css`:

| Token | Current value | Intended role |
| --- | --- | --- |
| `--bg` | `#eee9dc` | Application background |
| `--panel` | `#fffbef` | Raised surfaces |
| `--border` | `#d5cdbb` | Quiet dividers and outlines |
| `--text` | `#30362e` | Primary text |
| `--text-dim` | `#797a6c` | Secondary information, subject to contrast checks |
| `--accent` | `#285e56` | Primary actions and focus |
| `--ok` | `#467e53` | Success with a text/icon cue |
| `--warn` | `#a97a32` | Caution with a text/icon cue |
| `--danger` | `#bb5e50` | Error with a text/icon cue |

These existing values are a starting point, not an accessibility certification. Check each actual foreground/background pair. Darken secondary text where necessary through a shared design decision owned by the integration agent.

Use a 4/8-pixel spacing rhythm, normally 16–24 pixels of panel padding, consistent radii, and restrained shadows. Proposed sizes are conventions for new work, not requirements to rewrite every existing selector. Use roughly 16-pixel body/control text; avoid tiny uppercase labels for essential instructions. Reserve serif typography for titles and short display copy; use the existing sans-serif stack for controls, body text, tables, and measurements. Use tabular numerals for changing values.

Use one strong primary action per local task. A simple lesson should initially show roughly two to four essential controls; reveal advanced parameters progressively. Avoid decorative panels that compete with the model or hide the result below excessive explanation.

## 4. Interaction conventions

- Give every control a persistent visible label, current value, unit, and valid range when relevant. Sliders need an exact-entry or keyboard-accessible alternative where precision matters.
- Bind controls to validated commands. Show accepted values; if an update is rejected, preserve the last accepted state and explain the correction needed.
- Distinguish immediate adjustments from those that restart or rebuild a run. Label actions such as “Run again” or “Compare from the start” when history changes.
- Keep object identity stable across follow-up edits. “The second pendulum” and “the blue line” must refer to the same instance in labels, command context, scene, and results.
- Reset restores the accepted initial configuration and clears derived history appropriately. Re-run repeats current settings. Do not silently make these synonymous.
- Dynamic experiments expose play/pause and appropriate step/speed controls. Static math lessons use meaningful steps or direct manipulation without artificial ongoing playback.
- Comparison views keep shared conditions visible, label changed variables, and use consistent scales unless clearly explaining a difference.
- Prompt edits show a concise description of the accepted change. Do not announce success before runtime activation or invent results from the model's prose.
- Graph legends, selected objects, and comparisons use text/symbols as well as color. Maintain color identity across the scene and chart.

## 5. Application states and recovery

| State | Required experience |
| --- | --- |
| Empty | A clear prompt input, concise invitation, and examples that use normal creation. |
| Creating | Immediate visible feedback, truthful status, and cancellation; preserve the submitted prompt. |
| Active | The accepted experiment, initial action, controls, results, and follow-up input. |
| Editing | Keep the current experiment visible; communicate pending work and prevent accidental duplicate requests. |
| Invalid input | Inline explanation tied to the affected control; preserve valid state and user context. |
| Unsupported request | Explain the missing capability and offer a relevant supported adjustment, without claiming creation succeeded. |
| Service failure | Identify the failed operation, preserve prompt and experiment, and offer explicit retry. |
| Cancelled | Stop pending creation/edit work and prevent a late response from committing. |
| Completed | Keep final results visible, with clear reset/re-run actions. |

Do not display an unrelated fallback experiment as success. Bound inference retries and report failure after the request budget is exhausted. Loading animation must not imply a model result exists before validation.

## 6. Scientific and educational presentation

Every displayed number comes from authoritative runtime outputs or clearly identified derived presentation formatting. Views must not run an independent solver. A particle animation or bulb glow may illustrate a model without being its source of truth; label that distinction in assumptions.

Show units consistently across input, graph axes, tables, and explanations. Use meaningful rounding for display while preserving computational precision. Explain normalized or illustrative quantities; never label an arbitrary growth unit as a measured biological quantity.

Graphs require labeled axes, units, a readable legend, and an accessible numerical summary or table. Auto-ranging must preserve interpretability, and clipped/out-of-range values must be apparent. Do not silently normalize two comparison curves in ways that hide their actual difference.

Place a short approximation cue near the result when necessary, with more detail available on demand. Examples include “Ideal pendulum, small angles,” “Simplified rolling resistance,” “Constant-resistance bulbs,” and “Illustrative plant-growth model.” Human and ecological models display outcomes under explicit assumptions rather than universal predictions.

Keep explanations brief and tied to actual state: “The salt amount stayed the same; the volume doubled, so concentration halved.” Do not ask the model to fabricate a story about a change it cannot observe.

## 7. Accessibility and responsive behavior

Use semantic buttons, inputs, headings, and status regions. Every interactive element needs an accessible name, visible focus, logical tab order, and keyboard operation. Use restrained live announcements for accepted changes and errors; do not announce every animation frame.

Aim for WCAG AA contrast: at least 4.5:1 for ordinary text, 3:1 for large text and essential UI boundaries. Treat 44×44 CSS pixels as the preferred minimum touch target for essential actions. Provide non-drag alternatives for object placement and adjustments. Avoid hover-only instructions.

Inspect and interact at 1440×900 and 390×844; also spot-check a narrower width or zoomed layout during development. Essential text and controls must not clip, overlap, or cause horizontal page overflow. Pan/zoom within a labeled visualization is acceptable when intentionally supported; page overflow is not a substitute.

Honor reduced motion in both CSS and canvas/WebGL simulation presentation. Reducing CSS transitions alone does not stop renderer-driven animation. Preserve the model's readable results through pause, step, static trails, or numeric views. Avoid flashes and unnecessary camera movement.

## 8. Code and component conventions

Follow the repository's nine component kinds and ownership boundaries. Authoritative systems write model state; visual/view components consume it; controls submit commands; the runtime validates, schedules, commits, and disposes. Share one model clock and do not create animation-driven duplicate solvers in React components.

Use TypeScript types and bounded runtime schemas for model parameters, outputs, commands, and units. Use stable versioned provider IDs and stable instance IDs. Never interpret model text as executable code. Declare unsupported bindings rather than silently ignoring them.

Keep React components focused, styles colocated, and domain CSS scoped under a domain root such as `.chemistry-experiment`. Reuse global tokens. Avoid global element selectors inside domain styles and avoid `!important` except an established accessibility override with a documented reason. Use a consistent domain naming scheme for exported components and provider IDs agreed at the foundation freeze.

Use pure testable system functions where possible. Keep random seeds and simulation time explicit. Release timers, subscriptions, WebGL resources, and pending requests on disposal. Avoid adding dependencies for functionality already available in the runtime or browser.

Read the installed framework guidance required by `src/web/AGENTS.md` before framework edits. Existing code and validated registry schemas are authoritative about what currently executes; names in design documents are proposals until implemented.

During five-agent implementation, only Agent A edits shared application UI, runtime infrastructure, global tokens, and shared documentation. Domain agents follow the namespace ownership table in plan 006 and request shared changes through handoff notes.

## 9. UX review and acceptance

For each prompt, review the initial state, at least one meaningful edit, results, reset, and failure recovery at both required viewports using Playwright MCP. Discuss specific observations between the domain owner and integration owner; record conclusions without blocking routine improvements on user confirmation.

Use this review record:

| Field | Required content |
| --- | --- |
| Prompt / candidate / viewport | Exact ID, frozen build fingerprint, screen dimensions |
| Observation | Screenshot or interaction evidence of the issue |
| Learner impact | What becomes confusing, inaccessible, or hard to discover |
| Proposed improvement | Concrete layout, behavior, labeling, or visualization change |
| Severity / owner | Blocker, major, or minor; responsible agent |
| Retest | Exact action and expected visible/state result |
| Resolution | Evidence link, outcome, and any justified minor deferral |

Score first-action clarity, scene readability, control discoverability, feedback/results, and mobile/accessibility from 1 to 5. Each must reach at least 4: independently usable with only minor polish remaining. Incorrect outputs, missing essential controls, misleading visuals, or inaccessible actions fail regardless of score.

Fix, test, inspect again, and discuss remaining improvements until the gates are satisfied. Then freeze the integrated candidate and achieve two consecutive complete rounds as defined in plan 006. Any functional/UI change between rounds restarts the streak. Record analyzed failure summaries, delete raw Playwright data after analysis as required by plan 006, and disclose remaining limitations; do not promote the prompt catalog from visual appearance alone.
