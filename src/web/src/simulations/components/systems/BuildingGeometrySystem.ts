import type { BuildingObject, Point } from "../traits/SceneObjects";
export function entrance(b: BuildingObject): Point {
  const clearance = 0.8;
  return {
    x:
      b.x +
      (b.entrance === "east"
        ? b.width / 2 + clearance
        : b.entrance === "west"
          ? -b.width / 2 - clearance
          : 0),
    y:
      b.z +
      (b.entrance === "south"
        ? b.depth / 2 + clearance
        : b.entrance === "north"
          ? -b.depth / 2 - clearance
          : 0),
  };
}
