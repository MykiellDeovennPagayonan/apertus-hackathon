import { useRef } from "react";
import type { ActionResult } from "../../runtime/commands";
import type { UIAction } from "../../runtime/types";
import type { FractionComparisonBoard } from "../traits/MathBoards";
import { FractionBarVisual } from "../visuals/FractionBarVisual";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram } from "./useCompactDiagram";
export function FractionBuilderScene({
  board,
  onCommand,
  interactive = true,
  compact: compactOverride,
}: {
  board: FractionComparisonBoard;
  onCommand: (command: UIAction) => ActionResult;
  interactive?: boolean;
  compact?: boolean;
}) {
  const surface = useRef<SVGSVGElement>(null);
  const viewportCompact = useCompactDiagram(surface);
  const compact = compactOverride ?? viewportCompact;
  return (
    <SVGWorldView
      ref={surface}
      role="group"
      aria-label="Two equal-sized fraction bars. Tap pieces to shade or unshade."
      viewBox={compact ? "0 0 440 360" : "0 0 900 420"}
    >
      {board.bars.map((bar, i) => (
        <FractionBarVisual
          key={bar.id}
          bar={bar}
          interactive={interactive}
          y={compact ? 75 + i * 165 : 85 + i * 175}
          barWidth={compact ? 380 : 780}
          left={compact ? 30 : 55}
          height={compact ? 78 : 90}
          labelSize={compact ? 24 : 28}
          label={`Bar ${i === 0 ? "A" : "B"}`}
          onPiece={(piece) =>
            !interactive
              ? {
                  accepted: false,
                  error: "Direct shading is disabled for this lesson.",
                }
              : onCommand({
                  type: "TOGGLE_FRACTION_PIECE",
                  value: { bar: i, piece },
                })
          }
        />
      ))}
    </SVGWorldView>
  );
}
