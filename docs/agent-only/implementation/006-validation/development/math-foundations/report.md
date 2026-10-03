# Agent A development verification

Date: 2026-10-03. Scope: ALG-001, LINE-001, PI-001 and the shared assembly foundation. Status: **development checks passed; integrated acceptance not run**.

## Deterministic and regression checks

| Check | Result | Coverage |
| --- | --- | --- |
| `pnpm test:assembly` | Passed | Exact rational equation operations, line and circle numerical oracles, two-line structure, instance isolation, target-correct diagnostics, schema/units/binding rejection, atomic rollback, reset, recipe round trip, and mocked fresh-planner contracts |
| `pnpm test` | Passed | Existing simulation, component ownership, lifecycle, rendering, integration, recipe, and twelve-premade-experiment regressions |
| `pnpm test:planner` | Passed | Selection, argument extraction, conflicts, repair, cancellation, capacity, atomic edits, and stale revisions |
| `pnpm test:creation` | Passed | Existing 005 creation contracts, numerical checks, repair, cancellation, and atomicity |
| `pnpm test:apertus` | Passed | Validation, routing, provider switching, capacity, timeout, and cancellation; local fixture required loopback permission |
| `pnpm exec tsc --noEmit` | Passed | TypeScript source check |
| `pnpm lint` | Passed | Biome checked 328 source files after task-owned generated output was removed |
| `pnpm exec next build --webpack` | Passed | Production compilation, TypeScript, page generation, and route output for `/`, `/experiments`, `/playground`, and both API routes |

The repository's default Turbopack build could not create an internal worker process because this execution environment rejects its local port bind. The equivalent Next.js webpack production build passed. This is an environment limitation, not a qualifying acceptance pass.

## Supplemental browser diagnostic

The repository Playwright CLI harness ran the three canonical prompts at 1440×900 and 390×844 with reduced motion. All six cases passed canonical defaults, compiled-provider identity, required follow-ups, independent expected results, invalid division rejection, undo/reset, direct controls, keyboard traversal, 44-pixel control height, page-width overflow checks, and page-error checks.

This run used deterministic mocked model responses and is therefore supplemental UI evidence only. It is not Playwright MCP evidence and does not establish fresh Apertus/Laya behavior. Screenshots and the verbose JSON report were inspected and then removed from `/private/tmp/apertus-006-agent-a-browser-20261003`; no raw browser artifacts remain in the repository.

## Acceptance state

ALG-001, LINE-001, and PI-001 remain **Implemented / unverified**. The fifteen-prompt integrated candidate has not been frozen, Agents B–E contributions are not integrated in this checkout, and neither qualifying full round has run. Consecutive qualifying pass count: 0.

## UX redesign verification — 2026-10-03

The three presentation adapters were redesigned after direct user review. TypeScript, Biome checks, the math-foundations deterministic suite, and a webpack production build passed. An official Playwright MCP development run used the live hybrid planner for the canonical prompts and required follow-ups at desktop and mobile widths; all three provider selections and numerical outcomes passed. Critical screenshot review then drove copy ownership, compact-circle, scroll-discoverability, and label-spacing fixes. The final circle branch was rerun through fresh live Apertus/Laya inference and passed at both viewports. See `ux-review.md` for the observed problems and resolutions.

This evidence does not change the catalog status or consecutive qualifying pass count. It covers the Agent A domain only and is not a complete round under plan 006.
