import type { PublicDefinition } from "../contracts/publicDefinition";
import {
  activityControlDefinitions,
  basicControlDefinitions,
} from "./controlDefinitions";
import { base, text } from "./shared";
export const controlsDefinitions: PublicDefinition[] = [
  ...basicControlDefinitions(base, text),
  ...activityControlDefinitions(base, text),
];
