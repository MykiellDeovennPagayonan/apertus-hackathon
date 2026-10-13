# Parallel implementation plan: 40 math and physics simulations

Date: 2026-10-11  
Status: Execution plan; implementation, agent launch, and live acceptance have not been performed by this document.  
Team: exactly four implementation agents (A1–A4), each in its own terminal/session; no orchestrator and no dedicated QA agent.  
Agent model policy: `gpt-6.1-sol` only, with `low` or `medium` reasoning; Astra is prohibited.  
Scope: the 20 researched math proposals and 20 researched physics proposals linked below.

## 1. Outcome and governing requirements

Deliver all 40 scenarios as scientifically correct, editable, persistable simulations in the existing application. Each must work through the normal experiment builder and Try lesson experience, and must be constructible and changeable through actual Apertus inference. A premade demonstration alone does not satisfy this goal.

The four implementation agents divide ownership and peer review; they do not divide the application into four independent implementations. Reuse the existing component catalog, typed recipes, domain models, validation, persistence, and learner rendering. Add a shared capability only when an identified scenario requires it and the existing capability cannot serve it.

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

## 2. Four implementation agents in separate terminals

All four agents implement complete vertical slices and report directly to the user from their own terminal/session. None dispatches, supervises, or launches the others. Peer review is a bounded part of each agent's work, not a fifth role or a dedicated QA terminal.

| Terminal / agent | Exclusive scenario ownership | Scientific obligations | Peer reviewer |
| --- | --- | --- | --- |
| 1 / A1 | MATH-01–10: place value, geometry, transformations, tiling, nets, packaging, packing, fencing | Exact decimal semantics where applicable; physical dimensions separate from display scale; valid fold geometry; distinguish packing heuristics from optimality proofs | A2 |
| 2 / A2 | MATH-11–20: feasible choices, statistics, sampling, regression, probability, counting, loans, calculus | Population/sample and rate conventions; reproducible randomness; honest undefined results; loan rounding/final payment; calculus units | A1 |
| 3 / A3 | PHYS-01–10: mechanics, buoyancy, pressure, hydraulics, flow, drag | Units and conservation; supporting rope count; static/dynamic assumptions; animation driven by computed state; stable integration | A4 |
| 4 / A4 | PHYS-11–20: turning, optics, waves, heat, induction, capacitors | Singular/virtual optical results; frequency/sign conventions; thermal accounting; convergence; voltage continuity and time constants | A3 |

### Responsibilities shared by all four

- Inventory current code and in-progress changes before implementing; do not assume a proposal is still missing. Preserve unrelated work, including existing pilot implementations and validation artifacts.
- Own each assigned scenario's model, bounded input validation, component behavior, catalog contribution, composable recipe, persistence, learner experience, focused checks, and evidence.
- Read the researched specification and governing guides, reuse existing capabilities, and record the contract before edits. Build one clear learning question with one obvious primary action and only necessary controls.
- Run meaningful reference, boundary, invariant, transition, builder, save/reopen, and Try lesson checks. Request an early real Apertus/Laya canary through the shared reservation procedure.
- Own fixes for findings in assigned production files; review the paired agent's frozen candidate without editing that agent's production files.
- Record progress, blockers, checks, actual inference configuration, run IDs, candidate fingerprints, and exact screenshot directories in their own reports. Report failures honestly; no self-acceptance or mock substitution for live acceptance.
- Do not change provider, spend on hosted services, download a model, or deploy solely to unblock local acceptance. Existing session authorization and resource constraints still apply.

### Peer review without a dedicated QA agent

For every scenario, its paired reviewer independently checks correctness/runtime and usability/live experience and records separate Pass / Concern / Fail / Not tested verdicts. Inspect the opening view before reading implementation notes or production formulas; record the learning question, primary action, competing controls, labels, and visual emphasis. Use outcome-only tasks and derive expectations independently from cited sources or a trusted reference calculation.

Review units, domains, singularities, conservation, convergence, randomness, connections, persistence, builder/learner parity, keyboard access, focus, reduced motion, supported viewports, and recovery. Exercise canonical prompts, paraphrases, and follow-ups with real Apertus/Laya. Inspect actual accepted recipes and scene geometry; capture and inspect opening and changed states. Use available browser tooling and label fallback capture methods honestly.

Preserve failed prompts and evidence. Failed/cancelled generation must preserve the last accepted lesson. Browser automation and reviewer judgment are separate from observed human first-use evidence; do not claim novice comprehension without participants. Return production fixes to the owner and retest the same contract. A reviewer who co-authored the implementation must use another non-author among A1–A4 for that scenario's verdicts and record the swap.

### Progress reporting

During active execution, each agent writes its own timestamped report every ten minutes under `028-validation/progress/<AGENT>/`, links its own status file, and posts a concise update in its terminal/session. Reports include the interval, actual write time, scenario IDs, changes, checks, peer verdicts, runs, source/configuration fingerprints, blockers, next action, and next deadline. Include real screenshot directories and reviewed image links, or state “No new screenshots,” “No screenshots captured,” or “Not reported” as appropriate.

Use checked wall-clock deadlines or an available timer; do not claim an unattended scheduler exists. Keep the cadence through blocked periods during active sessions, label late reports, and write a partial-window report on pause/end. No agent collects or writes another agent's progress report.

### Responsibility matrix

| Activity | Owner | Required review |
| --- | --- | --- |
| Scenario contract, implementation, tests, fixes, status | Assigned A1–A4 | Paired non-author |
| Shared file change or missing primitive | One explicitly claimed agent per file/task | Affected agents; non-author for acceptance |
| Scientific/runtime and usability/live verdicts | Paired non-author | Two distinct verdicts per scenario |
| Inference request | Current reservation holder | Paired reviewer inspects trace and result |
| Candidate integration | Agent with temporary integration reservation | Relevant checks on combined candidate |
| Final evidence | Each agent publishes its ten-scenario summary | Paired reviewer signs both tracks; all four confirm release gates |

## 3. Assignment manifest: exactly 40 scenarios

Use the stable IDs below in contracts, commits, issues, evidence, and status reports. Each link is the researched specification; its exact **Human prompt** is the canonical creation prompt. Preserve that wording in the acceptance manifest rather than inventing a more convenient test prompt.

| ID | Developer | Researched specification |
| --- | --- | --- |
| MATH-01 | A1 | [Decimal place value](../simulations/math/01-DECIMAL-PLACE-VALUE.md) |
| MATH-02 | A1 | [Pythagorean theorem and ladder length](../simulations/math/02-PYTHAGOREAN-THEOREM.md) |
| MATH-03 | A1 | [Trigonometry for measuring heights](../simulations/math/03-TRIGONOMETRY-FOR-MEASURING-HEIGHTS.md) |
| MATH-04 | A1 | [Scale drawings and similar shapes](../simulations/math/04-SCALE-DRAWINGS-AND-SIMILAR-SHAPES.md) |
| MATH-05 | A1 | [Reflections, rotations, and translations](../simulations/math/05-REFLECTIONS-ROTATIONS-AND-TRANSLATIONS.md) |
| MATH-06 | A1 | [Tessellations and tile patterns](../simulations/math/06-TESSELLATIONS-AND-TILE-PATTERNS.md) |
| MATH-07 | A1 | [Folding nets into boxes](../simulations/math/07-FOLDING-NETS-INTO-BOXES.md) |
| MATH-08 | A1 | [Packaging with the least material](../simulations/math/08-PACKAGING-WITH-THE-LEAST-MATERIAL.md) |
| MATH-09 | A1 | [Packing boxes into a container](../simulations/math/09-PACKING-BOXES-INTO-A-CONTAINER.md) |
| MATH-10 | A1 | [Quadratics through a fencing problem](../simulations/math/10-QUADRATICS-THROUGH-A-FENCING-PROBLEM.md) |
| MATH-11 | A2 | [Inequalities and feasible choices](../simulations/math/11-INEQUALITIES-AND-FEASIBLE-CHOICES.md) |
| MATH-12 | A2 | [Mean, median, and outliers](../simulations/math/12-MEAN-MEDIAN-AND-OUTLIERS.md) |
| MATH-13 | A2 | [Spread and standard deviation](../simulations/math/13-SPREAD-AND-STANDARD-DEVIATION.md) |
| MATH-14 | A2 | [Sampling and survey uncertainty](../simulations/math/14-SAMPLING-AND-SURVEY-UNCERTAINTY.md) |
| MATH-15 | A2 | [Regression and the effect of outliers](../simulations/math/15-REGRESSION-AND-THE-EFFECT-OF-OUTLIERS.md) |
| MATH-16 | A2 | [Conditional probability and hidden origins](../simulations/math/16-CONDITIONAL-PROBABILITY.md) |
| MATH-17 | A2 | [Combinations versus permutations](../simulations/math/17-COMBINATIONS-VERSUS-PERMUTATIONS.md) |
| MATH-18 | A2 | [Loan repayment and amortization](../simulations/math/18-LOAN-REPAYMENT-AND-AMORTIZATION.md) |
| MATH-19 | A2 | [Derivatives as an instantaneous rate](../simulations/math/19-DERIVATIVES-AS-INSTANTANEOUS-RATE.md) |
| MATH-20 | A2 | [Integration as accumulated quantity](../simulations/math/20-INTEGRATION-AS-ACCUMULATED-QUANTITY.md) |
| PHYS-01 | A3 | [Levers and mechanical advantage](../simulations/physics/01-LEVERS-AND-MECHANICAL-ADVANTAGE.md) |
| PHYS-02 | A3 | [Pulley systems and lifting effort](../simulations/physics/02-PULLEY-SYSTEMS.md) |
| PHYS-03 | A3 | [Gears and bicycle ratios](../simulations/physics/03-GEARS-AND-BICYCLE-RATIOS.md) |
| PHYS-04 | A3 | [Centre of mass and tipping](../simulations/physics/04-CENTRE-OF-MASS-AND-TIPPING.md) |
| PHYS-05 | A3 | [Collisions and momentum](../simulations/physics/05-COLLISIONS-AND-MOMENTUM.md) |
| PHYS-06 | A3 | [Floating, sinking, and buoyancy](../simulations/physics/06-FLOATING-SINKING-AND-BUOYANCY.md) |
| PHYS-07 | A3 | [Water pressure with depth](../simulations/physics/07-WATER-PRESSURE-WITH-DEPTH.md) |
| PHYS-08 | A3 | [Hydraulic lifts and piston areas](../simulations/physics/08-HYDRAULIC-LIFTS.md) |
| PHYS-09 | A3 | [Flow through narrow and wide pipes](../simulations/physics/09-FLOW-THROUGH-NARROW-AND-WIDE-PIPES.md) |
| PHYS-10 | A3 | [Parachutes and terminal velocity](../simulations/physics/10-PARACHUTES-AND-TERMINAL-VELOCITY.md) |
| PHYS-11 | A4 | [Turning and circular motion](../simulations/physics/11-TURNING-AND-CIRCULAR-MOTION.md) |
| PHYS-12 | A4 | [Lens focusing and image formation](../simulations/physics/12-LENS-FOCUSING-AND-IMAGE-FORMATION.md) |
| PHYS-13 | A4 | [Fibre optics and total internal reflection](../simulations/physics/13-FIBRE-OPTICS-AND-TOTAL-INTERNAL-REFLECTION.md) |
| PHYS-14 | A4 | [Doppler effect and passing sound sources](../simulations/physics/14-DOPPLER-EFFECT.md) |
| PHYS-15 | A4 | [Guitar strings and standing waves](../simulations/physics/15-GUITAR-STRINGS-AND-STANDING-WAVES.md) |
| PHYS-16 | A4 | [Heat conduction through materials](../simulations/physics/16-HEAT-CONDUCTION-THROUGH-MATERIALS.md) |
| PHYS-17 | A4 | [Cooling a hot drink](../simulations/physics/17-COOLING-A-HOT-DRINK.md) |
| PHYS-18 | A4 | [Melting, boiling, and latent heat](../simulations/physics/18-MELTING-BOILING-AND-LATENT-HEAT.md) |
| PHYS-19 | A4 | [Electromagnetic induction](../simulations/physics/19-ELECTROMAGNETIC-INDUCTION.md) |
| PHYS-20 | A4 | [Capacitor charging and discharging](../simulations/physics/20-CAPACITOR-CHARGING-AND-DISCHARGING.md) |

## 4. Parallelism, file isolation, and shared work

### Agent model policy and launch

Each of the four separate terminals/sessions uses **`gpt-6.1-sol` with `low` or `medium` reasoning only** (default `medium`). Astra, other models, and higher reasoning efforts are prohibited. Each agent records requested and confirmed settings in its own status file; report a mismatch instead of substituting a model. This policy governs coding agents; the application still uses real Apertus inference and Laya decisions.

Launch four independent sessions with the task templates in section 11. No parent/worker hierarchy, orchestrator, nested helpers, or fifth agent. This document edit does not launch sessions or authorize deployment.

### Separate worktrees and application instances

Prefer one isolated Git worktree and branch per agent, created from the same recorded baseline. Suggested branch names are `simulations/a1-math-01-10`, `simulations/a2-math-11-20`, `simulations/a3-physics-01-10`, and `simulations/a4-physics-11-20`. These are examples, not existing branches. Inventory the current dirty checkout first; explicitly carry forward needed existing work without discarding or silently omitting it. Review candidates must identify that work in their fingerprints.

Give each application instance a distinct recorded port and evidence directory. A reviewer uses a frozen candidate checkout/app instance; its owner must not mutate or restart it during review. Worktrees isolate files, but shared services and persistence remain shared: use separate test users/projects and never clean another agent's data.

If worktrees are unavailable, record exact nonoverlapping file ownership before starting in the shared checkout. No reset, clean, checkout, broad formatting, dependency installation, or lockfile mutation that affects other work. Do not stage or commit another agent's changes. Preserve pre-existing changes.

### Exact file ownership and shared-file reservations

Subject ranges alone do not prevent conflicts: A1/A2 may both need a math catalog and A3/A4 may both need a physics catalog. Before edits, each agent records exact owned source, fixture, test, and report paths in `028-validation/ownership/<AGENT>.md`. Other agents check those claims before editing. Reuse the existing domain layout and split contribution modules only when needed for actual concurrent work.

Shared surfaces include component/runtime/planner catalogs, assembly and validation entry points, common controls, package scripts, manifests, lockfiles, and generated registry sources. Each shared file has **one named writer at a time**, agreed directly by affected agents and recorded in their ownership files before editing. A shared-file change request states file, intended contract/change, affected scenarios, owner, and checks. The named writer implements the bounded change; other agents consume it or continue independent work. Silence is not agreement. If ownership is unresolved, pause only the conflicting edits.

For separate sessions without messaging, use the ownership and per-agent status files in a common coordination directory accessible to all terminals (record its absolute path). Do not assume files in separate worktrees are instantly shared. Only each agent edits its own status/ownership files. Confirm reservations directly between terminals or use an atomic local lock such as `mkdir` in that common directory; an unlocked read-then-write Markdown lease is insufficient to prevent simultaneous acquisition. Record holder, scope, candidate, start, and release. Do not remove a stale lock until its holder has stopped the protected operation.

Integration is a **temporary operation**, not an agent role. Any agent with a ready slice can acquire the single integration reservation, integrate the reviewed commits sequentially into the agreed candidate branch/checkout, run relevant combined checks, record the resulting fingerprint in its own status, and release the reservation. No simultaneous merges, cherry-picks, or generator runs in that checkout. Resolve conflicts with affected owners; never overwrite their changes. Every agent continues owning ten scenarios, and nobody permanently owns integration or dispatch.

Do not hand-edit `premadeRegistry.generated.ts`; run its source generator only under the integration reservation after source contributions are present. Inspect catalog eligibility, persistence, rendering, and generation contracts rather than treating deterministic fast-path support as full application support.

### Minimal shared preparation

Agree contribution shape, types, canonical state, invalid drafts versus accepted state, serialization, catalog metadata, and generation eligibility using existing interfaces. A missing common primitive gets one bounded task and one writer, with affected IDs and an acceptance example. Finish it before dependent work; do not build a generic simulation engine or universal dashboard. Presentation resizing must not change physical quantities or reset state.

## 5. Delivery order and workload limits

Each agent owns ten scenarios and independently pulls its next ready item; there is no dispatch queue. Use the four pilots below to exercise geometry, statistics, mechanics, and time-dependent physics. All four pilots must complete implementation, integration, real-inference canary, learner checks, and peer review before scaling up.

| Agent | Pilot | Remaining owned scenarios, suggested order |
| --- | --- | --- |
| A1 | MATH-02 | 01, 03, 04, 05, 06, 10, 08, 07, 09 |
| A2 | MATH-12 | 13, 15, 17, 16, 14, 11, 18, 19, 20 |
| A3 | PHYS-01 | 02, 03, 04, 05, 06, 08, 07, 09, 10 |
| A4 | PHYS-17 | 20, 12, 13, 14, 15, 11, 18, 19, 16 |

Reorder within an agent's range for recorded dependencies or measured cost; retain the full 40-item scope. Use pilot development/review/inference timings to estimate remaining work. Four implementers do not reduce the 480-request final live acceptance workload.

Limit each agent to one active implementation and one handed-off scenario awaiting review. Review the paired agent's ready slice before starting another when its queue is full; prioritize blocking fixes. Peer reviews and already-generated lessons can run concurrently; shared-file edits, integration operations, and real inference each require their respective reservation. If blocked, take an independent owned item within these limits and record the change. Never mutate a candidate being reviewed.

## 6. The per-scenario contract

Before implementation, the assigned agent records this contract and obtains its paired reviewer's review:

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
Evidence needed from the peer reviewer for each review track:
Explicit exclusions and unresolved questions:
```

A structural follow-up means a supported change to objects, connections, or lesson composition, not simply relabeling a slider. Do not require arbitrary topology changes for every model. Define a meaningful supported change for the scenario; record why a parameter-only lesson is appropriate when structural change is outside its model. Test rejection or clarification for unsupported extensions.

Paraphrases must retain the learner’s intent, not mention internal component IDs. Follow-ups must target the generated lesson and preserve quantities the learner asked to keep fixed. Validate meaning as well as schema.

The researched proposals are the starting scientific scope. If new research changes an assumption, update the contract and explain the evidence before implementation; do not quietly make the test easier. Use the proposals’ authoritative references and add primary references where a numerical method or edge case needs further support.

## 7. Minimum independent correctness cases for all 40

These are starting oracles, not the entire test suite. The peer reviewer must specify tolerances and derive expectations independently. Numerical rounding in the scene may be coarser than internal computation, but must not change conclusions.

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

The application's generation and revision requests must use the actual configured Apertus inference service. Coding agents may run on their own Codex models; this plan does not claim that the four coding/testing roles themselves run on Apertus.

The repository separates LLM inference from decision routing. Verify both the actual Apertus call and actual Laya decision service where the generation pipeline requires decisions. The mandatory guide calls for real Apertus and Laya; a deterministic premade lookup, mocked response, cached recipe, or label saying “Apertus” is not sufficient evidence.

Read the resolved configuration, not just a single environment variable. Relevant implementations include:

- `src/web/src/simulations/creation-and-editing/input/inference/config.ts` — provider/model selection and generic overrides.
- `src/web/src/simulations/creation-and-editing/input/inference/apertusConfig.ts` and `transport.ts` — local/hosted configuration, bounded structured requests, concurrency, retries, and metadata.
- `src/web/src/simulations/creation-and-editing/component-selection/decisions/config.ts` and `providers/laya.ts` — decision routing and real Laya requests.

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

Each agent checks generic overrides such as `LLM_MODEL`, `LLM_MAX_CONCURRENT_REQUESTS`, token limits, and timeouts, which can override Apertus-specific settings. Record the resolved model/provider and observed request metadata. Keep credentials out of prompts, commits, screenshots, and reports. Hosted inference is an optional separately authorized configuration, not an automatic fallback.

### One shared inference queue

Start with one in-flight acceptance request across the team. The existing transport concurrency limit is process-local: four application processes each configured for one request can still overload one shared model server. All four terminals use one team-wide inference reservation in the common coordination directory described in section 4, including canaries, peer-review runs, and other local users of the same server. Acquire it atomically before sending a request; separate process-local limits are insufficient.

Use a simple recorded lease or scheduled slot before building a new coordination service. The lease names owner, application instance, candidate fingerprint, scenario, start time, request ID, and timeout. Release it after completion or confirmed cancellation. The peer reviewer uses the same accepted recipe and trace for both review tracks; do not generate duplicate lessons merely to separate numerical and usability evidence.

Increase concurrency only after measuring stable latency and failure rates on the actual machine. Browser instances may operate independently on already-generated lessons, but inference calls remain queued. Bound timeouts, retries, and total attempts; record schema probes and repair calls as real inference work. A 429, timeout, malformed reply, or decision-service failure is a recorded result, not a reason for unlimited retries.

### Live test sequence for each scenario

1. Freeze the candidate and acceptance manifest. Confirm actual provider configuration and start the application normally.
2. Open a fresh lesson/draft. Submit the canonical prompt through the ordinary prompt UI. Observe real generation/decision requests without replacing their responses.
3. Record request IDs, observed provider/model, stage outcomes, decision results, timing, token usage if supplied, validation result, and accepted recipe/configuration. Distinguish absent metadata from zero usage.
4. The peer reviewer inspects the opening learner view before implementation notes, then checks that the recipe represents the requested scientific model with sensible parameters and typed connections. Record both review tracks against the same run.
5. Perform the outcome-only learning task and compare the visible result with the model's accepted state.
6. Apply the two contracted follow-ups to the canonical generated lesson. Inspect the actual new accepted recipes and verify that retained constraints remain unchanged.
7. Submit the invalid or unsupported request. It must clarify or reject appropriately and preserve the last accepted lesson. Test cancel/recovery separately if required by the flow.
8. Save, reopen, edit a relevant supported element independently, and open Try lesson. Verify that meaning, quantities, connections, and state persist.
9. Create fresh lessons from both natural paraphrases; check the same learning intent and valid model without requiring byte-identical layouts or IDs.
10. Retain inspected opening/changed-state images, concise trace evidence, verdicts, and reproduction details.

Supported prompts must work as intended; an unsupported request passes through honest clarification/rejection, not fabricated capability. No hidden keyword route may masquerade as real inference. Deterministic fixtures remain useful for development checks, but cannot replace this live sequence.

### Two complete release rounds

This plan requires two complete qualifying rounds over all 40 scenarios on the **same frozen release candidate**, acceptance manifest, and resolved configuration. Run rounds sequentially, using fresh generation for each scenario. Do not tune prompts, code, or provider settings between qualifying rounds.

For each scenario per round, run one canonical creation, two paraphrase creations, two canonical-lesson follow-ups, and one invalid/unsupported request: six product requests. Across 40 scenarios and two rounds that is 480 product requests, excluding canaries, retries, internal planning stages, schema probes, and repair calls. This is a workload estimate, not a claim of 480 model calls or a cost/time guarantee. Each agent must budget its owned runs using measured pilot throughput and track actual inference usage.

Slice-level checks are provisional evidence. Final rounds happen after all 40 are integrated. If a qualifying round fails, keep the evidence, fix the defect, and freeze a new candidate; it needs two complete passing rounds. Earlier slice success cannot prove a later shared change did not break a scenario. If local services or time/capacity make this impossible, report “live acceptance blocked/incomplete,” not “complete with mocks.”

## 9. Verification gates and completion states

### Gate A — scoped and ready

Assigned agent and paired reviewer agree the contract, exact owned paths, dependencies, assumptions, oracle, prompt manifest, and simple opening experience. No unresolved dependency prevents meaningful implementation.

### Gate B — developer verified

Owner's model/boundary checks pass; source/recipe integration works; builder, save/reopen, and Try lesson are exercised. Opening/changed views are inspected and the early inference canary is recorded or explicitly blocked. The handoff discloses failures and limitations. This is not acceptance.

### Gate C — integrated and peer reviewed

The slice is integrated under the temporary reservation. A non-author reviews the actual combined candidate and signs separate correctness/runtime and usability/live-experience verdicts. Blocking/major findings require fixes. Minor findings need recorded disposition consistent with IMPORTANT.md. Required Not tested results remain open gates.

### Gate D — release qualified

All 40 scenarios have non-author sign-off on both tracks, required combined checks pass, and two complete live rounds pass on the same frozen candidate/configuration/manifest. Each agent executes and documents its ten scenarios per round; paired reviewers inspect the results. Complete round 1 across all four ranges before round 2. No code, prompts, or provider settings change between qualifying rounds. A change requires a new frozen candidate and two complete qualifying rounds as specified in section 8.

Each agent owns `028-validation/status/<AGENT>.md`; there is no single-writer central ledger. Read all four files for total progress. Use:

```text
ID | owner | reviewer | contract version | state | candidate fingerprint |
owner checks | peer correctness/runtime | peer usability/live | round 1 | round 2 |
blocking issue | evidence links | next action
```

States: Proposed → Scoped → Implementing → Developer verified → Integrated → In review → Provisionally accepted → Release qualified. Blocked and Regressed require an owner and next action. Owners copy peer verdict links into their status, but only reviewers write those verdicts. A clean committed candidate is preferred; dirty candidates need relevant content hashes and an explicit list of outstanding changes. Fingerprint configuration and manifests separately without storing secrets.

### Practical checks

Inspect current scripts in `src/web/package.json`. Relevant existing checks include `pnpm lint`, `pnpm test:recipes`, `pnpm test:public-catalog`, `pnpm test:controls`, `pnpm test:generation:contract`, `pnpm test:generation:architecture`, `pnpm test:generation:construction`, `pnpm test:builder:parity`, and `pnpm build`.

Owners run focused checks. The current integration reservation holder runs applicable combined regression checks, including the required full suite, after meaningful changes; all agents reuse the fingerprinted result rather than duplicating broad runs. Record baseline failures honestly. New scenarios need meaningful owned coverage for invariants, invalid inputs, persistence, structural edits, and independently known outcomes.

Existing runners such as `src/web/scripts/generation/verify-realistic-live.cjs` and `src/web/scripts/domains/earth-atmosphere/live-ui.cjs` are references, not automatically a 40-scenario harness. Assign a minimal shared runner adaptation to one explicit writer if needed, with disjoint per-agent manifests and evidence paths. Keep invocation semantics consistent and serialize real requests.

## 10. Evidence and handoff conventions

Use the existing validation area without overwriting prior evidence. Proposed additional layout:

```text
docs/agent-only/implementation/028-validation/
  ownership/<AGENT>.md                     # this agent only
  status/<AGENT>.md                        # this agent only
  progress/<AGENT>/<INTERVAL-END-UTC>.md    # this agent only
  contracts/<SCENARIO-ID>.md               # scenario owner
  developer/<AGENT>/<SCENARIO-ID>.md       # scenario owner
  peer-model/<SCENARIO-ID>.md              # assigned non-author reviewer
  peer-experience/<SCENARIO-ID>.md         # assigned non-author reviewer
  round-1/<SCENARIO-ID>/                   # scenario owner captures; peer reviews
  round-2/<SCENARIO-ID>/
  release/<AGENT>.md                       # ten-scenario summary, peer sign-offs linked
```

The common coordination directory holds temporary integration/inference locks and accessible copies of per-agent status/ownership; record its location in all four sessions. Confirm existing artifacts' authors and candidate identity before reuse; preserve historical reports rather than rewriting them to imply a different team performed the runs.

Agree sanitized version-controlled evidence and retention of large captures/raw traces. Keep failed-run evidence, trace/source/image identity, and reproduction details; no credentials or unbounded binary commits.

Owner handoff:

```text
Scenario / contract / source fingerprint / peer reviewer:
Owned changes and shared integration required:
Learning question / opening action / control count:
Scientific model / units / idealizations:
Checks and actual results, including builder/persistence/learner:
Early inference request and actual evidence locations:
Known limitations / failures / next action:
```

Peer finding:

```text
Scenario / candidate / provider configuration / reviewer:
Outcome-only task and exact input:
Expected outcome and independent source/oracle:
Observed outcome and evidence type:
Correctness/runtime or usability/live verdict: Pass / Concern / Fail / Not tested:
Severity / reproduction / evidence links:
Fix owner and required retest:
```

Infrastructure failures and scientific/UX defects are distinct findings but can both block gates. Bound retries; changed code, prompts, or configuration require recording a new candidate/test condition.

## 11. Four standalone terminal task templates

Start one independent terminal/session per template. Every agent must verify `model: gpt-6.1-sol`, `reasoning_effort: low` or `medium`; Astra and all other models are prohibited. Attach current repository instructions, baseline fingerprint, owned paths, common coordination directory, service configuration, and required reading. No agent launches or supervises another.

**Terminal 1 — A1**

> Implement MATH-01–10 from plan 028, starting with MATH-02. Own complete vertical slices and their focused checks/evidence. Peer-review A2's MATH-11–20; A2 reviews your work. Follow the common instructions below.

**Terminal 2 — A2**

> Implement MATH-11–20 from plan 028, starting with MATH-12. Own complete vertical slices and their focused checks/evidence. Peer-review A1's MATH-01–10; A1 reviews your work. Follow the common instructions below.

**Terminal 3 — A3**

> Implement PHYS-01–10 from plan 028, starting with PHYS-01. Own complete vertical slices and their focused checks/evidence. Peer-review A4's PHYS-11–20; A4 reviews your work. Follow the common instructions below.

**Terminal 4 — A4**

> Implement PHYS-11–20 from plan 028, starting with PHYS-17. Own complete vertical slices and their focused checks/evidence. Peer-review A3's PHYS-01–10; A3 reviews your work. Follow the common instructions below.

**Common instructions for all four terminals**

> Read IMPORTANT.md, the four design guides, your researched specifications, and applicable repository instructions. Inventory existing work and preserve unrelated changes. Verify your allowed model/reasoning settings; report mismatches. Work in your separate worktree/branch and app port. Record exact ownership and obtain agreement before shared-file edits; use the common coordination directory and atomic reservations for shared integration and real inference. Reuse existing model/component/recipe infrastructure. Deliver scientifically correct typed behavior, independently editable recipes, persistence, and Try lesson with one clear learning question and essential controls. Record contracts, meaningful checks, actual real Apertus/Laya canaries, fingerprints, failures, and screenshot directories. Review paired candidates independently before reading implementation formulas; return production fixes to owners and record separate correctness/runtime and usability/live verdicts. Keep one active slice and one awaiting review; prioritize peer reviews and defects. Write your own ten-minute progress and user updates. Do not self-accept, weaken validators, substitute mocks/premades for inference, edit other agents' owned files, spawn helpers, or deploy. Publish your ten-scenario release summary only with required peer sign-offs and both qualifying rounds.

## 12. Start order and final delivery

1. Open four independent terminals/sessions; verify each model/reasoning setting, repository instructions, existing work, service configuration, and common baseline. Record per-agent execution starts and reporting cadence.
2. Agree exact file ownership, worktrees/branches, app ports, common coordination directory, atomic reservations, contracts, shared contribution interfaces, and evidence retention. Preserve current dirty work explicitly.
3. Assign only proven missing shared prerequisites to one writer each; other agents continue independent tasks.
4. Implement all four pilots concurrently, serialize shared integration/inference, and exchange paired reviews. Complete pilot gates before scaling.
5. Each agent pulls remaining owned scenarios, keeping review queues bounded and fixing defects promptly. Integrate slices sequentially under temporary reservations.
6. Freeze the complete combined candidate and configuration/manifest. Finish combined checks and two complete real-inference rounds with non-author sign-offs on both tracks.
7. Each agent publishes its ten-scenario release summary. All four link the same frozen candidate and combined check evidence, confirm all 40 IDs are accounted for across the four summaries, and report directly to the user. No central release writer or orchestrator is required.

State exactly what exists and what was verified. If 39 scenarios pass and one is blocked, the 40-scenario goal remains incomplete. “Implemented,” “provisionally accepted,” and “release qualified” are distinct. Polished screenshots cannot override confusing opening tasks; simplify and retest. Treat user usability objections as required review iterations.
