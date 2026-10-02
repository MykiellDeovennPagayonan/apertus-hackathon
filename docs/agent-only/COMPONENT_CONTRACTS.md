# Apertus Playground: Component Contracts

**Decision date:** 2026-10-02  
**Status:** Target architecture agreed through design discussion; not a statement that the repository already implements it.  
**Audience:** Agents and implementers extracting reusable pieces from the current demos.

## 1. Authority, scope, and implementation restraint

The human explanation is [Component Architecture](../COMPONENT_ARCHITECTURE.md). This document provides the corresponding implementation boundaries. They describe the same nine types and should remain consistent.

For these type names, scopes, and interactions, these two documents supersede conflicting terminology in [the earlier architecture catalog](COMPONENT_ARCHITECTURE.md). That catalog remains a domain roadmap. [OVERVIEW.md](OVERVIEW.md) remains the product vision; its broad component lists do not authorize implementing all domains now.

This document establishes responsibilities, not a requirement to build a universal framework. Interfaces and examples below are illustrative contracts, not drop-in production schemas or mandated library choices. Do not introduce an ECS library, dynamic plugin framework, general scheduler, multiworld editor, or arbitrary scripting engine solely to implement this terminology.

Preserve the working projectile, town, and bridge demos while extracting useful boundaries incrementally. Do not represent proposed component names as already implemented exports.

## 2. Canonical taxonomy

"Component" is the umbrella term for the reusable building blocks. There is no registry entry whose kind is simply `component`.

| Kind | Role | Owns executable simulation mechanics? | Output |
|---|---|---|---|
| `resource` | Reusable asset or definition | No | Validated definition or loaded asset |
| `trait` | Per-entity configuration/state schema | No | Typed entity fields |
| `behavior` | Declarative activity and decision recipe | No; evaluated by a trusted runner | Supported action requests, via runner |
| `system` | Shared computational mechanism | Yes | Owned state updates, results, events |
| `visual` | Entity/model-to-appearance mapping | No; presentation code only | Compatible drawing description |
| `view` | Rendering surface or dataset presentation | No; presentation code only | Display and interaction coordinates |
| `control` | User-input-to-command binding | No | Commands or presentation edits |
| `prefab` | Entity/assembly creation recipe | No | Initial entities when instantiated |
| `composition` | Complete experiment recipe using prefabs | No | Configured simulation when loaded |

These boundaries distinguish computational responsibility, not whether a function contains arithmetic. A visual may calculate polygon corners, and a behavior expression may compare scores. Neither therefore becomes a physical solver.

### 2.1 Infrastructure and instance concepts

| Concept | Meaning | Not another catalog kind |
|---|---|---|
| Entity | Identifiable runtime instance holding traits | `citizen_12`, `beam_7` |
| World | Running context containing entities, shared model data, and enabled systems | Initial implementation can have one world |
| Runtime | Loading, validation, instantiation, scheduling, dispatch, lifecycle | Shared application infrastructure |
| Factory/instantiator | Runtime helper that expands a prefab | Returns initial data; runtime commits it |
| Generator | Trusted procedural creation helper when needed | E.g. current truss-layout function |
| Connection | Typed relation, reference, binding, or event subscription | Validated records, not a universal executable link |
| World template | Reusable world configuration within authoring | Do not create a separate MVP registry kind |
| Visual preset | Resource containing a visual ID and display defaults | Not a second kind of prefab |

### 2.2 Terminology migration

| Earlier term/use | Canonical treatment |
|---|---|
| Component meaning only entity data | **Trait** |
| Factory as author-facing type | Runtime instantiation helper |
| Composition covering prefab and scenario interchangeably | **Prefab** for object/assembly; **Composition** for experiment |
| View meaning object appearance and render surface | **Visual** for appearance; **View** for surface/presentation |
| Generic World3D implying 3D physics | Separate model coordinates, enabled systems, and 3D view |
| Environment meaning every global setting | Explicit world, physics, navigation, and presentation settings |
| TownSystem performing everything | Demo-level orchestration may remain during extraction; reusable mechanisms have narrower contracts |
| Behavior as arbitrary code mutating world state | Declarative recipe evaluated through supported operations |

## 3. Assembly and execution model

```text
AUTHORING

  Resources -----> Prefab definitions <----- Behavior definitions
                          |
              instance IDs and overrides
                          v
                    Composition
       [world settings, systems, instances, connections,
                    views, controls]
                          |
                   Runtime validates
                          |
                 Instantiator expands
                          |
                   Runtime commits
                          v
EXECUTION

  World -> Entity -> Traits <----------> Systems
                       |                  ^
                       | read             | actions/results
                       v                  v
                     Visuals        Behavior runner
                       |
                drawing descriptions
                       v
                     Views
```

Only implemented, trusted providers execute systems, behavior operations, visual adapters, view renderers, and control handlers. A declarative entry named `SomeSolver` does not supply an implementation.

A composition must resolve to known implementations and compatible data before activation. Initial component retrieval can use simple catalog lookup; a sophisticated retrieval engine is not a prerequisite for the contracts.

## 4. Common definition contract

Separate a registered definition from its runtime instances. A trait definition declares fields; an entity contains a trait instance. A prefab definition is a recipe; instantiated entities have their own IDs and state.

Conceptual base metadata:

```ts
type ComponentKind =
  | "resource" | "trait" | "behavior" | "system"
  | "visual" | "view" | "control" | "prefab" | "composition";

type DefinitionRef = {
  id: string;
  version: string;
};

type DefinitionMetadata = {
  id: string;
  version: string;
  kind: ComponentKind;
  name: string;
  description: string;
};
```

Each kind adds its own schema. Do not force every kind to expose physics ports, frame callbacks, or actions. Versions can be simple explicit identifiers initially; automatic migration and dependency solving are future work.

At minimum, make the following inspectable where applicable:

- Parameters, defaults, valid ranges, and units.
- Referenced definitions and required runtime providers.
- Supported model spaces or rendering targets.
- Public outputs, actions, and events.
- Assumptions and fidelity limitations.

Naming does not substitute for validation. A string tag such as `movable` is insufficient if the action's required fields or handler are missing.

## 5. Resource contract

### 5.1 Purpose and contents

A resource contains reusable data or an asset. Examples include an SVG file, mesh, texture, style palette, physical material definition, gravity preset, or schedule definition.

```text
resolveResource(id, version)
  -> validated data or loaded asset handle
```

A resource is not an independently ticking object, a renderer, a factory, or arbitrary executable community content.

### 5.2 Sharing and mutation

Treat shared definitions as immutable inputs during an ordinary run. Store per-instance changing values in traits or explicit behavior execution state.

```text
Shared walking profile: default speed and arrival tolerance
Citizen A traits: current route, position, destination
Citizen B traits: independent route, position, destination
```

Changing an instance override and changing a shared resource are distinct commands. Do not mutate all consumers accidentally through a shared JavaScript object reference. Resource editing can create a revised definition; its application to a running composition must be explicit.

### 5.3 Optional extraction

Not every literal needs a separately registered resource. A circle radius or color can remain inline when independent sharing has no value. An inline collision-shape definition and a reference to a shared shape resource are both valid design options.

### 5.4 Resource versus prefab versus visual

| Object | Kind |
|---|---|
| `house.svg` file | Resource |
| Code that places that asset using entity state | Visual |
| Recipe creating a house entity with traits and visual binding | Prefab |
| Preset selecting an asset visual plus style defaults | Resource |

## 6. Trait contract

### 6.1 Purpose

A trait is typed data attached to an entity. Traits contain configuration, runtime state, or outputs; they do not contain hidden callbacks.

```ts
type EntityRecord = {
  id: string;
  name?: string;
  traits: Record<string, unknown>; // resolved against registered trait schemas
};
```

This sketch does not prescribe untyped access throughout the implementation. Actual providers should use typed trait interfaces and validate serialized input.

Examples:

| Trait | Configuration | State/output |
|---|---|---|
| LaunchSettings | Initial angle and speed | None required |
| Transform2D | Initial pose in saved setup | Current authoritative pose |
| Body2D | Body mode, mass, supported gravity scale | Velocity and engine-exposed state |
| Collider2D | Shape, local offset, layers/masks | No detector implementation |
| NavigationAgent | Speed, arrival tolerance | Destination, route, route progress |
| Resident | Home, role, daytime destination references | Supported activity state |
| MemberEndpoints | Joint references | None required |
| MemberResponse | Model/result metadata | Score or solver outputs |
| VisualBinding | Visual ID, resources, per-instance display settings | No model evolution |

### 6.2 Field rules

For a public field, define:

```text
type
role: configuration | state | output
units, if relevant
default/range, where meaningful
edit timing: initial only | paused | live | rebuild required
authoritative writer for changing fields
```

A field that describes a quantity should not be ambiguously both an initial condition and its current value. Initial position and current position can share a conceptual schema but must have explicit reset semantics.

### 6.3 Ownership

Each authoritative mutable field has one writer during normal execution. Initial construction and validated lifecycle/reset operations are explicit exceptions coordinated by the runtime.

| State | Example owner |
|---|---|
| Analytic projectile pose | Ballistic motion system |
| Physics body pose | Physics integration system |
| Direct navigation movement pose | Path-following system |
| Agent route | Navigation system |
| Behavior sequence progress | Behavior runner |
| Structural response output | Selected structural/response model |

If an engine keeps an internal pose, document synchronization into the public transform as part of that same owner's implementation. Do not create a second independent source of truth.

## 7. System contract

### 7.1 Purpose

A system implements reusable mechanics over compatible data. Reusability is defined by the input contract, not by supporting all entities or all domains.

```text
System definition
  required traits and shared resources
  supported model space
  configuration schema
  read fields
  owned write fields
  accepted actions
  outputs and events
  execution trigger
```

Possible implementation methods are illustrative:

```text
initialize(context)
handleAction(action, context) -> result
advance(simulationDelta, context)
recompute(changedInputs, context)
dispose()
```

A provider only implements the methods its model needs. Do not force a solve-on-change bridge model to tick continuously.

### 7.2 Boundaries and examples

- Physics handles supported bodies, shapes, forces, and constraints. It does not choose which shop a citizen visits.
- Navigation computes routes. It does not assume all agents are citizens or automatically render them.
- Path following advances supported movement along a route. It does not independently control a body whose position is owned by physics.
- Transactions validate and commit their related state changes together. Rendering a purchase is separate.
- A behavior runner is a system that interprets recipes. Recipes themselves remain behavior definitions.
- Runtime instantiation, command dispatch, and lifecycle are infrastructure; do not put all of them in a domain system.

### 7.3 Execution and ordering

The initial implementation can use explicit call ordering. State the order where it affects results. For example, a town step can evaluate due activities, compute requested routes, advance movement, then publish observations for display.

Model time must be explicit. Rendering frequency should not silently redefine simulation rules. No requirement exists to build a generic scheduler before extracting the current functions.

Running a fixed-step engine does not by itself prove exact reproducibility across platforms or versions. Make only the reproducibility claims supported by the implementation.

## 8. Behavior contract

### 8.1 Definition versus execution

A behavior is a declarative recipe. The runner supplies executable interpretation. The recipe can contain supported conditions, expressions, choices, waits, and action sequences.

```text
Inputs:
  allowed observations
  configured rule parameters
  current behavior execution state

Evaluation result:
  supported action requests
  updated behavior execution state
```

The runner owns the execution state. A behavior cannot directly write another system's state.

### 8.2 Example

```text
DailyRoutine
  at configured morning time:
    request MoveTo(daytimeDestination)
  wait for matching arrival:
    advance activity state through a supported operation
  at configured return time:
    request MoveTo(home)
```

The behavior does not implement route search, collision checks, or position integration. Comparisons/scoring may use a bounded expression vocabulary; arbitrary scripts are not needed for the MVP.

### 8.3 Actions and results

An action contract should identify:

```text
action name
target and required capabilities/data
argument schema and units
preconditions
result or completion event
responsible handler
```

Example: `MoveTo(entityId, destinationId)` requires a supported navigation/movement provider. A physics-driven body cannot be treated as a directly movable navigation actor without an adapter that defines how movement requests reach physics.

Define how manual interventions affect activities. For the first town integration, a documented rule such as replacing the current travel task is enough; do not silently leave two competing movement requests active.

## 9. Visual contract

### 9.1 Responsibility

A visual is a trusted presentation adapter that reads model data and appearance resources and returns a drawing description for supported targets.

```text
buildVisual(readOnlyInputs, resources, presentationContext)
  -> drawing description
```

Declare:

- Required trait fields or measurement inputs.
- Appearance parameters and resource types.
- Supported view/backend targets.
- Coordinate space of output geometry.
- Entity/part identity used for picking.

### 9.2 Beam example

```text
Inputs
  member endpoint references
  endpoint positions
  model response score
  display width and color scale

Output
  line/path/polygon description
  style
  beam entity ID for picking
```

An illustrative descriptor:

```ts
type LineDrawing = {
  kind: "line";
  entityId: string;
  from: [number, number];
  to: [number, number];
  coordinateSpace: "world";
  stroke: string;
  displayWidth: number;
};
```

This is not a mandate to invent a universal graphics language. A small backend-specific descriptor or equivalent renderer adapter is sufficient. Define whether widths are world-scaled or screen-scaled, and avoid applying the entity transform twice.

### 9.3 Resource and backend handling

`SvgAssetVisual` references an SVG resource and places/styles it from instance data. `MeshAssetVisual` references a mesh resource. `ShapeVisual2D` can generate primitive geometry without an external asset.

Reuse these generic implementations before creating one visual implementation per asset. A `house.svg` and a `school.svg` can use the same SVG asset visual.

An SVG visual is not automatically compatible with Canvas or a 3D renderer. Validate supported targets. A 2D model can have a 3D visual only when the mapping is implemented explicitly.

### 9.4 Prohibited responsibilities

A visual must not:

- Update authoritative position, balances, loads, or other model state.
- Implement an independent physical result that disagrees with the model system.
- Advance simulation time based on drawing frequency.
- Instantiate or delete live entities as a side effect of rendering.

Presentation-only animation, interpolation, and geometry calculations are allowed. They must not feed back into authoritative model state implicitly.

## 10. View contract

### 10.1 Responsibility

A view hosts presentation on a rendering surface or displays a dataset. For a spatial view, it owns the camera/projection, pan/zoom, world-to-screen mapping, drawing order, and backend object lifecycle.

```text
Read-only world/dataset + visual bindings + presentation settings
  -> display
```

`SVGWorldView` creates/updates actual SVG elements from supported visual output. A 3D view creates/updates the corresponding render objects. Do not scatter backend element lifecycle through model systems.

Graph and table views can consume measurement/dataset outputs directly. An entity visual is not mandatory for every chart point or table cell.

### 10.2 Input boundary

A spatial view may perform picking and coordinate conversion, returning information such as:

```text
entityId
partId, if applicable
screen position
world position, where conversion is defined
```

A control interprets the interaction and submits a command. This separation is conceptual: a React component may implement both interfaces without requiring two DOM subtrees.

### 10.3 Presentation state

Camera pose, selection, visible overlays, and display scale are presentation state. Changing them must not alter computed model results.

Dragging a camera is a presentation edit. Dragging a structural load changes model input and must use a validated command. Identical pointer gestures can therefore have different command targets.

## 11. Control contract

```text
User input + binding + current displayable value
  -> typed command or presentation edit
```

Controls may perform input-format and range checks for feedback. The runtime/owning handler remains authoritative about model validity.

| Command category | Destination |
|---|---|
| Create, remove, duplicate, reset | Runtime lifecycle handler |
| Set supported model input | Runtime dispatch to validated configuration/owner handler |
| Move, launch, purchase, other action | Runtime dispatch to compatible system handler |
| Camera, selection, overlay visibility | Presentation state/view settings |

Natural-language edits and manual controls should converge on the same supported command handlers. Apertus plans or requests a change; it does not mutate arbitrary runtime objects.

A control may read state to display the current value and receive success/error feedback. It must not call the instantiator directly or write live model state directly.

## 12. Prefab contract

### 12.1 Definition

A prefab defines a reusable object or connected assembly. It may include:

- Exposed parameters and defaults.
- Local entity templates with initial trait values.
- Nested prefab references.
- Resource references.
- Behavior assignments and parameters.
- Visual bindings.
- Internal references and exposed entity/part names.
- Required systems/capabilities, without configuring the whole application.

```text
Prefab + parameter overrides + assigned instance identity
  -> initial entities and reference mappings
```

### 12.2 Instantiation

The instantiator builds initial data without mutating the live world. The runtime validates and commits the result. A failed creation request should not leave half an assembly inserted.

Local references are resolved into actual entity IDs. Two bridge instances must not both register a globally identical `joint_1` ID. Named local parts allow a control or external reference to target an exposed load or entrance without depending on an incidental array index.

Nested prefab expansion must reject unresolved references and recursive cycles.

### 12.3 Scope limits

A citizen prefab must not install a town-wide clock or a global renderer. It declares dependencies; the enclosing composition supplies compatible systems and views.

A prefab may provide visual bindings for its objects. That is different from owning an application viewport or control panel.

Initially expand prefabs into ordinary entity data. Live inheritance from edited prefab definitions is not required. Preserve origin metadata and instance overrides where needed for inspection and reconstruction.

Procedural generation can call trusted helpers, such as the existing truss-layout function. The helper returns data; it is not executable user content embedded in the prefab.

## 13. Composition contract

### 13.1 Definition

A composition describes the complete experiment. Prefabs are its inputs; it does not collapse into the same public type as a prefab.

It selects:

```text
world/model configuration
system instances and settings
prefab instances and overrides
cross-instance references/connections
behavior overrides, where allowed
resource bindings
views and visual bindings
controls and command bindings
measurements and assumptions
```

A world setup preset can be referenced configuration inside this definition. Do not add another framework just to support the phrase "world template."

### 13.2 Load sequence

```text
1. Resolve composition references and versions.
2. Validate provider availability and model/view compatibility.
3. Expand prefabs into initial data in a staging context.
4. Resolve internal and external IDs.
5. Validate references, field ranges, action bindings, and ownership.
6. Commit the world and initialize its systems.
7. Bind views and controls.
8. Start or remain paused according to the composition settings.
```

This can be synchronous and small for the MVP. It does not require a transactional database or service bus.

Missing systems must be reported before running. Do not silently enable new physical behavior because a vaguely related trait name appears.

## 14. World and environment contracts

### 14.1 Separate dimensions of configuration

| Concern | Examples |
|---|---|
| Model space | Plane, volume, graph, nonspatial |
| Shared model data | Boundaries, roads, obstacle geometry, fields |
| Enabled mechanisms | Ballistic motion, physics, navigation, response solver |
| Mechanism settings | Gravity, numerical step, movement rules |
| Presentation | SVG/Canvas/3D backend, camera, lighting, background |

Do not interpret `3D` as automatic physics participation. A model on a horizontal plane can be drawn in a 3D view through an explicit coordinate mapping.

Do not use `environment` as a synonym for a renderer, world, physics engine, and scene template simultaneously. Prefer explicit fields and labels. In Godot, `WorldEnvironment` specifically concerns visual environment settings; it is not our universal simulation configuration.

### 14.2 Gravity

- Uniform gravity belongs to the configuration of the system that consumes it.
- Zero gravity is normally a zero vector/value in that model's configuration.
- A supported per-body gravity multiplier belongs in body configuration.
- Independently positioned gravity sources require source data plus an implemented source/force model; they are future functionality unless explicitly built.

Setting a gravity value does not make every entity fall. Only participating mechanisms use it.

### 14.3 Collision and movement

```text
Collider trait = shape, offset, collision filtering
Collision system = detection implementation
Body model = supported motion/response participation
Contact event = reported result
Collision visual = optional inspection drawing
```

Distinguish physical bodies, passive/static participation, and overlap sensors according to the chosen implementation. Do not advertise body modes or collision responses that the engine adapter does not support.

A navigation obstacle describes traversability. A physical collider describes contact participation. A sensor describes detection without necessarily blocking movement. These can share a geometry definition while retaining different meanings.

### 14.4 Drawing versus simulation

```text
Shape traits + visual + view
  -> a drawing

Body/collider traits + supported physics system + visual + view
  -> a physically simulated object

Brush controls + stroke/layer data + suitable presentation
  -> painting functionality, only when implemented
```

The current product can support placing and editing simulation objects without implementing a painting application.

## 15. Interaction rules

### 15.1 Allowed interactions

| Source | Target | Meaning |
|---|---|---|
| Composition | Prefab | Reference recipe and instance parameters |
| Prefab/composition | Resource | Resolve shared definitions/assets |
| Runtime instantiator | Prefab | Expand initial entity data |
| Runtime | World/entities | Commit lifecycle operations |
| System | Traits/shared model data | Read compatible inputs |
| System | Owned trait fields | Apply model changes |
| Behavior runner | Action dispatch | Submit supported requests |
| System | Observations/events | Publish results for behavior and measurement |
| Visual | Traits/resources | Read presentation inputs |
| Visual | View renderer | Supply compatible drawing description |
| View | Control | Supply picking/coordinate information |
| Control | Runtime dispatch | Submit lifecycle/model/action commands |
| Control | Presentation state | Change display settings |
| Runtime/system handler | Control | Return accepted/rejected outcome |

### 15.2 Disallowed shortcuts

| Shortcut | Reason |
|---|---|
| Control directly instantiates live objects | Bypasses lifecycle validation and reference setup |
| Factory mutates the live world while constructing | Risks partial assemblies and unclear ownership |
| Control directly writes model outputs | Bypasses the responsible model |
| Visual writes authoritative model state | Makes results depend on display behavior |
| Behavior implements its own physics/transactions | Bypasses supported reusable mechanics |
| Two movement providers write the same pose | Creates conflicting authority |
| Resource carries hidden simulation callbacks | Violates the data/definition boundary |
| System manipulates SVG or meshes | Couples model execution to presentation |

Runtime configuration handlers can perform validated administrative edits; "systems own model execution" does not mean every initial-value edit needs a physics tick. These exceptions must remain explicit and must synchronize/invalidate the relevant provider state.

## 16. End-to-end examples

### 16.1 Add a citizen

```text
Control or Apertus
  -> CreateInstance(CitizenPrefab, settings)
  -> runtime validates requirements and references
  -> instantiator constructs independent initial traits
  -> runtime commits entity
  -> compatible behavior/navigation/movement systems process it
  -> CitizenVisual produces drawing description
  -> 3D view displays it
```

The prefab is not the behavior runner. The navigation system is not the creator of every citizen.

### 16.2 Change a bridge load

```text
Load slider
  -> SetLoad command
  -> validated model-input handler
  -> update load data and invalidate dependent results
  -> response system recomputes
  -> MemberResponse outputs update
  -> BeamVisual maps results to geometry/style
  -> SVG view updates actual elements
```

No prefab needs to be instantiated just because the load magnitude changed. Changing topology may call the trusted layout helper through a rebuild operation; define whether old member selections/references are preserved or invalidated.

### 16.3 Show or hide velocity arrows

```text
Toggle -> presentation setting -> visual/view visibility
```

This changes display only. It must not change the projectile's actual velocity or simulated time.

### 16.4 Render a rigid body

```text
Body2D + Collider2D + current pose
                |
          Physics2DSystem
                |
       authoritative pose/velocity
                |
     ShapeVisual2D or SvgAssetVisual <--- appearance resources
                |
             2D view
```

Physical and visible geometry need not match. A prefab may deliberately bind one exposed radius parameter to both when they should match. Removing a visual does not remove the body; removing collision participation does not necessarily remove the visual.

## 17. Mapping to the repository's current demos

Paths below are relative to the project root. This is an architectural extraction map, not an audit asserting all modules already exist under these names.

### 17.1 Projectile

Current model functions are in `src/web/src/premade-simulations/projectile/systems/ballistics.ts`: flight time, range, maximum height, and position at time use analytic equations. Gravity presets are in `resources/gravity.ts`; the existing Zustand store remains in the simulation's root `state.ts`.

| Kind | Initial extraction |
|---|---|
| Resource | Gravity presets and appearance defaults |
| Trait | Launch settings, motion state, calculated metrics |
| Behavior | None required |
| System | Ballistic motion over compatible launch data |
| Visual | Projectile, trajectory, velocity arrow |
| View | 2D viewport and flight graph |
| Control | Angle, speed, gravity, launch/reset, comparison |
| Prefab | Projectile with default launch and visual bindings |
| Composition | One projectile or two configured for angle comparison |

Do not add rigid bodies, mass, friction, or a physics engine merely to fit names in a registry. Add those when a supported feature requires them. Graphs and visuals should consume the same model outputs or shared model sampling functions, not diverging formulas.

### 17.2 Town

Current files are under `src/web/src/premade-simulations/town/`, including `state.ts`, `systems/CitizenSystem.tsx`, `systems/routing.ts`, and `systems/navigation.ts`. `resources/layout.ts` defines a population of 22 citizens. The citizen implementation chooses destinations from schedules and market settings, plans routes, and advances movement inside a render-frame callback.

| Kind | Initial extraction |
|---|---|
| Resource | Building/citizen appearance and schedule defaults |
| Trait | Transform, resident profile, navigation state, building footprint/entrance |
| Behavior | Daily routine and destination selection |
| System | Route finding, path following, behavior evaluation |
| Visual | Citizen, building, market, road |
| View | 3D town viewport |
| Control | Time, speed, road closure, market location/preference |
| Prefab | Citizen and configurable building variants |
| Composition | Current town layout and its control bindings |

Model navigation uses a horizontal plane; the view supplies 3D presentation. Extract movement from mesh updates when touching this boundary. Existing pathfinding helpers can remain ordinary functions behind the navigation provider.

Moving the market must update navigation destination/entrance and obstacle data as well as its appearance. The scene mesh is not the authoritative building position.

Wallets, purchases, production, and information propagation are not current demo capabilities. Keep them as future examples of reuse rather than claimed implemented components.

### 17.3 Bridge

Under `src/web/src/premade-simulations/bridge/`, `prefabs/buildTruss.ts` contains the trusted layout helper, `traits/structure.ts` contains joint/member types, and `systems/response.ts` contains `memberStress` and `memberForceType`. This folder organization does not yet implement registered prefab or system contracts. The current response is heuristic, based on factors such as load proximity, magnitude, density, span, and removal state. Rendering currently calls these helpers in scene/member code.

| Kind | Initial extraction |
|---|---|
| Resource | Display styles and supported model presets |
| Trait | Joint positions, member endpoints/kind/presence, load settings, response outputs |
| Behavior | None required |
| System | Existing heuristic response behind an explicit interface |
| Visual | Member, joint, truck/load, response coloring |
| View | SVG bridge viewport and member/result inspection |
| Control | Load magnitude/position, span, density, member removal, rebuild |
| Prefab | Member/load recipes and procedural truss assembly |
| Composition | Bridge experiment with response model and UI bindings |

Expose the heuristic as a score, not physical stress in pascals. Do not rename it a validated truss solver. A later solver must supply an explicit result contract and assumptions.

The truck currently represents load placement. It does not require a vehicle physics system. Material, support, and section definitions become meaningful model inputs when an implemented solver uses them.

## 18. Minimal validation before activation or edits

Validate the concrete assembled result, not only its top-level JSON shape:

1. Definition IDs and required versions resolve.
2. Parameter types, ranges, and units satisfy the selected schemas.
3. Prefab instances create unique identities and valid references.
4. Required systems and accepted actions exist.
5. Behavior observations/actions are allowed for their targets.
6. Trait ownership has no conflicting writers.
7. Visual inputs exist and its output target is compatible with the view.
8. Model-to-display coordinate mapping is defined.
9. Controls bind to writable parameters or supported actions.
10. New topology/removal does not leave invalid references silently active.

Return specific errors with target/path information. A failed command should leave the prior valid state intact. Use direct staging/validation and ordinary function results initially; elaborate distributed transaction machinery is unnecessary.

Resource resolution and provider lookup must distinguish missing assets, missing code implementations, invalid input, and incompatible models. A visually plausible scene is not proof of valid simulation assembly.

## 19. Persistence and edits

The saved experiment definition should preserve composition inputs, prefab/resource references, instance IDs/overrides, system configuration, connections, and relevant presentation bindings.

Do not serialize render objects, engine handles, or callback closures as the experiment definition.

Initial configuration and current runtime state are distinct. Reset restores the defined initial setup. Saving/resuming an in-progress checkpoint requires additional engine/task state and is a separate feature; do not imply a saved composition can resume arbitrary execution exactly.

For each command, state whether it applies live, while paused, at reset, or after rebuild. This is especially important for launch settings, population changes, and regenerated bridge geometry. Rebuild identity preservation and conflict behavior should be explicit for the supported operation; a universal live-prefab-inheritance system is not required.

## 20. Verification and first implementation slice

Meaningful checks should verify boundaries and behavior rather than mirror function internals:

- Instantiating the same prefab twice creates independent state and valid internal references.
- Invalid creation does not partially insert an assembly.
- Shared resource reads do not accidentally share mutable entity state.
- Unsupported control/action bindings are rejected.
- Hiding/changing a visual does not alter model results.
- Analytic motion, navigation, and physics do not fight over a pose.
- A visual's backend and coordinate contracts are respected.
- Existing demo calculations and commands retain intended behavior during extraction.

Start with a small bridge slice: prefab -> traits -> validated load edit -> current response model -> BeamVisual -> SVG view. Then reuse a primitive visual or another small part in the projectile demo. This exposes actual coupling without requiring the entire registry and scheduler to be finished first.

Do not equate reuse with renaming three monolithic demo functions. Conversely, do not split every property into its own trait or force every domain through the same solver API.

## 21. Godot inspiration and intentional differences

Borrow these principles:

- Reusable compositions can contain smaller reusable objects.
- Definitions/assets and instance state should be distinguishable.
- Transform, visible geometry, collision geometry, and movement participation are explicit choices.
- Shared engine mechanisms support many compatible objects.
- Named actions/events reduce dependence on internal object structure.

Our contracts intentionally retain declarative behavior recipes, inspectable assumptions/units, validated edits, and model/view separation. They do not reproduce Godot's class hierarchy or permit arbitrary node scripts from community content. No engine migration is implied.

Reference documentation consulted during design:

- [Godot core concepts](https://docs.godotengine.org/en/stable/getting_started/introduction/key_concepts_overview.html)
- [Resources and scene instantiation](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html)
- [Scene organization](https://docs.godotengine.org/en/stable/tutorials/best_practices/scene_organization.html)
- [World2D](https://docs.godotengine.org/en/stable/classes/class_world2d.html) and [World3D](https://docs.godotengine.org/en/stable/classes/class_world3d.html)
- [Viewports](https://docs.godotengine.org/en/stable/tutorials/rendering/viewports.html)
- [WorldEnvironment](https://docs.godotengine.org/en/stable/classes/class_worldenvironment.html)
- [Physics introduction](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html)
- [Navigation agents](https://docs.godotengine.org/en/stable/tutorials/navigation/navigation_using_navigationagents.html)
- [Shared server APIs](https://docs.godotengine.org/en/stable/tutorials/performance/using_servers.html)

## 22. Final classification checklist

When adding a proposed component, ask:

| Question | Type |
|---|---|
| Is it reusable content or a definition? | Resource |
| Is it data belonging to one entity? | Trait |
| Is it an inspectable rule requesting supported actions? | Behavior |
| Does it implement authoritative simulation mechanics? | System |
| Does it map model state to an object's appearance? | Visual |
| Does it manage a rendering surface or dataset display? | View |
| Does it translate user interaction into a command? | Control |
| Does it describe how to create an object/assembly? | Prefab |
| Does it assemble the complete experiment using prefabs? | Composition |

If one implementation answers several questions, separate its interfaces and ownership. A shared source file or React component is acceptable; blurred contracts are not.
