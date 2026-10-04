# Manual experiment builder

**Status:** Graph-first manual creation. Cartesian and town workspaces support explicit, independently configured canvas components, unconnected draft components, typed wires, focused settings dialogs, and multiple side-by-side or stacked canvases. Physical canvases and diagrams now use the same composition path, with independent gas containers and fraction bars, action buttons, typed readouts, pair comparisons, and instance-scoped runtimes.
**Date:** 2026-10-05

### Current authoring experience

- **Connections is the default and primary workspace.** The graph uses draggable cards, typed ports, curved wires, pan/zoom, component lookup, and Arrange. Clicking a card opens a focused modal; dragging it moves the card without opening settings. Arrow keys move focused cards. Drag a wire between ports or click an output followed by a compatible input. Select a wire to disconnect it. Incompatible connections explain the problem without changing the document.
- **Canvases are components.** All new workspaces contain no implicit canvas. Add a Cartesian plane or 3D scene first, then independently add lines/squares or ground/buildings/roads/people. A display connection assigns an object to one canvas. Add up to eight canvases in the chosen component family. Canvas bounds, grid/snap, and town clock settings are independent. A town canvas supports one ground; separate canvases can each have their own ground.
- **Controls and results start disconnected.** Add a Slider, Number input, Toggle, Action button, Readout, Intersection, or fraction Comparison card, then connect it. Numeric controls connect to numeric properties; toggles connect to boolean properties. Readouts observe calculated outputs. Intersection has two line inputs and requires distinct lines on the same plane. The modal provides equivalent connection selectors for keyboard users and precise editing.
- **Dialogs keep ordinary editing small.** A line initially shows name/color, slope/intercept sliders, and an interactive view of its connected plane. Precise handle coordinates, thickness, and dashed appearance are disclosed under advanced settings. Squares expose side length, rotation, fill and outline; their center and resize/rotation handles remain draggable. The popup uses the connected canvas runtime, rather than a second simulation session. Escape/Done closes it and restores focus.
- **Town trips are separate behavior cards.** Add a Scheduled trip, connect a Person and destination Building, and choose a departure time. Coordinate destinations are also supported in the modal. Spawn coordinates/time and walking speed belong to the person. Trips compile into the existing deterministic navigation/playback engine; building destinations follow the entrance. Removing a destination converts it to its last coordinate, and removing a person leaves the trip disconnected for repair.
- **Build shows the assembly.** Only connected objects appear on each canvas. Canvases appear side by side or stacked according to Lesson settings, independently of authoring card positions. Controls/readouts appear with their target canvas. Direct geometry manipulation in Build does not automatically open a dialog; select geometry and use Edit selected component, or edit its card in Connections. Responsive preview, tab changes, and Try lesson retain each canvas runtime and clock.
- **Drafts may be incomplete.** Disconnected pieces can be saved/exported/reopened. Try lesson additionally requires title/instruction and completed connections; town canvases require ground. Invalid parameter text retains the last valid preview. Removing components and dependents prunes graph positions in one undoable change. Pan/zoom is navigation metadata and does not enter undo history.
- **Existing documents migrate on opening.** An existing populated scene becomes one explicit canvas with its object/control/result connections preserved. Embedded person schedules become trip cards with stable step identities. Empty old drafts remain empty workspaces. The source saved record is untouched until saving. New compositions use version-2 document/scene/workspace records; supported version-1 documents migrate in memory and their stored sources remain unchanged until saving.
- **Persistence stays device-local.** Draft recovery, atomic saved-library writes, conflict checks, JSON import/export, undo/redo, and author starting values remain supported. Multi-canvas scenes have independently mounted runtime owners; opening a popup adds a renderer, not an additional clock.
- **Supported scope:** Cartesian lines/squares and town ground/buildings/rectangular roads/people/scheduled trips. Canvases in one document use the selected component family. Gas containers and fraction bars are independent instances on physical/diagram canvases. Arbitrary scripting, new geometry types, shared multi-target controls, and cross-plane intersection calculations are not implemented.

### Physical and diagram parity

Gas containers independently own amount, temperature, volume, pressure output, and particle illustration settings. Fraction bars independently own their shading masks; subdivision preserves quantity and comparison connects any two distinct bars on the same canvas. Display resizing does not change mathematical configuration. Learners receive permitted controls and shading, while authors can move/resize objects and explicitly capture experimental values.

Each canvas resets independently. Display drags support Escape cancellation and one-step undo/redo; selecting an object keeps the canvas steady. Fraction pieces remain visible and interactive at the minimum display height. `pnpm test:builder:parity:browser` verifies these behaviors through the manual authoring flow.

See [Physical and diagram composition](agent-only/features/MANUAL_BUILDER_DOMAIN_COMPOSITION.md) for the current implementation and verification scope. The dated initial-release design and reviews below describe historical legacy adapters; their singleton restrictions do not apply to the current manual composition builder.

### Verification

`pnpm test` includes geometry, simulation/integration, document/binding, migration, graph projection, disconnection, typed endpoint, multiple-canvas, trip compilation, and save round-trip checks. `pnpm test:builder:browser` exercises gas/fraction compatibility plus the new Cartesian/town graph workflow. Use a local app on port 3000 or set `BUILDER_BASE_URL`. `pnpm exec tsc --noEmit` and scoped Biome checks verify the changed source.

Browser scenarios cover two planes, pointer wire creation, dialog handle dragging and one-step undo, node movement without opening settings, calculations, disconnection, runtime lifetime, draft recovery, town trip connections, and mobile layouts. Review captures are written to `/tmp/apertus-graph-browser/`.

## Composition pilots — Cartesian plane and town

These canvases are assembled from independently identifiable objects. A blank Cartesian plane renders real axes without a line. A blank town renders empty spatial workspace without ground, buildings, or residents. Starting examples are explicit alternatives and become editable pieces.

### Cartesian authoring

- Add multiple **Line** or **Square** objects. Each has its own identity, label, geometry, color, stroke thickness, and supported learner interactions. Duplicate and remove individual objects.
- Lines extend infinitely through two handles. Drag a handle, move it with arrow keys, or edit its coordinates. Slope and intercept have sliders and numeric inputs. Vertical lines use `x = constant` and report undefined slope/intercept; slope controls require nonvertical geometry.
- Squares have a draggable center, resize handle, rotation handle, side-length slider, fill toggle, fill opacity, and outline thickness. Hollow means fill disabled. Fill and outline do not change area or perimeter.
- Axis bounds belong to the plane. Uniform coordinate scale keeps squares visually square when axis ranges differ. Drag empty background to pan; use zoom buttons or Ctrl/Meta-wheel; Reset view restores authored bounds. Navigation changes neither object geometry nor undo history. Stroke widths use screen pixels and remain constant under resizing and zoom.
- Add controls for a specific object's supported property. Add equation, slope/intercept, legacy line readouts, square area/perimeter, or an intersection result independently. Intersections explicitly reference two lines and report parallel/coincident cases rather than inventing a point.

### Town authoring

- **Ground:** one editable surface per connected 3D canvas with dimensions and color; its footprint defines walkable bounds. Ground is required to run a completed town lesson.
- **House / building:** independent position, dimensions, height, color, entrance side, and navigation-obstacle toggle. Drag it in 3D or use coordinate sliders/inputs. Its entrance marker identifies the linked destination.
- **Road:** independent rectangular surface, dimensions, position, and color. Open roads are walkable; closed roads block crossing. This pilot does not constrain people to a fixed street network or support curved road drawing.
- **Person:** independent spawn coordinate, spawn hour, walking speed, color, and departure schedule. Add a trip, choose its departure time and destination building, or use an explicit coordinate. Yellow destination markers can be dragged; dragging a building-linked marker converts it to a coordinate destination. Dragging a person edits its spawn position.
- Spawn/departure hours are in `[0, 24)`. A trip starts at its departure time, arrival depends on speed and path length, and the person then waits. A later trip interrupts movement from the position reached at that time. The day resets at midnight and repeats the authored spawn/schedule configuration.
- Building destinations follow the entrance when a building moves. Removing a destination building converts its references to its last entrance coordinate. Removing an object clears its dependent controls and measurements, including pair measurements, in one undoable edit.
- Navigation uses bounded grid search and segment checks against authored obstacles and ground bounds. It does not claim physical collision dynamics, shortest-path guarantees, street preference, or crowd avoidance. Unreachable trips report **no route**, including feedback in the lesson surface.
- Time scrub and playback evaluate the same compiled timeline. Scrubbing pauses playback. Camera reset only resets the renderer. Population, walking, blocked-route, person position/activity, entrance, ground area, and road-state results are independently addable.

### Documents, lifetime, and migration

The document's optional `scene` has its own version, strict object schemas, stable instance IDs, supported property handlers, typed measurement targets, and bounded counts. It is mutually exclusive with a legacy runtime recipe and its bindings. The graph, settings dialogs, library, and shared learner surface edit or observe these same records. An optional versioned `workspace` adds canvas instances, object-to-canvas placements, independent trip cards, and learner canvas arrangement; the legacy scene shape remains supported.

`composition/model.ts` owns object contracts, capability descriptions, validation, and structural edits; `measurements.ts` owns calculated results; `town.ts` compiles deterministic routes and schedules; `migration.ts` translates old examples; `useSceneRuntime.ts` owns accepted learner state and the single playback clock. Scene renderers and object/binding settings remain separate components.

Preview controls and learner dragging affect accepted runtime state. Author edits change saved starting configuration; invalid edits keep the last valid preview. **Use current settings as starting values** copies supported configuration and clock settings, including original spawn coordinates rather than transient walking positions. Try lesson, responsive preview, and connection view changes retain the same runtime owner. Reopening/importing starts a fresh session. RAF and pointer/wheel resources are released on disposal.

Line example conversion preserves geometry, supported controls, and readouts. Town examples translate fixed buildings/residents into editable objects and explicit departure schedules. The conversion notice explains the new ground navigation and schedule semantics; the old stored record is unchanged until the author saves. This is a translation into the pilot, not a promise of identical legacy street/behavior simulation.

Saved composition lessons use the existing atomic device-local library and conflict checks. Undo/redo, import/export, draft recovery, main/details placement, and control/result ordering remain supported. On mobile, the component inventory starts collapsed to leave room for the scene and opens on demand.

Verification includes pure geometry/intersection tests, appearance-independent measurements, strict binding and reference validation, migration round trips, deletion cleanup, deterministic spawn/trip evaluation, obstacle detours and blocked routes. Browser checks cover pointer dragging of a line and 3D building, one-step undo, keyboard handles, independent widgets, measurements, schedule editing/scrubbing, preview lifetime, saved starts, JSON transfer, duplication/removal, invalid drafts, and desktop/mobile rendering. Review captures live in `/tmp/apertus-composition-browser/`.

The remaining sections describe the common builder foundation and the original phased design. Single-model town/line restrictions in the original implementation review below are historical and are superseded by these pilots.

## Original design and implementation history

The sections below record the original guided single-canvas design. Where they describe Build as the default, adjacent inspectors, implicit canvases, prebound additions, or one active scene, the current authoring experience above supersedes them.

## 1. What we are building

The manual experiment builder lets someone assemble an interactive lesson from trusted components, connect its controls and results, and immediately try what they have made.

The experience combines Scratch's approachable component selection with a connected-block workspace similar to a workflow editor. A live preview shows the actual learner-facing experiment. The author can expand that preview into a full lesson, interact with it, and return to editing.

The builder has two related responsibilities:

1. **Configure the experiment:** choose supported objects, initial values, actions, and observations.
2. **Design the lesson:** choose instructions, controls, results, views, and their placement.

Manual creation and AI-assisted creation should ultimately edit the same saved experiment document and pass through the same validation. Manual creation must work without an AI request.

The first version should make a few supported experiments easy to assemble and customize. It should grow through registered capabilities rather than presenting a blank canvas that appears to support arbitrary physics, scripting, or 3D objects.

## 2. The main experience, from start to save

### Step 1: Choose dimension, layout, then canvas

**Create manually** opens three full-screen setup steps:

1. **2D or 3D:** choose the learner's space.
2. **Lesson format:** choose scene with a side panel or controls below for 2D; a floating panel for the supported 3D scene.
3. **Canvas type:** for 2D choose physical canvas, Cartesian plane, or diagram; for 3D choose the supported spatial scene.

Back preserves selections. Changing dimension selects a compatible canvas and layout. Canvas choices describe the available object without promising arbitrary model or asset support. Create empty canvas opens a draft without a model, instruction, controls, or results.

Templates are separately labeled starting examples that supply a complete experiment. Remix imports an explicitly chosen supported recipe. Continue draft offers recovery without hijacking new creation.

### Step 2: Add the first object deliberately

Cartesian and town canvases offer independent objects through the component library, as described in the pilots above. The other empty canvases offer **Add your first component**: Gas sample is one model, and Fraction comparison board is a disclosed composite containing two bars. Adding an object does not add authored controls or results.

Select the object to choose learner controls or measurements individually, or use **Add control** and **Add result** beside the lesson panel. These actions open the library in the requested category; they never merely reselect the current object. Starting values are disclosed separately. No generated title or teaching instruction is substituted for author content. Removing an object removes dependent controls, results, and editor positions in one undoable edit.

### Step 3: Select objects and expose their interactions

The author selects an object in the block workspace, object list, or preview. Its settings appear in the inspector.

Each editable property offers **Add learner control** where a supported action exists. Choosing a widget creates the block, connects it, and places it in the lesson. This shortcut should be as capable as drawing the same connection manually.

For example:

1. Select a gas sample.
2. Choose **Volume → Add learner control → Slider**.
3. Keep or narrow the supported range.
4. Choose **Main panel** as its placement.
5. Move the slider in the preview and observe the pressure change.

Authors should not need to understand runtime identifiers or discover a command name to perform this task.

### Step 4: Design the learner-facing lesson

The author writes the short instruction, selects the main action, chooses essential results, and orders controls within defined layout slots.

Keep two to four essential controls prominent. Additional supported settings belong in **More settings** or a local disclosure. There should be one clear visual focus and, where appropriate, one main action.

### Step 5: Try the lesson at full size

The header's **Try lesson** action opens the learner view. Authoring panels disappear, and the finished lesson occupies the workspace. Desktop and mobile preview choices let the author inspect the responsive layout.

Returning to the builder preserves the document, selection, and block positions. Expanding the preview must not start a second simulation or a second model clock.

### Step 6: Save, reopen, and remix

**Save experiment** records the authored starting configuration, lesson content, controls, results, and layout. Reopening reconstructs the same lesson.

Playing with the preview does not silently rewrite starting values. Provide **Use current settings as starting values** for supported editable parameters. This action must not copy transient positions, calculated outputs, or other runtime state indiscriminately.

## 3. Editor layout and navigation

The header contains experiment navigation, title, Back to setup, undo/redo, Save draft/experiment, an Experiment menu, and Try lesson. The menu holds New experiment, export, import, and saved documents. On mobile it also contains Back to setup and undo/redo; a compact Settings menu provides the contextual categories.

Build is the default surface: one large authored lesson canvas and, when an item is selected, a single inspector beside it. Connections replaces the lesson canvas with the binding graph; it never creates another runtime. The same preview owner remains mounted while switching Build, Connections, and Try lesson.

**Add component** opens a dismissible, keyboard-accessible modal with compatible components, category filters, and search. Each control/result choice adds exactly one bound widget. Object cards explain composite contents before addition. Canvas and lesson settings remain settings rather than appearing as addable components. Closing it returns focus to the opener. File operations and saved experiments are outside the component library.

In Build, Lesson, Layout, Controls, and Results open contextual settings. Connections uses a dedicated canvas header with component lookup, Arrange, and a display-options menu; lesson settings remain in Build. Controls and Results display their actual lists or explanatory empty states; they never fall back to another category's first item. Close settings returns to the full canvas. Starting values and object removal are disclosed separately from adding learner components. Selected controls initially show label, widget, placement, and ordering; connection and range/start configuration are disclosed.

On narrow screens in Build, settings precede the canvas in one page reading order. Connections opens a dismissible settings sheet; selecting or finding a card reveals it at a readable zoom above that sheet. The page owns ordinary content scrolling; the connection graph has a bounded pan/zoom viewport without scrollbars, and an open component dialog owns its content scroll. No preview/inspector stacked scroll split is permitted.

## 4. Learner layouts: 2D and 3D

The editor's arrangement is separate from the layout of the experiment it creates. Moving a block in the editor does not move its control in the learner's lesson.

### 4.1 Layout choices

Show a small thumbnail for each available layout.

| Layout | Default use | Availability plan |
| --- | --- | --- |
| Scene + right panel | 2D lessons with nearby controls and results | First release |
| Full scene + floating panel | 3D spatial lessons | Town builder phase |
| Scene + bottom panel | Wide diagrams or graphs | After the primary layout works |
| Comparison layout | Multiple coordinated scenes | Later, with compatible models |

Changing a layout rearranges presentation and preserves the model, identities, and bindings. If a proposed view is incompatible, explain why and keep the current view intact.

### 4.2 Default 2D lesson

Follow the existing [experiment screen format](agent-only/design/EXPERIMENT_FORMAT.md):

- One short instruction above the scene.
- One dominant scene, diagram, or graph on the left.
- A coherent control and result panel on the right, approximately 300 CSS pixels wide in the full desktop lesson.
- The first action, two to four essential controls, key results, and relevant reset/playback visible together.
- Optional settings, supporting graphs, longer explanations, and full tables behind disclosure.

At 1440×900, the core observe–act–see-result interaction should fit in the lesson workspace. At 390×844, use instruction → compact scene → action/results → controls → details.

Layout must respond to the preview container's available width. A desktop browser with the editor open may have a narrow preview; browser-width media queries alone cannot represent that correctly. Use container-aware layout or an explicitly sized preview surface.

### 4.3 Default 3D lesson

Give the scene most of the available space. Use a short instruction strip, a compact floating control/result panel, camera controls near the scene, and playback where relevant. Place an object inspector on demand rather than leaving every object's settings visible.

On mobile, move substantial controls below the scene or into an accessible drawer. Avoid obscuring the object being explored.

Keep model space and rendering independent. The town already models movement on a horizontal plane while displaying it in 3D. Selecting a 3D presentation does not install 3D physics or convert SVG objects into meshes. Only offer a renderer when compatible visuals and bindings exist.

## 5. Blocks and connections

### 5.1 What a block represents

The editor uses familiar labels over the existing architecture.

| Visible block | Architectural responsibility |
| --- | --- |
| Object or model | A prefab/model instance with supported settings and mechanics |
| Slider, button, input | A control bound to a supported action or presentation setting |
| Canvas or graph | A view with compatible visuals or data bindings |
| Readout | A presentation component observing a model output |
| Instruction | Lesson presentation content |
| Layout | Placement of lesson content in named slots |
| Behavior, later | A declarative recipe evaluated by a trusted behavior runner |

An atomic author component has one meaningful purpose: one object, one learner control, or one observation. A composite must explain its contents before addition. A useful object block may group several internal runtime components. A gas sample does not require the author to separately wire traits, a system, an illustration provider, and every dependency.

The nine architectural component types remain unchanged. Runtime, world, and entity identity stay infrastructure concepts rather than blocks the author must install.

### 5.2 Three connection types

| Connection | Meaning | Example |
| --- | --- | --- |
| Action | Request a validated change through a supported handler | Slider → Set volume |
| Data | Read authoritative model state or output | Pressure output → Pressure readout |
| Placement | Assign presentation to a lesson slot | Volume slider → Primary controls |

Presentation-only edits, such as showing a grid or moving a camera, route to presentation settings. They do not need a model-state write.

Label wires and use distinct port shapes as well as color. When dragging from a port, highlight compatible destinations and explain incompatible ones. The default canvas shows a small legend for Changes and Observations. Distinct diamond/circle/square handles identify action, data, and placement ports. Placement is an optional display mode. Numeric type alone is insufficient: target identity, units, supported range, action arguments, and renderer compatibility matter too.

### 5.3 The graph is a set of bindings

The workspace does not execute every node from left to right on every frame. Systems continue to own model calculations and stepping. Controls emit requests; views observe the resulting state.

A control can observe an accepted value and request a change without creating an arbitrary executable feedback loop. Data bindings do not execute commands. General expressions, loops, and user-provided JavaScript are outside the initial scope.

### 5.4 Connections should have shortcuts

Support both drawing a wire and selecting a target from a form. Examples:

- **Volume → Add learner control → Slider** creates and connects a slider.
- **Pressure → Show result** creates a readout.
- **Placement → More settings** moves a control into disclosure.
- Clicking a selected control's connection opens its target settings.

By default, show the experiment's meaningful action and data connections. The model card shows ports only for its connected actions and observations, plus the scene output. Unused capabilities remain in the component library, opened by the model card’s + Control and + Result actions. Port rows and wire endpoints share typed graph geometry; a wire terminates at the exact property it binds. Selecting a wire opens the corresponding component’s binding settings. Unrelated wires become quieter while a component is selected. Name canvas nodes by canvas type and outputs by learner-facing names, not registry category strings. The canvas automatically fits on first entry. Navigation supports background drag, trackpad pan, touch pinch, Ctrl/Meta-wheel zoom, floating zoom buttons, and centered Fit to content. Jump to component selects and reveals a card at a readable scale. Arrange restores the default layout in one undoable edit and fits it. Navigation does not consume lesson undo steps. Keyboard help is available beside the zoom controls. A focused viewport supports arrow-key pan, +/− zoom, and Home to fit. Nodes remain within 0–3000 on each axis and the camera stays within a bounded workspace. **Show presentation connections** reveals the layout and instruction wiring. Both views edit the same underlying records; there must not be a separate hidden graph with different behavior.

## 6. Controls, results, and instructions

### 6.1 Control specifications

Every authored control needs a stable identity, a learner-facing label, a supported binding, and placement. Numeric controls also need a current-value source so they display the accepted state after validation.

| Setting | Purpose |
| --- | --- |
| Widget | Slider, numeric input, button, toggle, dropdown, or supported composite control |
| Target and action | Which instance/session/presentation setting receives the request |
| Argument mapping | Which arguments come from the widget and which are fixed |
| Current-value binding | Where the accepted value is read from |
| Label and optional help | What the learner sees |
| Range, step, choices, unit | Valid input and meaningful formatting |
| Starting value | A link to the authored initial model parameter, not a competing default |
| Update timing | Live, relaunch, rebuild, or explicit submit |
| Placement and order | Primary panel, details, or a supported scene interaction |
| Feedback | Where rejected input and restart explanations appear |

Available actions and argument schemas come from registered providers. Authors may narrow a supported range but cannot expand it beyond the model's capabilities. Complex actions may need a dedicated control adapter rather than an automatically generated slider.

For a button, show its action and fixed arguments together: **Split bar A**, factor **2**. If the argument changes, suggest a matching label. For text input, expose only supported text operations; an input box does not grant arbitrary expression evaluation.

If two controls edit the same supported parameter, both read the same accepted value. A shared control targeting multiple instances must list those targets explicitly and use validated batch handling where supported. Do not apply some targets successfully and silently reject others.

### 6.2 Readouts and graphs

Results are read-only observations. A pressure result cannot be connected as an editable pressure parameter unless the model explicitly implements such an action.

Authors can choose labels, supported observations, display precision, and placement. Units must remain consistent with the model; changing a unit label alone is not a conversion. A graph requires an available dataset or sampling capability, not just a drawing surface.

Views format and display authoritative outputs. They must not implement another solver to make the preview look correct.

### 6.3 Instruction component

Provide one short instruction above the scene, with a **150-character limit**, visible counter and immediate preview; only explicitly selected templates supply default instruction text. Validate the same limit in the editor and document loader. Do not silently truncate pasted or imported content.

Instruction settings include an example placeholder, guidance, a character counter, and inline overflow feedback that preserves the entered text. Title and instruction typing are grouped into undo steps until focus leaves that field. Existing instruction text has a nearby Edit instruction action. Longer explanation is optional and disclosed separately.

The instruction should tell the learner what to try, for example: “Make the container smaller. What happens to the pressure?”

Keep longer explanations in Details. Preserve existing learning-goal content when importing experiments; the existing assembly learning goal permits more text, so a new short instruction should be a separate presentation field. The application shell supplies the title once.

### 6.4 Dots, lines, and physical objects

The workbench determines which object definitions are available and what they mean:

- A Cartesian point has coordinates and supported coordinate edits.
- A diagram circle may be only an illustration.
- A projectile includes a specific motion model and its supported launch settings.
- A collider requires an implemented collision system; a visible shape does not supply one.

Use explicit names in the palette, such as **Point**, **Circle illustration**, and **Projectile**. Show mathematical constraints and editable properties in the inspector. Add dragging only when there is a defined conversion from pointer movement to a supported action.

## 7. Three experiment examples

The following examples show the intended authoring graph and learner layout. Their diagrams describe product behavior, not exact existing schema fields.

### Example 1: Fraction Builder

**Learning goal:** Discover that differently divided bars can represent the same amount.

**Starting point:** 2D concepts → Fraction Builder. Use the existing two-bar comparison board and the scene/right-panel layout.

The author sets A to 1/2 and B to 2/4, exposes the supported split actions as buttons, and enables direct shading. The bars are parts of the board; the initial builder must not imply that arbitrary additional bars are already supported.

```text
AUTHOR'S BLOCKS

[Starting fractions: A = 1/2, B = 2/4]
                     |
                     v
          +-----------------------+
          | Fraction board        |<-- Split A -- [Button: Split A x2]
          | Two equal-sized bars  |<-- Split B -- [Button: Split B x2]
          +-----------o-----------+
                      | data
              +-------+----------------+
              v                        v
     [Interactive bar view]   [Comparison readout]
              |                        |
          Scene slot               Result slot

Tap a bar piece -- Toggle piece --> Fraction board
[Reset button] -- Restore starting configuration --> Experiment session
```

```text
LEARNER'S SCREEN

+---------------------------------------------------------------+
| Can differently sized pieces show the same fraction?           |
+-------------------------------------+-------------------------+
| Bar A                               | Try splitting a bar     |
| +---------------+---------------+   |                         |
| |###############|               |   | [ Split A x2 ]          |
| +---------------+---------------+   |                         |
|                1/2                  | [ Split B x2 ]          |
|                                     |                         |
| Bar B                               | Result                  |
| +-------+-------+-------+-------+   | 1/2 = 2/4               |
| |#######|#######|       |       |   | Same shaded amount      |
| +-------+-------+-------+-------+   |                         |
|                2/4                  | [ Start again ]         |
+-------------------------------------+-------------------------+
| > More settings: starting fractions                            |
+---------------------------------------------------------------+
```

**Author settings:** initial fractions, labels, split factors, appearance, direct-shading availability, and placement.

**Expected interaction:** splitting A by two changes its representation from 1/2 to 2/4 and preserves the shaded proportion. An unsupported further split is rejected with feedback. Reset restores the authored fractions. Static fraction comparison does not need artificial play/pause controls.

### Example 2: Gas Pressure

**Learning goal:** Explore pressure changes while changing volume and holding the amount and temperature fixed.

**Starting point:** 2D physical experiment → Gas Pressure. The model and its container illustration are supplied together.

The author exposes volume in the main panel, places temperature and amount in More settings, and adds a pressure readout.

```text
AUTHOR'S BLOCKS

[Volume slider] -- Set volume ----------+
                                       |
[Temperature input] -- Set temperature -+--> [Gas experiment]
                                       |          |
[Amount input] -- Set amount -----------+          | data
                                                  |
                                  +---------------+---------------+
                                  v                               v
                       [Container illustration]          [Pressure readout]
                                  |                               |
                              Scene slot                      Result slot

Volume slider      --> Primary controls
Temperature input  --> More settings
Amount input       --> More settings
[Reset button] -- Restore starting configuration --> Experiment session
```

```text
LEARNER'S SCREEN

+---------------------------------------------------------------+
| Make the container smaller. What happens to the pressure?      |
+-------------------------------------+-------------------------+
|                                     | Volume                  |
|          +----------------+         | 1.00 L                  |
|          | .   .      .   |         | ---------o--------      |
|          |    .  .        |         |                         |
|          | .       .   .  |         | Pressure                |
|          |    .       .   |         | 2.49 kPa                |
|          +----------------+         |                         |
|                                     | Temperature: 300 K      |
|       Representative particles      | Amount: 1 mmol          |
|                                     |                         |
|                                     | [ Reset ]               |
+-------------------------------------+-------------------------+
| > More settings: temperature, amount, particle visibility       |
+---------------------------------------------------------------+
```

**Author settings:** volume range within 0.25–2 L, step such as 0.05 L, initial volume, control placement, instruction, and result precision. The current gas adapter routes these model edits as session commands; the editor can still present the logical target as the gas sample.

**Expected interaction:** at 1 mmol and 300 K, changing volume from 1 L to 0.5 L changes equilibrium pressure from about 2.49 kPa to 4.99 kPa. The illustration follows the volume setting. Particle motion is illustrative and does not calculate pressure. Moving temperature into the main panel changes presentation without changing its value.

### Example 3: Town Routine

**Learning goal:** Explore residents' routines at different times and under supported road changes.

**Starting point:** 3D spatial scene → Town. Use the full-scene/floating-panel layout.

This diagram describes the original town adapter. The composition pilot now adds independent residents and explicit schedules, as described above. Arbitrary meshes, curved road drawing, and general behavior scripting remain outside the pilot.

```text
AUTHOR'S BLOCKS

[Time control] -- Set time --------+
[Speed dropdown] -- Set speed -----+
[Play / pause] -- Playback --------+--> [Town simulation]
[Close road button] -- Close road -+           |
[Open road button] -- Open road ---+           | state
                                      +-------+--------+
                                      v                v
                               [3D town view]   [Clock readout]
                                      ^
                                      | presentation setting
                              [Orbit camera control]

Time, speed, road actions --> Floating control panel
Playback                 --> Transport area
```

```text
LEARNER'S SCREEN

+---------------------------------------------------------------+
| Follow the residents through their daily routine.             |
|                                                               |
|                       /\                  +-----------------+  |
|          /\          /__\                 | Time            |  |
|         /__\         |[]|                 | 08:00           |  |
|         |[]|    .    |__|                 | ---o---------   |  |
|          \             \                 |                 |  |
|           \---- road ---\                | Speed [1x v]    |  |
|       .          .                       |                 |  |
|               /\                         | [ Close road ]  |  |
|              /__\                        | [ Open road  ]  |  |
|              |[]|                        +-----------------+  |
|              |__|                                             |
|                                                               |
| [ Pause ] [ Reset ]                         [ Reset camera ]  |
+---------------------------------------------------------------+
```

**Author settings:** initial time, supported speed choices, exposed scenario actions, panel placement, and camera defaults once configurable through the view adapter.

**Expected interaction:** time and road actions use the existing validated town mechanisms. Orbiting or resetting the camera changes presentation only. Pause stops model progression. Reset restores authored model settings; resetting the camera is a separate action. The 3D view continues to display the existing planar town model.

## 8. Preview, editing, and recovery

Keep three kinds of state distinct:

| State | Contents | Persistence |
| --- | --- | --- |
| Author document | Initial model configuration, lesson, bindings, presentation | Saved experiment |
| Editor state | Selected block, block positions, workspace zoom, open panels | Draft/editor metadata |
| Preview session | Current model time, accepted interactions, outputs, transient state | Temporary run |

The preview uses the production lesson renderer and one active runtime session. It must not recreate simulation equations inside the editor.

- Text and placement edits update presentation without restarting the model.
- Initial configuration and structural edits are staged and validated before activation. Restart/rebuild behavior follows the provider's declared semantics and is visible to the author.
- Invalid drafts preserve the last valid preview, marked **Preview shows the last valid version**. Show the error beside the affected setting or connection.
- Deleting an object identifies affected bindings. Remove dependent records as one undoable edit or cancel the deletion; never leave silent broken references.
- Undo/redo covers authoring changes. It does not rewind arbitrary simulation history.
- Autosave can retain an incomplete draft. Saving/exporting a runnable experiment requires successful validation.
- Full-screen preview and returning to editing reuse the active preview session. Stop and dispose it when leaving the builder.

## 9. Saved document and runtime integration

### 9.1 One semantic document, multiple editing surfaces

Introduce a versioned experiment document that wraps the existing recipe with lesson and presentation data. The following is a conceptual shape, not a drop-in API definition:

```text
ExperimentDocument
  documentVersion
  recipe
    null for an empty draft; otherwise the existing versioned model recipe and initial parameters
  lesson
    Title, short instruction, optional explanation
  presentation
    Layout, views, controls, results, typed bindings, slot ordering
  editor
    Block positions and other non-semantic workspace metadata
```

The recipe remains the source of truth for model configuration. Presentation records are the source of truth for authored widgets and their bindings. The block graph and inspector are two ways to edit those records, not independent copies of them.

Keep widget starting values linked to recipe parameters. Do not save one initial volume in the model and a different initial volume inside its slider.

Provide a document loader that validates the new envelope and then calls the existing recipe resolver. The current recipe parser rejects unknown fields, so new presentation fields cannot simply be appended to a legacy recipe and passed through unchanged.

Support importing existing recipes by supplying explicit presentation defaults. Preserve their original learning goals and model configuration. Unsupported component versions or bindings should produce actionable errors rather than silent substitution.

### 9.2 Authoring descriptors

Extend registered capabilities with small, trusted authoring descriptors containing:

- Human-readable name, description, category, and compatible workbenches.
- Editable parameters, defaults, units, ranges, and timing.
- Supported actions, their argument mappings, and current-value bindings.
- Supported outputs and compatible view adapters.
- Suggested widgets, initial placement, and essential learner interactions.
- Dependencies, instance limits, and relevant model assumptions.

Descriptors reference existing trusted providers. They do not contain user-supplied executable code. A provider with complex arguments can supply a focused composite control rather than forcing a generic form to guess how it works.

### 9.3 Validation and activation

`validateDocument` accepts structurally valid authoring drafts, including empty title/instruction and `recipe: null`. Empty drafts cannot contain controls, results, or block positions. `validateRunnableDocument` additionally requires a model recipe, title, short instruction, and Reset. Blank drafts never activate a session. Adding a model activates a preview while the lesson is still being authored. Imported legacy recipes retain their explicit presentation defaults.

```text
Manual editor or AI-assisted edit
               |
               v
       Experiment document
               |
     Validate schema and bindings
               |
     Resolve trusted dependencies
               |
     Compile/stage runtime setup
               |
     Commit one preview session
               |
       Authoritative model
               |
         Visuals and views
               |
          Learner screen
```

Validate component references and versions, stable instance IDs, action targets, argument schemas, ranges, units, read-only outputs, required observations, renderer compatibility, placement, and ownership constraints. Save/load must preserve identities across all these references.

Keep available model actions separate from visible control widgets. The current assembly validator requires a control declaration for every registered model action. Retain required capabilities while adding explicit presentation placement and a deliberate policy for which learner interactions are essential. Do not hide an action by accidentally removing its runtime capability.

### 9.4 Applying the original architecture sketch

The separation between authoring choices and deterministic execution remains central:

- Cartesian, physical, and formula workbenches select compatible definitions from one registry.
- A composition selects objects and configures the experiment.
- Resources and provider dependencies are resolved deterministically where possible.
- Controls request changes through validation and routing.
- Systems own authoritative calculations and state updates.
- Visuals read model data and produce drawing descriptions; views render them.
- Future behavior blocks request supported actions through a trusted runner.

Runtime, world, traits, and resources need not all be described to an AI model on every edit. Omitting implementation details from a prompt does not remove them from the saved definition or validation. Any token-allocation percentages in a concept sketch should be measured assumptions, not architectural constraints.

## 10. Existing foundations and the work still needed

| Foundation | What exists | Builder work |
| --- | --- | --- |
| [Composition definitions](../src/web/src/simulations/runtime/definition.ts) | Selected components, systems, instances, views, and defaults | Authoring adapters around supported definitions |
| [Model contributions and assemblies](../src/web/src/simulations/runtime/contribution.ts) | Parameters, actions, outputs, observations, and assembly records | Widget bindings, placement, and readable authoring metadata |
| [Parameter schemas](../src/web/src/simulations/runtime/parameterSchema.ts) and [capabilities](../src/web/src/simulations/runtime/capabilities.ts) | Validation, ranges, targets, and edit timing | Consistent inspector forms and current-value mappings |
| [Recipe resolver](../src/web/src/simulations/runtime/resolver.ts) | Versioned resolution and serialization | Document envelope, presentation validation, and legacy import |
| [Runtime session](../src/web/src/simulations/runtime/session.ts) | Validated commands, lifecycle, stepping, initial recipe save/load | Explicit preview ownership and author-document save semantics |
| [Experiment lesson frame](../src/web/src/simulations/components/views/ExperimentLessonFrame.tsx) | Goal, scene, panel, feedback, and details slots | Container-aware embedding and configurable lesson presentation |
| [Workspace styles](../src/web/src/app/experiments/_components/ExperimentsShell.css) | Reference 2D layouts and town overlays | Consolidate reusable layout instead of relying on shell overrides |
| [3D view](../src/web/src/simulations/components/views/ThreeWorldView.tsx) | Working town rendering | Configurable town view adapter; broader 3D support later |

The current session infrastructure has a single active session. Start with one preview and expand that same preview for full view. Concurrent independent simulations would require additional session isolation and are outside the initial builder scope.

Recipe export currently saves the accepted initial recipe, not a running checkpoint. Preserve that distinction while adding explicit saves of the author document.

## 11. Implementation sequence

### Phase 1: Define the document and prove one complete lesson

Use Gas Pressure as the first vertical slice because it has a clear editable parameter, action, output, and visual.

Deliver:

- The versioned document envelope and legacy recipe import.
- Authoring descriptors for the gas model, volume control, pressure result, and view.
- A shared learner layout embedded in a preview.
- Editable instruction, initial settings, control placement, and result formatting.
- Validated save/load and a full-view preview using one session.

**Completion check:** create a gas lesson, change its instruction, move temperature into the primary panel, try volume changes, save, and reopen the same authored lesson. Preview interactions must not accidentally change starting values.

### Phase 2: Add the connected-block authoring experience

Build the palette, block workspace, inspector, typed ports, connection forms, and direct-control shortcuts over the same document.

Add Fraction Builder and a supported Cartesian line experiment. These exercise composite commands, direct scene interaction, numeric controls, and result bindings. Keep instance counts and available actions within current provider limits.

Deliver undo/redo, local draft autosave, deletion dependency handling, compatibility feedback, and desktop/mobile preview selection. Any graph-editor library should handle interaction and drawing only; document semantics and runtime execution remain application-owned.

**Completion check:** the same lesson can be edited through wires or inspector forms and saves to equivalent semantic records. Invalid connections never change the running model.

### Phase 3: Add the 3D town workbench

Adapt the town's existing renderer and supported operations to the document and inspector. Add floating-panel placement and explicit camera settings where implemented.

**Completion check:** configure a town lesson, expose time and road actions, change camera settings independently, expand and collapse the preview, and reopen the saved experiment without creating extra clocks.

### Phase 4: Broaden composition and introduce behaviors

Add additional supported experiments such as projectile comparison and dilution, more layout choices, and reusable presets. Introduce shared controls only for providers with explicit multi-target support.

Then add a bounded set of event/condition/action blocks through the existing behavior architecture. Each event and action requires an implemented contract; a generic “when anything happens” block is insufficient.

Allow AI-assisted edits to the same author document, with validated, undoable changes. Public sharing, arbitrary scripting, unrestricted 3D asset import, and a general physics editor are separate extensions.

## 12. Acceptance criteria

The builder is ready for its supported scope when all of the following hold:

- Someone can choose canvas and layout, begin with no model/widgets, and add one component at a time without knowing internal names.
- Starting examples, remix, and Continue draft are explicit alternatives. New experiment always returns to setup.
- Empty drafts save/reopen/export without runtime activation. Incomplete lessons remain editable and preview their explicitly added model. Try lesson requires a model, title, instruction, and Reset.
- Component search is hidden until the library opens. Closing it restores focus. Ordinary authoring never stacks independently scrolling preview and settings panes.
- Objects, controls, results, and views have clear settings and compatible connections.
- A slider shows the accepted model value; rejected input preserves valid state and explains the problem.
- Static lessons do not show fake playback. Dynamic lessons distinguish pause, replay, step, and reset according to supported behavior.
- The preview and opened lesson use the same rendering and model paths.
- Changing appearance, camera, or panel placement does not change calculated model results.
- The instruction limit and imported-content handling are consistent and do not lose text silently.
- Save/load preserves initial configuration, identity, bindings, instruction, and layout.
- Undo/redo and deletion keep the document consistent. Incomplete drafts remain recoverable.
- Opening, expanding, and closing previews does not duplicate clocks or leak subscriptions and rendering resources.
- The learner's core interaction works at 1440×900 and 390×844, with readable labels, accessible controls, and no page-level horizontal overflow.
- Block placement, wire creation, and control ordering have keyboard or form-based alternatives.
- Automated checks cover document round trips, binding validation, invalid edits, and session lifecycle. Browser checks cover initial state, a meaningful interaction, reset, and responsive layout.

The first release should be judged by the full authoring loop: **choose canvas → choose layout → add object → add controls/results → configure → try → save → reopen**. A visually convincing node editor is only one part of that loop.

### Implementation review — 2026-10-04

- `pnpm test` passed simulation, integration, document/binding, and lifecycle checks.
- `pnpm exec tsc --noEmit`, scoped Biome checks, and `git diff --check` passed.
- Browser checks passed at 1440×900 and 390×844, with a 900×900 settings spot check. Covered empty creation, canvas/layout back navigation, explicit recovery, progressive additions, focus restoration, invalid edits, synchronized widgets, connection editing, undo/redo, save/reopen, all four models, removal, canvas replacement with backup, saved playback, blank JSON import, and absence of AI requests.
- Visually reviewed setup, layout choice, empty workspace, component library, object/control settings, learner details, mobile authoring/playback, a narrower settings view, and the rendered town. Evidence is in `/tmp/apertus-builder-browser/`.
- Authoring UX scores: first-action clarity 4/5, scene readability 4/5, component discoverability 4/5, feedback/results 4/5, mobile/accessibility 4/5. This review covers the supported manual builder, not the broader prompt catalog.
- Scope remains one registered model per canvas. Additional model types, multi-instance composition, arbitrary assets, and behavior authoring require real adapters before they can be offered.

## 13. Related design documents

- [Component architecture](COMPONENT_ARCHITECTURE.md)
- [Component contracts](agent-only/COMPONENT_CONTRACTS.md)
- [Project overview](agent-only/OVERVIEW.md)
- [Experiment screen format](agent-only/design/EXPERIMENT_FORMAT.md)
- [Application design conventions](agent-only/design/APPLICATION_DESIGN.md)

## 12. Editor boundaries and local save guarantees

- `catalog.ts` defines author-facing canvas and object descriptions separately from template names and runtime providers.
- `Setup.tsx` owns setup choices; `ComponentLibrary.tsx` owns compatible selection, filtering, dialog focus, and dismissal.
- `connections.ts` derives typed nodes, ports, wire endpoints, and default positions from the document. `ConnectionNode.tsx` renders a compact card; `ConnectionWorkspace.tsx` owns graph interaction; `ConnectionViewport.tsx` owns the camera only. `ConnectionSettings.tsx` owns binding inspection and validated rebinding. Label/widget/precision/lesson placement editing stays in Build, while numeric editor positions are an optional disclosure.
- `LessonSettings.tsx` owns content input and field feedback. `Lesson.tsx` remains the shared learner renderer with one session owner.
- `document.ts` owns schemas, bindings, and structural edits. Each edit clones and replaces one author snapshot; removing a model and its dependents is one undoable operation. Invalid text remains recoverable while the last valid document drives the preview.
- `storage.ts` validates a snapshot, obtains a Web Lock, checks the expected saved version, and atomically replaces the complete saved-library record. A stale tab reports a conflict; storage failures retain the previous snapshot. Recovery copies have fresh IDs and never overwrite an explicitly saved lesson. Browsers without Web Locks offer export rather than an unsafe concurrent save.

These provide atomic, validated local document saves and isolation between cooperating tabs. Device-local browser storage is not server persistence or a guarantee against device loss, browser data clearing, or another program modifying storage. Export remains the transfer and backup path. Independent Cartesian/town objects are implemented by the composition pilot. Independent gas containers and fraction bars now use the shared composition path; further domain vocabularies require registered adapters.
