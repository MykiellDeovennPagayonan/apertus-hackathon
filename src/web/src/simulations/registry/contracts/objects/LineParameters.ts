import { num } from "../parameterSchema";
import type { Property } from "./PropertyContract";
export const lineProperties: Record<"slope" | "intercept", Property> = {
  slope: { label: "Slope", min: -20, max: 20, step: 0.1 },
  intercept: { label: "Y intercept", min: -100, max: 100, step: 0.1 },
};
export function lineParameterSchema(key: "slope" | "intercept", unit = "") {
  const p = lineProperties[key];
  return num(p.min, p.max, unit);
}
