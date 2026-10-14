# Simulation pipeline refactor: complete file manifest

Migration inventory used for the implemented source moves and responsibility extractions. See [the plan](SIMULATION_PIPELINE_REFACTOR_PLAN.md) for behavior requirements and [the current walkthrough](SIMULATION_GENERATION_AND_EDITING_PIPELINE.md) for final ownership. Counts below describe the original source inventory, not a new census.

Inventory: **554 existing files mapped**, **31 new extraction/integration files**, **567 current caller/document paths flagged**. These counts overlap: a moved file may also need import edits.

## 1. New files to create

| Planned file | Responsibility / source |
| --- | --- |
| `src/web/src/simulations/creation-and-editing/authoring-engine/finalizeRecipe.ts` | Extract final recipe construction/dependencies from operations.ts. |
| `src/web/src/simulations/creation-and-editing/component-selection/assemblyCandidates.ts` | Extract assembly ranking, capability cards and instance counts from assemblyCreation.ts. |
| `src/web/src/simulations/creation-and-editing/component-selection/editCandidates.ts` | Extract grouped current-component operation candidates from edit.ts. |
| `src/web/src/simulations/creation-and-editing/component-selection/selectEditTargets.ts` | Extract edit target choice and bounded target recovery; no permanent wrong shortlist. |
| `src/web/src/simulations/creation-and-editing/composer/choosePresentation.ts` | Extract control/observation selection; avoid mixed value contracts. |
| `src/web/src/simulations/creation-and-editing/composer/configureAssembly.ts` | Extract numeric/settings configuration from assemblyCreation.ts. |
| `src/web/src/simulations/creation-and-editing/composer/create.ts` | One creation coordinator over explicit supported strategies; extracted from planner/index.ts. |
| `src/web/src/simulations/creation-and-editing/composer/editArguments.ts` | Extract validated operation arguments from edit.ts; fix stale repair metadata separately. |
| `src/web/src/simulations/creation-and-editing/composer/editPlan.ts` | Extract selected fields/scope and numeric adjustments from edit.ts. |
| `src/web/src/simulations/creation-and-editing/input/api.ts` | Extract byte parsing, correlation and terminal response handling from app/api/apertus/route.ts. |
| `src/web/src/simulations/creation-and-editing/input/context.ts` | Project lesson/builder active context without owning UI state. |
| `src/web/src/simulations/creation-and-editing/input/results.ts` | Extract result contracts/parser from planner/schema.ts. |
| `src/web/src/simulations/creation-and-editing/intent-interpreter/contracts.ts` | Extract TeachingIntent and intent schemas from planner/schema.ts. |
| `src/web/src/simulations/creation-and-editing/intent-interpreter/interpretCreation.ts` | Extract teaching_intent invocation from planner/index.ts. |
| `src/web/src/simulations/creation-and-editing/intent-interpreter/interpretEdit.ts` | Extract edit/new/runtime/clarify semantics from planner/edit.ts. |
| `src/web/src/simulations/creation-and-editing/server.ts` | Explicit server entry for API/planner; not a general barrel. |
| `src/web/src/simulations/creation-and-editing/validator/edit.ts` | Extract plan overlap, result validity and preservation checks from edit.ts. |
| `src/web/src/simulations/creation-and-editing/validator/recipe.ts` | Extract recipe invariants from authoring/recipes.ts. |
| `src/web/src/simulations/registry/contracts/defaults.ts` | Extract schemaDefault from components/composites/catalog.ts. |
| `src/web/src/simulations/registry/contracts/publicDefinition.ts` | Extract PublicDefinition from authoring/types.ts. |
| `src/web/src/simulations/registry/definitions/canvases.ts` | Extract shared canvas metadata; preserve supported canvases. |
| `src/web/src/simulations/registry/definitions/controls.ts` | Extract active generic control metadata; exclude retired aliases from discovery. |
| `src/web/src/simulations/registry/definitions/displays.ts` | Extract active shared display metadata from generic/catalog modules. |
| `src/web/src/simulations/registry/discovery.ts` | Move active discovery projection/ranking ownership out of legacy catalog. |
| `src/web/src/simulations/registry/index.ts` | Explicit identity lookup and declaration integration; no inference or React imports. |
| `src/web/src/simulations/registry/legacyDefinitions.ts` | Single adapter for existing domain/compatibility definitions, without duplicate native IDs. |
| `src/web/src/simulations/registry/models/domainModels.ts` | Integrate current domain contribution declarations through existing legacy assembly bridge. |
| `src/web/src/simulations/registry/presets.ts` | Data-only preset discovery/application inventory, distinct from document components. |
| `src/web/src/simulations/registry/recipes/builtIn.ts` | Extract supported built-in recipe registration from composites/catalog.ts. |
| `src/web/src/simulations/registry/recipes/learningConfiguration.ts` | Extract math model capture helper from composites/catalog.ts. |
| `src/web/src/simulations/registry/recipes/modelRecipe.ts` | Extract default assembly construction from composites/catalog.ts. |

## 2. Pipeline implementation moves

| Existing file | Proposed file | Action |
| --- | --- | --- |
| `src/web/src/lib/apertus/config.ts` | `src/web/src/simulations/creation-and-editing/input/inference/apertusConfig.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/apertus/prompts.ts` | `src/web/src/simulations/creation-and-editing/input/inference/prompts.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/apertus/structuredSchema.ts` | `src/web/src/simulations/creation-and-editing/input/inference/structuredSchema.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/apertus/transport.ts` | `src/web/src/simulations/creation-and-editing/input/inference/transport.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/config.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/config.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/contracts.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/contracts.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/errors.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/errors.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/factory.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/factory.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/providers/jev.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/providers/jev.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/providers/laya.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/providers/laya.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/providers/validation.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/providers/validation.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/decisions/transport/http.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/transport/http.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/llm/adapters.ts` | `src/web/src/simulations/creation-and-editing/input/inference/adapters.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/llm/config.ts` | `src/web/src/simulations/creation-and-editing/input/inference/config.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/argumentJson.ts` | `src/web/src/simulations/creation-and-editing/input/inference/parseJson.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/assemblyCreation.ts` | `src/web/src/simulations/creation-and-editing/composer/createFromAssemblies.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/browser.ts` | `src/web/src/simulations/creation-and-editing/input/browser.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/bucket.ts` | `src/web/src/simulations/creation-and-editing/component-selection/componentCandidates.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/budget.ts` | `src/web/src/simulations/creation-and-editing/budget.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/catalog.ts` | `src/web/src/simulations/creation-and-editing/component-selection/recipeCapabilities.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/compose.ts` | `src/web/src/simulations/creation-and-editing/composer/composeFromComponents.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/compositionPolicy.ts` | `src/web/src/simulations/creation-and-editing/composer/policy.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/compositionQuality.ts` | `src/web/src/simulations/creation-and-editing/validator/compositionQuality.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/compositionTools.ts` | `src/web/src/simulations/creation-and-editing/composer/availableOperations.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/constraints.ts` | `src/web/src/simulations/creation-and-editing/validator/requestConstraints.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/construction.ts` | `src/web/src/simulations/creation-and-editing/simulation/construction/contracts.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/constructionPublisher.ts` | `src/web/src/simulations/creation-and-editing/simulation/construction/publisher.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/context.ts` | `src/web/src/simulations/creation-and-editing/input/inference/messages.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/coverage.ts` | `src/web/src/simulations/creation-and-editing/validator/coverage.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/diagnostics.ts` | `src/web/src/simulations/creation-and-editing/diagnostics.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/edit.ts` | `src/web/src/simulations/creation-and-editing/composer/edit.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/editFields.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/configurationPatch.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/errorFormatting.ts` | `src/web/src/simulations/creation-and-editing/input/errorFormatting.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/errors.ts` | `src/web/src/simulations/creation-and-editing/errors.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/eventStream.ts` | `src/web/src/simulations/creation-and-editing/input/eventStream.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/focusedTurn.ts` | `src/web/src/simulations/creation-and-editing/composer/operationArguments.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/formatFixer.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/normalizeOperations.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/index.ts` | `src/web/src/simulations/creation-and-editing/pipeline.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/learnerPresentation.ts` | `src/web/src/simulations/creation-and-editing/simulation/layout/learnerLayout.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/progress.ts` | `src/web/src/simulations/creation-and-editing/input/progress.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/schema.ts` | `src/web/src/simulations/creation-and-editing/input/contracts.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/selection/acceptance.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/acceptance.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/selection/compositionStrategy.ts` | `src/web/src/simulations/creation-and-editing/component-selection/selectCompositionStrategy.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/selection/policy.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/policy.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/selection/questions.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/questions.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/selection/selectCapability.ts` | `src/web/src/simulations/creation-and-editing/component-selection/selectAssemblies.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/stages.ts` | `src/web/src/simulations/creation-and-editing/composer/recipeArguments.ts` | Move existing implementation; update imports. |
| `src/web/src/lib/planner/turnSchema.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/tools.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/RecipeLesson.tsx` | `src/web/src/simulations/creation-and-editing/simulation/RecipeLesson.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/board/DrawingEditor.tsx` | `src/web/src/simulations/creation-and-editing/simulation/board/DrawingEditor.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/board/DrawingIcon.tsx` | `src/web/src/simulations/creation-and-editing/simulation/board/DrawingIcon.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/board/DrawingInspector.tsx` | `src/web/src/simulations/creation-and-editing/simulation/board/DrawingInspector.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/board/SpatialBoard.tsx` | `src/web/src/simulations/creation-and-editing/simulation/board/SpatialBoard.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/board/board.css` | `src/web/src/simulations/creation-and-editing/simulation/board/board.css` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/board/drawings.css` | `src/web/src/simulations/creation-and-editing/simulation/board/drawings.css` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe-lesson.css` | `src/web/src/simulations/creation-and-editing/simulation/recipe-lesson.css` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/CanvasPresentation.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/CanvasPresentation.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/ControlPresentation.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/ControlPresentation.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/DisplayPresentation.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/DisplayPresentation.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/ImportedHTMLView.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/ImportedHTMLView.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/NodeView.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/NodeView.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/RecipeAppearance.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/RecipeAppearance.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/RecipeLayout.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/RecipeLayout.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/contexts.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/contexts.tsx` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/formatObservation.ts` | `src/web/src/simulations/creation-and-editing/simulation/recipe/formatObservation.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/imported-component.css` | `src/web/src/simulations/creation-and-editing/simulation/recipe/imported-component.css` | Move existing implementation; update imports. |
| `src/web/src/simulations/components/views/recipe/snapshotAdapters.ts` | `src/web/src/simulations/creation-and-editing/simulation/recipe/snapshotAdapters.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/capabilities.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/capabilities.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/client.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/client.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/contracts.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/contracts.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/handleStore.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/handleStore.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/memoryRepository.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/memoryRepository.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/providers.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/providers.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/runner.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/runner.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/scenarios.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/scenarios.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/agents/scheduler.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/scheduler.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/adapters.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/compatibility/assemblyDocument.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/arrangement.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/arrangement.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/bindings.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/bindings.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/board.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/board.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/composites.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/composites.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/connections.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/connections.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/dataProviders.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/data.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/drawings.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/drawings.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/explorationProviders.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/exploration.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/graphLayout.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/graphLayout.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/insertion.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/insertion.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/operations.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/operations.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/providers.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/index.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/recipes.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/recipes.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/references.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/references.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/regenerateTruss.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/regenerateTruss.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/requireValue.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/requireValue.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/responsiveLayout.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/responsiveLayout.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/runnable.ts` | `src/web/src/simulations/creation-and-editing/validator/runnable.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/runtime.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/DocumentRuntime.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/spatialProviders.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/spatial.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/transaction.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/transaction.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/types.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/document.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/validate.ts` | `src/web/src/simulations/creation-and-editing/validator/document.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/commands.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/commands.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/createScene.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/createScene.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/index.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/index.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/observations.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/observations.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/projectCanvas.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/projectCanvas.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/runtimeState.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/runtimeState.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/types.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/types.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/useCanvasRuntime.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/useCanvasRuntime.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/validateBindings.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateBindings.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/validateScene.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateScene.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/validateSingleScene.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateSingleScene.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/composition/validateWorkspace.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateWorkspace.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/imported/contract.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/imported/contract.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/imported/provider.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/imported/provider.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/imported/recipe.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/compatibility/importedRecipe.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/imported/runner.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/imported/runner.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/imported/verify.ts` | `src/web/src/simulations/creation-and-editing/validator/imported.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/recipeSession.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/RecipeSession.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/recipes/loadRecipe.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/loadRecipe.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/recipes/schema.ts` | `src/web/src/simulations/creation-and-editing/validator/parseRecipe.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/recipes/serializeRecipe.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/serializeRecipe.ts` | Move existing implementation; update imports. |

## 3. Promoted registry files

| Existing file | Proposed file | Action |
| --- | --- | --- |
| `src/web/src/simulations/components/contracts/ActionContract.ts` | `src/web/src/simulations/registry/contracts/objects/ActionContract.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/ComponentDefinition.ts` | `src/web/src/simulations/registry/contracts/objects/ComponentDefinition.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/LineParameters.ts` | `src/web/src/simulations/registry/contracts/objects/LineParameters.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/Observation.ts` | `src/web/src/simulations/registry/contracts/objects/Observation.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/OutputContract.ts` | `src/web/src/simulations/registry/contracts/objects/OutputContract.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/PropertyContract.ts` | `src/web/src/simulations/registry/contracts/objects/PropertyContract.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/composition.ts` | `src/web/src/simulations/registry/contracts/objects/composition.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/numericField.ts` | `src/web/src/simulations/registry/contracts/objects/numericField.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/contracts/objectFields.ts` | `src/web/src/simulations/registry/contracts/objects/objectFields.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/ActionButton.tsx` | `src/web/src/simulations/registry/controls/ActionButton.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/ActivityControl.tsx` | `src/web/src/simulations/registry/controls/ActivityControl.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/FractionEntry.tsx` | `src/web/src/simulations/registry/controls/FractionEntry.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/IntegerStepper.tsx` | `src/web/src/simulations/registry/controls/IntegerStepper.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/NumberField.tsx` | `src/web/src/simulations/registry/controls/NumberField.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/PlaybackControl.tsx` | `src/web/src/simulations/registry/controls/PlaybackControl.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/RangeInput.tsx` | `src/web/src/simulations/registry/controls/RangeInput.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/ScalarControl.tsx` | `src/web/src/simulations/registry/controls/ScalarControl.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/SchemaForm.tsx` | `src/web/src/simulations/registry/controls/SchemaForm.tsx` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/commandPresentation.ts` | `src/web/src/simulations/registry/contracts/commandPresentation.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/controlContract.ts` | `src/web/src/simulations/registry/contracts/controlContract.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/controls/interactionPolicy.ts` | `src/web/src/simulations/registry/contracts/interactionPolicy.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/Building.ts` | `src/web/src/simulations/registry/objects/Building.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/FractionBar.ts` | `src/web/src/simulations/registry/objects/FractionBar.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/GasContainer.ts` | `src/web/src/simulations/registry/objects/GasContainer.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/Ground.ts` | `src/web/src/simulations/registry/objects/Ground.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/Line.ts` | `src/web/src/simulations/registry/objects/Line.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/Person.ts` | `src/web/src/simulations/registry/objects/Person.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/Road.ts` | `src/web/src/simulations/registry/objects/Road.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/definitions/Square.ts` | `src/web/src/simulations/registry/objects/Square.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/registry.ts` | `src/web/src/simulations/registry/objects/registry.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/views/dataPresentation.ts` | `src/web/src/simulations/registry/contracts/dataPresentation.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/components/views/recipe/observations.ts` | `src/web/src/simulations/registry/contracts/observations.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/runtime/contribution.ts` | `src/web/src/simulations/registry/contracts/domainContribution.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/runtime/parameterSchema.ts` | `src/web/src/simulations/registry/contracts/parameterSchema.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/runtime/recipes/premadeRegistry.generated.ts` | `src/web/src/simulations/registry/recipes/premade.generated.ts` | Promote currently consumed foundation; preserve identities and contracts. |
| `src/web/src/simulations/runtime/recipes/registry.ts` | `src/web/src/simulations/registry/recipes/premade.ts` | Promote currently consumed foundation; preserve identities and contracts. |

## 4. Preserved legacy files

| Existing file | Proposed file | Action |
| --- | --- | --- |
| `src/web/src/simulations/components/README.md` | `src/web/src/simulations/legacy/components/README.md` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/behaviors/AgentActivation.ts` | `src/web/src/simulations/legacy/components/behaviors/AgentActivation.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/behaviors/DailyRoutine.ts` | `src/web/src/simulations/legacy/components/behaviors/DailyRoutine.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/behaviors/ScheduledTrip.ts` | `src/web/src/simulations/legacy/components/behaviors/ScheduledTrip.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/agents.ts` | `src/web/src/simulations/legacy/components/catalog/agents.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/authoring.ts` | `src/web/src/simulations/legacy/components/catalog/authoring.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/biogeochemistry.ts` | `src/web/src/simulations/legacy/components/catalog/biogeochemistry.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/collective.ts` | `src/web/src/simulations/legacy/components/catalog/collective.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/controlDefinitions.ts` | `src/web/src/simulations/legacy/components/catalog/controlDefinitions.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/discovery.ts` | `src/web/src/simulations/legacy/components/catalog/discovery.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/earthAtmosphere.ts` | `src/web/src/simulations/legacy/components/catalog/earthAtmosphere.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/ecologyControls.ts` | `src/web/src/simulations/legacy/components/catalog/ecologyControls.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/exploration.ts` | `src/web/src/simulations/legacy/components/catalog/exploration.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/explorationTeaching.ts` | `src/web/src/simulations/legacy/components/catalog/explorationTeaching.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/generic.ts` | `src/web/src/simulations/legacy/components/catalog/generic.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/index.ts` | `src/web/src/simulations/legacy/components/catalog/index.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/learningModels.ts` | `src/web/src/simulations/legacy/components/catalog/learningModels.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/mathAnalysis.ts` | `src/web/src/simulations/legacy/components/catalog/mathAnalysis.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/mathGeometry.ts` | `src/web/src/simulations/legacy/components/catalog/mathGeometry.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/operations.ts` | `src/web/src/simulations/legacy/components/catalog/operations.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/physicsMechanics.ts` | `src/web/src/simulations/legacy/components/catalog/physicsMechanics.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/physicsThermalOptics.ts` | `src/web/src/simulations/legacy/components/catalog/physicsThermalOptics.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/science.ts` | `src/web/src/simulations/legacy/components/catalog/science.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/scopedLearningContracts.ts` | `src/web/src/simulations/legacy/components/catalog/scopedLearningContracts.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/spatial.ts` | `src/web/src/simulations/legacy/components/catalog/spatial.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/catalog/teaching.ts` | `src/web/src/simulations/legacy/components/catalog/teaching.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/composites/catalog.ts` | `src/web/src/simulations/legacy/components/composites/catalog.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/composites/gas.ts` | `src/web/src/simulations/legacy/components/composites/gas.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/composites/spatial.ts` | `src/web/src/simulations/legacy/components/composites/spatial.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/compositions/GasPressureExperiment.ts` | `src/web/src/simulations/legacy/components/compositions/GasPressureExperiment.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/compositions/TownExperiment.ts` | `src/web/src/simulations/legacy/components/compositions/TownExperiment.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/AgentActions.tsx` | `src/web/src/simulations/legacy/components/controls/AgentActions.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/ArithmeticControls.tsx` | `src/web/src/simulations/legacy/components/controls/ArithmeticControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/BoundControl.tsx` | `src/web/src/simulations/legacy/components/controls/BoundControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/BridgeCommands.ts` | `src/web/src/simulations/legacy/components/controls/BridgeCommands.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/BridgeControls.tsx` | `src/web/src/simulations/legacy/components/controls/BridgeControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/CoolingTimeline.tsx` | `src/web/src/simulations/legacy/components/controls/CoolingTimeline.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/CountingControls.tsx` | `src/web/src/simulations/legacy/components/controls/CountingControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/DragHandleControl.tsx` | `src/web/src/simulations/legacy/components/controls/DragHandleControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/EqualGroupsControls.tsx` | `src/web/src/simulations/legacy/components/controls/EqualGroupsControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/FoodWebPopulationControl.tsx` | `src/web/src/simulations/legacy/components/controls/FoodWebPopulationControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/FractionBuilderControls.tsx` | `src/web/src/simulations/legacy/components/controls/FractionBuilderControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/FractionInputControl.tsx` | `src/web/src/simulations/legacy/components/controls/FractionInputControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/FractionNumberLineControls.tsx` | `src/web/src/simulations/legacy/components/controls/FractionNumberLineControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/ImportedValueForm.tsx` | `src/web/src/simulations/legacy/components/controls/ImportedValueForm.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/MathCommands.ts` | `src/web/src/simulations/legacy/components/controls/MathCommands.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/MathObjectControl.tsx` | `src/web/src/simulations/legacy/components/controls/MathObjectControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/MathPlayback.tsx` | `src/web/src/simulations/legacy/components/controls/MathPlayback.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/MathPrimaryControls.tsx` | `src/web/src/simulations/legacy/components/controls/MathPrimaryControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/OptionSelect.tsx` | `src/web/src/simulations/legacy/components/controls/OptionSelect.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/OrbitCameraControl.tsx` | `src/web/src/simulations/legacy/components/controls/OrbitCameraControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/ParameterSlider.tsx` | `src/web/src/simulations/legacy/components/controls/ParameterSlider.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/PlaybackControls.tsx` | `src/web/src/simulations/legacy/components/controls/PlaybackControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/ProjectileCommands.ts` | `src/web/src/simulations/legacy/components/controls/ProjectileCommands.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/ProjectileControls.tsx` | `src/web/src/simulations/legacy/components/controls/ProjectileControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/PromptControl.ts` | `src/web/src/simulations/legacy/components/controls/PromptControl.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/SelectionControl.ts` | `src/web/src/simulations/legacy/components/controls/SelectionControl.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/TaskControl.tsx` | `src/web/src/simulations/legacy/components/controls/TaskControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/ToggleControl.tsx` | `src/web/src/simulations/legacy/components/controls/ToggleControl.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/TownCommands.ts` | `src/web/src/simulations/legacy/components/controls/TownCommands.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/TownControls.tsx` | `src/web/src/simulations/legacy/components/controls/TownControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/YoungLearnerControls.tsx` | `src/web/src/simulations/legacy/components/controls/YoungLearnerControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/chemistry/ChemistryControls.tsx` | `src/web/src/simulations/legacy/components/controls/chemistry/ChemistryControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/dynamic-systems/DynamicControls.tsx` | `src/web/src/simulations/legacy/components/controls/dynamic-systems/DynamicControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/natural-systems/NaturalControls.tsx` | `src/web/src/simulations/legacy/components/controls/natural-systems/NaturalControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/physical-systems/PhysicalControls.tsx` | `src/web/src/simulations/legacy/components/controls/physical-systems/PhysicalControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/controls/promptMatchers.ts` | `src/web/src/simulations/legacy/components/controls/promptMatchers.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/AIAgent.ts` | `src/web/src/simulations/legacy/components/prefabs/AIAgent.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/BridgeLoad.ts` | `src/web/src/simulations/legacy/components/prefabs/BridgeLoad.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/Building.ts` | `src/web/src/simulations/legacy/components/prefabs/Building.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/Citizen.ts` | `src/web/src/simulations/legacy/components/prefabs/Citizen.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/CounterToken.ts` | `src/web/src/simulations/legacy/components/prefabs/CounterToken.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/ElementaryBoards.ts` | `src/web/src/simulations/legacy/components/prefabs/ElementaryBoards.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/GasContainer.ts` | `src/web/src/simulations/legacy/components/prefabs/GasContainer.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/Joint.ts` | `src/web/src/simulations/legacy/components/prefabs/Joint.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/Market.ts` | `src/web/src/simulations/legacy/components/prefabs/Market.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/MathBoards.ts` | `src/web/src/simulations/legacy/components/prefabs/MathBoards.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/Member.ts` | `src/web/src/simulations/legacy/components/prefabs/Member.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/Projectile.ts` | `src/web/src/simulations/legacy/components/prefabs/Projectile.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/TrussAssembly.ts` | `src/web/src/simulations/legacy/components/prefabs/TrussAssembly.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/dynamic-systems/objects.ts` | `src/web/src/simulations/legacy/components/prefabs/dynamic-systems/objects.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/natural-systems/objects.ts` | `src/web/src/simulations/legacy/components/prefabs/natural-systems/objects.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/prefabs/physical-systems/objects.ts` | `src/web/src/simulations/legacy/components/prefabs/physical-systems/objects.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/ArithmeticTasks.ts` | `src/web/src/simulations/legacy/components/resources/ArithmeticTasks.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/BridgeStyles.ts` | `src/web/src/simulations/legacy/components/resources/BridgeStyles.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/CountingTasks.ts` | `src/web/src/simulations/legacy/components/resources/CountingTasks.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/DailySchedule.ts` | `src/web/src/simulations/legacy/components/resources/DailySchedule.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/EqualGroupsTasks.ts` | `src/web/src/simulations/legacy/components/resources/EqualGroupsTasks.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/FractionTasks.ts` | `src/web/src/simulations/legacy/components/resources/FractionTasks.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/GravityPresets.ts` | `src/web/src/simulations/legacy/components/resources/GravityPresets.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/LearningPolicies.ts` | `src/web/src/simulations/legacy/components/resources/LearningPolicies.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/MathAppearance.ts` | `src/web/src/simulations/legacy/components/resources/MathAppearance.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/ProjectileStyles.ts` | `src/web/src/simulations/legacy/components/resources/ProjectileStyles.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/TownAppearance.ts` | `src/web/src/simulations/legacy/components/resources/TownAppearance.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/TownLayout.ts` | `src/web/src/simulations/legacy/components/resources/TownLayout.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/WalkingProfile.ts` | `src/web/src/simulations/legacy/components/resources/WalkingProfile.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/chemistry/definitions.ts` | `src/web/src/simulations/legacy/components/resources/chemistry/definitions.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/dynamic-systems/defaults.ts` | `src/web/src/simulations/legacy/components/resources/dynamic-systems/defaults.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/economics/defaults.ts` | `src/web/src/simulations/legacy/components/resources/economics/defaults.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/natural-systems/defaults.ts` | `src/web/src/simulations/legacy/components/resources/natural-systems/defaults.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/resources/physical-systems/defaults.ts` | `src/web/src/simulations/legacy/components/resources/physical-systems/defaults.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/AgentSystems.ts` | `src/web/src/simulations/legacy/components/systems/AgentSystems.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ArithmeticSystem.ts` | `src/web/src/simulations/legacy/components/systems/ArithmeticSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/BallisticMotionSystem.ts` | `src/web/src/simulations/legacy/components/systems/BallisticMotionSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/BehaviorRunnerSystem.ts` | `src/web/src/simulations/legacy/components/systems/BehaviorRunnerSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/BuildingGeometrySystem.ts` | `src/web/src/simulations/legacy/components/systems/BuildingGeometrySystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ComposedFractionSystem.ts` | `src/web/src/simulations/legacy/components/systems/ComposedFractionSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/CountingSystem.ts` | `src/web/src/simulations/legacy/components/systems/CountingSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ElementarySystems.ts` | `src/web/src/simulations/legacy/components/systems/ElementarySystems.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/EqualGroupingSystem.ts` | `src/web/src/simulations/legacy/components/systems/EqualGroupingSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/FractionBuilderSystem.ts` | `src/web/src/simulations/legacy/components/systems/FractionBuilderSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/FractionNumberLineSystem.ts` | `src/web/src/simulations/legacy/components/systems/FractionNumberLineSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/FractionObservationSystem.ts` | `src/web/src/simulations/legacy/components/systems/FractionObservationSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/GasParticleIllustrationSystem.ts` | `src/web/src/simulations/legacy/components/systems/GasParticleIllustrationSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/HeuristicBridgeResponseSystem.ts` | `src/web/src/simulations/legacy/components/systems/HeuristicBridgeResponseSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/IdealGasSystem.ts` | `src/web/src/simulations/legacy/components/systems/IdealGasSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/LineGeometrySystem.ts` | `src/web/src/simulations/legacy/components/systems/LineGeometrySystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/LineIntersectionSystem.ts` | `src/web/src/simulations/legacy/components/systems/LineIntersectionSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/LineObservationSystem.ts` | `src/web/src/simulations/legacy/components/systems/LineObservationSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/MeasurementSamplingSystem.ts` | `src/web/src/simulations/legacy/components/systems/MeasurementSamplingSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/NavigationSystem.ts` | `src/web/src/simulations/legacy/components/systems/NavigationSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/PathFollowingSystem.ts` | `src/web/src/simulations/legacy/components/systems/PathFollowingSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/RouteFollowingSystem.ts` | `src/web/src/simulations/legacy/components/systems/RouteFollowingSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/RouteSearchSystem.ts` | `src/web/src/simulations/legacy/components/systems/RouteSearchSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ScheduleSystem.ts` | `src/web/src/simulations/legacy/components/systems/ScheduleSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ScheduledTripSystem.ts` | `src/web/src/simulations/legacy/components/systems/ScheduledTripSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/SquareGeometrySystem.ts` | `src/web/src/simulations/legacy/components/systems/SquareGeometrySystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/TownObservationSystem.ts` | `src/web/src/simulations/legacy/components/systems/TownObservationSystem.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/biogeochemistry/carbon.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/carbon.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/biogeochemistry/contracts.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/contracts.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/biogeochemistry/nitrogen.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/nitrogen.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/biogeochemistry/oxygen.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/oxygen.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/biogeochemistry/transfers.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/transfers.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/chemistry/models.ts` | `src/web/src/simulations/legacy/components/systems/chemistry/models.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/collective/crowd.ts` | `src/web/src/simulations/legacy/components/systems/collective/crowd.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/collective/fishing.ts` | `src/web/src/simulations/legacy/components/systems/collective/fishing.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/collective/random.ts` | `src/web/src/simulations/legacy/components/systems/collective/random.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/collective/selection.ts` | `src/web/src/simulations/legacy/components/systems/collective/selection.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/collective/voting.ts` | `src/web/src/simulations/legacy/components/systems/collective/voting.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/debate/environment.ts` | `src/web/src/simulations/legacy/components/systems/debate/environment.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/debate/protocol.ts` | `src/web/src/simulations/legacy/components/systems/debate/protocol.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/dynamic-systems/models.ts` | `src/web/src/simulations/legacy/components/systems/dynamic-systems/models.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/earth-atmosphere/physics.ts` | `src/web/src/simulations/legacy/components/systems/earth-atmosphere/physics.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ecology/foodWeb.ts` | `src/web/src/simulations/legacy/components/systems/ecology/foodWeb.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ecology/foodWebSpecies.ts` | `src/web/src/simulations/legacy/components/systems/ecology/foodWebSpecies.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ecology/nutrients.ts` | `src/web/src/simulations/legacy/components/systems/ecology/nutrients.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/ecology/wildfire.ts` | `src/web/src/simulations/legacy/components/systems/ecology/wildfire.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/economics/models.ts` | `src/web/src/simulations/legacy/components/systems/economics/models.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/exploration/eclipse.ts` | `src/web/src/simulations/legacy/components/systems/exploration/eclipse.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/exploration/signals.ts` | `src/web/src/simulations/legacy/components/systems/exploration/signals.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/exploration/spring.ts` | `src/web/src/simulations/legacy/components/systems/exploration/spring.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/fractionMath.ts` | `src/web/src/simulations/legacy/components/systems/fractionMath.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/math-foundations/models.ts` | `src/web/src/simulations/legacy/components/systems/math-foundations/models.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/mathSequence.ts` | `src/web/src/simulations/legacy/components/systems/mathSequence.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/natural-systems/models.ts` | `src/web/src/simulations/legacy/components/systems/natural-systems/models.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physical-systems/models.ts` | `src/web/src/simulations/legacy/components/systems/physical-systems/models.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physical-systems/pendulumMotion.ts` | `src/web/src/simulations/legacy/components/systems/physical-systems/pendulumMotion.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/buoyancy.ts` | `src/web/src/simulations/legacy/components/systems/physics/buoyancy.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/capacitor.ts` | `src/web/src/simulations/legacy/components/systems/physics/capacitor.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/collision.ts` | `src/web/src/simulations/legacy/components/systems/physics/collision.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/conduction.ts` | `src/web/src/simulations/legacy/components/systems/physics/conduction.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/cooling.ts` | `src/web/src/simulations/legacy/components/systems/physics/cooling.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/doppler.ts` | `src/web/src/simulations/legacy/components/systems/physics/doppler.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/fibre.ts` | `src/web/src/simulations/legacy/components/systems/physics/fibre.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/flow.ts` | `src/web/src/simulations/legacy/components/systems/physics/flow.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/gears.ts` | `src/web/src/simulations/legacy/components/systems/physics/gears.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/hydraulics.ts` | `src/web/src/simulations/legacy/components/systems/physics/hydraulics.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/induction.ts` | `src/web/src/simulations/legacy/components/systems/physics/induction.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/latent.ts` | `src/web/src/simulations/legacy/components/systems/physics/latent.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/lens.ts` | `src/web/src/simulations/legacy/components/systems/physics/lens.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/lever.ts` | `src/web/src/simulations/legacy/components/systems/physics/lever.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/parachute.ts` | `src/web/src/simulations/legacy/components/systems/physics/parachute.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/pressure.ts` | `src/web/src/simulations/legacy/components/systems/physics/pressure.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/pulley.ts` | `src/web/src/simulations/legacy/components/systems/physics/pulley.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/string.ts` | `src/web/src/simulations/legacy/components/systems/physics/string.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/tipping.ts` | `src/web/src/simulations/legacy/components/systems/physics/tipping.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/physics/turning.ts` | `src/web/src/simulations/legacy/components/systems/physics/turning.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/science/contracts.ts` | `src/web/src/simulations/legacy/components/systems/science/contracts.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/science/environment.ts` | `src/web/src/simulations/legacy/components/systems/science/environment.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/science/life.ts` | `src/web/src/simulations/legacy/components/systems/science/life.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/social-systems/production.ts` | `src/web/src/simulations/legacy/components/systems/social-systems/production.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/systems/townNavigation.ts` | `src/web/src/simulations/legacy/components/systems/townNavigation.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/AIAgent.ts` | `src/web/src/simulations/legacy/components/traits/AIAgent.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/BallisticMotion.ts` | `src/web/src/simulations/legacy/components/traits/BallisticMotion.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/BehaviorBinding.ts` | `src/web/src/simulations/legacy/components/traits/BehaviorBinding.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/BehaviorState.ts` | `src/web/src/simulations/legacy/components/traits/BehaviorState.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/BridgeLoad.ts` | `src/web/src/simulations/legacy/components/traits/BridgeLoad.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/Building.ts` | `src/web/src/simulations/legacy/components/traits/Building.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/ElementaryBoards.ts` | `src/web/src/simulations/legacy/components/traits/ElementaryBoards.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/FlightMetrics.ts` | `src/web/src/simulations/legacy/components/traits/FlightMetrics.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/GasState.ts` | `src/web/src/simulations/legacy/components/traits/GasState.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/LaunchSettings.ts` | `src/web/src/simulations/legacy/components/traits/LaunchSettings.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/MathBoards.ts` | `src/web/src/simulations/legacy/components/traits/MathBoards.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/MeasurementProbe.ts` | `src/web/src/simulations/legacy/components/traits/MeasurementProbe.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/MemberEndpoints.ts` | `src/web/src/simulations/legacy/components/traits/MemberEndpoints.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/MemberResponse.ts` | `src/web/src/simulations/legacy/components/traits/MemberResponse.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/NavigationAgent.ts` | `src/web/src/simulations/legacy/components/traits/NavigationAgent.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/NavigationObstacle.ts` | `src/web/src/simulations/legacy/components/traits/NavigationObstacle.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/Resident.ts` | `src/web/src/simulations/legacy/components/traits/Resident.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/SceneObjects.ts` | `src/web/src/simulations/legacy/components/traits/SceneObjects.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/Transform2D.ts` | `src/web/src/simulations/legacy/components/traits/Transform2D.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/TrussSettings.ts` | `src/web/src/simulations/legacy/components/traits/TrussSettings.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/VisualBinding.ts` | `src/web/src/simulations/legacy/components/traits/VisualBinding.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/chemistry/ChemistryState.ts` | `src/web/src/simulations/legacy/components/traits/chemistry/ChemistryState.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/dynamic-systems/state.ts` | `src/web/src/simulations/legacy/components/traits/dynamic-systems/state.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/economics/EconomicsState.ts` | `src/web/src/simulations/legacy/components/traits/economics/EconomicsState.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/natural-systems/state.ts` | `src/web/src/simulations/legacy/components/traits/natural-systems/state.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/traits/physical-systems/state.ts` | `src/web/src/simulations/legacy/components/traits/physical-systems/state.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ArithmeticScene.tsx` | `src/web/src/simulations/legacy/components/views/ArithmeticScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/AssemblyRecipeView.tsx` | `src/web/src/simulations/legacy/components/views/AssemblyRecipeView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/AuthoredTownView.tsx` | `src/web/src/simulations/legacy/components/views/AuthoredTownView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/BridgeScene.tsx` | `src/web/src/simulations/legacy/components/views/BridgeScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/CartesianView.tsx` | `src/web/src/simulations/legacy/components/views/CartesianView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ComparisonView.tsx` | `src/web/src/simulations/legacy/components/views/ComparisonView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/CompositionCanvas.tsx` | `src/web/src/simulations/legacy/components/views/CompositionCanvas.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ControlsOverlay.tsx` | `src/web/src/simulations/legacy/components/views/ControlsOverlay.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/CountingScene.tsx` | `src/web/src/simulations/legacy/components/views/CountingScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/DatasetDisplay.tsx` | `src/web/src/simulations/legacy/components/views/DatasetDisplay.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/DisplayView.tsx` | `src/web/src/simulations/legacy/components/views/DisplayView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/DomainObservationViews.tsx` | `src/web/src/simulations/legacy/components/views/DomainObservationViews.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ElementaryExperimentView.tsx` | `src/web/src/simulations/legacy/components/views/ElementaryExperimentView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/EntityInspectorView.tsx` | `src/web/src/simulations/legacy/components/views/EntityInspectorView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/EqualGroupsScene.tsx` | `src/web/src/simulations/legacy/components/views/EqualGroupsScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ExperimentLessonFrame.tsx` | `src/web/src/simulations/legacy/components/views/ExperimentLessonFrame.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ExperimentView.tsx` | `src/web/src/simulations/legacy/components/views/ExperimentView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/FractionBuilderScene.tsx` | `src/web/src/simulations/legacy/components/views/FractionBuilderScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/FractionNumberLineScene.tsx` | `src/web/src/simulations/legacy/components/views/FractionNumberLineScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/GasPressureView.tsx` | `src/web/src/simulations/legacy/components/views/GasPressureView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/HistogramView.tsx` | `src/web/src/simulations/legacy/components/views/HistogramView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/InstanceRecipeLesson.tsx` | `src/web/src/simulations/legacy/components/views/InstanceRecipeLesson.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/LegacyRecipeView.tsx` | `src/web/src/simulations/legacy/components/views/LegacyRecipeView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/LegendView.tsx` | `src/web/src/simulations/legacy/components/views/LegendView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/MathExperimentView.tsx` | `src/web/src/simulations/legacy/components/views/MathExperimentView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/MathReadoutView.tsx` | `src/web/src/simulations/legacy/components/views/MathReadoutView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/MemberInspector.tsx` | `src/web/src/simulations/legacy/components/views/MemberInspector.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/MetricsView.tsx` | `src/web/src/simulations/legacy/components/views/MetricsView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ProbabilityScene.tsx` | `src/web/src/simulations/legacy/components/views/ProbabilityScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ProjectileObservationViews.tsx` | `src/web/src/simulations/legacy/components/views/ProjectileObservationViews.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ProjectileScene.tsx` | `src/web/src/simulations/legacy/components/views/ProjectileScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ResponsiveThreeCanvas.tsx` | `src/web/src/simulations/legacy/components/views/ResponsiveThreeCanvas.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ResultsTableView.tsx` | `src/web/src/simulations/legacy/components/views/ResultsTableView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/SVGWorldView.tsx` | `src/web/src/simulations/legacy/components/views/SVGWorldView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/SceneToolbar.tsx` | `src/web/src/simulations/legacy/components/views/SceneToolbar.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/SciencePanels.tsx` | `src/web/src/simulations/legacy/components/views/SciencePanels.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ScopedWorldView.tsx` | `src/web/src/simulations/legacy/components/views/ScopedWorldView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/SpatialRecipeView.tsx` | `src/web/src/simulations/legacy/components/views/SpatialRecipeView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/ThreeWorldView.tsx` | `src/web/src/simulations/legacy/components/views/ThreeWorldView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/TimeSeriesView.tsx` | `src/web/src/simulations/legacy/components/views/TimeSeriesView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/XYGraphView.tsx` | `src/web/src/simulations/legacy/components/views/XYGraphView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/agents/AgentAvatar.tsx` | `src/web/src/simulations/legacy/components/views/agents/AgentAvatar.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/agents/AgentViews.tsx` | `src/web/src/simulations/legacy/components/views/agents/AgentViews.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/agents/agents.css` | `src/web/src/simulations/legacy/components/views/agents/agents.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/biogeochemistry/CyclePanels.tsx` | `src/web/src/simulations/legacy/components/views/biogeochemistry/CyclePanels.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/biogeochemistry/CycleScene.tsx` | `src/web/src/simulations/legacy/components/views/biogeochemistry/CycleScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/biogeochemistry/cycles.css` | `src/web/src/simulations/legacy/components/views/biogeochemistry/cycles.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/bridge.css` | `src/web/src/simulations/legacy/components/views/bridge.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/chemistry/ChemistryLesson.css` | `src/web/src/simulations/legacy/components/views/chemistry/ChemistryLesson.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/chemistry/ChemistryLesson.tsx` | `src/web/src/simulations/legacy/components/views/chemistry/ChemistryLesson.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/collective/Controls.tsx` | `src/web/src/simulations/legacy/components/views/collective/Controls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/collective/CrowdScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/CrowdScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/collective/FishingScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/FishingScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/collective/SelectionScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/SelectionScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/collective/VotingScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/VotingScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/collective/collective.css` | `src/web/src/simulations/legacy/components/views/collective/collective.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/data-display.css` | `src/web/src/simulations/legacy/components/views/data-display.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/dynamic-systems/DynamicSystemsLesson.css` | `src/web/src/simulations/legacy/components/views/dynamic-systems/DynamicSystemsLesson.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/dynamic-systems/DynamicSystemsLesson.tsx` | `src/web/src/simulations/legacy/components/views/dynamic-systems/DynamicSystemsLesson.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/earth-atmosphere/Diagrams.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/Diagrams.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/earth-atmosphere/LessonControls.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/LessonControls.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/earth-atmosphere/LessonScene.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/LessonScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/earth-atmosphere/Scene3D.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/Scene3D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/earth-atmosphere/earth-atmosphere.css` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/earth-atmosphere.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/experiment-lesson.css` | `src/web/src/simulations/legacy/components/views/experiment-lesson.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/learning.css` | `src/web/src/simulations/legacy/components/views/learning.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-analysis/MathAnalysisScenes.tsx` | `src/web/src/simulations/legacy/components/views/math-analysis/MathAnalysisScenes.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-analysis/math-analysis.css` | `src/web/src/simulations/legacy/components/views/math-analysis/math-analysis.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-foundations/AssemblyView.css` | `src/web/src/simulations/legacy/components/views/math-foundations/AssemblyView.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-foundations/AssemblyView.tsx` | `src/web/src/simulations/legacy/components/views/math-foundations/AssemblyView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/BoxPackingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/BoxPackingScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/CanPackagingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/CanPackagingScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/CubeNetScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/CubeNetScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/FencedGardenScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/FencedGardenScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/PlaceValueScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/PlaceValueScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/PythagoreanScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/PythagoreanScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/RegularTilingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/RegularTilingScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/RigidMotionScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/RigidMotionScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/ScaleDrawingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/ScaleDrawingScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/TreeHeightScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/TreeHeightScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/geometry.css` | `src/web/src/simulations/legacy/components/views/math-geometry/geometry.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/index.ts` | `src/web/src/simulations/legacy/components/views/math-geometry/index.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/layout.ts` | `src/web/src/simulations/legacy/components/views/math-geometry/layout.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math-geometry/pythagorean.css` | `src/web/src/simulations/legacy/components/views/math-geometry/pythagorean.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/math.css` | `src/web/src/simulations/legacy/components/views/math.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/natural-systems/NaturalSystemsView.tsx` | `src/web/src/simulations/legacy/components/views/natural-systems/NaturalSystemsView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/natural-systems/natural-systems.css` | `src/web/src/simulations/legacy/components/views/natural-systems/natural-systems.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/physical-systems/PhysicalSystemsView.tsx` | `src/web/src/simulations/legacy/components/views/physical-systems/PhysicalSystemsView.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/physical-systems/physical-systems.css` | `src/web/src/simulations/legacy/components/views/physical-systems/physical-systems.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/projectile.css` | `src/web/src/simulations/legacy/components/views/projectile.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/scene-ui.css` | `src/web/src/simulations/legacy/components/views/scene-ui.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/science-lessons.css` | `src/web/src/simulations/legacy/components/views/science-lessons.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/science/ScienceComparison.tsx` | `src/web/src/simulations/legacy/components/views/science/ScienceComparison.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/science/ScienceInvestigation.tsx` | `src/web/src/simulations/legacy/components/views/science/ScienceInvestigation.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/science/learnerPresentation.ts` | `src/web/src/simulations/legacy/components/views/science/learnerPresentation.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/systems-comparisons.css` | `src/web/src/simulations/legacy/components/views/systems-comparisons.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/town.css` | `src/web/src/simulations/legacy/components/views/town.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/views/useCompactDiagram.ts` | `src/web/src/simulations/legacy/components/views/useCompactDiagram.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/BasketVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/BasketVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/BeamVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/BeamVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/BridgeSupportVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/BridgeSupportVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/BuildingVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/BuildingVisual3D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/CitizenVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/CitizenVisual3D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/CounterTokenVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/CounterTokenVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/CountingBoxVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/CountingBoxVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/ElementaryVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/ElementaryVisuals.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/FractionBarVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/FractionBarVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/FractionJumpVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/FractionJumpVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/GasContainerVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/GasContainerVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/GasParticleVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/GasParticleVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/GroundVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/GroundVisual3D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/LauncherVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/LauncherVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/LineVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/LineVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/LoadTruckVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/LoadTruckVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/MarketVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/MarketVisual3D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/NumberLineVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/NumberLineVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/OperationZonesVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/OperationZonesVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/RoadVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/RoadVisual3D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/ShapeVisual2D.tsx` | `src/web/src/simulations/legacy/components/visuals/ShapeVisual2D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/SquareVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/SquareVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/TownEnvironment.tsx` | `src/web/src/simulations/legacy/components/visuals/TownEnvironment.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/TownLabel.tsx` | `src/web/src/simulations/legacy/components/visuals/TownLabel.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/TownSceneryVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/TownSceneryVisual3D.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/TrajectoryVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/TrajectoryVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/VelocityArrowVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/VelocityArrowVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/biogeochemistry/CarbonScene.tsx` | `src/web/src/simulations/legacy/components/visuals/biogeochemistry/CarbonScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/biogeochemistry/NitrogenScene.tsx` | `src/web/src/simulations/legacy/components/visuals/biogeochemistry/NitrogenScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/biogeochemistry/OxygenScene.tsx` | `src/web/src/simulations/legacy/components/visuals/biogeochemistry/OxygenScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/biogeochemistry/SceneParts.tsx` | `src/web/src/simulations/legacy/components/visuals/biogeochemistry/SceneParts.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/bridgeDeformation.ts` | `src/web/src/simulations/legacy/components/visuals/bridgeDeformation.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/chemistry/ChemistryVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/chemistry/ChemistryVisuals.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/dynamic-systems/DynamicVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/dynamic-systems/DynamicVisuals.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/ecology/FoodWebVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/ecology/FoodWebVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/ecology/NutrientLimitationVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/ecology/NutrientLimitationVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/ecology/WildfireComparisonVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/ecology/WildfireComparisonVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/economics/EconomicsVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/economics/EconomicsVisuals.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/exploration/EclipseVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/exploration/EclipseVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/exploration/SpringVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/exploration/SpringVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/natural-systems/NaturalVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/natural-systems/NaturalVisuals.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physical-systems/PendulumScene.css` | `src/web/src/simulations/legacy/components/visuals/physical-systems/PendulumScene.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physical-systems/PendulumScene.tsx` | `src/web/src/simulations/legacy/components/visuals/physical-systems/PendulumScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physical-systems/PhysicalVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/physical-systems/PhysicalVisuals.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physics/LeverScene.tsx` | `src/web/src/simulations/legacy/components/visuals/physics/LeverScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physics/MechanicsScenes.tsx` | `src/web/src/simulations/legacy/components/visuals/physics/MechanicsScenes.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physics/ThermalOpticsScenes.tsx` | `src/web/src/simulations/legacy/components/visuals/physics/ThermalOpticsScenes.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physics/lever.css` | `src/web/src/simulations/legacy/components/visuals/physics/lever.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physics/mechanics.css` | `src/web/src/simulations/legacy/components/visuals/physics/mechanics.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/physics/thermal-optics.css` | `src/web/src/simulations/legacy/components/visuals/physics/thermal-optics.css` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/science/ScienceScene.tsx` | `src/web/src/simulations/legacy/components/visuals/science/ScienceScene.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/social-systems/ProductionComparisonVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/social-systems/ProductionComparisonVisual.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/townGeometry.tsx` | `src/web/src/simulations/legacy/components/visuals/townGeometry.tsx` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/components/visuals/townSurface.ts` | `src/web/src/simulations/legacy/components/visuals/townSurface.ts` | Preserve under legacy/components; redirect imports to promoted owners where needed. |
| `src/web/src/simulations/runtime/assembly.ts` | `src/web/src/simulations/legacy/runtime/assembly.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/assemblySession.ts` | `src/web/src/simulations/legacy/runtime/assemblySession.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/authoring/migrateControls.ts` | `src/web/src/simulations/legacy/compatibility/migrateControls.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/migrateDrawings.ts` | `src/web/src/simulations/legacy/compatibility/migrateDrawings.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/authoring/spatialMigration.ts` | `src/web/src/simulations/legacy/compatibility/spatialMigration.ts` | Move existing implementation; update imports. |
| `src/web/src/simulations/runtime/bridgeSession.ts` | `src/web/src/simulations/legacy/runtime/bridgeSession.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/capabilities.ts` | `src/web/src/simulations/legacy/runtime/capabilities.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/catalog.ts` | `src/web/src/simulations/legacy/runtime/catalog.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/definition.ts` | `src/web/src/simulations/legacy/runtime/definition.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/elementarySession.ts` | `src/web/src/simulations/legacy/runtime/elementarySession.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/gasSession.ts` | `src/web/src/simulations/legacy/runtime/gasSession.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/legacyPlan.ts` | `src/web/src/simulations/legacy/runtime/legacyPlan.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/mathCatalog.ts` | `src/web/src/simulations/legacy/runtime/mathCatalog.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/mathModel.ts` | `src/web/src/simulations/legacy/runtime/mathModel.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/mathSession.ts` | `src/web/src/simulations/legacy/runtime/mathSession.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/projectileSession.ts` | `src/web/src/simulations/legacy/runtime/projectileSession.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/providers.ts` | `src/web/src/simulations/legacy/runtime/providers.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/AngleComparisonExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/AngleComparisonExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/ArithmeticExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/ArithmeticExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/BridgeExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/BridgeExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/CountingExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/CountingExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/ElementaryExperiments.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/ElementaryExperiments.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/EqualGroupsExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/EqualGroupsExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/FractionBuilderExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/FractionBuilderExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/FractionNumberLineExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/FractionNumberLineExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/ProjectileExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/ProjectileExperiment.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/index.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/index.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/recipes/compatibility/presentation.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/presentation.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/records.ts` | `src/web/src/simulations/legacy/runtime/records.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/resolver.ts` | `src/web/src/simulations/legacy/runtime/resolver.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/session.ts` | `src/web/src/simulations/legacy/runtime/session.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/sweeps.ts` | `src/web/src/simulations/legacy/runtime/sweeps.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/townModel.ts` | `src/web/src/simulations/legacy/runtime/townModel.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/townSession.ts` | `src/web/src/simulations/legacy/runtime/townSession.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/trussModel.ts` | `src/web/src/simulations/legacy/runtime/trussModel.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/types.ts` | `src/web/src/simulations/legacy/runtime/types.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |
| `src/web/src/simulations/runtime/validation.ts` | `src/web/src/simulations/legacy/runtime/validation.ts` | Preserve existing legacy runtime/assembly support; update core imports, no duplicate new pipeline. |

## 5. Every statically identified caller requiring review/import edits

This list includes moved files with internal imports. Entries that remain in place need their imports or hardcoded source paths updated. Literal strings can be diagnostic/data references rather than imports; confirm each affected occurrence before editing. Historical source-path evidence is not rewritten automatically.

| Current file | Planned location | Moved dependencies referenced |
| --- | --- | --- |
| `docs/agent-only/features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md` | `docs/agent-only/features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md` | 0 (explicit entry point/document review) |
| `src/web/scripts/recipes/generate-registry.cjs` | `src/web/scripts/recipes/generate-registry.cjs` | 1 |
| `src/web/scripts/recipes/verify-contract.cjs` | `src/web/scripts/recipes/verify-contract.cjs` | 9 |
| `src/web/scripts/recipes/verify-cooling-timeline.cjs` | `src/web/scripts/recipes/verify-cooling-timeline.cjs` | 4 |
| `src/web/scripts/recipes/verify-gas-equilibrium.cjs` | `src/web/scripts/recipes/verify-gas-equilibrium.cjs` | 6 |
| `src/web/scripts/recipes/verify-lever.cjs` | `src/web/scripts/recipes/verify-lever.cjs` | 8 |
| `src/web/src/app/_components/CommandBar.tsx` | `src/web/src/app/_components/CommandBar.tsx` | 2 |
| `src/web/src/app/_lib/resolveExperimentPrompt.ts` | `src/web/src/app/_lib/resolveExperimentPrompt.ts` | 2 |
| `src/web/src/app/api/apertus/route.ts` | `src/web/src/app/api/apertus/route.ts` | 6 |
| `src/web/src/app/api/planner-diagnostics/route.ts` | `src/web/src/app/api/planner-diagnostics/route.ts` | 1 |
| `src/web/src/app/community/[publicationId]/PublicationDetail.tsx` | `src/web/src/app/community/[publicationId]/PublicationDetail.tsx` | 2 |
| `src/web/src/app/experiments/_components/ExperimentsShell.tsx` | `src/web/src/app/experiments/_components/ExperimentsShell.tsx` | 13 |
| `src/web/src/app/experiments/_lib/premadeExperiments.ts` | `src/web/src/app/experiments/_lib/premadeExperiments.ts` | 1 |
| `src/web/src/app/experiments/_lib/recipePersistence.ts` | `src/web/src/app/experiments/_lib/recipePersistence.ts` | 1 |
| `src/web/src/lib/agents/http.ts` | `src/web/src/lib/agents/http.ts` | 6 |
| `src/web/src/lib/agents/model.ts` | `src/web/src/lib/agents/model.ts` | 5 |
| `src/web/src/lib/agents/mongoRepository.ts` | `src/web/src/lib/agents/mongoRepository.ts` | 1 |
| `src/web/src/lib/apertus/structuredSchema.ts` | `src/web/src/simulations/creation-and-editing/input/inference/structuredSchema.ts` | 1 |
| `src/web/src/lib/apertus/transport.ts` | `src/web/src/simulations/creation-and-editing/input/inference/transport.ts` | 5 |
| `src/web/src/lib/database/LibraryRepository.ts` | `src/web/src/lib/database/LibraryRepository.ts` | 2 |
| `src/web/src/lib/decisions/config.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/config.ts` | 1 |
| `src/web/src/lib/decisions/factory.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/factory.ts` | 5 |
| `src/web/src/lib/decisions/providers/jev.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/providers/jev.ts` | 5 |
| `src/web/src/lib/decisions/providers/laya.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/providers/laya.ts` | 4 |
| `src/web/src/lib/decisions/providers/validation.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/providers/validation.ts` | 2 |
| `src/web/src/lib/decisions/transport/http.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/transport/http.ts` | 1 |
| `src/web/src/lib/library/client.ts` | `src/web/src/lib/library/client.ts` | 2 |
| `src/web/src/lib/llm/adapters.ts` | `src/web/src/simulations/creation-and-editing/input/inference/adapters.ts` | 4 |
| `src/web/src/lib/llm/config.ts` | `src/web/src/simulations/creation-and-editing/input/inference/config.ts` | 1 |
| `src/web/src/lib/planner/argumentJson.ts` | `src/web/src/simulations/creation-and-editing/input/inference/parseJson.ts` | 1 |
| `src/web/src/lib/planner/assemblyCreation.ts` | `src/web/src/simulations/creation-and-editing/composer/createFromAssemblies.ts` | 21 |
| `src/web/src/lib/planner/browser.ts` | `src/web/src/simulations/creation-and-editing/input/browser.ts` | 3 |
| `src/web/src/lib/planner/bucket.ts` | `src/web/src/simulations/creation-and-editing/component-selection/componentCandidates.ts` | 5 |
| `src/web/src/lib/planner/budget.ts` | `src/web/src/simulations/creation-and-editing/budget.ts` | 8 |
| `src/web/src/lib/planner/catalog.ts` | `src/web/src/simulations/creation-and-editing/component-selection/recipeCapabilities.ts` | 5 |
| `src/web/src/lib/planner/compose.ts` | `src/web/src/simulations/creation-and-editing/composer/composeFromComponents.ts` | 22 |
| `src/web/src/lib/planner/compositionPolicy.ts` | `src/web/src/simulations/creation-and-editing/composer/policy.ts` | 1 |
| `src/web/src/lib/planner/compositionQuality.ts` | `src/web/src/simulations/creation-and-editing/validator/compositionQuality.ts` | 3 |
| `src/web/src/lib/planner/compositionTools.ts` | `src/web/src/simulations/creation-and-editing/composer/availableOperations.ts` | 6 |
| `src/web/src/lib/planner/constraints.ts` | `src/web/src/simulations/creation-and-editing/validator/requestConstraints.ts` | 1 |
| `src/web/src/lib/planner/construction.ts` | `src/web/src/simulations/creation-and-editing/simulation/construction/contracts.ts` | 3 |
| `src/web/src/lib/planner/constructionPublisher.ts` | `src/web/src/simulations/creation-and-editing/simulation/construction/publisher.ts` | 5 |
| `src/web/src/lib/planner/context.ts` | `src/web/src/simulations/creation-and-editing/input/inference/messages.ts` | 3 |
| `src/web/src/lib/planner/coverage.ts` | `src/web/src/simulations/creation-and-editing/validator/coverage.ts` | 6 |
| `src/web/src/lib/planner/diagnostics.ts` | `src/web/src/simulations/creation-and-editing/diagnostics.ts` | 2 |
| `src/web/src/lib/planner/edit.ts` | `src/web/src/simulations/creation-and-editing/composer/edit.ts` | 17 |
| `src/web/src/lib/planner/editFields.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/configurationPatch.ts` | 2 |
| `src/web/src/lib/planner/eventStream.ts` | `src/web/src/simulations/creation-and-editing/input/eventStream.ts` | 1 |
| `src/web/src/lib/planner/focusedTurn.ts` | `src/web/src/simulations/creation-and-editing/composer/operationArguments.ts` | 10 |
| `src/web/src/lib/planner/formatFixer.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/normalizeOperations.ts` | 7 |
| `src/web/src/lib/planner/index.ts` | `src/web/src/simulations/creation-and-editing/pipeline.ts` | 25 |
| `src/web/src/lib/planner/learnerPresentation.ts` | `src/web/src/simulations/creation-and-editing/simulation/layout/learnerLayout.ts` | 5 |
| `src/web/src/lib/planner/schema.ts` | `src/web/src/simulations/creation-and-editing/input/contracts.ts` | 6 |
| `src/web/src/lib/planner/selection/acceptance.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/acceptance.ts` | 1 |
| `src/web/src/lib/planner/selection/compositionStrategy.ts` | `src/web/src/simulations/creation-and-editing/component-selection/selectCompositionStrategy.ts` | 8 |
| `src/web/src/lib/planner/selection/policy.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/policy.ts` | 2 |
| `src/web/src/lib/planner/selection/questions.ts` | `src/web/src/simulations/creation-and-editing/component-selection/decisions/questions.ts` | 2 |
| `src/web/src/lib/planner/selection/selectCapability.ts` | `src/web/src/simulations/creation-and-editing/component-selection/selectAssemblies.ts` | 8 |
| `src/web/src/lib/planner/stages.ts` | `src/web/src/simulations/creation-and-editing/composer/recipeArguments.ts` | 11 |
| `src/web/src/lib/planner/turnSchema.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/tools.ts` | 11 |
| `src/web/src/lib/projects/Repository.ts` | `src/web/src/lib/projects/Repository.ts` | 1 |
| `src/web/src/lib/projects/types.ts` | `src/web/src/lib/projects/types.ts` | 1 |
| `src/web/src/lib/projects/validation.ts` | `src/web/src/lib/projects/validation.ts` | 3 |
| `src/web/src/simulations/builder/Builder.tsx` | `src/web/src/simulations/builder/Builder.tsx` | 3 |
| `src/web/src/simulations/builder/ConnectionViewport.tsx` | `src/web/src/simulations/builder/ConnectionViewport.tsx` | 1 |
| `src/web/src/simulations/builder/composition/BindingSettings.tsx` | `src/web/src/simulations/builder/composition/BindingSettings.tsx` | 3 |
| `src/web/src/simulations/builder/composition/CanvasSettings.tsx` | `src/web/src/simulations/builder/composition/CanvasSettings.tsx` | 2 |
| `src/web/src/simulations/builder/composition/ComponentSettings.tsx` | `src/web/src/simulations/builder/composition/ComponentSettings.tsx` | 8 |
| `src/web/src/simulations/builder/composition/CompositeInterfaceEditor.tsx` | `src/web/src/simulations/builder/composition/CompositeInterfaceEditor.tsx` | 2 |
| `src/web/src/simulations/builder/composition/CompositionBuilder.tsx` | `src/web/src/simulations/builder/composition/CompositionBuilder.tsx` | 9 |
| `src/web/src/simulations/builder/composition/CompositionGraph.tsx` | `src/web/src/simulations/builder/composition/CompositionGraph.tsx` | 2 |
| `src/web/src/simulations/builder/composition/CompositionLibrary.tsx` | `src/web/src/simulations/builder/composition/CompositionLibrary.tsx` | 5 |
| `src/web/src/simulations/builder/composition/ConstructionBoardPreview.tsx` | `src/web/src/simulations/builder/composition/ConstructionBoardPreview.tsx` | 2 |
| `src/web/src/simulations/builder/composition/ControlSettings.tsx` | `src/web/src/simulations/builder/composition/ControlSettings.tsx` | 8 |
| `src/web/src/simulations/builder/composition/ControlTypeSettings.tsx` | `src/web/src/simulations/builder/composition/ControlTypeSettings.tsx` | 3 |
| `src/web/src/simulations/builder/composition/DataDisplaySettings.tsx` | `src/web/src/simulations/builder/composition/DataDisplaySettings.tsx` | 5 |
| `src/web/src/simulations/builder/composition/DecorationSettings.tsx` | `src/web/src/simulations/builder/composition/DecorationSettings.tsx` | 2 |
| `src/web/src/simulations/builder/composition/HTMLComponentImport.tsx` | `src/web/src/simulations/builder/composition/HTMLComponentImport.tsx` | 8 |
| `src/web/src/simulations/builder/composition/InputEditor.tsx` | `src/web/src/simulations/builder/composition/InputEditor.tsx` | 6 |
| `src/web/src/simulations/builder/composition/ManualComponentSettings.tsx` | `src/web/src/simulations/builder/composition/ManualComponentSettings.tsx` | 8 |
| `src/web/src/simulations/builder/composition/ObjectSettings.tsx` | `src/web/src/simulations/builder/composition/ObjectSettings.tsx` | 3 |
| `src/web/src/simulations/builder/composition/RecipeImport.tsx` | `src/web/src/simulations/builder/composition/RecipeImport.tsx` | 3 |
| `src/web/src/simulations/builder/composition/TripSettings.tsx` | `src/web/src/simulations/builder/composition/TripSettings.tsx` | 3 |
| `src/web/src/simulations/builder/composition/builderFeedback.ts` | `src/web/src/simulations/builder/composition/builderFeedback.ts` | 2 |
| `src/web/src/simulations/builder/composition/constructionPreview.ts` | `src/web/src/simulations/builder/composition/constructionPreview.ts` | 2 |
| `src/web/src/simulations/builder/composition/libraryChoices.ts` | `src/web/src/simulations/builder/composition/libraryChoices.ts` | 4 |
| `src/web/src/simulations/builder/composition/useBuilderAi.ts` | `src/web/src/simulations/builder/composition/useBuilderAi.ts` | 8 |
| `src/web/src/simulations/builder/composition/useComponentCatalog.ts` | `src/web/src/simulations/builder/composition/useComponentCatalog.ts` | 10 |
| `src/web/src/simulations/builder/composition/useGraphMotion.ts` | `src/web/src/simulations/builder/composition/useGraphMotion.ts` | 1 |
| `src/web/src/simulations/builder/descriptors.ts` | `src/web/src/simulations/builder/descriptors.ts` | 4 |
| `src/web/src/simulations/builder/document.ts` | `src/web/src/simulations/builder/document.ts` | 1 |
| `src/web/src/simulations/builder/document/canonical.ts` | `src/web/src/simulations/builder/document/canonical.ts` | 10 |
| `src/web/src/simulations/builder/document/legacy.ts` | `src/web/src/simulations/builder/document/legacy.ts` | 2 |
| `src/web/src/simulations/builder/document/migrations/composeLegacy.ts` | `src/web/src/simulations/builder/document/migrations/composeLegacy.ts` | 6 |
| `src/web/src/simulations/builder/document/serialization.ts` | `src/web/src/simulations/builder/document/serialization.ts` | 13 |
| `src/web/src/simulations/builder/document/types.ts` | `src/web/src/simulations/builder/document/types.ts` | 3 |
| `src/web/src/simulations/builder/document/validateDocument.ts` | `src/web/src/simulations/builder/document/validateDocument.ts` | 7 |
| `src/web/src/simulations/builder/editor/boardClipboard.ts` | `src/web/src/simulations/builder/editor/boardClipboard.ts` | 2 |
| `src/web/src/simulations/builder/editor/compositeCommands.ts` | `src/web/src/simulations/builder/editor/compositeCommands.ts` | 1 |
| `src/web/src/simulations/builder/editor/connectionCommands.ts` | `src/web/src/simulations/builder/editor/connectionCommands.ts` | 3 |
| `src/web/src/simulations/builder/editor/controlTypeCommands.ts` | `src/web/src/simulations/builder/editor/controlTypeCommands.ts` | 7 |
| `src/web/src/simulations/builder/editor/insertionPlan.ts` | `src/web/src/simulations/builder/editor/insertionPlan.ts` | 1 |
| `src/web/src/simulations/builder/editor/objectCommands.ts` | `src/web/src/simulations/builder/editor/objectCommands.ts` | 4 |
| `src/web/src/simulations/builder/editor/selection.ts` | `src/web/src/simulations/builder/editor/selection.ts` | 7 |
| `src/web/src/simulations/builder/editor/workspaceCommands.ts` | `src/web/src/simulations/builder/editor/workspaceCommands.ts` | 5 |
| `src/web/src/simulations/builder/graph/authoredGraph.ts` | `src/web/src/simulations/builder/graph/authoredGraph.ts` | 4 |
| `src/web/src/simulations/builder/graph/deriveGraph.ts` | `src/web/src/simulations/builder/graph/deriveGraph.ts` | 4 |
| `src/web/src/simulations/builder/library/RecipeRepository.ts` | `src/web/src/simulations/builder/library/RecipeRepository.ts` | 3 |
| `src/web/src/simulations/builder/library/SaveCompositeDialog.tsx` | `src/web/src/simulations/builder/library/SaveCompositeDialog.tsx` | 1 |
| `src/web/src/simulations/builder/library/persistence.ts` | `src/web/src/simulations/builder/library/persistence.ts` | 1 |
| `src/web/src/simulations/builder/persistence/recovery.ts` | `src/web/src/simulations/builder/persistence/recovery.ts` | 1 |
| `src/web/src/simulations/builder/preview/BuilderPreview.tsx` | `src/web/src/simulations/builder/preview/BuilderPreview.tsx` | 2 |
| `src/web/src/simulations/components/README.md` | `src/web/src/simulations/legacy/components/README.md` | 0 (explicit entry point/document review) |
| `src/web/src/simulations/components/behaviors/DailyRoutine.ts` | `src/web/src/simulations/legacy/components/behaviors/DailyRoutine.ts` | 2 |
| `src/web/src/simulations/components/behaviors/ScheduledTrip.ts` | `src/web/src/simulations/legacy/components/behaviors/ScheduledTrip.ts` | 2 |
| `src/web/src/simulations/components/catalog/agents.ts` | `src/web/src/simulations/legacy/components/catalog/agents.ts` | 5 |
| `src/web/src/simulations/components/catalog/authoring.ts` | `src/web/src/simulations/legacy/components/catalog/authoring.ts` | 3 |
| `src/web/src/simulations/components/catalog/biogeochemistry.ts` | `src/web/src/simulations/legacy/components/catalog/biogeochemistry.ts` | 4 |
| `src/web/src/simulations/components/catalog/collective.ts` | `src/web/src/simulations/legacy/components/catalog/collective.ts` | 3 |
| `src/web/src/simulations/components/catalog/controlDefinitions.ts` | `src/web/src/simulations/legacy/components/catalog/controlDefinitions.ts` | 4 |
| `src/web/src/simulations/components/catalog/discovery.ts` | `src/web/src/simulations/legacy/components/catalog/discovery.ts` | 1 |
| `src/web/src/simulations/components/catalog/earthAtmosphere.ts` | `src/web/src/simulations/legacy/components/catalog/earthAtmosphere.ts` | 3 |
| `src/web/src/simulations/components/catalog/ecologyControls.ts` | `src/web/src/simulations/legacy/components/catalog/ecologyControls.ts` | 4 |
| `src/web/src/simulations/components/catalog/exploration.ts` | `src/web/src/simulations/legacy/components/catalog/exploration.ts` | 3 |
| `src/web/src/simulations/components/catalog/explorationTeaching.ts` | `src/web/src/simulations/legacy/components/catalog/explorationTeaching.ts` | 7 |
| `src/web/src/simulations/components/catalog/generic.ts` | `src/web/src/simulations/legacy/components/catalog/generic.ts` | 3 |
| `src/web/src/simulations/components/catalog/index.ts` | `src/web/src/simulations/legacy/components/catalog/index.ts` | 23 |
| `src/web/src/simulations/components/catalog/learningModels.ts` | `src/web/src/simulations/legacy/components/catalog/learningModels.ts` | 7 |
| `src/web/src/simulations/components/catalog/mathAnalysis.ts` | `src/web/src/simulations/legacy/components/catalog/mathAnalysis.ts` | 1 |
| `src/web/src/simulations/components/catalog/mathGeometry.ts` | `src/web/src/simulations/legacy/components/catalog/mathGeometry.ts` | 1 |
| `src/web/src/simulations/components/catalog/operations.ts` | `src/web/src/simulations/legacy/components/catalog/operations.ts` | 2 |
| `src/web/src/simulations/components/catalog/physicsMechanics.ts` | `src/web/src/simulations/legacy/components/catalog/physicsMechanics.ts` | 1 |
| `src/web/src/simulations/components/catalog/physicsThermalOptics.ts` | `src/web/src/simulations/legacy/components/catalog/physicsThermalOptics.ts` | 1 |
| `src/web/src/simulations/components/catalog/science.ts` | `src/web/src/simulations/legacy/components/catalog/science.ts` | 3 |
| `src/web/src/simulations/components/catalog/scopedLearningContracts.ts` | `src/web/src/simulations/legacy/components/catalog/scopedLearningContracts.ts` | 2 |
| `src/web/src/simulations/components/catalog/spatial.ts` | `src/web/src/simulations/legacy/components/catalog/spatial.ts` | 4 |
| `src/web/src/simulations/components/catalog/teaching.ts` | `src/web/src/simulations/legacy/components/catalog/teaching.ts` | 1 |
| `src/web/src/simulations/components/composites/catalog.ts` | `src/web/src/simulations/legacy/components/composites/catalog.ts` | 8 |
| `src/web/src/simulations/components/composites/gas.ts` | `src/web/src/simulations/legacy/components/composites/gas.ts` | 2 |
| `src/web/src/simulations/components/composites/spatial.ts` | `src/web/src/simulations/legacy/components/composites/spatial.ts` | 9 |
| `src/web/src/simulations/components/compositions/GasPressureExperiment.ts` | `src/web/src/simulations/legacy/components/compositions/GasPressureExperiment.ts` | 3 |
| `src/web/src/simulations/components/compositions/TownExperiment.ts` | `src/web/src/simulations/legacy/components/compositions/TownExperiment.ts` | 2 |
| `src/web/src/simulations/components/contracts/ActionContract.ts` | `src/web/src/simulations/registry/contracts/objects/ActionContract.ts` | 1 |
| `src/web/src/simulations/components/contracts/ComponentDefinition.ts` | `src/web/src/simulations/registry/contracts/objects/ComponentDefinition.ts` | 6 |
| `src/web/src/simulations/components/contracts/LineParameters.ts` | `src/web/src/simulations/registry/contracts/objects/LineParameters.ts` | 2 |
| `src/web/src/simulations/components/contracts/Observation.ts` | `src/web/src/simulations/registry/contracts/objects/Observation.ts` | 2 |
| `src/web/src/simulations/components/contracts/composition.ts` | `src/web/src/simulations/registry/contracts/objects/composition.ts` | 6 |
| `src/web/src/simulations/components/contracts/numericField.ts` | `src/web/src/simulations/registry/contracts/objects/numericField.ts` | 1 |
| `src/web/src/simulations/components/contracts/objectFields.ts` | `src/web/src/simulations/registry/contracts/objects/objectFields.ts` | 1 |
| `src/web/src/simulations/components/controls/ActionButton.tsx` | `src/web/src/simulations/registry/controls/ActionButton.tsx` | 1 |
| `src/web/src/simulations/components/controls/ActivityControl.tsx` | `src/web/src/simulations/registry/controls/ActivityControl.tsx` | 5 |
| `src/web/src/simulations/components/controls/AgentActions.tsx` | `src/web/src/simulations/legacy/components/controls/AgentActions.tsx` | 5 |
| `src/web/src/simulations/components/controls/ArithmeticControls.tsx` | `src/web/src/simulations/legacy/components/controls/ArithmeticControls.tsx` | 5 |
| `src/web/src/simulations/components/controls/BoundControl.tsx` | `src/web/src/simulations/legacy/components/controls/BoundControl.tsx` | 7 |
| `src/web/src/simulations/components/controls/BridgeCommands.ts` | `src/web/src/simulations/legacy/components/controls/BridgeCommands.ts` | 1 |
| `src/web/src/simulations/components/controls/BridgeControls.tsx` | `src/web/src/simulations/legacy/components/controls/BridgeControls.tsx` | 1 |
| `src/web/src/simulations/components/controls/CoolingTimeline.tsx` | `src/web/src/simulations/legacy/components/controls/CoolingTimeline.tsx` | 4 |
| `src/web/src/simulations/components/controls/CountingControls.tsx` | `src/web/src/simulations/legacy/components/controls/CountingControls.tsx` | 6 |
| `src/web/src/simulations/components/controls/DragHandleControl.tsx` | `src/web/src/simulations/legacy/components/controls/DragHandleControl.tsx` | 3 |
| `src/web/src/simulations/components/controls/EqualGroupsControls.tsx` | `src/web/src/simulations/legacy/components/controls/EqualGroupsControls.tsx` | 5 |
| `src/web/src/simulations/components/controls/FoodWebPopulationControl.tsx` | `src/web/src/simulations/legacy/components/controls/FoodWebPopulationControl.tsx` | 6 |
| `src/web/src/simulations/components/controls/FractionBuilderControls.tsx` | `src/web/src/simulations/legacy/components/controls/FractionBuilderControls.tsx` | 5 |
| `src/web/src/simulations/components/controls/FractionEntry.tsx` | `src/web/src/simulations/registry/controls/FractionEntry.tsx` | 2 |
| `src/web/src/simulations/components/controls/FractionInputControl.tsx` | `src/web/src/simulations/legacy/components/controls/FractionInputControl.tsx` | 4 |
| `src/web/src/simulations/components/controls/FractionNumberLineControls.tsx` | `src/web/src/simulations/legacy/components/controls/FractionNumberLineControls.tsx` | 5 |
| `src/web/src/simulations/components/controls/ImportedValueForm.tsx` | `src/web/src/simulations/legacy/components/controls/ImportedValueForm.tsx` | 3 |
| `src/web/src/simulations/components/controls/IntegerStepper.tsx` | `src/web/src/simulations/registry/controls/IntegerStepper.tsx` | 3 |
| `src/web/src/simulations/components/controls/MathCommands.ts` | `src/web/src/simulations/legacy/components/controls/MathCommands.ts` | 4 |
| `src/web/src/simulations/components/controls/MathObjectControl.tsx` | `src/web/src/simulations/legacy/components/controls/MathObjectControl.tsx` | 2 |
| `src/web/src/simulations/components/controls/MathPlayback.tsx` | `src/web/src/simulations/legacy/components/controls/MathPlayback.tsx` | 6 |
| `src/web/src/simulations/components/controls/MathPrimaryControls.tsx` | `src/web/src/simulations/legacy/components/controls/MathPrimaryControls.tsx` | 7 |
| `src/web/src/simulations/components/controls/NumberField.tsx` | `src/web/src/simulations/registry/controls/NumberField.tsx` | 2 |
| `src/web/src/simulations/components/controls/OptionSelect.tsx` | `src/web/src/simulations/legacy/components/controls/OptionSelect.tsx` | 1 |
| `src/web/src/simulations/components/controls/OrbitCameraControl.tsx` | `src/web/src/simulations/legacy/components/controls/OrbitCameraControl.tsx` | 2 |
| `src/web/src/simulations/components/controls/ParameterSlider.tsx` | `src/web/src/simulations/legacy/components/controls/ParameterSlider.tsx` | 3 |
| `src/web/src/simulations/components/controls/PlaybackControl.tsx` | `src/web/src/simulations/registry/controls/PlaybackControl.tsx` | 2 |
| `src/web/src/simulations/components/controls/PlaybackControls.tsx` | `src/web/src/simulations/legacy/components/controls/PlaybackControls.tsx` | 3 |
| `src/web/src/simulations/components/controls/ProjectileCommands.ts` | `src/web/src/simulations/legacy/components/controls/ProjectileCommands.ts` | 1 |
| `src/web/src/simulations/components/controls/ProjectileControls.tsx` | `src/web/src/simulations/legacy/components/controls/ProjectileControls.tsx` | 1 |
| `src/web/src/simulations/components/controls/PromptControl.ts` | `src/web/src/simulations/legacy/components/controls/PromptControl.ts` | 8 |
| `src/web/src/simulations/components/controls/RangeInput.tsx` | `src/web/src/simulations/registry/controls/RangeInput.tsx` | 1 |
| `src/web/src/simulations/components/controls/ScalarControl.tsx` | `src/web/src/simulations/registry/controls/ScalarControl.tsx` | 8 |
| `src/web/src/simulations/components/controls/SchemaForm.tsx` | `src/web/src/simulations/registry/controls/SchemaForm.tsx` | 4 |
| `src/web/src/simulations/components/controls/SelectionControl.ts` | `src/web/src/simulations/legacy/components/controls/SelectionControl.ts` | 1 |
| `src/web/src/simulations/components/controls/TaskControl.tsx` | `src/web/src/simulations/legacy/components/controls/TaskControl.tsx` | 3 |
| `src/web/src/simulations/components/controls/ToggleControl.tsx` | `src/web/src/simulations/legacy/components/controls/ToggleControl.tsx` | 2 |
| `src/web/src/simulations/components/controls/TownCommands.ts` | `src/web/src/simulations/legacy/components/controls/TownCommands.ts` | 1 |
| `src/web/src/simulations/components/controls/TownControls.tsx` | `src/web/src/simulations/legacy/components/controls/TownControls.tsx` | 1 |
| `src/web/src/simulations/components/controls/chemistry/ChemistryControls.tsx` | `src/web/src/simulations/legacy/components/controls/chemistry/ChemistryControls.tsx` | 6 |
| `src/web/src/simulations/components/controls/commandPresentation.ts` | `src/web/src/simulations/registry/contracts/commandPresentation.ts` | 6 |
| `src/web/src/simulations/components/controls/controlContract.ts` | `src/web/src/simulations/registry/contracts/controlContract.ts` | 2 |
| `src/web/src/simulations/components/controls/dynamic-systems/DynamicControls.tsx` | `src/web/src/simulations/legacy/components/controls/dynamic-systems/DynamicControls.tsx` | 5 |
| `src/web/src/simulations/components/controls/interactionPolicy.ts` | `src/web/src/simulations/registry/contracts/interactionPolicy.ts` | 2 |
| `src/web/src/simulations/components/controls/natural-systems/NaturalControls.tsx` | `src/web/src/simulations/legacy/components/controls/natural-systems/NaturalControls.tsx` | 4 |
| `src/web/src/simulations/components/controls/physical-systems/PhysicalControls.tsx` | `src/web/src/simulations/legacy/components/controls/physical-systems/PhysicalControls.tsx` | 1 |
| `src/web/src/simulations/components/definitions/Building.ts` | `src/web/src/simulations/registry/objects/Building.ts` | 5 |
| `src/web/src/simulations/components/definitions/FractionBar.ts` | `src/web/src/simulations/registry/objects/FractionBar.ts` | 6 |
| `src/web/src/simulations/components/definitions/GasContainer.ts` | `src/web/src/simulations/registry/objects/GasContainer.ts` | 7 |
| `src/web/src/simulations/components/definitions/Ground.ts` | `src/web/src/simulations/registry/objects/Ground.ts` | 3 |
| `src/web/src/simulations/components/definitions/Line.ts` | `src/web/src/simulations/registry/objects/Line.ts` | 6 |
| `src/web/src/simulations/components/definitions/Person.ts` | `src/web/src/simulations/registry/objects/Person.ts` | 6 |
| `src/web/src/simulations/components/definitions/Road.ts` | `src/web/src/simulations/registry/objects/Road.ts` | 3 |
| `src/web/src/simulations/components/definitions/Square.ts` | `src/web/src/simulations/registry/objects/Square.ts` | 5 |
| `src/web/src/simulations/components/prefabs/AIAgent.ts` | `src/web/src/simulations/legacy/components/prefabs/AIAgent.ts` | 2 |
| `src/web/src/simulations/components/prefabs/BridgeLoad.ts` | `src/web/src/simulations/legacy/components/prefabs/BridgeLoad.ts` | 1 |
| `src/web/src/simulations/components/prefabs/Building.ts` | `src/web/src/simulations/legacy/components/prefabs/Building.ts` | 1 |
| `src/web/src/simulations/components/prefabs/Citizen.ts` | `src/web/src/simulations/legacy/components/prefabs/Citizen.ts` | 3 |
| `src/web/src/simulations/components/prefabs/CounterToken.ts` | `src/web/src/simulations/legacy/components/prefabs/CounterToken.ts` | 1 |
| `src/web/src/simulations/components/prefabs/ElementaryBoards.ts` | `src/web/src/simulations/legacy/components/prefabs/ElementaryBoards.ts` | 1 |
| `src/web/src/simulations/components/prefabs/GasContainer.ts` | `src/web/src/simulations/legacy/components/prefabs/GasContainer.ts` | 3 |
| `src/web/src/simulations/components/prefabs/Joint.ts` | `src/web/src/simulations/legacy/components/prefabs/Joint.ts` | 1 |
| `src/web/src/simulations/components/prefabs/Market.ts` | `src/web/src/simulations/legacy/components/prefabs/Market.ts` | 2 |
| `src/web/src/simulations/components/prefabs/MathBoards.ts` | `src/web/src/simulations/legacy/components/prefabs/MathBoards.ts` | 2 |
| `src/web/src/simulations/components/prefabs/Member.ts` | `src/web/src/simulations/legacy/components/prefabs/Member.ts` | 1 |
| `src/web/src/simulations/components/prefabs/Projectile.ts` | `src/web/src/simulations/legacy/components/prefabs/Projectile.ts` | 2 |
| `src/web/src/simulations/components/prefabs/TrussAssembly.ts` | `src/web/src/simulations/legacy/components/prefabs/TrussAssembly.ts` | 4 |
| `src/web/src/simulations/components/prefabs/dynamic-systems/objects.ts` | `src/web/src/simulations/legacy/components/prefabs/dynamic-systems/objects.ts` | 2 |
| `src/web/src/simulations/components/prefabs/physical-systems/objects.ts` | `src/web/src/simulations/legacy/components/prefabs/physical-systems/objects.ts` | 3 |
| `src/web/src/simulations/components/registry.ts` | `src/web/src/simulations/registry/objects/registry.ts` | 13 |
| `src/web/src/simulations/components/resources/ArithmeticTasks.ts` | `src/web/src/simulations/legacy/components/resources/ArithmeticTasks.ts` | 1 |
| `src/web/src/simulations/components/resources/CountingTasks.ts` | `src/web/src/simulations/legacy/components/resources/CountingTasks.ts` | 1 |
| `src/web/src/simulations/components/resources/EqualGroupsTasks.ts` | `src/web/src/simulations/legacy/components/resources/EqualGroupsTasks.ts` | 1 |
| `src/web/src/simulations/components/resources/FractionTasks.ts` | `src/web/src/simulations/legacy/components/resources/FractionTasks.ts` | 1 |
| `src/web/src/simulations/components/resources/LearningPolicies.ts` | `src/web/src/simulations/legacy/components/resources/LearningPolicies.ts` | 1 |
| `src/web/src/simulations/components/resources/TownAppearance.ts` | `src/web/src/simulations/legacy/components/resources/TownAppearance.ts` | 1 |
| `src/web/src/simulations/components/resources/TownLayout.ts` | `src/web/src/simulations/legacy/components/resources/TownLayout.ts` | 2 |
| `src/web/src/simulations/components/systems/AgentSystems.ts` | `src/web/src/simulations/legacy/components/systems/AgentSystems.ts` | 3 |
| `src/web/src/simulations/components/systems/ArithmeticSystem.ts` | `src/web/src/simulations/legacy/components/systems/ArithmeticSystem.ts` | 4 |
| `src/web/src/simulations/components/systems/BallisticMotionSystem.ts` | `src/web/src/simulations/legacy/components/systems/BallisticMotionSystem.ts` | 1 |
| `src/web/src/simulations/components/systems/BehaviorRunnerSystem.ts` | `src/web/src/simulations/legacy/components/systems/BehaviorRunnerSystem.ts` | 4 |
| `src/web/src/simulations/components/systems/BuildingGeometrySystem.ts` | `src/web/src/simulations/legacy/components/systems/BuildingGeometrySystem.ts` | 1 |
| `src/web/src/simulations/components/systems/ComposedFractionSystem.ts` | `src/web/src/simulations/legacy/components/systems/ComposedFractionSystem.ts` | 3 |
| `src/web/src/simulations/components/systems/CountingSystem.ts` | `src/web/src/simulations/legacy/components/systems/CountingSystem.ts` | 4 |
| `src/web/src/simulations/components/systems/ElementarySystems.ts` | `src/web/src/simulations/legacy/components/systems/ElementarySystems.ts` | 1 |
| `src/web/src/simulations/components/systems/EqualGroupingSystem.ts` | `src/web/src/simulations/legacy/components/systems/EqualGroupingSystem.ts` | 5 |
| `src/web/src/simulations/components/systems/FractionBuilderSystem.ts` | `src/web/src/simulations/legacy/components/systems/FractionBuilderSystem.ts` | 5 |
| `src/web/src/simulations/components/systems/FractionNumberLineSystem.ts` | `src/web/src/simulations/legacy/components/systems/FractionNumberLineSystem.ts` | 4 |
| `src/web/src/simulations/components/systems/FractionObservationSystem.ts` | `src/web/src/simulations/legacy/components/systems/FractionObservationSystem.ts` | 4 |
| `src/web/src/simulations/components/systems/GasParticleIllustrationSystem.ts` | `src/web/src/simulations/legacy/components/systems/GasParticleIllustrationSystem.ts` | 1 |
| `src/web/src/simulations/components/systems/HeuristicBridgeResponseSystem.ts` | `src/web/src/simulations/legacy/components/systems/HeuristicBridgeResponseSystem.ts` | 3 |
| `src/web/src/simulations/components/systems/IdealGasSystem.ts` | `src/web/src/simulations/legacy/components/systems/IdealGasSystem.ts` | 2 |
| `src/web/src/simulations/components/systems/LineGeometrySystem.ts` | `src/web/src/simulations/legacy/components/systems/LineGeometrySystem.ts` | 1 |
| `src/web/src/simulations/components/systems/LineIntersectionSystem.ts` | `src/web/src/simulations/legacy/components/systems/LineIntersectionSystem.ts` | 1 |
| `src/web/src/simulations/components/systems/LineObservationSystem.ts` | `src/web/src/simulations/legacy/components/systems/LineObservationSystem.ts` | 4 |
| `src/web/src/simulations/components/systems/MeasurementSamplingSystem.ts` | `src/web/src/simulations/legacy/components/systems/MeasurementSamplingSystem.ts` | 3 |
| `src/web/src/simulations/components/systems/NavigationSystem.ts` | `src/web/src/simulations/legacy/components/systems/NavigationSystem.ts` | 3 |
| `src/web/src/simulations/components/systems/PathFollowingSystem.ts` | `src/web/src/simulations/legacy/components/systems/PathFollowingSystem.ts` | 4 |
| `src/web/src/simulations/components/systems/RouteFollowingSystem.ts` | `src/web/src/simulations/legacy/components/systems/RouteFollowingSystem.ts` | 1 |
| `src/web/src/simulations/components/systems/RouteSearchSystem.ts` | `src/web/src/simulations/legacy/components/systems/RouteSearchSystem.ts` | 1 |
| `src/web/src/simulations/components/systems/ScheduledTripSystem.ts` | `src/web/src/simulations/legacy/components/systems/ScheduledTripSystem.ts` | 5 |
| `src/web/src/simulations/components/systems/SquareGeometrySystem.ts` | `src/web/src/simulations/legacy/components/systems/SquareGeometrySystem.ts` | 1 |
| `src/web/src/simulations/components/systems/TownObservationSystem.ts` | `src/web/src/simulations/legacy/components/systems/TownObservationSystem.ts` | 2 |
| `src/web/src/simulations/components/systems/biogeochemistry/carbon.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/carbon.ts` | 2 |
| `src/web/src/simulations/components/systems/biogeochemistry/contracts.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/contracts.ts` | 1 |
| `src/web/src/simulations/components/systems/biogeochemistry/nitrogen.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/nitrogen.ts` | 2 |
| `src/web/src/simulations/components/systems/biogeochemistry/oxygen.ts` | `src/web/src/simulations/legacy/components/systems/biogeochemistry/oxygen.ts` | 2 |
| `src/web/src/simulations/components/systems/chemistry/models.ts` | `src/web/src/simulations/legacy/components/systems/chemistry/models.ts` | 2 |
| `src/web/src/simulations/components/systems/collective/crowd.ts` | `src/web/src/simulations/legacy/components/systems/collective/crowd.ts` | 1 |
| `src/web/src/simulations/components/systems/collective/selection.ts` | `src/web/src/simulations/legacy/components/systems/collective/selection.ts` | 1 |
| `src/web/src/simulations/components/systems/collective/voting.ts` | `src/web/src/simulations/legacy/components/systems/collective/voting.ts` | 1 |
| `src/web/src/simulations/components/systems/debate/environment.ts` | `src/web/src/simulations/legacy/components/systems/debate/environment.ts` | 4 |
| `src/web/src/simulations/components/systems/debate/protocol.ts` | `src/web/src/simulations/legacy/components/systems/debate/protocol.ts` | 2 |
| `src/web/src/simulations/components/systems/dynamic-systems/models.ts` | `src/web/src/simulations/legacy/components/systems/dynamic-systems/models.ts` | 1 |
| `src/web/src/simulations/components/systems/ecology/foodWeb.ts` | `src/web/src/simulations/legacy/components/systems/ecology/foodWeb.ts` | 1 |
| `src/web/src/simulations/components/systems/economics/models.ts` | `src/web/src/simulations/legacy/components/systems/economics/models.ts` | 1 |
| `src/web/src/simulations/components/systems/fractionMath.ts` | `src/web/src/simulations/legacy/components/systems/fractionMath.ts` | 1 |
| `src/web/src/simulations/components/systems/math-foundations/models.ts` | `src/web/src/simulations/legacy/components/systems/math-foundations/models.ts` | 1 |
| `src/web/src/simulations/components/systems/mathSequence.ts` | `src/web/src/simulations/legacy/components/systems/mathSequence.ts` | 2 |
| `src/web/src/simulations/components/systems/natural-systems/models.ts` | `src/web/src/simulations/legacy/components/systems/natural-systems/models.ts` | 1 |
| `src/web/src/simulations/components/systems/physical-systems/models.ts` | `src/web/src/simulations/legacy/components/systems/physical-systems/models.ts` | 2 |
| `src/web/src/simulations/components/systems/physics/buoyancy.ts` | `src/web/src/simulations/legacy/components/systems/physics/buoyancy.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/capacitor.ts` | `src/web/src/simulations/legacy/components/systems/physics/capacitor.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/collision.ts` | `src/web/src/simulations/legacy/components/systems/physics/collision.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/conduction.ts` | `src/web/src/simulations/legacy/components/systems/physics/conduction.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/cooling.ts` | `src/web/src/simulations/legacy/components/systems/physics/cooling.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/doppler.ts` | `src/web/src/simulations/legacy/components/systems/physics/doppler.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/fibre.ts` | `src/web/src/simulations/legacy/components/systems/physics/fibre.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/flow.ts` | `src/web/src/simulations/legacy/components/systems/physics/flow.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/gears.ts` | `src/web/src/simulations/legacy/components/systems/physics/gears.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/hydraulics.ts` | `src/web/src/simulations/legacy/components/systems/physics/hydraulics.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/induction.ts` | `src/web/src/simulations/legacy/components/systems/physics/induction.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/latent.ts` | `src/web/src/simulations/legacy/components/systems/physics/latent.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/lens.ts` | `src/web/src/simulations/legacy/components/systems/physics/lens.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/lever.ts` | `src/web/src/simulations/legacy/components/systems/physics/lever.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/parachute.ts` | `src/web/src/simulations/legacy/components/systems/physics/parachute.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/pressure.ts` | `src/web/src/simulations/legacy/components/systems/physics/pressure.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/pulley.ts` | `src/web/src/simulations/legacy/components/systems/physics/pulley.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/string.ts` | `src/web/src/simulations/legacy/components/systems/physics/string.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/tipping.ts` | `src/web/src/simulations/legacy/components/systems/physics/tipping.ts` | 1 |
| `src/web/src/simulations/components/systems/physics/turning.ts` | `src/web/src/simulations/legacy/components/systems/physics/turning.ts` | 1 |
| `src/web/src/simulations/components/systems/science/environment.ts` | `src/web/src/simulations/legacy/components/systems/science/environment.ts` | 2 |
| `src/web/src/simulations/components/systems/science/life.ts` | `src/web/src/simulations/legacy/components/systems/science/life.ts` | 2 |
| `src/web/src/simulations/components/systems/townNavigation.ts` | `src/web/src/simulations/legacy/components/systems/townNavigation.ts` | 5 |
| `src/web/src/simulations/components/traits/AIAgent.ts` | `src/web/src/simulations/legacy/components/traits/AIAgent.ts` | 1 |
| `src/web/src/simulations/components/traits/BallisticMotion.ts` | `src/web/src/simulations/legacy/components/traits/BallisticMotion.ts` | 1 |
| `src/web/src/simulations/components/traits/BehaviorBinding.ts` | `src/web/src/simulations/legacy/components/traits/BehaviorBinding.ts` | 1 |
| `src/web/src/simulations/components/traits/BehaviorState.ts` | `src/web/src/simulations/legacy/components/traits/BehaviorState.ts` | 1 |
| `src/web/src/simulations/components/traits/BridgeLoad.ts` | `src/web/src/simulations/legacy/components/traits/BridgeLoad.ts` | 1 |
| `src/web/src/simulations/components/traits/Building.ts` | `src/web/src/simulations/legacy/components/traits/Building.ts` | 1 |
| `src/web/src/simulations/components/traits/FlightMetrics.ts` | `src/web/src/simulations/legacy/components/traits/FlightMetrics.ts` | 1 |
| `src/web/src/simulations/components/traits/GasState.ts` | `src/web/src/simulations/legacy/components/traits/GasState.ts` | 1 |
| `src/web/src/simulations/components/traits/LaunchSettings.ts` | `src/web/src/simulations/legacy/components/traits/LaunchSettings.ts` | 1 |
| `src/web/src/simulations/components/traits/MathBoards.ts` | `src/web/src/simulations/legacy/components/traits/MathBoards.ts` | 1 |
| `src/web/src/simulations/components/traits/MeasurementProbe.ts` | `src/web/src/simulations/legacy/components/traits/MeasurementProbe.ts` | 1 |
| `src/web/src/simulations/components/traits/MemberEndpoints.ts` | `src/web/src/simulations/legacy/components/traits/MemberEndpoints.ts` | 1 |
| `src/web/src/simulations/components/traits/MemberResponse.ts` | `src/web/src/simulations/legacy/components/traits/MemberResponse.ts` | 1 |
| `src/web/src/simulations/components/traits/NavigationAgent.ts` | `src/web/src/simulations/legacy/components/traits/NavigationAgent.ts` | 2 |
| `src/web/src/simulations/components/traits/NavigationObstacle.ts` | `src/web/src/simulations/legacy/components/traits/NavigationObstacle.ts` | 1 |
| `src/web/src/simulations/components/traits/Resident.ts` | `src/web/src/simulations/legacy/components/traits/Resident.ts` | 4 |
| `src/web/src/simulations/components/traits/SceneObjects.ts` | `src/web/src/simulations/legacy/components/traits/SceneObjects.ts` | 1 |
| `src/web/src/simulations/components/traits/Transform2D.ts` | `src/web/src/simulations/legacy/components/traits/Transform2D.ts` | 1 |
| `src/web/src/simulations/components/traits/TrussSettings.ts` | `src/web/src/simulations/legacy/components/traits/TrussSettings.ts` | 1 |
| `src/web/src/simulations/components/traits/VisualBinding.ts` | `src/web/src/simulations/legacy/components/traits/VisualBinding.ts` | 1 |
| `src/web/src/simulations/components/views/ArithmeticScene.tsx` | `src/web/src/simulations/legacy/components/views/ArithmeticScene.tsx` | 8 |
| `src/web/src/simulations/components/views/AssemblyRecipeView.tsx` | `src/web/src/simulations/legacy/components/views/AssemblyRecipeView.tsx` | 4 |
| `src/web/src/simulations/components/views/AuthoredTownView.tsx` | `src/web/src/simulations/legacy/components/views/AuthoredTownView.tsx` | 8 |
| `src/web/src/simulations/components/views/BridgeScene.tsx` | `src/web/src/simulations/legacy/components/views/BridgeScene.tsx` | 14 |
| `src/web/src/simulations/components/views/CartesianView.tsx` | `src/web/src/simulations/legacy/components/views/CartesianView.tsx` | 6 |
| `src/web/src/simulations/components/views/CompositionCanvas.tsx` | `src/web/src/simulations/legacy/components/views/CompositionCanvas.tsx` | 7 |
| `src/web/src/simulations/components/views/CountingScene.tsx` | `src/web/src/simulations/legacy/components/views/CountingScene.tsx` | 9 |
| `src/web/src/simulations/components/views/DatasetDisplay.tsx` | `src/web/src/simulations/legacy/components/views/DatasetDisplay.tsx` | 2 |
| `src/web/src/simulations/components/views/DisplayView.tsx` | `src/web/src/simulations/legacy/components/views/DisplayView.tsx` | 10 |
| `src/web/src/simulations/components/views/DomainObservationViews.tsx` | `src/web/src/simulations/legacy/components/views/DomainObservationViews.tsx` | 7 |
| `src/web/src/simulations/components/views/ElementaryExperimentView.tsx` | `src/web/src/simulations/legacy/components/views/ElementaryExperimentView.tsx` | 10 |
| `src/web/src/simulations/components/views/EntityInspectorView.tsx` | `src/web/src/simulations/legacy/components/views/EntityInspectorView.tsx` | 4 |
| `src/web/src/simulations/components/views/EqualGroupsScene.tsx` | `src/web/src/simulations/legacy/components/views/EqualGroupsScene.tsx` | 7 |
| `src/web/src/simulations/components/views/ExperimentLessonFrame.tsx` | `src/web/src/simulations/legacy/components/views/ExperimentLessonFrame.tsx` | 1 |
| `src/web/src/simulations/components/views/ExperimentView.tsx` | `src/web/src/simulations/legacy/components/views/ExperimentView.tsx` | 8 |
| `src/web/src/simulations/components/views/FractionBuilderScene.tsx` | `src/web/src/simulations/legacy/components/views/FractionBuilderScene.tsx` | 6 |
| `src/web/src/simulations/components/views/FractionNumberLineScene.tsx` | `src/web/src/simulations/legacy/components/views/FractionNumberLineScene.tsx` | 8 |
| `src/web/src/simulations/components/views/GasPressureView.tsx` | `src/web/src/simulations/legacy/components/views/GasPressureView.tsx` | 6 |
| `src/web/src/simulations/components/views/HistogramView.tsx` | `src/web/src/simulations/legacy/components/views/HistogramView.tsx` | 2 |
| `src/web/src/simulations/components/views/InstanceRecipeLesson.tsx` | `src/web/src/simulations/legacy/components/views/InstanceRecipeLesson.tsx` | 9 |
| `src/web/src/simulations/components/views/LegacyRecipeView.tsx` | `src/web/src/simulations/legacy/components/views/LegacyRecipeView.tsx` | 12 |
| `src/web/src/simulations/components/views/MathExperimentView.tsx` | `src/web/src/simulations/legacy/components/views/MathExperimentView.tsx` | 17 |
| `src/web/src/simulations/components/views/MathReadoutView.tsx` | `src/web/src/simulations/legacy/components/views/MathReadoutView.tsx` | 2 |
| `src/web/src/simulations/components/views/MemberInspector.tsx` | `src/web/src/simulations/legacy/components/views/MemberInspector.tsx` | 3 |
| `src/web/src/simulations/components/views/MetricsView.tsx` | `src/web/src/simulations/legacy/components/views/MetricsView.tsx` | 1 |
| `src/web/src/simulations/components/views/ProbabilityScene.tsx` | `src/web/src/simulations/legacy/components/views/ProbabilityScene.tsx` | 2 |
| `src/web/src/simulations/components/views/ProjectileObservationViews.tsx` | `src/web/src/simulations/legacy/components/views/ProjectileObservationViews.tsx` | 9 |
| `src/web/src/simulations/components/views/ProjectileScene.tsx` | `src/web/src/simulations/legacy/components/views/ProjectileScene.tsx` | 7 |
| `src/web/src/simulations/components/views/RecipeLesson.tsx` | `src/web/src/simulations/creation-and-editing/simulation/RecipeLesson.tsx` | 17 |
| `src/web/src/simulations/components/views/ResultsTableView.tsx` | `src/web/src/simulations/legacy/components/views/ResultsTableView.tsx` | 2 |
| `src/web/src/simulations/components/views/SceneToolbar.tsx` | `src/web/src/simulations/legacy/components/views/SceneToolbar.tsx` | 2 |
| `src/web/src/simulations/components/views/SciencePanels.tsx` | `src/web/src/simulations/legacy/components/views/SciencePanels.tsx` | 9 |
| `src/web/src/simulations/components/views/ScopedWorldView.tsx` | `src/web/src/simulations/legacy/components/views/ScopedWorldView.tsx` | 12 |
| `src/web/src/simulations/components/views/SpatialRecipeView.tsx` | `src/web/src/simulations/legacy/components/views/SpatialRecipeView.tsx` | 13 |
| `src/web/src/simulations/components/views/ThreeWorldView.tsx` | `src/web/src/simulations/legacy/components/views/ThreeWorldView.tsx` | 1 |
| `src/web/src/simulations/components/views/TimeSeriesView.tsx` | `src/web/src/simulations/legacy/components/views/TimeSeriesView.tsx` | 2 |
| `src/web/src/simulations/components/views/XYGraphView.tsx` | `src/web/src/simulations/legacy/components/views/XYGraphView.tsx` | 3 |
| `src/web/src/simulations/components/views/agents/AgentAvatar.tsx` | `src/web/src/simulations/legacy/components/views/agents/AgentAvatar.tsx` | 1 |
| `src/web/src/simulations/components/views/agents/AgentViews.tsx` | `src/web/src/simulations/legacy/components/views/agents/AgentViews.tsx` | 8 |
| `src/web/src/simulations/components/views/biogeochemistry/CyclePanels.tsx` | `src/web/src/simulations/legacy/components/views/biogeochemistry/CyclePanels.tsx` | 5 |
| `src/web/src/simulations/components/views/biogeochemistry/CycleScene.tsx` | `src/web/src/simulations/legacy/components/views/biogeochemistry/CycleScene.tsx` | 7 |
| `src/web/src/simulations/components/views/board/DrawingEditor.tsx` | `src/web/src/simulations/creation-and-editing/simulation/board/DrawingEditor.tsx` | 5 |
| `src/web/src/simulations/components/views/board/DrawingInspector.tsx` | `src/web/src/simulations/creation-and-editing/simulation/board/DrawingInspector.tsx` | 2 |
| `src/web/src/simulations/components/views/board/SpatialBoard.tsx` | `src/web/src/simulations/creation-and-editing/simulation/board/SpatialBoard.tsx` | 7 |
| `src/web/src/simulations/components/views/chemistry/ChemistryLesson.tsx` | `src/web/src/simulations/legacy/components/views/chemistry/ChemistryLesson.tsx` | 1 |
| `src/web/src/simulations/components/views/collective/Controls.tsx` | `src/web/src/simulations/legacy/components/views/collective/Controls.tsx` | 5 |
| `src/web/src/simulations/components/views/collective/CrowdScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/CrowdScene.tsx` | 3 |
| `src/web/src/simulations/components/views/collective/FishingScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/FishingScene.tsx` | 3 |
| `src/web/src/simulations/components/views/collective/SelectionScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/SelectionScene.tsx` | 4 |
| `src/web/src/simulations/components/views/collective/VotingScene.tsx` | `src/web/src/simulations/legacy/components/views/collective/VotingScene.tsx` | 3 |
| `src/web/src/simulations/components/views/dynamic-systems/DynamicSystemsLesson.tsx` | `src/web/src/simulations/legacy/components/views/dynamic-systems/DynamicSystemsLesson.tsx` | 1 |
| `src/web/src/simulations/components/views/earth-atmosphere/Diagrams.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/Diagrams.tsx` | 1 |
| `src/web/src/simulations/components/views/earth-atmosphere/LessonControls.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/LessonControls.tsx` | 5 |
| `src/web/src/simulations/components/views/earth-atmosphere/LessonScene.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/LessonScene.tsx` | 4 |
| `src/web/src/simulations/components/views/earth-atmosphere/Scene3D.tsx` | `src/web/src/simulations/legacy/components/views/earth-atmosphere/Scene3D.tsx` | 1 |
| `src/web/src/simulations/components/views/math-analysis/MathAnalysisScenes.tsx` | `src/web/src/simulations/legacy/components/views/math-analysis/MathAnalysisScenes.tsx` | 2 |
| `src/web/src/simulations/components/views/math-foundations/AssemblyView.tsx` | `src/web/src/simulations/legacy/components/views/math-foundations/AssemblyView.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/BoxPackingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/BoxPackingScene.tsx` | 3 |
| `src/web/src/simulations/components/views/math-geometry/CanPackagingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/CanPackagingScene.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/CubeNetScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/CubeNetScene.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/FencedGardenScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/FencedGardenScene.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/PlaceValueScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/PlaceValueScene.tsx` | 3 |
| `src/web/src/simulations/components/views/math-geometry/PythagoreanScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/PythagoreanScene.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/RegularTilingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/RegularTilingScene.tsx` | 3 |
| `src/web/src/simulations/components/views/math-geometry/RigidMotionScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/RigidMotionScene.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/ScaleDrawingScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/ScaleDrawingScene.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/TreeHeightScene.tsx` | `src/web/src/simulations/legacy/components/views/math-geometry/TreeHeightScene.tsx` | 2 |
| `src/web/src/simulations/components/views/math-geometry/index.ts` | `src/web/src/simulations/legacy/components/views/math-geometry/index.ts` | 11 |
| `src/web/src/simulations/components/views/natural-systems/NaturalSystemsView.tsx` | `src/web/src/simulations/legacy/components/views/natural-systems/NaturalSystemsView.tsx` | 4 |
| `src/web/src/simulations/components/views/physical-systems/PhysicalSystemsView.tsx` | `src/web/src/simulations/legacy/components/views/physical-systems/PhysicalSystemsView.tsx` | 1 |
| `src/web/src/simulations/components/views/recipe/CanvasPresentation.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/CanvasPresentation.tsx` | 7 |
| `src/web/src/simulations/components/views/recipe/ControlPresentation.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/ControlPresentation.tsx` | 17 |
| `src/web/src/simulations/components/views/recipe/DisplayPresentation.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/DisplayPresentation.tsx` | 14 |
| `src/web/src/simulations/components/views/recipe/ImportedHTMLView.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/ImportedHTMLView.tsx` | 5 |
| `src/web/src/simulations/components/views/recipe/NodeView.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/NodeView.tsx` | 19 |
| `src/web/src/simulations/components/views/recipe/RecipeAppearance.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/RecipeAppearance.tsx` | 48 |
| `src/web/src/simulations/components/views/recipe/RecipeLayout.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/RecipeLayout.tsx` | 8 |
| `src/web/src/simulations/components/views/recipe/contexts.tsx` | `src/web/src/simulations/creation-and-editing/simulation/recipe/contexts.tsx` | 3 |
| `src/web/src/simulations/components/views/recipe/formatObservation.ts` | `src/web/src/simulations/creation-and-editing/simulation/recipe/formatObservation.ts` | 1 |
| `src/web/src/simulations/components/views/recipe/observations.ts` | `src/web/src/simulations/registry/contracts/observations.ts` | 3 |
| `src/web/src/simulations/components/views/recipe/snapshotAdapters.ts` | `src/web/src/simulations/creation-and-editing/simulation/recipe/snapshotAdapters.ts` | 4 |
| `src/web/src/simulations/components/views/science/ScienceComparison.tsx` | `src/web/src/simulations/legacy/components/views/science/ScienceComparison.tsx` | 2 |
| `src/web/src/simulations/components/views/science/ScienceInvestigation.tsx` | `src/web/src/simulations/legacy/components/views/science/ScienceInvestigation.tsx` | 4 |
| `src/web/src/simulations/components/views/science/learnerPresentation.ts` | `src/web/src/simulations/legacy/components/views/science/learnerPresentation.ts` | 2 |
| `src/web/src/simulations/components/visuals/BeamVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/BeamVisual.tsx` | 6 |
| `src/web/src/simulations/components/visuals/BuildingVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/BuildingVisual3D.tsx` | 6 |
| `src/web/src/simulations/components/visuals/CitizenVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/CitizenVisual3D.tsx` | 3 |
| `src/web/src/simulations/components/visuals/CounterTokenVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/CounterTokenVisual.tsx` | 1 |
| `src/web/src/simulations/components/visuals/FractionBarVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/FractionBarVisual.tsx` | 3 |
| `src/web/src/simulations/components/visuals/FractionJumpVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/FractionJumpVisual.tsx` | 3 |
| `src/web/src/simulations/components/visuals/GasParticleVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/GasParticleVisual.tsx` | 1 |
| `src/web/src/simulations/components/visuals/LauncherVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/LauncherVisual.tsx` | 1 |
| `src/web/src/simulations/components/visuals/LineVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/LineVisual.tsx` | 1 |
| `src/web/src/simulations/components/visuals/MarketVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/MarketVisual3D.tsx` | 4 |
| `src/web/src/simulations/components/visuals/NumberLineVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/NumberLineVisual.tsx` | 6 |
| `src/web/src/simulations/components/visuals/RoadVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/RoadVisual3D.tsx` | 3 |
| `src/web/src/simulations/components/visuals/SquareVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/SquareVisual.tsx` | 1 |
| `src/web/src/simulations/components/visuals/TownEnvironment.tsx` | `src/web/src/simulations/legacy/components/visuals/TownEnvironment.tsx` | 1 |
| `src/web/src/simulations/components/visuals/TownSceneryVisual3D.tsx` | `src/web/src/simulations/legacy/components/visuals/TownSceneryVisual3D.tsx` | 2 |
| `src/web/src/simulations/components/visuals/TrajectoryVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/TrajectoryVisual.tsx` | 3 |
| `src/web/src/simulations/components/visuals/VelocityArrowVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/VelocityArrowVisual.tsx` | 2 |
| `src/web/src/simulations/components/visuals/biogeochemistry/CarbonScene.tsx` | `src/web/src/simulations/legacy/components/visuals/biogeochemistry/CarbonScene.tsx` | 2 |
| `src/web/src/simulations/components/visuals/biogeochemistry/NitrogenScene.tsx` | `src/web/src/simulations/legacy/components/visuals/biogeochemistry/NitrogenScene.tsx` | 2 |
| `src/web/src/simulations/components/visuals/biogeochemistry/OxygenScene.tsx` | `src/web/src/simulations/legacy/components/visuals/biogeochemistry/OxygenScene.tsx` | 3 |
| `src/web/src/simulations/components/visuals/chemistry/ChemistryVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/chemistry/ChemistryVisuals.tsx` | 3 |
| `src/web/src/simulations/components/visuals/dynamic-systems/DynamicVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/dynamic-systems/DynamicVisuals.tsx` | 2 |
| `src/web/src/simulations/components/visuals/ecology/FoodWebVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/ecology/FoodWebVisual.tsx` | 3 |
| `src/web/src/simulations/components/visuals/ecology/NutrientLimitationVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/ecology/NutrientLimitationVisual.tsx` | 2 |
| `src/web/src/simulations/components/visuals/ecology/WildfireComparisonVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/ecology/WildfireComparisonVisual.tsx` | 2 |
| `src/web/src/simulations/components/visuals/economics/EconomicsVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/economics/EconomicsVisuals.tsx` | 1 |
| `src/web/src/simulations/components/visuals/exploration/EclipseVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/exploration/EclipseVisual.tsx` | 1 |
| `src/web/src/simulations/components/visuals/exploration/SpringVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/exploration/SpringVisual.tsx` | 1 |
| `src/web/src/simulations/components/visuals/natural-systems/NaturalVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/natural-systems/NaturalVisuals.tsx` | 3 |
| `src/web/src/simulations/components/visuals/physical-systems/PendulumScene.tsx` | `src/web/src/simulations/legacy/components/visuals/physical-systems/PendulumScene.tsx` | 2 |
| `src/web/src/simulations/components/visuals/physical-systems/PhysicalVisuals.tsx` | `src/web/src/simulations/legacy/components/visuals/physical-systems/PhysicalVisuals.tsx` | 3 |
| `src/web/src/simulations/components/visuals/physics/LeverScene.tsx` | `src/web/src/simulations/legacy/components/visuals/physics/LeverScene.tsx` | 3 |
| `src/web/src/simulations/components/visuals/physics/MechanicsScenes.tsx` | `src/web/src/simulations/legacy/components/visuals/physics/MechanicsScenes.tsx` | 11 |
| `src/web/src/simulations/components/visuals/physics/ThermalOpticsScenes.tsx` | `src/web/src/simulations/legacy/components/visuals/physics/ThermalOpticsScenes.tsx` | 12 |
| `src/web/src/simulations/components/visuals/science/ScienceScene.tsx` | `src/web/src/simulations/legacy/components/visuals/science/ScienceScene.tsx` | 5 |
| `src/web/src/simulations/components/visuals/social-systems/ProductionComparisonVisual.tsx` | `src/web/src/simulations/legacy/components/visuals/social-systems/ProductionComparisonVisual.tsx` | 2 |
| `src/web/src/simulations/components/visuals/townSurface.ts` | `src/web/src/simulations/legacy/components/visuals/townSurface.ts` | 2 |
| `src/web/src/simulations/domains/biogeochemistry/index.ts` | `src/web/src/simulations/domains/biogeochemistry/index.ts` | 6 |
| `src/web/src/simulations/domains/chemistry/index.ts` | `src/web/src/simulations/domains/chemistry/index.ts` | 4 |
| `src/web/src/simulations/domains/collective/index.ts` | `src/web/src/simulations/domains/collective/index.ts` | 6 |
| `src/web/src/simulations/domains/comparisonModel.ts` | `src/web/src/simulations/domains/comparisonModel.ts` | 2 |
| `src/web/src/simulations/domains/dynamic-systems/index.ts` | `src/web/src/simulations/domains/dynamic-systems/index.ts` | 5 |
| `src/web/src/simulations/domains/earth-atmosphere/index.ts` | `src/web/src/simulations/domains/earth-atmosphere/index.ts` | 3 |
| `src/web/src/simulations/domains/ecology/index.ts` | `src/web/src/simulations/domains/ecology/index.ts` | 6 |
| `src/web/src/simulations/domains/economics/index.ts` | `src/web/src/simulations/domains/economics/index.ts` | 4 |
| `src/web/src/simulations/domains/math-analysis/models.ts` | `src/web/src/simulations/domains/math-analysis/models.ts` | 2 |
| `src/web/src/simulations/domains/math-foundations/index.ts` | `src/web/src/simulations/domains/math-foundations/index.ts` | 4 |
| `src/web/src/simulations/domains/math-geometry/boxPacking.ts` | `src/web/src/simulations/domains/math-geometry/boxPacking.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/canPackaging.ts` | `src/web/src/simulations/domains/math-geometry/canPackaging.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/common.ts` | `src/web/src/simulations/domains/math-geometry/common.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/cubeNet.ts` | `src/web/src/simulations/domains/math-geometry/cubeNet.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/fencedGarden.ts` | `src/web/src/simulations/domains/math-geometry/fencedGarden.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/index.ts` | `src/web/src/simulations/domains/math-geometry/index.ts` | 1 |
| `src/web/src/simulations/domains/math-geometry/placeValue.ts` | `src/web/src/simulations/domains/math-geometry/placeValue.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/pythagorean.ts` | `src/web/src/simulations/domains/math-geometry/pythagorean.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/regularTiling.ts` | `src/web/src/simulations/domains/math-geometry/regularTiling.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/rigidMotion.ts` | `src/web/src/simulations/domains/math-geometry/rigidMotion.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/scaleDrawing.ts` | `src/web/src/simulations/domains/math-geometry/scaleDrawing.ts` | 2 |
| `src/web/src/simulations/domains/math-geometry/treeHeight.ts` | `src/web/src/simulations/domains/math-geometry/treeHeight.ts` | 2 |
| `src/web/src/simulations/domains/natural-systems/index.ts` | `src/web/src/simulations/domains/natural-systems/index.ts` | 4 |
| `src/web/src/simulations/domains/physical-systems/index.ts` | `src/web/src/simulations/domains/physical-systems/index.ts` | 6 |
| `src/web/src/simulations/domains/physics/index.ts` | `src/web/src/simulations/domains/physics/index.ts` | 3 |
| `src/web/src/simulations/domains/physics/mechanics.ts` | `src/web/src/simulations/domains/physics/mechanics.ts` | 11 |
| `src/web/src/simulations/domains/physics/thermalOptics.ts` | `src/web/src/simulations/domains/physics/thermalOptics.ts` | 12 |
| `src/web/src/simulations/domains/science/index.ts` | `src/web/src/simulations/domains/science/index.ts` | 6 |
| `src/web/src/simulations/domains/science/specs.ts` | `src/web/src/simulations/domains/science/specs.ts` | 1 |
| `src/web/src/simulations/domains/social-systems/index.ts` | `src/web/src/simulations/domains/social-systems/index.ts` | 2 |
| `src/web/src/simulations/lessons/CompositionLesson.tsx` | `src/web/src/simulations/lessons/CompositionLesson.tsx` | 12 |
| `src/web/src/simulations/lessons/measurements.ts` | `src/web/src/simulations/lessons/measurements.ts` | 3 |
| `src/web/src/simulations/lessons/types.ts` | `src/web/src/simulations/lessons/types.ts` | 1 |
| `src/web/src/simulations/pre-made/town/behaviors/index.ts` | `src/web/src/simulations/pre-made/town/behaviors/index.ts` | 1 |
| `src/web/src/simulations/pre-made/town/compositions/index.ts` | `src/web/src/simulations/pre-made/town/compositions/index.ts` | 1 |
| `src/web/src/simulations/pre-made/town/controls/index.ts` | `src/web/src/simulations/pre-made/town/controls/index.ts` | 7 |
| `src/web/src/simulations/pre-made/town/prefabs/index.ts` | `src/web/src/simulations/pre-made/town/prefabs/index.ts` | 3 |
| `src/web/src/simulations/pre-made/town/resources/index.ts` | `src/web/src/simulations/pre-made/town/resources/index.ts` | 4 |
| `src/web/src/simulations/pre-made/town/systems/index.ts` | `src/web/src/simulations/pre-made/town/systems/index.ts` | 3 |
| `src/web/src/simulations/pre-made/town/traits/index.ts` | `src/web/src/simulations/pre-made/town/traits/index.ts` | 8 |
| `src/web/src/simulations/pre-made/town/views/index.ts` | `src/web/src/simulations/pre-made/town/views/index.ts` | 3 |
| `src/web/src/simulations/pre-made/town/visuals/index.ts` | `src/web/src/simulations/pre-made/town/visuals/index.ts` | 5 |
| `src/web/src/simulations/runtime/agents/capabilities.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/capabilities.ts` | 2 |
| `src/web/src/simulations/runtime/agents/client.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/client.ts` | 5 |
| `src/web/src/simulations/runtime/agents/contracts.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/contracts.ts` | 1 |
| `src/web/src/simulations/runtime/agents/handleStore.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/handleStore.ts` | 1 |
| `src/web/src/simulations/runtime/agents/memoryRepository.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/memoryRepository.ts` | 1 |
| `src/web/src/simulations/runtime/agents/providers.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/providers.ts` | 5 |
| `src/web/src/simulations/runtime/agents/runner.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/runner.ts` | 2 |
| `src/web/src/simulations/runtime/agents/scenarios.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/scenarios.ts` | 4 |
| `src/web/src/simulations/runtime/agents/scheduler.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/agents/scheduler.ts` | 1 |
| `src/web/src/simulations/runtime/assembly.ts` | `src/web/src/simulations/legacy/runtime/assembly.ts` | 3 |
| `src/web/src/simulations/runtime/assemblySession.ts` | `src/web/src/simulations/legacy/runtime/assemblySession.ts` | 5 |
| `src/web/src/simulations/runtime/authoring/adapters.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/compatibility/assemblyDocument.ts` | 7 |
| `src/web/src/simulations/runtime/authoring/arrangement.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/arrangement.ts` | 5 |
| `src/web/src/simulations/runtime/authoring/bindings.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/bindings.ts` | 6 |
| `src/web/src/simulations/runtime/authoring/board.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/board.ts` | 3 |
| `src/web/src/simulations/runtime/authoring/composites.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/composites.ts` | 7 |
| `src/web/src/simulations/runtime/authoring/connections.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/connections.ts` | 7 |
| `src/web/src/simulations/runtime/authoring/dataProviders.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/data.ts` | 3 |
| `src/web/src/simulations/runtime/authoring/drawings.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/drawings.ts` | 1 |
| `src/web/src/simulations/runtime/authoring/explorationProviders.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/exploration.ts` | 6 |
| `src/web/src/simulations/runtime/authoring/graphLayout.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/graphLayout.ts` | 1 |
| `src/web/src/simulations/runtime/authoring/insertion.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/insertion.ts` | 4 |
| `src/web/src/simulations/runtime/authoring/migrateControls.ts` | `src/web/src/simulations/legacy/compatibility/migrateControls.ts` | 4 |
| `src/web/src/simulations/runtime/authoring/migrateDrawings.ts` | `src/web/src/simulations/legacy/compatibility/migrateDrawings.ts` | 3 |
| `src/web/src/simulations/runtime/authoring/operations.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/operations.ts` | 17 |
| `src/web/src/simulations/runtime/authoring/providers.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/index.ts` | 19 |
| `src/web/src/simulations/runtime/authoring/recipes.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/recipes.ts` | 7 |
| `src/web/src/simulations/runtime/authoring/references.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/references.ts` | 2 |
| `src/web/src/simulations/runtime/authoring/regenerateTruss.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/regenerateTruss.ts` | 6 |
| `src/web/src/simulations/runtime/authoring/responsiveLayout.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/presentation/responsiveLayout.ts` | 2 |
| `src/web/src/simulations/runtime/authoring/runnable.ts` | `src/web/src/simulations/creation-and-editing/validator/runnable.ts` | 6 |
| `src/web/src/simulations/runtime/authoring/runtime.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/DocumentRuntime.ts` | 16 |
| `src/web/src/simulations/runtime/authoring/spatialMigration.ts` | `src/web/src/simulations/legacy/compatibility/spatialMigration.ts` | 8 |
| `src/web/src/simulations/runtime/authoring/spatialProviders.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/providers/spatial.ts` | 15 |
| `src/web/src/simulations/runtime/authoring/transaction.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/transaction.ts` | 3 |
| `src/web/src/simulations/runtime/authoring/types.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/document.ts` | 2 |
| `src/web/src/simulations/runtime/authoring/validate.ts` | `src/web/src/simulations/creation-and-editing/validator/document.ts` | 11 |
| `src/web/src/simulations/runtime/bridgeSession.ts` | `src/web/src/simulations/legacy/runtime/bridgeSession.ts` | 4 |
| `src/web/src/simulations/runtime/capabilities.ts` | `src/web/src/simulations/legacy/runtime/capabilities.ts` | 4 |
| `src/web/src/simulations/runtime/catalog.ts` | `src/web/src/simulations/legacy/runtime/catalog.ts` | 8 |
| `src/web/src/simulations/runtime/commands.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/commands.ts` | 1 |
| `src/web/src/simulations/runtime/composition/createScene.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/createScene.ts` | 1 |
| `src/web/src/simulations/runtime/composition/index.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/index.ts` | 10 |
| `src/web/src/simulations/runtime/composition/observations.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/observations.ts` | 4 |
| `src/web/src/simulations/runtime/composition/projectCanvas.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/projectCanvas.ts` | 2 |
| `src/web/src/simulations/runtime/composition/runtimeState.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/runtimeState.ts` | 3 |
| `src/web/src/simulations/runtime/composition/types.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/types.ts` | 1 |
| `src/web/src/simulations/runtime/composition/useCanvasRuntime.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/composition/useCanvasRuntime.ts` | 6 |
| `src/web/src/simulations/runtime/composition/validateBindings.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateBindings.ts` | 6 |
| `src/web/src/simulations/runtime/composition/validateScene.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateScene.ts` | 3 |
| `src/web/src/simulations/runtime/composition/validateSingleScene.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateSingleScene.ts` | 7 |
| `src/web/src/simulations/runtime/composition/validateWorkspace.ts` | `src/web/src/simulations/creation-and-editing/validator/canvas/validateWorkspace.ts` | 9 |
| `src/web/src/simulations/runtime/contribution.ts` | `src/web/src/simulations/registry/contracts/domainContribution.ts` | 2 |
| `src/web/src/simulations/runtime/definition.ts` | `src/web/src/simulations/legacy/runtime/definition.ts` | 2 |
| `src/web/src/simulations/runtime/elementarySession.ts` | `src/web/src/simulations/legacy/runtime/elementarySession.ts` | 6 |
| `src/web/src/simulations/runtime/gasSession.ts` | `src/web/src/simulations/legacy/runtime/gasSession.ts` | 8 |
| `src/web/src/simulations/runtime/imported/contract.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/imported/contract.ts` | 2 |
| `src/web/src/simulations/runtime/imported/provider.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/imported/provider.ts` | 2 |
| `src/web/src/simulations/runtime/imported/recipe.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/compatibility/importedRecipe.ts` | 3 |
| `src/web/src/simulations/runtime/imported/runner.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/imported/runner.ts` | 2 |
| `src/web/src/simulations/runtime/imported/verify.ts` | `src/web/src/simulations/creation-and-editing/validator/imported.ts` | 2 |
| `src/web/src/simulations/runtime/legacyPlan.ts` | `src/web/src/simulations/legacy/runtime/legacyPlan.ts` | 4 |
| `src/web/src/simulations/runtime/mathCatalog.ts` | `src/web/src/simulations/legacy/runtime/mathCatalog.ts` | 2 |
| `src/web/src/simulations/runtime/mathModel.ts` | `src/web/src/simulations/legacy/runtime/mathModel.ts` | 11 |
| `src/web/src/simulations/runtime/mathSession.ts` | `src/web/src/simulations/legacy/runtime/mathSession.ts` | 5 |
| `src/web/src/simulations/runtime/projectileSession.ts` | `src/web/src/simulations/legacy/runtime/projectileSession.ts` | 7 |
| `src/web/src/simulations/runtime/providers.ts` | `src/web/src/simulations/legacy/runtime/providers.ts` | 14 |
| `src/web/src/simulations/runtime/recipeSession.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/RecipeSession.ts` | 6 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/AngleComparisonExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/AngleComparisonExperiment.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/ArithmeticExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/ArithmeticExperiment.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/BridgeExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/BridgeExperiment.ts` | 1 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/CountingExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/CountingExperiment.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/ElementaryExperiments.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/ElementaryExperiments.ts` | 3 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/EqualGroupsExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/EqualGroupsExperiment.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/FractionBuilderExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/FractionBuilderExperiment.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/FractionNumberLineExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/FractionNumberLineExperiment.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/compatibility/compositions/ProjectileExperiment.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/compositions/ProjectileExperiment.ts` | 1 |
| `src/web/src/simulations/runtime/recipes/compatibility/index.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/index.ts` | 4 |
| `src/web/src/simulations/runtime/recipes/compatibility/presentation.ts` | `src/web/src/simulations/legacy/runtime/recipes/compatibility/presentation.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/loadRecipe.ts` | `src/web/src/simulations/creation-and-editing/runtime-engine/loadRecipe.ts` | 2 |
| `src/web/src/simulations/runtime/recipes/registry.ts` | `src/web/src/simulations/registry/recipes/premade.ts` | 3 |
| `src/web/src/simulations/runtime/recipes/schema.ts` | `src/web/src/simulations/creation-and-editing/validator/parseRecipe.ts` | 3 |
| `src/web/src/simulations/runtime/recipes/serializeRecipe.ts` | `src/web/src/simulations/creation-and-editing/authoring-engine/serializeRecipe.ts` | 2 |
| `src/web/src/simulations/runtime/resolver.ts` | `src/web/src/simulations/legacy/runtime/resolver.ts` | 7 |
| `src/web/src/simulations/runtime/session.ts` | `src/web/src/simulations/legacy/runtime/session.ts` | 25 |
| `src/web/src/simulations/runtime/sweeps.ts` | `src/web/src/simulations/legacy/runtime/sweeps.ts` | 2 |
| `src/web/src/simulations/runtime/townModel.ts` | `src/web/src/simulations/legacy/runtime/townModel.ts` | 11 |
| `src/web/src/simulations/runtime/townSession.ts` | `src/web/src/simulations/legacy/runtime/townSession.ts` | 6 |
| `src/web/src/simulations/runtime/trussModel.ts` | `src/web/src/simulations/legacy/runtime/trussModel.ts` | 3 |
| `src/web/src/simulations/runtime/types.ts` | `src/web/src/simulations/legacy/runtime/types.ts` | 1 |
| `src/web/src/simulations/runtime/validation.ts` | `src/web/src/simulations/legacy/runtime/validation.ts` | 27 |

## 6. Files that remain at their current paths

- `src/web/src/simulations/pre-made/`: all 90 registered recipe JSON sources and accompanying assets remain; component IDs are unchanged. Existing source re-export/import callers are included above when statically resolved.
- `src/web/src/simulations/domains/`: scientific contribution files remain; imports to moved component/runtime owners change where flagged above.
- `src/inference/`: Python serving files remain. No provider/mode or model change is part of the migration.
- `src/web/src/app/`, builder history/storage, and project/library persistence remain framework/application adapters.
- Existing check scripts remain; update their loader/generated-file paths instead of adding a runner.

## 7. Unresolved reachability is not deletion authorization

Legacy preservation includes currently used code. Absent recipe references do not establish dead code. Native promotion does not authorize deleting legacy identities used by saved recipes. At implementation time inspect dynamic lookup, generated imports and CSS/asset URLs in addition to this static inventory. Do not create all proposed extraction files as empty placeholders.


## 8. Implemented extraction details

The source inventory was migrated without forwarding exports or an alternate `lib/planner` implementation. The two old registration barrels were replaced by their split owners: `components/catalog/index.ts` contributes to `registry/index.ts`, `registry/legacyDefinitions.ts`, native object projections and domain metadata; `components/composites/catalog.ts` contributes to defaults, model recipes, learning capture and built-in registration. Their proposed legacy barrel destinations are intentionally absent.

These concrete helper files supplement the proposed tree without adding inference stages:

- `creation-and-editing/input/inference/stage.ts`: the existing structured-stage parser/transport invocation formerly in the planner coordinator.
- `creation-and-editing/component-selection/assemblyPlan.ts`: existing assembly-instance selection wire/validation, separate from confidence-gated capability selection.
- `creation-and-editing/component-selection/selectRecipe.ts`: the retained recipe capability strategy, with its selection schema under the same owner.
- `creation-and-editing/composer/recipeCreation.ts`: existing transaction receipt handling for the retained recipe strategy.
- `registry/definitions/shared.ts` and `controlDefinitions.ts`: native data-only definition factories and generic/control metadata, extracted from legacy declarations.
- `registry/objects/publicDefinitions.ts`: authored-object projection into the public identity contract.

`pipeline.ts` owns public `createSimulation`/`editSimulation` request entry points and shared admission/budget/correlation handling. Composer functions are strategy coordinators; their direct imports are internal. Browser consumers import client transport/contracts/rendering directly; the registry imports no inference configuration or React scenes.

Behavioral changes following relocation include independent flat presentation/value wires, avoiding configuration inference when no parameters are exposed, structured owner-specific repair keys, one bounded edit target reselection, preservation of live nested configuration siblings, early edit progress, and propagation of existing domain output descriptions. Actual browser outcomes remain separate from contract-test results in the evidence ledger.
