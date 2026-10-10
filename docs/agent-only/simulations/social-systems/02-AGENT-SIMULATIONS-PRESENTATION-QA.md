# Debate and city conversation: presentation QA

Date: 2026-10-10. Review follows design philosophies 001–003 and [Usability QA guide](../../design/004-USABILITY-QA-GUIDE.md). This supersedes the earlier debate visual review, which incorrectly treated a sparse transcript and repetitive cards as satisfactory.

## Scenarios and evidence

Audience: first-time secondary-school learners, with no knowledge of component IDs or agent infrastructure. Author scenario assumes familiarity with ordinary settings, not this component graph.

Outcome-only learner tasks: compare two arguments on the school-work motion and revisit one that matters; discover how the two city speakers approach making daily travel easier; learn what distinguishes a participant's personality. Author task: keep the activity usable after making a personal copy and reopening it.

Routes: `/experiments?experiment=debate` and `/experiments?experiment=agent-conversation`. Starting state: actual premade recipes, with six and two fictional participants respectively, no accepted responses. Hosts: learner, builder Build, saved/reopened copy and Try lesson. Conditions: Chromium, 1440×1000 desktop, 1280×720 short desktop, 1024×540 compact desktop, 390×844 phone; mouse and keyboard; reduced motion requested. Phone coverage uses pointer input and target measurements, not a physical touch device. Actual application views render realistic-length scripted speech through the production runner; model HTTP is intercepted. No live provider calls.

Reproduce from `src/web` with the app running on port 43100:

```sh
npm run test:agents:presentation
```

The harness saves `/tmp/apertus-{debate,agent-conversation}-redesign-{opening,compact-opening,compact-zoomed,details-opening,short-opening,personality,mobile-opening,speaking,speaking-hover,failure,speech,mobile-speech,complete,mobile-restart,build,try-lesson}.png`. Inspect these captures as well as the assertions. Screenshot files are temporary. The agent inspected both opening views, accepted speech, phone speech, short desktop and Try lesson views; no human participant observations were collected.

## Findings and corrections

### Empty slab and repetitive profile cards

- Check: hierarchy and engagement; original **Fail** against the user's requested presentation, corrected in the reviewed screenshots.
- Location/task: both learner openings, desktop; understand the activity and begin comparing perspectives.
- Observation: the old transcript occupied a tall blank card; six separate text cards repeated labels and exposed profile details before a speech existed. The user rejected the appearance. First-time learner confusion was not observed directly.
- Impact/severity: major presentation defect; the content did not give the requested visual invitation to explore.
- Improvement: illustrated named characters flank one question and speech stage; visible “Meet this speaker” buttons reveal personality on demand. Supporting details are collapsed. Next and Autoplay receive emphasis; restart/resume/replay move to More options.
- Verification: opening and personality captures for both recipes; modal opening, Escape and focus return asserted. No hover is required to discover the profile action.

### Phone opening concealed the main action

- Check: responsive discoverability; **Fail** observed during redesign, corrected.
- Location/task: 390×844 learner opening; begin the activity.
- Observation/reproduction: putting the full question stage before controls placed Next below the opening viewport and near floating workspace utilities.
- Impact/severity: major; beginning required scrolling before any interaction.
- Improvement: authored responsive rows place transport controls first; a validated 16px row gap removes unnecessary spacing. Desktop also places controls above the speech stage.
- Verification: both phone captures and bounds assertions show Next above workspace controls with at least a 44px target. Short desktop is separately checked. Other recipes keep their existing default gaps.

### Inherited portrait and builder styles damaged the scene

- Check: layout and host consistency; **Fail** observed during screenshot review, corrected.
- Location/task: accepted learner speech and saved copy in Try lesson; read and revisit an argument.
- Observation: a speaker SVG stretched across its row; builder form styling restored bordered profile buttons, changed typography and added padding that reduced text width. Immediate captures also preceded responsive measurement settling.
- Impact/severity: major; speaker identity could overflow, and a host could show clipped or overlapping content.
- Improvement: explicit SVG bounds; shared component selectors preserve portrait buttons, heading hierarchy and primary emphasis across hosts; redundant board padding removed. Profile rows have actual separation. Captures wait for accepted transcript content to fit its measured host.
- Verification: avatar width and speaker row overflow asserted; Try lesson portrait borders/background and transcript containment asserted. Build and Try lesson captures checked. The fix lives in shared views and recipe geometry, not a separate premade page.

### Information expansion and disappearing transport

- Check: reading hierarchy and camera stability; **Fail** in the user's screenshots, corrected.
- Location: learner debate, opened About and Run information; short desktop with enlarged board.
- Observation: information expanded the canvas and the automatic opening fit shrank text. With the transport below the stage, enlarging the board placed Next and Autoplay outside the viewport. The earlier review missed these states.
- Improvement: supporting information moved to a separate modal opened from More options, including public export and recorded history. Closed dialogs take no scene space. Opening camera fit now uses authored bounds, rather than growing accepted-content bounds. Transport moved above the stage; unused initial stage height reduced.
- Verification: Playwright compares the actual transform scale before and after accepting speech, opening details, expanding the full transcript and inspecting at a manually chosen zoom. Stage geometry remains identical during modal inspection. Escape returns focus to More options. Compact 1024×540 target bounds and zoomed capture verify Next remains visible. Both simulations, remix/save and Try lesson are exercised with scripted responses.

### Active-speaker ring clipped at the top

- Check: active-state graphics; **Fail** in the user's screenshot, corrected.
- Observation: the speaking indicator was an outer CSS outline with a positive offset. The portrait begins at its canvas item's top boundary, so the item's clip removed the outline's upper arc. Hover also moved the portrait upward.
- Improvement: the indicator is now a final SVG circle drawn inside the 120×120 viewBox (radius 57, stroke width 3), above the artwork. Hover scales inward instead of translating upward. The full circle and its stroke stay inside the portrait bounds.
- Verification: the browser harness holds a scripted response pending to inspect the actual speaking state. It waits for the indicator to appear, asserts ring/portrait/item bounds, and captures both speaking and hovered states for each simulation. Opening-state inspection alone does not cover this defect.

## Review matrix

| Check | Status | Evidence and limits |
| --- | --- | --- |
| Purpose and primary action | Pass in agent inspection | Prominent question, illustrative opening and emphasized Next; desktop, short and phone captures. First-time understanding is not established. |
| Inputs, observations and navigation | Pass in reviewed task | Named profile buttons inspect; Next requests new speech; Back/Forward revisit accepted speech. Browser asserts history navigation makes no inference calls. |
| Labels and scope | Pass in reviewed task | For/Against badges, named current speaker, round and count; restart/resume/replay remain explicitly named in More options. No unsupported personality taxonomy is invented. |
| Discoverability without hover | Pass in agent inspection | Persistent Meet labels and ordinary labelled buttons; advanced settings do not compete with the main path. |
| Feedback and accepted state | Pass | Empty, loading, failure/retry, paused and completed states exercised. Failed inference produces no bubble; retry accepts one speech. Counts reach 18 and 8. |
| Recovery | Pass | Retry, pause, restart, prior debate run inspection, server resume and recorded replay exercised; private notes absent from public download. |
| Narrow/short layout and keyboard | Pass for reviewed conditions | Primary bounds, keyboard Enter, modal Escape/focus return, normal phone scrolling for long speeches. Full accessibility audit, physical touch and text zoom: Not tested. |
| Control/effect association | Pass in agent inspection | Transport is above the stage in both desktop and phone layouts. Portraits below the phone stage require scrolling. |
| Excess controls/instructions | Pass in agent inspection | Three opening transport choices; context, full transcript and run information open separately through More options. Learning context remains available. |
| Builder, save, remix and Try lesson | Pass for tested flow | Actual copy saved/reopened, Build rendered, Try lesson produced an accepted speech. Independent profile, transcript and control canvas items retained. |
| Learning engagement and first-time comprehension | Not tested with participants | Illustration and simpler hierarchy address the user's request; no attention, retention or independent task success claim is made. |
| Live argument quality | Not tested | Scripted browser evidence cannot establish Apertus personality fidelity, persuasive quality, factual correctness or meaningful rebuttals. |

Remaining concern: very long desktop speeches scroll within the bubble; this needs observation with learners and realistic live outputs. Phone speech uses normal board scrolling. The shared workspace prompt and Find content utilities remain visible; the primary action is clear in reviewed openings, but their distraction and behaviour under text scaling need participant and accessibility follow-up. There are no unresolved blocking findings in the tested scenarios.
