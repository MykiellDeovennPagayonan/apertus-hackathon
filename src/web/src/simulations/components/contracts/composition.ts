import { type ActionSpec, actionSpecs } from "./ActionContract";

export { type ActionSpec, actionSpecs } from "./ActionContract";

import { validateValue } from "../../runtime/parameterSchema";
import { componentDefinition } from "../registry";
import type { SceneObject } from "../traits/SceneObjects";
import type { OutputSpec } from "./OutputContract";
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

export function actions(
  o: SceneObject | undefined,
): Record<string, ActionSpec> {
  return o
    ? (componentDefinition(o.kind).actions ?? {})
    : { reset: actionSpecs.reset };
}
export function applyAction(o: SceneObject, key: string, args: unknown) {
  const spec = actions(o)[key];
  const definition = componentDefinition(o.kind);
  if (!spec || !definition.applyAction)
    throw new Error("Unsupported action target");
  validateValue(spec.schema, args, "Action arguments");
  definition.applyAction(o, key, args);
}
export function outputSpec(
  o: SceneObject | undefined,
  key: string,
): OutputSpec {
  if (o)
    return (
      componentDefinition(o.kind).outputContracts[key] ?? {
        type: "number",
        unit: "",
      }
    );
  return { type: "number", unit: "" };
}

export const isPairOutput = (key: string) =>
  key === "intersection" || key === "comparison";
export const pairKind = (key: string) =>
  key === "intersection" ? "line" : "fraction-bar";

export { objectSpaces } from "../registry";
export {
  fractionAction,
  fractionValue,
} from "../systems/ComposedFractionSystem";
