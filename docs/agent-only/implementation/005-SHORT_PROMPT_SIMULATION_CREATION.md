# 005 — Short-prompt simulation creation with Apertus and Laya

**Status:** Implementation and acceptance plan; not a record of completed implementation or successful validation.  
**Date:** 2026-10-03  
**Scope:** Create three useful, interactive simulations from short human prompts, then verify them through a repeated test–verify–fix–adjust loop.  
**Completion gate:** Two consecutive successful full-suite passes, with live Apertus and Laya participation, using Playwright MCP, against the same implementation and model configuration.

## 1. Product objective

A person should be able to type a concept and receive an understandable experiment:

> Show me how division works

The user should not have to specify prefab names, initial values, system choices, measurements, camera settings, or controls. Apertus expands the educational intent, Laya selects implemented assembly options, and application code constructs and validates the result.

The three canonical acceptance prompts are:

| ID | Complexity | Exact prompt |
| --- | --- | --- |
| DIV-001 | Simple | Show me how division works |
| BALL-001 | Simple | Show me how throwing a ball works |
| GAS-001 | Medium | Show me how gas pressure works |

All three must work from a fresh creation screen without additional questions. Use sensible, visible defaults and an obvious first action. A correct internal plan with an unusable screen is a failure.

This document plans implementation and future validation. Writing this document does not establish that the three simulations work, and does not itself initiate model evaluation or browser testing.

## 2. Authority and relationship to existing documents

Build on:

- [Project overview](../OVERVIEW.md): product vision and deterministic execution.
- [Component architecture](../../COMPONENT_ARCHITECTURE.md): nine component responsibilities.
- [Component contracts](../COMPONENT_CONTRACTS.md): ownership, assembly, and validation rules.
- [Apertus component integration](003-APERTUS_COMPONENT_INTEGRATION.md): structured plans and capability integration.
- [Apertus and Laya collaboration](004-APERTUS_LAYA_COLLABORATION.md): focused interpretation and selection for edits.

The source registry, implemented providers, and validated parameter schemas remain authoritative about what can execute. This document proposes additional capabilities and a creation workflow; a name in this document is not an implemented capability.

Document 004 describes the focused edit flow. This plan adds an Apertus-first creation flow and an explicit policy for vague educational adjustments. Reuse the existing edit contracts where applicable; do not regress their cancellation, conflict, deadline, revision, or atomicity behavior.

The working tree may contain concurrent changes. Reinspect current code before implementation, preserve unrelated work, and record the actual source revision plus working-tree fingerprint used for validation.

## 3. Current foundation and required extensions

The repository already separates reusable implementations under `src/web/src/simulations/components/` from runtime assembly and execution under `src/web/src/simulations/runtime/`.

Relevant existing pieces include:

- GroupingBoard, CounterToken, TokenGroup, EqualGroupingSystem, and grouping visuals/controls.
- Projectile, ballistic traits, BallisticMotionSystem, trajectory visuals, and flight metrics.
- A capability catalog, operation schemas, recipe resolution, staging, and session commands.
- Apertus structured planning and focused interpretation.
- Laya finite-choice transport and edit selection.
- Domain-specific React experiment layouts.

Reverify these boundaries when implementation starts:

| Area | Foundation | Required work for this plan |
| --- | --- | --- |
| Creation | Registered composition selection and parameters | Intent expansion followed by Laya assembly selection |
| Assembly | Bounded projectile custom instances | Explicit supported assembly recipes for all three cases |
| Collaboration | Focused edit interpretation described in 004 | Creation-specific handoffs and traceability |
| Presentation | Domain-specific views and control panels | Small validated presentation presets with task-relevant bindings |
| Gas | No gas-pressure implementation established by this review | Trusted model, configuration, visuals, controls, and validation |
| Proof | Existing tests/evaluation scripts | Live-model, Playwright MCP, two-pass evidence protocol |

Reusing a registered composition or prefab is valid. However, opening a canned demo through a keyword shortcut without the required model workflow does not pass the collaboration acceptance gate.

## 4. Responsibility split

| Participant | Owns | Must not own |
| --- | --- | --- |
| Apertus: teaching planner | Interpret the concept; propose a learning goal, experiment, example, and useful interactions | Invent executable mechanics or claim unavailable capabilities exist |
| Laya | Choose among finite, registry-derived assembly, variant, control, and observation options | Generate arbitrary values, invent IDs, or independently select every mandatory dependency |
| Apertus: configurator | Fill selected schemas; normalize language and units; check semantic fit; write brief labels | Write calculated outputs or replace selected capabilities silently |
| Application compiler | Resolve references, expand prefabs, derive dependencies, bind controls/views, validate and stage | Infer the entire user request through a fixed English regex |
| Runtime systems | Compute mathematics, motion, gas pressure, and state updates | Depend on model inference per frame |
| Views and visuals | Display authoritative results and illustrative animation within declared limits | Run a competing authoritative simulation |
| Controls | Submit supported commands | Write authoritative state directly |

Laya probabilities are selection signals, not proof of correctness. Apertus must be able to reject a confidently wrong selection.

## 5. Creation workflow

### 5.1 End-to-end sequence

1. Receive the original short prompt and validated application context.
2. Supply Apertus with a compact capability summary, supported learning representations, and limits.
3. Apertus proposes a structured teaching intent.
4. Application code validates that intent and constructs Laya questions from actual supported options.
5. Laya selects a compatible assembly and meaningful optional features.
6. Apertus receives the original prompt, accepted intent, selected capabilities, defaults policy, and exact argument schemas.
7. Apertus returns configuration, clarification, or a selection conflict.
8. Application code validates parameters and compiles a concrete recipe.
9. Expand prefabs and validate the complete staged world, controls, measurements, and presentation.
10. Commit atomically and display the simulation.
11. Show success only after acceptance by the runtime.

If a selected assembly's registered defaults satisfy the teaching intent exactly, application code may complete configuration without a second Apertus call. The first implementation should favor a clear, measurable path over premature call skipping.

### 5.2 Teaching intent contract

Define a versioned, strictly validated structure with fields equivalent to:

- Learning goal.
- Proposed supported representation.
- Main relationship to explore.
- Initial example.
- Requested learner interactions.
- Required observations.
- Initial playback policy.
- Brief explanation and model assumptions.

Keep the original prompt available throughout. Treat model-generated intent as a proposal, not authoritative evidence of what the user requested.

Do not allow free-form executable expressions, callbacks, code, or arbitrary system definitions in the intent.

### 5.3 Bounded selection tree

Use a shallow tree:

```text
Request kind
  create / edit / explain / unclear
       |
For creation: supported learning representation
  equal sharing / ballistic motion / ideal-gas pressure / ...
       |
Compatible experiment variant
  step-by-step sharing / single launch / volume exploration
       |
Supported interaction and observation preset
       |
Validated configuration and deterministic assembly
```

Do not issue a model request for every trait, visual, and system. The compiler derives mandatory dependencies from registry metadata.

Each meaningful selection includes an escape such as unclear, unsupported, or conflict. Dependent questions receive accepted parent decisions. Batch only independent questions.

### 5.4 Focused configuration outcomes

Reuse or extend the structured outcome conventions in 004:

| Outcome | Meaning | Next action |
| --- | --- | --- |
| Configuration | Selected capabilities match the prompt and teaching intent | Validate and compile |
| Clarify | A material user decision cannot be safely defaulted | Ask one short question without changing the scene |
| Conflict | Selected capabilities cannot realize the original intent | One bounded broader planning attempt |

Do not allow the configurator to silently replace the selected assembly, action, or target.

A malformed response may receive one schema repair with structured errors. Bound the entire request by a shared deadline and a total retry budget. Do not let nested repair and fallback paths multiply indefinitely.

Cancellation stops all downstream work and never starts fallback inference. Transport failure is not semantic ambiguity.

For the canonical three prompts, unnecessary clarification is an acceptance failure.

## 6. Default and vague-language policies

Missing educational example values are defaultable. Explicit user values are not.

| Input | Policy |
| --- | --- |
| Broad concept | Build a curated, useful starting example |
| Missing quantity or appearance | Use registered defaults and expose chosen values |
| Explicit quantity | Preserve it; reject or clarify if unsupported |
| Bigger, hotter, faster | Apply a documented bounded exploration policy and state the chosen change |
| Ambiguous reference with materially different outcomes | Ask one concise clarification |
| Unsupported mechanism | Explain the limitation and offer a supported alternative |
| Explanation request | Use actual state, recent accepted changes, and declared model assumptions |

Register the policy once so Apertus, controls, tests, and documentation agree.

Initial acceptance defaults:

| Simulation | Defaults |
| --- | --- |
| Division | 12 counters, 3 baskets, equal-sharing mode, looping disabled |
| Ball | 45 degrees, 20 m/s, Earth gravity 9.81 m/s² |
| Gas | 1 mmol, 300 K, 1 L, illustrative particles moving |

Initial vague-adjustment policy for gas:

- “Heat it up”: increase the current temperature by 50 K.
- “Add more gas”: increase the current amount by 0.5 mmol.
- Keep other independent inputs fixed.
- State the resulting value in the confirmation.
- At a supported limit, explain that no further step is available; do not silently clamp an explicit request.

A future broader policy can cover additional phrasing, but the canonical tests below must have deterministic expected configurations.

## 7. Simulation 1 — Division through equal sharing

### 7.1 Exact creation prompt

> Show me how division works

### 7.2 Intended teaching plan

Show twelve counters being shared among three baskets. Distribute one counter at a time so equal sharing is visible. Show the completed equation and expose a simple remainder example.

### 7.3 Assembly

| Responsibility | Existing component or configuration |
| --- | --- |
| Board | GroupingBoard |
| Objects | CounterToken and TokenGroup |
| Model | EqualGroupingSystem |
| Configuration | mode = share, total = 12, groups = 3, looping = false |
| Visuals | CounterTokenVisual, BasketVisual |
| Views | SVG scene and concise math readout |
| Commands | Start sharing, replay, change task through validated handlers |

If the current runtime requires a perGroup input in sharing mode, use the schema's neutral input and let the system derive the result. Do not confuse an input placeholder with the calculated quotient.

### 7.4 User experience

- Initial state: all twelve counters visible and three clearly labeled baskets.
- One primary action: Share.
- Share animates round-robin distribution at a readable pace.
- Completed state: four counters in each basket; no leftovers.
- Result: “12 ÷ 3 = 4”.
- Expose only Counters and Baskets as primary configuration inputs.
- Offer “Try one with leftovers” after or alongside the result.
- Replay repeats the current task; it does not switch to an unrelated exercise.
- Reset restores the generated initial example: 12 and 3.
- Disable automatic exercise cycling.

### 7.5 Acceptance scenarios

1. Create with the exact prompt.
2. Verify 12 counters, 3 baskets, and the Share action.
3. Click Share; wait for the declared completed state.
4. Verify groups [4, 4, 4], zero remainder, and visible equation.
5. Submit “What about leftovers?”
6. Require the curated example 14 counters and 3 baskets.
7. Share and verify groups [4, 4, 4] with 2 visibly separate leftovers.
8. Set the counter input to 15 through the UI, preserving 3 baskets.
9. Share and verify [5, 5, 5], zero remainder.
10. Reset and verify the original 12/3 setup.

At every stage, total counters in baskets plus undistributed counters plus leftovers must equal the configured total. Animation must not change the mathematical answer.

## 8. Simulation 2 — Throwing a ball

### 8.1 Exact creation prompt

> Show me how throwing a ball works

### 8.2 Intended teaching plan

Demonstrate a curved flight and connect angle and speed to range and height. Begin with one projectile; add a comparison only when requested.

### 8.3 Assembly

| Responsibility | Existing component |
| --- | --- |
| Prefab | Projectile |
| Traits | LaunchSettings, Transform2D, BallisticMotion, FlightMetrics, VisualBinding |
| System | BallisticMotionSystem |
| Visuals | Projectile shape, LauncherVisual, TrajectoryVisual |
| View | SVG world with compact flight metrics |
| Controls | Angle, Throw speed, Throw again |
| Optional comparison | Second independent Projectile instance and comparison display |

Use analytic ground-to-ground motion. No drag, elevated launch origin, or general collisions are implied.

### 8.4 User experience

- Start with one visible launch; retain the trajectory when the flight completes.
- Primary inputs: Angle and Throw speed, with degrees and m/s visible.
- Primary action after launch: Throw again.
- Main outputs: Distance and Maximum height.
- Put vectors, alternate gravity, and graphs under Explore more.
- Label comparison objects with text and color.
- Include the brief assumption: “Same launch and landing height; no air resistance.”
- Parameter changes use existing relaunch semantics consistently; the UI must not show old results as new ones.

### 8.5 Acceptance scenarios and numeric oracle

For speed v, angle theta, and positive gravity g:

- Range = v² sin(2 theta) / g.
- Maximum height = v² sin²(theta) / (2g).
- Flight duration = 2v sin(theta) / g.

Use an independent test oracle; do not simply compare one runtime helper with itself.

1. Create with the exact prompt.
2. Verify angle 45°, speed 20 m/s, Earth gravity.
3. Verify a visible flight and retained trajectory.
4. Require range approximately 40.775 m and maximum height approximately 10.194 m.
5. Change angle to 30° using the visible control.
6. Require range approximately 35.312 m and maximum height approximately 5.097 m.
7. Submit “Compare 30 and 60 degrees.”
8. Verify two independent projectiles at equal speed and gravity.
9. Require equal ranges approximately 35.312 m; heights approximately 5.097 m and 15.291 m.
10. Submit “Change only the second ball to 45 degrees.”
11. Verify the first remains 30°, both speeds remain 20 m/s, and the second's metrics match 45°.
12. Reset and verify the original single-projectile configuration.

Runtime numeric tolerance: absolute error no more than 0.001 in the corresponding unit for the oracle cases. Display values may be rounded consistently, for example to two decimals.

## 9. Simulation 3 — Gas pressure

### 9.1 Exact creation prompt

> Show me how gas pressure works

### 9.2 First-release physical model

Use a trusted equilibrium ideal-gas calculation:

```text
P = nRT / V
```

- P: pressure in pascals.
- n: amount in moles.
- R: 8.314462618 J/(mol·K).
- T: absolute temperature in kelvin.
- V: volume in cubic metres.

Display convenient units: mmol, K, L, and kPa. Convert to SI in one validated model boundary.

The primary lesson is volume versus pressure at fixed temperature and amount. Volume edits move between equilibrium states with temperature held fixed. Do not claim to simulate the transient thermodynamics of rapid compression.

Particle motion illustrates the mechanism of wall interactions. The authoritative pressure is calculated by the ideal-gas system, not inferred from decorative collision flashes.

### 9.3 Proposed components to implement and register

| Proposed component | Responsibility |
| --- | --- |
| GasContainer prefab | Container entity, boundary configuration, and visual binding |
| GasSample prefab | Independent amount and temperature configuration |
| GasState trait | Editable inputs and references |
| GasMetrics trait | System-owned pressure output |
| IdealGasSystem | Calculate authoritative equilibrium pressure |
| GasParticleIllustrationSystem | Seeded illustrative positions, velocities, and wall events |
| GasContainerVisual | Draw boundary and volume change |
| GasParticleVisual | Draw illustrative particles |
| PressureReadout | Display authoritative pressure and units |
| GasPressureExperiment composition | Assemble model, illustration, controls, and assumptions |

These names are proposed. Final identifiers must be registered with implemented providers before models may select them.

The illustration system owns only illustrative particle state. It does not overwrite the gas sample's thermodynamic inputs or calculated pressure. Hiding the illustration must leave pressure unchanged.

### 9.4 Configuration and presentation rules

Suggested initial bounded inputs:

| Input | Default | Supported range |
| --- | --- | --- |
| Amount | 1 mmol | 0.1–5 mmol |
| Temperature | 300 K | 100–600 K |
| Volume | 1 L | 0.25–2 L |

Expose Volume initially. Put Temperature and Amount of gas under Explore more.

Use a fixed-depth schematic: displayed container width can scale with volume while other dimensions stay fixed. Label it as a schematic; do not imply its screen area itself measures a three-dimensional volume.

Use a bounded number of representative particles. If dot count changes with amount, define a deterministic display mapping, such as 40 representative dots per mmol. The dots are not individual physical molecules counted by the thermodynamic model.

Illustrative speed should increase consistently with temperature, for example proportional to the square root of T/300. Do not attach physical velocity units unless the model includes the necessary mass and dimensional scaling.

### 9.5 User experience

- Container and moving particles dominate the screen.
- Wall contacts receive brief, subtle highlights.
- Volume slider and Pressure readout are adjacent.
- Temperature and amount remain visible as held-fixed values, even when their controls are collapsed.
- Primary explanation: “Make the container smaller and watch the pressure rise.”
- Always provide Reset and Pause motion.
- Pause motion affects illustration playback, not the equilibrium pressure response to an input change.
- No sound, flashing overlays, or dense graphs by default.
- Model details explain ideal-gas assumptions and the illustrative particle animation.

### 9.6 Acceptance scenarios and numeric oracle

Baseline: n = 0.001 mol, T = 300 K, V = 0.001 m³.

Expected pressure: 2494.3387854 Pa = 2.4943387854 kPa.

1. Create with the exact prompt.
2. Verify baseline inputs, visible moving particles, boundaries, volume slider, and pressure.
3. Change volume to 0.5 L through the UI.
4. Require pressure approximately 4.9886775708 kPa with temperature and amount unchanged.
5. Reset to baseline.
6. Submit “Heat it up.”
7. Require 350 K, unchanged volume/amount, and approximately 2.9100619163 kPa.
8. Reset to baseline.
9. Submit “Add more gas.”
10. Require 1.5 mmol, unchanged volume/temperature, and approximately 3.7415081781 kPa.
11. Pause motion; verify illustrative positions remain stable.
12. Change volume while paused; verify pressure still updates.
13. Reset and verify the original thermodynamic inputs and initial illustration state.
14. Submit “Why did the pressure increase?” after a recorded pressure-increasing edit; verify the explanation refers to that edit and the variables actually held fixed.

Numeric model tolerance: relative error no more than 0.000001 for these deterministic calculations. The display may round to two decimals.

Verify particles remain inside the visible container after volume changes. Their display positions may be remapped deterministically; do not describe that remapping as a molecular compression solver.

## 10. Assembly and runtime validation

Before activation or edits, validate:

1. Referenced definitions and versions exist.
2. Providers are implemented and available.
3. Parameters are finite, correctly typed, within range, and correctly converted.
4. Prefab expansion produces unique identities and valid references.
5. All required traits, systems, and resources resolve.
6. Mutable authoritative fields have one execution owner.
7. Behaviors use supported actions.
8. Visuals match the selected renderer and input contracts.
9. Controls bind to writable configuration or supported commands.
10. Measurements read real outputs.
11. Initial playback and reset semantics are explicit.
12. Session and revision checks prevent stale edits.
13. Invalid batches leave the previous state intact.

Represent initial recipe configuration separately from current state. Reset restores the initial generated experiment; replay repeats the current activity where specified.

Preserve user-specified quantities. Do not silently replace unsupported requests with the closest demo.

## 11. Presentation quality contract

Use trusted layout presets rather than arbitrary model-generated JSX or CSS.

All three experiences must have:

- One dominant scene and one obvious primary action.
- Only the controls needed for the initial lesson.
- Readable labels and consistent units.
- Clear mapping between objects and results.
- An accessible name for every interactive control.
- Keyboard-operable controls and visible focus.
- Text labels in addition to color.
- No internal component IDs, model traces, or schemas in the main learning flow.
- No overlapping panels, clipped results, or horizontal page overflow.
- Clear loading, failure, completion, and reset states.
- Reduced-motion behavior that preserves the lesson and results.
- Details and assumptions available without crowding the initial screen.

Suggested inspection viewports: 1440×900 and 390×844. Test actual layout at both sizes; resizing alone without interaction is insufficient.

Loading must provide visible feedback and cancellation. Repeated submission must not create duplicate sessions or multiple model clocks.

## 12. Proof that Apertus and Laya created the experiment

A qualifying creation requires evidence of:

1. The exact canonical prompt submitted through the normal UI.
2. A fresh live Apertus teaching-intent response.
3. A live Laya selection from registered choices.
4. Configuration derived from the accepted intent and selected schemas.
5. Successful staged validation.
6. A committed recipe and runtime state matching the request.
7. A usable browser result.

Record a correlation ID spanning browser request, planner calls, compiled recipe, and runtime acceptance.

Do not count these as qualifying passes:

- Mocked or prerecorded model responses.
- Cached complete plans substituted for fresh inference.
- A developer directly injecting the finished scene into runtime state.
- Opening a premade card instead of submitting the prompt.
- Laya being called but its answer ignored.
- An Apertus-only fallback presented as joint-model success.
- A model message claiming success before runtime activation.
- Screenshots without state and inference evidence.

Caching immutable catalog data and warming models are allowed. Capture whether any response repair occurred and preserve its trace. Repeated repair should be investigated even if final behavior passes.

## 13. Playwright MCP validation setup

Use **Playwright MCP** for the browser acceptance loop. This is distinct from merely running a Playwright CLI test suite.

At implementation time:

1. Discover the installed Playwright MCP tools and their supported browser/session operations.
2. Start the app and both inference services using the repository's current documented commands.
3. Verify service readiness and hybrid creation configuration.
4. Connect Playwright MCP to the local application.
5. Use an isolated browser context/session for each canonical creation.
6. Establish screenshot, console, network, and trace capture using available MCP capabilities.
7. Use accessible roles and labels for interaction.
8. Wait for explicit application states, not arbitrary long sleeps.

If Playwright MCP is unavailable, record the blocker and do not claim browser acceptance. Local unit tests and CLI browser tests may supplement diagnosis, but they do not replace the requested MCP acceptance evidence.

Prefer read-only diagnostic instrumentation for exact state checks. A test-only snapshot endpoint or browser-readable diagnostic view may expose recipe, inputs, outputs, revision, playback status, and request correlation ID. It must not bypass normal UI creation or mutate state.

Capture server-side inference evidence through server logs/diagnostics without exposing credentials or authorization headers.

## 14. Definition of a qualifying pass

A **pass** means the entire suite, not one simulation or one screenshot.

Each qualifying pass must include:

- Fresh live creation of DIV-001, BALL-001, and GAS-001.
- All required interactions and follow-up prompts in sections 7–9.
- Numeric/state oracle checks.
- Desktop and mobile layout/interaction checks for each simulation.
- Console and network review.
- Evidence of both models participating in each creation.
- Reset and scene-lifecycle checks.
- Quality review against section 11.
- Relevant regression checks on the same build.

Create each simulation freshly at each required viewport if needed to demonstrate its initial responsive experience. Each fresh canonical creation must use the real model path. Within a run, resizing an existing session can supplement responsive inspection.

The two passes must be consecutive and use:

- The same source/build fingerprint.
- The same registry and schema versions.
- The same system prompts and default policies.
- The same model versions and inference settings.
- The same declared test protocol and tolerances.

Fresh sessions and inference calls are required; identical wording, IDs, or visual particle trajectories are not. Semantic defaults, selected mechanisms, correct results, and usable interactions must be consistent.

## 15. Test–verify–fix–adjust–repeat loop

Maintain a consecutive-pass counter initialized to zero.

```text
Inspect current implementation and prerequisites
    ↓
Implement missing supported components and handoffs
    ↓
Run focused deterministic checks
    ↓
Freeze candidate build/configuration fingerprint
    ↓
Run complete live-model + Playwright MCP suite
    ↓
Check state, numerics, provenance, behavior, and visual quality
    ↓
Any failure?
    ├─ Yes:
    │    Save evidence and classify root cause
    │    Set consecutive passes = 0
    │    Fix implementation, model instructions, selection, or UX
    │    Run focused regression checks
    │    Freeze a new candidate fingerprint
    │    Repeat the complete suite
    │
    └─ No:
         Increment consecutive passes
         ├─ 1: repeat complete suite with fresh sessions/inference
         └─ 2: complete acceptance and report evidence
```

### 15.1 Before each candidate

- Recheck current source and service configuration.
- Verify registry entries match actual implementations.
- Check that model prompts only advertise supported functionality.
- Clear prior browser experiment state without deleting unrelated user data.
- Confirm required evidence capture is working.
- Record a candidate fingerprint, model settings, and hardware/runtime environment.

### 15.2 During each test

- Submit the exact short prompt with normal UI controls.
- Record the actual teaching intent and Laya choices.
- Wait for explicit runtime acceptance or a recorded failure.
- Inspect the screen and state before interacting.
- Execute all required control and prompt steps.
- Capture intermediate and final states.
- Check that every displayed success corresponds to an accepted command.

### 15.3 Failure classification

| Category | Example | Likely fix location |
| --- | --- | --- |
| Intent expansion | Division becomes an unrelated multiplication lesson | Apertus teaching prompt/schema |
| Capability selection | Gas selects projectile mechanics | Laya options, descriptions, or selection context |
| Configuration | Wrong units or lost explicit quantity | Focused argument contract and validation |
| Assembly | Missing traits or incompatible control binding | Registry/compiler |
| Runtime | Incorrect pressure or stale projectile result | Responsible deterministic system |
| Lifecycle | Reset restores the wrong recipe | Session/reset handling |
| UX | Correct model but controls are hidden or confusing | Trusted presentation preset |
| Infrastructure | Model service unavailable or MCP disconnected | Serving/tool setup |

Fix the root cause. Do not change the canonical prompt to make the model pass. Do not weaken tolerances, remove a failing scenario, or silently change the intended experiment.

### 15.4 Counter reset rules

Reset the consecutive-pass counter to zero after:

- Any required scenario failure.
- Any source change affecting the candidate.
- Any system-prompt, catalog, schema, default, model-setting, or runtime configuration change.
- Any missing or inconclusive required evidence.
- Any switch to fallback that bypasses the joint-model creation path.

A failure in the second pass invalidates the streak even if the first pass succeeded. Rerunning only the failed case is useful for diagnosis but cannot establish the two-pass gate.

An infrastructure interruption makes a pass nonqualifying. Record it and rerun after recovery; do not silently omit the interrupted case.

### 15.5 Persistence and blockers

Continue the loop until the two-pass gate is satisfied. Do not stop after the first attractive screenshot or one successful prompt.

If required tools, services, credentials, permissions, or compute remain unavailable, record the precise blocker, preserve evidence, and report incomplete validation honestly. Do not invent successful runs.

Keep end-user inference retries bounded. The development repair loop is separate from request-time fallback and must not create an infinite chain of inference calls for one user request.

## 16. Supporting deterministic and robustness checks

Run checks appropriate to each change before expensive browser passes:

- Schema validation and unit conversion.
- Dependency resolution and missing-provider rejection.
- Division conservation and remainder arithmetic.
- Ballistic oracle cases.
- Gas proportionality: half volume doubles pressure; doubling Kelvin temperature doubles pressure at fixed amount/volume.
- Reject nonpositive gas volume and temperature outside supported bounds.
- Independent instance state and stable target identity.
- Invalid/stale commands preserve state.
- Cancellation does not launch fallback.
- One simulation clock regardless of view count.
- Hiding visuals does not alter authoritative results.
- Reset restores the generated initial configuration.
- Confidently incorrect Laya proposals are challengeable.

Add a small live robustness set after canonical cases are stable, including typos, number words, explicit quantities, and negation. Preserve canonical prompts as the main gate.

Record end-to-end latency, time to visible feedback, per-model time, repairs, and fallback count. Before acceptance begins, declare a numeric end-to-end timeout and a target latency for the actual hardware. Do not invent a latency claim before measurement or change the budget between the two passes.

## 17. Evidence and reporting

Store evidence under a dedicated directory such as:

```text
docs/agent-only/implementation/005-validation/
  candidate-<fingerprint>/
    manifest.json
    pass-01/
      division/
      ball/
      gas/
    pass-02/
      division/
      ball/
      gas/
    report.md
```

A failure attempt should have its own preserved attempt directory; do not overwrite it with a later success.

For every case record:

- UTC timestamp and run ID.
- Candidate/build fingerprint and working-tree fingerprint.
- Model identities, relevant inference settings, and planner mode.
- Exact user prompt and viewport.
- Request/correlation IDs.
- Teaching intent, Laya selections, configuration, and repair/fallback trace.
- Validated recipe and accepted initial state.
- Each interaction, expected result, observed result, and assertion outcome.
- Numeric errors against independent oracles.
- Screenshots before and after important interactions.
- Console errors and relevant network failures.
- Timing and request counts.
- Quality checklist results and unresolved issues.

Never save secrets in evidence.

The final report must state:

- Whether two consecutive full-suite passes were achieved.
- Which unchanged candidate and configuration they used.
- Per-simulation and per-viewport results.
- Proof of live Apertus and Laya participation.
- Links to evidence.
- Actual latency and repair/fallback observations.
- Remaining limitations, especially gas model fidelity.
- Any blocked or unexecuted checks.

Leave pass results marked **Not run** until evidence exists.

| Candidate | Pass | Division | Ball | Gas | UX/MCP evidence | Joint-model provenance | Overall |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `0c619d422d09` | 1 | Pass at 1440 and 390 | Pass at 1440 and 390 | Pass at 1440 and 390 | Pass | Pass | Pass |
| `0c619d422d09` | 2 | Pass at 1440 and 390 | Pass at 1440 and 390 | Pass at 1440 and 390 | Pass | Pass | Pass |

## 18. Suggested implementation order

1. Reinspect the current collaboration implementation and preserve existing work.
2. Define teaching-intent, selection, configuration, and provenance contracts.
3. Register default policies and presentation presets.
4. Implement Apertus-first creation and Laya bounded selection.
5. Complete division creation, sharing/replay behavior, and remainder follow-up.
6. Complete ball creation, controls, comparison, and reset semantics.
7. Implement and register gas systems, units, prefabs, visuals, and controls.
8. Add deterministic oracles and relevant failure-boundary checks.
9. Establish Playwright MCP evidence capture.
10. Execute the full repair loop until two consecutive qualifying passes succeed.

Do not replace the trusted component architecture with generated application code. The intended achievement is reliable model-guided composition with a clean learning experience.

## 19. Definition of done

The work is complete only when:

- All three exact short prompts create useful experiments without extra questions.
- Apertus expands intent and Laya makes meaningful supported selections.
- The application assembles, validates, and activates the resulting recipes.
- All required controls, follow-ups, calculations, and resets behave correctly.
- Gas pressure has an implemented, accurately described trusted model.
- Desktop and mobile experiences satisfy the quality contract.
- Two consecutive complete passes succeed on the same candidate using live models and Playwright MCP.
- The report and evidence substantiate the result.

Two successful passes demonstrate this bounded acceptance suite. They do not establish universal language reliability or support for arbitrary simulations.
