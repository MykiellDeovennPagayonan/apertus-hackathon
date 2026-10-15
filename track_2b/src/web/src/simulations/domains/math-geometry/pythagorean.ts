import type { DomainModel } from "../../registry/contracts/domainContribution";
import {
  num,
  object,
  validateValue,
} from "../../registry/contracts/parameterSchema";

const length = num(0.1, 20, "m");
const parameters = object({ distance: length, height: length });
function accepted(parametersValue: Record<string, unknown>) {
  validateValue(parameters, parametersValue);
  return { ...parametersValue };
}

export const pythagoreanModel: DomainModel = {
  ref: "prefabs/math-geometry/Pythagorean",
  version: 1,
  name: "Ladder length and the Pythagorean theorem",
  description:
    "Calculate a ladder's length from perpendicular ground distance and wall contact height; linked squares show why squared lengths add.",
  tags: ["ladder", "right triangle", "Pythagorean theorem", "hypotenuse"],
  assumptions: [
    "Euclidean right triangle: the wall is perpendicular to the ground. Length is the positive square root of the sum of the squared legs.",
    "Geometric ladder length does not establish safe real ladder placement. Inverse-leg solving and dissection animations are unsupported.",
  ],
  parameters,
  defaults: { distance: 3, height: 4 },
  outputs: {
    distance: { unit: "m", description: "Distance of the foot from the wall" },
    height: { unit: "m", description: "Wall contact height" },
    ladderLength: { unit: "m", description: "Required ladder length" },
    distanceSquare: {
      unit: "m²",
      description: "Square on the ground distance",
    },
    heightSquare: { unit: "m²", description: "Square on the wall height" },
    ladderSquare: { unit: "m²", description: "Square on the ladder" },
  },
  actions: Object.fromEntries(
    ["distance", "height"].map((key) => [
      `set:${key}`,
      {
        arguments: object({ value: length }),
        description: `Change ${key} in metres while preserving the other leg`,
        timing: "live" as const,
        target: "instance" as const,
      },
    ]),
  ),
  dependencies: {
    resources: [],
    traits: [],
    behaviors: [],
    systems: [],
    visuals: [],
    views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
    controls: ["AssemblyControls"],
    prefabs: ["math-geometry/Pythagorean"],
    compositions: [],
  },
  presentation: "math-pythagorean",
  requiredObservations: ["ladderLength"],
  presentedOutputs: ["distance", "height", "ladderLength"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action, value) => {
    if (action !== "set:distance" && action !== "set:height")
      throw new Error("Unsupported ladder operation");
    return accepted({ ...state, [action.slice(4)]: value });
  },
  measure: (state) => {
    validateValue(parameters, state);
    const distance = Number(state.distance),
      height = Number(state.height);
    const distanceSquare = distance * distance,
      heightSquare = height * height;
    return {
      distance,
      height,
      ladderLength: Math.hypot(distance, height),
      distanceSquare,
      heightSquare,
      ladderSquare: distanceSquare + heightSquare,
    };
  },
};
