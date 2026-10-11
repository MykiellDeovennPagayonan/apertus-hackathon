# 019 implementation evidence

Status: **Implemented and validated**, 2026-10-09 15:01 Asia/Manila (07:01 UTC). Full live acceptance: 25/25 passed. Final native export replay: 10/10 passed. Scientific and untested-mode limits remain documented below.

## Reuse and gap ledger

| Need | Existing candidate and decision | Added responsibility |
| --- | --- | --- |
| Pendulum | Existing physical-systems/Pendulum already owns motion, period, commands, reset and appearances. Reused without changing equations. | Catalog composition requirements and real inference wiring. |
| Phantom traffic jam | Existing RingTraffic already implements seeded IDM dynamics, braking, following-gap changes and observations. Reused without new traffic physics. | Complete control/appearance graph and retrieval keyword correction. |
| Circuit brightness | Existing ResistiveCircuit already implements identical series/parallel bulbs, per-bulb power and power-based brightness. Reused. | Complete topology/count/power graph. |
| Eclipse | Existing coordinate transforms cannot classify finite-source shadows; no eclipse physics provider was found. Existing shared controls and lesson renderer are reused. | Pure finite-radius planar geometry, configurable provider, narrow SVG appearance. |
| Wave cancellation | Existing data/Expression supports bounded arithmetic but has no sine/time sampler or aligned signal-dataset addition. Existing DatasetDisplay chart and controls are reused. | Independent sinusoidal source plus reusable two-input superposition provider; no complete sound experiment component. |

## Architecture decisions

- Public catalog definitions remain the source of schemas, commands and ports. Requirements describe reusable component capabilities, never strings matching acceptance prompts.
- Laya chooses a supported topic from concise catalog choices and an explicit no-fit choice. Apertus interprets intent and chooses/configures typed authoring operations. Application code owns execution and physics.
- `COMPOSITION_DECISION_POLICY=required-laya` is server-side and requires Apertus/hybrid/Laya configuration. It does not silently fall back if Laya rejects or is unavailable. Optional mode preserves existing selection behavior.
- Composition tooling narrows schemas to unresolved graph responsibilities and checks tools before execution. The same AuthoringTransaction and DocumentRuntime are used for manual/test/live recipes.
- Required composition has a 24-turn/28-call cap (including intent/probe/repairs), three composition repair reservations, and 32 successful authoring operations with 48 retained receipts. Legacy transaction limits remain 12 operations/24 receipts. All limits are explicit and bounded; the required-mode default total deadline is 240 seconds; optional mode remains 120 seconds. Desktop measurements reached 60–77 seconds for the shorter graphs, justifying the larger graph budget. An explicit PLANNER_TIMEOUT_MS overrides either default.
- Draft isolation, atomic rejection, accepted state preservation and existing saved revision checks remain mandatory. Durable save is provided by existing guest/project storage, not by claiming an in-memory draft is durable.

## Baseline fixture review

The five added public definitions do not change any existing public definition hash. Topic dependency/appearance retrieval and the traffic keyword intentionally change card/bucket projections. Catalog capability cards and compatible-component projections remain unchanged.

The checked-in 018 baseline also disagreed with the current projectile composite hash before the new exploration definitions were registered. This was reproduced by loading the catalog with those registrations removed in an isolated test process. Projectile rendering fixtures were refreshed alongside additive eclipse/signal catalog fixtures; no projectile source or equations were modified. Existing behavioral recipe tests remain the primary oracle. Raw baseline diffs/probes are local evidence, not acceptance proof.

## Scientific fidelity

The eclipse diagram implements finite-source umbra/penumbra geometry with deliberately scaled sizes and a fixed Sun/Earth. It does not predict dates, visibility maps or universal solar totality. See [NASA eclipse geometry](https://science.nasa.gov/eclipses/geometry/).

Sound signals represent pressure at one point and add algebraically on a shared sampled time grid. Equal amplitude/frequency with 180-degree phase separation cancels; the experiment does not implement microphone feedback or actual headphone acoustics. See [OpenStax wave superposition](https://openstax.org/books/physics/pages/13-3-wave-interaction-superposition-and-interference).

## Validation records

All raw evidence is retained under ignored `019-validation/<run-id>/`. Live failed attempts remain retained. The first desktop run failed during client startup because it used a dev origin rejected by Next.js; subsequent runs use localhost. Early Laya runs rejected long/mixed criteria; concise semantic catalog choices were investigated with actual local Laya inference while retaining the confidence threshold.

A live run interrupted by hot reload is incomplete and cannot count as acceptance. Further runs freeze application code while browser attempts are active.

Deterministic exploration checks pass for signal cancellation/reinforcement/mismatch, eclipse alignment/non-alignment/bounds, graph load/serialization parity, independent-source controls, atomic multi-command rejection, draft rollback, and required-provider configuration/unavailability. Full regression and final live results are recorded below.

### Shared defects found and corrected

Live Apertus sometimes appended a stray closing parenthesis after a JSON string. The bounded syntax repair removes only that character outside quoted text and records it; schemas and full graph validation remain mandatory. The tokenizer fix eliminated its compatibility warning but did not fix this format defect. Empty configuration contracts and insertion aliases belong to the application; no physics values are invented during repair.

The first all-case browser pass created valid pendulum, traffic, circuit and eclipse graphs, then caught control-card overlap. Shared arrangement now allocates sufficient form height and clusters connected model scopes for presentation only. The sound attempt detected duplicate inferred aliases; application alias allocation closes that identity defect. Earlier failed/interrupted batches remain under the ignored directory.

The deterministic desktop runner now checks the current About this lesson/Details UI. Its final run passed arithmetic, rectangles, bridge, control/oracle checks, reload/export, cancellation/supersession and guest quota recovery. Evidence: `019-validation/regression-responsive-final/`.


## Completed implementation and verification

- Added five public definitions: sinusoidal source, two-input signal superposition, eclipse geometry and their focused appearances. Existing DatasetDisplay plots, controls, lessons, authoring transactions and persistence pathways are reused. Numerical helpers validate finite bounds, matching sample grids, overflow and independent instance state.
- Required-Laya composition performs a real catalog-backed decision, then real Apertus tool-argument inference. Tool envelopes, aliases and execution belong to the application; bounded repairs are traced and do not bypass schema, coverage or runnable-graph validation.
- Shared arrangement and learner-view reflow address control pairing, chart room, growing validation forms and toolbar/focus overlap. Presentation changes preserve model state and saved graph semantics.
- The repository-owned MLX Apertus launcher supplies its tokenizer compatibility setting. Model caches/vendor code were not patched. README, environment example, Makefile targets, test runners, catalog fixtures and source ledger were updated.

Checks passed on the final implementation before pausing: `pnpm test`, `pnpm exec tsc --noEmit`, scoped Biome over 39 touched source/script files, isolated Next production build with `--webpack`, and `pnpm test:browser`. Focused contracts cover all five domain oracles, typed graph serialization, independent controls, atomic rejection, provider failures, layout immutability and error-form reflow.

Native replay of the previously accepted sound graph passed under both reduced and normal motion, including all desktop viewports, invalid numeric input, oracle interactions, reload and import: `019-validation/replay-2026-10-09T05-05-51-235Z/`, using live source `2026-10-09T04-59-03-146Z`. Replay checks UX; it is not another inference attempt. The final five-case/both-motion replay subsequently passed; see Final acceptance below.

## Final batch at pause

Retained directory: `019-validation/2026-10-09T05-06-52-854Z/`. `report.json` contains **14 completed attempts, 14 passed**. Rounds one and two each passed all five cases; round three passed pendulum, traffic, circuit and eclipse. Round-three sound was interrupted and has partial evidence only. Rounds four and five were not run. The runner exited with code 130 after the user requested the pause; the interrupted attempt is not classified as a passed or completed generation.

Of the completed attempts, **3 were first-pass and 11 needed recorded bounded repairs**. Recorded generation latency was 60.018–145.996 seconds (mean 103.7 seconds). Each completed attempt has successful actual Laya selection and Apertus authoring traces, provider/model identifiers, available token usage, control assertions and desktop evidence. No completed attempt reported a browser/console error or network failure. Earlier failed batches are retained separately and are not erased by these successes.

| Provenance | Value |
| --- | --- |
| Base Git revision | `4b0f7b9faf44adef00bef8303a78cd7e6de30e4a` plus uncommitted implementation changes |
| Frozen source evidence | Batch `source-manifest.json`; source fingerprints checked during the batch |
| Apertus | `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`, MLX local port 43101 |
| Apertus cached revision | `4819dee434c75e54b40139bf17677a28c268d5d2` |
| Laya | `aac6fef/laya-multilingual-mlx`, local port 43102 |
| Laya cached revision | `f2b4faf51023039425946074e2cf1361d2db11d5` |
| Browser | Chromium 155.0.8059.39 / Playwright 1.63.0 |
| Desktop viewports | 1440×900 primary; 1920×1080 and 1280×720 checks |

Round-one changed-state and secondary-viewport screenshots for all five cases were visually reviewed. Observations: independent Signal 1/2 controls, visible Apply actions and pressure legend; eclipse geometry stayed visible; pendulum period matched changed length; traffic showed reduced speed after disturbance; circuit showed parallel bulbs and power. At 1280×720 the board fits by reducing scale, so some text is small and users can zoom. Earlier replay also verified visible validation-error recovery. Screenshot capture is not a claim that every remaining attempt or intermediate state was visually reviewed.

All raw outputs are under the ignored `019-validation/` tree; no files from that tree are tracked. Keep partial and failed runs. Guest reload and native export/import are verified; authenticated account/database saving is untested. Required-mode AI follow-up editing of an existing graph is outside the completed fresh-generation checks. No production deployment or commit was made.

## Earlier resume checklist (completed; commands retained for reruns)

1. Inspect the current working tree and this handoff; preserve existing changes and all evidence. The live runner and isolated Next server on 43110 were stopped. The main server on 43100 and inference services were left untouched; check readiness before restarting anything.
2. Review incidental Next-added `.next-realistic-validation` and `.next-realistic-build` type globs in `src/web/tsconfig.json` for final cleanup. Do not change application code, styles, environment or generated type configuration during a live batch: hot reload invalidates evidence.
3. Start an isolated required-Laya validation server using the command below. The ignored local environment already selects the real providers and sets `DECISION_TIMEOUT_MS=20000`; verify it without printing secrets. Diagnostics must remain off for normal production use.
4. Run a **new complete 25-attempt batch**, retaining the paused batch. Default runner settings are five rounds of all five prompts. The runner does not resume an interrupted round; do not present an arbitrary sum of partial batches as the complete gate. If a shared defect needs fixing, perform focused checks and restart a full frozen batch.
5. Replay accepted exports from the complete batch under both motion preferences. Review initial, changed and invalid-input screenshots at all named desktop sizes. Add explicit intermediate-state evidence for cancellation, series/parallel power and solar/lunar geometry if needed; label replay separately from generation.
6. Update this evidence and the definition-of-done checkboxes with actual final results. Recheck affected regressions if code changes; review the final diff and confirm raw evidence remains ignored. Report remaining persistence/follow-up limitations honestly.

Run service commands from the repository root in separate terminals **only if their services are not already running**:

```sh
make run-apertus
make run-laya
```

Start the isolated web server from the repository root:

```sh
APERTUS_BROWSER_TEST_DIR=.next-realistic-validation \
COMPOSITION_DECISION_POLICY=required-laya \
PLANNER_MODE=hybrid DECISION_PROVIDER=laya LLM_PROVIDER=apertus \
DECISION_TIMEOUT_MS=20000 APERTUS_MAX_TOKENS=1536 \
PLANNER_DIAGNOSTICS=true NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS=true \
pnpm --dir src/web dev --port 43110
```

Run the full batch from the repository root in another terminal:

```sh
UX_TEST_URL=http://localhost:43110 pnpm --dir src/web test:generation:realistic:live
```

For replay, replace the path with the newly completed batch directory (leave `REALISTIC_REPLAY_REARRANGE` unset to check the actual accepted layout):

```sh
UX_TEST_URL=http://localhost:43110 \
REALISTIC_REPLAY_DIR=/absolute/path/to/019-validation/new-complete-batch \
pnpm --dir src/web test:generation:realistic:replay
```

Supporting checks from the repository root:

```sh
pnpm --dir src/web test
pnpm --dir src/web exec tsc --noEmit
UX_TEST_URL=http://localhost:43110 pnpm --dir src/web test:browser
APERTUS_BROWSER_TEST_DIR=.next-realistic-build pnpm --dir src/web exec next build --webpack
```


## Resumed validation

Fresh frozen batch: `019-validation/2026-10-09T06-25-32-310Z/`. Its source manifest includes the resumed runner changes: intermediate series/parallel, eclipse and wave screenshots. Application source is unchanged from the paused implementation. The completed results are recorded under Final acceptance below.

The first replay on resume exposed a runner error: normal-motion opening advances time before the strict reload comparison. The corrected runner resets through the learner UI after switching to deterministic stepping; it does not change model code or loosen comparisons. Failed replay retained at `replay-2026-10-09T06-24-51-013Z/`. Corrected five-case replay passed **10/10** under both motion preferences at `replay-2026-10-09T06-27-00-644Z/`, using the paused batch's round-one real-model exports. This replay is separate from new inference.


## Final acceptance — completed 2026-10-09

**25/25 fresh ordinary-UI generations passed** in `019-validation/2026-10-09T06-25-32-310Z/`: five independent guest-workspace attempts for each exact prompt, with no intercepted/injected generation responses. Every attempt has successful real Laya selection and real Apertus authoring, full typed-graph/runtime checks, scenario control oracles, visible assumptions, numerical-entry rejection, geometry/visibility checks at 1440×900, 1920×1080 and 1280×720, guest reload, and native export/import re-exercise. The runner exited successfully. All 25 have no reported browser errors, console errors or network failures.

| Measurement | Final result |
| --- | --- |
| First-pass successes | 5/25 |
| Successes requiring bounded repair | 20/25 |
| Failed/rejected completed attempts in this batch | 0/25 |
| Generation latency | 46.923–168.929 s; mean 74.106 s; median 63.186 s |
| Schema/execution repair events | 10 |
| Recorded format repair events | 25 (all stray-parenthesis syntax repairs) |
| Actual local models | Apertus and Laya models/revisions in the provenance table above, reverified on resume |

Repair counts are events, not independent attempts; one repaired success can include multiple events. The 20 repaired successes are not reported as first-pass generation. Latency measures generation through the result trace; desktop interaction/replay time is separate. The earlier paused 14 attempts and failed batches are not added to this 25-attempt gate.

**10/10 native accepted-export replay checks passed** at `019-validation/replay-2026-10-09T06-40-55-632Z/`, using this final batch's round-one exports: all five domains with both reduced and normal motion. Numerical checks use explicit stepping after a native UI reset. This is additional UX validation, not new inference.

Representative screenshots were visually inspected across all three desktop sizes and all five domains, including wave cancellation, series/parallel power, solar/lunar alignment and invalid-input recovery. Exact reviewed paths and observations are in the ignored batch `visual-review.md`. All 25 attempts additionally passed automated geometry/visibility checks. At smaller fitted scales, text is smaller and zoom remains available; the plan does not certify mobile layouts.

Final scoped Biome passed on 37 source/script files recorded in the batch manifest, TypeScript passed, and all recorded source fingerprints remained unchanged through the batch. The full deterministic suite, existing desktop regressions and isolated production build passed before the pause; application source remained unchanged on resume. Resumed changes were limited to intermediate screenshot capture and the corrected replay starting-state reset, both exercised by the passing live/replay runners. `git diff --check` is clean. Raw validation files remain git ignored, with none tracked.

### Ownership and transaction review

| Boundary | Owner and evidence |
| --- | --- |
| Domain state and physics | Existing pendulum/traffic/circuit providers plus separate pure eclipse and signal modules; views consume runtime outputs. Domain tests and UI oracles agree. |
| Catalog contracts and composition | Public definitions own schemas, commands and ports; capability metadata owns dependencies/coverage. Real inference assembles them through the shared authoring API. |
| Decision and authoring | Laya strategy adapter and Apertus focused-turn adapter have separate contracts; bounded syntax repair cannot bypass schema or draft preflight. Required mode preserves failures rather than silently falling back. |
| Atomicity and consistency | Existing AuthoringTransaction performs draft isolation, multi-command rollback and full final graph/runtime validation before activation. Focused rollback/invalid-operation checks passed. |
| Isolation and durability | Existing cancellation/supersession and stale-revision guards remain. Guest persistence restores accepted initial recipes; export/import replays preserve graph behavior. Authenticated database durability is not claimed. |
| Presentation | Shared arrangement and responsive learner-view reflow preserve authored/model state; source immutability, locked rectangles and independent controls are checked. |

The Next-generated type globs for the two isolated build/dev directories were reviewed and retained, consistent with the repository's existing custom-output globs. Their generated contents are ignored. The work remains uncommitted; no production deployment was performed. The local inference services and isolated validation app on port 43110 remain available after validation.

### Remaining limits

Authenticated account/database save was not tested with an isolated account. Required-mode AI follow-up editing of an already-created graph was not validated by this fresh-generation gate; existing deterministic cancellation/supersession and optional-path regressions passed. No live-provider outage browser campaign, mobile certification, real headphone acoustics or astronomical prediction is claimed. These do not replace the documented scientific limits or turn this 25-attempt local sample into a universal reliability guarantee.
