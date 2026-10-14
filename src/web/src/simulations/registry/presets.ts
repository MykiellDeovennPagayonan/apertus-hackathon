import { discoverableDefinition } from "./discovery";
import { publicDefinitions } from "./index";
export const presets = [...publicDefinitions.values()].filter(
  (definition) => definition.application && discoverableDefinition(definition),
);
