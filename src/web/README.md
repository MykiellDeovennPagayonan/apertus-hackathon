# Apertus Local Lab web app

Next.js frontend and backend for shared, interactive simulation recipes.

## Run

From the project root:

```sh
cp src/web/.env.example src/web/.env.local
make -C src/inference setup
make run-apertus
# In a separate terminal:
make run-web
```

Open http://localhost:43100. Home requests automatically activate a validated lesson. Arithmetic, rectangle area/perimeter, and truss bridge are the generation scope. The premade library and builder retain their other existing experiments and work without inference. Generated lessons use the same RecipeLesson, SpatialBoard, controls, and runtime as premade and builder lessons.

Local inference targets Apple Silicon, Python 3.12, and Metal. Setup creates `src/inference/.venv`; the pinned runner downloads `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` on first use. Allow enough disk and unified memory for weights and context. `make -C src/inference smoke` checks the running service; `make -C src/inference planner-smoke` runs one live generation pass. `make stop` stops local services.

Laya is optional for ambiguous selection. To enable it, run `make -C src/inference setup-laya` and `make run-laya`. `PLANNER_MODE=hybrid` permits at most one shortlist question; direct and unambiguous selections do not load Laya configuration. Failed or rejected selections fall back within the same Apertus request budget. `PLANNER_MODE=apertus` skips Laya entirely. The separate Laya environment targets Apple Silicon and downloads `aac6fef/laya-multilingual-mlx` on first use.

## Generation and saved lessons

`POST /api/apertus` uses a versioned GenerationRequest/GenerationResult protocol. Apertus interprets teaching intent and returns small arguments for the exact selected recipe or typed authoring tools. Application code owns identifiers, bindings, layout, topology, validation, and the complete expanded recipe. The new path does not use the historical planner.

The request has one deadline (at most 120 seconds), six Apertus calls, one repair per stage and two repairs total, one optional Laya selection, one broader retrieval, and twelve successful authoring operations. Each repair uses a fresh focused prompt. Structured-output support is probed by behavior in `auto` mode; `strict-json` uses the same schema and semantic validation without requesting provider grammar support. Provider token usage is recorded when supplied; absent usage is recorded as unknown. Set `APERTUS_CONTEXT_TOKENS` only to a verified provider context capacity.

Generation supports arithmetic addition/subtraction, independent rectangle comparisons, and the existing truss mechanism. Bridge responses remain heuristic: requests for engineering deflection retain a useful bridge lesson with visible limitations. Friction, momentum, weight alone, and unrelated concepts have no supported teaching overlap. A partial result explicitly identifies covered and omitted concepts.

Created or updated authored lessons are saved through the normal recipe library. Reload restores the accepted initial recipe. Runtime exploration changes current state without changing the saved starting values. Authored undo/redo retains recipe and coverage metadata. Save recipe, Open recipe, and voluntary Remix use the normal import/export and builder paths. Invalid output, cancellation, stale revisions, unsupported requests, and storage failures preserve the current lesson; storage failures expose a downloadable recovery recipe.

## Provider configuration

`APERTUS_PROVIDER=local` uses `APERTUS_LOCAL_BASE_URL` (including `/v1`) and `APERTUS_LOCAL_MODEL`. Run inference separately from Next.js. A deployed server's loopback address refers to that server.

Hosted mode uses `APERTUS_PROVIDER=huggingface`, `HF_TOKEN`, and a served `APERTUS_HF_MODEL`; `APERTUS_HF_BASE_URL` defaults to `https://router.huggingface.co/v1`. Downloadable MLX weights need not be available through hosted inference. Hosted deployment remains unverified. Configuration and credentials are server-only. Restart Next.js after changing `.env.local`. There is no automatic provider switch.

`PLANNER_MAX_CONCURRENT_REQUESTS` and `APERTUS_MAX_CONCURRENT_REQUESTS` bound per-process concurrency. Cancellation aborts downstream HTTP work; it cannot interrupt an already running MLX computation. Other platforms can supply a compatible inference server.

## Verification

From `src/web`:

```sh
pnpm test
pnpm exec tsc --noEmit
pnpm build
pnpm test:generation:browser
pnpm test:generation:architecture
```

The deterministic suite checks recipe/runtime contracts, atomic transactions, idempotence, stale revisions, sibling preservation, binding compatibility, round trips, clock behavior, bounded transport, focused repairs, and semantic argument validation. Architecture checks resolve imports and CLI entry points, verify pure headless authoring, and compare protected premade/gas content against the captured baseline.

Browser runners need a running diagnostic-enabled app. Enable `PLANNER_DIAGNOSTICS=true` and `NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS=true`, restart Next.js, and optionally set `UX_TEST_URL`. Install Chromium with `pnpm exec playwright install chromium`, set `PLAYWRIGHT_CHROMIUM_EXECUTABLE`, or use the detected macOS Chrome installation.

```sh
# Deterministic API fixtures: home activation, interactions, persistence,
# cancellation/supersession, invalid responses, and storage recovery.
pnpm test:generation:browser
# Real inference: five independent attempts per fixed case (15 total).
GENERATION_EVIDENCE_DIR=/tmp/apertus-generation pnpm test:generation:live
# Replay accepted exports over five viewport profiles and motion settings.
GENERATION_EVIDENCE_DIR=/tmp/apertus-generation pnpm test:generation:ux
```

Live and accepted-export UX runners require fresh evidence directories to preserve prior attempts and failures. For a second UX run, point `GENERATION_ACCEPTED_DIR` to the retained live directory and use a new `GENERATION_EVIDENCE_DIR`. Explicit fixture development replay permits reusing its temporary directory.

Live checks use the normal prompt UI with no API interception or recipe injection. They retain correlated requests, responses, diagnostics, actual runtime state, numeric interaction oracles, exports, traces, screenshots, geometry, and browser errors. `GENERATION_RUNS=1` is a smoke run, not the fifteen-attempt acceptance gate. UX requires accepted exports from the live run. `GENERATION_UX_ALLOW_FIXTURES=1` explicitly labels a development replay using deterministic exports; it does not establish live acceptance. Captures require human visual review before Phase 5 signoff.

The bounded `/api/planner-diagnostics?id=...` buffer and read-only `window.__experimentSnapshot()` are disabled in production. Diagnostics contain prompts and should be enabled only for local evidence collection. Do not expose credentials through public environment variables.

Implementation, cleanup, and verification evidence for phases 1–3 live in `../../docs/agent-only/implementation/015-validation/`. Historical 003–005 evaluations describe superseded implementations and do not measure the current generator.

## Ownership

- `src/lib/planner`: protocol, teaching stages, retrieval, budgets, coverage, and diagnostics.
- `src/lib/apertus`, `src/lib/laya`: bounded provider transports and optional shortlist selection.
- `src/simulations/components/catalog`: authoritative schemas and teaching metadata.
- `src/simulations/runtime/authoring`: pure shared insertion, bindings, arrangement, transactions, and finalization.
- `src/simulations/runtime/recipeSession.ts`: canonical authored/runtime revisions, clock, history, and snapshots.
- `src/simulations/components/views`: shared learner presentation and spatial navigation.
- `src/app/experiments`: automatic home activation and normal persistence integration.
- `src/simulations/builder`: optional authoring UI using the same runtime tools.

The protected gas recipe, physics, and authored layout remain unchanged. Historical saved-format readers and legacy adapters are retained only for their identified compatibility consumers; the cleanup report records those boundaries.
