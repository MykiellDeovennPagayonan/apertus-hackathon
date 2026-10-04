# Agent B — fresh-model development verification

Local date: 2026-10-04, Asia/Manila. Tests ran on 2026-10-03 UTC. **Creation works; complete prompt acceptance fails.** No catalog promotion or qualifying integrated round is claimed.

## Environment and boundaries

The working tree already contained Agent A/shared integration and Agent C chemistry work. Only Agent B domain components, metadata, scripts, and evidence were edited. Agent C's app, inference services, browser contexts, and evidence were preserved. No model service was restarted.

An isolated executable snapshot served the normal app on port 43120, with webpack because Turbopack rejected its dependency symlink. Official `@playwright/mcp` 0.0.83 was launched through its actual MCP client, with `listTools` discovery and isolated Chrome contexts. The runner used `browser_run_code_unsafe`, `browser_console_messages`, and `browser_network_requests`; no inference interceptions, mocks, replay, or internal state injection were used. All inputs went through the accessible Create/Apply controls. State and provenance were read through the application's existing diagnostic interfaces.

Models: `m1rkocasu/Apertus-v1.5-8B-text-MLX-mxfp4` at 43101 and `aac6fef/laya-multilingual-mlx` at 43102. Hybrid mode; Apertus max tokens 2048, temperature 0, timeout 180000 ms; planner deadline 180000 ms; Laya timeout 30000 ms, edit gate 0.9, creation gate 0.75. Visible-feedback budget 2000 ms. Diagnostics were enabled in the isolated app only.

Snapshot fingerprints (sorted executable source/public/package/config contents): initial `1958b2f0b43942d637e248ab66dfae048c55f96dd3f43f20ef7409dbe0981db9`; domain metadata fixes `ed2a76d7a9a8796edae2404d73620ed7ab6de04955fba2526f01701bda148597`. These are development snapshot identities, not complete 006 frozen-candidate fingerprints; the helper excludes scripts and some copied configuration from its hash. The final mobile CSS/spacing changes were tested separately with current components and are not part of the live snapshot's fingerprint.

## Results

The six exact canonical creations passed at 1440×900 and 390×844. Every creation accepted fresh Apertus intent/configuration and an actual Laya mechanism choice, then committed a correlated generated assembly with the proposed defaults.

| Prompt | Desktop | Mobile | Full result |
| --- | --- | --- | --- |
| PEND-001 | Two swings at 1/2 m; 2.0060666807/2.8370067069 s. Follow-up changes only swing 2 to 4 m, giving period ratio 2. | Same defaults and follow-up pass. | Fails unsupported zero-length handling: HTTP 502 after one repair. |
| FRIC-001 | Two tracks, h=0.5 m, μ=0.05/0.10, stops 10/5 m, entry speed 3.1320919527 m/s. | Same creation/defaults pass. | Required doubling follow-up fails at both sizes: model emits `ROLL_SET_RESISTANCE value:2` despite explaining the correct 0.1→0.2 change. Repair repeats the invalid value. |
| CIRC-001 | One 6 V, 12 Ω bulb at 0.5 A. After metadata fixes: series follow-up gives 0.25 A, 0.75 W/bulb; parallel gives 1 A, 3 W/bulb. | Creation passes. Add-second-bulb follow-up still attaches a value to parameterless `CIRC_ADD_BULB`, yielding HTTP 502. | Unreliable follow-up inference; zero-resistance request also returns HTTP 502 on desktop. |

Expected/actual numerical checks use 1e-6 relative tolerance and 1e-6 absolute near zero. Full retained assertions, accepted recipes, correlation IDs, model events, and timings are in [attempt 03](20261004-attempt03.json). Its 16 recorded requests took 7.584–48.875 s; visible feedback took 35–310 ms. No creation provenance bypass was observed. Low-confidence edit decisions used the existing Apertus broad fallback; failed repairs remained bounded to one.

The initial diagnostics-disabled attempt failed before inference; [attempt 01](20261004-attempt01.json) records this configuration error. [Attempt 02](20261004-attempt02.json) records the original desktop failures before domain metadata changes. Interrupted cases are explicitly unverified.

The improved harness continued lifecycle assertions after an unsupported-request HTTP error without marking that error passed. [Attempt 04](20261004-attempt04.json) confirms, on mobile pendulum: pause freezes simulation time; step advances both instances by 0.1 s; restart clears time; reset restores initial parameters; controls are at least 44 px high; keyboard focus works; reduced motion preserves results; invalid numeric input does not commit; a failed zero-length inference preserves revision and parameters; returning home disposes the session; cancelled creation cannot commit and preserves its input. No page errors occurred. Equivalent full lifecycle checks for ramp and circuit remain unexecuted because their required follow-ups failed earlier.

Fixed mobile development variants:

- [Pendulum typo](20261004-pendulum-typo.json): “Does a longer swng move more slowly?” — passes with 1/2 m defaults.
- [Ramp typo](20261004-rolling-typo.json): “Why does a toy car roll farther on a smoth floor?” — passes with 0.05/0.10 coefficients.
- [Circuit typo](20261004-circuit-typo.json): “What happens if I add anothr bulb to a circuit?” — passes with one 6 V, 12 Ω bulb.
- [Structural variant](20261004-pendulum-structure.json): “Compare three swings with lengths 1 metre, 2 metres and 4 metres, and show an angle over time graph.” — creates three independent instances with exactly those lengths, but **fails the explicit graph requirement**. Laya chooses unclear for observation, and the planner silently defaults to measurements. Do not count the variant as passed.

## Changes and UX review

Domain action metadata now distinguishes absolute resistance from a multiplier, states unsupported zero/negative bounds, distinguishes final bulb count from parameterless add, and requires preservation of unrelated settings. This improved circuit desktop inference but did not establish reliability. No hardcoded prompt router, premade experiment, or saved model response was added to implementation.

Observation → learner effect → fix → owner → check:

| Severity | Observation / effect | Fix and owner | Validation |
| --- | --- | --- | --- |
| Major, resolved for static layout | Phone scaling made ramp/circuit SVG labels too small. | Agent B enlarged scoped mobile scene labels, separated ramp rows and stop/distance text. | Screenshots reviewed; six static layout checks pass, including zero-resistance track and parallel circuit fixtures. [Layout summary](20261004-layout.json). Fresh normal-app rerun of this final CSS remains pending. |
| Blocker | Relative roughness text is understood in prose but encoded as the wrong absolute value. | Agent A/shared planner needs reliable numeric argument generation and repair. | Exact follow-up must produce μ=0.2, stop=2.5 m, unchanged speed and other track. |
| Blocker | Parameterless circuit action receives a copied numeric value. | Agent A/shared planner needs corrected edit envelope/examples and reliable repair; B metadata change alone is insufficient. | Add-second-bulb must pass repeatedly at both sizes without dropping topology clauses. |
| Major | Unsupported numeric requests return inference errors instead of helpful non-edit outcomes. | Agent A/shared repair path; trusted bounds must remain enforced. | Return clarify/unsupported, preserve revision/settings, and keep usable focus. |
| Major | Explicit graph request is silently discarded on uncertain Laya observation selection. | Agent A/shared creation policy must clarify or repair explicit unmet presentation requirements. | Three swings and their angle/time graph must both be present. |

No full UX scores are awarded while required actions fail. Domain controls/readouts are readable, reset is discoverable, and mobile scrolling reaches settings/results. The model limitations remain small-angle/frictionless pendulums, point-mass ramp energy with effective rolling resistance and no wheel/ramp losses, and ideal constant-resistance bulbs with illustrative brightness and supported series/parallel topologies only.

Focused mechanics and actual integrated compiler/session checks pass; TypeScript no-emit passes. Scoped Biome checks pass with informational suggestions. Final static layout checks pass all six cases, with no page overflow and reduced-motion assertions. Full build, shared legacy regressions, both complete fifteen-prompt rounds, and acceptance freeze were not run.

## Shared handoff and remaining work

The reviewable [proposed shared patch](../../../../../../src/web/scripts/domains/physical-systems/proposed-shared-repair.patch) removes the fixed numeric example from broad edit instructions and stops echoing the invalid assistant answer as a repair example. It is **not applied or live-tested**; it is a proposal, not a proven fix. Agent B requested ownership reassignment because plan 006 reserves existing/shared files to Agent A. Approval remains pending.

After Agent A integrates a repair, rerun the exact follow-ups and unsupported cases, fix explicit graph handling, then run all Agent B controls/lifecycle checks and the fixed variants at both sizes. A new integrated fingerprint and two complete 006 rounds are still required. Consecutive qualifying pass count remains zero. Catalog status proposal: Implemented / unverified, with the failures linked here.

## Cleanup

Task-owned raw paths: `/private/tmp/apertus-006-agent-b-20261004-run01` through `run04`, `/private/tmp/apertus-006-agent-b-20261004-variants`, and `/private/tmp/apertus-006-agent-b-20261004-layout` / `layout02`. All were analyzed before deletion. Cleanup completion is recorded in each retained JSON summary. Screenshots, MCP result dumps, discovery dumps, console/network logs, and temporary app build/profile data are removed after closing this task's contexts and server. Earlier Agent B runs and all Agent C data are outside this task's cleanup scope.
