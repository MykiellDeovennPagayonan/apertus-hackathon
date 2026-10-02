import { dispatchCommand } from "../../runtime/session";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { ArithmeticBoard } from "../traits/MathBoards";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { OperationZonesVisual } from "../visuals/OperationZonesVisual";
import { SVGWorldView } from "./SVGWorldView";
export function ArithmeticScene({ board }: { board: ArithmeticBoard }) {
  return (
    <SVGWorldView
      role={board.sequence.looping ? "img" : "group"}
      aria-label={
        board.sequence.looping
          ? "Addition and subtraction animation"
          : "Move circles to solve the operation"
      }
      viewBox={`0 0 900 ${board.b > 12 ? 550 : 420}`}
    >
      <OperationZonesVisual
        subtract={board.operation === "subtract"}
        height={board.b > 12 ? 435 : 300}
      />
      {board.tokens.map((t) => {
        const index = board.tokens
          .filter((other) => other.zone === t.zone)
          .findIndex((other) => other.id === t.id);
        const right = t.zone !== 0;
        const x = (right ? 610 : 70) + (index % (right ? 4 : 7)) * 62;
        const y = 135 + Math.floor(index / (right ? 4 : 7)) * 67;
        const disabled =
          board.sequence.cursor >= board.b ||
          (board.operation === "add" ? t.zone !== 1 : t.zone !== 0);
        return (
          <MathObjectControl
            key={t.id}
            passive={board.sequence.looping}
            label={`Circle ${t.order + 1}, ${right ? (board.operation === "add" ? "waiting to add" : "taken away") : "in result group"}`}
            disabled={disabled}
            onCommand={() =>
              dispatchCommand(board.demo, { type: "MOVE_TOKEN", value: t.id })
            }
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
