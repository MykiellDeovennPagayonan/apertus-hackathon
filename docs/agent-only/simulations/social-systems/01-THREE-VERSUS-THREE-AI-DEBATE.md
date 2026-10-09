# 01 — Three-versus-three AI debate

Date: 2026-10-09  
Status: Proposed simulation concept; defaults below are design proposals.  
Dependency: [021 — AI agent simulation foundations](../../implementation/021-AI-AGENT-SIMULATION-FOUNDATIONS.md).

## 1. Concept and learning question

Six AI agents debate a motion in two teams of three. Each has a distinct persona, expertise, and communication style. The learner watches arguments develop, inspects which earlier claims a rebuttal addresses, and reruns the debate after changing selected starting conditions.

Primary learning question: **How does changing team personalities affect the arguments and responses on the same topic?**

The simulation explores model-generated discourse. It does not establish how real people with those personalities would behave, determine factual truth, or produce an objective winner.

## 2. First-version experience

Open a useful default motion with six visible agents and assigned sides. Read the motion, inspect personas, and select **Next speech**. The current speaker generates a bounded speech, which appears in the shared transcript after validation and acceptance. Repeat manually or enable autoplay.

Show current round, next speaker, accepted speech count, and generation status. Learners can pause between turns, retry a failed turn, replay an existing transcript, or restart as a new run. Keep the primary action next speech/autoplay; advanced configuration belongs in setup or builder settings.

Topic and persona changes apply before a new run. Avoid mid-run authored changes in the first version so comparisons remain understandable. Existing accepted speeches remain inspectable when another run is created.

## 3. Proposed default configuration

Motion: **Should schools replace most homework with projects completed during school hours?**

| Agent | Team | Persona and expertise | Intended contribution |
| --- | --- | --- | --- |
| P1 | Proposition | Careful education researcher; evidence-seeking and measured | Establish learning and workload arguments |
| P2 | Proposition | Pragmatic school administrator; implementation-focused | Address feasibility, schedules, and tradeoffs |
| P3 | Proposition | Empathetic student advocate; direct and reflective | Discuss access, wellbeing, and student experience |
| O1 | Opposition | Skeptical learning researcher; precise and analytical | Challenge assumptions about practice and retention |
| O2 | Opposition | Cautious teacher; concrete and resource-aware | Explain classroom capacity and individual practice needs |
| O3 | Opposition | Curious parent representative; respectful and probing | Explore independence, family needs, and accountability |

These are fictional roles and qualitative prompt settings. Expertise does not imply verified sources. Personality and stance are independently editable: swap sides while retaining a profile, or change a profile while retaining its side.

Topic alternatives may include urban transport, school phone policies, remote work, or technology policy. Each motion must be a bounded, clearly contestable statement. A topic label such as “education” is insufficient without a motion and scope.

## 4. Debate protocol

The application controls speaker order. The first version uses three rounds and eighteen accepted speeches:

| Round | Order | Agent instruction |
| --- | --- | --- |
| Opening | P1, O1, P2, O2, P3, O3 | State a position and a distinct supporting argument |
| Rebuttal | O1, P1, O2, P2, O3, P3 | Address an identifiable earlier opposing argument |
| Closing | P1, O1, P2, O2, P3, O3 | Synthesize the team's case and acknowledge a meaningful tradeoff |

Use a configurable short speech limit, initially proposed at 80–150 words with a separate provider output-token reserve. Word limits and token limits are different; establish feasible values through Apertus measurement. Store the configured limit with each run.

Rebuttals include at least one valid opposing message reference. Application validation can confirm the reference exists and belongs to the opposition. Whether the text meaningfully addresses it requires qualitative evaluation; a valid reference alone is not evidence of engagement.

Opening speakers may see already accepted opening speeches. This sequential visibility is part of the protocol and should be recorded. Comparing alternate orders is later work, since order itself can affect the result.

No model decides to skip a speaker, extend a round, switch teams, or end the debate. Completion occurs after the final accepted closing speech.

## 5. What each agent sees

Each turn supplies the motion and scope, assigned team/role, own persona/objective, round instruction, permitted public transcript context, and own bounded private notes.

Agents cannot see another agent's private notes. The first version has no private team chat. Teammates coordinate through public speeches and assigned contribution roles. If team channels are added, make channel membership and visibility explicit in configuration and context selection.

The model returns a speech proposal with optional links to earlier messages and an optional bounded private-note update. The application owns actor identity, accepted message identity, event sequence, and turn advancement. Private notes are generated simulation data, not the model's hidden reasoning.

## 6. Composition in the existing builder

The target premade lives at `src/web/src/simulations/pre-made/debate/recipe.json` and loads through the normal shared registry. This path is proposed; the concept document does not add a recipe or advertise a capability that has no implementation.

| Piece | Ownership | Connection |
| --- | --- | --- |
| Six `AIAgent` instances | Shared agent prefab and traits | Membership and objectives supplied to debate session |
| Debate session/rules | Scenario definition and trusted turn system | Motion, teams, rounds, legal actions, next actor |
| Transcript state | Accepted run events | Supplies visible observations and transcript presentation |
| Transcript view | Shared result presentation | Reads accepted public messages and reference links |
| Agent/status views | Shared inspection presentation | Reads profile, team, current activity, next-turn status |
| Bound controls | Shared command controls | Dispatch next turn, pause, retry, restart, and replay commands |

Public catalog nodes should expose meaningful independently authorable pieces. Agent traits/context helpers do not each need canvas nodes. Transcript, agent presentation, and controls should be movable/configurable through the shared builder where supported. Presentation reads one authoritative run; it does not start a second debate.

Reuse existing text/data presentation and controls when their contracts fit. Add a transcript-specific view only for capabilities such as speaker grouping, round markers, and message-reference navigation that existing displays cannot provide cleanly.

## 7. Learner and author controls

Before a run, configure motion, scope, team assignment, persona, expertise, communication style, and supported speech limits. Advanced settings may expose context policy and model identity as read-only execution information. Provider credentials remain server-side.

During a run:

- **Next speech:** reserve and execute one legal turn.
- **Autoplay:** execute successive turns through the same runner.
- **Pause:** stop starting subsequent turns; a reserved speech may finish and commit.
- **Retry:** retry the failed logical turn without duplicating accepted messages.
- **Restart:** create a new run from the selected starting configuration.
- **Replay:** reveal recorded accepted messages without inference.

Live human speeches, arbitrary interventions, free discussion, and AI-selected speaker order are deferred. They alter the protocol and need explicit rules rather than special UI exceptions.

## 8. Failure and recovery behavior

While generating, show the selected speaker and pending status. A failed request leaves the transcript and next speaker unchanged. Present a concise failure with retry availability; never display fallback prose as though that agent generated an accepted speech.

Invalid references, oversized speech, malformed responses, and illegal actions use bounded repair attempts. Exhausted repair leaves that turn failed. No automatic silent provider switch is permitted.

Reset or cancellation prevents old results from entering the new run. Duplicate requests accept one speech for a turn at most. Persistence errors do not advance the displayed authoritative debate. Resume follows the foundation's reservation and recovery contract.

## 9. Observation and comparison

Initially display objective protocol measurements: accepted turns, speech length, reference count, round, generation duration, and available token usage. Label unknown usage explicitly. Counts of references do not measure correctness or persuasiveness.

For learning comparisons, change one configured variable where possible:

1. Run the default motion with the default personas.
2. Preserve teams and motion, change one persona, then rerun.
3. Inspect which arguments, concessions, and rebuttals changed.
4. Repeat runs before drawing conclusions about a personality setting.

Model output variability limits causal conclusions from a single comparison. Save the full starting configuration, provider/model identity, rule version, and transcript for each run. Identical settings do not guarantee identical LLM output.

Qualitative review asks whether speakers retain assigned positions, show distinguishable styles, address opposing claims, contribute different arguments, and acknowledge tradeoffs. Do not label these qualities quantitatively measured unless a separate evaluator and validation method are implemented.

## 10. Evidence and optional judging

The first version has no live research or citation retrieval. Agents may reason from supplied background material and must not invent verifiable citations. Mark factual claims as unverified unless grounded in an explicit source resource. Later evidence resources should have stable source IDs and allowed citation references validated by the application.

A judge is an optional later agent with a separate objective and rubric. Suggested dimensions are argument relevance, engagement, internal coherence, and use of supplied evidence. Show explanations and rubric limits. A judge's scores are model judgments, not an objective truth or proof that one policy is correct. Judge calls require their own turn/budget accounting.

## 11. First-release acceptance

The concept is implemented only when:

- A normal shared recipe creates six independent editable agents and the debate session.
- Actual configured Apertus generates speeches through the generic agent runner.
- The application completes the declared eighteen-turn protocol in legal order.
- Rebuttal references are valid and navigate to accepted opposing messages.
- Private notes stay outside other agents' contexts and public transcript exports.
- Next turn and autoplay share execution semantics; extra views trigger no inference.
- Pause, failure, retry, restart, stale responses, and duplicate requests preserve turn integrity.
- Recipe save/reopen preserves starting setup; run resume restores accepted history under the documented persistence contract.
- Replay makes no model calls; rerun creates a fresh run identity.
- Live evidence records actual model identity, latency, failures, and observed persona/engagement quality without claiming deterministic behavior.

Scripted model tests prove protocol and recovery correctness. Live Apertus tests establish service availability and observed quality. Both are required and their evidence must be distinguishable.

## 12. Subsequent concepts

Once the complete debate works, consider evidence-grounded debates, human participation, team-private preparation, cross-examination, alternative speaking orders, optional judging, and mixed-model comparisons. Reuse the same agent foundation for negotiation or committee simulations before expanding abstractions based only on imagined requirements.
