import { boolean, choice, num, object } from "../contracts/parameterSchema";
import type { ComponentDefinition } from "../contracts/objects/ComponentDefinition";
import { base, position } from "../contracts/objects/objectFields";

export const RoadDefinition: ComponentDefinition<"road"> = {
  id: "prefabs/AuthoredRoad",
  kind: "road",
  label: "Road",
  description: "A rectangular road that can be open or closed.",
  space: "town",
  schema: object({
    ...base,
    kind: choice("road"),
    x: position,
    z: position,
    width: num(0.5, 100),
    depth: num(0.5, 100),
    closed: boolean,
  }),
  properties: {
    closed: { label: "Road closed", min: 0, max: 1, step: 1, toggle: true },
  },
  outputContracts: {
    closed: { label: "Road state", type: "boolean", unit: "" },
  },
  observe: (o) => (o.closed ? "Closed" : "Open"),
  create: (id) => ({
    id,
    label: "Road",
    kind: "road",
    color: "#aaa79c",
    x: 0,
    z: -6,
    width: 30,
    depth: 3,
    closed: false,
  }),
  presentation: [],
  state: [],
  visual: "RoadVisual3D",
  view: "AuthoredTownView",
};
