# Agent A implementation handoff

Date: 2026-10-03. Scope: Agent A (ALG-001, LINE-001, PI-001), shared assembly foundation. Acceptance: **not qualified**. Other agents' namespaces have not been implemented by this handoff.

## Integration contract v1

The source contract is `src/web/src/simulations/runtime/contribution.ts`. Export a `DomainContribution` from `src/simulations/domains/<namespace>/index.ts`; imports must not mutate a registry. Agent A integrates contributions explicitly in `runtime/assembly.ts` and integrates actual client adapters in the assembly view. Do not edit shared files from another domain.

Each `DomainModel` supplies a stable `prefabs/<namespace>/<name>` reference and numeric version 1; bounded parameter schemas with units; object defaults; output names/units/descriptions; mandatory observations; maximum instance count; supported action argument schemas, target and timing; dependency IDs under the nine existing kinds; a presentation adapter ID; and trusted initialize/apply/measure functions. Optional `configuration(state)` exposes accepted editable parameters after an action. Equation steps deliberately retain the original initial parameters. Optional `step(state, delta)` is called only by the existing runtime clock, with elapsed model time supplied by the coordinator; each numerical domain must implement its own stable integration policy. Views must consume provider state/outputs, never solve the model independently.

A presentation ID cannot be advertised until its adapter is implemented and registered. Currently registered adapters are balance, line, and circle. Graph binding uses the optional registered `graphOutput` dataset. Other domain adapters and model-specific connection types need serial integration by Agent A; observation-source connections do not impersonate circuit topology or other physical couplings. This initial foundation is not an assertion that those domains already execute.

Runtime checks reject duplicate provider IDs, conflicting action schemas, missing adapters, unsupported versions/actions, invalid parameters/units, missing mandatory observations/controls, duplicate instance/observation identities, unresolved or incompatible links, and incompatible views. Each provider owns its scoped instance state and outputs; no view writes them. Definitions/defaults are frozen; initialization, candidate edits and reset copies are independent. Output records must match declared keys and remain finite (or explicitly null), bounded and serializable. Large simulation fields belong in domain state, with bounded public summaries/probes for model context.

## Assembly and creation boundary

Legacy recipes remain schemaVersion 1. Generated recipes also use schemaVersion 1 with composition `{ref:"assemblies/GeneratedExperiment",version:1}`, empty top-level parameters and an `assembly` envelope with version 1. The assembly contains independently identified prefab instances, selected observations with declared units, typed observation-source connections, bound controls, and scene/table/optional graph views. The recipe, compiled definition and staged state must validate before the current session is disposed or replaced.

Limits: serialized assembly 16,000 characters; 1–4 total instances; up to 24 observations, connections and controls; 1–3 unique views; stable IDs at most 80 characters. Provider limits can be narrower. Public outputs have at most 500 traversed nodes, depth 5 and arrays of at most 30 items. Existing planner context limits also apply.

Fresh Apertus interprets teaching intent, Laya selects a registered object mechanism and optionally an additional graph, and Apertus authors a compact object recipe. Each object has independent id/label/parameters and selected output names. The compiler expands mandatory controls, exact output units, typed connections and the selected finite presentation bindings. It does not select a finished experiment or infer entities from English keywords. An unaccepted optional graph choice preserves the registered scene/table default and is traced; the mechanism still requires an accepted Laya selection. Explicit graph incompatibilities remain validation failures. The shared repair budget, semantic conflict restart, original prompt, deadlines and cancellation remain intact.

Compact configuration fields: schemaVersion 1, outcome configuration, confirmedComposition (the selected prefab mechanism), title, learningGoal, objects, optional display message. An omitted display message uses the validated learning goal. Every object has id, label, parameters and observations (registered output-name strings). Full assembly configuration remains supported for tooling. No model response or finished runtime state is cached or injected.

## Agent A providers

| Provider | Configuration/defaults | Commands | Authoritative outputs and limits |
| --- | --- | --- | --- |
| `prefabs/math-foundations/Equation` | Integer coefficient, constant, right in −1000…1000; default 2,3,11 | SUBTRACT_BOTH (integer −1000…1000), DIVIDE_BOTH (integer −100…100, zero rejected), UNDO | Normalized signed exact rationals; original-equation substitution, symbolic equation and 24-step bounded undo history. One equation object; solving steps are actions on it. Unsafe rational overflow rejects atomically. |
| `prefabs/math-foundations/Line` | Slope −20…20 (default 1), intercept −100…100 (default 0), xMin/xMax −100…100 (default −5/5, ordered) | SET_SLOPE, SET_INTERCEPT | 21 authoritative domain samples, y at 0 and 1, equation and rise/run marker; up to four independent lines. Chart rescales to include selected lines and markers; accessible numerical point table. |
| `prefabs/math-foundations/Circle` | Radius 0.01…100 units (default 1) | SET_RADIUS | d=2r, C=2πr, C/d; positive radius. Display rounding at 6 decimal places (ratio tolerance 1e−6). Unrolling illustrates calculated geometry and does not measure π. |

RESET is session-wide and restores the accepted initial instances, step history and local presentation/control state. Static math lessons do not start an animation clock. Shared clock disposal and instance-targeted atomic batches retain legacy behavior. Follow-up diagnostics link accepted request correlation IDs with committed revisions; snapshots are copies. Recipe save/load restores accepted configuration, not a running checkpoint.

## Tests and integration requests

Run from `src/web`:

- `pnpm test:assembly`: exact and independent numerical oracles, two-line structure, optional graph, instance isolation, compact/full configuration, schema rejection, atomic rollback, stale revisions, accepted reset, recipe round trip and fresh mocked inference contract checks.
- `pnpm test:assembly:browser`: supplemental deterministic Playwright CLI UI fixtures, with an isolated diagnostic web instance at localhost:43110 by default. `--live` submits fresh inference. Environment overrides: AGENT_A_BASE_URL, AGENT_A_CASE, AGENT_A_WIDTH, AGENT_A_RAW_DIR.
- Existing `test`, `test:planner`, `test:creation`, `test:apertus`, TypeScript, lint and production build remain required regression checks.

Browser captures go only to task-specific temporary directories, are inspected and summarized, then deleted. Browser CLI is not the mandatory Playwright MCP gate. The canonical input is the home (`/`) creation screen; `/experiments` is the premade catalog and remains a separate flow. No new premade cards were added.

Agents B–E should submit pure contributions, numerical oracles, supported domain connections/actions, view adapters, limitations and shared integration requests. Integration and the full fifteen-prompt, two-round MCP gate remain outstanding until those contributions and MCP tools are available. See `report.md` and `ux-review.md` for actual development evidence; no Working (2/2) promotion is authorized.
