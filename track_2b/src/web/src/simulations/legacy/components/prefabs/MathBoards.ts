import type {
  FractionBar as Bar,
  MathBoard,
  MathDemo,
} from "../traits/MathBoards";
import { CounterToken } from "./CounterToken";
export function FractionBar(id: string, n: number, d: number): Bar {
  return {
    id,
    visual: {
      visual: "FractionBarVisual",
      target: "svg",
      resources: ["MathAppearance"],
    },
    value: { n, d },
    shaded: Array.from({ length: d }, (_, i) => i < n),
  };
}
export function TokenGroup(id: string, order: number) {
  return {
    id,
    order,
    visual: {
      visual: "BasketVisual",
      target: "svg" as const,
      resources: ["MathAppearance"],
    },
  };
}
export function createMathBoard(demo: MathDemo, id: string = demo): MathBoard {
  const visuals = {
    counting: "CountingBoxVisual",
    arithmetic: "OperationZonesVisual",
    "equal-groups": "BasketVisual",
    "fraction-builder": "FractionBarVisual",
    "fraction-number-line": "NumberLineVisual",
  };
  const base = {
    visual: {
      visual: visuals[demo],
      target: "svg" as const,
      resources: ["MathAppearance"],
    },
    id,
    feedback: "",
    sequence: {
      cursor: 0,
      playing: false,
      elapsed: 0,
      run: 0,
      looping: false,
      phase: "intro" as const,
    },
  };
  switch (demo) {
    case "counting":
      return {
        ...base,
        demo,
        mode: "count",
        target: 5,
        tokens: Array.from({ length: 5 }, (_, i) =>
          CounterToken(`${id}/token-${i}`, i),
        ),
      };
    case "arithmetic":
      return {
        ...base,
        demo,
        operation: "add",
        a: 3,
        b: 2,
        result: 5,
        tokens: Array.from({ length: 5 }, (_, i) =>
          CounterToken(`${id}/token-${i}`, i, i < 3 ? 0 : 1),
        ),
      };
    case "equal-groups":
      return {
        ...base,
        demo,
        mode: "build",
        groups: 3,
        perGroup: 4,
        total: 12,
        quotient: 4,
        remainder: 0,
        baskets: Array.from({ length: 3 }, (_, i) =>
          TokenGroup(`${id}/basket-${i}`, i),
        ),
        tokens: Array.from({ length: 12 }, (_, i) =>
          CounterToken(`${id}/token-${i}`, i, -1),
        ),
      };
    case "fraction-builder":
      return {
        ...base,
        demo,
        bars: [
          FractionBar(`${id}/bar-a`, 1, 2),
          FractionBar(`${id}/bar-b`, 2, 4),
        ],
        relation: "=",
      };
    case "fraction-number-line":
      return {
        ...base,
        demo,
        mode: "add",
        a: { n: 1, d: 2 },
        b: { n: 1, d: 4 },
        result: { n: 3, d: 4 },
        divisions: 4,
        placed: { n: 0, d: 1 },
        jumps: [
          { n: 0, d: 1 },
          { n: 1, d: 2 },
          { n: 3, d: 4 },
        ],
      };
  }
}
export const CountingBoard = (id: string) => createMathBoard("counting", id);
export const ArithmeticBoard = (id: string) =>
  createMathBoard("arithmetic", id);
export const GroupingBoard = (id: string) =>
  createMathBoard("equal-groups", id);
export const FractionComparisonBoard = (id: string) =>
  createMathBoard("fraction-builder", id);
export const NumberLineBoard = (id: string) =>
  createMathBoard("fraction-number-line", id);
