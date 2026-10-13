import type { DomainModel } from "../../registry/contracts/domainContribution";
import {
  boolean,
  num,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";
import { geometryDependencies, valueAction } from "./common";

const volume = num(100, 2000, "cm³");
const radius = num(1, 15, "cm");
const parameters = object({
  canVolume: volume,
  canRadius: radius,
  canClosed: boolean,
});
const fields: Record<string, string> = {
  "set:canRadius": "canRadius",
  "set:canVolume": "canVolume",
  "set:canClosed": "canClosed",
};
function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  return {
    canVolume: input.canVolume,
    canRadius: input.canRadius,
    canClosed: input.canClosed,
  };
}
export function canSurface(v: number, r: number, closed: boolean) {
  const h = v / (Math.PI * r * r);
  const wall = 2 * Math.PI * r * h;
  const ends = (closed ? 2 : 1) * Math.PI * r * r;
  return { height: h, wall, ends, total: wall + ends };
}
/** Closed: r = (V / 2π)^(1/3), h = 2r. Open (one end): r = (V / π)^(1/3), h = r. */
export function bestCan(v: number, closed: boolean) {
  const r = Math.cbrt(v / ((closed ? 2 : 1) * Math.PI));
  return { radius: r, ...canSurface(v, r, closed) };
}
export const curveRadii = { min: 1, max: 15, points: 29 };

export const canPackagingModel: DomainModel = {
  ref: "prefabs/math-geometry/CanPackaging",
  version: 1,
  name: "Can shape and the least metal",
  description:
    "Change a can's radius while its height adjusts to keep the same volume. The unrolled wall and the round ends show where the metal goes and which shape uses the least.",
  tags: ["optimization", "surface area", "cylinder", "packaging"],
  assumptions: [
    "Ideal cylinder with fixed volume: h = V / (πr²). Closed can S = 2πr² + 2πrh, least metal when h = 2r; an open can (one end) needs least metal when h = r.",
    "Equal cost per square centimetre; seams, thickness, strength and stacking are ignored.",
  ],
  parameters,
  defaults: { canVolume: 500, canRadius: 2.5, canClosed: true },
  outputs: {
    canRadius: { unit: "cm", description: "Radius of the can" },
    canHeight: {
      unit: "cm",
      description: "Height needed for the fixed volume",
    },
    wallArea: { unit: "cm²", description: "Area of the unrolled side wall" },
    endsArea: { unit: "cm²", description: "Area of the round end or ends" },
    surfaceArea: { unit: "cm²", description: "Total metal area" },
    bestRadius: { unit: "cm", description: "Radius that uses the least metal" },
    bestHeight: { unit: "cm", description: "Height of the least-metal can" },
    leastArea: { unit: "cm²", description: "Least possible metal area" },
    extraPercent: {
      unit: "%",
      description: "Extra metal compared with the least-metal can",
    },
    curvePoints: {
      unit: "cm²",
      description: "Metal area for radii from 1 to 15 cm at the same volume",
    },
  },
  actions: {
    "set:canRadius": valueAction(
      radius,
      "Can radius in centimetres; height follows",
    ),
    "set:canVolume": valueAction(
      volume,
      "Volume the can holds in cubic centimetres",
    ),
    "set:canClosed": valueAction(
      boolean,
      "Closed can with two ends, or open cup with one",
    ),
  },
  dependencies: geometryDependencies("math-geometry/CanPackaging"),
  presentation: "math-can",
  requiredObservations: ["surfaceArea"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action, value) => {
    const field = fields[action];
    if (!field) throw new Error("Unsupported can operation");
    return accepted({ ...state, [field]: value });
  },
  measure: (state) => {
    const s = accepted(state);
    const v = Number(s.canVolume),
      r = Number(s.canRadius),
      closed = Boolean(s.canClosed);
    const current = canSurface(v, r, closed);
    const best = bestCan(v, closed);
    const { min, max, points } = curveRadii;
    return {
      canRadius: r,
      canHeight: current.height,
      wallArea: current.wall,
      endsArea: current.ends,
      surfaceArea: current.total,
      bestRadius: best.radius,
      bestHeight: best.height,
      leastArea: best.total,
      extraPercent: (current.total / best.total - 1) * 100,
      curvePoints: Array.from({ length: points }, (_, i) => {
        const x = min + ((max - min) * i) / (points - 1);
        return { x, y: canSurface(v, x, closed).total };
      }),
    };
  },
};
