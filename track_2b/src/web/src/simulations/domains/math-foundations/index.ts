import { lineParameterSchema } from "../../registry/contracts/objects/LineParameters";
import {
  circleMeasure,
  type EquationState,
  equationApply,
  equationInitial,
  equationMeasure,
  lineMeasure,
} from "../../legacy/components/systems/math-foundations/models";
import type {
  DomainContribution,
  DomainModel,
} from "../../registry/contracts/domainContribution";
import { num, object } from "../../registry/contracts/parameterSchema";

const action = (
  value: ReturnType<typeof num> | undefined,
  description: string,
) => ({
  arguments: object(value ? { value } : {}),
  description,
  timing: "live" as const,
  target: "instance" as const,
});
function dependencies(name: string, system: string) {
  return {
    resources: ["math-foundations/EducationalDefaults"],
    traits: [`math-foundations/${name}State`],
    behaviors: [],
    systems: [`math-foundations/${system}`],
    visuals: [`math-foundations/${name}Visual`],
    views: ["AssemblyScene", "AssemblyTable", "AssemblyGraph"],
    controls: ["AssemblyControls"],
    prefabs: [`math-foundations/${name}`],
    compositions: [],
  };
}
const equation: DomainModel = {
  ref: "prefabs/math-foundations/Equation",
  version: 1,
  name: "Solve an equation",
  presentation: "balance",
  maximumInstances: 1,
  requiredObservations: ["equation"],
  description:
    "Solve a linear equation ax + b = c with exact rational, equivalence-preserving subtraction and division, signed symbolic tokens and step history.",
  assumptions: [
    "The tiles represent algebraic terms. A negative number is shown with its sign.",
    "Applying the same operation to both sides preserves equality. Undo removes one step, and Reset returns to the starting equation.",
  ],
  parameters: object(
    {
      coefficient: num(-1000, 1000, "1", true),
      constant: num(-1000, 1000, "1", true),
      right: num(-1000, 1000, "1", true),
    },
    ["coefficient", "constant", "right"],
  ),
  defaults: { coefficient: 2, constant: 3, right: 11 },
  outputs: Object.fromEntries(
    [
      "equation",
      "solution",
      "substitution",
      "leftCoefficient",
      "leftConstant",
      "right",
      "steps",
    ].map((key) => [
      key,
      {
        unit: "1",
        description: (
          {
            equation: "Equation",
            solution: "Candidate solution",
            substitution: "Original-equation substitution",
            leftCoefficient: "x coefficient",
            leftConstant: "Constant on left",
            right: "Value on right",
            steps: "Previous steps",
          } as Record<string, string>
        )[key],
      },
    ]),
  ),
  actions: {
    SUBTRACT_BOTH: action(
      num(-1000, 1000, "1", true),
      "Subtract this integer from both sides; preserve equivalence",
    ),
    DIVIDE_BOTH: action(
      num(-100, 100, "1", true),
      "Divide both sides by this nonzero integer; preserve exact fractions",
    ),
    UNDO: action(undefined, "Undo the last equation step"),
  },
  dependencies: dependencies("Equation", "EquationSystem"),
  initialize: (p) => equationInitial(p) as unknown as Record<string, unknown>,
  apply: (s, a, v) =>
    equationApply(s as unknown as EquationState, a, v) as unknown as Record<
      string,
      unknown
    >,
  measure: (s) => equationMeasure(s as unknown as EquationState),
};
const line: DomainModel = {
  ref: "prefabs/math-foundations/Line",
  version: 1,
  name: "Explore line slope",
  presentation: "line",
  maximumInstances: 4,
  requiredObservations: ["equation", "yAtZero", "yAtOne", "rise", "run"],
  graphOutput: "points",
  configuration: (state) => ({ ...state }),
  description:
    "Independent bounded linear function y=mx+b with an authoritative point dataset and rise/run marker; multiple instances compare lines.",
  assumptions: [
    "The graph uses one shared scale so changes in steepness remain visible. A note appears when a line continues beyond the frame.",
    "The horizontal domain starts at −5 to 5. This is a direct mathematical relationship, so it has no animation clock.",
  ],
  parameters: object(
    {
      slope: lineParameterSchema("slope", "1"),
      intercept: lineParameterSchema("intercept", "math units"),
      xMin: num(-100, 100, "math units"),
      xMax: num(-100, 100, "math units"),
    },
    ["slope", "intercept", "xMin", "xMax"],
  ),
  defaults: { slope: 1, intercept: 0, xMin: -5, xMax: 5 },
  outputs: Object.fromEntries(
    [
      "equation",
      "points",
      "yAtZero",
      "yAtOne",
      "rise",
      "run",
      "marker",
      "xMin",
      "xMax",
    ].map((key) => [
      key,
      {
        unit: ["equation", "rise", "run"].includes(key) ? "1" : "math units",
        description: (
          {
            equation: "Equation",
            points: "Numerical points",
            yAtZero: "y at x = 0",
            yAtOne: "y at x = 1",
            rise: "Rise",
            run: "Run",
            marker: "Rise/run marker",
            xMin: "Domain minimum",
            xMax: "Domain maximum",
          } as Record<string, string>
        )[key],
      },
    ]),
  ),
  actions: {
    SET_SLOPE: action(
      lineParameterSchema("slope", "1"),
      "Set the slope of this line; zero and negative slopes are supported",
    ),
    SET_INTERCEPT: action(
      lineParameterSchema("intercept", "math units"),
      "Set the y intercept of this line",
    ),
  },
  dependencies: dependencies("Line", "LinearFunctionSystem"),
  initialize: (p) => ({ ...p }),
  apply: (s, a, v) => {
    if (a === "SET_SLOPE") return { ...s, slope: v };
    if (a === "SET_INTERCEPT") return { ...s, intercept: v };
    throw new Error("Unsupported line operation");
  },
  measure: lineMeasure,
};
const circle: DomainModel = {
  ref: "prefabs/math-foundations/Circle",
  version: 1,
  name: "Why π stays constant",
  presentation: "circle",
  maximumInstances: 4,
  requiredObservations: ["diameter", "circumference", "ratio"],
  configuration: (state) => ({ ...state }),
  description:
    "Circle geometry with positive radius, calculated diameter and circumference, an unrolling illustration and invariant C/d ratio.",
  assumptions: [
    "Euclidean circle geometry: d=2r and C=2πr. Display ratio tolerance: 0.000001.",
    "Unrolling illustrates the calculated geometry; it does not measure or calculate π.",
  ],
  parameters: object({ radius: num(0.01, 100, "unit") }, ["radius"]),
  defaults: { radius: 1 },
  outputs: {
    radius: { unit: "unit", description: "Radius" },
    diameter: { unit: "unit", description: "Diameter d=2r" },
    circumference: { unit: "unit", description: "Circumference C=2πr" },
    ratio: { unit: "1", description: "Circumference / diameter" },
  },
  actions: {
    SET_RADIUS: action(
      num(0.01, 100, "unit"),
      "Set radius; zero is unsupported for the ratio experiment",
    ),
  },
  dependencies: dependencies("Circle", "CircleGeometrySystem"),
  initialize: (p) => ({ ...p }),
  apply: (s, a, v) => {
    if (a !== "SET_RADIUS") throw new Error("Unsupported circle operation");
    return { ...s, radius: v };
  },
  measure: circleMeasure,
};
export const mathFoundations: DomainContribution = {
  namespace: "math-foundations",
  version: 1,
  models: [equation, line, circle],
};
