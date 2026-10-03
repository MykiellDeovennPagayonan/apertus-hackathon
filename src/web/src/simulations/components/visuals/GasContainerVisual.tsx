import type { ReactNode } from "react";
export function GasContainerVisual({
  volume,
  children,
}: {
  volume: number;
  children: ReactNode;
}) {
  const width = 260 * volume,
    left = (600 - width) / 2;
  return (
    <g>
      <rect
        x={left}
        y={25}
        width={width}
        height={240}
        rx={8}
        fill="#edf6ff"
        stroke="#245bcb"
        strokeWidth={3}
      />
      {children}
      <text x={300} y={295} textAnchor="middle" fontSize={16}>
        Fixed-depth schematic · {volume} L
      </text>
    </g>
  );
}
