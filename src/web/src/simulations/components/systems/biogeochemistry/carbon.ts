import { type CycleRun, type CycleState, run, traceNext } from "./contracts";
import { audit, move, type Reaction, transfer } from "./transfers";
export function carbonInitial(activity: string) {
  const stores = {
    atmosphere: 250,
    plants: 80,
    animals: 5,
    dead: 12,
    soil: 70,
    harvested: 0,
    surface: 180,
    deep: 800,
    buried: activity === "geology" ? 40 : 4,
    fossil: 120,
    sediment: 100,
    rock: 1000,
  };
  return run(
    stores,
    Object.fromEntries(Object.keys(stores).map((k) => [k, 1])),
    activity === "geology" ? "dead" : "atmosphere",
  );
}
export function carbonAdvance(
  s: CycleState,
  r: CycleRun,
  changed = true,
): CycleRun {
  let n = { ...r, stores: { ...r.stores }, fluxes: [] as CycleRun["fluxes"] };
  if (s.activity === "clearing" && changed && !r.injected) {
    const cleared = n.stores.plants * 0.8;
    const burn = s.variant ? 0.35 : 0;
    const accepted = transfer(
      n.stores,
      n.weights,
      [
        {
          process: "Land clearing",
          amount: cleared,
          from: { plants: 1 },
          to: { atmosphere: burn, dead: 0.4, harvested: 0.6 - burn },
        },
      ].map((r) => ({
        ...r,
        to: Object.fromEntries(Object.entries(r.to).filter(([, v]) => v > 0)),
      })),
    );
    n = {
      ...n,
      ...accepted,
      injected: true,
      time: r.time,
      event: "Cleared material moved to its destinations",
      trace: "dead",
      history: [...r.history, "dead"],
    };
    audit(n);
    return n;
  }
  if (s.activity === "fuel") {
    const accepted = transfer(n.stores, n.weights, [
      move("Fossil fuel combustion", "fossil", "atmosphere", 12),
    ]);
    n = {
      ...n,
      ...accepted,
      injected: true,
      time: r.time + 1,
      event: accepted.fluxes.length
        ? "One fuel parcel burned"
        : "No fuel remains",
      trace: "atmosphere",
    };
    audit(n);
    return n;
  }
  const geological = s.activity === "geology";
  const reactions: Reaction[] = geological
    ? [
        move("Organic burial", "dead", "buried", n.stores.dead * 0.06),
        move(
          "Long-term fossil formation",
          "buried",
          "fossil",
          n.stores.buried * 0.025,
        ),
        // Schematic silicate weathering: non-carbon reactants are outside this C-only model.
        move(
          "Silicate weathering",
          "atmosphere",
          "surface",
          Math.min(0.8, n.stores.atmosphere * 0.001),
        ),
        {
          process: "Carbonate deposition",
          amount: n.stores.surface * 0.004,
          from: { surface: 1 },
          to: { sediment: 0.5, atmosphere: 0.5 },
        },
        move("Lithification", "sediment", "rock", n.stores.sediment * 0.002),
        move("Geological return", "rock", "atmosphere", n.stores.rock * 0.0004),
      ]
    : s.activity === "ocean"
      ? []
      : [
          move(
            "Photosynthesis",
            "atmosphere",
            "plants",
            Math.min(
              n.stores.atmosphere * 0.025,
              Math.max(0, 100 - n.stores.plants) * 0.18,
            ),
          ),
          move(
            "Plant respiration",
            "plants",
            "atmosphere",
            n.stores.plants * 0.025,
          ),
          move("Feeding", "plants", "animals", n.stores.plants * 0.012),
          move(
            "Animal respiration",
            "animals",
            "atmosphere",
            n.stores.animals * 0.12,
          ),
          move("Plant litter", "plants", "dead", n.stores.plants * 0.02),
          move(
            "Animal death/waste",
            "animals",
            "dead",
            n.stores.animals * 0.06,
          ),
          {
            process: "Decomposition",
            amount: n.stores.dead * 0.15,
            from: { dead: 1 },
            to: { atmosphere: 0.65, soil: 0.35 },
          },
          move("Soil respiration", "soil", "atmosphere", n.stores.soil * 0.008),
          move(
            "Harvested material decay",
            "harvested",
            "atmosphere",
            n.stores.harvested * 0.02,
          ),
        ];
  const airSea = (n.stores.atmosphere - n.stores.surface / 0.72) * 0.025;
  const mixing = (n.stores.surface - n.stores.deep / (800 / 180)) * 0.018;
  reactions.push(
    airSea >= 0
      ? move("Air-sea exchange", "atmosphere", "surface", airSea)
      : move("Air-sea exchange", "surface", "atmosphere", -airSea),
    mixing >= 0
      ? move("Ocean mixing", "surface", "deep", mixing)
      : move("Ocean mixing", "deep", "surface", -mixing),
  );
  const accepted = transfer(n.stores, n.weights, reactions);
  n = {
    ...n,
    ...accepted,
    time: r.time + 1,
    event: geological
      ? "A schematic geological interval passed"
      : "One modeled year passed",
  };
  audit(n);
  if (geological) return traceNext(r, n, ["buried", "fossil"]);
  return s.activity === "route"
    ? traceNext(r, n, [
        "plants",
        "animals",
        "dead",
        "soil",
        "atmosphere",
        "plants",
      ])
    : n;
}
