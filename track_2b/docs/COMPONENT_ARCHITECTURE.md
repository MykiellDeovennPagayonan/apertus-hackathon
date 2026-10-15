# Component architecture

pAperSim separates model interpretation from simulation execution. Apertus proposes supported activities and settings; application code owns component identities, validates recipes and commands, and executes the accepted simulation. Scientific state does not depend on asking an LLM to calculate each animation frame.

## Ownership

| Owner under `src/web/src/simulations/` | Responsibility |
| --- | --- |
| `registry/` | Stable component IDs/versions, capability contracts, discovery and recipe registration |
| `pre-made/` | Authored recipe JSON and associated assets |
| `domains/`, `legacy/` | Domain declarations, equations, specialized views and compatibility implementations |
| `creation-and-editing/input/` | HTTP/browser boundaries and inference adapters |
| `creation-and-editing/intent-interpreter/`, `component-selection/`, `composer/` | Intent interpretation, supported selection, creation and follow-up edits |
| `creation-and-editing/authoring-engine/`, `validator/` | Isolated authoring operations, serialization and structural validation |
| `creation-and-editing/runtime-engine/` | Accepted state, commands, time, observations and capture |
| `creation-and-editing/simulation/` | Lesson and board rendering |
| `builder/` | Manual editing, graph connections, preview, undo/history and persistence |

Prepared lessons, manual authoring and accepted AI compositions share registered identities, validation and runtime contracts. Controls issue supported commands; displays observe model state. Authoring layout changes must preserve quantities and scientific bindings.

## Compatibility and extension

Stable IDs and supported legacy readers preserve saved lessons. Keep an identity resolvable even when it is excluded from discovery. Delete an implementation only after checking recipe JSON, migrations, runtime registration, tests and saved-document compatibility.

New components should declare their supported parameters, commands, observations, units and assumptions at the existing domain/registry owner. Reuse the runtime and authoring path rather than creating a second editor or execution engine. Verify invalid inputs, independent copies, reset, save/reopen and a meaningful learner interaction.

The [pipeline walkthrough](agent-only/features/SIMULATION_GENERATION_AND_EDITING_PIPELINE.md) describes creation and follow-up ownership. [Component contracts](agent-only/COMPONENT_CONTRACTS.md) record foundational responsibilities; they include design vocabulary beyond the shipped catalog. [Creation rules](agent-only/rules/CREATION-PIPELINE-RULES.md) define the model/application boundary. Neither a design document nor a successful structural check certifies scientific correctness or request fidelity.
