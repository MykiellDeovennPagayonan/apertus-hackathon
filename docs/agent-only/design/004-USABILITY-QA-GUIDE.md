# Usability QA: understandable controls and first-use clarity

Date: 2026-10-09  
Scope: experiment builder flows, shared components, and learner-facing simulations.

This guide turns the existing design principles into a repeatable usability review. Read it alongside:

- [Experiment builder design philosophy](001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md).
- [Component design philosophy](002-COMPONENT-DESIGN-PHILOSOPHY.md).
- [Simulation design philosophy](003-SIMULATION-DESIGN-PHILOSOPHY.md).

Those documents explain the intended design. This guide defines how to inspect the resulting experience and record evidence. It does not claim that existing interfaces have passed usability testing.

## 1. Define “intuitive” through observable behavior

An intuitive interface lets its intended audience recognize the next useful action, anticipate its effect, operate it, understand the result, and recover from a mistake with little assistance.

Assess a specific audience performing a specific task. A learner exploring a premade and an author connecting components have different expectations. Do not assume familiarity with the implementation, component IDs, or internal terminology.

Minimal instructions means ordinary controls explain themselves through familiar labels, placement, appearance, and feedback. Scientific concepts, unfamiliar activities, and consequential actions may still need concise guidance. Removing useful labels or units does not make an interface simpler.

| Check | Observable question |
| --- | --- |
| Discoverability | Can someone find the primary control without being told where it is? |
| Understanding | Can they explain what it changes before using it? |
| Predictability | Does its behavior match its label and appearance? |
| Feedback | Can they tell what changed and whether the action succeeded? |
| Recovery | Can they correct a mistake without losing unrelated work? |
| Ease of operation | Can they complete the task with their input method and viewport? |

## 2. Establish the review scenario

Before reviewing, record:

- Audience and assumed subject knowledge or product experience.
- An outcome-only task, without naming the controls or prescribing clicks.
- Route, starting state, and representative content or recipe.
- Relevant host: learner view, builder Build surface, Connections, settings, or Try lesson.
- Viewport and input method.
- Expected observable outcome.

For example: “Change the gas volume and describe what happens to pressure.” Avoid “Drag the Volume slider left and read the Pressure card,” which supplies the interaction the review should evaluate.

Use real labels, values, connected components, and realistic content lengths. An empty placeholder rarely exposes the same problems as an authored experiment.

## 3. Review the opening interface before operating it

Inspect what the interface itself communicates before consulting implementation details or a scripted click sequence.

Ask:

- What is this activity or surface for?
- What is the next useful action?
- Which elements accept input, and which show observed results?
- What will the primary control change?
- Where will its effect appear?
- Which controls change the model, the scene camera, or the workspace?

Record unclear answers as concerns rather than resolving them through source-code knowledge. In an agent review, these are inferred usability concerns; they are not observations of a first-time human user.

Essential interactions should be discoverable without hover. Icon-only actions need accessible names and an understandable visual cue; essential meaning should not depend solely on a tooltip. Supporting guidance should appear near the decision it explains.

## 4. Exercise the actual task

Complete the task in the running interface. Assess the transition from initial state through action, feedback, and recovery.

| Area | Review criteria |
| --- | --- |
| Primary action | The main interaction is visible and receives appropriate emphasis. Optional configuration does not obstruct the common path. |
| Labels and meaning | Wording describes the affected quantity or action in familiar language. Values, units, and useful limits are close to their control. |
| Input versus output | Editable values look operable. Measurements do not imply editing when it is unsupported. |
| Interaction cost | The task avoids unnecessary scrolling, mode changes, repeated entry, and precise pointer positioning. |
| Feedback and state | Accepted values, model state, scenes, and readouts agree. Selection, focus, disabled, loading, and error states are distinguishable where relevant. |
| Submission | Live changes and explicit submission behave consistently with visible cues. Draft text is distinguishable from accepted state when necessary. |
| Recovery | Invalid input gives a useful explanation and correction path. Cancel, undo, and reset have understandable scopes. Relevant drafts and unrelated work are preserved. |
| Layout | Controls remain readable and reachable. Floating tools do not cover essential content. Control and effect remain visibly associated. |
| Input methods | Essential actions work with keyboard and pointer, and touch where supported. Important drag interactions have an alternative. Focus is visible and returns sensibly after dialogs close. |
| Responsive behavior | Narrow and short viewports and zoom or text scaling retain the task. Board scaling does not make controls too small to operate. |
| Host consistency | Shared controls retain their meaning and usable presentation in learner and builder hosts. |

Exercise relevant alternate states: empty results, invalid or incomplete input, disabled actions, long labels, changed values, and recovery after a wrong choice. Mark inapplicable states explicitly rather than inventing requirements for every surface.

For simulations, check that the scene makes the relationship legible. A changing number alone may not establish that someone can connect the input to its physical effect.

For authoring changes, verify that the operation produces the promised document state and can be undone where applicable. For simulations affected by save, remix, or Try lesson, exercise those routes and operate the resulting experiment; a successful navigation is insufficient evidence.

## 5. Observe first-time use when possible

An agent or expert review can identify likely confusion. Functional tests can verify behavior. To assess whether intended users understand the interface, observe someone unfamiliar with it attempting the outcome-only task.

Let the participant use the interface without a walkthrough. Record their first action, hesitation, wrong choices, requests for help, task outcome, and any assistance given. Ask neutral questions such as “What do you expect this to change?” Avoid suggesting the right control.

If the participant becomes stuck, record the point of failure before providing help. Completion after coaching is assisted completion, not independent success.

Keep observations separate from interpretation. “Opened Settings to look for volume” is an observation; “the main control lacks prominence” is a possible explanation to investigate.

Do not impose an arbitrary universal time limit. If timing matters, set a task-specific target before the review and explain its basis. A successful session is evidence for that participant and scenario, not proof of usability for everyone.

## 6. Record findings with evidence

Use these statuses for each check:

- **Pass:** the reviewed scenario meets the criterion, with supporting evidence.
- **Concern:** likely ambiguity or friction requiring investigation.
- **Fail:** observed behavior or task outcome contradicts the criterion.
- **Not tested:** evidence is missing; state what remains to be checked.

For each finding, record:

```md
### [Short description]

- Check and status:
- Location, host, and starting state:
- Task, viewport, and input method:
- Observed cue or behavior:
- Likely user misunderstanding or task impact:
- Reproduction steps:
- Evidence: [capture, recording, participant observation, or interaction result]
- Severity: [blocking / major / minor]
- Smallest useful improvement:
- Verification after the improvement:
```

Severity reflects task impact. Blocking prevents the essential task or causes unrecoverable loss. Major requires assistance or a substantial workaround, or creates a misleading result. Minor adds friction while the task remains independently achievable.

Screenshots support claims about appearance. Interaction evidence supports claims about behavior. Participant observations support claims about user understanding. Identify which kind of evidence supports each finding.

Prioritize changes to labels, hierarchy, grouping, affordances, and behavior when they address the cause. Add instructions when explanation is necessary for the task; do not default to a tutorial for an ambiguous control.

## 7. Completion and review limits

A usability review is ready to report when:

- The audience, task, starting state, and test conditions are recorded.
- The opening view and complete interaction have been examined.
- Relevant recovery paths and alternate states have been exercised.
- Each criterion has a status and evidence or a stated testing gap.
- Blocking and major findings have a clear disposition.
- Fixes claimed as resolved have been checked in the original scenario.
- Remaining uncertainty and the need for participant testing are explicit.

Do not average away a blocking failure with passing checks elsewhere. An unresolved blocker means the affected task is not ready. Record concerns and testing gaps honestly rather than calling the interface “intuitive” without evidence.

Passing lint, type checks, browser assertions, or screenshot inspection alone does not establish first-use understanding. Use these checks alongside usability review and participant observation where available.

## 8. Reusable QA prompt

Copy this prompt and fill in the scenario. It requests a review; implementation of fixes should follow the scope authorized for the task.

```text
Review [surface or flow] using docs/agent-only/design/004-USABILITY-QA-GUIDE.md
and the linked design philosophies 001, 002, and 003.

Audience: [first-time learner / first-time author; assumed knowledge]
Task: [desired outcome without naming controls or prescribing clicks]
Starting state: [route and representative content or recipe]
Hosts: [learner / Build / Connections / settings / Try lesson]
Conditions: [viewports and input methods]
Expected outcome: [observable result]

Assess the opening interface before consulting implementation details.
Use the running interface to complete the task and exercise relevant
alternate states and recovery paths. If runtime access is unavailable,
state that limitation and mark dependent checks Not tested.

Check:
1. Is the purpose and primary action apparent?
2. Can users distinguish editable inputs, observed outputs, and navigation?
3. Do labels explain what controls change, including units and reset scope?
4. Are essential interactions discoverable without hover or hidden instructions?
5. Does each action provide clear feedback matching accepted state?
6. Are mistakes, invalid input, and empty states understandable and recoverable?
7. Does the task remain usable on narrow and short screens and with keyboard input?
8. Are control and effect visibly associated, including the scene where relevant?
9. Are extra controls or instructions compensating for an unclear interaction?
10. Do relevant builder, learner, save, remix, and Try lesson flows preserve meaning
    and behavior?

Mark each check Pass, Concern, Fail, or Not tested. For each finding, provide
location and starting state, the observed cue or behavior, likely task impact,
reproduction steps, evidence, severity, and the smallest useful improvement.

Separate observed behavior from inferred usability concerns. Do not claim
first-time user understanding unless participant observations support it.
Do not treat a polished screenshot or passing functional test as proof of usability.

Report the most consequential findings first, then coverage and remaining gaps.
```
