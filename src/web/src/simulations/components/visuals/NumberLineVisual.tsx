import type { ActionResult } from "../../runtime/commands";
import { MathObjectControl } from "../controls/MathObjectControl";
import { fractionText } from "../systems/fractionMath";
import type { FractionValue } from "../traits/MathBoards";
import { ShapeVisual2D } from "./ShapeVisual2D";
export const lineX = (f: FractionValue) => 60 + (f.n / f.d / 3) * 780;
export function NumberLineVisual({
  divisions,
  marker,
  interactive,
  onTick,
}: {
  divisions: number;
  marker: FractionValue;
  interactive: boolean;
  onTick: (tick: number) => ActionResult;
}) {
  return (
    <g>
      <line
        x1={60}
        x2={840}
        y1={255}
        y2={255}
        stroke="#48566b"
        strokeWidth={3}
      />
      {Array.from({ length: 3 * divisions + 1 }, (_, tick) => ({
        value: tick,
        id: `tick-${divisions}-${tick}`,
      })).map(({ value: i, id }) => {
        const x = 60 + (i / divisions / 3) * 780;
        const whole = i % divisions === 0;
        const tick = (
          <g key={id}>
            <rect
              x={x - 10}
              y={235}
              width={20}
              height={65}
              fill="transparent"
            />
            <line
              x1={x}
              x2={x}
              y1={whole ? 238 : 247}
              y2={whole ? 275 : 266}
              stroke="#48566b"
              strokeWidth={whole ? 3 : 1}
            />
            {whole && (
              <text x={x} y={304} textAnchor="middle" fontSize={23}>
                {i / divisions}
              </text>
            )}
          </g>
        );
        return interactive ? (
          <MathObjectControl
            key={id}
            label={`Place marker at ${i}/${divisions}`}
            onCommand={() => onTick(i)}
          >
            {tick}
          </MathObjectControl>
        ) : (
          <g key={id}>{tick}</g>
        );
      })}
      <g
        className="math-token"
        style={{ transform: `translate(${lineX(marker)}px, 255px)` }}
      >
        <ShapeVisual2D r={11} fill="#cc543d" />
        <text
          y={-22}
          textAnchor="middle"
          fill="#a53623"
          fontSize={18}
          fontWeight={700}
        >
          {fractionText(marker)}
        </text>
      </g>
    </g>
  );
}
