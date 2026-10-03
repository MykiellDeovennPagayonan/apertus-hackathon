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
        fill="#e6ecdf"
        stroke="var(--accent)"
        strokeWidth={3}
      />
      {children}
    </g>
  );
}
