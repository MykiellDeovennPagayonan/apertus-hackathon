import type { UIAction } from "../../runtime/types";
import type { NumberLineBoard } from "../traits/MathBoards";
import {
  compare,
  fractionText,
  lcm,
  rational,
  validFraction,
} from "./fractionMath";
import { clearSequence, integer, payload } from "./mathSequence";
export const tickOptions = [1, 2, 3, 4, 6, 12];
export function FractionNumberLineSystem(
  board: NumberLineBoard,
  action: UIAction,
) {
  switch (action.type) {
    case "SET_NUMBER_LINE_TASK": {
      const p = payload(action.value);
      if (
        !validFraction(p.a) ||
        !validFraction(p.b) ||
        !tickOptions.includes(p.a.d) ||
        !tickOptions.includes(p.b.d) ||
        !["place", "add", "subtract"].includes(String(p.mode))
      )
        throw new Error("Choose supported fractions between 0 and 3.");
      const d = lcm(p.a.d, p.b.d);
      const n =
        p.mode === "place"
          ? (p.a.n * d) / p.a.d
          : (p.a.n * d) / p.a.d +
            ((p.mode === "add" ? 1 : -1) * p.b.n * d) / p.b.d;
      if (n < 0 || n > 3 * d)
        throw new Error("Keep the answer between 0 and 3 wholes.");
      board.mode = p.mode as "place" | "add" | "subtract";
      board.a = { ...p.a };
      board.b = { ...p.b };
      board.result = rational(n, d);
      board.divisions = d;
      board.placed = { n: 0, d: 1 };
      board.jumps =
        board.mode === "subtract"
          ? [board.a, board.result]
          : [
              { n: 0, d: 1 },
              board.a,
              ...(board.mode === "add" ? [board.result] : []),
            ];
      clearSequence(board);
      break;
    }
    case "SET_TICK_DIVISIONS": {
      const d = board.mode === "place" ? board.a.d : lcm(board.a.d, board.b.d);
      if (
        !integer(action.value, 1, 12) ||
        !tickOptions.includes(action.value) ||
        action.value % d !== 0
      )
        throw new Error(`Choose a supported multiple of ${d} divisions.`);
      board.divisions = action.value;
      break;
    }
    case "PLACE_FRACTION":
      if (
        board.mode !== "place" ||
        !integer(action.value, 0, 3 * board.divisions)
      )
        throw new Error("Choose a tick in placement mode.");
      board.placed = rational(action.value, board.divisions);
      board.feedback = "";
      break;
    case "CHECK_PLACEMENT":
      if (board.mode !== "place")
        throw new Error("Switch to placement mode first.");
      board.feedback =
        compare(board.placed, board.a) === "="
          ? `Yes! You placed ${fractionText(board.a)}.`
          : `You placed ${fractionText(board.placed)}. Try ${fractionText(board.a)}.`;
      break;
    case "NEXT_STEP":
      board.sequence.cursor = Math.min(
        board.sequence.cursor + 1,
        board.jumps.length - 1,
      );
      if (board.sequence.cursor === board.jumps.length - 1)
        board.sequence.playing = false;
      break;
    case "REPLAY":
      board.placed = { n: 0, d: 1 };
      clearSequence(board);
      break;
    default:
      throw new Error("Unsupported number line action.");
  }
}
