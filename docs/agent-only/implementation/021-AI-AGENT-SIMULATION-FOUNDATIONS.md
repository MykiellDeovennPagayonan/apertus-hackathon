# 021 — General AI agent infrastructure for simulations

Date: 2026-10-09  
Status: Core infrastructure implemented and verified locally on 2026-10-10. Optional inventory items remain extensions; see [implementation evidence and scope](021-IMPLEMENTATION-EVIDENCE.md).  
Scope: Reusable AI agents across social, spatial, economic, educational, and other simulations.

## 1. Purpose and architectural boundary

Provide the shared components, contracts, adapters, and runtime services needed to add AI agents to authored simulations. An agent can observe an environment, maintain local knowledge, pursue objectives, select supported actions, communicate, and react to outcomes. Different simulations supply different environments and rules while using the same infrastructure.

This is a general design inventory based on the current codebase and anticipated agent needs. Proposed modules are candidates, not existing registered IDs or a requirement to implement every feature immediately. Implement core contracts first and add optional capabilities when they have a concrete consumer.

An agent consists of identity, configuration, objectives, permitted observations, memory, behavior policy, and execution state. A model supplies proposals. Trusted code validates and executes them. Many independently configured agents can share one inference service; their identities and state remain independent.

Scenario rules, roles, team counts, message formats, completion criteria, and learning questions belong to individual simulation designs. They must not become assumptions of the agent foundation.

Read alongside [component architecture](../../COMPONENT_ARCHITECTURE.md), [component contracts](../COMPONENT_CONTRACTS.md), [simulation design philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md), and [premade recipe convention](013-PREMADE-JSON-RECIPE-CONVENTION.md).

## 2. Current infrastructure to reuse

| Existing owner | Useful capability | Infrastructure gap |
| --- | --- | --- |
| `simulations/components/` | Traits, behaviors, systems, resources, prefabs, visuals, views, controls | General agent definitions and implementations |
| `components/catalog/` | Data-only schemas, public definitions, discovery | Agent capabilities and supported authoring connections |
| `runtime/authoring/providers.ts` | Synchronous initialize/apply/measure/step boundary | Asynchronous agent effect coordination |
| `runtime/recipeSession.ts` | Session identity, revisions, subscriptions, authored/runtime separation | Agent execution lifecycle and stale-result checks |
| `lib/llm/config.ts` and `lib/llm/adapters.ts` | Apertus, OpenAI, Anthropic configuration and wire adapters | Provider-neutral agent inference port and capability negotiation |
| `lib/apertus/transport.ts` | Bounded output, cancellation, validation, diagnostic hooks | Remove authoring-specific coupling where shared transport is needed |
| Project/library repositories | Persistence, revision checks, transaction patterns | Agent runs, pending work, action receipts, memory persistence |
| Existing command dispatch and model systems | Trusted state changes | Narrow environment adapter exposing permitted actions to agents |

Existing town behavior is code-defined, and existing LLM generation authors recipes. Runtime LLM agents are a new capability. Current provider selection is deployment-wide; the model-routing design below is an extension, not an existing feature.

The existing synchronous model provider boundary should remain synchronous. Network calls, queues, repositories, worker execution, and session ownership belong outside the component folders.

## 3. Component classification

Keep the existing component kinds. Runtime and adapters are infrastructure modules, not additional authorable component kinds. A trait is attached data; it need not be a separately movable canvas node. Register independently useful authoring capabilities and keep internal helpers ordinary modules.

### 3.1 Traits: configuration, state, and outputs

| Proposed trait | Contents | Normal writer |
| --- | --- | --- |
| `AgentIdentity` | Stable instance ID, label, optional role tags | Construction and validated configuration |
| `AgentProfile` | Persona, expertise, communication style, initial characteristics | Validated authored configuration |
| `AgentObjectives` | Goals, priorities, constraints, completion conditions or references | Configuration; explicit goal transition handler |
| `AgentCapabilities` | Allowed action/tool references and argument restrictions | Validated configuration and permission policy |
| `AgentPerception` | Visibility/sensor bindings, subscriptions, observation bounds | Configuration; observation system for derived output |
| `AgentMemory` | Local knowledge, bounded notes, remembered event references, provenance | Memory transition system |
| `AgentPlan` | Optional bounded proposed steps and current progress | Plan transition system |
| `AgentExecutionState` | Activity, pending work ID, last result, failure category | Runtime transition reducer |
| `AgentRelationships` | Optional group membership and explicit relationship state | Authorized relationship transitions |
| `AgentModelBinding` | Reference to an approved model profile and supported settings | Validated configuration |
| `AgentBudget` | Execution limits and observed consumption | Configuration for limits; budget accounting for consumption |

Profile, objective, permissions, and knowledge are separate concerns. A persona cannot grant permissions. Expertise is a configured role, not proof of factual knowledge. Relationships cannot implicitly reveal private data.

For every field document type, meaning, range, default, edit timing, visibility, reset behavior, and authoritative writer. Keep initial configuration separate from live state. Distinguish runtime operational timestamps from simulation time.

### 3.2 Resources: immutable reusable inputs

Candidate resources include persona presets, goal templates, model profiles, prompt templates, action schemas, communication policies, visibility policies, knowledge datasets, and memory policies.

Resources hold data and known references. They cannot contain credentials, mutable agent memory, executable scripts, or callbacks generated by a model. Approved model profiles contain non-secret settings and a server-resolved provider reference. A knowledge resource records source identity, version, and access scope.

### 3.3 Behaviors: declarative activation and decision policies

| Proposed behavior | Purpose |
| --- | --- |
| `ActOnRequest` | Act when a validated command or scheduler grants an opportunity |
| `ReactToEvent` | Request evaluation when a subscribed event matches a bounded filter |
| `ActOnInterval` | Request evaluation at an explicit simulation-time interval |
| `PursueGoal` | Evaluate progress and request bounded next-step selection |
| `FollowPlan` | Request the next eligible step of an accepted plan |

Behaviors declare triggers, prerequisites, supported decision modes, and stopping conditions. They do not call HTTP, run a database query, bypass permissions, or directly mutate the world. Goal pursuit always has explicit limits; it is not an unbounded self-triggering loop.

### 3.4 Systems: trusted computation

| Proposed system | Responsibility |
| --- | --- |
| `AgentObservationSystem` | Select visible environment data and events |
| `AgentContextSystem` | Assemble bounded model context from allowed inputs |
| `AgentDecisionSystem` | Interpret a typed response as a proposed supported decision |
| `AgentActionValidationSystem` | Check action schemas, capabilities, references, and preconditions |
| `AgentTransitionSystem` | Calculate accepted agent state and events |
| `AgentMemorySystem` | Apply validated memory writes, retention, and provenance rules |
| `AgentGoalSystem` | Evaluate explicit goal progress using supplied domain evaluators |
| `AgentPlanSystem` | Validate plan shape and update accepted step progress |
| `AgentCommunicationSystem` | Validate recipients/channels and calculate message delivery events |

Systems should be pure where practical. Side effects are described through typed requests and handled by runtime adapters. Goal evaluation belongs to a trusted domain evaluator when success is objectively computable. Model self-assessment can be recorded separately, but does not replace application invariants.

Do not duplicate existing navigation, physics, arithmetic, or resource mechanics inside agent systems. An agent requests an existing validated action; the domain system remains the authoritative implementation.

### 3.5 Prefabs, views, visuals, and controls

`AIAgent` assembles the core traits, behavior bindings, and initial independent state. Optional profiles may assemble communicating, reactive, or spatial agents from the same pieces rather than introducing unrelated implementations.

Candidate presentation includes `AgentInspectorView`, `AgentStatusView`, `AgentEventLogView`, `AgentMemoryView`, and `AgentPlanView`. Reuse existing data displays where suitable. Private inspection requires an explicit authorized audience. Spatial representations should reuse existing visuals with agent identity/status bindings.

Controls translate user input into validated commands: request evaluation, activate, suspend, retry, cancel, reset, configure objectives, and inspect outputs. Model selection controls reference approved profiles; they never accept browser-supplied API credentials or arbitrary provider URLs.

Views consume snapshots. Additional views, hidden visuals, and camera changes do not create agent executions or change simulation results.

## 4. Adapter inventory

Adapters connect the general agent core to concrete external or domain implementations. Inject only the interfaces required by each caller.

| Adapter/port | General contract | Candidate implementations |
| --- | --- | --- |
| `ModelAdapter` | Generate a bounded typed result; normalize usage, refusal, truncation, and cancellation | Existing Apertus, OpenAI, Anthropic wire adapters; deterministic test model |
| `ModelResolver` | Resolve an approved profile to provider settings and declared capabilities | Existing server configuration; later allowlisted model profiles |
| `TokenizerAdapter` | Estimate/count input and reserve output within known capacity | Provider/model tokenizer where available; documented conservative fallback |
| `EnvironmentAdapter` | Expose scoped observations and supported domain action descriptions | Existing simulation runtime snapshot/command adapters |
| `ActionExecutor` | Execute a validated action against expected state and return a receipt | Existing dispatch; domain-specific transactional handlers |
| `ToolAdapter` | Execute a registered bounded external capability with explicit permissions | Read-only retrieval first; explicitly admitted effectful tools later |
| `CommunicationAdapter` | Deliver messages through scoped channels and recipient rules | In-simulation event stream; no external messaging by default |
| `MemoryRepository` | Read/write permitted memory with version and provenance | In-memory store; persistent repository |
| `RetrievalAdapter` | Retrieve scoped knowledge with source references and bounds | Static datasets; optional indexed/vector retrieval |
| `RunRepository` | Persist snapshots, reservations, events, revisions, and receipts | MongoDB; deterministic in-memory implementation |
| `SchedulerAdapter` | Select eligible work under execution policy and budgets | Sequential scheduler; later bounded concurrent/batch scheduler |
| `ClockAdapter` | Supply simulation and operational time without conflating them | Existing simulation clock; server operational clock |
| `EventPublisher` | Publish committed events/snapshots to authorized subscribers | Session subscriptions; HTTP progress/event transport |
| `TelemetryAdapter` | Record sanitized execution metadata | Existing diagnostic conventions; test collector |

These are logical boundaries, not a mandate for fourteen classes or services. For example, run and memory storage can share a repository implementation while exposing different narrow interfaces. Introduce a separate adapter only where it isolates a dependency, permission boundary, or substitution.

Provider capabilities include structured output, streaming, tool-call support, token accounting, context capacity, and cancellation limitations. Unsupported capabilities must produce explicit validation errors or a documented application fallback. Do not assume all providers support the same sampling parameters.

Laya/Jev-style choice models can later implement a distinct decision port for finite-option decisions. Their existing capability-selection integration does not make them general action planners or text generators. A decision adapter returns a normalized decision proposal; execution still uses the same validation boundary.

## 5. Runtime ownership and dependency flow

Place browser-safe contracts, state reducers, scheduling policies, and session adapters under `simulations/runtime/agents/`. Keep server runners, provider composition, repositories, and credentials behind server-only imports. Maintain existing runtime-to-builder boundaries.

```text
Authored agent configuration + environment snapshot
    → activation policy / scheduler
    → authorized observation selection
    → memory read + context assembly
    → model or decision adapter
    → typed proposal
    → schema + capability + domain validation
    → trusted action execution and state transition
    → persistent commit / receipt
    → authorized events and read-only views
```

The runner coordinates this flow; it does not become the owner of every concern. Component systems depend on supplied data and narrow contracts. HTTP endpoints validate protocol/authentication and delegate to the runner. Model calls do not go through the recipe authoring planner or inherit its request budgets.

Animation stepping must not directly issue network calls. Interval/event behaviors produce bounded activation requests which the scheduler admits independently. Define whether simulation time pauses while work is pending; that policy belongs to the environment/session configuration.

## 6. Core protocol contracts

Define versioned contracts for:

- **Agent configuration:** instance identity, traits, behavior/resource references, approved model binding.
- **Environment binding:** environment identity, observation policy, action capabilities, revision scope.
- **Run configuration:** frozen authored configuration, schema versions, rules, execution policies, model profile identities.
- **Observation:** source/version, observation cutoff, visible entities/events, recipient identity, provenance.
- **Activation:** trigger identity/type, target agent, prerequisites, deduplication identity, logical time.
- **Work reservation:** work ID, expected state versions, agent ID, activation ID, lease/fencing identity, allowed operations.
- **Decision proposal:** discriminated action or bounded action bundle, validated arguments, supporting event/source references, optional memory/plan proposal.
- **Action receipt:** operation identity, outcome, committed revisions, accepted events, effect status.
- **Run snapshot:** lifecycle status, agent state, environment bindings, accepted history, pending work, budgets.
- **Attempt receipt:** attempt identity, work identity, provider/model, duration, usage availability, sanitized failure.

Actor identity, permissions, and accepted event identity originate in trusted application state. Models do not choose authoritative IDs or commit revisions. Memory notes and plans are explicit generated data, not access to hidden model reasoning.

Keep statuses discriminated and transitions centralized. Separate transport failure, refusal, truncation, validation failure, stale state, denied capability, cancellation, and storage failure. Failure is a recorded outcome, not an invented successful action.

## 7. Scheduling and execution lifecycle

1. Admit an activation under behavior policy, deduplication, dependencies, and budgets.
2. Reserve work atomically with relevant expected versions, observation cutoff, lease, and fencing identity.
3. Capture permitted observations/configuration and read authorized memory.
4. Assemble bounded context and call the selected adapter outside database transactions.
5. Validate result shape, references, capability, and current domain preconditions. Apply a bounded repair policy if appropriate.
6. Stage the candidate transition and requested effects.
7. Commit supported local changes with version/fencing checks, or execute explicitly managed external effects under the effect protocol below.
8. Publish accepted state and release/schedule follow-up work under policy.

Support command-driven, event-driven, interval-driven, and goal-driven activation through the same lifecycle. A sequential scheduler is a simple first implementation. Concurrent execution requires an explicit conflict policy: strict whole-environment revisions, per-entity read/write versions, or a simultaneous-step barrier. Never accept stale proposals merely because inference ran concurrently.

Lease expiry allows crash recovery. A replacement worker increments fencing identity; old work cannot commit afterward. Cancellation invalidates the reservation as well as requesting transport abort. Provider-side computation may continue after client cancellation.

Suspend, cancel, and reset have distinct semantics. Suspension stops new activations; configuration defines whether reserved work may finish. Cancellation invalidates specific work. Reset creates a fresh run generation/identity and reconstructs initial state. Retry preserves logical work identity while creating a new attempt identity.

## 8. Actions, tools, and external effects

Define a registry of trusted supported actions with schema, permission requirements, preconditions, read/write scope, execution timing, idempotency behavior, and result contract. Model output cannot introduce a new executable action or run arbitrary code.

Environment actions reuse domain handlers. Tools represent admitted external capabilities. Treat read-only retrieval differently from an effectful operation such as sending a message or updating a remote resource. Capabilities are explicitly bound to an agent and enforced before execution.

Local transactional changes can commit atomically. An external service call cannot join the database transaction. Use a persisted effect intent/outbox, stable idempotency key where the service supports it, effect status/receipt, and a reconciliation path. Document compensation only where a real compensating operation exists. Do not claim rollback or exactly-once external execution where the service cannot provide it.

A multi-step plan does not imply one ACID transaction across all steps. Each step has its own preconditions and receipt. Define whether a failed step stops, retries, requests replanning, or requires user intervention. Bound every loop and follow-up activation.

## 9. Perception, communication, and memory

Visibility policies select data before context construction. Support public, agent-private, group-scoped, and environment-scoped data through explicit audience rules. Relationship tags are not permissions. Keep private data out of unauthorized events, prompts, exports, and diagnostics.

Perception can combine spatial/entity state, numeric measurements, delivered messages, and subscribed events. Preserve source identity and cutoff so a proposal can be tied to its observation. Avoid embedding the complete world graph in every prompt.

Communication is one supported action family, with sender identity, recipients/channel, bounded content, delivery semantics, and visibility. Scenario-specific message requirements belong to scenario rules. External communication needs a separately authorized tool capability.

Memory tiers may include recent context, bounded working notes, persistent event references, optional summaries, and optional retrieved knowledge. Start with bounded notes and event references; add retrieval infrastructure when necessary. Summaries store source coverage/version and remain generated interpretations rather than authoritative source replacements.

Private/public partitioning is enforced by repositories and observation selection, not prompt instructions alone. Retention, forgetting, reset, and deletion semantics are explicit. Templates and preset resources never share mutable memory across agents.

## 10. Context and model policies

Context order separates application instructions, supported capabilities, configured objectives, permitted observations, memory, and output schema. Observed content cannot change application permissions or system instructions. Never let an observed message redefine tool bindings.

Reserve output capacity and bound input against the selected model profile. Character counts are not token counts. Preserve mandatory constraints when pruning context; fail explicitly when required input cannot fit. Retrieval and summary generation also consume explicit budgets.

Model routing resolves approved references server-side. A single deployment-selected profile can be the first implementation. Later per-agent profiles or mixed-model runs use the same port and record the actual resolved model per attempt. Credentials never belong in authored documents.

Streaming is optional presentation of provisional output. It does not commit partial actions, memory, or world state. Only a complete validated result may cross the acceptance boundary.

## 11. SOLID and code quality

| Principle | Required application |
| --- | --- |
| Single responsibility | Separate perception, context, inference, validation, effects, transitions, persistence, and rendering |
| Open/closed | Extend registered adapters, behaviors, and domain action handlers without changing unrelated agent orchestration |
| Liskov substitution | Adapter implementations honor the same bounds, result/error semantics, cancellation contract, and revision guarantees |
| Interface segregation | Give each caller only required observation, model, commit, scheduling, or presentation operations |
| Dependency inversion | Inject infrastructure through contracts; pure domain systems do not import provider configuration or database clients |

Prefer explicit data types and pure functions. Avoid a universal mutable agent manager, speculative inheritance hierarchies, arbitrary callbacks in recipes, and one global barrel importing every backend. Add modules when responsibilities or dependencies differ.

Each field has one normal execution writer. Construction, validated configuration edits, and reset are coordinated lifecycle exceptions. Keep shared definitions immutable and instantiated state independent. Preserve existing generation behavior when extracting shared LLM transport.

## 12. ACID and state consistency

ACID describes persistent commits, not the entire inference/effect lifecycle.

| Property | Required behavior |
| --- | --- |
| Atomicity | Related accepted state, memory updates, events, receipts, and revisions commit together within the declared transaction scope |
| Consistency | Configuration schemas, action invariants, permissions, references, and domain preconditions remain valid |
| Isolation | Expected revisions/read sets, reservations, and fencing prevent conflicting or stale commits |
| Durability | Report persistent acceptance after the configured durable write succeeds; restore committed history after restart |

If state fits a bounded single aggregate, a conditional document update can atomically commit it. When agent memory, environment state, receipts, or history occupy separate documents, use a transaction-capable deployment and a real transaction for changes requiring joint atomicity. Declare aggregate/transaction boundaries before implementation. Do not silently downgrade to sequential writes.

Work/action idempotency is distinct from revision checks. Duplicate submissions accept a logical action at most once and return its receipt or a conflict. External inference can still run multiple times; external effects require their own idempotency/reconciliation strategy.

Separate durable authoritative state from local UI caches. If the browser's existing simulation state must be authoritative, explicitly implement the weaker local mode and its conflict/recovery contract; do not claim database atomicity across unsynchronized browser and server state. Persistent server-owned agent/environment transitions should publish snapshots to browser projections.

Guest memory/local export can provide a useful mode with different guarantees. Document write concern, transaction prerequisites, history bounds, recovery, and ownership checks for each supported repository implementation.

## 13. Recipes, checkpoints, replay, and migration

Authored recipes save starting agent/environment configuration, bindings, resources, layout, and presentation. Runs freeze the execution configuration and own runtime memories, pending work, receipts, and accepted history. Checkpoints capture a versioned runtime state separately from authored defaults.

Replay reconstructs accepted state from recorded events or checkpoints without inference or reexecuting external effects. Store effect receipts for display. Rerun starts a new identity and requests new decisions. Identical settings or random seed do not guarantee identical LLM outputs.

Record schema, action-handler/rule, and model-profile versions needed to interpret history. Provide migrations or an explicit unsupported-version error. Integrate catalog definitions, runtime providers, serialization, snapshot adapters, validation, and builder settings together before advertising a new capability.

## 14. Budgets, operational services, and diagnostics

Bound activations, accepted actions, attempts, repairs, plan depth, follow-up work, input/output tokens, retrieval results, elapsed time, and concurrency. Budget accounting distinguishes configured limits from observed consumption; unknown provider usage is unknown rather than zero.

A shared provider limiter coordinates agent work and existing recipe generation. Define queue capacity, fairness, cancellation, backpressure, and overload outcomes. Existing transport rejects excess concurrency; queueing is new infrastructure. Increase local model concurrency only after measurement.

For executions that must survive request disconnects or process restarts, use durable queued work and a worker. An in-process promise is not a durable job. A bounded request runner remains a supported simpler execution mode with explicit interruption semantics.

Diagnostics correlate run, agent, activation, work, attempt, action, model, duration, validation outcome, commit revision, and effect status. Keep production logs free of credentials, private memories, and full prompts. Detailed local traces require explicit configuration. Do not invent latency, price, model capability, or quality guarantees.

## 15. Implementation sequence

1. **Contracts and ownership:** finalize traits, activation/proposal/receipt schemas, environment authority, visibility, and transaction boundaries. Audit existing reusable handlers and displays.
2. **Pure core:** observation/context builders, capability validation, state/memory reducers, independent prefabs, deterministic activation policies.
3. **Runtime and persistence:** run lifecycle, reservations, idempotency, revisions, fencing, recovery, snapshot subscriptions.
4. **Provider and environment adapters:** wrap existing model transports; expose existing domain actions through narrow environment/execution ports.
5. **Catalog and builder integration:** register useful agent pieces, bindings, settings, outputs, serialization, and read-only views.
6. **Generic integration fixtures:** exercise message delivery, a numeric world action, and reactive activation without hardcoding one scenario into the core.
7. **Optional extensions:** bounded planning, retrieval, group channels, mixed models, concurrent schedules, durable workers, and effectful tools as concrete consumers require them.
8. **Live evaluation:** verify actual configured models with measured context/schema reliability, latency, cancellation limits, and action quality. Keep deterministic correctness evidence separate.

The core can ship without every optional adapter. A capability is advertised only when its concrete implementation, permissions, lifecycle, and verification exist.

## 16. Verification and completion criteria

- Independently instantiated agents never share mutable memory/state accidentally.
- Unauthorized observations, channels, memory reads, and tool calls are rejected.
- Invalid action arguments, references, preconditions, and unsupported operations never mutate authoritative state.
- Duplicate activations and commits cannot duplicate accepted actions.
- Competing workers, changed world state, expired leases, cancellation, and reset reject stale results.
- Failed inference, exhausted repair, storage failure, and external-effect ambiguity preserve declared invariants and expose recoverable outcomes.
- Scheduling loops, plans, context, retrieval, and queues remain bounded.
- Replay performs no model calls or external effects; migration preserves accepted meaning or rejects unsupported history explicitly.
- Additional views and animation frames initiate no inference.
- Authored save/reopen preserves configuration and excludes incidental runtime memory.
- Deterministic adapters verify contracts; live provider evaluation separately verifies availability and observed quality.
- Relevant TypeScript, architecture, provider regression, persistence integration, and builder/browser checks pass for implemented changes.

The foundation is reusable when different environments can provide observations and action handlers through the same contracts without changing model adapters or core lifecycle code. Individual simulation concepts define their own rules and acceptance criteria on top of this infrastructure.
