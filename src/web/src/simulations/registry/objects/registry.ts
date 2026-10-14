import type { Definition } from "../../legacy/runtime/catalog";
import type { ComponentDefinition } from "../contracts/objects/ComponentDefinition";
import { BuildingDefinition } from "./Building";
import { FractionBarDefinition } from "./FractionBar";
import { GasContainerDefinition } from "./GasContainer";
import { GroundDefinition } from "./Ground";
import { LineDefinition } from "./Line";
import { PersonDefinition } from "./Person";
import { RoadDefinition } from "./Road";
import { SquareDefinition } from "./Square";
import type { ObjectKind, SceneObject } from "../../legacy/components/traits/SceneObjects";
export const componentDefinitions = {
  line: LineDefinition,
  square: SquareDefinition,
  ground: GroundDefinition,
  building: BuildingDefinition,
  road: RoadDefinition,
  person: PersonDefinition,
  gas: GasContainerDefinition,
  "fraction-bar": FractionBarDefinition,
} as const;
export function componentDefinition(kind: ObjectKind): ComponentDefinition {
  return componentDefinitions[kind] as ComponentDefinition;
}
export function registerComponentDefinitions(catalog: Map<string, Definition>) {
  for (const definition of Object.values(componentDefinitions)) {
    if (catalog.has(definition.id))
      throw new Error(`Duplicate component definition: ${definition.id}`);
    catalog.set(definition.id, {
      id: definition.id.split("/")[1],
      kind: "prefabs",
      version: 1,
      description: definition.description,
      parameters: definition.schema,
      outputs: Object.keys(definition.outputContracts).map((name) => ({
        name,
        unit: definition.outputContracts[name].unit,
        fidelity: "component operation",
      })),
      composition: definition as ComponentDefinition,
    });
  }
}
export const schemas = Object.fromEntries(
  Object.entries(componentDefinitions).map(([kind, d]) => [kind, d.schema]),
) as Record<ObjectKind, import("../contracts/parameterSchema").ParameterSchema>;
export function createObject(kind: ObjectKind, id: string): SceneObject {
  return componentDefinition(kind).create(id);
}

import type { Property } from "../contracts/objects/PropertyContract";
export const clockProperties: Record<string, Property> = {
  time: { label: "Time (hours)", min: 0, max: 24, step: 0.05 },
  playing: { label: "Play", min: 0, max: 1, step: 1, toggle: true },
  speed: { label: "Playback speed", min: 0.25, max: 8, step: 0.25 },
};
export function properties(
  o: SceneObject | undefined,
): Record<string, Property> {
  return o ? componentDefinition(o.kind).properties : clockProperties;
}
export function outputs(o: SceneObject | undefined): Record<string, string> {
  return o
    ? Object.fromEntries(
        Object.entries(componentDefinition(o.kind).outputContracts).map(
          ([key, spec]) => [key, spec.label ?? key],
        ),
      )
    : {
        time: "Time",
        population: "Spawned people",
        traveling: "People walking",
        blocked: "People without a route",
      };
}
export function propertyValue(o: SceneObject, key: string): number | boolean {
  const definition = componentDefinition(o.kind);
  return definition.readProperty
    ? definition.readProperty(o, key)
    : (o as unknown as Record<string, number | boolean>)[key];
}
export function setProperty(
  o: SceneObject,
  key: string,
  value: number | boolean,
) {
  const capabilities = properties(o);
  if (!Object.hasOwn(capabilities, key))
    throw new Error("Unsupported property");
  const spec = capabilities[key];
  if (
    !spec ||
    (spec.toggle
      ? typeof value !== "boolean"
      : typeof value !== "number" ||
        !Number.isFinite(value) ||
        value < spec.min ||
        value > spec.max ||
        (spec.integer && !Number.isInteger(value)))
  )
    throw new Error("Unsupported property or value outside its range");
  const definition = componentDefinition(o.kind);
  if (definition.writeProperty) definition.writeProperty(o, key, value);
  else (o as unknown as Record<string, unknown>)[key] = value;
}
export const objectSpaces = Object.fromEntries(
  Object.entries(componentDefinitions).map(([k, d]) => [k, d.space]),
) as Record<ObjectKind, string>;
