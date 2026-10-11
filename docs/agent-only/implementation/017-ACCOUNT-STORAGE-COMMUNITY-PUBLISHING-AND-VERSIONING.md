# Account Storage, Community Publishing, and Versioning

Status: implemented in the workspace; validation and deployment requirements are recorded in `017-validation/implementation-report.md`.

Date: 2026-10-09

Reviewed baseline: `dev` at `9fad137`, including PR #5 (`d8c414f`, simulation-builder LLM integrations) and PR #6 (`9fad137`, main into dev).

## 1. Purpose and intended outcome

Make storage predictable, keep account data private until explicitly published, and let people share runnable experiments and reusable compositions through a dedicated community page.

The product must distinguish three actions:

- **Save locally:** retain guest work in this browser or download a portable JSON copy.
- **Save to account:** update the owner's private project in MongoDB.
- **Publish:** create an immutable public snapshot with its own name, identity, and version.

Editing a private project must never change an existing community publication. Publishing the edited project creates a new version with a different public name. Creating, running, and locally saving projects remain available without an account.

## 2. Requirements and proposed defaults

### Confirmed requirements

1. Only authenticated users can save project content to the application database.
2. Guests can save locally and download recipes, with clear notice that they cannot publish to the community.
3. Authors can explicitly mark a project as permitted for community sharing.
4. Publication is a separate action from private saving.
5. Editing published work produces an editable private working copy; existing public content stays unchanged.
6. Subsequent publications receive a new version and a different public name.
7. Duplicate names are detected and explained to the user.
8. New/Restart controls are easy to find and provide a blank canvas.
9. Destructive workspace transitions offer save/publish opportunities and cancellation.
10. Provide a dedicated community page and sharing for compositions as well as experiments.

### Proposed implementation defaults

These defaults make the plan concrete; they are product choices rather than previously existing functionality.

- A composition means a reusable component assembly, including exposed parameters, ports, and dependency recipes.
- Private names are unique per owner and project type. Public names are unique per author and project type. Different authors may use the same title.
- Guests may browse and run community projects and copy them into local workspaces.
- Checking sharing permission does not itself publish anything.
- Public descriptions and tags can be changed only through a new publication version. Withdrawal changes visibility, not snapshot content.
- Account projects require explicit cloud saves; automatic recovery drafts remain local in the initial release.
- Local work moves into an account only through an explicit import action.
- Default public version names use `Project name — Version N`, with an opportunity to choose another unique name.

## 3. Current implementation and prerequisites

### Existing storage

| Content | Current destination | Behavior |
| --- | --- | --- |
| Guest experiments | `localStorage`, `apertus-builder-library-v1` | Explicit local saves |
| Guest compositions | `localStorage`, `apertus-composites-v1` | Local recipe library |
| Builder recovery draft | `localStorage`, `apertus-builder-draft-v1`, with account suffix where applicable | Automatic local recovery |
| Account experiments | MongoDB `simulations` | Authenticated GET/PUT APIs |
| Account compositions | MongoDB `components` | Authenticated GET/PUT APIs |
| Last accepted lesson | `sessionStorage` | Pointer to a saved lesson |
| Remix handoff | `sessionStorage` | Temporary recipe transfer |
| Users and OAuth data | MongoDB authentication collections | NextAuth integration |

The repository already uses owner filters, document validation, unique owner/identity indexes, and atomic expected-revision updates. Preserve these protections.

### Blocking fixes before feature work

- Restore `reopenAcceptedRecipe(ownerId?)` as an asynchronous, account-aware read. Use `loadLibrary(ownerId)`, the matching account-specific session key, and `${ownerId ?? "guest"}:${id}` for revision tracking. Surface read failures instead of swallowing them.
- Reject AI results when the working document has changed since the request began. Use real workspace identity/revision tracking rather than constant builder revisions.
- Inspect the return value of the builder's `edit()` function; report success and clear the prompt only when the change was applied.
- Execute supported builder runtime actions, or return a truthful unsupported message. Do not report an action as applied without executing it.
- Repair the architecture test's reference to the deleted `015-validation/baseline.json`. Restore the intended protection through a maintained fixture or equivalent assertions, rather than merely removing checks.
- Verify the database repository, authenticated API, and browser workflow against disposable MongoDB.

### Baseline validation limits

The prior review confirmed TypeScript errors in lesson reopening. General storage and builder checks passed before the full suite stopped at the missing baseline fixture. Separate generation fault/composition checks passed. Real database round trips were not verified because no test MongoDB instance or `MONGODB_TEST_URI` was available.

## 4. User workflows

### Guest workflow

1. Open the builder and create an experiment or composition.
2. Display: “You're working locally. Save on this device or download a recipe to keep your work. Sign in to save to your account and publish to the community.”
3. Label actions explicitly: **Save on this device**, **Download recipe**, and **Sign in to publish**.
4. Keep recovery drafts automatically in browser storage.
5. Explain that clearing browser data removes local saves; downloading provides a portable copy.
6. Never write guest project content to MongoDB. Backend endpoints enforce this regardless of UI state.
7. Preserve the draft through the sign-in transition and offer an explicit account import afterward.

### Account workflow

1. Load only the current owner's private projects.
2. Create or edit a private project and **Save to account**.
3. Display cloud-save status separately from local recovery status.
4. Optionally enable **Allow this project to be published to the community**.
5. Choose **Publish**, review the exact candidate, and confirm.
6. Continue editing the private project. Label it as having changes since its last publication when appropriate.
7. Choose **Publish new version**, enter a different public name, and create a new immutable snapshot.

### Community reuse

- **Experiment:** view details, run the snapshot, download its recipe, or **Remix in builder**.
- **Composition:** view parameters/ports and dependencies, preview it, download it, or **Add to builder**.
- A remix receives a new private identity and records its public source. It never modifies the source or inherits ownership.
- Attribution survives subsequent publication of a remix.

## 5. Naming and identity

### Separate names from IDs

Use opaque, stable IDs for relationships and URLs. Names are editable display values. Renaming must not alter identity, ownership, revision history, or references.

Use consistent terms in the new model:

| Field | Meaning |
| --- | --- |
| `projectId` | Stable private project identity |
| `ownerId` | Account identity derived from the verified session |
| `projectType` | `experiment` or `composition` |
| `name` | Human-readable display name |
| `normalizedName` | Server-generated uniqueness key |
| `saveRevision` | Private optimistic-concurrency revision |
| `sharingAllowed` | Explicit author permission to publish |
| `publicationId` | Stable identity of one immutable public snapshot |
| `seriesId` | Identity linking versions of a publication |
| `versionNumber` | Monotonically increasing number within a series |
| `sourceProjectId` | Private origin, kept out of public response DTOs |
| `basedOnPublicationId` | Attribution to a public source used for remixing |
| `createdAt`, `updatedAt`, `publishedAt` | Server-generated timestamps |

Keep `saveRevision`, public `versionNumber`, payload format versions, and component dependency versions distinct.

### Name validation

- Proposed display length: 1–100 characters after trimming; define and consistently apply the counting rule.
- Reject empty names, control characters, and line breaks.
- Normalize Unicode with NFKC, trim, collapse repeated whitespace, and use a consistent case-insensitive comparison.
- Preserve the validated display spelling separately from the normalized key.
- Compute normalization on the server; never trust a client-supplied `normalizedName`.
- Private uniqueness key: `(ownerId, projectType, normalizedName)`.
- Public uniqueness key: `(authorId, projectType, normalizedName)`.
- Exclude the current project when checking an unchanged name during an update.
- Show inline availability feedback, then enforce the same rule during the write.
- Translate duplicate-index failures into a structured `409 name_conflict` response.
- Do not silently overwrite or automatically rename a user-entered conflicting name.
- Suggested version names must still pass the final database uniqueness check.

## 6. Target storage model

### Collections

Proposed canonical collections:

- `projects`: private experiments and compositions, distinguished by `projectType`.
- `communityPublications`: immutable content snapshots plus operational visibility metadata.
- `publicationSeries`: version allocation and relationships.
- Existing authentication collections remain owned by the authentication subsystem.

A unified private collection simplifies name uniqueness, lifecycle controls, and consistent APIs. Implement an explicit migration from `simulations`/`components`; do not introduce competing authoritative stores.

### Private project record

Store `_id`, `projectId`, `ownerId`, `projectType`, `name`, `normalizedName`, `description`, `tags`, `payload`, `sharingAllowed`, `saveRevision`, timestamps, optional `basedOnPublicationId`, and optional publication-series reference.

Validate the payload according to project type using existing document/recipe validators. Retain recipe identities and dependency references needed by the existing runtime; the database project's identity is separate from the embedded recipe's identity.

### Publication record

Store `publicationId`, `seriesId`, `versionNumber`, `authorId`, public name and normalized name, description, tags, project type, self-contained payload, payload format version, content hash, `publishedAt`, attribution, and visibility state.

Keep source project identity/revision internal. Public DTOs must not expose account email, authentication records, recovery text, editor-only private metadata, or local storage keys.

Publication content is immutable. Visibility may transition from `published` to `withdrawn`; reactivation, if supported, restores the same snapshot. A new publication must have a new identity, version number, and public name.

### Indexes and bounds

- Unique private project identity and private name indexes.
- Unique `publicationId`, `(seriesId, versionNumber)`, and public author/name indexes.
- Owner/recent indexes for private lists; visibility/type/date indexes for public lists.
- Define bounded page sizes, search length, tag counts, and snapshot size limits.
- Avoid sending full payloads in list responses; retrieve details on demand.
- Document production backup and restore procedures. Concurrency revisions are not historical backups.

## 7. API and authorization

Proposed routes, subject to existing repository conventions:

| Route | Operation |
| --- | --- |
| `GET /api/projects` | Paginated current-owner library |
| `POST /api/projects` | Create private project |
| `GET /api/projects/:projectId` | Read owner project |
| `PUT /api/projects/:projectId` | Update with expected save revision |
| `DELETE /api/projects/:projectId` | Delete private project with conflict protection |
| `POST /api/projects/:projectId/publications` | Publish an exact saved revision |
| `GET /api/community` | Paginated public discovery |
| `GET /api/community/:publicationId` | Read public snapshot |
| `GET /api/community/series/:seriesId` | Visible version history |
| `POST /api/community/:publicationId/withdraw` | Author-only withdrawal |

Requirements:

- Derive owners/authors from server sessions and enforce access on every operation.
- Carry the existing expected-owner guard to reject requests after an account changes.
- Preserve same-origin protections for all mutations, including POST and DELETE.
- Require sharing permission and a valid authenticated account at publication time.
- Revalidate payloads, names, dependency closure, and the expected revision server-side.
- Save the candidate first; publish that exact persisted revision. If the project changes, reject and ask for another review.
- Use idempotency keys for create/publication requests. Retrying after a lost response must not create duplicate snapshots or versions.
- Allocate public versions atomically and never use an unprotected count-plus-one operation.
- Prefer a transaction for series allocation and publication insertion; establish a replica-set-capable test/deployment configuration. If transactions cannot be supported, specify and test an alternative recovery protocol before shipping.
- Return actionable errors: authentication required, permission disabled, name conflict, revision conflict, invalid payload, unavailable dependency, oversized request, and temporary database failure.
- Withdrawal must not expose or delete another author's work. Deleting a private project must not silently remove its publications.

## 8. Publishability and composition portability

Before publishing, build a candidate containing only portable, public content.

- Experiments must pass runnable validation, not merely draft validation.
- Compositions must pass recipe validation and insertion compatibility checks.
- Package all required custom/nested recipe dependencies or reference immutable public dependency versions with an explicit availability policy.
- Detect missing dependencies, cycles, excessive nesting, and incompatible catalog versions.
- Show the author which custom dependencies and embedded datasets will be included. Permission for the root project must not accidentally disclose separately private work.
- Preserve exposed parameters, ports, units, configuration defaults, and recipe metadata during AI edits and serialization.
- Remove transient recovery state and browser-only references.
- Do not accept arbitrary executable JavaScript or HTML as recipe content. Use the established validated component registry.
- Define a format compatibility policy so older published snapshots remain readable or produce a clear unsupported-version message.
- Test withdrawn dependencies and historical versions. A publication should remain runnable through its packaged dependency closure.

## 9. Builder controls and transition handling

### Persistent controls

Place **New experiment** and **Clear canvas** in the primary toolbar, visible at desktop and mobile sizes. Keep save, download, and publish actions discoverable without requiring a hidden file menu.

- **New experiment:** create a new blank project with a new identity.
- **Clear canvas:** clear the current working project's canvas while retaining its identity/name. This is an unsaved edit until explicitly saved; it does not delete cloud or community records.
- Support equivalent composition creation/clear actions in the composition workflow.
- Allow undo for clearing when feasible; creating a separate project resets the document history.

### Unsaved-change dialog

Track dirty state relative to the last successful private/local save, separately from changes since publication.

Offer **Save and continue**, **Discard changes**, and **Cancel** when leaving unsaved work. For eligible account projects, also offer **Publish and continue**, which includes save and publication review. Guests can choose a portable download where appropriate.

Do not clear the current workspace until saving/publishing succeeds. A failed request retains the canvas and displays its reason. Do not treat starting a download as proof that a file was safely retained; continue only after the user's explicit choice.

Apply equivalent handling to template replacement, imports, project opening, and remix activation where they would replace unsaved work. Use browser unload protection only when needed; browsers cannot reliably complete cloud saves during unload.

Track document changes during requests. A save of revision A must not mark later local edits B as saved. Abort/discard stale asynchronous completions after workspace or account changes.

## 10. Community interface

### `/community`

- Experiments/Compositions tabs.
- Search by public name/description, type and tag filters, newest sorting, and paginated results.
- Cards with title, author, project type, short description, version, date, and preview where available.
- Clear loading, empty, failure, and withdrawn-content states.
- Guests can browse; publishing actions direct them to sign in without losing local work.

### Publication detail

- Exact version title, author, description, tags, publication date, and version history.
- Experiment run/remix/download actions or composition preview/add/download actions.
- Composition parameters, ports, and packaged dependencies.
- Attribution and a visible distinction between editing one's own working project and remixing another author's snapshot.
- Author controls for opening the private source, publishing another version, and withdrawal.
- Public URLs use stable publication IDs; optional readable title fragments are decorative.

Before broadly opening public publishing, include a defined sharing/license acknowledgement and a minimal report/takedown process. Comments, likes, follows, rankings, and collaborative editing are outside the initial scope.

## 11. Migration and compatibility

1. Back up existing collections and inventory counts, owners, formats, and invalid records.
2. Define the migration mapping from `simulations.experimentId` and embedded component recipe IDs to stable project IDs.
3. Derive initial names from existing lesson/recipe titles. Report duplicate/invalid names; apply a documented deterministic suffix only for legacy migration and preserve the original title in migration metadata.
4. Preserve owner identity, payloads, timestamps, recovery availability, and revision semantics.
5. Default `sharingAllowed` to false and create no publications from legacy data.
6. Make migration rerunnable and record completion/checksums. Compare counts and representative payload round trips before switching reads/writes.
7. Quarantine invalid records for recovery instead of dropping them.
8. Keep a bounded compatibility period for old library APIs and local storage formats. Update clients and tests together; avoid permanent dual writes.
9. Version any changed local envelopes and migrate in-place only after validation. Retain exportable originals if migration fails.
10. Offer explicit local-to-account import with per-item duplicate handling. Keep local copies until successful saves are acknowledged.
11. Preserve existing saved-project links through an identity mapping or compatibility resolver.
12. Document rollback and do not drop legacy collections until migration verification and the agreed retention period complete.

## 12. Implementation phases and completion gates

### Phase 0: repair and establish baseline

Fix the reviewed regressions, install locked dependencies, restore meaningful architecture checks, and establish disposable MongoDB testing. Gate: TypeScript and required deterministic checks pass; authenticated save/reopen and conflicts work in the browser.

### Phase 1: private storage and names

Implement the canonical model, validation, indexes, migrations, bounded library APIs, composition updates with revisions, guest/account messaging, and explicit local imports. Gate: owner isolation and duplicate names are enforced by the database; guest project writes are rejected.

### Phase 2: builder lifecycle

Add visible New/Clear controls, accurate dirty tracking, save/download status, and transition dialogs. Gate: canceled or failed transitions preserve edits; successful transitions produce a blank canvas with the correct identity behavior.

### Phase 3: publication engine

Add sharing permission, candidate review, dependency packaging, immutable snapshots, atomic versions, idempotency, and withdrawal. Gate: edits cannot mutate public content; races and retries cannot create duplicate releases.

### Phase 4: community and composition reuse

Build discovery/detail pages, version history, runnable previews, downloads, remix attribution, and composition insertion. Gate: independent devices can use publications without accessing the author's private library.

### Phase 5: release verification

Run the end-to-end acceptance matrix, migration rehearsal, failure tests, and accessibility/responsive checks. Record commands, environment, outcomes, and remaining limits in a separate validation report. Gate: no unresolved data-loss, ownership, publication-mutation, or false-success defects.

## 13. Validation matrix

| Area | Required evidence |
| --- | --- |
| Guest storage | Create/save/reopen/download; no guest project DB writes; quota failure retains work |
| Account storage | Real MongoDB create/read/update; another device reopens; owner isolation |
| Names | Case/whitespace/Unicode collisions, rename-self, separate authors/types, simultaneous duplicate attempts |
| Concurrency | Two tabs/devices save the same revision; exactly one succeeds and neither silently overwrites |
| Composition updates | Load, edit, revision-protected update, download/import, independent insertion |
| Account lifecycle | Loading, sign-in/out, expired/revoked session, account switch, and in-flight response isolation |
| New/Clear | Dirty/clean states, save/discard/cancel/publish, failures, keyboard and mobile access |
| AI correctness | Manual edit during generation, rejected edit, cancel, runtime action, metadata preservation |
| Publication | Permission required, review exact revision, name collision, double click, network retry, atomic version allocation |
| Immutability | Edit/rename/delete private source; old snapshot and existing version URL remain unchanged |
| Versioning | New identity and public name, sequential versions, coherent series history |
| Dependencies | Nested custom composition, absent/private/withdrawn dependency, cyclic graph, size/depth bounds |
| Community | Guest browsing, filters/pagination, published-only results, detail errors, remix and attribution |
| Security boundaries | Forged owner/author fields, unauthorized mutations, origin checks, malformed/oversized payloads, private DTO fields |
| Migration | Legacy duplicate names, invalid payloads, rerun, rollback, owner/count/content preservation |

Use real MongoDB for repository uniqueness/concurrency tests and browser/API integration tests; use deterministic inference fixtures for persistence and AI application contracts. Live LLM checks supplement these and do not replace them.

## 14. Definition of done

- Guests understand local storage and cannot publish or save project content to MongoDB.
- Accounts can reliably save, reopen, rename, update, and manage private experiments/compositions.
- Duplicate names produce actionable errors without destroying work.
- New/Clear controls are obvious and all relevant unsaved transitions preserve user choice.
- Sharing is opt-in and publication requires an explicit review action.
- Public content is immutable, portable, and independently runnable/insertable.
- New releases have distinct names/identities and a coherent version history.
- Community discovery and reuse work for guests and accounts.
- Existing work survives migration, with no automatic publication of private content.
- TypeScript, required suites, real database tests, and browser acceptance checks pass with recorded evidence.

## 15. Decisions to settle during implementation

- Final UI terminology: “composition,” “assembly,” or the existing “prebuilt” label.
- Sharing/license acknowledgement wording and who handles public-content reports.
- Whether a publication series may have multiple editable branches or initially one source workspace.
- Final project/snapshot limits, pagination sizes, and name-length counting rule.
- Production MongoDB transaction support and the migration/rollback retention window.

These decisions do not block repairing the existing regressions or implementing account-only private storage. Resolve publication-specific choices before opening public publishing.
