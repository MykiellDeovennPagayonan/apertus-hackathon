# 018 — Safe component cleanup with AI composition compatibility

Date: 2026-10-09  
Status: Implemented; core acceptance passed, broader browser limitations recorded.  
Scope: `src/web/src/simulations/components/` and narrowly required verification.  
Purpose: Fix the component review findings while preserving AI generation, manual authoring, runtime execution, and saved experiments.

This plan follows the shared component architecture and the generation work in [015](015-TOOL-BASED-SIMULATION-GENERATION.md) and [016](016-AGENTIC-COMPONENT-COMPOSITION-AND-OLLAMA.md). It does not extend the premade migration in [013](013-PREMADE-JSON-RECIPE-CONVENTION.md) or replace existing generation infrastructure. Older plans describe historical states; inspect current code before implementation.

## 1. Safety strategy

Keep the public component vocabulary and serialized formats stable. Improve implementations behind those contracts through small, independently reviewable changes. Separate behavior corrections from structural refactors so a failure can be attributed and reverted without undoing unrelated work.

No plan can guarantee zero regressions. Completion requires evidence that existing compositions still validate, execute, render, and round-trip, and that each intended correction behaves as specified. Passing static checks alone is insufficient.

The protected flow is:

```text
User intent
  -> planner catalog and component bucket
  -> model tool response and format fixer
  -> validated authoring transaction
  -> recipe finalization and loading
  -> DocumentRuntime
  -> RecipeLesson and component presentation
  -> commands, outputs, capture, save/reopen
```

Current owners include `lib/planner/{catalog,bucket,compose,formatFixer}.ts`, `runtime/authoring/{operations,transaction,runnable}.ts`, `runtime/recipes/`, and `components/views/RecipeLesson.tsx`. Reuse these owners; do not introduce another catalog, loader, composition protocol, or execution path.

## 2. Protected contracts

The following MUST remain stable throughout this cleanup:

- Public definition IDs and versions; existing exports required by production, tests, or compatibility entry points.
- Configuration schemas, defaults, ranges, units, optional fields, and reference paths.
- Input/output port names, kinds, cardinality, scope rules, and attachment compatibility.
- Command names, argument schemas, submission timing, and accepted/rejected result semantics.
- Recipe identities, dependencies, exposed parameters, serialization versions, and supported historical readers.
- Planner tool envelopes, allowed operations, retrieval metadata and ranking, teaching concepts, coverage honesty, and provider selection.
- Model equations, state/output shapes, stepping order, reset semantics, independent-instance behavior, and atomic rejection.
- Existing lesson structure, accessible names, CSS hooks, draft preservation, selection, drag behavior, and keyboard interaction, except explicitly documented corrections below.

Appearance lifecycle metadata is the one planned contract correction: remove fields inherited from an unrelated control when those fields do not belong to the appearance. Investigate consumers first and record the exact permitted diff. If it affects planner cards, saved documents, or executable behavior beyond this correction, defer it into a separately designed compatibility change.

Do not modify prompts, transport, model settings, generation budgets, or unrelated work already present in the working tree. Do not overwrite or revert existing user changes.

## 3. Review evidence and limitations

The initial review found:

| Finding | Evidence | Implementation risk |
| --- | --- | --- |
| Central presentation file has many responsibilities | `RecipeLesson.tsx` was 1,869 lines; `NodeView` combined controls, appearances, and displays | Moderate: hook ordering, context identity, remounts, and clock ownership |
| Appearance definitions inherit control lifecycle fields | `catalog/index.ts` spreads `genericDefinitions[0]`; `appearance/physical-pendulum` had an empty configuration but lifecycle fields `label`, `mode`, `initial` | Low–moderate: catalog consumers and mutable references |
| Readout/inspector repeat lookup, unit handling, and bridge hints | Repeated branches in `RecipeLesson.tsx` | Low–moderate: domain-specific labels and fallback behavior |
| Numeric drafts can obscure external accepted values | Isolated hook harness: accepted typed `6`, then supplied value `2`, still rendered `6` | Moderate: preserving unfinished input and explicit-submit forms |
| Natural control reports acceptance unconditionally | `NaturalCommand` returns `void`; `NumberControl` returns `{ accepted: true }` | Low: propagate the actual result; compatibility consumer audit needed |
| Slider interaction logic overlaps | `ParameterSlider` and `NumberField` slider mode | Moderate: validation, presentation, and feedback differences |
| Snapshot narrowing relies on assertions | Multiple `as unknown as` conversions in presentation | Low–moderate: avoid changing runtime representation |
| Mechanical cleanup remains | Scoped Biome check reported 10 formatting/import-order errors across 268 checked files | Very low |

Architecture, public catalog, controls, recipes, and TypeScript checks passed during review. Browser checks, the full suite, and production build were not run. The hook harness establishes a synchronization scenario, not a complete browser defect. No in-repo callers were found for some older control exports; that alone does not authorize deletion.

## 4. Phase 0 — Establish compatibility evidence

1. Record current working-tree changes and the source revision. Preserve unrelated work.
2. Inspect the planner's actual catalog/card projection and bucket construction. Record the public fields it reads, rather than assuming the entire definition is model-visible.
3. Capture canonical, deterministic before/after comparisons of public contracts and planner cards. Include IDs, schemas, defaults, ports, commands, lifecycle, discovery/teaching metadata, and provider references. Normalize object-key order; preserve meaningful array order. Store baseline evidence or focused fixtures outside the premade tree.
4. Choose existing generation fixtures covering recipe insertion and open primitive composition, numeric controls, observations, comparison instances, attachments, and negative cases. Extend only where a reviewed change exposes a missing behavioral assertion.
5. Establish the baseline for focused component checks, generation checks, type checking, and relevant browser fixtures. Record existing failures separately; never weaken assertions to make cleanup pass.

Gate: Every proposed change has a named consumer, a defined intended difference, and a verification route. If baseline failures prevent a reliable comparison, resolve or isolate that uncertainty before changing the affected behavior.

## 5. Phase 1 — Mechanical cleanup and command-result correction

- Apply formatting/import-order fixes only within the reviewed component scope. Inspect the diff for accidental functional changes.
- Audit `NaturalCommand` consumers, including indirect imports and compatibility entry points.
- If retained, return `ActionResult` from `naturalCommand` and propagate it through the form. Preserve reporting behavior and ensure rejection does not show successful submission or mutate accepted state.
- Leave compatibility modules in place during the first pass. Remove nothing merely because a text search found no direct callers.

Gate: Scoped Biome, TypeScript, component controls, and a focused accepted/rejected command test pass. Public contracts and planner projections have no differences.

## 6. Phase 2 — Make appearance construction explicit

- Replace the positional `genericDefinitions[0]` dependency with an explicit appearance factory or complete definition construction.
- Preserve identity, version, title, description, category, tags, configuration/defaults, ports, commands, placement, assumptions, and provider selection.
- Define appearance lifecycle metadata from its actual configuration. Check every generated appearance, not only the pendulum example.
- Inspect shared nested references. Avoid changing imported schemas or other definitions through incidental mutation. Do not combine this work with wholesale catalog freezing or registration redesign.
- Keep intentional catalog initialization patches unchanged until their dependencies are understood; tackle them individually if necessary.

Gate: Contract comparison differs only in the explicitly permitted appearance lifecycle correction. Planner card/bucket comparisons remain identical. All built-in recipes, attachments, reset/capture behavior, and generation contract/open-composition checks pass.

## 7. Phase 3 — Define and fix numeric editing behavior

Agree on these semantics through code inspection and existing interaction requirements before implementation:

- Incomplete or rejected text remains editable and never changes authoritative model state.
- Successfully accepted immediate input follows subsequent authoritative updates; its local formatting must not hide a reset or another control's accepted change.
- Explicit-submit forms retain unfinished drafts when the activity changes. Preserve the existing changed-activity notice and discard behavior.
- Escape restores the current accepted value and clears appropriate feedback. Enter/blur preserve existing submission timing and rejection recovery.
- A synchronization update must not submit another command, create a feedback loop, drop focus on each keystroke, or invalidate sibling fields.

Implement the smallest state change that distinguishes unfinished drafts from accepted input. If an external reset must discard a draft, use an explicit reset signal or established form revision policy rather than guessing from every value change. Avoid forcing remounts through `key={value}`.

Gate: Real browser checks exercise incomplete decimals, valid typing, rejection, external value changes, reset, range/exact-input synchronization, Escape/Enter/blur, explicit-submit forms, and drafts retained across tabs. Verify model state and command acceptance as well as visible text. Include an AI fixture that generates the same control and executes it through the shared runtime.

## 8. Phase 4 — Extract presentation responsibilities

Move one responsibility at a time, preserving the existing `RecipeLesson` public entry point:

1. Extract pure display helpers for source lookup, useful units, and bridge-selection hints, preserving any intentional readout/inspector label differences.
2. Extract display rendering, then control rendering, then domain appearance adapters into focused presentation modules.
3. Move shared contexts into one stable module if needed; all consumers must use the same context objects. Avoid circular imports back through `RecipeLesson`.
4. Extract layout rendering only after the earlier moves pass. Preserve mounted tab panels, recursion, disabled/inert behavior, authoring callbacks, and board integration.
5. Keep runtime creation and clock ownership unchanged during extraction. Do not move stepping into individual views. Preserve cancellation on unmount and the supplied-runtime path.

Do not introduce a plugin framework or one-file-per-branch hierarchy solely to reduce line count. Use modules with coherent responsibilities. Preserve dynamic loading boundaries for Three.js and other heavy presentation providers.

Gate after each extraction: Contract/card comparisons are unchanged; component and generation fixtures pass; browser behavior, screenshots at fixed conditions, and production build show no unintended differences. Verify that two views do not advance time twice and presentation edits do not reset model state.

## 9. Phase 5 — Consolidate slider behavior and improve types

- Identify the actual behavioral differences between `ParameterSlider` and `NumberField` slider mode. Share only compatible validation/interaction behavior and keep existing wrapper APIs, accessible names, markup/CSS hooks, value formatting, and feedback.
- Check minimum/maximum boundaries, integer/fractional steps, rejected commands, exact input, disabled states, and external updates. Keep draft policy established in Phase 3.
- Introduce typed presentation adapters or existing discriminated state types around known providers. Replace unsafe assertions incrementally without changing serialized state, runtime snapshot shapes, or model calculations.
- Keep meaningful domain wrappers such as `HistogramView` and `ResultsTableView`; their small size is not a defect.

Gate: Control behavior and display compatibility pass, TypeScript passes, and public contracts/planner projections remain identical. No abstractions may infer new AI capabilities or change output availability.

## 10. Optional retirement of compatibility exports

This is a separate final step, not required to obtain the core cleanup benefits. Before removing any export, inspect static/dynamic imports, barrels, provider registries, route/session adapters, serialized identifiers, historical readers, and compatibility fixtures. Keep a reader or adapter whenever supported consumers require it. Preserve old public imports through thin wrappers where appropriate.

Defer deletion when evidence is incomplete. Update component documentation to distinguish active implementations from compatibility entry points. Do not expand this cleanup into the separate Gas/Town premade migration.

## 11. Verification and rollback

Run commands from `src/web`. Reconfirm script names against the current `package.json` before use.

Focused checks, selected for the phase:

```sh
pnpm test:architecture
pnpm test:public-catalog
pnpm test:controls
pnpm test:recipes
pnpm test:generation:contract
pnpm test:generation:architecture
pnpm test:generation:faults
pnpm test:generation:open
pnpm exec tsc --noEmit --incremental false
pnpm exec biome check src/simulations/components
```

Browser gates for affected paths:

```sh
pnpm test:components:browser
pnpm test:controls:browser
pnpm test:generation:browser
pnpm test:public-catalog:browser
pnpm test:builder:parity:browser
pnpm test:recipes:browser
```

Follow each script's fixture/server setup. Browser fixture generation MUST use the production validators, transaction, loader, runtime, and presentation. Mock model responses at the transport boundary where appropriate; do not mock successful runtime acceptance or replace actual components. Include rejected operations, independent instances, save/reopen, and preservation of the active experiment after failed activation.

At completion run `pnpm test` and the production build. If the normal build stalls and the documented environment-specific fallback is needed, run `pnpm exec next build --webpack` and record that limitation. Re-run broader checks only after new changes or unresolved failures justify it.

Live AI generation is a supplemental smoke test if the existing configured provider is available. Keep provider/model/settings unchanged; never silently substitute a model. A live pass alone cannot prove compatibility, and unavailable live inference must be recorded as unverified. Deterministic replay isolates application compatibility; live inference adds confidence that the configured model still uses the preserved contracts.

Stop advancing a phase on unexpected contract/card differences, altered command acceptance, model-state differences, reset/draft regressions, duplicate stepping, broken loading boundaries, or changed save/reopen behavior. Isolate or revert only that phase's edits while preserving unrelated working-tree changes. Do not use a repository-wide reset.

## 12. Completion checklist

- [x] Baseline contract/card evidence and relevant failures recorded.
- [x] Mechanical cleanup complete for changed sources; protected Gas import ordering retained.
- [x] Retained natural controls propagate real acceptance.
- [x] Appearance construction explicit; only documented metadata correction present.
- [x] Numeric editing policy implemented and browser-verified.
- [x] Presentation responsibilities extracted with stable contexts and runtime ownership.
- [x] Compatible slider behavior shared; wrapper behavior preserved.
- [x] Known snapshot types narrowed without serialized-format changes.
- [x] Required compatibility exports retained; no compatibility deletions performed.
- [x] AI fixture replay validates, activates, interacts, rejects invalid actions, and round-trips.
- [x] Focused checks, final full suite, browser gate outcomes, and production build recorded.
- [x] Live inference availability limitation recorded honestly.
- [x] Final diff contains no unintended planner, prompt, provider, recipe, or public-contract changes.

Implementation evidence: [018-validation/implementation-report.md](018-validation/implementation-report.md). The full suite, TypeScript, changed-source Biome checks, numeric browser regression, deterministic AI browser fixtures, and webpack production build pass. Several older browser suites remain limited by stale builder expectations or existing failures; their results are recorded separately. Live inference is unverified because the configured local server is unreachable.

Keep subsequent implementation evidence under `018-validation/`: changed files, intended differences, contract comparisons, commands/results, browser observations, unresolved limitations, and deferred compatibility work. Do not interpret the recorded browser limitations as passing acceptance.
