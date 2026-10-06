import { useRef } from "react";
import { dispatchCommand } from "../../runtime/session";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { CountingBoard } from "../traits/MathBoards";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { CountingBoxVisual } from "../visuals/CountingBoxVisual";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram } from "./useCompactDiagram";
export function CountingScene({
  board,
  onCommand = (command) => dispatchCommand(board.demo, command),
}: {
  board: CountingBoard;
  onCommand?: (
    command: import("../../runtime/types").UIAction,
  ) => import("../../runtime/commands").ActionResult;
}) {
  const surface = useRef<SVGSVGElement>(null);
  const compact = useCompactDiagram(surface);
  const outsideCount = board.tokens.filter((token) => token.zone === 0).length;
  const insideCount = board.tokens.length - outsideCount;
  const boxTop = 140 + Math.ceil(outsideCount / 5) * 62;
  const boxHeight = 100 + Math.max(1, Math.ceil(insideCount / 5)) * 62;
  return (
    <div className="counting-activity">
      <h2 className="math-activity-heading">
        {board.mode === "count"
          ? "Tap each circle to count it"
          : "Tap a circle to move it"}
      </h2>
      <SVGWorldView
        ref={surface}
        className="math-scene-svg"
        role={board.sequence.looping ? "img" : "group"}
        aria-label={
          board.sequence.looping
            ? "Counting animation"
            : "Interactive counting circles"
        }
        viewBox={
          board.mode === "count"
            ? `0 0 ${compact ? 400 : 600} ${Math.max(1, Math.ceil(board.tokens.length / (board.tokens.length > 8 ? 4 : 3))) * 120 + 60}`
            : compact
              ? `0 0 400 ${boxTop + boxHeight + 20}`
              : "0 0 900 440"
        }
        style={
          board.mode === "count"
            ? {
                minWidth: 0,
                width: "100%",
                height: "100%",
              }
            : undefined
        }
      >
        {board.mode === "place" &&
          (compact ? (
            <g>
              <rect
                x="15"
                y={boxTop}
                width="370"
                height={boxHeight}
                rx="16"
                fill="#eff7f1"
                stroke="#237f63"
                strokeDasharray="8 6"
              />
              <text x="30" y={boxTop + 35} className="math-scene-label">
                Put {board.target} circles in this box
              </text>
            </g>
          ) : (
            <CountingBoxVisual target={board.target} />
          ))}
        {board.mode !== "count" && (
          <text x={40} y={35} className="math-scene-label">
            {board.sequence.looping
              ? "Watch the circles go in"
              : "Tap a circle to move it"}
          </text>
        )}
        {board.tokens.map((t, i) => {
          const zoneTokens = board.tokens.filter(
            (other) => other.zone === t.zone,
          );
          const index = zoneTokens.findIndex((other) => other.id === t.id);
          const x =
            board.mode === "count"
              ? compact
                ? board.tokens.length > 8
                  ? 50 + (i % 4) * 100
                  : 65 + (i % 3) * 135
                : board.tokens.length > 8
                  ? 75 + (i % 4) * 150
                  : 100 + (i % 3) * 200
              : compact
                ? 65 + (index % 5) * 66
                : (t.zone === 1 ? 510 : 60) + (index % 5) * 73;
          const y =
            board.mode === "count"
              ? 100 + Math.floor(i / (board.tokens.length > 8 ? 4 : 3)) * 120
              : compact
                ? (t.zone === 1 ? boxTop + 85 : 100) +
                  Math.floor(index / 5) * 62
                : 135 + Math.floor(index / 5) * 67;
          return (
            <MathObjectControl
              key={t.id}
              passive={board.sequence.looping}
              label={`Circle ${i + 1}, ${board.mode === "count" ? (t.ordinal === null ? "not counted" : `counted as ${t.ordinal}`) : t.zone ? "in box; tap to remove" : "outside box; tap to place"}`}
              onCommand={() =>
                onCommand({
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
                color="#285e56"
                inactiveColor="#e5eee7"
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
    </div>
  );
}
