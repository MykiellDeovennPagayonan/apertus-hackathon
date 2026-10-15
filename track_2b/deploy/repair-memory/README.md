# Composer repair memory operations

This feature is implemented in the web backend and defaults to `REPAIR_MEMORY_MODE=off`. It adds PostgreSQL alongside existing MongoDB storage. The Raspberry Pi/offline deployment skips memory completely.

This is an optional operator setup, not part of `make run`. Compose here starts PostgreSQL only; migrations, embeddings, extraction and retention require the steps below. No automatic processing schedule is installed.

All paths in this guide are relative to `track_2b/`. From the submission repository root, first run `cd track_2b`.

## Local PostgreSQL

Set `REPAIR_MEMORY_POSTGRES_PASSWORD` privately, then run from `track_2b/`:

```sh
docker compose -f deploy/repair-memory/compose.yaml up -d
```

The pinned PostgreSQL 16/pgvector 0.8.1 container listens on loopback port 55446 and retains its database in a named volume. Use a managed database or restricted private-network deployment in production; do not expose this local database to the internet. Never use the PostgreSQL superuser as the web application's runtime identity.

Configure the migration URL for `apertus_repair_memory` on that instance. From `track_2b/`, apply the transactional, repeatable initial migration:

```sh
pnpm --dir src/web repair-memory migrate
```

This also reapplies the strict shared-review constraint for existing databases. If an active shared row lacks review metadata, migration fails atomically; review or retire that row before retrying. Verifier revision v2 excludes lessons certified by the earlier value-preservation check.

The command uses `REPAIR_MEMORY_MIGRATION_DATABASE_URL`. Extension/schema privileges belong to that migration identity. SQL runs only through the migration command, never a generation request.

## Database roles

Create separate login roles with passwords from your secret store. The following grants assume the current database, `public` schema, and roles named `apertus_memory_runtime`, `apertus_memory_worker`, and `apertus_memory_admin`. Create the roles and set their passwords through your database administration tooling before applying these grants.

```sql
GRANT CONNECT ON DATABASE apertus_repair_memory
  TO apertus_memory_runtime, apertus_memory_worker, apertus_memory_admin;
GRANT USAGE ON SCHEMA public
  TO apertus_memory_runtime, apertus_memory_worker, apertus_memory_admin;

GRANT INSERT ON composer_repair_episodes TO apertus_memory_runtime;
GRANT SELECT (id) ON composer_repair_episodes TO apertus_memory_runtime;
GRANT SELECT ON composer_repair_lessons TO apertus_memory_runtime;

GRANT SELECT ON composer_repair_episodes, composer_repair_lessons
  TO apertus_memory_worker;
GRANT UPDATE (processing, processing_failures, lesson_ids)
  ON composer_repair_episodes TO apertus_memory_worker;
GRANT INSERT (id, scope_key, lesson_key, stage, contract_key, family, kind,
  guidance, proof, embedding, embedding_version)
  ON composer_repair_lessons TO apertus_memory_worker;
GRANT UPDATE (updated_at) ON composer_repair_lessons TO apertus_memory_worker;

GRANT SELECT, INSERT, UPDATE, DELETE
  ON composer_repair_episodes, composer_repair_lessons TO apertus_memory_admin;
```

The worker cannot supply shared-review columns or change retirement/preventive state. The runtime cannot activate or share lessons. Access to the admin command and its credentials is the reviewer authorization boundary. The repository additionally filters every private operation by its server-derived scope; these roles do not replace those predicates.

Set `REPAIR_MEMORY_DATABASE_URL` to the runtime URL only in the web deployment. Keep migration, worker, and admin URLs exclusively on the operations host. The operational command uses the appropriate privileged URL automatically. The command needs the checkout's existing TypeScript compiler and dependencies (`pnpm --dir src/web install --frozen-lockfile`); it runs on the operations host, not the stripped standalone web image.

## Embedding endpoint

The adapter accepts the OpenAI-compatible `POST /v1/embeddings` shape and requires exactly **384 nonzero, finite dimensions**. A suitable locally served example is `sentence-transformers/all-MiniLM-L6-v2`; its model card specifies 384 dimensions. [Model card](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2)

Provision the endpoint using your existing model-serving setup. No model weights or embedding server are automatically downloaded by this feature. Configure:

```dotenv
REPAIR_MEMORY_EMBEDDING_URL=http://127.0.0.1:PORT/v1/embeddings
REPAIR_MEMORY_EMBEDDING_MODEL=sentence-transformers/all-MiniLM-L6-v2
REPAIR_MEMORY_EMBEDDING_REVISION=ACTUAL_DEPLOYED_WEIGHTS_REVISION
REPAIR_MEMORY_EMBEDDING_KEY=
```

Use a real pinned revision, not the example placeholder. Remote endpoints require HTTPS and an explicit decision about private-data handling. The application embeds concise stage/contract correction summaries, not full prompts or raw evidence. Endpoint URLs are server configuration, never request input; redirects are rejected.

An incompatible vector/model response is rejected. Changing the configured revision excludes old lesson vectors from retrieval and extraction upserts; do not silently change weights behind the same revision. Changing dimension requires an explicit schema and re-embedding migration. This release deliberately supports one embedding adapter and dimension rather than a provider registry.

## Modes and rollout

For local development, `serve_embeddings.py` provides the configured endpoint on loopback port 43104. It uses the pinned MiniLM ONNX weights, 256-token truncation, attention-mask mean pooling, and normalization; it returns real 384-dimensional vectors.

```sh
python3.12 -m venv deploy/repair-memory/.venv
deploy/repair-memory/.venv/bin/python -m pip install -r deploy/repair-memory/requirements-embeddings.txt
deploy/repair-memory/.venv/bin/python -c 'from huggingface_hub import hf_hub_download; [hf_hub_download(repo_id="sentence-transformers/all-MiniLM-L6-v2", filename=f, revision="1110a243fdf4706b3f48f1d95db1a4f5529b4d41", local_dir="deploy/repair-memory/models") for f in ["tokenizer.json", "onnx/model.onnx"]]'
deploy/repair-memory/.venv/bin/python deploy/repair-memory/serve_embeddings.py --check
deploy/repair-memory/.venv/bin/python deploy/repair-memory/serve_embeddings.py
```

These commands run from `track_2b/`. Use embedding model `sentence-transformers/all-MiniLM-L6-v2`, revision `1110a243fdf4706b3f48f1d95db1a4f5529b4d41/onnx-f32-meanpool-v1`, and URL `http://127.0.0.1:43104/v1/embeddings`. Credentials, downloaded weights, and the virtual environment are ignored by Git. This local helper has no authentication and must remain bound to loopback.

| Mode | Behavior |
| --- | --- |
| `off` | No memory identity lookup, embedding requests, or database work. |
| `record` | Capture bounded private repair episodes; inject no guidance. |
| `repair` | Also retrieve applicable lessons after rejection. |
| `prevent` | Also retrieve explicitly eligible lessons before the applicable argument stage. |

Restart the web backend after changing mode or configuration. Start with `record`, process evidence, then use `repair`. Keep `prevent` disabled until held-out evaluation supports it. The database and embedding endpoint are optional to generation: failures skip memory and preserve the existing validator and retry limits.

Verified account sessions supply private scope. Optional identity resolution has a 250 ms deadline; if it times out or fails, the request skips memory. The existing authentication read may finish in the background, but its late result cannot change the request's memory scope. Guests may receive reviewed shared lessons but do not persist private episodes. No browser-supplied account or recipe session can select someone else's memory.

## Processing and review

On the operations host, set `REPAIR_MEMORY_WORKER_DATABASE_URL`, embedding configuration, an enabled memory mode, and the existing local/hosted Apertus configuration. The processor explicitly uses Apertus even when interactive generation uses another provider.

```sh
pnpm --dir src/web repair-memory process
```

Each invocation handles at most 20 finalized episodes, one request at a time. Each episode has a 30-second provider/embedding deadline and at most two supported correction families. Processing failures are capped at three; an unsuccessful item then becomes skipped. An invocation can therefore take several minutes. Deploy this command with your existing scheduler when enabling automatic learning; do not merely commit it and claim background processing is running. No schedule is created by the repository.

The initial verifier supports incorrect argument envelopes and numeric strings corrected to the **same** JSON number. The application renders trusted guidance from verified facts; Apertus chooses which patterns are useful. Unsupported scientific/intent claims stay in private evidence and never become active advice. Final server validation is required; it does not prove browser activation or user satisfaction.

Set `REPAIR_MEMORY_ADMIN_DATABASE_URL` for inspection, review, retirement, cleanup, and purge. List the latest 50 lessons in an account or shared scope, then inspect the relevant lesson:

```sh
pnpm --dir src/web repair-memory list account:ACCOUNT_ID
pnpm --dir src/web repair-memory list shared
pnpm --dir src/web repair-memory inspect LESSON_UUID account:ACCOUNT_ID
```

The output includes the sanitized guidance/proof and content digest. Review that exact output and set `REPAIR_MEMORY_REVIEWER` to your trusted reviewer identity. Then explicitly create the shared copy:

```sh
pnpm --dir src/web repair-memory share LESSON_UUID account:ACCOUNT_ID CONTENT_DIGEST reviewed-sanitized
```

Sharing creates a separate row; it never exposes raw private episodes. Repeating the command is idempotent. Existing shared copies are not overwritten automatically. Retire a private or shared lesson:

```sh
pnpm --dir src/web repair-memory retire LESSON_UUID account:ACCOUNT_ID "Verified contradiction"
pnpm --dir src/web repair-memory retire SHARED_LESSON_UUID shared "Withdrawn after review"
```

Retired keys cannot be automatically resurrected by later extraction. Lessons from incompatible contracts are filtered out regardless of retirement state.

After a held-out evaluation and at least three independent supporting generation occurrences, enable a private lesson for preventive retrieval:

```sh
pnpm --dir src/web repair-memory prevent LESSON_UUID account:ACCOUNT_ID held-out-evaluation-passed
```

The independent support requirement is checked in SQL. The evaluation confirmation is an explicit trusted-operator declaration, not evidence fabricated by the model. Shared copies initially remain repair-only.

## Retention, deletion, and rollback

Schedule the following bounded SQL cleanup through existing operations:

```sh
pnpm --dir src/web repair-memory cleanup
```

Raw episodes expire after 30 days. Active lessons retain only a short de-identified check summary. Back up the PostgreSQL database through your standard database tooling and verify restores; its lifecycle is separate from MongoDB backups.

When deleting an account, call the idempotent purge operation using its verified account ID:

```sh
pnpm --dir src/web repair-memory purge account:ACCOUNT_ID delete-private-memory
```

There is no existing account-deletion HTTP flow in this checkout to attach to. Integrate purge into that flow when it exists, or include it in administrative account deletion now. Retry failed purges; MongoDB and PostgreSQL do not form a distributed transaction. Reviewed sanitized shared rules remain under their separate retention policy.

Rollback is `REPAIR_MEMORY_MODE=off`, a backend restart, and stopping extraction invocations. Keep retained data for diagnosis; do not drop tables or reset unrelated application state.

## Verification

Repair-memory assertions are part of the existing `pnpm --dir src/web test` contract runner. Database checks run only when explicitly pointed at the dedicated disposable test container on **127.0.0.1:55447**, database **repair_memory_test**, with `REPAIR_MEMORY_TEST_CONFIRM=disposable`. Those exact safeguards intentionally reject production URLs.

Set `REPAIR_MEMORY_TEST_DATABASE_URL` to that database and run `pnpm --dir src/web test`. Apply the migration to the disposable instance first using its separate migration URL. Tests exercise SQL idempotency, rollback, scope isolation, reviewed sharing, retirement, and preventive support, alongside deterministic transport/embedding checks. No real provider is used by these checks.

Live quality evaluation remains separate: use the actual application, fixed starting state and model settings, held-out requests, and a frozen lesson set. Compare structured feedback alone against repair memory before claiming a benefit. Historical implementation diaries are omitted from this submission. Contract tests do not establish a live quality improvement.
