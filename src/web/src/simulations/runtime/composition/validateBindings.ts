import { actions, outputSpec } from "../../components/contracts/composition";
import { optionalText, string } from "../../components/contracts/objectFields";
import type { Property } from "../../components/contracts/PropertyContract";
import type { SceneObject } from "../../components/traits/SceneObjects";
import { choice, num, object, validateValue } from "../parameterSchema";
import type { Measurement, SceneControl } from "./types";
export const controlSchema = object(
  {
    id: string,
    target: optionalText,
    property: optionalText,
    label: string,
    widget: choice("slider", "number", "toggle", "button"),
    min: num(-10000, 10000),
    max: num(-10000, 10000),
    step: num(0.001, 10000),
    slot: choice("primary", "details"),
    binding: choice("property", "action"),
    fixed: object({ factor: num(2, 12, "", true) }, ["factor"]),
    unit: optionalText,
  },
  ["binding", "fixed", "unit"],
);
export function validateControlShape(c: SceneControl) {
  validateValue(controlSchema, c, "Control");
  if (c.min >= c.max || c.step > c.max - c.min)
    throw new Error("Control minimum, maximum and step are incompatible");
  if (c.binding && (c.binding === "action") !== (c.widget === "button"))
    throw new Error("Incompatible control binding kind");
  if (c.widget !== "button" && c.fixed !== undefined)
    throw new Error("Property controls do not accept action arguments");
}
export function validatePropertyUnit(c: SceneControl, p: Property | undefined) {
  if (c.unit !== undefined && c.unit !== (p?.unit ?? ""))
    throw new Error("Control unit is incompatible");
  if (
    p?.integer &&
    (!Number.isInteger(c.min) ||
      !Number.isInteger(c.max) ||
      !Number.isInteger(c.step))
  )
    throw new Error("Partition controls require integer ranges and steps");
}
export function validateActionBinding(
  c: SceneControl,
  o: SceneObject | undefined,
) {
  const spec = actions(o)[c.property];
  if (!spec || (c.property === "reset" && o))
    throw new Error("Unsupported action binding");
  validateValue(spec.schema, c.fixed ?? {}, "Action arguments");
  if (c.unit !== undefined && c.unit !== "")
    throw new Error("Action buttons do not accept units");
}
export function validateMeasurementUnit(
  m: Measurement,
  o: SceneObject | undefined,
) {
  if (m.unit !== undefined && m.unit !== outputSpec(o, m.output).unit)
    throw new Error("Measurement unit is incompatible");
}
