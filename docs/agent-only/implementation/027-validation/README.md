# Earth and atmosphere implementation and verification

This directory accompanies [implementation plan 027](../027-EARTH-AND-ATMOSPHERE-SIMULATIONS-PLAN.md). All seven topics are implemented as public, independent models, scenes, contextual action components and captions. They use the shared recipe runtime, component catalog, builder, native recipe format and planner.

## Try the lessons

| Topic | Experiment query | Presentation |
| --- | --- | --- |
| Earthquakes | `earthquake-formation` | 3D fault blocks, preset cameras, 2D explanation/fallback |
| Tsunami | `tsunami-formation` | 2D offshore-to-coast section |
| Atmospheric layers and ozone | `atmosphere-ozone` | 2D altitude explorer and UV investigation |
| Greenhouse effect | `greenhouse-effect` | 2D sunlight/infrared energy paths |
| Lightning | `lightning-formation` | 2D cloud charge and channel stages |
| Rainbow | `rainbow-formation` | 3D observer geometry, 2D droplet optics and fallback |
| Weather | `weather-formation` | 2D coastal, mountain and frontal parcel lifting |

Open `/experiments?experiment=<query>` on the running application, or find each lesson in the public catalog. The validation server uses `http://127.0.0.1:43115`; its services remain the existing local Apertus on 43101 and Laya on 43102. No provider credentials are stored in this evidence.

## Evidence and numbering

- [Actual generated lesson review](review-generated.html): the seven final short-prompt generations.
- [Final coverage](COVERAGE.md): completed checks and the remaining 91-request acceptance gap.
- [Run index](INDEX.md): every attempt, including failures and interrupted development runs.
- [Screenshot progress](SCREENSHOTS.md): numbered opening, mechanism, condition, builder and viewport screenshots.
- [Review gallery](gallery.html): side-by-side linked captures, with run numbers.
- `runs/NNN/manifest.json`: exact prompt, run kind, source fingerprint, outcome, provider correlation and screenshot names.
- Live runs retain actual request/response/diagnostics and browser traces. API diagnostics and premade replays do **not** count as fresh ordinary-UI inference.

Screenshots are local artifacts under git-ignored `runs/`; the index and gallery are tracked documentation. Keep this directory with its run artifacts when sharing the visual evidence. A capture alone is not a visual review. See the final report for directly inspected screenshots and unresolved findings.

Raw `live-*.json` exports and `checks/` logs are also git-ignored. Keep the Markdown reports, `completion.json`, and HTML review pages in version control. Their links to screenshots and detailed evidence require the local run artifacts or a separate evidence archive; Git alone does not include those artifacts.

For cleanup, archive the complete validation directory before removing historical runs. Runs 656–669 contain the final generation and generated-builder checks, and runs 335–355 contain the selected premade, recovery, and builder checks. Other runs are referenced by the reports and record failures and earlier progress. Deleting them will break those evidence links. Run allocation uses the highest existing numeric folder, so retain run 669 to continue numbering at 670; removing every run would restart numbering at 001.

## Running verification

From `src/web`:

```sh
pnpm test:earth-atmosphere
pnpm test:earth-atmosphere:browser
pnpm test:earth-atmosphere:builder
pnpm test:earth-atmosphere:recovery
pnpm test:earth-atmosphere:live-ui
EARTH_LIVE_FOLLOWUPS=true pnpm test:earth-atmosphere:live-ui
pnpm test:earth-atmosphere:acceptance
pnpm test:earth-atmosphere:boundaries
EARTH_BUILDER_GENERATED=true pnpm test:earth-atmosphere:builder
```

`UX_TEST_URL` changes the local application origin. `EARTH_CASE=rainbow` (or another kind) narrows development runs. The acceptance command freezes the complete web source fingerprint and submits 91 supported requests: 35 primary generations, 28 paraphrases/informal generations, and 28 contextual follow-ups. It stops on source changes. Runs are sequential against shared inference. Failed attempts stay in the denominator; retries get higher run numbers.

Enable `NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS=true` on the verification server for read-only learner and builder snapshots. Strict verification also uses `COMPOSITION_DECISION_POLICY=required-laya`, `DECISION_PROVIDER=laya`, `LLM_PROVIDER=apertus`, `PLANNER_DIAGNOSTICS=true`, the actual local service URLs and a suitable decision timeout. These flags enable evidence collection; they do not replace inference.

Laya validates topic selection. Apertus authors components and selects typed runtime commands for active-topic follow-ups. For a direct runtime follow-up, the existing shared command path preserves unrelated state. If a follow-up reuses its verified parent's Laya capability without a new selection, its manifest identifies that provenance explicitly; it never invents a Laya call.

## Fidelity and storage

The scenes teach causal relationships, rather than forecasting earthquakes, tsunami inundation, lightning strikes or future weather. Captions and quiet scene notes state the relevant approximations. Greenhouse energy integration, geometric droplet optics, offshore wave speed, charge accounting and parcel water accounting have numerical/analytical checks. Seismic rupture, channel shapes, coastal arrival, circulation and precipitation growth include prescribed teaching stages.

Builder runs exercise independent component editing, invalid configuration rejection, presentation-only edits, Undo/Redo, guest save/reload, Try lesson and native download/import. Authenticated account persistence and first-time participant testing require separate evidence and must not be inferred from guest storage or agent inspection.
