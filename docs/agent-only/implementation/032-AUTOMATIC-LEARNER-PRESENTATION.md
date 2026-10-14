# 032 — Automatic learner presentation and focused inference context

Date: 2026-10-13  
Status: implementation in progress; earlier closing regressions retained, corrective validation pending.  
Scope: improve the existing creation and follow-up pipeline with automatic layout, coherent content selection, and smaller stage-specific inference context.

## 1. Intended outcome and boundaries

Apertus chooses the supported activity and the essential learner interactions. The application supplies reliable presentation: suitable layout, readable sizes, accurate output rendering, and necessary accessibility controls. A request for two adjustable quantities should not become a dashboard of every model capability.

Use the current registry, authoring operations, recipe format, runtime, and builder. Do not add another planner, simulation engine, design agent, or custom experiment page. Keep scenes, controls, and displays independently editable and interchangeable where their contracts permit. Layout regions determine geometry only; they never mandate an input/output type, component count, or removal. Layout changes must not change scientific quantities or bindings.

Binding guidance: [IMPORTANT](IMPORTANT.md), [builder design](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md), [component design](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md), [simulation design](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md), and [usability QA](../design/004-USABILITY-QA-GUIDE.md).

Follow the safeguards in [030](030-APERTUS-CREATION-AND-FOLLOW-UP-LOOP.md): no benchmark-specific production branches, prompt-string shortcuts, fixture substitution, global instructions containing the benchmark cases as the fix, or standalone verification scripts. Examples below describe the proposal; they are not instructions to copy test prompts into production prompts.

This document authorizes no claim that the proposed behavior works. The five-case validation scope below is a focused tranche, not completion of 030's seven-creation/three-edit mission.

## 2. What the current implementation actually does

Source paths in this document are relative to `src/web/src/simulations/` unless linked otherwise.

### Entry and accepted state

`creation-and-editing/pipeline.ts` parses requests, enforces concurrency and generation budgets, and tries editing first unless the request explicitly has purpose `create`. Creation runs when there is no active lesson or edit selection returns `new`. Live construction publication is limited to eligible builder creation flows.

`input/browser.ts` checks request correlation, stream sequence, byte budgets, and final result contracts. `runtime-engine/RecipeSession.ts` checks session and revision expectations before accepting an edit. Preserve these boundaries; a presentation improvement is not a reason to relax them.

### Creation

```text
create.ts
  → interpretCreation
  → createFromAssemblies for new creation
      → assemblyCandidates: rank available assemblies, retain up to eight
      → assemblyPlan: select supported instances; optional Laya recommendation
      → choosePresentation: choose existing controls and display nodes
      → configureAssembly: infer starting overrides separately
      → apply overrides, prune, insert/remap assemblies
      → learnerPresentation: rebuild board arrangement
      → finalize/validate/publish
```

The active-context fallback paths in `create.ts` also include selected-recipe creation/extensions and `composeFromComponents.ts`. The latter uses a multi-turn tool loop with focused operations in some modes. A shared presentation change must audit these paths rather than only improve new assembly creation.

Existing strengths:

- Retrieval already limits the candidate set; Apertus is not normally given all 458 definitions at once.
- Presentation and starting values are separate validated flat responses.
- `configureAssembly.ts` skips inference when no parameters are exposed.
- Typed ports, required interactions, instance counts, overrides, and final recipes are validated.

Remaining presentation problems:

- `choosePresentation.ts` uses independent Laya visibility questions in batches of eight. Unaccepted decisions fall back to Apertus boolean selections. Individually plausible items can collectively form an excessive interface.
- Selection has no final coherent review of the complete opening experience, including automatically retained playback controls.
- `createFromAssemblies.ts` retains clock-model playback commands even when omitted from the selection. The effective visible list can therefore exceed the list reviewed by inference.
- `learnerLayout.ts` flattens ordinary layout containers and replaces presentation with a scene/sidebar arrangement. It assigns scenes 640-pixel width and companions 320-pixel width. Suitable authored arrangements, including the ladder's wide scene and controls below, are lost.
- `registry/recipes/modelRecipe.ts` supplies broad command/output assemblies. These are useful authoring inventories, but their available components are not a learner's required interface.
- `simulation/recipe/DisplayPresentation.tsx` renders object-valued readouts through a property inspector. A structured line equation can expose implementation properties instead of mathematical notation.

### Editing

```text
editCandidates: accepted recipe + captured live configuration + operations
  → selectEditTargets: operation candidates and target identities
  → editPlan: selected fields/scopes and optional numeric adjustments
  → editArguments: remaining concrete values; derive removal/known adjustments
  → validateEditResult: transaction + recipe validation
  → revision-checked result activation
```

Existing strengths:

- `input/context.ts` reads captured live configuration rather than blindly using original defaults.
- `editPlan.ts` scopes field planning to selected candidates and their component context.
- `editArguments.ts` derives removal and fully specified numeric adjustments without another value-generation call.
- Configuration patches preserve untouched nested siblings; resizing preserves an unspecified dimension.
- Invalid resulting documents/recipes can trigger one bounded target reselection. Failed proposals retain accepted state.

Context opportunities:

- Target selection includes component configuration and many operation candidates before the target is known.
- The argument-stage message spreads the full `env.context`, including all nodes, connections, and presentation bounds, despite an already selected plan.
- `input/inference/transport.ts` has an existing 28,000-character message bound. Reduce irrelevant material rather than raise this bound.

### Distinguish historical evidence from current behavior

[031](031-SIMULATION-PIPELINE-REFACTOR.md) records a readable pendulum reopen after the camera correction and an E03 edit that measurably enlarged the actual ladder SVG. Earlier 45% screenshots and failed resize attempts remain baseline evidence, but must not be described as proof that these fixes are absent today.

031 still reports excess selected controls/readouts and unresolved live E01/E02 edits. Its deterministic checks do not establish successful latest-code inference for those edits. Establish a fresh baseline before implementing this proposal.

## 3. Proposed ownership: model selects meaning, application arranges content

```text
Request
  → existing intent and capability selection
  → compact, complete learner-content decision
  → application adds required accessibility/recovery behavior
  → application chooses/preserves arrangement and sizes content
  → existing validation and accepted-state activation
```

Do not ask Apertus for CSS, coordinates, card dimensions, all layout variants, or internal wiring. Keep layout choice automatic unless the user requests placement. Capability-supported selection of an existing recipe remains legitimate; manually replacing an inference response with a premade does not.

### Required functionality before optional presentation

Use the existing intent stage to identify `requestedInputs` from the original request, separately from inferred teaching goals. List each requested adjustable quantity separately. Select feedback directly against the original request and registered scene/output meanings; do not infer mandatory outputs from the generated question. The failed replay demonstrated that a separate inferred `requestedOutputs` list invented requirements, so it is no longer requested. Older accepted intent objects remain readable.

Resolve inputs sequentially. Exact unambiguous names from registry labels retain their existing bindings in application code; unfamiliar wording uses one small candidate-selection call for that requirement. Preserve resolved inputs independently of later optional-control decisions. Playback never satisfies a requested quantity adjustment. Select additional essential controls, then necessary observations in separate calls containing concise labels and meanings. There is no full visibility mask or mixed boolean/enum protocol. Reject unavailable or invalid bindings, not a preferred component count.

Pruning happens only after required bindings are validated. The final document must still contain selected command connections and selected observation bindings. A slider, numeric input, selector, or form is interchangeable only when the existing control contract supports the same command and arguments; layout has no authority to substitute or remove functionality.

### Small metadata additions at existing owners

Inspect existing `PublicDefinition.teaching`, `learnerLayout`, command metadata, output schemas, `dataPresentation`, and `boardItemMinimum` before adding fields. Extend these contracts only where information is missing:

| Information | Application use | Inference projection |
| --- | --- | --- |
| Preferred scene proportions and minimum readable size | Choose side/below placement and prevent shrink-to-fit | Usually none |
| Outcomes already communicated by the scene | Detect exact duplicate observations | Short outcome labels |
| Output presentation: scalar, equation, dataset, diagnostic | Select correct renderer; exclude default diagnostic exposure | Learner purpose and presentation kind |
| Interaction meaning, timing, and existing command identity | Build controls and recovery behavior | Visible name and short consequence |
| Existing authored arrangement | Preserve useful independent placements | None unless user requests rearrangement |

Represent outcomes with references to actual output/command contracts where possible. Avoid another free-text topic taxonomy. Metadata is grounded in component behavior, not benchmark prompts. Imported HTML uses its instance-specific definition; do not register uploaded code globally or guess missing metadata.

Missing metadata must retain supported behavior with conservative sizing and an explicit diagnostic for authors. It must not silently disable explicit requests or produce fabricated values.

### Whole-interface selection with a small response

Retain the current short private item IDs and map them to authoritative identities in application code. Give the presentation stage only the original request, accepted intent, selected scene's communicated outcomes, and relevant input/action/result cards. Starting-value schemas and board coordinates belong in other stages or application code.

Review the completed interface as a compact application-owned summary after resolving requirements. Do not ask one independent visibility question per available item. Sequence decisions by requirements, not by catalog size. Use one homogeneous answer: {"candidate":"c1"} or {"candidate":"done"}. Retain each necessary addition in application state, then offer remaining candidates or finish. Send the original request and only the candidates relevant to that step. Keep schemas in server/provider validation; do not serialize the full schema again into the user message or repeat it during presentation repair. Include all unavoidable visible controls in the supplied summary so the effective interface is reviewed together.

Generic rules: availability does not imply necessity; do not repeat an outcome already communicated; keep unrelated independent variables fixed; preserve explicit requests; use meaningful units and appropriate output precision. Do not inject C01–C07 prompt examples into global instructions. Keep the intent question within its independent semantic contract; derive a bounded title from accepted intent/activity metadata rather than rejecting a supported activity for heading length.

Laya continues advisory capability selection; this does not imply it performs presentation selection. Replacing its item-by-item presentation role requires auditing decision budgets, trace consumers, and the configured required-Laya policy. Do not silently change provider or mode during validation, and record the actual role each provider performed.

### Soft budgets, with honest limits

- Default opening guidance: one to three controls, including playback, reset, selectors, tabs, and repeated per-object choices.
- Default separate result guidance: zero or one; no quota to fill.
- Explicit richer investigations may exceed these guides. Review necessity, grouping, or sequencing instead of truncating requested content.
- Motion accessibility is counted in the effective selection. Do not add a universal playback/step/restart toolbar.
- A model-written justification alone does not certify simplicity. Diagnose excessive selections in live review; use bounded selection repair for a specific conflict.

Automatically remove only proven duplicates under the same target/binding/purpose. Equal labels or equal current numeric values do not prove duplicate meaning. Never silently delete an explicitly requested observation.

## 4. Automatic layout formats and branches

Reuse `authoring-engine/presentation/arrangement.ts`, board sizing, responsive rows, and saved presentation. Extend the existing arrangement implementation; do not create a second layout engine. The default is automatic, while explicit placement uses existing validated operations with extensions only where necessary.

`S` = scene, `C` = control, `R` = result, `A` = action, `T` = short explanation. These letters illustrate possible content, not restrictions. Regions describe relationships, not mandatory cards, input/output types, or fixed slot counts. Existing arrangement requests accept optional `beside` and `below` ID lists; either list may contain inputs, outputs, or a mixture. Preserve the old template names as compatible defaults. Explicit region assignment overrides those defaults and keeps every component and binding intact.

```text
Side content         Content below       Results side, controls below
+-----------+-----+  +----------------+  +----------------+-----+
|           | C/R |  |       S        |  |       S        | R   |
|     S     | C/R |  +----------------+  +----------------+-----+
|           |     |  | C/R    | C/R   |  | C       | C          |
+-----------+-----+  +----------------+  +----------------------+

Controls side, result below             Controls side and below
+----------------+-----+                +----------------+-----+
|       S        | C   |                |       S        | C   |
|                | C   |                |                | C   |
+----------------+-----+                +----------------+-----+
| equation / R / chart |                | C              | A   |
+----------------------+                +----------------------+

Scene and explanation                  Action placement branches
+-----------+----------+               +----------+   +-------+-----+
|     S     | T / R     |               |    S     |   |   S   | T   |
+-----------+----------+               +----------+   |       | A   |
| C         | C        |                   T / A      +-------+-----+
+----------------------+

Independent comparison                 Shared compatible scene
+-----------+----------+               +----------------------+
|    S-A    |   S-B    |               | objects A/B share S  |
+-----------+----------+               +----------------------+
| C-A / R-A | C-B / R-B|               | C-A       | C-B      |
+-----------+----------+               +----------------------+
| optional shared C   |
+----------------------+
```

Contextual actions inside a scene are another supported branch only when the component provides accessible placement and interaction. Do not place arbitrary generated buttons over drawings. Shared comparison controls require actual supported bindings to both instances.

### Arrangement decision order

1. Respect valid explicit placement and authored locks. Do not rearrange an existing lesson on a value-only edit.
2. For creation, preserve a suitable authored board after pruning. Verify assembly insertion/remapping carries board metadata; `recipes.ts` only appends incoming board items when both documents have board presentation. Merely adding an early return to `learnerLayout` is insufficient.
3. For multiple activities, preserve each valid internal arrangement and pack groups without overlap. Merge compatible object canvases only under existing scientific/connection rules, not because the layout looks similar.
4. For unarranged content, derive scene/control/result groups from actual bindings and metadata. Choose beside, below, or split placements according to useful scene proportions and content sizes.
5. Remove empty regions and compact gaps left by pruning without rewriting meaningful tabs, conditional groups, repeaters, themes, or explicit item sizes.
6. Reflow at readable sizes on narrow/short viewports. Do not solve overflow by shrinking every label and control. Preserve navigation without covering the primary interaction.

The initial implementation should support side/below and mixed branches using existing geometry. Additional compositional freedom follows demonstrated needs; no universal scene/sidebar fallback should override a valid wide arrangement.

## 5. Make follow-ups work with automatic presentation

Keep the existing target → fields → arguments pipeline. Smaller prompts must not make target selection falsely confident or hide available alternatives.

- Target stage: project visible names, categories, concise meanings, and available operations. Include internal model targets when configuration requires them. Omit runtime arrays, unrelated settings, and argument schemas at this stage.
- If reduction needs candidate retrieval, retain an explicit broader-search/clarification fallback. Never prune by prompt-specific topic detectors or silently mark a supported target unavailable.
- Field stage: retain selected target fields and current values necessary to interpret the change. Existing `editPlan` already scopes component context.
- Argument stage: replace whole-context serialization with selected targets, selected fields, current nested siblings required for valid patches/commands, selected bounds, and relevant dependency edges. Keep the entire authoritative document on the server for validation.
- Removal: remove the selected visible control while retaining the model's accepted value. Compact affected presentation locally. Do not recreate the removed control during automatic arrangement.
- Resize: use the accepted scene bounds and existing resize operation. Preserve unrelated placements and scientific values; verify the drawing grows, not only its wrapper.
- Value edit: patch captured accepted/live configuration. Do not invoke automatic rearrangement or reset presentation to defaults.
- Placement edit: arrange only the requested region, preserve locked/unrelated items, and persist accepted placement through existing serialization. Do not add a new lesson format merely to remember which branch produced board coordinates.

Apply all draft changes through existing transactional validation and session/revision checks. Failed edits preserve the last accepted recipe. Repair messages identify the rejected target/field/contract, not the full catalog or an invented successful change.

## 6. Implementation sequence and affected owners

| Step | Smallest complete change | Owners/callers to inspect | Required evidence |
| --- | --- | --- | --- |
| A | Capture current baseline and context sizes | Existing browser flow, diagnostics, 030/031 evidence | Five creations and attached edits below |
| B | Preserve authored boards and add automatic placement branches | `learnerLayout`, `arrangement`, `board`, `recipes` insertion/remapping/pruning, `createFromAssemblies`, alternate create/compose paths | Wide authored scene survives; mixed groups remain independently editable |
| C | Render structured equations appropriately | `DisplayPresentation`, output schemas/formatting, built-in recipe generation | Correct notation for positive/negative/zero slopes and intercepts and vertical lines; no internal-property panel |
| D | Select coherent content with compact context | `choosePresentation`, registry metadata projections, final pruning, playback retention, decision budgets | Required interactions remain; duplicate/internal observations omitted; provider roles recorded |
| E | Scope edit argument context and local layout updates | `editCandidates`, target selection, `editPlan`, `editArguments`, validators, `RecipeSession` | E01/E02/E03 preserve unrelated accepted/live state |
| F | Close the browser loop | Actual application, existing diagnostics and evidence folder | Final five-case pass and edit comparisons, with failures explicitly retained |

No new dependency or test runner. Use existing contract checks for nontrivial metadata, remapping, selection, and patch behavior; extend them only for meaningful regressions. Type-check changed contracts. Run recipe freshness checks if declaration/generation changes require them. Technical passes do not replace the live UI loop.

## 7. Five validation cases from the 030 test matrix

Use these **five original creation prompts unchanged**, in separate fresh conversations. They cover motion, graph interaction, arithmetic, a wide diagram/calculation, and quantitative feedback. Attach the three original follow-ups to their parent conversations; they are not additional creation cases.

| ID | Exact creation prompt from 030 | Content and interaction evidence | Attached edit |
| --- | --- | --- | --- |
| C01 | Make a pendulum swing where I can adjust its starting angle and length | Observe motion over time; operate both requested controls; verify accepted values and coherent motion. Review every extra action/readout, readable scene size, and necessary motion control. | E01: Remove the angle component |
| C03 | Make me a line where I can adjust its slope and y axis | Slope affects steepness/direction; intercept changes the vertical-axis crossing. Check both controls and any equation. Reject raw object properties and duplicate slope feedback unless the activity requires it. | None in the original matrix |
| C04 | Show me how to add or subract with circles | Circle quantities and interactive calculation agree; the learner can understand the operation visually. | E02: can you set it to be 7 minus 3? |
| C05 | show me how pythagroen theorem is used in measuring ladders | Ladder/wall/floor form a right triangle; ladder is hypotenuse; values and calculation agree. Inspect useful diagram width and controls placement. | E03: Make the canvas showing the triangle bigger |
| C06 | How does gas pressure change with volume | Operate volume; pressure changes inversely while amount and temperature remain unchanged. Scene conveys compression/expansion; numbers serve the question. | None in the original matrix |

E01 should remove the starting-angle control when conversation context supports that interpretation, retaining internal angle state, length, and motion. Do not special-case the phrase. E02 must configure the same activity to seven minus three with four remaining, preserving unrelated presentation and state. E03 must increase useful visible drawing space at the same viewport, preserve proportions and current leg values, and retain functioning controls.

C02/C07 remain outside this initial five-creation tranche; their existing 030 obligations remain open. If comparison packing, canvas merging, or instance grouping changes, C02 becomes a justified targeted sibling check. Do not claim comparison behavior passed based on these five single-activity cases.

## 8. Actual Playwright + Apertus comparison and repair loop

This is the execution procedure for implementation, not a claim that it ran during document preparation. Use Playwright through the actual application. Prefer available Playwright MCP; if unavailable, label any direct Playwright fallback accurately. Do not substitute a different browser tool for Playwright or call inference directly from an API/shell harness. Do not save a new verification script or runner.

### Establish conditions

Record application URL, code revision/working-tree state, viewport, timestamp, provider/model, inference mode, Laya participation, and session conditions. Start with 1440 × 1000 desktop for continuity with 031. Use the actual configured Apertus path; confirm serving provider/model from redacted diagnostics correlated to the UI request. A brand label is insufficient.

Create a new evidence ledger under `032-validation/` when execution begins. No empty screenshot files or fabricated result entries. Suggested directories: `baseline/`, `fix01/`, and `closing/`. Record existing provider prompt-token usage where available and serialized stage-context lengths; do not invent token counts from character lengths.

### Baseline → diagnose → fix → replay → compare

1. **Baseline:** run the five creations once through the UI. Capture each accepted opening before interaction, then a meaningful changed state. Preserve failures. Run E01/E02/E03 in their actual parent conversations. If a parent fails, mark its edit blocked.
2. **Inspect:** visually inspect every capture and operate the simulation. Count actual visible controls, competing workspace actions, and result blocks; record layout, zoom, clipping, equation wrapping, and readable scene bounds. For motion, record changes over time as well as still images.
3. **Diagnose:** identify the first incorrect transition: intent, selection, pruning, arrangement, accepted state, renderer, or binding. State the shared cause and affected callers before changing production code.
4. **Fix:** implement the smallest shared correction through the owners above. Retain validators and accepted state on rejection. Do not rewrite prompts, manually edit generated recipes, or force a preferred assembly to manufacture success.
5. **Replay:** repeat the affected case and any justified sibling. Add one predefined transfer probe per distinct mechanism only when needed to distinguish a general fix from benchmark tailoring. Do not repeatedly run the full matrix during every edit.
6. **Compare:** compare baseline/replay at the same viewport and comparable accepted values. Pair screenshots with authored/live state and measured drawing bounds. Compare prompt/context size, inference calls, repairs, and observed latency when available; smaller context alone is not success if intent or controls regress.
7. **Close:** after fixes stabilize, run the five creations and their three attached edits once on final code. Capture a short desktop view for layout changes and focused keyboard/reduced-motion checks where affected. Final failures reopen the affected mechanism, not an automatic rerun of every case.

A normal Playwright browser context may submit prompts, inspect DOM/network events, and capture screenshots. Browser observations must distinguish inferred proposals from the final accepted result. Do not overwrite failed attempts with later passing captures.

### Comparison criteria

| Dimension | What to compare |
| --- | --- |
| Intent fidelity | Original request versus selected capability, interactions, and actual accepted quantities |
| Simplicity | Necessary controls/results versus duplicates, diagnostics, and competing actions |
| Layout | Useful scene area, readability, grouping, reserved component sizes, clipping, and floating-chrome overlap |
| Behavior | Controls change the correct model and visible geometry; values/units agree |
| Edit preservation | Unrequested node identities, connections, configuration siblings, placement, and captured live values survive |
| Context | Stage-specific message sizes and actual token usage/call counts where diagnostics expose them |

Premade/reference screenshots express desired hierarchy and simplicity. They are not pixel-perfect targets for generated lessons with different content. Do not use a whole-image difference score as proof of teaching quality. For E03 specifically, measure actual drawing bounds before and after; a larger container with the same small triangle fails.

### Evidence and stopping rules

Use names such as `C03-opening.png`, `C03-intercept-changed.png`, `E03-before.png`, and `E03-after.png` within each attempt directory. Link each capture in the ledger with request correlation, action, relevant values, viewport, observed result, and remaining uncertainty. Keep diagnostics concise and redacted.

Statuses: Not run, Running, Passed, Failed, Blocked. Record conflicting attempts as intermittent, retaining each outcome. Stop blind retries after a repeated unchanged failure; diagnose or record the service/capability blocker. No duplicate submission while inference is pending, and no arbitrary long sleeps instead of observing completion/error states.

If Playwright or Apertus is unavailable, mark live checks blocked and continue source work or documentation. Do not replace live evidence with mocks, direct API requests, imported fixture recipes, or premade screenshots. Save/reopen and builder Try lesson checks are required where changed layout/serialization could affect them; avoid unrelated persistence campaigns.

## 9. Acceptance and remaining uncertainty

Implementation is reviewable when the five-case closing ledger contains real outcomes, required interactions remain correct, unnecessary learner machinery is removed, supported arrangement branches stay readable, and all three attached edits show their intended change with unrelated state preserved. Layout and selection changes must also remain compatible with builder editing, saved recipes, reopening, and Try lesson where affected.

Do not declare UX complete while user objections remain unresolved or live cases fail. Explain outstanding failures separately from the successfully delivered mechanisms. Completion of this proposal's tranche does not certify every registry component or close the broader 030 mission.

Main risks: incomplete scene-outcome metadata; over-pruning necessary results; hiding valid edit targets; accidental layout resets on edits; lost board metadata during insertion/remapping; and a coherent-looking layout masking scientifically wrong feedback. Automatic arrangement addresses geometry and hierarchy, not every educational or inference judgment.

Deferred: fine-tuning, arbitrary generated coordinates/CSS, a new agent framework, registry-wide annotation, a new evaluation runner, and comprehensive device/performance testing. The original proposal preparation changed no production code. Subsequent implementation and browser attempts are recorded separately in the validation ledger; earlier failed screenshots are retained.


## 10. Small sequential decisions — current implementation

The initial corrective replay failed at presentation selection: 8,374 input characters / 1,833 prompt tokens grew to 11,413 characters / 2,550 tokens during repairs. Four attempts were made. The local endpoint did not enforce the supplied response schema, and the mixed boolean-mask plus input/output-slot answer repeatedly copied enum alternatives into malformed JSON. These are observed failures, not proof that retry limits need increasing.

The user requested a smaller sequential composer and another Playwright run. This supersedes the earlier one-run limit for the new attempt; retain all failed evidence.

### Application owns state and execution

Keep the authoritative recipe, registry contracts, current values, transaction, resolved bindings, defaults, receipts and layout on the server. Inference receives a projection for one unresolved decision. Never resend the complete draft, all tools, full output schemas, full registry or accumulated conversation to obtain one small answer.

| Step | Apertus context | Apertus answer | Application responsibility |
| --- | --- | --- | --- |
| Activity | Original request and shortlisted capability cards | Activity ID | Registry lookup and supported model validation |
| Required interaction | One interaction and compatible command meanings, only when not unambiguous | One candidate ID | Retain the existing command/control binding |
| Extra controls | Original request, scene meanings, retained control names, remaining concise candidates | One control ID or done | Preserve required controls and keep optional additions scoped |
| Feedback | Original request, scene outcomes, retained controls, concise output candidates | One observation ID or done | Preserve selected bindings; never fill an output quota |
| Starting settings | Original request and parameter names | One setting ID or done | Preserve all other defaults |
| One value | Selected setting, current value, units/bounds, relevant prior-instance value | One value | Validate and accumulate the draft patch |
| Arrangement | No inference for automatic placement | None | Preserve authored layouts or arrange existing content |
| Completion | Compact selected bindings and coverage | No generated document | Validate and accept atomically |

Do not invoke a value-generation call for unselected settings. Separate operation choice from argument generation in component composition regardless of optional/required-Laya policy; preserve the policy's capability/provider safeguards. Candidate choice receives concise node identities and prior receipt, while argument generation receives only the selected target and relevant fidelity. The application still owns tool envelopes, aliases, wiring and transactions.

Count and title preferences are presentation concerns. They do not reject supported activities. Keep the intent question within its semantic contract and derive a bounded title independently. `beside` and `below` accept either inputs or outputs without changing their bindings or scientific quantities.

### Local repair

Use the original small decision context plus its exact issue. Return one candidate ID or one value, never the feedback envelope or copied inventory. Presentation repair does not repeat a full schema. Bound retries and stop unchanged failures; do not compensate for an oversized protocol with more retries or a larger context window. Invalid values, unknown IDs, unsupported bindings and unsafe transactions remain rejected.

The first smaller-protocol replay (`replay02`) accepted a pendulum and its requested controls worked, but array selections copied all optional controls. It remains a simplicity failure. The subsequent correction selects one additional item or done. A further replay showed that done must be an explicit candidate in the model-visible list, not just a server enum or separate finish field; this is now shared behavior for presentation and starting-setting choices. Activity selection also projects concise capability summaries rather than full interaction descriptions and intent; an omitted empty omissions list is supplied by the application.

### Current validation scope

The latest user instruction makes live Playwright the only verification. No further code checks, test scripts or verification runner are executed. Playwright MCP is unavailable; the user authorized Playwright CLI or any Playwright tools. Use the installed Playwright library with visible Chromium 1234, isolated anonymous contexts and the actual application. Submit the five original creation prompts, inspect opening and changed states, operate retained controls, and record request-correlated diagnostics and context sizes in a new attempt directory. Label the fallback accurately and retain all failed captures. Do not claim the optional component-composition path or every registry component passed from these five assembly creations alone.
