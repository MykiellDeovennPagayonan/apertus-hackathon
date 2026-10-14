# Legacy simulation components

This directory preserves existing domain scenes, systems, traits, specialized controls and saved-document compatibility. Stable component IDs and versions are unchanged. Add new native components to `simulations/registry/`; promote a domain only with its complete model/contract/rendering dependency closure.

The authoritative data-only identity integration lives in `registry/index.ts`. `registry/legacyDefinitions.ts` adapts declarations from this directory, without importing the registry root from those declarations. Retired control aliases still resolve saved documents but are excluded from active discovery. Generic control implementations, authored object definitions and shared contracts have been promoted out of this directory.

| Responsibility | Owner relative to `simulations/` |
| --- | --- |
| Shared public, parameter, control and observation contracts | `registry/contracts/` |
| Authored line, square, gas, fraction and town objects | `registry/objects/` |
| Generic control implementations and metadata | `registry/controls/`, `registry/definitions/` |
| Built-in construction, defaults, learning capture and premade registration | `registry/recipes/` |
| Creation/edit orchestration and inference | `creation-and-editing/pipeline.ts`, `creation-and-editing/input/inference/` |
| Authoring drafts, operations and serialization | `creation-and-editing/authoring-engine/` |
| Shared document/recipe/runnable validation | `creation-and-editing/validator/` |
| Accepted state, commands, capture, providers and time | `creation-and-editing/runtime-engine/` |
| Generic recipe lesson/board rendering | `creation-and-editing/simulation/` |
| Preserved domain implementation and specialized rendering | `legacy/components/`, `legacy/runtime/`, `domains/` |
| Manual composition, preview, history and persistence | `builder/` |
| Original recipe JSON and assets | `pre-made/` |

`RecipeLesson` renders runtime snapshots and does not own scientific stepping. Runtime execution does not import the manual builder. The experiments shell and builder retain activation/persistence responsibilities.

See the [current pipeline walkthrough](../../../../../../docs/agent-only/features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md), [component architecture](../../../../../../docs/COMPONENT_ARCHITECTURE.md), and [component contracts](../../../../../../docs/agent-only/COMPONENT_CONTRACTS.md). Existing implementation inventories remain historical context; they do not authorize deleting identities used by saved documents.

The folders below describe preserved implementations. Native definitions and new orchestration work use the promoted owners above.

## What each component folder is for

### `resources/`: reusable data and assets

Existing resources preserve immutable palettes, layouts and asset references. New component contracts and preset inventory belong in `simulations/registry/`. Examples include `GravityPresets.ts`, `BridgeStyles.ts`, `TownLayout.ts`, `TownAppearance.ts`, `DailySchedule.ts` and `WalkingProfile.ts`.

Resources supply inputs. They do not advance time, execute behavior or draw themselves. A layout supplies initial positions; changing the running market position changes instance data rather than the shared layout. Keep small one-use literals inline where a separate resource adds no value.

### `traits/`: data attached to entities

Put typed configuration, state and output schemas here. Examples include `Transform2D.ts`, `LaunchSettings.ts`, `MemberEndpoints.ts`, `MemberResponse.ts`, `NavigationAgent.ts` and `Resident.ts`.

Document each public field's meaning, units, default/range, edit timing and authoritative writer. Traits contain no simulation callbacks. Initial position and current position need explicit reset semantics. An entity's transform, visible appearance and navigation participation are separate choices.

### `behaviors/`: declarative activity recipes

Put inspectable rules that choose and sequence supported requests here. `DailyRoutine.ts` describes when a resident should request travel to home, school/workshop, market or square.

A trusted behavior runner executes the recipe. The recipe cannot calculate its own path, move a mesh or write another system's fields. Neither gravity nor bridge response is a behavior in these demos.

### `systems/`: simulation mechanics

Put trusted computation that reads model inputs and owns model updates here. Examples are `BallisticMotionSystem.ts`, `HeuristicBridgeResponseSystem.ts`, `NavigationSystem.ts`, `PathFollowingSystem.ts` and `BehaviorRunnerSystem.ts`.

Declare required data, accepted actions, read fields, owned write fields, outputs/events and execution trigger. Ballistics/path following advance with model time; bridge response recomputes when inputs change. Pure helpers such as equations and path search may live beside their provider. Systems do not manipulate SVG elements or Three.js meshes.

### `visuals/`: how objects and model results look

Put adapters that turn read-only data into compatible drawing descriptions or backend-specific presentation here. Examples include `ShapeVisual2D.ts`, `TrajectoryVisual.ts`, `BeamVisual.ts`, `CitizenVisual3D.tsx`, `BuildingVisual3D.tsx` and `MarketVisual3D.tsx`.

A visual specifies geometry, style, labels, identity and supported rendering targets. It may calculate display geometry and animation but cannot produce a second authoritative model. `BeamVisual` colors an existing response score; it does not calculate bridge response. Shared shape rendering can serve both projectile balls and bridge joints.

Keep small appearance helpers such as procedural windows, boxes and trees with their owning visual. A separate file or function does not automatically require a catalog entry.

### `views/`: rendering surfaces and result displays

Put viewport and dataset presentation implementations here. Examples are `SVGWorldView.tsx`, `ThreeWorldView.tsx`, `XYGraphView.tsx`, `MetricsView.tsx`, `MemberInspector.tsx`, `LegendView.tsx` and `ExperimentView.tsx`.

Views own projection, drawing order, render-object lifecycle, layout and interaction coordinates. The projectile and bridge can use the same SVG view with different settings. The town uses a 3D view of a planar model. The projectile graph consumes range-versus-angle data directly; it does not need entities for graph points.

Camera, lighting, sky, selection and animation reveal are presentation concerns. A day/night lighting rig reads time from runtime; it never advances the simulation clock.

### `controls/`: input translated into commands

Put command-bound input components and adapters here. Examples include `ParameterSlider.tsx`, `PlaybackControls.tsx`, `SelectionControl.ts`, `OrbitCameraControl.tsx`, `PromptControl.ts` and the three simulation control panels.

Controls may display current values and provide input feedback. Model/lifecycle requests go through validated dispatch; camera and overlay changes go to presentation state. Manual controls and prompt commands use the same supported handlers. A success message follows an accepted result.

The existing application command bar can host the prompt adapter. Deterministic phrase matchers remain trusted helpers alongside that adapter. Simulation-specific panels assemble shared controls here, rather than implementing widgets inside `pre-made/`.

### `prefabs/`: recipes for objects and assemblies

Put initial entity/assembly definitions here. Examples include `Projectile.ts`, `Citizen.ts`, `Building.ts`, `Market.ts`, `Joint.ts`, `Member.ts`, `BridgeLoad.ts` and `TrussAssembly.ts`.

A prefab declares parameters, initial traits, resource/behavior/visual references, local part names and required capabilities. An instantiator expands it into independent staged data, then runtime validates and commits it. A truss can use the existing trusted layout helper. A prefab does not install the application camera or global clock.

### `compositions/`: complete experiment recipes

**Convention update (2026-10-06):** [Implementation 013](../../../../../../docs/agent-only/implementation/013-PREMADE-JSON-RECIPE-CONVENTION.md) defines the approved target: every premade has only `pre-made/<slug>/recipe.json`, consumed through one generic registry and loader. The composition/re-export examples below describe legacy code awaiting migration; they are not instructions for new premades.

Put full experiment definitions here: `ProjectileExperiment.ts`, `AngleComparisonExperiment.ts`, `BridgeExperiment.ts` and `TownExperiment.ts`.

A composition selects world/model settings, systems, prefab instances and overrides, references, views, controls, measurements and assumptions. This is where the initial 22 citizens, 10 t bridge load, or 45° projectile setup is assembled from library definitions.

Legacy compositions live in the main library and are re-exported by `pre-made/<simulation>/compositions/index.ts` until migration removes those trees. Authored premade JSON belongs at exactly `pre-made/<slug>/recipe.json`, with no other directory contents. Gas Pressure's current `gas-pressure.recipe.json` is an intermediate extraction that still needs the standard filename and generic loading path. Shared component implementations, loading, and validation stay outside the premade directory; the experiment runtime and builder consume the same recipe.

## How premade simulations use the library

These named exports are implemented:

```ts
// simulations/pre-made/projectile/views/index.ts
export { SVGWorldView } from "../../../legacy/components/views/SVGWorldView";
export { XYGraphView } from "../../../legacy/components/views/XYGraphView";

// simulations/pre-made/bridge/views/index.ts
export { SVGWorldView } from "../../../legacy/components/views/SVGWorldView";

// simulations/pre-made/town/systems/index.ts
export { NavigationSystem } from "../../../legacy/components/systems/NavigationSystem";
export { PathFollowingSystem } from "../../../legacy/components/systems/PathFollowingSystem";
export { BehaviorRunnerSystem } from "../../../legacy/components/systems/BehaviorRunnerSystem";

// simulations/pre-made/bridge/compositions/index.ts
export { BridgeExperiment } from "../../../legacy/components/compositions/BridgeExperiment";

// simulations/pre-made/bridge/index.ts
export { BridgeExperiment } from "./compositions";
```

These exports make component selection easy to browse. The composition is the authoritative recipe that runtime resolves and loads. Imports themselves must not instantiate entities or start simulation time.

## Dependency and ownership rules

- Target boundary: only `registry/recipes/premade.generated.ts` directly imports premade JSON in production. Components, resource defaults, planner code, routes, and builder code consume shared APIs or supplied configuration. Existing direct imports and re-export trees are migration debt tracked by implementation 013.
- Keep definitions and model functions independent of React and rendering backends. Use `.tsx` for actual React presentation/control code and `.ts` for data/model contracts.
- Compositions/prefabs hold data and known provider references. Executable providers are trusted implementations; arbitrary executable content does not belong in resources or recipes.
- Each mutable field has one normal execution owner. Construction, validated configuration edits and reset are coordinated lifecycle exceptions.
- A model result must remain the same when a visual is hidden or the camera changes. A second view must not create a second simulation clock.
- Shared definitions do not imply shared mutable entity state. Two prefab instances receive different IDs and independent state.
- Keep helpers, CSS and focused tests beside the owning implementation. Add a component-specific subfolder only when useful; avoid empty abstraction layers and one global barrel importing every renderer.
- Runtime/session stores, provider lookup, prefab expansion, clock, validation, dispatch and React subscriptions belong outside the nine type folders in `simulations/creation-and-editing/runtime-engine/`. Entity, world, runtime, factory and generator are not additional component kinds.

## Adding or sharing a component

Choose the folder by responsibility, name the component clearly, and declare the smallest supported input/output contract. Add its implementation once, then re-export it from every premade simulation that uses it. Update the full inventory and composition dependencies together.

For example, adding another experiment that draws SVG geometry should reuse `SVGWorldView`; adding a second kind of building should first try parameters on `Building` and `BuildingVisual3D`. Create a new implementation when its responsibilities or supported inputs differ, rather than copying code into a premade folder.

The target includes the three original demos and five mathematics experiments. Additional catalog entries should follow an actual implemented need; the full inventory documents the required scope and the existing capability limits.

## Runtime and verification

The shell activates one session after the assembly transition and disposes it on navigation. Views subscribe to snapshots; mounting another view never starts a clock. Bridge outputs update on validated input/topology changes. Projectile inputs relaunch analytic motion. Town ticks advance the clock, evaluate the routine, assign routes, follow paths, and publish a snapshot, in that order. Paused edits replan without moving citizens. Reset reconstructs citizen poses, routes, tasks, buildings, and the market from initial configuration.

Trait files include field units, edit timing, ranges, and ownership metadata. The small static catalog uses kind-qualified keys, so a `Building` trait and a `Building` prefab remain distinct. Staged validation checks models/renderers, providers and dependencies, input ranges, identities, references, supported actions, and writer conflicts. Pure models and recipes import no React or Three.js code. SVG definitions are scoped by view instance.

`pnpm test` runs the recipe sanity check. Use `pnpm build` and manually try the changed controls before the demo.

### Presentation ownership and cleanup verification

`views/RecipeLesson.tsx` assembles the lesson and preserves the existing runtime subscription and clock coordination. Its `views/recipe/` modules separately own recursive layouts, node selection, control bindings, display rendering, appearances, and canvas interaction. Shared contexts have one identity in `contexts.tsx`; renderers never import back through the lesson entry point. Snapshot adapters narrow known provider results before presentation; the runtime remains responsible for full validation and state updates.

`controls/RangeInput.tsx` supplies the controlled range event adapter used by both numeric control wrappers. `NumberField` keeps unfinished or rejected text local, while accepted input follows authoritative value changes. Explicit-submit forms retain their own draft/discard policy. Retained natural-system controls return the actual command result to their form. Compatibility entry points remain available.

Historical cleanup evidence remains in [implementation 018](../../../../../../docs/agent-only/implementation/018-SAFE-COMPONENT-CLEANUP-AND-AI-COMPATIBILITY.md).

### Spatial public recipes

`catalog/spatial.ts` and `composites/spatial.ts` expose projectile, truss, load/response, town building/market/routine/navigation, World presentation attachments, and authored Scheduled Trip clock contracts. Instances enter `creation-and-editing/runtime-engine/DocumentRuntime`; views receive snapshots and command callbacks. Model calculations remain in shared systems and pure runtime model owners. Public definitions declare configuration-reference paths so duplication never guesses which text contains an ID.

The old Projectile/Bridge/Town control exports, ThreeWorldView and PhysicalSystemsView are compatibility entry points backed by recipes. Their previous private control/lesson assembly is retired. Keep compatibility readers and prompt/session adapters until all saved/protocol consumers migrate. Do not use those adapters as dependencies of new public primitives.

Run `pnpm test` and `pnpm build`, then manually check the board for spatial changes.
