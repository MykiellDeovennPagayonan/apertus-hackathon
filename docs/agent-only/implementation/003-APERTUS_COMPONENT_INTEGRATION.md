# Apertus component integration and basic component roadmap

**Status:** Implemented delivery, 2026-10-02, for phases A–C and bounded projectile assembly/recipe persistence from phase D. The original roadmap is retained below; future features remain explicitly marked in the delivery notes.

**Objective:** Let Apertus create runnable experiments from registered components, configure independent instances, and edit them through validated commands. Extend the existing library with a small set of reusable educational components.

Follow [Component Architecture](../../COMPONENT_ARCHITECTURE.md) and [Component Contracts](../COMPONENT_CONTRACTS.md). Build on [the extraction inventory](001-COMPONENT_IMPLEMENTATION.md) and [early math simulations](002-EARLY_MATH_SIMULATIONS.md). Their ownership, validation, and nine-kind taxonomy remain authoritative.

## Delivery notes (2026-10-02)

Implemented:

- All eight original experiments use the same Apertus JSON planning path. Initial math values are staged and accepted resets preserve those values.
- Shared serializable parameter/operation metadata, qualified versioned references, topic/dependency selection, bounded structured context, four plan outcomes, and one bounded repair attempt.
- Independent identity-based projectile instances, targeted edits and motion, atomic batches/replacements, configuration revisions independent of ticks, and accepted-initial-state resets.
- Trusted view bindings, typed results tables, independent comparison panels, entity inspectors, entity-attached measurement probes, bounded analytic model-time sampling/time-series views, and isolated angle sweeps.
- Bridge load dragging with SVG-to-model coordinate mapping and keyboard input through shared dispatch.
- Ratios/percentages, rectangle area/perimeter, coordinate plotting/dragging, and seeded uniform coin/die trials with separate observed/expected frequency outputs.
- Bounded assembly of 1–4 trusted projectile prefabs with custom identities and compatible view selections. Recipes export/import accepted initial inputs, identities and explicit view bindings. Unknown/nested recipe fields, providers, versions, incompatible bindings, duplicate identities and scoped field-writer conflicts are rejected before activation.

Verification includes deterministic simulation/integration tests, mock-provider transport tests, complete Playwright creation/edit/reset/import/error flows, TypeScript, lint, and production builds (Webpack and an isolated Turbopack build). The cached local MLX model passed **17/17** evaluated cases for both schema validity and final-state correctness. [Recorded plans and token usage](003-APERTUS_LIVE_EVALUATION.json) distinguish live-model evidence from mock-provider browser tests. Run `pnpm test`, `pnpm test:apertus`, `pnpm test:browser`, and `pnpm test:apertus:live` from `src/web`.

The first live evaluation exposed ambiguous initial-creation instructions and singular/plural angle schema confusion. The final instructions explicitly distinguish creation from active-session edits, show complete valid envelopes, and provide the exact selected schemas during repair. A repeated live run also exposed a valid-but-wrong town pause flag; clock semantics are now explicit in metadata/instructions and planning uses temperature zero. The final recorded run has 17/17 valid plans and correct states (largest prompt: 5,142 tokens; largest completion: 73 tokens). The inference runner now invokes `python -m mlx_lm`, allowing the existing moved virtual environment to run despite its stale console-script path.

Still future work: cross-domain free assembly, authoring/registration of nested reusable prefabs or behavior recipes, general observation adapters beyond ballistic sampling, execution checkpoints, spring motion, and service queues. They are not advertised as runnable capabilities. Probability is the chosen phase-D mechanism. No structural engineering solver, commerce or arbitrary scripting was added.

## 1. What “make components” means

Apertus should be able to create instances and assemble new declarative recipes using implemented capabilities:

- Select and configure an existing composition.
- Instantiate a registered prefab with independent parameters and identity.
- Assemble supported prefab instances, systems, views, and controls into a composition.
- Eventually author a reusable prefab or behavior recipe within an explicitly supported vocabulary.

Creating a new computational capability is a separate development task. A generated definition named `SpringMotionSystem` cannot execute until trusted code implements that system. Apertus must report missing capabilities instead of inventing providers or embedding JavaScript in recipes.

Keep model-generated content serializable and inspectable. Systems, rendering adapters, command handlers, and behavior operations remain trusted application code. Newly authored recipes must pass the same validation as built-in recipes before activation or reuse.

## 2. Repository baseline

Paths below are relative to the project root.

| Area | Current implementation | Integration gap |
| --- | --- | --- |
| Model serving | `src/inference/Makefile` starts a local MLX chat-completion server | Serving alone does not expose the component catalog |
| Model client | `src/web/src/lib/apertus/client.ts` sends a prompt and command specifications | Instructions cover only projectile, bridge, and town |
| Plan validation | `src/web/src/lib/apertus/schema.ts` validates a demo and up to eight commands | No prefab creation, component selection, or composition plans; math is excluded |
| API | `src/web/src/app/api/apertus/route.ts` validates bounded requests and invokes the client | Request context is a small flat state summary |
| Browser flow | `src/web/src/app/playground/_components/PlaygroundShell.tsx` requests plans and dispatches commands | Math uses local matching; original demos receive model plans; batches can partially apply |
| Catalog | `src/web/src/simulations/legacy/runtime/catalog.ts` and `mathCatalog.ts` register definitions | Metadata does not fully describe parameters, operations, outputs, and compatibility |
| Providers | `src/web/src/simulations/legacy/runtime/providers.ts` maps systems to trusted implementations | Provider presence does not yet supply a general composition execution adapter |
| Validation | `src/web/src/simulations/legacy/runtime/validation.ts` validates selections and stages prefab data | Validation is tied to known demo models; staged data is not generally committed by activation |
| Activation | `src/web/src/simulations/legacy/runtime/session.ts` activates predefined demos | Original demos reset their existing stores; math activates a single staged board |
| Presentation | `src/web/src/simulations/legacy/components/views/ExperimentView.tsx` renders predefined combinations | Selecting arbitrary view IDs does not dynamically bind and render them |

There are eight existing experiments: projectile, bridge, town, counting, arithmetic, equal groups, fraction builder, and fraction number line. Connect these before duplicating their capabilities.

Current model limits remain explicit: projectile motion is analytic and ground-to-ground; bridge response is heuristic; town provides schedules and planar navigation with 3D presentation. Town purchases, queues, and general physics are not existing capabilities.

## 3. Intended execution flow

```text
User prompt + active experiment summary
                  |
                  v
Select relevant catalog capabilities
                  |
                  v
Apertus returns a declarative plan
                  |
                  v
Validate structure -> resolve definitions -> stage assembled result
                  |                              |
                  | failure                      | success
                  v                              v
Specific errors / bounded repair          Commit valid state
                                                 |
                                                 v
                              Trusted systems, visuals, views, controls
                                                 |
                                                 v
                                   Actual execution results and feedback
```

Keep `src/inference` responsible for serving the model. Put catalog selection, plan schemas, and model instructions in the web application's server-side Apertus integration. Put execution and authoritative validation in the simulation runtime. Do not duplicate simulation mechanics in Python.

The existing JSON-over-chat transport is sufficient for the first slice. Native tool calling or constrained decoding may be evaluated later; neither is a prerequisite or an assumed feature of the current server.

## 4. One source of capability metadata

Extend the existing catalog rather than introducing another independent registry. Each applicable definition should expose:

- Qualified reference and version, such as `prefabs/Projectile` version `1`.
- Description, supported use cases, and explicit limitations.
- Parameter schemas with defaults, units, bounds, and edit timing.
- Required traits, resources, systems, and other definitions.
- Supported operations with argument schemas and target requirements.
- Public outputs with types, units, and model fidelity.
- Supported model space, rendering target, and coordinate mapping requirements.
- Ownership declarations for authoritative fields.

Use qualified references because names such as `BridgeLoad` occur in multiple kinds. The current code uses plural kind keys; retain a consistent wire representation or introduce an explicit mapping to the contracts' singular terminology.

Derive planner descriptions and runtime argument validation from shared schemas. Avoid maintaining unrelated numeric bounds in the prompt, widgets, and dispatch handlers. Resolve trusted implementation code separately from serializable metadata.

Initially, select catalog entries using explicit topic and capability mappings. Include the selected entries' dependencies. The catalog is small enough that a vector database is unnecessary. If retrieval finds no supported capability, return a clear unsupported result or a clarification request.

## 5. Plan contract

Introduce a versioned discriminated union with four outcomes:

| Outcome | Purpose |
| --- | --- |
| `create` | Select a supported composition template and provide bounded overrides |
| `edit` | Apply supported operations to an existing experiment and explicit targets |
| `clarify` | Ask for information required to produce a valid plan |
| `unsupported` | Explain which requested capability is missing |

Start with template selection. Add free assembly only after the runtime can execute the resulting definitions. Suggested creation envelope:

```json
{
  "schemaVersion": 1,
  "operation": "create",
  "composition": {
    "ref": "compositions/AngleComparisonExperiment",
    "version": 1
  },
  "parameters": {
    "angles": [30, 60],
    "speed": 20,
    "gravityPreset": "Earth"
  },
  "message": "Compare two launch angles at the same speed."
}
```

This is a proposed schema. The existing angle-comparison implementation must be adapted before accepting these parameters as independently simulated instances.

Suggested edit envelope:

```json
{
  "schemaVersion": 1,
  "operation": "edit",
  "sessionId": "experiment-1",
  "expectedRevision": 4,
  "commands": [
    {
      "target": "projectile/secondary",
      "action": "SET_VELOCITY",
      "arguments": { "value": 25 }
    }
  ],
  "message": "Increase the second projectile's launch speed."
}
```

Session identity and revision come from application context and must be checked against the active session. Define revision as a configuration/topology revision, not a counter incremented on every simulation tick. Reject stale plans after a reset, replacement, or incompatible edit. Existing commands do not yet accept this target/arguments envelope; adapt them through explicit handlers.

Use bounded arrays, strings, nesting, instance counts, and output budgets. Reject unknown fields and IDs. Keep display text separate from execution instructions.

## 6. Context Apertus needs

Provide a compact snapshot containing:

- Active composition reference, session identity, and configuration revision.
- Exposed instance IDs and human-readable labels.
- Relevant editable parameters and allowed actions.
- Selected authoritative outputs with units and assumptions.
- Selected views and available presentation changes.
- Relevant recent command outcomes when needed for a follow-up.

For “make the second projectile faster,” the context must identify the secondary instance and its speed. A demo name alone is insufficient. For “why did the bridge turn red?”, include the actual heuristic response output and limitation rather than asking the model to infer engineering stress from appearance.

Treat browser-provided context as planning information. Validate every operation again against actual active runtime state before committing. Do not send full meshes, render objects, or every frame of entity state.

## 7. Make composition data executable

### 7.1 Resolve and stage

Add a small resolver that expands a template and overrides into a complete definition. Resolve references and versions, expand prefabs with unique IDs, resolve exposed parts, and validate dependencies, parameters, ownership, and bindings.

Extend `stageComposition` incrementally. Its current canonical-demo checks and single-math-board restriction are real constraints; declaring a new JSON shape does not remove them.

Return a staged result that includes the resolved definition, initial model data, provider bindings, and view/control bindings. Do not mutate the active world while building it.

### 7.2 Commit and execute

Introduce an activation path that consumes the staged result. Existing demo adapters can remain while each domain moves to this path; a universal ECS is unnecessary.

For the first projectile slice:

1. Store projectile instances by identity with independent launch and motion state.
2. Initialize them from staged prefab data, rather than hardcoded reset defaults.
3. Advance each through the trusted ballistic provider.
4. Route targeted commands to the correct instance.
5. Render trajectories and measurements from those instances.
6. Reset to the accepted composition's initial configuration.

Ownership conflicts must be checked per entity/field scope. The existing broad ownership strings cannot distinguish two legitimate instances of the same system from two providers competing for one position.

Validate and stage replacements before disposing the current session. Update the shell's startup path accordingly; it currently disposes before activation completes.

### 7.3 Bind presentation

Use explicit trusted maps for supported visuals, views, and controls. Resolve their data bindings from the composition rather than inferring an entire demo from a layout name.

Validate both rendering compatibility and required inputs. A graph needs a compatible dataset, not merely an SVG-compatible tag. A 3D town view does not enable volumetric physics.

### 7.4 Apply edits

Widgets, local prompt adapters, and Apertus plans should share dispatch handlers. Handlers return accepted/rejected results with target and path information.

Stage related command batches against a candidate state, validate the final result, and commit together. Defer effects until commit. This avoids applying one model-requested change before discovering that the next command is invalid. Specify live, relaunch, paused, or rebuild timing per operation.

### 7.5 Save declarative recipes

Preserve composition references, parameters, instance IDs, resources, bindings, and assumptions when saving. Saving an initial recipe is distinct from resuming an in-progress execution checkpoint.

Later, allow new prefabs made from supported nested prefabs and new behaviors made from trusted operations. Validate cycles, references, supported observations/actions, and limits. Register only validated definitions; never turn model text into executable callbacks.

## 8. Inference integration changes

| File or area | Required change |
| --- | --- |
| `lib/apertus/schema.ts` | Replace the three-demo-only envelope with shared, versioned plan schemas; support all existing experiments first |
| `lib/apertus/client.ts` | Build instructions from selected capability metadata and use structured experiment context |
| `lib/apertus/browser.ts` | Parse the new plan envelope and preserve cancellation |
| `app/api/apertus/route.ts` | Validate bounded structured context and validate model plans server-side |
| `PlaygroundShell.tsx` | Execute plans through one runtime entry point; remove the math-only inference bypass after parity is verified |
| Runtime catalog and command schemas | Supply consistent descriptions, schemas, units, defaults, and action constraints |
| Runtime validation/session | Resolve, stage, activate, target, and atomically edit supported compositions |
| `ExperimentView.tsx` | Render supported resolved bindings incrementally |
| `src/inference/Makefile` | Retain the serving role; add a planner smoke check alongside the greeting check if useful |

On invalid model output, permit at most one repair request containing concise validation errors and the allowed schema. Never activate the invalid intermediate plan. If repair fails, retain the previous experiment and show a useful error.

Preserve timeouts, cancellation, concurrency limits, and server-side credentials. Check token usage with realistic plans; compact template plans should precede large assembly documents. The greeting smoke test proves connectivity only, not planning quality.

Confirm changes from runtime outcomes. Model-authored messages describe intended actions until execution succeeds.

## 9. Basic components to add

All names below are proposed. Reuse existing controls, metrics, number lines, fraction bars, token visuals, and sampling helpers where their contracts fit.

### Priority 1: reusable observation and interaction

| Proposed component | Kind | Minimum contract and reuse |
| --- | --- | --- |
| `ResultsTableView` | View | Display a typed dataset with labels and units; reuse across sweeps, math, and town measurements |
| `ComparisonView` | View | Arrange independently bound results or scenes; does not compute model results |
| `TimeSeriesView` | View | Plot timestamped outputs with declared units; distinct from the existing angle-versus-range XY graph |
| `MeasurementProbe` | Trait | Entity-attached observable selection and sampling configuration; never owns the source measurement |
| `MeasurementSamplingSystem` | System | Sample allowed observables at model-time intervals into bounded datasets; declare pause/reset behavior |
| `EntityInspectorView` | View | Show public parameters, outputs, identity, and assumptions; dispatch supported edits through controls |
| `DragHandleControl` | Control | Convert picked identity and mapped coordinates into a supported edit command; use it for bridge load position first |

Implement parameter sweeps as a runtime experiment-execution helper, not a tenth component kind. Start with the existing pure ballistic sampling functions and isolated evaluations. Add a sweep composition that binds its dataset to `XYGraphView` or `ResultsTableView`.

### Priority 2: basic math extensions

| Feature | New components | Existing pieces to reuse |
| --- | --- | --- |
| Ratios and percentages | `RatioState` trait, `RatioSystem` system, `RatioBoard` prefab, `RatioExperiment` composition | Token and fraction-bar visuals, integer/fraction inputs, math readouts |
| Area and perimeter | `RectangleDimensions` trait, `RectangleMetricsSystem` system, `DimensionLabelVisual` visual, `RectangleBoard` prefab, `AreaPerimeterExperiment` composition | SVG view, primitive shapes, sliders, metrics |
| Coordinate plotting | `CoordinatePoint` prefab, `CoordinateAxesVisual` visual, `CoordinateExperiment` composition | `Transform2D`, shape visual, SVG view, proposed drag control |

Define units and supported domains explicitly. Rectangle inputs require positive dimensions. Ratios use explicit numerator/denominator semantics and defined zero-denominator handling. Coordinate axes can use dimensionless math units without pretending they are metres. A coordinate plotting activity need not add a simulation system unless it has computed mechanics.

### Priority 3: simple new simulation mechanisms

| Feature | New components | Minimum scope |
| --- | --- | --- |
| Probability trials | `DistributionPresets` resource, `RandomTrialState` trait, `RandomTrialSystem` system, `HistogramView` view, `ProbabilityExperiment` composition | Seeded dice or coin trials; bounded counts; observed and expected frequencies clearly distinguished |
| Spring motion | `SpringSettings` and `OscillatorState` traits, `SpringMotionSystem` system, `SpringVisual` visual, `SpringMass` prefab, `SpringExperiment` composition | One-dimensional spring motion with declared damping, units, and integration method; reuse time-series and playback views |
| Town service queues | `ServiceStation` and `QueueMembership` traits, `QueueSystem` system, `VisitService` behavior | Explicit arrival, waiting, service duration, and completion; integrate with navigation events; no implied economy |

Defer general rigid-body physics, a structural engineering solver, arbitrary scripting, and town commerce until a concrete experiment requires them. They are larger capabilities than these basic additions.

## 10. Delivery sequence and acceptance criteria

### Phase A: connect the existing library

- Expose all eight experiments and their supported commands to Apertus.
- Apply requested initial math values rather than starting only a default board.
- Share schemas between planner descriptions and runtime validation.
- Preserve deterministic local commands as optional adapters using the same dispatch path.

**Acceptance:** “Show 3/4,” “share 14 between 3 groups,” and the original projectile/bridge/town prompts produce correct supported plans and resulting state. Unsupported requests produce no mutations.

### Phase B: prove instance-based composition

- Implement template resolution and staged activation for projectile comparison.
- Create independent instances and targeted edits.
- Preserve valid state on failed replacement or command batch.
- Bind visuals and measurements to the resolved instance identities.

**Acceptance:** “Compare launches at 30° and 60° on the Moon,” followed by “make the second one faster,” changes only the second instance. Reset restores the accepted initial experiment. Hiding a trajectory does not change model outputs.

### Phase C: add basic reusable components

- Add results table, comparison, time-series measurement, and bridge load dragging.
- Add ratios/percentages and area/perimeter compositions.
- Include new capabilities in the shared catalog so the planner discovers them without a separate handwritten command inventory.

**Acceptance:** Apertus can select the new experiments, configure their inputs, bind compatible outputs, and explain unsupported combinations using specific missing capabilities.

### Phase D: bounded assembly and reusable recipes

- Let Apertus assemble supported prefab combinations beyond predefined templates.
- Validate typed references, scoped ownership, bindings, and behavior operations.
- Save and reload declarative experiment definitions.
- Add probability, spring motion, or queues according to product priority.

**Acceptance:** A generated recipe reloads with the same initial configuration and valid references. Unknown providers, cyclic recipes, incompatible renderers, and conflicting state writers are rejected before activation.

## 11. Verification strategy

Use deterministic runtime tests for independent instance state, reference resolution, failed-batch rollback, reset semantics, stale-plan rejection, renderer/data compatibility, and ownership conflicts. Check observable behavior rather than duplicating implementation internals.

Keep a separate small live-model evaluation set covering initial creation, follow-ups, ambiguous targets, unsupported capabilities, out-of-range inputs, and malformed output. Record schema validity and final-state correctness separately: valid JSON alone is not success. Live-model evaluations should not make ordinary unit tests depend on an available inference server.

Browser verification should cover a complete creation/edit/reset flow, component inspection, errors that preserve the existing scene, and presentation changes that leave model results unchanged.

The first complete milestone is a model-planned, validated two-projectile experiment with independently targeted follow-ups. That establishes the path from Apertus output to actual component instances before broadening the catalog.
