import type { DomainModel } from "../../runtime/contribution";
import {
  choice,
  object,
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
import { buttonAction, geometryDependencies } from "./common";

/** Asymmetric L with unequal arms, listed anticlockwise. */
export const baseShape = [
  { label: "A", x: 1, y: 1 },
  { label: "B", x: 4, y: 1 },
  { label: "C", x: 4, y: 2 },
  { label: "D", x: 2, y: 2 },
  { label: "E", x: 2, y: 5 },
  { label: "F", x: 1, y: 5 },
];
const limit = 8;
const maximumOperations = 8;
const operation = choice("flip", "turn", "slide");
const operations: ParameterSchema = {
  type: "array",
  items: operation,
  minItems: 0,
  maxItems: maximumOperations,
};
const parameters = object({ operations });
type Point = { label: string; x: number; y: number };
const transforms: Record<string, (p: Point) => Point> = {
  flip: (p) => ({ ...p, x: -p.x }),
  turn: (p) => ({ ...p, x: -p.y, y: p.x }),
  slide: (p) => ({ ...p, x: p.x + 3 }),
};
export function transformed(list: readonly string[]) {
  return list.reduce<Point[]>(
    (points, op) => points.map(transforms[op]),
    baseShape.map((p) => ({ ...p })),
  );
}
const signedArea = (points: Point[]) =>
  points.reduce((sum, p, i) => {
    const n = points[(i + 1) % points.length];
    return sum + p.x * n.y - n.x * p.y;
  }, 0) / 2;
const sides = (points: Point[]) =>
  points.map((p, i) => {
    const n = points[(i + 1) % points.length];
    return Math.hypot(n.x - p.x, n.y - p.y);
  });

function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  const list = [...(input.operations as string[])];
  for (let i = 1; i <= list.length; i++)
    if (
      transformed(list.slice(0, i)).some(
        (p) => Math.abs(p.x) > limit || Math.abs(p.y) > limit,
      )
    )
      throw new Error("The shape would leave the grid");
  return { operations: list };
}
const actions: Record<string, string> = {
  MOTION_FLIP: "flip",
  MOTION_TURN: "turn",
  MOTION_SLIDE: "slide",
};

export const rigidMotionModel: DomainModel = {
  ref: "prefabs/math-geometry/RigidMotion",
  version: 1,
  name: "Flip, turn and slide a shape",
  description:
    "Apply reflections (flips) across a vertical mirror line, quarter-turn rotations about a fixed centre and slides to a lettered L shape. Distances stay the same; only a flip reverses the corner order.",
  tags: ["reflection", "rotation", "translation", "rigid transformation"],
  assumptions: [
    "Flip: mirror line x = 0. Turn: 90° anticlockwise about (0, 0). Slide: 3 squares right. Operations apply in the order chosen, at most 8, on a grid from −8 to 8.",
    "Rigid motions only: stretching, arbitrary mirror lines and chosen centres are unsupported.",
  ],
  parameters,
  defaults: { operations: [] },
  outputs: {
    vertices: { unit: "grid", description: "Current corner positions A–F" },
    previous: {
      unit: "grid",
      description: "Corner positions before the last operation",
    },
    operations: { unit: "text", description: "Operations applied, in order" },
    orientation: {
      unit: "text",
      description:
        "same (letters anticlockwise) or mirrored (letters clockwise)",
    },
    sidesPreserved: {
      unit: "flag",
      description: "Every side keeps its original length",
    },
    lastOperation: { unit: "text", description: "Most recent operation" },
  },
  actions: {
    MOTION_FLIP: buttonAction("Flip the shape across the vertical mirror line"),
    MOTION_TURN: buttonAction("Turn the shape 90° anticlockwise about the dot"),
    MOTION_SLIDE: buttonAction("Slide the shape 3 squares to the right"),
    MOTION_UNDO: buttonAction("Undo the last operation"),
    MOTION_RESTART: buttonAction("Return the shape to its starting position"),
  },
  dependencies: geometryDependencies("math-geometry/RigidMotion"),
  presentation: "math-rigid-motion",
  requiredObservations: ["orientation"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action) => {
    const list = accepted(state).operations;
    if (actions[action])
      return accepted({ operations: [...list, actions[action]] });
    if (action === "MOTION_UNDO") {
      if (!list.length) throw new Error("Nothing to undo");
      return accepted({ operations: list.slice(0, -1) });
    }
    if (action === "MOTION_RESTART") return accepted({ operations: [] });
    throw new Error("Unsupported shape operation");
  },
  measure: (state) => {
    const list = accepted(state).operations;
    const vertices = transformed(list);
    const original = sides(baseShape);
    return {
      vertices,
      previous: transformed(list.slice(0, -1)),
      operations: list,
      orientation: signedArea(vertices) > 0 ? "same" : "mirrored",
      sidesPreserved: sides(vertices).every(
        (length, i) => Math.abs(length - original[i]) < 1e-9,
      ),
      lastOperation: list.at(-1) ?? "none",
    };
  },
};
