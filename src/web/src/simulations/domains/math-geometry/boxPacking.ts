import type { DomainModel } from "../../runtime/contribution";
import {
  boolean,
  num,
  object,
  validateValue,
} from "../../runtime/parameterSchema";
import { buttonAction, geometryDependencies } from "./common";

const length = num(1, 300, "cm");
const orientation = num(0, 5, "", true);
const parameters = object({
  binLength: length,
  binWidth: length,
  binHeight: length,
  boxLength: length,
  boxWidth: length,
  boxHeight: length,
  orientation,
  mixed: boolean,
});
/** The six axis-aligned permutations of a box's length, width and height. */
export const orientations = [
  [0, 1, 2],
  [1, 0, 2],
  [0, 2, 1],
  [2, 0, 1],
  [1, 2, 0],
  [2, 1, 0],
];
type Triple = [number, number, number];
export type Zone = {
  x: number;
  y: number;
  z: number;
  box: Triple;
  nx: number;
  ny: number;
  nz: number;
};
const oriented = (box: Triple, o: number) =>
  orientations[o].map((i) => box[i]) as Triple;
const fit = (space: Triple, box: Triple) =>
  space.map((d, i) => Math.floor(d / box[i] + 1e-9)) as Triple;
const product = ([a, b, c]: Triple) => a * b * c;
function uniformZone(space: Triple, box: Triple, origin: Triple): Zone {
  const [nx, ny, nz] = fit(space, box);
  return { x: origin[0], y: origin[1], z: origin[2], box, nx, ny, nz };
}
const count = (zones: Zone[]) =>
  zones.reduce((sum, z) => sum + z.nx * z.ny * z.nz, 0);
function bestUniform(space: Triple, box: Triple, origin: Triple) {
  return orientations
    .map((_, o) => uniformZone(space, oriented(box, o), origin))
    .reduce((best, zone) => (count([zone]) > count([best]) ? zone : best));
}
/**
 * Exhaustive search over guillotine two-zone layouts: k boxes of one orientation
 * along one axis, then the best single orientation in the remaining slab.
 * This is a bounded heuristic family, not a general optimal packing.
 */
export function bestMixed(bin: Triple, box: Triple) {
  let best = [bestUniform(bin, box, [0, 0, 0])];
  for (let o = 0; o < orientations.length; o++) {
    const first = oriented(box, o);
    for (let axis = 0; axis < 3; axis++) {
      const most = Math.floor(bin[axis] / first[axis] + 1e-9);
      for (let k = 1; k <= most; k++) {
        const space = [...bin] as Triple;
        space[axis] = k * first[axis];
        const zone = uniformZone(space, first, [0, 0, 0]);
        const rest = [...bin] as Triple;
        rest[axis] = bin[axis] - space[axis];
        const origin: Triple = [0, 0, 0];
        origin[axis] = space[axis];
        const second = bestUniform(rest, box, origin);
        const layout = [zone, second].filter((z) => count([z]) > 0);
        if (count(layout) > count(best)) best = layout;
      }
    }
  }
  return best;
}
function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  return Object.fromEntries(
    Object.keys(
      (parameters as { properties: Record<string, unknown> }).properties,
    ).map((key) => [key, input[key]]),
  );
}

export const boxPackingModel: DomainModel = {
  ref: "prefabs/math-geometry/BoxPacking",
  version: 1,
  name: "Packing boxes into a bin",
  description:
    "Fit identical rigid boxes into a rectangular bin. Turning all boxes the same way, or mixing two directions, changes how many fit; bin volume divided by box volume is only an upper limit.",
  tags: ["packing", "volume", "orientation", "container loading"],
  assumptions: [
    "Identical rigid boxes, axis-aligned, fully inside the bin and not overlapping. Uniform layouts use one of six orientations; mixed layouts search two-zone splits.",
    "A count is called the best possible only when it equals the volume limit; otherwise it is the best arrangement found. Weight, stacking strength and squashing are unsupported.",
  ],
  parameters,
  defaults: {
    binLength: 40,
    binWidth: 30,
    binHeight: 20,
    boxLength: 25,
    boxWidth: 15,
    boxHeight: 10,
    orientation: 0,
    mixed: false,
  },
  outputs: {
    count: { unit: "boxes", description: "Boxes in the shown arrangement" },
    volumeLimit: {
      unit: "boxes",
      description: "Bin volume ÷ box volume, rounded down: an upper limit",
    },
    uniformCount: {
      unit: "boxes",
      description: "Boxes that fit with every box turned the current way",
    },
    bestUniform: {
      unit: "boxes",
      description: "Most boxes with every box turned the same way",
    },
    mixedCount: {
      unit: "boxes",
      description: "Most boxes found mixing two directions",
    },
    boxDimensions: {
      unit: "cm",
      description: "Current box length, width and height along the bin",
    },
    binDimensions: { unit: "cm", description: "Bin length, width and height" },
    zones: { unit: "cm", description: "Arrangement zones shown in the bin" },
    provenBest: {
      unit: "flag",
      description:
        "The count equals the volume limit, so no arrangement can do better",
    },
    fillPercent: { unit: "%", description: "Share of the bin filled by boxes" },
    mixed: { unit: "flag", description: "Showing a mixed arrangement" },
  },
  actions: {
    PACK_TURN: buttonAction(
      "Turn every box to the next of its six directions (uniform layout)",
    ),
    PACK_MIX: buttonAction(
      "Show or hide the best arrangement found mixing two directions",
    ),
  },
  dependencies: geometryDependencies("math-geometry/BoxPacking"),
  presentation: "math-box-packing",
  requiredObservations: ["count"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action) => {
    const s = accepted(state);
    if (action === "PACK_TURN")
      return accepted({
        ...s,
        orientation: (Number(s.orientation) + 1) % 6,
        mixed: false,
      });
    if (action === "PACK_MIX") return accepted({ ...s, mixed: !s.mixed });
    throw new Error("Unsupported packing operation");
  },
  measure: (state) => {
    const s = accepted(state);
    const bin: Triple = [
      Number(s.binLength),
      Number(s.binWidth),
      Number(s.binHeight),
    ];
    const box: Triple = [
      Number(s.boxLength),
      Number(s.boxWidth),
      Number(s.boxHeight),
    ];
    const current = uniformZone(
      bin,
      oriented(box, Number(s.orientation)),
      [0, 0, 0],
    );
    const mixedLayout = bestMixed(bin, box);
    const zones = s.mixed ? mixedLayout : [current];
    const shown = count(zones);
    const limit = Math.floor(product(bin) / product(box) + 1e-9);
    return {
      count: shown,
      volumeLimit: limit,
      uniformCount: count([current]),
      bestUniform: count([bestUniform(bin, box, [0, 0, 0])]),
      mixedCount: count(mixedLayout),
      boxDimensions: current.box,
      binDimensions: bin,
      zones: zones.filter((z) => count([z]) > 0),
      provenBest: shown === limit,
      fillPercent: (100 * shown * product(box)) / product(bin),
      mixed: Boolean(s.mixed),
    };
  },
};
