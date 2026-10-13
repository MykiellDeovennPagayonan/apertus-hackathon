import type { ReactNode } from "react";
import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import { BoxPackingScene } from "./BoxPackingScene";
import { CanPackagingScene } from "./CanPackagingScene";
import { CubeNetScene } from "./CubeNetScene";
import { FencedGardenScene } from "./FencedGardenScene";
import { PlaceValueScene } from "./PlaceValueScene";
import { PythagoreanScene } from "./PythagoreanScene";
import { RegularTilingScene } from "./RegularTilingScene";
import { RigidMotionScene } from "./RigidMotionScene";
import { ScaleDrawingScene } from "./ScaleDrawingScene";
import { TreeHeightScene } from "./TreeHeightScene";

/** Presentation id → scene for plan 028 MATH-01–10 (A1). */
export const mathGeometryAppearances: Record<
  string,
  (props: { instance: ModelInstance }) => ReactNode
> = {
  "math-place-value": PlaceValueScene,
  "math-pythagorean": PythagoreanScene,
  "math-tree-height": TreeHeightScene,
  "math-scale-drawing": ScaleDrawingScene,
  "math-rigid-motion": RigidMotionScene,
  "math-tiling": RegularTilingScene,
  "math-cube-net": CubeNetScene,
  "math-can": CanPackagingScene,
  "math-box-packing": BoxPackingScene,
  "math-fencing": FencedGardenScene,
};
