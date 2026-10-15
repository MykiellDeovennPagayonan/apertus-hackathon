import { createMathBoard } from "../components/prefabs/MathBoards";
import { ArithmeticSystem } from "../components/systems/ArithmeticSystem";
import { CountingSystem } from "../components/systems/CountingSystem";
import { EqualGroupingSystem } from "../components/systems/EqualGroupingSystem";
import { FractionBuilderSystem } from "../components/systems/FractionBuilderSystem";
import { FractionNumberLineSystem } from "../components/systems/FractionNumberLineSystem";
import { advanceClock, advanceLoop } from "../components/systems/mathSequence";
import type { MathBoard, MathDemo } from "../components/traits/MathBoards";
import { validateCommand } from "./capabilities";
import { type ActionResult, accepted, rejected } from "../../creation-and-editing/runtime-engine/commands";
import type { UIAction } from "./types";
export const mathDemos: readonly MathDemo[] = [
  "counting",
  "arithmetic",
  "equal-groups",
  "fraction-builder",
  "fraction-number-line",
];
export function isMathDemo(demo: string): demo is MathDemo {
  return mathDemos.includes(demo as MathDemo);
}
export function supportsMathLoop(demo: string) {
  return (
    demo === "counting" || demo === "arithmetic" || demo === "equal-groups"
  );
}
const playback = ["NEXT_STEP", "SET_PLAYING", "REPLAY", "RESET"];
export const mathActions: Record<MathDemo, string[]> = {
  counting: [
    "SET_LOOPING",
    "SET_COUNTING_TASK",
    "COUNT_TOKEN",
    "PLACE_TOKEN",
    "REMOVE_TOKEN",
    "CHECK_COUNT",
    ...playback,
  ],
  arithmetic: ["SET_LOOPING", "SET_ARITHMETIC_TASK", "MOVE_TOKEN", ...playback],
  "equal-groups": [
    "SET_LOOPING",
    "SET_GROUPING_TASK",
    "DISTRIBUTE_NEXT",
    ...playback,
  ],
  "fraction-builder": [
    "SET_FRACTION_COMPARISON",
    "SET_BAR_FRACTION",
    "TOGGLE_FRACTION_PIECE",
    "SUBDIVIDE_FRACTION",
    "RESET",
  ],
  "fraction-number-line": [
    "SET_NUMBER_LINE_TASK",
    "SET_TICK_DIVISIONS",
    "PLACE_FRACTION",
    "CHECK_PLACEMENT",
    ...playback,
  ],
};
function apply(board: MathBoard, command: UIAction) {
  switch (board.demo) {
    case "counting":
      CountingSystem(board, command);
      break;
    case "arithmetic":
      ArithmeticSystem(board, command);
      break;
    case "equal-groups":
      EqualGroupingSystem(board, command);
      break;
    case "fraction-builder":
      FractionBuilderSystem(board, command);
      break;
    case "fraction-number-line":
      FractionNumberLineSystem(board, command);
      break;
  }
}
export function mathComplete(board: MathBoard) {
  switch (board.demo) {
    case "counting":
      return board.mode === "count"
        ? board.tokens.every((t) => t.ordinal !== null)
        : board.tokens.filter((t) => t.zone === 1).length >= board.target;
    case "arithmetic":
      return board.sequence.cursor >= board.b;
    case "equal-groups":
      return board.sequence.cursor >= board.total - board.remainder;
    case "fraction-builder":
      return true;
    case "fraction-number-line":
      return (
        board.mode === "place" ||
        board.sequence.cursor >= board.jumps.length - 1
      );
  }
}
export function updateMathBoard(
  current: MathBoard,
  command: UIAction,
): { board: MathBoard; result: ActionResult } {
  if (!mathActions[current.demo].includes(command.type))
    return {
      board: current,
      result: rejected("This simulation does not support that action."),
    };
  try {
    validateCommand(current.demo, command);
    if (command.type === "RESET") {
      const board = createMathBoard(current.demo, current.id);
      if (current.sequence.looping) {
        board.sequence.looping = true;
        board.sequence.playing = true;
      }
      return { board, result: accepted };
    }
    const board = structuredClone(current);
    if (command.type === "SET_LOOPING") {
      if (typeof command.value !== "boolean" || !supportsMathLoop(board.demo))
        throw new Error(
          "Looping needs a supported lesson and a true/false setting.",
        );
      board.sequence.looping = command.value;
      board.sequence.playing = command.value;
      board.sequence.phase = mathComplete(board) ? "answer" : "intro";
      board.sequence.elapsed = 0;
    } else if (command.type === "SET_PLAYING") {
      if (typeof command.value !== "boolean")
        throw new Error("Play state must be true or false.");
      board.sequence.playing =
        command.value && (board.sequence.looping || !mathComplete(board));
    } else {
      if (command.type === "NEXT_STEP" || command.type === "DISTRIBUTE_NEXT")
        board.sequence.playing = false;
      apply(board, command);
      if (board.sequence.looping) {
        board.sequence.elapsed = 0;
        if (
          command.type === "NEXT_STEP" ||
          command.type === "DISTRIBUTE_NEXT"
        ) {
          board.sequence.phase = mathComplete(board) ? "answer" : "steps";
        } else {
          board.sequence.phase = "intro";
          board.sequence.playing = true;
        }
      }
    }
    return { board, result: accepted };
  } catch (error) {
    return {
      board: current,
      result: rejected(
        error instanceof Error ? error.message : "Invalid math action.",
      ),
    };
  }
}
export function stepMathBoard(current: MathBoard, delta: number): MathBoard {
  if (!current.sequence.playing) return current;
  const board = structuredClone(current);
  const next = () => {
    apply(board, { type: "NEXT_STEP" });
    if (
      board.sequence.looping &&
      board.demo === "counting" &&
      board.mode === "place" &&
      mathComplete(board)
    )
      apply(board, { type: "CHECK_COUNT" });
  };
  const changed = board.sequence.looping
    ? advanceLoop(
        board,
        delta,
        () => mathComplete(board),
        next,
        () => apply(board, { type: "REPLAY" }),
      )
    : advanceClock(board, delta, next);
  return changed ? board : current;
}
export function stageMathBoard(
  demo: MathDemo,
  id: string,
  parameters: Record<string, unknown>,
): MathBoard {
  let board = createMathBoard(demo, id);
  const taskActions: Record<MathDemo, string> = {
    counting: "SET_COUNTING_TASK",
    arithmetic: "SET_ARITHMETIC_TASK",
    "equal-groups": "SET_GROUPING_TASK",
    "fraction-builder": "SET_BAR_FRACTION",
    "fraction-number-line": "SET_NUMBER_LINE_TASK",
  };
  const tasks =
    demo === "fraction-builder" ? parameters.bars : [parameters.task];
  if (
    !Array.isArray(tasks) ||
    tasks.length !== (demo === "fraction-builder" ? 2 : 1)
  )
    throw new Error(`${id}: invalid initial task`);
  for (let i = 0; i < tasks.length; i++) {
    const next = updateMathBoard(board, {
      type: taskActions[demo],
      value:
        demo === "fraction-builder" ? { bar: i, fraction: tasks[i] } : tasks[i],
    });
    if (!next.result.accepted)
      throw new Error(`${id}: invalid initial task: ${next.result.error}`);
    board = next.board;
  }
  if (
    parameters.looping !== undefined &&
    (typeof parameters.looping !== "boolean" || !supportsMathLoop(demo))
  )
    throw new Error(`${id}: invalid looping configuration`);
  board.sequence.looping =
    supportsMathLoop(demo) && parameters.looping !== false;
  return board;
}
