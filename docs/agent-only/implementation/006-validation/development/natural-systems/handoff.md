# Agent D natural-systems handoff

Date: 2026-10-04. Status: domain implementation and focused development verification complete; shared integration and live-model results are recorded separately below when available. This does not claim either complete fifteen-prompt qualifying round.

## Agent A shared integration request

Apply [the prepared two-file patch](../../../../../../src/web/scripts/domains/natural-systems/proposed-shared-integration.patch) or its equivalent. It imports `naturalSystems` into the explicit registry, advertises the three implemented presentation adapters, and routes all-natural assemblies to `NaturalSystemsView`. No prompt phrases, complete responses, premade experiments, or runtime state are added. Mixed-domain rendering is outside these three canonical prompts and can remain a declared unsupported assembly until a shared mixed presentation is designed.

Provider IDs and presentations:

| Prompt | Provider | Presentation | Canonical follow-up |
| --- | --- | --- | --- |
| DIFF-001 | `prefabs/natural-systems/DiffusionField` | `natural-diffusion` | `DIFF_SCALE_COEFFICIENT` with value `2` |
| ECO-001 | `prefabs/natural-systems/PredatorPrey` | `natural-predator-prey` | `ECO_SCALE_INITIAL_RABBITS` with value `0.5` |
| PLANT-001 | `prefabs/natural-systems/PlantGrowth` | `natural-plant-growth` | `PLANT_SET_LIGHT`; canonical result needs light above `0.6`, e.g. `0.9` |

Each provider owns typed initialization, actions, outputs, configuration reset and optional shared-clock stepping. Importing the contribution has no registry side effect. `NaturalSystemsView` reads authoritative outputs and dispatches through the assembly command boundary; it creates no timer or solver. Controls have 44px targets, numeric alternatives, visible focus, responsive single-column layout and reduced-motion-safe static results.

DIFF-001 uses row-major cell averages on a 9–15 square grid. Conservative paired face fluxes implement no-flux boundaries and enforce `D Δt/Δx² ≤ 0.24`. Defaults are D=0.05 m²/s, width=1 m, 15×15 cells, one illustrative mass unit and 8 s. Doubling D restarts both current and previous-coefficient fields from the same central deposit and compares equal times. Outputs include total mass, three numeric probes, the authoritative heatmap field and maximum stable internal timestep. It models diffusion in still water, not stirring.

ECO-001 uses the requested continuous Lotka–Volterra equations with defaults R=40, F=9, rates 0.5, 0.02, 0.01 and 0.3, duration 30 model days, and fixed-step RK4 at 0.01 day. Initial derivatives are +12.8 rabbits/day and +0.9 foxes/day. Halving rabbits restarts from R=20 with the same F and rates and retains the original run as a dashed equal-parameter comparison. Values remain continuous and nonnegative; copy avoids claiming every future fox value is lower.

PLANT-001 implements `dB/dt=gmax·min(light,water,nutrients)` exactly with normalized [0,1] resources. Defaults are B=1, gmax=1/day, light=0.4, water=0.6 and nutrients=0.8. Setting light to 0.9 raises growth from 0.4 to 0.6 illustrative biomass units/day and makes water limiting; more light does not exceed that rate. The UI and provider assumptions explicitly call this an illustrative model rather than a crop forecast.

Focused command from `src/web`:

```sh
node scripts/domains/natural-systems/verify.cjs
```

This passes independent diffusion mass/nonnegativity/uniform-field/CFL/grid-and-timestep checks; independently calculated population derivatives, zero-boundary behavior and timestep-halving convergence; exact plant resource limits and zero-resource behavior; invalid input rejection; reset/configuration invariants; output contracts; and semantic rendering. TypeScript and a targeted Biome check also pass. These are development checks and do not substitute for fresh Apertus/Laya evidence.

Agent D changed only `natural-systems` namespaces, this development handoff, and the proposed patch file. Agent E and all shared working files were preserved.
