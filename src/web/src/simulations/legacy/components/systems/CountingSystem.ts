import type { UIAction } from "../../runtime/types";
import { CounterToken } from "../prefabs/CounterToken";
import type { CountingBoard } from "../traits/MathBoards";
import { clearSequence, integer, payload } from "./mathSequence";
export function CountingSystem(board: CountingBoard, action: UIAction) {
  const next = () => {
    if (
      board.mode === "place" &&
      board.tokens.filter((t) => t.zone === 1).length >= board.target
    ) {
      board.sequence.playing = false;
      return;
    }
    const token = board.tokens.find((t) =>
      board.mode === "count" ? t.ordinal === null : t.zone === 0,
    );
    if (token) {
      if (board.mode === "count")
        token.ordinal =
          board.tokens.filter((t) => t.ordinal !== null).length + 1;
      else token.zone = 1;
      board.sequence.cursor++;
    }
    if (
      board.mode === "count"
        ? !board.tokens.some((t) => t.ordinal === null)
        : board.tokens.filter((t) => t.zone === 1).length >= board.target
    )
      board.sequence.playing = false;
  };
  switch (action.type) {
    case "SET_COUNTING_TASK": {
      const p = payload(action.value);
      if (
        !integer(p.target, 0, 20) ||
        !["count", "place"].includes(String(p.mode))
      )
        throw new Error("Choose 0–20 circles and a counting mode.");
      board.target = p.target;
      board.mode = p.mode as "count" | "place";
      board.tokens = Array.from(
        { length: board.mode === "count" ? board.target : 20 },
        (_, i) => CounterToken(`${board.id}/token-${i}`, i),
      );
      clearSequence(board);
      break;
    }
    case "COUNT_TOKEN":
    case "PLACE_TOKEN":
    case "REMOVE_TOKEN": {
      const token = board.tokens.find((t) => t.id === action.value);
      if (!token) throw new Error("Unknown circle.");
      if (
        (action.type === "COUNT_TOKEN" && board.mode !== "count") ||
        (action.type !== "COUNT_TOKEN" && board.mode !== "place")
      )
        throw new Error("This action belongs to the other counting mode.");
      board.sequence.playing = false;
      board.feedback = "";
      if (action.type === "COUNT_TOKEN" && token.ordinal === null)
        token.ordinal =
          board.tokens.filter((t) => t.ordinal !== null).length + 1;
      if (action.type === "PLACE_TOKEN") token.zone = 1;
      if (action.type === "REMOVE_TOKEN") token.zone = 0;
      break;
    }
    case "CHECK_COUNT": {
      const count = board.tokens.filter((t) =>
        board.mode === "count" ? t.ordinal !== null : t.zone === 1,
      ).length;
      board.feedback =
        count === board.target
          ? `Yes! ${count} circles.`
          : `There are ${count} circles. Try to make ${board.target}.`;
      break;
    }
    case "NEXT_STEP":
      next();
      break;
    case "REPLAY":
      for (const t of board.tokens) {
        t.ordinal = null;
        t.zone = 0;
      }
      clearSequence(board);
      break;
    default:
      throw new Error("Unsupported counting action.");
  }
}
