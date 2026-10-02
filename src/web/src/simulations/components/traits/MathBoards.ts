import type { VisualBinding } from "./VisualBinding";
export type MathDemo =
  | "counting"
  | "arithmetic"
  | "equal-groups"
  | "fraction-builder"
  | "fraction-number-line";
export interface MathSequence {
  looping: boolean;
  phase: "intro" | "steps" | "answer";
  cursor: number;
  playing: boolean;
  elapsed: number;
  run: number;
}
export interface CountableToken {
  id: string;
  order: number;
  ordinal: number | null;
  zone: number;
  visual: VisualBinding;
}
export interface FractionValue {
  n: number;
  d: number;
}
export interface BaseBoard {
  visual: VisualBinding;
  id: string;
  demo: MathDemo;
  feedback: string;
  sequence: MathSequence;
}
export interface CountingBoard extends BaseBoard {
  demo: "counting";
  mode: "count" | "place";
  target: number;
  tokens: CountableToken[];
}
export interface ArithmeticBoard extends BaseBoard {
  demo: "arithmetic";
  operation: "add" | "subtract";
  a: number;
  b: number;
  tokens: CountableToken[];
  result: number;
}
export interface TokenGroup {
  visual: VisualBinding;
  id: string;
  order: number;
}
export interface GroupingBoard extends BaseBoard {
  demo: "equal-groups";
  mode: "build" | "share";
  groups: number;
  perGroup: number;
  total: number;
  baskets: TokenGroup[];
  tokens: CountableToken[];
  quotient: number;
  remainder: number;
}
export interface FractionBar {
  visual: VisualBinding;
  id: string;
  value: FractionValue;
  shaded: boolean[];
}
export interface FractionComparisonBoard extends BaseBoard {
  demo: "fraction-builder";
  bars: [FractionBar, FractionBar];
  relation: "=" | "<" | ">";
}
export interface NumberLineBoard extends BaseBoard {
  demo: "fraction-number-line";
  mode: "place" | "add" | "subtract";
  a: FractionValue;
  b: FractionValue;
  result: FractionValue;
  divisions: number;
  placed: FractionValue;
  jumps: FractionValue[];
}
export type MathBoard =
  | CountingBoard
  | ArithmeticBoard
  | GroupingBoard
  | FractionComparisonBoard
  | NumberLineBoard;
/** Counts are integers; fractions are measured in wholes. Domain systems are the
 * sole writers of board/token outputs and sequence state. Configuration edits
 * rebuild atomically; runtime construction/reset are lifecycle exceptions. */
export const MathFieldContracts = {
  configuration: {
    unit: "counts or exact wholes",
    role: "configuration",
    timing: "rebuild",
    writer: "selected domain system",
  },
  tokens: {
    unit: "stable identities and group indices",
    role: "state",
    timing: "live",
    writer: "selected domain system",
  },
  fractions: {
    unit: "integer numerator / positive integer denominator",
    role: "state",
    timing: "live",
    writer: "selected domain system",
  },
  sequence: {
    unit: "step index; elapsed seconds",
    role: "state",
    timing: "model-step",
    writer: "selected domain system",
  },
  results: {
    unit: "counts or exact wholes",
    role: "output",
    timing: "live",
    writer: "selected domain system",
  },
} as const;
