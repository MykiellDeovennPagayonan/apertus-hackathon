# Tool-based generation: phases 1–3 implementation

Date: 2026-10-06. Scope: phases 1–3 of `015-TOOL-BASED-SIMULATION-GENERATION.md`. The original plan is preserved. Phases 4–5 have runnable acceptance harnesses but are not signed off.

## Delivered

**Phase 1:** pure shared insertion, configuration, scoped connection/binding, typed observations, reference-safe removal, bridge regeneration, arrangement, atomic transactions with idempotent receipts, and headless finalization. Builder adapters reuse these operations. The three scoped recipes expose parameters without changing accepted starting values. Independent rectangle scopes and multi-field controls preserve sibling state. Finalization emits complete expanded, manually editable recipes using the shared serializer and loader.

**Phase 2:** owner-derived teaching metadata, bounded registry retrieval, clear-selection Laya skipping, lazy optional ambiguous selection, contract-derived output schemas, behavioral provider-schema probing, fresh focused stages and repairs, declared coverage evidence, useful bridge partial results, and unsupported zero-overlap requests. The request shares a 120-second deadline, six Apertus calls, at most one repair per stage/two total, one optional Laya question, one broader retrieval, and twelve authoring operations. Context excludes full recipe/topology/catalog dumps. Actual token usage is reported only when supplied. Recognized explicit numeric clauses are validated against effective authored values, including unit conversions and comparison identities; they do not select recipes or fill overrides.

**Phase 3:** canonical request/result API and browser validation; automatic home activation in the shared learner renderer; one recipe-session lifecycle; separate authored and interaction revisions; authored history; scoped authoring and runtime follow-ups; normal library persistence, export/import/reload, voluntary Remix and Try lesson; cancellation/supersession and stale-result rejection. A failed or unsupported request preserves the active lesson and prompt. Storage failure keeps the valid lesson playable and exposes download recovery. Diagnostics are gated and reflect the actual accepted session. Retired planner implementations and commands were physically deleted; compatibility readers and live exceptions are dependency-audited in [cleanup.md](cleanup.md).

## Verification

| Check | Result and limits |
| --- | --- |
| Original baseline `pnpm test` | Passed before replacement. |
| Final `pnpm test` | Passed: existing recipe/runtime/builder/gas contracts plus new generation transaction, transport, semantic, lifecycle, and architecture assertions. |
| `pnpm exec tsc --noEmit` | Passed. |
| `pnpm exec next build --webpack` | Passed compile, TypeScript, static route generation, and production traces. |
| Default `pnpm build` | Turbopack stalled at compile and was interrupted. A successful default-Turbopack build is not claimed. |
| Biome changed implementation and generation files | Passed across all 65 changed implementation, configuration, and verification files. |
| `test:generation:architecture` | Passed across 521 source/script files and 152 pure headless modules; import/CLI resolution, retired files, dependency boundaries, protected hashes, and unchanged scoped defaults verified. |
| `test:generation:browser` | All three scoped cases plus cancellation/stale/malformed/unsupported lifecycle and storage recovery passed using explicitly labelled deterministic API fixtures. Real learner controls, numeric oracles, complete export, and reload exercised. |
| `test:generation:ux` with `GENERATION_UX_ALLOW_FIXTURES=1` | 20 generated replay scenarios passed over 1440×900, 1280×900, 1024×600, 390×844, and 320×568; arithmetic also exercised both motion settings. Normal import, fields/actions, invalid input, reset, export/reload, optional builder Remix/Try lesson, and gas/arithmetic baselines checked. This is development replay evidence. |
| `scripts/verify-gas-experiment-browser.cjs` | Passed responsive gas controls, pressure response, fixed conditions, export, and remix. |
| `scripts/recipes/verify-browser.cjs` | Passed all eleven migrated lessons at desktop/phone/short viewports, seven activities at changed/maximum/invalid states, keyboard navigation, export, all seven remixes/Try lesson, and reduced motion. Actions outside the opening spatial viewport use the real keyboard-focus camera navigation before pointer interaction. |
| `git diff --check` | Passed. |

No mock inference result is labelled live. No live-model accuracy or actual deployed tokenizer/context fit has been established. Browser fixture errors are empty for the accepted cases; intentional request aborts are distinguished in lifecycle evidence.

## Development findings and fixes

| Finding | Severity/reproduction | Owner/fix | Verified rerun |
| --- | --- | --- | --- |
| Bridge SVG coordinate animation produced undefined-property console errors | High, render and inspect beam | Shared BeamVisual uses normal SVG geometry and animates opacity | Home fixture and bridge replay interactions |
| Arithmetic exact-value inputs inherited builder's smaller text rule | Medium, arithmetic task editor | Shared recipe stylesheet gives the activity input the correct specificity | Both motion modes and all five viewport profiles |
| Fixed shell chrome could obscure controls during keyboard navigation; native overflow scrolling moved the shell | High, compact viewport then focus a field outside the opening view | Shared SpatialBoard uses measured shell clearance, padded camera bounds, and camera focus navigation; workspace overflow clips at the working boundary | Full responsive replay and premade keyboard interactions |
| Compact embedded toolbar competed with the home header | Medium, home lesson at 390/320 pixels | Host measures its header/composer and reserves its navigation row | Responsive replay and premade mobile navigation checks |
| Gas camera toolbar covered Volume at 320 pixels | High, fresh narrow gas baseline | Shared host hides the compact camera row, retaining Find content and board panning | Gas dedicated regression and baseline geometry |
| Vertical/sidebar arrangement could overlap independent scopes | High, arrange two scopes using noncomparison templates | Shared arranger advances each scope by the actual occupied extent, preserving locks | Nonoverlap assertions for all three templates and locked-item preservation |
| Comparison output cards extended under the composer at a normal viewport | Medium, 1280×900 opening comparison | Shared arranger uses a compact comparison scene and retains larger narrow-screen scenes; all four readouts fit above navigation | Explicit opening-view readout visibility assertion at 1280/1440 pixels |
| Schema-valid output could lose explicit requested quantities | High, configure arithmetic with an incorrect starting number | Focused semantic validation triggers one fresh repair; effective defaults accept redundant-override omission | Contract fixtures for wrong values, defaults, and successful repair |

Raw development captures/traces remain in `/tmp/apertus-generation-development`; existing premade and gas captures are in `/tmp/apertus-recipe-captures` and `/tmp/apertus-gas`. The `development/` evidence folder contains concise browser summaries and selected inspected captures. Inspection covers representative development states; it is not complete Phase 5 visual signoff. At small viewports, the board keeps cards readable and uses panning, Find content, and keyboard focus to reach content outside the opening view; individual cards do not acquire internal scrollbars.

## Remaining acceptance work

Live and accepted-export UX runners reject existing evidence directories so retries preserve prior attempts and failures. Both CLI rejection paths were verified to stop before launching a browser or requesting inference. Explicitly labelled development fixture replays can reuse their temporary output.

Phase 4 requires running `test:generation:live` against the actual configured inference service, retaining all fifteen independent attempts, distinguishing first-attempt from repaired correctness, and measuring provider usage/context behavior. `GENERATION_RUNS=1` is only a smoke test.

Phase 5 requires replaying accepted live exports with `test:generation:ux`, inspecting every required state/capture, and recording final visual findings and signoff. The protected gas illustration uses its original smaller authored dimensions; its baseline scene-size threshold is distinct from full generated scene cards, while input/readability/occlusion checks remain enforced.

See [environment.json](environment.json), [cleanup.md](cleanup.md), [baseline.json](baseline.json), and [final-dependencies.json](final-dependencies.json) for environment and audit details.
