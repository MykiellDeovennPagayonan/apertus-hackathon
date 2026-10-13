import { requireValue } from "../../creation-and-editing/authoring-engine/requireValue";
import { mathAnalysisLiveCommands } from "../../legacy/components/catalog/mathAnalysis";
import {
  acidBaseTitrationTeaching,
  beerLambertTeaching,
  conservationTeaching,
  costAndProfitTeaching,
  galvanicCellTeaching,
  gasEquilibriumTeaching,
  marketEquilibriumTeaching,
  monopolyPricingTeaching,
  phaseChangeTeaching,
  priceElasticityTeaching,
  tradeAndTariffsTeaching,
} from "../../legacy/components/catalog/teaching";
import { assemblyModels } from "../../legacy/runtime/assembly";
import { liveExplorationCommands } from "../contracts/interactionPolicy";
import { object } from "../contracts/parameterSchema";
import type { Port, PublicDefinition } from "../contracts/publicDefinition";

const domainTeachingMap: Record<string, PublicDefinition["teaching"]> = {
  "prefabs/economics/MarketEquilibrium": marketEquilibriumTeaching,
  "prefabs/economics/PriceElasticity": priceElasticityTeaching,
  "prefabs/economics/CostAndProfit": costAndProfitTeaching,
  "prefabs/economics/TradeAndTariffs": tradeAndTariffsTeaching,
  "prefabs/economics/MonopolyPricing": monopolyPricingTeaching,
  "prefabs/chemistry/AcidBaseTitration": acidBaseTitrationTeaching,
  "prefabs/chemistry/GasEquilibrium": gasEquilibriumTeaching,
  "prefabs/chemistry/PhaseChange": phaseChangeTeaching,
  "prefabs/chemistry/BeerLambert": beerLambertTeaching,
  "prefabs/chemistry/GalvanicCell": galvanicCellTeaching,
  "prefabs/chemistry/Conservation": conservationTeaching,
};
export const domainDefinitions: PublicDefinition[] = [];
const publicDefinitions = new Map<string, PublicDefinition>();
function register(definition: PublicDefinition) {
  if (publicDefinitions.has(definition.id))
    throw new Error(`Duplicate domain definition ${definition.id}`);
  publicDefinitions.set(definition.id, definition);
  domainDefinitions.push(definition);
}
function publicDefinition(id: string) {
  return requireValue(publicDefinitions.get(id));
}
for (const m of assemblyModels) {
  const fields =
    m.parameters.type === "object" ? Object.keys(m.parameters.properties) : [];
  register({
    id: m.ref,
    version: m.version,
    title: m.name,
    description: m.description,
    category: "models",
    tags: [m.ref.split("/")[1], m.presentation, ...(m.tags ?? [])],
    teaching: domainTeachingMap[m.ref],
    configuration: m.parameters,
    defaults: m.defaults,
    inputs: {},
    outputs: Object.fromEntries(
      Object.entries(m.outputs).map(([key, o]) => [
        key,
        {
          kind: /points|series/i.test(key)
            ? "dataset"
            : /grid/i.test(key)
              ? "grid"
              : "value",
          unit: o.unit,
          description: o.description,
          ...(o.schema ? { schema: o.schema } : {}),
          crossScope: true,
        } as Port,
      ]),
    ),
    commands: {
      ...Object.fromEntries(
        Object.entries(m.actions).map(([key, command]) => [
          key,
          liveExplorationCommands.has(key) || mathAnalysisLiveCommands.has(key)
            ? { ...command, submission: "continuous" as const }
            : command,
        ]),
      ),
      RESET: {
        arguments: object({}),
        timing: "rebuild",
        description: "Restore this instance's authored starting configuration",
      },
    },
    placement: ["logic"],
    lifecycle: {
      authored: fields,
      presentation: [],
      clock: Boolean(m.step),
      reset: "authored",
      capture: Boolean(m.configuration),
    },
    assumptions: m.assumptions,
    runtimeProvider: m.ref,
  });
  register({
    ...requireValue(publicDefinitions.get(m.ref)),
    id: `resources/${m.ref.replaceAll("/", "-")}`,
    title: `${m.name} preset`,
    category: "resources",
    inputs: {},
    outputs: {},
    commands: {},
    runtimeProvider: undefined,
    presentationProvider: "resources/preset",
    application: { target: m.ref },
    lifecycle: { ...publicDefinition(m.ref).lifecycle, clock: false },
  });
  const id = `appearance/${m.presentation}`;
  register({
    id,
    version: 1,
    title: `${m.name} appearance`,
    learnerLayout:
      m.ref.startsWith("prefabs/biogeochemistry/") ||
      m.ref.startsWith("prefabs/collective/") ||
      m.ref.startsWith("prefabs/earth-atmosphere/") ||
      m.ref.startsWith("prefabs/math-geometry/")
        ? "scene-first"
        : undefined,
    description: m.ref.startsWith("prefabs/biogeochemistry/")
      ? `Display an attached ${m.name} model snapshot. ${m.description}`
      : `Display an attached ${m.name} model snapshot`,
    category: "appearance",
    tags: [m.ref.split("/")[1]],
    configuration:
      m.ref.startsWith("prefabs/science/") ||
      m.ref.startsWith("prefabs/biogeochemistry/")
        ? object(
            { question: { type: "string", minLength: 0, maxLength: 180 } },
            ["question"],
          )
        : object({}),
    defaults: {},
    inputs: { model: { kind: "attachment", unit: m.ref } },
    outputs: {},
    commands: {},
    placement: ["lesson"],
    lifecycle: {
      authored:
        m.ref.startsWith("prefabs/science/") ||
        m.ref.startsWith("prefabs/biogeochemistry/")
          ? ["question"]
          : [],
      presentation: [],
      clock: false,
      reset: "authored",
      capture: false,
    },
    assumptions: m.assumptions,
    presentationProvider: id,
  });
  publicDefinition(m.ref).outputs.configuration = {
    kind: "value",
    unit: "",
    schema: m.parameters,
    crossScope: true,
  };
  publicDefinition(m.ref).outputs.appearance = {
    kind: "attachment",
    unit: m.ref,
    cardinality: "many",
  };
}
