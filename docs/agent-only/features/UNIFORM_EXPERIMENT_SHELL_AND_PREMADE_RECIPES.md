# Uniform experiment shell and premade recipes

Date: 2026-10-06  
Status: architectural contract  
Scope: every premade, generated, imported, remixed, and manually assembled experiment.

This document defines how experiments should be assembled and presented uniformly. It applies the lessons from the gas-pressure and projectile-comparison experiments to the whole application. It complements [the simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md) and the existing builder feature documentation.

The approved file structure, dependency boundaries, migration sequence, and mandatory checks are specified in [Strict premade JSON recipe convention and migration](../implementation/013-PREMADE-JSON-RECIPE-CONVENTION.md). These are target requirements; the presence of legacy files or the initial gas JSON extraction does not imply migration is complete. Where older implementation documents prescribe premade re-export trees, this contract and implementation 013 supersede that convention.

## 1. Decision

The application has **one experiment shell**.

A premade experiment is **only a recipe**: a versioned declaration of model instances, visible components, connections, lesson copy, starting configuration, and presentation. It does not own a page, toolbar, prompt bar, save flow, import flow, or special shell.

Gas pressure, projectile comparison, counting circles, a generated experiment, an imported recipe, and an experiment assembled manually must all enter the same shell and the same runtime. Their recipes differ; the surrounding application does not.

The shell must not branch on identifiers such as `gas`, `projectile`, `counting`, or a `focusedExperiment` allowlist. If a presentation capability is useful, it must be available declaratively to any compatible recipe.

## 2. Ownership boundary

| Layer | Owns | Must not own |
| --- | --- | --- |
| Experiment shell | Back navigation, title location, experiment-options menu, canvas viewport, bottom chat, auxiliary settings drawer, save/import/remix entry points, responsive viewport behavior | Domain controls, measurements, simulation-specific layout, experiment-ID styling |
| Recipe | Lesson title and instruction, model instances, visible components, typed connections, starting values, component positions and sizes, responsive presentation metadata | Page chrome, application navigation, a separate chat implementation, custom persistence behavior |
| Shared component | Its accessible interaction, typography, units, focus states, validation, compact behavior, and authoring presentation | Premade-specific patches or knowledge of which experiment uses it |
| Model/runtime | Accepted state, commands, calculations, outputs, reset behavior, deterministic execution | Visual layout or application navigation |

This boundary is the central rule. A visual problem in an ordinary slider is fixed in the shared slider. A poor arrangement is fixed in the recipe presentation. Neither is fixed by creating another shell.

## 3. The uniform shell contract

Every experiment opens with the same application structure:

1. Back navigation and experiment title.
2. A compact **Experiment options** menu.
3. One shared spatial stage containing the recipe's independently editable components.
4. Shared canvas navigation appropriate to the viewport.
5. The same bottom chat for requesting changes.
6. The same auxiliary settings drawer when a recipe exposes secondary settings.

The **Experiment options** menu provides the same operations for every experiment:

- Save or download the recipe.
- Import or upload a recipe through the shared import flow.
- Remix the current recipe in the builder.
- Enter manual building when applicable.
- Return home.

An unavailable operation may be disabled with a concrete reason. It must not disappear merely because the experiment ID is absent from an allowlist.

The shell may respond to declared presentation capabilities. For example, an immersive 3D recipe may request an immersive stage. That remains a mode of the one shell and must be reusable by any compatible recipe. Code such as `demo === "town"` is not the capability contract.

## 4. A premade is a recipe

A premade catalog entry is derived from recipe metadata and selects that recipe. All intentional starting defaults are authored in the recipe itself. The entry must not supply a second set of parameters or select a custom learner page.

The recipe declares:

- A stable recipe ID and version.
- One or more model instances with stable instance IDs.
- Component definitions and versions.
- Typed command, value, and attachment connections.
- Authored starting parameters and units.
- Lesson title, instruction, and assumptions.
- Visible scene, control, action, and measurement components.
- Board positions, dimensions, ordering, and responsive behavior.
- Any reusable presentation capability requested from the shell.

The same public component catalog, validation, runtime, canvas host, and serialization used by the builder must render the premade. A premade must not recreate a slider, result, or scene directly in its route.

Catalog metadata—title, description, icon, category, and ordering—lives in the recipe JSON. Catalog views project that data; they do not maintain separate handwritten metadata or default tables.

### 4.1 Strict file structure

Every shipped premade has exactly one regular file:

```text
src/web/src/simulations/pre-made/<slug>/recipe.json
```

The slug uses lowercase letters, digits, and single hyphens. Each independently selectable experiment has its own directory; a single projectile and a two-projectile comparison are separate recipes when both are offered.

The premade root contains only experiment directories. Each experiment directory contains only `recipe.json`: no subfolders, re-exports, TypeScript, CSS, documentation, tests, schemas, assets, or alternative JSON filenames. The builder and shared component library consume premade data; neither owns a second copy of a premade definition.

Tests, shared assets, loading, validation, registry generation, and legacy migrations have designated homes outside this tree, defined in implementation 013.

### 4.2 Generic loading and single ownership

Only `runtime/recipes/premadeRegistry.generated.ts` may directly import premade JSON in production. One generic registry, loader, and serializer serve all experiments. Components, planner code, defaults resources, routes, and builder code must not import a particular premade directly.

The JSON explicitly declares the complete authored composition. Loading may validate, clone, initialize registered providers, and remap identities for insertion. It must not generate a premade from model commands, filter generated controls, inject starting values, or patch lesson layout based on experiment identity.

Shared component definitions continue to own supported input contracts, calculations, and rendering. Recipe-specific authored values remain explicit in JSON. Exposed parameter defaults and schema-required title mirrors must agree with their authored targets.

One public recipe format covers premade, generated, imported, remixed, and completed manual experiments. Schema changes must have implemented validation and versioned migration before recipes use them. A format declaration is not evidence that its loader exists.

### 4.3 Retirement and enforcement

Migrating a premade removes its old current composition, duplicate defaults, dedicated loader, and re-export tree. Necessary historical readers live in `runtime/recipes/compatibility/` and translate into the current contract. They must not preserve a second active runtime.

Automated structure, dependency, schema, behavioral, round-trip, and browser checks are mandatory. Migration is incomplete while temporary exemptions or parallel current sources remain.

## 5. Gas pressure as the single-variable reference

As of 2026-10-06, the initial extraction is [gas-pressure.recipe.json](../../../src/web/src/simulations/pre-made/gas/gas-pressure.recipe.json), the only file in `pre-made/gas/`. It currently uses `loadGasPressureRecipe()` and a direct compatibility-default import. This is an intermediate implementation, not an exception to §4.

The migration target is `pre-made/gas/recipe.json`, loaded through the generic registry and loader. Remove the dedicated loader and direct defaults import; initialize the model from the recipe through shared runtime orchestration. Preserve the existing appearance and interactions while completing that migration. Component implementations and model command bounds remain shared public contracts.

The gas recipe demonstrates a focused relationship:

> How does changing volume affect pressure when temperature and the amount of gas stay fixed?

Its authored composition is:

| Component | Role |
| --- | --- |
| Gas model | Owns fixed amount and temperature, accepts volume, calculates pressure |
| Gas scene | Shows the cylinder, piston, and illustrative particles |
| Volume slider | Changes the model's volume |
| Pressure readout | Observes pressure from the accepted model state |

The learner sees one decision, one physical effect, and one quantitative result. The model may support temperature, amount, playback, and other capabilities without exposing all of them in this recipe.

The scene, slider, and readout remain separate board items. Their clean proximity comes from authored presentation, not from locking them inside a gas-specific panel or shell.

## 6. Projectile comparison as the multi-instance reference

The projectile recipe demonstrates a comparison while retaining the same shell:

> How does launch angle change distance and height when speed and gravity stay fixed?

Its authored composition is:

| Component | Role |
| --- | --- |
| Projectile model 1 | Owns Ball 1's angle and calculated flight |
| Projectile model 2 | Owns Ball 2's angle and calculated flight |
| Shared projectile scene | Receives both model appearances and draws both trajectories on the same scale |
| Ball 1 angle slider | Changes only Ball 1's launch angle |
| Ball 2 angle slider | Changes only Ball 2's launch angle |
| Four readouts | Observe distance and height for each ball |

The comparison uses one stable visual scale so changing an angle does not visually redefine the coordinate system. Color and labels associate each trajectory with its controls and results. Speed and gravity remain fixed lesson conditions unless another recipe explicitly explores them.

On narrow screens, the same independent components reflow. Redundant measurement cards may yield to the labeled scene summary when necessary, while both primary angle controls remain visible and operable. The authoring document still retains all components.

The projectile comparison does not require a projectile shell. It requires a recipe containing two model instances and one shared scene attachment.

## 7. Shared component presentation

Uniformity does not mean every experiment has the same arrangement. It means the same component follows the same visual and behavioral contract wherever it appears.

A slider must provide:

- A concise label.
- One prominent editable value and nearby unit.
- A full-width track with a clear thumb.
- Useful limits.
- Keyboard and touch operation.
- Predictable rejected-input recovery.

A readout must provide:

- A clear label.
- A prominent, stable-width value.
- A nearby unit.
- Intentional precision.
- A distinct unavailable state.

A scene must provide:

- Enough space to inspect the relevant change.
- Stable visual references for comparison.
- Accessible naming independent of optional visible labels.
- A clear distinction between illustrative graphics and authoritative results.

Buttons, forms, readouts, and scenes must retain these qualities in learner mode, builder mode, **Try lesson**, desktop, and narrow viewports. Builder authoring chrome must not force labels or values into clipped or unreadable layouts.

## 8. Save, upload, import, and remix are one round trip

Saving a premade and uploading it again must reproduce the same authored experiment. This is not an approximate model reload.

The shared round trip is:

```text
recipe/document
    → validate
    → serialize with versioned identities
    → download or store
    → upload/import
    → parse and migrate
    → validate atomically
    → render in the same experiment shell
```

Save, upload, import, and remix must use the same canonical serialization and parser. Premades do not get a reduced export format, and imported recipes do not get a different shell.

An exact authored round trip preserves:

- Recipe ID and version.
- Model and component definitions and versions.
- Stable instance, node, connection, layout, and group identities, subject only to explicit collision-safe remapping during insertion.
- Model starting values, units, bounds, and accepted defaults.
- Component labels, precision, and configuration.
- Typed connections and argument bindings.
- Lesson title, instruction, and assumptions.
- Board positions, sizes, ordering, grouping, learner area, and responsive presentation metadata.
- Which scene receives which model instances.
- Reset behavior and the authored starting state.

An ordinary **Save recipe** operation saves authored starting state, not incidental animation progress or a half-entered form draft. If the product later supports runtime checkpoints, that must be a separate explicit format and action.

Import is atomic. Invalid versions, definitions, connections, values, units, identities, or presentation data must leave the current experiment untouched and produce a recoverable error. A successful route change alone does not prove a successful import.

Remix opens the same recipe as editable components in the builder. After remixing:

- Every intended scene, control, and result is present.
- Independent components remain independently selectable, movable, resizable, and configurable.
- Connections still target the correct model instances.
- **Try lesson** produces the same learner behavior.
- Saving and uploading the remixed result repeats the same round trip.

## 9. Presentation must be declarative

Recipe presentation may declare:

- Board rectangles and ordering.
- Groups with an instructional or authoring purpose.
- A learner area and starting view.
- Responsive reflow priority.
- Whether a measurement is redundant with an accessible compact scene summary on a narrow screen.
- A reusable immersive-scene capability.

Presentation must not be selected by experiment ID inside the shell. Avoid:

```ts
if (demo === "gas") { /* different shell */ }
if (["gas", "projectile", "counting"].includes(demo)) { /* focused shell */ }
```

Prefer validated recipe metadata and component capabilities that can be used by any experiment.

CSS follows the same boundary. Application-shell styles target shell roles. Component styles target shared component definitions or declared states. Recipe-specific coordinates live in presentation data. A selector such as `.experiment-workspace--gas` must not determine whether chat, save, import, or navigation exists.

## 10. Runtime and state consistency

For every accepted interaction, these must agree:

```text
visible control
    → validated command
    → accepted model state
    → scene rendering
    → measurement output
```

A control must never display an unaccepted value as if it were active. A scene and readout must observe the same accepted model revision. Changing presentation, opening options, saving, or entering the builder must not restart an experiment silently.

Multi-instance recipes require explicit target identities. In projectile comparison, Ball 1's slider changes Ball 1 and Ball 2's slider changes Ball 2. Shared conditions are represented through shared authored values or deliberate multi-target commands, not ambiguous global state.

## 11. Implementation rules

When adding or revising an experiment:

1. Define the learning question.
2. Select the smallest useful set of public components.
3. Assemble them into a validated recipe.
4. Author their connections and starting configuration.
5. Author desktop and narrow presentation.
6. Open the recipe through the standard experiment shell.
7. Improve weak shared components at their source.
8. Save the recipe, upload it, and compare the reconstructed document.
9. Remix it, inspect independent components, and run **Try lesson**.
10. Verify representative interactions and responsive layouts in the browser.

For premades, the authored output must be the sole `pre-made/<slug>/recipe.json` file. Follow implementation 013 for shared infrastructure, metadata ownership, compatibility migration, and automated enforcement. Helpers may assist authoring, but shipped compositions must be materialized before runtime loading.

Do not add a shell branch to make one premade cleaner. Do not bypass the recipe system with a standalone page. Do not duplicate save or upload code for a domain.

## 12. Acceptance checklist

An experiment is complete only when:

- It uses the same shell, options menu, canvas host, bottom chat, save/import/remix actions, and responsive viewport as other experiments.
- Its premade definition is a recipe rather than a custom page.
- Its directory contains exactly one `recipe.json`, with no implementation or re-export files.
- Catalog metadata and starting values come from that recipe, without route/session overrides.
- Only the designated registry imports premade JSON; generic loading does not construct or patch a domain-specific composition.
- Old current definitions are removed and required historical readers use the designated compatibility path.
- Its visible controls directly support the learning question.
- Scenes, controls, and measurements are independently editable where appropriate.
- Its shared components are readable and attractive in learner and builder modes.
- Its desktop opening view makes the primary relationship obvious.
- Its narrow opening view keeps the primary controls readable and unobstructed.
- Save followed by upload/import reconstructs the same authored experiment.
- Remix followed by **Try lesson** preserves behavior and presentation.
- Invalid import and invalid interaction paths are atomic and recoverable.
- Browser checks cover the premade, a changed state, narrow layout, builder remix, **Try lesson**, and save/upload round trip.
- Mandatory structure, import-boundary, contract, runtime, and visual checks pass, with no permanent migration exemptions.

Gas pressure and projectile comparison are reference recipes, not privileged application modes. Every future premade must be able to reach the same quality through the same shell, component catalog, recipe format, runtime, and persistence path.
