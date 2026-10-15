import type { DomainModel } from "../../registry/contracts/domainContribution";
import { num, object, validateValue } from "../../registry/contracts/parameterSchema";
import { geometryDependencies, valueAction } from "./common";

const distance = num(1, 100, "m");
const angle = num(1, 80, "°");
const eye = num(0, 2.5, "m");
const tree = num(2, 60, "m");
const parameters = object({
  observerDistance: distance,
  sightAngle: angle,
  eyeHeight: eye,
  treeHeight: tree,
});
const fields: Record<string, string> = {
  "set:observerDistance": "observerDistance",
  "set:sightAngle": "sightAngle",
  "set:eyeHeight": "eyeHeight",
  "set:treeHeight": "treeHeight",
};
/** The sight line counts as touching the top within 1% of the tree (at least 5 cm). */
export const aimTolerance = (treeHeight: number) =>
  Math.max(0.05, treeHeight / 100);
function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  if (Number(input.treeHeight) <= Number(input.eyeHeight))
    throw new Error("The tree must be taller than the observer's eyes");
  return {
    observerDistance: input.observerDistance,
    sightAngle: input.sightAngle,
    eyeHeight: input.eyeHeight,
    treeHeight: input.treeHeight,
  };
}

export const treeHeightModel: DomainModel = {
  ref: "prefabs/math-geometry/TreeHeight",
  version: 1,
  name: "Measuring a tree's height with an angle",
  description:
    "A fixed vertical tree. Aim a sight line at its top from a measured horizontal distance; where the line meets the tree is eye height + distance × tan(angle), so the height is found without climbing.",
  tags: ["trigonometry", "tangent", "tree height", "angle of elevation"],
  assumptions: [
    "Level ground, a vertical tree of fixed height and a horizontal distance from the observer's feet. Angles from 1° to 80°; a vertical sight line has no finite triangle.",
    "Moving the observer never changes the tree: the angle to its top changes instead. A mathematical estimate, not a surveying instrument; sloped ground is unsupported.",
  ],
  parameters,
  defaults: {
    observerDistance: 10,
    sightAngle: 30,
    eyeHeight: 1.5,
    treeHeight: 11.5,
  },
  outputs: {
    lineHeight: {
      unit: "m",
      description:
        "Height where the sight line meets the tree: eye height + distance × tan(angle)",
    },
    rise: {
      unit: "m",
      description: "Height of the sight line above eye level at the tree",
    },
    aimedAtTop: {
      unit: "flag",
      description:
        "The sight line touches the treetop, so the line height measures the tree",
    },
    miss: {
      unit: "m",
      description:
        "Line height minus tree height: positive above the top, negative below",
    },
    topAngle: {
      unit: "°",
      description: "Angle that would aim exactly at the treetop from here",
    },
    treeHeight: { unit: "m", description: "Actual height of the fixed tree" },
    observerDistance: {
      unit: "m",
      description: "Horizontal distance to the tree",
    },
    sightAngle: {
      unit: "°",
      description: "Angle of the sight line above horizontal",
    },
    eyeHeight: { unit: "m", description: "Eye height above the ground" },
  },
  actions: {
    "set:observerDistance": valueAction(
      distance,
      "Move the observer: horizontal distance to the tree in metres (the tree stays the same)",
    ),
    "set:sightAngle": valueAction(
      angle,
      "Aim the sight line: degrees above horizontal",
    ),
    "set:eyeHeight": valueAction(eye, "Observer eye height in metres"),
    "set:treeHeight": valueAction(tree, "Actual tree height in metres"),
  },
  dependencies: geometryDependencies("math-geometry/TreeHeight"),
  presentation: "math-tree-height",
  requiredObservations: ["lineHeight"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action, value) => {
    const field = fields[action];
    if (!field) throw new Error("Unsupported tree measurement operation");
    return accepted({ ...state, [field]: value });
  },
  measure: (state) => {
    const s = accepted(state);
    const d = Number(s.observerDistance),
      degrees = Number(s.sightAngle),
      eyeHeight = Number(s.eyeHeight),
      height = Number(s.treeHeight);
    const rise = d * Math.tan((degrees * Math.PI) / 180);
    const lineHeight = eyeHeight + rise;
    return {
      lineHeight,
      rise,
      aimedAtTop: Math.abs(lineHeight - height) <= aimTolerance(height),
      miss: lineHeight - height,
      topAngle: (Math.atan((height - eyeHeight) / d) * 180) / Math.PI,
      treeHeight: height,
      observerDistance: d,
      sightAngle: degrees,
      eyeHeight,
    };
  },
};
