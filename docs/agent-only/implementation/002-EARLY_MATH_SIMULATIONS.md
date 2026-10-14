# Early mathematics simulations: implementation plan and component inventory

**Status:** Implemented, 2026-10-02. All five simulations have model providers, SVG scenes, controls, compositions, premade selections, and playground entry points.  
**Date:** 2026-10-02  
**Scope:** The five counting, arithmetic, grouping, and fraction simulations discussed with the user.

Follow [Component Architecture](../../COMPONENT_ARCHITECTURE.md), [Component Contracts](../COMPONENT_CONTRACTS.md), and the [component library conventions](../../../src/web/src/simulations/legacy/components/README.md). This extends the [existing implementation inventory](001-COMPONENT_IMPLEMENTATION.md); it does not replace the three working demos.

## Implementation notes

The inventory below records the planned responsibilities; the following consolidation keeps the implemented library small:

- Board, token, fraction, and sequence schemas are exported from `components/traits/MathBoards.ts`; their definition IDs stay distinct. `FractionComparisonBoard` names the implemented comparison trait.
- Board/assembly prefab functions, `FractionBar`, and `TokenGroup` are exported from `components/prefabs/MathBoards.ts`; `CounterToken` has its own implementation.
- The five prompt adapters are exported from `components/controls/MathCommands.ts`. Their supported phrases dispatch through the same validated model functions as manual controls.
- `MathExperimentView` provides the shared lesson layout and selects typed scenes/panels; `MathPlayback` assembles shared playback actions. Both are explicitly selected in applicable compositions and premade barrels.
- `runtime/mathModel.ts` coordinates pure domain providers and atomic command results; `runtime/mathSession.ts` owns the React subscription store. `runtime/mathCatalog.ts` declares the new definitions and ownership.
- Math starter/follow-up prompts run locally because the existing Apertus API schema currently accepts the three original demos. Their existing server-planned workflows remain integrated in the shell.
- Automatic placement stops at the target. Pause stops future model steps; an accepted visual transition finishes within 350 ms. Mobile scenes scroll within their own surface to preserve usable object sizes. There is no required dragging workflow: all interactions support taps and keyboard input.
- `pnpm-workspace.yaml` pins compatible motion dependencies (`motion-dom` 13.4.5 and `motion-utils` 13.3.0) after verifying the missing-export build failure with 13.5.0.

**Verification:** Model tests, type checking, lint, the production webpack build, existing Apertus integration checks, and Chrome interaction checks pass. Browser checks cover all five starter cards, repeated taps, keyboard activation, both arithmetic operations, sharing with remainder, equivalence/subdivision, denominator edits, fraction jumps and placement, mobile overflow, and reduced motion.

Model, command, prefab, lifecycle, and static SVG/control verification live in `scripts/verify-math.cjs`, invoked by `pnpm test`. Browser verification additionally covers direct controls, keyboard activation, playback, fraction shading/placement, mobile overflow, and reduced motion.

### Younger learner interface and repeating lessons

Counting, arithmetic, and equal groups use a picture-first layout with no child-facing buttons. They start automatically: hold the initial picture for 1.2 seconds, count/move one circle every 0.9 seconds, hold the answer for 2.4 seconds, and replay the same configured task. `MathSequence` stores `looping` and `phase` (`intro`, `steps`, `answer`) alongside its cursor, elapsed time, playing state, and run identity. The domain sequence helper owns the phase transitions using the existing runtime clock; views never schedule model steps. Setup changes restart the loop, zero-valued tasks still repeat, and disposal stops playback. Looping composition defaults are explicitly declared and validated.

`GrownUpControls` keeps number inputs, activity selection, pause/resume, and a repeat toggle in a native disclosure that starts closed. The text command bar is likewise folded away. Counting uses larger circles in a three-column grid that fits mobile screens without sideways scrolling. Looping counting/arithmetic scenes are passive pictures, so tapping objects does not interrupt the lesson. Fraction controls retain their interactive older-student layout. `SimpleMathActions` has been retired from the code, catalog, and premade selections.

## 1. Product scope and defaults

Grade bands describe intended difficulty, not alignment to a specific national curriculum. Every simulation uses SVG shapes, readable numbers, direct interaction, and short animations. No new rendering engine, external artwork, speech service, or physics solver is needed.

| Simulation / demo ID | Audience | Initial experience | Required first release |
| --- | --- | --- | --- |
| Counting Circles / `counting` | Grades 1–2 | Five uncounted circles; counter starts at zero | Tap each circle once, show counting order, count automatically, place a target number in a box, check answer, restart |
| Addition and Subtraction / `arithmetic` | Grades 1–2 | `3 + 2`; second group waits outside the result area | Switch addition/subtraction, change operands, move one object per step, play/pause/replay, show equation and remaining count |
| Equal Groups / `equal-groups` | Grades 2–4 | Three baskets with four circles per basket | Build equal groups, share a total between baskets, step/play distribution, show multiplication/division and leftovers |
| Fraction Builder / `fraction-builder` | Grades 4–7 | Equal-length bars showing `1/2` and `2/4` | Change denominator, shade/unshade pieces, compare two fractions, subdivide to demonstrate equivalence |
| Fraction Number Line / `fraction-number-line` | Grade 7 | `1/2 + 1/4`; marker begins at zero | Place a fraction, add/subtract using jumps, choose compatible tick divisions, show common denominators and improper/mixed forms |

Keep the interface instructional: a short task, a large scene, a small control panel, and textual feedback. Scores, accounts, adaptive lessons, generated curricula, sound, and saved progress are deferred.

## 2. Architecture and inventory conventions

- All new implementations live once under `src/web/src/simulations/components/<type>/`.
- Add five folders under `simulations/pre-made/` matching the demo IDs above. Each contains the existing nine type directories with selection-only `index.ts` exports and a root experiment export. No JSX, state, or defaults belong there.
- Runtime stores, scheduling, dispatch, validation, and instantiation stay under `simulations/runtime/`; these are infrastructure, not a tenth component type.
- Use `.ts` for pure data/model definitions and `.tsx` for React visuals, views, and controls. Small helpers and CSS stay beside their owner.
- **Reuse** means an existing implementation; **extend** means an existing implementation needs a compatible addition; **new** means a proposed component, not an existing export.
- The common inventory below is required by every simulation unless its consumers are restricted. Each simulation's table adds its complete specific selection. Dependencies such as the circle primitive are included through these explicit selections.
- No simulation needs a `behavior` component: learner commands and bounded step sequences are handled by systems. Every new composition selects `behaviors: []`, and its premade behavior barrel uses `export {}`.

## 3. Shared components

Paths below are relative to `src/web/src/simulations/components/`.

| Component / proposed file | Type | Status | Consumers and responsibility |
| --- | --- | --- | --- |
| `MathAppearance.ts` | resource | New | All; shared high-contrast palette, object sizes, focus/selection styles, and short transition durations |
| `VisualBinding.ts` | trait | Reuse | All; connect board/object instances to their SVG visual definitions |
| `ShapeVisual2D.tsx` | visual | Reuse | Counting, arithmetic, equal groups, number line; existing circle primitive for objects/marker; wrappers supply labels and interaction |
| `SVGWorldView.tsx` | view | Extend | All; existing SVG surface; support appropriate interactive semantics rather than retaining its default image role for interactive children |
| `ExperimentView.tsx` | view | Extend | All; explicitly choose the correct scene and panel by demo; current layout-based fallback renders the town |
| `MathReadoutView.tsx` | view | New | All; accessible counts, equations, fraction notation, instructions, and polite feedback; reads model outputs without recalculating answers |
| `ActionButton.tsx` | control | Extend | All; preserve command/error handling; add disabled state and accessible label support where needed |
| `OptionSelect.tsx` | control | Reuse | All; modes, preset tasks, denominator/tick choices |
| `IntegerStepper.tsx` | control | New | All; bounded integer input with plus/minus buttons and a numeric field; validated dispatch; easier for small children than precise sliders |
| `PlaybackControls.tsx` | control | Reuse | Counting, arithmetic, equal groups, number line; existing play/pause UI, wired to the active sequence |
| `PromptControl.ts` | control | Extend | All; select each demo's trusted command adapter; same dispatch/validation as manual controls |
| `MathObjectControl.tsx` | control | New | All; translate object/segment/number-line interactions into commands; keyboard and tap support, optional pointer drag with click-to-place equivalent |
| `MathSequence.ts` | trait | New | Counting, arithmetic, equal groups, number line; sequence cursor, step count, playing state, elapsed step time, completion, and run identity on the board entity |

`MathObjectControl` handles input only. Scene views translate pointer coordinates into candidate targets; systems validate and snap those targets. Visuals describe shapes and selection feedback. Basket and token display positions are derived from stable order and membership, so these examples do not need a new motion/physics trait or an authoritative `Transform2D` just for layout.

Each domain system is the sole writer of its board's `MathSequence`; the runtime supplies elapsed time and lifecycle commands. Use a small private pure sequence helper if useful, not a second system that competes for the same fields.

## 4. Counting Circles

Two modes: **Count these circles** and **Put N circles in the box**. Start with counts from 0–20, default 5. An empty scene explicitly represents zero. A circle records whether it has been counted and its counting order; repeated activation never increases the count twice.

| Component / file | Type | Status | Contract and purpose |
| --- | --- | --- | --- |
| `CountingTasks.ts` | resource | New | Immutable task presets, target counts, labels, and initial object orders |
| `CountableToken.ts` | trait | New, shared with arithmetic/groups | Stable order, counted ordinal or null, and zone/group membership; the selected domain system owns mutations |
| `CountingBoard.ts` | trait | New | Mode, target, token references, counted/placed total, and check-answer feedback; written by CountingSystem |
| `CountingSystem.ts` | system | New | Validate count/place/remove/check requests; advance automatic counting; derive totals from token state |
| `CounterTokenVisual.tsx` | visual | New, shared with arithmetic/groups | Compose ShapeVisual2D with ordinal, counted styling, and token identity; no counting logic |
| `CountingBoxVisual.tsx` | visual | New | Target area and label for placement mode |
| `CountingScene.tsx` | view | New | Responsive circle layout, box, SVG projection, and interaction targets |
| `CountingControls.tsx` | control | New | Assemble mode/task/target controls, play, next-step, check, and reset |
| `CountingCommands.ts` | control | New | Supported prompts such as “count 8 circles” and “start again”; validated bounded integer parsing |
| `CounterToken.ts` | prefab | New, shared with arithmetic/groups | Independent token identity, CountableToken, and VisualBinding |
| `CountingBoard.ts` | prefab | New | Board plus the available tokens; includes MathSequence; IDs scoped to the board |
| `CountingExperiment.ts` | composition | New | Assemble counting defaults, task presets, system, scene, controls, and measurements |

Required actions: `SET_COUNTING_TASK`, `COUNT_TOKEN`, `PLACE_TOKEN`, `REMOVE_TOKEN`, `CHECK_COUNT`, `NEXT_STEP`, `SET_PLAYING`, `REPLAY`, `RESET`. Count mode shows the current counter; placement mode checks against the target only when requested. Correct/wrong feedback includes text or an icon, not color alone.

## 5. Addition and Subtraction Playground

Use nonnegative integer operands from 0–20; addition totals must not exceed 20, and subtraction requires `b <= a`. Default `3 + 2`; subtraction preset `5 - 2`. New operand/mode edits rebuild the task atomically and leave it paused at the initial step.

| Component / file | Type | Status | Contract and purpose |
| --- | --- | --- | --- |
| `ArithmeticTasks.ts` | resource | New | Addition/subtraction examples and operand bounds |
| `CountableToken.ts` | trait | New shared component from section 4 | Track tokens in first, incoming, result, or removed zones |
| `ArithmeticBoard.ts` | trait | New | Operation, operands, token IDs, current quantity, and final result; ArithmeticSystem owns outputs |
| `ArithmeticSystem.ts` | system | New | Build and advance the concrete operation one token at a time; validate manual moves and publish equation stages |
| `CounterTokenVisual.tsx` | visual | Shared from section 4 | Circles, stable labels, movement interpolation, removed-state appearance |
| `OperationZonesVisual.tsx` | visual | New | First group, incoming group/result, and removed tray with operation labels |
| `ArithmeticScene.tsx` | view | New | Position the groups, animate accepted moves, connect token activation/drop targets |
| `ArithmeticControls.tsx` | control | New | Operation and operand inputs, next-step, play/pause, replay/reset |
| `ArithmeticCommands.ts` | control | New | Parse bounded commands such as “add 3 and 2” and “subtract 2 from 5” |
| `CounterToken.ts` | prefab | Shared from section 4 | Independent tokens |
| `ArithmeticBoard.ts` | prefab | New | Board, token zones, sequence state, and initial token instances |
| `ArithmeticExperiment.ts` | composition | New | Default task and all required selections |

Required actions: `SET_ARITHMETIC_TASK`, `MOVE_TOKEN`, `NEXT_STEP`, `SET_PLAYING`, `REPLAY`, `RESET`. `MOVE_TOKEN` accepts only a valid source token and destination for the current operation. Manual interaction pauses automatic playback before applying the action. Subtraction keeps removed tokens visible in a separate tray so the learner can see what changed.

## 6. Equal Groups Machine

Use 1–6 baskets, 0–10 tokens per basket, and at most 60 tokens. Build mode defaults to `3 × 4`. Share mode defaults to 12 tokens and 3 baskets. Include non-divisible totals: distributing 14 across 3 baskets shows 4 each and 2 left over, rather than implying an integer quotient is exact.

| Component / file | Type | Status | Contract and purpose |
| --- | --- | --- | --- |
| `EqualGroupsTasks.ts` | resource | New | Build/share presets and bounds |
| `CountableToken.ts` | trait | Shared from section 4 | Each token's basket or unassigned/leftover membership |
| `GroupingBoard.ts` | trait | New | Mode, basket IDs, total, group count, per-group count, quotient/remainder, distribution cursor |
| `TokenGroup.ts` | trait | New | Basket order and board reference; memberships live on tokens, not in a second mutable list |
| `EqualGroupingSystem.ts` | system | New | Fill groups or distribute complete equal rounds; compute totals, quotient, and remainder |
| `CounterTokenVisual.tsx` | visual | Shared from section 4 | Render tokens inside baskets and the unassigned tray |
| `BasketVisual.tsx` | visual | New | Basket boundary, group identity, and count label |
| `EqualGroupsScene.tsx` | view | New | Responsive basket grid and sharing tray |
| `EqualGroupsControls.tsx` | control | New | Build/share selector, counts, distribute/next-step, play/pause, replay/reset |
| `EqualGroupsCommands.ts` | control | New | “Make 3 groups of 4” and “share 12 between 3 groups” |
| `CounterToken.ts` | prefab | Shared from section 4 | Independent tokens |
| `TokenGroup.ts` | prefab | New | One basket with group trait and visual binding |
| `GroupingBoard.ts` | prefab | New | Board, sequence state, baskets, and token assembly |
| `EqualGroupsExperiment.ts` | composition | New | Build/share defaults and selections |

Required actions: `SET_GROUPING_TASK`, `DISTRIBUTE_NEXT`, `NEXT_STEP`, `SET_PLAYING`, `REPLAY`, `RESET`. Share mode completes equal rounds and retains the remainder in the tray. Intermediate unequal counts are labelled “sharing in progress”; the final equation appears at completion.

## 7. Fraction Builder

Use two equal-length rectangular wholes. Each denominator is 1–12 and each numerator is 0–denominator. Start with `1/2` and `2/4`. Shading toggles individual equal pieces, including nonadjacent pieces. Numerator always equals the number of shaded pieces.

| Component / file | Type | Status | Contract and purpose |
| --- | --- | --- | --- |
| `FractionTasks.ts` | resource | New, shared with number line | Fraction examples, allowed denominator/tick options, equivalence factors, and task labels |
| `FractionValue.ts` | trait | New, shared with number line | Exact integer numerator and positive denominator; retain chosen representation; expose normalized form as output |
| `FractionBar.ts` | trait | New | Fraction reference, piece selections, original subdivision basis, and whole identity |
| `FractionComparison.ts` | trait | New | Left/right references, comparison relation, normalized values, and current equivalence explanation |
| `FractionBuilderSystem.ts` | system | New | Toggle shading, set a fraction, compare exactly, subdivide without changing the value |
| `FractionBarVisual.tsx` | visual | New | Equal segments, selected shading, segment identities, subdivision reveal; geometry only |
| `FractionBuilderScene.tsx` | view | New | Two aligned bars with the same whole size, labels, and selectable segments |
| `FractionInputControl.tsx` | control | New, shared with number line | Paired numerator/denominator inputs using IntegerStepper/OptionSelect; submit changes atomically |
| `FractionBuilderControls.tsx` | control | New | Fraction inputs, comparison task, equivalent subdivision factor, reset |
| `FractionBuilderCommands.ts` | control | New | “Show 3/4”, “compare 1/2 and 2/4”, “split each piece into 2” |
| `FractionBar.ts` | prefab | New | One whole with FractionValue, FractionBar, and VisualBinding; independent selected-piece data |
| `FractionComparisonBoard.ts` | prefab | New | Comparison entity and two FractionBar instances |
| `FractionBuilderExperiment.ts` | composition | New | Defaults, equal-whole assumption, system, and scene/control selections |

Required actions: `SET_FRACTION_COMPARISON`, `SET_BAR_FRACTION`, `TOGGLE_FRACTION_PIECE`, `SUBDIVIDE_FRACTION`, `RESET`. Subdivision by integer factor k maps each existing segment to k children, preserves its shading, and changes n/d to kn/kd. Reject results with denominator above 12. A direct denominator edit starts a fresh unshaded bar unless the command supplies a complete valid fraction; only subdivision promises to preserve value. State this beside the control.

Keep exact fraction helpers (gcd, normalization, comparison, lcm, mixed-number conversion) in `systems/fractionMath.ts`, shared with the number-line system. This helper file is not another catalog component. Never auto-reduce the displayed `2/4` to `1/2` and erase the lesson; show equivalence explicitly.

## 8. Fraction Number-Line Explorer

Default range is 0–3 wholes. Denominators are chosen from 1, 2, 3, 4, 6, and 12. Fractions and results must remain in the range; subtraction initially requires a nonnegative result. This bounds tick density at 36 intervals while supporting unlike denominators, improper fractions, and mixed numbers. Negative fractions can be a later extension.

| Component / file | Type | Status | Contract and purpose |
| --- | --- | --- | --- |
| `FractionTasks.ts` | resource | Shared from section 7 | Number-line examples and valid division settings |
| `FractionValue.ts` | trait | Shared from section 7 | Exact operands, target, and result stored on identifiable board/operand entities |
| `NumberLineBoard.ts` | trait | New | Place/add/subtract mode, operand references, range, tick denominator, accepted position, jump endpoints, and result forms |
| `FractionNumberLineSystem.ts` | system | New | Exact placement snapping, common-denominator conversion, operation results, and jump sequence advancement |
| `NumberLineVisual.tsx` | visual | New | Axis, whole labels, fractional ticks, and circle marker using ShapeVisual2D |
| `FractionJumpVisual.tsx` | visual | New | Directed arcs and fraction labels from authoritative jump endpoints; animation is display-only |
| `FractionNumberLineScene.tsx` | view | New | SVG coordinate conversion, pointer target candidates, responsive line, keyboard placement targets |
| `FractionInputControl.tsx` | control | Shared from section 7 | Operand and placement-target inputs |
| `FractionNumberLineControls.tsx` | control | New | Mode, operands, divisions, place/check, step, play/pause, replay/reset |
| `FractionNumberLineCommands.ts` | control | New | “Place 5/4”, “add 1/2 and 1/4”, “subtract 1/4 from 3/2” |
| `NumberLineBoard.ts` | prefab | New | Board, fraction entities, visual bindings, and MathSequence |
| `FractionNumberLineExperiment.ts` | composition | New | Default sum, bounds, model units in wholes, and required selections |

Required actions: `SET_NUMBER_LINE_TASK`, `SET_TICK_DIVISIONS`, `PLACE_FRACTION`, `CHECK_PLACEMENT`, `NEXT_STEP`, `SET_PLAYING`, `REPLAY`, `RESET`. Tick denominator must be a supported multiple of the operands' least common denominator; reject incompatible choices with a clear explanation. Task changes choose the smallest compatible division automatically.

For `1/2 + 1/4`, prepare exact jumps `0 → 1/2 → 3/4`; show `2/4 + 1/4 = 3/4`. For subtraction, start at the first operand and jump left. For `5/4`, display both `5/4` and `1 1/4`. Store exact rational endpoints; floating point is used only to map them to SVG coordinates. Placement commits a tick index, which the system converts to an exact fraction and checks against the target.

## 9. State, sequence, and interaction rules

1. Runtime validates a command and its active-demo capability, then invokes the selected domain system. Invalid commands leave state unchanged. Integer inputs reject decimals, NaN, infinities, and out-of-range values.
2. Runtime advances active sequences using its existing single animation-frame owner. The three younger-grade lessons start looping automatically; fraction number-line playback starts paused. A next-step action makes one logical transition; automatic playback applies the same transitions at a default 600 ms interval for manual playback; automatic lessons use the slower 900 ms interval and the intro/answer holds above. Clamp accumulated time after tab suspension to avoid racing through a lesson.
3. Each accepted step publishes model outputs and a transition identity. SVG visuals interpolate between those snapshots. Animation completion callbacks never update counts, arithmetic results, membership, or sequence progress.
4. Pause freezes sequence progress and display interpolation. Reduced-motion mode removes tweening while retaining explicit steps and readable automatic pacing. Editing a task cancels pending playback and discards stale transition identities.
5. `REPLAY` restores the current configured task at step zero. `RESET` restores composition defaults, feedback, sequence, and instance state. Switching demo disposes the active sequence and subscriptions.
6. Model quantities use count units or whole units; SVG pixels are presentation coordinates. A second view, resize, hidden visual, or remount must never advance or change results.
7. Provide 44 px minimum interaction targets where practical, visible focus, labels including object/segment state, Enter/Space activation, and a text equivalent of the diagram. Dragging always has a tap or keyboard alternative. Announce step/check results, not every animation frame.

## 10. Runtime and application integration

These are required implementation changes outside the component inventory. The current source contains explicit three-demo unions, switches, and fallbacks; adding compositions alone will not make the new simulations work.

| Existing or proposed path | Required work |
| --- | --- |
| `simulations/runtime/types.ts` | Extend DemoType with five IDs; share that type with CompositionDefinition instead of maintaining a second literal union |
| `simulations/runtime/definition.ts` | Accept the new demos and use `scene-and-controls` for their layout; preserve nine component kinds and field ownership metadata |
| `simulations/runtime/catalog.ts` | Register all implemented new components with kind-qualified IDs, SVG compatibility, dependencies, and owned write fields; do not register proposed-only code |
| `simulations/runtime/providers.ts` | Add the five trusted systems |
| `simulations/runtime/validation.ts` | Add compositions and prefab expansion; validate integer/fraction bounds, nested IDs/references, selected dependencies, allowed actions, and actual handler availability before commit |
| `simulations/runtime/commands.ts` | Add typed payloads for task, object, and fraction actions; validate payload structure and domain bounds; reject commands unsupported by the selected demo |
| `simulations/runtime/mathSession.ts` (new) | Typed state union keyed by math demo and narrow domain adapters; orchestrate validated actions and reset/replay; keep all arithmetic/sequence mechanics in systems |
| `simulations/runtime/session.ts` | Route activation/dispatch/stepping explicitly for all eight demos; eliminate implicit town fallback; tick only simulations with active sequences/model time |
| `simulations/components/views/ExperimentView.tsx` | Explicit demo-to-scene/panel selection so shared layout names do not select the wrong experiment |
| `simulations/components/controls/PromptControl.ts` | Explicit demo-to-command adapter selection; support structured task payloads and demo-specific examples/errors |
| `app/_lib/resolveExperimentPrompt.ts` | Recognize the five experiments; prefer specific “fraction number line” over generic “fractions”; generic “fractions” opens Fraction Builder |
| `app/playground/_components/PlaygroundShell.tsx` | Add titles, starter prompts, supported follow-up chips, and discoverable entry points for all new demos |
| `app/playground/_lib/assemblySteps.ts` | Include all five demos, keeping the assembly display derived from actual composition selections |
| `simulations/pre-made/<new-demo>/` | Add the nine import-only selection barrels and root experiment export for each demo |
| `simulations/components/README.md` | Link this inventory and describe the newly implemented examples once they exist |
| `scripts/verify-simulations.cjs` | Extend meaningful model, command, prefab, and lifecycle checks without dropping current regressions |

Use small typed lookup tables or exhaustive switches. This scope does not require a plugin loader or general teaching engine. Before any implementation code, read the locally installed Next.js guidance required by `src/web/AGENTS.md`.

## 11. Implementation sequence

1. **Counting vertical slice:** extend runtime/demo routing, add shared controls/readout and counting components, expose the simulation in the shell, verify manual counting and zero, then add automatic steps and target placement.
2. **Arithmetic:** reuse tokens, sequence conventions, and direct manipulation. Implement addition before subtraction; validate atomic task edits and replay.
3. **Equal groups:** reuse tokens and readout; implement build mode followed by sharing, including leftovers and responsive basket layouts.
4. **Fraction Builder:** implement exact rational helpers and selectable equal bars, then comparison and value-preserving subdivision.
5. **Fraction Number Line:** reuse fraction inputs/helpers; implement placement, then addition/subtraction jumps and mixed-number output.
6. **Integration review:** verify all eight demos, prompt routing, assembly selections, keyboard/touch access, small-screen layout, reduced motion, and disposal/reset behavior.

Every slice includes its composition, premade selections, runtime integration, command adapter, and user-visible entry point. Finish one usable simulation before creating empty placeholders for the remaining four.

## 12. Acceptance and verification

| Area | Required evidence |
| --- | --- |
| Counting | Five distinct activations produce 5; activating a counted token again stays at 5; zero works; placement respects available tokens and target feedback |
| Arithmetic | `3 + 2 = 5`, `5 - 2 = 3`, and zero operands; reject negative-result subtraction and total above 20; invalid moves and duplicate events cannot change the answer |
| Equal groups | `3 × 4 = 12`, `12 ÷ 3 = 4`, `14 ÷ 3 = 4 remainder 2`; no division by zero; token totals are conserved while sharing |
| Fraction Builder | `1/2 = 2/4`; `1/3 < 1/2`; unshaded/full bars; arbitrary shading patterns survive subdivision; denominator changes follow the documented fresh-bar rule |
| Number line | `1/2 + 1/4 = 3/4`, `3/2 - 1/4 = 5/4 = 1 1/4`; snap to exact ticks; reject incompatible divisions, zero denominator, and out-of-range results |
| Architecture | Independent prefab instances; failed staged edits leave prior state intact; missing providers/actions fail before activation; hiding/remounting views preserves results |
| Lifecycle | Manual/automatic steps agree; pause, task changes during playback, replay, reset, and switching demos cancel stale work; no duplicate clocks |
| Usability | Keyboard-only and touch workflows, readable labels at narrow widths, visible focus, non-color feedback, interactive SVG semantics, reduced-motion behavior |
| Existing demos | Projectile, bridge, and town still resolve, render, accept their commands, and preserve current model checks |

When implementing, run `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm lint`, and `pnpm build` from `src/web`, followed by browser verification of the changed interactions. Record any environment/dependency failures separately and re-check their current state rather than assuming the limitations documented in plan 001 still apply.

The implementation is verified with the application checks and math-specific behavior checks described above.
