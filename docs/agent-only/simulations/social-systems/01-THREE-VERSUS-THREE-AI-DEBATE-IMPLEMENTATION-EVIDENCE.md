# Three-versus-three debate: implementation and evidence

Date: 2026-10-10

The shared recipe at `src/web/src/simulations/pre-made/debate/recipe.json` opens through `/experiments?experiment=debate`. Six `models/AIAgent` instances feed one `models/DebateSession`. Six profile displays, a transcript, and bound controls remain separate canvas items in learner, Build, and Try lesson hosts. The generic runner, configured provider adapter, and existing repositories own execution; the presentation does not create another debate.

## Engineering boundaries

- `components/systems/debate/protocol.ts` owns rules, configuration validation, and the eighteen-slot order. Team membership determines each side's seats in connection order. The rebuttal round reverses which side speaks first.
- `components/systems/debate/environment.ts` supplies round instructions and permitted public observations, and rejects wrong actors, non-speech actions, invalid references, missing opposing rebuttal references, and speech-length violations.
- `runtime/agents/scenarios.ts` admits supported scenario adapters. The generic runner has no debate-specific scheduling or acceptance branches.
- Shared proposal validation runs inside the provider's existing bounded repair loop and again before an accepted transition. There is no invented fallback speech or automatic provider switch.
- Profiles separately author persona, expertise, communication style, objective, and optional team. A debate requires three agents on each side. Swapping sides preserves the remaining profile. Authored edits create a new generation and retain the previous public transcript; presentation-only changes preserve execution.
- Starting motion, scope, all profiles, speech range, output-token reserve, sequential visibility, schema/rule version, and configured model identity are frozen in each run. Public receipts record actual model identity, duration, and known/unknown token usage, including failed attempts.
- Transcript references navigate to accepted messages in the same view. Round/team labels derive from frozen configuration and protocol version. Counts are observations, not quality scores.

## Acceptance and storage

The existing bounded run aggregate stores configuration, events, memories, plans, reservations, revisions, action receipts, and attempt receipts together. MongoDB writes use one conditional aggregate replacement with majority write concern. Inference runs outside the write. Revision and fencing checks prevent competing or expired workers from accepting stale results. Failed storage does not advance authoritative history. Existing foundation tests cover competing writes, lease reclamation, cancellation, and storage failure.

Guest mode is process-local, expires after one hour without activity, and loses runs on server restart. It has no durability guarantee. Authenticated mode uses the existing account-owned MongoDB repository. A real database integration test was not run for this change; the deployment's MongoDB availability and durability configuration still need operational verification.

`Resume saved run` reads the authoritative server snapshot, without inference. The browser tab retains a bearer handle keyed to the exact node identity and starting setup; it does not store private memory or establish acceptance. Browser storage can be unavailable, and a closed tab can lose its handle. Resume requires the same account or guest capability and an unexpired server run. This is a bounded HTTP runner with a 125-second reservation lease, not a durable background worker.

Pause stops subsequent turns; reserved work may finish. Retry keeps the same logical turn identity while recording a new attempt. Restart creates a new browser generation and a fresh server run on the next speech. Old results cannot enter that generation. The current workspace retains the ten most recent previous public transcripts; download transcripts for comparisons that must survive closing the workspace. Replay reveals recorded events and performs no inference.

## Deterministic and browser verification

Run from `src/web`:

```sh
npm test
npm run test:debate
npm run test:agents:presentation
npx tsc --noEmit
npm run build -- --webpack
```

Scripted tests verify the exact eighteen-speaker order, completion, reference legality, bounds, private-note isolation, immutable accepted history, failed-turn retry, duplicate submissions, pause/autoplay, replay, retained history, restarted identities, stale results, configuration edits, side swaps, and server snapshot resume. They exercise the actual generic runner and repositories, rather than a second implementation of the protocol.

The shared browser harness (`scripts/agents/verify-presentation-browser.cjs`) intercepts only agent HTTP requests and supplies a scripted model through the actual runner. It exercises both debate and city conversation: illustrated opening, clickable personality inspection, dialog focus recovery, keyboard failure/retry, pause/autoplay, full completion, backward/forward browsing without inference, public references, private-note-free download, reload/resume, replay, restart, Remix, Build, Save/reopen and an actual response in Try lesson. Captures include desktop, short desktop and phone layouts. This is functional evidence with scripted speeches, not live-model evidence.

Local captures are `/tmp/apertus-{debate,agent-conversation}-redesign-{opening,compact-opening,compact-zoomed,details-opening,short-opening,personality,mobile-opening,failure,speech,mobile-speech,complete,mobile-restart,build,try-lesson}.png`. These are ephemeral review artifacts, not versioned product assets.

The default Turbopack production build stalled during the earlier implementation and was stopped. The webpack production build completed successfully, including TypeScript, prerendering and build traces.

## Usability review

The initial visual review was too generous: the user rejected the empty transcript slab and repetitive profile cards. Its earlier usability Pass judgments are superseded by [the joint debate and city presentation review](02-AGENT-SIMULATIONS-PRESENTATION-QA.md). The redesign uses shared illustrated portraits, personality dialogs, one readable speech bubble, Back/Forward history navigation, and quiet advanced controls and a separate supporting-information dialog. Profiles, transcript and controls remain independent authorable components.

The current review separates screenshot inspection, scripted interaction evidence and untested first-time learner understanding. It records the audience, tasks, viewports, input conditions, observed defects and verification after correction. It does not claim that passing browser assertions proves usability.

## Live release gate

`npm run test:debate:live` is ready to exercise all eighteen speeches through the real application API and configured Apertus provider. It saves public configuration, attempt timing/status, failures, and transcript to `/tmp/apertus-debate-live.json` (or `DEBATE_EVIDENCE_PATH`). It requires Apertus and never silently switches providers. Review retained stance, distinct styles/contributions, opposing engagement, tradeoffs, and unsupported factual claims qualitatively after execution. A reference passing validation does not prove meaningful engagement.

Automatic approval review rejected execution because the configured model destination was unverified and the test would send the debate setup and invoke live inference without explicit approval for those effects. No live calls were made as part of this implementation. Live Apertus availability, latency, output reliability, and persona/engagement quality remain Not tested; the concept's full first-release gate is therefore still open.
