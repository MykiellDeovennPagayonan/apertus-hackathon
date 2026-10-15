import type { ComponentInstance } from "../creation-and-editing/authoring-engine/document";
import { requireValue } from "../creation-and-editing/authoring-engine/requireValue";
import {
  IMPORTED_HTML,
  importedDefinition,
} from "../creation-and-editing/runtime-engine/imported/contract";
import { applyExplorationTeaching } from "../legacy/components/catalog/explorationTeaching";
import type { PublicDefinition } from "./contracts/publicDefinition";
import { canvasesDefinitions } from "./definitions/canvases";
import { controlsDefinitions } from "./definitions/controls";
import { displaysDefinitions } from "./definitions/displays";
import { definitionDiscovery } from "./discovery";
import { legacyDefinitions } from "./legacyDefinitions";
import { domainDefinitions } from "./models/domainModels";
import { objectDefinitions } from "./objects/publicDefinitions";

const definitions = new Map<string, PublicDefinition>();
function register(definition: PublicDefinition) {
  if (definitions.has(definition.id))
    throw new Error(`Duplicate public definition ${definition.id}`);
  definitions.set(definition.id, structuredClone(definition));
}
for (const definition of [
  ...controlsDefinitions,
  ...displaysDefinitions,
  ...canvasesDefinitions,
  ...objectDefinitions,
  ...domainDefinitions,
  ...legacyDefinitions,
])
  register(definition);
export const publicDefinitions: ReadonlyMap<string, PublicDefinition> =
  definitions;
export function publicDefinition(
  identity: string | ComponentInstance,
  version = 1,
): PublicDefinition {
  const id = typeof identity === "string" ? identity : identity.definition;
  if (typeof identity !== "string") version = identity.version;
  if (id === IMPORTED_HTML) {
    if (version !== 1)
      throw new Error("Unsupported imported component version");
    return importedDefinition(
      typeof identity === "string" ? undefined : identity,
    );
  }
  const d = publicDefinitions.get(id);
  if (!d) throw new Error(`${id}: unknown public component`);
  if (d.version !== version)
    throw new Error(`${id}: unsupported version ${version}`);
  return d;
}
requireValue(definitions.get("layout/Repeater")).inputs = {
  value: { kind: "dataset", unit: "*", optional: true, crossScope: true },
};
for (const id of [
  "prefabs/AuthoredGround",
  "prefabs/AuthoredBuilding",
  "prefabs/AuthoredRoad",
  "prefabs/AuthoredPerson",
]) {
  const def = publicDefinition(id);
  def.outputs.data = { kind: "value", unit: "town/object" };
  if (id === "prefabs/AuthoredPerson" && def.configuration.type === "object") {
    const schedule = def.configuration.properties.schedule;
    if (schedule.type === "array" && schedule.items.type === "object")
      schedule.items.properties.target = {
        type: "string",
        minLength: 0,
        maxLength: 160,
      };
  }
  if (id === "prefabs/AuthoredPerson")
    def.configurationReferences = {
      "schedule.*.target": "prefabs/AuthoredBuilding",
    };
}
publicDefinition("canvases/town").inputs.timeline = {
  kind: "attachment",
  unit: "town/timeline",
  optional: true,
};
applyExplorationTeaching(definitions);
for (const definition of publicDefinitions.values()) {
  definition.discovery = definitionDiscovery(definition);
  if (definition.description === definition.title)
    definition.description = definition.discovery.summary;
}
function freezeDefinition(value: unknown) {
  if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
  for (const child of Object.values(value)) freezeDefinition(child);
  Object.freeze(value);
}
for (const definition of definitions.values()) freezeDefinition(definition);
