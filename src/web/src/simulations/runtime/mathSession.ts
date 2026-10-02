import { create, type StateCreator } from "zustand";
import { createMathBoard } from "../components/prefabs/MathBoards";
import type { MathBoard, MathDemo } from "../components/traits/MathBoards";
import { type ActionResult, rejected } from "./commands";
import { stepMathBoard, supportsMathLoop, updateMathBoard } from "./mathModel";
import type { UIAction } from "./types";

interface MathSession {
  board: MathBoard;
  initial: MathBoard;
  activate: (demo: MathDemo, initial?: MathBoard) => void;
  dispatch: (action: UIAction) => ActionResult;
  step: (delta: number) => void;
  pause: () => void;
}
export const mathInitializer: StateCreator<MathSession> = (set, get) => ({
  board: createMathBoard("counting"),
  initial: createMathBoard("counting"),
  activate: (demo, initial) => {
    const board = initial ? structuredClone(initial) : createMathBoard(demo);
    const ready =
      supportsMathLoop(demo) && (!initial || initial.sequence.looping)
        ? updateMathBoard(board, { type: "SET_LOOPING", value: true }).board
        : board;
    set({ initial: structuredClone(ready), board: ready });
  },
  dispatch: (action) => {
    if (action.type === "RESET") {
      set({ board: structuredClone(get().initial) });
      return { accepted: true };
    }
    const outcome = updateMathBoard(get().board, action);
    if (outcome.result.accepted) set({ board: outcome.board });
    return outcome.result;
  },
  step: (delta) => {
    const current = get().board;
    const board = stepMathBoard(current, delta);
    if (board !== current) set({ board });
  },
  pause: () => {
    const current = get().board;
    if (current.sequence.playing)
      set({
        board: {
          ...current,
          sequence: { ...current.sequence, playing: false },
        },
      });
  },
});
export const useMathStore = create<MathSession>(mathInitializer);
export function dispatchMath(demo: MathDemo, action: UIAction) {
  return useMathStore.getState().board.demo === demo
    ? useMathStore.getState().dispatch(action)
    : rejected("This math simulation is not active.");
}
