# 026 — Fishing, crowd flow, voting, and natural selection

Date: 2026-10-10  
Status: Research-backed implementation plan. No implementation, browser validation, or live inference success is claimed.  
Audience: implementing and reviewing agents, followed by product-owner testing.

## 1. Outcome and governing requirements

Implement four simulations that teach through visible changes and straightforward interactions:

1. [Shared fishing lake and overfishing](../simulations/social-systems/03-SHARED-FISHING-LAKE-AND-OVERFISHING.md).
2. [Crowd flow and exit obstacles](../simulations/social-systems/04-CROWD-FLOW-AND-EXIT-OBSTACLES.md).
3. [Alternate voting systems](../simulations/social-systems/05-ALTERNATE-VOTING-SYSTEMS.md).
4. [Natural selection and generation spawning](../simulations/science/08-NATURAL-SELECTION-AND-GENERATION-SPAWNING.md).

Each must work as a premade, as an independently editable builder composition, and as a lesson created through realistic natural-language requests to actual Apertus inference. The normal experiment prompt and builder prompt should use the same supported capabilities. Do not create four isolated pages or prompt-specific hardcoded responses.

**UX is the first acceptance gate. A scientifically correct model with an overwhelming interface is unfinished.** [IMPORTANT.md](IMPORTANT.md) takes precedence over earlier templates, including generic observation panels and comprehensive playback toolbars. Read it together with [builder design](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md), [component design](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md), [simulation design](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md), and [usability QA](../design/004-USABILITY-QA-GUIDE.md).

The concept documents describe possible capabilities, not a requirement to expose all their controls at once. This plan narrows the default learner experiences. Additional investigations need their own purposeful flows. Author settings and diagnostic data remain available through the builder and developer tooling rather than occupying the learner's first screen.

### Opening experiences

| Simulation | One learning question | Visual that teaches | Primary action | Other opening control |
| --- | --- | --- | --- | --- |
| Fishing | What happens when people take more fish than the lake replaces? | Fish removed into five catches; the lake becomes visibly depleted over days. | **Watch 30 days** | One **Catch arrangement** select: Equal share / One takes more / Everyone takes more. |
| Crowd | How does an obstacle change a crowd moving through a narrow exit? | Matched rooms show pedestrian dots merging, waiting, and exiting. | **Run comparison** | None required; begin with a researched, documented obstacle placement. |
| Voting | Can the same voters elect a different winner under a different rule? | One dot per voter; transferred ballots visibly change candidate color. | **Count votes**, then **Next round** when applicable | One **Voting rule** select. |
| Selection | How do inherited traits become more common across generations? | Organism dots survive, reproduce, and spawn offspring with inherited shades. | **Next generation** | One **Habitat** control: Light / Dark. |

Two controls are a starting choice, not a target every lesson must meet. Count all visible buttons, selects, toggles, sliders, tabs, repeated selectors, and scene affordances; record workspace chrome separately and assess its combined competition. The permanent guardrail is one to three essential learner controls, with one obvious primary next action. A visual interaction is still a control for this review.

## 2. Research findings and their implementation consequences

Research was reviewed on 2026-10-10. Prefer original research, research institutions, election authorities, and official technical documentation. The following conclusions guide implementation; numeric teaching defaults below are proposed model choices unless explicitly identified as source-derived. Do not treat a cited paper as validation of our future implementation.

### 2.1 Fishing: biology and cooperation are separate mechanisms

FAO distinguishes recruitment, individual growth, and natural mortality in fish-stock dynamics. Sustainable catch depends on a stock's productivity; the user's 1%-per-day rule is a simpler model and should retain that exact behavior. It does not define a realistic maximum sustainable yield. See [FAO — Management concepts for small-scale fisheries](https://www.fao.org/4/X6844E/X6844E02.htm).

Ostrom, Walker, and Gardner experimentally investigated communication and sanctioning in common-pool resource problems. Their findings support investigating agreements, monitoring, and repeated communication rather than assuming inevitable selfish depletion. These experiments are not calibration data for five simulated fishermen or evidence that public catch records always create cooperation. The accessible [1991 author manuscript](https://dlc.dlib.indiana.edu/dlcrest/api/core/bitstreams/0afb3404-76da-473c-ae70-b0f489e84624/content) precedes the [1992 published article record](https://doi.org/10.2307/1964229); do not conflate their versions.

**Decision:** implement exact stock accounting first; implement human behavior as explicit, inspectable decision rules. Agreements and enforced quotas are different. Label simulated behavior honestly and reserve AI negotiation for a later extension.

### 2.2 Crowd: obstacle benefits are conditional

Yanagisawa and colleagues studied a floor-field model with conflict-dependent friction and turning costs, alongside experiments where an obstacle improved flow. Their work identifies mechanisms that can make the effect emerge. See [2009 model and experiments](https://arxiv.org/abs/0906.0224).

A later controlled study across different competitive conditions did not establish a general evacuation-time benefit and described how an obstacle can relocate congestion. See [2020 systematic experimental investigation](https://www.nature.com/articles/s41598-020-72733-w). Earlier crowd literature also models interaction-driven clogging and the possibility of faster desired movement producing slower evacuation; this is conditional behavior rather than a universal relationship. See [Helbing, Farkas, and Vicsek — Simulating dynamical features of escape panic](https://arxiv.org/abs/cond-mat/0009448).

**Decision:** use an explicit bottleneck interaction model. Compare matched crowds, preserve worse and neutral outcomes, and never attach a throughput bonus to the obstacle. A prompt asking for faster exits must not force a false conclusion. Density, blocked time, contact pressure, and safety are different quantities.

### 2.3 Voting: ballots and counting rules must remain visible

UK Parliament describes plurality and alternative-vote mechanisms. NYC's election authority illustrates single-winner ranked counting and how a ballot moves to its next choice after elimination. See [UK Parliament — Voting systems](https://www.parliament.uk/about/how/elections-and-voting/voting-systems/) and [NYC Board of Elections — Ranked choice voting](https://www.vote.nyc/RankedChoiceVoting).

Approval voting allows support for multiple candidates and counts approvals per candidate. The [Center for Election Science definition](https://electionscience.org/education/approval-voting) is useful for ballot mechanics; it is an advocacy organization, so its superiority claims are not our acceptance criteria.

**Decision:** compare three single-winner teaching rules with fixed underlying preferences, explicit ballots, and a declared tie policy. Instant-runoff is one ranked method, not a synonym for every ranked or proportional voting system. Transfers do not change the voter's mind, and rankings do not uniquely determine approvals. Do not claim that a final active-ballot majority is a majority of the original electorate.

### 2.4 Selection: inheritance and reproduction must be observable

UC Berkeley's teaching material explains natural selection through trait variation, differential reproduction, and heredity. It separately explains genetic drift and mutations that do not anticipate an organism's needs. See [natural selection](https://evolution.berkeley.edu/evolution-101/mechanisms-the-processes-of-evolution/natural-selection/), [genetic drift](https://evolution.berkeley.edu/evolution-101/mechanisms-the-processes-of-evolution/genetic-drift/), and [mutations](https://evolution.berkeley.edu/evolution-101/mechanisms-the-processes-of-evolution/mutations/).

An empirical camouflage example comes from Cook and colleagues' analysis of Majerus's six-year peppered-moth experiment, which found differential bird predation supporting camouflage-based selection. See the [authors' research-group publication record](https://mallet.oeb.harvard.edu/publications/selective-bird-predation-peppered-moth-last-experiment-michael-majerus). It supports the mechanism chosen for the lesson, not the dot model's survival probabilities, mutation rate, or generation duration.

**Decision:** show distinct parent and offspring cohorts. Traits stay fixed within an individual's life. Record parentage and random mutation separately from environmental survival effects. Teach changing distributions over generations rather than individual organisms deciding to become better suited.

### 2.5 Visual and browser verification

W3C requires meaning to have cues beyond color, and provides guidance on disabling interaction-triggered motion when it is not essential. See [use of color](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) and [animation from interactions](https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html).

Playwright documents environmental sensitivity in visual comparisons and trace-based inspection of actions and DOM snapshots. See [visual comparisons](https://playwright.dev/docs/test-snapshots) and [trace viewer](https://playwright.dev/docs/trace-viewer).

**Decision:** keep stable IDs, deterministic snapshots, and accessible non-color summaries. Review actual screenshots and operate the flows. Snapshot assertions are supplemental evidence, not proof that first-time learners understand the experience.

## 3. Current architecture and reuse audit

The following was inspected during planning. Paths in this table are relative to `src/web/src/`.

| Owner | Current evidence | Planned use or gap |
| --- | --- | --- |
| `simulations/domains/social-systems/index.ts` | Registers the craft/assembly production contribution. | Add focused fishing and voting contributions; a crowd contribution can live here while its movement mathematics stay separate. |
| `simulations/domains/science/{index,specs}.ts` and `components/systems/science/life.ts` | Support existing life-science activities, including offspring in the genome model. | Reuse schema/domain conventions and inspect inheritance helpers; existing offspring alone are not a multi-generation selection model. |
| `simulations/runtime/assembly.ts`, `runtime/contribution.ts` | Existing domain-model registration and contribution contracts. | Register executable models through established ownership. No renderer-owned simulations. |
| `simulations/components/catalog/{index,learningModels,teaching,discovery}.ts` | Public definitions, appearances, controls, and teaching/discovery metadata. | Add accurate capabilities, limits, commands, and dependencies; keep model retrieval separate from runtime physics. |
| `simulations/runtime/authoring/{providers,transaction,validate,runnable,connections}.ts` | Shared execution, transactions, and graph validation. | Connect new contributions to the same manual and inferred authoring path. |
| `simulations/components/views/recipe/{RecipeAppearance,NodeView,ControlPresentation,DisplayPresentation,CanvasPresentation}.tsx` | Existing appearance dispatch and independently rendered recipe content. | Register focused scene adapters and reuse suitable controls/displays. |
| `simulations/runtime/recipeSession.ts` | One learner runtime/clock; authored recipe is distinct from incidental exploration. | Preserve this distinction. Multiple appearances must not double-step a model. |
| `components/systems/science/contracts.ts`, `systems/ElementarySystems.ts`, `systems/dynamic-systems/models.ts` | Existing seeded randomness and traffic/queue models. | Audit reusable seed mechanics and scheduling. A ring-traffic model is not a pedestrian bottleneck model. |
| `lib/planner/{index,compose,compositionPolicy,budget,compositionQuality}.ts` | Shared generation and strict Laya composition policy. | Extend discovery and coverage rather than adding four keyword routers. |
| `simulations/pre-made/*/recipe.json`, `runtime/recipes/*` | Shared JSON premade and recipe registry path. | Create four authored recipes and regenerate the registry through its script. |
| `scripts/generation/{helpers,verify-realistic-live}.cjs` | Actual UI submission, provider correlation, browser helpers, and screenshots. | Reuse the true UI live path for the requested acceptance gate. |
| `scripts/domains/science/{live,live-browser,replay}.cjs` | Domain oracles plus native import; its live runner submits HTTP directly. | Useful lower-level inference/replay evidence, but not a substitute for prompt-UI acceptance. |

No dedicated fishing, pedestrian crowd, voting, or natural-selection model was found in the inspected catalog/domain paths. Confirm this during implementation; this is not proof that every repository file has been exhaustively audited.

Create a reuse ledger before adding code: existing candidate, missing behavior, why configuration or composition cannot supply it, smallest contract addition, compatibility impact, and test proving the gap. Shared mechanisms worth considering are seeded random sampling, bounded event histories, selection hit-testing, and stable animation transitions. Extract them only when the contracts truly match. Do not impose a generic dashboard, a universal dot engine, or a broad agent abstraction across four unrelated models.

Proposed new module families are `components/systems/social-systems/{fishing,crowd,voting}/` and `components/systems/ecology/selection/`, with focused visuals under the corresponding `components/visuals/` families. These are proposed locations, not existing files. Use the current contribution conventions to settle exact catalog IDs; IDs in model-facing schemas must be registered and executable.

## 4. Shared implementation contracts

### 4.1 Separate responsibilities

- **Configuration:** validated initial conditions, permitted actions, explicit scenario assumptions, and a seed where relevant.
- **Model:** pure calculations and state transitions; application-owned identities and legal actions.
- **Runtime adapter:** command validation, authoritative stepping, lifecycle/reset, outputs, and capture through the established provider interface.
- **Presentation:** reads snapshots and recorded events; interpolates motion without changing counts, votes, traits, or physics.
- **Recipe:** composes separately selectable model, scene, primary control, optional task choice, and concise feedback on the shared board.
- **Generation:** interprets intent, retrieves supported contracts, selects/configures or composes, validates, and activates atomically.

Inputs, scenes, and useful observations must be independently editable in the real builder. A single component containing separate React children does not satisfy independent authoring. A model may own a cohesive population; individual organism dots or voters do not all need separate public canvas nodes.

### 4.2 Time, randomness, and bounds

Use explicit domain units: fish/day, integer catches, crowd model ticks or documented simulated seconds, counting rounds, and generations. Animation duration is presentation time. Authoritative state must not depend on display size, frame rate, selected dot, camera zoom, or the number of views.

Audit current random helpers. For new stochastic models, prefer stable keyed samples using seed, instance, logical step, individual ID, and event kind. Branching or selecting a dot must not consume another individual's random draw. Initial populations must match between paired scenarios; diverging populations do not imply identical subsequent histories. Replay consumes recorded events, not fresh randomness or inference.

Proposed first-release bounds: fishing 365 days and five fishermen; crowd 100 initial pedestrians with author-configurable counts up to 300 and at most 2,000 ticks per trial; voting 100 default voters with an author limit of 500 and 2–5 candidates; selection 100 initial organisms, 200 maximum admitted per generation, and 100 generations. Validate these against performance measurements before freezing them. Each model stops honestly at its declared limit; a limit is not successful completion.

Bound event/lineage history by these run limits. If later summaries truncate data, declare which records remain available and do not pretend a missing ancestor or tick was retained. Failed or superseded async computations cannot enter a new run.

### 4.3 Save, restart, and recovery

Saving a recipe preserves authored starting values and presentation, not accidental exploration. Recipe export/import and normal reload restart from those authored conditions unless an explicit existing run-resume contract applies. Run replay/export is a separate capability; do not promise durable run resumption without implementing and testing its storage contract.

Opening an inspector or moving/resizing a scene must not reset domain state. Labels distinguish **Restart this run** from restoring authored defaults. Reject invalid settings before changing accepted state. Builder operations use existing undoable document transactions. Failed inference, cancellation, invalid graphs, and stale revisions preserve the active lesson.

## 5. Fishing implementation

### 5.1 First learner flow

Open a large lake with five fishermen and a short sentence: “The lake starts with 2,000 fish and replaces 20 a day.” Put the stock count by the lake. Show each fisherman's daily target next to their boat, with catches visibly entering baskets. A grouped fish mark may represent multiple fish; use a brief scale cue and keep authoritative accounting independent of icon counts.

The initial arrangement is Equal share: four each. **Watch 30 days** runs a bounded sequence; while running it becomes **Pause**. After completion it becomes **Watch another 30 days** or the declared terminal action. Catch arrangement is editable while stopped and takes effect on the next day. The paused/complete state gives a concise explanation of the chosen targets and does not imply that changing arrangements restores the lake.

The three initial arrangements are explicit rules: Equal share `[4,4,4,4,4]`, One takes more `[8,4,4,4,4]`, Everyone takes more `[8,8,8,8,8]`. They are catch requests, not guaranteed catches or enforced quotas. Show one current-state sentence, such as “They caught more than the lake replaced today.” Explain equal share as “four each at the starting stock,” avoiding a claim that it remains sustainable after depletion.

Start with the stock and daily catch cues; introduce a compact stock-history trace only when the learner needs to compare change over the run. No permanent panels for every budget, individual profit, fairness index, or model setting. A contextual Restart this run action appears when recovery is relevant; it must fit the action inventory rather than accumulate alongside a toolbar.

### 5.2 Model and daily sequence

Maintain opening stock `S`, reproduction `B = floor(S / 100)`, availability `A = S + B`, requests `r_i`, accepted catches `c_i`, and closing stock `S' = A - sum(c_i)`.

1. Snapshot the same opening-day information for all five fishermen.
2. Produce births from the opening stock, before harvest.
3. Collect legal nonnegative integer requests without revealing simultaneous choices.
4. If requests fit availability, accept them. Otherwise allocate `floor(A * r_i / sum(r))`, then distribute the remaining fish by largest fractional remainder. Equal remainders use a recorded, day-rotating fisherman order. This makes proportional whole-fish allocation explicit and avoids an unrecorded first-mover advantage.
5. Commit one immutable day event containing opening stock, births, requests, catches, closing stock, and behavior/visibility policy version.
6. Derive scene feedback from that event; then advance the day exactly once.

At zero total request, skip division and harvest nothing. Catches never exceed requests or availability. Stock cannot be negative. Below 100 fish, the whole-fish rule generates no births; explain this as rounding in the teaching model. Do not quietly add fractional carry, mortality, logistic growth, or restocking. Those require a separate, versioned ecology setting.

The user's equation implies unlimited no-harvest growth and no realistic maximum sustainable yield. Preserve it and disclose its scope concisely. Four each is an initial equilibrium, not an optimization result.

### 5.3 Human behavior investigation

After the basic depletion lesson, offer a separately authored activity asking whether an agreement lasts. Use fixed needs and catch bounds, explicit policies, and day-lagged observations:

- Agreement follower requests the configured agreed target.
- Immediate-catch seeker requests its configured larger target.
- Reciprocal policy requests the previous day's highest visible request, within its bound; with private catches it uses a declared fallback instead of accessing hidden information.
- Stock-responsive policy requests an equal share of current births, with rotating allocation of indivisible shares when appropriate.

Household need is a separate attribute; it does not automatically determine behavior. Label policies by their action rather than moral character. A public ledger supplies information but does not make fishermen cooperate by itself. An agreement sets a target; an enforced quota caps requests. Put communication, monitoring, sanctions, and unequal needs in distinct investigations, not all on the first screen. The first release does not require AI-generated choices or sanction economics.

### 5.4 Scientific and runtime oracles

| Test | Independently expected result |
| --- | --- |
| 2,000 stock; all request 4 | 20 births, 20 caught, closing stock 2,000; remains exactly stable across 365 days. |
| One requests 8; others 4 | Day 1 closes at 1,996; day 2 has 19 births and closes at 1,991. |
| All request 8 | Day 1 closes at 1,980; day 2 closes at 1,959. |
| 1,500 stock; all request 3 | 15 births, 15 caught; closes at 1,500. |
| 99 stock; no catch | No births under this rounding rule; stock remains 99. |
| Oversubscribed requests | Integer catches sum to available stock and do not exceed individual requests; independent allocation reference agrees. |
| Visibility comparison | A policy cannot read another fisherman's private catch. Public information alone leaves fixed policies unchanged. |
| Pause, rerun, extra view | Same legal day commits once; no duplicate harvest, silent restocking, or double stepping. |

Independently compute multi-day tables from the declared recurrence, not by importing the model's update function into the oracle.

## 6. Crowd implementation

### 6.1 First learner flow

Place two matched top-down rooms side by side: **Open approach** and **With obstacle**. Use the same pedestrian dots, starting positions, exit width, viewing scale, and tick clock. **Run comparison** starts both. Dots queue, visibly wait, and leave through the exit; the primary action becomes **Pause** while running.

Show only the remaining-person count during movement. At completion show each modeled exit time, or completion ticks if not calibrated to seconds, and one neutral result sentence. For an incomplete run show how many remain; do not award a faster result to the censored run. A small gray mark for persistent waiting may clarify jams without recoloring people as a risk score.

After the first result, replace the primary next step with **Try another placement**, leading to one bounded position choice and **Run comparison**. Use a small set of valid placements initially. Free dragging is an authoring or later investigation feature, with a keyboard alternative and validated geometry. Do not begin with sliders for population, speed, friction, radius, doorway width, density, overlays, and random seeds.

Default text asks whether the obstacle helps. Even when the user's prompt assumes it does, a worse result is shown honestly. A later activity can compare crowd interaction regimes; its one relevant choice replaces the placement choice rather than adding another panel.

### 6.2 Model choice and feasibility gate

Start with a documented floor-field/cellular occupancy approach, informed by the 2009 conflict-and-turning study, because conflict resolution is inspectable and feasible at these population sizes. This is a model choice, not a claim to have reproduced that paper. First implement a headless bottleneck prototype, then validate the mechanics and parameter sweep before building polished visuals.

Proposed prototype: a 30-by-20-cell room, a two-cell-wide exit, one pedestrian per cell, 100 initially occupied cells sampled without replacement, and a circular obstacle rasterized into blocked cells. Record cell size and timestep if interpreting ticks as modeled seconds. Until then, label time as model steps; animation speed is not pedestrian speed.

Each tick uses a shared pre-move snapshot:

1. Compute shortest-path potential to the exit around walls and obstacle. No diagonal corner cutting or paths through occupied geometry.
2. Generate each pedestrian's stay/move proposal from legal neighboring cells using the potential and documented yielding/route preferences. Avoid hardcoded left/right routing that bypasses the model.
3. Group proposals by destination. For `k > 1` contenders, use a documented conflict blocking probability. A prototype candidate is `1 - (1 - mu)^(k - 1)`, with zero conflict blocking for `k = 1`. If not blocked, select one contender with a keyed random sample.
4. Apply documented turning delay when heading changes. Begin with at most one additional tick; blocked movement does not teleport a pedestrian or let it pass through another.
5. Commit accepted moves synchronously, count designated exit crossings once, and retain a bounded tick event.

The probability and delay above are illustrative candidates, not coefficients taken from the study. Validate and document their effects. Occupied destination cells remain unavailable in the first synchronous implementation; do not implicitly allow swaps or overlapping movement. Revisit the resulting flow limitation if it dominates outcomes. An exit crossing must target a valid exit boundary, not simply proximity to the door.

Seeded randomness, yielding, route choice, and conflict friction are model assumptions. No force solver is planned for the first version, so do not call the result contact pressure, crowd-crush risk, injury probability, or an emergency-design recommendation.

### 6.3 Obstacle-effect research gate

Sweep obstacle size/distance/offset, crowd size, and interaction settings. Use at least 30 declared paired seeds for each final candidate regime. Retain and report all cases, mean and median paired time difference, variability, completion fraction, and blocked-time distribution. Never remove unfavorable seeds or present the best trial as the general effect.

Require baseline path validity, bottleneck formation, and documented regimes where layout can hinder or change flow. To ship a positive-effect demonstration, require reproducible aggregate improvement under a declared regime and an explanation traceable to fewer conflicts or changed merging. Choose defaults from a parameter study, freeze them, and validate on a separate held-out seed set. A known counterexample must remain available in QA.

If the prototype cannot support the requested positive-effect investigation credibly, report the gap. Review movement/conflict mechanics against the cited research or adopt a documented alternative model. Do not hardcode a bonus, tune a single seed, or change the learner's prompt to disguise the missing effect. A comparison-only lesson can be scientifically sound, but must not be called a completed faster-exit demonstration.

### 6.4 Numerical and behavioral checks

- Conservation: inside plus exited equals initial population at every tick; IDs are unique.
- No pedestrian occupies a wall/obstacle cell or shares an occupied cell after a tick.
- Matched initial conditions are identical apart from obstacle geometry; reject placements overlapping an initial pedestrian or generate an initial state valid for both rooms.
- All initially occupied cells have a path to the exit; reject unreachable setups before starting.
- Empty room completes at zero; one pedestrian without conflicts follows a legal route; sealed exit fails setup rather than reporting a completed evacuation.
- A placement that closes a corridor is rejected or explicitly modeled as blocked; it cannot improve flow through a hidden shortcut.
- Compare results at equal logical ticks. Rendering rates, extra views, pause/resume, and board resizing do not affect outcomes.
- Record incomplete trials at the 2,000-tick limit; summary calculations cannot silently drop or substitute their completion times.
- Test conflict and turning behavior with hand-constructed independent examples, then multi-seed emergent comparisons. Screenshot differences alone are not crowd-model evidence.

## 7. Voting implementation

### 7.1 First learner flow

Display 100 dots in a stable grid, a compact candidate legend with names/symbols, one voting-rule select, and **Count votes**. Before counting, a short sentence states that voters' preferences remain fixed across systems. First-past-the-post completes in one count. Instant-runoff reveals one round at a time, replacing the same primary action with **Next round**. Only transferring dots animate a color change.

Keep candidate totals adjacent to their legend as they become relevant; the winner receives a label/outline, not a population-wide recoloring. A sentence such as “C was eliminated; 25 ballots now count for B” explains the visible transition. No permanent ballot table, strategy panel, turnout slider, poll editor, and statistical dashboard.

In approval mode each voter may support multiple candidates. Show segmented rings/fills with distinct labels or patterns and an accessible summary. Do not blend into one ambiguous color or assign the dot only to its first choice. If segmentation is unreadable at the actual rendered dot size, enlarge/reflow the grid or use a focused candidate-support view. Treat that view's selector as an additional control requiring review.

Clicking a dot opens a brief nearby ballot explanation; keyboard uses roving focus and arrow navigation with a meaningful accessible name, avoiding 100 mandatory Tab stops. The default inspector shows candidate order or approvals, not raw IDs. Underlying IDs remain available in diagnostics.

### 7.2 Rules and state

Store voter identity, stable display position, underlying preference order, sincere single-choice ballot, ranked ballot, and explicit approval set. Counting operates on submitted ballots. Candidate sets and IDs are stable between comparisons.

First-past-the-post chooses the greatest single-vote total. Instant-runoff allocates each active ballot to its highest-ranked continuing candidate, elects a candidate with more than half the active ballots, otherwise eliminates one minimum-total candidate and repeats. If all active ballots vanish, return no result. A final tie is resolved by the recorded teaching tie policy. Approval sums one vote per approved candidate and chooses the largest total; a ballot can approve none, and an all-zero total yields no result.

Use a recorded seeded tie order fixed before counting, with an explicit result note whenever it decides elimination or victory. Reject repeated ranked candidates and unknown candidate IDs. Partial ranked ballots are allowed and can exhaust. Turnout is separate from blank/exhausted ballots. This is a simplified teaching procedure, not a claim to reproduce a jurisdiction's full election administration.

Changing rules resets count presentation but keeps voters, preferences, and the relevant stored ballots. Preference ranking alone cannot create an approval set unless a declared approval-generation policy is supplied. In a later strategic-voting activity preserve the sincere preference separately from the changed ballot and identify which modeled decision changed.

### 7.3 Default worked example and oracles

| Voters | Ranking | Approval set |
| --- | --- | --- |
| 40 | A > B > C | A, B |
| 35 | B > C > A | B, C |
| 25 | C > B > A | C, B |

Expected outcomes: plurality A=40, B=35, C=25, winner A; instant-runoff eliminates C and transfers its 25 ballots to B, producing A=40, B=60, winner B; approval A=40, B=100, C=60, winner B. This constructed example illustrates possibility rather than prevalence or universal system quality.

Further checks:

- Per round, candidate allocations plus exhausted ballots equal submitted ranked ballots, with at most one continuing allocation per ballot.
- Approval totals equal sums of explicit approvals and may exceed voter count; duplicate approvals within a ballot are rejected.
- Only C's 25 dots change allocation in the example's transfer; preferences and dot positions stay unchanged.
- Test already-majority winners, partial rankings, blanks, zero turnout, elimination ties, final ties, and invalid ballots.
- Renaming candidates with correspondingly remapped tie order preserves the result up to renaming. Input iteration order cannot resolve a tie accidentally.
- Use an independent simple reference counter for small elections. Do not assert false universal properties, such as every ranked method always electing a pairwise winner or eliminating all strategic incentives.

## 8. Natural-selection implementation

### 8.1 First learner flow

Open 100 organism dots with light-to-dark shades on a light habitat. One sentence explains: “Better-hidden organisms are more likely to survive and leave offspring.” The learner chooses **Next generation**. The scene shows deaths, surviving parents, offspring appearing beside parents, and the replacement cohort spreading out. One action covers the sequence; four separate phase controls are unnecessary.

Show the generation number and a compact trait-distribution strip. A histogram is justified here because changing frequencies are the learning outcome, but avoid adding mean, variance, fitness, mutation counts, population graphs, and survival tables to the opening view. Selecting one dot can briefly show its parent's shade and whether its own shade mutated.

The **Habitat** control changes the background at the next generation boundary. Its draft/accepted state must be clear if a transition is active. Living organisms retain their shade. Reduced motion presents static before/survivor/offspring snapshots with the same result and concise explanation; it does not remove the reproduction stage or require hidden animation settings to proceed.

### 8.2 Life cycle and parameters

Preserve the concept's explicit simplified life cycle:

- Initial trait `t` lies in `[0,1]`, with a broad seeded distribution; light habitat `h=0.1`, dark habitat `h=0.9`.
- Survival probability is `p = 0.2 + 0.6 * (1 - abs(t-h))` when selection is on.
- Each organism receives one keyed survival draw per generation. Deaths cannot reproduce.
- Each survivor proposes two offspring. Offspring inherit `t` exactly unless mutation occurs.
- Mutation probability is 5% per offspring; mutation adds a uniformly sampled value in `[-0.1,0.1]`, clamped to `[0,1]`. Direction does not depend on habitat.
- If proposals exceed 200, admit 200 uniformly sampled without replacement. Report proposed births and admitted offspring separately in diagnostics.
- Retire all parents when the next cohort is committed. Offspring receive new IDs, parent IDs, and generation IDs.
- Empty offspring means extinction. Stop; no automatic repopulation or deliberate creation of a favorable variant.

The survival function, single-parent reproduction, mutation process, and population cap are invented teaching rules. This is a quantitative trait model, not a Mendelian genetics or speciation simulation. Clamping produces boundary effects, and sampling under the cap contributes drift. Keep these in the model documentation and author settings.

Use an immutable generation event recording parents, survival results, birth proposals, mutation draws, admission, and next cohort. Compute a transition once; render its phases without redoing survival or births. Snapshot history and lineage are bounded by the declared generation/population limits. Autoplay is a later contextual activity, not an opening toolbar.

### 8.3 Selection versus chance

The basic lesson begins with existing variation. A later activity can disable mutation, make the initial population uniform, or compare selection with neutral survival. For the neutral comparison use trait-independent survival and disclose the rate. The concept's 50% rate is acceptable for a standalone drift lesson; to isolate trait dependence in a controlled comparison, use a documented matched average survival rate for the compared cohort instead of letting different population-growth rates dominate the explanation.

A single seeded run cannot establish that selection is deterministic. Do not require the population mean to move in the favorable direction every generation. Before mutation and population-cap effects, independently calculate expected survivor counts per trait group as `sum(p_i)` for that group. The survival-weighted trait reference is `sum(t_i * p_i) / sum(p_i)`; this ratio of expectations is not the exact expected mean of every finite surviving cohort. Validate survivor counts over many stochastic replications and compare distributions, accounting for empty cohorts explicitly.

### 8.4 Oracles and invariants

- With mutation disabled, every offspring exactly matches its parent; a uniform population remains the same trait value regardless of selection.
- An organism's trait remains unchanged across its life, including habitat changes.
- Reproduction proposals equal twice the survivor count; admitted population equals the smaller of proposals and cap. No parent remains in the replacement cohort.
- Every child has one existing surviving parent from the immediately preceding generation, a unique ID, and the next generation number.
- Trait bounds hold; no offspring from dead parents; population and lineage counts agree.
- Controlled random draws test survival, mutation, boundary clamping, admission, extinction, and neutral survival. Random test dependencies are injectable without changing production physics.
- Test many replications of an uncapped, mutation-disabled mixed cohort against independently calculated survivor proportions and confidence intervals. Declare the batch size and tolerance before executing; do not select favorable seeds.
- The same seed and configuration produce the same event history. Additional appearances, inspection, resizing, reduced motion, and replay do not change it.
- At extinction, Next generation is unavailable and a contextual restart explains its scope. At the generation limit, show a completed teaching run rather than claiming biological equilibrium.

## 9. Generation and actual Apertus inference

### 9.1 Shared behavior

Follow the existing pathways in [019](019-REALISTIC-PROMPT-COMPOSITION-WITH-LAYA-AND-APERTUS.md) and [025](025-LIVE-EXPERIMENT-BUILDER-CONSTRUCTION.md), while checking current code instead of copying historical limits.

1. Apertus interprets the original human request, preserving explicit quantities and distinguishing defaults from requirements.
2. Retrieve executable models, required appearances, essential controls, and appropriate teaching metadata. A keyword match alone is not capability coverage.
3. In normal `optional` policy, configure a suitable recipe or compose through shared tools. Laya may be legitimately skipped for a clear recipe match.
4. In `required-laya` policy, require actual Laya strategy selection and actual Apertus composition through the existing strict branch.
5. Validate bounds, typed links, runnable coverage, permitted commands, and independently editable presentation before activation. Reject unsupported claims and preserve the active lesson on failure.
6. Inspect the accepted generated lesson in the app. A good premade does not establish that generated recipes follow the UX rules.

Publish small model-facing teaching cards identifying one opening task, the essential action, scene semantics, supported assumptions, and facts the model must not promise. Required observations must express necessary behavioral coverage, not automatically force every output into a visible display. Audit `requiredObservations` and coverage handling so they cannot override IMPORTANT.md.

The LLM configures a trusted simulation; it does not calculate daily stock, resolve crowd movement, invent voting totals, or choose offspring after seeing a desired result. Fish behavior remains explicit code in this release. The crowd prompt's positive premise is treated as a hypothesis, with any correction kept short and near the comparison.

### 9.2 Current limits and local setup

Planning inspection found strict composition defaults of 240 seconds, 28 LLM calls, 24 authoring turns, and 3 repairs; ordinary composition defaults are 120 seconds, 14 calls, and 10 turns. Recheck `lib/planner/{budget,compositionPolicy}.ts` before implementation. Keep the deadline bounded and record all repairs; measure graph complexity before increasing a budget.

Use an existing verified Apertus service. If local MLX environments are missing, the repository provides setup targets; setup/download work belongs to implementation, not this planning pass. From the repository root, in separate service terminals:

```sh
make -C src/inference run-apertus
make -C src/inference run-laya
```

Readiness checks:

```sh
make -C src/inference smoke
make -C src/inference smoke-laya
```

The latter checks status, so also perform and record a real bounded Laya warm-up selection before acceptance. Confirm effective provider/model identity and endpoint without logging credentials. The inference Makefile currently defaults to `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` on port 43101 and Laya on 43102; use the verified deployed model rather than assuming those defaults.

Example strict local web invocation, after setting the selected Apertus endpoint/runtime in server-only configuration:

```sh
LLM_PROVIDER=apertus PLANNER_MODE=hybrid DECISION_PROVIDER=laya COMPOSITION_DECISION_POLICY=required-laya PLANNER_DIAGNOSTICS=true NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS=true pnpm --dir src/web dev --port 43100
```

These switches do not themselves prove inference occurred. Correlate request ID, actual accepted Laya decision where required, Apertus provider/model and authoring calls, tool receipts, repairs, final recipe, runtime activation, latency, and usage if supplied. Unknown usage is unknown, not zero. Test normal recipe-first policy separately; do not label a legitimate skipped Laya call as a strict pass.

### 9.3 Human-realistic prompt suite

Keep the exact casual wording during evaluation. Expected capability and constraints go into the test oracle, not extra technical instructions pasted into the user's prompt.

| ID | Exact user prompt | Expected result |
| --- | --- | --- |
| F1 | `show me what happens when a town overfishes a lake` | Fishing lesson with a stock that responds to catch arrangement. |
| F2 | `theres 2000 fish and 5 fishermen, the lake makes 1 new fish a day for every 100 fish. what if they take more than 4 each?` | Preserve 2,000, five, and 1% opening-stock reproduction; compare excess catch against replacement. |
| F3 | `what if just one fisherman starts taking twice as much` | In an active fishing lesson, change one request from four to eight, preserve the other four and current stock, and explain next-day timing. |
| F4 | `can they agree to stop the lake running out?` | Supported agreement investigation or honest partial coverage; distinguish agreement from enforced quota. No fabricated AI behavior. |
| C1 | `show me how adding an obstacle makes exit faster?` | Matched crowd comparison, short conditional framing, actual bottleneck dynamics; no forced benefit. |
| C2 | `people trying to leave through a small door, what happens if theres a pillar in the way` | Crowd/exit/obstacle lesson with simple presentation and clear merging. |
| C3 | `move the pillar closer to the exit` | Active lesson edit changes valid geometry, preserves matched initial crowd, and reruns rather than teleporting active people. |
| C4 | `does it still help when people are pushing more?` | Compare a supported stronger-conflict regime, clearly called an interaction assumption; do not claim modeled physical pressure. |
| V1 | `show me how different voting systems change who wins` | Same electorate across plurality, instant-runoff, and approval. |
| V2 | `make voters little dots and change their colours when their vote transfers` | Stable dots, exact transferred subset, preference preservation, accessible alternate cues. |
| V3 | `same people but use ranked choice now` | Active voting lesson retains electorate, resets count, and uses the supported instant-runoff procedure. |
| V4 | `what if people can vote for more than one person` | Approval ballots with visible multiple support and appropriate totals. |
| N1 | `show me natural selection` | Organism-dot lesson with variation, survival, inheritance, and next-generation spawning. |
| N2 | `little dots surviving and having babies, show how they evolve over generations` | Visible parent/offspring sequence and lineage; inherited traits, not cosmetic recoloring. |
| N3 | `make the environment darker and see what survives` | Active lesson changes habitat at a generation boundary; individuals retain their traits. |
| N4 | `what if they all start the same and theres no mutations` | Uniform initial trait, mutation disabled; no new traits manufactured by selection. |

F3/F4/C3/C4/V3/V4/N3/N4 are contextual follow-ups and require a recorded active lesson. Do not evaluate them as isolated fresh prompts and silently invent context. For N4, restarting with uniform starting conditions is necessary; communicate that consequence before committing the accepted edit through existing update semantics.

Additional probes: `fish sim`, `why do crowds get stuck at doors`, `ranked choice voting`, and `evolution sim`. Negative/overclaim probes: `make the pillar always speed things up`, `make every living dot turn dark so it adapts`, and `prove ranked voting always picks the best candidate`. They must not produce false behavior or unsupported universal claims. Ordinary terse requests use useful defaults instead of requiring a questionnaire.

## 10. Playwright test, screenshot review, and correction loop

### 10.1 Evidence method and storage

No callable Playwright MCP tool was found in this planning session. During implementation, discover available tools again. Use Playwright MCP if available for the mandatory interactive inspection; otherwise use the installed repository Playwright Node API and state that fallback explicitly. Do not call local scripts MCP verification. The in-app Browser is a different tool and requires its own skill if used.

Proposed evidence root: `docs/agent-only/implementation/026-validation/runs/<run-id>/`. Add an ignore rule for `026-validation/runs/` before generating artifacts; it does not exist in the inspected root `.gitignore`. Keep a concise authored `026-validation/implementation-report.md` tracked. Raw screenshots, traces, DOM captures, event histories, generated exports, and sanitized provider traces stay under the ignored runs root. Never overwrite an attempt or delete failures to improve the report.

Verify representative screenshot/trace/JSON paths with `git check-ignore`; check `git ls-files` and `git status --short --untracked-files=all` after captures. Do not store credentials, unrelated prompts, or account data in traces. Use an isolated test account for account persistence where available.

Record revision/source fingerprint, browser version, OS, viewport, device scale factor, input method, motion preference, provider/model, seed, scenario settings, prompt, request ID, test mode, and initial state. Separate evidence categories: deterministic model tests, fixture browser tests, premade UX, actual inference, generated-lesson UX, export replay, and participant observations.

### 10.2 Browser coverage

| Surface | Required operation | Evidence |
| --- | --- | --- |
| Premade learner | Open, understand next action, operate, pause/recover, inspect result. | Opening and meaningful changed screenshots; interaction trace and runtime oracle. |
| Generated learner | Submit exact prompt through ordinary UI; operate accepted lesson. | Correlated live inference, accepted graph, screenshots, and oracle. |
| Builder Build | Independently select/move/resize scene and control; edit one supported setting. | Geometry, valid links, undo/redo, same model behavior. |
| Builder Connections | Model, scene, controls, and outputs are real registered pieces. | Graph screenshot and typed/runnable validation. |
| Builder Try lesson | Enter through the actual button and operate the rendered activity. | Nonzero scene dimensions, readable controls, before/after model states. |
| Save/reopen/remix/import | Preserve initial conditions, links, and independent presentation. | Recipe comparison and repeated behavioral oracle; authenticated storage identified separately. |
| Follow-up generation | Apply natural edit to an active lesson; cancel/fail an edit. | Revision correlation, preserved unrelated state, no stale/partial activation. |

Prioritize 1440×900 desktop. Review 1280×720 for short-screen behavior, 1920×1080 for oversized empty layouts, and a supported narrow viewport such as 390×844. Include keyboard-only, reduced-motion, and 200% text/zoom review. Fix browser/environment when comparing deterministic images; model snapshots occur at logical milestones rather than arbitrary milliseconds.

### 10.3 Outcome-only usability tasks

Review the opening screenshot before operating the interface or consulting implementation details. Record the apparent task, primary action, competing actions, and likely confusion. Then perform these tasks without a click walkthrough:

- Fishing: “Find out whether the lake lasts when one person takes extra fish.”
- Crowd: “Find out whether this obstacle helps this crowd leave.”
- Voting: “Use the same voters to see whether changing the counting rule changes the winner.”
- Selection: “Make the habitat change and explain what happens to the next generations.”

Screenshots establish appearance; traces and assertions establish behavior. An agent's first-screen assessment is an inferred usability review, not an observation of a first-time human. Where possible, observe an unfamiliar participant's first action, hesitation, mistaken choices, requests for help, and explanation of the result. Coaching-assisted completion must be labeled as such.

### 10.4 Required capture milestones

| Simulation | Capture set | Model evidence reviewed alongside images |
| --- | --- | --- |
| Fishing | Opening; first reproduction/harvest; day 30 stable; excess-catch depletion; paused/restarted state. | Exact recurrence, committed day count, and individual catch allocation. |
| Crowd | Opening matched rooms; approach; first bottleneck; obstacle-side queue; finished or incomplete pair; changed placement. | Occupancy/conservation, paired ticks, completion status, and conflict counts. |
| Voting | Opening; initial count; elimination announcement; transferred subset; winner; approval multi-support; exhausted ballot fixture. | Per-ballot allocations and independent tallies. |
| Selection | Opening; survivors; parent/offspring transition; replacement cohort; later generation; changed habitat; extinction fixture. | Parentage, mutation/inheritance, cohort counts, and trait distribution. |

For each milestone save a full-viewport capture including workspace chrome and a focused scene capture. Inspect image contents directly; merely writing PNGs is not review. Record clipping/overlap, actual rendered font and target sizes, whether dots remain distinguishable, color/shape meaning, primary-action prominence, control-effect proximity, and agreement with accepted state. A final still cannot prove spawning or crowd dynamics; review intermediate events and traces or a short recording as well.

### 10.5 Per-attempt loop

1. Start from a declared premade or fresh workspace. For live acceptance submit the exact prompt through the ordinary prompt textbox and generation action. Observe requests without replacing responses; no fixture injection, hidden accepted-recipe upload, or direct API call as a substitute for this UI gate.
2. Await hydration, correlated terminal generation status, accepted recipe, and stable logical scene state. Use bounded lifecycle polling, not fixed long sleeps or indefinite animation waits.
3. Confirm registered nodes, meaningful links, requested constraints, supported behavior, and visible assumptions. Accept different valid graphs; do not require one exact node count when composition choices differ.
4. Inspect the opening interface and capture it before interaction. Inventory every visible control and information block; name the task each serves. Apply the removal test from IMPORTANT.md.
5. Perform the outcome-only task through actual controls. Read developer snapshots through the existing diagnostic seam for assertions only; do not mutate hidden state to claim the learner flow works.
6. Capture meaningful transitions and compare visible dots, counts, colors, offspring, and exit results with the independent domain oracle. Check page/console errors and failed requests.
7. Exercise keyboard/focus, motion preference, relevant invalid author inputs, pause/restart, save/reopen, and Try lesson. Ensure a second appearance does not change model progression. Use targeted fault tests for failure/cancellation/stale edits, labeled separately from real inference.
8. Open and review every required screenshot; record Pass / Concern / Fail / Not tested per criterion with evidence and severity. Do not update a visual baseline before understanding the difference.
9. Classify the cause: scientific model, numerical transition, retrieval/metadata, inference/tool contract, transaction, presentation, interaction, or accessibility. Fix the owning shared module or recipe rather than adding a prompt-specific exception.
10. Run focused checks, rerun the exact failing scenario, then relevant regressions. Preserve the original prompt, oracle, seed set, and failed artifacts. A shared fix triggers a new frozen acceptance batch.

Stop a candidate review after at most three documented fix/review cycles; report unresolved blockers instead of retrying indefinitely. This bounds evaluation effort, not the learner's interaction time. Tests passing cannot override unresolved user criticism or known major usability findings.

### 10.6 Frozen live gate

After deterministic and premade UX gates pass:

- Strict composition: run F1, C1, V1, N1 three independent times each, with fresh workspaces: 12 actual Apertus/Laya attempts.
- Natural paraphrases and explicit constraints: run F2, C2, V2, N2 once each: 4 further fresh strict attempts.
- Contextual edits: run the eight follow-ups against recorded accepted parents, once each, recording parent and child request IDs. Strict mode remains required where supported; inability to exercise required follow-up composition is a gap, not an assumed pass.
- Normal recipe-first mode: run the four primary prompts once each and record whether Laya was called or skipped. These establish ordinary product behavior, not strict two-provider composition.
- Negative probes: run the three overclaim prompts once each in their relevant context. Unsupported requirements must be corrected or reported rather than implemented dishonestly.

Declare this 31-attempt scope before execution. Record first-pass success, bounded repaired success, rejection, timeout, and failure separately. A passing freeze has no unresolved failed required attempt. A rejected unsupported overclaim can be an expected pass if the lesson/state preservation criteria hold. After fixes rerun the impacted gate, and rerun the whole strict primary batch after cross-cutting changes. Never merge attempts from changing source revisions into one claimed successful batch.

Replay accepted exports at secondary viewports to isolate presentation variability from new inference. Label replay accurately. Latency is measured and reported, including repairs; choose a learner-facing performance target after pilot measurements rather than inventing one. Missing inference services leave the gate Not tested; fixtures cannot fill it.

## 11. Proposed test harness and verification commands

Add a narrowly scoped `src/web/scripts/domains/collective-and-evolution/` family containing `cases.cjs`, `verify.cjs`, `browser.cjs`, `live.cjs`, `replay.cjs`, and a source-fingerprint helper. This is a proposed harness location. Reuse existing generation/browser helpers; keep independent scientific references separate from production code. The suite should allow selecting a case and prompt set while always preserving failed attempts.

Proposed new scripts, to add during implementation:

| Package script | Purpose |
| --- | --- |
| `test:collective` | Independent domain oracles, invariants, contracts, and bounded histories. |
| `test:collective:browser` | Premade learner and builder/serialization interaction checks. |
| `test:collective:live` | Exact human prompts through UI with correlated actual provider evidence. |
| `test:collective:replay` | Accepted-export browser behavior and viewport/motion review without inference. |

Do not run or cite these names as existing commands before adding them. Configure output paths beneath the ignored 026 evidence root; existing runners currently enforce their own 019/023 roots and cannot simply be relabeled by changing an environment variable.

Existing supporting commands verified in `src/web/package.json` at planning time:

```sh
pnpm --dir src/web test:recipes
pnpm --dir src/web test:controls
pnpm --dir src/web test:public-catalog
pnpm --dir src/web test:composition
pnpm --dir src/web test:generation:providers
pnpm --dir src/web test:generation:realistic
pnpm --dir src/web test:generation:faults
pnpm --dir src/web test:generation:construction
pnpm --dir src/web test:board
pnpm --dir src/web exec tsc --noEmit
```

Use relevant existing browser regression scripts after shared presentation changes, including builder parity, board, generation construction, and science/system views where affected. Run scoped Biome on touched source files. At the final cross-domain release gate run `pnpm --dir src/web test` and `pnpm --dir src/web build`, record unrelated baseline failures separately, and investigate any newly introduced failures. Broaden or repeat checks only for changed behavior, failures, or unresolved concerns.

Before changing framework code, read `src/web/AGENTS.md` and the relevant installed Next.js documentation it requires. Read the premade conventions in [013](013-PREMADE-JSON-RECIPE-CONVENTION.md) before adding recipes. Tests should verify scientific and user-visible behavior, not mirror implementation details.

## 12. Work packages and gates

| Phase | Concrete deliverable | Gate to advance |
| --- | --- | --- |
| A — UX and reuse | Four opening-state sketches, control inventories, outcome tasks, reuse ledger, exact model contracts. | Every visible element has a purpose; scene is dominant; independently authored pieces are identified. |
| B — Numerical prototypes | Headless fishing, ballot counting, generation replacement, and crowd bottleneck prototype. | Independent oracles pass; crowd feasibility findings include limits and all sampled outcomes. |
| C — Shared compositions | Register model/providers/appearances and four JSON recipes through the normal builder system. | Manual composition runs; two views do not double-step; export/import and required links work. |
| D — Learner experience | Scene-first, minimal-control premades with contextual transitions and motion/keyboard support. | Opening and changed screenshots reviewed; outcome tasks operable; no blocking/major UX findings. |
| E — Generation support | Accurate retrieval/teaching cards, constraint preservation, coverage, and shared prompt/follow-up flows. | Natural prompts produce supported runnable graphs; generated opening views obey the same removal test. |
| F — Validation | Frozen live batch, Playwright review/correction loop, save/remix/Try lesson and regressions. | Actual provider proof, oracles, visual review, and recovery evidence complete; failures retained. |
| G — Handoff | Concise implementation report, screenshots, exact prompts, commands, remaining limitations. | Product owner receives concrete reviewed work with honest test coverage. |

Implement fishing and voting first to establish exact accounting and stable-dot presentation, then selection's cohort/lineage transitions. Start the crowd feasibility prototype early because emergent obstacle behavior is the largest uncertainty; do not leave its model validity until final polishing.

Explicit first-release exclusions: AI fisherman negotiation, detailed fish ecology, validated building evacuation design, physical pedestrian pressure/injury modeling, multi-seat/proportional election systems, political persuasion agents, sexual reproduction, molecular genetics, and speciation. Record a request beyond these boundaries as unsupported or partial coverage rather than silently expanding into a second product.

## 13. Definition of done and report template

- [ ] Research consequences and scientific assumptions are reflected in executable contracts.
- [ ] Each premade opens with one clear question, a dominant visual, and only justified essential controls.
- [ ] Fish accounting preserves the user's exact reproduction rule and exposes depletion through catches.
- [ ] Crowd conservation, bottleneck mechanics, and matched comparisons pass; any claimed positive effect has multi-seed evidence and declared conditions.
- [ ] Voting colors reflect actual ballot allocation/approval without changing preferences or falsely recoloring all voters as winner supporters.
- [ ] Selection shows survival, inherited offspring, mutation, and generation replacement without individual-directed adaptation.
- [ ] Models, scenes, controls, and relevant outputs are independently editable through the shared builder.
- [ ] Save/reopen, remix, native import/export, Undo/Redo, and actual Try lesson preserve behavior and presentation.
- [ ] Generated lessons pass the same UX review as premades; strict attempts prove real Apertus and real Laya where required.
- [ ] Playwright opening/transition/result screenshots were directly reviewed; the browser method and testing gaps are named accurately.
- [ ] Keyboard, reduced motion, short/narrow viewports, recovery, and no-double-step behavior pass.
- [ ] Domain checks, relevant regressions, type checking, scoped formatting, and the final build have recorded outcomes.
- [ ] No unresolved blocking/major findings or known product-owner objections are averaged away by passing technical checks.

For every reported finding record: task, host/route, starting recipe/state, viewport/input/motion, status, observed behavior, inferred concern where applicable, severity, reproduction steps, evidence links, smallest useful fix, and rerun result. The final report separates scientific correctness, functional behavior, inferred usability, actual participant observations, actual inference, and persistence modes.

Final handoff should link the four reviewed opening screenshots and four meaningful changed states, provide the primary natural prompts from section 9, report all attempt counts and provider identities, and identify any Not tested areas. A plan, screenshot capture, enabled provider setting, or passing fixture suite is not a completion claim.
