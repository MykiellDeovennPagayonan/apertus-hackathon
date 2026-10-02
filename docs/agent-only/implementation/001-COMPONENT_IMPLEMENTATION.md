# Simulation components: implementation plan and inventory

**Status:** Component extraction implemented, 2026-10-02. The library, import-only premade selections, and runtime infrastructure now exist. Model/regression verification, type checking, and lint pass. Production build and browser review remain limited by sandbox port restrictions and the installed Framer Motion/motion-dom export mismatch.

This plan implements the responsibilities in [Component Architecture](../../COMPONENT_ARCHITECTURE.md) and [Component Contracts](../COMPONENT_CONTRACTS.md). The [components README](../../../src/web/src/simulations/components/README.md) explains where code belongs. The contracts remain authoritative for execution, ownership, validation, and the nine component kinds.

## 1. Directory decision

All component implementations and definitions live in `src/web/src/simulations/components`, grouped by component type. This includes components currently used by only one simulation.

`src/web/src/simulations/pre-made` contains the three simulations' explicit imports/re-exports. It contains no component implementations, calculations, state stores, JSX wrappers, copied assets, or scenario configuration. Experiment definitions and initial configuration live in the main library's `compositions/` and `resources/` folders.

```text
src/web/src/simulations/
├── components/
│   ├── README.md
│   ├── resources/
│   ├── traits/
│   ├── behaviors/
│   ├── systems/
│   ├── visuals/
│   ├── views/
│   ├── controls/
│   ├── prefabs/
│   └── compositions/
├── pre-made/
│   ├── projectile/
│   │   ├── resources/index.ts
│   │   ├── traits/index.ts
│   │   ├── behaviors/index.ts
│   │   ├── systems/index.ts
│   │   ├── visuals/index.ts
│   │   ├── views/index.ts
│   │   ├── controls/index.ts
│   │   ├── prefabs/index.ts
│   │   ├── compositions/index.ts
│   │   └── index.ts
│   ├── bridge/                 # Same type folders; bridge selections
│   └── town/                   # Same type folders; town selections
└── runtime/                   # Infrastructure; not a component kind
```

Keep each type folder flat initially. A component with substantial private helpers may later have its own folder within its type. Colocate its CSS, tests, and helpers there. Do not add a second simulation/domain directory layer beneath every type.

The former implementations under `src/web/src/premade-simulations/` have moved into this structure. The source-to-target table below records their original locations. SVG visuals with JSX use `.tsx` adapters.

## 2. Inventory conventions and scope

Every row in sections 3–11 names a planned component file relative to `components/`. Usage abbreviations are **P** = projectile, **B** = bridge, **T** = town. Rows identify implementation units; related private helpers do not need separate registry entries. Files can initially export typed definitions and trusted functions without a dynamic registry.

This inventory covers current demo features and the ownership boundaries needed to preserve them during extraction. It includes shared primitives, domain-specific components, experiment composition, command bindings, measurements, and existing presentation details.

Projectile remains analytic ground-to-ground motion. Town remains scheduled planar navigation for 22 citizens with 3D presentation. Bridge remains a conceptual heuristic response model. General rigid-body physics, engineering analysis, purchases, wallets, production, information propagation, arbitrary scripting, saved execution checkpoints, and an editor are outside this implementation.

## 3. Resources: shared data and presets

| Planned file | Used by | Required content and source |
| --- | --- | --- |
| `resources/GravityPresets.ts` | P | Earth 9.81, Moon 1.62, Mars 3.71, Jupiter 24.79; units m/s², labels and stable IDs. Extract `projectile/resources/gravity.ts`. |
| `resources/ProjectileStyles.ts` | P | Primary/comparison colors, dashed comparison path, ball radius, trajectory and arrow styles. Extract scene appearance settings. |
| `resources/BridgeStyles.ts` | B | Low/medium/high response thresholds and colors, member widths, tension dash style, selected style, joint/load/support appearance, illustrative sag scale. Extract scene/member styling. |
| `resources/TownAppearance.ts` | T | Citizen palettes and role appearance, building variants, market stall colors, scenery styling, day/night display defaults. Preserve procedural geometry; no external mesh assets required. |
| `resources/TownLayout.ts` | T | Six homes, school, workshop, square, two market locations, street layout, world bounds, static scenery placements, obstacle footprints and display surface regions. Consolidate layout/navigation/rendering constants. |
| `resources/DailySchedule.ts` | T | Time bands, destination roles, normal market share and busy-market override settings used by the existing routine. Immutable defaults. |
| `resources/WalkingProfile.ts` | T | Base speed, seeded variation, navigation clearance radius, arrival tolerance and destination jitter settings. Name units as model units/second until a physical scale is defined. |

Resource data is immutable during a run. `TownLayout` supplies initial data; moving a market changes instantiated state, not the shared resource. Color literals used only inside one small visual may remain inline instead of becoming additional resources.

## 4. Traits: entity data and authoritative writers

Traits contain typed data and validation metadata, never simulation callbacks. Field contracts must distinguish initial configuration, current state, and output; state units, editable ranges, edit timing, and the owning writer.

| Planned file | Used by | Fields and ownership |
| --- | --- | --- |
| `traits/Transform2D.ts` | P, B, T | Planar position and heading/rotation, optional display scale. Composition declares plane axes and units. Ballistics owns projectile position; path following owns citizen position; validated construction/configuration owns static geometry. |
| `traits/VisualBinding.ts` | P, B, T | Visual IDs, compatible rendering target, resource references, instance appearance overrides. Read by presentation adapters. |
| `traits/LaunchSettings.ts` | P | Angle in degrees, initial speed in m/s, initial origin. Updated by validated input handlers with relaunch semantics. |
| `traits/BallisticMotion.ts` | P | Flight elapsed time, current velocity, flight status. Owned by ballistic motion; runtime coordinates launch/reset. Current position stays in `Transform2D`. |
| `traits/FlightMetrics.ts` | P | Range, maximum height and flight duration; outputs from ballistic equations. Gravity is system configuration, not a second writable result. |
| `traits/TrussSettings.ts` | B | Assembly span scale and panel/density choice, exposed part references and topology revision. Construction/rebuild handler owns these inputs and references. |
| `traits/MemberEndpoints.ts` | B | Two joint entity references, member kind and presence state. Validated topology/removal handler owns edits. |
| `traits/MemberResponse.ts` | B | Dimensionless response score and heuristic tension/compression classification, with model identity/fidelity metadata. Response system owns outputs. |
| `traits/BridgeLoad.ts` | B | Assembly reference, normalized position along span, load magnitude using the demo's tonne input convention. Validated handler owns inputs. This is not a stress value or a vehicle body. |
| `traits/Building.ts` | T | Building kind, label, dimensions and local entrance offset; position comes from `Transform2D`. Supports home, school, workshop, square and market references. |
| `traits/NavigationObstacle.ts` | T | Local footprint and clearance information for participating objects. Navigation derives world footprints from their transform. These are traversability definitions, not physics colliders. |
| `traits/NavigationAgent.ts` | T | Speed, clearance, destination reference/resolved target, route, progress and arrival status. Navigation owns destination/route assignment; path following owns progress/arrival fields. |
| `traits/Resident.ts` | T | Home, daytime destination, market and square references; student/worker role; deterministic seed. Initial data from prefab parameters. Do not preserve unused `goesToMarket` as a new active rule. |
| `traits/BehaviorBinding.ts` | T | Assigned behavior ID and instance parameters/resource references. Construction/configuration owns assignments. |
| `traits/BehaviorState.ts` | T | Current requested activity/task, last requested target and any wait/progress bookkeeping. Owned only by the behavior runner. |

One trait may contain fields with different writers only when field ownership is explicit and disjoint. In particular, navigation assigns a new route, and the runtime coordinates resetting its progress; path following must not independently replace routes.

Joint identity is the entity ID plus `Transform2D`; a second duplicate position trait is unnecessary. The world clock, active road configuration, market activity preference, camera, selected member, overlay visibility, and assembly animation progress are shared model/runtime or presentation state rather than per-entity traits.

## 5. Behaviors: declarative choices

| Planned file | Used by | Required recipe |
| --- | --- | --- |
| `behaviors/DailyRoutine.ts` | T | Read time, resident role/references and market preference; choose a target according to `DailySchedule`; request a supported `MoveTo` only when the intended task/target changes or a relevant revision invalidates it. |

Preserve the current decision priority: before 07:00 and from 20:00, go home; otherwise busy-market override attracts citizens with seed below 0.8; before 12:00 go to school/workshop; 12:00–13:00 choose market or square using the seed threshold; 13:00–17:00 return to school/workshop; otherwise go home. Keep deterministic target jitter consistent with the existing demo.

The recipe is data evaluated through a small trusted vocabulary. `desiredDest` is the extraction source, not permission to embed executable callbacks in the saved recipe. Neither projectile nor bridge needs a behavior. Their behavior selection folders can be empty modules (`export {}`).

## 6. Systems: model mechanics

| Planned file | Used by | Reads, writes, and trigger |
| --- | --- | --- |
| `systems/BallisticMotionSystem.ts` | P | Read launch settings, gravity and runtime delta; own flight time/status, position, velocity and metrics. Accept launch/relaunch through dispatch. Advance only with model time. Expose pure trajectory, velocity and range-versus-angle sampling helpers using the same equations. |
| `systems/HeuristicBridgeResponseSystem.ts` | B | Read joints/members, span, density, load and removal state; publish member scores/classifications and conceptual support-load shares. Recompute on input/topology change, not every render frame. Preserve existing response factors. |
| `systems/NavigationSystem.ts` | T | Accept `MoveTo`; read agent position, destination entrances, active road configuration, bounds and obstacles; assign routes or explicit no-route outcomes. Invalidate on road/market changes. Own route generation. |
| `systems/PathFollowingSystem.ts` | T | Read assigned routes, speed, navigation clearance and model delta; advance authoritative position, heading, progress and arrival. Check traversability through shared pure navigation helpers. Emit arrival with matching task identity. |
| `systems/BehaviorRunnerSystem.ts` | T | Evaluate allowed observations against declarative recipes; own behavior progress and issue supported requests through dispatch. It cannot write position or calculate routes. |

Keep the town's street preference and detour policy explicit in navigation inputs or a trusted provider helper. Extract grid search, segment clearance and waypoint simplification from existing functions. Do not claim the current street-specific algorithm is a universal navigation engine.

The bridge's support shares currently displayed as `load × position` and `load × (1 − position)` should come from model output. Label them as conceptual load shares using the input convention, not engineering reaction forces in new units. Visual sag remains a declared illustrative displacement in display units; it is not calculated structural deflection.

## 7. Visuals: object and model appearance

| Planned file | Used by | Required appearance and input contract |
| --- | --- | --- |
| `visuals/ShapeVisual2D.ts` | P, B | Shared SVG-compatible primitive descriptions; use a circle for the projectile and for joints with different bindings/styles. Include identity for picking and explicit world versus screen-sized dimensions. |
| `visuals/LauncherVisual.ts` | P | Launcher barrel, pivot and angle guide/label from launch settings. Display geometry only. |
| `visuals/TrajectoryVisual.ts` | P | Primary/comparison polylines from ballistic samples, range marker and maximum-height annotation from model outputs. |
| `visuals/VelocityArrowVisual.ts` | P | Arrows at sampled flight positions/velocities. Preserve direction-normalized display length; do not imply arrow length is proportional to speed. |
| `visuals/BeamVisual.ts` | B | Member endpoints, response color, tension dashes, selection highlight, identity and illustrative deformation from shared presentation helpers. No response calculation. |
| `visuals/LoadTruckVisual.ts` | B | Existing truck shape, load label and applied-load arrow from load data. No vehicle mechanics. |
| `visuals/BridgeSupportVisual.ts` | B | Support shapes, conceptual load-share arrows and labels from assembly geometry and response outputs. |
| `visuals/CitizenVisual3D.tsx` | T | Body, head, hair, legs, role backpack and palette variation; read authoritative planar pose and map it onto the display surface. |
| `visuals/BuildingVisual3D.tsx` | T | Configurable house/school/workshop variants, roofs, windows, signs and details. Read position/dimensions/appearance and presentation daylight state. |
| `visuals/MarketVisual3D.tsx` | T | Stalls, awnings, goods, label and busy appearance at the authoritative market location. |
| `visuals/RoadVisual3D.tsx` | T | Main road, side streets, paths, crossings and closure indicators from the same road configuration navigation consumes. |
| `visuals/TownSceneryVisual3D.tsx` | T | Ground/base, plaza, fountain, benches, trees and other existing decorative details; consume layout/presentation inputs. |

Private helpers such as a procedural box, window, tree, label, bridge sag mapping and town display-surface height remain next to their owning visual. They need not each become a registered component. Use one deformation helper for bridge members and joints so their displayed connections agree. Backend-specific React adapters are acceptable for 3D; Three object lifecycle stays in the renderer boundary.

Water/grid backgrounds belong to SVG view settings or private background renderers. Lights/sky belong to 3D view settings. Decorative meshes do not acquire model participation automatically: fountain and bench obstruction data comes explicitly from layout/obstacle inputs.

## 8. Views: surfaces, datasets, and experiment layout

| Planned file | Used by | Required presentation |
| --- | --- | --- |
| `views/SVGWorldView.tsx` | P, B | SVG surface, world-to-screen projection, bounds/autofit, drawing order, marker/gradient IDs, rendering descriptors and pick results. Preserve projectile Y-up to screen Y-down mapping and bridge's declared coordinate mapping. |
| `views/ThreeWorldView.tsx` | T | React Three Fiber Canvas, backend lifecycle, camera settings, lighting/sky/shadows and compatible visual adapters. Day/night rig reads runtime time and only changes presentation. |
| `views/XYGraphView.tsx` | P | Range versus launch-angle dataset, axes and current-angle marker. This is an XY parameter sweep, not a time-series graph. |
| `views/MetricsView.tsx` | P, T | Configured read-only values: projectile range/height/duration/gravity; town population/time/status where suitable. Formatting and labels only. |
| `views/MemberInspector.tsx` | B | Selected member identity/kind, heuristic classification, response level and model limitation text. Read existing model outputs. |
| `views/LegendView.tsx` | P, B | Primary/comparison labels and bridge color/dash meanings, driven by bindings/resources. Can render as an overlay in the spatial view. |
| `views/ExperimentView.tsx` | P, B, T | Arrange selected scene, graph, metrics/inspector and control panels according to composition layout. Own responsive layout and associated styles. |

Bridge assembly reveal is presentation state coordinated by `ExperimentView` and the SVG renderer: supports, deck, joints, other members, load, legend. Replaying the reveal must not incrementally create the authoritative model. Scope SVG definition IDs to each view instance to prevent collisions when reused.

The playground header, landing screen, prompt entry, loading transition and navigation remain application shell UI. The component drawer can inspect the resolved composition rather than repeat hardcoded claims.

## 9. Controls: user input and supported commands

| Planned file | Used by | Required bindings |
| --- | --- | --- |
| `controls/ParameterSlider.tsx` | P, B, T | Label/value/range/step binding to a typed writable parameter command; show validation feedback. |
| `controls/OptionSelect.tsx` | P | Choose gravity preset by stable resource ID. Reusable for future finite choices. |
| `controls/ActionButton.tsx` | P, B, T | Launch, reset, rebuild and other declared actions, with accepted/rejected feedback. |
| `controls/ToggleControl.tsx` | P, T | Presentation or model boolean binding, with destination declared. Supports vectors and appropriate town options without direct store writes. |
| `controls/PlaybackControls.tsx` | P, T | Pause/play and speed choices through runtime playback commands; projectile slow motion and town 1×/2×/4×. |
| `controls/SelectionControl.ts` | B | Convert member pick identity to presentation selection. Validate existence/presence before inspection. |
| `controls/OrbitCameraControl.tsx` | T | Existing orbit, zoom, damping and camera limits; edits camera state only. |
| `controls/ProjectileControls.tsx` | P | Assemble angle/speed/gravity, launch, playback, reset and comparison/vector bindings using primitives. Preserve all current actions, including those currently exposed only by prompt. |
| `controls/BridgeControls.tsx` | B | Load position/magnitude, span, density, remove-middle and rebuild bindings. Existing prompt-only operations can remain prompt-only in the first migration. |
| `controls/TownControls.tsx` | T | Time jump, playback speed, reset, road closure/reopening, market relocation and busy-market bindings. Preserve current badges and available actions. |
| `controls/PromptControl.ts` | P, B, T | Parse supported follow-ups into typed requests; dispatch through the same handlers as widgets and confirm only accepted outcomes. Keep the current deterministic matchers as trusted implementation helpers. |

The existing `CommandBar` can remain a shared UI widget hosting `PromptControl`. Keep per-simulation phrase/rule helpers under `controls/` alongside that adapter; `pre-made/` only re-exports them if needed. Regex matchers are trusted implementation code, not arbitrary executable resource content. Prompt routing to a simulation remains in the playground shell.

### Complete command coverage

| Simulation | Required commands/edits | Timing and owner |
| --- | --- | --- |
| P | Set angle 0–90°, speed 5–40 m/s, gravity preset | Validated model inputs; restart flight explicitly, matching current scene behavior. Reject nonfinite/unsupported values; current finite-flight equations require positive gravity. |
| P | Launch/replay, reset | Runtime coordinates ballistic initialization; reset restores composition defaults. |
| P | Compare angle, clear comparison | Runtime creates/removes the named comparison instance; comparison settings are derived from the primary speed/gravity with an independent angle. Relaunch consistently when comparison is set. |
| P | Play/pause, slow motion 0.25×/normal 1× | Runtime playback. |
| P | Show/hide velocity arrows | Presentation visibility only. |
| B | Move load left/center/right or slider position 0.05–0.95; load 2–30 t | Validated load-input handler; recompute response live. Preserve prompt choices such as 6 t and 22 t. |
| B | Normal/double span; denser truss (5/8 panels) | Staged geometry update/rebuild; revalidate references and recompute response. |
| B | Remove middle member | Resolve an actual member ID before mutation; update presence and recompute. Preserve the existing single-removal scope initially. |
| B | Select member | Presentation state; remove stale selection after removal/rebuild. |
| B | Rebuild/reset | Restore initial configuration and topology, clear removal/selection, restart presentation reveal. |
| T | Set time directly, morning 07:00, noon 12:00, night 20:00 | Runtime clock edit; normalize 24:00 to 00:00; reevaluate routine and routes. No position teleport. |
| T | Play/pause; 1×/2×/4× | Runtime playback; selecting speed starts playback as today. |
| T | Close/reopen main road | Validated shared navigation edit; invalidate affected routes, update road visuals. |
| T | Move market near school | Atomic building transform/entrance/obstacle update plus route invalidation; visual reads committed location. |
| T | Make market busy | Validated scenario preference edit; reevaluate routine and update appearance/badge. |
| T | Reset town | Restore time, speed, road/market settings AND citizen positions, routes and behavior state from the initial setup. |
| T | Orbit/zoom | Presentation camera only. |

An accepted time jump or navigation edit while paused can recalculate intentions/routes but must not advance citizen positions. Initial extraction need not expose manual citizen movement; if later exposed, define replacement/cancellation of the current routine task explicitly.

## 10. Prefabs: initial entities and connected assemblies

| Planned file | Used by | Initial result and dependencies |
| --- | --- | --- |
| `prefabs/Projectile.ts` | P | Entity with launch settings, transform, motion/metric outputs and visual bindings; requires ballistic provider. Used for primary and comparison instances. |
| `prefabs/Joint.ts` | B | Joint entity with initial transform and circle visual binding. |
| `prefabs/Member.ts` | B | Endpoint references, kind/presence, response output and beam binding; requires compatible bridge response provider. |
| `prefabs/BridgeLoad.ts` | B | Load entity attached to a named assembly, with magnitude, normalized placement and truck visual. |
| `prefabs/TrussAssembly.ts` | B | Expand trusted `buildTruss` helper into joints, members, assembly settings and load; resolve local references and expose named parts. Support shapes can derive from assembly endpoints without new physical support entities. |
| `prefabs/Citizen.ts` | T | Independent transform, resident, navigation, behavior assignment/state and visual binding; parameterize home, destination references, role, seed and speed. |
| `prefabs/Building.ts` | T | Configurable home/school/workshop/square entity; transform, dimensions/entrance/label and visual binding. Include obstacle participation only where intended; square stays walkable except explicit scenery obstacles. |
| `prefabs/Market.ts` | T | Market entity with transform, entrance, footprint and market visual binding. Can compose the base building recipe. |

Instantiation returns staged ordinary data and reference mappings. The runtime validates and commits it. IDs are namespaced per prefab instance, mutable arrays/objects are independent, and missing references or recursive prefab expansion fail before commit. `buildTruss`, seeded citizen initialization and local-to-world entrance conversion are helpers, not additional component kinds.

## 11. Compositions: complete experiment definitions

| Planned file | Used by | Complete experiment recipe |
| --- | --- | --- |
| `compositions/ProjectileExperiment.ts` | P | Planar metric world, ballistic provider with Earth gravity, primary projectile at 45° and 20 m/s, playback defaults, SVG scene, graph, metrics, legend, control/prompt bindings and layout. |
| `compositions/AngleComparisonExperiment.ts` | P | Same compatible components with primary and comparison projectile instances, shared speed/gravity bindings, separate angles and comparison styling. Also defines the setup used when comparison is enabled during the base experiment. |
| `compositions/BridgeExperiment.ts` | B | Truss assembly at normal span/5 panels with centered 10 t load, heuristic provider, SVG settings, inspector/legend, assembly reveal, controls and fidelity text. |
| `compositions/TownExperiment.ts` | T | Horizontal-plane world from town layout; instantiate buildings, market and 22 citizens; resolve resident references; select behavior/navigation/movement providers; configure 08:00 start, 1× playback, road/market defaults, 3D view, scenery, controls and layout. |

Compositions contain world/model configuration, instance IDs and overrides, references, system settings, measurements, view settings, controls and assumptions. They contain no live store objects, render handles, callback closures or embedded solver implementations. Control bindings reference known handlers. Exact rendering layout is interpreted by the trusted view implementation.

## 12. What each premade simulation selects

The following is the checklist for the import-only folders. Names refer to the inventory above; each kind's `index.ts` explicitly re-exports its chosen definitions/providers. Direct dependencies are resolved from the main library, not from another premade simulation.

| Type | Projectile | Bridge | Town |
| --- | --- | --- | --- |
| Resources | GravityPresets, ProjectileStyles | BridgeStyles | TownAppearance, TownLayout, DailySchedule, WalkingProfile |
| Traits | Transform2D, VisualBinding, LaunchSettings, BallisticMotion, FlightMetrics | Transform2D, VisualBinding, TrussSettings, MemberEndpoints, MemberResponse, BridgeLoad | Transform2D, VisualBinding, Building, NavigationObstacle, NavigationAgent, Resident, BehaviorBinding, BehaviorState |
| Behaviors | None | None | DailyRoutine |
| Systems | BallisticMotionSystem | HeuristicBridgeResponseSystem | BehaviorRunnerSystem, NavigationSystem, PathFollowingSystem |
| Visuals | ShapeVisual2D, LauncherVisual, TrajectoryVisual, VelocityArrowVisual | ShapeVisual2D, BeamVisual, LoadTruckVisual, BridgeSupportVisual | CitizenVisual3D, BuildingVisual3D, MarketVisual3D, RoadVisual3D, TownSceneryVisual3D |
| Views | ExperimentView, SVGWorldView, XYGraphView, MetricsView, LegendView | ExperimentView, SVGWorldView, MemberInspector, LegendView | ExperimentView, ThreeWorldView, MetricsView |
| Controls | ParameterSlider, OptionSelect, ActionButton, ToggleControl, PlaybackControls, ProjectileControls, PromptControl | ParameterSlider, ActionButton, SelectionControl, BridgeControls, PromptControl | ParameterSlider, ActionButton, ToggleControl, PlaybackControls, OrbitCameraControl, TownControls, PromptControl |
| Prefabs | Projectile | Joint, Member, BridgeLoad, TrussAssembly | Citizen, Building, Market |
| Compositions | ProjectileExperiment, AngleComparisonExperiment | BridgeExperiment | TownExperiment |

Example planned files:

```ts
// pre-made/projectile/views/index.ts
export { SVGWorldView } from "../../../components/views/SVGWorldView";
export { XYGraphView } from "../../../components/views/XYGraphView";
export { MetricsView } from "../../../components/views/MetricsView";
export { LegendView } from "../../../components/views/LegendView";
export { ExperimentView } from "../../../components/views/ExperimentView";

// pre-made/bridge/views/index.ts also selects the same SVG implementation.
export { SVGWorldView } from "../../../components/views/SVGWorldView";

// pre-made/projectile/compositions/index.ts
export { ProjectileExperiment } from "../../../components/compositions/ProjectileExperiment";
export { AngleComparisonExperiment } from "../../../components/compositions/AngleComparisonExperiment";

// pre-made/projectile/index.ts
export { ProjectileExperiment, AngleComparisonExperiment } from "./compositions";
```

Importing a barrel does not create a world or start a clock. Composition definitions are the authoritative dependency/configuration recipes; premade exports are human-readable selections. A validation check should detect disagreement between them. Prefer named exports and direct type-folder imports; avoid a root barrel that eagerly imports every renderer, including Three.js.

## 13. Infrastructure required outside the component folders

Use ordinary TypeScript functions and the existing state tooling where suitable. These responsibilities live in `simulations/runtime/`; they are not extra catalog types or code inside `pre-made/`.

| Responsibility | Minimum implementation |
| --- | --- |
| Definition/provider lookup | Static maps of known IDs/versions to definitions and trusted implementations. Distinguish unknown definitions, unavailable code and missing assets. |
| Validation/load | Resolve dependencies and rendering targets; check schemas, field ownership and action bindings; stage instances/references; commit only a valid complete world. |
| Prefab expansion | Assign unique IDs, clone mutable initial data, resolve local/external references and reject recursion. |
| World/session state | Entities, shared model configuration/data, enabled systems, initial setup and current snapshot. Keep presentation selection/camera/visibility separate from model outputs. |
| Command routing | Typed requests and accepted/rejected results; dispatch lifecycle, model/configuration and presentation operations to their owners. No generic public `set(Partial<World>)`. |
| Clock/stepping | One active model clock; pause/speed/reset; explicit call order and cleanup. A render callback may supply elapsed wall time through an adapter, but mounting a second view cannot start a second simulation stepper. |
| React adapter | Subscribe to snapshots and dispatch commands; keep React/Three imports out of pure model definitions/functions. Preserve lazy client loading for the town renderer. |
| Lifecycle | Load/switch/reset/dispose sessions; cancel timers/subscriptions; reset model state independently of view remounting. |

Projectile uses elapsed seconds. Town currently advances simulated hours by `clampedRealDelta × speed / 5` while walking advances by `walkingSpeed × clampedRealDelta × speed`. Preserve this conversion explicitly. The current town delta cap is 0.1 seconds. Bridge recomputes on changes and does not require a continuously ticking model.

For town, order operations explicitly: advance clock, evaluate behavior, resolve movement requests/replan invalidated routes, follow paths, publish observations, render. Time jumps reevaluate conditions directly so skipped clock hours do not silently lose activities. Arrival events must match the request they complete.

## 14. Source-to-target extraction map

Paths in the first column are relative to the current `src/web/src/premade-simulations/` directory unless marked otherwise.

| Current source | Target responsibilities |
| --- | --- |
| `projectile/state.ts` | Runtime session/configuration plus launch/playback command handlers; split stored inputs from presentation state. |
| `projectile/systems/ballistics.ts` | Pure helpers behind BallisticMotionSystem and its measurement sampling API. |
| `projectile/resources/gravity.ts` | GravityPresets. |
| `projectile/views/ProjectileScene.tsx` | Runtime flight time, ballistic outputs, projectile visuals, SVGWorldView and LegendView. |
| `projectile/views/ProjectileGraph.tsx` | Ballistic parameter-sweep dataset plus XYGraphView. |
| `projectile/controls/ProjectileControls.tsx` | ProjectileControls, shared input/playback components and MetricsView. |
| `bridge/state.ts` | Runtime configuration, lifecycle commands and separate presentation selection/reveal state. |
| `bridge/prefabs/buildTruss.ts` | Trusted assembly helper behind TrussAssembly; serializable initial geometry replaces persisted function closures. |
| `bridge/traits/structure.ts` | Joint transforms and MemberEndpoints, keeping IDs/references valid. |
| `bridge/systems/response.ts` | HeuristicBridgeResponseSystem. |
| `bridge/visuals/BridgeMember.tsx` | BeamVisual plus SVG renderer; remove authoritative response evaluation from rendering. |
| `bridge/views/BridgeScene.tsx` | Bridge composition/settings, SVGWorldView, support/load visuals, inspector, legend and presentation reveal. |
| `bridge/controls/BridgeControls.tsx` | BridgeControls and shared sliders/action buttons. |
| `town/state.ts` | Runtime clock/playback plus validated shared navigation/routine configuration. |
| `town/resources/layout.ts` | TownLayout and composition instance parameters. |
| `town/traits/building.ts`, `town/traits/citizen.ts` | Building/Resident/NavigationAgent and related trait definitions. |
| `town/systems/CitizenSystem.tsx` | Citizen instantiation, DailyRoutine, BehaviorRunnerSystem, NavigationSystem, PathFollowingSystem and CitizenVisual3D. |
| `town/systems/navigation.ts`, `town/systems/routing.ts` | Navigation provider/helpers; extract display-surface height to presentation helpers and pass layout inputs explicitly. |
| `town/visuals/TownEnvironment.tsx` | Building, market, road and scenery visuals; consolidate repeated geometry/layout inputs. |
| `town/views/TownScene3D.tsx` | ThreeWorldView, OrbitCameraControl and presentation-only day/night rig; move time advancement into runtime. |
| `town/controls/TownControls.tsx` | TownControls, PlaybackControls, MetricsView and full reset command. |
| All `controls/commands.ts` plus playground `parseFollowUp.ts` | PromptControl and trusted phrase helpers; parsing no longer mutates stores. |
| All simulation CSS | Colocate with owning controls, views or visuals; keep responsive demo layout with ExperimentView. |
| Playground shell and `assemblySteps.ts` | Load composition through runtime; preserve shell navigation/loading UI; derive component inspection from real resolved definitions. |

## 15. Implementation order and completion checks

1. **Bridge slice:** extract traits, staged assembly creation, load command validation, heuristic response outputs, BeamVisual and SVGWorldView. Preserve the current default bridge and load edits.
2. **Finish bridge presentation/actions:** truck, support shares, joints, inspector, legend, remove/rebuild/span/density and reveal. Clear stale references after topology changes.
3. **Projectile reuse:** reuse SVG/shape/control primitives, move elapsed time into runtime, keep analytic equations authoritative, implement datasets/metrics and comparison instances.
4. **Town model:** instantiate buildings/citizens outside rendering, move clock ownership, parameterize navigation inputs, separate routine evaluation and path following.
5. **Town presentation:** split current geometry into the listed visuals, preserve camera/scenery/lighting, and make market changes update model and display consistently.
6. **Premade selections and shell:** add import-only type folders, load library compositions, connect prompt/manual controls to shared handlers, update source references and retire the old directory once consumers have moved.

Verify behavior at each extraction boundary rather than writing tests for re-export syntax alone:

- Existing projectile equations and command transformations still match; graph, metrics, trajectory and velocity use the same model; comparison shares requested speed/gravity and keeps independent identity/state.
- Launch input changes, pause, slow motion, replay and reset have explicit consistent behavior; 0° and 90° inputs remain finite within supported positive-gravity settings.
- Bridge score/classification and conceptual load shares match intended existing calculations; load edits recompute without rebuilding entities; topology changes leave no dangling endpoints or stale selection.
- Two prefab instances produce distinct IDs and independent mutable state; invalid creation or invalid command leaves the prior valid world intact.
- Town retains 22 citizens with the same roles/seeds and schedule priority, routes avoid supported obstacles, road closure changes routing, and no-route outcomes are explicit rather than silently reported as successful travel.
- Relocating the market synchronizes its entrance, footprint, visual and affected routes; reset restores citizen positions/routes/behavior as well as clock/settings.
- Hiding/remounting views or changing camera/overlays does not alter model results or create extra clock owners; no mesh position is read back as authoritative simulation state.
- Existing procedural appearance, labels, scenery, responsive layouts, controls, prompt examples and assembly transitions remain covered by browser review.
- Resource/provider lookup, renderer compatibility, units/ranges, supported actions and ownership are validated before activation. SVG IDs and model/display transforms remain instance-safe.
- Run the existing verification script, type checking and lint, then a production build and browser checks for the changed surfaces. Report dependency/environment build failures separately from extraction failures.

The migration is complete when the three experiments are assembled from the main component library, all premade files are imports/re-exports, the supported feature checklist passes, and runtime infrastructure owns lifecycle/time/dispatch independently of rendering.
