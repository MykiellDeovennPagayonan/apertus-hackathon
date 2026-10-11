import { thermalOptics, thermalOpticsPresentations } from "../domains/physics/thermalOptics";
import { mathAnalysis } from "../domains/math-analysis/models";
import { mechanicsPresentations } from "../domains/physics/mechanics";
import { biogeochemistry } from "../domains/biogeochemistry";
import { chemistry } from "../domains/chemistry";
import { collective } from "../domains/collective";
import { dynamicSystems } from "../domains/dynamic-systems";
import { earthAtmosphere } from "../domains/earth-atmosphere";
import { ecology } from "../domains/ecology";
import { economics } from "../domains/economics";
import { mathFoundations } from "../domains/math-foundations";
import {
  mathGeometry,
  mathGeometryPresentations,
} from "../domains/math-geometry";
import { naturalSystems } from "../domains/natural-systems";
import { physicalSystems } from "../domains/physical-systems";
import { physics } from "../domains/physics";
import { science } from "../domains/science";
import { socialSystems } from "../domains/social-systems";
import type {
  Assembly,
  DomainContribution,
  DomainModel,
  ModelInstance,
} from "./contribution";
import {
  type CompositionDefinition,
  immutable,
  type Selections,
} from "./definition";
import {
  choice,
  object,
  type ParameterSchema,
  validateValue,
} from "./parameterSchema";

/** Explicit integration list. Contributions must never mutate this registry on import. */
export const domainContributions: readonly DomainContribution[] = immutable([
  mathFoundations,
  mathAnalysis,
  mathGeometry,
  chemistry,
  physicalSystems,
  physics,
  thermalOptics,
  naturalSystems,
  dynamicSystems,
  ecology,
  socialSystems,
  science,
  biogeochemistry,
  collective,
  earthAtmosphere,
  economics,
]);
export const assemblyModels: readonly DomainModel[] =
  domainContributions.flatMap((d) => d.models);
/** Matches concrete adapters in the assembly client view. Integration adds adapters serially. */
export const assemblyPresentationContracts = {
  ...Object.fromEntries(mathAnalysis.models.map((model) => [model.presentation, true])),
  ...mechanicsPresentations,
  ...thermalOpticsPresentations,
  ...mathGeometryPresentations,
  "physics-lever": true,
  "earth-atmosphere-earthquake": true,
  "earth-atmosphere-tsunami": true,
  "earth-atmosphere-atmosphere": true,
  "earth-atmosphere-greenhouse": true,
  "earth-atmosphere-lightning": true,
  "earth-atmosphere-rainbow": true,
  "earth-atmosphere-weather": true,

  "collective-fishing": true,
  "collective-crowd": true,
  "collective-voting": true,
  "collective-selection": true,
  "cycle-oxygen": true,
  "cycle-nitrogen": true,
  "cycle-carbon": true,
  "science-cell": true,
  "science-immune": true,
  "science-genome": true,
  "science-pollination": true,
  "science-invasive": true,
  "science-earth": true,
  "science-plates": true,
  "science-volcano": true,
  "science-water": true,
  "ecology-nutrients": true,
  "ecology-wildfire": true,
  "ecology-food-web": true,
  "social-production": true,
  balance: true,
  line: true,
  circle: true,
  "chemistry-dilution": true,
  "chemistry-conservation": true,
  "chemistry-rate": true,
  "chemistry-titration": true,
  "chemistry-gas-equilibrium": true,
  "chemistry-phase-change": true,
  "chemistry-beer-lambert": true,
  "chemistry-galvanic-cell": true,
  "physical-pendulum": true,
  "physical-track": true,
  "physical-circuit": true,
  "natural-diffusion": true,
  "natural-predator-prey": true,
  "natural-plant-growth": true,
  "dynamic-growth": true,
  "dynamic-traffic": true,
  "dynamic-queue": true,
  "economics-market-equilibrium": true,
  "economics-price-elasticity": true,
  "economics-cost-and-profit": true,
  "economics-trade-and-tariffs": true,
  "economics-monopoly-pricing": true,
};
export function validateAssemblyInstances(instances: readonly ModelInstance[]) {
  for (const contribution of domainContributions)
    contribution.validateInstances?.(instances);
}
export function registeredAssemblyActions() {
  const actions: Record<string, DomainModel["actions"][string]> = {};
  const refs = new Set<string>();
  for (const model of assemblyModels) {
    if (refs.has(model.ref) || model.version !== 1)
      throw new Error("Duplicate or unsupported provider registration");
    refs.add(model.ref);
    for (const [id, op] of Object.entries(model.actions)) {
      if (
        id === "RESET" ||
        (actions[id] && JSON.stringify(actions[id]) !== JSON.stringify(op))
      )
        throw new Error(`${id}: conflicting operation registration`);
      actions[id] = op;
    }
  }
  return actions;
}
export function measureModel(
  model: DomainModel,
  state: Record<string, unknown>,
) {
  const outputs = model.measure(state);
  if (
    Object.keys(outputs).some((key) => !Object.hasOwn(model.outputs, key)) ||
    Object.keys(model.outputs).some((key) => !Object.hasOwn(outputs, key))
  )
    throw new Error(`${model.ref}: output contract mismatch`);
  let nodes = 0;
  const finite = (value: unknown, depth = 0): void => {
    if (++nodes > 500 || depth > 5)
      throw new Error("Provider output exceeds complexity limit");
    if (
      value === null ||
      (typeof value === "number" && Number.isFinite(value)) ||
      typeof value === "boolean" ||
      (typeof value === "string" && value.length <= 500)
    )
      return;
    if (Array.isArray(value) && value.length <= 30) {
      value.forEach((v) => {
        finite(v, depth + 1);
      });
      return;
    }
    if (value && typeof value === "object" && Object.keys(value).length <= 30) {
      Object.values(value).forEach((v) => {
        finite(v, depth + 1);
      });
      return;
    }
    throw new Error("Provider emitted invalid or nonfinite output");
  };
  finite(outputs);
  return outputs;
}
export function modelProvider(ref: string): DomainModel {
  const model = assemblyModels.find((m) => m.ref === ref);
  if (!model)
    throw new Error(`${ref}: unavailable implemented domain provider`);
  return model;
}
const string = { type: "string", maxLength: 100 } as const;
const list = (
  items: ParameterSchema,
  minItems: number,
  maxItems: number,
): ParameterSchema => ({ type: "array", items, minItems, maxItems });
export const assemblySchema: ParameterSchema = object({
  version: choice(1),
  title: string,
  learningGoal: { type: "string", maxLength: 500 },
  // Parameters are provider-specific and are validated in the resolution stage.
  instances: list(
    object({
      id: string,
      label: string,
      prefab: object({
        ref: choice(...assemblyModels.map((m) => m.ref)),
        version: choice(1),
      }),
      parameters: object({}),
    }),
    1,
    4,
  ),
  observations: list(
    object({ id: string, instance: string, output: string, unit: string }),
    1,
    24,
  ),
  connections: list(
    object({
      type: choice("observation-source"),
      from: object({ instance: string, output: string }),
      to: string,
    }),
    1,
    24,
  ),
  controls: list(object({ instance: string, action: string }), 1, 24),
  views: list(
    object({
      ref: choice(
        "views/AssemblyScene",
        "views/AssemblyTable",
        "views/AssemblyGraph",
      ),
      observations: list(string, 1, 24),
    }),
    1,
    3,
  ),
});
const validId = (id: string) => /^[a-z][a-zA-Z0-9/_-]{0,79}$/.test(id);
export function instantiateModel(
  id: string,
  label: string,
  provider: string,
  parameters: Record<string, unknown>,
): ModelInstance {
  const model = modelProvider(provider);
  validateValue(model.parameters, parameters, `${id}.parameters`);
  const accepted = {
    ...structuredClone(model.defaults),
    ...structuredClone(parameters),
  };
  validateValue(model.parameters, accepted, `${id}.parameters`);
  const state = model.initialize(accepted),
    outputs = measureModel(model, state);
  return { id, label, provider, parameters: accepted, state, outputs };
}
export function compileAssembly(input: Assembly): {
  definition: CompositionDefinition;
  instances: ModelInstance[];
} {
  if (JSON.stringify(input).length > 16000)
    throw new Error("Assembly exceeds 16000-byte budget");
  // Validate the whole envelope with empty parameter placeholders, then each provider schema.
  const shape = {
    ...input,
    instances: Array.isArray(input?.instances)
      ? input.instances.map((i) => ({ ...i, parameters: {} }))
      : input?.instances,
  };
  validateValue(assemblySchema, shape, "assembly");
  const ids = new Set<string>();
  const claim = (id: string) => {
    if (!validId(id) || ids.has(id))
      throw new Error(`${id}: invalid or duplicate stable identity`);
    ids.add(id);
  };
  registeredAssemblyActions();
  const instances = input.instances.map((i) => {
    claim(i.id);
    if (
      !Object.hasOwn(
        assemblyPresentationContracts,
        modelProvider(i.prefab.ref).presentation,
      )
    )
      throw new Error(`${i.id}: missing implemented presentation adapter`);
    if (i.prefab.version !== 1) throw new Error("Unsupported prefab version");
    return instantiateModel(i.id, i.label, i.prefab.ref, i.parameters);
  });
  validateAssemblyInstances(instances);
  for (const model of assemblyModels)
    if (
      instances.filter((i) => i.provider === model.ref).length >
      model.maximumInstances
    )
      throw new Error(
        `${model.ref}: exceeds maximum ${model.maximumInstances} independent objects`,
      );
  const instance = (id: string) => {
    const i = instances.find((i) => i.id === id);
    if (!i) throw new Error(`${id}: missing instance`);
    return i;
  };
  for (const o of input.observations) {
    claim(o.id);
    const i = instance(o.instance),
      output = modelProvider(i.provider).outputs[o.output];
    if (!output || output.unit !== o.unit)
      throw new Error(`${o.id}: unsupported output or invalid unit`);
    if (!Object.hasOwn(i.outputs, o.output))
      throw new Error(`${o.id}: output has no implementation`);
  }
  for (const i of instances)
    for (const output of modelProvider(i.provider).requiredObservations) {
      if (
        !input.observations.some(
          (o) => o.instance === i.id && o.output === output,
        )
      )
        throw new Error(`${i.id}: missing required observation ${output}`);
    }
  const linked = new Set<string>();
  for (const c of input.connections) {
    const o = input.observations.find((o) => o.id === c.to);
    if (
      !o ||
      linked.has(c.to) ||
      o.instance !== c.from.instance ||
      o.output !== c.from.output
    )
      throw new Error(`${c.to}: incompatible or duplicate observation binding`);
    linked.add(c.to);
  }
  if (linked.size !== input.observations.length)
    throw new Error("Missing observation source connection");
  const controls = new Set<string>();
  for (const c of input.controls) {
    const key = `${c.instance}:${c.action}`,
      i = instance(c.instance);
    if (!modelProvider(i.provider).actions[c.action] || controls.has(key))
      throw new Error(`${key}: incompatible or duplicate control`);
    controls.add(key);
  }
  // Mandatory model dependencies are compiler-resolved; mandatory learner actions cannot vanish.
  for (const i of instances)
    for (const action of Object.keys(modelProvider(i.provider).actions))
      if (!controls.has(`${i.id}:${action}`))
        throw new Error(`${i.id}: missing essential control ${action}`);
  const viewIds = new Set<string>();
  for (const v of input.views) {
    if (
      viewIds.has(v.ref) ||
      new Set(v.observations).size !== v.observations.length
    )
      throw new Error("Duplicate view binding");
    viewIds.add(v.ref);
    for (const id of v.observations) {
      const o = input.observations.find((o) => o.id === id);
      if (!o) throw new Error(`${id}: unresolved observation`);
      if (
        v.ref === "views/AssemblyGraph" &&
        modelProvider(instance(o.instance).provider).graphOutput !== o.output
      )
        throw new Error("Graph requires a registered line point dataset");
    }
  }
  if (!viewIds.has("views/AssemblyScene"))
    throw new Error("Assembly requires an implemented scene view");
  const components: Selections = {
    resources: [],
    traits: [],
    behaviors: [],
    systems: [],
    visuals: [],
    views: [],
    controls: [],
    prefabs: [],
    compositions: [],
  };
  for (const kind of Object.keys(components) as (keyof Selections)[])
    components[kind] = [
      ...new Set(
        instances.flatMap((i) => modelProvider(i.provider).dependencies[kind]),
      ),
    ];
  components.views = input.views.map((v) => v.ref.slice("views/".length));
  const definition: CompositionDefinition = {
    id: "GeneratedExperiment",
    demo: "assembly",
    version: 1,
    plane: "xy",
    units: "declared per output",
    rendering: "svg",
    layout: viewIds.has("views/AssemblyGraph")
      ? "scene-and-graph"
      : "scene-and-controls",
    viewSettings: {},
    defaults: {},
    components,
    systems: components.systems,
    instances: instances.map((i) => ({
      id: i.id,
      prefab: i.provider.slice("prefabs/".length),
      parameters: i.parameters,
    })),
    measurements: input.observations.map((o) => o.id),
    actions: [...new Set(input.controls.map((c) => c.action)), "RESET"],
    assumptions: [
      ...new Set(
        instances.flatMap((i) => modelProvider(i.provider).assumptions),
      ),
    ],
    assembly: structuredClone(input),
  };
  return { definition, instances };
}
/** Advertisement exercises the actual compiler before either model sees a capability. */
export function assemblyCapability(model: DomainModel) {
  const assembly = defaultAssembly(model.ref);
  compileAssembly(assembly);
  return {
    ref: model.ref,
    description: model.description,
    parameters: model.parameters,
    defaults: model.defaults,
    assumptions: model.assumptions,
    outputs: model.outputs,
    actions: model.actions,
    presentation: model.presentation,
    requiredObservations: model.requiredObservations,
    maximumInstances: model.maximumInstances,
    graphOutput: model.graphOutput,
  };
}
/** Object-level schema defaults used for validation/fixtures, never a prompt router. */
export function defaultAssembly(ref: string): Assembly {
  const model = modelProvider(ref),
    id = "object/first";
  const observations = Object.entries(model.outputs)
    .filter(([key]) => !["steps", "marker", "xMin", "xMax"].includes(key))
    .map(([output, info]) => ({
      id: `observe/${output}`,
      instance: id,
      output,
      unit: info.unit,
    }));
  return {
    version: 1,
    title: model.name,
    learningGoal: model.description,
    instances: [
      { id, label: model.name, prefab: { ref, version: 1 }, parameters: {} },
    ],
    observations,
    connections: observations.map((o) => ({
      type: "observation-source",
      from: { instance: id, output: o.output },
      to: o.id,
    })),
    controls: Object.keys(model.actions).map((action) => ({
      instance: id,
      action,
    })),
    views: [
      {
        ref: "views/AssemblyScene",
        observations: observations.map((o) => o.id),
      },
      {
        ref: "views/AssemblyTable",
        observations: observations.map((o) => o.id),
      },
    ],
  };
}
