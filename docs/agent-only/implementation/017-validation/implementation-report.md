# Storage and community implementation report

Date: 2026-10-09

Status: implemented and verified in the local workspace. No production database was changed, and no deployment or Git push was performed.

Plan: [017 — Account storage, community publishing, and versioning](../017-ACCOUNT-STORAGE-COMMUNITY-PUBLISHING-AND-VERSIONING.md).

## Delivered behavior

| Area | Implementation |
| --- | --- |
| Guest work | Creation, device-local recovery, local saves, and recipe downloads remain available. Persistent guidance explains that an account is required for cloud saves and community publication. Server endpoints independently enforce authentication. |
| Account storage | Private experiments and compositions use owner-scoped MongoDB records. Explicit saves round-trip complete validated payloads; stale revisions return conflicts. Private lists use bounded pagination and load payloads on demand. |
| Project names | Names use Unicode NFKC normalization, collapsed whitespace, and case-insensitive comparison. Names must contain 1–100 code points and no control characters. Private names are unique per owner/type; public names are unique per author/type. Availability feedback is backed by database uniqueness constraints. Renaming preserves identity. |
| Publication consent | The sharing checkbox is opt-in and defaults to false. Publishing is a separate review action requiring a saved revision, valid nonempty content, and CC BY 4.0 acknowledgement. |
| Public versions | Publications are immutable snapshots. Editing or deleting a private source leaves prior snapshots intact. A subsequent publication receives a new identity, incremented version number, and a different public name. Withdrawal changes visibility while retaining content. |
| Workspace controls | Visible New experiment and Clear canvas controls provide a clean workspace. Unsaved transitions offer save, discard, cancel, download, and publication where available. Clear retains the current project identity; New starts a separate project. |
| Private library | `/projects` provides search, type filtering, metadata and sharing edits, downloads, private deletion, publication review, explicit local import, and recovery of quarantined legacy originals. |
| Community | `/community` lists experiments and compositions with search, tags, and pagination. Detail pages expose previews, version history, attributed downloads, remixes, composition insertion, withdrawal, and reports. |
| Composition sharing | Public compositions include ports, parameters, and their registered component dependencies. They must be fully expanded and portable. Unsupported nested legacy recipes are rejected with guidance rather than published incompletely. |
| Attribution | Download/import/remix flows retain source publication identity and verified author/license provenance. Imported composition identities are assigned to their new private project. |

## Storage design and safety

The canonical collections are `projects`, `communityPublications`, and `publicationSeries`. Authentication collections remain separate. The old simulations/components interfaces are compatibility adapters; new project writes target the canonical store.

Private mutations derive ownership from the verified session, reject account-switch mismatches, validate origin and bounded JSON, and enforce expected save revisions. Creation and publication use idempotency keys and request hashes so retries do not create accidental duplicates. Public responses omit private source identities/revisions, recovery records, email addresses, and idempotency metadata.

Publishing checks the saved source revision and sharing consent inside a MongoDB transaction, allocates a version, and inserts the immutable snapshot atomically. A replica set or Atlas is required. Standalone MongoDB supports private storage but returns a clear publication configuration error.

Legacy migration is non-destructive and can run lazily or through the maintenance command. Per-owner leases prevent competing migrations; receipts retain source hashes, original names, and identities. Timestamps and revisions are preserved. Duplicate legacy names receive deterministic imported suffixes. Invalid records remain quarantined and downloadable. Completion markers prevent deleted canonical projects from being resurrected on subsequent reads.

Local originals remain after explicit account import. Automatic drafts stay device-local; cloud saves are explicit. Save completion cannot overwrite the state of a workspace opened while that request was pending, and edits made during a save remain dirty.

## Merge-related repairs

The plan reviewed `dev` at `9fad137`, including the SimBuilderLM integration merge (`d8c414f`, PR #5) and main-to-dev merge (`9fad137`, PR #6).

- Restored asynchronous account-aware accepted-recipe reopening, correct session/revision keys, and on-demand project retrieval.
- Added real builder workspace identity/revision tracking and rejection of AI responses after intervening document edits. Rejected edits no longer receive successful feedback.
- Builder runtime actions now report their unsupported status accurately and direct users to Try lesson; they are not falsely reported as executed.
- Restored the architecture protection fixture from repository history and repaired the test reference. Protected premade/gas content remains covered.

## Verification completed

| Check | Result and scope |
| --- | --- |
| `pnpm test` | Passed. Existing deterministic checks plus project contracts; includes storage/runtime round trips, protected architecture, and AI integration regressions. |
| `pnpm test:projects` | Passed after final changes. Unicode names, portable exports, public field stripping, guest reopening, rejected/stale AI results, and truthful runtime feedback. |
| `pnpm exec tsc --noEmit` | Passed after final changes. |
| Targeted Biome checks | Passed for new project/API/UI/test files and changed builder integration. |
| `pnpm test:projects:database` | Passed against real MongoDB 7 replica set. Covers ownership, duplicate names, save conflicts, creation/publication retries, concurrent publication, immutable versions, pagination, composition updates, attribution, withdrawal/reporting, migration leases, quarantine, and deletion persistence. |
| `pnpm test:database` | Passed. Existing repository, authenticated API, session isolation, cross-device browser persistence, and stale-save protection. Existing expectations were updated only for intentional name uniqueness and canonical endpoint changes. |
| `pnpm test:projects:browser` | Passed, including the final empty-publication guard. Covers account and origin gates, review/publish/versioning, guest remix/local save, composition insertion, account isolation, New/Clear warnings, and mobile rendering without page errors. |
| Production build | `pnpm exec next build --webpack` passed using an isolated build directory. The default Turbopack build stalled in this environment; the verified production build uses webpack. |

Database/browser tests used uniquely named disposable databases in a local replica set on port 43119. Test runners dropped their databases. Browser verification used Playwright with an installed Chromium executable; the in-app browser runtime was unavailable. A mobile screenshot was also visually inspected. Generated test/build files remain ignored, and temporary Next.js changes to `tsconfig.json` were restored.

No live model-provider acceptance run was performed. Deterministic contracts verified the changed AI integration behavior; they do not establish live model quality. Google OAuth in the deployed environment also requires a real sign-in check; the automated tests exercised real server sessions with test identities.

## Deployment and operating requirements

1. Back up existing data and configure server-only MongoDB/authentication settings. Publishing needs Atlas or a replica set; configure the intended Google OAuth client and callback origin.
2. Run `pnpm db:migrate-projects` to inventory records, then `pnpm db:migrate-projects -- --apply` when ready. Inspect receipts, quarantine counts, and representative migrated projects. Lazy migration remains available.
3. Deploy the verified application and check actual sign-in, private save/reopen, publication, composition import, and account isolation against the deployment configuration.
4. Establish a report-review rotation. `pnpm db:moderate-community` lists reports; its explicit withdrawal command preserves publication snapshots. There is no public administrative API.
5. Schedule backups and verify restore procedures. Revision checks prevent stale overwrites; they do not replace backups.

Rollback to older code reads the retained legacy collections but does not include writes made to the canonical store. Export/reconcile new writes before rollback. Preserve migration receipts and completion markers; blindly rerunning legacy copies can resurrect deleted projects. The README describes controlled quarantine repair and migration retry.

## Scope boundaries

This release provides explicit cloud saving and device-local draft recovery. It does not add automatic cloud autosave, an offline upload queue, collaborative editing, comments, or likes. Legacy library endpoints remain for identified compatibility consumers. Publication rejects empty content and unsupported dependencies, while private drafts may remain incomplete. Hosting configuration, production migration, live OAuth, and operational moderation remain deployment responsibilities.

Operational instructions and commands: [web README](../../../../src/web/README.md).
