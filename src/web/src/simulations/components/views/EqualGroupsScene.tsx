import { useRef } from "react";
import type { ActionResult } from "../../runtime/commands";
import type { UIAction } from "../../runtime/types";
import type { GroupingBoard } from "../traits/MathBoards";
import { BasketVisual } from "../visuals/BasketVisual";
import { CounterTokenVisual } from "../visuals/CounterTokenVisual";
import { SVGWorldView } from "./SVGWorldView";
import { useCompactDiagram, useReducedMotion } from "./useCompactDiagram";
export function EqualGroupsScene({
  board,
  onCommand,
}: {
  board: GroupingBoard;
  onCommand?: (command: UIAction) => ActionResult;
}) {
  const reduced = useReducedMotion();
  const done = board.sequence.cursor >= board.total - board.remainder;
  const playing = board.sequence.playing;
  const surface = useRef<SVGSVGElement>(null);
  const mobile = useCompactDiagram(surface, 450);
  const sceneWidth = mobile ? 400 : 640;
  const spacing = mobile ? 24 : 32;
  const columns = Math.min(board.groups, 3),
    width = (sceneWidth - 60) / columns - 20,
    tokenColumns = Math.max(1, Math.floor((width - 30) / spacing)),
    basketHeight = Math.max(
      mobile ? 100 : 170,
      (mobile ? 48 : 75) + Math.ceil(board.quotient / tokenColumns) * spacing,
    ),
    rowHeight = basketHeight + 30,
    rows = Math.ceil(board.groups / columns),
    trayY = rows * rowHeight + 45,
    trayColumns = Math.floor((sceneWidth - 70) / spacing),
    trayHeight = 48 + Math.ceil(board.total / trayColumns) * spacing;
  return (
    <div className="math-activity grouping-activity">
      <h2 className="math-activity-heading">
        {done
          ? `${board.quotient} in each basket · ${board.remainder} left over`
          : `Share ${board.total} circles equally`}
      </h2>
      <SVGWorldView
        ref={surface}
        className="math-scene-svg"
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
            ? 45 + (index % trayColumns) * spacing
            : 52 +
              (t.zone % columns) * (width + 20) +
              (index % tokenColumns) * spacing;
          const y = inTray
            ? trayY + 30 + Math.floor(index / trayColumns) * spacing
            : (mobile ? 70 : 90) +
              Math.floor(t.zone / columns) * rowHeight +
              Math.floor(index / tokenColumns) * spacing;
          return (
            <CounterTokenVisual
              key={t.id}
              id={t.id}
              x={x}
              y={y}
              animated={!reduced}
              radius={mobile ? 9 : 12}
              active={!inTray}
              color={inTray ? "#cc543d" : "#245bcb"}
            />
          );
        })}
      </SVGWorldView>
      {onCommand && (
        <button
          className="math-activity-action"
          type="button"
          disabled={playing}
          onClick={() => {
            if (done) {
              onCommand({ type: "REPLAY" });
              return;
            }
            if (reduced) {
              for (
                let i = board.sequence.cursor;
                i < board.total - board.remainder;
                i++
              )
                onCommand({ type: "DISTRIBUTE_NEXT" });
            } else {
              onCommand({ type: "DISTRIBUTE_NEXT" });
              onCommand({ type: "SET_PLAYING", value: true });
            }
          }}
        >
          {playing
            ? "Sharing circles…"
            : done
              ? "Share again"
              : "Share circles"}
        </button>
      )}
    </div>
  );
}
