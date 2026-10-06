import { choice, num, object } from "../../runtime/parameterSchema";
import type { ComponentDefinition } from "../contracts/ComponentDefinition";
import { base } from "../contracts/objectFields";

export const GroundDefinition: ComponentDefinition<"ground"> = {
  id: "prefabs/AuthoredGround",
  kind: "ground",
  label: "Ground",
  description: "A walkable surface with editable dimensions and color.",
  space: "town",
  schema: object({
    ...base,
    kind: choice("ground"),
    width: num(4, 100),
    depth: num(4, 100),
  }),
  properties: {},
  outputContracts: { area: { label: "Ground area", type: "number", unit: "" } },
  observe: (o) => o.width * o.depth,
  create: (id) => ({
    id,
    label: "Ground",
    kind: "ground",
    color: "#91a87b",
    width: 48,
    depth: 40,
  }),
  presentation: [],
  state: [],
  visual: "GroundVisual3D",
  view: "AuthoredTownView",
};
