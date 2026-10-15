# Legacy simulation components

This directory preserves existing domain scenes, systems, traits, specialized controls and saved-document compatibility. Stable component IDs and versions are unchanged. Add new native components to `simulations/registry/`; promote a domain only with its complete model/contract/rendering dependency closure.

The authoritative data-only identity integration lives in `registry/index.ts`. `registry/legacyDefinitions.ts` adapts declarations from this directory, without importing the registry root from those declarations. Retired control aliases still resolve saved documents but are excluded from active discovery. Generic control implementations, authored object definitions and shared contracts have been promoted out of this directory.

| Responsibility | Owner relative to `simulations/` |
| --- | --- |
| Shared public, parameter, control and observation contracts | `registry/contracts/` |
| Authored line, square, gas, fraction and town objects | `registry/objects/` |
| Generic control implementations and metadata | `registry/controls/`, `registry/definitions/` |
| Built-in construction, defaults, learning capture and premade registration | `registry/recipes/` |
| Creation/edit orchestration and inference | `creation-and-editing/pipeline.ts`, `creation-and-editing/input/inference/` |
| Authoring drafts, operations and serialization | `creation-and-editing/authoring-engine/` |
| Shared document/recipe/runnable validation | `creation-and-editing/validator/` |
| Accepted state, commands, capture, providers and time | `creation-and-editing/runtime-engine/` |
| Generic recipe lesson/board rendering | `creation-and-editing/simulation/` |
| Preserved domain implementation and specialized rendering | `legacy/components/`, `legacy/runtime/`, `domains/` |
| Manual composition, preview, history and persistence | `builder/` |
| Original recipe JSON and assets | `pre-made/` |

`RecipeLesson` renders runtime snapshots and does not own scientific stepping. Runtime execution does not import the manual builder. The experiments shell and builder retain activation/persistence responsibilities.

See the [current pipeline walkthrough](../../../../../../docs/agent-only/features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md), [component architecture](../../../../../../docs/COMPONENT_ARCHITECTURE.md), and [component contracts](../../../../../../docs/agent-only/COMPONENT_CONTRACTS.md). Existing implementation inventories remain historical context; they do not authorize deleting identities used by saved documents.

New definitions and orchestration use the owners above. Existing legacy implementations remain necessary for registered recipes and saved-document compatibility. Follow the [development guide](../../../../../../docs/DEVELOPMENT.md) for verification; historical implementation inventories are omitted from the submission.
