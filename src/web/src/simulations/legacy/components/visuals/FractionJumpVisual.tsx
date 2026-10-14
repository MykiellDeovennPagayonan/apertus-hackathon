import { fractionText, rational } from "../systems/fractionMath";
import type { FractionValue } from "../traits/MathBoards";
import { lineX } from "./NumberLineVisual";
export function FractionJumpVisual({
  from,
  to,
  index,
  compact = false,
}: {
  from: FractionValue;
  to: FractionValue;
  index: number;
  compact?: boolean;
}) {
  const x1 = compact ? 24 + (from.n / from.d / 3) * 312 : lineX(from),
    x2 = compact ? 24 + (to.n / to.d / 3) * 312 : lineX(to);
  const y = (compact ? 80 : 190) - index * (compact ? 28 : 45);
  const baseline = compact ? 100 : 235;
  const difference = rational(to.n * from.d - from.n * to.d, from.d * to.d);
  return (
    <g className="math-jump">
      <path
        d={`M ${x1} ${baseline} Q ${(x1 + x2) / 2} ${y - (compact ? 40 : 70)} ${x2} ${baseline}`}
        fill="none"
        stroke="#245bcb"
        strokeWidth={3}
      />
      <path
        d={`M ${x2 - (x2 >= x1 ? 7 : -7)} ${baseline - 13} L ${x2} ${baseline} L ${x2 + (x2 >= x1 ? 3 : -3)} ${baseline - 15}`}
        fill="none"
        stroke="#245bcb"
        strokeWidth={3}
      />
      <text
        x={(x1 + x2) / 2}
        y={y - 10}
        textAnchor="middle"
        fill="#245bcb"
        fontSize={compact ? 16 : 19}
      >
        {difference.n >= 0 ? "+" : ""}
        {fractionText(difference)}
      </text>
    </g>
  );
}
