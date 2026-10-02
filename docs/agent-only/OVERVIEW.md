# Apertus Playground
## Detailed Project Specification

**Project type:** Open, composable AI-assisted simulation playground  
**Hackathon:** Hack Apertus — Track 2B: Own Project  
**Primary model:** Apertus  
**Optional fast decision model:** Laya / Jev-like classifier  
**Primary client:** Web browser  
**Target deployment:** Local-first, with Raspberry Pi / LAN deployment as a goal  
**Core metaphor:** Scratch for simulations  
**Core principle:** *Never ask the model to do something a deterministic component can do better.*

---

# 1. Project Summary

Apertus Playground is a browser-based platform for creating, editing, running, remixing, and sharing interactive simulations.

Instead of asking an LLM to generate arbitrary simulation code, the platform provides a library of trusted, reusable simulation components. These components can represent visual objects, 2D and 3D worlds, physics, structural elements, materials, mathematical concepts, economic systems, social systems, agents, resources, behaviors, controls, graphs, measurements, events, and rules.

Apertus acts as a **semantic composer**.

A user can type:

> Create a town with 30 residents, two bakeries, and a school. Residents earn salaries, buy food every day, and initially only know about the nearest bakery.

The system interprets the request, searches the component registry, assembles a valid simulation specification, validates the specification, and runs it in the browser.

The LLM should **not** calculate every movement, perform physics directly, maintain balances, decide whether a bridge breaks, or control every simulation frame.

Instead:

```text
Natural language
      ↓
Apertus
      ↓
Simulation specification / DSL
      ↓
Validation
      ↓
Trusted reusable components
      ↓
Deterministic runtime
      ↓
Interactive simulation
```

The same simulation can then be modified through natural language:

> Make the second bakery cheaper.

> Let residents tell their friends about shops they discover.

> Double the population.

> Graph the average distance traveled to buy bread.

The system edits the existing simulation state rather than regenerating the entire project.

---

# 2. Product Vision

The long-term vision is:

> **Scratch for simulations, with AI as the natural-language composition layer.**

Users should be able to create simulations in three ways:

1. **Prompt-first**
   - Describe what they want.
   - Apertus assembles it.

2. **Visual editor**
   - Drag, configure, and connect reusable components.

3. **Manual / DSL editor**
   - Advanced users directly edit the simulation specification.

The community can publish:

- complete simulations,
- reusable components,
- behavior modules,
- visualization modules,
- templates,
- and remixes.

A simulation should never be treated as a one-off generated artifact. It is a structured composition of components that can be inspected, edited, reused, and remixed.

---

# 3. One-Line Pitch

> **Apertus Playground is Scratch for simulations: users describe what they want to explore, and Apertus assembles trusted physics, math, social, economic, and agent components into an interactive simulation that can be edited and remixed by the community.**

Alternative hackathon pitch:

> **Most generative AI gives you an answer. Apertus Playground builds an interactive world where you can explore the answer yourself.**

---

# 4. Core Design Principles

## 4.1 Composition over code generation

Apertus should prefer:

```text
Add:
- Physics2DWorld
- Projectile
- Gravity
- Velocity
- Trajectory
- AngleSlider
- DistanceGraph
```

instead of generating a complete JavaScript projectile simulator.

This makes the system more reliable, easier for a small model, safer, easier to validate, reusable, explainable, offline-friendly, and easier to benchmark.

## 4.2 AI chooses and configures; deterministic systems execute

| Task | Responsible system |
|---|---|
| Understand user intent | Apertus |
| Select simulation family | Apertus or Laya |
| Find compatible components | Registry + retrieval |
| Configure high-level properties | Apertus |
| Validate component compatibility | Deterministic validator |
| Projectile trajectory | Physics engine |
| Pathfinding | Navigation engine |
| Wallet balances | Economy engine |
| Collision | Physics engine |
| Beam stress | Structural component |
| Inventory transfer | Transaction system |
| Render objects | Browser |
| Simple bounded routing decisions | Laya / rules |
| Complex ambiguous request | Apertus |

## 4.3 Everything important should be inspectable

The user should be able to inspect what components exist, what properties they have, what systems are active, what assumptions are being made, what behaviors an agent uses, what resources exist, and what changed after a natural-language command.

The LLM should not be a black box controlling invisible simulation logic.

## 4.4 Components can be non-visual

A component can be:

- `Wallet`
- `Inventory`
- `Salary`
- `Trust`
- `Knowledge`
- `RumorSpread`
- `Supply`
- `Demand`
- `ProbabilityDistribution`
- `StressModel`
- `Diffusion`
- `AgentPolicy`
- `Graph`
- `Timer`
- `EventTrigger`

This is what enables the platform to support systems, not only scenes.

---

# 5. Primary Use Cases

## 5.1 Education

Examples:

- projectile motion,
- gravity,
- circuits,
- bridge stress,
- statistics,
- supply and demand,
- epidemic spread,
- population growth,
- gas diffusion,
- algorithms,
- geometry,
- ecosystems.

The product is not an AI tutor. The AI creates an **interactive environment**.

## 5.2 Society and economics

Examples:

- two competing shops,
- information spreading through a town,
- housing prices,
- scarcity,
- panic buying,
- wealth distribution,
- taxation,
- jobs and wages,
- consumer choice,
- social influence,
- simple market behavior.

Important:

> Society simulations represent outcomes under explicit assumptions. They are not automatically claims about real human behavior.

Assumptions should be visible.

## 5.3 Engineering

Examples:

- bridge structures,
- beam stress,
- load placement,
- material comparison,
- trusses,
- structural failure,
- vehicle weight,
- spring systems.

## 5.4 Games and autonomous agents

Examples:

- citizens following schedules,
- RTS unit behavior,
- autonomous NPCs,
- simple multi-agent systems,
- crowds,
- traffic,
- swarm behavior.

These are secondary use cases for the platform architecture.

---

# 6. Target User Experience

## 6.1 Landing screen

```text
Apertus Playground

What do you want to explore?

[ Describe a simulation...                         ]

Examples:
• Show how projectile angle affects distance.
• Build a bridge and put a truck on it.
• Create a town with two competing bakeries.
```

The user should not initially choose 2D vs 3D, math vs physics, or graph vs simulation. The AI should decide that.

## 6.2 Creation flow

Example input:

> Show me how projectile angle affects distance.

Possible internal decisions:

```text
Intent:
CREATE_SIMULATION

Family:
PHYSICS

Representation:
2D

Environment:
PHYSICS_2D

Required entities:
PROJECTILE
GROUND

Required systems:
GRAVITY
INITIAL_VELOCITY

Useful controls:
ANGLE_SLIDER
SPEED_SLIDER

Useful visualizations:
TRAJECTORY
DISTANCE_MEASUREMENT
HEIGHT_GRAPH
```

Then the runtime builds the scene.

## 6.3 Follow-up modification

After the simulation exists:

> Compare 30° and 60°.

The system should **modify the existing simulation**, not rebuild it.

Possible operation:

```text
action: ADD_COMPARISON
target: projectile
variants:
  - angle: 30
  - angle: 60
shared_properties:
  velocity: true
  gravity: true
```

## 6.4 Manual editing

Users should also be able to click objects and properties.

Example:

```text
Projectile #1

Mass         [ 1.0 kg ]
Angle        [ 45°    ]
Velocity     [ 20 m/s ]
Color        [ ...    ]
```

This prevents the system from being prompt-only.

---

# 7. Core Platform Architecture

```text
                       ┌─────────────────┐
                       │      User       │
                       └────────┬────────┘
                                │
                                ▼
                       Natural-language input
                                │
                  ┌─────────────┴─────────────┐
                  │                           │
          Simple bounded request       Complex request
                  │                           │
                  ▼                           ▼
            Laya / rules                  Apertus
                  │                           │
                  └─────────────┬─────────────┘
                                ▼
                     Simulation Planner
                                │
                                ▼
                       Component Registry
                                │
                                ▼
                      Simulation DSL / Spec
                                │
                                ▼
                         Validator
                                │
                    ┌───────────┴───────────┐
                    │                       │
                  valid                  invalid
                    │                       │
                    ▼                       ▼
               Runtime                 repair loop
                    │
                    ▼
                  Browser
```

---

# 8. Main Subsystems

## 8.1 Component Registry

Stores all available reusable components.

Each component should expose enough information for retrieval, compatibility checking, parameter configuration, rendering, and simulation execution.

## 8.2 Simulation Planner

Translates user intent into a structured plan.

The planner should determine:

- simulation family,
- representation,
- required components,
- relationships,
- behaviors,
- controls,
- measurements,
- assumptions,
- optional visualizations.

## 8.3 Validator

Checks that:

- components exist,
- required dependencies exist,
- referenced IDs exist,
- properties are valid,
- types match,
- systems are compatible,
- illegal connections are rejected,
- numeric values fall within supported ranges,
- arbitrary executable code is not included.

## 8.4 Runtime

Executes the simulation.

Possible runtime modules:

- 2D renderer,
- Three.js renderer,
- physics runtime,
- structural runtime,
- agent runtime,
- economy runtime,
- graphing runtime,
- event runtime.

## 8.5 Community Registry

Stores:

- published simulations,
- community components,
- templates,
- remixes,
- metadata,
- authorship,
- versions,
- tags.

---

# 9. Component Model

## 9.1 Component categories

### World / Environment

```text
World2D
World3D
Physics2DWorld
Physics3DWorld
CoordinatePlane
GraphCanvas
DiagramCanvas
TimelineCanvas
GroundPlane
Terrain
Clock
Camera
```

### Visual entities

```text
Cube
Sphere
Cylinder
Line
Beam
Joint
Building
House
Shop
School
Citizen
Car
Truck
Tree
Road
BridgeDeck
Planet
Particle
```

### Physics

```text
Mass
Gravity
Velocity
Acceleration
Force
Friction
Collision
Spring
Elasticity
Stress
Strain
Breakable
Buoyancy
Fluid
GasDiffusion
```

### Economy

```text
Wallet
Currency
Inventory
Resource
Price
Transaction
Salary
Job
Shop
Production
Supply
Demand
Tax
Loan
```

### Society

```text
Relationship
Trust
Knowledge
Rumor
SocialNetwork
Household
Organization
Reputation
Need
Preference
```

### Agent behavior

```text
MoveTo
Wander
Seek
Avoid
Choose
Buy
Sell
Consume
Work
Rest
ShareInformation
ChooseLowestPrice
ChooseNearest
UtilityDecision
FollowSchedule
```

### Mathematics

```text
Variable
Equation
Function
Vector
Distribution
Probability
Counter
Accumulator
Rate
Series
Dataset
Statistic
```

### UI / controls

```text
Slider
Toggle
Button
Dropdown
NumberInput
DragHandle
PlayPause
Reset
Step
SpeedControl
```

### Visualization

```text
Graph
Table
Heatmap
VectorOverlay
Trajectory
Label
CounterDisplay
Timeline
Histogram
ScatterPlot
StressOverlay
```

### Logic / events

```text
Timer
Condition
Trigger
Event
IfThen
EveryTick
EveryInterval
OnCollision
OnThreshold
OnResourceEmpty
```

---

# 10. Component Manifest

Every component should have a manifest.

```json
{
  "id": "core.structure.steel_beam.v1",
  "name": "Steel Beam",
  "description": "Structural beam with configurable dimensions and material properties.",
  "category": "structure.beam",
  "version": "1.0.0",
  "environments": ["2d", "3d"],
  "tags": ["engineering", "bridge", "structure", "beam"],
  "properties": {
    "length": {
      "type": "number",
      "default": 5,
      "min": 0.1,
      "max": 100,
      "unit": "m"
    },
    "material": {
      "type": "enum",
      "values": ["steel", "wood", "aluminum"],
      "default": "steel"
    },
    "breakable": {
      "type": "boolean",
      "default": true
    }
  },
  "capabilities": [
    "positionable",
    "attachable",
    "stress_bearing",
    "breakable"
  ],
  "requires": [
    "system.physics",
    "system.structural"
  ],
  "actions": [
    "attach",
    "detach",
    "apply_force"
  ],
  "outputs": [
    "stress",
    "strain",
    "broken"
  ],
  "events": [
    "on_break",
    "on_overstress"
  ]
}
```

---

# 11. Capabilities System

Components should interoperate through capabilities rather than one-off hardcoded checks.

Example capabilities:

```text
positionable
rotatable
scalable
movable
collidable
attachable
destructible
breakable
resource_holder
resource_consumer
resource_producer
wallet_owner
inventory_owner
agent_controllable
pathfinding_enabled
social_actor
knowledge_holder
tradable
measurable
```

Example:

```text
Car
- positionable
- movable
- collidable
- resource_consumer
- agent_controllable

Citizen
- positionable
- movable
- wallet_owner
- inventory_owner
- social_actor
- knowledge_holder
- resource_consumer

Shop
- positionable
- inventory_owner
- wallet_owner
- tradable
```

This allows generic systems to operate on different component types.

---

# 12. Simulation DSL

The DSL is the main intermediate representation between Apertus and the runtime.

```yaml
simulation:
  id: projectile_demo
  title: Projectile Motion

world:
  component: physics2d_world
  gravity:
    x: 0
    y: -9.81

entities:
  - id: ball_a
    component: sphere_2d
    properties:
      radius: 0.2
      mass: 1
      position: [0, 1]

behaviors:
  - component: initial_velocity
    target: ball_a
    properties:
      magnitude: 20
      angle: 45

controls:
  - id: angle_control
    component: slider
    bind:
      target: ball_a
      property: initial_velocity.angle
    min: 0
    max: 90
    value: 45

visualizations:
  - component: trajectory
    target: ball_a

  - component: graph
    x: time
    y: ball_a.position.y

measurements:
  - component: max_height
    target: ball_a

  - component: horizontal_distance
    target: ball_a
```

---

# 13. Simulation Operations

The system should support explicit operations against an existing simulation.

Suggested operation types:

```text
CREATE_SIMULATION
ADD_COMPONENT
REMOVE_COMPONENT
REPLACE_COMPONENT
MODIFY_PROPERTY
ADD_BEHAVIOR
REMOVE_BEHAVIOR
ADD_RELATION
REMOVE_RELATION
ADD_CONTROL
ADD_VISUALIZATION
ADD_MEASUREMENT
COMPARE_VARIANTS
RESET
DUPLICATE
SAVE
REMIX
```

Example:

User:

> Make the second bakery cheaper.

Operation:

```json
{
  "action": "MODIFY_PROPERTY",
  "target": "bakery_2",
  "property": "price.bread",
  "operation": "decrease",
  "value": 20,
  "unit": "percent"
}
```

The runtime determines the resulting numeric value.

---

# 14. Apertus Responsibilities

Apertus should handle tasks requiring semantic understanding.

## Primary responsibilities

- understand user intent,
- identify simulation family,
- decide between 2D, 3D, graph, diagram, etc.,
- retrieve useful components,
- decide which components are needed,
- configure high-level relationships,
- interpret follow-up modifications,
- map ambiguous user language to component properties,
- generate a valid simulation plan,
- optionally explain simulation state.

## Apertus should NOT directly handle

- frame-by-frame movement,
- collision math,
- structural calculations,
- wallet accounting,
- deterministic transactions,
- physics formulas already implemented,
- inventory mutation,
- rendering,
- pathfinding,
- direct JavaScript generation for standard cases.

---

# 15. Laya / Fast Classifier Responsibilities

Laya is optional.

It should only be used where a fast bounded decision can replace an expensive LLM call.

Examples:

## Top-level routing

```text
CREATE
MODIFY
COMPARE
INSPECT
SAVE
REMIX
```

## Representation choice

```text
2D
3D
GRAPH
DIAGRAM
TIMELINE
TABLE
```

## Domain

```text
PHYSICS
ENGINEERING
MATHEMATICS
ECONOMICS
SOCIETY
BIOLOGY
COMPUTING
GENERAL
```

## Modification type

```text
ADD
REMOVE
MOVE
RESIZE
CHANGE_PROPERTY
CHANGE_BEHAVIOR
CHANGE_RULE
ADD_MEASUREMENT
```

## Ambiguity

```text
CLEAR
MISSING_TARGET
CONFLICTING
UNSUPPORTED
NEEDS_CLARIFICATION
```

Important:

> Do not include Laya merely because it exists.

Benchmark whether it improves latency, cost, reliability, or throughput.

---

# 16. Agent Component

Agents should be configurable and should not all require an LLM.

```yaml
component: agent
properties:
  observations:
    - nearby_entities
    - inventory
    - wallet
    - needs
  goals:
    - satisfy_food_need
    - preserve_money
  actions:
    - move
    - buy
    - wait
  policy:
    type: utility
```

Supported policy types:

```text
RULE_BASED
UTILITY
RANDOM
CLASSIFIER
APERTUS
SCRIPTED
```

This allows experiments such as:

> Compare rule-based shoppers against LLM-driven shoppers.

or:

> Use Apertus only for the mayor while citizens use utility policies.

---

# 17. Community System

## 17.1 Simulation publishing

Users can publish a simulation with:

- title,
- description,
- thumbnail,
- tags,
- author,
- component list,
- assumptions,
- simulation DSL,
- version,
- remix source,
- usage count.

Example card:

```text
Town Economy
by @maria

Economics · Society
Uses 18 components
438 remixes

[ Run ] [ Remix ] [ View Components ]
```

## 17.2 Component publishing

Users can publish reusable components.

Example:

```text
Rumor Spread
by @alex

Category:
Social Behavior

Works with:
Agent
Knowledge
SocialNetwork

Inputs:
spread_probability
trust_threshold
forget_probability

Outputs:
knowledge_state

Used in:
137 simulations

[ Add to Playground ]
```

## 17.3 Remixing

Every public simulation should support:

```text
RUN
REMIX
VIEW COMPONENTS
DUPLICATE
```

Remixing should create a new simulation that records:

```text
remixed_from: original_simulation_id
```

---

# 18. Creation Modes

## 18.1 Prompt mode

For normal users.

Example:

> Build a town with two competing grocery stores.

## 18.2 Visual editor

Scratch-like blocks / component graph.

Example conceptual view:

```text
[ Citizen ]
    HAS [ Wallet ]
    HAS [ Need: Food ]

WHEN [ Hungry ]
    FIND [ Shop ]
    MOVE TO [ Shop ]
    BUY [ Food ]
```

The first MVP does not need full Scratch-style programming, but the architecture should support it.

## 18.3 Advanced DSL editor

For developers.

```yaml
entities:
  - component: citizen
    count: 50

systems:
  - wallet
  - inventory
  - needs

behaviors:
  citizen:
    - seek_shop
    - buy_food
```

---

# 19. Demo Simulations

The hackathon demo should prove that the same component architecture works across very different domains.

## Demo 1 — Projectile Physics

Prompt:

> Show how projectile angle affects distance.

Components:

```text
Physics2DWorld
Projectile
Gravity
InitialVelocity
AngleSlider
SpeedSlider
Trajectory
DistanceMeasurement
HeightGraph
```

Follow-ups:

> Compare 30° and 60°.

> Make gravity like the Moon.

> Show velocity vectors.

> Keep speed the same.

Success condition: the system modifies existing simulation state instead of rebuilding everything.

## Demo 2 — Bridge Engineering

Prompt:

> Build a truss bridge and show where stress accumulates when a truck crosses it.

Components:

```text
World2D or World3D
Ground / supports
BridgeDeck
Beam
Joint
Material
Gravity
Truck
StructuralStress
Breakable
StressOverlay
WeightSlider
```

Follow-ups:

> Make the truck heavier.

> Replace steel beams with wood.

> Remove the center support.

> Move the truck to the middle.

If the structural model is simplified, label it clearly. Do not claim engineering-grade accuracy unless validated.

## Demo 3 — Town Economy / Society

Prompt:

> Create a town with 40 residents and two bakeries. Residents buy bread once per day.

Components:

```text
World3D
Citizen
House
Bakery
Road
Wallet
Inventory
Bread
Price
Need
Transaction
MoveTo
ChooseShop
Clock
Graph
```

Follow-up:

> Make the second bakery cheaper.

Then:

> Only let five residents know about it.

Add:

```text
Knowledge
SocialNetwork
```

Then:

> Let people tell their friends.

Add:

```text
ShareInformation
```

Measurements:

```text
customers_per_shop
average_price_paid
average_travel_distance
unmet_demand
information_coverage
```

This demonstrates visual, economic, social, agent, and measurement components together.

---

# 20. Society Simulation Rules

Society simulations must expose assumptions.

Example:

```text
Assumptions

• Residents buy one bread per day.
• Residents only consider shops they know about.
• Residents choose the lowest weighted combination of price and travel distance.
• Residents share shop information with one social contact per day.
• Shops do not dynamically change prices unless enabled.
```

The product should say:

> **This simulation shows outcomes under these assumptions.**

It should not imply:

> **This predicts how real people behave.**

---

# 21. Component Retrieval

Apertus should not receive every component definition in full.

Recommended approach:

1. classify domain / intent,
2. search component metadata,
3. retrieve top relevant components,
4. give compact manifests to Apertus,
5. let Apertus compose from that subset.

Example component retrieval query:

```text
Need:
- 3D town
- citizens
- bread purchase
- shops
- money
- information spreading
```

Possible result:

```text
citizen.v1
bakery.v1
wallet.v1
inventory.v1
resource.bread.v1
transaction.v1
knowledge.v1
social_network.v1
share_information.v1
```

---

# 22. Validation and Repair Loop

If Apertus returns an invalid simulation spec:

```text
Apertus
   ↓
Validator
   ↓
Invalid
   ↓
Structured error list
   ↓
Apertus repair
   ↓
Validator
```

Example validator error:

```json
{
  "errors": [
    {
      "code": "MISSING_DEPENDENCY",
      "component": "share_information",
      "requires": "social_network"
    }
  ]
}
```

Apertus should repair only the invalid part.

---

# 23. Security

Community components should be declarative by default.

Safe components should contain:

- manifests,
- configuration,
- relationships,
- supported actions,
- supported events,
- visual definitions,
- DSL behavior.

Do not allow arbitrary shared JavaScript in the MVP.

Future advanced code plugins would require sandboxing, permissions, code review, versioning, isolation, and explicit trust levels.

For the hackathon:

> **Community components are declarative.**

---

# 24. Suggested Technical Stack

This is a proposal, not a hard requirement.

## Frontend

- Next.js or React
- TypeScript
- Tailwind CSS
- Three.js / React Three Fiber for 3D
- Canvas / SVG for 2D
- lightweight charting library
- Zustand / Redux / equivalent for simulation editor state

## Simulation runtime

Possible modules:

- Matter.js or Rapier for physics
- Three.js for rendering
- custom simple economy engine
- custom agent scheduler
- custom component graph / ECS-style state
- deterministic tick loop

## Backend

- Node.js / NestJS / Express
- PostgreSQL or SQLite for registry/community data
- local filesystem / object storage for assets

## AI layer

- Apertus
- optional Laya / classifier
- structured JSON / schema validation
- component retrieval index

---

# 25. Recommended Internal Data Model

## Simulation

```ts
type Simulation = {
  id: string;
  title: string;
  description?: string;
  world: WorldSpec;
  entities: EntitySpec[];
  systems: SystemSpec[];
  behaviors: BehaviorSpec[];
  controls: ControlSpec[];
  visualizations: VisualizationSpec[];
  measurements: MeasurementSpec[];
  assumptions: string[];
  metadata: SimulationMetadata;
};
```

## Entity

```ts
type EntitySpec = {
  id: string;
  componentId: string;
  position?: [number, number, number];
  rotation?: [number, number, number];
  properties: Record<string, unknown>;
};
```

## Behavior

```ts
type BehaviorSpec = {
  id: string;
  componentId: string;
  target: string | string[];
  properties: Record<string, unknown>;
};
```

## Component manifest

```ts
type ComponentManifest = {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  environments: string[];
  tags: string[];
  properties: Record<string, PropertySchema>;
  capabilities: string[];
  requires: string[];
  actions: string[];
  outputs: string[];
  events: string[];
};
```

---

# 26. MVP Scope

The team should not attempt the full platform during the hackathon.

The goal is to prove the architecture.

## Core platform

- one component registry,
- one simulation DSL,
- one validator,
- one Apertus planner,
- existing simulation modification,
- save simulation,
- load simulation,
- simple gallery,
- remix simulation.

## Environments

- 2D canvas,
- 3D world,
- graph / visualization canvas.

## Components

Target approximately **40–60 high-quality components**, not hundreds.

Suggested rough allocation:

### Core / world — 8

```text
World2D
World3D
Ground
Clock
Camera
Gravity
Collision
SpatialGrid
```

### Visual entities — 10

```text
Cube
Sphere
Beam
Building
Citizen
Car
Tree
Road
Shop
House
```

### Physics / engineering — 8

```text
Mass
Force
Velocity
Friction
Spring
Stress
Breakable
Material
```

### Economy / society — 10

```text
Wallet
Inventory
Resource
Price
Transaction
Job
Salary
Need
Knowledge
SocialNetwork
```

### Behaviors — 8

```text
MoveTo
Wander
Seek
Avoid
Buy
Consume
ShareInformation
ChooseLowestCost
```

### UI / visualization — 10

```text
Slider
Button
Toggle
Counter
Graph
Heatmap
Vector
Label
Table
Timeline
```

The goal is:

> **A component architecture that could support hundreds of components, not hundreds of components during the hackathon.**

---

# 27. Non-Goals for the Hackathon

Do not attempt:

- engineering-grade structural analysis,
- complete CFD,
- a realistic national economy,
- thousands of LLM-driven citizens,
- arbitrary code execution,
- full Scratch replacement,
- advanced multiplayer,
- fully decentralized marketplace,
- production-grade plugin security,
- every academic subject,
- unlimited arbitrary simulation generation.

---

# 28. Benchmarks and Evaluation

The submission should evaluate Apertus, not only show polished demos.

Suggested test dataset:

```text
50–150 simulation creation prompts
50–100 modification prompts
20–50 ambiguous / unsupported prompts
```

Annotate expected:

- simulation family,
- representation,
- required components,
- required systems,
- intended modifications.

Metrics:

```text
valid_spec_rate
correct_component_selection
correct_target_selection
successful_modification_rate
validator_repair_success
latency
Apertus_calls
Laya_calls
tokens_used
unsupported_request_detection
```

Possible comparison:

```text
Apertus only
vs
Apertus + component retrieval
vs
Apertus + validator
vs
Apertus + Laya routing
```

Useful research question:

> **How much capability can a relatively small open model gain when complex simulation generation is reframed as structured composition over trusted tools?**

---

# 29. Role of the Non-Technical / Research Teammate

Useful tasks:

- build prompt datasets,
- annotate expected simulation categories,
- define edge cases,
- build golden test sets,
- manually evaluate generated simulations,
- identify invalid or misleading outputs,
- categorize model failures,
- maintain experiment logs,
- write documentation,
- help define assumptions,
- prepare demo scenarios,
- write Devpost submission,
- prepare presentation,
- contribute to paper-style project report.

---

# 30. UI Pages

Suggested MVP pages:

## `/`

Prompt / create page.

## `/playground/:id`

Main simulation editor.

```text
┌─────────────────────────────────────────────────────┐
│ Simulation title                                    │
├──────────────┬──────────────────────┬───────────────┤
│ Components   │                      │ Properties    │
│              │    Simulation        │               │
│              │      Canvas          │               │
│              │                      │               │
├──────────────┴──────────────────────┴───────────────┤
│ Ask Apertus to modify the simulation...         ➤  │
└─────────────────────────────────────────────────────┘
```

## `/explore`

Community simulations.

## `/components`

Component marketplace / registry.

## `/components/:id`

Component details, manifest, inputs, outputs, usage examples.

---

# 31. Main Playground Editor

Recommended layout:

### Left sidebar

- component browser,
- hierarchy,
- systems,
- behaviors.

### Center

- simulation canvas,
- play/pause,
- reset,
- camera controls.

### Right sidebar

- selected object,
- properties,
- active behaviors,
- measurements,
- assumptions.

### Bottom

Natural-language command field:

```text
Ask Apertus to change the simulation...
```

---

# 32. Example End-to-End Flow

User:

> Create a town with two bakeries and 30 residents.

Apertus:

1. chooses `World3D`,
2. retrieves `Citizen`, `House`, `Bakery`, `Road`,
3. adds `Wallet`, `Inventory`, `Need`,
4. adds `Buy`, `MoveTo`, `ChooseShop`,
5. adds `Clock`,
6. generates a valid spec.

Runtime:

- places buildings,
- generates residents,
- runs schedules,
- tracks transactions.

User:

> Make bakery B cheaper.

Laya may classify:

```text
MODIFY_PROPERTY
```

Apertus / parser identifies:

```text
target: bakery_b
property: price
direction: decrease
```

Runtime applies it.

User:

> Only let five residents know about bakery B.

System adds:

```text
Knowledge
```

and updates initial knowledge states.

User:

> Let people tell their friends.

System adds:

```text
SocialNetwork
ShareInformation
```

Now information spreads.

The simulation can graph:

```text
awareness_of_bakery_b
customers_per_shop
average_price_paid
```

This is an ideal demo because each command visibly adds a system.

---

# 33. Save and Remix Flow

After building:

```text
[ Save Simulation ]
```

User enters:

```text
Title:
Two-Bakery Town

Description:
Explore how price and information affect shopping behavior.

Visibility:
Public
```

Published to Explore.

Another user clicks:

```text
REMIX
```

Then types:

> Add a third bakery with expensive bread but much shorter travel distance.

A new simulation is saved with:

```text
remixed_from: two_bakery_town
```

---

# 34. Raspberry Pi / Offline Goal

Desired deployment:

```text
Phone ─┐
Laptop ├──── Wi-Fi / LAN ─── Raspberry Pi
Tablet ┘                         │
                                 ├ Web server
                                 ├ Simulation registry
                                 ├ Apertus runtime
                                 └ Local assets
```

Students connect in a browser.

Possible local hostname:

```text
playground.local
```

Important:

Do not claim full offline operation until model inference and dependencies are actually tested on target hardware.

The browser should perform as much rendering and simulation work as possible.

The Pi should primarily provide:

- model inference,
- specifications,
- component metadata,
- static assets,
- and community/local storage.

---

# 35. Success Criteria

The MVP is successful if all of the following work:

## Creation

A user can describe a supported simulation and get a valid interactive result.

## Modification

A follow-up command modifies the existing simulation correctly.

## Composition

At least three different domains use the same underlying component architecture.

## Inspectability

The user can inspect which components and systems are active.

## Editing

The user can manually change at least basic properties.

## Saving

A simulation can be saved and reopened.

## Remixing

A published simulation can be duplicated and changed.

## Validation

Invalid Apertus output is caught before execution.

## Community

At least a basic simulation gallery exists.

## Evaluation

The team can report measurable results on prompt-to-spec reliability.

---

# 36. Hackathon Demo Script

## Part 1 — Physics

Type:

> Show how projectile angle affects distance.

Simulation appears.

Then:

> Compare 30° and 60°.

Two trajectories appear.

Then:

> Make gravity like the Moon.

Both update.

Point:

> Apertus is not calculating projectile motion. It is composing trusted components.

## Part 2 — Engineering

Type:

> Build a truss bridge and put a truck on it.

Bridge appears.

Then:

> Make the truck heavier.

Stress overlay changes.

Then:

> Replace steel with wood.

Simulation changes.

Point:

> Same composition system, completely different domain.

## Part 3 — Society / Economics

Type:

> Create a town with two bakeries and 40 residents.

Town appears.

Then:

> Make bakery B cheaper, but only tell five residents about it.

Only a few agents initially know.

Then:

> Let them tell their friends.

Information spreads.

Charts change.

Point:

> Components are not only visual. Wallets, knowledge, prices, relationships, and behaviors are reusable primitives too.

## Part 4 — Community

Click:

```text
Save → Publish
```

Open Explore.

Show:

```text
Town Economy
by Team
[ Run ] [ Remix ] [ View Components ]
```

Click Remix.

Point:

> Anyone can build on simulations and components, like Scratch.

---

# 37. Core Technical Narrative

The technical story should remain simple:

```text
Apertus is not the simulator.

Apertus is the composer.
```

The simulator consists of reusable deterministic systems.

The innovation is converting broad natural-language intent into a validated simulation specification using an open model.

The long-term value comes from the community component ecosystem.

---

# 38. Most Important Product Principle

> **The model should choose from capabilities; the runtime should provide truth.**

Examples:

```text
Apertus:
"Use a steel beam."

Runtime:
calculates stress.
```

```text
Apertus:
"Add a wallet to every citizen."

Runtime:
maintains balances.
```

```text
Apertus:
"Let citizens choose the cheapest known shop."

Runtime:
executes the decision rule.
```

```text
Apertus:
"Create a gas diffusion experiment."

Runtime:
runs the diffusion model.
```

This keeps the system reliable and allows Apertus to remain relatively small.

---

# 39. Suggested First Build Order

## Phase 1 — Foundation

1. Define `ComponentManifest`.
2. Define `SimulationSpec`.
3. Build component registry.
4. Build validator.
5. Build runtime loader.
6. Build basic 2D and 3D environments.

## Phase 2 — AI composition

7. Add Apertus planner.
8. Retrieve relevant component manifests.
9. Generate structured specs.
10. Validate specs.
11. Add repair loop.

## Phase 3 — Modification

12. Add simulation operations.
13. Support follow-up natural-language commands.
14. Support object/property targeting.

## Phase 4 — Demos

15. Projectile demo.
16. Bridge demo.
17. Town economy demo.

## Phase 5 — Community

18. Save simulation.
19. Publish simulation.
20. Explore page.
21. Remix.

## Phase 6 — Evaluation

22. Build prompt benchmark.
23. Measure valid-spec rate.
24. Compare routing approaches.
25. Document failures.

---

# 40. Final Product Definition

Apertus Playground should ultimately feel like:

> **A simulation engine, a visual programming environment, and a community creation platform — with Apertus acting as the natural-language interface that makes all of those capabilities accessible.**

The platform should not be judged by how much code the AI can generate.

It should be judged by:

- how reliably users can turn ideas into interactive systems,
- how easily simulations can be inspected and modified,
- how reusable the component ecosystem is,
- how well the system works with a smaller open model,
- and how much complexity is delegated to deterministic tools rather than hallucinated by the model.

That is the core project.
