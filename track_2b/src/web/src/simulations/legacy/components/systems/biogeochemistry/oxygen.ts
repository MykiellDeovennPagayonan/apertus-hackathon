import { type CycleRun, type CycleState, run, traceNext } from "./contracts";
import { audit, type Reaction, transfer } from "./transfers";
/** Benson & Krause, USGS memo 2011.03 eq.7: freshwater, 1 atm, 0–40 °C.
 * https://water.usgs.gov/admin/memo/QW/qw11.03.pdf */
export function oxygenEquilibrium(celsius: number) {
  if (!Number.isFinite(celsius) || celsius < 0 || celsius > 40)
    throw new Error("Temperature outside solubility domain");
  const t = celsius + 273.15;
  return Math.exp(
    -139.34411 +
      1.575701e5 / t -
      6.642308e7 / t ** 2 +
      1.2438e10 / t ** 3 -
      8.621949e11 / t ** 4,
  );
}
export const dissolvedOxygen = (r: CycleRun) => (r.stores.dissolved * 32) / 100; // fixed 100 L
export function oxygenInitial(activity: string, changed = true) {
  return run(
    {
      atmosphere: 100000,
      dissolved: 25,
      water: 100000,
      co2: 1000,
      plants: activity === "plants" && changed ? 80 : 40,
      animals: 30,
      dead: 12,
    },
    {
      atmosphere: 2,
      dissolved: 2,
      water: 1,
      co2: 2,
      plants: 1,
      animals: 1,
      dead: 1,
    },
    activity === "atoms" ? "water" : "dissolved",
  );
}
export function oxygenAdvance(
  s: CycleState,
  r: CycleRun,
  changed = true,
  dt = 0.125,
): CycleRun {
  const n = { ...r, stores: { ...r.stores }, fluxes: [] as CycleRun["fluxes"] };
  if (s.activity === "leaves" && !r.injected) {
    n.stores.dead += 60;
    n.inputs += 60; // one O atom per CH2O organic unit
    n.injected = true;
  }
  const light =
    s.activity === "light"
      ? changed
        ? 0
        : 1
      : s.activity === "atoms"
        ? Math.floor((r.time + 12) / 12) % 2
          ? 1
          : 0
        : Math.floor((r.time + 12) / 12) % 2
          ? 0
          : 1;
  const plants = s.activity === "plants" && changed ? 2 : 1;
  const physicalOnly = ["temperature", "mixing"].includes(s.activity);
  const temperature = s.activity === "temperature" ? (changed ? 25 : 15) : 20;
  const k = s.activity === "mixing" ? (changed ? 0.25 : 0.025) : 0.04;
  const accumulated: Record<string, CycleRun["fluxes"][number]> = {};
  const steps = Math.round(12 / dt);
  for (let i = 0; i < steps; i++) {
    const exchange =
      ((k *
        ((oxygenEquilibrium(temperature) * n.stores.atmosphere) / 100000 -
          dissolvedOxygen(n)) *
        100) /
        32) *
      dt;
    const reactions: Reaction[] = [
      exchange >= 0
        ? {
            process: "Air-water exchange",
            amount: exchange,
            from: { atmosphere: 1 },
            to: { dissolved: 1 },
          }
        : {
            process: "Air-water exchange",
            amount: -exchange,
            from: { dissolved: 1 },
            to: { atmosphere: 1 },
          },
    ];
    if (!physicalOnly) {
      reactions.push({
        process: "Photosynthesis",
        amount: 0.72 * plants * light * dt,
        from: { co2: 1, water: 2 },
        to: { plants: 1, water: 1, dissolved: 1 },
      });
      for (const [carrier, rate, label] of [
        ["plants", 0.18 * plants, "Plant respiration"],
        ["animals", 0.12, "Animal respiration"],
        ["dead", n.stores.dead * 0.006, "Decomposition"],
      ] as const)
        reactions.push({
          process: label,
          amount: rate * dt,
          from: { [carrier]: 1, dissolved: 1 },
          to: { co2: 1, water: 1 },
        });
    }
    const accepted = transfer(n.stores, n.weights, reactions);
    n.stores = accepted.stores;
    for (const f of accepted.fluxes) {
      const key = f.process + Object.keys(f.from).join(",");
      accumulated[key] = {
        ...f,
        amount: (accumulated[key]?.amount ?? 0) + f.amount,
      };
    }
  }
  n.time = r.time + 12;
  n.fluxes = Object.values(accumulated);
  n.event =
    dissolvedOxygen(n) > dissolvedOxygen(r) + 0.02
      ? "Oxygen increased"
      : dissolvedOxygen(n) < dissolvedOxygen(r) - 0.02
        ? "Oxygen decreased"
        : "Oxygen stayed nearly steady";
  audit(n);
  return s.activity === "atoms" ? traceNext(r, n, ["dissolved", "water"]) : n;
}
