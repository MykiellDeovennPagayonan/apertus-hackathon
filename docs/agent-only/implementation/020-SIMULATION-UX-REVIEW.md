# 020 — Simulation control and layout UX review

Date: 2026-10-09

## Scope and design decisions

The five exact prompts remain those in [019](019-REALISTIC-PROMPT-COMPOSITION-WITH-LAYA-AND-APERTUS.md). Laya selects a supported strategy; Apertus composes catalog components; the shared runtime owns calculations, clocks and persistence. These changes apply to shared controls, appearances and arrangement, rather than five separate experiment applications. The review follows [builder philosophy](../design/001-EXPERIMENT-BUILDER-DESIGN-PHILOSOPHY.md), [component philosophy](../design/002-COMPONENT-DESIGN-PHILOSOPHY.md) and [simulation philosophy](../design/003-SIMULATION-DESIGN-PHILOSOPHY.md).

- Playback is a direct Play/Pause button with a visible state and keyboard operation, regardless of the originally authored widget. It never requires checking a box and then applying it.
- Supported absolute exploration parameters respond immediately to sliders. Numeric text stays local until Enter or blur; Escape restores the accepted value. Invalid and incomplete text does not alter the model. Explicit actions and submitted activity forms retain their command semantics.
- Generated arrangement puts playback first, controls next to the scene, and observations beneath it. Controls for two connected signal sources form paired columns. Scene bounds match their registered appearance. A scalar string inspector uses compact status dimensions; structured inspectors retain space for data.
- Controls have 48 px minimum hit targets and visible focus. Labels, units and short explanations describe what changing a parameter does. Related enum choices can be segmented native radios.

## Review findings by experiment

| Experiment | Defect and resulting behavior |
| --- | --- |
| Pendulum | Automatic normalization made every rod look equally long. Drawing scale now stays fixed as length changes, with a metre ruler, starting swing arc and explicit local zoom. The 17.4 m rod measures 3.48 times the 5 m rod in the actual SVG screen coordinates. Fresh default is 5 m, 30°; saved explicit values remain intact. |
| Traffic | Anonymous rectangular blocks did not read as cars. Vehicles now follow the road orientation and show windows, tyres and brake lights. A marked car 1 matches “Brake car 1”; the following-gap control explains closer following. |
| Circuit | An opaque topology selector becomes Series/Parallel radio choices. Per-bulb power is explicitly labeled as a brightness proxy; topology and bulb-count changes update through the existing model. |
| Eclipse | Removed the unrelated colored card background and corrected SVG/container bounds. Sun, Earth, Moon and orbit are legible. Moon position, alignment offset and distance controls explain their geometry. The eclipse status no longer sits in a large empty inspector. |
| Sound | Phase, amplitude and frequency controls pair by source beside the plot. The source curves and sum remain readable. Cancellation and reinforcement have numerical residual checks; negligible nonzero rounding residue is displayed as “≈ 0” with the calculated value retained in a tooltip; numeric editing does not regenerate the signal on each keystroke. |

The original 10° limit followed the original small-angle approximation. Supporting 90° requires changing the physics as well as the slider. The existing pendulum provider now uses nonlinear ideal rigid-rod motion with `T = 4 K(sin(A/2)) sqrt(L/g)` and an absolute-time trajectory, following [NIST DLMF 22.19](https://dlmf.nist.gov/22.19). Independent quadrature and RK4 checks cover 0°, 5°, 30°, 60° and 90°, plus frame-rate invariance. Public identifiers remain compatible; numeric predictions for existing nonzero angles are refined. The compatibility identifier `SmallAnglePendulumSystem` is retained, while fidelity text describes the current nonlinear model.

## Evidence and limits

The screenshot gallery is [visual-review.html](019-validation/replay-2026-10-09T12-12-51-866Z/visual-review.html). It contains actual Playwright captures, native editable recipe files and numerical evidence. No screenshots are fabricated.

The retained graphs came from the original 25/25 real-model acceptance run. The UX replay changes presentation metadata only and asserts that nodes and connections remain identical. It is separate from fresh inference evidence. Earlier clipping failures and interrupted runs remain under their original unique evidence directories. The live runner now waits for the client shell effect before entering the prompt, preventing SSR typing from being cleared during hydration. An earlier run retained a missing-response timeout and a navigation-response-body failure; these are not counted as accepted model runs. The live runner also observes a clone of the real fetch response, preserving JSON or NDJSON bodies across lesson navigation without intercepting or replacing generation. This accommodates generation-progress changes made concurrently in the shared workspace. Next.js GET route prefetch cancellations (`_rsc`, `rsc: 1`, `net::ERR_ABORTED`) are retained separately as navigation cancellations; API, document and asset failures still fail the browser gate.

The review covers desktop at 1440×900, 1280×720 and 1920×1080, including both motion preferences, keyboard playback, valid and invalid numeric drafts, domain effects, reload and native export/import. It does not certify mobile layouts, authenticated database persistence or usability with actual students. Existing saved board positions are preserved; use the re-arranged native recipes in the gallery to review the compact opening layout.

Validation: final native-graph replay **10/10 passed**, with no browser errors, console errors or failed requests. Shared control-editor browser regression, TypeScript, full `pnpm test`, scoped Biome and production webpack build passed. The 43 built-in recipe markup fixtures were deliberately refreshed for the shared UI changes; command contracts and independent numerical oracles continue to pass.

Fresh live probe: **5/5 passed** in [2026-10-09T12-18-35-599Z](019-validation/2026-10-09T12-18-35-599Z/report.json), one independent generation of each exact prompt through the ordinary UI. Every case records accepted real Laya selection, actual Apertus authoring, domain interactions, desktop geometry, keyboard/numeric control checks and native export/import. This is a five-case probe, not a new 25-attempt acceptance batch. Browser, console and failed-request checks were clean. The complete test suite and production build also passed against the current shared workspace.

Fresh probe repair accounting: pendulum used one composition repair, traffic/circuit/eclipse used none, and sound used two. Result latencies were approximately 116 s, 63 s, 52 s, 53 s and 131 s respectively. All five final results and interactions passed; repairs are not reported as first-pass success.
