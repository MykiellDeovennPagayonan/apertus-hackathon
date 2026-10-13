import type { DomainModel } from "../../registry/contracts/domainContribution";
import { num, object, validateValue } from "../../registry/contracts/parameterSchema";
import { geometryDependencies, valueAction } from "./common";

const sides = num(3, 12, "sides", true);
const parameters = object({ tileSides: sides });
function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  return { tileSides: input.tileSides };
}
const names: Record<number, string> = {
  3: "triangle",
  4: "square",
  5: "pentagon",
  6: "hexagon",
  7: "heptagon",
  8: "octagon",
  9: "nonagon",
  10: "decagon",
  11: "hendecagon",
  12: "dodecagon",
};

export const regularTilingModel: DomainModel = {
  ref: "prefabs/math-geometry/RegularTiling",
  version: 1,
  name: "Which regular tiles fit around a corner",
  description:
    "Place copies of one regular polygon edge to edge around a corner. They meet with no gap only when the interior angles add exactly to 360°.",
  tags: ["tessellation", "tiling", "regular polygon", "interior angle"],
  assumptions: [
    "One kind of regular polygon, placed edge to edge. Interior angle = (n − 2) × 180° / n. Only triangles, squares and hexagons meet exactly at a corner.",
    "A corner that fits is necessary but not a full proof of a tiling. Some irregular pentagons do tile; mixed-polygon tilings are unsupported.",
  ],
  parameters,
  defaults: { tileSides: 6 },
  outputs: {
    tileSides: { unit: "sides", description: "Number of sides of the tile" },
    shapeName: { unit: "text", description: "Name of the regular polygon" },
    interiorAngle: { unit: "°", description: "Interior angle of one tile" },
    fitAtCorner: {
      unit: "tiles",
      description: "Tiles that fit around a corner without overlapping",
    },
    angleSum: { unit: "°", description: "Angles of the fitting tiles added" },
    gap: { unit: "°", description: "Angle left uncovered at the corner" },
    overlap: {
      unit: "°",
      description:
        "Overlap if one more tile were forced in (0 when it fits exactly)",
    },
    fitsExactly: {
      unit: "flag",
      description: "Tiles meet at the corner with no gap or overlap",
    },
  },
  actions: {
    "set:tileSides": valueAction(sides, "Number of sides of the regular tile"),
  },
  dependencies: geometryDependencies("math-geometry/RegularTiling"),
  presentation: "math-tiling",
  requiredObservations: ["gap"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action, value) => {
    if (action !== "set:tileSides")
      throw new Error("Unsupported tile operation");
    return accepted({ ...state, tileSides: value });
  },
  measure: (state) => {
    const n = Number(accepted(state).tileSides);
    const angle = ((n - 2) * 180) / n;
    // Exact integer test: 360 / angle = 2n / (n − 2).
    const fitsExactly = (2 * n) % (n - 2) === 0;
    const fit = Math.floor((2 * n) / (n - 2));
    const sum = fit * angle;
    return {
      tileSides: n,
      shapeName: names[n],
      interiorAngle: angle,
      fitAtCorner: fit,
      angleSum: fitsExactly ? 360 : sum,
      gap: fitsExactly ? 0 : 360 - sum,
      overlap: fitsExactly ? 0 : sum + angle - 360,
      fitsExactly,
    };
  },
};
