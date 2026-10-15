import { type CycleRun, type CycleState, run, traceNext } from "./contracts";
import { audit, move, transfer } from "./transfers";
export function nitrogenInitial() {
  const stores = {
    atmosphere: 1000,
    nodules: 0,
    ammonium: 3,
    nitrite: 0,
    nitrate: 4,
    plants: 5,
    animals: 1,
    microbes: 1,
    dead: 8,
    leached: 0,
    runoff: 0,
  };
  return run(
    stores,
    Object.fromEntries(Object.keys(stores).map((k) => [k, 1])),
    "atmosphere",
  );
}
export function nitrogenAdvance(
  s: CycleState,
  r: CycleRun,
  changed = true,
): CycleRun {
  let n = { ...r, stores: { ...r.stores } };
  const partner =
    s.activity === "partners"
      ? changed
      : s.activity === "rain"
        ? changed && s.variant === 1
        : true;
  const waterlogged = s.activity === "soil" && changed;
  const fertilizer =
    s.activity === "fertilizer" && changed
      ? s.variant
        ? 35
        : 8
      : s.activity === "rain" && changed && s.variant === 2
        ? 20
        : 0;
  if (!r.injected && fertilizer) {
    n.stores.nitrate += fertilizer;
    n.inputs += fertilizer;
  }
  const available = n.stores.ammonium + n.stores.nitrate;
  // A fixed light/space capacity limits net plant N accumulation to 15 mmol N.
  const capacity =
    Math.max(0, 15 - n.stores.plants) * (waterlogged ? 0.08 : 0.2);
  const uptake = Math.min(capacity, available * 0.18);
  const rain = s.activity === "rain" && !r.injected;
  const reactions = [
    move(
      "Nitrogen fixation",
      "atmosphere",
      "nodules",
      partner ? Math.min(0.8, Math.max(0, capacity)) : 0,
    ),
    move(
      "Symbiotic assimilation",
      "nodules",
      "plants",
      Math.min(n.stores.nodules * 0.5, capacity * 0.3),
    ),
    move(
      "Ammonium uptake",
      "ammonium",
      "plants",
      available ? (uptake * n.stores.ammonium) / available : 0,
    ),
    move(
      "Nitrate uptake",
      "nitrate",
      "plants",
      available ? (uptake * n.stores.nitrate) / available : 0,
    ),
    move("Feeding", "plants", "animals", n.stores.plants * 0.008),
    move("Plant litter", "plants", "dead", n.stores.plants * 0.006),
    move("Animal waste", "animals", "dead", n.stores.animals * 0.03),
    move("Microbial turnover", "microbes", "dead", n.stores.microbes * 0.03),
    move("Mineralization", "dead", "ammonium", n.stores.dead * 0.1),
    move(
      "Nitrification: ammonium to nitrite",
      "ammonium",
      "nitrite",
      n.stores.ammonium * (waterlogged ? 0.006 : 0.25),
    ),
    move(
      "Nitrification: nitrite to nitrate",
      "nitrite",
      "nitrate",
      n.stores.nitrite * (waterlogged ? 0.01 : 0.4),
    ),
    // Electron donor capacity is a fixed, declared schematic ceiling; C chemistry is omitted.
    move(
      "Denitrification",
      "nitrate",
      "atmosphere",
      Math.min(1, n.stores.nitrate * (waterlogged ? 0.18 : 0.002)),
    ),
    move(
      "Leaching below roots",
      "nitrate",
      "leached",
      rain ? n.stores.nitrate * 0.35 : 0,
    ),
    move(
      "Surface runoff",
      "nitrate",
      "runoff",
      rain ? n.stores.nitrate * 0.12 : 0,
    ),
  ];
  const accepted = transfer(n.stores, n.weights, reactions);
  n = {
    ...n,
    ...accepted,
    time: r.time + 1,
    injected: true,
    event: rain
      ? "The same rain reached both plots"
      : "One modeled growth day passed",
  };
  audit(n);
  return s.activity === "route"
    ? traceNext(r, n, [
        "nodules",
        "plants",
        "animals",
        "dead",
        "ammonium",
        "nitrite",
        "nitrate",
        "plants",
      ])
    : n;
}
