import {
  type FoodWebState,
  foodWebMeasure,
} from "../../legacy/components/systems/ecology/foodWeb";
import { foodWebSpecies } from "../../legacy/components/systems/ecology/foodWebSpecies";
import {
  type NutrientState,
  nutrientsMeasure,
} from "../../legacy/components/systems/ecology/nutrients";
import {
  treatmentPatches,
  WILDFIRE_MAP,
  type WildfireState,
  wildfireMeasure,
} from "../../legacy/components/systems/ecology/wildfire";
import type { DomainContribution } from "../../registry/contracts/domainContribution";
import {
  choice,
  num,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { comparisonModel } from "../comparisonModel";

const nutrients = comparisonModel({
  namespace: "ecology",
  name: "Nutrients",
  title: "Nutrients & plant growth",
  presentation: "ecology-nutrients",
  description:
    "Compare nutrient-limited growth with a balanced reference, holding light and water fixed.",
  assumptions: [
    "Light and water are fixed and suitable. All supplies are relative levels; 100 is sufficient in this fictional plant.",
    "Biomass follows the lowest supply up to a ceiling of 100. Height is a separate nonlinear index. Equal shortages co-limit growth.",
    "Deficiency cues are illustrative. Excess, soil interactions, species differences and toxicity are outside this teaching model; it is not fertilizer advice.",
  ],
  fields: {
    nitrogen: {
      initial: 40,
      max: 150,
      action: "NUTRIENT_SET_NITROGEN",
      label: "Nitrogen availability",
    },
    phosphorus: {
      initial: 100,
      max: 150,
      action: "NUTRIENT_SET_PHOSPHORUS",
      label: "Phosphorus availability",
    },
    potassium: {
      initial: 100,
      max: 150,
      action: "NUTRIENT_SET_POTASSIUM",
      label: "Potassium availability",
    },
  },
  outputs: {
    scene: { unit: "1", description: "Plant comparison snapshot" },
    limiter: { unit: "1", description: "Limiting resource" },
    biomass: { unit: "index", description: "Biomass index" },
    height: { unit: "cm", description: "Plant height" },
    health: { unit: "1", description: "Visible health" },
    conclusion: { unit: "1", description: "Why growth responds" },
  },
  measure: (s) => nutrientsMeasure(s as unknown as NutrientState),
});
const wildfireBase = comparisonModel({
  namespace: "ecology",
  name: "Wildfire",
  title: "Wildfire & fuel treatment",
  presentation: "ecology-wildfire",
  description:
    "Compare the same wildfire and weather with and without an earlier prescribed fuel treatment.",
  assumptions: [
    "Same ignition, fixed vegetation pattern, wind and moisture in both maps. Learners select individual cells on the original 10×16 landscape. Each selectable tree represents one model cell. Width presets use those same cells.",
    "A deterministic downwind heat-spread model illustrates reduced severity and crossing under extreme conditions. Intensity is a relative index, not a real fire forecast.",
    "Fire is a natural ecological process in many landscapes. Real prescribed burning requires qualified professionals, an approved plan and suitable conditions.",
  ],
  fields: {
    coverage: {
      initial: 50,
      max: 100,
      action: "FIRE_SET_COVERAGE",
      label: "Treatment width",
    },
    wind: {
      initial: 35,
      max: 100,
      action: "FIRE_SET_WIND",
      label: "Wind severity",
    },
    moisture: {
      initial: 40,
      max: 100,
      action: "FIRE_SET_MOISTURE",
      label: "Fuel moisture",
    },
  },
  outputs: {
    scene: { unit: "1", description: "Paired landscape snapshot" },
    untreatedArea: { unit: "%", description: "Untreated area burned" },
    treatedArea: { unit: "%", description: "Treated area burned" },
    untreatedPeak: { unit: "index", description: "Untreated peak intensity" },
    treatedPeak: { unit: "index", description: "Treated peak intensity" },
    reduction: { unit: "%", description: "Area reduction" },
    community: { unit: "1", description: "Community · untreated / treated" },
    conclusion: { unit: "1", description: "How treatment changes spread" },
  },
  measure: (s) => wildfireMeasure(s as unknown as WildfireState),
});
if (wildfireBase.parameters.type !== "object")
  throw new Error("Wildfire parameters must be an object");
const wildfireParameters = object(
  {
    ...wildfireBase.parameters.properties,
    custom: num(0, 1, "1", true),
    patches: {
      type: "array",
      items: num(0, WILDFIRE_MAP.rows * WILDFIRE_MAP.columns - 1, "1", true),
      minItems: 0,
      maxItems: WILDFIRE_MAP.rows * WILDFIRE_MAP.columns,
    },
  },
  ["custom", "patches", ...Object.keys(wildfireBase.parameters.properties)],
);
const validateWildfire = (state: Record<string, unknown>) => {
  validateValue(wildfireParameters, state, "Wildfire treatment plan");
  const patches = (state.patches ?? []) as number[];
  if (new Set(patches).size !== patches.length)
    throw new Error("Treatment patches must be unique");
  return { ...state, patches: [...patches] };
};
const wildfire = {
  ...wildfireBase,
  parameters: wildfireParameters,
  defaults: { ...wildfireBase.defaults, custom: 0, patches: [] },
  initialize: (parameters: Record<string, unknown>) =>
    validateWildfire({
      ...wildfireBase.defaults,
      custom: 0,
      patches: [],
      ...parameters,
    }),
  configuration: validateWildfire,
  actions: {
    ...wildfireBase.actions,
    FIRE_SET_CUSTOM: {
      arguments: object({ value: num(0, 1, "1", true) }),
      description: "Choose custom treatment",
      timing: "live" as const,
      target: "instance" as const,
    },
    FIRE_TOGGLE_PATCH: {
      arguments: object({
        value: num(0, WILDFIRE_MAP.rows * WILDFIRE_MAP.columns - 1, "1", true),
      }),
      description: "Toggle a treatment patch",
      timing: "live" as const,
      target: "instance" as const,
    },
    FIRE_CLEAR_PATCHES: {
      arguments: object({}),
      description: "Clear treatment plan",
      timing: "live" as const,
      target: "instance" as const,
    },
  },
  apply: (state: Record<string, unknown>, action: string, value?: unknown) => {
    if (action === "FIRE_TOGGLE_PATCH") {
      validateValue(
        num(0, WILDFIRE_MAP.rows * WILDFIRE_MAP.columns - 1, "1", true),
        value,
      );
      const patches = treatmentPatches(state as unknown as WildfireState),
        patch = value as number;
      return validateWildfire({
        ...state,
        custom: 1,
        patches: patches.includes(patch)
          ? patches.filter((p) => p !== patch)
          : [...patches, patch].sort((a, b) => a - b),
      });
    }
    if (action === "FIRE_CLEAR_PATCHES")
      return validateWildfire({ ...state, custom: 1, patches: [] });
    if (action === "FIRE_SET_CUSTOM")
      return validateWildfire({ ...state, custom: value });
    const next = wildfireBase.apply(
      { coverage: state.coverage, wind: state.wind, moisture: state.moisture },
      action,
      value,
    );
    return validateWildfire({
      ...state,
      ...next,
      ...(action === "FIRE_SET_COVERAGE" ? { custom: 0, patches: [] } : {}),
    });
  },
};
const foodWebBase = comparisonModel({
  namespace: "ecology",
  name: "FoodWeb",
  title: "Food-web connections",
  presentation: "ecology-food-web",
  description:
    "Explore a Yellowstone food web: 18 named animals, producers, scavengers and decomposers. Follow feeding paths and change any population.",
  assumptions: [
    "Real Yellowstone organisms and documented feeding relationships; this is a selected meadow/woodland web, not a complete park inventory. Some plant and decomposer nodes represent groups.",
    "Population indices start at 100 independently; they are not equal counts. Response weights are illustrative, not measured diet fractions or population forecasts.",
    "Two bounded response passes show direct and indirect effects. Multiple explicit interventions stay fixed; weather, competition, migration and seasonality are not simulated.",
    "Dead matter includes carrion and plant litter. Fungi return nutrients; energy dissipates rather than cycling. Source links are available for each organism.",
  ],
  fields: {
    selection: {
      initial: 12,
      max: foodWebSpecies.length - 1,
      action: "WEB_SET_SELECTION",
      label: "Explore organism",
    },
    ...Object.fromEntries(
      foodWebSpecies.map((species) => [
        species.id,
        {
          initial: 100,
          max: 150,
          action: `WEB_SET_${species.id.toUpperCase()}`,
          label: `${species.name} population`,
        },
      ]),
    ),
  },
  outputs: Object.fromEntries(
    [
      ["scene", "1", "Food-web snapshot"],
      ["selectedPopulation", "%", "Population relative to usual"],
      ["affectedCount", "organisms", "Other organisms changed"],
      ["predator", "index", "Predator population"],
      ["herbivore", "index", "Herbivore population"],
      ["producer", "index", "Producer population"],
      ["generalist", "index", "Omnivore population"],
      ["specialist", "index", "Specialist population"],
      ["decomposer", "index", "Decomposer population"],
      ["directChange", "index", "Direct · grazer change"],
      ["indirectChange", "index", "Indirect · grass change"],
      ["conclusion", "1", "Trace the cascade"],
    ].map(([key, unit, description]) => [key, { unit, description }]),
  ),
  measure: (s) => foodWebMeasure(s as unknown as FoodWebState),
});
const populationArguments = object({
  value: object({
    species: choice(...foodWebSpecies.map((s) => s.id)),
    value: num(0, 150, "index", true),
  }),
});
const foodWeb = {
  ...foodWebBase,
  actions: {
    ...foodWebBase.actions,
    WEB_SET_POPULATION: {
      arguments: populationArguments,
      description: "Change the selected organism's population",
      timing: "live" as const,
      target: "instance" as const,
    },
  },
  apply: (state: Record<string, unknown>, action: string, value?: unknown) => {
    if (action !== "WEB_SET_POPULATION")
      return foodWebBase.apply(state, action, value);
    validateValue(populationArguments, { value }, "Population change");
    const change = value as { species: string; value: number };
    return foodWebBase.apply(
      state,
      `WEB_SET_${change.species.toUpperCase()}`,
      change.value,
    );
  },
};
export const ecology: DomainContribution = {
  namespace: "ecology",
  version: 1,
  models: [nutrients, wildfire, foodWeb],
};
