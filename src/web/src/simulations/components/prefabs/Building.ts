import type { Building as BuildingData } from "../traits/Building";
export function Building(id: string, configuration: BuildingData) {
  const building = { ...structuredClone(configuration), id };
  const entrance =
    building.kind === "square"
      ? { x: building.x, z: building.z + 3.4 }
      : {
          x: building.x,
          z: building.z + (building.z > 0 ? -1 : 1) * (building.d / 2 + 1.1),
        };
  const obstacle =
    building.kind === "square"
      ? null
      : {
          x: building.x,
          z: building.z,
          halfWidth: building.w / 2 + 0.1,
          halfDepth: building.d / 2 + 0.1,
        };
  return { id, building, entrance, obstacle, visual: "BuildingVisual3D" };
}
