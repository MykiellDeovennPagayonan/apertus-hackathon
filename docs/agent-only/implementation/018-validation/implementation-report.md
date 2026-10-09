# Component cleanup implementation evidence

Date: 2026-10-09  
Baseline source revision: `c4a0e7f90ec6f0dd047538a4a877b6505c25551b`  
Scope: [implementation 018](../018-SAFE-COMPONENT-CLEANUP-AND-AI-COMPATIBILITY.md).

## Result

Implemented the reviewed cleanup while preserving the public component vocabulary and AI composition flow. `RecipeLesson.tsx` decreased from 1,869 to 240 lines. Focused modules own layout, control, display, appearance, and canvas presentation. No planner, transport, model settings, executable model equations, runtime transaction implementation, serialized formats, or premade recipe data changed.

This work applies single responsibility through focused modules, keeps command behavior behind the existing runtime boundary, reuses controlled range interaction, and isolates snapshot narrowing. It does not add an abstraction framework or claim that every module now satisfies every interpretation of SOLID.

## Changes and allowed behavior differences

| Area | Result |
| --- | --- |
| Appearance registration | Complete explicit definitions replace positional inheritance from a number control. Each definition owns independent lifecycle arrays. The only public-contract correction is removal of unrelated `label`, `mode`, and `initial` lifecycle fields from generated assembly appearances. |
| Numeric input | Local drafts track whether input was accepted. Accepted text follows external values without submitting another command or dropping focus. Incomplete/rejected drafts remain editable. Explicit-submit forms keep their existing dirty/discard behavior. |
| Range input | Both wrappers use `controls/RangeInput.tsx` for number dispatch and result reporting. Existing wrapper APIs, DOM attributes, bounds, labels, styling hooks, and feedback remain intact. |
| Natural controls | The dispatcher and retained form propagate real `ActionResult`; rejection cannot be reported as successful form submission. Accepted state remains untouched on rejection. |
| Presentation | `views/recipe/` owns control/display rendering, domain appearances, canvas previews, recursive layouts, shared contexts, observation formatting/binding helpers, and typed snapshot adapters. The lesson entry point retains the existing subscription and clock coordination. |
| Display repetition | Readouts and inspectors share source resolution, unit normalization, and bridge-selection hints while retaining their intentional label differences. |
| Types | Known bridge, town, projectile, and mathematics results pass through presentation adapters that check readiness/discriminants. Full state validation remains with runtime providers. Existing canvas assertions were retained rather than expanding into a runtime schema redesign. |
| Compatibility | Existing exports, saved readers, and session adapters remain. No speculative dead-code deletion. |
| Mechanical cleanup | Formatting/import corrections applied to changed component sources. The byte-protected Gas recipe module remains unchanged, including its existing import-order exception. |
| Verification | New contract/AI projection fixtures, old/new initial-markup hashes, retained-command acceptance checks, and real React numeric browser regressions. The headless guard is included in `pnpm test`. |
| Test maintenance | AI lifecycle fixture expects the current storage-warning wording. Data browser fixture opens the existing canonical draft directly instead of waiting for a retired recovery button. Product behavior and rejection assertions were not weakened. |

## Atomicity, consistency, isolation, and durability

- **Atomicity:** Controls continue to submit through validated runtime/session dispatch. The retained natural-control test proves rejection leaves the accepted store object untouched. Existing full-suite tests cover multi-command rollback, atomic topology edits, stale revisions, and failed activation.
- **Consistency:** Configuration schemas, units, commands, port compatibility, and validation owners are preserved. Catalog comparison permits only the documented appearance lifecycle correction.
- **Isolation:** Instance ownership and clocks remain in the existing runtime/session paths. Full-suite checks cover independent copies, remapping, scoped execution, and presentation invariance. Presentation modules neither initialize nor step separate model instances.
- **Durability:** Save/reopen and export use the existing persistence paths. Full-suite storage-failure tests and AI browser export/reload/recovery checks pass. This cleanup does not turn browser storage into a database transaction system or introduce new persistence guarantees.

## Compatibility evidence

`scripts/fixtures/component-cleanup-contracts.json` was captured before implementation. Canonical hashes cover every public definition, all initial/composite AI cards, representative ranked buckets, capability cards, and compatible-component projections. Object keys are normalized; meaningful array order is preserved.

`scripts/fixtures/component-cleanup-markup.json` was generated by rendering the original lesson source against all 41 built-in recipes. Old/new renders compare identically after normalizing React-generated IDs and dynamic-provider stack traces. The permanent test preserves that comparison. This verifies initial DOM structure, labels, and drawing attributes; it is not a claim of pixel-perfect interactive parity at every state.

Baseline `pnpm test` passed before changes. Initial contract/control/open-composition checks passed during implementation. An inventory failure was resolved by regenerating the existing source ledger, not weakening its assertions. A protected Gas source-hash failure caused the attempted import-only cleanup of that module to be reverted; its byte-level protection remains intact.

## Passing final verification

| Check | Outcome |
| --- | --- |
| `pnpm test` | Passed, including the new cleanup guard, architecture, recipes, controls, instance isolation, atomic rollback, storage failures, and deterministic generation/provider checks. |
| `pnpm exec tsc --noEmit --incremental false` | Passed. |
| Strict Biome on changed/new TypeScript and verification sources | Passed. |
| `pnpm exec biome check src/simulations/components --assist-enabled=false` | Passed across the component library. Full strict-library checking retains one existing organize-imports error in the byte-protected Gas module. |
| `pnpm test:components:cleanup` | Passed: public/AI contracts, independent appearance metadata, 41 initial renders, real retained-command acceptance/rejection, and model discriminants. |
| `pnpm test:components:cleanup:browser` | Passed with real React controls: accepted/external values, no extra synchronization commands, focus, incomplete/rejected input, decimals, Escape/Enter/blur, shared ranges, bounds, and explicit-submit rejection/discard. |
| `pnpm test:generation:browser` with required diagnostics | Passed all five records: arithmetic, rectangles, bridge, lifecycle, and storage recovery. Covers real activation, controls, numeric oracles, export/reload, cancellation/supersession, preservation on rejection, and storage failure. These are deterministic model-response fixtures. |
| `pnpm exec next build --webpack` | Passed compilation, TypeScript, page generation, and optimization. Default Turbopack build stalled and was stopped before using the documented fallback. |
| `git diff --check` | Passed. |

Reproducible AI browser command:

```sh
# Server in its own terminal; flags expose the fixtures' read-only diagnostics.
NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS=true PLANNER_DIAGNOSTICS=true pnpm exec next dev --webpack --hostname 127.0.0.1 --port 43100

# Separate terminal, from src/web.
UX_TEST_URL=http://127.0.0.1:43100 GENERATION_EVIDENCE_DIR=/tmp/components-018-generation-verified pnpm test:generation:browser
```

Transient evidence was retained under `/tmp/components-018-*`, including final suite/build logs, numeric regression output, deterministic AI records/traces, and original/refactored data-browser comparison logs. Repository fixtures and the permanent scripts remain the durable regression evidence.

## Remaining limits and deferred work

1. The older component-presentation script expects retired submit-form/number-input UI for activities now using live text fields. It failed at the baseline. The new regression and current generation fixtures cover the changed numeric behavior without restoring retired product UI.
2. Public-catalog and builder-parity browser scripts expect retired `2D`, `Continue to layout`, or `Continue draft` flows. They fail before reaching their intended acceptance scenarios. Their headless contract suites pass; a separate modernization of these broader scripts is still needed.
3. The control-editor browser script passed setup, wiring, live values, sibling synchronization, and rejection recovery, then failed while reopening board settings due to existing tool visibility/overlay interaction. An attempted test-only focus change did not resolve it and was reverted. The new numeric regression passes independently.
4. The data-presentation browser script reaches its host-switch disclosure assertion and fails because a native disclosure loses its open state. Replaying the same updated fixture against the original lesson source produced the identical failure; the final refactored lesson was restored automatically. This is an existing presentation issue outside the reviewed cleanup.
5. The recipe browser run failed while capturing a failure screenshot, obscuring its underlying assertion. It is not counted as passing acceptance. Initial markup parity and deterministic AI browser fixtures provide separate verified coverage.
6. The configured provider remains Apertus/local. A read-only availability probe could not reach its local inference server. Live model generation is unverified; no model, credentials, endpoint, budget, or prompts were changed.
7. Compatibility exports and the separate Gas/Town premade migration remain deferred as planned. The byte-protected Gas import-order exception is preserved rather than relaxing its protection or changing global lint configuration.

These limitations are not reported as successful browser gates. No unrelated product behavior was changed to make older tests pass.
