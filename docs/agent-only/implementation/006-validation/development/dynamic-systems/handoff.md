# Agent E handoff — dynamic systems

Date: 2026-10-04. Scope: GROW-001, TRAFFIC-001, QUEUE-001. Status: domain implementation and focused checks pass; shared registry/view integration and qualifying live-model browser rounds remain owned by Agent A.

## Exported providers

| Provider | Presentation | Authoritative system | Main actions |
| --- | --- | --- | --- |
| `prefabs/dynamic-systems/CompoundGrowth` v1 | `dynamic-growth` | `dynamic-systems/AnnualAccumulationSystem` | `GROW_SET_PRINCIPAL`, `GROW_SET_RATE`, `GROW_SET_YEARS`, `GROW_SET_SCENARIO` |
| `prefabs/dynamic-systems/RingTraffic` v1 | `dynamic-traffic` | `dynamic-systems/IntelligentDriverSystem` | `TRAFFIC_BRAKE`, `TRAFFIC_SET_HEADWAY`, `TRAFFIC_SET_PLAYING`, `TRAFFIC_STEP`, `TRAFFIC_RESTART` |
| `prefabs/dynamic-systems/CheckoutQueue` v1 | `dynamic-queue` | `dynamic-systems/FifoEventScheduler` | `QUEUE_SET_CASHIERS`, `QUEUE_SET_ARRIVAL_RATE`, `QUEUE_SET_SERVICE_RATE` |

The side-effect-free contribution is `dynamicSystems` from `src/simulations/domains/dynamic-systems/index.ts`. All model state is instance-local. Systems are pure functions except for no external side effects; seeded values are derived from explicit parameters.

## Defaults, formulas, and limitations

- Compound growth: $100, 5% annual rate, 10 whole years. Outputs use `P(1+r)^t` and `P(1+rt)`. Rate 0 yields $100 for both; 10% for two years yields $121 and $120. The supported horizon is 0–25 whole years so the registered graph remains inside the runtime output-complexity bound. No deposits, fees, tax, withdrawals, or inflation.
- Traffic: 22 vehicles on a 260 m ring; desired speed 22 m/s, desired headway 1.1 s, 4 m vehicle length, seed 117. The trusted IDM implementation uses synchronous substeps no larger than 0.05 s, nonnegative speeds, bounded acceleration, periodic positions, and a 2.5 s brake disturbance on vehicle 1. At 20 s after the default disturbance, the slowest-vehicle identity has moved from vehicle 1 through decreasing follower IDs, while the 12-vehicle control retains materially greater average speed. “Bigger gaps” means desired headway at fixed vehicle count and road length; it does not teleport cars.
- Checkout: average arrivals 0.8/min, per-cashier service capacity 1/min, 60-minute horizon, one cashier, seed 604. Exponential samples are generated once per accepted schedule and retained when cashier count changes. FIFO assigns the next customer to the earliest available cashier. The default has no warm-up; one short seeded outcome is not a theoretical average.

## Shared changes requested from Agent A

The ownership plan reserves these edits for Agent A:

1. In `src/simulations/runtime/assembly.ts`, import `dynamicSystems`, append it to `domainContributions`, and add `dynamic-growth`, `dynamic-traffic`, and `dynamic-queue` to `assemblyPresentationContracts`.
2. In the shared assembly client view, import `DynamicSystemsLesson` and route assemblies whose instances all start with `prefabs/dynamic-systems/` into a `.dynamic-systems-assembly` main element. Map each instance to the lesson with `dispatchCommand("assembly", command)` and a key containing `resetCount`, matching chemistry integration.
3. Add a package script for `node scripts/domains/dynamic-systems/verify.cjs` if domain scripts are being exposed consistently. The script works before integration through a local in-memory registry overlay and automatically uses an integrated registry once present.
4. Include these providers in fresh Apertus configuration and Laya registry-derived selection prompts through the existing generic capability path. No English keyword routing or complete template is required.
5. `src/lib/apertus/arguments.ts` currently builds `exampleArguments` only for boolean, number/integer, and enum `arguments.value` schemas. `GROW_SET_SCENARIO` correctly exposes an object-valued `value` with required `annualRate` and `years`; real Laya selects it for “Use 10 percent for 2 years,” but Apertus is shown `{}` as the example and returns a primitive after its single repair. Extend the shared example generator recursively for bounded object values (and ideally arrays) so the example contains every required nested field. Keep validation authoritative; do not special-case the prompt or action ID.

## Focused verification

From `src/web`:

```text
node scripts/domains/dynamic-systems/verify.cjs
pnpm exec biome check <dynamic-systems paths>
pnpm exec tsc --noEmit --pretty false
```

Results on 2026-10-04:

- Domain verification: pass. Covers exact growth oracles, invalid atomic edits, traffic vehicle conservation/periodic positions/nonnegative speeds/no material overlap, disturbance propagation, seeded reproducibility, pause/step/reset, desired-headway edit, exact one/two-cashier fixture, schedule reuse, queue accounting, independent structural traffic comparison, compiler/session lifecycle, and semantic render smoke checks.
- Biome over the 11 Agent E files: pass.
- Repository TypeScript `--noEmit`: pass in the concurrent working tree.
- Live Apertus/Laya development evidence on 2026-10-04 used the exact canonical prompts and fresh responses from the configured local services. TRAFFIC-001 passed creation, accepted `prefabs/dynamic-systems/RingTraffic`, staged/committed the recipe, and changed desired headway from 1.1 s to 2.5 s at the same 22 vehicles. QUEUE-001 passed creation, accepted `prefabs/dynamic-systems/CheckoutQueue`, staged/committed the recipe, and opened cashier 2 while preserving the sampled arrival/service schedule and reducing average wait. GROW-001 passed creation and the zero-rate edit. Laya then correctly selected `GROW_SET_SCENARIO` for the combined rate/duration follow-up, but the shared argument-example limitation above caused Apertus schema failure after one repair. Reports were written outside the repository under `/private/tmp/dynamic-systems-live-*.json`. Qualifying browser acceptance is not claimed here; it must run after shared registry/view integration through the normal UI.

The development test overlay never changes a shared source, intercepts inference, or counts as live evidence.
