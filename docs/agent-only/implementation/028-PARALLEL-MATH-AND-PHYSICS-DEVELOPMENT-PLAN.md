# Parallel implementation plan: 40 math and physics simulations

Date: 2026-10-11  
Status: Execution plan; implementation, agent launch, and live acceptance have not been performed by this document.  
Team: one orchestrator, four developers, two testers.  
Agent model policy: `gpt-6.1-sol` only, with `low` or `medium` reasoning; Astra is prohibited.  
Scope: the 20 researched math proposals and 20 researched physics proposals linked below.

## 1. Outcome and governing requirements

Deliver all 40 scenarios as scientifically correct, editable, persistable simulations in the existing application. Each must work through the normal experiment builder and Try lesson experience, and must be constructible and changeable through actual Apertus inference. A premade demonstration alone does not satisfy this goal.

The seven roles divide ownership and review; they do not divide the application into seven independent implementations. Reuse the existing component catalog, typed recipes, domain models, validation, persistence, and learner rendering. Add a shared capability only when an identified scenario requires it and the existing capability cannot serve it.

Every role must read these requirements before starting:

| Document | Required application |
| --- | --- |
| [IMPORTANT.md](IMPORTANT.md) | Mandatory precedence for simplicity and UI acceptance. Overrides conflicting templates and feature-exposure assumptions in this plan or scenario proposals. |
| [001 — Experiment builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md) | Task hierarchy, clear editing, recovery, workspace behavior, and meaningful spacing. |
| [002 — Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md) | Shared visual foundations, distinct authoring/learning contexts, accessible controls, accepted state, scene geometry, and component behavior. |
| [003 — Simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md) | One learning question; visuals teach; use composable, independently editable recipe elements. |
| [004 — Usability QA guide](../design/004-USABILITY-QA-GUIDE.md) | Opening-view inspection, outcome-only tasks, evidence categories, severity, and honest usability verdicts. |

**A technically correct simulation with an overwhelming interface is unfinished.** Scenario proposals describe possible capabilities, not a requirement to display every listed control. Begin with one obvious primary action and only the choices needed for the current learning question. One to three visible controls is a review guardrail, not a quota. Count sliders, buttons, tabs, selectors, toggles, and competing workspace actions together.

Remove unnecessary information rather than shrinking text or hiding a dashboard under “More.” Do not impose Observe / Track / Compare panels, permanent technical inspectors, fixed readout slots, or a universal playback toolbar on these scenarios. Preserve meaningful units, keyboard access, motion accommodation, and recovery.

## 2. Seven roles, with explicit boundaries

### O — Orchestrator: integration and delivery owner

The orchestrator owns the scenario ledger, task dispatch, dependency order, shared interfaces, integration branch, inference queue, ten-minute reporting timer, and final release decision.

Responsibilities:

- Inventory current implementations again before assigning work. The proposal gap assessment is a source inventory, not a guarantee that no overlapping work has since landed.
- Agree the smallest complete scope and acceptance contract for each scenario with its developer and both testers. Freeze IDs, units, model conventions, supported inputs, and observable outcomes before implementation.
- Assign exclusive file ownership; resolve overlap before edits begin. Approve shared API changes, then implement them or dispatch one named owner with a bounded task.
- Integrate completed slices sequentially, regenerate generated artifacts with their source generators, and run required checks on the combined application.
- Reserve Apertus/Laya test slots; record actual providers, models, configuration, candidate fingerprint, evidence, and failures.
- Start a recurring ten-minute timer at execution launch and write a timestamped report of each interval's activity, including screenshot directories for runs with captures. Keep reporting while work is blocked or tests are still running.
- Keep blockers actionable: owner, reproduction, affected scenarios, next action. Resolve scientific disputes against the scenario sources and an independent reference calculation.
- Review both independent tester verdicts. Reject unsupported claims, incomplete evidence, confusing UI, and untested paths. Produce the final delivery report.

Boundaries:

- Does not silently redesign every scenario or implement all four developers’ domain work.
- Does not write “passed” on behalf of a tester or waive a mandatory requirement to meet a deadline.
- Does not let integration status substitute for successful live generation.
- Does not change provider, spend on a hosted service, download a model, or deploy merely because a local acceptance run is blocked. Follow the session's existing authorization and resource constraints.

### Orchestrator's ten-minute timer and reports

At execution launch, O records the start time and starts a recurring timer with a **600-second interval**. Report deadlines are anchored to that start time: +10 minutes, +20 minutes, +30 minutes, and so on. Integration, handoffs, wave changes, and long-running tests must not restart the timer. Keep O available to handle timer events; use nonblocking tools and short waits rather than blocking the orchestrator for ten minutes.

Each tick creates a new Markdown report under `docs/agent-only/implementation/028-validation/progress/`, named with its interval-end UTC timestamp, for example `2026-10-11T08-10-00Z.md`. O links the latest report from the shared status ledger and posts a brief progress update with the report link and any screenshot directories. Reports are append-only records; later corrections are labeled rather than silently rewriting past outcomes.

Report the activity in the preceding scheduled ten-minute window, with explicit start/end timestamps and the actual write time. Use UTC for unambiguous filenames and include Asia/Manila display times in the report. Collect facts from worker updates, the ledger, test outputs, and observed run artifacts. Distinguish completed work, ongoing work, queued work, and unverified claims. If nothing changed, still write the report and explain the current wait or blocker.

Every report contains:

- Interval boundaries, actual write time, current wave, and candidate/source fingerprint.
- Each role's activity and scenario IDs during the interval, including model and reasoning settings for any agent launched or reconfigured.
- Changes integrated, developer handoffs, tester verdicts, and newly found or resolved defects.
- Tests and live inference runs started, completed, failed, or still running; run/request IDs, actual results, and Apertus/Laya status where relevant.
- Screenshot locations for every run that produced new captures during the interval, including failed and ongoing runs. State scenario ID, run ID, exact repository-relative **directory**, representative image links, and whether the images were reviewed. Use an absolute path if captures are outside the repository. Verify that reported directories actually exist; do not substitute the proposed evidence root for a real run location.
- New screenshots added to earlier runs, and an explicit “No new screenshots in this interval” when applicable. A run without captures is labeled “No screenshots captured”; an unknown location is “Not reported,” not an invented path.
- Blockers with owners, changed scenario counts, next ten-minute priorities, and the next deadline.

Example report structure:

```text
# Progress: <interval end, UTC and Asia/Manila>
Window: <start> to <end>
Written at: <actual timestamp>; on time / late by <duration>
Wave / candidate fingerprint:

Role | Scenario | Activity in this window | Current state
O / D1 / D2 / D3 / D4 / T1 / T2 | ...

Run | Scenario | Result or ongoing state | Evidence report
...

Run | Screenshot directory | Representative images | Reviewed?
...

Blockers / owners:
Scenario counts and changes:
Next ten-minute priorities:
Next report due:
```

Workers send O timestamped milestone, defect, and run updates as they happen, with exact screenshot directories once captures exist. Reports must not depend on interrupting an ongoing test to obtain its status. Missing worker information is explicitly marked unconfirmed.

Before dispatch, O verifies that its execution environment can deliver timer events while it is working. Use an available scheduler or timer facility to wake O; a reminder or heartbeat alone is not the required written report. If scheduling is unavailable, report the limitation and use checked wall-clock deadlines during active execution, without claiming an unattended background timer exists. If a tick is missed, write the missing interval report as soon as possible, label its lateness and evidence gaps, and retain the original cadence. Do not fabricate activity for unobserved time.

The timer runs for the active execution session, including blocked intervals. On an explicit pause or session end, write a final partial-window report and record that reporting stopped. On resume, record a new start time; do not claim reports were produced while the session was inactive.

### D1 — Developer: math 01–10

Owns the first ten math scenarios: place value, geometry, transformations, tiling, nets, packaging, packing, and fence optimization. Implements their model logic, owned component behavior, recipe fixtures, and focused checks. Reuses existing geometry and chart capabilities where suitable.

Special obligations: preserve exact decimal semantics where applicable; separate geometric dimensions from display scale; distinguish a packing heuristic from a proof of optimality; avoid turning six geometry activities into one overloaded control panel.

### D2 — Developer: math 11–20

Owns the last ten math scenarios: feasible choices, statistics, sampling, regression, probability, counting, amortization, differentiation, and accumulation.

Special obligations: state population/sample and rate conventions; make randomness reproducible for tests; handle undefined results honestly; verify loan rounding/final payment and calculus units; keep each opening view focused on its actual question.

### D3 — Developer: physics 01–10

Owns mechanics and fluids: levers, pulleys, gears, tipping, collisions, buoyancy, pressure, hydraulics, pipe flow, and parachutes.

Special obligations: enforce units and conservation laws; state idealizations; count supporting rope strands correctly; distinguish static and dynamic assumptions; ensure animation reflects computed state rather than a decorative predetermined trajectory.

### D4 — Developer: physics 11–20

Owns turning, optics, waves, conduction, cooling, phase change, induction, and capacitor transients.

Special obligations: distinguish singular/virtual optical results; verify frequency/sign conventions, thermal energy accounting, and time constants; provide stable numerical integration where required; do not add unsupported field solvers or circuit topology editors.

### Common developer responsibilities and limits

Each developer delivers complete vertical slices: model, bounded input validation, catalog contribution, composable recipe, scene/control behavior, persistence, learner behavior, focused tests, and a handoff report. The orchestrator handles shared registration edits unless explicitly delegated.

Before handoff, developers must:

1. Read the scenario research and relevant design guides; agree its contract.
2. Inspect existing components and model contributions before adding equivalents.
3. Build the smallest lesson answering the selected learning question.
4. Verify reference values, boundary inputs, invariants, and state transitions with meaningful tests.
5. Check builder editing, saving, reopening, and Try lesson locally.
6. Inspect opening and changed views; remove unjustified controls.
7. Request an early real-inference canary through the orchestrator’s queue.
8. Submit owned changes and evidence with known limitations and failing checks disclosed.

Developers cannot self-accept a scenario, edit another developer’s owned files without reassignment, patch shared planner/provider behavior to bypass a failure, or weaken validators to force a generated recipe through. They may assist diagnosis, but tester conclusions remain independent. A blocked shared dependency is a task for the orchestrator, not permission for simultaneous shared edits.

### T1 — Tester: scientific correctness and runtime integrity

Owns independent numerical reference checks, model invariants, schema/recipe integrity, and state/persistence regression evidence for **all 40** scenarios.

Responsibilities:

- Derive expectations independently from cited sources, closed-form calculations, or a trusted reference method. Do not merely copy the production formula into a test.
- Check units, domain limits, singularities, numerical convergence, conservation, randomness, and transitions.
- Check typed recipe validation, component connections, reconstruction after save/reopen, and builder/learner consistency.
- Inspect recipes actually produced by Apertus, including changed recipes, for valid configuration and scientific meaning. A valid JSON shape can still encode the wrong lesson.
- Verify failed or cancelled generation preserves the last accepted lesson and does not display unaccepted results as success.
- Review failure evidence with T2, own correctness verdicts, and retest fixes against the same contract.

Boundaries: no production model fixes, no catalog ownership, no substituting premades for generation, no claiming usability from numerical tests. Test harness changes stay in assigned tester paths. Model defects go back to the owning developer; shared runtime defects go to O.

### T2 — Tester: usability and real-inference experience

Owns independent browser/task review and live Apertus/Laya evidence for **all 40** scenarios. Coordinates with T1 rather than splitting testing into “math tester” and “physics tester.”

Responsibilities:

- Inspect the opening screen before reading implementation notes or a walkthrough. Identify the learning question, primary action, competing controls, visual emphasis, and readable labels.
- Perform outcome-only tasks, such as “make the ladder longer while keeping the wall height fixed,” without following a developer-written sequence of clicks.
- Operate the ordinary builder and Try lesson flows; inspect actual scene geometry, not merely whether an SVG or canvas mounted.
- Submit the exact learner prompts, paraphrases, and follow-ups through the normal application with actual Apertus and Laya. Inspect accepted output and visible behavior.
- Test keyboard operation, focus, reduced motion, short desktop height, relevant supported viewports, invalid-input recovery, and follow-up discoverability.
- Capture and inspect opening and meaningful changed states with Playwright MCP when available. Label browser automation or another capture method as fallback when MCP is unavailable.
- Report Pass / Concern / Fail / Not tested with severity, reproduction, evidence, and unresolved issues.

Boundaries: no production UI fixes, no rewriting a failing prompt to make it pass without preserving the original failure, no mocking successful provider replies for live acceptance, and no claiming novice comprehension without participant evidence. Automated browser success and reviewer judgment must be reported separately from observed human first-use results.

### Responsibility matrix

| Activity | Owner | Reviewer / contributor | Acceptance authority |
| --- | --- | --- | --- |
| Scenario scope, dispatch, ownership ledger | O | Assigned D, T1, T2 | O, subject to mandatory requirements |
| Domain model and owned UI/recipe implementation | Assigned D | T1 for model; T2 for experience | Both testers must sign off |
| Shared catalogs, planner integration, dependencies, generators | O or one explicit delegate | Affected Ds and testers | O after relevant checks |
| Independent scientific/runtime checks | T1 | D supplies reproduction context | T1 |
| Usability and live-generation evidence | T2 | T1 inspects accepted recipes; D diagnoses | T2 |
| Inference scheduling and resource configuration | O | T2 executes; T1 reviews trace meaning | O |
| Production bug fix | Owning D; O for shared code | Reporting tester retests | Original tester |
| Final integration and release report | O | T1 and T2 sign-offs | O; no mandatory gate may be waived |

## 3. Assignment manifest: exactly 40 scenarios

Use the stable IDs below in contracts, commits, issues, evidence, and status reports. Each link is the researched specification; its exact **Human prompt** is the canonical creation prompt. Preserve that wording in the acceptance manifest rather than inventing a more convenient test prompt.

| ID | Developer | Researched specification |
| --- | --- | --- |
| MATH-01 | D1 | [Decimal place value](../simulations/math/01-DECIMAL-PLACE-VALUE.md) |
| MATH-02 | D1 | [Pythagorean theorem and ladder length](../simulations/math/02-PYTHAGOREAN-THEOREM.md) |
| MATH-03 | D1 | [Trigonometry for measuring heights](../simulations/math/03-TRIGONOMETRY-FOR-MEASURING-HEIGHTS.md) |
| MATH-04 | D1 | [Scale drawings and similar shapes](../simulations/math/04-SCALE-DRAWINGS-AND-SIMILAR-SHAPES.md) |
| MATH-05 | D1 | [Reflections, rotations, and translations](../simulations/math/05-REFLECTIONS-ROTATIONS-AND-TRANSLATIONS.md) |
| MATH-06 | D1 | [Tessellations and tile patterns](../simulations/math/06-TESSELLATIONS-AND-TILE-PATTERNS.md) |
| MATH-07 | D1 | [Folding nets into boxes](../simulations/math/07-FOLDING-NETS-INTO-BOXES.md) |
| MATH-08 | D1 | [Packaging with the least material](../simulations/math/08-PACKAGING-WITH-THE-LEAST-MATERIAL.md) |
| MATH-09 | D1 | [Packing boxes into a container](../simulations/math/09-PACKING-BOXES-INTO-A-CONTAINER.md) |
| MATH-10 | D1 | [Quadratics through a fencing problem](../simulations/math/10-QUADRATICS-THROUGH-A-FENCING-PROBLEM.md) |
| MATH-11 | D2 | [Inequalities and feasible choices](../simulations/math/11-INEQUALITIES-AND-FEASIBLE-CHOICES.md) |
| MATH-12 | D2 | [Mean, median, and outliers](../simulations/math/12-MEAN-MEDIAN-AND-OUTLIERS.md) |
| MATH-13 | D2 | [Spread and standard deviation](../simulations/math/13-SPREAD-AND-STANDARD-DEVIATION.md) |
| MATH-14 | D2 | [Sampling and survey uncertainty](../simulations/math/14-SAMPLING-AND-SURVEY-UNCERTAINTY.md) |
| MATH-15 | D2 | [Regression and the effect of outliers](../simulations/math/15-REGRESSION-AND-THE-EFFECT-OF-OUTLIERS.md) |
| MATH-16 | D2 | [Conditional probability and hidden origins](../simulations/math/16-CONDITIONAL-PROBABILITY.md) |
| MATH-17 | D2 | [Combinations versus permutations](../simulations/math/17-COMBINATIONS-VERSUS-PERMUTATIONS.md) |
| MATH-18 | D2 | [Loan repayment and amortization](../simulations/math/18-LOAN-REPAYMENT-AND-AMORTIZATION.md) |
| MATH-19 | D2 | [Derivatives as an instantaneous rate](../simulations/math/19-DERIVATIVES-AS-INSTANTANEOUS-RATE.md) |
| MATH-20 | D2 | [Integration as accumulated quantity](../simulations/math/20-INTEGRATION-AS-ACCUMULATED-QUANTITY.md) |
| PHYS-01 | D3 | [Levers and mechanical advantage](../simulations/physics/01-LEVERS-AND-MECHANICAL-ADVANTAGE.md) |
| PHYS-02 | D3 | [Pulley systems and lifting effort](../simulations/physics/02-PULLEY-SYSTEMS.md) |
| PHYS-03 | D3 | [Gears and bicycle ratios](../simulations/physics/03-GEARS-AND-BICYCLE-RATIOS.md) |
| PHYS-04 | D3 | [Centre of mass and tipping](../simulations/physics/04-CENTRE-OF-MASS-AND-TIPPING.md) |
| PHYS-05 | D3 | [Collisions and momentum](../simulations/physics/05-COLLISIONS-AND-MOMENTUM.md) |
| PHYS-06 | D3 | [Floating, sinking, and buoyancy](../simulations/physics/06-FLOATING-SINKING-AND-BUOYANCY.md) |
| PHYS-07 | D3 | [Water pressure with depth](../simulations/physics/07-WATER-PRESSURE-WITH-DEPTH.md) |
| PHYS-08 | D3 | [Hydraulic lifts and piston areas](../simulations/physics/08-HYDRAULIC-LIFTS.md) |
| PHYS-09 | D3 | [Flow through narrow and wide pipes](../simulations/physics/09-FLOW-THROUGH-NARROW-AND-WIDE-PIPES.md) |
| PHYS-10 | D3 | [Parachutes and terminal velocity](../simulations/physics/10-PARACHUTES-AND-TERMINAL-VELOCITY.md) |
| PHYS-11 | D4 | [Turning and circular motion](../simulations/physics/11-TURNING-AND-CIRCULAR-MOTION.md) |
| PHYS-12 | D4 | [Lens focusing and image formation](../simulations/physics/12-LENS-FOCUSING-AND-IMAGE-FORMATION.md) |
| PHYS-13 | D4 | [Fibre optics and total internal reflection](../simulations/physics/13-FIBRE-OPTICS-AND-TOTAL-INTERNAL-REFLECTION.md) |
| PHYS-14 | D4 | [Doppler effect and passing sound sources](../simulations/physics/14-DOPPLER-EFFECT.md) |
| PHYS-15 | D4 | [Guitar strings and standing waves](../simulations/physics/15-GUITAR-STRINGS-AND-STANDING-WAVES.md) |
| PHYS-16 | D4 | [Heat conduction through materials](../simulations/physics/16-HEAT-CONDUCTION-THROUGH-MATERIALS.md) |
| PHYS-17 | D4 | [Cooling a hot drink](../simulations/physics/17-COOLING-A-HOT-DRINK.md) |
| PHYS-18 | D4 | [Melting, boiling, and latent heat](../simulations/physics/18-MELTING-BOILING-AND-LATENT-HEAT.md) |
| PHYS-19 | D4 | [Electromagnetic induction](../simulations/physics/19-ELECTROMAGNETIC-INDUCTION.md) |
| PHYS-20 | D4 | [Capacitor charging and discharging](../simulations/physics/20-CAPACITOR-CHARGING-AND-DISCHARGING.md) |

## 4. Parallelism, file isolation, and shared work

### Mandatory agent model and reasoning policy

All seven roles, replacements, and any explicitly authorized helper agents must use **`gpt-6.1-sol` with reasoning effort `low` or `medium` only**. **Astra, including `gpt-6-astra`, is not allowed.** Other models and higher reasoning efforts are also outside this policy. Do not escalate models automatically when a task is difficult or an agent fails.

| Role | Required model | Default reasoning | Permitted reasoning |
| --- | --- | --- | --- |
| O | `gpt-6.1-sol` | `medium` | `low` or `medium` |
| D1–D4 | `gpt-6.1-sol` | `medium` | `low` or `medium` |
| T1 | `gpt-6.1-sol` | `medium` | `low` or `medium` |
| T2 | `gpt-6.1-sol` | `low` | `low` or `medium` |

O checks its own model before dispatch and explicitly sets the allowed model and effort for every worker launch. When the launch interface requires a bounded or empty context fork to apply overrides, supply that fork and attach the contract, owned paths, and required document links explicitly; do not inherit an unverified parent model. Record the requested and confirmed settings in the ledger and report any mismatch. If the allowed model cannot be selected or verified, stop the affected launch and report the blocker; do not silently substitute Astra or another model. This applies equally to separate sessions and worktrees.

This restriction governs the coding and testing agents. The application still uses actual **Apertus** inference and **Laya** decisions for the acceptance runs described in section 8; do not switch the application's inference provider to the agents' coding model.

### Logical team versus available execution slots

The intended deployment has seven logical roles. Seven agents can run simultaneously only if the actual Codex/session configuration provides at least seven execution slots and sufficient machine capacity. The session in which this plan was prepared exposes four slots, including its primary agent; it cannot host this entire team simultaneously.

O must check available capacity before launch. On a seven-slot setup, keep all roles active with bounded work. On a four-slot setup, retain all seven role assignments but time-slice them: O + two developers + one tester during implementation, then O + one developer + both testers during acceptance. Rotate developers fairly. Record inactive roles as queued; do not report seven concurrent workers. Separate sessions/worktrees are an alternative only after confirming access, capacity, and integration ownership.

This plan documents future work. It does not launch agents or authorize deployment by itself.

### Isolation model

Prefer an isolated Git worktree and branch per developer when the environment permits creating them. Establish an integration checkout owned by O and separate tester checkouts or a frozen candidate checkout. Use the repository’s actual branch conventions; suggested names such as `simulations/d1-math-geometry` are examples, not existing branches.

If worktrees are unavailable, use one checkout with strict, nonoverlapping path ownership. O records the allowed paths before dispatch. No worker performs a reset, clean, checkout, dependency installation, lockfile edit, or broad formatting sweep that can affect another worker. Preserve pre-existing and unrelated changes.

Assign scenario-specific paths under the existing domain/component structure, with T1 and T2 owning separate test/report directories. Four developers may share a conceptual domain, so “you own math” is not sufficient isolation: name exact files or separate contribution modules. Shared entry points and generated files remain O-owned.

Examples of shared integration surfaces to inspect, not automatically rewrite:

- `src/web/src/simulations/components/catalog/index.ts` and related component metadata.
- `src/web/src/simulations/runtime/catalog.ts`, `runtime/mathCatalog.ts`, domain contributions, and recipe compatibility.
- `src/web/src/lib/planner/catalog.ts` and the existing generation/validation pipeline.
- `src/web/src/simulations/runtime/recipes/premadeRegistry.generated.ts` and its source generator, `src/web/scripts/recipes/generate-registry.cjs`.
- Package scripts, shared test utilities, dependency manifests, and lockfiles.

Do not hand-edit generated registry output. Do not equate support in a deterministic generation fast path with support throughout the application: inspect the existing catalog eligibility and composition rules and integrate through their real contracts.

### Minimal shared preparation

O first confirms contribution shape, input/output typing, model state ownership, catalog metadata, recipe persistence, learner rendering, and generation eligibility. Reuse what exists. If a missing common primitive blocks several scenarios, define one bounded task with affected IDs and an acceptance example; finish that dependency before dependent work begins. Do not make a generic simulation engine or universal lesson dashboard a prerequisite.

The interface agreement must state who owns canonical values, how inputs update them, how invalid drafts differ from accepted state, what is serialized, and how generated recipes select/configure the capability. Presentation resizing must not change physical quantities or reset the model.

## 5. Delivery waves and workload limits

Each developer owns ten scenarios. Start with four pilot slices to expose problems across geometry, statistics, mechanics, and time-dependent physics. Complete the full model → builder → real inference → learner → independent review cycle for these pilots before scaling the queue.

| Wave | D1 | D2 | D3 | D4 |
| --- | --- | --- | --- | --- |
| 0 — pilot | MATH-02 | MATH-12 | PHYS-01 | PHYS-17 |
| 1 | MATH-01 | MATH-13 | PHYS-02 | PHYS-20 |
| 2 | MATH-03 | MATH-15 | PHYS-03 | PHYS-12 |
| 3 | MATH-04 | MATH-17 | PHYS-04 | PHYS-13 |
| 4 | MATH-05 | MATH-16 | PHYS-05 | PHYS-14 |
| 5 | MATH-06 | MATH-14 | PHYS-06 | PHYS-15 |
| 6 | MATH-10 | MATH-11 | PHYS-08 | PHYS-11 |
| 7 | MATH-08 | MATH-18 | PHYS-07 | PHYS-18 |
| 8 | MATH-07 | MATH-19 | PHYS-09 | PHYS-19 |
| 9 | MATH-09 | MATH-20 | PHYS-10 | PHYS-16 |

These are delivery groups, not an assumption that every scenario costs the same. Packing, folding nets, conduction, and induction may need more investigation than a closed-form statistics lesson. O can reorder after recording a dependency or measured cost; preserve the 40-item scope and ownership ledger.

Limit each developer to one active scenario and, at most, one handed-off scenario awaiting review. Prefer clearing defects over opening another scenario. Testers review integrated slices as they arrive; they do not wait until forty implementations are complete. O pauses new dispatch when the testing queue grows beyond the team’s capacity.

Within a wave, independent model and UI work can proceed in parallel. Shared registry edits, integrations, and inference calls follow their designated queues. If a prerequisite blocks one scenario, its developer can take the next independent assigned item with O’s recorded reassignment.

## 6. The per-scenario contract

Before implementation, O and the assigned developer record this contract, with T1/T2 review:

```text
ID / specification / developer:
Learning question and outcome-only learner task:
Canonical Human prompt (verbatim) and two natural paraphrases:
One obvious primary action:
Default visible controls and why each is essential:
Visible change that teaches the answer:
Objects, units, typed inputs/outputs, accepted-state owner:
Model equations, source references, and idealizations:
Reference example, tolerance, and independent oracle:
Valid range, singular cases, and invalid-input response:
Random seed / timestep / convergence rule, where applicable:
Existing primitives to reuse; proposed owned file paths:
Shared dependencies and named owner:
Recipe structure and independent editing expectations:
Save/reopen and Try lesson equivalence checks:
Two supported follow-ups, including a structural change when applicable:
One unsupported or invalid request and safe recovery expectation:
Evidence needed from T1 and T2:
Explicit exclusions and unresolved questions:
```

A structural follow-up means a supported change to objects, connections, or lesson composition, not simply relabeling a slider. Do not require arbitrary topology changes for every model. Define a meaningful supported change for the scenario; record why a parameter-only lesson is appropriate when structural change is outside its model. Test rejection or clarification for unsupported extensions.

Paraphrases must retain the learner’s intent, not mention internal component IDs. Follow-ups must target the generated lesson and preserve quantities the learner asked to keep fixed. Validate meaning as well as schema.

The researched proposals are the starting scientific scope. If new research changes an assumption, update the contract and explain the evidence before implementation; do not quietly make the test easier. Use the proposals’ authoritative references and add primary references where a numerical method or edge case needs further support.

## 7. Minimum independent correctness cases for all 40

These are starting oracles, not the entire test suite. T1 must specify tolerances and derive expectations independently. Numerical rounding in the scene may be coarser than internal computation, but must not change conclusions.

### Math

| ID | Reference result / invariant | Important boundary or misleading shortcut |
| --- | --- | --- |
| MATH-01 | Exchanging 3 tenths for 30 hundredths preserves 12.34; multiplying it by 10 gives 123.4. | Decimal representation and trailing zeros; avoid floating-point artifacts in place-value teaching. |
| MATH-02 | Legs 3 m and 4 m give hypotenuse 5 m; square areas 9 + 16 = 25 m². | Reject impossible leg-solving inputs and distinguish the right-angle constraint. |
| MATH-03 | Distance 10 m, elevation 45°, eye height 1.5 m give height 11.5 m. | Near-vertical singularity, angle units, and valid survey geometry. |
| MATH-04 | Scaling a 3 × 4 rectangle by 2 produces 6 × 8; area rises from 12 to 48. | Length factor and area factor differ; changing display zoom must not change either. |
| MATH-05 | Rigid transformations preserve distances; reflection reverses orientation. | Transformation order can change the result; test composition, not just individual buttons. |
| MATH-06 | Three regular hexagon angles meet at 360°; three regular pentagon angles leave 36°. | Local angle fit alone does not prove a full tiling; some irregular pentagons tile. |
| MATH-07 | A valid six-face cube net folds without duplicate faces or overlap. | A six-square strip is not automatically a valid cube net; adjacency and final face occupancy matter. |
| MATH-08 | A closed 500 cm³ cylinder minimizes surface area at h = 2r, approximately r = 4.301 cm. | Closed versus open packaging changes the optimum; constrain positive dimensions. |
| MATH-09 | A 10-unit cube holds only one axis-aligned 6-unit cube, despite a volume upper bound of four. | A volume bound or heuristic arrangement does not prove optimal packing; document permitted rotations. |
| MATH-10 | Four-sided fencing of length 20 gives a maximum area of 25 at 5 × 5. | Three-sided fencing is a different problem; enforce the chosen fence constraint. |
| MATH-11 | With budget 100, notebooks 30 and pens 10: two notebooks and four pens cost 100. | Two notebooks and five pens violate the constraint; distinguish integer choices from a continuous region. |
| MATH-12 | 100,110,…,160 have mean/median 130; replacing 160 with 1000 gives mean 250, median 130. | Empty data is undefined; sorted display and median parity must remain correct. |
| MATH-13 | Populations 68–72 and 50,60,70,80,90 share mean 70 but standard deviations √2 and √200. | Explicit population/sample denominator; sample deviation with fewer than two observations is undefined. |
| MATH-14 | At p = 0.6, standard error is about 0.1095 for n = 20 and 0.0219 for n = 500. | Repeated random samples vary; a larger biased sample does not eliminate bias. |
| MATH-15 | Points (1,50)…(5,90) fit y = 40 + 10x with zero residuals. | Equal x-values make the ordinary slope undefined; correlation does not establish causation. |
| MATH-16 | Equal-prior bags with blue fractions 0.8 and 0.2 give P(first bag given blue) = 0.8. | Conditioning on an impossible event is undefined, not zero. |
| MATH-17 | Selecting three from five: 60 ordered arrangements, 10 unordered groups, six orders per group. | k > n, zero selections, replacement rules, and integer-count overflow. |
| MATH-18 | Principal 1200, nominal annual rate 12%, 12 monthly payments: payment ≈ 106.619. | Zero rate gives 100; final payment/rounding and extra-payment termination must not create negative balances. |
| MATH-19 | For s(t) = t² at t = 3, derivative is 6; forward secants with h = 1 and 0.1 are 7 and 6.1. | h = 0 is not a finite-difference computation; preserve rate units and approximation meaning. |
| MATH-20 | Flow q(t) = 2 + t from 0 to 3 accumulates 10.5 L; three left/right unit rectangles give 9/12 L. | Signed accumulation, timestep refinement, and any capacity/overflow accounting must be explicit. |

### Physics

| ID | Reference result / invariant | Important boundary or misleading shortcut |
| --- | --- | --- |
| PHYS-01 | A 100 N load at 0.2 m balances 20 N effort at 1 m; ideal effort travel is five times load travel. | Torque signs and zero moment arms; reduced force is not free energy. |
| PHYS-02 | A 200 N load with four supporting strands requires 50 N; pulling 1 m lifts it 0.25 m ideally. | Count strands supporting the load, not the number of pulley wheels. |
| PHYS-03 | A 30:15 chain drive gives wheel/crank speed ratio 2 and ideal output torque ratio 1/2. | Chain-drive direction differs from meshing external gears; use the specified mechanism. |
| PHYS-04 | A centered body with base width 0.6 m and center-of-mass height 1 m tips at arctan(0.3) ≈ 16.699°. | Quasi-static no-sliding assumption; a tall illustration alone must not determine tipping. |
| PHYS-05 | A 2 kg body at 3 m/s sticking to a stationary 1 kg body gives 2 m/s; kinetic energy drops 9 → 6 J. | Momentum remains conserved; lost kinetic energy must not be described as lost total energy. |
| PHYS-06 | A 10 kg floating body in water of density 1000 kg/m³ displaces 0.01 m³. | Insufficient displaced volume causes sinking; partial submersion, flooding, and maximum buoyancy matter. |
| PHYS-07 | Constant-head water surface 1 m above ground: holes at 0.5 m and 0.1 m yield ranges 1 m and 0.6 m. | Greater pressure/speed does not always mean greater horizontal range; variable head needs a different model. |
| PHYS-08 | Areas 1 and 20 cm²: 100 N produces 2000 N; 20 cm input stroke gives 1 cm output stroke ideally. | Equal-height Pascal pressure changes and displacement conservation; absolute pressure is not universally equal. |
| PHYS-09 | At fixed flow, halving area doubles speed; water speeding 1 → 2 m/s lowers pressure by 1500 Pa at equal height ideally. | Hold the stated boundary condition fixed; reject physically invalid pressure regimes rather than drawing impossible flow. |
| PHYS-10 | At m = 80 kg, air density 1.2, Cd = 1.5, area 20 m², terminal speed ≈ 6.603 m/s; area 40 gives ≈ 4.669. | Drag opposes velocity; deployment transitions and numerical stability must be tested. |
| PHYS-11 | Required centripetal force scales as v²/r; at r = 10 m and μ = 0.5, traction limit is ≈ 7.004 m/s for g = 9.81. | Show an exceeded traction limit honestly; do not animate a claimed skid model that is not implemented. |
| PHYS-12 | f = 10 cm, object distance 30 cm gives image 15 cm, inverted at half size; object 5 cm gives image −10 cm. | At object distance f there is no finite image; virtual images need correct ray interpretation. |
| PHYS-13 | For indices 1.5 → 1.45, critical angle ≈ 75.165°: 80° gives total internal reflection, 70° does not. | No total internal reflection from lower to higher index; angles are measured from the normal. |
| PHYS-14 | A 700 Hz source moving at 20 m/s with sound speed 343 gives ≈ 743.344 Hz approaching and 661.433 Hz receding. | General trajectories require radial geometry; do not force an instantaneous frequency jump in an off-axis pass. |
| PHYS-15 | L = 0.65 m, tension 65 N, linear density 0.005 kg/m give fundamental ≈ 87.706 Hz. | Fixed ends are nodes; halving length doubles frequency; modes must match the frequency calculation. |
| PHYS-16 | A uniformly constant-temperature conduction state stays constant; insulated boundaries conserve thermal energy. | Diffusivity is k/(ρcp); steady-state heat flux alone does not simulate transient warming. Check convergence and stability. |
| PHYS-17 | T₀ = 80°C, ambient 20°C, k = 0.05/min gives ≈ 56.392°C after ten minutes. | Temperature approaches ambient without numerical overshoot in this model; do not claim evaporation is included. |
| PHYS-18 | Melting 0.1 kg with latent heat 334 kJ/kg needs 33.4 kJ; at 100 W it takes 334 s starting at melting temperature. | Account for sensible heat before/after the phase change; plateau energy changes phase fraction. |
| PHYS-19 | Changing per-turn flux by 0.002 Wb in 0.1 s through 100 turns gives average emf magnitude 2 V. | Flux rate and sign matter; stationary flux gives zero emf. Do not infer free energy or unsupported field dynamics. |
| PHYS-20 | R = 10 kΩ and C = 100 μF give τ = 1 s; charge/discharge fractions after τ are ≈ 0.632/0.368. | Switching preserves capacitor voltage continuity; an isolated capacitor is not automatically connected to a discharge resistor. |

## 8. Apertus inference is a first-class acceptance requirement

### What “using Apertus” means

The application's generation and revision requests must use the actual configured Apertus inference service. Coding agents may run on their own Codex models; this plan does not claim that the seven coding/testing roles themselves run on Apertus.

The repository separates LLM inference from decision routing. Verify both the actual Apertus call and actual Laya decision service where the generation pipeline requires decisions. The mandatory guide calls for real Apertus and Laya; a deterministic premade lookup, mocked response, cached recipe, or label saying “Apertus” is not sufficient evidence.

Read the resolved configuration, not just a single environment variable. Relevant implementations include:

- `src/web/src/lib/llm/config.ts` — provider/model selection and generic overrides.
- `src/web/src/lib/apertus/config.ts` and `transport.ts` — local/hosted configuration, bounded structured requests, concurrency, retries, and metadata.
- `src/web/src/lib/decisions/config.ts` and `providers/laya.ts` — decision routing and real Laya requests.

The following example matches the current local defaults; it is **not evidence that these services are running**:

```dotenv
LLM_PROVIDER=apertus
APERTUS_PROVIDER=local
APERTUS_LOCAL_RUNTIME=mlx
APERTUS_LOCAL_BASE_URL=http://127.0.0.1:43101/v1
APERTUS_LOCAL_MODEL=m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4
APERTUS_MAX_CONCURRENT_REQUESTS=1
DECISION_PROVIDER=laya
LAYA_BASE_URL=http://127.0.0.1:43102
```

O checks generic overrides such as `LLM_MODEL`, `LLM_MAX_CONCURRENT_REQUESTS`, token limits, and timeouts, which can override Apertus-specific settings. Record the resolved model/provider and observed request metadata. Keep credentials out of prompts, commits, screenshots, and reports. Hosted inference is an optional separately authorized configuration, not an automatic fallback.

### One shared inference queue

Start with one in-flight acceptance request across the team. The existing transport concurrency limit is process-local: four application processes each configured for one request can still overload one shared model server. O therefore owns a team-wide reservation schedule, including developer canaries, tester runs, and other local users of the same server.

Use a simple recorded lease or scheduled slot before building a new coordination service. The lease names owner, application instance, candidate fingerprint, scenario, start time, request ID, and timeout. Release it after completion or confirmed cancellation. Testers coordinate over the same accepted recipe and trace; they do not each generate a duplicate lesson merely to obtain their own copy.

Increase concurrency only after measuring stable latency and failure rates on the actual machine. Browser instances may operate independently on already-generated lessons, but inference calls remain queued. Bound timeouts, retries, and total attempts; record schema probes and repair calls as real inference work. A 429, timeout, malformed reply, or decision-service failure is a recorded result, not a reason for unlimited retries.

### Live test sequence for each scenario

1. Freeze the candidate and acceptance manifest. Confirm actual provider configuration and start the application normally.
2. Open a fresh lesson/draft. Submit the canonical prompt through the ordinary prompt UI. Observe real generation/decision requests without replacing their responses.
3. Record request IDs, observed provider/model, stage outcomes, decision results, timing, token usage if supplied, validation result, and accepted recipe/configuration. Distinguish absent metadata from zero usage.
4. T1 checks that the recipe represents the requested scientific model with sensible parameters and typed connections. T2 inspects the opening learner view.
5. Perform the outcome-only learning task and compare the visible result with the model's accepted state.
6. Apply the two contracted follow-ups to the canonical generated lesson. Inspect the actual new accepted recipes and verify that retained constraints remain unchanged.
7. Submit the invalid or unsupported request. It must clarify or reject appropriately and preserve the last accepted lesson. Test cancel/recovery separately if required by the flow.
8. Save, reopen, edit a relevant supported element independently, and open Try lesson. Verify that meaning, quantities, connections, and state persist.
9. Create fresh lessons from both natural paraphrases; check the same learning intent and valid model without requiring byte-identical layouts or IDs.
10. Retain inspected opening/changed-state images, concise trace evidence, verdicts, and reproduction details.

Supported prompts must work as intended; an unsupported request passes through honest clarification/rejection, not fabricated capability. No hidden keyword route may masquerade as real inference. Deterministic fixtures remain useful for development checks, but cannot replace this live sequence.

### Two complete release rounds

This plan requires two complete qualifying rounds over all 40 scenarios on the **same frozen release candidate**, acceptance manifest, and resolved configuration. Run rounds sequentially, using fresh generation for each scenario. Do not tune prompts, code, or provider settings between qualifying rounds.

For each scenario per round, run one canonical creation, two paraphrase creations, two canonical-lesson follow-ups, and one invalid/unsupported request: six product requests. Across 40 scenarios and two rounds that is 480 product requests, excluding canaries, retries, internal planning stages, schema probes, and repair calls. This is a workload estimate, not a claim of 480 model calls or a cost/time guarantee. O must budget using measured pilot throughput and track actual inference usage.

Wave-level checks are provisional evidence. Final rounds happen after all 40 are integrated. If a qualifying round fails, keep the evidence, fix the defect, and freeze a new candidate; it needs two complete passing rounds. Earlier wave success cannot prove a later shared change did not break a scenario. If local services or time/capacity make this impossible, report “live acceptance blocked/incomplete,” not “complete with mocks.”

## 9. Verification gates and completion states

### Gate A — scoped and ready

Contract, owner, exclusive paths, required primitives, scientific assumptions, oracle, prompt/follow-up manifest, and simple opening experience agreed. No unresolved dependency preventing meaningful implementation.

### Gate B — developer verified

Focused model and boundary checks pass; source/recipe integration works; builder, save/reopen, and Try lesson have been exercised. Opening/changed views inspected; early inference canary recorded or explicitly blocked. Developer handoff includes known failures and limitations. This is not acceptance.

### Gate C — integrated and independently reviewed

O integrates the slice; both testers review the actual combined application. T1 signs correctness/runtime evidence; T2 signs usability/live-experience evidence. Blocking or major findings require fixes. Minor findings need recorded disposition and cannot contradict IMPORTANT.md. Any required Not tested result remains an open gate.

### Gate D — release qualified

All 40 have both tester sign-offs, required combined regression checks pass, and two complete live rounds pass on the frozen candidate. The final report lists evidence, limitations, remaining nonblocking issues, actual providers/models, and candidate/configuration fingerprints. “Implemented” and “release qualified” remain separate ledger states.

Suggested ledger fields:

```text
ID | owner | contract version | state | candidate fingerprint |
developer checks | T1 verdict | T2 verdict | live round 1 | live round 2 |
blocking issue | evidence links | next action
```

Suggested states: Proposed → Scoped → Implementing → Developer verified → Integrated → In review → Provisionally accepted → Release qualified. Also use Blocked and Regressed with an explicit owner and next action. Only O changes the shared ledger; testers publish verdicts in their own reports.

A fingerprint must identify the tested source, not merely the latest commit if the checkout is dirty. Prefer a clean committed candidate; otherwise include relevant source-content hashes and describe outstanding changes. Environment configuration and the prompt manifest are separately fingerprinted without storing secrets.

### Practical check execution

From `src/web`, inspect current package scripts before running them. Existing useful checks include:

```sh
pnpm lint
pnpm test:recipes
pnpm test:public-catalog
pnpm test:controls
pnpm test:generation:contract
pnpm test:generation:architecture
pnpm test:generation:construction
pnpm test:builder:parity
pnpm build
```

Run focused relevant checks during slice development. O runs required broad checks, including the applicable full test suite, on the combined candidate and after meaningful fixes. Record baseline failures separately; do not call a failing required check passed because it predates the work. Do not repeat broad checks without new changes or unresolved concerns.

These existing scripts do not automatically cover the new 40 scenarios. Add meaningful coverage through bounded owned tasks and register it centrally. Test conservation, invalid inputs, persistence, structural edits, and independently known outcomes; avoid tests that only restate implementation expressions or snapshots of incidental markup.

Existing live scripts can inform the harness, including `src/web/scripts/generation/verify-realistic-live.cjs` and `src/web/scripts/domains/earth-atmosphere/live-ui.cjs`. Their existing cases, environment flags, and evidence-root constraints are specific to prior work. Do not assume changing an output variable makes them a 40-scenario harness. O owns a minimal adaptation or a bounded new runner with the new manifest and approved evidence path.

## 10. Evidence and handoff conventions

Use a dedicated evidence area when execution starts; the paths below are proposed, not files created by this plan:

```text
docs/agent-only/implementation/028-validation/
  assignment-and-status.md                 # O only
  progress/<INTERVAL-END-UTC>.md           # O: report every ten minutes
  contracts/<SCENARIO-ID>.md               # O records agreed contract
  developer/<D>/<SCENARIO-ID>.md           # owning developer
  tester-model/<SCENARIO-ID>.md            # T1
  tester-experience/<SCENARIO-ID>.md       # T2
  round-1/<SCENARIO-ID>/                   # live trace/image evidence
  round-2/<SCENARIO-ID>/
  release-report.md                       # O; tester verdicts linked
```

O agrees which sanitized reports belong in version control and where large captures/raw traces are retained or ignored. Preserve enough trace detail, source identity, image identity, and reproduction information for an independent review. Keep failed-run evidence; avoid flooding the repository with unbounded binaries or deleting evidence just because a later attempt passed.

Developer handoff:

```text
Scenario / contract / source fingerprint:
Owned changes and required shared integration:
Learning question / opening action / default control count:
Scientific model / units / idealizations:
Tests run and actual results:
Builder, persistence, and learner checks:
Early inference request and evidence:
Known limitations, failures, and next action:
```

Tester finding:

```text
Scenario / candidate / provider configuration:
Task and exact input:
Expected outcome and source/oracle:
Observed outcome:
Evidence type: visual review / interaction / numerical / participant:
Verdict: Pass / Concern / Fail / Not tested:
Severity: blocking / major / minor:
Reproduction and evidence links:
Fix owner and required retest:
```

An infrastructure failure and a model/UX defect are different findings, but both can block their respective gates. Retrying an unchanged transient failure may be appropriate within the bounded attempt policy; changing code, prompts, or configuration creates a new candidate or test condition and must be recorded.

## 11. Dispatch instructions for the seven roles

These are bounded task templates for a future launch; attach the current ledger, contract, owned paths, repository instructions, and required reading.

Every dispatch must specify `model: gpt-6.1-sol` and `reasoning_effort: low` or `medium` according to section 4. Include: “Astra and all other models are prohibited; report a configuration mismatch rather than substituting a model.” Workers must send timestamped milestone and run updates to O, including actual screenshot directories, for the ten-minute reports.

**Orchestrator**

> Coordinate implementation of the 40 scenario specifications in plan 028. Use only gpt-6.1-sol with low or medium reasoning for yourself and every worker; Astra is prohibited. Own the shared ledger, contracts, shared integration surfaces, dependency order, inference queue, and release report. Start a recurring 600-second timer and write a report of each preceding ten-minute interval, linking actual screenshot directories for runs with captures; continue reporting during blocked or ongoing work. Check available agent capacity before dispatch. Give each developer exclusive files and one active slice; give both testers independent review ownership across all scenarios. Apply IMPORTANT.md as mandatory precedence. Require real Apertus/Laya evidence and both tester sign-offs; never represent a premade, mock, blocked check, or developer self-test as release acceptance. Preserve unrelated changes and record every candidate used for qualifying rounds.

**Developer D1 / D2 / D3 / D4**

> Implement only your assigned scenario and owned paths from plan 028. Read its researched specification, agreed contract, IMPORTANT.md, all four design guides, and applicable repository instructions. Reuse existing model/component/recipe infrastructure. Deliver a focused visual lesson with one learning question, one obvious primary action, and justified essential controls. Implement scientifically correct typed behavior, independent recipe editing, persistence, and Try lesson support. Run relevant checks and request a serialized real-inference canary. Report shared dependencies and failures; do not modify shared entry points without explicit reassignment. Handoff to both testers; do not self-accept.

**Tester T1**

> Independently verify every assigned integrated scenario’s scientific model, units, boundaries, invariants, convergence where relevant, recipe validation, connections, persistence, and builder/learner parity. Derive expected results independently. Inspect actual Apertus-generated and revised recipes. Own your test/report paths; return production defects to the assigned developer or orchestrator. Record evidence and Pass/Concern/Fail/Not tested truthfully. Your sign-off covers correctness and runtime integrity, not learner usability.

**Tester T2**

> Independently review every assigned integrated scenario through the normal application. Read IMPORTANT.md and the four design guides, then inspect the opening experience before implementation notes. Use outcome-only tasks, count competing controls, and check keyboard, motion, viewport, recovery, saving/reopening, and Try lesson. Execute the exact creation prompts, paraphrases, and follow-ups with real Apertus/Laya under the orchestrator’s inference reservation. Inspect accepted recipes and meaningful visual changes; capture and review opening/changed states. Label fallback tooling and distinguish reviewer/browser evidence from participant evidence. Report defects without production edits; do not rewrite failed prompts away.

## 12. Start order and final delivery

1. O checks repository state, agent capacity, its own and every worker's allowed model/reasoning configuration, service configuration, baseline checks, and overlapping implementations; reads the governing requirements. Record execution start, verify the timer facility, and start ten-minute reporting before dispatch.
2. Agree file ownership, scientific contracts, prompt manifests, shared contribution conventions, inference reservations, and evidence retention.
3. Prepare only proven missing shared prerequisites.
4. Dispatch wave 0. Make all four pilot slices pass the full handoff/review path and use their measured results to schedule remaining work.
5. Run waves 1–9 with bounded developer and tester queues, sequential shared integration, and prompt defect correction.
6. Freeze the complete candidate; finish combined checks and both full real-inference rounds with independent sign-offs.
7. Publish the release report mapping every ID to implementation, tests, live evidence, usability verdict, and limitations.

The final report must state exactly what exists and what was verified. If 39 scenarios pass and one is blocked, delivery is 39 provisionally accepted plus one blocked; the 40-scenario goal remains incomplete. If screenshots look polished but opening tasks remain confusing, simplify and retest. If the user raises a usability objection, treat it as a required review iteration rather than overriding it with automated passes.
