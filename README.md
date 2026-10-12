# Apertus Playground — repository development guide

Apertus Playground is a browser application for creating, running, inspecting, remixing, saving, and sharing interactive teaching simulations. Users can open a prepared lesson, build one from components, or describe an experiment in natural language and let an AI model assemble supported components.

The central design rule is: **AI interprets intent and configures components; application code validates the composition and runs its mechanics.** A language model does not calculate every animation frame or generate unrestricted JavaScript for the browser to execute.

This guide describes the working tree inspected on **11 October 2026**, including the recent Earth and atmosphere additions. It covers implementation responsibilities and limitations, rather than claiming that every feature mentioned in historical plans has shipped. Existing uncommitted changes were included in the inspection. The commands below are verification entry points; this documentation task did not rerun the application or its test suites.

## Contents

1. [Product experience](#1-product-experience)
2. [Repository and technology](#2-repository-and-technology)
3. [Component architecture](#3-component-architecture)
4. [Recipes, documents, and runtime](#4-recipes-documents-and-runtime)
5. [Visual experiment builder](#5-visual-experiment-builder)
6. [Implemented simulations](#6-implemented-simulations)
7. [AI generation and composition](#7-ai-generation-and-composition)
8. [Model providers and local inference](#8-model-providers-and-local-inference)
9. [AI agents and debates](#9-ai-agents-and-debates)
10. [Accounts, persistence, and recovery](#10-accounts-persistence-and-recovery)
11. [Projects and community publishing](#11-projects-and-community-publishing)
12. [API responsibilities](#12-api-responsibilities)
13. [Running and configuring the project](#13-running-and-configuring-the-project)
14. [Verification and evidence](#14-verification-and-evidence)
15. [Implementation boundaries](#15-implementation-boundaries)
16. [Extending the repository](#16-extending-the-repository)
17. [Further documentation](#17-further-documentation)

## 1. Product experience

### Landing page and experiments

The landing page introduces the playground and accepts a natural-language experiment request. The experiment interface combines the lesson catalog, active lesson, prompt interaction, and workspace actions. A prepared lesson includes a question or instruction, an interactive scene, relevant controls, and observations that respond to accepted model changes.

The main application routes are:

| Route | Responsibility |
| --- | --- |
| `/` | Landing page and entry into prompt-driven exploration. |
| `/experiments` | Prepared experiment catalog and active lesson workspace. |
| `/experiments?experiment=<slug>` | Open a specific catalog experiment, such as `projectile` or `weather-formation`. |
| `/experiments/builder` | Visual authoring workspace. |
| `/projects` | Saved project management. |
| `/community` | Browse published experiments and reusable compositions. |
| `/community/<publicationId>` | Inspect a publication and its reuse options. |
| `/auth/sign-in`, `/auth/sign-up` | Authentication interface. |
| `/auth/forgot-password`, `/auth/reset-password`, `/auth/verify-email` | Interfaces for account recovery and verification; their delivery flow remains incomplete. |
| `/playground` | Compatibility redirect to `/experiments`. |

The implementation lives in [`src/web/src/app`](src/web/src/app). Shared application controls include the command bar, account control, publish dialog, name availability feedback, and unsaved-work dialog.

### Three ways to create a lesson

**Prepared lessons** provide an immediate starting point with supported models and deliberately arranged controls. Their native recipe files also serve as reusable examples of the authoring format.

**Manual authoring** starts with a canvas and adds registered models, views, controls, displays, appearance components, and reusable composites. Authors configure the lesson without needing inference services.

**AI authoring** translates a request into a supported recipe or a sequence of typed authoring operations. The resulting lesson uses the same runtime and learner renderer as manual content. Follow-up requests can change the authored starting configuration or issue supported commands against the current running instance.

The distinction between creating a lesson and exploring it is deliberate. Moving a learner control changes the current simulation state; it does not automatically rewrite the saved lesson's starting values.

## 2. Repository and technology

```text
project/
├── README.md                     This development guide
├── Makefile                      Web/inference startup and shutdown
├── docs/
│   ├── COMPONENT_ARCHITECTURE.md  Architecture and responsibility vocabulary
│   ├── MANUAL_EXPERIMENT_BUILDER.md
│   ├── PROMPT_CATALOG.md          Request examples and capability ambitions
│   └── agent-only/                Designs, contracts, plans, and evidence
└── src/
    ├── inference/
    │   ├── serve_apertus.py       Local Apertus MLX runner
    │   ├── laya/                  Local decision-model HTTP service
    │   ├── tests/                 Laya service tests
    │   └── Makefile               Python setup and smoke checks
    └── web/
        ├── src/app/              Next.js pages and HTTP routes
        ├── src/lib/              Planner, providers, auth, database, projects
        ├── src/simulations/
        │   ├── builder/          Visual editing and document persistence
        │   ├── components/       Definitions, controls, systems, and views
        │   ├── domains/          Explicit domain model contributions
        │   ├── pre-made/         Prepared recipes and town integration
        │   └── runtime/          Validation, authoring, sessions, agents
        └── scripts/              Recipe generator and sanity check
```

The web package currently declares Next.js **16.3.8**, React **19.2.8**, TypeScript, Three.js **0.186.1**, React Three Fiber, Drei, Framer Motion, Zustand, MongoDB, and NextAuth. These are repository dependency declarations, not claims about the latest available releases. The package manager is pinned to **pnpm 10.14.0**.

Next.js hosts both the frontend and the server-side provider, persistence, and authentication endpoints. React renders lesson and editor interfaces. Three.js and its React integrations support spatial scenes; SVG and other browser views serve diagrams, graphs, and 2D models. Biome supplies formatting and lint checks; Playwright supports browser verification. The Next configuration enables the React compiler and allows browser tests to isolate their build output with `APERTUS_BROWSER_TEST_DIR`.

Python is used for local inference services. The local Apertus setup targets Apple Silicon with Python 3.12 and MLX. Laya is packaged separately with a FastAPI service and its own virtual environment.

## 3. Component architecture

### Responsibility vocabulary

The architecture defines nine component responsibilities. These are concepts for organizing the code, not nine separate plugin frameworks.

| Type | Responsibility | Repository examples |
| --- | --- | --- |
| Resource | Shared data, definitions, or presets. | Gravity presets, schedules, task definitions, appearance settings. |
| Trait | An instance's configuration or changing state. | Transform, launch settings, navigation agent, gas state, agent memory. |
| Behavior | Declarative sequences or decisions using supported actions. | Daily routine, scheduled trip, agent activation. |
| System | Model calculations and mechanics. | Ballistic motion, navigation, cycle transfers, teaching-stage updates. |
| Visual | Translate model state into an object's appearance. | Citizens, bridge members, fraction bars, scientific scene elements. |
| View | Present a world or dataset. | 3D world, SVG world, graphs, results tables, inspectors. |
| Control | Turn learner input into a typed command. | Sliders, number fields, toggles, selections, action buttons. |
| Prefab | Reusable entity or model assembly. | Projectile, truss, pendulum, science investigation. |
| Composition | Arrange a complete experiment from components. | Prepared lesson or author-created multi-component lab. |

An **entity** is a specific instance, a **world** holds running model context, and the **runtime** validates, instantiates, updates, and routes operations. A prefab describes what to instantiate; a composition describes the experiment surrounding those instances.

### The public catalog

The public authoring catalog in [`components/catalog/index.ts`](src/web/src/simulations/components/catalog/index.ts) combines generic, learning, spatial, agent, science, cycle, collective, Earth, resource, and authoring definitions. It also adapts existing object definitions and domain models into the public contract. Duplicate definition identifiers are rejected.

A public definition describes its identifier and version, configuration schema and defaults, discovery metadata, typed input/output ports, commands, placement rules, lifecycle, assumptions, and the registered runtime or presentation provider that implements it.

This lets the builder and AI planner discover the same vocabulary. A component appearing in a search result is backed by a contract and an adapter rather than just a descriptive name.

### Typed connections and scopes

Connections distinguish **values**, **commands**, and **attachments**. Ports describe their data kind, units, cardinality, and whether an observation can cross scopes. Command arguments also have schemas.

A scope identifies the model context in which connected components operate. Two copies of the same prefab should maintain independent state. A display can observe a compatible result across scopes when permitted, while commands and spatial relationships need the appropriate target scope.

These rules prevent plausible-looking but invalid graphs: a control must address a real command, a readout must consume a compatible output, and an attachment must connect to a compatible host. Presentation components read accepted model state; changing lighting or camera settings should not change the model's calculated result.

## 4. Recipes, documents, and runtime

### Saved representations

The repository contains multiple representations because the authoring model has evolved:

- `ExperimentDocument` supports document versions **1, 2, and 3** and stores lesson text, authored or legacy scene data, presentation, and editor state.
- `AuthoredDocument` represents the public component graph: nodes, connections, scopes, layouts, and associated authoring metadata.
- `CompositeRecipe` packages an authored document with identity, versioning, dependencies, reusable interface metadata, and recipe information.
- Compatibility recipes and legacy scene structures remain available for migration and older saved content.

See [`builder/document/types.ts`](src/web/src/simulations/builder/document/types.ts) and [`runtime/authoring/types.ts`](src/web/src/simulations/runtime/authoring/types.ts). These file formats have different purposes; storage revisions and publication versions are separate again.

Native recipes are parsed, migrated where supported, and validated before use. The prepared recipe registry is generated from recipe files, with explicit compatibility handling. JSON import is therefore a structured content path, not a mechanism for importing arbitrary executable code.

### Model contributions

[`runtime/assembly.ts`](src/web/src/simulations/runtime/assembly.ts) explicitly integrates eleven domain contributions: math foundations, chemistry, physical systems, natural systems, dynamic systems, ecology, social systems, science, biogeochemistry, collective systems, and Earth/atmosphere.

A domain model contributes configuration, defaults, outputs, actions, assumptions, and runtime behavior. The assembly also declares the presentation contracts with real adapters. Explicit registration makes integration reviewable and avoids domain modules silently changing a global registry on import.

### From recipe to running lesson

```text
Prepared recipe / imported recipe / builder document / accepted AI result
                                  |
                         migrate and validate
                                  |
                   resolve definitions and providers
                                  |
                    instantiate scoped model state
                                  |
                  route typed commands and updates
                                  |
                    publish accepted observations
                                  |
                 render scene, controls, and results
```

The shared lesson renderer is [`RecipeLesson.tsx`](src/web/src/simulations/components/views/RecipeLesson.tsx). Supporting code handles node presentation, layout, appearance, control binding, observations, snapshot adapters, and canvases. Specialized sessions remain for projectile, gas, town, bridge, math, elementary activities, assemblies, and recipes.

### Lifecycle and transactions

Commands distinguish live updates, relaunches, and rebuilds. A change to a dynamic starting condition may restart a model, while a selection or visual adjustment can be live. Reset restores the authored initial configuration.

Authoring operations pass through validated transactions with a draft identity, expected revision, and operation identity. This supports atomic changes and rejection of stale or invalid edits. Runtime command routing similarly addresses an explicit node and scope rather than allowing a model response to mutate arbitrary application state.

## 5. Visual experiment builder

### Shared editing surface

The builder retains setup, history, saving, recovery, and import/export responsibilities, then opens the shared `CompositionBuilder` for editable content. The graph is derived from the authored document rather than maintained as a second independent source of truth.

The authoring workflow is: choose a 2D or 3D canvas, add components or a complete lab, configure their settings, connect compatible ports, arrange learner presentation, try the lesson, then save or export it.

The component library offers searchable registered content and reusable recipes. A complete lab generally brings its own content and canvas; a selected compatible destination can be reused when the insertion contract permits it. Invalid host or singleton bindings are rejected before insertion.

### Editing capabilities

The implemented editor includes component selection and settings, graph positioning, pan/zoom, connection creation and inspection, group/composite expansion, exposed composite interfaces, clipboard operations, validated insertion, undo/redo, lesson preview, recovery, and reusable composite saving.

Canvas, object, appearance, control, display, trip, binding, and layout settings have dedicated editors. Controls can be configured for supported widget types. Graph connection commands validate against the public definitions, and independent copied groups remap their identities and references.

Bridge authoring includes inspecting joints and member endpoints, moving the load, selecting members, changing supported topology, and previewing standard/dense/long regeneration before committing a transaction. Town authoring includes buildings, people, destinations, routines, world settings, appearance, and scenery.

### Spatial board and presentation

The spatial board supports manipulating authored spatial content and arranging learner-facing presentation. Drawing/decorative tools have their own editor and validation path. Board coordinates, graph coordinates, model settings, and presentation settings serve different purposes and should not be treated as interchangeable.

Learner layouts support containers such as rows, stacks, grids, panels, tabs, disclosures, splits, and repeaters. Responsive layout helpers adapt presentation for smaller screens. Controls, displays, and scene appearance are shared between author preview and learner playback, reducing disagreement between the editor and the saved lesson.

### Recovery and history

Authored history captures edits for undo/redo. Draft recovery stores recoverable local snapshots separately from explicit saves. Incomplete documents can remain editable without pretending to be runnable lessons. Legacy import recovery can preserve an original representation when some bindings cannot be supported by the new graph.

See [`builder`](src/web/src/simulations/builder), [`runtime/authoring`](src/web/src/simulations/runtime/authoring), and the [manual builder guide](docs/MANUAL_EXPERIMENT_BUILDER.md).

## 6. Implemented simulations

There are two useful inventories: prepared catalog lessons and reusable registered models. A domain model can exist in the builder without having its own prepared lesson. Conversely, legacy lessons such as the living town have an integration path outside the JSON recipe inventory. The tables below explain both.

### Mathematics and elementary learning

| Prepared lesson | Implemented exploration |
| --- | --- |
| Counting circles | Select and count individual objects. |
| Addition and subtraction | Explore sums and differences through circles and operation controls. |
| Equal groups | Distribute objects equally and observe group counts. |
| Fraction builder | Shade equal-sized wholes and compare represented fractions. |
| Fraction number line | Locate fractions and explore addition/subtraction on a line. |
| Area and perimeter | Change rectangle sides and compare inside area with boundary length. |
| Coordinate plotting | Relate x/y coordinates to a point in a Cartesian scene. |
| Ratios and percentages | Relate a selected part to the whole. |
| Probability trials | Compare repeated trial outcomes with the expected probability. |

Reusable math-foundation models additionally implement solving an equation, exploring line slope, and investigating the constant circumference-to-diameter ratio. Math-specific views, controls, tasks, and appearance resources provide teaching interactions without model inference during ordinary playback.

### Core physical and spatial experiments

**Projectile motion** compares trajectories, launch angles, and related flight observations. Ballistic model state drives the scene, trajectory, velocity arrows, controls, and measurements. It represents supported ballistic assumptions, not a universal rigid-body simulator.

**Gas pressure** uses independent container/sample state and relates configured gas properties and volume to pressure. It has dedicated controls and views as well as shared recipe support. The particle visualization is a teaching presentation; its existence alone does not establish molecular-dynamics fidelity.

**Truss bridge** represents joints, members, supports, load placement, and member response. Authors can inspect and regenerate supported topology. The response is a **heuristic teaching model**, not a certified structural solver or a promise of engineering deflection accuracy.

**Living town** renders citizens, buildings, roads, ground, scenery, and a market in 3D. Routines, navigation, scheduled trips, destination references, and an explicit clock control movement. It demonstrates authored behaviors and navigation; the broad economic-town examples in the original vision are not evidence that a general economy engine has been completed.

Reusable physical models extend this with **pendulum length comparisons**, **smooth/rough rolling tracks**, and **resistive circuits**. Their registered assumptions define the supported mechanics and comparison behavior.

### Chemistry, natural systems, and dynamic systems

| Domain | Registered models | Purpose |
| --- | --- | --- |
| Chemistry | Dilution, chemical equation conservation, reaction rate. | Explore concentration, atom accounting, and temperature-related rate changes. |
| Natural systems | Dye diffusion, predator/prey populations, plant resource limits. | Observe spreading, interacting population trends, and limiting resources. |
| Dynamic systems | Compound/simple growth, ring traffic, checkout queues. | Compare accumulation, stop-and-go behavior, and service capacity. |

These modules include domain state, systems, model definitions, controls, and presentation adapters. Their outputs and commands are registered into the shared assembly and public catalog. They are educational models with explicit assumptions; a chart or scene does not establish predictive accuracy for a real ecosystem, investment, road network, or queue.

### Ecology and social production

Prepared ecology lessons cover **nutrient limitation**, **wildfire and fuel treatment**, and a **food web**. Nutrient limitation compares a limited case with a balanced reference while holding other conditions fixed. Wildfire compares matched scenarios with and without prior treatment. The food-web lesson includes 18 named animals, feeding paths, and editable populations.

The **craft versus assembly-line** lesson compares eight independent craft workers with eight serial specialists over the same eight-hour shift. Its comparison depends on its production assumptions rather than asserting a universal result about workplaces.

### Life science and Earth science investigations

The science contribution contains nine prepared investigations:

| Lesson | Teaching question |
| --- | --- |
| Cell division | How are copied chromosomes distributed into daughter cells? |
| Immune defense | Why can a repeated exposure produce a different response? |
| Genome to organism | How do inherited variants and expression contribute to traits? |
| Pollination network | How do flower timing and visits affect compatible pollen transfer? |
| Invasive species | How does removal timing affect spread through habitat? |
| Inside Earth | Why does the lithosphere include more than the crust? |
| Plate boundaries | How do different interactions produce different landscapes? |
| Volcano life cycle | How do magma pathways create different deposits? |
| Water cycle | How does replacing vegetation with pavement change rainfall pathways? |

These are inspectable investigations with supported actions, stage/state outputs, observations, explanations, selected-object information, and recent authoritative model events. The scene and explanatory text follow accepted state rather than independently inventing an outcome.

### Biogeochemical cycles

**Carbon**, **nitrogen**, and **oxygen** cycle lessons model transfers between named stores and processes. Dedicated systems implement the transfer mechanics; model contracts expose supported observations; scene parts and lesson panels visualize them.

Carbon asks where carbon can go after uptake by a plant. Nitrogen explores how atmospheric nitrogen becomes available to plants. Oxygen explores changes such as reduced pond oxygen at night. These lessons connect visible pathways to model accounting while retaining their simplified teaching assumptions.

### Collective behavior and evolution

| Lesson | Implemented mechanism |
| --- | --- |
| Shared fishing lake | Five fishermen, daily reproduction, catch agreements, visibility, and reciprocal behavior. |
| Crowd flow and obstacles | Matched pedestrian crowds leaving through a narrow exit with conditional obstacle effects. |
| Alternate voting systems | Fixed individual preferences compared through first-past-the-post, ranked-choice instant runoff, and approval voting. |
| Natural selection | Camouflage-related survival, reproduction, inherited traits, random mutations, and distinct generations. |

These models have dedicated scenes, controls, and captions. Individual dots represent modeled participants or organisms; they are distinct from the language-model agents described later. Their outcomes come from registered mechanics and configured conditions.

### Recent Earth and atmosphere development

The current working tree integrates seven additional public models with prepared recipes, contextual action components, captions, planner teaching metadata, builder support, and verification scripts.

| Lesson / slug | Presentation and mechanism |
| --- | --- |
| Earthquakes / `earthquake-formation` | 3D fault blocks, camera presets, and 2D explanation/fallback for buildup and rupture. |
| Tsunamis / `tsunami-formation` | Offshore-to-coast section connecting seabed disturbance, propagation, and coastal stages. |
| Atmospheric layers / `atmosphere-ozone` | Altitude exploration, layer information, and ozone/UV investigation. |
| Greenhouse effect / `greenhouse-effect` | Sunlight and infrared energy paths with integrated teaching state. |
| Lightning / `lightning-formation` | Charge separation and staged channel development. |
| Rainbows / `rainbow-formation` | 3D observer geometry, 2D droplet optics, and fallback presentation. |
| Weather / `weather-formation` | Coastal, mountain, and frontal parcel-lifting scenarios. |

Earth/atmosphere models expose accepted state, captions, outputs, and typed setting/action commands through the shared runtime. The evidence guide identifies numerical or analytical checks for greenhouse integration, droplet optics, offshore wave speed, charge accounting, and parcel water accounting. Other processes include prescribed teaching stages.

These lessons explain causal relationships. They do not forecast earthquakes, inundation, lightning strikes, or future weather. See the [Earth and atmosphere implementation/evidence guide](docs/agent-only/implementation/027-validation/README.md) for the precise scope and verification workflow.

### Prepared recipe source

Prepared JSON recipes are under [`src/web/src/simulations/pre-made`](src/web/src/simulations/pre-made). The generated registry and the experiment catalog derive titles, descriptions, and ordering from registered recipe metadata, with compatibility entries for gas and town. Reusable labs and models may have broader builder availability than this prepared list.

## 7. AI generation and composition

### Planner responsibilities

The planner lives in [`src/web/src/lib/planner`](src/web/src/lib/planner). It separates intent parsing, capability retrieval, selection, contract loading, composition, argument construction, validation, coverage, progress, and diagnostics.

A typical request is processed as follows:

1. Parse the versioned request and active lesson context.
2. Interpret a compact teaching intent: concepts, interactions, and observations.
3. Retrieve supported capability cards and inspect a bounded shortlist.
4. Select a compatible capability through the configured selection path.
5. Ask the LLM for stage-specific arguments or typed authoring operations.
6. Execute those operations against a draft transaction and validate their effects.
7. Check explicit quantities, teaching coverage, construction quality, and final recipe validity.
8. Return a typed result that the client can apply to the shared lesson runtime.

Application code owns identifiers, binding construction, layout constraints, topology, and final validation. Schema-valid JSON still needs semantic validation: referencing a nonexistent node or producing incompatible bindings is invalid even when the JSON parses.

### Open composition and focused stages

The current implementation extends beyond the earlier narrow arithmetic/rectangle/bridge generation path. It includes public-catalog composition, staged construction, broader domain teaching metadata, and contextual follow-ups. Availability remains bounded by the registered vocabulary and adapters.

Focused prompts request the current stage's output instead of repeatedly asking for an entire expanded lesson. Format normalization handles bounded known envelopes, and repair prompts preserve prior accepted operations. Unsupported requests should yield explicit coverage or limitation information instead of claiming an absent mechanism exists.

### Authored changes versus runtime commands

A follow-up can alter the lesson definition or issue a live command. Changing the saved starting population is an authoring concern; advancing a stage or selecting an object can be a runtime action. The planner uses the active contract to choose and construct supported operations.

This separation preserves unrelated state and lets reset, undo, save, and reload retain meaningful behavior. The browser checks revisions and active context before accepting a result, so a delayed generation should not silently replace newer work.

### Current inference budgets

The limits in [`budget.ts`](src/web/src/lib/planner/budget.ts) and [`compositionPolicy.ts`](src/web/src/lib/planner/compositionPolicy.ts) are mode-dependent:

| Setting | Base budget | Composition budget |
| --- | --- | --- |
| LLM calls | 6 | 14 normally; 28 with `required-laya`. |
| Repairs | 2 | 3. |
| Turns | 10 | 10 normally; 24 with `required-laya`. |
| Decision selection calls | At most 1 | At most 1 through the shared selection budget. |
| Default total deadline | 120 seconds | 240 seconds when `required-laya` is configured. |

`PLANNER_TIMEOUT_MS` can override the deadline within the validated maximum of 600000 ms. Per-stage and operation policies add further bounds; these values are ceilings, not a promise that every request consumes the whole budget. Cancellation propagates through downstream HTTP work, although an already running local MLX computation cannot necessarily be interrupted.

Older documentation describing a universal six-call, two-repair, 120-second limit reflects an earlier path. Read current policy code when changing or diagnosing composition limits.

### Progress and diagnostics

`POST /api/apertus` supports incremental progress and construction updates as well as final results. Client-side progress parsing and builder AI integration provide feedback while the application assembles content. Construction previews are distinct from the accepted final lesson.

Local diagnostics report stage activity, provider/model identity, duration, decision activity, budgets, and normalized usage where available. Missing token usage remains unknown. Prompt traces are locally opt-in and disabled in production. Diagnostic visibility is evidence for what the application attempted, not proof that a generated teaching result is correct.

## 8. Model providers and local inference

### Text generation providers

Provider selection is server-side and deployment-wide. `LLM_PROVIDER` selects Apertus, OpenAI, or Anthropic. The common adapter contract supports structured requests, cancellation, bounded concurrency, error handling, and usage normalization.

| Provider | Repository transport / configuration |
| --- | --- |
| Local Apertus with MLX | OpenAI-compatible Chat Completions at the configured local base URL. |
| Local Apertus with Ollama | Compatible transport using the configured Ollama URL and model. |
| Hosted Apertus | Hugging Face-compatible endpoint with server-side token. |
| OpenAI | Responses API adapter with `store=false`. |
| Anthropic | Messages API adapter with separate system content. |

Common `LLM_*` variables override corresponding Apertus settings. `LLM_MODEL` overrides the Apertus-specific model variables when explicitly set. Provider changes require restarting the web server. The code does not silently switch to a different provider when one fails.

Structured-output `auto` mode uses native cloud schema formats and probes Apertus behavior. `strict-json` skips provider grammar support but retains parsing, application validation, and repair handling. Adapter schema transformations accommodate provider format restrictions; the original validators remain authoritative.

The exact cloud model must be available to the configured account. Defaults in repository configuration are implementation choices, not evidence of live account access or measured quality.

### Decision providers: Laya and Jev

`DECISION_PROVIDER` is independent of `LLM_PROVIDER`. The decision adapter selects from bounded options; it does not author the whole lesson or replace deterministic validation.

- **Laya** is a local service using `/api/decide` and `/api/status`.
- **Jev** is a hosted TypeSafe adapter using `/v1/systemone` with a server-side API key.

In optional hybrid selection, direct/unambiguous requests can skip decision configuration. Failed, unclear, malformed, or insufficiently confident selection falls back to the configured LLM planning path, subject to the same request budget. Cancellation propagates rather than becoming a fallback. There is no automatic Jev-to-Laya failover.

Probability and confidence acceptance checks are separate. Their configured thresholds are policy values, not measured accuracy guarantees. The `required-laya` composition policy explicitly requires hybrid mode, local Laya decision selection, and Apertus generation.

### Local Python services

The Apertus runner defaults to `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`, binds to loopback port **43101**, and downloads weights on first use. The setup target checks for Apple Silicon.

Laya defaults to `aac6fef/laya-multilingual-mlx` and loopback port **43102**. Its FastAPI startup loads the model asynchronously. Status reports loading/readiness/error plus model/device/timing information. Decision requests validate question types and criteria, bound request bodies, and reject calls until the runtime is ready.

The Python service accepts Choice, Score, and Noul question types; the current web capability-selection integration uses Choice questions. Laya service tests can exercise HTTP behavior without treating a live model run as a deterministic unit test.

## 9. AI agents and debates

The repository implements bounded language-model agent runs separately from ordinary simulations. Prepared examples include **two perspectives on city travel** and a **three-versus-three debate**.

An agent run stores configuration, owner, revision, model identity, next actor, status, events, memory, plans, metrics, pending reservation, and attempt receipts. The runner validates proposals and commits accepted events. The scheduler bounds queued work; reservations and fencing help prevent stale work from committing after ownership of a step changes.

The core proposal contract includes speech and metric actions, but the public HTTP adapter currently admits **communication actions only**. This distinction matters: the existence of an internal proposal type does not grant HTTP clients arbitrary tool capabilities.

Runs advance through explicit steps. Debate scenarios apply rules for actor selection, sequential public visibility, word/output bounds, and the shared motion. Personality configuration changes model context; model statements remain generated speech rather than verified scientific conclusions.

Guest runs use process-memory persistence and scoped bearer handles. Account runs use MongoDB and verified sessions. A process restart can lose guest runs. Provider identity is retained for a run rather than silently migrating an ongoing conversation when deployment settings change.

See [`runtime/agents`](src/web/src/simulations/runtime/agents), [`lib/agents`](src/web/src/lib/agents), and [`AgentSystems.ts`](src/web/src/simulations/components/systems/AgentSystems.ts).

## 10. Accounts, persistence, and recovery

### Authentication

NextAuth uses encrypted JWT sessions with the MongoDB adapter for identities and linked Google accounts. The server also registers a credentials provider for password authorization. Library access rechecks account existence and session version against MongoDB.

The custom auth interface includes an animated physics background, pause/resume behavior, and reduced-motion support. Google OAuth requires configured credentials and the correct callback origin.

**Account-flow limitation:** registration, email verification, and password recovery have interface and account-service groundwork, including a delivery callback contract, but the corresponding custom HTTP route wiring and email transport are absent. Do not interpret the forms as completed end-to-end email flows. Password authorization support is separate from a finished registration/delivery workflow.

### Guest and account libraries

Guests keep device-local experiment and reusable-component libraries. Signed-in users use MongoDB-backed persistence. Guest content is not automatically uploaded or merged into an account. Recovery remains local and account-separated; account changes reset the active workspace to avoid mixing identities.

Local storage saves validate whole snapshots and use Web Locks plus expected saved versions to coordinate cooperating tabs. Conflicts preserve existing data. Where safe concurrent saving cannot be guaranteed, export is the recovery path. Browser storage is still subject to clearing and device loss.

### Database responsibilities

| Collection group | Purpose |
| --- | --- |
| `users`, `accounts` | Identity, linked providers, optional password/link metadata, session versions. |
| `authLimits` | Expiring hashed rate-limit buckets for account operations. |
| `sessions` | Legacy database sessions; current JWT sessions do not rely on them. |
| `simulations`, `components` | Earlier account library records with full documents/recipes and optimistic revisions. |
| `projects` | Current private experiment/composition project records and metadata. |
| `communityPublications`, `publicationSeries` | Published snapshots and version-series bookkeeping. |
| `communityReports` | Publication reports with reporter/publication uniqueness. |

Agent account persistence has its own repository implementation. Collection initialization provides indexes and storage-envelope validators; application validators check complete content. Existing collection validators are not automatically replaced just because initialization code changes.

### Ownership and conflicts

Clients do not choose another user's owner identity. Server sessions determine ownership, and expected-account headers reject stale tabs after account changes. Mutation paths require the configured origin, JSON bodies, and bounded payload sizes. Private saves use expected revisions so concurrent writes fail with a conflict instead of silently overwriting newer work.

A save revision, recipe version, document format version, and publication version mean different things. Keeping them separate allows format migration without pretending a stale client is current.

## 11. Projects and community publishing

### Private projects

A project stores either an experiment document or a reusable composition. Metadata includes name, description, tags, sharing permission, save revision, timestamps, attribution, and its latest publication information.

The projects interface supports management through a dedicated client and repository. The HTTP service provides list/detail access, name checks, recovery access, create/update/delete, and publication creation. Owner migration adapts earlier account-library records to the project system.

Project indexes enforce identity and normalized-name uniqueness within the relevant owner/type scope. Create requests can use an idempotency key; updates require an expected revision. Portable representations and validation support structured import/export rather than arbitrary unvalidated blobs.

### Published snapshots

Publishing creates a **versioned snapshot** with its own publication identity, series, version number, author information, content hash, payload format version, timestamp, and attribution. The publication contract specifies **CC-BY-4.0**. A private save and a public publication are separate actions.

A publication can carry source attribution and additional source links for remixes. Public browsing supports query/tag/type/author filters, pagination, individual detail, and series listings. Withdrawal marks a publication as withdrawn. Signed-in users can submit reports, and a moderation script supports administration.

Publishing uses a MongoDB transaction for coordinated project/publication/series changes. **A replica set or Atlas deployment is required for publishing; standalone MongoDB supports private saves only.** This requirement is documented in `.env.example` and enforced by the repository's transaction error handling.

The presence of browse/report/moderation functionality does not imply a complete staffed moderation program or an unrestricted community plugin marketplace.

## 12. API responsibilities

| Endpoint | Responsibility |
| --- | --- |
| `POST /api/apertus` | Versioned generation/follow-up requests, progress/construction streaming, validated results. |
| `/api/planner-diagnostics` | Locally enabled planner diagnostic access. |
| `/api/auth/[...nextauth]` | NextAuth provider/session integration. |
| `GET/PUT /api/library/simulations` | Earlier authenticated experiment library persistence. |
| `GET/PUT /api/library/components` | Earlier authenticated reusable component persistence. |
| `GET/POST /api/projects` | List/create private projects. |
| `GET/PUT/DELETE /api/projects/<id>` | Read, update, or delete a private project. |
| `GET /api/projects/name-check` | Check relevant name availability. |
| `GET /api/projects/recovery` | Access project migration/recovery information. |
| `POST /api/projects/<id>/publications` | Publish a versioned snapshot. |
| `GET /api/community` | Browse public publications. |
| `GET /api/community/<id>` | Read a published snapshot. |
| `GET /api/community/series/<id>` | List publication-series entries. |
| `POST /api/community/<id>/withdraw` | Author withdrawal. |
| `POST /api/community/<id>/report` | Authenticated reporting. |
| `POST /api/agents` | Create/read/step/cancel an agent run through an operation envelope. |
| Laya `GET /api/status` | Local decision-model readiness. |
| Laya `POST /api/decide` | Local bounded decision inference. |

These are responsibilities rather than a complete client protocol reference. Request envelopes, query parameters, expected revisions, and validation rules live in the corresponding schema/HTTP modules. Laya routes belong to its separate Python service, not the Next.js origin.

## 13. Running and configuring the project

### Web app and manual lessons

From the repository root:

```sh
cp src/web/.env.example src/web/.env.local
make run-web
```

Open `http://localhost:43100`. Prepared deterministic lessons and manual authoring do not require a running LLM service. AI generation requires a valid provider configuration. Account saves and publishing additionally require authentication and database configuration.

The root default `make`, `make run`, and `make run-web` install the frozen pnpm dependencies and start development. `WEB_PORT` overrides the web port.

### Local Apertus

```sh
make -C src/inference setup
make run-apertus
```

Keep inference running in a separate terminal from the web server. The first model load requires weight downloads, enough disk space, and sufficient unified memory. The local setup targets an Apple Silicon Mac; another machine needs a suitable alternate provider.

### Optional local Laya

```sh
make -C src/inference setup-laya
make run-laya
```

For the explicitly required local composition configuration, keep both services running, then start:

```sh
make run-realistic
```

That target supplies hybrid mode, Laya decisions, Apertus generation, required-Laya composition, and a 20000 ms decision timeout.

### Configuration groups

| Group | Main variables |
| --- | --- |
| Text provider | `LLM_PROVIDER`, `LLM_MODEL`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`. |
| Local/hosted Apertus | `APERTUS_PROVIDER`, `APERTUS_LOCAL_RUNTIME`, `APERTUS_LOCAL_BASE_URL`, `APERTUS_LOCAL_MODEL`, `APERTUS_HF_BASE_URL`, `APERTUS_HF_MODEL`, `HF_TOKEN`. |
| Common LLM limits | `LLM_TIMEOUT_MS`, `LLM_MAX_TOKENS`, `LLM_MAX_CONCURRENT_REQUESTS`, `LLM_STRUCTURED_OUTPUT`, `LLM_CONTEXT_TOKENS`. |
| Planner | `PLANNER_MODE`, `COMPOSITION_DECISION_POLICY`, `PLANNER_TIMEOUT_MS`, `PLANNER_MAX_CONCURRENT_REQUESTS`. |
| Decision provider | `DECISION_PROVIDER`, `DECISION_TIMEOUT_MS`, acceptance/confidence gates, `LAYA_BASE_URL`, `TYPESAFE_API_KEY`, `JEV_BASE_URL`, `JEV_MODEL`. |
| Authentication/storage | `MONGODB_URI`, `MONGODB_DB_NAME`, `NEXTAUTH_SECRET`, `NEXTAUTH_URL`, Google OAuth credentials. |
| Local diagnostics | `PLANNER_DIAGNOSTICS`, `NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS`. |

Use [`src/web/.env.example`](src/web/.env.example) for exact defaults and comments. Keep credentials server-side. A hosted web server's loopback address points to itself, so it cannot access a laptop model service through `127.0.0.1`.

### Production build and shutdown

```sh
make build
make start
make stop
```

Build before starting production. Individual stop targets are `stop-web`, `stop-apertus`, and `stop-laya`. Local startup targets are development conveniences; Raspberry Pi/LAN deployment remains a stated direction rather than a demonstrated deployment artifact in this inspection.

## 14. Verification and evidence

Run the minimal web checks from `src/web`:

```sh
pnpm test
pnpm build
```

`pnpm test` checks recipe loading, save/reopen, serialization, rejected imports, and representative controls. Before the demo, manually check generate → interact → save → reload, plus one builder edit. Check sign-in, cloud saves, publishing, and agents if using them in the demo.

Run `pnpm recipes:generate` after adding or removing premade recipes. Historical verification reports remain in `docs/agent-only/implementation/`; their removed web scripts and commands are no longer part of the development workflow.

Local inference smoke checks remain available through `make -C src/inference smoke` and `make -C src/inference smoke-laya`.

## 15. Implementation boundaries

The implementation is substantial, but several boundaries remain important:

- AI composition is limited to registered models, commands, and adapters. A prompt cannot create missing physical mechanics merely by naming them.
- Bridge response and many scientific/social mechanisms are simplified teaching models. Their assumptions belong with the lesson.
- Recent Earth and atmosphere scenes include prescribed stages alongside numerical mechanisms; they are causal demonstrations rather than forecasts.
- Account registration, verification, and recovery need HTTP wiring and an email transport to become complete user flows.
- Google OAuth and hosted providers need real credentials and live verification; deterministic adapter tests cannot supply that evidence.
- Guest saves remain local; guest agent runs remain process-local. Neither is automatically durable account storage.
- Community publication requires transactional MongoDB support and explicit sharing permission.
- Legacy formats remain because older documents need migration/recovery; historical guides can describe superseded editor restrictions.
- The original project overview and prompt catalog contain future ambitions. They are not a checklist of fully delivered capabilities.

The strongest completed architectural result is a common content path: prepared lessons, manual authoring, and accepted AI composition share public contracts, validation, runtime providers, and learner presentation.

## 16. Extending the repository

A new simulation should enter through the existing contracts:

1. Define the supported model, parameters, commands, outputs, assumptions, and lifecycle in the relevant domain module.
2. Implement deterministic state changes in the appropriate systems/runtime layer.
3. Add real presentation and control adapters that read accepted model state.
4. Register the domain contribution and presentation contract explicitly.
5. Expose appropriate public catalog definitions, typed ports, teaching metadata, and insertion behavior.
6. Add a prepared native recipe when a catalog lesson is useful, then regenerate the registry with `pnpm recipes:generate`.
7. Verify model behavior, invalid-input rejection, independent copies, reset, import/export, builder editing, and a meaningful learner interaction.
8. Run live generation checks if the planner is expected to create or edit the new content.

This route preserves the project's central division of work. AI can compose more concepts as the trusted vocabulary grows, without becoming responsible for hidden mechanics or arbitrary browser execution.

## 17. Further documentation

| Document | Use it for |
| --- | --- |
| [Web README](src/web/README.md) | Detailed provider, account, persistence, and startup notes; some introductory scope statements predate current composition. |
| [Component architecture](docs/COMPONENT_ARCHITECTURE.md) | Responsibility vocabulary and foundational design decisions. |
| [Manual experiment builder](docs/MANUAL_EXPERIMENT_BUILDER.md) | Authoring workflow, editor boundaries, save/recovery guarantees, and historical reviews. |
| [Prompt catalog](docs/PROMPT_CATALOG.md) | Request examples and broader ambitions; check actual catalog support. |
| [Original project overview](docs/agent-only/OVERVIEW.md) | Hackathon pitch, long-term product vision, and planned direction. |
| [Component contracts](docs/agent-only/COMPONENT_CONTRACTS.md) | Internal component contract guidance. |
| [Implementation records](docs/agent-only/implementation) | Plans, refactors, source ledgers, and recorded verification. |
| [Earth/atmosphere evidence](docs/agent-only/implementation/027-validation/README.md) | Recent topic implementation, fidelity boundaries, and acceptance procedures. |

When a historical plan and the current implementation disagree, use the registered contracts, runtime adapters, HTTP handlers, and current verification scripts to determine what the application actually supports.
