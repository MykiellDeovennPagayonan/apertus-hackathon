import { boolean, choice, object } from "../contracts/parameterSchema";
import { actionSpecs } from "../contracts/objects/ActionContract";
import type { ComponentDefinition } from "../contracts/objects/ComponentDefinition";
import { base, displaySchema } from "../contracts/objects/objectFields";
import { fractionAction } from "../../legacy/components/systems/ComposedFractionSystem";
import { observeFraction } from "../../legacy/components/systems/FractionObservationSystem";

export const FractionBarDefinition: ComponentDefinition<"fraction-bar"> = {
  id: "prefabs/AuthoredFractionBar",
  kind: "fraction-bar",
  label: "Fraction bar",
  description:
    "An independent equal-whole bar with editable partitions and shading.",
  space: "diagram",
  schema: object({
    ...base,
    display: displaySchema,
    kind: choice("fraction-bar"),
    shaded: { type: "array", minItems: 1, maxItems: 12, items: boolean },
    interactive: boolean,
  }),
  properties: {
    partitions: {
      label: "Partition count",
      min: 1,
      max: 12,
      step: 1,
      integer: true,
      unit: "",
    },
  },
  outputContracts: {
    fraction: { label: "Fraction", type: "fraction", unit: "" },
    decimal: { label: "Decimal value", type: "number", unit: "" },
    comparison: {
      label: "Comparison with another bar",
      type: "text",
      unit: "",
    },
  },
  observe: observeFraction,
  readProperty: (o) => o.shaded.length,
  writeProperty: (o, _key, value) =>
    fractionAction(o, "SET_BAR_FRACTION", {
      bar: 0,
      fraction: {
        n: Math.min(o.shaded.filter(Boolean).length, Number(value)),
        d: Number(value),
      },
    }),
  actions: { subdivide: actionSpecs.subdivide },
  applyAction: (o, _key, args) =>
    fractionAction(o, "SUBDIVIDE_FRACTION", {
      bar: 0,
      ...(args as { factor: number }),
    }),
  create: (id) => ({
    id,
    kind: "fraction-bar",
    label: "Fraction bar",
    color: "#4367b2",
    display: { x: 10, y: 10, width: 65, height: 18 },
    shaded: [true, false],
    interactive: true,
  }),
  presentation: ["display", "interactive"],
  state: ["shaded"],
  visual: "FractionBarVisual",
  view: "DisplayView",
};
