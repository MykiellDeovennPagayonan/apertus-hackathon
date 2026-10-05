# Apertus Playground: Component Architecture

**Status:** Agreed design direction, 2026-10-02. This describes the target architecture; the current demos do not yet implement every boundary below.

**Audience:** Everyone designing or building the playground.

For implementation contracts, see [Component Contracts](agent-only/COMPONENT_CONTRACTS.md). The earlier [architecture catalog](agent-only/COMPONENT_ARCHITECTURE.md) remains useful as a roadmap, but this guide and the contracts replace its conflicting terminology. The [project overview](agent-only/OVERVIEW.md) still describes the broader product vision.

The manual builder now uses this shared ownership for lines, squares, gas containers, fraction bars, and authored towns. Pure definitions under `components/definitions/` register with the existing runtime catalog; `runtime/composition/` validates and executes independent canvases. Shared views and controls serve author previews and learner playback, with builder-only capture and settings integration in `builder/preview/`. See [refactor 008](agent-only/implementation/008-SHARED_COMPONENT_BUILDER_REFACTOR.md) for the delivered owners, compatibility adapters, and verification evidence.

## 1. The decision in one page

The playground consists of reusable **components**. That is the umbrella term, not the name of one particular type.

There are **nine component types**:

| Type | What it is responsible for | Example |
|---|---|---|
| **Resource** | Reusable data, a definition, or an asset | SVG file, mesh, gravity preset |
| **Trait** | An entity's configuration and current state | Position, body properties, route |
| **Behavior** | Declarative decisions and sequences of supported actions | Follow a daily routine |
| **System** | Shared simulation calculations and mechanics | Physics, navigation, transactions |
| **Visual** | Mapping model data to an object's appearance | Beam visual, citizen visual |
| **View** | Displaying a world or dataset on a rendering surface | SVG viewport, 3D viewport, graph |
| **Control** | Turning user interaction into commands | Slider, drag handle, prompt input |
| **Prefab** | A reusable recipe for an entity or assembly | Citizen, projectile, truss bridge |
| **Composition** | A complete simulation assembled using prefabs | Town experiment, bridge experiment |

Three additional concepts hold and execute these components:

| Concept | Meaning |
|---|---|
| **Entity** | One identifiable instance, such as `citizen_12` or `beam_7` |
| **World** | The running model context: entities, model space, shared data, and enabled systems |
| **Runtime** | Infrastructure that validates, instantiates, schedules, and routes operations |

These names describe responsibilities. They do not require nine frameworks, an ECS library, or a general plugin engine. Plain TypeScript data and functions are enough to begin.

## 2. How the pieces fit

This diagram distinguishes saved recipes from the running simulation:

```text
SAVED DESCRIPTIONS

  Resources ---------> Prefabs <--------- Behavior recipes
                          |
                          | selected with instance settings
                          v
                     Composition
                     /    |     \
             world setup views  controls
                          |
                   validate and load
                          v
                       Runtime
                          |
RUNNING MODEL             v

              World: entities with traits
                     ^             |
                     | updates     | reads
                     +--- Systems -+
                          |
                    observable results
                          v
DISPLAY

             Visuals ---> View renderer ---> Screen
```

References, reads, and updates are different interactions. A resource or trait does not actively execute just because an arrow leaves it.

## 3. Prefab and Composition: different responsibilities

### Prefab: what is this reusable thing?

A prefab is a recipe for one entity or a connected assembly. It declares initial traits, resource references, behavior assignments, visual bindings, and required capabilities.

```text
CitizenPrefab
  traits:     Transform, Resident, NavigationAgent, VisualBinding
  behavior:   DailyRoutine
  visual:     CitizenVisual3D
  parameters: home, daytime destination, walking speed
  requires:   navigation, path following, behavior execution
```

Instantiating it creates separate entities with separate state:

```text
CitizenPrefab + settings A --> citizen_1
CitizenPrefab + settings B --> citizen_2
```

A prefab can contain nested prefabs. A bridge prefab can create joints, members, and a load attachment point. It does not configure the entire application's camera, UI, or global clock.

### Composition: which things form this experiment?

A composition uses prefabs as inputs and defines the experiment around them:

```text
TownComposition
  world:       horizontal plane, roads, obstacles
  systems:     navigation, path following, behavior runner
  instances:   citizens, houses, school, workshop, market
  connections: each resident's home and daytime destination
  views:       3D town and inspector
  controls:    time, speed, road closure, market settings
```

**Prefab and Composition remain separate types.** They may share loading helpers, but their public scopes differ.

The runtime's factory/instantiator turns recipes into instances. **Factory is an implementation helper, not a tenth component type.** A procedural truss-layout function can be used during instantiation without requiring a universal generator framework.

## 4. Resource: reusable content and definitions

Resources include assets and reusable settings:

| Resource | Used by |
|---|---|
| `citizen.glb` | A 3D visual |
| `house.svg` | An SVG asset visual |
| Beam display style | A beam visual |
| Earth gravity preset | Physics or ballistic model configuration |
| Material definition | A compatible structural system |
| Daily schedule definition | A behavior recipe or its configuration |

A resource does not independently run, move, or draw anything. Its interface is essentially **resource ID to validated data or loaded asset**.

A resource is an ingredient, not the "prefab of a visual." A prefab is a creation recipe. A visual preset is simply a resource containing a visual choice, asset references, and default settings; it does not need another type.

Shared definitions and changing instance state stay separate. Citizens may share one walking-profile resource, but each citizen has its own position and route.

## 5. Trait: data belonging to one entity

A trait groups related configuration and state. It has no hidden simulation or rendering callbacks.

| Trait | Typical fields |
|---|---|
| `Transform2D` | Position, rotation, scale |
| `Body2D` | Body mode, mass, velocity, supported settings |
| `Collider2D` | Shape, offset, collision categories and filtering |
| `NavigationAgent` | Speed, destination, route, progress |
| `Resident` | Role, home reference, daytime destination |
| `MemberEndpoints` | References to two structural joints |
| `VisualBinding` | Visual implementation ID, asset references, display overrides |

Fields have different roles:

```text
Configuration:  launch angle, walking speed, load magnitude
Runtime state: current position, route progress, elapsed time
Output:        maximum height, member response score
```

The field contract identifies which inputs can be edited and which system owns the changing state. A slider cannot overwrite a calculated result as if it were a parameter.

### Does a trait perform collision detection?

No. It supplies the data used for detection:

```text
Collider2D trait ----- shape and filtering ----+
                                              v
Transform trait ------ current position ---> Physics/collision system
                                              |
                                              +--> contacts and events
                                              +--> response, if supported
```

A simple shape can be stored directly in the trait. Use a shape resource when sharing the definition is useful. Collision outlines are an optional visual, not the detection mechanism.

## 6. System: reusable mechanics

A system operates on compatible traits. It should not need to know whether an object is narratively a citizen, robot, or delivery truck.

| System | Reads | Produces or updates |
|---|---|---|
| Ballistic motion | Launch settings, gravity, time | Position, velocity, flight metrics |
| Navigation | Position, destination, route map | Route |
| Path following | Route, speed, time | Position and progress |
| Physics 2D | Bodies, colliders, forces | Physical motion and contacts |
| Transactions | Requests, accounts, inventories | Validated transfers and results |
| Structural solver | Supported nodes, members, loads | Structural results |
| Behavior runner | Recipes, observations, progress | Action requests and behavior progress |

Each system declares its required data, accepted actions, owned state, outputs, and execution trigger. Some advance on simulation steps; others execute on requests or input changes.

Reuse means **usable wherever its input contract is satisfied**, not usable with every entity in every domain.

Only one movement mechanism may own an entity's authoritative position. Physics and direct path following must not independently overwrite it. Combining them needs an explicit integration.

## 7. Behavior: an inspectable activity recipe

A behavior describes when to request actions and how to sequence them:

```text
At 07:00:
  request MoveTo(daytimeDestination)

Wait for arrival:
  request the supported activity change

At 17:00:
  request MoveTo(home)
```

The recipe is evaluated by a shared behavior runner:

```text
Observations + recipe + behavior progress
                    |
                    v
              BehaviorRunner
                    |
             supported action request
                    v
       Navigation / movement / other system
                    |
               result or event
                    +---------> next behavior evaluation
```

Behaviors can use supported comparisons and scoring expressions. They do not implement physics, draw meshes, or directly change another system's state. Initially they are declarative recipes, not arbitrary community JavaScript.

## 8. Visual and View: appearance versus rendering surface

### Visual: how an object looks

A visual reads entity data and resources and returns a drawing description.

```text
BeamVisual
  reads: endpoints, response score, display style
  returns: line/path/polygon, color, width, picking identity
```

It may calculate display geometry, colors, labels, and presentation-only animation. It must not calculate a second authoritative physical model.

### View: where it is displayed

A view owns the rendering surface and display context: camera, pan/zoom, coordinate mapping, drawing order, and compatible visual output.

Examples are `SVGWorldView`, `CanvasWorldView`, `ThreeDWorldView`, `TimeSeriesView`, and `TableView`.

### Who creates a beam's SVG?

```text
Endpoint traits ----+
Response output ---+--> BeamVisual --> drawing description
Style resource ----+                         |
                                             v
                                    SVG view renderer
                                             |
                                  actual <line> or <path>
```

The visual determines what to draw. The view's renderer creates or updates the actual SVG elements.

An existing SVG file is a resource. A generic `SvgAssetVisual` places and styles it from entity data. We do not need bespoke visual code for every file:

```text
house.svg ---+
school.svg --+--> SvgAssetVisual --> SVGWorldView
```

A procedural visual may need no external asset at all. A beam can be generated from its endpoints.

Visuals declare supported rendering targets. An SVG visual is not automatically a 3D visual. Graph/table views can consume datasets directly without inventing visual entities for each point or cell.

## 9. Control: request a change

A control translates an interaction into a command. Buttons, sliders, dragging, and natural-language editing should use the same supported operations.

| Request | Route |
|---|---|
| Add a citizen | Control -> runtime -> prefab instantiation |
| Move a citizen | Control -> runtime -> supported movement action |
| Change gravity | Control -> runtime -> validated model configuration change |
| Zoom | Control -> presentation settings -> view |

Controls do not call the factory directly or write authoritative model state. A clickable visual supplies a target ID; a control interprets the click. A React widget may contain both responsibilities while preserving their interfaces.

The runtime owns lifecycle operations. A responsible system or validated configuration handler owns model edits. Presentation changes do not need to pass through a physics or navigation system.

## 10. World, 2D/3D, and environment

Keep model space, active mechanics, and presentation independent:

| Question | Where the answer lives |
|---|---|
| Is the model a plane, volume, graph, or nonspatial? | World/model configuration |
| Does the model use physics? | Enabled systems and compatible traits |
| Is it displayed in 2D or 3D? | View and visual bindings |
| What is gravity? | Configuration of the system using it |
| What are the roads and obstacles? | Shared model data and relevant entity traits |
| What are the camera, background, and lighting? | Presentation configuration |

Do not use "environment" as an interchangeable name for all of these.

Uniform gravity is usually a setting. Zero gravity is a zero vector, not another component type. An independently positioned gravity source would need source data plus an implemented system that supports it.

A visible shape does not imply a collider. A collider does not imply a visible shape. A navigation obstacle is not automatically a physical collider.

```text
Shape data + visual + view
  -> a drawing

Shape data + body/collider + physics system + visual + view
  -> a physical simulation

Brush controls + stroke/layer data + suitable view
  -> drawing/painting functionality, if implemented
```

A canvas alone does not supply painting tools.

## 11. The three current demos

These are extraction targets, not claims that every module already exists.

| Type | Projectile | Town | Bridge |
|---|---|---|---|
| Resource | Gravity presets, styles | Appearance assets, schedule defaults | Display styles, supported model presets |
| Trait | Launch settings, motion, metrics | Resident, navigation, transform | Joints, endpoints, load, response |
| Behavior | None required | Daily routine, destination selection | None required |
| System | Existing ballistic equations | Route finding, path following, behavior evaluation | Existing heuristic response calculation |
| Visual | Ball, trajectory, velocity arrow | Citizen, building, road | Member, joint, truck/load |
| View | 2D viewport, flight graph | 3D viewport | SVG viewport, result panel |
| Control | Angle, speed, gravity, launch, compare | Time, speed, roads, market settings | Load, span, density, remove, rebuild |
| Prefab | Projectile | Citizen, house, market | Member, load, truss assembly |
| Composition | Angle comparison experiment | Town scenario | Bridge experiment |

Current scope matters:

- The projectile uses analytic equations, not a general rigid-body engine.
- The town currently models schedules and navigation for 22 citizens. Economy and information propagation are future work.
- Town movement is modeled on a horizontal plane while the presentation is 3D.
- The bridge response is heuristic. Do not label it engineering-grade stress or silently assign physical stress units.
- None of these current implementations requires introducing a general physics engine solely for architectural consistency.

## 12. Interaction rules to keep fixed

| Interaction | Contract |
|---|---|
| Composition -> Prefab | Select recipe and instance parameters |
| Runtime -> Prefab | Validate and instantiate initial entity data |
| System <-> Trait | Read inputs; update declared owned fields |
| Behavior -> System | Request supported actions through routing |
| System -> Behavior runner | Publish observable results/events |
| Visual -> Trait/Resource | Read model and appearance inputs |
| Visual -> View | Supply compatible drawing descriptions |
| Control -> Runtime | Submit lifecycle, model-edit, or action commands |
| Control -> presentation settings | Change the display without changing the model |

Do not add direct control-to-model writes, visual-to-model writes, or factory-to-live-world mutations. A single owner must be responsible for each authoritative state update.

## 13. What to implement first

Prove the boundaries with a narrow slice:

1. Instantiate a beam prefab through a bridge composition.
2. Expose model data as traits.
3. Change the load through a validated control command.
4. Compute the existing response through its model system.
5. Turn endpoints and results into a drawing description through `BeamVisual`.
6. Render it through an SVG view.

Then check that the same primitives can serve another entity or composition. Keep ordinary functions and small data structures until additional machinery has a demonstrated need.

## 14. Godot inspiration

We borrow reusable composition, resources, explicit physical participation, event connections, and shared engine mechanisms. We retain our own declarative validation and separation of model results from presentation. This is not a decision to migrate the application to Godot.

Useful background: [Godot's core concepts](https://docs.godotengine.org/en/stable/getting_started/introduction/key_concepts_overview.html), [resources](https://docs.godotengine.org/en/stable/tutorials/scripting/resources.html), [viewports](https://docs.godotengine.org/en/stable/tutorials/rendering/viewports.html), and [physics introduction](https://docs.godotengine.org/en/stable/tutorials/physics/physics_introduction.html).
