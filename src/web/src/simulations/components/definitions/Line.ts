import { boolean, choice, num, object } from "../../runtime/parameterSchema";
import type { ComponentDefinition } from "../contracts/ComponentDefinition";
import { lineProperties } from "../contracts/LineParameters";
import { base, point } from "../contracts/objectFields";
import { lineParameters, setLineProperty } from "../systems/LineGeometrySystem";
import { observeLine } from "../systems/LineObservationSystem";

export const LineDefinition: ComponentDefinition<"line"> = {
  id: "prefabs/AuthoredLine",
  kind: "line",
  label: "Line",
  description:
    "An infinite line with draggable handles, slope, intercept and color.",
  space: "cartesian",
  schema: object({
    ...base,
    kind: choice("line"),
    a: point,
    b: point,
    width: num(0.5, 16),
    dashed: boolean,
    draggable: boolean,
  }),
  properties: lineProperties,
  outputContracts: {
    equation: { label: "Equation", type: "text", unit: "" },
    yAtZero: { label: "y at x = 0", type: "number", unit: "" },
    yAtOne: { label: "y at x = 1", type: "number", unit: "" },
    rise: { label: "Rise", type: "number", unit: "" },
    run: { label: "Run", type: "number", unit: "" },
    slope: { label: "Slope", type: "number", unit: "" },
    intercept: { label: "Y intercept", type: "number", unit: "" },
    intersection: {
      label: "Intersection with another line",
      type: "point",
      unit: "",
    },
  },
  observe: observeLine,
  readProperty: (o, key) => lineParameters(o)[key as "slope" | "intercept"],
  writeProperty: (o, key, value) => setLineProperty(o, key, Number(value)),
  create: (id) => ({
    id,
    label: "Line",
    color: "#4367b2",
    kind: "line",
    a: { x: 0, y: 0 },
    b: { x: 2, y: 2 },
    width: 3,
    dashed: false,
    draggable: true,
  }),
  presentation: ["width", "dashed", "draggable"],
  state: [],
  visual: "LineVisual",
  view: "CartesianView",
};
