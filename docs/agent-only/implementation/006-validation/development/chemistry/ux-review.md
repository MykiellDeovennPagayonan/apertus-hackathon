# Chemistry UI preflight and subsequent live inspection

Initial preflight, 2026-10-03. The statements below describe the first development stage and are superseded by the subsequent live inspection; screenshots, browser interaction, two-viewports inspection and integration-owner discussion remain unexecuted. No UX scores assigned.

Implemented: one primary first action per lesson; beaker labels and adaptive capacity scale; numerical concentration supplements color; molecule clusters and immutable atom labels; explicit unbalanced status; coefficients with keyboard number inputs; element-count table; curve axes/units and textual legend; numerical concentration/half-life summaries; play/pause/step/restart; visible reset; model assumptions; semantic feedback output; scoped responsive single-column layout; 44 px control targets and focus outlines. No visual animation is required to understand results; paused initial rate runs allow reduced-motion exploration.

| Observation | Learner impact | Proposed check / integration action | Severity / owner | Resolution |
| --- | --- | --- | --- | --- |
| Shared AssemblyView currently knows only math presentations and uses a circle fallback introduction | Chemistry cannot appear or can show unrelated instructions | Register providers together with ChemistryLesson rendering and chemistry introduction; submit exact prompts | Blocker / Agent A | Pending integration |
| Local numeric drafts use React local state | Reset could leave a draft temperature/value from the edited run visible | Mount ChemistryLesson with instance ID and assembly resetCount key; reset after editing | Major / Agent A | Explicit handoff request |
| Generic optional graph adapter is for mathematical lines | Rate curves could inherit wrong axes or assumptions if rendered generically | Render the supplied chemistry rate graph with seconds/mol per litre axes; compare equal times | Major / Agent A | Domain graph implemented; integration pending |
| At large volumes beaker capacity changes to keep liquid visible | Apparent height alone could obscure added volume | Read explicit litre labels before/after 1→2 L and a larger-volume edit on both viewports | Minor / Agent C | Adaptive scale is explicitly labeled; browser check pending |
| Full layout/keyboard/touch behavior has not been inspected in a real browser | Readability and access are not established by semantic markup | Inspect at 1440×900 and 390×844; keyboard all controls, test invalid values, focus, scroll and reduced motion | Acceptance gate / Agents C + A | Pending integration and Playwright MCP access |

Retest matrix: DIL add 1 L → 10 g / 2 L / 5 g/L; CHEM Balance → 2H₂ + O₂ → 2H₂O and matching counts; RATE compare 320 K → new t=0, faster k, shorter half-life, previous 300 K dashed curve. For each: rejected edits preserve valid state; reset restores accepted initial settings; independent instances preserve their identities.


## Subsequent Playwright MCP inspection

Development attempt004 passed all six canonical chemistry cases at 1440×900 and 390×844 with exact creation/follow-up prompts, real Apertus and Laya, inspected numerical state, invalid-input preservation, reset, keyboard focus, reduced-motion clock behavior for rate, 44px targets and no horizontal overflow. The official MCP server used isolated sessions and actual discovered tools. This is provisional domain evidence, not the full fifteen-prompt two-round acceptance gate.

Visual observations from retained analysis: dilution mobile displays the 10 g / 1 L / 10 g/L labels and labeled adaptive capacity clearly; the scene-first reading order pushes the primary control below the fold, with the existing scroll cue. Chemical balance desktop shows the symbolic equation, fixed molecule clusters, positive coefficients and the atom-table heading; reaching table rows requires scrolling the scene. Rate desktop shows shared numerical scales, reactant/product curves, temperature action, half-life and playback controls. Detailed numerical results and model assumptions can be reached using the tested controls.

| Observation | Learner impact | Action / owner | Check | Status |
| --- | --- | --- | --- | --- |
| Chemistry was absent from shared rendering | Prompts could not activate a usable chemistry scene | Registered contributions and ChemistryLesson adapter / current integration work | Fresh exact prompts must expose scene and controls | Fixed, canonical MCP checks pass |
| Molecular geometry made follow-up context exceed the depth limit | “Balance it” failed after a successful creation | Send bounded edit summaries; retain full scene outputs in diagnostics / current integration work | Fresh balancing follow-up produces coefficients 2,1,2 | Fixed, canonical MCP checks pass |
| Parameterless balance argument object omitted by the real model | Supported balance command was rejected | Normalize only missing arguments for registered zero-argument operations / current integration work | Fresh balance request executes the same typed command | Fixed, canonical MCP checks pass |
| Mobile initial scene uses most of the available height | Primary controls need a scroll | Keep scene-first order and visible scroll cue / Agent C | Keyboard and touch can reach actions/results without page overflow | Canonical checks pass; a tighter mobile scene is optional polish |
| Fixed typo and registered-reaction variants still produced model/schema errors | Equivalent learner phrasing is unreliable | Registry-bound default and representation instructions plus bounded JSON delimiter handling / Agent C | Repeat the exact fixed variant set with real models | Not yet accepted; see live assessment |

No final numerical UX scores or integration-owner signoff are claimed. Source and inference services changed during parallel development, so the build is not a frozen full-suite candidate.


## Latest inspected candidate — 2026-10-04

The [latest live report](live-20261004/report.md) supersedes the earlier pending variant status. Six canonical and ten fixed-variant cases passed on the same source and protocol, including both reactions and independently configured rate runs. Numerical audits confirmed live outputs. Reset clears drafts, invalid inputs preserve state, assumptions can be opened/scrolled into view, controls meet the tested 44px target/focus/overflow checks, and reduced-motion rate lifecycle works. No unresolved domain blocker or major issue was observed in these cases; final integration-owner review is still required.

| Observation | Learner effect | Proposed improvement / owner | Acceptance check | Severity / disposition |
| --- | --- | --- | --- | --- |
| Scene-first mobile layout and desktop atom table require vertical scrolling | Actions or detailed counts can begin below the fold | Tighten spacing after integrated review / Agent C with Agent A | Keep all controls/results reachable at both viewports | Minor; deferred because scroll cue and actual reachability checks pass |
| Some model-authored instance titles read “Editable object” | Title gives little subject context | Improve generic labeling guidance / Agent A | Fresh creation preserves accurate subject-specific labels | Minor; deferred to avoid changing this verified candidate |
| Structural run labels retain their initial temperature after edits | Initial-temperature title can differ from current temperature | Use stable ordinal labels or explicit initial-temperature wording / Agent A | Editing second run to 350 K leaves first at 300 K and current readouts accurate | Minor; numeric controls/readouts and independent targets already pass |

No final UX scores or Agent A signoff are claimed. These written observations are retained after raw screenshot cleanup; the full fifteen-prompt two-round gate remains pending.
