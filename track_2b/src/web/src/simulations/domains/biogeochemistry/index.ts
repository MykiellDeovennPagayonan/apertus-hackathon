import {
  carbonAdvance,
  carbonInitial,
} from "../../legacy/components/systems/biogeochemistry/carbon";
import {
  activities,
  activityFor,
  type CycleKind,
  type CycleState,
  cycleCommand,
  cycleNames,
} from "../../legacy/components/systems/biogeochemistry/contracts";
import {
  nitrogenAdvance,
  nitrogenInitial,
} from "../../legacy/components/systems/biogeochemistry/nitrogen";
import {
  oxygenAdvance,
  oxygenInitial,
} from "../../legacy/components/systems/biogeochemistry/oxygen";
import type {
  DomainContribution,
  DomainModel,
} from "../../registry/contracts/domainContribution";
import {
  choice,
  num,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
export const cycleKinds: CycleKind[] = ["oxygen", "nitrogen", "carbon"];
export { activities, cycleCommand, cycleNames };
export const assumptions: Record<CycleKind, string[]> = {
  oxygen: [
    "One well-mixed 100 L freshwater teaching pond; illustrative biological rates, fixed 1 atm, no stratification or anaerobic chemistry. It is not a real pond forecast.",
    "Equilibrium oxygen uses Benson/Krause USGS memo 2011.03 equation 7 at zero salinity. Warming and mixing activities isolate physical exchange and hold biology inactive.",
    "Carrier mmol and weighted oxygen-atom budget include O2, H2O, CO2 and simplified CH2O organic material. Released photosynthetic O2 originates in water. Large representative air store is not the global atmosphere.",
    "Stage actions integrate 12 modeled hours using fixed 0.125 h substeps. Plants and aerobic microbes respire in light and darkness. Representative O2 marks are not a molecular count.",
  ],
  nitrogen: [
    "All amounts use mmol elemental N, including the nitrogen in N2. Fixed fictional daily process rates and light/space growth limit; not fertilizer advice.",
    "Compatible microbes fix N into nodule material, then the legume; roots take up ammonium and nitrate. Bulk soil aeration is distinct from regulated nodule oxygen.",
    "Nitrification has a retained nitrite intermediate. Denitrification has a fixed schematic donor-capacity ceiling and aggregated atmospheric gas product; N2O, volatilization, adsorption and detailed carbon chemistry are omitted.",
    "Rain is one matched drainage/runoff pulse, not a hydrology forecast. Below-root leaching and surface runoff remain separate accounted stores; neither automatically arrives in a pond.",
  ],
  carbon: [
    "Amounts are normalized elemental carbon units, not global Gt C, CO2 mass or atmospheric ppm. Biology advances in modeled years with illustrative rates and a bounded regrowth capacity.",
    "Clearing partitions existing biomass among air, litter and retained harvested wood. Fossil burning is a finite complete-combustion teaching parcel; geological formation is inactive in biological time.",
    "Geological intervals are schematic compressed long periods, not years. Silicate weathering omits non-carbon reactants; carbonate deposition partitions C between sediment and air; fossil and carbonate-rock stores are distinct.",
    "Surface and deep DIC aggregate CO2, bicarbonate and carbonate. Signed exchange uses fixed effective equilibrium ratios, not complete ocean chemistry. Climate and pH are not calculated.",
  ],
};
export function initializeCycle(
  kind: CycleKind,
  activity = activities[kind][0].id,
  variant = 0,
  seed = 17,
): CycleState {
  const a = activityFor({ kind, activity });
  if (
    !Number.isInteger(variant) ||
    variant < 0 ||
    variant >= (a.variants?.length ?? 1)
  )
    throw new Error("Unsupported activity choice");
  const initial = () =>
    kind === "oxygen"
      ? oxygenInitial(activity)
      : kind === "nitrogen"
        ? nitrogenInitial()
        : carbonInitial(activity);
  const state: CycleState = { ...initial(), kind, activity, variant, seed };
  if (a.comparison)
    state.baseline =
      kind === "oxygen" ? oxygenInitial(activity, false) : initial();
  // Ocean activity starts with a declared perturbation, so store/flux differences are observable.
  if (activity === "ocean") {
    state.stores.atmosphere += 30;
    state.inputs += 30;
  }
  return state;
}
export function advanceCycle(s: CycleState): CycleState {
  if (s.time >= (s.kind === "oxygen" ? 240 : 60)) return s;
  const advance =
    s.kind === "oxygen"
      ? oxygenAdvance
      : s.kind === "nitrogen"
        ? nitrogenAdvance
        : carbonAdvance;
  const next = { ...s, ...advance(s, s) };
  if (s.baseline && next.time > s.time)
    next.baseline = advance(s, s.baseline, false);
  return next;
}
export function primaryLabel(s: CycleState) {
  if (
    s.time >= (s.kind === "oxygen" ? 240 : 60) ||
    (s.kind === "carbon" && s.activity === "fuel" && s.stores.fossil === 0)
  )
    return "Restart this activity";
  if (s.kind === "oxygen")
    return s.activity === "leaves" && !s.injected
      ? "Add dead leaves"
      : s.activity === "atoms"
        ? "Follow oxygen"
        : ["temperature", "mixing"].includes(s.activity)
          ? "Advance oxygen exchange"
          : s.activity === "day-night"
            ? Math.floor(s.time / 12) % 2
              ? "Advance through daylight"
              : "Advance through night"
            : "Advance 12 hours";
  if (s.kind === "nitrogen")
    return s.activity === "route"
      ? "Follow nitrogen"
      : s.activity === "rain"
        ? s.injected
          ? "Advance after rain"
          : "Apply the same rain"
        : s.activity === "fertilizer" && !s.injected
          ? "Add nitrogen"
          : "Advance growth day";
  return s.activity === "route"
    ? "Follow carbon"
    : s.activity === "fuel"
      ? "Burn one fuel parcel"
      : s.activity === "clearing" && !s.injected
        ? "Clear this patch"
        : s.activity === "clearing"
          ? "Advance a regrowth year"
          : s.activity === "geology"
            ? "Advance geological interval"
            : "Advance exchange year";
}
export const cycleModels: DomainModel[] = cycleKinds.map((kind) => {
  const parameters = object(
    {
      activity: choice(...activities[kind].map((a) => a.id)),
      variant: num(0, 2, "1", true),
      seed: num(1, 999999, "1", true),
    },
    ["activity", "variant", "seed"],
  );
  const defaults = { activity: activities[kind][0].id, variant: 0, seed: 17 };
  const actions = {
    [cycleCommand(kind, "ADVANCE")]: {
      arguments: object({}),
      description:
        "Advance the current teaching activity; visuals and short feedback follow accepted state",
      timing: "live" as const,
      target: "instance" as const,
    },
    [cycleCommand(kind, "ACTIVITY")]: {
      arguments: object({
        value: object({
          activity: choice(...activities[kind].map((a) => a.id)),
          variant: num(0, 2, "1", true),
        }),
      }),
      description:
        "Start one named investigation with its declared conditions; preserve biology when entering geological exploration",
      timing: "live" as const,
      target: "instance" as const,
    },
    [cycleCommand(kind, "RESTART")]: {
      arguments: object({}),
      description: "Restart this activity with its current authored conditions",
      timing: "live" as const,
      target: "instance" as const,
    },
  };
  return {
    ref: `prefabs/biogeochemistry/${kind[0].toUpperCase()}${kind.slice(1)}Cycle`,
    version: 1,
    name: cycleNames[kind],
    presentation: `cycle-${kind}`,
    description: `${cycleNames[kind]}: Begin with the learning question "${activities[kind][0].question}". The opening activity is ${activities[kind][0].title}; one action advances its teaching scene. Other investigations are separate contextual activities, never a list of setup tasks.`,
    tags: ["science", kind, `${kind} cycle`, "biogeochemistry"],
    assumptions: assumptions[kind],
    parameters,
    defaults,
    actions,
    outputs: {
      scene: {
        unit: `cycle/${kind}`,
        description:
          "Accepted elemental stores, active route, and focused activity snapshot",
      },
    },
    requiredObservations: [],
    maximumInstances: 4,
    dependencies: {
      resources: [],
      traits: [],
      behaviors: [],
      systems: [],
      visuals: [],
      views: ["AssemblyScene"],
      controls: ["AssemblyControls"],
      prefabs: [],
      compositions: [],
    },
    initialize: (p) => {
      validateValue(parameters, p);
      const v = { ...defaults, ...p };
      return initializeCycle(
        kind,
        v.activity,
        v.variant,
        v.seed,
      ) as unknown as Record<string, unknown>;
    },
    configuration: (raw) => {
      const s = raw as unknown as CycleState;
      return { activity: s.activity, variant: s.variant, seed: s.seed };
    },
    apply: (raw, action, value) => {
      const s = raw as unknown as CycleState;
      const contract = actions[action];
      if (!contract) throw new Error("Unsupported cycle command");
      validateValue(contract.arguments, value === undefined ? {} : { value });
      if (action === cycleCommand(kind, "ADVANCE"))
        return advanceCycle(s) as unknown as Record<string, unknown>;
      if (action === cycleCommand(kind, "RESTART")) {
        const next = initializeCycle(kind, s.activity, s.variant, s.seed);
        if (s.biological) next.biological = structuredClone(s.biological);
        return next as unknown as Record<string, unknown>;
      }
      const v = value as { activity: string; variant: number };
      if (
        kind === "carbon" &&
        s.activity === "geology" &&
        v.activity === s.biological?.activity &&
        v.variant === s.biological.variant
      )
        return structuredClone(s.biological) as unknown as Record<
          string,
          unknown
        >;
      const next = initializeCycle(kind, v.activity, v.variant, s.seed);
      if (
        kind === "carbon" &&
        v.activity === "geology" &&
        s.activity !== "geology"
      )
        next.biological = structuredClone(s);
      return next as unknown as Record<string, unknown>;
    },
    measure: (state) => {
      const s = state as unknown as CycleState;
      const { biological, baseline, ...current } = s;
      return {
        scene: {
          ...structuredClone(current),
          ...(baseline
            ? { baseline: { ...structuredClone(baseline), fluxes: [] } }
            : {}),
          ...(biological
            ? {
                biological: {
                  activity: biological.activity,
                  variant: biological.variant,
                },
              }
            : {}),
        },
      };
    },
  };
});
export const biogeochemistry: DomainContribution = {
  namespace: "biogeochemistry",
  version: 1,
  models: cycleModels,
};
