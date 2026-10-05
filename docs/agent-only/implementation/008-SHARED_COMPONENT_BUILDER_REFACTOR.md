# 008 — Shared components and manual builder refactor

Date: 2026-10-05.
Status: implemented and verified on 2026-10-05. Verification scope and remaining unrelated test limitations are recorded below.

## 1. Intended outcome

Establish `src/web/src/simulations/components/` as the canonical home for simulation components used by both the manual builder and premade simulations.

- **Components** own state schemas, defaults, domain operations, visuals, views, and learner controls.
- **Builder** authors component configuration, lesson content, relationships, and editor metadata.
- **Premade simulations** select and configure those same components.
- **Runtime** validates relationships, routes commands, and owns instance lifecycle and execution.

A correction to a shared component must reach builder-created and premade experiments through the same implementation. Smaller files alone do not satisfy this objective.

Initially preserve the saved document format, stable identities, supported domains, commands, and observable behavior. This plan is an architectural refactor, not an expansion of simulation capabilities.

## 2. Verified structural problems

The source inspection found partial reuse rather than a consistent single source of truth.

### Existing reuse to preserve

The composition builder already uses shared implementations for:

- Gas state contracts: `components/traits/GasState.ts`.
- Gas pressure: `components/systems/IdealGasSystem.ts`.
- Gas illustration: `components/systems/GasParticleIllustrationSystem.ts`.
- Gas visuals: `components/visuals/GasContainerVisual.tsx` and `GasParticleVisual.tsx`.
- Fraction construction: `components/prefabs/MathBoards.ts`.
- Fraction updates and comparisons: `components/systems/FractionBuilderSystem.ts` and `fractionMath.ts`.
- Fraction rendering: `components/visuals/FractionBarVisual.tsx`.

These are active calls and rendered components. Compilation follows those imports; it does not automatically substitute shared implementations for builder-local equivalents.

### Ownership and coupling gaps

| Current source | Problem |
| --- | --- |
| `builder/composition/model.ts` | Approximately 844 lines at inspection; combines eight object kinds, scene records, schemas, defaults, property edits, validation, and geometry helpers. |
| `builder/composition/definitions.ts` | Gas/fraction definitions are separated while Cartesian/town definitions remain substantially in `model.ts`. |
| `builder/composition/CartesianScene.tsx` | Implements a simulation viewport, line/square rendering, and direct interaction inside the builder. |
| `builder/composition/CompositionLesson.tsx` | Implements learner widgets directly with inputs/buttons rather than consuming shared control components. |
| `builder/composition/TownScene.tsx` | Builds town meshes locally instead of composing shared town visuals and views. |
| `builder/composition/town.ts` | Implements route search and schedule evaluation locally instead of sharing mechanics with premade town execution. |
| `builder/composition/measurements.ts` | Reuses gas/fraction systems but calculates Cartesian and other outputs locally. |
| `builder/composition/model.ts` and `workspace.ts` | Import runtime functions from one another, coupling object definitions and workspace validation. |
| `builder/connections.ts` | Mixes older graph derivation with graph types/helpers used by the current composition path. |
| `builder/Builder.tsx` | Approximately 1,598 lines at inspection; combines application orchestration, persistence/recovery/history coordination, and older editor UI. |

The inspected `pre-made/` modules largely follow the intended selection/re-export structure. The composition builder is the main divergence. Some local implementations support different capabilities, such as arbitrary authored town layouts; extraction must preserve those capabilities rather than blindly substitute a premade adapter.

## 3. Ownership rules

### 3.1 One implementation per component responsibility

Each independently registered component gets a focused definition file. Keep its distinct responsibilities separate:

- **Definition:** identity, compatibility, authoring metadata, and references to implementations.
- **Trait:** configuration/state/output schema.
- **Prefab:** instance construction.
- **System:** domain operations and authoritative calculations.
- **Visual:** appearance derived from accepted data.
- **View:** projection, viewport, drawing lifecycle, and presentation.
- **Control:** interaction translated into supported commands.

A line definition must not become another large file containing its renderer, inspector, runtime, and mathematics. Conversely, do not create empty modules to satisfy a directory template. A trivial constructor can stay with its definition until extraction serves a real purpose.

### 3.2 Single declaration of contracts

Declare property ranges, units, defaults, outputs, action arguments, and compatibility once. Library descriptions, settings, ports, runtime validation, and control defaults consume those declarations.

Integrate this with the existing `runtime/catalog.ts`, `providers.ts`, and definition/contribution infrastructure. Do not introduce a competing registry containing duplicate contracts.

Use explicit registration rather than import-time mutation. Keep pure definitions separate from heavy React/Three.js renderer registration so schema validation does not pull in rendering dependencies.

### 3.3 Dependency direction

```text
Shared contracts and schemas
        ↑
Component implementations and definitions
        ↑                         ↑
Runtime validation/execution     Premade selections/configuration
        ↑
Builder authoring and shared lesson assembly
```

Reusable simulation implementations must not import `builder/`. Builder document types wrap simulation configuration rather than becoming required inputs to systems or visuals. UI callbacks communicate edits and commands without requiring components to know editor history or local storage.

Some current shared controls import the singleton session dispatcher. Refactor these dependencies deliberately toward supplied instance-scoped command interfaces; moving a file alone does not resolve runtime coupling.

## 4. Proposed target structure

The following names are proposed destinations. Reuse or extend existing implementations where their contracts fit; do not create parallel replacements merely to match this tree. The tree shows the affected scope, not every existing simulation file.

```text
src/web/src/simulations/
├── components/
│   ├── contracts/
│   │   ├── ComponentDefinition.ts
│   │   ├── PropertyContract.ts
│   │   └── OutputContract.ts
│   ├── definitions/
│   │   ├── Line.ts
│   │   ├── Square.ts
│   │   ├── Ground.ts
│   │   ├── Building.ts
│   │   ├── Road.ts
│   │   ├── Person.ts
│   │   ├── GasContainer.ts
│   │   └── FractionBar.ts
│   ├── traits/
│   │   ├── LineState.ts
│   │   ├── SquareState.ts
│   │   ├── GasState.ts
│   │   └── ... existing/extracted town and fraction schemas
│   ├── prefabs/
│   │   ├── Line.ts
│   │   ├── Square.ts
│   │   ├── GasContainer.ts
│   │   ├── FractionBar.ts
│   │   └── ... existing town prefabs
│   ├── systems/
│   │   ├── LineGeometrySystem.ts
│   │   ├── LineIntersectionSystem.ts
│   │   ├── SquareGeometrySystem.ts
│   │   ├── IdealGasSystem.ts
│   │   ├── FractionBuilderSystem.ts
│   │   ├── NavigationSystem.ts
│   │   ├── PathFollowingSystem.ts
│   │   └── ... shared schedule execution and other systems
│   ├── visuals/
│   │   ├── LineVisual.tsx
│   │   ├── SquareVisual.tsx
│   │   └── ... existing gas/fraction/town visuals
│   ├── views/
│   │   ├── CartesianView.tsx
│   │   ├── DisplayView.tsx
│   │   ├── ThreeWorldView.tsx
│   │   └── ... existing result and experiment views
│   ├── controls/
│   │   ├── ParameterSlider.tsx
│   │   ├── NumberField.tsx
│   │   ├── ToggleControl.tsx
│   │   ├── ActionButton.tsx
│   │   └── DragHandleControl.tsx
│   ├── behaviors/
│   │   └── ScheduledTrip.ts
│   ├── compositions/
│   │   └── ... shared experiment definitions
│   └── registry.ts
├── runtime/
│   ├── composition/
│   │   ├── types.ts
│   │   ├── validateScene.ts
│   │   ├── validateBindings.ts
│   │   ├── validateWorkspace.ts
│   │   ├── projectCanvas.ts
│   │   ├── commands.ts
│   │   ├── runtimeState.ts
│   │   ├── useCanvasRuntime.ts
│   │   └── observations.ts
│   └── ... existing recipe/session infrastructure
├── builder/
│   ├── Builder.tsx
│   ├── setup/
│   ├── document/
│   │   ├── types.ts
│   │   ├── validateDocument.ts
│   │   ├── serialization.ts
│   │   └── migrations/
│   ├── persistence/
│   │   ├── storage.ts
│   │   └── recovery.ts
│   ├── history/
│   ├── graph/
│   │   ├── types.ts
│   │   ├── deriveGraph.ts
│   │   ├── connectionCommands.ts
│   │   ├── ConnectionGraph.tsx
│   │   └── ConnectionViewport.tsx
│   ├── editor/
│   │   ├── selection.ts
│   │   ├── groups.ts
│   │   └── clipboard.ts
│   ├── library/
│   ├── settings/
│   │   ├── ObjectSettings.tsx
│   │   ├── BindingSettings.tsx
│   │   ├── CanvasSettings.tsx
│   │   └── LessonSettings.tsx
│   └── preview/
│       └── BuilderPreview.tsx
├── lessons/
│   └── CompositionLesson.tsx
└── pre-made/
    └── ... selections/configuration only
```

Object settings remain editor UI. The shared component supplies its editable contract; the builder supplies forms and optional focused inspectors. Learner interaction handles live in shared controls/views, with authoring behavior enabled through supplied callbacks and permissions.

Shared lesson assembly belongs outside the builder. Capture, selection, and settings-portal coordination belong in the builder preview adapter. Preview and learner playback use the same accepted state and renderers.

## 5. Source-to-destination map

Paths below are relative to `src/web/src/simulations/`.

| Current file | Refactor destination and responsibility |
| --- | --- |
| `builder/composition/model.ts` | Individual component definitions, traits, constructors, and systems; scene/binding types and validation under `runtime/composition/`. |
| `builder/composition/definitions.ts` | Gas/fraction definitions and canonical contracts under `components/`; registered scene compatibility. |
| `builder/composition/measurements.ts` | Domain calculations in shared systems; generic observation dispatch in runtime; precision/display formatting in lesson presentation. |
| `builder/composition/town.ts` | Shared navigation and schedule evaluation under systems/behaviors, accepting authored layout inputs. |
| `builder/composition/CartesianScene.tsx` | Shared Cartesian view, line/square visuals, and direct manipulation controls. |
| `builder/composition/DisplayScene.tsx` | Shared display view, retaining existing gas/fraction visuals and systems. |
| `builder/composition/TownScene.tsx` | Shared town view/visual integration supporting authored instances and layouts. |
| `builder/composition/useSceneRuntime.ts` | `runtime/composition/useCanvasRuntime.ts`. |
| `builder/composition/runtimeState.ts` | Runtime staging/merging; component contracts define which changes reset or preserve state. |
| `builder/composition/workspace.ts` | Runtime types, projection, and validation; builder authoring commands handle adding/removing/reassigning canvases. |
| `builder/composition/graph.ts` | Builder graph derivation/commands consuming shared binding and compatibility validation. |
| `builder/composition/editor.ts` | Builder selection, grouping, clipboard, and deletion commands. |
| `builder/composition/migration.ts` | Document migrations invoking shared constructors/contracts. |
| `builder/composition/CompositionGraph.tsx` | Builder graph UI; extract selection and gesture logic where it has independent responsibility. |
| `builder/composition/CompositionLibrary.tsx` | Builder library using registered component descriptions. |
| `builder/composition/*Settings.tsx` | Builder settings; extract component-specific forms where useful without duplicating schemas/ranges. |
| `builder/composition/CompositionLesson.tsx` | Shared lesson renderer plus builder preview adapter. |
| `builder/composition/CompositionBuilder.tsx` | Current authoring coordinator, eventually consolidated with the slim builder shell. |
| `builder/Builder.tsx` | Extract persistence, recovery, history, and setup coordination; retire older UI branches after migration coverage. |
| `builder/connections.ts` | Extract graph types/geometry helpers, then retire older graph derivation. |
| `builder/catalog.ts` and `descriptors.ts` | Separate setup/preset configuration from canonical component contracts; remove duplicate contract declarations. |
| `builder/document.ts` | Split envelope types, validation, serialization, structural commands, and migration routing. |
| `builder/*.css` and `builder/composition/composition.css` | Keep editor styles with builder UI; move learner/view styles with their shared owners. |

Avoid a wholesale rename or relocation of unrelated simulation domains during this work.

## 6. First vertical slice: line and square

Start with `model.ts` and its Cartesian consumers. This exposes the architecture clearly without beginning with the more complex town adapters.

The canonical line definition supplies:

- Stable identity, compatible canvas, schema, and construction defaults.
- Slope/intercept contracts, including vertical-line restrictions.
- Supported outputs and references to geometry/intersection operations.
- Appearance and permission fields with explicit runtime preservation semantics.
- References to the shared visual and interaction implementation.

The intended flow is:

```text
Library           → component name and construction defaults
Settings          → declared editable properties
Graph             → declared ports and compatible bindings
Runtime           → validated component operations
Cartesian view    → shared line/square visuals and controls
Premade/recipe    → the same underlying geometry operations
```

The existing slope/intercept recipe model and endpoint-based composition model have different representations. Use explicit adapters to shared operations; do not silently change serialized representations or remove vertical-line support. Newly supported operations may remain unavailable to older presets, but overlapping behavior must share its implementation.

## 7. Incremental migration sequence

### Phase 0 — Baseline and fixtures

- Run the current relevant checks and record existing failures separately.
- Preserve representative version-1/version-2 documents and legacy recipes.
- Include detached drafts, multiple canvases, comparisons, town schedules, groups, and permissions.
- Inspect current uncommitted changes before editing; preserve unrelated work.

Completion: established behavior and persistence fixtures against which each subsequent phase can be evaluated.

### Phase 1 — Extract component contracts and mechanics

- Extract line/square definitions and operations from `model.ts`.
- Integrate the canonical definitions with existing registration infrastructure.
- Remove object-definition dependencies on builder document/workspace code.
- Temporarily re-export extracted symbols from old paths while migrating callers.
- Connect existing recipe adapters to shared operations where behavior overlaps.

Completion: line/square mechanics have one implementation used by active consumers. Compatibility re-exports contain no duplicate logic.

### Phase 2 — Shared learner controls and Cartesian/display rendering

- Replace builder-local widgets with shared controls.
- Supply canvas-specific command dispatch and consistent accepted/error results.
- Generalize singleton-bound controls before using them across independent canvases.
- Extract views/visuals and retain authoring callbacks, cancellation, and keyboard interaction.
- Preserve shared gas/fraction system and visual reuse.

Completion: builder previews and learner playback render canonical controls/views, with no parallel simulation renderer for migrated domains.

### Phase 3 — Runtime and lesson ownership

- Move scene projection, relationship validation, staging, lifecycle, and runtime state to runtime modules.
- Separate lesson rendering from capture/settings integration.
- Replace repeated domain switches with component contracts where appropriate.
- Preserve independent canvas ownership and authored/runtime state lifetimes.
- Keep pure validation dependencies separate from heavy view registration.

Completion: simulation execution no longer requires importing builder implementation modules.

### Phase 4 — Town unification

- Generalize shared navigation inputs for authored bounds, obstacles, and destinations.
- Share route following and schedule mechanics while preserving scenario-specific policies.
- Compose shared town visuals/views for authored instances.
- Verify both premade town and authored town scenarios; do not assume their layouts or route policies are interchangeable.

Completion: authored and premade town behavior use canonical mechanisms with explicit configuration/adapters.

### Phase 5 — Retire parallel editor paths

- Audit every creation, import, saved-playback, and recovery entry point.
- Ensure supported legacy documents translate to the canonical path.
- Remove older graph/library/lesson execution branches after their consumers migrate.
- Keep legacy readers and migrations needed for existing saved data.
- Remove temporary re-exports once production and verification callers move.
- Reduce `Builder.tsx` to application coordination and consolidate current authoring UI.

Completion: one active manual-builder implementation; compatibility exists as data translation rather than another editor/runtime.

### Phase 6 — Boundaries, verification organization, and documentation

- Add import-boundary checks preventing simulation implementations from importing builder modules.
- Keep `pre-made/` limited to selection/configuration/re-exports.
- Group related verification scripts, preserving package command names during relocation.
- Update feature documents and the shared component inventory to match the delivered architecture.
- Remove retired implementation files and document remaining adapters explicitly.

Completion: the target ownership is enforceable and discoverable rather than a documentation-only convention.

## 8. Compatibility invariants

Preserve these throughout the refactor:

- Stable saved identities, references, labels, units, precision, geometry, arbitrary fraction shading, permissions, schedules, groups, and graph positions.
- Version-1/version-2 import and migration behavior; opening a record must not rewrite storage.
- Detached components and incomplete drafts remain recoverable and saveable.
- Draft validation remains distinct from runnable-lesson validation.
- Invalid edits preserve accepted state and the last valid preview.
- Presentation edits preserve experimental state according to existing semantics.
- Authored configuration changes and cross-canvas movement retain established initialization/reset behavior.
- Canvas commands and reset remain independent.
- Display resizing does not alter gas volume or fraction quantity.
- Capture is explicit; display commits do not capture experimental gas inputs/fraction shading.
- Pointer cancellation, snapping, keyboard alternatives, permissions, and one-step history commits remain intact.
- Preview expansion, settings rendering, hidden previews, and unmount do not duplicate clocks or leak animation callbacks.
- Clipboard/deletion remap or detach references consistently.
- Local saves retain Web Locks, expected-record conflict checks, complete-record replacement, and unknown-entry retention.

Prefer unchanged serialized shapes during extraction. If a later contract change requires a new version, add an explicit migration with round-trip fixtures as a separate bounded change.

## 9. Verification strategy

Use existing commands before and after the relevant phase:

| Command | Coverage |
| --- | --- |
| `pnpm test` | Existing simulation/integration and builder/composition/canvas/parity checks. |
| `pnpm test:builder:browser` | General builder and composition browser flows. |
| `pnpm test:composition:graph` | Graph relationships and compatibility. |
| `pnpm test:canvas:browser` | Selection, grouping, clipboard, navigation, and history. |
| `pnpm test:builder:parity:browser` | Gas/fraction authoring, runtime lifetimes, capture, permissions, and responsive interaction. |
| `pnpm exec tsc --noEmit` | Type consistency after extraction and import updates. |

Also run relevant premade/domain checks when shared operations change, scoped lint, a production build, and `git diff --check`. Record the actual build command and any environment limitations; prior acceptance records are not verification of this refactor.

Add focused checks for genuine architectural risks:

- Shared operations give equivalent results through builder and recipe/premade adapters.
- Per-canvas dispatch does not affect another canvas or singleton session.
- Serialized fixtures survive extraction and migration with their references intact.
- Retired paths are absent from production consumers.
- Definition lookup does not require loading rendering backends.

Do not duplicate every implementation branch in tests or rewrite all test infrastructure as a prerequisite. Organize scripts after extraction stabilizes their import paths.

## 10. Removal and completion criteria

An old file can be removed when:

1. Its responsibility has one canonical owner.
2. Production entry points use that owner.
3. Relevant verification scripts use that owner or intentional legacy-reader fixtures.
4. Required old saved inputs still load through migration.
5. Relevant behavior, persistence, and lifecycle checks pass.

The refactor is complete when:

- `model.ts` and equivalent builder-wide domain switches no longer own component implementations.
- Simulation views, visuals, operations, and learner controls reside under `components/` and are consumed by the builder.
- Premade selections and builder-created experiments share their underlying implementations.
- Component metadata/contracts have one declaration integrated with existing registration.
- Builder-only UI remains separate from simulation execution.
- There is one active manual-builder UI/runtime path, with legacy data compatibility retained.
- Component changes propagate to both consumers without parallel fixes.
- The compatibility invariants and relevant checks have recorded passing evidence.

## 11. Related documents

- [Component architecture](../../COMPONENT_ARCHITECTURE.md)
- [Component contracts](../COMPONENT_CONTRACTS.md)
- [Manual experiment builder](../../MANUAL_EXPERIMENT_BUILDER.md)
- [Manual builder processes](../features/MANUAL_BUILDER_PROCESSES.md)
- [Connection canvas editing](../features/CONNECTION_CANVAS_EDITING.md)
- [Physical and diagram composition](../features/MANUAL_BUILDER_DOMAIN_COMPOSITION.md)
- [Manual builder composition parity](007-MANUAL_BUILDER_COMPOSITION_PARITY.md)

## 12. Delivered implementation and verification

Canonical component contracts, eight focused definitions, pure lookup/registration, geometry, observations, route search/following, scheduling, shared visuals/views, and learner controls now live under `components/`. Existing runtime catalog registration uses the same definition objects. Composition validation, canvas projection, command dispatch, reset, and lifecycle live under `runtime/composition/`; lesson presentation lives under `lessons/` and accepts injected editor rendering and capture actions.

The builder now coordinates authoring through separate `document/`, `editor/`, `graph/`, `history/`, `persistence/`, and `preview/` owners. The legacy alternate builder UI/runtime and composition model/view implementations were removed. Legacy document readers, migrations, and the public document facade remain for saved-data compatibility. Existing user changes to graph/canvas behavior and documentation were preserved.

Intentional adapters preserve existing behavior: recipe lines retain coefficient evaluation and their original units while authored lines use endpoints; premade and authored town navigation supply their original neighbor, clearance, arrival, and appearance policies to shared implementations. Learner commands receive explicit instance dispatch; authored display commits and capture controls remain builder-owned. Saved document versions, storage keys, locking/conflict behavior, and nullable draft save identities are unchanged. Library entries remain available even if opening a requested lesson or recovering a draft fails.

Regression scripts now live under `scripts/builder/` with their existing command names. New architectural checks enforce import boundaries, renderer-free definition lookup, canonical registration, removal of retired owners, and instance isolation. Immutable fixtures captured from the pre-refactor sources cover sixteen serialized document/migration cases plus authored town routes and timeline snapshots.

Verified passing:

- `pnpm test`, including simulation/integration, builder, composition, graph, canvas, parity, and new architectural checks.
- `pnpm test:assembly` for premade math models, commands, and rendering.
- `pnpm test:builder:browser`, including gas/fraction parity, save/recovery, runtime lifetime/reset/capture, permissions, mobile interaction, and graph flows.
- `pnpm test:canvas:browser` for selection, groups, clipboard, deletion, navigation, and history.
- `pnpm exec tsc --noEmit`, scoped Biome checks on changed code, and `git diff --check`.
- Production compilation, TypeScript, static generation, and route generation with `APERTUS_BROWSER_TEST_DIR=.next-refactor-build pnpm exec next build --webpack`.

Additional verification limitations: the default Turbopack build stalled in this environment and was stopped; the production webpack build passed. `pnpm test:browser` stops at its old landing-link selector (`Explore the experiments ↗` versus the current `Explore experiments ↗`). `pnpm test:interactions` completes the earlier experiment interactions, then stops when opening Town because it expects hidden controls; the unchanged experiment shell explicitly opens Town controls on creation. Those scripts and the relevant landing/shell behavior were not changed by this refactor. These broader scripts cannot be reported as passing.
