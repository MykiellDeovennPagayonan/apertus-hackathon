# pAperSim web app

Next.js frontend and backend for shared, interactive simulation recipes.

## Run

From the **submission repository root**, with Docker, Compose and GNU Make installed:

```sh
make run
```

This starts the production web app, local Apertus and Laya. Use `make stop` to stop Docker services. Phone HTTPS is optional; see the [deployment guide](../../deploy/raspberry-pi/README.md).

The remaining relative paths and host-development commands in this guide assume **`track_2b/`** as the working directory. For host development and separate inference setup, follow the [development guide](../../docs/DEVELOPMENT.md).

Open http://localhost:43100. Home requests automatically activate a validated lesson. Creation searches both the premade library and the built-in component assemblies. The premade library and builder retain their other existing experiments and work without inference. Generated lessons use the same RecipeLesson, SpatialBoard, controls, and runtime as premade and builder lessons.

Local inference targets Apple Silicon, Python 3.12, and Metal. Setup creates `src/inference/.venv`; the pinned runner downloads `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` on first use. Allow enough disk and unified memory for weights and context. `make -C src/inference smoke` checks the running service; verify live generation through the actual app. `make stop-dev` stops host development services.

Laya is optional for ambiguous selection. To enable it, run `make -C src/inference setup-laya` and `make run-laya`. `PLANNER_MODE=hybrid` permits at most one shortlist question; direct and unambiguous selections do not load Laya configuration. Failed or rejected selections fall back within the same Apertus request budget. `PLANNER_MODE=apertus` skips Laya entirely. The separate Laya environment targets Apple Silicon and downloads `aac6fef/laya-multilingual-mlx` on first use.

## Generation and saved lessons

`POST /api/apertus` uses a versioned GenerationRequest/GenerationResult protocol. Apertus interprets teaching intent, including independent instance count. Creation searches both recipe catalogs using term rarity and the original request. A named model with matching requested numeric parameters resolves against its real contracts; ambiguous choices use a small AI selection response. In hybrid mode Laya provides an advisory recommendation; uncertain or unavailable selection falls back to Apertus. Apertus supplies validated parameter overrides and requested command IDs. Application code expands existing assemblies, allocates identifiers, preserves their wiring, and checks requested controls before activating the complete recipe. Editing retains typed authoring tools and revision checks.

Creation permits up to three independent activity instances, one deadline (120 seconds by default, 240 seconds in required-Laya composition mode), a bounded composition call budget, one optional Laya selection, and up to three repairs per stage and three repairs total. Repairs remain subject to the shared call budget and deadline. Each repair uses a fresh focused prompt. Apertus structured-output support is probed by behavior in `auto` mode; cloud providers use native schema formats; `strict-json` uses the same schema and semantic validation without requesting provider grammar support. Provider token usage is recorded when supplied; absent usage is recorded as unknown. Set `LLM_CONTEXT_TOKENS` (or the legacy `APERTUS_CONTEXT_TOKENS` for Apertus) only to a verified provider context capacity.

Generation uses the capabilities of the selected registered assemblies, including their declared scientific limits. Independent instances can compare conditions with separate controls. Different activities remain independent unless a registered assembly explicitly couples their models; unsupported relationships must be reported rather than invented. A partial result identifies omitted behavior. Physics models retain their existing approximations and assumptions.

Created or updated authored lessons are saved through the normal recipe library. Reload restores the accepted initial recipe. Runtime exploration changes current state without changing the saved starting values. Authored undo/redo retains recipe and coverage metadata. Save recipe, Open recipe, and voluntary Remix use the normal import/export and builder paths. Invalid output, cancellation, stale revisions, unsupported requests, and storage failures preserve the current lesson; storage failures expose a downloadable recovery recipe.

## Accounts and MongoDB persistence

Composer repair memory is optional and uses PostgreSQL/pgvector alongside MongoDB. It defaults to off. See the [repair-memory runbook](../../deploy/repair-memory/README.md) for migrations, 384-dimensional embeddings, separate runtime/worker/reviewer credentials, extraction, and rollout. Existing generation continues when memory is unavailable.

NextAuth uses encrypted JWT sessions and the official MongoDB adapter for user identities and Google account links. Library requests recheck the user and session version in MongoDB. Configure the server-only variables in `.env.local` from `.env.example`: `MONGODB_URI`, `MONGODB_DB_NAME`, `NEXTAUTH_SECRET`, and `NEXTAUTH_URL`. Google additionally requires `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"`. Never commit its output. Set `NEXTAUTH_URL` to the app's actual origin; for local port 43100, register `http://localhost:43100/api/auth/callback/google` as the authorized redirect URI in your Google OAuth web client. Restart Next.js after changing configuration. See the [NextAuth Google setup](https://next-auth.js.org/providers/google). Previously issued database sessions require signing in again after the JWT migration.

The custom interface lives at `/auth/sign-in`, `/auth/sign-up`, `/auth/forgot-password`, `/auth/reset-password`, and `/auth/verify-email`. Auth pages share an animated physics background with pause/resume and reduced-motion support. Sign-in and sign-out controls are available on the landing page and experiment catalog. With authentication unconfigured, the existing guest workspace remains available.

**Draft limitation:** email/password registration, verification, and recovery are not connected to HTTP routes or an email transport yet. The forms and account-service groundwork are present; they are not completed email flows. Choosing the delivery provider and approving tests for these new endpoints are still pending. Google OAuth also needs a manual check with real credentials. Do not treat this draft as ready to deploy.

Signed-in experiment saves, generated lessons, and reusable component recipes use MongoDB. Guests keep the existing device-local libraries. Guest records are not automatically uploaded or merged into an account. Draft recovery remains local, with separate keys for each account. Switching accounts resets the active workspace.

| Collection | Contents and identity |
| --- | --- |
| `users`, `accounts` | User identities, Google account links, optional password hashes and verification/reset metadata, and session versions. |
| `authLimits` | Hashed rate-limit buckets with expiry indexes for password/account requests. |
| `sessions` | Legacy database-session records; new JWT sessions do not use this collection. |
| `simulations` | `ownerId`, `experimentId`, full existing experiment `document`, optional `recovery`, `revision`, `createdAt`, `updatedAt`. Unique `(ownerId, experimentId)`. |
| `components` | `ownerId`, full existing component `recipe`, `revision`, `createdAt`, `updatedAt`. Unique `(ownerId, recipe.id)`. |

Collections and indexes initialize on the first database connection. Library collection validators enforce the storage envelope; the existing application validators check the complete document/recipe before writes. Existing collection validators are not replaced automatically. Built-in recipes stay in code, and saved documents preserve their existing version formats. The persistence `revision` is separate from recipe/document versions. Updates require the previously read revision; concurrent or stale saves return a conflict rather than overwriting another save.

`GET`/`PUT /api/library/simulations` and `/api/library/components` derive the owner from the verified server session. Clients cannot choose another owner. Requests carry the expected account to reject stale tabs after account switches; saves require the configured origin and JSON bodies of at most 2 MB. Database errors return a generic unavailable message.

For the demo, manually check sign-in, save/load, and account isolation with the configured MongoDB instance. Live Google OAuth requires real credentials.

## Provider configuration

Set server-only variables in `src/web/.env.local`, then restart Next.js. Both Experiments and Builder use the selected provider through the existing `/api/apertus` endpoint. Provider selection is deployment-wide; the browser does not send credentials or choose a provider. Each generation keeps the same resolved settings across its stages and repairs. An unavailable provider fails explicitly; there is no automatic switch to another provider.

For OpenAI GPT-5.6 Luna:

```dotenv
LLM_PROVIDER=openai
LLM_MODEL=gpt-5.6-luna
OPENAI_API_KEY=your-api-key
```

The OpenAI adapter uses the Responses API with `store=false`. If `LLM_MODEL` is omitted, OpenAI defaults to `gpt-5.6-luna`. Luna defaults to reasoning effort `none` so bounded authoring stages reserve their output for arguments. `OPENAI_REASONING_EFFORT` can override it; other models use their provider default unless this variable is set. Supported efforts and output formats differ by model. Selecting a model does not grant your API account access to it. Use an API key with model access and billing enabled.

For Anthropic, supply the exact Claude model ID available to your account:

```dotenv
LLM_PROVIDER=anthropic
LLM_MODEL=your-claude-model-id
ANTHROPIC_API_KEY=your-api-key
```

The Anthropic adapter uses the Messages API, separating the system prompt from user/assistant messages. `LLM_MODEL` is required for Anthropic. Neither cloud provider requires a local inference service. The decision provider is independent: use `PLANNER_MODE=apertus` to skip decision selection entirely even when OpenAI or Anthropic is selected. The legacy mode name controls decision usage, not the LLM provider.

To switch back to local Apertus:

```dotenv
LLM_PROVIDER=apertus
APERTUS_PROVIDER=local
APERTUS_LOCAL_RUNTIME=mlx
APERTUS_LOCAL_BASE_URL=http://127.0.0.1:43101/v1
APERTUS_LOCAL_MODEL=m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4
```

Remove or comment out `LLM_MODEL` when switching back so the existing `APERTUS_LOCAL_MODEL` or `APERTUS_HF_MODEL` takes effect. An explicitly set `LLM_MODEL` overrides either Apertus model variable. Leaving `LLM_PROVIDER` unset preserves the existing Apertus configuration. MLX and Ollama continue using their existing OpenAI-compatible Chat Completions transport; Ollama requires its own configured base URL/model. Run local inference separately from Next.js. A deployed server's loopback address refers to that server.

Hosted Apertus uses `APERTUS_PROVIDER=huggingface`, `HF_TOKEN`, and a served `APERTUS_HF_MODEL`; `APERTUS_HF_BASE_URL` defaults to `https://router.huggingface.co/v1`. Downloadable MLX weights need not be available through hosted inference.

Optional common settings take precedence over corresponding Apertus settings:

| Variable | Behavior |
| --- | --- |
| `LLM_TIMEOUT_MS` | Per-call deadline, 1–600000 ms; defaults to 120000 for cloud providers. The planner's total deadline still applies. |
| `LLM_MAX_TOKENS` | Output-token ceiling, 1–128000; defaults to 4096 for cloud providers. Individual stages may request fewer tokens; reasoning tokens share the provider's output budget. |
| `LLM_MAX_CONCURRENT_REQUESTS` | Per-process concurrent LLM calls, 1–16; defaults to 1 for cloud providers. |
| `LLM_STRUCTURED_OUTPUT` | `auto` (default): native cloud schemas, behavior probe for Apertus. `strict-json`: skip provider grammar, retain application validation and repairs. Use this for models without native schema support. |
| `LLM_CONTEXT_TOKENS` | Optional verified input-plus-output capacity, 1–2000000. Provider-reported usage is checked against this capacity; this is not a tokenizer-based preflight. |

Without these overrides, Apertus keeps its existing `APERTUS_*` settings. Cloud providers ignore unused Apertus configuration. `PLANNER_MAX_CONCURRENT_REQUESTS` still independently limits complete generations. Cancellation aborts downstream HTTP work; it cannot interrupt an already running MLX computation.

Native schema adapters wrap root arrays, translate OpenAI optional properties to nullable required fields and restore omitted fields before validation, and remove unsupported Anthropic grammar constraints while retaining them in field descriptions. The original application validators still enforce all bounds and semantic rules. HTTP failures and refusals do not consume JSON repair attempts. Local diagnostics identify provider, connection, model, duration and normalized token usage without credentials; Anthropic input usage includes cached input tokens. Enable `PLANNER_DIAGNOSTICS=true` only locally; traces contain prompts and are disabled in production.

For a live smoke test, configure the provider, restart the app, generate the same prompt in Builder or Experiments, and inspect the diagnostic trace. Switch providers and restart between comparison runs, using the same starting experiment state.

API references: [OpenAI GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna), [OpenAI structured outputs](https://developers.openai.com/api/docs/guides/structured-outputs), [Anthropic Messages](https://platform.claude.com/docs/en/api/messages/create), and [Anthropic structured outputs](https://platform.claude.com/docs/en/build-with-claude/structured-outputs).

## Laya or Jev decision selection

Set `DECISION_PROVIDER=laya|jev` independently of `LLM_PROVIDER`. Leaving it unset preserves local Laya and existing `LAYA_*` settings. `PLANNER_MODE=hybrid` invokes the decision model only for an ambiguous capability shortlist; unambiguous requests skip it. Switching the decision provider does not change the text generation provider.

For TypeSafe's hosted Jev:

```dotenv
PLANNER_MODE=hybrid
DECISION_PROVIDER=jev
TYPESAFE_API_KEY=your-typesafe-key
JEV_BASE_URL=https://api.typesafe.ai/v1
JEV_MODEL=jev-1.13.0
```

Create the key in the [TypeSafe console](https://console.typesafe.ai/keys), configure the backend environment, and restart Next.js. No local Laya process is needed for Jev. For local Laya, set `DECISION_PROVIDER=laya`, keep `LAYA_BASE_URL=http://127.0.0.1:43102`, and start `make run-laya`. With a hosted LLM and Jev, Next.js needs no local model services.

The backend adapter sends Jev `{model, state, questions}` to `POST /v1/systemone` with Bearer authentication and normalizes `{model, answers, usage}` into the existing decision interface. Local Laya retains `/api/decide` and its nested `result.answers` envelope. The integration currently uses Choice questions; Jev also supports Score and Noul. [Official API reference](https://docs.typesafe.ai/api).

Common `DECISION_TIMEOUT_MS`, `DECISION_ACCEPTANCE_GATE`, and `DECISION_CREATION_ACCEPTANCE_GATE` settings override the legacy Laya settings. Jev ignores `LAYA_*` values and defaults to a 3000 ms timeout and a 0.75 creation probability gate. `DECISION_CONFIDENCE_GATE` adds a separate check on the answer's confidence: defaults are 0.75 for Jev and 0 (disabled) for Laya. Selected-option probability and confidence are different quantities; neither threshold is a measured accuracy guarantee. Tune them with representative lesson requests and keep the `unclear` option. [TypeSafe confidence guide](https://docs.typesafe.ai/confidence).

The existing planner budget permits at most one decision request per generation. Failed calls, invalid responses, low probability/confidence, or `unclear` return control to the configured LLM planning path. There is no automatic Jev-to-Laya failover. Cancellation stops work. Requests and responses are bounded to 64 KB, redirects are rejected, credentials stay server-side, and Jev requires HTTPS. The planner still validates configured recipes before applying them. Diagnostics use the provider-neutral `selection.decision` event name and include the actual provider, resolved model, token usage, and duration; production prompt traces remain disabled.

Decision adapters return validated Choice answers through a shared contract. Capability selection receives its provider and policy as dependencies; it returns explicit selected, rejected, or unavailable outcomes. Connection settings and acceptance policy are resolved lazily and retained within each generation, so clear requests still skip decision configuration. Errors distinguish invalid configuration, HTTP failures, malformed responses, timeouts, and network failures. Cancellation propagates instead of becoming fallback.

Internal diagnostics now use `decisionCalls` and `selection.decision`; update any external trace consumers that previously used `layaCalls` or `selection.laya`. Existing `LAYA_*`, `JEV_*`, and `DECISION_*` environment settings remain supported. The general `*_ACCEPTANCE_GATE` is retained for legacy validation; capability selection uses `*_CREATION_ACCEPTANCE_GATE`. The local Python `src/inference/laya` service remains provider-specific.

### Infrastructure and rollout

The initial deployment uses this path:

```text
Browser → Next.js planner → deterministic capability shortlist
                           → decision adapter → local Laya OR hosted Jev
                           → selected LLM → recipe validation → runtime
```

Jev needs an outbound HTTPS connection from the Next.js backend to `api.typesafe.ai:443`, a backend secret, and an account with API access. Put `TYPESAFE_API_KEY` in your deployment secret store. Keep the local Laya service reachable only from the backend if you choose Laya; a remote Next.js server cannot reach the laptop's loopback address. The existing planner concurrency limit bounds decision traffic within each process. No new database, GPU, public inference route, or job queue is required for the synchronous integration.

Pin the model for threshold evaluations and release it alongside the question wording and gates. The official model page currently lists `jev-1.13.0`, $0.042 per million input tokens with free output, a 64k total request context and a 32k state-plus-longest-question limit. Pricing and dynamically adjusted rate limits should be rechecked before rollout. [Official models](https://docs.typesafe.ai/models).

For multiple backend replicas, add a shared account rate limiter and a short circuit breaker for repeated overloads. The interactive adapter deliberately makes one attempt so retry backoff cannot consume the selection budget; it falls back to LLM planning on HTTP errors. If background workloads are added, use bounded retries for 429/529, honoring retry headers and the job deadline. Keep authentication/validation errors out of retry loops.

Before relying on Jev selection quality, run paired live evaluations on identical prompts and starting state with each provider. Measure selection correctness, fallback frequency, end-to-end latency, and input-token cost. Include ambiguous, unsupported, multilingual, and adversarial requests. Jev documents weaknesses around arithmetic, counting, temporal comparisons, and instruction-like text in state; keep calculations and execution in deterministic code. [Official model limitations](https://docs.typesafe.ai/model-jaggedness/jev-1.13).

A live generation only verifies Jev if its diagnostic trace shows an actual Jev call.

## Verification

From `src/web`:

```sh
pnpm test
pnpm build
```

`pnpm test` runs one recipe sanity check: loading, serialization, save/reopen, independent copies, rejected imports, and representative controls. Before the demo, manually check generate → interact → save → reload and one builder edit. Check sign-in and cloud saves if using accounts.

Run `pnpm recipes:generate` after adding or removing premade recipes. The remaining scripts are the registry generator, recipe sanity check, its TypeScript loader, and recipe case fixtures.

## Ownership

- `src/lib/planner`: protocol, teaching stages, retrieval, budgets, coverage, and diagnostics.
- `src/lib/llm`, `src/lib/apertus`: LLM configuration/adapters and bounded text-generation transport.
- `src/lib/decisions`: typed decision contracts, connection configuration, provider factory, Laya/Jev adapters, response validation, and bounded HTTP transport.
- `src/lib/planner/selection`: capability questions, acceptance policy, and provider-independent selection orchestration.
- `src/simulations/components/catalog`: authoritative schemas and teaching metadata.
- `src/simulations/runtime/authoring`: pure shared insertion, bindings, arrangement, transactions, and finalization.
- `src/simulations/runtime/recipeSession.ts`: canonical authored/runtime revisions, clock, history, and snapshots.
- `src/simulations/components/views`: shared learner presentation and spatial navigation.
- `src/app/experiments`: automatic home activation and normal persistence integration.
- `src/simulations/builder`: optional authoring UI using the same runtime tools.

The protected gas recipe, physics, and authored layout remain unchanged. Historical saved-format readers and legacy adapters are retained only for their identified compatibility consumers; the cleanup report records those boundaries.

### Private projects and community publishing

The builder has visible **New experiment**, **Clear canvas**, **Download recipe**, and **Publish** controls. Guests can create projects, keep local saves, and download recipes. Guest project content is never written to MongoDB. Account drafts also have device-local recovery; **Save** explicitly updates the private cloud copy. Unsaved replacement/navigation actions offer save, discard, and cancel.

`/projects` manages private experiments and reusable compositions, including names, descriptions, tags, opt-in sharing, downloads, deletion, and explicit imports of local work. Names are unique per account and project type after Unicode normalization, whitespace normalization, and case-insensitive comparison. Database indexes enforce the final check. Private project IDs remain stable when renamed.

Enable **Allow this project to be published to the community**, save, then review the publication. Publishing requires an account and an acknowledgement that all included content may be shared under CC BY 4.0. Each publication stores a validated, self-contained snapshot. Editing or deleting the private source never changes that snapshot. Publish later edits as a new version with a different public name. Authors can withdraw publications from browsing without rewriting snapshot content.

`/community` provides searchable experiment/composition discovery. Detail pages can run experiments, preview compositions, show version history, download attributed exports, remix projects, and insert compositions into the builder. Current compositions must be fully expanded and reference registered component versions; unsupported legacy nested recipes must be expanded before publication. Recovery/legacy compatibility copies are excluded from public snapshots. Community exports retain the publication's identity, author, license, and attribution alongside the native payload, and the builder accepts these exports.

#### MongoDB setup

Use the server-only settings in `.env.example`: `MONGODB_URI`, `MONGODB_DB_NAME`, `NEXTAUTH_URL`, and a unique `NEXTAUTH_SECRET` of at least 32 characters. Configure Google OAuth for account sign-in; incomplete email registration/reset flows remain disabled. Never expose database or authentication credentials through `NEXT_PUBLIC_*`.

**Publishing requires a replica set or MongoDB Atlas**, because version allocation, snapshot insertion, and source-revision checks run in one transaction. Private saves can use standalone MongoDB. An unavailable transaction configuration produces an explicit error rather than a partial publication.

Canonical data lives in `projects`, `communityPublications`, and `publicationSeries`. The previous `simulations` and `components` APIs are compatibility adapters; new writes target `projects`. Public API DTOs exclude private source IDs/revisions, recovery copies, and account email.

#### Migration and rollback

Back up the database before enabling this release (for example, use your deployment's snapshot facility or `mongodump` with securely supplied credentials). Owner migration happens lazily on first library access.

Migration copies rather than deletes source records, preserves revisions/timestamps, and defaults sharing to false. Per-owner leases serialize concurrent migrations; receipts retain source identities and hashes. Legacy duplicate titles get deterministic `(imported N)` suffixes; original titles stay in receipts. Unsupported records are quarantined, retained, and offered for export on My projects. Local originals also remain after explicit account import.

Verify counts, quarantined receipts, and representative round trips before rollout. Retain legacy collections and a full backup until the retention window ends. Rolling back to older code restores its legacy reads; it does **not** include writes made to the new canonical store, so export/reconcile those writes before rollback. Do not blindly copy legacy records over newer projects or remove migration receipts: doing so can resurrect deleted projects. To retry repaired quarantined records, use a controlled maintenance window and backup, repair the retained source, and remove only the affected source receipt and its owner's completion marker before rerunning migration.

#### Moderation and operations

Signed-in users can report public projects. Reports remain in MongoDB; this hackathon version has no moderation CLI or public administrative endpoint.

Schedule backups of the canonical collections and test restore procedures. Save revisions prevent accidental overwrite; they are not historical backups. The initial release intentionally has no automatic cloud autosave, offline retry queue, collaborative editing, likes, or comments. List APIs use bounded cursor pagination; compatibility library APIs remain temporarily available for older callers.

#### Verification

Manually check private save/reopen, publishing, and account isolation if these features are part of the demo.

## Realistic prompt composition with Laya and Apertus

The composable catalog now includes scaled solar/lunar eclipse geometry and independent sinusoidal pressure sources with two-input superposition. Pendulum, ring-traffic and circuit requests reuse the existing physical models. All lessons use typed authoring operations, shared controls/displays, the same runtime and ordinary recipe persistence.

Set these server-only variables to require real local Laya selection and Apertus authoring on the composition path:

```dotenv
LLM_PROVIDER=apertus
APERTUS_PROVIDER=local
APERTUS_LOCAL_RUNTIME=mlx
APERTUS_LOCAL_BASE_URL=http://127.0.0.1:43101/v1
APERTUS_LOCAL_MODEL=m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4
PLANNER_MODE=hybrid
DECISION_PROVIDER=laya
COMPOSITION_DECISION_POLICY=required-laya
DECISION_TIMEOUT_MS=20000
LAYA_BASE_URL=http://127.0.0.1:43102
```

Start both inference services with the existing setup/run targets, check `smoke` and `smoke-laya`, then run `make run-realistic` from `track_2b/` (or set the variables above and restart the web app). The local MLX launcher applies the tokenizer regex compatibility fix without modifying downloaded model files. Required composition allows up to 24 turns, 28 Apertus calls, three repairs, and one Laya decision; the default total deadline is 240 seconds (120 seconds in optional mode). `PLANNER_TIMEOUT_MS` explicitly overrides it. Required mode preserves the current lesson and reports a failure when Laya is unavailable or does not meet the confidence gate; it cannot silently claim both-provider success via an Apertus-only fallback. `COMPOSITION_DECISION_POLICY=optional` retains the previous selection policy.

Eclipse geometry is a scaled planar teaching model. Sound cancellation is ideal pressure superposition at one point with no audio output or real headphone controller. Existing pendulum/circuit/traffic fidelity assumptions remain visible in generated lessons.

## Runtime AI agents

Open `/experiments?experiment=agent-conversation` for **Two perspectives, one city**. Mira and Leo discuss ways to improve daily travel using the configured LLM. Choose **Next response**, or **Continue automatically** for a bounded eight-response run. Pause finishes the reserved response; cancel fences pending work. Restart creates a fresh run. Replay reveals accepted responses without inference. Run information offers a public transcript download.

The premade is a normal shared JSON recipe. Its two agent profiles, environment, profile displays, transcript, and command controls are independent builder components. Remix and Try lesson use the same runtime. Edit the environment topic and limits or the individual personas/objectives before starting a new run. Views and animation frames never start inference.

Agent infrastructure lives in `simulations/runtime/agents/`; pure systems, traits, behaviors, prefab, catalog definitions, views, and controls live under the existing component kinds. The asynchronous runner injects model, environment, execution policy, and repository contracts. It validates proposals, visibility, permissions and preconditions before acceptance. The model adapter reuses existing Apertus/OpenAI/Anthropic transports with dedicated bounds and frozen non-secret settings. The public HTTP adapter currently admits speech; a metric environment adapter is exercised in deterministic tests. Read-only tool registration, scoped dataset retrieval, goal predicates, activation policies and a bounded FIFO scheduler are reusable infrastructure, not automatically enabled LLM tools.

`POST /api/agents` accepts `create`, `read`, `step`, and `cancel`. Creation takes a versioned bounded agent configuration. Subsequent requests take the returned handle; step also requires the last observed revision. Same-origin requests are required. Guest handles contain a scoped bearer token; never publish them. Signed-in runs use the verified account session and MongoDB `agentRuns`. Guest runs use bounded process-local storage and expire an hour after their last state change, or on server restart. There is no automatic background worker or automatic run restoration on recipe reopen.

Persistent runs are bounded single-document aggregates: event, memory, world state, receipt and revision commit in one conditional majority write. Leases and fencing reject stale workers; retries cannot duplicate an accepted logical action. The LLM call happens outside the database write and may execute more than once. Recipes save initial configuration; run history and private notes are separate. Public projections/downloads exclude private memory and plans.

For the demo, manually check Next response, pause/cancel, restart, and transcript download with the configured provider.

See the [development guide](../../docs/DEVELOPMENT.md) for current source ownership, boundaries and verification.
