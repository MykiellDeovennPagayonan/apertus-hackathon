import { boolean, choice, num, object } from "../contracts/parameterSchema";
import type { ComponentDefinition } from "../contracts/objects/ComponentDefinition";
import { numericProperty } from "../contracts/objects/numericField";
import { base, position } from "../contracts/objects/objectFields";
import { entrance } from "../../legacy/components/systems/BuildingGeometrySystem";

const buildingSchema = object({
  ...base,
  kind: choice("building"),
  x: position,
  z: position,
  width: num(1, 30),
  depth: num(1, 30),
  height: num(0.5, 30),
  entrance: choice("north", "south", "east", "west"),
  obstacle: boolean,
});
export const BuildingDefinition: ComponentDefinition<"building"> = {
  id: "prefabs/AuthoredBuilding",
  kind: "building",
  label: "House",
  description: "An independent building, entrance and destination.",
  space: "town",
  schema: buildingSchema,
  properties: {
    x: numericProperty(buildingSchema, "x", "X position", 0.5),
    z: numericProperty(buildingSchema, "z", "Z position", 0.5),
  },
  outputContracts: {
    entrance: { label: "Entrance position", type: "point", unit: "" },
  },
  observe: (o) => entrance(o),
  create: (id) => ({
    id,
    label: "House",
    kind: "building",
    color: "#d7c9aa",
    x: 0,
    z: 0,
    width: 5,
    depth: 5,
    height: 4,
    entrance: "south",
    obstacle: true,
  }),
  presentation: [],
  state: [],
  visual: "BuildingVisual3D",
  view: "AuthoredTownView",
};
