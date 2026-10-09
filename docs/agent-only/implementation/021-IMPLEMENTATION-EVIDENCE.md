# 021 — AI agent infrastructure: implementation evidence

Date: 2026-10-10  
Scope: General agent execution infrastructure and one two-agent premade.  
Design: [AI agent foundations](021-AI-AGENT-SIMULATION-FOUNDATIONS.md).

## Delivered architecture

| Boundary | Implementation |
| --- | --- |
| Data-only agent and environment schemas | `components/traits/AIAgent.ts` |
| Independent prefab expansion | `components/prefabs/AIAgent.ts` |
| Request/event/interval/goal eligibility | `components/behaviors/AgentActivation.ts` |
| Observation visibility, bounded context, proposal validation and pure transitions | `components/systems/AgentSystems.ts` |
| Model, environment, repository and public projection contracts | `runtime/agents/contracts.ts` |
| Reservation, lease fencing, revision checks, bounded attempts and execution policy | `runtime/agents/runner.ts` |
| FIFO admission, backpressure, deduplication and queued cancellation | `runtime/agents/scheduler.ts` |
| Scoped dataset retrieval, admitted read-only tools and numeric goal evaluation | `runtime/agents/capabilities.ts` |
| Bounded guest storage | `runtime/agents/memoryRepository.ts` |
| Durable bounded single-document CAS aggregate | `lib/agents/mongoRepository.ts` |
| Shared provider transport adapter and non-secret settings fingerprint | `lib/agents/model.ts` |
| Same-origin, bounded HTTP protocol and verified ownership | `lib/agents/http.ts`, `app/api/agents/route.ts` |
| Synchronous model projection and asynchronous command-driven effects | `runtime/agents/providers.ts`, `runtime/agents/client.ts`, `runtime/authoring/runtime.ts` |
| Public authoring definitions | `components/catalog/agents.ts` |
| Separate profile, conversation and control presentations | `components/views/agents/`, `components/controls/AgentActions.tsx` |
| Premade | `simulations/pre-made/agent-conversation/recipe.json` |

The actor selector and completion policy are injected; they are not part of provider transport. The default environment supports speech and bounded updates to existing numeric metrics. The public communication endpoint admits speech only. Domain rules can supply another environment adapter without replacing model or repository implementations.

Private notes and bounded plan intentions are stored independently for each agent and supplied only to that agent. Stored intentions are not an autonomous executable plan. Public snapshots and downloads exclude private notes, plan state, ownership and leases. Guest bearer tokens remain in client run handles and are excluded from downloads.

## Premade and interaction semantics

**Two perspectives, one city** asks how a city can make everyday travel easier. Mira is a practical planner; Leo is a curious resident concerned with access and daily experience. Eight bounded responses alternate through the same configured model service with independent contexts.

The recipe has two editable agent model nodes, an editable environment node, two independent profile displays, a transcript display, and a command-control component. Initial configuration is saved through existing recipe serialization. Live state is server-owned and projected into the shared document runtime. Views subscribe; no inference starts on mount or animation stepping.

Next generates one response. Autoplay schedules successive bounded requests. Pause stops new work after a reserved response finishes. Cancel invalidates pending work. Restart reconstructs starting state and uses a new run. Replay reveals accepted recorded responses synchronously without network inference. A public transcript can be downloaded. Remix and Try lesson preserve the components and supported execution path.

## Correctness evidence

Final checks passed: TypeScript (`pnpm exec tsc --noEmit`), the full existing regression suite (`pnpm test`), the dedicated core/provider suite (`pnpm test:agents`), and the production webpack build (`pnpm exec next build --webpack`). The agent suite was rerun after the final replay guard change; it rejects replay while an inference response is pending. Browser captures were inspected for the learner, mobile layout, loaded connection builder and Try lesson.

`pnpm test:agents` covers independent memories, private observations, invalid references, unsupported actions, word bounds, numeric environment actions, competing commits, stale revisions, cancellation, lease recovery/fencing, failed storage, retry recovery, activation predicates, queue limits/deduplication/cancellation, scoped retrieval, denied tools, objective predicates, renderer-independent execution and recorded replay.

Agent provider tests mock Apertus, OpenAI and Anthropic HTTP responses. They verify normalized action results, focused semantic repair, token accounting, frozen settings and cancellation. Existing provider/generation tests continue to cover their broader transport fault cases. Mocked tests do not establish cloud availability or quality.

Review fixes on 2026-10-10 added regressions for cancellation during run creation and inference, late responses, restart admission, and action caps under injected completion policies. Cancellation clears pending client requests and requires restart for fresh inference; recorded replay remains available. The runner enforces the configured action cap independently of domain completion rules.

Attempt receipts now use independent attempt identities and record working, accepted, failed, cancelled, or expired outcomes alongside action receipts. Known provider usage survives exhausted repair and validation/storage failure paths when storage permits recording the outcome. Partial usage is retained with completeness flags; public totals are unknown whenever any attempt lacks complete accounting. Older runs without an attempt ledger remain readable and cannot report a complete total when failed attempts are missing. Cancelled or expired workers cannot overwrite newer state; their unavailable usage remains unknown.

A real local Apertus service (`m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`, MLX) passed HTTP origin/ownership/revision checks and generated actual responses. A browser run completed eight accepted responses with speaker order Mira, Leo, Mira, Leo, Mira, Leo, Mira, Leo. Seven later responses referenced an earlier visible message. References establish valid links, not factual correctness or a measured engagement score.

Live testing initially exposed missing fields and object-valued plan steps. Those proposals were rejected without state advancement. Explicit complete examples and focused type repair instructions corrected the observed failures. Model output remains nondeterministic; the bounded retry/error path is still necessary.

Public run evidence was written to `/tmp/apertus-agent-live.json` and `/tmp/apertus-agent-browser-run.json`. These files contain public configuration/transcript data, not guest access tokens or private memories.

## Browser and usability review

Guides: [001](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md), [002](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md), [003](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md), [004](../design/004-USABILITY-QA-GUIDE.md).

Audience: a learner unfamiliar with this experiment, and an author remixing it. Outcome task: hear two perspectives develop, replay what was said, and modify the starting setup. Conditions: automated pointer interaction at 1440×1000 and mobile layout inspection at 390×844. This is an agent review, not observed first-time human use.

| Check | Status and evidence |
| --- | --- |
| Purpose and primary action | Pass for visual review: topic and participant identities are visible; Next response has primary treatment |
| Accepted state and feedback | Pass for interaction: pending speaker, accepted count, completion and restart match runtime state |
| Distinct configuration and results | Pass: profile information is separate from generated messages and command controls |
| Independent authoring | Pass for recipe validation/remapping/save round trips and browser Remix → Try lesson |
| Pause, autoplay and completion | Pass in a real eight-response browser run |
| Recorded replay | Pass: stepping/showing recorded responses adds no agent HTTP responses |
| Mobile scale | Original failure corrected: responsive workspace framing now preserves readable scale; measured primary target 166×56 pixels |
| Floating navigation | Original overlap corrected: mobile navigation is placed away from primary actions |
| Reset/recovery | Restart passed in browser; cancellation, storage and invalid-model recovery covered deterministically |
| Keyboard semantics | Native buttons, disclosures and links, with visible focus styles; full keyboard-only journey not tested |
| First-time understanding | Not tested with human participants |
| Cloud quality | Not tested live |
| Mongo deployment behavior | Disposable local MongoDB 7 integration passed: competing CAS writes, owner isolation, accepted aggregate state, failed-attempt usage, retry and repository reopen. Replica-set failover and production deployment were not tested |

Captures: `/tmp/apertus-agents-opening.png`, `responses.png`, `complete.png`, `mobile.png`, `builder.png`, and `try-lesson.png`, each with the `apertus-agents-` prefix. Captures are local verification artifacts and may not survive machine cleanup.

## Persistence guarantees and operational limits

Account runs use one bounded MongoDB aggregate and conditional majority writes, so related event/memory/receipt/state changes share a single-document atomic boundary. There is no multi-document transaction or distributed transaction with the model. Guest storage is process-local with explicit TTL/capacity, not durable storage. A run handle can be read through the API; automatic run history/restoration on recipe reopen is not implemented.

Requests are bounded to 32 KB, runs to 1 MB, profiles to twelve agents, runs to forty accepted actions, and attempts to three times the action cap. Inference and repair remain bounded by the shared transport. Queue admission has a deadline and fixed capacity. Guest run creation has a process capacity limit. Long-running background jobs require a future durable worker.

The Mongo test command requires `MONGODB_TEST_URI` and uses a disposable uniquely named database. The review-fix run passed against a temporary MongoDB 7 container, which was removed after testing. This verifies local persistence behavior, not production deployment or replica-set failover guarantees.

## Optional inventory and extensions

The foundation document intentionally contains a broader candidate inventory. This delivery implements the complete bounded execution path and extension contracts needed for the premade, plus tested general infrastructure utilities. It does not advertise every candidate as an enabled product feature.

Deferred extensions include autonomous multi-step plan execution, automatic world-event/clock wiring, external effectful tools and an outbox/reconciler, vector retrieval/summaries, group-channel authoring, per-agent mixed-model selection, streaming provisional text, durable workers, run history UI, and arbitrary domain action authoring. Read-only tool/retrieval utilities exist but are not automatically exposed to model calls. These extensions should use the established permission, revision, adapter and state-ownership boundaries.
