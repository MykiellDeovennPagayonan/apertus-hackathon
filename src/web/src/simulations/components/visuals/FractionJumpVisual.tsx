import { fractionText, rational } from "../systems/fractionMath";
import type { FractionValue } from "../traits/MathBoards";
import { lineX } from "./NumberLineVisual";
export function FractionJumpVisual({
  from,
  to,
  index,
}: {
  from: FractionValue;
  to: FractionValue;
  index: number;
}) {
  const x1 = lineX(from),
    x2 = lineX(to);
  const y = 190 - index * 45;
  const difference = rational(to.n * from.d - from.n * to.d, from.d * to.d);
  return (
    <g className="math-jump">
      <path
        d={`M ${x1} 235 Q ${(x1 + x2) / 2} ${y - 70} ${x2} 235`}
        fill="none"
        stroke="#245bcb"
        strokeWidth={3}
      />
      <path
        d={`M ${x2 - (x2 >= x1 ? 7 : -7)} 222 L ${x2} 235 L ${x2 + (x2 >= x1 ? 3 : -3)} 220`}
        fill="none"
        stroke="#245bcb"
        strokeWidth={3}
      />
      <text
        x={(x1 + x2) / 2}
        y={y - 10}
        textAnchor="middle"
        fill="#245bcb"
        fontSize={19}
      >
        {difference.n >= 0 ? "+" : ""}
        {fractionText(difference)}
      </text>
    </g>
  );
}
