import type { ActionResult } from "../../runtime/commands";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { FractionBar } from "../traits/MathBoards";
export function FractionBarVisual({
  bar,
  y,
  label,
  onPiece,
  interactive = true,
  barWidth = 780,
  left = 55,
  height = 90,
  labelSize,
}: {
  bar: FractionBar;
  y: number;
  barWidth?: number;
  left?: number;
  height?: number;
  labelSize?: number;
  label: string;
  interactive?: boolean;
  onPiece: (piece: number) => ActionResult;
}) {
  const width = barWidth / bar.value.d;
  return (
    <g>
      <text
        x={left}
        y={y - 20}
        className="math-scene-label"
        style={labelSize ? { fontSize: labelSize } : undefined}
      >
        {label} · {bar.value.n}/{bar.value.d}
      </text>
      {bar.shaded.map((shaded, i) => (
        <MathObjectControl
          key={`${bar.id}/${bar.value.d}/${i}`}
          label={`${label} piece ${i + 1} of ${bar.value.d}, ${shaded ? "shaded" : "unshaded"}`}
          onCommand={() => onPiece(i)}
          passive={!interactive}
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
