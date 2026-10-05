# Simulation component design compliance audit

Date: 2026-10-05  
Status: source and supplied-screenshot audit; refactoring recommendations, not completed implementation.  
Scope: `src/web/src/simulations/components`, with the application stylesheet inspected for inherited styling.  
Standard: [Component design: presentation and interaction philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md).

## Assessment

**The shared learner inputs and results need substantial redesign. The scene foundations generally need preservation and targeted improvements.** The supplied screenshots show a systematic problem: internal command structures are rendered as the learning interface. Better colors alone will not fix the repeated headings, nested fieldsets, ambiguous actions, weak result hierarchy, and excessive vertical length.

The primary intervention point is `RecipeLesson.tsx` together with `SchemaForm.tsx`, `recipe-lesson.css`, and `composites/catalog.ts`. Changing only `ArithmeticControls.tsx`, `MathReadoutView.tsx`, or `ResultsTableView.tsx` will miss the recipe-rendered controls and results shown in the screenshots.

It would be misleading to mark most files fully compliant because they are reusable bases. A rendering base can satisfy its narrow responsibility without satisfying every requirement of a finished learning interface. Nonvisual model files are outside this presentation audit. Neither group should inflate a compliance percentage.

No application code was changed for this audit. No new browser session, interaction test, screen-reader assessment, or computed-style inspection was performed. Screenshot findings refer to the images supplied with the request; implementation findings refer to the current source. Full compliance under philosophy §12 still requires browser captures and interaction checks.

## How to read the status tables

| Status | Meaning | Refactoring consequence |
| --- | --- | --- |
| **Aligned base** | The inspected implementation fits its limited role. Host and interaction verification remain necessary. | Preserve; improve only demonstrated gaps. This is not a full §12 pass. |
| **Partial** | Useful behavior or presentation exists, but identified requirements are missing. | Extend or consolidate the existing implementation. |
| **Not compliant** | The current surface materially conflicts with the philosophy. | Redesign the affected presentation and interaction. |
| **Inherited** | An alias or adapter renders another implementation. | Fix the canonical renderer; avoid a separate redesign of the alias. |
| **Not assessed** | Inventoried, but insufficient direct inspection or live evidence for a reliable judgment. | Inspect before making a compliance claim. |
| **N/A: nonvisual** | Data, computation, contracts, or command plumbing rather than a displayed component. | Preserve contracts; assess architecture separately. |

Priorities: **P0** addresses the shared screenshot problems; **P1** completes adjacent families and state behavior; **P2** covers targeted scene/host work and secondary surfaces. Priority is a recommended implementation order, not a claim of production incident severity. Section references below refer to the design philosophy.

Source links are relative to this report. Symbols are included where one large file owns several different surfaces.

## 1. Active recipe surface: compliance table

| Component / surface | Status | Evidence and gap | Relevant sections | Priority / next action |
| --- | --- | --- | --- | --- |
| [SchemaForm](../../../src/web/src/simulations/components/controls/SchemaForm.tsx), object fields | **Not compliant** | Recurses through schema keys as visible labels. Every object adds a fieldset, including `value` envelopes. Screenshots show nested `value → a/b → n/d`, making payload structure the visual hierarchy. Local drafts and validation are useful foundations. | §1, §3 controls, §4, §7 | **P0:** semantic field metadata, purposeful grouping, shared field presentation. |
| `SchemaForm`, zero-argument action | **Not compliant** | An empty object still renders a fieldset and legend, followed by a button bearing the same label. This explains the empty strips above NEXT STEP, RESET, and Play / pause. | §1, §4, §5 | **P0:** render a single action with feedback; omit the empty field group. |
| Public Slider / NumberInput / Toggle / Select / Form in [RecipeLesson: NodeView](../../../src/web/src/simulations/components/views/RecipeLesson.tsx) | **Not compliant** | These names largely route to the same schema form. `widget === "Slider"` changes numeric input type; other field choices follow schema type. Slider output has no accompanying exact-entry field or explicit current-value display. Catalog identity does not create a distinct, finished control family. | §3 controls, §6, §7 | **P0:** dedicated presentations over shared validation/dispatch. |
| `NodeView`, EntityPicker | **Partial** | Uses candidate labels, but its uncontrolled select submits without handling the returned acceptance/error. Missing reference-argument text exposes command machinery. | §2, §6, §8 | **P1:** accepted selection state, contextual feedback, audience-specific unavailable state. |
| `NodeView`, Readout | **Not compliant** | Renders a bold label followed by a plain output. Precision is configurable, and nonfinite/missing values become “Unavailable,” but there is no result family layout, separate unit treatment, stable numeric alignment, or semantic boolean wording. Empty strings remain visually blank. | §3 results, §4, §6, §8 | **P0:** shared measurement presentation and explicit value states. |
| `NodeView`, StatusMessage | **Partial** | Has `aria-live="polite"`, but otherwise shares the generic readout structure. No specific treatment of neutral guidance, success, warning, or error. | §1, §3, §6 | **P0:** status semantics and intentional empty-message policy. |
| `NodeView`, generic Inspector | **Not compliant** | Apart from the member-specific branch, structured values pass through `display()` and become JSON text. That is not a readable learning inspector. | §1, §2, §3, §8 | **P1:** labeled property rows with units and grouped outputs; retain raw inspection only in an appropriate author/debug context. |
| `DatasetDisplay`, DataTable | **Not compliant** | Derives headings from raw record keys. No unit schema, numeric alignment, bounded vertical region, or explicit empty-data design. Empty arrays can appear as `[]`. | §3 tables, §6, §8, §9 | **P1:** typed columns, row/cell states, bounded scrolling. |
| `DatasetDisplay`, Chart | **Not compliant** | Infers series from numeric keys; has basic axis strokes but no meaningful ticks/units. Series use repeated colors with no matching patterns or direct labels. Caption lists names without mapping them to lines. | §3 charts, §8, §9 | **P1:** explicit axis/series metadata and accessible observation access. |
| `DatasetDisplay`, Histogram | **Not compliant** | Special branch assumes observed/expected records, uses hardcoded blue/coral, and describes series by color. Missing values can become invalid geometry. Every nonempty record dataset requested as a Histogram enters this branch. | §3 charts, §6, §9 | **P1:** validate expected fields, distinguish series beyond color, show a meaningful scale. |
| `DatasetDisplay`, Heatmap | **Not compliant** | Draws cells from arrays with a computed color scale but no scale legend, row/column meanings, or cell-value access. Empty arrays satisfy the matrix test and produce an empty SVG. | §3 charts, §6, §8, §9 | **P1:** shape/value validation, legend, accessible equivalent, empty state. |
| `NodeView`, Text / Formula / Legend | **Partial** | Text has heading/body/callout variants; formulas have a distinct style; legends contain text. Formula precision is not separately configured here, callout/selection fallbacks introduce a blue theme, and legend swatches have no pattern vocabulary. | §3, §4, §8 | **P1:** coherent tokens, formula states, series semantics. |
| `LayoutView`, authoring wrapper | **Partial** | Edit chrome is correctly gated by `author.authoring`, and selected items receive an outline. However, every authored item has a permanent type/name row; the screenshot shows “Readout,” “Form,” and “Action button” competing with actual content. | §2, §4, §10 | **P0:** quieter, host-owned selected/focused component chrome with an accessible route to settings. |
| `LayoutView`, panels / stack / row / grid / split / disclosure | **Partial** | Useful grouping, `min-width: 0`, wrapping, and a mobile grid rule exist. Generated grouping still puts long control inventories beside small scenes and important observations inside details. Viewport breakpoints do not guarantee a compact component inside a narrow desktop column. | §3 grouped content, §5, §9, §10 | **P0:** curate layout and size behavior with actual content. |
| `TabsLayout` | **Partial** | Has tab roles and selected state, but lacks the usual arrow-key/roving-focus behavior and explicit tab-to-panel linkage. Only the chosen subtree is rendered; preservation of drafts across tab changes needs a deliberate policy and test. | §6, §7, §9 | **P1:** complete tab interaction and preserve drafts by stable component identity. |
| `LayoutView`, Repeater | **Partial** | Checks stable keys, but failure emits an internal key-contract error. Default item content uses raw property names. | §3, §6, §8 | **P1:** author diagnostics and learner-safe local failure presentation. |
| `Appearance`, missing model/data branches | **Partial** | Gives useful connection hints, but “Connect a model…” and similar wiring instructions are not audience-specific. | §2, §8 | **P1:** actionable author state; meaningful learner waiting/unavailable state. |
| [modelRecipe](../../../src/web/src/simulations/components/composites/catalog.ts) | **Not compliant** for generated learning presentation | Enumerates commands into controls; falls back to command descriptions or uppercased identifiers with underscores removed. Adds Play / pause quick actions in addition to generated playing forms. Most outputs go into “Model assumptions and measurements.” | §1, §3, §5, §8 | **P0:** intentional primary controls, results, and advanced disclosure per recipe. |
| [recipe-lesson.css](../../../src/web/src/simulations/components/views/recipe-lesson.css) | **Partial** | Warm panel tokens and modest corners exist. Fields receive little styling beyond padding; every object gets a cool border; buttons have no semantic emphasis variants. Table treatment is minimal. | §4, §9, §11 | **P0:** scoped family styles with clear action, field, result, and feedback variants. |

## 2. Reusable controls: compliance table

These are distinct from public catalog definitions. Their existence does not mean `RecipeLesson` uses them.

| Implementation | Status | What to preserve / what needs work | Priority |
| --- | --- | --- | --- |
| [ActionButton](../../../src/web/src/simulations/components/controls/ActionButton.tsx) | **Partial** | Preserves accepted/rejected command handling and alert feedback; supports disabled state. Styling is optional and supplied by callers. Add consistent primary/secondary/quiet variants and contextual restriction explanations where needed. | P0 |
| [ParameterSlider](../../../src/web/src/simulations/components/controls/ParameterSlider.tsx) | **Partial** | Label, bounds, step, controlled value, and rejection feedback exist. Display is optional; no exact numeric editing path. Pair range and numeric input around one value/validation contract. | P0 |
| [NumberField](../../../src/web/src/simulations/components/controls/NumberField.tsx) | **Partial** | Local draft, range/integer checks, invalid state, and associated error are strong foundations. Valid values commit during typing; blur clears the draft even after rejection. Document live behavior and provide recoverable explicit-submit behavior for disruptive actions. | P0 |
| [BoundControl](../../../src/web/src/simulations/components/controls/BoundControl.tsx) | **Partial** | Reuses primitives and displays a formatted value/unit. Slider and number entry are alternatives, not a paired precision control. Fixed three-decimal policy and numeric coercion need an explicit availability contract. | P1 |
| [ToggleControl](../../../src/web/src/simulations/components/controls/ToggleControl.tsx) | **Partial** | Controlled checkbox and state-dependent action wording are useful. Persistent toggle buttons need suitable state semantics; action-style Play/Pause can retain changing action labels. Shared styling is missing. | P1 |
| [OptionSelect](../../../src/web/src/simulations/components/controls/OptionSelect.tsx) | **Partial** | Native select, meaningful option labels, and command rejection feedback. Needs consistent field layout, unit/help/error associations, and unavailable/disabled choices when appropriate. | P1 |
| [IntegerStepper](../../../src/web/src/simulations/components/controls/IntegerStepper.tsx) | **Partial** | Clear increase/decrease labels and disabled bounds. Blur commits and rejected input is restored. `key={value}` can remount input after external changes; draft/focus behavior needs checking. Its wrapping label also contains multiple interactive controls; review semantic grouping. | P1 |
| [FractionInputControl](../../../src/web/src/simulations/components/controls/FractionInputControl.tsx) | **Partial**, useful reference | Numerator and denominator are named, with a meaningful fraction group. Denominator edits can clear/clamp the numerator; this consequence must be visible wherever the control is used. | P0 reference / P1 completion |
| [PlaybackControls](../../../src/web/src/simulations/components/controls/PlaybackControls.tsx), [MathPlayback](../../../src/web/src/simulations/components/controls/MathPlayback.tsx) | **Partial**, useful reference | Play/Pause wording follows state; math actions consider completion and looping. Scope “Reset” and “Replay”; expose speed selection semantically and distinguish action emphasis. Do not recreate checkbox-plus-submit playback. | P0 reference |
| [ArithmeticControls](../../../src/web/src/simulations/components/controls/ArithmeticControls.tsx), [CountingControls](../../../src/web/src/simulations/components/controls/CountingControls.tsx) | **Partial**, useful reference | “First number,” “Add this many,” and “Count the circles” express the activity. Reuse these meanings in public presentation; their session-bound dispatch is not a drop-in recipe integration. | P0 reference |
| [FractionBuilderControls](../../../src/web/src/simulations/components/controls/FractionBuilderControls.tsx), [FractionNumberLineControls](../../../src/web/src/simulations/components/controls/FractionNumberLineControls.tsx) | **Partial**, useful reference | Named bars/fractions, bounded choices, and subdivision actions are substantially clearer than schema dumps. FractionBuilder explains denominator clearing versus subdivision. Standardize layout and reset scope. | P0 reference |
| [YoungLearnerControls](../../../src/web/src/simulations/components/controls/YoungLearnerControls.tsx) | **Aligned base** | Simple disclosure groups adult setup with guidance. Keep it where audience and activity support that distinction; do not hide the learner's main action there. | P2 |
| [MathObjectControl](../../../src/web/src/simulations/components/controls/MathObjectControl.tsx) | **Partial** | Supports keyboard activation, accessible names, disabled state, and passive rendering. Rejected action feedback exists only in an SVG title; provide perceivable feedback outside hover/title behavior. | P1 |
| [DragHandleControl](../../../src/web/src/simulations/components/controls/DragHandleControl.tsx) | **Partial** | Visible dashed affordance, pointer capture, touch handling, adaptive hit radius, and arrow-key alternative. Returned command failures are ignored; complete rejection and cancellation feedback. | P1 |
| ProjectileControls / BridgeControls / TownControls | **Inherited** | Thin compatibility wrappers around `SpatialRecipeView`, with `controlsOnly`. Fix the shared recipe surface. | Follows P0/P1 |
| EqualGroupsControls / MathPrimaryControls; chemistry, dynamic, natural, and physical control modules | **Not assessed individually** | Inventory includes these modules, but this audit does not claim complete state review. Inspect consumers before deciding whether to consolidate, retain, or retire them. | P1 follow-up |
| OrbitCameraControl | **Partial** | A camera adapter using town view settings. Host gesture policy and accessible camera alternatives require review; no independent visual redesign is justified by the supplied screenshots. | P2 |

## 3. Results, views, and scene foundations: compliance table

| Implementation | Status | Evidence and remaining work | Priority |
| --- | --- | --- | --- |
| [MetricsView](../../../src/web/src/simulations/components/views/MetricsView.tsx) | **Partial** | Value precedes label, which is a useful start. Arbitrary ReactNode values and optional className leave units, precision, unavailable state, and stable numeric layout entirely to callers. | P0/P1 |
| [MathReadoutView](../../../src/web/src/simulations/components/views/MathReadoutView.tsx) | **Partial**, useful reference | Prominent equation, meaningful explanation, unfinished-result `?`, and feedback. Has live-region treatment. Use its domain wording as a reference; verify announcement frequency and compact layout before reuse. | P0 reference |
| [ResultsTableView](../../../src/web/src/simulations/components/views/ResultsTableView.tsx) | **Partial** | Has labeled/unit-bearing column headers, `scope="col"`, numeric formatting, and bounded horizontal/vertical scrolling. Missing explicit empty/missing-cell treatment and numeric-column styling. Validation throws during render; inspect error containment at the host. | P1 |
| [TimeSeriesView](../../../src/web/src/simulations/components/views/TimeSeriesView.tsx) | **Partial** | Meaningful title/time unit, data validation, basic axes, and model assumption. Needs fuller scale labeling, empty/error states, and equivalent inspectable data. Render-time validation throws. | P1 |
| [HistogramView](../../../src/web/src/simulations/components/views/HistogramView.tsx) | **Partial**, useful reference | Solid versus outline series improves on the generic histogram's color-only distinction. Still needs empty state, readable scale, expected-value access, and compact review. | P1 |
| [XYGraphView](../../../src/web/src/simulations/components/views/XYGraphView.tsx) | **Partial** | Dashed comparison curves and current markers help. Range axis lacks unit/tick context; accessible name is generic; small SVG labels and store-bound behavior need review. | P1/P2 |
| [LegendView](../../../src/web/src/simulations/components/views/LegendView.tsx) | **Partial** | Supports labels and dashed samples. Fixed SVG font sizing/placement needs narrow-container and long-label checks. | P1 |
| [EntityInspectorView](../../../src/web/src/simulations/components/views/EntityInspectorView.tsx) | **Not compliant** as learner presentation | Raw ID, raw keys, and JSON values dominate; the speed slider ignores dispatch feedback. Parameters and outputs are merged into one property list. | P1 |
| [MemberInspector](../../../src/web/src/simulations/components/views/MemberInspector.tsx) | **Partial** | Gives meaningful state, load category, and model limitation. Verify styles load on the recipe route and distinguish member identity from internal identifiers where necessary. | P1 |
| [DomainObservationViews](../../../src/web/src/simulations/components/views/DomainObservationViews.tsx) | **Not compliant** as learner presentation | Converts values to strings, exposes instance IDs/property keys, and puts “see assumptions” in a measurement unit. This loses typed numeric comparison and point-of-use meaning. | P1 |
| [ProjectileObservationViews](../../../src/web/src/simulations/components/views/ProjectileObservationViews.tsx) | **Partial** | More meaningful Ball labels, units, comparisons, and progressive disclosure. Inherits table/inspector/time-series gaps; determine current route usage before investing. | P1/P2 |
| [ComparisonView](../../../src/web/src/simulations/components/views/ComparisonView.tsx) | **Aligned base** | Wrapping arrangement with labeled panels and no invented model behavior. Child content owns data semantics and states. | P2 |
| [SVGWorldView](../../../src/web/src/simulations/components/views/SVGWorldView.tsx) | **Aligned base** | Small SVG surface; accepts caller roles/labels and does not add a card to each object. Interactive callers still need appropriate semantics and controls. | Preserve |
| [CompositionCanvas](../../../src/web/src/simulations/components/views/CompositionCanvas.tsx) | **Aligned base** | Dispatches to renderer providers and lazy-loads the town view with loading text. Preserve this separation; renderer compliance is independent. | Preserve |
| [CartesianView](../../../src/web/src/simulations/components/views/CartesianView.tsx) | **Partial**, preserve foundation | Scene objects remain in the scene; Reset view is distinct from experiment reset; line endpoints and square centers support keyboard movement. Square size/rotation handles are focusable but their keyboard branch returns without updating them. Pointer cancellation currently calls the same commit path as completion. | P2 targeted correction |
| [DisplayView](../../../src/web/src/simulations/components/views/DisplayView.tsx) | **Partial**, preserve foundation | Separates display size from domain size, provides clear help, Reset view, and keyboard move/resize. Gas animation uses requestAnimationFrame; the global CSS reduced-motion rule alone cannot stop that loop. Verify host sizing and motion policy. | P2 |
| [FractionBuilderScene](../../../src/web/src/simulations/components/views/FractionBuilderScene.tsx), [FractionNumberLineScene](../../../src/web/src/simulations/components/views/FractionNumberLineScene.tsx) | **Partial**, preserve foundation | Meaningful scene labels and direct fraction interactions; fractions remain scene content rather than nested cards. Compact sizing, focus, and surfaced rejection feedback need whole-host checks. | P2 |
| [useCompactDiagram](../../../src/web/src/simulations/components/views/useCompactDiagram.ts) | **Partial** | Uses viewport width (`650px`), not allocated component width. A narrow preview on a wide screen can still receive the full-width scene arrangement. | P1/P2 |
| [ExperimentLessonFrame](../../../src/web/src/simulations/components/views/ExperimentLessonFrame.tsx) | **Aligned base** | Clear slots for goal, scene, panel, feedback, and details. Assess composed content separately; this frame does not fix the active generic renderer. | Preserve/reference |
| [ControlsOverlay](../../../src/web/src/simulations/components/views/ControlsOverlay.tsx) | **Aligned base** | Portals content to a host-provided target. Host remains responsible for placement, availability, and focus behavior. | Preserve |
| ExperimentView / InstanceRecipeLesson / ThreeWorldView / AssemblyView / ChemistryLesson / DynamicSystemsLesson / PhysicalSystemsView / NaturalSystemsView | **Inherited** | These inspected entry points route to recipe assembly or alias it. NaturalSystemsContent also composes instance lessons. They do not constitute separately polished component families. | Follow canonical renderer |
| LegacyRecipeView / SpatialRecipeView / AssemblyRecipeView | **Not assessed fully** | Identified as recipe integration points by their callers. Runtime synchronization, lifecycle, and host fidelity need focused follow-up; no full compliance claim here. | P1 integration checks |
| ArithmeticScene / CountingScene / EqualGroupsScene / ProjectileScene / BridgeScene / AuthoredTownView / ScopedWorldView | **Not assessed fully** | Preserve domain scene direction. The supplied examples do not justify replacing these foundations, but do not prove every state or input method works. | P2 targeted audit |
| MathExperimentView / ElementaryExperimentView / GasPressureView | **Not assessed fully** | Older/domain assemblies remain in the tree. `ExperimentView` routes gas, math, and elementary demos through LegacyRecipeView; do not assume these files own the screenshots. | Trace usage before changes |
| `visuals/` adapters | **Not assessed as a complete family** | Rendering primitives are appropriate in principle; each interactive visual still needs semantics, contrast, hit-target, and compact review. Retaining geometry is compatible with redesigning controls/results. | P2 sampling, then exceptions |

## 4. Remaining directory coverage

This is a presentation-focused audit, not a claim that every source file has passed architectural or numerical review.

| Directory / files | Audit treatment | Relationship to redesign |
| --- | --- | --- |
| `contracts/`, `definitions/`, `registry.ts` | **N/A: nonvisual** | Preserve validation, field semantics, and registry boundaries. Add presentation metadata separately from model execution. |
| `traits/`, `systems/`, `behaviors/` | **N/A: nonvisual** | Preserve authoritative state and command behavior. Surface units, restrictions, and model limitations through presentation adapters. |
| `prefabs/`, `resources/`, `compositions/` | **N/A: nonvisual** for direct styling | Recipes, defaults, palettes, and learning policies can affect the visible result; inspect relevant data when curating the learner experience. |
| `catalog/` | **Presentation contract review** | `generic.ts` was inspected directly. Its generic labels and limited presentation configuration contribute to the shared gaps. Other catalog modules are not individually signed off. |
| `composites/` | **Presentation assembly review** | `catalog.ts:modelRecipe` was inspected directly and is P0. `spatial.ts` needs separate recipe-level review before assigning its own compliance status. |
| Command adapters and selection/prompt helpers in `controls/*.ts` | **N/A: nonvisual** | Retain dispatch contracts while replacing visible forms. |
| Domain CSS files and visual helper modules | **Not assessed comprehensively** | Check actual imports and computed styles on active routes. Existing CSS or a retired polished view is not proof that the recipe path uses it. |

## 5. Why the supplied screens look unfinished

### 5.1 The form mirrors a transport format instead of a task

The fraction form exposes the structure `command → value → a/b → n/d`. That structure is useful to validation and dispatch. It creates unnecessary visual nesting when used as the interface. The learner is asked to decode “n (parts),” “d (parts),” and “bar 0” before changing a fraction.

The outer warm panel already groups the activity. Adding a border to every object repeats framing without adding useful meaning. In the screenshots, the eye follows boxes and command headings instead of the editable values and their relation to the bars.

The refactor should retain the same argument payload internally while presenting “First fraction” and “Second fraction,” each with “Shaded parts” and “Total parts,” or numerator/denominator wording appropriate to the audience. Array indices need display labels such as “Bar A.” Units should add meaning: “factor (factor)” and “piece (piece)” do not.

Not every fieldset should disappear. A real group of related fields deserves semantic grouping and sometimes a visible boundary. The unwanted structure is the incidental `value` wrapper and repeated nested framing.

### 5.2 Actions have neither hierarchy nor sufficiently clear consequences

NEXT STEP appears twice because a schema-generated legend and button both carry its name. “Apply” repeats after unrelated operations. A small step forward, a reset, a task rebuild, and a playback change all receive nearly identical full-width outline treatment.

The playing control is especially revealing: the description “true advances the model clock; false pauses the model clock” becomes a visible label, with a `value` checkbox and Apply. The generator also adds a Play / pause quick action. One underlying ability becomes two competing interfaces.

Use a state-aware Play or Pause action beside the scene, a clearly scoped Next step, and a quieter Restart activity. Give task-changing forms one explicit action such as “Start this calculation.” Submit is still appropriate when changing the task rebuilds tokens or clears progress. Do not turn every field into a live command simply to remove buttons.

### 5.3 The result has less visual weight than its label

The readout screenshot makes `feedback` and `playing` appear as the important content. An empty feedback string leaves a heading with nothing useful below it; the boolean becomes “No,” without explaining what is not happening. In Build, an additional “Readout” label adds another layer of hierarchy.

A meaningful presentation might read “Paused” beside playback. Arithmetic should expose its current equation and progress near the token scene. Fraction comparison should expose the relation between the two fractions near the bars. These are proposed presentations derived from authoritative state; they must not prematurely show a completed answer or introduce a second model calculation.

A numerical measurement should prioritize the value, then unit and label, with contextual explanation where useful. A status should prioritize its meaning. They should not be forced into the same rendering merely because both bind to a value port.

### 5.4 Generated completeness overwhelms the learning sequence

`modelRecipe` enumerates available commands, so the default lesson can become a command inventory. MOVE TOKEN and TOGGLE FRACTION PIECE may be useful supported operations, but direct manipulation can be their primary learner interaction, with an accessible alternative nearby. They do not automatically need a permanent generic form.

Important outputs also go into the same disclosure as model assumptions. That makes the learner's immediate feedback harder to find. Separate the main outcome, current activity feedback, optional measurements, and model explanation according to their purpose.

Keep the complete command catalog available to authors. Curate the default learner composition. Existing custom documents still need usable generic forms, so curated recipes and a better generic renderer are complementary work.

### 5.5 Build previews need quieter chrome and size-aware content

The screenshots with Edit controls are consistent with the authoring branch in `LayoutView`; they are not evidence that Edit leaks into learner mode. The actual issue is repeated authoring headings competing with the preview.

The host can show selected/focused component identity and a reachable settings action while allowing the content to remain faithful to learner presentation. Selection must remain discoverable by keyboard and touch; hiding everything until hover would create a different failure.

The four narrow panels show why viewport responsiveness alone is insufficient. A scene can be squeezed inside a desktop layout while `useCompactDiagram` still chooses its desktop arrangement. Reflow should follow allocated component width, or use an explicit compact presentation supplied by the host. Do not solve narrow columns by shrinking all text.

### 5.6 Shared styling exists, but it is too shallow

The source does contain global focus outlines, teal native-control accents, disabled cursors, and CSS reduced-motion handling in [globals.css](../../../src/web/src/app/globals.css). This audit does not claim they are absent.

However, global button styling resets background and border. The recipe stylesheet adds an outline and padding without establishing a primary-action variant. Inputs and selects receive padding/max-width but lack a coherent family treatment. Nested fieldsets use a cool hardcoded border against the warm theme. These source rules are consistent with the supplied images; computed-style attribution still needs browser verification.

Use scoped component classes and application tokens for interactive chrome. Domain colors can remain where they distinguish quantities or objects; the philosophy does not require every plot or fraction to be teal. Meaningful color distinctions need supporting labels, patterns, or markers.

## 6. Proposed redesign contract

These are implementation recommendations, not existing APIs or new rules retroactively attributed to the philosophy.

| Family | Intended default presentation | Required behavior and states |
| --- | --- | --- |
| Numeric field | Meaningful label, consistently sized input, adjacent unit, optional help | Local incomplete draft; explicit live/submit policy; field-associated error; accepted value; recovery after rejection. |
| Slider | Label and current value above/beside a usable track; exact entry when meaningful | Keyboard/touch operation, bounds and step, one authoritative value shared by track and numeric entry, visible rejection. |
| Toggle | Descriptive checkbox/switch for a persistent setting, or state-aware action wording for playback | Accepted state reflected accurately; disabled cause when unclear; no redundant Apply for immediate toggles. |
| Action | One label describing its effect; primary/secondary/quiet treatment by consequence | No empty fieldset; pending state only for genuinely asynchronous work; success after acceptance; local failure feedback. |
| Compound form | One meaningful group, readable subgroups, aligned labels/fields, one scoped submit | Schema validation retained; field errors mapped to presentation paths; draft retention through settings/tab changes. |
| Measurement | Prominent value, adjacent unit, supporting label/context; tabular numerals | Distinguish zero, missing, unavailable, invalid, and loading; deliberate precision. |
| Status | Short meaningful statement near the relevant action or scene | Intentional empty state; appropriate live announcement; no repeated empty heading or raw boolean. |
| Table | Readable column labels/units; numeric alignment; bounded overflow | Empty/missing/invalid distinctions; preserved headings when useful; keyboard-reachable overflow and adequate text size. |
| Chart/heatmap | Plot dominates, with meaningful axes/scale and series mapping | Empty/invalid handling; non-color series distinctions; accessible data equivalent; compact layout. |
| Scene | Geometry and direct manipulation remain in the scene | Visible handles, keyboard alternative, usable targets, rejection feedback, presentation/domain size distinction. |

Add presentation metadata keyed by stable argument/output paths: learner label, help, unit display, group, action label, ordering, and commit policy where applicable. Keep schema ranges/types and runtime acceptance authoritative. Do not derive friendly labels by globally replacing identifiers, because names can have domain-specific meanings.

Separate content-family rendering from host chrome inside `RecipeLesson`. A small dispatch layer can select a field, action, measurement, status, dataset, or scene presentation. Existing primitives can supply parts of those implementations after their behavior is normalized. Avoid a generic card wrapper that dictates identical spacing and borders to every family.

Drafts and runtime values need an explicit relationship. `SchemaForm` initializes local state from `initial`; it does not itself subscribe that state to accepted model values. Reset, another control, or direct scene manipulation can therefore require a synchronization decision. Verify each route rather than assuming the displayed draft is the current model value. Preserve an active dirty draft deliberately, show when underlying state changes, and adopt accepted state at documented boundaries.

## 7. Recommended implementation order

| Stage | Concrete work | Reviewable outcome |
| --- | --- | --- |
| **P0-A: family foundations** | Shared scoped field/action/measurement/status styles, tokens, labels/units/errors, and semantic variants. Use one slider and one numerical observation as reference components. | Default, editing, invalid, unavailable, compact, and selected examples in the actual recipe host. |
| **P0-B: active renderer** | Remove empty action fieldsets; flatten incidental argument envelopes; route supported widgets to meaningful presentations; add result/status hierarchy. Preserve dispatch and validation. | Existing saved recipes improve without changes to model behavior or command identity. |
| **P0-C: arithmetic and fractions** | Curate primary actions, task setup, direct interactions, main results, advanced settings, and reset scope. Remove redundant playback representations from generated defaults. | Rebuild the supplied scenarios with clear learning flow and substantially less nesting. |
| **P0-D: authoring preview** | Reduce repeated chrome, keep selection/settings reachable, and validate narrow allocated widths. | Build preview conveys the same content hierarchy as learner mode. |
| **P1-A: state consistency** | Synchronize accepted values/drafts, preserve drafts across tabs, handle rejection for pickers/direct manipulation, and distinguish learner/author missing states. | Visible state agrees with document/runtime behavior. |
| **P1-B: datasets and inspection** | Consolidate generic and dedicated table/chart behavior where contracts match; add metadata, availability states, numerical formatting, and accessible equivalents. | Public displays are useful learning components rather than object dumps. |
| **P2: scene exceptions and secondary paths** | Fix keyboard/cancel gaps, inspect 3D navigation and reduced motion, review remaining domain controls and styles after tracing consumers. | Existing scene foundations pass targeted host/input checks without unnecessary rewrites. |

Do not remove compatibility exports or rewrite model systems as part of a styling cleanup. Trace consumers first. Recipe curation also needs a migration/version decision: improving defaults should not silently discard controls from user-authored saved documents. Preserve identifiers, connections, and runtime contracts, or migrate them explicitly with recovery.

## 8. Acceptance matrix for the refactor

The following checks are work still required, not tests reported as passed by this audit.

| Scenario | Pass condition |
| --- | --- |
| Arithmetic learner screen | One clear primary activity; useful equation/progress; no raw `value`, empty fieldsets, uppercase command IDs, or duplicate playback interface. |
| Fraction comparison | Named fractions with understandable fields; comparison visible near bars; denominator/subdivision consequences explained; direct interaction has an accessible alternative. |
| Build preview versus learner | Same content meaning and state; author chrome only where appropriate; keyboard/touch access to settings; selection does not imitate learner state. |
| Valid zero / false / empty string / absent output | Each follows an intentional semantic policy. Zero stays zero; paused is understandable; empty feedback does not create an empty result block. |
| Invalid numeric draft and rejected command | No fabricated success or invalid model mutation; error is associated with the field/action; recovery is possible; focus remains useful. |
| Reset or external update during editing | Documented draft policy; visible accepted state is truthful; scopes of view reset, activity restart, and experiment reset are clear. |
| Tab switch and opening settings | Dirty drafts follow the chosen preservation policy; unrelated presentation changes do not reset the simulation. |
| Long table / missing cell / invalid dataset | Bounded scroll, readable headings/units, aligned numeric values, and local recoverable failure. No undifferentiated whole-experiment error. |
| Chart / histogram / heatmap | Readable units/scales; identifiable series beyond color; meaningful empty state; essential observations reachable without hover. |
| Narrow desktop component and mobile viewport | Reflow follows available width; essential labels and controls remain readable and reachable; no tiny scaled scene labels or silent overflow. |
| Keyboard / pointer / touch / motion preferences | Primary actions, fields, and important scene edits work; visible focus; no hover-only essential information; motion policy covers JavaScript animation as well as CSS. |
| Multiple components and saved documents | Independent state and existing command semantics preserved; old documents remain usable; presentation changes do not create extra model clocks. |

Capture the arithmetic and fraction scenarios in learner and Build modes, including compact width, invalid input, unavailable result, and selected state. Add interaction checks around the actual failure-prone behavior—draft persistence, accepted state, reset scope, keyboard alternatives, and dataset errors. Model tests alone cannot demonstrate presentation compliance.

The first milestone should be a coherent arithmetic/fraction experience through the shared recipe renderer. That fixes the problems in the supplied images while establishing reusable patterns for the broader component refactor.

## 9. Work done

Date: 2026-10-05. Scope: the controls-and-results presentation milestone and the subsequent shared data-display milestone. The original audit above remains the historical assessment; this section records implemented changes and their verification, rather than claiming that every inventoried component is now compliant.

### Implemented presentation and interaction changes

| Surface | Work done |
| --- | --- |
| `SchemaForm` | Removed empty action fieldsets and incidental single `value` envelopes. Added meaningful compound grouping, aligned fields, readable units, explicit primary submit actions, contextual success/error feedback, and accessible invalid/error associations. Preserved primitive schemas used by the builder input editor, array/object payloads, validation, and explicit submission for rebuilding activities. |
| Semantic metadata | Added `controls/commandPresentation.ts` with stable command/argument mappings for activity labels, first/second numbers, named fractions, shaded/total parts, operation choices, named bars, scoped submit labels, and explanations of task replacement and denominator changes. Existing author-customized control labels remain authoritative. |
| Slider and numeric entry | Added paired range/exact-entry presentations and a visible current value. Reusable `ParameterSlider` shares its authoritative value with `NumberField`. Recipe sliders preserve incomplete/rejected exact-entry drafts while the track continues to show accepted state; Escape restores the accepted value. Numeric fields retain rejected drafts on blur and support Escape recovery. |
| Actions, toggles, selects | Added shared primary/secondary/quiet action variants and coherent field/toggle/select layouts. Rejection feedback is local and associated with the relevant control. Safe looping/division setters declare continuous submission; disruptive task changes retain explicit submission. Zero-argument actions avoid repetitive generic success banners. |
| Playback | Recipe playback uses one accepted-state Play/Pause action with Running/Paused wording, including gas properties stored in `inputs`. New default recipes omit redundant schema-generated playback controls and duplicate playback observations. Fraction comparison no longer displays a playback status for an activity with no playback command. |
| Measurements and statuses | Readouts emphasize values with adjacent units, supporting labels, deliberate precision, and tabular numerals. Empty/missing numerical results show Unavailable; valid zero remains visible. Status messages have optional neutral/success/warning/error tones, meaningful boolean wording, and polite announcements. Empty activity feedback produces no result block. Gas pressure is visible beside its scene. |
| Arithmetic and fractions | Default recipes put activity setup before compact action rows, retain secondary operations under “More ways to explore,” and initialize task forms from authored defaults. Scenes show the existing authoritative equation/comparison and explanation through `MathReadoutView`; unfinished calculations keep `?`. Commands remain available through the composition and disclosure. |
| State synchronization | Clean arithmetic/fraction setup forms and object-property controls follow accepted runtime changes and resets. Dirty explicit drafts remain recoverable through “Discard edits.” Tab panels remain mounted so switching tabs preserves drafts; tab controls have arrow/Home/End navigation, roving focus, and explicit panel linkage. |
| Build preview | Replaced persistent type/name rows with compact, named pencil settings actions. Selection/focus treatment remains distinct from learner state. Board-host ownership propagates through nested layout content, preventing duplicate authoring chrome and panel headings. Learner mode contains no author settings actions. |
| Shared styling | Applied warm application tokens, restrained teal emphasis, fine borders, consistent input/action sizing, purposeful spacing, visible focus, exact-entry unit alignment, and width-aware slider reflow. Primary hover styles retain contrast in the builder. Action rows preserve intrinsic sizing so buttons cannot overlap. |

### Compatibility and implementation boundaries

Saved documents are rendered through the improved shared presentation without rewriting their identifiers, connections, or authored layout. Recipe curation changes newly generated defaults; it does not remove controls from an existing user-authored document. Model computation and runtime dispatch remain authoritative. The optional status tone configuration is backward compatible with documents that omit it.

The source ledger was extended for the new presentation helper and field metadata type. A dedicated `npm run test:components:browser` command now runs the behavioral component regression suite. The unified-builder browser selectors were updated for “Apply changes” and the separated measurement unit.

### Verification evidence

- `npx tsc --noEmit`: passed.
- Biome checks for the changed implementation and browser-test files: passed.
- `npm test`: passed, including simulation/integration, builder graph/parity, public and spatial catalog, independent copies, rollback, serialization, migrations, source-ledger closure, and spatial-board contracts.
- `npm run test:components:browser`: passed for arithmetic/fraction hierarchy, rejected draft retention/recovery, accepted playback, clean-field reset synchronization, precise gas slider editing and rejection, pressure units, learner/Build separation, desktop/mobile overflow, keyboard tabs, and draft preservation.
- `node scripts/verify-unified-builder-browser.cjs`: passed for setup, catalog insertion, Build preview, independent dilution copies, atomic undo/redo, saved composites, recovery, and mobile layout.
- `node scripts/verify-builder-input-editor-browser.cjs`: passed for the shared primitive-schema manual input path, draft preservation across source modes, add-and-connect, undo, Escape, and responsive input editing.

Browser verification used an isolated local Next development build on port 43002 with `.next-component-review` output, preserving the existing development server. The Browser plugin's required execution tool was unavailable, so verification used the repository's local browser regression harness. Desktop, learner, and compact control captures were visually inspected. Session captures are in `/private/tmp/component-arithmetic-*`, `/private/tmp/component-fraction-builder-*`, and `/private/tmp/component-slider-measurement.png`.

### Data-display milestone (2026-10-05)

Implemented the next P1 batch against both the component and builder design philosophies. This milestone covers the public DataTable, Chart, Histogram, and Heatmap presentations, their recipe host, the compatible dedicated result views, and their authoring settings. The historical status tables above remain the original assessment.

| Surface | Work done |
| --- | --- |
| Shared rendering and metadata | Extracted `views/DatasetDisplay.tsx`, `views/dataPresentation.ts`, and scoped `views/data-display.css`. Added optional typed column headings, units, precision, axis labels, series selection, and grid labels to the public display configuration. Stable provider/output mappings describe probability, chemistry, physical, traffic, queue, plant, and population data. Unknown record columns retain their source keys until an author supplies meaningful headings; units are not guessed from arbitrary numerical values. |
| Tables | Added readable headings and adjacent units, aligned numbers with tabular numerals, sticky headings, alternating row treatment, and a named, keyboard-scrollable region bounded to 300px. Zero and false remain valid observations; missing, unavailable, and invalid values have explicit text. Very small nonzero and large values use scientific notation. Structured cells no longer fall through to raw JSON. |
| Charts | Added axis labels, units, readable scale ticks, deliberate numerical bounds, matching legends, distinct line patterns and markers, and an expandable observations table. Missing/invalid samples break lines rather than becoming zeros or joining across gaps. Single and isolated observations remain visible. Mixed-unit series, unsupported series counts, and invalid numeric extents produce a local explanation with inspectable data. Resize observation adapts plot geometry to the allocated width; larger plots use named keyboard-scrollable regions and compact overflow guidance. |
| Histograms | Validate outcome labels and finite, nonnegative observed/expected values before constructing bars. Observed solid bars and expected outlined bars share a readable frequency scale, categorical axis, matching legend, and exact observations table. Invalid frequency records retain their table instead of producing invalid SVG geometry. New probability dataset displays use the Histogram family. |
| Heatmaps | Validate nonempty rectangular finite numeric grids and bounded cell counts before rendering. Added indexed row/column context, a labeled numerical color scale, a constant-field state, and a bounded plot region. Exact row, column, and cell values are available in the observations table without hover. Diffusion metadata uses the model's actual `mass units/m²` contract; new diffusion recipes use Heatmap for the field output. |
| Dedicated views and local states | `ResultsTableView`, `TimeSeriesView`, and `HistogramView` now delegate compatible presentation to the shared family. Incompatible time-series contracts remain local and preserve the data table. Empty observations, unavailable sources, invalid data, and valid zeros receive distinct presentation. Authoring hints remain author-specific, with the existing host settings action available; learner states describe waiting or unavailable observations. Displays have one title instead of a repeated outer label and caption. |
| Authoring settings | Added `builder/composition/DataDisplaySettings.tsx` with a compact title/precision task and disclosed column, plot, series, and grid settings. Authors can add/remove columns, choose value types, restore source columns, and select numeric series. Drafts are explicit, rejected changes remain editable, Discard edits restores authored settings, and Apply display settings is one undoable document operation. Labels explain that unit edits do not convert data. The primary action retains teal emphasis and a 44px minimum height in the actual dialog; Close settings is a quiet dismissal. |
| Runtime and host continuity | Corrected Dataset resource lifecycle metadata: parsed runtime rows must not be overwritten by authored JSON strings during a presentation refresh. Identical document updates and label edits preserve parsed rows; authored row changes reinitialize the resource. The recipe host retains component identity across Build/learner changes, preserving opened observation disclosures while removing author chrome. Model calculations, dispatch, saved identifiers, and connections remain unchanged. |

Optional metadata is backward compatible with existing documents. New recipe defaults do not rewrite saved display types or authored layouts. The source ledger includes the new files and consumers while preserving its curated audit fields. `npm run test:components:data` runs the data/state regression checks; `npm run test:components:browser` now includes both the existing controls suite and the new data-display browser suite. Data regressions are also part of `npm test`.

Verification for this milestone:

- `npx tsc --noEmit`: passed.
- Biome checks for all changed implementation, configuration, and regression files: passed.
- `npm test`: passed, including the new state/geometry/resource-refresh checks and the existing simulation, integration, authoring, recipe, migration, rollback, source-ledger, and spatial-board checks.
- `npm run test:components:browser`: passed. The data fixtures cover real probability, diffusion, and population outputs; a long record table; two series with missing samples; empty/unconnected/invalid states; precise units and zero values; finite SVG geometry; sticky headings; keyboard scrolling and disclosures; Build/learner continuity; and mobile/narrow-desktop overflow. Authoring checks cover adding an incomplete column, rejected draft retention, Discard edits, explicit Apply, atomic Undo, mobile access, computed primary styling, and target height. Existing arithmetic, fraction, gas-slider, playback, reset, and tab regressions also pass.
- `node scripts/verify-unified-builder-browser.cjs`: passed for the existing setup, catalog, preview, independent copies, atomic undo/redo, composite saving, recovery, and mobile flows.
- Desktop, learner, 390px/768px viewport, 300px allocated chart, and desktop/mobile settings captures were inspected. Browser checks used the existing isolated local development server on port 43002 and the repository's Chrome harness because the Browser skill's required execution tool was unavailable. Captures are in `/private/tmp/component-data-*`.

### Remaining work

The shared public data families and compatible dedicated views have representative browser verification; this is not a sign-off for every specialized domain visualization, `XYGraphView`, generic/entity inspectors, remaining domain controls, or scene/camera interaction. The gas scene's existing canvas framing still needs a separate scene/host review. Runtime synchronization is implemented for the reference arithmetic/fraction tasks, object-property controls, looping, and Dataset resources; other domain-specific command adapters still need their own accepted-value mappings. Full screen-reader, real touch-device, reduced-motion, zoom/text-scaling, large-grid performance, and every saved-document combination reviews remain outstanding. Histogram presentation intentionally supports the existing observed/expected frequency contract; arbitrary distribution records need a separately defined bin/series contract. The historical P1/P2 findings continue to describe those follow-up paths.
