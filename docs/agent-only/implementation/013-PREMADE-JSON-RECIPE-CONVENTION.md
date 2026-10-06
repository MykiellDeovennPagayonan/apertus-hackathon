# Strict premade JSON recipe convention and migration

Date: 2026-10-06  
Status: approved target convention; implementation and migration pending  
Scope: all premade experiments, their discovery catalog, and the shared loading, editing, generation, import, persistence, and presentation paths.

Parent contract: [Uniform experiment shell and premade recipes](../features/UNIFORM_EXPERIMENT_SHELL_AND_PREMADE_RECIPES.md).

This document records the eight convention decisions approved by the user. MUST and MUST NOT are acceptance requirements. Existing code is evidence for migration, not an exception to the target. This document does not claim that migration has been implemented.

## 1. Non-negotiable decisions

1. Every premade owns exactly one file: `src/web/src/simulations/pre-made/<slug>/recipe.json`.
2. Each independently selectable experiment has its own directory. Variations with different learning questions or authored compositions are separate recipes.
3. JSON explicitly owns the authored composition. Loading must not generate controls, filter nodes, inject lesson copy, or patch layout.
4. Catalog title, description, icon, category, and order come from that JSON.
5. One shared loader and one shared registry serve all recipes. No experiment-specific loader or shell branch.
6. Migration removes obsolete premade compositions, re-export trees, and duplicate lesson defaults. Required legacy readers have one designated compatibility home.
7. Automated checks enforce paths, contents, dependencies, schema validity, single ownership, and behavioral/visual parity.
8. Premade, generated, imported, remixed, and manually authored experiments converge on the same recipe contract and runtime. Their entry points do not grant different rendering privileges.

The builder is an editor and consumer. It does not own premade source files. The shared component library owns reusable implementations. It does not own the authored Gas Pressure lesson or another selectable experiment.

## 2. Exact premade filesystem contract

The final shape is:

```text
src/web/src/simulations/pre-made/
  gas/
    recipe.json
  projectile/
    recipe.json
  projectile-comparison/
    recipe.json
  counting/
    recipe.json
  ...
```

The tree illustrates the naming rule; it is not authorization to add catalog entries that do not exist.

Rules:

- `pre-made/` contains only immediate experiment directories. No root index, manifest, README, utility, or registry.
- A slug matches `^[a-z0-9]+(?:-[a-z0-9]+)*$`. Slugs describe experiments, not file formats or implementations.
- Each directory contains one regular file named exactly `recipe.json`.
- No nested directories, empty directories, symlinks, hidden files, alternative recipe filenames, or version subfolders.
- No TypeScript, JavaScript, JSX, CSS, Markdown, tests, screenshots, schemas, images, models, or generated bundles inside a premade directory.
- No `index.ts`, `compositions/`, `views/`, `controls/`, `systems/`, or re-export scaffolding.
- Do not create `recipe.ts`, `GasPressureRecipe.ts`, `recipe.generated.json`, or a second runtime copy of the recipe.
- Prior versions belong in version control and compatibility fixtures outside this tree. The current source has one location.
- User-created/imported experiments are persisted through normal application storage. Loading one does not create a repository premade.

Shared visual assets belong under `src/web/public/simulation-assets/`, referenced through versioned resource definitions under `components/resources/`. Tests and captures belong in the paths in §3. Do not embed executable markup or code in JSON to circumvent these boundaries.

## 3. Exact homes for shared infrastructure

Paths below are relative to `src/web/`. New target files are specifications, not claims that they already exist.

| Path | Responsibility | Forbidden responsibility |
| --- | --- | --- |
| `src/simulations/pre-made/<slug>/recipe.json` | Complete authored premade data | Executable behavior, shell, loader |
| `src/simulations/runtime/recipes/registry.ts` | Public lookup/list API over validated registry entries | Handwritten catalog metadata or lesson overrides |
| `src/simulations/runtime/recipes/premadeRegistry.generated.ts` | Mechanically generated static JSON imports and slug-to-source mapping | Parameters, copy, layout, or hand edits |
| `src/simulations/runtime/recipes/loadRecipe.ts` | Generic parse/migrate/validate/instantiate orchestration | Experiment-ID branches or source mutation |
| `src/simulations/runtime/recipes/serializeRecipe.ts` | Canonical authored recipe export | Legacy partial composition export or incidental animation state |
| `src/simulations/runtime/recipes/schema.ts` | Current envelope type and runtime validation | A second model/component schema registry |
| `src/simulations/runtime/recipes/compatibility/index.ts` | Sole public entry to supported legacy migrations | Current experiment rendering |
| `src/simulations/runtime/recipes/compatibility/aliases.ts` | Old route/composition identifiers mapped to current identities | A second catalog or independent defaults |
| `src/simulations/runtime/recipes/compatibility/migrations/` | Named pure migrations with source/target versions | A live alternate session/runtime |
| `src/simulations/runtime/authoring/` | Existing document validation, typed connections, identity remapping, execution | Premade-specific assembly logic |
| `src/simulations/components/` | Shared definitions, controls, displays, scenes, models, resources | Full selectable premade definitions or per-premade styling |
| `src/simulations/builder/` | Authoring UI, selection, history, persistence adapters | Premade JSON, defaults, or a second recipe parser |
| `src/app/experiments/` | Shared routes, shell, catalog view, entry-point coordination | Handwritten experiment compositions |
| `scripts/recipes/generate-registry.cjs` | Deterministic filesystem discovery and static registry generation | Reading/inventing lesson configuration |
| `scripts/recipes/verify-structure.cjs` | File tree, import boundary, registry freshness checks | Production loading |
| `scripts/recipes/verify-contract.cjs` | Recipe validation, semantic ownership, runtime and round-trip checks | Replacing runtime behavior with mocks |
| `scripts/recipes/verify-browser.cjs` | Shared browser acceptance driven by recipe cases | A private learner implementation |
| `scripts/recipes/cases/<slug>.json` | Assertions, interactions, fixed capture conditions | A duplicate complete recipe |
| `scripts/recipes/fixtures/compatibility/` | Historical import and malformed-input fixtures | Current catalog entries |
| `docs/agent-only/implementation/013-validation/` | Migration inventory and retained validation evidence | Application source or generated production recipes |

Keep existing component/provider directories and public definition identities when they are correct. This convention does not require restructuring every reusable primitive.

Do not create another loader, parser, manifest, registry, or compatibility folder elsewhere. Existing builder serialization becomes a thin adapter to the shared serialization contract; builder history/storage remain builder responsibilities.

## 4. Dependency boundaries

The production import chain is:

```text
pre-made/<slug>/recipe.json
  -> runtime/recipes/premadeRegistry.generated.ts
  -> runtime/recipes/registry.ts
  -> runtime/recipes/loadRecipe.ts
  -> existing public definitions + authored runtime
  -> shared experiment shell / builder
```

Only `premadeRegistry.generated.ts` may directly import premade JSON in production. The generator and verification tools may enumerate and read the files through the filesystem.

- Components, resource defaults, session stores, planner code, routes, and builder code MUST NOT import a specific premade file directly.
- Components and model providers MUST NOT import the recipe registry. This prevents an initialization cycle where validating a recipe needs a component that itself loads the recipe.
- Entry-point orchestration may request a recipe by identity through the registry. It passes authored configuration into the runtime.
- Component registration by definition ID is valid. A renderer dispatching to the registered Gas Container visual is not a premade shell exception.
- Registry lookup by slug is valid. `if (slug === "gas")` to assemble nodes, set conditions, place items, or alter the shell is forbidden.
- Compatibility-only recognition of old identifiers is valid inside the compatibility directory.
- Dynamic import paths, barrel exports, `require()`, fetch paths, and path aliases must not bypass these rules.
- The generated registry contains imports and mappings only. Alphabetical generation must be deterministic; runtime filesystem access is not required.
- CI regenerates the registry in memory or a temporary location and compares it with the checked-in artifact. A mismatch fails.

Generated registry code is an index of authoritative files, not a duplicate store of recipe contents.

## 5. Recipe format and ownership

### 5.1 One complete current-format envelope

Use the existing `CompositeRecipe` and `AuthoredDocument` concepts as the migration base. The current implementation uses `recipeVersion: 1` and `document.formatVersion: 3`. The stricter envelope is a planned `recipeVersion: 2` contract, with an explicit version-1 reader.

Do not put version 2 into production files before its shared validator, serializer, and migration are implemented. Preserve authored document version 3 where its semantics remain compatible; independently version any incompatible document/presentation change.

The target envelope contains:

| Field | Required meaning |
| --- | --- |
| `recipeVersion` | Serialization contract version; distinct from content revision |
| `id` | Stable recipe identity; preserve existing valid IDs during migration |
| `version` | Positive authored content revision |
| `title`, `description` | Canonical display title and catalog description |
| `catalog` | Required premade metadata: `icon`, `category`, integer `order` |
| `tags` | Discovery terms declared once in the recipe |
| `document` | Explicit scopes, nodes, resources, connections, groups, layout, presentation, lesson, and editor metadata |
| `parameters` | Explicit exposed bindings and defaults consistent with child configurations |
| `dependencies` | All referenced component/resource definitions and exact supported versions |
| `externalPorts` | Explicit external interface, including an empty array when none is intended |
| `assumptions` | Lesson/model assumptions needed to interpret results |
| `nested` | Empty for shipped premade experiment recipes; see §5.3 |

The same envelope supports generated and imported experiments. `catalog` may be absent for a private draft that is not registered as a shipped premade. Registering a premade requires it. Origin must not change runtime privileges.

`catalog.icon` is a validated icon key or text glyph supported by the shared catalog renderer, never executable markup. `catalog.category` must use a registered shared category key. Sort by `order`, then stable recipe ID; duplicate order numbers have deterministic behavior.

This is a field contract, not a copy-paste JSON example. Actual recipes must validate against implemented schemas and real definition versions.

### 5.2 Explicit instances and values

Every model, visible control, scene, action, and readout has a stable node identity, public definition ID, definition version, scope, and authored configuration. Every connection declares endpoints and its kind. Parameter bindings identify their exact target node and field.

- Persist all values that determine the starting lesson, including temperature, amount, speed, gravity, playback intent, units, labels, precision, and meaningful visual settings.
- Supported domain limits and calculations belong to component definitions. A recipe may declare supported lesson restrictions but may not widen component bounds or redefine physics.
- Definition defaults support creating a new component in the builder. They must not silently fill missing lesson-specific values in a shipped recipe.
- Exposed parameter defaults must equal the targeted authored field. Schema-required copies are validated mirrors, not separately maintained authorities.
- Initial control values must agree with the model's authored state or use a supported binding to that state.
- Keep schema-required title mirrors consistent: `document.lesson.title` must equal the recipe's canonical `title`. Instruction and explanation have distinct purposes and remain explicitly authored.
- No duplicated title/description/default table in routes, `LearningPolicies`, descriptors, or compatibility constants.
- Changes to shared default values must not silently change a stored recipe's initial state.
- Randomized experiments persist their seed or another explicit reproducible initialization policy.
- Derived pressure, trajectories, particles, and other runtime outputs remain model results. Do not serialize a live computation as if it were an authored starting value.

The current gas JSON has exposed color/display defaults that differ from its node configuration. Migration must reconcile those mirrors to the existing rendered configuration, then verify appearance; copying old inconsistency is not completion.

### 5.3 No hidden assembly

Shipped premade recipes store fully expanded authored documents. `nested` is empty; composition helpers may be used during authoring/export, but their resulting nodes and connections must be saved in JSON before registration.

Reusable composites may continue to exist as authoring tools. A learner opening a premade must not depend on a helper that decides which controls to generate or discard.

Allowed during loading:

- Parse data, resolve exact definitions, migrate a supported older format, and validate.
- Clone the authored document for runtime isolation.
- Remap identities when inserting into an existing document, updating every declared reference.
- Initialize registered model providers from explicit authored configuration.
- Calculate generic responsive placement from declared, validated presentation metadata.

Forbidden during current-format loading:

- `modelRecipe("...")` to invent the composition.
- `presentGasExperiment()`, `presentFocusedExperiment()`, or equivalent domain-specific document mutation.
- Filtering nodes by magic IDs to curate a premade.
- Injecting route-specific parameters or overwriting JSON defaults from session constants.
- Changing the recipe because of its directory name, slug, title, legacy demo ID, or membership in an allowlist.

Explicit user edits and accepted generated plans may change authored data through shared commands. They do not authorize silent changes while opening a recipe.

## 6. Presentation must remain authored and visually stable

Persist component order, dimensions, placement, canvas coordinate bounds, starting view, intended grouping, navigation, and responsive policy in the recipe's presentation fields.

Connections graph positions, board placement, viewport camera, and component-local geometry are separate concepts. Migration must not confuse them.

- Use the existing shared board/flow/immersive machinery through validated presentation capabilities.
- Any capability missing from the schema must first be implemented generically and validated. Do not invent ignored JSON properties.
- A flow recipe declares ordering, spacing, and its reusable flow policy. A board recipe declares actual rectangles and its starting view.
- Record computed premade-specific rectangles currently hidden in adapters as authored data.
- Responsive behavior may compute viewport geometry, but must preserve component identity, connection targets, authored defaults, and intended accessible content.
- Visibility changes must have an explicit shared rule. Do not drop pressure cards or angle sliders because a slug is recognized.
- Component CSS targets shared component roles or declared states. No experiment-selector overrides for chrome, controls, or board placement.
- Shell capabilities apply equally to compatible premade, generated, and imported recipes.

Preserving appearance is an acceptance condition of the migration. A structural cleanup must not silently redesign a lesson. If the baseline already has a visual defect, record it separately; do not claim the defect was introduced by moving the recipe or treat it as permission for an unrelated redesign.

## 7. Generic loading, discovery, and persistence

### 7.1 Catalog and opening

The catalog derives its entries from validated recipe metadata. Retire the handwritten metadata/defaults object in `app/experiments/_lib/premadeExperiments.ts`; a view adapter may remain only if it projects registry data without its own literals.

Loading is transactional:

1. Resolve a registered source or accept an import/generated candidate.
2. Parse without executing content.
3. Migrate only when its format is an explicitly supported older version.
4. Validate envelope, identities, definitions, values, connections, resources, layout, presentation, and budgets.
5. Construct an isolated candidate runtime.
6. Commit the candidate only after validation and initialization succeed.
7. Render through the same shell and canvas host.

Failure leaves the active experiment untouched. Returning a different route or a partially rendered stage is not successful loading.

Registry sources must be immutable. Two openings or remixes must not share mutable node configuration, arrays, groups, or model state.

### 7.2 Save, import, and remix

Save exports the complete current authored recipe. It preserves identity/version, metadata, nodes, connections, starting configuration, lesson, layout, presentation, dependency identities, and reset semantics.

Do not export only `composition.ref` and changed parameters. Legacy readers may accept that old shape, but new saves must not produce it.

Import, download, library save, remix, and Try lesson use the same shared validator and serializer. Session stores and routes cannot keep parallel export implementations.

Document wrappers used by builder persistence may carry storage/history metadata, but the authored recipe remains the canonical content. Draft-only editor state must not replace the authored learner presentation.

Insertion may remap IDs to avoid collisions; pure export/import preserves them. Verify all references, not only node counts. A successful remapping keeps parameter bindings, scopes, layout, groups, and scene attachments consistent.

Remix creates a private editable copy with source provenance. User changes do not overwrite the shipped registry entry. Before publishing a separately selectable derivative, assign its own recipe identity and directory.

### 7.3 Generated and manually assembled experiments

Generation produces a candidate in the same contract and validates it before activation. Generated and imported input cannot name arbitrary executable providers outside the public registry.

Manual building may have incomplete intermediate drafts. The shared runnable validator determines whether a draft can enter learner mode. Exporting or registering a completed experiment materializes its full authored recipe.

Do not create generated-only routes, save formats, component implementations, or runtime stores to bypass a missing shared capability.

## 8. Inventory and migration targets

The catalog inspected on 2026-10-06 contains 13 entries. Directory coverage is incomplete and is not a sufficient inventory by itself.

| Current catalog key | Current representation | Target |
| --- | --- | --- |
| `gas` | JSON under `pre-made/gas/gas-pressure.recipe.json`; dedicated loader and legacy session integration | Rename to `gas/recipe.json`; generic registry/loader; remove direct policy import |
| `projectile` | Catalog opens a comparison with two angles; old projectile re-export tree and generated spatial recipes coexist | Preserve current entry behavior as `projectile-comparison/recipe.json`; old route alias maps to it |
| `bridge` | Re-export tree and generated bridge composition | `bridge/recipe.json` |
| `town` | Re-export tree and generated town composition | `town/recipe.json` |
| `counting` | Re-export tree and generated focused composition | `counting/recipe.json` |
| `arithmetic` | Re-export tree and model-generated composition | `arithmetic/recipe.json` |
| `equal-groups` | Re-export tree plus catalog parameter overrides | `equal-groups/recipe.json` |
| `fraction-builder` | Re-export tree plus catalog parameter overrides | `fraction-builder/recipe.json` |
| `fraction-number-line` | Re-export tree and model-generated composition | `fraction-number-line/recipe.json` |
| `ratio` | Catalog entry without a dedicated premade directory | `ratio/recipe.json` |
| `area-perimeter` | Catalog entry and route defaults without a dedicated premade directory | `area-perimeter/recipe.json` |
| `coordinates` | Catalog entry and route defaults without a dedicated premade directory | `coordinates/recipe.json` |
| `probability` | Catalog entry and route defaults without a dedicated premade directory | `probability/recipe.json` |

Also inventory builder-discoverable entries from `components/composites/catalog.ts` and `spatial.ts`. These include independent projectile, comparison, bridge, town, physical comparison, and reusable assembly entries. Classify by actual behavior:

- A complete independently selectable experiment requires its own premade recipe directory.
- A reusable primitive or partial assembly stays in the shared component/composite catalog.
- Do not relabel a complete experiment as a component merely to avoid this convention.
- A single-projectile experiment, if independently offered, belongs in `projectile/recipe.json`. It must not reuse the comparison recipe with hidden route overrides.
- Old IDs and routes may alias a new recipe. Alias lookup must never change its authored conditions.

Complete the inventory before choosing the final migration count. Record each current entry, aliases, canonical ID, definition dependencies, target path, and status in `013-validation/inventory.md`.

## 9. Legacy compatibility and deletion

Move necessary saved-file readers and identifier translations into `runtime/recipes/compatibility/`. A migration is a pure transformation into current canonical data. It must not keep an older runtime alive.

- Retain historical fixture inputs outside the production premade tree.
- Preserve supported old IDs through explicit alias tables; do not silently rename identities inside users' saved experiments.
- Resolve old defaults according to their historical version. Never reinterpret an old save using today's premade defaults.
- If historical behavior cannot be reproduced, return an explicit migration error and preserve the original source for recovery.
- Historical defaults required by a specific old format may exist only in its versioned migration/fixture. They are not current catalog defaults.
- Compatibility readers may recognize old domain IDs. The current shell, loader, and renderer may not.
- When a premade migrates, remove its old executable composition, re-export files, special loader, focused layout helper, and duplicate starting values after checking all consumers.
- Do not delete a shared implementation still used by other recipes. Remove experiment assembly from it, or retain the reusable function for explicit authoring operations outside the learner load path.
- Legacy session adapters are temporary migration debt, not permanent compatibility readers. Replace their active execution consumers before removing them.

Git preserves deleted source. Do not keep `old/`, `legacy-recipes/`, `backup/`, or commented-out copies under the premade tree.

## 10. Ordered implementation plan

### Phase 0 — Baseline and inventory

- Inspect applicable repository instructions and preserve unrelated working-tree changes.
- Complete the inventory across learner catalog, builder catalog, planner, session, routes, save/import, and compatibility consumers.
- Capture each premade's fully resolved authored data, accepted initial state, primary interactions, desktop/narrow geometry, and screenshots.
- Record seeds, animation policy, viewport sizes, browser build, font readiness, and initial camera.
- Record existing failing checks separately. Never silently update assertions to disguise a regression.

Gate: every selectable experiment and alias has a target or a documented reusable-component classification.

### Phase 1 — Shared contract and enforcement

- Implement the versioned envelope, generic loader/serializer, compatibility entry point, registry generator, and validators in §3.
- Reuse the existing authored runtime and definition registry; do not fork them.
- Introduce structure/import/contract checks and negative fixtures.
- Add shared metadata and presentation capabilities needed by existing lessons before moving their source.
- Use a temporary migration inventory for legacy paths. Every entry must name the exact remaining path and removal phase; no wildcard exemptions.

Gate: a valid fixture opens through the generic path, malformed input fails atomically, registry generation is deterministic, and forbidden structures fail the checks.

### Phase 2 — Gas reference migration

- Rename the JSON to `pre-made/gas/recipe.json`.
- Load it solely through the generated registry and generic loader.
- Move catalog copy/defaults and currently hidden presentation choices into its JSON.
- Reconcile exposed default mirrors to authored values without changing the opening view.
- Remove `components/composites/gas.ts` and its gas-specific loader.
- Remove direct recipe imports in `LearningPolicies.ts`; pass authored values at activation instead.
- Migrate the old `GasPressureExperiment` compatibility consumer; retire its duplicate current composition.
- Verify learner, builder, Try lesson, generated equivalent, JSON import, save/import, and rejected inputs.

Gate: gas has exactly one premade file, no production import bypass, no special composition generation, and preserved interaction/visual evidence.

### Phase 3 — Remaining premades

- Migrate the mathematical lessons, then projectile/single and comparison lessons, then bridge/town and other inventoried complete experiments.
- Choose batch size by verification cost; each migrated recipe must be fully cut over before the next batch.
- Replace route overrides and implicit defaults with explicit JSON values.
- Preserve shared scenes and instance targeting for comparisons.
- Remove each old re-export tree and alternate composition as its consumers migrate.
- Keep old routes working through compatibility aliases only.

Gate per recipe: full acceptance in §12, old current source removed, inventory updated.

### Phase 4 — All entry points and cleanup

- Cut catalog, planner/generation, imported recipes, builder/manual authoring, remix, and persistence over to the shared contract.
- Remove active legacy session execution and reduced new-save formats.
- Remove remaining premade-ID shell branches, layout mutations, and CSS exceptions.
- Remove completed migration exemptions and obsolete documentation instructions.
- Verify zero stale imports, zero duplicate catalog definitions, and one complete registry entry per premade directory.

Gate: strict enforcement passes without transition exemptions. All current premades are ordinary recipes on the common runtime.

## 11. Mandatory automated enforcement

Add these planned scripts to `package.json` and the normal CI pipeline:

| Command | Required checks |
| --- | --- |
| `pnpm recipes:generate` | Regenerate the static registry deterministically |
| `pnpm test:recipes:structure` | Exact filesystem shape, valid slugs, no symlinks/extra files, import boundaries, current generated registry |
| `pnpm test:recipes:contract` | Every recipe valid and runnable; metadata/default mirrors; version/dependency checks; isolation and round trips |
| `pnpm test:recipes:browser` | Shared browser acceptance for every migrated premade and representative non-premade entry points |

`pnpm test` must include structure and contract checks. CI must run the browser checks as a required stage, not an optional manual reminder.

Verification must include negative fixtures that demonstrate rejection of:

- An extra README, TypeScript re-export, nested folder, alternative JSON filename, or symlink inside a premade folder.
- A production import outside the generated registry, including an alias or indirect barrel bypass.
- A duplicate recipe identity or ambiguous alias.
- Unsupported versions, undeclared dependencies, invalid ports, dangling identities, or inconsistent units.
- Exposed defaults that disagree with the model configuration.
- Missing catalog metadata, a route-owned catalog metadata table, or lesson defaults patched during loading.
- Unknown fields that would otherwise be silently ignored.
- Invalid layout/presentation references or nonfinite/unbounded data.
- A malformed import that changes active state before validation completes.

Use AST/import-graph inspection for code boundaries, not only a grep for `gas`. Ordinary words in tests, comments, component identifiers, and compatibility migrations are not automatically violations.

Detect semantic duplicate ownership through checks on known catalog/session/descriptor entry points and immutable-load comparisons. Literal-value scanning alone cannot prove that defaults have a single owner. Code review must confirm that a helper has not hidden an override behind a generic name.

Tests may read source JSON and assert outcomes, but must not carry another complete current recipe. Historical fixtures and recorded visual baselines are evidence, not a production source.

## 12. Acceptance and evidence

Each recipe must pass all of the following before its migration is complete:

1. Exactly one `recipe.json` in its directory; no residue or empty subdirectories.
2. Catalog entry derived entirely from the recipe; no separately maintained metadata/defaults.
3. Generic loading with no experiment-specific assembly, patching, or private session execution.
4. Stable identities and versioned dependencies; isolated simultaneous instances.
5. Correct accepted control → model → scene → output behavior.
6. Invalid inputs and imports leave the accepted state unchanged.
7. Reset restores the authored initial state, including fixed conditions and seed behavior.
8. Save/import preserves authored content and presentation; insertion remaps every relevant reference safely.
9. Builder exposes the intended independent components; Try lesson reproduces the learner behavior.
10. Generated/imported/manual counterparts use the same loader, validation, runtime, shell, and component definitions.
11. Old supported files/routes migrate correctly through the designated compatibility layer.
12. Type checking, structure, contract, relevant runtime suites, and browser acceptance pass; unrelated baseline failures are reported explicitly.

Visual evidence must cover at least:

- Desktop opening view and a representative changed state.
- Compact desktop, mobile, and the smallest supported viewport.
- Builder composition and Try lesson.
- Save/reimported and remixed versions.
- Multi-instance controls and immersive behavior when relevant.

Use fixed viewports, deterministic state, stable fonts, and paused/controlled animation for screenshot comparisons. Compare element geometry and accessible labels as well as pixels. Ignore only documented nondeterministic chrome/antialiasing differences; do not hide changed experiment regions behind broad masks.

Record results in `013-validation/` with recipe ID/revision, source revision or source hashes for a dirty tree, commands, environment, captures, observed failures, and remaining work. Generated capture assets never go inside `pre-made/`.

## 13. Completion checklist

- [ ] Inventory includes all learner and builder selectable experiments.
- [ ] Every premade directory contains only `recipe.json`.
- [ ] All production premade JSON imports are confined to the generated registry.
- [ ] Generic loading, validation, serialization, and execution serve every origin.
- [ ] Catalog metadata and authored starting conditions live in recipe data.
- [ ] Required schema mirrors are validated and have no conflicting defaults.
- [ ] Presentation is declared; shared shell/components contain no premade-ID patches.
- [ ] Old current compositions, special loaders, and re-export trees are removed.
- [ ] Required saved-file migrations live only in the designated compatibility directory.
- [ ] All temporary migration exemptions are removed.
- [ ] Behavioral, visual, round-trip, and invalid-input evidence is retained.
- [ ] The feature contract and component documentation describe the final implementation accurately.

Moving a JSON file alone does not satisfy this convention. Completion requires its data to be the actual authored source consumed by every supported flow.
