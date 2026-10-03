import { useSyncExternalStore } from "react";
import type { GroupingBoard } from "../traits/MathBoards";
import { BasketVisual } from "../visuals/BasketVisual";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { SVGWorldView } from "./SVGWorldView";

const subscribe = (listener: () => void) => {
  const query = matchMedia("(max-width: 650px)");
  query.addEventListener("change", listener);
  return () => query.removeEventListener("change", listener);
};
const mobileSnapshot = () => matchMedia("(max-width: 650px)").matches;
export function EqualGroupsScene({ board }: { board: GroupingBoard }) {
  const mobile = useSyncExternalStore(subscribe, mobileSnapshot, () => false);
  const sceneWidth = mobile ? 400 : 900;
  const columns = Math.min(board.groups, mobile ? 2 : 3),
    width = (sceneWidth - 60) / columns - 20,
    tokenColumns = Math.max(1, Math.floor((width - 30) / 32)),
    basketHeight = Math.max(
      mobile ? 135 : 170,
      75 + Math.ceil(board.quotient / tokenColumns) * 33,
    ),
    rowHeight = basketHeight + 30,
    rows = Math.ceil(board.groups / columns),
    trayY = rows * rowHeight + 45,
    trayColumns = Math.floor((sceneWidth - 70) / 32),
    trayHeight = 60 + Math.ceil(board.total / trayColumns) * 35;
  return (
    <SVGWorldView
      aria-label={`${board.groups} baskets; ${board.sequence.cursor} of ${board.total} circles distributed`}
      viewBox={`0 0 ${sceneWidth} ${trayY + trayHeight}`}
    >
      {board.baskets.map((basket, i) => (
        <BasketVisual
          key={basket.id}
          x={30 + (i % columns) * (width + 20)}
          y={30 + Math.floor(i / columns) * rowHeight}
          width={width}
          height={basketHeight}
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
        const x = inTray
          ? 45 + (index % trayColumns) * 32
          : 52 +
            (t.zone % columns) * (width + 20) +
            (index % tokenColumns) * 32;
        const y = inTray
          ? trayY + 35 + Math.floor(index / trayColumns) * 35
          : 90 +
            Math.floor(t.zone / columns) * rowHeight +
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
