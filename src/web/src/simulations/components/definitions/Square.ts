import { boolean, choice, num, object } from "../../runtime/parameterSchema";
import type { ComponentDefinition } from "../contracts/ComponentDefinition";
import { numericProperty } from "../contracts/numericField";
import { base, point } from "../contracts/objectFields";
import { squareMetrics } from "../systems/SquareGeometrySystem";

const squareSchema = object({
  ...base,
  kind: choice("square"),
  center: point,
  side: num(0.1, 100),
  rotation: num(-360, 360),
  fill: boolean,
  opacity: num(0, 1),
  width: num(0.5, 16),
  draggable: boolean,
});
export const SquareDefinition: ComponentDefinition<"square"> = {
  id: "prefabs/AuthoredSquare",
  kind: "square",
  label: "Square",
  description: "A square with size, rotation, fill and outline settings.",
  space: "cartesian",
  schema: squareSchema,
  properties: {
    side: numericProperty(squareSchema, "side", "Side length", 0.1),
    rotation: numericProperty(squareSchema, "rotation", "Rotation", 1),
    fill: { label: "Filled", min: 0, max: 1, step: 1, toggle: true },
  },
  outputContracts: {
    area: { label: "Area", type: "number", unit: "" },
    perimeter: { label: "Perimeter", type: "number", unit: "" },
    side: { label: "Side length", type: "number", unit: "" },
  },
  observe: (o, output) =>
    squareMetrics(o.side)[output as "area" | "perimeter" | "side"],
  create: (id) => ({
    id,
    label: "Square",
    color: "#4367b2",
    kind: "square",
    center: { x: 0, y: 0 },
    side: 3,
    rotation: 0,
    fill: false,
    opacity: 0.3,
    width: 3,
    draggable: true,
  }),
  presentation: ["width", "opacity", "draggable"],
  state: [],
  visual: "SquareVisual",
  view: "CartesianView",
};
