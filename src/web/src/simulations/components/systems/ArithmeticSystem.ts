import type { UIAction } from "../../runtime/types";
import { CounterToken } from "../prefabs/CounterToken";
import type { ArithmeticBoard } from "../traits/MathBoards";
import { clearSequence, integer, payload } from "./mathSequence";
export function ArithmeticSystem(board: ArithmeticBoard, action: UIAction) {
  const replay = () => {
    board.tokens = Array.from(
      { length: board.operation === "add" ? board.a + board.b : board.a },
      (_, i) =>
        CounterToken(
          `${board.id}/token-${i}`,
          i,
          board.operation === "add" && i >= board.a ? 1 : 0,
        ),
    );
    clearSequence(board);
  };
  const next = (id?: unknown) => {
    const candidates = board.tokens.filter((t) =>
      board.operation === "add" ? t.zone === 1 : t.zone === 0,
    );
    if (board.sequence.cursor >= board.b) {
      board.sequence.playing = false;
      return;
    }
    const token =
      id === undefined ? candidates[0] : candidates.find((t) => t.id === id);
    if (!token) throw new Error("Choose a circle from the active group.");
    token.zone = board.operation === "add" ? 0 : 2;
    board.sequence.cursor++;
    if (board.sequence.cursor === board.b) board.sequence.playing = false;
  };
  switch (action.type) {
    case "SET_ARITHMETIC_TASK": {
      const p = payload(action.value);
      if (
        !integer(p.a, 0, 20) ||
        !integer(p.b, 0, 20) ||
        !["add", "subtract"].includes(String(p.operation)) ||
        (p.operation === "add" ? p.a + p.b > 20 : p.b > p.a)
      )
        throw new Error("Use whole numbers with a result between 0 and 20.");
      board.a = p.a;
      board.b = p.b;
      board.operation = p.operation as "add" | "subtract";
      board.result =
        board.operation === "add" ? board.a + board.b : board.a - board.b;
      replay();
      break;
    }
    case "MOVE_TOKEN":
      board.sequence.playing = false;
      next(action.value);
      break;
    case "NEXT_STEP":
      next();
      break;
    case "REPLAY":
      replay();
      break;
    default:
      throw new Error("Unsupported arithmetic action.");
  }
}
