import type { ActionResult } from "../../runtime/commands";
import { DragHandleControl } from "../controls/DragHandleControl";
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
  compact = false,
}: {
  compact?: boolean;
  divisions: number;
  marker: FractionValue;
  interactive: boolean;
  onTick: (tick: number) => ActionResult;
}) {
  const start = compact ? 24 : 60,
    extent = compact ? 312 : 780,
    baseline = compact ? 120 : 255;
  return (
    <g>
      <line
        x1={start}
        x2={start + extent}
        y1={baseline}
        y2={baseline}
        stroke="#48566b"
        strokeWidth={3}
      />
      {Array.from({ length: 3 * divisions + 1 }, (_, tick) => ({
        value: tick,
        id: `tick-${divisions}-${tick}`,
      })).map(({ value: i, id }) => {
        const x = start + (i / divisions / 3) * extent;
        const whole = i % divisions === 0;
        const tick = (
          <g key={id}>
            <rect
              x={x - 10}
              y={baseline - 20}
              width={20}
              height={65}
              fill="transparent"
            />
            <line
              x1={x}
              x2={x}
              y1={baseline - (whole ? 17 : 8)}
              y2={baseline + (whole ? 20 : 11)}
              stroke="#48566b"
              strokeWidth={whole ? 3 : 1}
            />
            {whole && (
              <text
                x={x}
                y={baseline + 49}
                textAnchor="middle"
                fontSize={compact ? 18 : 23}
              >
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
        style={{
          transform: `translate(${start + (marker.n / marker.d / 3) * extent}px, ${baseline}px)`,
        }}
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
      {interactive && (
        <DragHandleControl
          target=""
          cx={start + (marker.n / marker.d / 3) * extent}
          cy={baseline}
          label="Move fraction marker"
          keyboardStep={extent / (3 * divisions)}
          onCommand={(command) => onTick(Number(command.value))}
          map={(x) => ({
            type: "PLACE_FRACTION",
            value: Math.max(
              0,
              Math.min(
                3 * divisions,
                Math.round(((x - start) / extent) * 3 * divisions),
              ),
            ),
          })}
        />
      )}
    </g>
  );
}
