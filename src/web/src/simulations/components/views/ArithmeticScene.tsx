import { useRef } from "react";
import { dispatchCommand } from "../../runtime/session";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { ArithmeticBoard } from "../traits/MathBoards";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram, useReducedMotion } from "./useCompactDiagram";

export function ArithmeticScene({
  board,
  onCommand = (command) => dispatchCommand(board.demo, command),
}: {
  board: ArithmeticBoard;
  onCommand?: (
    command: import("../../runtime/types").UIAction,
  ) => import("../../runtime/commands").ActionResult;
}) {
  const surface = useRef<SVGSVGElement>(null);
  const compact = useCompactDiagram(surface, 450);
  const columns = compact ? 2 : 5;
  const reducedMotion = useReducedMotion();
  const playing = board.sequence.playing;
  const groups = [
    board.tokens.filter((token) => token.zone === 0),
    board.tokens.filter((token) => token.zone !== 0),
  ];
  const done = board.sequence.cursor >= board.b;
  const subtract = board.operation === "subtract";
  const height =
    90 +
    Math.max(1, Math.ceil((subtract ? board.a : board.a + board.b) / columns)) *
      62;
  const width = compact ? 330 : 640;
  const remaining = board.b - board.sequence.cursor;
  const actionLabel = playing
    ? subtract
      ? "Taking circles away…"
      : "Adding circles…"
    : done
      ? "Try again"
      : `${subtract ? "Take away" : "Add"} ${remaining} ${remaining === 1 ? "circle" : "circles"}`;
  return (
    <div className="math-activity">
      <h2 className="math-activity-heading">
        {done
          ? `${board.a} ${subtract ? "−" : "+"} ${board.b} = ${board.result}`
          : `${subtract ? "Take away" : "Add"} ${board.b} ${board.b === 1 ? "circle" : "circles"}${subtract ? ` from ${board.a}` : ` to ${board.a}`}`}
      </h2>
      <p className="math-activity-hint">
        {done
          ? `${board.result} ${board.result === 1 ? "circle" : "circles"} ${subtract ? "left" : "together"}.`
          : "Press the button below, or tap a circle to move it."}
      </p>
      <SVGWorldView
        ref={surface}
        className="math-scene-svg arithmetic-scene"
        role={board.sequence.looping ? "img" : "group"}
        aria-label={
          subtract
            ? "Tap circles in the first group to take them away"
            : "Tap circles in the second group to bring them together"
        }
        viewBox={`0 0 ${width} ${height + 40}`}
        style={{ width: "100%", height: "100%" }}
      >
        {groups.map((tokens, zone) => {
          const left = compact
            ? zone === 0
              ? 10
              : 175
            : zone === 0
              ? 12
              : 338;
          const color = zone === 0 ? "#285e56" : "#a5752b";
          return (
            <g key={zone === 0 ? "result-group" : "action-group"}>
              <rect
                x={left}
                y={18}
                width={compact ? 145 : 290}
                height={height}
                rx={18}
                fill={zone === 0 ? "#e4eee6" : "#f5ecdb"}
                stroke={color}
                strokeWidth={2}
              />
              <text
                x={left + (compact ? 10 : 18)}
                y={52}
                fill={color}
                fontSize={19}
                fontWeight={600}
              >
                {zone === 0
                  ? subtract
                    ? "Circles left"
                    : "Together"
                  : subtract
                    ? "Taken away"
                    : "To add"}
              </text>
              {tokens.length === 0 && (
                <text
                  x={left + (compact ? 72 : 145)}
                  y={115}
                  textAnchor="middle"
                  fill={color}
                  fontSize={26}
                >
                  0
                </text>
              )}
            </g>
          );
        })}
        {board.tokens.map((token) => {
          const zone = token.zone === 0 ? 0 : 1;
          const index = groups[zone].findIndex(
            (candidate) => candidate.id === token.id,
          );
          const left = compact
            ? zone === 0
              ? 10
              : 175
            : zone === 0
              ? 12
              : 338;
          const color = zone === 0 ? "#285e56" : "#a5752b";
          return (
            <MathObjectControl
              key={token.id}
              passive={board.sequence.looping}
              disabled={playing || done || (subtract ? zone !== 0 : zone !== 1)}
              label={`Circle ${token.order + 1}, ${zone === 0 ? "in result group" : subtract ? "taken away" : "waiting to add"}`}
              onCommand={() =>
                onCommand({ type: "MOVE_TOKEN", value: token.id })
              }
            >
              <CounterTokenVisual
                id={token.id}
                x={left + 35 + (index % columns) * (compact ? 65 : 55)}
                y={98 + Math.floor(index / columns) * 62}
                color={color}
                radius={compact ? 26 : 21}
                active
                animated={!reducedMotion}
              />
            </MathObjectControl>
          );
        })}

        <text
          x={width / 2}
          y={18 + height / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#77796c"
          fontSize={26}
        >
          {subtract ? "−" : "+"}
        </text>
      </SVGWorldView>
      <button
        type="button"
        className="math-activity-action"
        disabled={playing}
        onClick={() => {
          if (done) {
            onCommand({ type: "REPLAY" });
            return;
          }
          const tokens = subtract ? groups[0].slice(0, remaining) : groups[1];
          if (reducedMotion) {
            for (const token of tokens)
              onCommand({ type: "MOVE_TOKEN", value: token.id });
          } else {
            const first = onCommand({ type: "NEXT_STEP" });
            if (first.accepted && remaining > 1)
              onCommand({ type: "SET_PLAYING", value: true });
          }
        }}
      >
        {actionLabel}
      </button>
    </div>
  );
}
