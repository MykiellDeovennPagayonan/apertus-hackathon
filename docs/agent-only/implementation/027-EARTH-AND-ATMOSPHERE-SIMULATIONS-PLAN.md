# Seven Earth and atmosphere simulations: implementation and verification plan

Date: 2026-10-10  
Status: First-version implementation present. The [verification report](027-validation/REPORT.md) records actual acceptance, screenshot review and remaining limits; this plan does not itself claim acceptance.
Scope: earthquakes, tsunamis, atmosphere and ozone, greenhouse effect, lightning, rainbows, and weather.  
Primary audience: a first-time learner who enters a short ordinary question and expects an understandable interactive explanation.  
Evidence destination: `docs/agent-only/implementation/027-validation/`.

## 1. Mandatory UX requirement — read before implementation

> **Follow [IMPORTANT.md](IMPORTANT.md) throughout implementation and every review. “Simplicity must not be violated. The visuals should teach. Controls should make that learning easy. A technically correct simulation with an overwhelming interface is unfinished.”**
>
> **Do not declare these simulations finished because they run, the models are accurate, or tests pass. The actual generated lesson must open with one clear learning question, a dominant teaching visual, one short timely explanation, and one obvious primary next action. Remove unnecessary decisions and information.**

The following guides govern the work:

| Required guide | Apply it to |
| --- | --- |
| [001 — Experiment builder design philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md) | Clear tasks, predictable editing, hierarchy, spacing, progressive disclosure, and recovery |
| [002 — Component design philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md) | Shared visual foundations, purposeful component variants, state handling, host consistency, and accessible interaction |
| [003 — Simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md) | One learning question, justified controls, shared recipes, independently editable pieces, save/remix/Try lesson |
| [004 — Usability QA guide](../design/004-USABILITY-QA-GUIDE.md) | Inspect the opening before operating it, outcome-only tasks, evidence-backed findings, and honest review limits |
| [IMPORTANT — mandatory project requirement](IMPORTANT.md) | Removal test, actual Apertus and Laya review, screenshot inspection, simplify-and-review loop, and release blockers |

**Precedence:** IMPORTANT governs the presentation if a previous science brief, an existing reusable panel, or this plan's optional feature inventory would expose unnecessary complexity. The seven research briefs list possible controls and observations; they are not an opening-screen checklist. Re-read the guides when a lesson starts accumulating controls.

Opening review guardrail: one to three visible learner controls, counting buttons, selects, sliders, toggles, camera switches, and object-selector lists together. This is not a quota. Count competing workspace actions too, and keep them quiet. A lesson does not get an exemption because controls are placed inside the scene.

Apply the removal test to every proposed item: **if removing it does not prevent the intended task, remove it from the default experience.** A generic More menu containing an unnecessary dashboard fails the same test. A distinct later activity can have a clearly named entry point, with its own simple interface.

## 2. Outcome, scope, and dimensions

The first release delivers seven builder-native lessons and supports generating them from ordinary questions. The learner must not know component names, choose a rendering engine, specify graph connections, or write a detailed simulation prompt.

| Lesson | Research brief | First-release presentation | Main learning question |
| --- | --- | --- | --- |
| Earthquakes | [09](../simulations/science/09-EARTHQUAKE-FORMATION.md) | 3D fault block and synchronized 2D cutaway | Why can slow plate motion cause sudden shaking? |
| Tsunamis | [10](../simulations/science/10-TSUNAMI-FORMATION.md) | 2D ocean section; overhead inset only when explaining spread | How does a seabed disturbance affect a coast? |
| Atmosphere and ozone | [11](../simulations/science/11-ATMOSPHERE-LAYERS-AND-OZONE.md) | 2D altitude explorer and contextual UV close-up | What changes with altitude, and where does ozone protect us? |
| Greenhouse effect | [12](../simulations/science/12-GREENHOUSE-EFFECT.md) | 2D energy-flow scene | How do greenhouse gases affect energy escaping Earth? |
| Lightning | [13](../simulations/science/13-LIGHTNING-FORMATION.md) | 2D cloud cutaway and slowed discharge | What happens inside a cloud before a lightning flash? |
| Rainbows | [14](../simulations/science/14-RAINBOW-FORMATION.md) | 3D observer geometry and contextual 2D droplet inset | Why do we see a rainbow from particular positions? |
| Weather | [15](../simulations/science/15-WEATHER-FORMATION.md) | 2D parcel/landscape section and contextual weather map | How do heating, air movement, and moisture make weather? |

Build earthquakes as the first 3D slice and rainbows as the second. Both need keyboard-operable fixed views and a 2D fallback. The remaining lessons do not need a 3D mode for first release. A fallback communicates the same mechanism and assumptions, rather than displaying an inert poster.

Scientific references and limitations belong in the research briefs and domain contracts. Recheck references when choosing actual physical parameters. Short explanations should distinguish a computed relationship from a prescribed animation. Renderer detail must never imply model detail that does not exist.

## 3. Current repository foundations and implementation boundaries

The paths below were inspected for this plan. They are current integration points, not a promise that all proposed IDs already exist. Recheck them before implementation because other work may change the shared tree.

| Existing foundation | How this work uses it |
| --- | --- |
| `src/web/src/simulations/runtime/contribution.ts` | Implement versioned `DomainModel` contracts with initialize, apply, measure, configuration/reconfigure, and optional authoritative-clock step |
| `src/web/src/simulations/runtime/assembly.ts` | Add the domain to the explicit contribution list and register only implemented presentation adapters |
| `src/web/src/simulations/runtime/authoring/providers.ts` | Reuse the assembly-model provider bridge; avoid a second simulation engine inside React |
| `src/web/src/simulations/components/catalog/index.ts` | Register public definitions, compatible typed ports, discoverability, and configuration contracts |
| `src/web/src/simulations/components/catalog/explorationTeaching.ts` | Add teaching requirements, focused dependencies, selection keys, limitations, and scene-first composition guidance |
| `src/web/src/simulations/components/views/recipe/NodeView.tsx` | Route independent action, activity, and caption components through the existing recipe host |
| `src/web/src/simulations/components/views/recipe/RecipeAppearance.tsx` | Route the seven appearances to their actual views and consume accepted snapshots |
| `src/web/src/lib/planner/bucket.ts` | Retrieve relevant catalog cards from ordinary language and interpreted intent |
| `src/web/src/lib/planner/selection/compositionStrategy.ts` | Actual Laya topic selection with confidence/probability acceptance and an explicit no-fit choice |
| `src/web/src/lib/planner/compose.ts`, `focusedTurn.ts`, `compositionTools.ts`, `turnSchema.ts` | Actual Apertus typed authoring operations and bounded construction |
| `src/web/src/lib/planner/compositionQuality.ts`, `coverage.ts` | Runnable graph, required teaching pieces, request constraints, and supported/partial coverage |
| `src/web/src/lib/planner/browser.ts`, `constructionPublisher.ts` | Correlation, progress, stale-result protection, and accepted-result activation |
| `src/web/scripts/domains/science/` and `collective-and-evolution/` | Patterns for domain checks and browser evidence; do not blindly inherit old panel layouts or API-first acceptance claims |
| `src/inference/Makefile`, `serve_apertus.py`, `laya/` | Current local Apertus and Laya launch and readiness paths |

The repository has Three.js, React Three Fiber, and Drei dependencies. Inspect current scene/immersive hosts before extending them; dependency availability does not prove the new 3D host is suitable. Consult `src/web/AGENTS.md` and installed Next.js documentation before writing relevant application code.

Proposed organization:

```text
src/web/src/simulations/
  domains/earth-atmosphere/
    index.ts                 # Seven DomainModels and explicit contribution
    teaching.ts              # Bounded teaching profiles and defaults
  components/systems/earth-atmosphere/
    contracts.ts             # Shared event/selection contracts, not universal state
    earthquake.ts
    tsunami.ts
    atmosphere.ts
    greenhouse.ts
    lightning.ts
    rainbow.ts
    weather.ts
  components/catalog/earthAtmosphere.ts
  components/views/earth-atmosphere/
    LessonAction.tsx
    LessonCaption.tsx
    LessonActivity.tsx        # Only for actual supported secondary activities
    EarthquakeScene.tsx
    TsunamiScene.tsx
    AtmosphereScene.tsx
    GreenhouseScene.tsx
    LightningScene.tsx
    RainbowScene.tsx
    WeatherScene.tsx
    EarthScience3DHost.tsx    # Extract only if both 3D lessons share useful behavior
    earth-atmosphere.css
  pre-made/<seven corresponding lesson directories>/
src/web/scripts/domains/earth-atmosphere/
  cases.cjs
  verify.cjs
  browser.cjs
  live-ui.cjs
  builder.cjs
  replay.cjs
  evidence.cjs
```

These files are proposed, not implemented by this plan. Prefer existing shared controls, forms, and spatial-host behavior when their semantics fit. Extract shared code after the two representative lessons establish a real common need. Do not build an oversized abstraction with seven conditional dashboards.

## 4. The learner journey

### 4.1 From a short prompt to a lesson

1. Learner types “how do rainbows form?” in the ordinary prompt entry.
2. Preserve the exact text and create a correlated generation request. Recognize it as a request for an explanatory lesson without requiring the word simulation.
3. Show truthful progress through the existing generation flow. Use a brief message such as “Building a rainbow explanation.” Do not show model IDs, raw tool operations, speculative percentages, or a second loading dashboard.
4. Publish a runnable accepted lesson through the shared recipe/board pathway. Any construction preview must distinguish itself from an accepted runnable result.
5. Open on a meaningful starting scene with a short question and obvious action: “Follow the light.”
6. The first interaction visibly reveals the mechanism. A short caption describes the current visible change.
7. Offer the next relevant step or a named later investigation. Save/remix remains application functionality with quiet placement.

A basic question with an obvious subject should generate directly. Defaults fill omitted choices and are recorded as defaults, not user requirements. Ask for clarification only when materially distinct supported interpretations cannot be resolved from the request and active lesson.

### 4.2 Shared styling without identical layouts

Use application tokens rather than a new theme. Current design-guide reference values are `--bg: #eee9dc`, `--panel: #fffbef`, `--border: #d5cdbb`, `--text: #30362e`, `--accent: #285e56`; verify actual tokens at implementation time. Teal emphasizes the main action and current selection. Scientific colors distinguish phenomena and always have labels, shapes, patterns, or direction cues where meaning depends on the distinction.

Use the inherited sans-serif family. Start learner copy around 16px and important scene labels around 14px where space allows; these are layout targets to verify, not reasons to shrink content. Primary controls should have generous targets, with 44px as a working minimum. Reuse the 4/8/12/16/20/24px spacing rhythm and approximately 8px control radii. Keep borders and shadows purposeful.

The scene gets the largest uninterrupted region. A question, short caption, and action need little framing. Do not nest cards around every diagram, arrow, label, and input. Keep the prompt entry clear of the scene and action. The scene title and caption must not repeat the same text.

Schematic scientific drawings should use clear silhouettes, modest depth, and restrained motion. Avoid cinematic clouds, earthquake camera shake, bloom-heavy lightning, photorealistic water, or dense decorative particles that obscure the teaching mechanism. Visual beauty is useful when it improves recognition and reading.

### 4.3 State and access requirements

Design ready, progressing, paused, completed, changed-condition, selected-object, invalid-input, loading, unavailable-provider, and restored states as applicable. A missing model connection is a builder concern; learners receive a brief useful unavailable state, never raw port names.

Essential actions must work by keyboard and pointer. Direct manipulation gets a keyboard equivalent; camera preset selection gets visible labels. Reduced motion uses stable stages and explicit next-step actions without losing explanatory content. Do not announce every animation frame to screen readers; announce accepted important transitions.

Treat workspace pan/zoom, scene camera changes, presentation resizing, and scientific parameters as separate operations. Entering a 3D scene must have a predictable gesture policy and a clear way back. Resizing never changes physical values. A camera failure must preserve model state and support fallback.

## 5. New components and recipe contracts

### 5.1 Proposed public component inventory

All names below are proposed stable IDs. Confirm naming against catalog conventions before adding them; once saved recipes use them, preserve compatibility.

| Topic key | Model definition | Scene/appearance definition | Default separate learner pieces |
| --- | --- | --- | --- |
| `earthquake` | `models/EarthquakeFormation` | `appearance/earth-atmosphere-earthquake` | Action and caption |
| `tsunami` | `models/TsunamiFormation` | `appearance/earth-atmosphere-tsunami` | Action and caption |
| `atmosphere` | `models/AtmosphereLayersOzone` | `appearance/earth-atmosphere-atmosphere` | Altitude control and caption |
| `greenhouse` | `models/GreenhouseEffect` | `appearance/earth-atmosphere-greenhouse` | Action and caption |
| `lightning` | `models/LightningFormation` | `appearance/earth-atmosphere-lightning` | Action and caption |
| `rainbow` | `models/RainbowFormation` | `appearance/earth-atmosphere-rainbow` | Action and caption |
| `weather` | `models/WeatherFormation` | `appearance/earth-atmosphere-weather` | Action and caption |

Use `controls/earth-atmosphere-<topic>-action` and `displays/earth-atmosphere-<topic>-caption` for contextual actions and short accepted-state explanations. For atmosphere, the action component is the altitude control rather than an unnecessary extra button. Add topic-specific activity/choice components only for implemented investigations that need them. Camera-only controls belong to the view; observer movement in the rainbow lesson belongs to the model.

Do not automatically instantiate a numeric readout, chart, inspector, baseline card, or generic playback toolbar. Internal model outputs may exist without visible display components. Optional quantitative activities can add an independent readout or plot when the question requires it.

### 5.2 Ownership and typed connection shape

Each model owns physical/teaching state and validated actions. Each scene consumes a typed model snapshot. The action and caption are independent recipe nodes, independently selectable, movable, resizable, and editable in the builder. A larger shared scene may contain inseparable explanatory geometry, but must not lock all model settings and observations inside one React block.

```text
model.scene ──value──> action.value
model.scene ──value──> caption.value
model ──attachment──> appearance.model
action.event ──command──> model.action
scene selection event ──command──> model.select, when inspection is meaningful
```

Use distinct topic contracts such as `earth-atmosphere/rainbow` rather than accepting arbitrary records into every view. Each topic defines a bounded configuration schema, stable selected-object identities, legal stages, supported scenario/activity values, action timing, measurements, and presentation adapter. Add typed command names consistently with the current domain bridge; validate the actual argument shape at both the public event port and model boundary.

The runtime is authoritative. Components dispatch commands; they do not mutate the accepted snapshot. Rendering interpolates accepted states where helpful. Physical state must not depend on `requestAnimationFrame`, React effect count, camera movement, browser refresh rate, or screenshot timing. The runtime's clock advances continuous models with bounded integration steps.

Store authored configuration separately from transient camera/hover state. Define restart behavior per topic: preserve chosen conditions, clear the current run, and return to a meaningful starting state. Save/reopen guarantees authored configuration and presentation; preserve a running checkpoint only if supported explicitly by the existing persistence contract. Never imply undocumented live-state persistence.

### 5.3 Reusable presentation pieces

- **LessonAction:** one state-dependent action label and event mapping, with focus, disabled, pending, and reduced-motion behavior. Reuse styling; keep topic stage meanings in the domain.
- **LessonCaption:** one short state-based sentence. It must match visible accepted state, never speculative LLM narration. Contextual scientific caveats appear when relevant.
- **LessonActivity:** a named switch into a specific later task, not a catch-all settings drawer. Activity changes declare what restarts and preserve unrelated authored settings.
- **Contextual object annotation:** concise nearby explanation, dismissible without losing the task; no permanent object-ID inspector.
- **3D host behavior:** resize, camera fit, constrained orbit, explicit camera presets, context-loss handling, lazy loading, and gesture separation. Keep observer geometry outside camera state.

Use procedural geometry for these teaching scenes. Generated 3D assets and paid asset services are unnecessary for fault blocks, rays, droplets, and wave diagrams.

## 6. Earthquakes — detailed implementation slice

**Opening:** a large fault block with a surface marker crossing the fault and a small cutaway that reads from the same state. Question: “Why does the ground suddenly shake?” Primary action: **Move the plates**. No stress graph, station list, fault-type tabs, or universal playback controls.

**Sequence:** slow loading with the fault locked → exaggerated elastic deformation → rupture starts → rupture patch propagates → waves reach the surface → offset remains. During loading, caption: “The fault is stuck while the surrounding rock bends.” During rupture: “The fault slips, releasing energy as waves.” The primary action changes to the next relevant stage or Replay after completion. If animation runs, the same action can become Pause; reduced motion advances explicit stages.

**New scene pieces:** procedural two-block geometry, transparent/cutaway fault plane, deformation-grid overlay, stable surface reference, hypocenter/epicenter markers, and wavefront illustration. The wave overlay must not look like literal colored material. No camera shaking.

**Model:** documented spring-slider loading/failure rule and prescribed rupture propagation for an introductory preset. Store loading amount, deformation, rupture stage/extent, slip vector, released-energy indicator, and wave-arrival events. Keep loading time and rupture time separate and explicitly compressed. A later station activity uses travel times in a stated homogeneous-medium preset.

**Later activities:** “Compare fault movement” opens one fault-type choice with labeled fixed views; “Follow the waves” adds a selectable station and arrival illustration. Expose P/S labels only in that activity. Keep numerical magnitude out unless a justified source model computes it.

**Oracles:** deformation occurs before failure; rupture starts at the hypocenter and expands; epicenter projects vertically above it; slip directions match normal/reverse/strike-slip presets; surface and cutaway agree; P arrives before S in the stated preset; orbit/resize has zero effect on state.

**Outcome-only QA:** “Explain why slow movement can lead to sudden shaking.” For the later task: “Show how sideways fault movement differs from up-and-down movement.” Check whether the scene answers this without directing the reviewer to a control.

## 7. Tsunamis — detailed implementation slice

**Opening:** ocean cross-section with a fault, deep basin, shelf, and quiet coastline. Question: “How does a disturbance under the sea reach the coast?” Primary action: **Move the seabed**. Label vertical exaggeration near the section. No flood statistics or wave-height dashboard.

**Sequence:** seabed displacement → displaced water → long-wave travel → slowing and changing spacing over the shelf → prescribed coastal arrival → later wave arrivals. The caption follows the selected stage. Introduce an overhead wavefront inset only when explaining spread, and identify it as schematic if the model is one-dimensional.

**New scene pieces:** seabed profile, signed water-surface displacement, crest identity, shelf transition, a coastal observation marker, and map inset. Draw a surge/flood arrival rather than a surfing wave as the default.

**Model decision gate:** choose a documented long-wave model or precomputed scientifically reviewed teaching scenarios before polishing. In a quantitative propagation activity, `c ≈ sqrt(g*h)` is valid where the long-wave approximation applies. Do not infer inundation/run-up from that formula. Use a separately labeled prescribed coastal-arrival stage unless a tested wetting/drying model is implemented. Retain source, depth profile, wave-series timing, and declared scale conversions.

**Later activity:** “Compare ocean depths” presents one depth choice and a matched source. A fault-motion comparison changes actual displaced-water inputs, not just the earthquake illustration. Explain that other mechanisms can generate tsunamis without expanding first release into a landslide solver.

**Oracles:** greater depth yields faster propagation under the chosen approximation; source amplitude/sign affects the disturbance; coastal sequence contains later waves; retreat is not mandatory; map and section share time; no quantitative run-up claim is attached to a scripted flood graphic. Any numerical solver must have stability, boundary, and conservation checks appropriate to its method.

**Outcome-only QA:** “Explain why a small-looking wave offshore can be dangerous near land.” A learner must see the depth relationship without navigating settings or reading hazard metrics.

## 8. Atmosphere and ozone — detailed implementation slice

**Opening:** labeled vertical layer explorer with a probe near the surface. Question: “What changes as you go higher?” Primary interaction: **Altitude** with a draggable probe and accessible equivalent control. Show the current altitude once with its unit. No five-tab navigation, permanent temperature/density charts, or full chemical-reaction panel.

**Sequence:** move through troposphere → stratosphere → mesosphere → thermosphere → exosphere. A short caption names the meaningful condition at the current altitude. Once the probe reaches the stratosphere, offer **See how ozone protects us** as a contextual activity, replacing irrelevant controls in that mode.

**New scene pieces:** ordered layer bands, labeled compressed altitude scale, probe, ozone concentration gradient, and wavelength-distinguished radiation arrows. Use icons/examples sparingly. Ionosphere is an overlapping optional annotation, not a sixth sequential band.

**Model:** representative altitude/profile lookup with rounded, variable boundary labels; a separate bounded UV-transmission preset. Store physical altitude independently of displayed pixel position. UV-A/B/C have distinct supported behavior. Ozone depletion alters concentration/transmission, not atmospheric layer existence. If transmission is qualitative, do not print measured UV intensity or exposure risk.

**Later activity:** ozone view shows normal versus reduced ozone with one choice and one caption. Distinguish stratospheric ozone from ground-level pollution. Chemical depletion detail is a later explanation, not a default molecular simulator.

**Oracles:** ordered layers and profile interpolation are consistent; displayed compression preserves altitude mapping; ozone remains in the stratosphere; ionosphere overlaps; depletion does not open a hole; keyboard and pointer reach the same altitudes and meaningful states.

**Outcome-only QA:** “Find where ozone protects us and explain what changes if there is less of it.” Do not tell the reviewer to drag to a specific altitude.

## 9. Greenhouse effect — detailed implementation slice

**Opening:** space, atmosphere, and surface in a large 2D energy scene. Question: “How do greenhouse gases affect Earth's heat?” Primary action: **Follow the energy**. Use distinct labeled solar and thermal-infrared paths. No CO2 slider, global-temperature dashboard, or industrial background scene.

**Sequence:** incoming sunlight and reflection → surface absorption → outgoing infrared → atmospheric absorption/emission → energy escaping to space. Then offer **Add more greenhouse gas** as a concrete next investigation, with a brief explanation that the setting represents simplified infrared absorption.

**New scene pieces:** directed radiation paths, a contextual molecule-interaction inset, surface/atmosphere reservoirs, and an imbalance indicator that appears only in the comparison activity. Show emission upward and downward. Keep numbers secondary and only present if they answer the active question.

**Model:** two-reservoir, single-atmospheric-layer energy budget with heat capacity, fixed solar input, albedo, and bounded infrared absorptivity/emissivity. Derive fluxes and temperature updates from that model. Document simplifications and numerical integration. A no-infrared-absorption comparison is idealized, not a literal real atmosphere removed.

**Later activity:** compare baseline and enhanced absorption with sunlight and albedo fixed; show imbalance first, then approach to a new equilibrium. A reflectivity lesson is separate, so it does not introduce a second free variable by default. Do not assign a claimed temperature-per-CO2-ppm conversion to the absorption control.

**Oracles:** reservoir energy plus boundary flux accounting balances within stated numerical tolerance; greenhouse gas adds no energy source; both atmospheric emission directions exist; temperature changes over time; frame-rate and camera changes do not affect it; matched comparisons hold unrelated parameters fixed.

**Outcome-only QA:** “Explain why adding greenhouse gases can warm the surface even if the sunlight stays the same.” Ensure visible paths answer this and do not depict a reflecting glass roof.

## 10. Lightning — detailed implementation slice

**Opening:** large cloud cutaway with a few inspectable ice and graupel tracers and visible updraft direction. Question: “What happens before lightning flashes?” Primary action: **Watch charges separate**. No field-strength meter, flashing screen, charge histogram, or strike-target game.

**Sequence:** collisions → charge transfer → particles separate → charge regions emerge → leader grows → streamer connects → return-stroke front travels upward along the established channel → optional later stroke → thunder arrival. Keep one short caption per stage and reveal plus/minus symbols when needed.

**New scene pieces:** mixed-phase cloud cutaway, charge-tagged tracers, faint stepped leader, upward streamer, established-channel highlight, return-front progression, and a visual thunder cue. Charge labels must remain legible without color alone. Branches should teach channel development rather than decorative randomness.

**Model:** stage-based qualitative electrification and discharge with recorded transfer events, a representative charge structure, and a prescribed seeded channel. Track leader/streamer connection explicitly. Do not claim the branch generator predicts strike position or flash frequency. Lightning initiation and complex real charge structures remain outside the simplified rule.

**Later activity:** “Lightning inside a cloud” presents an intracloud sequence without a ground connection. “Why thunder comes later” uses one observer-distance control with fixed sound-speed assumptions. Keep this separate from cloud charging.

**Oracles:** charge transfers balance according to the stated model; separation precedes discharge; return stroke cannot occur before connection; its front travels upward on the connected path; intracloud mode does not fabricate ground contact; thunder delay increases with distance; reduced motion conveys every stage with no rapid strobe.

**Outcome-only QA:** “Explain what creates the electrical discharge and what travels upward during a ground flash.” Avoid relying on the reviewer already knowing leader terminology.

## 11. Rainbows — detailed implementation slice

**Opening:** observer view with Sun behind the observer and rain ahead, plus a quiet location cue. Question: “How do raindrops turn sunlight into a rainbow?” Primary action: **Follow the light**. No ray-angle dashboard, wavelength slider bank, or permanently exposed orbit toolbar.

**Sequence:** select an explanatory droplet → show 2D entry refraction → partial internal reflection → exit refraction → return to many-droplet geometry → reveal the observer's arc. The droplet inset appears as part of this activity, not a second competing lesson panel.

**New scene pieces:** procedural rain volume, labeled Sun direction, simulation eye position, contributing-droplet highlights, viewing cone, horizon clipping, and an enlarged 2D ray-path inset. Use a sampled continuous spectrum rather than treating seven bands as physically discrete.

**Model:** geometric optics with spherical droplets, documented wavelength-dependent refractive indices, Snell's law, and one internal reflection for the primary bow. Compute or precompute ray directions; determine contributing rays from the simulation observer's location. Store selected wavelength/path and reflection count separately from drawing scale.

**Critical ownership rule:** moving the simulation observer changes the physical viewing geometry. Orbiting the explanatory camera does not move the observer. The observer's visible bow must remain identifiable from an external camera. Never render a colored tube fixed at a landscape endpoint.

**Later activities:** “Move your viewpoint” offers keyboard/pointer observer movement; “Change the Sun's height” uses one solar-elevation choice; “See a second rainbow” adds the two-reflection branch and reversed color order. Present these sequentially, not as five simultaneous controls.

**Oracles:** entry/exit paths obey refraction; the relevant internal reflection is partial; primary/secondary use one/two reflections; color orders differ; observer movement changes contributing rays; explanatory-camera movement changes no physics; high Sun/horizon visibility follows geometry; fallback reproduces the lesson with linked side/plan views.

**Outcome-only QA:** “Explain why you cannot walk to the end of a rainbow.” Then: “Show what changes when the observer moves.” The scene must separate observer movement from camera navigation visibly.

## 12. Weather — detailed implementation slice

**Opening:** one sunny-coast parcel scene with land, sea, moisture, and a stable parcel identity. Question: “How do heating and moist air make weather?” Primary action: **Follow the air**. Do not begin with coast/mountain/front tabs, humidity/pressure/temperature controls, and a forecast dashboard together.

**Sequence:** unequal surface heating → schematic circulation → parcel ascent → expansion/cooling → saturation → cloud formation → particle growth/precipitation where supported. The caption explains the currently visible cause. A map appears only in a regional/front activity that benefits from it.

**New scene pieces:** coast section, tagged air parcel, wind arrows, cloud condensate stage, ridge scenario, and cold-front section/map pair. Differentiate water vapor, cloud droplets, and precipitation; never draw visible vapor dots as literal gas molecules unless explicitly illustrative.

**Model:** documented parcel temperature/moisture rules coupled to scenario-specific prescribed flow. Saturation controls condensation; altitude alone does not. Precipitation needs a separate simplified growth rule or an explicitly labeled scripted stage. Keep water transfers accounted for. State which wind field is prescribed; do not imply that a parcel calculation solves global atmospheric dynamics.

**Later activities:** “Air over a mountain” offers one initial-moisture control; “When air masses meet” offers a front scenario and linked map/section; “Day and night at the coast” offers a bounded heating preset. Preserve parcel identity through every transition.

**Oracles:** unsaturated/saturated states differ; changing initial moisture changes condensation consistently; the cloud does not automatically rain; terrain/front location agrees across views; precipitation cannot consume unavailable condensate; prescribed flow is labeled; playback speed does not change outcomes.

**Outcome-only QA:** “Explain why rising moist air can form a cloud, and why a cloud does not always rain.” Compare a drier mountain case without telling the reviewer which input to use.

## 13. Apertus and Laya integration

### 13.1 Provider responsibilities and bounded flow

The current strict composition path retrieves a component bucket and calls Laya for a supported topic decision, then Apertus authors typed operations. Preserve that separation:

```text
ordinary user question
  → Apertus bounded teaching-intent interpretation
  → catalog-backed shortlist, including required dependencies
  → actual Laya supported-topic decision and acceptance gates
  → focused Apertus authoring turns
  → schema/format checks → transaction → runnable/coverage/UX policy checks
  → accepted canonical recipe → shared app lesson
```

Laya selects among concise supported choices; it does not calculate physics, write React code, or produce a complete recipe. Apertus expresses intent and supplies valid authoring arguments; application code owns identities, graph execution, scientific rules, rendering, validation, and activation.

Add catalog cards with familiar titles, concise descriptions, ordinary synonyms, supported actions, declared assumptions, dependencies, and useful contrast groups. Important confusions include Earth interior versus atmosphere, plate boundaries versus earthquake rupture, water cycle versus weather, greenhouse warming versus ozone depletion, and optical rainbow versus color blending.

Give Laya meaningful relevant alternatives and a no-fit choice. The existing selector rejects contrast-only candidates outside retrieved capabilities; preserve that rule. Do not solve a retrieval failure by accepting an unavailable selection or weakening confidence gates. Avoid stuffing all seven detailed briefs into the inference context.

For “how do rainbows form?”, default to one explanatory rainbow model, its scene, one action, and one caption. Do not infer that the user requested every advanced parameter or a comparison. For “show a double rainbow,” preserve the requested secondary branch and its explanation. Record explicit request constraints separately from application defaults.

### 13.2 Composition guidance and enforcement

Update topic `compositionRequirements` with the right model, scene adapter, action/caption dependencies, selection key/group, and current-question guidance. Extend quality and coverage validation so a supported explanatory request cannot pass as a generic text panel, unrelated simulation, empty scene, or unwired action.

The current general composition prompt recommends controls and observation graphs broadly. Replace or qualify that advice so process explanations use only the active task's essential pieces. A useful scoped instruction is:

```text
The user may ask a short question such as "how do rainbows form?".
Build the supported interactive explanation without asking for component names.
Use one supported model, its teaching scene, one contextual primary action,
and one brief caption from accepted model state. Add a control or observation
only when the user's question needs it. Use the topic's declared defaults.
Keep scene, action, and caption independently editable in the recipe.
Preserve explicit requested phenomena and conditions. Do not invent unsupported
physics or expose authoring internals to the learner. Return only the valid
typed tool envelope required by the current schema.
```

This is an internal authoring instruction, not a prompt users must type. Validate capabilities and required graph connections deterministically. Any presentation guard should evaluate the active lesson profile and visibility, not ban valid builder configurations globally or count hidden model nodes as learner controls.

Reuse bounded repair and transaction paths. Syntax repair may fix format but cannot invent missing physical values, delete an explicit constraint, create unsupported capabilities, or skip runnable validation. Record every repair. A failed draft never replaces the current accepted lesson or becomes a successful save.

### 13.3 Current limits and local launch

At inspection, `GenerationBudget` allows one decision call; strict composition expands to at most 28 LLM calls, 24 turns, and three repairs. The required-Laya default planner deadline is 240,000ms. Recheck those values before implementation and optimize compact dependencies/operations before increasing budgets. Do not create a second Laya call inside an activity handler without an explicit reviewed budget change.

Run local services in separate terminals from the repository root:

```sh
make -C src/inference run-apertus
```

```sh
make -C src/inference run-laya
```

Readiness checks:

```sh
make -C src/inference smoke
make -C src/inference smoke-laya
```

The inspected default Apertus model is `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` on port 43101. Laya is on port 43102. Record actual served model identifiers/revisions and decoding capability rather than assuming configuration proves use. Existing configured models take precedence; do not silently substitute another provider or model to make tests pass.

An isolated local verification server can use the existing configuration keys:

```sh
cd src/web
COMPOSITION_DECISION_POLICY=required-laya \
PLANNER_MODE=hybrid DECISION_PROVIDER=laya LLM_PROVIDER=apertus \
APERTUS_PROVIDER=local APERTUS_LOCAL_RUNTIME=mlx \
APERTUS_LOCAL_BASE_URL=http://127.0.0.1:43101/v1 \
LAYA_BASE_URL=http://127.0.0.1:43102 \
DECISION_TIMEOUT_MS=20000 PLANNER_DIAGNOSTICS=true \
pnpm dev --hostname 127.0.0.1 --port 43110
```

If `LLM_MODEL` is set, it overrides the Apertus model selection in the current LLM config; record that resolved value. Keep diagnostics local/nonproduction and redact credentials from evidence. Read-only configuration inspection must not print secrets. Do not overwrite `.env.local` or start competing servers on occupied ports.

### 13.4 Failure UX and follow-ups

Provider unavailable: preserve the prompt and existing lesson, show a brief recovery message, and offer Retry. Unsupported physical forecasting: state the limit and offer a supported explanatory lesson without presenting it as the requested prediction. Low-confidence ambiguity: ask a concise relevant clarification rather than requiring a complete specification.

Within an active lesson, interpret “make the sun higher,” “show it slower,” or “show a second rainbow” using the accepted recipe and supported contracts. Preserve topic, authored placement, unrelated settings, and learning context. A request to change camera framing must not alter physical observer position. Cancellation and supersession must prevent late responses from activating.

## 14. Realistic prompt corpus

Use these exact ordinary prompts for acceptance. Do not append component names, desired model IDs, scientific keywords, hidden system hints, or a detailed rubric to the user input. The runner may have an expected-topic oracle, but that oracle must not be sent to inference.

| Topic | Primary prompt | Short paraphrase | Informal/typo variant |
| --- | --- | --- | --- |
| Earthquake | `how do earthquakes happen?` | `why does the ground shake` | `how earth quakes form` |
| Tsunami | `how does a tsunami form?` | `what causes tsunamis` | `show me tsunami` |
| Atmosphere | `what are the layers of the atmosphere?` | `show the atmosphere and ozone layer` | `earth air layers` |
| Greenhouse | `how does the greenhouse effect work?` | `why do greenhouse gases warm earth` | `green house effect` |
| Lightning | `how does lightning form?` | `where does lightning come from` | `how is lighting made in a storm` |
| Rainbow | `how do rainbows form?` | `why do we see a rainbow` | `show me rainbows` |
| Weather | `how is weather formed?` | `why do clouds and rain happen` | `how weather works` |

The misspelled lightning case has storm context; bare “lighting” may mean illumination and should not be forcibly mapped. The weather/clouds prompt can overlap the water cycle: record the selection and evaluate the intended mechanism, rather than declaring the existing water-cycle lesson wrong for every overlapping phrase.

Contextual follow-up corpus:

| Active lesson | Follow-up 1 | Follow-up 2 |
| --- | --- | --- |
| Earthquake | `show sideways movement` | `show it slower` |
| Tsunami | `what if the ocean is deeper` | `show the next wave` |
| Atmosphere | `where is the ozone layer` | `what if there is less ozone` |
| Greenhouse | `add more greenhouse gas` | `keep the sunlight the same` |
| Lightning | `show lightning inside the cloud` | `why is thunder later` |
| Rainbow | `show a double rainbow` | `make the sun higher` |
| Weather | `what happens over a mountain` | `make the air drier` |

Ambiguous/unsupported cases, with expected handling declared before testing:

- `ozone`: clarification or an explicitly scoped ozone introduction; must not claim a uniquely specified depletion experiment.
- `rainbow`: an optical introduction is a reasonable default; check relevance and simplicity.
- `earth layers`: existing Inside Earth is reasonable; do not force atmosphere because it is new.
- `predict tomorrow's earthquake`: unsupported prediction, preserve existing work.
- `will a tsunami hit my town today`: no real-time forecast claim; separate supported formation explanation from the unavailable forecast.
- `greenhouse effect because of the ozone hole`: correct the mistaken causal framing while teaching the requested process.
- `lightning is two clouds rubbing together right?`: explain the charging mechanism without copying the misconception.
- `simulate all weather on earth accurately`: supported limits or clarification, not a falsely comprehensive global model.

Include an active-topic correction such as “I meant ozone, not warming” to test replacement of the lesson's subject through normal authoring operations. Preserve the previous accepted recipe until replacement passes validation.

## 15. Numbered verification runs and screenshot evidence

### 15.1 Numbering rule — mandatory

**Every verification attempt gets a new global run directory, beginning with `001`.** A run is one identified scenario attempt, not an entire batch containing anonymous reruns. Retries, failed generations, cancelled attempts, browser-only premade reviews, and post-fix retests all consume a number. An internal bounded repair remains inside its original run and is recorded there.

Never reset numbering per topic, overwrite an older run, hide unsuccessful attempts, or reuse a completed run's directory after changing code. Use at least three digits: `001`, `002`, … `999`, `1000`. Record batch/round separately.

```text
docs/agent-only/implementation/027-validation/
  INDEX.md                         # All attempts, including failures and not-tested gaps
  PROMPTS.json                     # Frozen prompts, expected behavior, corpus revision
  SCREENSHOTS.md                   # Clickable opening/changed images with captions
  gallery.html                     # Local static contact sheet, ordered by run number
  IMPLEMENTATION-REPORT.md
  runs/
    001/
      manifest.json
      prompt.txt
      request.json
      response.json
      diagnostics.json
      accepted-recipe.json          # Only if accepted; no fabricated placeholder success
      assertions.json
      console.json
      network.json
      findings.md
      screenshots/
        01-prompt-submitted.png
        02-opening.png
        03-mechanism.png
        04-changed-condition.png
        05-builder.png
        06-try-lesson.png
        07-reopened.png
      trace.zip
    002/
      ...
```

Artifacts exist only when their stage was reached. An early failure gets a failure screenshot of the real page and a recorded reason why later captures are absent. Never substitute premade screenshots for a failed generated lesson. An interrupted run stays marked interrupted and keeps its partial evidence.

The proposed runner must atomically reserve the next number using exclusive directory creation; include all existing numeric directories when finding the next number, not just successful index entries. If a process races, retry allocation. Resume indexing incomplete runs, but start a new numbered attempt when retrying execution. Inspect existing files before allocating the first run.

During implementation, add `/docs/agent-only/implementation/027-validation/runs/` to `.gitignore` and verify it with `git check-ignore` before writing heavy evidence. Keep the small plan, review index, prompt corpus, and final report reviewable. Local screenshot links may target ignored artifacts; identify that they are retained locally and package the evidence if the user requests a portable handoff. Creating an empty `001` now would falsely suggest a test occurred, so this plan does not create one.

### 15.2 Manifest and index fields

Each manifest records:

- Global run number, batch ID, topic, exact prompt, prompt-corpus revision, fresh/follow-up state, parent run for a follow-up, and `supersedesRun` for a correction.
- Run kind: `premade-browser`, `live-ui`, `api-diagnostic`, `replay`, `fault-fixture`, or `builder-persistence`.
- Start/end timestamps, running/passed/failed/interrupted status, failure stage, and missing artifacts.
- Repository revision plus working-tree source fingerprint. Commit SHA alone cannot identify dirty source in this workspace.
- Runtime/model version, actual resolved providers/models/revisions where available, decoding mode, browser version, OS, route/origin, viewport, input method, motion preference, and seed/configuration.
- Request ID, Laya decision and acceptance, Apertus authoring traces, repairs, retries, durations, available token usage, and supported/partial coverage.
- Technical result, scientific result, inferred usability result, participant result if actually observed, screenshot review result, and outstanding severity.

`INDEX.md` gets one row per run with linked evidence, exact prompt, topic, code fingerprint, outcome, browser method, issue/fix summary, and retest linkage. `SCREENSHOTS.md` groups each opening and changed state by run number, including failed-run captures. The gallery must display the run number, prompt, status, and caption; a visual gallery alone is insufficient provenance.

### 15.3 Browser method and screenshot capture

Follow IMPORTANT: use Playwright MCP when available for the requested interaction/capture/review. If unavailable, use the available browser tooling or standalone Playwright, record the method accurately, and explicitly state **Playwright MCP was not used**. Do not infer MCP verification from installing Playwright as a dependency. Read any required browser skill before using its tools during implementation.

For every live-ui acceptance attempt:

1. Start a clean guest context for fresh generation; preserve the parent context deliberately for follow-up testing.
2. Type the exact corpus prompt through the actual app prompt entry and submit normally.
3. Save the submitted-prompt screenshot, correlated outgoing request, and real response/progress events. Do not route-intercept generation, inject a recipe, or call planner functions as a substitute.
4. Wait for a correlated lifecycle result with a bounded deadline. Avoid fixed sleeps that may capture an unrelated intermediate state.
5. Immediately fetch/store diagnostics because the inspected trace cache is bounded. Validate actual provider events rather than configuration flags.
6. Capture the accepted opening at a known starting state before operating it; inspect the screenshot directly.
7. Perform the topic's outcome-only task, record the action/result, and capture the meaningful mechanism state.
8. Run a supported changed-condition or secondary activity and capture its result. If not part of that run, record it as not tested rather than manufacturing a capture.
9. On designated persistence runs, enter the actual builder, select/edit the separate pieces, use Try lesson, save/reopen, and operate the reopened lesson. Capture those states.
10. Record console/network failures, viewport geometry, model agreement, focus/motion results, and review findings. Close with final manifest/index updates even when an assertion fails.

Use viewport captures for first-use layout review and scene crops only as additional detail. Capture 3D after a rendered frame with the relevant geometry present; a mounted canvas alone is insufficient. Preserve animated captures or traces when motion direction matters. Stage snapshots support reduced-motion review but do not prove normal animation behavior.

## 16. The implement → prompt → inspect → simplify loop

### 16.1 Per-topic development loop

1. Write one learning question, primary action, visible teaching change, and a control/information inventory. Apply the removal test before code.
2. Implement the smallest truthful model and builder-native scene/action/caption composition.
3. Run domain invariants and focused contract checks. Resolve scientific/connection failures before inference acceptance.
4. Reserve the next numbered browser run. Open the premade and inspect its first screen before interacting.
5. Perform the outcome-only task, save screenshots, and record unclear cues without using source knowledge to explain them away.
6. Fix the smallest cause: often sequence, wording, prominence, scene geometry, or a control's actual behavior. Avoid adding a tutorial or toolbar as the default repair.
7. Reserve the next numbered run and submit that topic's primary short prompt through real Apertus and Laya in the ordinary UI.
8. Check provider provenance, accepted graph, model-scene agreement, and generated UX. A polished premade cannot stand in for generated acceptance.
9. Run a paraphrase, informal prompt, supported follow-up, and persistence round. Keep every attempt and exact input.
10. Repeat with a new number after each meaningful fix. Link the prior finding to the correction and rerun evidence. User criticism requires another iteration.

Classify failures so corrections address the cause:

| Failure stage | Likely work area |
| --- | --- |
| Intent wrong or vague | Teaching-intent contract, handling ordinary questions, active context |
| Correct intent, missing candidates | Catalog metadata and retrieval |
| Relevant candidates, Laya rejection/wrong choice | Concise choice descriptions and contrast grouping; preserve gates |
| Unsupported/unwired authoring | Focused tools, schemas, dependencies, argument repair, transaction validation |
| Recipe accepted, scene wrong | Runtime state, binding, scene geometry, model assumptions |
| Mechanism correct, confusing UI | Removal test, action sequence, labels, layout, contextual feedback |
| Save/remix/Try lesson broken | Recipe capture/remapping/host parity/persistence |
| Timeout or provider failure | Service readiness, real inference budget/latency; preserve failed evidence |

Change one significant variable at a time when diagnosing inference. Do not edit the human prompt to force a pass; improve contracts, metadata, or supported implementation. Development attempts inform the design; a frozen final batch measures the resulting implementation.

### 16.2 Frozen live batch and success criteria

Freeze source fingerprint, prompt corpus, criteria, defaults, and runner version before the final batch. A source change during the batch stops that batch; its completed attempts remain, and the corrected implementation starts a new batch with higher global run numbers.

Minimum planned live coverage:

- Five independent fresh UI generations for each of seven primary prompts: **35 attempts**.
- Two independent fresh UI generations for each of fourteen paraphrase/informal prompts: **28 attempts**.
- Two contextual live executions for each of fourteen follow-up prompts: **28 attempts**, linked to fresh accepted parent recipes.
- Ambiguous, misconception, and unsupported corpus cases, each with its declared expected behavior. Track these separately from supported generation rates.

That is **91 supported live attempts**, plus boundary cases and separately numbered premade/persistence/fault runs. Run sequentially on shared local inference unless actual supported concurrency is established. Break into sessions without resetting numbering or changing frozen sources.

Final readiness target: all five primary attempts per topic work without user reformulating the question. Every accepted recipe must pass scientific, graph, interaction, and UX checks; no wrong mechanism or unresolved blocking/major finding is allowed. Report first-pass success separately from success after bounded internal repair. Never replace failed rows with successful retries or quote a success percentage only over accepted attempts.

If a stochastic failure remains, report the affected prompt, failure frequency, and exact evidence. Decide whether it needs implementation work or remains an explicit release gap. Do not declare general prompt reliability from one successful screenshot.

### 16.3 What proves actual inference

For accepted strict runs, require a correlated `composition.decision` event with provider `laya`, accepted selection, actual model metadata, candidate list, and acceptance evidence. Require actual Apertus authoring inference events, including the relevant `turn_<n>.inference` records, resolved provider/model, duration, and available usage.

Configuration saying hybrid, a successful readiness probe, or an intent-only Apertus call is insufficient. A cached recipe import, replay, deterministic fixture, or direct HTTP diagnostic is valuable for its stated purpose but does not count as fresh ordinary-UI generation. Label all such evidence distinctly.

### 16.4 Review findings and owner review

Use the guide's statuses: Pass, Concern, Fail, Not tested. Each finding records task, route/host, starting recipe/state, viewport/input/motion, observed cue or behavior, inferred impact, severity, reproduction, evidence links, smallest useful fix, and verification after the fix.

Review screenshots directly for readability, scene dominance, target sizes, clipping, covered actions, crowded labels, and misleading geometry. Operate the flow to assess behavior. First-time participant observations, when available, are a separate evidence category; agent inspection must not claim proven human intuitiveness.

Provide the user a numbered contact sheet and linked opening/changed screenshots. The handoff states what was reviewed, which browser method was used, what failed, what changed between runs, and what remains not tested. Approval/review must concern this concrete result; do not interrupt routine implementation to approve every reversible step.

## 17. Technical, builder, and accessibility verification

### 17.1 Model and contract checks

Test the causal relationships and invariants listed in sections 6–12, meaningful boundary values, and invalid arguments. Do not write tests that only assert constants copied from the implementation. Independent analytical relationships, accounting checks, or reviewed scenario oracles should establish correctness.

For both 3D lessons verify fixed views, keyboard camera presets, model/camera independence, fallback, aspect-ratio changes, and WebGL context loss recovery. For all lessons verify deterministic restart, repeated command delivery/no double-step, frame-rate independence, supported reconfiguration, and stage/caption agreement.

### 17.2 Actual authoring and persistence flows

For each topic, in both a premade and a real generated recipe:

1. Open through the normal learner flow and verify a useful initial state.
2. Remix/open in the builder and select scene, action, and caption as separate items.
3. Change a supported authored condition using schema-based controls; reject invalid input while preserving accepted state.
4. Move/resize a presentation item; verify physical configuration does not change.
5. Undo/redo the authored edit; verify connections and presentation recover.
6. Save/reopen through the actual available storage mode and operate the resulting lesson.
7. Native export/import and re-exercise the primary action; verify reference remapping.
8. Click the real **Try lesson** button and verify nonzero drawing dimensions, actual visible geometry, caption/action behavior, and prompt clearance.

Distinguish guest reload/native round-trip from authenticated account storage. If account storage cannot be tested, record Not tested rather than implying local storage proves it.

### 17.3 Viewports and input

Review desktop at 1440×900 and a short desktop at 1280×720; check 1920×1080 for excessive whitespace/overlays. Reflow at a narrow supported width, such as 390×844, preserving readable labels and reachable actions. Also check enlarged text/zoom, keyboard-only operation, visible focus, modal focus return, reduced motion, and meaningful selected/disabled/unavailable states.

A whole-page horizontal-overflow check is insufficient. Inspect actual scene bounds, effective text/target sizes after board scaling, viewport overlap, nested scroll regions, and floating navigation. Do not shrink the complete lesson to fit while making its controls unreadable.

### 17.4 Error and regression coverage

Use clearly labeled deterministic faults for malformed tools, mismatched ports, missing scene bindings, provider outages, timeout, cancelled/superseded requests, failed saves, and unsupported follow-ups. Preserve the previous accepted lesson and avoid partial saves. These tests do not count as live inference acceptance.

Relevant existing commands, from `src/web`, include:

```sh
pnpm exec tsc --noEmit
pnpm test:recipes
pnpm test:composition
pnpm test:controls
pnpm test:generation:contract
pnpm test:generation:architecture
pnpm test:generation:decisions
pnpm test:science
pnpm test:builder:parity
pnpm test:public-catalog
```

Add scoped earth-atmosphere checks and scripts as part of implementation. Proposed future commands, **not currently registered**, are `test:earth-atmosphere`, `test:earth-atmosphere:browser`, `test:earth-atmosphere:live-ui`, `test:earth-atmosphere:builder`, and `test:earth-atmosphere:replay`. The live runner must implement global numbered evidence allocation, rather than inherit timestamp batch directories as the only progress record.

Before handoff, run relevant existing browser parity/workspace regressions, scoped formatting/lint for touched files, and the final build. Broaden tests when shared changes justify it; do not treat repeated passing suites as a substitute for outstanding UX review. Record commands and outcomes in the final report.

## 18. Implementation phases and stop gates

| Phase | Concrete work | Gate before moving on |
| --- | --- | --- |
| A — Inventory and UX specification | Recheck current ownership, seven source briefs, current design requirements, model assumptions, visible-control inventories, and realistic prompt corpus | One learning question/action per opening; optional controls assigned to actual later tasks |
| B — Vertical slices | Greenhouse 2D slice and earthquake 3D slice, typed action/caption pieces, runtime and builder wiring | Scientific relationships pass; separate components survive actual Try lesson; numbered opening/changed captures reviewed |
| C — Remaining models/scenes | Tsunami and lightning stages; atmosphere explorer; rainbow geometry; weather parcel scenarios | Each topic's oracles and truthful boundaries pass; no renderer-only physics |
| D — Catalog and generation | Metadata, contrast groups, dependencies, topic coverage, scene-first authoring guidance, live provider traces | All seven primary short questions produce real accepted interactive lessons through actual Apertus/Laya UI flow |
| E — Full flow and correction | Browser usability, motion/access, short/narrow layout, save/remix/export/import/reopen, follow-ups, fallback/recovery | All blocking/major findings fixed and rerun with new numbers |
| F — Frozen acceptance | 91 supported live attempts, boundary cases, designated persistence coverage, final regressions/build | Honest denominator/provenance; no unresolved science/functional/UX blockers |
| G — Reviewable handoff | INDEX, findings, screenshots/contact sheet, exact prompts, provider/latency report, limitations | User can inspect progress from 001 onward; review feedback receives another correction loop |

Start a tsunami model feasibility check early: coastal physics is easy to overstate. Prototype rainbow camera/observer separation before decorative rendering. Weather must begin with one bounded scenario instead of an attempted full forecasting system.

First-release exclusions: real hazard prediction/evacuation mapping, calibrated rupture forecasting, quantitative tsunami inundation without a valid solver, location-specific ozone exposure predictions, full atmospheric radiative transfer, predicted lightning strike locations, wave-optical rainbow effects, global numerical weather prediction, and automatic paid asset generation.

## 19. Definition of done

- [ ] All seven lessons have scientifically truthful models or explicitly prescribed teaching scenarios, documented assumptions, and meaningful causal checks.
- [ ] Each opening follows IMPORTANT: one question, scene dominance, one short explanation, one primary action, and only justified essential controls.
- [ ] Optional investigations are sequenced and named; no universal toolbar or hidden unnecessary dashboard appears.
- [ ] Earthquake and rainbow 3D improve the learning task; keyboard/fixed-view/fallback behavior remains usable.
- [ ] Models, appearances, controls, and captions use shared recipe/catalog/runtime pathways and remain independently editable where required.
- [ ] Generated lessons obey the same UX standard as premades and preserve explicit ordinary-language requests.
- [ ] Real required-Laya and Apertus authoring are proved per strict live attempt with correlated traces.
- [ ] Supported short prompts, informal variants, follow-ups, ambiguity, misconceptions, and failure recovery have recorded outcomes.
- [ ] Every verification attempt is numbered globally from 001, retained without overwriting, and indexed with failures and gaps.
- [ ] Opening and meaningful changed screenshots are saved, directly inspected, and presented with accurate browser-method labels.
- [ ] Actual builder editing, Undo/Redo, save/reopen, native import/export, and Try lesson preserve composition and behavior in tested storage modes.
- [ ] Desktop/short/narrow views, keyboard, focus, reduced motion, invalid/unavailable states, and runtime/visual agreement pass relevant checks.
- [ ] No outstanding blocking/major finding or known user objection is excused by technical passes.
- [ ] Final report distinguishes science, function, live inference, screenshot review, inferred usability, participant observations, and Not tested areas.

The deliverable is seven understandable interactive explanations that work from real human questions. The plan is complete when those implementation and evidence requirements are executed; this document itself is the planning artifact, not evidence that execution has occurred.
