import { useRef } from "react";
import { dispatchCommand } from "../../runtime/session";
import type { NumberLineBoard } from "../traits/MathBoards";
import { FractionJumpVisual } from "../visuals/FractionJumpVisual";
import { NumberLineVisual } from "../visuals/NumberLineVisual";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram, useReducedMotion } from "./useCompactDiagram";
export function FractionNumberLineScene({
  board,
  onCommand = (command) => dispatchCommand(board.demo, command),
}: {
  board: NumberLineBoard;
  onCommand?: (
    command: import("../../runtime/types").UIAction,
  ) => import("../../runtime/commands").ActionResult;
}) {
  const surface = useRef<SVGSVGElement>(null);
  const compact = useCompactDiagram(surface, 450);
  const reduced = useReducedMotion();
  const done = board.sequence.cursor >= board.jumps.length - 1;
  const marker =
    board.mode === "place" ? board.placed : board.jumps[board.sequence.cursor];
  return (
    <div className="math-activity number-line-activity">
      <h2 className="math-activity-heading">
        {board.mode === "place"
          ? `Place ${board.a.n}/${board.a.d}`
          : board.mode === "add"
            ? "Addition moves right"
            : "Subtraction moves left"}
      </h2>
      <SVGWorldView
        ref={surface}
        role={board.mode === "place" ? "group" : "img"}
        aria-label="Fraction number line from zero to three wholes"
        viewBox={
          compact
            ? board.mode === "place"
              ? "0 65 360 110"
              : "0 0 360 180"
            : board.mode === "place"
              ? "0 180 900 180"
              : "0 0 900 370"
        }
      >
        {board.jumps.slice(1, board.sequence.cursor + 1).map((to, i) => (
          <FractionJumpVisual
            key={`${board.sequence.run}/${i}`}
            compact={compact}
            from={board.jumps[i]}
            to={to}
            index={i}
          />
        ))}
        <NumberLineVisual
          compact={compact}
          divisions={board.divisions}
          marker={marker}
          interactive={board.mode === "place"}
          onTick={(tick) => onCommand({ type: "PLACE_FRACTION", value: tick })}
        />
      </SVGWorldView>
      <button
        type="button"
        className="math-activity-action"
        disabled={board.sequence.playing}
        onClick={() => {
          if (board.mode === "place") {
            onCommand({ type: "CHECK_PLACEMENT" });
            return;
          }
          if (done) {
            onCommand({ type: "REPLAY" });
            return;
          }
          if (reduced)
            for (let i = board.sequence.cursor; i < board.jumps.length - 1; i++)
              onCommand({ type: "NEXT_STEP" });
          else {
            onCommand({ type: "NEXT_STEP" });
            onCommand({ type: "SET_PLAYING", value: true });
          }
        }}
      >
        {board.mode === "place"
          ? "Check placement"
          : board.sequence.playing
            ? "Showing jumps…"
            : done
              ? "Try again"
              : "Show jumps"}
      </button>
    </div>
  );
}
