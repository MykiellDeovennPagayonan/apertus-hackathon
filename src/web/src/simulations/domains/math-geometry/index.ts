import type { DomainContribution } from "../../registry/contracts/domainContribution";
import { boxPackingModel } from "./boxPacking";
import { canPackagingModel } from "./canPackaging";
import { cubeNetModel } from "./cubeNet";
import { fencedGardenModel } from "./fencedGarden";
import { placeValueModel } from "./placeValue";
import { pythagoreanModel } from "./pythagorean";
import { regularTilingModel } from "./regularTiling";
import { rigidMotionModel } from "./rigidMotion";
import { scaleDrawingModel } from "./scaleDrawing";
import { treeHeightModel } from "./treeHeight";

/** Plan 028 MATH-01–10 (A1). Order follows the scenario IDs. */
export const mathGeometryModels = [
  placeValueModel,
  pythagoreanModel,
  treeHeightModel,
  scaleDrawingModel,
  rigidMotionModel,
  regularTilingModel,
  cubeNetModel,
  canPackagingModel,
  boxPackingModel,
  fencedGardenModel,
] as const;

export const mathGeometry: DomainContribution = {
  namespace: "math-geometry",
  version: 1,
  models: mathGeometryModels,
};

/** Presentation adapters implemented in views/math-geometry. */
export const mathGeometryPresentations: Record<string, true> =
  Object.fromEntries(mathGeometryModels.map((m) => [m.presentation, true]));

/** Absolute value setters safe to apply while a slider moves. */
export const mathGeometryLiveCommands = [
  "set:distance",
  "set:height",
  "set:observerDistance",
  "set:sightAngle",
  "set:eyeHeight",
  "set:scaleFactor",
  "set:roomWidth",
  "set:roomLength",
  "set:tileSides",
  "set:canRadius",
  "set:canVolume",
  "set:gardenWidth",
  "set:fenceLength",
] as const;
