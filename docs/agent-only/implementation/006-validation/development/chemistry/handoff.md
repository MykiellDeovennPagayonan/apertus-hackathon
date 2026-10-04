# Agent C chemistry handoff

Original development handoff: 2026-10-03, 15:31 UTC. Superseded for integration and browser status by the live assessment below. Domain source/test SHA-256: `710850112f077ff64096f5e62eac8deed239ec84edb3ad09d812dde56b2a3664`. This fingerprints the ten chemistry source/test files, ordered by relative path with NUL separators between each path and content. It is not an integrated candidate fingerprint.

## Status and scope

| Prompt | Domain implementation | Integrated normal creation | Live rounds |
| --- | --- | --- | --- |
| DIL-001 | Implemented, development checks pass | Integrated; canonical MCP inspection passed at both sizes | Full-suite qualifying rounds not run |
| CHEM-001 | Implemented, development checks pass | Integrated; canonical MCP inspection passed at both sizes | Full-suite qualifying rounds not run |
| RATE-001 | Implemented, development checks pass | Integrated; canonical MCP inspection passed at both sizes | Full-suite qualifying rounds not run |

Proposal for catalog after integration: **Implemented / unverified**. Do not mark Working. Neither real Apertus nor real Laya was called in these checks; model configuration and live provenance are unmeasured. The initial session tool list exposed no Playwright MCP tools. Subsequent work discovered and ran the locally installed official Playwright MCP server through the MCP SDK; see live assessment. Full fifteen-case freeze and two-round integration acceptance remain pending; robustness failures and their fixes are recorded in the live assessment. No broad build, global formatting, shared-file editing, service restart, or changes to Agent B's namespace were performed.

## Concrete integration requests — Agent A only

1. In `src/web/src/simulations/runtime/assembly.ts`, import `{ chemistry } from "../domains/chemistry"` and include it in the explicit `domainContributions` list. Add the three concrete presentation contracts: `"chemistry-dilution": true`, `"chemistry-conservation": true`, `"chemistry-rate": true`. Register only together with step 2; the isolated development registry is not application integration.
2. In the shared `components/views/math-foundations/AssemblyView.tsx`, import `ChemistryLesson` from `../chemistry/ChemistryLesson`. For each chemistry instance, render:

   ```tsx
   <ChemistryLesson
     key={`${instance.id}:${resetCount}`}
     instance={instance}
     dispatch={(command) => dispatchCommand("assembly", command)}
   />
   ```

   Read `resetCount` from the assembly store. The key clears local form drafts and feedback on reset. Route using `instance.provider.startsWith("prefabs/chemistry/")` or the registered chemistry presentation IDs. Give chemistry its own introduction instead of the existing default circle explanation. Support mixed chemistry instances without hiding another domain's scene. ChemistryLesson renders the actual registered adapters and assumptions; it creates no timers or secondary clock.
3. Assembly capability and action advertisement is already registry-derived; no English prompt branches, premade catalog cards, copied model responses, or hardcoded creation recipes are needed. Verify real Laya selection sees these provider descriptions after registration. `parseConfiguration` already supports the registered provider schemas in isolated development checks. Array coefficient commands use `{ value: [2,1,2] }`, not three invented command arguments.
4. The rate scene draws authoritative `points`, `productPoints` and `comparisonPoints`. Its graph's horizontal unit is **seconds** and vertical unit is **mol/L**. Preserve these axis labels if sharing a graph adapter; do not use the math line view or its rise/run assumptions for RATE-001. The compiler's generic `graphOutput` is `points`; a secondary generic graph is optional because the chemistry scene already supplies the required curves.
5. Run the normal exact creation/follow-up cases at both required viewports with fresh Apertus and Laya. Inspect paused initialization, reduced-motion stepping, reset remount, invalid commands and mixed/independent instances. Coordinate the shared browser/service lease before use. Update shared catalog only with actual integrated evidence.

## Provider contracts (all version 1)

The entrypoint `src/web/src/simulations/domains/chemistry/index.ts` exports `chemistry` plus individual `dilution`, `conservation` and `reactionRate` DomainModels through the frozen contribution interface. Importing these never mutates global registration. Dilution and rate permit up to four independent instances within the shared four-instance assembly limit. Conservation uses one editable equation; the registered carbon-dioxide reaction provides a different molecule structure. Object-local state is typed in `components/traits/chemistry/ChemistryState.ts`. Shared immutable resources contain defaults and parsed species definitions. The model initializer is the prefab factory under the frozen interface; systems own edits, measurements and time advancement. Visuals only format/illustrate outputs, controls only dispatch commands.

| Provider | Default configuration | Outputs / units | Follow-up command |
| --- | --- | --- | --- |
| `prefabs/chemistry/Dilution` | saltMass=10 g; volume=1 L | saltMass g, volume L, concentration g/L | `CHEM_ADD_WATER`, value in L |
| `prefabs/chemistry/Conservation` | reactionId=`water`; coefficients=[1,1,1] | equation/balanced dimensionless, atoms in atoms, molecules in molecules | `CHEM_BALANCE` without value; `CHEM_SET_COEFFICIENTS` with integer array |
| `prefabs/chemistry/ReactionRate` | A₀=1 mol/L; T=300 K; k300=0.1 s⁻¹; Ea=40000 J/mol; duration=30 s | temperature K, rate s⁻¹, half-life/time s, concentrations mol/L, curve arrays `{x: seconds, y: mol/L}`, playing boolean | `CHEM_SET_TEMPERATURE`, value in K; `CHEM_RESTART_RATE`; `CHEM_SET_RATE_PLAYING`, boolean; `CHEM_STEP_RATE` |

Dilution: salt 0–1000 g; total volume 0.001–1000 L; each added amount 0.001–1000 L and total still bounded. No evaporation/reaction/solubility solver; initial salt is already dissolved. Nonpositive volume, unrecognized parameters/units and nonfinite values are rejected. Configuration updates preserve solute mass; reset restores accepted initial parameters.

Conservation: registered `water` and `carbonDioxide` species only; three positive integer coefficients 1–12. Unbalanced states remain editable. The trusted finite search finds a minimum-sum positive balance, which gives lowest integer coefficients for these registered reactions. No arbitrary chemistry parsing, stoichiometric feasibility, energy or reaction dynamics. Formulas/atom resources remain immutable.

Rate: T=250–400 K; A₀=0.001–100 mol/L; k300=0.0001–10 s⁻¹; Ea=0–100000 J/mol; duration=0.1–10000 s. Analytic first-order, fixed-temperature runs; R=8.314 J/(mol·K). A temperature edit restarts elapsed time at zero and retains the immediately previous temperature for a labeled, equal-time comparison. Concentration and all chart samples come from the system. Initial state is paused. Play/pause are per instance, evaluated by the shared runtime clock. Step advances a paused instance by one second; stepping while playing is rejected. At the horizon the run pauses. Restart uses current parameters; reset uses the accepted initial recipe. No timers, render-driven concentration solver or accumulated ambiguous temperature history.

## Development verification

Run from `src/web`:

```sh
node scripts/domains/chemistry/verify.cjs
pnpm exec tsc --noEmit --strict --incremental false --skipLibCheck --target es2022 --module commonjs --moduleResolution node --jsx react-jsx --esModuleInterop src/simulations/domains/chemistry/index.ts src/simulations/components/views/chemistry/ChemistryLesson.tsx
pnpm exec biome check src/simulations/domains/chemistry src/simulations/components/resources/chemistry src/simulations/components/traits/chemistry src/simulations/components/systems/chemistry src/simulations/components/visuals/chemistry src/simulations/components/controls/chemistry src/simulations/components/views/chemistry scripts/domains/chemistry
```

All three passed after integration. Shared planner edits and the original math assembly development checks also passed; rerun on the final integrated candidate. Type checking is scoped and does not write incremental/build artifacts. After integration, the development loader uses the actual application registry without substitution. Static render dispatch remains a development stub and never enters live checks. Test render dispatch is a development stub; static markup is not browser interaction or final acceptance evidence.

Checked: dilution 10→5 g/L with 10 g conserved; zero-solute variant; invalid input and unit rejection; initial unbalanced atom table; 2,1,2 water balance with H=4 and O=2 on each side; reduction of 4,2,4; coefficient-only edits; second parsed reaction; first-order concentrations; Arrhenius/half-life independent numeric oracles; A+B conservation; parameter extremes; paused/played/stepped/horizon lifecycle; equal-time frame partition invariance; two separately configured rate instances; atomic batch rollback; accepted-configuration reset; saved recipe reload; compact planner schema assembly and graph selection; semantic render controls, labels and assumptions.

Numeric tolerance: absolute 1e-9 plus relative 1e-6. Independent 50-digit Python Decimal oracle gives k320=0.27246102624060919612454270146322726140907596945617 s⁻¹ and half-life320=2.5440232319606325076857902760699694944549791424388 s; these are constants in tests, not expected values calculated through the production solver. Default k300=0.1 and half-life300≈6.931471805599453 s.

Proposed fixed browser robustness set (not run): DIL “What happens to salt water when I add two litres of water?”; CHEM “Help me see why chemical equatons need balancing.”; RATE “Why do reactions happen faster when it's warmer?”. Structural variant: “Compare this reaction at 300 and 320 kelvin using two separate runs.” Development fixture verifies changed instance count and independent temperature edits; real model structural selection remains unverified.

Remaining gates: shared integration, real-model exact prompts/follow-ups, mobile/desktop interaction and visual inspection, measured feedback budgets and UX review, full unchanged-candidate two-round suite. No numerical/UI acceptance claim beyond the stated development checks.


## Subsequent user-directed integration and real browser work

The user explicitly requested running and satisfying the browser protocol. The required registry/view wiring was applied, preserving Agent B edits. The shared planner now normalizes exact registered observation-name prefixes before `:` or `=`, provides explicit registry/schema constraints to fresh Apertus calls, and excludes invented before/after examples from structural selection. Registered parameterless commands may omit their argument object; only the uniquely valid `{}` is normalized, with actions and targets still validated. Follow-up context now contains bounded edit summaries; full molecular geometry and curve datasets stay in runtime diagnostics. The shared math test fixture selects a graph for every graph-capable registered model instead of assuming only math lines have graph outputs.

Actual Playwright MCP 0.0.83 is available at a local temporary dependency installation; the domain MCP script uses SDK `tools/list` discovery and `tools/call`, with isolated named sessions. No application or model requests are intercepted or replayed. Six canonical cases passed in development attempt004: all three exact prompts and follow-ups at 1440×900 and 390×844. This was not a complete frozen fifteen-prompt round. Fixed variant work and remaining gates are documented in `live-assessment.md`.


## Latest Agent C handoff — 2026-10-04

This supersedes the earlier unverified integration/model/variant status above. DIL-001, CHEM-001 and RATE-001 now pass exact normal creation and required follow-ups using fresh real Apertus and Laya through official Playwright MCP at 1440×900 and 390×844. The fixed typo/punctuation, registered carbon-dioxide and two-independent-rate-run variants also pass: sixteen cases on source fingerprint `a523c2373aaa9cf244a6d46181d290309e5551b17159013161bfc0da2e337957`, with unchanged MCP script/protocol. Final current working source matches that fingerprint.

Focused fixes address nested model-authored creation JSON, parameterless balance edits, registry descriptions/defaults, boolean observation names and bounded unique intent-reference normalization. Schemas, executable provider validation, confidence gates and numerical systems remain enforced. Concurrent Agent B changes were preserved; testing used a separate application snapshot/build. Numerical, controls, lifecycle, invalid/unsupported edits, cancellation, assumptions and responsive checks passed. Full TypeScript, chemistry, math/creation and transport development regressions passed.

See [complete analyzed report](live-20261004/report.md) and its four final compact evidence reports for provenance, measured performance, numerical audits, historical failures and cleanup. Raw browser data and the isolated app/dependencies were analyzed and removed. Minor layout/title polish is recorded in the UX review; Agent A signoff remains pending.

Catalog proposal to Agent A: retain **Implemented / unverified for full-suite acceptance**, with successful Agent C live domain verification linked as evidence. Do not mark Working (2/2). Both complete fifteen-prompt qualifying rounds remain Not run; the consecutive integrated-pass count is zero. Agent A owns final integrated regression, UX signoff and catalog updates.
