# Agent B physical systems handoff

## Latest continuation — 2026-10-04

Shared integration is present. The [fresh-model verification report](20261004-verification.md) supersedes the earlier “no inference” development status below: all three exact creations pass at desktop/mobile through official Playwright MCP and fresh Apertus/Laya, but ramp/circuit follow-up reliability, unsupported input outcomes, and explicit graph selection still fail. Domain metadata and mobile label/spacing fixes were made; deterministic, integrated compiler/session, TypeScript and six static layout checks pass. No qualifying integrated round or Working status is claimed. A proposed shared repair patch is prepared but unapplied pending Agent A integration or ownership reassignment. Agent C files/services/data were preserved.

## Earlier implementation handoff — historical

Date: 2026-10-03. Base HEAD: `701828e`. Domain source/test SHA-256: `458248f3587ecf5d73e219ba7a0b43f489be0ea9c89bb9279478ce7cc169b80c` (13 files, sorted repository-relative paths and contents with NUL separators). This identifies domain work, not a frozen integrated candidate.

## Status

| Prompt | Domain implementation | Normal application creation | Live qualifying rounds |
| --- | --- | --- | --- |
| PEND-001 | Implemented; development checks passed | Awaiting Agent A integration below | Not run |
| FRIC-001 | Implemented; development checks passed | Awaiting Agent A integration below | Not run |
| CIRC-001 | Implemented; development checks passed | Awaiting Agent A integration below | Not run |

Only Agent B namespaces were written. Agent C files, shared runtime/planner/view files, catalog, package scripts, services, and global styles were preserved. No full build or shared test suite was run. No Apertus or Laya requests were submitted, and no live-model provenance is claimed. Proposal after integration: **Implemented / unverified**, until normal-flow fresh-model verification passes.

## Integration requests — Agent A owns these shared edits

1. Import `physicalSystems` from `../domains/physical-systems` in `runtime/assembly.ts` and add it to `domainContributions`. Add these concrete presentation contracts **together with actual view routing**: `physical-pendulum`, `physical-track`, `physical-circuit`.
2. Route physical assemblies to `PhysicalSystemsView` exported from `components/views/physical-systems/PhysicalSystemsView.tsx`. It reads the existing assembly store, emits commands through `dispatchCommand`/`dispatchBatch`, and renders all physical instances. It owns no timer. Key the view on session identity or `resetCount` so reset clears pending input drafts and feedback. For a mixed-domain assembly, preserve other domain scenes rather than choosing a single scene solely by the first instance. Remove the shared view's default circle explanation for physical assemblies. The exported `PhysicalSystemsContent({assembly,instances})` also permits isolated rendering and future generic view routing.
3. Creation planning needs registry-derived default comparison metadata. `physicalCreationDefaults` exports comparison hints for pendulum and rolling-track providers: two lengths 1 m/2 m; two resistances 0.05/0.10. Feed these hints into both the **Laya structure choice** and **Apertus configuration instructions**. The current universal rule “Use ONE object unless the user explicitly requests independent objects” would make both canonical prompts produce one instance. Explicit user counts or a request for a single editable object should override educational comparison defaults. This is a domain-default mechanism, not an English phrase router. `physicalComparisons` in the resource module exposes the same numerical comparison defaults. Other domains must retain their own defaults.
4. Enforce shared comparison conditions in staged validation. `validatePhysicalComparison(instances)` checks common pendulum gravity/amplitude and track gravity/launch height. Invoke it after defaults have been merged during compilation and after an entire proposed command batch has been staged, before commit. An optional contribution-level instance validator would provide a reusable shared boundary. The domain UI emits atomic batches for shared changes and restarts the other timed instances, but follow-up AI commands also need this validation. Instance-targeted length/resistance edits remain independent. Gravity/amplitude/height follow-ups should target all relevant comparison instances in a single batch; a partial incompatible update must be rejected without committing.
5. Generalize optional graph-choice wording in `planner/creation.ts`. It currently describes only line slopes. Pendulum's `graphOutput` is `points`, with horizontal units **seconds** and vertical units **degrees**. The domain adapter draws the graph only when bound by `AssemblyGraph`. The rolling trail is a world visual, not a time-series graph; do not advertise its `points` as a generic graph provider.
6. Circuit typed wiring currently exists **inside the registered reusable circuit prefab**: `circuitWires` expands supported topologies into explicit `electrical-wire` records with source positive/negative and bulb a/b terminals. Stable child identities are `source` and `bulb/1`…`bulb/8`, scoped by the circuit instance. The frozen shared assembly schema supports only observation connections, so cross-instance electrical connections remain unsupported. If final acceptance requires individually model-selected battery/bulb prefabs and externally authored electrical links, Agent A must extend the contribution/connection interface and route validation to a finite circuit topology compiler; do not advertise arbitrary network wiring as implemented. No complete premade experiment, keyword branch, or finished model response was added.
7. Existing capability/action advertisement derives schemas from the integration list. Validate with `assemblyCapability` after adding adapters. No separate catalog card or prompt matcher is needed. `PHYS_PLAY`, `PHYS_RESTART`, and `PHYS_STEP` deliberately use identical metadata on the two dynamic providers to avoid shared action-registration conflicts. Circuit actions have unique `CIRC_` IDs; pendulum and track edits use `PEND_` and `ROLL_` IDs.

## Providers and ownership

All providers and the contribution use schema version 1. Imports do not register global state.

| Provider | Defaults / bounds | Authoritative system | Outputs / units |
| --- | --- | --- | --- |
| `prefabs/physical-systems/Pendulum` | L=1 m (0.1–20); g=9.81 m/s² (0.1–30); amplitude=5° (0–10); playing=true; up to four instances | Small-angle analytical pendulum; owns elapsed time and sampled angle/position observations | period/elapsed/lastPeriod: s; angle: deg; x/y: m; cycles: dimensionless; graph points: x seconds/y degrees |
| `prefabs/physical-systems/RollingTrack` | h=0.5 m (0.01–5); μ=0.05 (0–1); g=9.81 m/s² (0.1–30); playing=false; up to four instances | Ramp energy and horizontal rolling-resistance system; owns elapsed time, position, speed, trail and stopping observations | entrySpeed/speed: m/s; deceleration: m/s²; distance/stoppingDistance: m; elapsed/stopTime: s; stopped: boolean |
| `prefabs/physical-systems/ResistiveCircuit` | 6 V (0–24); 12 Ω/bulb (0.1–1000); one bulb (1–8 integers); series or parallel; up to two circuit instances | Ohm's law for identical resistors on validated supported topology; owns currents, powers and each bulb's observations | equivalentResistance: Ω; current: A; voltage: V; power: W; per-bulb rows with explicit units |

State definitions are in `components/traits/physical-systems/state.ts`; defaults in `resources/physical-systems/defaults.ts`; trusted mechanics in `systems/physical-systems/models.ts`; constructors in `prefabs/physical-systems/objects.ts`; presentation in `visuals/physical-systems/PhysicalVisuals.tsx` and `views/physical-systems/PhysicalSystemsView.tsx`; command bindings in `controls/physical-systems/PhysicalControls.tsx`. All CSS is scoped below `.physical-systems-experiment`.

Systems read validated configuration and runtime delta. They return fresh state/outputs without mutating the caller. Prefabs construct independent initial data. Visuals consume authoritative outputs and calculate display geometry only. Controls request staged runtime commands rather than writing store state. No behaviors are required.

## Follow-ups and numerical evidence

- PEND-001: second instance `PEND_SET_LENGTH` value 4 with first length 1 gives period ratio exactly 2 within 1e-10 test tolerance. Periods at L=1 and L=2 are 2.0060666807106475 s and 2.837006706885775 s. Small-angle model is frictionless; angles are capped at 10°. `lastPeriod` stays unavailable until one full analytical cycle has elapsed; the crossing is detected in simulation time even if no frame lands on its exact boundary.
- FRIC-001: entry speed at h=0.5 is 3.132091952673165 m/s. Smooth μ=0.05 stops at 10 m, rough μ=0.10 at 5 m. `ROLL_SET_RESISTANCE` to 0.20 on rough halves that distance to 2.5 m at unchanged entry speed. Zero μ returns null stopping time/distance, shown as **No finite stop**. Motion remains at entry speed and the distance overview expands to keep it visible.
- CIRC-001: `CIRC_ADD_BULB` preserves series topology: current 0.5→0.25 A and per-bulb power 3→0.75 W. `CIRC_SET_TOPOLOGY` value `parallel` gives total current 1 A and 3 W per bulb. `CIRC_SET_BULBS` supports bounded structural edits; child IDs remain stable for retained bulbs. Short circuits, zero resistance, noninteger count, overflow past eight bulbs, and unsupported topology are rejected. Brightness is a capped illustration of power (3 W reaches full displayed brightness), not a solver.

`PHYS_PLAY` takes `{value:boolean}`; `PHYS_RESTART` and `PHYS_STEP` have no arguments. Step requires pause and advances 0.1 s. Input changes restart current settings; `RESET` restores the accepted initial experiment and clears elapsed time/trails. The existing runtime alone supplies delta. Runs cap at 86400 s and pause there. Pendulum optional curves use at most two periods or 12 s with 25 samples, avoiding aliasing for the fastest permitted configurations; comparison graphs use the same time axis.

## Checks and limitations

From `src/web`:

```sh
node scripts/domains/physical-systems/verify.cjs
node scripts/domains/physical-systems/verify-integration.cjs --overlay
node scripts/domains/physical-systems/verify-layout.cjs
```

All passed. `verify.cjs` checks independent numerical oracles, resistance limits, pause/restart, frame-rate invariance, signed/invalid configuration rejection, identical-bulb conservation of power, and typed internal circuit wiring. `verify-integration.cjs --overlay` exercises the actual compiler, session, command batches, configuration parser, reset/save/load, selected graph, independent instances and a **three-pendulum structural variant**. Its loader adds only registry entries in memory; it never edits shared files or makes/intercepts inference calls. This is development evidence for the proposed integration, not evidence that the running app has those entries. After Agent A integrates, run the same test **without** `--overlay`.

Scoped Biome checks passed for 13 domain files. A TypeScript program rooted in the eight domain TypeScript/TSX files reported zero domain diagnostics; shared diagnostics were excluded to avoid conflating Agent C's concurrent work. No global build was run.

Static Playwright layout checks rendered actual domain components using actual compiler fixtures, in isolated temporary Chrome contexts at **1440×900** and **390×844**. All six cases passed page-overflow, label, and visible control checks. Reduced-motion assertions passed: dynamic illustrations are hidden and measurements/play/pause/step remain available. Mobile screenshots of all three cases were visually inspected: readable controls/results, full circuit table, no clipped content. These checks do not exercise hydrated UI actions or the normal app prompt flow and do not qualify as live MCP acceptance. Raw captures were analyzed and removed; retained summary is this document.

Final acceptance remains pending shared integration and normal-flow exact prompts with fresh configured Apertus/Laya and two qualifying MCP rounds. Model configuration and service availability were not measured in this domain task. Do not update the prompt catalog to Working from these checks.
