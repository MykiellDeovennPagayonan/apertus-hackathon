import type { UIAction } from "../../runtime/types";
import { FractionBar } from "../prefabs/MathBoards";
import type {
  FractionBar as Bar,
  FractionComparisonBoard,
} from "../traits/MathBoards";
import { compare, validFraction } from "./fractionMath";
import { integer, payload } from "./mathSequence";
export function FractionBuilderSystem(
  board: FractionComparisonBoard,
  action: UIAction,
) {
  const p = payload(action.value);
  if (action.type === "SET_FRACTION_COMPARISON") {
    if (!validFraction(p.a, true) || !validFraction(p.b, true))
      throw new Error(
        "Compare two fractions between zero and one, with 1–12 parts.",
      );
    board.bars = [
      FractionBar(board.bars[0].id, p.a.n, p.a.d),
      FractionBar(board.bars[1].id, p.b.n, p.b.d),
    ];
    board.relation = compare(p.a, p.b);
    board.feedback = "";
    return;
  }
  if (!integer(p.bar, 0, 1)) throw new Error("Choose bar A or B.");
  board.bars[p.bar] = updateFractionBar(board.bars[p.bar], action);
  board.relation = compare(board.bars[0].value, board.bars[1].value);
  board.feedback = "";
}

/** One independently addressed bar operation, shared by board and composition runtimes. */
export function updateFractionBar(source: Bar, action: UIAction): Bar {
  const p = payload(action.value);
  let bar = structuredClone(source);
  switch (action.type) {
    case "SET_BAR_FRACTION":
      if (!validFraction(p.fraction, true))
        throw new Error(
          "Use a numerator between zero and the denominator, and 1–12 parts.",
        );
      bar = FractionBar(bar.id, p.fraction.n, p.fraction.d);
      break;
    case "TOGGLE_FRACTION_PIECE":
      if (!integer(p.piece, 0, bar.value.d - 1))
        throw new Error("Unknown fraction piece.");
      bar.shaded[p.piece] = !bar.shaded[p.piece];
      bar.value.n = bar.shaded.filter(Boolean).length;
      break;
    case "SUBDIVIDE_FRACTION":
      if (!integer(p.factor, 2, 12) || bar.value.d * p.factor > 12)
        throw new Error("Subdivision must fit within 12 equal parts.");
      bar.shaded = bar.shaded.flatMap((shaded) =>
        Array.from({ length: p.factor as number }, () => shaded),
      );
      bar.value = { n: bar.value.n * p.factor, d: bar.value.d * p.factor };
      break;
    default:
      throw new Error("Unsupported fraction builder action.");
  }
  return bar;
}
