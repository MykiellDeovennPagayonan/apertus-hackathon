# Seven Earth and atmosphere lessons — implementation and verification

All seven topics are implemented. The time-limited final check completed on 2026-10-11: seven actual primary generations and seven generated-recipe builder checks passed. The full 91-request acceptance suite remains incomplete.

## What shipped in the workspace

| Lesson | Presentation | Main investigation |
| --- | --- | --- |
| Earthquakes | 3D fault blocks with 2D explanation/fallback | Slow loading, frictional locking, rupture, waves and lasting offset; sideways, normal and reverse slip |
| Tsunami | 2D deep-ocean-to-coast section | Seabed displacement, long-wave propagation, shoaling and successive arrivals; vary depth |
| Atmospheric layers and ozone | 2D altitude explorer and UV view | Five thermal layers, ozone-rich stratosphere, differing UV paths; reduce ozone |
| Greenhouse effect | 2D energy-path scene | Fixed sunlight, infrared absorption and emission, energy imbalance and warming toward equilibrium |
| Lightning | 2D storm-cloud sequence | Ice/graupel charging, leader, connection, return stroke and sound delay; intracloud variant |
| Rainbows | 3D Sun/rain/observer geometry with 2D droplet optics | Refraction, partial internal reflection, dispersion, observer-dependent bow and reversed secondary colors |
| Weather | 2D air-parcel investigation | Unequal heating, prescribed flow, lifting, cooling, condensation and rain; coast, mountain and front variants |

The [implementation README](README.md) lists the seven public experiment URLs and runnable verification commands. The models, appearances, contextual actions and captions are independent public components with typed wiring. The built-in recipes use the same shared runtime and native recipe format as generated and manually edited lessons.

The UX follows the four design philosophy/QA documents and [IMPORTANT.md](../IMPORTANT.md): one learning question, a dominant scene, a timely caption, and one contextual primary action. Controls appear when they help answer the question. Colors, typography and quiet explanatory notes follow the existing application. Reduced motion uses explicit stage advances. Camera changes preserve scientific state; actual WebGL failure keeps the lesson usable in 2D.

## Real inference

The verification application runs on `http://127.0.0.1:43115`. Actual local services are Apertus on 43101 (`m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4`) and Laya on 43102 (`aac6fef/laya-multilingual-mlx`). Strict Laya selection retains the existing probability/confidence gates. Apertus authors the connected recipe, or selects schema-validated commands for an active lesson.

Scientific-process selection excludes declared town geometry objects, and Earth-interior metadata names crust, mantle and cores so informal atmosphere questions remain distinct. For active Earth/atmosphere lessons, a bounded Apertus stage classifies whether a request changes conditions or changes the subject. Laya receives current-topic context only for the former. This prevents an explicitly corrected subject from being overwhelmed by the old lesson's title. Follow-up mode inference also receives the declared fidelity limits, to distinguish unsupported prediction requests from supported condition changes. The shared request context now includes each Earth/atmosphere model’s actual explored state. Command selection exposes declared setting names and their current values; relative requests use that state. Parameter-free actions use their declared empty argument schema after Apertus selects the command. A known single stage/tool JSON wrapper may be unwrapped; the contents still pass the original schema and runtime validation. A regression fixture verifies that invalid wrapped values require provider repair.

The UI submits exact learner wording, including `how do rainbows form?`, without hidden additions. Evidence observes and clones actual responses; it does not substitute provider output, import a premade recipe as a generation result, or edit runtime state to make an assertion pass. Each live attempt keeps its request ID, exact request/response, diagnostics, screenshot and browser trace.

## Verification results

The 91-request acceptance suite remains incomplete. Batches beginning at 356 and 559 were superseded after actual routing failures; evidence is retained. The user requested a 15-minute wrap-up on 2026-10-11. A time-limited ordinary-UI canary begins at run 656, with one primary prompt per topic; it is not the 35-primary / 28-alternative / 28-follow-up acceptance suite. The final canary passed **7/7** primary generations (six clean, one after bounded repair), and the actual generated recipes passed **7/7** builder/guest-persistence checks. See [exact coverage and source fingerprint](COVERAGE.md). Do not treat earlier canaries, API probes, premade browser checks or builder imports as fresh prompt acceptance.

- Final actual primary prompts: passed in runs 656–662; actual generated-recipe builder checks: passed in runs 663–669. Their correlated original recipes are preserved in each builder manifest.
- Complete regression suite: passed; [log](checks/regression.log).
- Production build: passed; [log](checks/production-build.log). Initial restricted builds failed because a Turbopack worker could not bind a local port; the task-specific cache was cleared and the build rerun with local execution permission.
- Scoped Biome checks: zero errors, two reduced-motion CSS warnings and informational style suggestions; [log](checks/scoped-biome.log).
- Seven premade lessons: browser controls, stage progression, changed conditions, responsive geometry and target reachability passed in runs 335–341.
- Seven motion/recovery checks: passed in runs 342–348. These include real `WEBGL_lose_context` for the two 3D lessons and continued 2D interaction.
- Seven premade builder checks: passed in runs 349–355. They exercise independent caption edits, invalid/valid configuration, placement/resize, Undo/Redo, guest save/reopen, Try lesson, native download and import.
- Historical strengthened boundary checkpoint: nine cases passed in runs 474–482 before the last classifier tuning; [actual outcomes](BOUNDARIES.md). Run 482 recognizes a new subject and preserves the greenhouse lesson after Laya requests clarification. This is not a successful ozone replacement.
- Earlier contextual follow-up checkpoint: fourteen passed in runs 321–334 on premade parent lessons. These verify actual command selection and effects at that checkpoint; they do not count toward fresh generated-parent acceptance.
- Direct mobile 3D checks: passed and inspected in runs 189–190. Camera changes preserve accepted model state.

The final classifier-only diagnostic checkpoint (633–649) has 13 supported responses and three unsupported forecast responses, with one timeout for the deeper-ocean question. Ordinary-UI follow-ups 650–654 subsequently passed, including that deeper-ocean request; 655 was interrupted. These are separate diagnostics, not final complete follow-up coverage. Runs 582–615 are labeled `invalid-diagnostic` because the temporary script read the wrong policy string after formatting.

## Screenshot review and progress

Open the [actual generated lesson screenshots](review-generated.html), the [selected lesson review](review-selected.html) for the seven lesson designs, or the [complete numbered gallery](gallery.html) and [run index](INDEX.md) for progress from 001 onward. Images remain locally in `runs/NNN/screenshots/`; these heavy artifacts are git-ignored. Keep the artifacts alongside this documentation when sharing it.

Directly inspected captures are recorded in each run's `visualReview` field. This includes the seven opening/mechanism scenes, mobile controls, actual 3D phone views, greenhouse surface-temperature feedback and builder component separation. Functional success alone does not constitute visual approval.

Development captures revealed blank 3D loading, a camera-blocking observer mesh, clipped rainbow geometry, controls covered by floating tools, wrapped mobile controls clipped by their panel, cut-off mobile camera notes, and an inferred ozone amount being mislabeled with a preset. Accepted values between presets now appear as their actual values, and ozone changes open the UV investigation so their consequence is visible. Those were corrected and higher-number captures retained. Earlier captures are explicitly marked as superseded visual concerns.

Run 167 exposed an incorrect topic correction: `I meant ozone, not warming` dispatched a greenhouse absorption command. Its permissive initial pass was corrected to `failed-review`; the boundary assertion and bounded topic-scope inference were then strengthened. A later batch retained failed informal routing attempts 365–366 and interrupted 368; truthful topic descriptions and scientific-process candidate scope were corrected before another freeze. The first acceptance batch was intentionally interrupted during run 176; it is not final coverage. Run 172 remains a genuine successful fresh generation from that earlier version. Runs 560–561 and 563 exposed supported actions being rejected by an overly broad fidelity guard; 564 was interrupted. The final policy distinguishes declared teaching actions from real forecasts.

## Scientific and validation limits

These are causal teaching models. Fault rupture, leader shapes, coastal arrival, circulation and precipitation growth contain prescribed stages. Offshore wave speed/shoaling, geometric droplet optics, gray-body energy integration, cloud charge accounting and parcel water budgets have numerical/analytical checks. Ozone/UV paths and atmosphere boundaries are representative. None of the lessons produces local hazard alerts, strike forecasts, earthquake predictions, operational weather forecasts or measured atmospheric CO₂ concentrations.

Authenticated account persistence and first-time participant usability testing are **not tested**. Guest storage and agent inspection do not stand in for those checks. Live-model failures, repairs and clarifications must remain visible in final counts; retries receive new run numbers.
