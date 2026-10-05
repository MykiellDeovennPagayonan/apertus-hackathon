import { dispatchCommand } from "../../runtime/session";
import type { NumberLineBoard } from "../traits/MathBoards";
import { FractionJumpVisual } from "../visuals/FractionJumpVisual";
import { NumberLineVisual } from "../visuals/NumberLineVisual";
import { SVGWorldView } from "./SVGWorldView";
export function FractionNumberLineScene({
  board,
  onCommand = (command) => dispatchCommand(board.demo, command),
}: {
  board: NumberLineBoard;
  onCommand?: (
    command: import("../../runtime/types").UIAction,
  ) => import("../../runtime/commands").ActionResult;
}) {
  const marker =
    board.mode === "place" ? board.placed : board.jumps[board.sequence.cursor];
  return (
    <section
      className="simulation-scroll"
      aria-label="Fraction number line; scroll horizontally to inspect all ticks"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Bounded horizontal scene overflow needs keyboard scrolling.
      tabIndex={0}
    >
      <SVGWorldView
        style={{ minWidth: 650 }}
        role={board.mode === "place" ? "group" : "img"}
        aria-label="Fraction number line from zero to three wholes"
        viewBox={board.mode === "place" ? "0 180 900 180" : "0 0 900 370"}
      >
        <text
          x={60}
          y={board.mode === "place" ? 210 : 50}
          className="math-scene-label"
        >
          {board.mode === "place"
            ? "Choose a tick to place the marker"
            : "Follow each jump along the line"}
        </text>
        {board.jumps.slice(1, board.sequence.cursor + 1).map((to, i) => (
          <FractionJumpVisual
            key={`${board.sequence.run}/${i}`}
            from={board.jumps[i]}
            to={to}
            index={i}
          />
        ))}
        <NumberLineVisual
          divisions={board.divisions}
          marker={marker}
          interactive={board.mode === "place"}
          onTick={(tick) => onCommand({ type: "PLACE_FRACTION", value: tick })}
        />
      </SVGWorldView>
    </section>
  );
}
