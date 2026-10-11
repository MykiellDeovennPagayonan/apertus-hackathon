# Four visual simulations — implementation and validation

Date: 2026-10-10. Implementation follows [the research plan](../026-FISHING-CROWDS-VOTING-AND-NATURAL-SELECTION.md) and [IMPORTANT](../IMPORTANT.md).

## Delivered behavior

| Lesson | The visual teaches | Opening controls | Advanced author settings |
| --- | --- | --- | --- |
| Shared fishing lake | Five boats draw from the same lake. Reproduction shrinks with stock; today's individual catches and the shared stock remain visible. | Watch 30 days; catch arrangement | Initial stock, public/private catches, fixed/reciprocal/stock-responsive behavior, enforced quota |
| Crowd exit | Two identical initial crowds merge through identical doorways; only the pillar changes. Waiting dots turn amber. Results report model steps, including slower and similar outcomes. | Run comparison | Crowd size, friction, pillar radius and placement, seed |
| Voting | Each dot retains its ballot and identity. Elimination changes the counted allocation; approval shows each explicit approval set. | Count votes; voting rule | Two to five candidates, population profile or up to 500 explicit partial ranked/approval ballots, seed |
| Natural selection | Parents survive probabilistically, offspring inherit traits, occasional mutations appear, and a new cohort replaces its parents. Living individuals never choose a new trait. | Next generation; habitat | Starting variation, uniform trait, mutation rate/size, selection enabled, population cap, seed |

Controls change context: pause during motion, restart at the terminal state, and a short secondary reset only after progress. Advanced settings remain author configuration and exposed recipe parameters, rather than additional opening learner controls. Scene, primary action, essential choice and short caption are independently editable nodes. Navigation clutter is removed for these lessons; explanation/help and collapsed experiment options remain accessible.

## Reuse ledger

| Existing foundation | Use | New work and reason |
| --- | --- | --- |
| Domain contributions and assembly | Typed model registration, bounded parameter schemas, instance limits and output validation | Four deterministic domain models with event records; these dynamics were not represented by the existing models |
| Shared authored runtime and clock | Atomic commands, one authoritative state, isolation, deterministic stepping | Optional model `reconfigure` hook preserves populations during authored changes to live conditions; starting-population changes restart |
| Public catalog and command/value/attachment connections | Normal model/appearance/control composition | Dedicated scene-first appearances and minimal action/choice/caption nodes; no scene-local hidden simulation or prompt-specific router |
| Existing builder, native recipes and premade registry | Remix, save, Try lesson, reopen and import/export | Four explicit JSON recipes and registry entries; no runtime recipe patching |
| Shared arrangement and responsive board | Desktop scene-first placement and stacked phone layout | Scoped collective dimensions and readable minimum zoom; valid authored learner bounds reflow with responsive rows, while deliberately excluded items retain their authored bounds |
| Existing planner retrieval, Laya decision and Apertus authoring | Actual human prompt creation and follow-ups | Named collective teaching contrasts improve classification among related models; explicit command proposals outrank incomplete duplicate proposals |
| Existing Playwright infrastructure | Real local browser interaction and snapshots | Domain, learner, builder and live-inference scripts with raw diagnostics, screenshots and traces |

The catalog cleanup guard explicitly admits the new definitions while preserving historical baseline hashes. Generated source-ledger updates come from the catalog audit.

## Scientific validation

- Fishing: 365 days at 2,000 fish with four each preserves exactly 2,000. Births use `floor(opening stock / 100)` before simultaneous harvest. All daily accounting identities, scarcity allocation, rotating ties, public/private lagged reciprocity, quotas, stock-responsive behavior and absorbing extinction pass.
- Voting: the same 100 voters elect A under plurality (40), B under IRV (60 after 25 transfers), and B under approval (100 explicit approvals). Tests also cover partial-ballot exhaustion, zero active ballots, deterministic ties, invalid/duplicate candidates, two through five candidates and custom ballots. Preferences stay unchanged across rule switches.
- Selection: 400 independent seeds with 20 matching and 20 mismatching parents produce mean survivor counts **15.975 and 6.410**, versus independent binomial expectations **16 and 6.4**, within the predeclared four-standard-error tolerance. Across 100 separate seeds after 12 generations, mean trait is **0.145 in light, 0.854 in dark, and 0.489 with selection disabled**. Tests cover no mutation, uniform inheritance, parentage, cap sampling, replacement, bounded generations and extinction.
- Crowd: 90 paired held-out runs (seeds 31–60 across three placements) preserve legal positions, one-person occupancy, adjacency and population conservation at every step. All complete within the 2,000-step bound; replay is deterministic. Center/close/offset placements help in **18/30, 15/30 and 9/30** runs respectively. Mean differences (obstacle minus open) are **−1.17, +2.37 and −6.70 model steps**. Results are conditional and mixed; they do not establish a universal evacuation benefit or physical pressure model.

A separately labeled [illustrative crowd recipe](CROWD-ILLUSTRATION.json) uses seed 2: the same crowd clears in 325 open-room steps versus 272 with a pillar. This seed was selected to show a beneficial outcome, **not** used as validation evidence or substituted into the default.

Raw numerical evidence: [model-validation.json](runs/model-final-native/model-validation.json).

## Browser review and correction loop

Method: local Node Playwright fallback; Playwright MCP was unavailable. These are actual pages and interactions, not rendered design mockups. Browser checks cover 1440×900, 1280×800, 1366×768, 1920×1080 and 390×844, keyboard operation, motion and reduced motion, intermediate states, pause/resume and meaningful results. Desktop controls are checked for obscuration and page/content overflow. The phone voting grid also has an explicit internal horizontal-overflow assertion.

Direct screenshot review and actual interaction checks found and corrected:

| Finding | Reproduction and evidence | Severity | Smallest fix and rerun |
| --- | --- | --- | --- |
| Resizing phone back to desktop retained an expanded scene and moved content behind chrome | Change viewport on a collective lesson; earlier browser runs retain the screenshots | Major | Fixed desktop scene height, mobile content height and SVG flex sizing; final browser suite passes |
| Canvas navigation covered the caption on a short desktop | Open fishing at 1366×768 | Major | Remove unused canvas buttons/zoom readout for these lessons, retain explanation affordance; screenshot reviewed and controls reachable |
| Phone voting dots clipped inside their panel despite zero page overflow | Open voting at 390×844; earlier reviewed screenshot shows last columns cut off | Major | Seven columns with 44px targets and keyboard movement based on actual column count; explicit internal overflow check and fresh screenshots pass |
| Phone crowd/voting actions were clipped to desktop learner bounds and lacked native scroll navigation | Import an accepted generated lesson at 390×844, scroll to the primary action and inspect its hit target | Major | Remap valid learner bounds with their responsive rows, preserve authored exclusions, use native phone scrolling and reserve the composer region; actual phone interactions and the 50-capture canonical suite pass |
| Narrow tablet, landscape and zoom-equivalent viewports had unreachable actions or clipped voter columns | 640×844, 844×390 and 720×450 with scale 2 | Major | Align compact layouts with the shared board breakpoint and allow native scrolling on short screens; all 16 size/model combinations pass |
| Fish labels were too small on phone | Inspect fishing at 390×844 | Moderate | Scoped larger SVG labels; final phone capture reviewed |

These are engineering usability judgments, not participant-study findings. Failed/aborted artifacts are retained under `runs`; earlier attempts are not merged into a successful frozen inference batch.

## Validation status

- Full `pnpm --dir src/web test`: passed, including existing architecture, builder, catalog, generation, science and cycle regressions plus the new domain suite.
- TypeScript `tsc --noEmit`: passed.
- Scoped Biome check: passed.
- Production `pnpm --dir src/web build`: passed using a separate build directory and the local process permissions required by Next.js.
- Final learner browser suite: passed for all four simulations; 50 screenshots including motion transitions. The final canonical suite also operates and resets every primary action on a phone.
- Builder remix/save/Try lesson/return/reload suite: passed for all four; 12 screenshots. Save verified **on-device** persistence.
- Undo/Redo plus native download/import: passed for all four after exact-value author configuration edits; 12 additional screenshots and exported runnable recipes. Earlier file-menu selector failures are retained and were corrected in the browser script.
- Accepted AI exports replayed at 1440×900, 1366×768 and 390×844: all four passed, including actual primary-action advancement; 20 screenshots. This is responsive replay, **not** 20 additional inference attempts.
- Advanced author configuration: five candidates and 500 voters passed actual desktop/phone rendering and exact totals, including an empty approval ballot.
- Actual inference: the first complete 27-request strict batch exposed real follow-up failures despite successful creation. Raw evidence is retained in `runs/live-1791635583259`. Parameter meanings and capability limits are now catalog guidance; stateless views no longer offer impossible configuration schemas. A fresh canary is running before the final frozen suite. Exact results and counts will be recorded before handoff.

## Realistic prompts

Primary creation prompts (submitted unchanged through the learner UI):

1. “show me what happens when a town overfishes a lake”
2. “show me how adding an obstacle makes exit faster?”
3. “show me how different voting systems change who wins”
4. “show me natural selection”

Follow-up examples: “what if just one fisherman starts taking twice as much”, “move the pillar closer to the exit”, “same people but use ranked choice now”, “what if people can vote for more than one person”, “make the environment darker and see what survives”, “what if they all start the same and theres no mutations”.

The complete paraphrase, follow-up and overclaim suite is defined in `src/web/scripts/domains/collective-and-evolution/live.cjs` and section 9 of the research plan. Provider settings alone are not accepted as proof: each request saves the original request, response, actual provider diagnostics, runnable recipe, runtime, screenshots and browser trace.

## Scope and remaining limits

These are bounded teaching models. Fish ecology excludes mortality/carrying capacity; fisherman strategies are explicit rules. Crowd movement uses conflict friction and turning delays, without forces, pressure, injury or calibrated safety predictions. Voting has one seat and fictional preferences, without persuasion or a universal “best” winner. Selection uses a quantitative shade trait and single-parent inheritance, without molecular genetics, sexual reproduction or speciation.

Not tested: human participant comprehension studies, authenticated account/cloud publishing and database persistence, physical building safety accuracy, and devices beyond the recorded browser/viewport matrix. An older shared-workspace browser regression could not complete because its `Continue draft` and `Move Gas container` selectors no longer match the unchanged builder flow. The original run and a temporary current-flow adaptation were attempted; neither is claimed as a pass. Current collective builder/persistence/browser checks and the full deterministic regression suite pass. No cloud deployment was requested.
