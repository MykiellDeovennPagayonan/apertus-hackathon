import type { UIAction } from "../../runtime/types";
import { CounterToken } from "../prefabs/CounterToken";
import { TokenGroup } from "../prefabs/MathBoards";
import type { GroupingBoard } from "../traits/MathBoards";
import { clearSequence, integer, payload } from "./mathSequence";
export function EqualGroupingSystem(board: GroupingBoard, action: UIAction) {
  const replay = () => {
    board.baskets = Array.from({ length: board.groups }, (_, i) =>
      TokenGroup(`${board.id}/basket-${i}`, i),
    );
    board.tokens = Array.from({ length: board.total }, (_, i) =>
      CounterToken(`${board.id}/token-${i}`, i, -1),
    );
    clearSequence(board);
  };
  switch (action.type) {
    case "SET_GROUPING_TASK": {
      const p = payload(action.value);
      if (
        !integer(p.groups, 1, 6) ||
        !integer(p.perGroup, 0, 10) ||
        !integer(p.total, 0, 60) ||
        !["build", "share"].includes(String(p.mode))
      )
        throw new Error(
          "Use 1–6 baskets, 0–10 per basket, and up to 60 circles.",
        );
      board.mode = p.mode as "build" | "share";
      board.groups = p.groups;
      board.perGroup = p.perGroup;
      board.total =
        board.mode === "build" ? board.groups * board.perGroup : p.total;
      board.quotient = Math.floor(board.total / board.groups);
      board.remainder = board.total % board.groups;
      replay();
      break;
    }
    case "DISTRIBUTE_NEXT":
    case "NEXT_STEP": {
      const limit = board.total - board.remainder;
      if (board.sequence.cursor < limit) {
        const token = board.tokens[board.sequence.cursor];
        token.zone = board.sequence.cursor % board.groups;
        board.sequence.cursor++;
      }
      if (board.sequence.cursor >= limit) board.sequence.playing = false;
      break;
    }
    case "REPLAY":
      replay();
      break;
    default:
      throw new Error("Unsupported grouping action.");
  }
}
