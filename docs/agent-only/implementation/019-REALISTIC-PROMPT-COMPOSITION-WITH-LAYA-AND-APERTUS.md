# 019 — Realistic prompt composition with live Laya and Apertus

Date: 2026-10-09
Status: Implemented and validated on 2026-10-09. Original real-model acceptance: 25/25 passed; original native export replay: 10/10 passed. See [implementation evidence](019-IMPLEMENTATION-EVIDENCE.md). The subsequent control, layout and nonlinear pendulum revision is documented separately in [UX review](020-SIMULATION-UX-REVIEW.md).

## 1. Outcome and scope

Make the five requests below work through the normal prompt UI using actual Laya decision inference and actual Apertus authoring inference. Produce interactive, validated component graphs through the existing shared runtime and builder. Treat short, incomplete, conversational, and detailed requests as normal input.

| Case | Exact acceptance prompt | Required learner experience |
| --- | --- | --- |
| P1 | `pendulum sim` | A useful pendulum experiment with length/amplitude exploration, playback, period measurement, and visible assumptions. |
| P2 | `why does traffic stop when theres no accident` | An interactive traffic experiment showing how a small disturbance can propagate without an accident; compare an undisturbed run with a disturbed run. |
| P3 | `Build a circuit where I can add bulbs and switch between series and parallel. Show what happens to their brightness.` | Change bulb count and topology; inspect per-bulb power and its relationship to displayed brightness. |
| P4 | `I’m teaching eclipses tomorrow. Can you make something students can move around to see when an eclipse happens?` | Move relevant celestial bodies within supported geometry and distinguish solar/lunar eclipse alignments from non-eclipse configurations. |
| P5 | `something with sound waves? like noise cancelling headphones, let me try it` | Manipulate two sound signals, compare their sum, and observe cancellation/reinforcement with phase and amplitude controls. |

**Correction to the original suggestions:** pendulum, circuit, and traffic models already exist. Do not present them as new domains or replace them. The work is inference-driven composition and necessary capability gaps, particularly eclipse geometry and wave superposition. A terse prompt can reasonably produce a composition using existing defaults; do not add gratuitous features merely to make it look novel. The explicit user requirement for reuse takes priority over creating a bespoke experiment per prompt.

This plan supersedes 016's instruction to skip Laya for this scope. Use the current implementation as the baseline, not historical claims in 015/016 that open composition is absent. Preserve existing premades, saved recipes, public identifiers, and unrelated working-tree changes.

## 2. Architecture and code quality requirements

- **Reuse first:** audit catalog definitions, providers, controls, views, graphs, clocks, connections, and recipes before adding a component. For every proposed addition record the closest existing candidate, the missing behavior, why configuration/composition cannot supply it, and the smallest reusable contract that closes the gap.
- **SOLID:** model calculations, state transitions, rendering, catalog metadata, retrieval, inference transport, and orchestration have separate responsibilities. Extend registries/providers through established contracts; substitute implementations without changing callers. Keep control/display ports narrow. Inject decision and authoring dependencies through existing seams so tests can isolate faults while live tests use real services.
- **Clean code:** use explicit domain types and units, pure calculations where possible, named validation functions, cohesive modules, clear errors, and bounded state. Avoid unsafe casts, hidden mutations, circular imports, repeated prompt-specific branches, and abstractions created only to reduce line count. Apply DRY to shared behavior without coupling unrelated domains. Read `src/web/AGENTS.md` and relevant installed Next.js documentation before changing web code.
- **No monoliths:** do not create `PendulumPromptExperiment`, `TrafficPromptExperiment`, or equivalent complete React components for each prompt. Compose model instances, appearances, controls, observations, and canvases through typed links. A domain calculation model is acceptable when cohesive; an all-in-one model/control/renderer/persistence component is not.
- **ACID:** reuse `AuthoringTransaction` and existing persistence boundaries. Atomicity means failed tool batches and final validation cannot partially replace the active lesson. Consistency means schemas, units, topology, bindings, and coverage hold before publication to runtime. Isolation means concurrent/superseded requests cannot mutate another request's draft, and stale saved revisions are rejected. Durability means a successfully saved accepted recipe survives reload; a persistence failure is visibly unsaved and offers the existing recovery route. In-memory drafts alone are not durable or a substitute for a database transaction.
- **Deterministic runtime:** LLMs assemble and configure; application code owns physics, IDs, scheduling, graph validation, and persistence. Renderers do not calculate authoritative physics or advance their own clocks. Multiple appearances must not double-step the same model.
- **Compatibility:** version genuinely changed contracts and preserve supported imports/serialization readers. Use the same catalog/runtime pathways in generated and manually built lessons. No secret simulation path available only to the prompt UI.

## 3. Baseline and reuse audit

Inspect these existing owners before making changes:

| Responsibility | Existing locations under `src/web/src/` |
| --- | --- |
| Generation and composition | `lib/planner/{index,compose,bucket,turnSchema,formatFixer,coverage,budget,diagnostics}.ts` |
| Decision provider and selection | `lib/decisions/{contracts,config,factory}.ts`, `lib/decisions/providers/laya.ts`, `lib/planner/selection/*` |
| Catalog contracts/discovery | `simulations/components/catalog/{index,discovery,teaching,authoring,generic,spatial}.ts` and component registry |
| Existing domain calculations | `simulations/components/systems/physical-systems/models.ts`, `simulations/components/systems/dynamic-systems/models.ts` |
| Draft execution and graph validity | `simulations/runtime/authoring/{transaction,operations,connections,bindings,runnable,providers,runtime,validate}.ts` |
| Shared presentation | `simulations/components/views/recipe/{NodeView,RecipeAppearance,ControlPresentation,DisplayPresentation,CanvasPresentation,RecipeLayout}.tsx` |
| Recipe persistence/session | `simulations/runtime/recipes/*`, `simulations/runtime/recipeSession.ts`, current project/library APIs |

1. Record revision, working-tree state, applicable repository instructions, and baseline failures.
2. Export catalog identities, configuration schemas, ports/units, commands, output fidelity, and appearance attachments. Inspect executable providers rather than trusting titles or retrieval keywords.
3. Record a graph sketch and reuse/gap ledger for each case. Distinguish existing capability, metadata/retrieval omission, missing wiring, missing output, and missing domain physics.
4. Confirm existing open-composition behavior and actual budget limits. At review time composition uses up to 14 LLM calls, 10 turns, 3 repairs, and one decision call; the default deadline is 120 seconds. Do not rely on outdated README limits.

Gate: no new component starts implementation without a concrete gap and a contract-level reuse assessment.

## 4. Real Laya and Apertus inference

### 4.1 Shared orchestration

Use this sequence for these cases:

1. Apertus interprets the original request into teaching intent, preserving explicit constraints and separating inferred defaults from user requirements.
2. Application retrieval supplies a bounded set of relevant primitive and composite cards from the public catalog, including dependencies needed to make the graph runnable.
3. **Laya performs one meaningful bounded selection** among supported composition strategies/capabilities, with an `unclear`/no-fit option and real criteria derived from catalog contracts. For an otherwise obvious prompt, this can choose between viable exploration/comparison strategies. Do not call Laya for a dummy yes/no solely to inflate traces.
4. Apertus authors the selected strategy using narrowed tool schemas: insert/reuse instances, configure, connect typed ports, add controls/observations, and arrange the shared board.
5. Application code validates each operation, supplies execution receipts, checks coverage and graph runnability, finalizes headlessly, then atomically activates and saves through normal pathways.

The existing recipe-slug selection contract is insufficient if strategies are open component graphs: introduce a narrowly typed strategy selection adapter through the decision provider seam, rather than pretending a strategy is a premade slug. Reuse probability/confidence checks, transport, cancellation, and diagnostics. A selected strategy constrains goals and available capabilities; it must not carry a hardcoded full graph for a known prompt.

For this feature expose a validated server-side policy requiring Laya selection even when the current hybrid branch would skip it. Name and document the new policy setting when implemented; do not claim `PLANNER_MODE=hybrid` alone guarantees a call. Keep other generation paths compatible. Do not string-match the five exact prompts to bypass inference, inject prebuilt acceptance recipes, or silently switch to Jev/OpenAI/Anthropic.

Laya errors, rejected confidence, budget exhaustion, or no-fit results must preserve the active lesson and report an actionable result. Required-Laya mode must not silently succeed through an Apertus-only fallback. Low-confidence ambiguous requests can request clarification; ordinary missing optional quantities use documented defaults. A timeout is a failed attempt, not permission to inject a fixture.

### 4.2 Local services and proof

Preferred Apple Silicon setup uses `src/inference`'s separate MLX environments. Configure server-only local settings with `LLM_PROVIDER=apertus`, `APERTUS_PROVIDER=local`, `APERTUS_LOCAL_RUNTIME=mlx`, the verified Apertus model and local endpoint, `DECISION_PROVIDER=laya`, `LAYA_BASE_URL=http://127.0.0.1:43102`, and hybrid plus the implemented required-Laya policy. Preserve a verified existing Apertus/Ollama setup if selected for deployment; it must still run an actual Apertus model. Never substitute another model under its name.

Use separate terminals for `make -C src/inference setup`, `setup-laya`, `make run-apertus`, `make run-laya`, and `make run-web`; confirm root Makefile targets before use. Run `make -C src/inference smoke` and `smoke-laya`. Verify model identity, context capacity, output schema support, readiness, and measured latency. Never print environment secrets.

Extend local diagnostics to correlate request ID, Apertus stages/tool calls, Laya strategy candidates/answer/acceptance, actual provider/model, duration, usage when available, retries, execution receipts, graph, coverage, and final result. Retain service-level correlation when necessary to establish actual inference. Every accepted live attempt must show a successful real Laya decision and successful real Apertus authoring, not merely enabled configuration. Missing usage is unknown, not zero. Keep diagnostics disabled in production.

Gate: a real prompt reaches both services and creates a runtime-valid draft within declared limits. Measure before changing budgets; keep explicit caps and document any justified change.

## 5. Component compositions and domain gaps

Each row is a composition target, not a new all-in-one component. Resolve exact registered IDs during the audit; use no invented IDs in model-facing schemas.

| Case | Reuse and link | Add only if audit proves a gap | Behavioral oracle |
| --- | --- | --- | --- |
| P1 | Existing physical pendulum instance → existing appearance, length/amplitude controls, playback, period readout and graph; optional second independent instance for comparison. | Teaching/discovery metadata or missing adapter only. The original model used small-angle motion. The UX revision extends the existing provider to nonlinear ideal motion, with unchanged public identifiers. | `T = 4√(L/g)K(sin(A/2))`; quadrupling length doubles period at fixed amplitude and gravity. Release angles span 0–90 degrees. Verify period by independent quadrature and motion by an independent ODE solver; keep a fixed visual metre scale when changing length. |
| P2 | Existing ring-traffic model → traffic appearance, vehicle/density controls, playback, speed/headway observations; paired independent baseline/disturbance instances if supported. | A bounded disturbance command and needed observable dataset if the current model cannot represent or display propagation. Extend the existing traffic system rather than replacing it. | Deterministic seed/state; vehicle ordering and nonnegative safe gaps; disturbance affects following vehicles over time. Choose a validated congestion regime; do not claim every parameter setting jams. |
| P3 | Existing physical circuit model → topology/bulb-count/voltage/resistance controls, circuit appearance and per-bulb observations. | Per-bulb power output or a reusable appearance brightness adapter if missing. | For identical resistance `R`, ideal source `V`, and `n` bulbs: series per-bulb power `V²/(n²R)`, parallel `V²/R`; respect supported bounds. Brightness is an educational power proxy, not photometric accuracy. |
| P4 | Shared canvas, spatial controls, appearance attachments, observations, and existing transform/geometry helpers where applicable. | Small reusable celestial position/geometry and eclipse alignment/shadow calculation units plus focused appearance adapters. Separate state/configuration, pure geometry, commands, and rendering. | Aligned Sun–Moon–Earth gives solar alignment; Sun–Earth–Moon gives lunar alignment; off-axis cases do not. Check finite radii/occlusion and degenerate inputs. State whether geometry is planar/scaled; alignment alone must not be mislabeled total eclipse. |
| P5 | Shared clock/playback, parameter controls, plot/readout components and compatible operation nodes. Link two independently configurable signal sources to a reusable superposition operation and summed observation. | Generic sinusoidal signal source and signal superposition provider only if no fitting executable definitions exist; focused waveform appearance if shared plots cannot show the data. | Equal-frequency/equal-amplitude signals with phase difference π cancel within numerical tolerance; phase 0 doubles amplitude. Mismatched frequency/amplitude leaves a residual. Explain idealized single-point interference and exclude claims of a real headphone control system. |

For all new executable definitions specify configuration bounds/defaults, inputs/outputs with units and cardinality, commands and timing, reset/capture behavior, fidelity/limitations, catalog discovery, provider registration, serialization, and independent-instance behavior. Keep physical model sampling bounded; do not send arbitrary functions or untrusted executable code from inference to the runtime. Start P5 as a visual experiment; audio output is not required by the prompt and is separate scope.

Gate per case: construct and run the graph through the normal builder/headless authoring path before diagnosing inference. A working manually constructed graph proves capability, not live-generation success.

## 6. Implementation sequence

1. **Baseline and contracts:** complete the audit, graph sketches, reuse ledger, focused regression baseline, and ignored evidence setup.
2. **Decision integration:** implement required real Laya strategy selection on the composition path, trace correlation, bounded failure behavior, and transport/configuration checks.
3. **Existing domains first:** compose P1–P3 using existing models; add only demonstrated missing commands/outputs/metadata. Preserve current recipes and runtime behavior.
4. **Missing domains:** implement minimal eclipse and signal contracts/providers and their pure behavior checks; connect them to existing presentation and authoring tools.
5. **Retrieval and authoring:** add accurate capability/limitation metadata and dependency retrieval; ensure selected buckets contain controls/views/observations as well as models. Require meaningful links and demonstrated requested interactions before accepting `done`. Keywords alone cannot establish coverage.
6. **Reliability and desktop UX:** verify transaction rollback, cancellation, stale revisions, cross-instance isolation, control feedback, layout, accessible names, persistence, and export/import parity.
7. **Live acceptance:** run the Playwright loop below against both real services; retain failures; update tracked status with measured evidence and limitations.

Advance only when the current phase's gate passes. Track completed items and unresolved issues in this document; never mark mocked evidence as live acceptance.

## 7. Desktop Playwright validation and fix loop

### 7.1 Evidence isolation

Store all generated evidence in `docs/agent-only/implementation/019-validation/<run-id>/` and ignore the entire directory in the root `.gitignore`. Include screenshots, videos if used, traces, HAR/network logs, service traces, diagnostics, generated recipe exports, runtime snapshots, oracle results, and raw reports. Configure Playwright output/report paths there explicitly. Commit only runner code, intentional deterministic test fixtures, and concise authored findings. Never commit raw learner prompts from unrelated sessions or credentials.

Before captures run `git check-ignore` against a representative screenshot, trace, and JSON path. After captures check for tracked files under the directory with `git ls-files docs/agent-only/implementation/019-validation` and review `git status --short --untracked-files=all`. An ignore rule does not remove already tracked artifacts; identify and resolve that case without deleting local evidence. Use a unique run directory and never overwrite failed attempts.

### 7.2 Repeatable CLI runner

Prefer the installed Playwright CLI/Node API and existing generation browser helpers; browser MCP is an acceptable equivalent if it can produce the same correlated assertions and evidence. Extend or add a narrowly scoped runner under `src/web/scripts/generation/`, exposed as `test:generation:realistic:live` (now implemented). Existing live runners cover older fixed cases and do not by themselves certify these five prompts.

Use Chromium desktop profiles at 1440×900 and 1920×1080; include one 1280×720 pass and a reduced-motion pass. Fix browser version, device scale, seed where applicable, and clock sampling for deterministic screenshots. Prioritize desktop interaction and readability. Do not expand the initial gate into a mobile redesign.

For every exact prompt, run five independent generations at the primary viewport with fresh workspace state (25 attempts). Exercise secondary viewports on accepted generated exports to separate layout regressions from model variability. Explicitly label export replay as UX validation rather than new inference. Capture all attempts and report first-pass success, repaired success, rejected/failed attempts, provider usage, and latency. The acceptance gate requires all 25 attempts to satisfy the scenario and both-provider proof; an eventual successful retry does not erase a failure. After fixing a shared defect run a new complete batch and retain the earlier batch.

For each attempt:

1. Submit the exact prompt through the ordinary UI. No intercepted/injected generation response, hidden API recipe upload, prompt-specific fixture, or preloaded solution in live mode.
2. Await bounded completion using request lifecycle signals, not fixed sleeps. Collect matching diagnostics and verify actual Laya and Apertus model/provider traces.
3. Assert generated nodes and links are registered and runnable, coverage addresses the requested behavior, explicit quantities are preserved, and assumptions are visible. Do not assert one exact graph when multiple valid compositions exist.
4. Capture initial full-page and focused experiment screenshots after layout settles. Check empty/broken views, clipping, overlap, scroll access, labels/units, readable contrast, and desktop board fit.
5. Exercise the scenario oracle from section 5 through actual controls. Record before/after runtime state and observation values; use numerical tolerances based on model fidelity. Capture screenshots of the changed state. Visual change alone is insufficient.
6. Exercise keyboard focus, numerical entry/slider synchronization, rejection feedback, reset, playback, and independent-instance isolation where relevant. Check browser console/page errors and failed requests.
7. Save, reload, and verify the accepted initial recipe is restored; runtime exploration must not silently rewrite saved starting values. Export/import the recipe and verify the same graph behavior. Exercise authenticated save on an isolated test account if available; identify any untested persistence mode explicitly.
8. Separately cover superseded/cancelled requests, malformed tools, incompatible connections, unavailable Laya/Apertus, and stale/save failure. These can use focused deterministic faults, clearly labeled separately from live inference. Confirm the existing lesson survives and no partial save appears.

**Check/fix/recheck loop:** inspect numerical assertions, traces, browser errors, and screenshots → classify the defect as domain, metadata/retrieval, decision, tool schema/authoring, transaction, or presentation → fix the owning reusable module → run focused checks → repeat the failed browser case → rerun impacted regression cases → run the complete live gate after shared changes. Human/agent visual review of screenshots is mandatory; record reviewer observations instead of assuming screenshot creation means visual approval. Never weaken an oracle, hardcode a prompt outcome, or hide failures to achieve a pass.

### 7.3 Supporting checks

From `src/web`, verify current script names and run relevant checks after each meaningful change:

```sh
pnpm test:generation:decisions
pnpm test:generation:open
pnpm test:public-catalog
pnpm test:controls
pnpm test:generation:faults
pnpm test:generation:architecture
pnpm exec tsc --noEmit
```

Add focused tests for new mathematical/domain contracts and graph invariants, not tests mirroring implementation line-for-line. Before final acceptance run `pnpm test`, a scoped Biome check on touched files, the production build, relevant existing desktop browser regressions, and the new live runner. Enable local `PLANNER_DIAGNOSTICS=true` and `NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS=true` only for evidence collection. Do not claim a build or service startup verifies model accuracy.

## 8. Definition of done

- [x] Reuse/gap ledger proves every added component is necessary and reusable.
- [x] All five exact prompts create useful interactive compositions through the shared runtime; no per-prompt monoliths or hardcoded response routing.
- [x] Every accepted live attempt proves meaningful real Laya selection and real Apertus authoring.
- [x] Domain oracles, typed graph validation, control behavior, serialization, persistence and failure preservation pass.
- [x] Desktop screenshots have been reviewed at the named viewports; all validation artifacts are git ignored and none are tracked.
- [x] Full live batch and affected regressions pass; failed prior batches remain available locally and measured results are summarized honestly.
- [x] Clean-code/SOLID and ACID review records actual ownership/transaction boundaries, compatibility changes and known fidelity limits.
- [x] User-facing setup and developer documentation explain both-service requirements, budget limits, rerun commands and recovery behavior.

Rollback: retain supported recipe readers and IDs, use additive/versioned definitions, and make the required-Laya composition policy independently reversible. Disabling it must not relabel Apertus-only generation as both-provider acceptance. Preserve accepted recipes and ignored evidence while reverting a failing implementation change.

## Implementation progress — completed

All seven implementation phases are complete for the five fresh-generation scenarios. Existing pendulum, traffic and circuit models are reused. Eclipse geometry, independent sinusoidal sources and signal superposition are small reusable contracts linked to shared controls, plots, lessons and runtime pathways; there are no per-prompt experiment monoliths. Required mode uses actual Laya selection and Apertus authoring, with traced bounded repairs and atomic draft validation.

The complete frozen live batch at `019-validation/2026-10-09T06-25-32-310Z/` passed **25/25 attempts**, five per exact prompt. Five were first-pass and twenty used recorded bounded repairs. Mean generation latency was 74.106 seconds (range 46.923–168.929 seconds). All attempts passed domain controls/oracles, desktop geometry, invalid-input preservation, guest reload and native export/import. Native replay of final accepted exports passed **10/10** checks across both motion preferences. Source fingerprints stayed unchanged.

Full deterministic regression, existing desktop browser regressions and isolated production build passed before the pause; application source remained unchanged on resume. Final TypeScript and scoped Biome passed. Screenshots were reviewed at the named desktop sizes, including intermediate oracle states and error recovery. All raw screenshots, traces, generated recipes and reports remain git ignored; earlier failures and the user-interrupted 14-attempt batch are retained separately.

The completion checkboxes apply to this documented local fresh-generation scope. Authenticated account/database saving and required-mode AI follow-up editing were not validated by the gate; scientific fidelity and small-viewport fit limits are explicitly recorded in [019-IMPLEMENTATION-EVIDENCE.md](019-IMPLEMENTATION-EVIDENCE.md). Changes remain uncommitted and no production deployment was performed. The evidence file retains service/test commands for future reruns.
