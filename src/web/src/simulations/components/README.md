# Simulation components

This is the shared implementation home for all components used by the projectile, bridge, town, and five mathematics simulations. Components are organized by **type**. Each implementation lives here once, including components currently used by only one simulation.

**Status:** Premade lessons and both builder paths use this library. `components/catalog/` publishes data-only authoring definitions, `components/composites/` publishes expandable recipes, and `runtime/authoring/` owns version-3 document validation, scoped execution, remapping, and recipe expansion. `simulations/pre-made/` retains explicit selections and compatibility entry points while saved legacy documents continue to migrate through supported readers.

Read the [implementation plan and complete inventory](../../../../../docs/agent-only/implementation/001-COMPONENT_IMPLEMENTATION.md) for every component needed by the three simulations, its consumers, source code, command coverage, migration order and completion checks. [Component Architecture](../../../../../docs/COMPONENT_ARCHITECTURE.md) explains the concepts; [Component Contracts](../../../../../docs/agent-only/COMPONENT_CONTRACTS.md) defines their boundaries.

The [early mathematics plan and implementation notes](../../../../../docs/agent-only/implementation/002-EARLY_MATH_SIMULATIONS.md) cover Counting Circles, Addition and Subtraction, Equal Groups, Fraction Builder, and Fraction Number Line. Their board schemas and prefabs share focused `MathBoards.ts` modules; five pure systems own the mathematics, and SVG views render their snapshots. Math prompts use bounded local adapters while the three original demos retain their Apertus planner integration.

## Manual composition components

The original manual builder is the single authoring surface. Its 2D/3D setup, Connections graph, Build preview and focused settings dialogs edit canonical version-3 documents. Add component discovers public definitions and built-in or locally saved recipes, including JSON import. Composite insertion expands into ordinary nodes, connections, scopes, groups, resources and layout, displayed as expandable graph groups. Older saved scenes translate on opening; their original input is retained for recovery. The separate catalog editor has been removed.

Catalog definitions contain schemas and contracts only. Executable model providers live in `runtime/authoring/providers.ts`; React/SVG/Three presentation stays in views and visuals. `RecipeLesson` consumes runtime snapshots and never owns model stepping. Dataset resources participate in the same scoped runtime and remain read-only.

The manual builder uses canonical definitions registered with the existing runtime catalog. `contracts/` contains property/action/output and authoring schemas; `definitions/` contains the eight independently registered object kinds. `registry.ts` is pure and imports no rendering backends. Renderer providers are selected separately by `views/CompositionCanvas.tsx`.

| Responsibility | Canonical owner | Consumers |
| --- | --- | --- |
| Line/square definitions and editable schemas | `definitions/Line.ts`, `Square.ts` | Library, settings, graph, validation, runtime |
| Line geometry/intersection, square metrics | `systems/LineGeometrySystem.ts`, `LineIntersectionSystem.ts`, `SquareGeometrySystem.ts` | Endpoint composition; slope/intercept recipe adapter |
| Gas and independent fractions | `definitions/GasContainer.ts`, `FractionBar.ts`; existing gas/fraction systems | Builder canvases and premade boards/sessions |
| Shared line appearance | `visuals/LineVisual.tsx` | Cartesian view and recipe line graph |
| Authored and premade town routing | `systems/RouteSearchSystem.ts`, `RouteFollowingSystem.ts` | Authored bounds/diagonal policy and premade street/cardinal policy |
| Departure contract and execution | `behaviors/ScheduledTrip.ts`, `systems/ScheduledTripSystem.ts` | Authored person schedules and compiled workspace trips |
| Town appearance | Existing `BuildingVisual3D.tsx`, `RoadVisual3D.tsx`, `CitizenVisual3D.tsx`; `GroundVisual3D.tsx` | Explicit authored/premade appearance profiles |
| Canvas rendering | `views/CartesianView.tsx`, `DisplayView.tsx`, `AuthoredTownView.tsx` | Author preview and learner lesson |
| Learner commands | `controls/BoundControl.tsx` and slider/number/toggle/action primitives | Supplied per-canvas command interface |

Shared execution never imports `builder/`. `runtime/composition/` owns validation/projection/staging and per-canvas lifecycle; `lessons/` owns formatting and assembly. Builder capture, settings portals, document compatibility, history, and persistence stay under `builder/`. Fraction controls/scenes and drag handles receive command interfaces; their premade view owners provide session adapters.

`pnpm test:architecture` enforces these boundaries and checks pre-refactor document migrations, town paths/timelines, independent construction, and cross-adapter geometry. `pnpm test:public-catalog` checks all built-in recipes, exposed parameters, external bindings, resource runtime behavior, independent copies, atomic batches, migration, remapping, capture, and storage failures. Both are included in `pnpm test`; `pnpm test:public-catalog:browser` covers the catalog workflow in a real browser.

## Directory structure

```text
simulations/
├── components/                 # All implementations and definitions
│   ├── README.md
│   ├── contracts/
│   ├── definitions/
│   ├── registry.ts
│   ├── resources/
│   ├── traits/
│   ├── behaviors/
│   ├── systems/
│   ├── visuals/
│   ├── views/
│   ├── controls/
│   ├── prefabs/
│   └── compositions/
├── pre-made/                   # Explicit imports/re-exports only
│   ├── projectile/
│   ├── bridge/
│   └── town/
└── runtime/                    # Loading, validation, state, time, dispatch
```

Each premade simulation repeats the nine type folders so it is easy to inspect its selections. Its type folders contain `index.ts` files that re-export selected library components. Its root `index.ts` exposes the experiment composition. Categories with no selections can use `export {}`; projectile and bridge need no behavior recipes.

## What each component folder is for

### `resources/`: reusable data and assets

Put immutable definitions, presets, palettes, layouts and asset references here. Examples include `GravityPresets.ts`, `BridgeStyles.ts`, `TownLayout.ts`, `TownAppearance.ts`, `DailySchedule.ts` and `WalkingProfile.ts`.

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

**Convention update (2026-10-06):** [Implementation 013](../../../../../docs/agent-only/implementation/013-PREMADE-JSON-RECIPE-CONVENTION.md) defines the approved target: every premade has only `pre-made/<slug>/recipe.json`, consumed through one generic registry and loader. The composition/re-export examples below describe legacy code awaiting migration; they are not instructions for new premades.

Put full experiment definitions here: `ProjectileExperiment.ts`, `AngleComparisonExperiment.ts`, `BridgeExperiment.ts` and `TownExperiment.ts`.

A composition selects world/model settings, systems, prefab instances and overrides, references, views, controls, measurements and assumptions. This is where the initial 22 citizens, 10 t bridge load, or 45° projectile setup is assembled from library definitions.

Legacy compositions live in the main library and are re-exported by `pre-made/<simulation>/compositions/index.ts` until migration removes those trees. Authored premade JSON belongs at exactly `pre-made/<slug>/recipe.json`, with no other directory contents. Gas Pressure's current `gas-pressure.recipe.json` is an intermediate extraction that still needs the standard filename and generic loading path. Shared component implementations, loading, and validation stay outside the premade directory; the experiment runtime and builder consume the same recipe.

## How premade simulations use the library

These named exports are implemented:

```ts
// simulations/pre-made/projectile/views/index.ts
export { SVGWorldView } from "../../../components/views/SVGWorldView";
export { XYGraphView } from "../../../components/views/XYGraphView";

// simulations/pre-made/bridge/views/index.ts
export { SVGWorldView } from "../../../components/views/SVGWorldView";

// simulations/pre-made/town/systems/index.ts
export { NavigationSystem } from "../../../components/systems/NavigationSystem";
export { PathFollowingSystem } from "../../../components/systems/PathFollowingSystem";
export { BehaviorRunnerSystem } from "../../../components/systems/BehaviorRunnerSystem";

// simulations/pre-made/bridge/compositions/index.ts
export { BridgeExperiment } from "../../../components/compositions/BridgeExperiment";

// simulations/pre-made/bridge/index.ts
export { BridgeExperiment } from "./compositions";
```

These exports make component selection easy to browse. The composition is the authoritative recipe that runtime resolves and loads. Imports themselves must not instantiate entities or start simulation time.

## Dependency and ownership rules

- Target boundary: only `runtime/recipes/premadeRegistry.generated.ts` directly imports premade JSON in production. Components, resource defaults, planner code, routes, and builder code consume shared APIs or supplied configuration. Existing direct imports and re-export trees are migration debt tracked by implementation 013.
- Keep definitions and model functions independent of React and rendering backends. Use `.tsx` for actual React presentation/control code and `.ts` for data/model contracts.
- Compositions/prefabs hold data and known provider references. Executable providers are trusted implementations; arbitrary executable content does not belong in resources or recipes.
- Each mutable field has one normal execution owner. Construction, validated configuration edits and reset are coordinated lifecycle exceptions.
- A model result must remain the same when a visual is hidden or the camera changes. A second view must not create a second simulation clock.
- Shared definitions do not imply shared mutable entity state. Two prefab instances receive different IDs and independent state.
- Keep helpers, CSS and focused tests beside the owning implementation. Add a component-specific subfolder only when useful; avoid empty abstraction layers and one global barrel importing every renderer.
- Runtime/session stores, provider lookup, prefab expansion, clock, validation, dispatch and React subscriptions belong outside the nine type folders in `simulations/runtime/`. Entity, world, runtime, factory and generator are not additional component kinds.

## Adding or sharing a component

Choose the folder by responsibility, name the component clearly, and declare the smallest supported input/output contract. Add its implementation once, then re-export it from every premade simulation that uses it. Update the full inventory and composition dependencies together.

For example, adding another experiment that draws SVG geometry should reuse `SVGWorldView`; adding a second kind of building should first try parameters on `Building` and `BuildingVisual3D`. Create a new implementation when its responsibilities or supported inputs differ, rather than copying code into a premade folder.

The target includes the three original demos and five mathematics experiments. Additional catalog entries should follow an actual implemented need; the full inventory documents the required scope and the existing capability limits.

## Runtime and verification

The shell activates one session after the assembly transition and disposes it on navigation. Views subscribe to snapshots; mounting another view never starts a clock. Bridge outputs update on validated input/topology changes. Projectile inputs relaunch analytic motion. Town ticks advance the clock, evaluate the routine, assign routes, follow paths, and publish a snapshot, in that order. Paused edits replan without moving citizens. Reset reconstructs citizen poses, routes, tasks, buildings, and the market from initial configuration.

Trait files include field units, edit timing, ranges, and ownership metadata. The small static catalog uses kind-qualified keys, so a `Building` trait and a `Building` prefab remain distinct. Staged validation checks models/renderers, providers and dependencies, input ranges, identities, references, supported actions, and writer conflicts. Pure models and recipes import no React or Three.js code. SVG definitions are scoped by view instance.

`pnpm test` verifies the preserved formulas/prompts plus prefab independence, invalid commands, topology references, paused edits, synchronized market relocation, full reset, arrival task identity, clock cancellation, canonical recipes, and version-3 migration. `pnpm exec tsc --noEmit` and scoped Biome checks verify the changed app source. Browser acceptance runs against a local server, and `next build --webpack` provides the production-build check when the default Turbopack build stalls in the local environment.

### Presentation ownership and cleanup verification

`views/RecipeLesson.tsx` assembles the lesson and preserves the existing runtime subscription and clock coordination. Its `views/recipe/` modules separately own recursive layouts, node selection, control bindings, display rendering, appearances, and canvas interaction. Shared contexts have one identity in `contexts.tsx`; renderers never import back through the lesson entry point. Snapshot adapters narrow known provider results before presentation; the runtime remains responsible for full validation and state updates.

`controls/RangeInput.tsx` supplies the controlled range event adapter used by both numeric control wrappers. `NumberField` keeps unfinished or rejected text local, while accepted input follows authoritative value changes. Explicit-submit forms retain their own draft/discard policy. Retained natural-system controls return the actual command result to their form. Compatibility entry points remain available.

`pnpm test:components:cleanup` compares public contracts, AI cards/buckets, and all 41 built-in recipes' initial markup against the pre-cleanup baseline. It also verifies command rejection and snapshot discriminants; it runs inside `pnpm test`. `pnpm test:components:cleanup:browser` exercises real React numeric controls without adding a production test route. See [implementation 018 and its evidence](../../../../../docs/agent-only/implementation/018-SAFE-COMPONENT-CLEANUP-AND-AI-COMPATIBILITY.md) for completed changes and remaining verification limits.

### Spatial public recipes

`catalog/spatial.ts` and `composites/spatial.ts` expose projectile, truss, load/response, town building/market/routine/navigation, World presentation attachments, and authored Scheduled Trip clock contracts. Instances enter `runtime/authoring/DocumentRuntime`; views receive snapshots and command callbacks. Model calculations remain in shared systems and pure runtime model owners. Public definitions declare configuration-reference paths so duplication never guesses which text contains an ID.

The old Projectile/Bridge/Town control exports, ThreeWorldView and PhysicalSystemsView are compatibility entry points backed by recipes. Their previous private control/lesson assembly is retired. Keep compatibility readers and prompt/session adapters until all saved/protocol consumers migrate. Do not use those adapters as dependencies of new public primitives.

Run `npm test`, `npm run test:spatial-catalog:browser`, TypeScript and a production build for spatial changes. Refresh `docs/agent-only/implementation/009-SOURCE-LEDGER.json` with `node scripts/builder/audit-public-catalog.cjs`; it includes new files as well as the original inventory.
