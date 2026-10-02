import type { ActionResult } from "../../runtime/commands";
import { MathObjectControl } from "../controls/MathObjectControl";
import type { FractionBar } from "../traits/MathBoards";
export function FractionBarVisual({
  bar,
  y,
  label,
  onPiece,
}: {
  bar: FractionBar;
  y: number;
  label: string;
  onPiece: (piece: number) => ActionResult;
}) {
  const width = 780 / bar.value.d;
  return (
    <g>
      <text x={55} y={y - 20} className="math-scene-label">
        {label} · {bar.value.n}/{bar.value.d}
      </text>
      {bar.shaded.map((shaded, i) => (
        <MathObjectControl
          key={`${bar.id}/${bar.value.d}/${i}`}
          label={`${label} piece ${i + 1} of ${bar.value.d}, ${shaded ? "shaded" : "unshaded"}`}
          onCommand={() => onPiece(i)}
        >
          <rect
            x={55 + i * width}
            y={y}
            width={width}
            height={90}
            fill={shaded ? "#245bcb" : "#eef2fb"}
            stroke="#fffdf7"
            strokeWidth={3}
          />
        </MathObjectControl>
      ))}
      <rect
        x={55}
        y={y}
        width={780}
        height={90}
        rx={3}
        fill="none"
        stroke="#245bcb"
        strokeWidth={2}
        pointerEvents="none"
      />
    </g>
  );
}
