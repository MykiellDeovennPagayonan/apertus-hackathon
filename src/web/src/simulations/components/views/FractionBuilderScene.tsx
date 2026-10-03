import { dispatchCommand } from "../../runtime/session";
import type { FractionComparisonBoard } from "../traits/MathBoards";
import { FractionBarVisual } from "../visuals/FractionBarVisual";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram } from "./useCompactDiagram";
export function FractionBuilderScene({
  board,
}: {
  board: FractionComparisonBoard;
}) {
  const compact = useCompactDiagram();
  return (
    <SVGWorldView
      role="group"
      aria-label="Two equal-sized fraction bars. Tap pieces to shade or unshade."
      viewBox={compact ? "0 0 440 360" : "0 0 900 420"}
    >
      {board.bars.map((bar, i) => (
        <FractionBarVisual
          key={bar.id}
          bar={bar}
          y={compact ? 75 + i * 165 : 85 + i * 175}
          barWidth={compact ? 380 : 780}
          left={compact ? 30 : 55}
          height={compact ? 78 : 90}
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
