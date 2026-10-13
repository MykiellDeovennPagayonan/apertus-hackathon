# Repair-memory full suite and local browser demonstration

Executed on 2026-10-13 using the actual local application and providers.

## Full suite

Ran the existing `pnpm test` command with the isolated PostgreSQL database on loopback port 55447, database `repair_memory_test`, and the explicit disposable-test confirmation.

The catalog, migrated recipes, session persistence, refined activities, rendering lifecycle, gas equilibrium, lever, import boundaries, and repair-memory assertions passed before the runner stopped at `scripts/recipes/verify-contract.cjs:368`:

```js
assert.ok(candidates.ranked.every(entry => matchInputBinding("angle", entry.bindings)))
```

This is the previously reproduced projectile candidate-ranking failure. The suite remains red; tests after that assertion did not execute. No unrelated candidate-ranking behavior was changed.

Repair-memory checks included the exact `arguments.mass: 10` to flat `mass: 1` rejection, changed/dropped envelope data, SQL rejection of missing reviewer/digest/date, idempotent processing, account isolation, privilege separation, reviewed sharing, retirement, and preventive support. They used deterministic model responses and the real isolated pgvector database.

## Local configuration

- PostgreSQL 16 with pgvector 0.8.1 runs on loopback port 55446 with a persistent Docker volume. Initial and strict shared-review upgrade migrations were applied.
- Separate runtime, worker, and admin logins were provisioned with the documented restricted grants. All three configured connections succeeded; the strict shared-review constraint is validated.
- `.env.local` configures repair mode and the database/embedding connections. Existing inference and authentication settings were preserved. Passwords are kept in ignored local files.
- The pinned `sentence-transformers/all-MiniLM-L6-v2` ONNX model serves normalized 384-dimensional vectors on loopback port 43104. Its self-check passed determinism and similarity assertions. HTTP checks passed model identity, dimensions, normalization, extra-field rejection, input bounds, and payload bounds.
- The application runs at `http://localhost:43100`. Existing Apertus MLX and Laya services remained in place. The local embedding service is documented in the [runbook](../../../../deploy/repair-memory/README.md).
- The queue processor ran once and returned `{ processed: 0, failed: 0 }`. An ongoing extraction/cleanup schedule is not installed.

## Playwright demonstration

Submitted benchmark prompt 37 verbatim through the visible Create button:

> Make a pendulum swing where I can adjust its starting angle and length

Used a dedicated local QA account. The email sign-in form is deliberately disabled in this checkout; Playwright authenticated the account using the existing CSRF-protected credentials endpoint and verified the returned account ID. No fabricated session or browser-supplied memory scope was used.

The final captured request was `06fe38bf-ddba-4fde-8c06-3ed803a1f381`. The development diagnostic trace records:

- Terminal status: `created`, at 10,522 ms.
- Four document nodes; full coverage of pendulum motion, starting angle, length, and period.
- Seven model calls, zero repairs, and one decision call.
- No memory retrieval, injection, lookup failure, or flush failure events.

Playwright screenshots show the generated lesson opened in the browser with a swinging pendulum and separate length/starting-angle controls. Visual inspection confirmed the rendered content; this run did not change the controls to measure their response.

| Capture | Screenshot |
| --- | --- |
| Prompt before submission | [Prompt](screenshots/01-prompt.png) |
| Understanding the request | [Understanding](screenshots/02-progress-01.png) |
| Building the lesson | [Building](screenshots/02-progress-02.png) |
| Opened pendulum lesson | [Result](screenshots/03-result.png) |

The first completed UI request, `2d23d8e9-c137-4b4b-91fd-bff414bc9e06`, also returned `created` with full coverage, at 34,776 ms. Its capture failed because Chromium could not return the streaming response body. Another capture attempt was stopped during planning after its harness mistook Next's background alert for a terminal result. The final capture used visible UI screenshots plus the actual diagnostic trace; the runner was closed after those confirmed completion because navigation clears the transient success status. These capture issues are not counted as generation failures or repair events. The faster warmed run is not evidence of memory improvement.

## What this proves

The actual application created and opened the requested lesson with repair memory configured. The local database roles, migrations, embedding endpoint, and queue command are operational.

The prompt passed validation on the first attempt, so validation repair and learned-guidance reuse were **not exercised live**. The QA scope contains zero repair episodes and zero lessons, consistent with recording only failures or memory-assisted stages. No synthetic lessons, failures, or provider outputs were inserted into the application database to manufacture a demonstration.

Learning, repair retrieval, and the two review fixes passed the isolated integration checks. No live improvement claim, preventive rollout, production deployment, or scheduled extraction is established by this demonstration.
