import { dispatchCommand } from "../../runtime/session";
import type { FractionComparisonBoard } from "../traits/MathBoards";
import { FractionBarVisual } from "../visuals/FractionBarVisual";
import { SVGWorldView } from "./SVGWorldView";
export function FractionBuilderScene({
  board,
}: {
  board: FractionComparisonBoard;
}) {
  return (
    <SVGWorldView
      role="group"
      aria-label="Two equal-sized fraction bars. Tap pieces to shade or unshade."
      viewBox="0 0 900 420"
    >
      {board.bars.map((bar, i) => (
        <FractionBarVisual
          key={bar.id}
          bar={bar}
          y={85 + i * 175}
          label={`Bar ${i === 0 ? "A" : "B"}`}
          onPiece={(piece) =>
            dispatchCommand(board.demo, {
              type: "TOGGLE_FRACTION_PIECE",
              value: { bar: i, piece },
            })
          }
        />
      ))}
    </SVGWorldView>
  );
}
