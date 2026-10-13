# 033 — Composer repair memory with PostgreSQL and pgvector

Date: 2026-10-13  
Status: initial implementation and focused verification complete; production activation and live quality evaluation pending.  
Feature contract: [Composer repair memory](../features/COMPOSER_REPAIR_MEMORY.md).

## 1. Objective and fixed decisions

Improve the existing composer/validator feedback loop using durable evidence and scoped reusable lessons. The user selected PostgreSQL + pgvector alongside MongoDB, automatic activation of verified private lessons, and manual review before generalized lessons are shared across users.

Deliver repair-time retrieval first, then preventive retrieval once it demonstrates value. PostgreSQL and embeddings are part of the first memory implementation; an exact-match-only MongoDB prototype is not the selected approach.

Keep the solution inside existing owners. A validator reports a violation. The transport owns retries. The composer supplies stage context. Server orchestration coordinates optional memory. PostgreSQL stores evidence and guidance. Apertus proposes text; application checks determine eligibility.

Apply [IMPORTANT](IMPORTANT.md) to any interface changes and preserve the no-hardcoding, existing-runner, and bounded-verification principles in [030](030-APERTUS-CREATION-AND-FOLLOW-UP-LOOP.md). This work needs no new learner interface. The operational extraction command described below is feature functionality, not a standalone evaluation harness.

## 2. Inspected baseline and integration map

Paths below are relative to `src/web/` unless explicitly stated. Recheck the current source before implementation; [032](032-AUTOMATIC-LEARNER-PRESENTATION.md) also changes composer context.

| Existing owner | Current behavior | Required change or preserved contract |
| --- | --- | --- |
| `src/app/api/apertus/route.ts` | Delegates to generation HTTP handling. | Keep route thin. |
| `src/simulations/creation-and-editing/input/api.ts` | Parses bounded input; handles JSON and NDJSON; supplies trace/progress callbacks. | Derive verified memory scope on the server and finalize evidence consistently in both response paths. Preserve one terminal result. |
| `pipeline.ts` in the same directory | Owns request orchestration, budget, final result validation, and optional construction publisher. | Record the final server outcome after all applicable final checks. Inject optional request-local memory dependencies. |
| `budget.ts` | Holds deadline, frozen model configuration, call/repair limits, and trace. | Preserve path-specific limits, including edit-specific overrides. If memory is carried here, use one typed request-scoped field, not a service container. |
| `input/inference/transport.ts` | Parses/verifies responses, constructs fresh repair context, stops repeated invalid responses, and bounds calls/context. | Add a narrowly typed optional async repair enrichment hook and bounded attempt observation. Keep SQL and embeddings out of transport. |
| `input/inference/stage.ts`, `messages.ts` | Build compact stage context and generic repair feedback. | Pass structured issues and optional memory context without increasing existing prompt bounds. |
| `composer/editPlan.ts`, `editArguments.ts` | Call transport directly and provide edit-specific feedback/verification. | Reuse their error classification and accepted-plan context. Preserve scoped fields, current values, and deterministic derived edits. |
| `composer/configureAssembly.ts`, `operationArguments.ts`, `choosePresentation.ts` | Also call structured transport directly. | Audit these callers; opting into memory cannot depend solely on `requestStage`. Start with supported argument/configuration stages. |
| `composer/create.ts`, `createFromAssemblies.ts`, `composeFromComponents.ts`, `edit.ts` | Coordinate different creation/edit strategies. | Capture stage outcomes across selected paths and retain finalization, transactions, and bounded reselection. |
| `validator/edit.ts` | Has `EditValidationError`; validates isolated edits/runtime commands. | Preserve existing code prefixes used by reselection. Add stable issue metadata without changing control-flow classification. |
| `diagnostics.ts` | Development-only in-memory traces, capped at 50 requests/240 events. | Keep useful debug behavior. It is not the durable evidence store and must not be enabled wholesale in production. |
| `input/progress.ts`, `input/eventStream.ts`, `input/browser.ts`, `runtime-engine/RecipeSession.ts` | Interpret trace/progress and protect transport/session acceptance. | Audit compatibility. Memory events must not become learner-facing progress steps or bypass revision/correlation checks. |
| `src/lib/auth/server.ts` | `getLibrarySession()` resolves session identity; session callback rechecks account/session version. | Reuse verified account identity. No new token format or guest authentication scheme. |
| `src/lib/database/client.ts` | MongoDB pool and existing collection setup. | Leave application storage here. Add separate server-only PostgreSQL ownership. |
| `scripts/recipes/verify-contract.cjs`, `scripts/test-loader.cjs` | Existing contract verification entry point and TypeScript loader. | Extend existing verification ownership; do not add another runner. |

Also audit `server.ts` exports, all `planPrompt`/creation/edit callers, package/lockfile changes, `.env.example`, deployment docs, and server/client import boundaries. Memory stays out of recipe serialization, project publication payloads, browser bundles, and Python Laya serving.

## 3. Engineering rules

1. **Improve exact feedback first.** Memory cannot compensate for an error that does not explain the violated contract.
2. **Keep authority local.** Current schema, accepted plan, live state, and validators outrank historical guidance.
3. **Make optional infrastructure fail independently.** Storage/retrieval failure skips memory. It never turns an invalid composition into an accepted result or grants another retry.
4. **Use explicit, bounded data.** Small types, bounded JSON evidence, parameterized SQL, and ordinary functions are sufficient.
5. **Keep identities distinct.** A request occurrence, stage invocation, failure family, and reusable lesson need different keys.
6. **Validate claims rather than confidence.** A model-generated score cannot authorize activation, sharing, or preventive use.
7. **Preserve causality limits.** A valid repair is an observation; it is not proof that the model's explanation or retrieved advice caused success.
8. **Prefer existing dependencies and patterns.** Add a PostgreSQL driver because the chosen database needs one. Avoid an ORM, agent framework, generic repository hierarchy, or vector-search SDK for a few SQL queries.

## 4. Minimal module shape

Proposed locations are ownership guidance, not a requirement to create every file before it has code:

```text
src/web/src/
  lib/repair-memory/
    postgres.ts        # connection pool and concrete parameterized repository
    embeddings.ts      # one configured embedding endpoint, bounded requests
    extraction.ts      # Apertus proposal, verification, activation transaction
  simulations/creation-and-editing/
    memory/
      contracts.ts     # issue, episode, lesson, and small callback types
      context.ts       # evidence projection, applicability, prompt formatting
    ...existing owners amended in place...

src/web/migrations/repair-memory/
  001-repair-memory.sql
src/web/scripts/
  repair-memory.<supported extension>  # process/review/share/retire/cleanup command
```

Use the project's supported script execution mechanism at implementation time; do not make production operations depend on the test loader. A few command subcommands can share one entry point. Add no separate API service, broker, generic job table, or browser management app.

Keep storage and embedding modules server-only. A thin callback type is justified to let stage tests supply deterministic fakes; a pluggable database abstraction is not. If two proposed small files naturally form one cohesive module, combine them.

## 5. Structured validation issues

Use an application-owned shape along these lines:

```ts
type ValidationIssue = {
  code: string;
  phase: "schema" | "semantic";
  path?: string;
  message: string;
  expected?: unknown;
  received?: unknown;
  repairHint?: string;
};
```

This is an illustrative contract, not a new open-ended error framework. Restrict persisted `expected`/`received` values to validated, bounded JSON projections. Add the stage, tool/component identity, schema/contract version, and request context at the stage boundary rather than duplicating them in every thrown error.

Begin with known codes for malformed JSON, unknown fields, invalid values, unknown targets/operations, and accepted-plan violations. Keep unknown exceptions as unclassified evidence. Infrastructure failures are recorded operationally and excluded from lesson extraction.

Reuse `EditValidationError` and existing `repairFeedback` handling. Several existing codes contain dynamic paths or candidate IDs; derive a stable memory family separately. Do not silently change the keys/prefixes that determine repeat detection, per-issue repair limits, or target reselection. Document any intentional repair-key change with a focused regression check.

Prefer codes emitted at the validator source. English-message matching may remain a bounded compatibility fallback while a touched validation path is migrated. Do not refactor every validator to enable the initial feature.

Current response schemas remain the source of allowed keys and values. Lessons must refer to semantic fields or roles and resolve them into current argument IDs; old `setting1`, candidate, operation, or node IDs are not portable instructions.

## 6. Request identity, scope, and capture lifecycle

### 6.1 Scope

When memory is enabled and the deployment is online, resolve the account through existing server authentication. Use a scope such as `account:<verified-id>`. The generation request body supplies no memory owner or sharing controls.

If session resolution fails, skip private memory without treating the caller as another account. Guests may read reviewed shared guidance but do not persist private episodes in version one. Direct/internal planner callers with no server-derived scope default to memory disabled. Do not infer ownership from `requestId` or a browser recipe session.

The initial scope is per account, because that identity already exists. Workspace isolation can replace it only when backed by an existing authorized workspace model; do not invent that model for this feature.

### 6.2 Correlation

Create a server-generated occurrence UUID for each admitted generation, independent of the caller's reusable request ID. Allocate a unique stage invocation ID whenever a stage runs, including repeated configuration calls or target reselection. Identify attempts by invocation plus ordinal.

Preserve the current public request ID for response correlation. Store it as diagnostic metadata only. It is neither a uniqueness boundary for durable ingestion nor an authorization credential.

### 6.3 Capture

Maintain a bounded request-local collection of eligible stage episodes. Capture rejected output, normalized/materialized output where applicable, structured issues, correction attempts, relevant current state, selected contract, and injected lesson IDs. Retain only the fields needed to explain and check the issue. Apply size limits before copying and serializing large objects.

An episode with multiple failures contains a bounded ordered attempt list. Extraction can identify one supported correction per issue family rather than pretending all failures had the same cause. Truncated or incomplete evidence can support diagnostics but cannot support automatic activation that needs the missing facts.

Capture successful stages that used memory as compact outcome records too; otherwise preventive success and first-pass regressions disappear from the evidence. Ordinary successful stages with no memory and no failure need only existing aggregate diagnostics.

### 6.4 Finalization

The request coordinator assigns the final server outcome after `parseGenerationResult` and applicable construction finalization/publishing checks complete. Both JSON and NDJSON paths use the same finalization behavior. Record failed/cancelled/unsupported/clarification outcomes accurately; these do not qualify repaired episodes for automatic activation.

Eligible successful outcomes are validated `created`, `updated`, and `runtime_action` results with their relevant semantic checks. `runtime_action` means commands passed isolated server validation, not that a browser has executed them. Likewise, server-valid recipes can still be rejected by browser revision checks. Do not add a browser acknowledgment protocol just to inflate the success label.

Flush final episodes with one bounded, awaited repository operation before the handler completes. On controlled failure/cancellation, make one short best-effort flush using a cleanup deadline; never keep generating or retry writing indefinitely. An abrupt process crash can lose an in-flight episode. Accept that initial limit rather than adding a write-ahead event system.

A database error is reported through bounded operational diagnostics and does not replace the generation's result/error. Preserve terminal response semantics. Do not rely on detached promises after response completion.

## 7. PostgreSQL model: two feature tables

Use two domain tables. A migration ledger, if the deployment needs one, is migration infrastructure rather than another memory subsystem.

### 7.1 `composer_repair_episodes`

| Field group | Content |
| --- | --- |
| Identity | Episode UUID, server occurrence UUID, stage invocation ID, private scope, stage, creation time. |
| Compatibility | Component/tool identities and versions, stable contract key, composer/prompt revision, generating model identity. |
| Evidence | Bounded JSONB context and ordered attempts; issues, checks, normalization notes, selected lesson IDs/revisions. |
| Outcome | Stage outcome, final server outcome, and evidence completeness. |
| Extraction | Pending/processed/skipped state, bounded processing failure count, last failure code, associated lesson IDs. |
| Retention | Expiry time for raw evidence. |

Unique occurrence plus invocation prevents duplicate flushes. Use an idempotent upsert that cannot replace a known terminal outcome with a partial record. No credentials, endpoint tokens, full conversation dumps, or browser publication data belong here.

### 7.2 `composer_repair_lessons`

| Field group | Content |
| --- | --- |
| Identity | Lesson UUID, non-null scope key, deterministic lesson key. |
| Eligibility | Candidate/active/retired status; separate preventive eligibility flag. |
| Applicability | Stage, issue family, tool/component, contract key, supported structured conditions. |
| Guidance | Bounded `when`, `avoid`, and `do` text plus application-verifiable correction kind/facts. |
| Evidence | Origin episode reference where retained and a minimal de-identified verification summary; no unlimited list of raw episodes. |
| Embedding | `vector(D)` plus embedding model/version; `D` is chosen with the actual embedding deployment. |
| Lifecycle | Created/updated timestamps, lesson revision, extractor revision, retirement reason. |
| Shared review | Reviewer identity, review timestamp, sanitized source reference, and approved content digest for shared copies. |

Use `scope_key = 'shared'` for a reviewed shared row; private rows retain account scope. Enforce uniqueness on `(scope_key, lesson_key)`. Use checks for allowed states, bounded fields, and mandatory review metadata on active shared rows. An application check must also confirm the reviewer is authorized; a database timestamp is not proof of authorization.

Initial indexes should serve actual reads: scope/stage/contract/status filtering and pending-episode selection. Avoid JSONB indexes until a query needs them. No HNSW or IVFFlat index is required initially: pgvector offers exact nearest-neighbor search by default. [pgvector querying documentation](https://github.com/pgvector/pgvector#querying)

Use one reusable small connection pool per server process. Bound pool acquisition, SQL execution, and statement duration; a JavaScript timeout alone must not leave unbounded queries running in the pool. Use explicit columns and parameterized values, never SQL assembled from prompts or model text. [node-postgres query documentation](https://node-postgres.com/features/queries)

Run activation/upsert and episode-processing completion in one PostgreSQL transaction on the same checked-out client. Generation/model requests run outside that transaction. Always rollback/release on failure. [node-postgres transaction documentation](https://node-postgres.com/features/transactions)

## 8. Deterministic identities and duplicate prevention

### 8.1 Failure family

Hash a canonical serialization of:

```text
fingerprint format version
stage
stable issue code
tool/component identity and version
compatible contract key
normalized semantic field path
```

Use the platform crypto library and a small canonical serializer for this bounded shape. Sort object keys; retain meaningful array order. Test it against equivalent reordered objects.

Exclude request IDs, timestamps, generated IDs, and prompt wording. Normalize incidental indices and map ephemeral argument IDs through the current stage contract to stable fields. Do not erase meaningful roles such as input versus output, model A versus model B, or quantities with different units.

The contract key must include stable schemas and validator behavior revisions that affect advice. Exclude transient instance labels/current values; preserve enum/range/unit semantics and component versions. Do not hash the whole live request and call it a reusable contract. Bump the explicit validator revision when semantics change without a schema change.

### 8.2 Lesson identity

Derive a lesson key from the failure family plus verified applicability and a normalized correction kind/parameters. Scope is part of the unique database key. Natural-language wording and embeddings are not identity fields.

An example correction kind might represent preserving unselected fields during a configuration patch. Its scope and field relationship must be established from the accepted plan and observed repair. It must not be arbitrary model-supplied executable logic.

For equivalent structured corrections, upsert the existing lesson. Preserve approved wording/review status unless intentionally revising it. A changed correction is a new candidate or revision, not an unnoticed rewrite of trusted guidance.

For ambiguous semantic duplicates, keep candidates inactive rather than merging by cosine similarity or creating multiple active paraphrases. Reuse an existing structured correction identity only after its applicability and correction facts match.

### 8.3 Exactly-once effects from repeatable processing

The extractor can run more than once, but database effects must be idempotent. Within the transaction, lock/recheck the episode's processing state, upsert lessons, link the episode to resulting lesson IDs, and mark processing complete. A second process encountering an already processed episode does not add support again.

Do not maintain a success counter by incrementing on every extraction attempt. Derive recent independent support from distinct server occurrences linked to the lesson, or update a bounded summary only as part of first-time processing. Several attempts/stages in one request do not count as independent supporting requests.

## 9. Apertus extraction and automatic activation

### 9.1 A small operational batch

Implement a bounded command that processes pending finalized episodes. Deploy it as a scheduled invocation only when enabling the feature in a running environment. This document does not create a schedule or invoke a provider.

Start with one configured worker invocation at a time and a fixed batch size. Episodes themselves are the backlog. Select work in stable order, skip ineligible outcomes, and cap retries for provider/embedding failures. Mark repeatedly failing items for inspection instead of creating an endless retry queue. No broker or distributed worker framework is required.

A crashed batch leaves episodes retryable. Final transaction checks make duplicate processing harmless even if two invocations overlap. Do not hold row locks while waiting for Apertus or embeddings.

### 9.2 Proposal contract

Use the existing structured inference transport with a small extraction schema and explicit Apertus configuration. Do not silently use whichever provider happened to generate the original episode. Retain the source model as provenance. Give extraction its own bounded call/deadline budget, disable memory hooks for extraction, and prevent it from generating lessons about itself.

The input contains sanitized relevant context, failure/correction pairs, check outcomes, and candidate existing corrections from the same family. Treat all quoted text as untrusted data. The output may be `no_lesson` or one bounded proposal with applicability, avoid/do guidance, and evidence references.

Identity, owner, activation state, shared status, review metadata, and confidence are not model-controlled fields. Reject unknown keys and unsupported correction kinds. A model response can never supply SQL, arbitrary predicates, JavaScript, or new tool permissions.

Known schema repairs use the existing deterministic hint directly. Persist a lesson only when there is reusable contextual information beyond repeating the current contract.

### 9.3 Verification gates

Automatic activation requires:

1. Complete bounded evidence and a valid private scope.
2. A real rejection followed by a corrected output under the same stage constraints.
3. The relevant issue resolved and required stage checks passed.
4. Successful final server validation, with no unsupported claim of browser activation.
5. A supported applicability/correction category whose facts can be checked against the accepted plan, relevant state, and before/after output.
6. No dropped requested fields/behavior, expanded operation scope, relaxed schema, or changed success criterion.
7. Valid bounded guidance and an embedding from the configured embedding version.

Use a short explicit set of checkable correction cases and ordinary functions. Do not build a generic rule interpreter. A JSON-shaped natural-language claim is still unverified. If arbitrary prose adds claims beyond the verified correction, keep the proposal as a candidate or render active guidance from the verified facts instead.

Existing validator outcomes should be captured during generation. Recheck pure contracts where helpful; never replay real runtime commands, publication, or other side effects in the extraction worker. When existing normalizers changed the output, record that distinction so the system does not attribute an application fix to Apertus.

Unverifiable semantic/scientific explanations remain candidates automatically; they do not block the user's generation. This is compatible with automatic activation: activation is automatic for supported proofs, not for every fluent explanation.

### 9.4 Lifecycle and retirement

Use `candidate → active → retired`. Preventive eligibility is separate from status. Do not automatically resurrect retired guidance when a matching episode reappears.

Contract/validator incompatibility excludes a lesson immediately at retrieval. Retire or reverify it through the operational command. A confirmed contradiction withdraws it; an unrelated subsequent failure does not prove the lesson harmful. Shared text changes clear prior approval until reviewed again.

## 10. Retrieval and prompt integration

### 10.1 Scope and applicability before ranking

Query only active rows visible to the current server-derived scope: the current account plus approved shared rows, or shared rows alone for guests. Include parentheses around scope alternatives so later filters apply to both. Apply stage, compatible contract/component, supported conditions, and current embedding-version filters.

After rejection, require an applicable issue family first. Prefer exact correction applicability and then rank by vector distance. Before composition, require preventive eligibility and use accepted intent plus selected capabilities to form the query. Do not query every memory at the initial raw-prompt boundary.

Private/shared copies of the same lesson should occupy one context slot. If compatible lessons contradict one another and current facts cannot resolve them, omit the conflicting guidance. Do not add another model call solely to arbitrate memories.

Use parameterized cosine-distance queries over the filtered population. Start with exact search; if approximate indexing is introduced later, recheck filtered recall rather than assuming index results cover all eligible rows. [pgvector filtering documentation](https://github.com/pgvector/pgvector#filtering)

### 10.2 Embeddings

Choose one actual embedding endpoint/model/version and fixed dimension before writing the production migration. Apertus text generation does not imply embedding support. Use one small adapter with `fetch`, cancellation, response byte limits, vector dimension checks, finite-number checks, and rejection of zero vectors for cosine retrieval. Reuse an installed suitable client only if it simplifies the implementation.

Embed a stable summary of applicability, failure pattern, and correction. Do not embed entire raw traces. Query summaries should use semantic intent and relevant tool/field context without private values unnecessary for matching.

Lesson and query vectors must come from the same embedding version. A model/dimension change requires a deliberate re-embedding migration; never silently mix vector spaces. Pin the deployment revision as well as a mutable model alias where available.

Choose a provider appropriate to private evidence; adding a hosted endpoint is an explicit data-flow decision. Server-only configuration owns the endpoint/key. No caller-supplied URL and no automatic remote fallback for offline deployments.

### 10.3 Bounded retry enrichment

Keep `repairFeedback` responsible for immediate synchronous issue details. Add a separate optional asynchronous enrichment callback only if needed by transport. This callback receives the issue plus immutable stage context and the remaining deadline; it returns bounded lesson guidance. Storage stays in the injected implementation.

Do not replace the original prompt with a retrieved example. Add a clearly delimited advisory section alongside the exact repair issue. Its fields are not response-schema fields. The current contract, accepted plan, allowed tools, and original request remain authoritative.

Cache retrieval within a request by stage context plus issue family. On repeated rejection of the same family, reuse the lookup rather than embedding again. A changed issue may trigger another lookup within the same total memory-time allowance. Discard prior issue-specific guidance when rebuilding a fresh retry.

Use these initial engineering bounds, then adjust only from measurements:

| Bound | Starting policy |
| --- | --- |
| Lessons per inference call | At most two, with no minimum fill. |
| Combined guidance | At most 1,200 characters; measure actual token cost where usage is available. |
| Total interactive lookup time | At most 750 ms per generation, further limited by the remaining generation deadline. |
| Final evidence flush | At most 250 ms with bounded connection acquisition and query execution. |
| Stored episode evidence | At most 24 KiB per stage; at most eight persisted stage episodes per generation. |
| Batch extraction | At most 20 episodes per invocation; one proposal per verified issue family, with a small per-episode cap. |

These are proposed constants, not measured SLOs or a new configuration surface. Bound in-memory evidence too; prioritize failed/repaired stages when the cap is reached and mark completeness. If lookup is unavailable, exact validator feedback still runs. If guidance would exceed the existing stage/transport context bounds, omit guidance rather than raising those bounds or removing required schema/context.

### 10.4 Preventive eligibility

Start preventive retrieval disabled at rollout. A practical initial eligibility rule is at least three supporting server occurrences from independent requests with matching verified correction facts, plus passage of the held-out evaluation for that correction category. This is a conservative rollout heuristic, not statistical proof.

Once a category is enabled, private lesson eligibility can update automatically from evidence. Do not count repeated ingestion or retries in one request as support. Retain repair-only use where there is no reliable preventive applicability check.

## 11. Review, sharing, retention, and deletion

Provide a small privileged command to inspect a lesson's safe summary and evidence, create a sanitized shared copy, or retire a lesson. Production generation cannot call the sharing operation. Restrict that operation through deployment credentials/roles or an existing administrative authorization boundary, not a public request flag.

Sharing creates a new row with shared scope, reviewed content digest, reviewer identity, and timestamp. Retain only a non-public provenance reference. Do not widen the private episode's visibility or attach raw evidence to shared retrieval. Automatic extraction cannot rewrite an approved shared row. A revision needs renewed review.

Apply account scope to every private repository operation, including evidence inspection, cleanup, and deletion. Use repository tests with two accounts and overlapping lesson keys. A server-only parameterized repository is the initial enforcement boundary; introducing RLS later requires a deliberate pooled-connection identity design, not a decorative policy.

Proposed retention: expire raw episode evidence after 30 days through the same operational command. Keep a bounded de-identified proof summary for active lessons so their verification remains inspectable after expiry. Do not retain private content indefinitely under the label of a summary. Retire guidance whose proof cannot be retained safely or reproduced.

Account deletion must remove private episodes and private lessons. Shared sanitized rules follow their explicit review/retention policy; private evidence is not preserved merely to keep a link alive. MongoDB and PostgreSQL do not have a cross-database transaction here: use an existing deletion workflow if present, otherwise provide an idempotent owner-purge operation and documented retry/reconciliation. Retrieval already revalidates account identity and must not expose orphaned rows.

## 12. Deployment, migrations, and failure behavior

Add a pinned PostgreSQL driver dependency and corresponding types only if required. Do not add a vector SDK, ORM, or migration framework solely for these two tables. Use versioned SQL and the deployment's migration mechanism; if none exists, provide an explicit transactional migration command/runbook. Do not run DDL during ordinary generation requests.

Provision a supported PostgreSQL/pgvector combination with persistent storage, restricted network access, a small connection pool, and backups. Pin the selected versions in deployment documentation at implementation time. Application credentials should not need extension-install or schema-owner privileges.

Keep the initial configuration small: feature mode (`off`, `record`, `repair`, `prevent`), server-only database URL, and embedding endpoint/model/credentials as actually required. Extraction uses existing Apertus configuration with its own bounded execution. Prefer constants for retrieval limits until operations demonstrate a need to tune them.

`off` performs no memory identity/database/embedding work. `record` captures evidence and permits bounded batch processing but injects no guidance. `repair` adds rejection-time retrieval. `prevent` additionally permits eligible preventive retrieval. Raw evidence storage must not depend on the development diagnostics flag.

When `OFFLINE=true`, skip this feature entirely in the initial implementation. Preserve the Raspberry Pi deployment's current offline boundary; adding local PostgreSQL and embeddings there is a separate deployment task.

| Failure | Required result |
| --- | --- |
| PostgreSQL missing, unavailable, or timed out | Continue ordinary generation; record a bounded operational reason. |
| Embedding unavailable or incompatible | Skip semantic guidance; optionally use fully applicable exact corrections already available without embeddings. Do not claim vector retrieval succeeded. |
| Extraction/provider failure | Leave evidence retryable within the bounded processing policy. User generation is already complete. |
| Malformed or unsupported lesson | Keep inactive or record `no_lesson`; never inject it. |
| Memory text exceeds context budget | Drop memory text, preserving original request and contract. |
| Cancellation/deadline | Stop lookup and inference; do not grant replacement retries. |
| Existing validator failure | Existing rejection/repair behavior remains authoritative. |

Rollback is setting mode to `off` and stopping batch extraction. Keep stored data for inspection under retention; do not make rollback drop PostgreSQL tables or alter existing MongoDB records.

## 13. Implementation sequence and completion gates

### Step 1 — Structured evidence and ownership

Add stable issue metadata to the initial supported stages, verified server scope, distinct occurrence/invocation identities, and bounded episode collection/finalization. Preserve current feedback and all HTTP/progress behavior. Select the embedding deployment and dimension so the schema is concrete.

Gate: fixtures demonstrate rejection → correction → final outcome without conflating requests, attempts, browser acceptance, or account identity.

### Step 2 — PostgreSQL persistence and embeddings

Add migrations, concrete repository, configuration, pool limits, and the single embedding adapter. Implement idempotent episode writes, private/shared query boundaries, and retention/purge operations. Keep mode `record` while integrating.

Gate: isolated PostgreSQL checks prove duplicate writes, account isolation, transaction rollback, dimension/version validation, and bounded outage handling.

### Step 3 — Extraction and private activation

Add the bounded operational processor, proposal schema, supported correction checks, deterministic lesson identity, and atomic activation/processed-state write. Add inspection, shared-copy review, and retirement subcommands without a dashboard.

Gate: a verifiable repair activates automatically; unsupported claims, final failures, incomplete evidence, and repeated processing cannot create trusted duplicate guidance.

### Step 4 — Repair retrieval

Inject the optional async enrichment hook through supported generic and direct composer calls. Add scoped vector lookup, request-local caching, two-lesson/context/time caps, and lesson-use diagnostics.

Gate: an applicable correction reaches the retry; unrelated/private/incompatible/retired lessons do not. Existing call limits, repeat detection, target reselection, and failed-state preservation still hold.

### Step 5 — Measured preventive retrieval

Compare existing behavior, structured feedback alone, and repair retrieval. Enable `prevent` only after the correction-category evaluation supports it, then measure the additional effect of initial guidance.

Gate: improved outcomes justify the additional latency/context on held-out requests, with no accepted isolation or scope regressions. If evidence is inconclusive, ship repair-only mode and document preventive retrieval as pending.

## 14. Proportionate verification

Extend the existing contract runner and its fixtures; no new standalone verification framework. Keep logic tests deterministic with fixed clock/UUID/model/embedding responses where needed. Use the real PostgreSQL adapter for the persistence cases because a mock cannot prove SQL filtering or transaction behavior.

| Area | Necessary checks |
| --- | --- |
| Issue compatibility | Existing edit-error prefixes/reselection preserved; malformed/schema/semantic failures distinguishable. |
| Identity/deduplication | Reordered equivalent data yields the same key; transient IDs do not split a family; distinct fields/units/corrections do not collide. |
| Episode lifecycle | Multiple invocations/attempts, final failure after successful repair, cancellation, normalization, incomplete evidence, and both HTTP response modes. |
| Activation | Known verified correction activates; uncheckable prose, dropped scope, infrastructure failures, and model-controlled status are rejected. |
| Persistence | Idempotent flush, concurrent repeated processing, rollback, no double support count, correct owner predicates, reviewed shared constraints. |
| Retrieval | Exact applicability precedes vectors; incompatible versions, zero/invalid vectors, no match, conflicting lessons, and private/shared duplicates. |
| Resource limits | Memory timeout/outage, context cap, batch cap, existing inference budget, repeat termination, and no pending unbounded SQL work. |
| Lifecycle/security | Shared revisions require review, retired lessons stay retired, account purge, bounded evidence retention, and no private data in serialized recipes/results. |

Use the existing test command and type check once the focused checks pass. Run the production build once when adding dependencies/server modules to check bundling boundaries. Recipe generation checks are needed only if registry/generated recipe sources change; this feature should not require those changes.

Database integration uses a clearly isolated disposable database with its own URL. No production test mutations. Live inference evaluation goes through the actual application with its configured provider and representative existing create/edit scenarios, following 030's browser-based verification requirement. Inspect valid results and meaningful interactions, not just a successful HTTP status. Do not embed evaluation prompts, case IDs, or example numbers into production logic.

Hold out independent requests and similar-but-inapplicable cases from extraction evidence. Fix starting state and model settings, freeze the lesson set during a comparison, and record variation across repeated trials when claiming improvement. Track first-pass validity, final checked correctness, repeated issues, provider calls/tokens, added latency, and retrieval misses. A retrieved lesson followed by success is an association, not causal attribution.

The original documentation task used source and link inspection only. Implementation verification and its limits are recorded below; it must not be confused with live inference evaluation.

## 15. Decisions to resolve before implementation completion

- **Embedding deployment:** actual provider, model revision, dimension, private-data handling, and measured latency. This document deliberately does not invent an available embedding service.
- **PostgreSQL deployment:** managed or self-hosted location, supported extension version, connection budget, migration execution, and backup ownership.
- **Operational execution:** where the bounded extraction/cleanup command runs and which trusted identity can approve shared copies. Automatic learning requires that command to be deployed, not merely committed.
- **Evaluation thresholds:** acceptable added latency and the minimum observed improvement for enabling preventive mode, measured against the project's actual workloads.

These choices do not reopen the selected architecture. Set concrete deployment values while implementing instead of introducing provider registries, generic configuration layers, or speculative infrastructure.

## 16. Definition of done

- Two feature tables and one concrete repository support durable, scoped, idempotent evidence and lessons.
- Supported private lessons activate automatically from verified correction evidence; unverified claims stay inactive.
- PostgreSQL/embedding failures preserve ordinary generation and all existing validation/retry boundaries.
- Repair retrieval works through supported creation and edit paths, including direct transport callers.
- Shared guidance is a separately reviewed sanitized copy; raw private evidence never becomes shared retrieval context.
- Deduplication, compatibility, retirement, retention, deletion, and rollback have working ownership and focused checks.
- The embedding service, migrations, and bounded extraction invocation are configured and documented for the actual deployment.
- Results distinguish deterministic correctness checks from live model quality and server validation from browser acceptance.
- Preventive mode is either supported by evidence or explicitly left disabled; its existence is not claimed as demonstrated benefit.
- No new planner, agent framework, generic rule engine, broker, dashboard, MongoDB migration, or unrelated simulation feature is introduced.

## 17. Implemented scope and verification evidence

Implementation adds `lib/repair-memory/{config,embeddings,postgres,runtime,extraction}.ts`, the small `memory/{contracts,context}.ts` contracts/helpers, one versioned SQL migration, and the `pnpm repair-memory` operational command. Existing budgets, generic stage transport, direct argument/configuration calls, and both HTTP response modes share the optional memory lifecycle. Structured schema errors preserve existing messages and repair/reselection behavior.

The first automatic verifier supports two proof categories: an undeclared argument envelope corrected to the current flat contract, and numeric strings corrected to the same numeric value. Raw evidence is bounded; incomplete/normalized-only evidence and unsupported semantic explanations cannot activate advice. Apertus selects useful verified patterns, and the application renders their safe wording. This deliberately does not claim automatic scientific or arbitrary intent verification.

PostgreSQL uses two feature tables, parameterized filtered exact vector search, idempotent ingestion/processing, short interactive SQL bounds, and separate operational credentials. The migration fixes the vector dimension at 384. The endpoint/model/revision must be configured; no embedding weights are downloaded or remote service chosen implicitly.

The operational command implements migration, processing, scoped listing/inspection, digest-confirmed sanitized sharing, retirement, evidence-gated preventive enablement, expiry cleanup, and idempotent private-scope purge. [The runbook](../../../deploy/repair-memory/README.md) contains the actual configuration and least-privilege grants. A real-role test identified the need for `SELECT (id)` alongside episode `INSERT`; raw episode reads and lesson writes remain denied to the web role.

Executed checks on 2026-10-13:

- TypeScript `tsc --noEmit` passed.
- Biome checks passed for new feature modules and operational/test code; existing touched composer files retain their pre-existing non-null-assertion warnings.
- A production build passed with `next build --webpack`, including route compilation, type checking, static generation, and build tracing. The sandboxed default Turbopack build stalled without progress and was stopped before the supported webpack retry.
- The existing contract runner executed and passed the repair-memory assertions, including real transport feedback/injection, explicit extraction-provider selection, malformed proposals, vector/response bounds, private scope, failed finalization, and incomplete evidence.
- A dedicated PostgreSQL 16/pgvector 0.8.1 container on loopback port 55447 exercised migration, repeatable writes, concurrent duplicate processing, rollback, account isolation, actual runtime/worker privileges, batch extraction with deterministic provider responses, reviewed sharing, retirement, and independent preventive support. These checks used a disposable database, not application/production storage.
- The full existing `pnpm test` run remains red on its projectile candidate-ranking assertion (`candidates.ranked.every(...matchInputBinding("angle"...))`). Running the original runner reproduced that same assertion before this feature's test integration. Its unrelated production behavior was not modified.

No live model-quality improvement, hosted embedding performance, browser acceptance of memory-assisted results, deployed extraction schedule, or production database activation is claimed. Mode remains off by default; preventive use additionally requires independent support and an explicit held-out evaluation declaration. Actual deployment provisioning and ongoing extraction scheduling are operational completion steps, not services automatically started by these code changes.

## 18. Local provisioning and browser follow-up

Local PostgreSQL, restricted roles, strict review-metadata upgrade, pinned MiniLM embeddings, and repair-mode environment configuration were subsequently provisioned. A Playwright benchmark created and opened the pendulum lesson with full coverage and zero repairs. The rerun full suite passed the memory/database checks before the known projectile-ranking assertion stopped it. See the [execution report and screenshots](033-validation/report.md) for exact evidence and limits. Learning/retrieval were not exercised by this successful first-pass browser run, and ongoing extraction scheduling remains unfinished.
