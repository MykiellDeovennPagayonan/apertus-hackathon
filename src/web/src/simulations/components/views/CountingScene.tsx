import { dispatchCommand } from "../../runtime/session";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { CountingBoard } from "../traits/MathBoards";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { CountingBoxVisual } from "../visuals/CountingBoxVisual";
import { SVGWorldView } from "./SVGWorldView";
export function CountingScene({ board }: { board: CountingBoard }) {
  return (
    <SVGWorldView
      role={board.sequence.looping ? "img" : "group"}
      aria-label={
        board.sequence.looping
          ? "Counting animation"
          : "Interactive counting circles"
      }
      viewBox={
        board.mode === "count"
          ? `0 0 600 ${Math.max(1, Math.ceil(board.tokens.length / 3)) * 120 + 60}`
          : "0 0 900 440"
      }
      style={
        board.mode === "count"
          ? { minWidth: 0, maxWidth: 720, marginInline: "auto" }
          : undefined
      }
    >
      {board.mode === "place" && <CountingBoxVisual target={board.target} />}
      <text x={40} y={35} className="math-scene-label">
        {board.mode === "count"
          ? board.sequence.looping
            ? "Count along"
            : "Tap each circle once"
          : board.sequence.looping
            ? "Watch the circles go in"
            : "Tap a circle to move it"}
      </text>
      {board.tokens.map((t, i) => {
        const zoneTokens = board.tokens.filter(
          (other) => other.zone === t.zone,
        );
        const index = zoneTokens.findIndex((other) => other.id === t.id);
        const x =
          board.mode === "count"
            ? 100 + (i % 3) * 200
            : (t.zone === 1 ? 510 : 60) + (index % 5) * 73;
        const y =
          board.mode === "count"
            ? 100 + Math.floor(i / 3) * 120
            : 135 + Math.floor(index / 5) * 67;
        return (
          <MathObjectControl
            key={t.id}
            passive={board.sequence.looping}
            label={`Circle ${i + 1}, ${board.mode === "count" ? (t.ordinal === null ? "not counted" : `counted as ${t.ordinal}`) : t.zone ? "in box; tap to remove" : "outside box; tap to place"}`}
            onCommand={() =>
              dispatchCommand(board.demo, {
                type:
                  board.mode === "count"
                    ? "COUNT_TOKEN"
                    : t.zone
                      ? "REMOVE_TOKEN"
                      : "PLACE_TOKEN",
                value: t.id,
              })
            }
          >
            <CounterTokenVisual
              radius={board.mode === "count" ? 40 : 23}
              id={t.id}
              x={x}
              y={y}
              active={
                board.mode === "count" ? t.ordinal !== null : t.zone === 1
              }
              ordinal={board.mode === "count" ? t.ordinal : null}
            />
          </MathObjectControl>
        );
      })}
      {board.tokens.length === 0 && (
        <text
          x={board.mode === "count" ? 300 : 450}
          y={board.mode === "count" ? 100 : 210}
          textAnchor="middle"
          fontSize={40}
        >
          0 circles
        </text>
      )}
    </SVGWorldView>
  );
}
