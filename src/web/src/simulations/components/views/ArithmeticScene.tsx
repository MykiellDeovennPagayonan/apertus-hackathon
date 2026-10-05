import { useRef } from "react";
import { dispatchCommand } from "../../runtime/session";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { ArithmeticBoard } from "../traits/MathBoards";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { OperationZonesVisual } from "../visuals/OperationZonesVisual";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram } from "./useCompactDiagram";
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
  const compact = useCompactDiagram(surface);
  const resultCount = board.tokens.filter((token) => token.zone === 0).length;
  const otherCount = board.tokens.length - resultCount;
  const resultHeight = 85 + Math.max(1, Math.ceil(resultCount / 5)) * 62;
  const otherHeight = 85 + Math.max(1, Math.ceil(otherCount / 5)) * 62;
  const otherTop = resultHeight + 75;
  return (
    <SVGWorldView
      ref={surface}
      scrollable
      className="math-scene-svg"
      role={board.sequence.looping ? "img" : "group"}
      aria-label={
        board.sequence.looping
          ? "Addition and subtraction animation"
          : "Move circles to solve the operation"
      }
      viewBox={
        compact
          ? `0 0 400 ${otherTop + otherHeight + 25}`
          : `0 0 900 ${board.b > 12 ? 550 : 420}`
      }
    >
      {compact ? (
        <g>
          <rect
            x="15"
            y="55"
            width="370"
            height={resultHeight}
            rx="16"
            fill="#eff3fc"
          />
          <text x="30" y="92" className="math-scene-label">
            {board.operation === "subtract"
              ? "Circles remaining"
              : "Circles together"}
          </text>
          <rect
            x="15"
            y={otherTop}
            width="370"
            height={otherHeight}
            rx="16"
            fill="#fcf0eb"
          />
          <text x="30" y={otherTop + 37} className="math-scene-label">
            {board.operation === "subtract" ? "Taken away" : "Circles to add"}
          </text>
        </g>
      ) : (
        <OperationZonesVisual
          subtract={board.operation === "subtract"}
          height={board.b > 12 ? 435 : 300}
        />
      )}
      {board.tokens.map((t) => {
        const index = board.tokens
          .filter((other) => other.zone === t.zone)
          .findIndex((other) => other.id === t.id);
        const right = t.zone !== 0;
        const x = compact
          ? 65 + (index % 5) * 66
          : (right ? 610 : 70) + (index % (right ? 4 : 7)) * 62;
        const y = compact
          ? (right ? otherTop + 80 : 130) + Math.floor(index / 5) * 62
          : 135 + Math.floor(index / (right ? 4 : 7)) * 67;
        const disabled =
          board.sequence.cursor >= board.b ||
          (board.operation === "add" ? t.zone !== 1 : t.zone !== 0);
        return (
          <MathObjectControl
            key={t.id}
            passive={board.sequence.looping}
            label={`Circle ${t.order + 1}, ${right ? (board.operation === "add" ? "waiting to add" : "taken away") : "in result group"}`}
            disabled={disabled}
            onCommand={() => onCommand({ type: "MOVE_TOKEN", value: t.id })}
          >
            <CounterTokenVisual
              id={t.id}
              x={x}
              y={y}
              color={right ? "#cc543d" : "#245bcb"}
              active
            />
          </MathObjectControl>
        );
      })}
    </SVGWorldView>
  );
}
