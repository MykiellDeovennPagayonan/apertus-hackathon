import type { DomainModel } from "../registry/contracts/domainContribution";
import { num, object, validateValue } from "../registry/contracts/parameterSchema";

interface ComparisonSpec {
  namespace: string;
  name: string;
  title: string;
  presentation: string;
  description: string;
  assumptions: readonly string[];
  fields: Record<
    string,
    { initial: number; max: number; action: string; label: string }
  >;
  outputs: DomainModel["outputs"];
  measure: DomainModel["measure"];
}
/** Shared contract plumbing for bounded, absolute setters; domain calculations stay pure. */
export function comparisonModel(spec: ComparisonSpec): DomainModel {
  const properties = Object.fromEntries(
    Object.entries(spec.fields).map(([key, field]) => [
      key,
      num(0, field.max, "1", true),
    ]),
  );
  const parameters = object(properties, Object.keys(properties));
  const defaults = Object.fromEntries(
    Object.entries(spec.fields).map(([key, f]) => [key, f.initial]),
  );
  const stateSchema = object(properties);
  const validate = (state: Record<string, unknown>) => {
    validateValue(stateSchema, state, spec.title);
    return { ...state };
  };
  return {
    ref: `prefabs/${spec.namespace}/${spec.name}`,
    version: 1,
    name: spec.title,
    presentation: spec.presentation,
    description: spec.description,
    assumptions: spec.assumptions,
    maximumInstances: 4,
    requiredObservations: Object.keys(spec.outputs).filter(
      (key) => key !== "scene",
    ),
    parameters,
    defaults,
    outputs: spec.outputs,
    actions: Object.fromEntries(
      Object.entries(spec.fields).map(([key, f]) => [
        f.action,
        {
          arguments: object({ value: properties[key] }),
          description: f.label,
          timing: "live" as const,
          target: "instance" as const,
        },
      ]),
    ),
    dependencies: {
      resources: [],
      traits: [],
      behaviors: [],
      systems: [],
      visuals: [],
      views: ["AssemblyScene", "AssemblyTable"],
      controls: ["AssemblyControls"],
      prefabs: [],
      compositions: [],
    },
    initialize: (parameters) => validate({ ...defaults, ...parameters }),
    configuration: validate,
    apply: (state, action, value) => {
      const field = Object.entries(spec.fields).find(
        ([, f]) => f.action === action,
      )?.[0];
      if (!field) throw new Error("Unsupported comparison operation");
      return validate({ ...state, [field]: value });
    },
    measure: spec.measure,
  };
}
