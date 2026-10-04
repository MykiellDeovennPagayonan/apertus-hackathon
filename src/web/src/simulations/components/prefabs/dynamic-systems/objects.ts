import {
  growthInitial,
  queueInitial,
  trafficInitial,
} from "../../systems/dynamic-systems/models";
import type { DynamicState } from "../../traits/dynamic-systems/state";

/** Prefab instantiators return fresh instance state and never register globally. */
export const createGrowthScenario = (parameters: DynamicState) =>
  growthInitial(parameters);
export const createTrafficRing = (parameters: DynamicState) =>
  trafficInitial(parameters);
export const createCheckoutScenario = (parameters: DynamicState) =>
  queueInitial(parameters);
