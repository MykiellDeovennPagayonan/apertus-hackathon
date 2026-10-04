import { FractionBar } from "../../components/prefabs/MathBoards";
import { learningPolicies } from "../../components/resources/LearningPolicies";
import { updateFractionBar } from "../../components/systems/FractionBuilderSystem";
import { gasInputSchema } from "../../components/traits/GasState";
import {
  boolean,
  choice,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
import type {
  FractionObject,
  GasObject,
  ObjectKind,
  Property,
  SceneObject,
} from "./model";

export const sceneKinds = {
  line: "cartesian",
  town: "town",
  gas: "physical",
  fractions: "diagram",
} as const;
export const canvasNames = {
  cartesian: "Cartesian plane",
  town: "3D scene",
  physical: "Physical canvas",
  diagram: "Diagram canvas",
};
export const objectSpaces: Record<ObjectKind, string> = {
  line: "cartesian",
  square: "cartesian",
  ground: "town",
  building: "town",
  road: "town",
  person: "town",
  gas: "physical",
  "fraction-bar": "diagram",
};
const text = { type: "string", maxLength: 100 } as const;
export const displaySchema = object({
  x: num(-100, 100),
  y: num(-100, 100),
  width: num(5, 100),
  height: num(5, 100),
});
const base = {
  id: text,
  label: text,
  color: { type: "string", maxLength: 7 } as const,
  display: displaySchema,
};
export const domainSchemas = {
  gas: object({
    ...base,
    kind: choice("gas"),
    inputs: gasInputSchema,
    particles: boolean,
  }),
  "fraction-bar": object({
    ...base,
    kind: choice("fraction-bar"),
    shaded: { type: "array", minItems: 1, maxItems: 12, items: boolean },
    interactive: boolean,
  }),
};
export const gasProperties: Record<string, Property> = Object.fromEntries(
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
export function createDomainObject(
  kind: "gas" | "fraction-bar",
  id: string,
): GasObject | FractionObject {
  const base = {
    id,
    color: "#4367b2",
    display: { x: 10, y: 10, width: 65, height: 18 },
  };
  return kind === "gas"
    ? {
        ...base,
        kind,
        label: "Gas container",
        display: { x: 10, y: 10, width: 36, height: 50 },
        inputs: { ...learningPolicies.gas },
        particles: true,
      }
    : {
        ...base,
        kind,
        label: "Fraction bar",
        shaded: [true, false],
        interactive: true,
      };
}
export function fractionValue(o: FractionObject) {
  return { n: o.shaded.filter(Boolean).length, d: o.shaded.length };
}
/** Delegate operations to the existing exact fraction system, staging before mutation. */
export function fractionAction(
  o: FractionObject,
  action: string,
  value: unknown,
) {
  const bar = FractionBar(o.id, fractionValue(o).n, o.shaded.length);
  bar.shaded = [...o.shaded];
  o.shaded = [...updateFractionBar(bar, { type: action, value }).shaded];
}
export const actionSpecs = {
  subdivide: {
    label: "Subdivide",
    schema: object({ factor: num(2, 12, "", true) }),
    defaults: { factor: 2 },
  },
  reset: { label: "Reset", schema: object({}), defaults: {} },
};
export type ActionSpec = {
  label: string;
  schema: ParameterSchema;
  defaults: { factor?: number };
};
export function actions(
  o: SceneObject | undefined,
): Record<string, ActionSpec> {
  return o?.kind === "fraction-bar"
    ? { subdivide: actionSpecs.subdivide }
    : !o
      ? { reset: actionSpecs.reset }
      : {};
}
export function applyAction(o: SceneObject, key: string, args: unknown) {
  const spec = actions(o)[key];
  if (!spec || o.kind !== "fraction-bar")
    throw new Error("Unsupported action target");
  validateValue(spec.schema, args, "Action arguments");
  fractionAction(o, "SUBDIVIDE_FRACTION", {
    bar: 0,
    ...(args as { factor: number }),
  });
}
export type OutputSpec = {
  type: "number" | "fraction" | "text" | "point" | "boolean";
  unit: string;
};
export function outputSpec(
  o: SceneObject | undefined,
  key: string,
): OutputSpec {
  if (o?.kind === "gas") return { type: "number", unit: "kPa" };
  if (o?.kind === "fraction-bar")
    return {
      type:
        key === "fraction" ? "fraction" : key === "decimal" ? "number" : "text",
      unit: "",
    };
  if (key === "intersection" || key === "position" || key === "entrance")
    return { type: "point", unit: "" };
  if (["equation", "status", "closed"].includes(key))
    return { type: key === "closed" ? "boolean" : "text", unit: "" };
  return { type: "number", unit: "" };
}
export const isPairOutput = (key: string) =>
  key === "intersection" || key === "comparison";
export const pairKind = (key: string) =>
  key === "intersection" ? "line" : "fraction-bar";
