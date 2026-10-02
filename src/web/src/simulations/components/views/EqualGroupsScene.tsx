import type { GroupingBoard } from "../traits/MathBoards";
import { BasketVisual } from "../visuals/BasketVisual";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { SVGWorldView } from "./SVGWorldView";
export function EqualGroupsScene({ board }: { board: GroupingBoard }) {
  const columns = Math.min(board.groups, 3),
    width = 840 / columns - 20,
    rows = Math.ceil(board.groups / columns),
    trayY = rows * 200 + 45;
  return (
    <SVGWorldView
      aria-label={`${board.groups} baskets; ${board.sequence.cursor} of ${board.total} circles distributed`}
      viewBox={`0 0 900 ${trayY + 180}`}
    >
      {board.baskets.map((basket, i) => (
        <BasketVisual
          key={basket.id}
          x={30 + (i % columns) * (width + 20)}
          y={30 + Math.floor(i / columns) * 200}
          width={width}
          label={`Basket ${i + 1}`}
          count={board.tokens.filter((t) => t.zone === i).length}
        />
      ))}
      <text x={35} y={trayY} className="math-scene-label">
        {board.sequence.cursor >= board.total - board.remainder
          ? "Left over"
          : "Waiting to share"}{" "}
        · {board.total - board.sequence.cursor}
      </text>
      {board.tokens.map((t) => {
        const index = board.tokens
          .filter((other) => other.zone === t.zone)
          .findIndex((other) => other.id === t.id);
        const inTray = t.zone < 0;
        const tokenColumns = Math.max(4, Math.floor((width - 30) / 32));
        const x = inTray
          ? 45 + (index % 25) * 32
          : 52 +
            (t.zone % columns) * (width + 20) +
            (index % tokenColumns) * 32;
        const y = inTray
          ? trayY + 35 + Math.floor(index / 25) * 35
          : 90 +
            Math.floor(t.zone / columns) * 200 +
            Math.floor(index / tokenColumns) * 33;
        return (
          <CounterTokenVisual
            key={t.id}
            id={t.id}
            x={x}
            y={y}
            radius={12}
            active={!inTray}
            color={inTray ? "#cc543d" : "#245bcb"}
          />
        );
      })}
    </SVGWorldView>
  );
}
