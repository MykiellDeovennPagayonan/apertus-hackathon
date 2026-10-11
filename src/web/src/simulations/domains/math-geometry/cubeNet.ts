import type { DomainModel } from "../../runtime/contribution";
import {
  boolean,
  num,
  object,
  type ParameterSchema,
  validateValue,
} from "../../runtime/parameterSchema";
import { buttonAction, geometryDependencies, valueAction } from "./common";

type Cell = { x: number; y: number };
export const cubeFaces = [
  "Bottom",
  "Top",
  "Front",
  "Back",
  "Left",
  "Right",
] as const;
type Face = (typeof cubeFaces)[number];
const opposite: Record<Face, Face> = {
  Bottom: "Top",
  Top: "Bottom",
  Front: "Back",
  Back: "Front",
  Left: "Right",
  Right: "Left",
};
export const netPresets: { name: string; cells: [number, number][] }[] = [
  {
    name: "Cross",
    cells: [
      [1, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [1, 2],
    ],
  },
  {
    name: "Straight strip",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [5, 0],
    ],
  },
  {
    name: "Staircase",
    cells: [
      [0, 0],
      [1, 0],
      [1, 1],
      [2, 1],
      [2, 2],
      [3, 2],
    ],
  },
  {
    name: "2 × 3 block",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [0, 1],
      [1, 1],
      [2, 1],
    ],
  },
  {
    name: "Row of five plus one",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [3, 0],
      [4, 0],
      [2, 1],
    ],
  },
  {
    name: "Two rows of three",
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
      [3, 1],
      [4, 1],
    ],
  },
  {
    name: "Flaps on opposite sides",
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [3, 2],
    ],
  },
  {
    name: "U shape",
    cells: [
      [0, 0],
      [0, 1],
      [1, 1],
      [2, 1],
      [3, 1],
      [3, 0],
    ],
  },
];
const coordinate = num(0, 5, "squares", true);
const cells: ParameterSchema = {
  type: "array",
  items: object({ x: coordinate, y: coordinate }),
  minItems: 6,
  maxItems: 6,
};
const preset = num(0, netPresets.length - 1, "", true);
const parameters = object({ preset, cells, folded: boolean }, [
  "cells",
  "folded",
]);
const presetCells = (index: number) =>
  netPresets[index].cells.map(([x, y]) => ({ x, y }));
/** Translate to the top-left corner and sort in reading order so letters are stable. */
export function normalizeCells(list: readonly Cell[]) {
  const minX = Math.min(...list.map((c) => c.x)),
    minY = Math.min(...list.map((c) => c.y));
  return list
    .map((c) => ({ x: c.x - minX, y: c.y - minY }))
    .sort((a, b) => a.y - b.y || a.x - b.x);
}
const key = (c: Cell) => `${c.x},${c.y}`;

/** Roll the cube from the anchor square across hinges; each step is a 90° fold. */
export function foldNet(list: readonly Cell[]) {
  const normalized = normalizeCells(list);
  const index = new Map(normalized.map((c, i) => [key(c), i]));
  const neighbours = (c: Cell) =>
    [
      [1, 0, "east"],
      [-1, 0, "west"],
      [0, 1, "south"],
      [0, -1, "north"],
    ]
      .map(([dx, dy, dir]) => ({
        at: index.get(key({ x: c.x + Number(dx), y: c.y + Number(dy) })),
        dir: String(dir),
      }))
      .filter((n): n is { at: number; dir: string } => n.at !== undefined);
  const anchor = normalized.reduce(
    (best, c, i) =>
      neighbours(c).length > neighbours(normalized[best]).length ? i : best,
    0,
  );
  type Pose = Record<
    "bottom" | "top" | "north" | "south" | "east" | "west",
    Face
  >;
  const roll: Record<string, (p: Pose) => Pose> = {
    east: (p) => ({
      ...p,
      bottom: p.east,
      east: p.top,
      top: p.west,
      west: p.bottom,
    }),
    west: (p) => ({
      ...p,
      bottom: p.west,
      west: p.top,
      top: p.east,
      east: p.bottom,
    }),
    south: (p) => ({
      ...p,
      bottom: p.south,
      south: p.top,
      top: p.north,
      north: p.bottom,
    }),
    north: (p) => ({
      ...p,
      bottom: p.north,
      north: p.top,
      top: p.south,
      south: p.bottom,
    }),
  };
  const poses: (Pose | undefined)[] = normalized.map(() => undefined);
  poses[anchor] = {
    bottom: "Bottom",
    top: "Top",
    north: "Back",
    south: "Front",
    east: "Right",
    west: "Left",
  };
  const queue = [anchor];
  while (queue.length) {
    const current = queue.shift() as number;
    for (const n of neighbours(normalized[current]))
      if (!poses[n.at]) {
        poses[n.at] = roll[n.dir](poses[current] as Pose);
        queue.push(n.at);
      }
  }
  const faces = poses.map((p) => (p as Pose).bottom);
  const counts = new Map<Face, number>();
  for (const f of faces) counts.set(f, (counts.get(f) ?? 0) + 1);
  // Every shared edge, including those closing a loop, must fold consistently.
  const consistent = normalized.every((c, i) =>
    neighbours(c).every((n) => {
      const expected = roll[n.dir](poses[i] as Pose);
      return Object.entries(expected).every(
        ([side, face]) => poses[n.at]?.[side as keyof Pose] === face,
      );
    }),
  );
  return {
    cells: normalized,
    faces,
    consistent,
    duplicates: cubeFaces.filter((f) => (counts.get(f) ?? 0) > 1),
    missing: cubeFaces.filter((f) => !counts.has(f)),
  };
}
function validCells(list: readonly Cell[]) {
  const seen = new Set(list.map(key));
  if (seen.size !== list.length) throw new Error("Squares must not overlap");
  const reached = new Set([key(list[0])]);
  const queue = [list[0]];
  while (queue.length) {
    const c = queue.shift() as Cell;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ]) {
      const k = key({ x: c.x + dx, y: c.y + dy });
      if (seen.has(k) && !reached.has(k)) {
        reached.add(k);
        queue.push({ x: c.x + dx, y: c.y + dy });
      }
    }
  }
  if (reached.size !== list.length)
    throw new Error("Every square must share an edge with the shape");
}
function accepted(input: Record<string, unknown>) {
  validateValue(parameters, input);
  const index = Number(input.preset);
  const list = normalizeCells(
    (input.cells as Cell[] | undefined)?.map((c) => ({ x: c.x, y: c.y })) ??
      presetCells(index),
  );
  validCells(list);
  return { preset: index, cells: list, folded: Boolean(input.folded) };
}

export const cubeNetModel: DomainModel = {
  ref: "prefabs/math-geometry/CubeNet",
  version: 1,
  name: "Which nets fold into a cube",
  description:
    "Fold a flat arrangement of six lettered squares along its edges. It makes a closed cube only when every square lands on a different face.",
  tags: ["cube net", "folding", "hexomino", "3D shapes"],
  assumptions: [
    "Six equal squares joined edge to edge, zero thickness, each shared edge folds 90°. A net is valid when the six squares cover six different cube faces.",
    "Curated shapes plus any connected six-square arrangement on a 6 × 6 grid. Folding-motion collisions, glue tabs and non-cube boxes are unsupported.",
  ],
  parameters,
  defaults: { preset: 0, folded: false },
  outputs: {
    shapeName: { unit: "text", description: "Name of the current arrangement" },
    squares: {
      unit: "squares",
      description:
        "Squares with letter, grid position and the cube face each lands on",
    },
    valid: { unit: "flag", description: "Folds into a closed cube" },
    duplicateFaces: {
      unit: "faces",
      description: "Cube faces covered by more than one square",
    },
    openFaces: { unit: "faces", description: "Cube faces left uncovered" },
    folded: {
      unit: "flag",
      description: "Whether the net is currently folded",
    },
    oppositeOfA: {
      unit: "text",
      description: "Letter on the face opposite square A, empty when invalid",
    },
  },
  actions: {
    NET_FOLD: buttonAction("Fold the net up into a box, or unfold it"),
    NET_NEXT: buttonAction("Show the next six-square arrangement, unfolded"),
    NET_SET_CELLS: valueAction(
      cells,
      "Use a custom arrangement of six edge-connected squares (x, y from 0 to 5)",
    ),
  },
  dependencies: geometryDependencies("math-geometry/CubeNet"),
  presentation: "math-cube-net",
  requiredObservations: ["valid"],
  maximumInstances: 2,
  initialize: accepted,
  configuration: accepted,
  apply: (state, action, value) => {
    const s = accepted(state);
    if (action === "NET_FOLD") return accepted({ ...s, folded: !s.folded });
    if (action === "NET_NEXT") {
      const next = (s.preset + 1) % netPresets.length;
      return accepted({ preset: next, folded: false });
    }
    if (action === "NET_SET_CELLS")
      return accepted({ preset: s.preset, cells: value, folded: false });
    throw new Error("Unsupported net operation");
  },
  measure: (state) => {
    const s = accepted(state);
    const result = foldNet(s.cells);
    const valid = result.duplicates.length === 0 && result.consistent;
    const letters = "ABCDEF";
    const preset = normalizeCells(presetCells(s.preset));
    const isPreset = preset.every(
      (c, i) => c.x === result.cells[i].x && c.y === result.cells[i].y,
    );
    const faceOfA = result.faces[0];
    const oppositeIndex = result.faces.indexOf(opposite[faceOfA]);
    return {
      shapeName: isPreset ? netPresets[s.preset].name : "Your shape",
      squares: result.cells.map((c, i) => ({
        label: letters[i],
        x: c.x,
        y: c.y,
        face: result.faces[i],
      })),
      valid,
      duplicateFaces: result.duplicates,
      openFaces: result.missing,
      folded: s.folded,
      oppositeOfA: valid && oppositeIndex >= 0 ? letters[oppositeIndex] : "",
    };
  },
};
