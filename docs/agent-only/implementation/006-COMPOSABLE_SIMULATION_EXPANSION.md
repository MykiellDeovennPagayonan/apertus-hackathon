# 006 — Fifteen simulations assembled from short prompts

Date: 2026-10-03. Status: implementation and acceptance plan; all new cases Not run.

## 1. Outcome and authority

Implement the fifteen exact prompts in [the prompt catalog](../../PROMPT_CATALOG.md#prompts). Each must create a useful interactive experiment through fresh Apertus interpretation, meaningful Laya selection, validated component assembly, and deterministic execution. The user should not choose component IDs or provide missing educational defaults.

Follow [component contracts](../COMPONENT_CONTRACTS.md), [overview](../OVERVIEW.md), [005 creation contracts](005-SHORT_PROMPT_SIMULATION_CREATION.md), and [application design conventions](../design/APPLICATION_DESIGN.md). This plan strengthens the assembly requirement for these fifteen new cases: selecting a complete premade experiment and changing its parameters is insufficient. Existing experiments can retain their compatible legacy path.

This document authorizes no claims of implementation or successful testing. Its five-agent allocation is a future implementation workflow, not a request to launch agents while writing documentation.

## 2. Current gap and intended architecture

At review time, `lib/planner/creation.ts` constructs its choices from `templateNames`, and `runtime/resolver.ts` permits custom prefab instances only for ballistic experiments. The current teaching intent selects a composition reference. Extend this boundary before implementing fifteen more complete templates.

The AI should return a bounded, declarative assembly recipe: supported model configuration, independently identified prefab instances, typed connections, selected observations, and compatible control/view bindings. No arbitrary JavaScript, executable expressions, callbacks, or fabricated solver names. The compiler resolves mandatory dependencies; models need not select every trait individually.

Keep the nine existing component kinds. Use trusted systems for all model calculations, traits for state, resources for defaults, prefabs for reusable objects, behaviors for supported declarative activity, and views/visuals/controls for presentation and commands. A generated composition is the output of assembly, not a hardcoded response selected by a phrase.

### Shared foundation, completed before domain integration

The integration owner must:

1. Define a versioned assembly schema alongside the legacy recipe path. Include stable instance IDs, provider references/versions, validated parameters and units, typed connections, observation references, control bindings, and presentation choices. Declare size and complexity limits.
2. Implement staged resolution and atomic activation; reject missing providers, invalid units, incompatible bindings, duplicate IDs, and unsupported operations without changing the current experiment.
3. Let Apertus describe intent, Laya select finite registry-derived mechanisms and useful features, and Apertus configure the selected schemas. Preserve bounded repair, semantic conflict handling, cancellation, deadlines, and original user constraints from 005.
4. Expose only registered providers with actual implementations and successful assembly validation. Capability descriptions must state assumptions and outputs.
5. Support instance-targeted follow-up commands, accepted-configuration reset, independent instance state, one authoritative clock, and safe disposal on scene replacement.
6. Define a domain contribution interface for metadata, schema, providers, actions, defaults, compatible views, and tests. Domain entrypoints export contributions; they must not mutate the global registry at import time.
7. Add read-only diagnostics linking browser request, teaching intent, Laya selections, configuration, compiled recipe, validation, and committed runtime revision through a correlation ID.
8. Build a minimal vertical assembly example with two independent instances and an optional graph. Verify the legacy path still works before freezing the contribution interface.

Names and paths below are proposed additions, not existing APIs. Reuse existing runtime abstractions where they fit; avoid introducing a universal scripting engine or replacing the entire runtime.

### Evidence that AI assembled the result

For every canonical creation, retain fresh inference traces and the accepted recipe. Show that selected entities, parameters, observations, and bindings reflect the request. Test variants that change quantities, instance count or optional observations; outputs must change accordingly. At least one variant per agent must change structure, not only a number.

Do not implement fifteen English keyword branches, store complete model responses, inject finished runtime state, or add these cases to `premadeExperiments.ts` to satisfy acceptance. Reusable domain defaults, presentation presets, and object prefabs are allowed. Opening a catalog card remains a separate user flow.

## 3. Per-prompt implementation and acceptance contracts

All defaults below are proposed educational defaults. Implement and validate their ranges before advertising them. Alternative defaults require an explicit recorded contract update before candidate freeze. Each case also runs the common browser protocol in section 6. Each section includes the exact creation prompt to submit through the normal UI in both test rounds. Copy it verbatim, without the blockquote marker. These prompts must stay identical to the catalog. Prompts labeled “Follow up” are subsequent edits, not creation inputs.

### ALG-001 — Equation balance · Agent A

**Exact creation prompt:**

> Show me how to solve 2x + 3 = 11.

- Assemble equation state, numeric/unknown tokens, equivalence-preserving operations, balance view, and step history. Start with `2x + 3 = 11`, paused.
- Expose subtract-from-both-sides and divide-both-sides controls; show the symbolic equation next to the visual. Negative values need labeled tokens rather than physically impossible negative weights.
- Follow up: “Subtract 3 from both sides.” then “Divide both sides by 2.” Expect `2x = 8`, then `x = 4`, with original-equation substitution true.
- Use exact rational arithmetic where possible. Reject division by zero atomically. Undo/step behavior must be explicit; reset restores the initial equation.

### LINE-001 — Line slope · Agent A

**Exact creation prompt:**

> What happens to a line when I change its slope?

- Assemble coordinate axes, bounded linear-function model, line visual, slope/intercept controls, and a rise/run marker. Default `y = x`, x-domain −5 to 5.
- Follow up: “Make the slope 2 and the intercept 3.” Verify points `(0,3)` and `(1,5)` against the model; axes rescale or clearly indicate clipping.
- Verify zero and negative slope. Changes update one authoritative dataset used by the equation, markers, and chart. A structural variant adds a second line for comparison.

### PI-001 — Circle ratio · Agent A

**Exact creation prompt:**

> Why is pi the same for every circle?

- Assemble circle geometry, radius control, diameter/circumference measurements, an unrolling illustration, and a ratio readout. Default radius 1 unit, positive bounded radius.
- Follow up: “Double the radius.” Diameter and circumference double; `C/d` remains pi within the declared display tolerance.
- Verify `d=2r` and `C=2πr` independently. Reject zero radius for the ratio experiment. Explain that the circle's geometry is calculated; the animation illustrates it.

### GROW-001 — Compound growth · Agent E

**Exact creation prompt:**

> Show me how $100 grows with compound interest.

- Assemble accumulation model, starting-balance/rate/duration controls, compound and simple-interest series, and comparison chart. Default $100, 5% annual rate, 10 years, annual compounding, no deposits or fees.
- Follow up: “Make the interest rate zero.” Both series remain $100. Then “Use 10 percent for 2 years.” Compound total is $121 and simple total $120.
- Use `P(1+r)^t` for whole annual periods and `P(1+rt)` for the comparison. Keep internal precision, round currency only for display. Show assumptions; these are mathematical scenarios.

### PEND-001 — Pendulum comparison · Agent B

**Exact creation prompt:**

> Does a longer swing move more slowly?

- Assemble two small-angle ideal pendulums, independent length settings, shared gravity, angle/time views, and period readouts. Defaults 1 m and 2 m, 5° amplitude, gravity 9.81 m/s².
- Follow up: “Make the second swing four times as long as the first.” Its period must be twice the first: `T=2π√(L/g)`.
- Implement the declared small-angle analytical model, bound amplitude accordingly, and label no friction. Verify pause, restart, and simulation-time period measurement independent of frame rate.

### FRIC-001 — Ramp and surface resistance · Agent B

**Exact creation prompt:**

> Why does a toy car roll farther on a smooth floor?

- Assemble a ramp launch model and two horizontal tracks with adjustable effective rolling resistance, car visuals, and distance measurements. Default height 0.5 m, resistance coefficients 0.05 and 0.10, gravity 9.81 m/s².
- Use an explicitly simplified point-mass energy model: `v²=2gh` at ramp exit; horizontal deceleration `a=μg`; stopping distance `h/μ`. Ignore wheel rotation and ramp losses and state those assumptions.
- Follow up: “Make the rough floor twice as rough.” Its stopping distance halves at unchanged entry speed. Zero resistance means no finite stopping distance; do not show a fabricated stop.
- Keep landing and stopping visible through framing or a distance overview. Reset must restore both tracks and clear prior trails.

### CIRC-001 — Resistive bulb circuit · Agent B

**Exact creation prompt:**

> What happens if I add another bulb to a circuit?

- Assemble an ideal voltage source, identical resistor-like bulbs, typed circuit connections, series/parallel selector, and current/power readouts. Default 6 V battery and 12 Ω per bulb; start with one bulb.
- Follow up: “Add a second bulb in series.” One-bulb current is 0.5 A; two-series current is 0.25 A and each bulb dissipates 0.75 W. Then “Put them in parallel.” Each bulb dissipates 3 W; total current is 1 A.
- Use validated supported topologies and Ohm's law. Reject a short circuit or unsupported topology without committing. Brightness is an illustrative mapping of power; label the constant-resistance approximation.

### DIL-001 — Solution dilution · Agent C

**Exact creation prompt:**

> What happens to salt water when I add more water?

- Assemble dissolved-solute inventory, solvent volume, concentration system, beaker visual, add-water control, and concentration readout. Default 10 g salt already dissolved in 1 L solution; assume additive volumes and no reaction.
- Follow up: “Add another litre of water.” Solute remains 10 g; volume becomes 2 L; concentration falls from 10 to 5 g/L.
- Reject nonpositive volumes and invalid units. Concentration color supplements a numerical readout; do not imply particle count is the physical molecule count. Reset restores original amount and volume.

### CHEM-001 — Conservation in reactions · Agent C

**Exact creation prompt:**

> Help me see why chemical equations need balancing.

- Assemble immutable chemical species/atom definitions, integer coefficients, molecule visuals, and an element-conservation table. Start with unbalanced `H₂ + O₂ → H₂O`.
- Let learners adjust coefficients while atom definitions remain fixed. Follow up: “Balance it.” Expect lowest positive integer coefficients `2,1,2`, with four H and two O atoms on each side.
- Verify unbalanced states are visibly identified, not prohibited as editing states. Distinguish changing coefficients from changing chemical formulas. Include a second registered reaction as a structural variant; do not accept arbitrary unparsed chemistry.

### RATE-001 — Temperature and reaction rate · Agent C

**Exact creation prompt:**

> Why do reactions happen faster when it’s warmer?

- Assemble a simplified first-order `A → B` model with Arrhenius temperature dependence, temperature control, illustrative particles, and concentration/time curves. Default A₀=1 mol/L, T=300 K, k at 300 K=0.1 s⁻¹, activation energy 40,000 J/mol.
- Define `k(T)=k300 exp[-Ea/R (1/T−1/300)]`; use `R=8.314 J/(mol·K)` and `A(t)=A₀ exp(-kt)`, `B=A₀−A` for fixed-temperature runs. Temperature changes restart a clearly labeled comparison run, avoiding ambiguous history.
- Follow up: “Compare it at 320 kelvin.” Rate rises and half-life decreases; independently verify `t½=ln(2)/k` and conservation `A+B=A₀`.
- Label this as one illustrative reaction model, not a universal rule for every reaction. Particle animation does not calculate the concentrations.

### DIFF-001 — Dye spreading · Agent D

**Exact creation prompt:**

> Show me how a drop of dye spreads through water.

- Assemble a bounded 2D concentration field, no-flux boundaries, positive diffusion coefficient, central dye deposit, heatmap, and concentration probes. Use a conservative finite-volume/difference method with an explicit stable timestep policy.
- Follow up: “Make the dye spread twice as fast.” Double the diffusion coefficient; compare equal simulation times with identical initial conditions.
- Independently test mass conservation, nonnegative concentration, uniform-field stationarity, and timestep/grid convergence. If using explicit square-grid diffusion, enforce `D Δt/Δx² ≤ 1/4` with consistent units.
- Distinguish diffusion from fluid stirring. Particles, if shown, are illustrative unless explicitly coupled to the authoritative field. Show numeric probe values as well as color.

### ECO-001 — Predator and prey · Agent D

**Exact creation prompt:**

> What happens to foxes when there are fewer rabbits?

- Assemble a declared predator–prey differential model, two population series, initial-count controls, and rate settings. Use Lotka–Volterra for the first version, clearly labeled as a simplified continuous population model.
- Suggested defaults: rabbits R=40, foxes F=9, `dR/dt=0.5R−0.02RF`, `dF/dt=0.01RF−0.3F`, model time in days. Use a documented integrator and timestep.
- Follow up: “Start with half as many rabbits.” Reset to R=20, same F and rates, and compare runs. Do not promise that every future fox value will be lower.
- Verify initial derivatives, zero-population boundary behavior, nonnegative finite states, and convergence under timestep halving. Explain continuous population values instead of silently rounding authoritative state.

### PLANT-001 — Limiting resources · Agent D

**Exact creation prompt:**

> Will a plant keep growing faster if I give it more light?

- Assemble a bounded educational resource-response model, light/water/nutrient controls, biomass series, and limiting-resource indicator. Use normalized availability in [0,1] and explicitly illustrative growth `dB/dt=gmax·min(light,water,nutrients)`.
- Defaults: B=1 illustrative biomass unit, gmax=1 unit/day, light=0.4, water=0.6, nutrients=0.8. No species-specific biological claim.
- Follow up: “Give it more light but keep the water the same.” Raising light above 0.6 cannot raise growth past 0.6 unit/day while water remains limiting.
- Verify zero growth with any zero resource, monotonicity until saturation, and resource limits. Do not portray this linear educational model as a realistic crop forecast.

### TRAFFIC-001 — Stop-and-go waves · Agent E

**Exact creation prompt:**

> How can a traffic jam start when there’s no accident?

- Assemble vehicles on a closed road, a trusted car-following model, bounded density/reaction parameters, speed chart, and a brake-disturbance action. Use a documented model with fixed seeded initialization.
- Choose and record a stable default scenario that visibly produces a backward-traveling slow region after a brief disturbance. Do not preanimate a traffic wave independent of vehicle state.
- Follow up: “Make the cars leave bigger gaps.” Define whether this changes desired headway at fixed count or lowers density; label the chosen interpretation and preserve unrelated settings.
- Verify vehicle conservation, periodic positions, finite nonnegative speed and collision handling, timestep sensitivity, and reproducibility. Compare against a lower-density control; do not claim all settings eliminate jams.

### QUEUE-001 — Checkout capacity · Agent E

**Exact creation prompt:**

> Would a second cashier make the line much shorter?

- Assemble a seeded arrival process, FIFO queue, one or two service stations, event scheduler, customer visuals, and wait/queue statistics. Default arrivals average 0.8/minute, service capacity 1/minute per cashier, 60-minute horizon.
- Follow up: “Add a second cashier.” Reuse the same pre-generated arrival times and per-customer service durations for a controlled comparison; show warm-up/horizon assumptions and completed versus waiting customers.
- Test a deterministic fixture: three arrivals at time zero, each taking one minute. One cashier gives waits 0,1,2 minutes; two give 0,0,1. Check arrivals = queued + in service + completed, FIFO order, and nonnegative waits.
- Do not demand that one random short run matches a theoretical average. Treat seeded distribution tests separately from exact scheduler fixtures.

## 4. Five-agent work allocation without collisions

Five logical agents own three prompts each. They need not all run simultaneously: if the environment permits fewer concurrent agents, queue work in waves without changing ownership. The coordinator/integration role belongs to Agent A, not a sixth writer. This plan explicitly permits five-agent delegation when implementation of 006 is requested.

| Agent | Prompt ownership | Exclusive new namespace | Primary responsibilities |
| --- | --- | --- | --- |
| A | ALG-001, LINE-001, PI-001 | `math-foundations` | Algebra/geometry, shared foundation, integration and final acceptance coordination |
| B | PEND-001, FRIC-001, CIRC-001 | `physical-systems` | Pendulums, rolling-resistance model, circuits |
| C | DIL-001, CHEM-001, RATE-001 | `chemistry` | Dilution, conservation, reaction rate |
| D | DIFF-001, ECO-001, PLANT-001 | `natural-systems` | Diffusion, population dynamics, limiting resources |
| E | GROW-001, TRAFFIC-001, QUEUE-001 | `dynamic-systems` | Accumulation, traffic, queue scheduler |

### Exclusive file ownership

For namespace `<domain>`, the assigned agent may add/edit:

- `src/web/src/simulations/components/<kind>/<domain>/**`, using existing plural kind directories: resources, traits, behaviors, systems, visuals, views, controls, prefabs, compositions. Only create kinds actually needed; new compositions must be generated-recipe helpers or test fixtures, not complete keyword-selected demos.
- Proposed entrypoint `src/web/src/simulations/domains/<domain>/index.ts` exporting its contribution through the frozen interface.
- `src/web/scripts/domains/<domain>/**` for deterministic tests and domain test helpers.
- `docs/agent-only/implementation/006-validation/development/<domain>/**` for handoffs and provisional evidence.

Agent A alone edits existing/shared files: runtime catalog, types, resolver, validation, providers, session/command infrastructure, planner/Laya integration, application shell/routes, global styles, package scripts/lockfiles, shared test harnesses, and this plan, the design guide, and prompt catalog. Discover exact shared filenames in the current checkout before starting. All existing files outside a domain's namespace are shared unless explicitly reassigned in writing.

Agents B–E request shared changes in their domain handoff; they must not apply them themselves. Agent A reviews and integrates each request serially. A reusable component needed by two agents gets one owner and one agreed interface, not two competing versions. Domain-specific CSS must be scoped under its domain root.

### Work sequence and handoff

1. Record working-tree state and preserve all unrelated edits. At documentation time the shell and town rendering have local changes; never reset or overwrite them to obtain a clean baseline.
2. Agent A freezes the contribution interface, command/recipe contracts, output units, naming, and test harness. Other agents can develop pure systems and oracle fixtures beforehand; integration waits for the interface.
3. Prefer one branch/worktree per agent if available. With a shared checkout, enforce the same exclusive paths and prohibit concurrent edits to shared files. Do not run formatters across another agent's files.
4. Domain agents implement their three cases and focused tests, then hand off exported provider IDs, schema versions, ownership/read/write declarations, defaults, units, limitations, oracle fixtures, follow-up operations, UI notes, test commands/results, and shared-change requests.
5. Agent A integrates one domain at a time, runs cross-domain regression checks, and returns issues to the owning agent. Merge code before claiming integrated acceptance.
6. Freeze the integrated build and run the full two-round gate. Local branch or domain passes do not add together into an integrated pass.

### Services and browser ownership

Use one named owner for each shared inference service; no agent may stop or restart another agent's service. Give development web instances distinct ports and build directories when running concurrently. Allocate separate Playwright MCP contexts with explicit session IDs; never navigate another agent's active page. If tools cannot isolate sessions, use a coordinator-managed browser lease and serialize inspection. Rate-limit shared inference to avoid contention-driven false failures.

## 5. Build and focused test sequence

For each domain: implement pure authoritative systems and independent oracle fixtures; add traits/prefabs and contribution metadata; wire commands and bindings; add views and accessible controls; integrate creation and follow-ups; then inspect the real browser.

Read `src/web/AGENTS.md` and relevant installed framework documentation before changing Next.js code. Recheck current scripts rather than assuming new commands already exist. Current checks from `src/web` include:

```sh
pnpm test
pnpm test:planner
pnpm test:creation
pnpm test:apertus
pnpm exec tsc --noEmit
pnpm lint
pnpm build
```

Run domain-specific checks as their harnesses are added. Record pre-existing failures separately, but never call an affected acceptance check a pass. Existing browser CLI scripts can supplement diagnosis; they do not replace Playwright MCP. Preserve the 005 division, ball, and gas scenarios plus bridge/town/math regressions when changing shared infrastructure.

Independent numerical checks must not calculate the expected result by calling the production solver. Exact discrete arithmetic uses exact expectations; analytical floating-point fixtures should normally use relative error ≤1e-6 with a declared absolute tolerance near zero. For numerical integration, declare model-specific convergence, conservation, and error thresholds in the test protocol before freeze. Display rounding has a separate tolerance. Never relax thresholds simply to obtain a pass.

## 6. Live-model and Playwright MCP protocol

Start services using current repository instructions (currently root `make run-apertus`, `make run-laya`, `make run-web`). Verify actual readiness and hybrid configuration, then discover the available Playwright MCP tools and how they expose context, screenshots, console, and network evidence. Do not invent tool names or substitute another browser tool silently. If MCP or either model is unavailable, preserve the blocker and continue independent implementation; acceptance remains incomplete.

For each of the fifteen canonical prompts, at **1440×900 and 390×844**, in a fresh isolated session:

1. Open the normal creation screen. Submit the exact creation prompt printed in section 3 through accessible UI controls; record text, UTC timestamp, viewport, and correlation ID.
2. Observe loading and successful runtime activation. Confirm a fresh Apertus response and meaningful Laya choice were accepted. Capture the initial scene, controls, assumptions, and read-only runtime snapshot.
3. Check the proposed educational defaults and authoritative model outputs. Identify the first action without relying on source knowledge. Verify labels, units, legends, and entity identities match the scene.
4. Exercise every required interaction and follow-up from section 3. Capture before/after state, expected/actual results, and screenshots at meaningful points. Check follow-ups modify the current experiment without silently discarding its other settings.
5. Exercise keyboard access, touch-sized targets, any drag alternative, graph readability, mobile scrolling, and focus visibility. Check reduced-motion behavior preserves both control and result access.
6. Exercise pause/resume/step where relevant, reset, repeated submission, cancellation, and switching away/back. Check one clock, no orphan timers, no unintended duplicate sessions, and reset to the accepted initial recipe. Static lessons need meaningful step/reset, not a fake play clock.
7. Test invalid input and unsupported follow-up handling; the last accepted state remains intact. Record the message and focus behavior. Perform at least one seeded/replay comparison for stochastic cases.
8. Inspect browser console and relevant network requests; investigate crashes, unhandled errors, repeated failed requests, and unbounded inference repairs. Capture server diagnostics without secrets.
9. Review UX against the design guide and write the critique described below. Every required gate must pass at both viewports.

Per full round, also run one fixed, predeclared robustness variant per prompt (a typo, number words, changed quantity, or negation) and one structural assembly variant per agent. Fix the robustness set before candidate freeze and repeat the same set in round two with fresh inference. Test changes through controls and prompts; changing internal state is not browser acceptance.

Record total latency, time to visible feedback, per-model time, repairs, and fallbacks. Before freeze, declare numeric feedback and end-to-end timeout budgets appropriate to the actual hardware. Cancellation must remain available during slow inference. Do not invent measured performance or move the deadline between rounds.

## 7. Feedback loop and two-round completion gate

“Good enough with great UX” means all objective gates pass and each prompt's five UX categories score at least 4/5: first-action clarity, scene readability, control discoverability, feedback/results, and mobile/accessibility. Scores require concrete screenshot/interaction evidence; numbers alone do not establish quality. A 4 means independently usable with only minor polish remaining; a 5 means the lesson and interactions are immediately clear. Any blocked action, incorrect lesson, inaccessible essential control, obscured result, or misleading model invalidates acceptance regardless of average score.

After each browser inspection, the domain owner and integration owner discuss the UI in a written review: observation → effect on learner → proposed improvement → owner → acceptance check. Record issues as blocker, major, or minor. Resolve every blocker and major issue before qualifying a round. Minor deferrals need a reason and must not violate the design gates. Routine UI fixes proceed without waiting for permission; ask the user only for a material unresolved product preference, while continuing independent work.

```text
Implement supported components and assembly
  → run focused deterministic checks
  → create through live models and inspect with Playwright MCP
  → compare runtime state with independent expectations
  → critique the UI and discuss improvements
  → fix mechanics, planner, bindings, copy, layout, or accessibility
  → repeat development checks and browser inspection
  → freeze integrated source/configuration/test protocol
  → run complete round 1
  → run complete round 2 on the unchanged candidate with fresh sessions
```

A qualifying round covers all fifteen prompts at both viewports, required follow-ups, the fixed robustness/structural variants, state/numeric checks, UI review, provenance, lifecycle checks, and shared regression checks. Minimum canonical fresh creations: 30 per round, 60 across the two rounds; variants require additional calls.

Initialize the consecutive-pass count to zero. Any required failure, missing evidence, fallback bypassing joint-model creation, or candidate-affecting source/schema/default/model/system-prompt/test-protocol change resets it to zero. Preserve a compact analyzed summary of the failed attempt, delete its analyzed raw Playwright data, fix it; freeze a new fingerprint; restart the full suite. A targeted rerun diagnoses a fix but cannot restore a broken streak. Infrastructure interruptions make a round nonqualifying.

Both rounds must use identical source and working-tree fingerprints, registry/schema versions, models/settings, prompts, defaults, tolerances, and protocol. Include dirty-file content in the fingerprint; a Git commit alone is insufficient. Do not change code for “just a small UI improvement” between rounds. Acceptance bookkeeping may be appended without changing the executable candidate, provided the fingerprint policy explicitly separates evidence from source/configuration.

Do not stop after attractive screenshots or one passing round. Continue until two consecutive integrated rounds succeed, or report a precise external blocker with remaining work. Never report an unexecuted test as a pass.

## 8. Evidence, reporting, and catalog promotion

Proposed retained report layout (compact text/JSON only; raw Playwright captures belong in a task-specific temporary directory outside the repository):

```text
006-validation/
  development/<domain>/
    handoff.md
    ux-review.md
  candidate-<fingerprint>/
    manifest.json
    protocol.md
    attempt-001/round-01/<prompt-id>/<viewport>/
    attempt-001/round-02/<prompt-id>/<viewport>/
    report.md
```

Use new attempt directories after failures. Capture screenshots, browser traces, recordings, console/network logs, and state snapshots temporarily for analysis. Retain compact sanitized assertion results, accepted-recipe/provenance summaries, UX findings, and timing results in the report tree. The manifest records models, settings, environment, services, source/dirty-file fingerprint, schema versions, and timeout/tolerance policy. Never include tokens, authorization headers, or credentials.

The report includes one row per prompt and viewport with round results and evidence links; a separate UX review records findings, discussion, fixes and residual limitations. Report provenance, numeric checks, regressions, unsupported cases, latency, repairs/fallbacks, and blocked/unexecuted checks explicitly.

| Candidate | Round | All 15 prompts × 2 viewports | UX gates | Live-model provenance | Regressions | Overall |
| --- | --- | --- | --- | --- | --- | --- |
| Not frozen | 1 | Not run | Not run | Not run | Not run | Not run |
| Not frozen | 2 | Not run | Not run | Not run | Not run | Not run |

Agent A promotes the fifteen catalog rows to Working (2/2) only after the complete integrated gate, with candidate/date/evidence links. A final delivery must explain what was built, which prompts work, the declared model limitations, actual validation results, and remaining minor UX polish. The gate demonstrates this bounded set of prompts, not arbitrary science generation.

### 8.1 Mandatory Playwright data cleanup after analysis

Keep the codebase small: delete raw Playwright data as soon as analysis of the relevant attempt is complete, for both passing and failing runs. This cleanup rule supersedes earlier instructions to retain raw browser artifacts for 006.

1. Direct screenshots, videos, trace ZIPs, HAR files, downloads, browser profiles, HTML reports, and verbose browser logs to a uniquely named task/agent/run directory under the operating system temporary directory, outside the repository. Record its exact path and owner. Configure automatic test output paths too, so `test-results/` and `playwright-report/` do not accumulate in the checkout.
2. Inspect the captures and write a compact report before deletion: prompt and viewport, candidate, expected/actual values, assertions, observed UI issues, model participation, timings, pass/fail decision, and proposed/resolved fixes. Preserve enough textual detail to understand failures and reproduce the test. Screenshots are analysis inputs, not permanent repository deliverables.
3. Once analysis is complete, close that run's browser context and delete its raw captures and temporary profile. Clean only files created by that run. Never delete another agent's active data, a user's browser profile, or unrelated existing files. Do not perform broad directory deletion based on a guessed path.
4. If a test wrote artifacts inside the repository, analyze and remove those task-owned artifacts as well. Do not commit binary captures, videos, trace archives, browser caches, or generated HTML reports. Keep only compact Markdown/JSON summaries and necessary small reproducible test fixtures.
5. Record cleanup completion in the attempt report, including what categories were removed. Replace screenshot/trace links with written findings or report anchors so retained reports and the prompt catalog have no dangling artifact links.
6. At handoff and final acceptance, check repository status and the task-owned artifact directories for leftover generated data. Remove analyzed leftovers. An interrupted run may retain temporary data only until analysis resumes; record the owner and pending cleanup explicitly.

Analysis and compact reporting happen before deletion; never discard unexamined evidence and mark a test passed. Raw captures need not survive into round two or final delivery once their results have been analyzed and recorded. Cleanup of browser data does not change the executable candidate or reset the pass streak. Keep the small final report and pass/fail history; do not retain bulky browser artifacts just to substantiate catalog status.
