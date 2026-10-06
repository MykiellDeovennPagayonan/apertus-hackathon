import { naturalSystemsDefaults } from "../../components/resources/natural-systems/defaults";
import {
  diffusionApply,
  diffusionConfiguration,
  diffusionInitial,
  diffusionMeasure,
  diffusionStep,
  plantApply,
  plantConfiguration,
  plantInitial,
  plantMeasure,
  plantStep,
  predatorPreyApply,
  predatorPreyConfiguration,
  predatorPreyInitial,
  predatorPreyMeasure,
  predatorPreyStep,
} from "../../components/systems/natural-systems/models";
import type {
  DomainContribution,
  DomainModel,
} from "../../runtime/contribution";
import {
  boolean,
  num,
  object,
  type ParameterSchema,
} from "../../runtime/parameterSchema";

const action = (
  value: ParameterSchema | undefined,
  description: string,
  timing: "live" | "relaunch" = "live",
) => ({
  arguments: object(value ? { value } : {}),
  description,
  timing,
  target: "instance" as const,
});
const dependencies = (name: string, system: string) => ({
  resources: ["natural-systems/EducationalDefaults"],
  traits: [`natural-systems/${name}State`],
  behaviors: [],
  systems: [`natural-systems/${system}`],
  visuals: [`natural-systems/${name}Visual`],
  views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
  controls: ["AssemblyControls"],
  prefabs: [`natural-systems/${name}`],
  compositions: [],
});
const output = (unit: string, description: string) => ({ unit, description });

export const diffusion: DomainModel = {
  ref: "prefabs/natural-systems/DiffusionField",
  version: 1,
  name: "Dye diffusion in water",
  description:
    "A central dye deposit spreads through a bounded square concentration field under Fickian diffusion. Compare coefficients at equal simulation times.",
  assumptions: [
    "A conservative square-grid finite-volume method uses no-flux boundaries. The internal step enforces D Δt/Δx² ≤ 0.24.",
    "This models diffusion in still water, not stirring or fluid flow. Color is derived from the authoritative field; numeric probes show concentrations.",
  ],
  parameters: object(
    {
      diffusionCoefficient: num(0.001, 1, "m^2/s"),
      width: num(0.1, 10, "m"),
      gridSize: num(9, 15, "cells", true),
      dyeMass: num(0.001, 100, "mass units"),
      duration: num(0.1, 60, "s"),
    },
    ["diffusionCoefficient", "width", "gridSize", "dyeMass", "duration"],
  ),
  defaults: { ...naturalSystemsDefaults.diffusion },
  outputs: {
    diffusionCoefficient: output("m^2/s", "Current diffusion coefficient"),
    comparisonCoefficient: output("m^2/s", "Comparison coefficient"),
    elapsed: output("s", "Simulation time"),
    totalMass: output("mass units", "Conserved dye mass"),
    centerConcentration: output("mass units/m^2", "Center probe"),
    midwayConcentration: output("mass units/m^2", "Midway probe"),
    edgeConcentration: output("mass units/m^2", "Edge probe"),
    comparisonCenter: output("mass units/m^2", "Comparison center probe"),
    stableTimestep: output("s", "Maximum internal timestep"),
    field: output("mass units/m^2", "Concentration field"),
    gridSize: output("cells", "Grid width"),
    playing: output("1", "Run is playing"),
  },
  requiredObservations: [
    "totalMass",
    "centerConcentration",
    "midwayConcentration",
    "edgeConcentration",
    "field",
    "elapsed",
  ],
  actions: {
    DIFF_SCALE_COEFFICIENT: action(
      num(0.1, 10, "multiplier"),
      "Multiply the diffusion coefficient and restart current and comparison runs from the identical central deposit",
      "relaunch",
    ),
    DIFF_SET_COEFFICIENT: action(
      num(0.001, 1, "m^2/s"),
      "Set the positive diffusion coefficient and restart an equal-time comparison",
      "relaunch",
    ),
    DIFF_SET_PLAYING: action(
      boolean,
      "Play or pause on the shared simulation clock",
    ),
    DIFF_RESTART: action(
      undefined,
      "Restart both coefficient runs from the identical deposit",
      "relaunch",
    ),
    DIFF_STEP: action(undefined, "Advance a paused run by 0.25 seconds"),
  },
  dependencies: dependencies("Diffusion", "ConservativeDiffusionSystem"),
  presentation: "natural-diffusion",
  maximumInstances: 2,
  initialize: diffusionInitial,
  apply: diffusionApply,
  measure: diffusionMeasure,
  configuration: diffusionConfiguration,
  step: diffusionStep,
};

export const predatorPrey: DomainModel = {
  ref: "prefabs/natural-systems/PredatorPrey",
  version: 1,
  name: "Fox and rabbit populations",
  presentation: "natural-predator-prey",
  maximumInstances: 3,
  description:
    "A Lotka–Volterra continuous population model for rabbits and foxes, integrated with fixed-step fourth-order Runge–Kutta. Compare initial rabbit populations while preserving all rates.",
  assumptions: [
    "Simplified continuous populations in model days; fractional values are meaningful model state rather than rounded animal counts.",
    "This idealized model omits carrying capacity, seasons, age structure and randomness. It does not imply every future fox value is lower when rabbits start lower.",
  ],
  parameters: object(
    {
      initialRabbits: num(0, 1000, "population"),
      initialFoxes: num(0, 1000, "population"),
      rabbitGrowth: num(0, 5, "1/day"),
      predationRate: num(0, 1, "1/(population day)"),
      conversionRate: num(0, 1, "1/(population day)"),
      foxDeathRate: num(0, 5, "1/day"),
      duration: num(1, 365, "days"),
      integrationStep: num(0.001, 0.1, "days"),
    },
    [
      "initialRabbits",
      "initialFoxes",
      "rabbitGrowth",
      "predationRate",
      "conversionRate",
      "foxDeathRate",
      "duration",
      "integrationStep",
    ],
  ),
  defaults: { ...naturalSystemsDefaults.predatorPrey },
  outputs: {
    elapsed: output("days", "Model time"),
    rabbits: output("population", "Rabbit population"),
    foxes: output("population", "Fox population"),
    rabbitDerivative: output("population/day", "Current rabbit change"),
    foxDerivative: output("population/day", "Current fox change"),
    initialRabbitDerivative: output("population/day", "Initial rabbit change"),
    initialFoxDerivative: output("population/day", "Initial fox change"),
    comparisonInitialRabbits: output(
      "population",
      "Comparison starting rabbits",
    ),
    points: output("population", "Current population series"),
    comparisonPoints: output("population", "Comparison population series"),
    playing: output("1", "Run is playing"),
  },
  requiredObservations: [
    "rabbits",
    "foxes",
    "initialRabbitDerivative",
    "initialFoxDerivative",
    "points",
    "elapsed",
  ],
  graphOutput: "points",
  actions: {
    ECO_SET_INITIAL_RABBITS: action(
      num(0, 1000, "population"),
      "Set initial rabbits, retain foxes and rates, and restart a comparison",
      "relaunch",
    ),
    ECO_SCALE_INITIAL_RABBITS: action(
      num(0, 10, "multiplier"),
      "Multiply initial rabbits, retain foxes and rates, and restart a comparison",
      "relaunch",
    ),
    ECO_SET_PLAYING: action(
      boolean,
      "Play or pause on the shared simulation clock",
    ),
    ECO_RESTART: action(undefined, "Restart both population runs", "relaunch"),
    ECO_STEP: action(undefined, "Advance a paused run by 0.25 model days"),
  },
  dependencies: dependencies("PredatorPrey", "LotkaVolterraSystem"),
  initialize: predatorPreyInitial,
  apply: predatorPreyApply,
  measure: predatorPreyMeasure,
  configuration: predatorPreyConfiguration,
  step: predatorPreyStep,
};

export const plantGrowth: DomainModel = {
  ref: "prefabs/natural-systems/PlantGrowth",
  version: 1,
  name: "Plant limiting resources",
  presentation: "natural-plant-growth",
  maximumInstances: 3,
  description:
    "A bounded educational resource-response model where the least available normalized resource limits linear illustrative biomass growth.",
  assumptions: [
    "Illustrative growth dB/dt = gmax × min(light, water, nutrients), with every availability normalized from 0 to 1.",
    "Biomass units are illustrative and not species-specific measurements or a crop forecast. Resources remain fixed during a run.",
  ],
  parameters: object(
    {
      initialBiomass: num(0, 1000, "illustrative biomass units"),
      maximumGrowthRate: num(0, 100, "illustrative biomass units/day"),
      light: num(0, 1, "normalized"),
      water: num(0, 1, "normalized"),
      nutrients: num(0, 1, "normalized"),
      duration: num(0.1, 365, "days"),
    },
    [
      "initialBiomass",
      "maximumGrowthRate",
      "light",
      "water",
      "nutrients",
      "duration",
    ],
  ),
  defaults: { ...naturalSystemsDefaults.plantGrowth },
  outputs: {
    elapsed: output("days", "Model time"),
    biomass: output("illustrative biomass units", "Illustrative biomass"),
    growthRate: output("illustrative biomass units/day", "Current growth rate"),
    comparisonGrowthRate: output(
      "illustrative biomass units/day",
      "Previous-light growth rate",
    ),
    comparisonLight: output("normalized", "Previous light"),
    limitingResources: output("resource names", "Limiting resources"),
    points: output("illustrative biomass units", "Current biomass series"),
    comparisonPoints: output(
      "illustrative biomass units",
      "Previous-light biomass series",
    ),
    playing: output("1", "Run is playing"),
  },
  requiredObservations: [
    "biomass",
    "growthRate",
    "limitingResources",
    "points",
    "elapsed",
  ],
  graphOutput: "points",
  actions: {
    PLANT_SET_LIGHT: action(
      num(0, 1, "normalized"),
      "Set light while preserving water and nutrients, then restart a comparison; when a learner asks for more light without a quantity, use the educational comparison value 0.9",
      "relaunch",
    ),
    PLANT_SET_WATER: action(
      num(0, 1, "normalized"),
      "Set water and restart the run",
      "relaunch",
    ),
    PLANT_SET_NUTRIENTS: action(
      num(0, 1, "normalized"),
      "Set nutrients and restart the run",
      "relaunch",
    ),
    PLANT_SET_PLAYING: action(
      boolean,
      "Play or pause on the shared simulation clock",
    ),
    PLANT_RESTART: action(
      undefined,
      "Restart at the current resources",
      "relaunch",
    ),
    PLANT_STEP: action(undefined, "Advance a paused run by 0.25 model days"),
  },
  dependencies: dependencies("PlantGrowth", "LimitingResourceSystem"),
  initialize: plantInitial,
  apply: plantApply,
  measure: plantMeasure,
  configuration: plantConfiguration,
  step: plantStep,
};

export const naturalSystems: DomainContribution = {
  namespace: "natural-systems",
  version: 1,
  models: [diffusion, predatorPrey, plantGrowth],
};
