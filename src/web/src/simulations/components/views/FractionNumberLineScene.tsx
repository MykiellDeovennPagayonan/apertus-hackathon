import { dispatchCommand } from "../../runtime/session";
import type { NumberLineBoard } from "../traits/MathBoards";
import { FractionJumpVisual } from "../visuals/FractionJumpVisual";
import { NumberLineVisual } from "../visuals/NumberLineVisual";
import { SVGWorldView } from "./SVGWorldView";
export function FractionNumberLineScene({ board }: { board: NumberLineBoard }) {
  const marker =
    board.mode === "place" ? board.placed : board.jumps[board.sequence.cursor];
  return (
    <SVGWorldView
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
        onTick={(tick) =>
          dispatchCommand(board.demo, { type: "PLACE_FRACTION", value: tick })
        }
      />
    </SVGWorldView>
  );
}
