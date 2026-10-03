import type { ActionResult } from "../../runtime/commands";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { FractionBar } from "../traits/MathBoards";
export function FractionBarVisual({
  bar,
  y,
  label,
  onPiece,
  barWidth = 780,
  left = 55,
  height = 90,
}: {
  bar: FractionBar;
  y: number;
  barWidth?: number;
  left?: number;
  height?: number;
  label: string;
  onPiece: (piece: number) => ActionResult;
}) {
  const width = barWidth / bar.value.d;
  return (
    <g>
      <text x={left} y={y - 20} className="math-scene-label">
        {label} · {bar.value.n}/{bar.value.d}
      </text>
      {bar.shaded.map((shaded, i) => (
        <MathObjectControl
          key={`${bar.id}/${bar.value.d}/${i}`}
          label={`${label} piece ${i + 1} of ${bar.value.d}, ${shaded ? "shaded" : "unshaded"}`}
          onCommand={() => onPiece(i)}
        >
          <rect
            x={left + i * width}
            y={y}
            width={width}
            height={height}
            fill={shaded ? "#245bcb" : "#eef2fb"}
            stroke="#fffdf7"
            strokeWidth={3}
          />
        </MathObjectControl>
      ))}
      <rect
        x={left}
        y={y}
        width={barWidth}
        height={height}
        rx={3}
        fill="none"
        stroke="#245bcb"
        strokeWidth={2}
        pointerEvents="none"
      />
    </g>
  );
}
