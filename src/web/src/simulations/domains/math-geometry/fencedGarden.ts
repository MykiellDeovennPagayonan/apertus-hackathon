import type { DomainModel } from "../../runtime/contribution";
import {
  boolean,
  num,
  object,
  validateValue,
} from "../../runtime/parameterSchema";
import { geometryDependencies, valueAction } from "./common";

const fence = num(4, 200, "m");
const width = num(0.1, 100, "m");
const parameters = object({
  fenceLength: fence,
  gardenWidth: width,
  againstWall: boolean,
});
const fields: Record<string, string> = {
  "set:gardenWidth": "gardenWidth",
  "set:fenceLength": "fenceLength",
  "set:againstWall": "againstWall",
};
function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  if (Number(input.gardenWidth) >= Number(input.fenceLength) / 2)
    throw new Error(
      "Garden width must be less than half the fence so the other side is positive",
    );
  return {
    fenceLength: input.fenceLength,
    gardenWidth: input.gardenWidth,
    againstWall: input.againstWall,
  };
}
/** Four sides: 2x + 2y = P. Against a wall: 2x + y = P (the wall replaces one long side). */
export function gardenDepth(p: number, x: number, wall: boolean) {
  return wall ? p - 2 * x : p / 2 - x;
}

export const fencedGardenModel: DomainModel = {
  ref: "prefabs/math-geometry/FencedGarden",
  version: 1,
  name: "Fixed fence, largest garden",
  description:
    "Change a rectangular garden's width while a fixed length of fence sets its depth. The area follows a quadratic curve with its highest point at the best shape.",
  tags: ["quadratic", "maximum area", "fencing", "optimization"],
  assumptions: [
    "Rectangle with all four sides fenced (A = x(P/2 − x), best x = y = P/4) or three sides against a straight wall (A = x(P − 2x), best x = P/4, y = P/2). Width between 0 and half the fence.",
    "Gates, fence thickness, terrain and non-rectangular shapes are ignored.",
  ],
  parameters,
  defaults: { fenceLength: 20, gardenWidth: 2, againstWall: false },
  outputs: {
    gardenWidth: { unit: "m", description: "Width of the garden" },
    gardenDepth: { unit: "m", description: "Depth set by the remaining fence" },
    gardenArea: { unit: "m²", description: "Ground enclosed" },
    bestWidth: { unit: "m", description: "Width giving the most ground" },
    bestDepth: { unit: "m", description: "Depth of the best garden" },
    largestArea: {
      unit: "m²",
      description: "Most ground the fence can enclose",
    },
    fenceLength: { unit: "m", description: "Total fence available" },
    againstWall: {
      unit: "flag",
      description: "One long side is an existing wall",
    },
    curvePoints: {
      unit: "m²",
      description: "Area for widths from 0 to half the fence",
    },
  },
  actions: {
    "set:gardenWidth": valueAction(
      width,
      "Garden width in metres; depth follows the fence",
    ),
    "set:fenceLength": valueAction(fence, "Total fence length in metres"),
    "set:againstWall": valueAction(
      boolean,
      "Build against a wall so only three sides need fence",
    ),
  },
  dependencies: geometryDependencies("math-geometry/FencedGarden"),
  presentation: "math-fencing",
  requiredObservations: ["gardenArea"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action, value) => {
    const field = fields[action];
    if (!field) throw new Error("Unsupported garden operation");
    return accepted({ ...state, [field]: value });
  },
  measure: (state) => {
    const s = accepted(state);
    const p = Number(s.fenceLength),
      x = Number(s.gardenWidth),
      wall = Boolean(s.againstWall);
    const y = gardenDepth(p, x, wall);
    const best = p / 4;
    const bestY = gardenDepth(p, best, wall);
    return {
      gardenWidth: x,
      gardenDepth: y,
      gardenArea: x * y,
      bestWidth: best,
      bestDepth: bestY,
      largestArea: best * bestY,
      fenceLength: p,
      againstWall: wall,
      curvePoints: Array.from({ length: 29 }, (_, i) => {
        const w = ((p / 2) * i) / 28;
        return { x: w, y: w * gardenDepth(p, w, wall) };
      }),
    };
  },
};
