import { agentDefinitions } from "../legacy/components/catalog/agents";
import { authoringDefinitions } from "../legacy/components/catalog/authoring";
import { cycleDefinitions } from "../legacy/components/catalog/biogeochemistry";
import { collectiveDefinitions } from "../legacy/components/catalog/collective";
import { earthDefinitions } from "../legacy/components/catalog/earthAtmosphere";
import { ecologyControlDefinitions } from "../legacy/components/catalog/ecologyControls";
import { explorationDefinitions } from "../legacy/components/catalog/exploration";
import { genericDefinitions } from "../legacy/components/catalog/generic";
import {
  learningAppearances,
  learningDefinitions,
  resourceDefinitions,
} from "../legacy/components/catalog/learningModels";
import { operationDefinitions } from "../legacy/components/catalog/operations";
import { scienceDefinitions } from "../legacy/components/catalog/science";
import { spatialDefinitions } from "../legacy/components/catalog/spatial";
import type { PublicDefinition } from "./contracts/publicDefinition";
import { historicalControlDefinitions } from "./definitions/controlDefinitions";
import { base, text } from "./definitions/shared";
export const legacyDefinitions: PublicDefinition[] = [
  ...genericDefinitions,
  ...historicalControlDefinitions(base, text),
  ...ecologyControlDefinitions,
  ...scienceDefinitions,
  ...cycleDefinitions,
  ...collectiveDefinitions,
  ...earthDefinitions,
  ...agentDefinitions,
  ...explorationDefinitions,
  ...authoringDefinitions,
  ...spatialDefinitions,
  ...operationDefinitions,
  ...learningDefinitions,
  ...learningAppearances,
  ...resourceDefinitions,
];
