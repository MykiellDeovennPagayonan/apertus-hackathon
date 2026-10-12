# 030 — Apertus creation and follow-up improvement loop

Date: 2026-10-12  
Status: execution started; see the evidence ledger for observed results and remaining work.  
Scope: seven real inference-driven creations and three edits, with Playwright evidence and general infrastructure improvements.  
Evidence: [030-validation](030-validation/README.md).

## 1. Mission and binding instructions

Improve the shared process that turns a learner's request into a working simulation and turns a follow-up into a faithful edit of that simulation. These ten requests are probes of that process, not a list of cases to special-case in production.

**Implement infrastructure improvements. Do not implement prompt-specific shortcuts, hardcoded answers, topic detectors, fixture substitution, or separate production paths for these examples.**

The user's explicit constraints govern this work:

- Use Playwright for verification through the actual application.
- Do not create verification scripts, standalone evaluation harnesses, API-only smoke tests, or new test runners. Do not disguise a saved verification script as a helper.
- Save actual Playwright screenshots in this implementation folder so progress is reviewable.
- Fix shared causes. Do not optimize for matching these prompt strings or making a single screenshot look correct.
- Keep verification bounded. Repeat checks only when a change, new failure, or unresolved concrete risk gives them a purpose.
- No shortcuts. A comment acknowledging a shortcut does not make it acceptable for this mission.

Read [IMPORTANT](IMPORTANT.md) and its applicable design guides before changing the UI. Existing guidance in [025](025-LIVE-EXPERIMENT-BUILDER-CONSTRUCTION.md) describes relevant creation/editing infrastructure; it is context to inspect, not proof that today's runtime follows that description.

This plan adds no production behavior. No screenshot, inference result, diagnosis, or passed check is claimed until observed.

## 2. What success means

Creation must infer the intended activity, use supported capabilities, produce valid executable state, and display an understandable simulation whose controls actually change the relevant behavior.

Editing must use the existing accepted simulation as context, resolve the requested change, apply it through supported operations, validate it, and present the accepted result without silently discarding unrelated settings or content.

Assess four distinct things:

1. **Intent:** did the system understand the learning task and the edit target?
2. **Execution:** did it use valid capabilities and produce accepted state?
3. **Interaction:** do visible controls affect the correct model and visual?
4. **Teaching:** does the visual communicate the requested relationship simply and accurately?

A successful HTTP response, reassuring assistant message, valid recipe, or attractive screenshot alone cannot establish all four. Record partial successes and failures separately.

## 3. Initial test matrix

Submit the user's natural wording without adding catalog IDs, implementation hints, or a preferred template. Correcting the wording before submission would hide interpretation problems.

| ID | Creation prompt | Observable acceptance evidence |
| --- | --- | --- |
| C01 | Make a pendulum swing where I can adjust its starting angle and length | Pendulum motion is visible; angle and length controls change the intended quantities; changed length has a coherent effect on motion. |
| C02 | Show me 2 projectiles distance comparison based on angles | Two identifiable trajectories or runs share a meaningful comparison; changing launch angles changes horizontal range under stated shared assumptions. |
| C03 | Make me a line where I can adjust its slope and y axis | Interpret “y axis” as y-intercept unless the conversation establishes otherwise; slope changes steepness/direction and intercept moves the line's crossing of the vertical axis. |
| C04 | Show me how to add or subract with circles | Circles represent quantities; adding/removing or grouping them visibly explains addition and subtraction; displayed counts agree with the objects. |
| C05 | show me how pythagroen theorem is used in measuring ladders | A ladder, wall, and floor communicate a right triangle; side labels and geometry agree with the Pythagorean relation; the ladder is the hypotenuse. |
| C06 | How does gas pressure change with volume | At constant temperature and gas amount, changing volume gives a coherent inverse pressure relationship; the visual communicates compression/expansion. |
| C07 | show me how to compare 2 fractions please | Two fractions can be compared using a common whole or compatible scale; the indicated ordering agrees with the fractions and visual. |

These are outcome criteria, not required component names or fixed layouts. Use existing valid models and rendering contracts. Do not require identical panels or extra controls across all seven activities.

| ID | Original conversation | Follow-up | Observable acceptance evidence |
| --- | --- | --- | --- |
| E01 | C01 | Remove the angle component | Working interpretation: remove the starting-angle control/component from the learner experience. Preserve the pendulum, length control, valid internal angle state, and animation. Record how the application resolves this phrase. |
| E02 | C04 | can you set it to be 7 minus 3? | The same activity represents seven objects, subtraction of three, and four remaining. Operation, operands, visual, and displayed result agree; the activity remains interactive where intended. |
| E03 | C05 | Make the canvas showing the triangle bigger | The triangle receives measurably more useful visible space. Preserve geometry, values, labels, and model behavior; avoid clipping and stretched proportions. Record whether viewport/layout space or drawing scale changed. |

The E01 interpretation is an assumption, not a universal rule for the word “component.” Do not encode that phrase as a special target. Use conversation context and the authored representation; if the application asks a meaningful clarification, record it honestly.

For E03, do not preselect a pixel size. Establish the original visible bounds and compare the resulting scene at the same viewport. A larger blank container with an unchanged small triangle does not satisfy the request.

## 4. Establish the live conditions

Before the first submission, inspect the existing application setup and relevant repository instructions. Record:

- Application URL, browser viewport, date/time, and code revision or working-tree state.
- Configured Apertus provider/model and evidence of the provider actually serving the request, where diagnostics expose it.
- Whether Laya participates in the selected path. Do not silently force a different composition mode to make the test pass.
- Session/account conditions and any unavailable services. Do not expose credentials or private account data in evidence.

The user has requested real inference. Do not use mocks, manually supplied responses, canned recipes substituted for inference, or edited request payloads as passing evidence. Normal inference selection of an existing recipe is legitimate if it is the actual supported product path; record which path ran.

Use Playwright to navigate, submit, interact, inspect visible state, and observe associated network/console information where available. Source reading supports diagnosis; it does not replace browser verification. Do not call inference directly from a shell or API harness.

If Playwright or inference is unavailable, mark the affected checks blocked. Do not substitute another browser tool or premade demonstration and label it Playwright/live-inference evidence. Continue independent documentation or source diagnosis that can still help.

## 5. The execution and repair loop

### Step A — Capture a baseline

Run C01–C07 once each in separate new conversations. Execute E01–E03 in their corresponding original conversations, after those creations are usable. Do not recreate the lesson to simulate an edit. If a parent creation fails, mark its edit blocked by that creation.

Capture the initial accepted view before manipulating controls. Then operate one or two controls/actions that demonstrate the requested behavior and capture the meaningful changed state. For animation, observe motion over time and document it; two still frames alone do not prove coherent dynamics.

For each edit, record the accepted state and changed settings immediately before submitting the follow-up. Capture the result and compare both the intended change and the unrelated state that should survive.

Do not repair prompts during the baseline, quietly retry until something succeeds, or modify generated state manually. Record the first outcome even if a later run succeeds.

### Step B — Locate the first incorrect transition

Trace the request through the actual code path and available browser diagnostics:

**Prompt + current accepted state → interpretation → capability selection → authoring/edit operations → validation → accepted state → rendering and interaction.**

For a failure, identify the first transition where observed behavior diverges from the request. Distinguish incorrect intent, missing capability, invalid operation, lost context, rejected validation, incorrect state commit, stale control binding, renderer sizing, and provider/network failure.

Do not assume the failure is caused by prompting. A correct generated edit with a stale renderer needs a renderer/state fix. A valid rendering contract cannot repair an unsupported model capability.

### Step C — Describe a shared cause before editing

Record one short hypothesis grounded in evidence, affected callers/contracts, and the proposed smallest complete change. State what class of requests benefits and what existing behavior could regress.

Examples of general mechanisms to investigate, only if observations support them:

- Follow-up context omits accepted settings or stable component identities.
- Removal does not distinguish visible controls from required internal model state.
- Authored values reach settings but not the model or renderer.
- Layout edits resize a wrapper without updating drawable dimensions.
- Validation errors are lost before the authoring process can repair a draft.
- A failed or stale edit is presented as applied although accepted state did not change.

These are hypotheses, not preapproved implementation tasks. Do not build all of them merely because they appear here.

### Step D — Fix the infrastructure

Read the relevant callers before changing shared code. Reuse existing schemas, operations, error handling, state ownership, and renderer contracts. Preserve trust-boundary validation and accepted user state on failure.

Potential source areas from existing project documentation include the shared planner, capability metadata, composition executor, browser progress transport, builder editing hooks, document history, and rendering/layout components. Inspect current code before deciding which layer owns the problem.

A catalog metadata correction or a shared component contract fix can qualify as infrastructure. It need not touch every simulation. It must correct a real supported capability or reusable behavior rather than recognize this benchmark's wording. New educational content is a separate gap to report unless it is necessary and within the requested improvement scope.

### Step E — Verify the changed behavior proportionately

Use Playwright to replay the failed creation/edit and exercise the affected control. Check one relevant sibling case when the same mechanism is shared. Check unrelated state preservation for edits.

Add a small transfer probe only when it distinguishes a general fix from memorization. Choose different wording, quantities, or another supported activity with the same mechanism; define the probe before observing its response. For example, change operands through a natural follow-up, remove a different supported control, or enlarge another supported scene.

Do not flood inference with dozens of variants. One useful transfer probe per distinct fixed mechanism is the starting budget, not a quota. Expand only if it reveals a new concrete failure.

Once fixes are stable, run one closing pass of the seven creations and three edits on the final code. Intermediate checks should be targeted. A failed closing case reopens that case and its affected callers; it does not automatically justify another full pass of everything.

### Step F — Update progress before continuing

Save screenshots and update the evidence ledger after each case and fix. Include the finding, infrastructure change, result of the targeted replay, and remaining gap. Never wait until the end to reconstruct what happened from memory.

## 6. Screenshot and progress evidence

Store actual PNG screenshots under `030-validation/screenshots/`, created when the first browser capture is saved. Suggested names:

- `C01-baseline-created.png`
- `C01-baseline-length-changed.png`
- `E01-baseline-before.png` and `E01-baseline-after.png`
- `E01-fix01-after.png`
- `E01-transfer01-after.png`

Use the same pattern for other cases. Preserve baseline images. Do not overwrite failures with later passing results. A screenshot name describes when it was taken, not an assertion that it passed.

Each image entry must link to the file and state the action, relevant settings, viewport, attempt/fix identifier, and what the image demonstrates. Inspect the captured image before using it as evidence. Keep controls and scene visible together when needed to establish the relationship. Use an additional focused capture only if the normal screenshot is unreadable.

For follow-ups, use before/after captures at the same viewport. For E03, record visible drawing bounds through Playwright alongside the images so “bigger” has evidence. Do not use a screenshot's dimensions as a proxy for the scene's dimensions.

Screenshots cannot prove provider identity, state persistence, interaction wiring, or scientific correctness alone. Supplement them with concise Playwright interaction observations and relevant redacted browser diagnostics. Do not dump full request traces or private session data into the folder.

The [evidence ledger](030-validation/README.md) is the progress entry point. Mark cases as **Not run**, **Running**, **Passed**, **Failed**, or **Blocked**. A failed baseline can later have a passed replay; retain both outcomes. Use “Intermittent” in notes when conflicting results exist rather than concealing them with a pass.

## 7. Safeguards against mission drift

### No hardcoding or benchmark tailoring

Before accepting a patch, answer:

1. What shared invariant or contract was incorrect?
2. Would this change still make sense if these seven prompts were absent?
3. Does it work through existing supported operations for different wording and values?
4. Does any production branch depend on prompt text, benchmark ID, topic name, or example numbers?

If the first two answers are unclear, or the fourth is yes because the patch recognizes these examples, reject the approach and return to diagnosis.

Setting the learner's authored operands to 7 and 3 is required behavior. Embedding 7 and 3 as production fallback constants is prohibited. Keeping an existing model's scientifically valid defaults is different from adding defaults designed to satisfy these tests.

Do not add special prompt examples containing these cases to global instructions as the fix. Prefer capability-grounded rules that describe actual contracts: retain unaffected accepted state, respect editable fields, use validated operation semantics, and report unsupported changes. General instruction changes still need behavioral evidence.

Do not delete validation, swallow errors, silently substitute a template, force a route, or change expected outcomes to manufacture success.

### No over-verification

- Planning/documentation work requires document inspection, not inference or a full test campaign.
- Begin with the defined ten interactions; record outcomes once.
- After a fix, run the failing case and the checks justified by its affected mechanism.
- Do not add verification scripts, benchmark systems, new dependencies, broad browser matrices, load tests, or unrelated feature work.
- Use one fixed desktop viewport initially. Add a shorter viewport or focused keyboard/reduced-motion check when the change could affect it or applicable UI requirements require it; avoid a device matrix.
- Bound each request by the application's established timeout where available. Observe completion/error state instead of using arbitrary long sleeps. Do not launch duplicate requests while one is pending.
- After a repeat failure with the same cause and no new evidence, stop blind retries. Diagnose or mark the blocker.
- A second patch based on the same disproven hypothesis requires a new diagnosis before more edits.
- Broaden verification only after stating the new concrete risk. Do not run unrelated suites merely because they exist.
- Stop when the agreed outcomes and justified regression checks pass. Existing CI/release coverage remains separate; this browser pass is not whole-project certification.

### No architecture expansion without evidence

Do not introduce a new agent framework, generic repair service, parallel simulation engine, configuration layer, or alternate editor to solve a local failure. Fix the existing owner of the broken contract. If a broader infrastructure change is genuinely necessary, explain why smaller changes fail and identify its callers before implementing it.

Read-only diagnosis can inspect implementation details. Learner-facing interfaces should not expose internal IDs, planner diagnostics, or technical panels to compensate for an unclear experience.

### Protect edit correctness

Compare accepted authored state as well as visible output where the application exposes it. Preserve unrelated component identities, settings, connections, and geometry. Removing a control must not accidentally remove required model state; enlarging a visual must not alter scientific values.

Do not silently restore a removed control through defaults or silently reset operands during rerender. A failed edit must retain the last valid simulation and explain that the change was not applied. Verify undo/save/reopen only when the changed mechanism can affect them; avoid treating every prompt as an entire persistence campaign.

### Honest evidence and uncertainty

Label assumptions and unavailable diagnostics. Do not claim Apertus served a request based solely on the UI's brand label. Do not claim a follow-up succeeded based on generated prose. Do not claim a check occurred because a screenshot directory exists.

Separate unsupported capability, environmental failure, inference variability, and product defect. If a case is intermittent, record observed attempts and the unresolved risk; retries are not a cure.

## 8. Completion and handoff

The work is complete when:

- All seven creations and three follow-ups have observed outcomes on the final code, with remaining failures/blockers explicitly identified.
- Fixes have evidence of a shared cause and proportionate Playwright replay/transfer evidence.
- Each successful follow-up demonstrates the intended change and preservation of relevant unrelated state.
- Screenshots and the progress ledger allow the user to review what changed.
- No prompt-specific production branches, verification scripts, shortcuts, or unrelated infrastructure have been introduced.

If any requested behavior remains failed or blocked, the mission is incomplete even if a report is ready. Report the concrete limitation and next required step rather than declaring success.

Handoff should state which infrastructure changed, why it addresses the observed failures, which browser interactions passed, which remain uncertain, and links to representative before/after evidence. The existence of a valid recipe is not a substitute for a usable simulation.
