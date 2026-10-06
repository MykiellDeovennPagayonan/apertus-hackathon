import { boolean, choice, object } from "../../runtime/parameterSchema";
import type { ComponentDefinition } from "../contracts/ComponentDefinition";
import { base, displaySchema } from "../contracts/objectFields";
import type { Property } from "../contracts/PropertyContract";
import { learningPolicies } from "../resources/LearningPolicies";
import { IdealGasSystem } from "../systems/IdealGasSystem";
import { gasInputSchema } from "../traits/GasState";

const gasProperties: Record<string, Property> = Object.fromEntries(
  Object.entries(
    gasInputSchema.type === "object" ? gasInputSchema.properties : {},
  ).map(([key, spec]) => [
    key,
    spec.type === "number" || spec.type === "integer"
      ? {
          label: {
            volume: "Volume",
            temperature: "Temperature",
            amount: "Amount of gas",
          }[key as "volume"],
          min: spec.minimum ?? 0,
          max: spec.maximum ?? 1,
          step: key === "temperature" ? 10 : key === "volume" ? 0.05 : 0.1,
          unit: spec.unit ?? "",
        }
      : {
          label: "Particle motion",
          min: 0,
          max: 1,
          step: 1,
          toggle: true,
          unit: "",
        },
  ]),
);

export const GasContainerDefinition: ComponentDefinition<"gas"> = {
  id: "prefabs/AuthoredGasContainer",
  kind: "gas",
  label: "Gas container",
  description:
    "One independent container with one gas sample, properties and pressure output.",
  space: "physical",
  schema: object({
    ...base,
    display: displaySchema,
    kind: choice("gas"),
    inputs: gasInputSchema,
    particles: boolean,
  }),
  properties: gasProperties,
  outputContracts: {
    pressureKPa: { label: "Pressure", type: "number", unit: "kPa" },
  },
  observe: (o) => IdealGasSystem(o.inputs).pressureKPa,
  readProperty: (o, key) => o.inputs[key as keyof typeof o.inputs],
  writeProperty: (o, key, value) => {
    Object.assign(o.inputs, { [key]: value });
  },
  create: (id) => ({
    id,
    kind: "gas",
    label: "Gas container",
    color: "#4367b2",
    display: { x: 10, y: 10, width: 36, height: 50 },
    inputs: { ...learningPolicies.gas },
    particles: true,
  }),
  presentation: ["display", "particles"],
  state: ["inputs"],
  visual: "GasContainerVisual",
  view: "DisplayView",
};
