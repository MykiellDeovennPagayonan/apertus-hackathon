import type { PublicDefinition } from "../../runtime/authoring/types";
import { object } from "../../runtime/parameterSchema";
export const operationDefinitions: PublicDefinition[] = [
  {
    id: "operations/LineIntersection",
    title: "Line intersection",
    model: "prefabs/AuthoredLine",
    unit: "",
  },
  {
    id: "operations/FractionComparison",
    title: "Fraction comparison",
    model: "prefabs/AuthoredFractionBar",
    unit: "",
  },
].map((o) => ({
  id: o.id,
  version: 1,
  title: o.title,
  description: o.title,
  category: "behaviors",
  tags: ["mathematics", "comparison"],
  configuration: object({}),
  defaults: {},
  inputs: {
    first: { kind: "attachment", unit: o.model },
    second: { kind: "attachment", unit: o.model },
  },
  outputs: { result: { kind: "value", unit: o.unit, crossScope: true } },
  commands: {},
  placement: ["logic"],
  lifecycle: {
    authored: [],
    presentation: [],
    clock: false,
    reset: "authored",
    capture: false,
  },
  assumptions: [],
  runtimeProvider: o.id,
}));
