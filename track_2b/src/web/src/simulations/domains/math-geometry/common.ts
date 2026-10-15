import type { DomainModel } from "../../registry/contracts/domainContribution";
import { object, type ParameterSchema } from "../../registry/contracts/parameterSchema";

type Action = DomainModel["actions"][string];

export function geometryDependencies(
  prefab: string,
): DomainModel["dependencies"] {
  return {
    resources: [],
    traits: [],
    behaviors: [],
    systems: [],
    visuals: [],
    views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
    controls: ["AssemblyControls"],
    prefabs: [prefab],
    compositions: [],
  };
}

/** Button-style action: controls/Button always submits an empty object. */
export function buttonAction(description: string): Action {
  return {
    arguments: object({}),
    description,
    timing: "live",
    target: "instance",
  };
}

export function valueAction(
  schema: ParameterSchema,
  description: string,
): Action {
  return {
    arguments: object({ value: schema }),
    description,
    timing: "live",
    target: "instance",
  };
}

export const round = (value: number, places = 2) =>
  Number(value.toFixed(places));
