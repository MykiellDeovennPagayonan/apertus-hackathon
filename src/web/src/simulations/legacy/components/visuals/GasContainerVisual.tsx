import type { ReactNode } from "react";
export function GasContainerVisual({
  volume,
  children,
}: {
  volume: number;
  children: ReactNode;
}) {
  const width = 240 * volume;
  const piston = 36 + width;
  return (
    <g>
      <rect
        x={32}
        y={25}
        width={488}
        height={240}
        rx={10}
        fill="#f2f0e6"
        stroke="var(--border, #d5cdbb)"
        strokeWidth={2}
      />
      <path
        d="M 44 40 H 508 M 44 250 H 508"
        fill="none"
        stroke="#dfdacc"
        strokeWidth={2}
      />
      <rect
        data-gas-volume={volume}
        x={36}
        y={29}
        width={width}
        height={232}
        rx={7}
        fill="#e0ebe1"
      />
      {children}
      <rect
        x={piston}
        y={136}
        width={568 - piston}
        height={18}
        rx={4}
        fill="#c1c9bd"
        stroke="#889a8d"
      />
      <rect
        x={piston - 5}
        y={29}
        width={10}
        height={232}
        rx={3}
        fill="var(--accent)"
      />
      <path d={`M ${piston - 1} 44 V 246`} stroke="#7ea498" strokeWidth={2} />
      <rect
        x={564}
        y={117}
        width={10}
        height={56}
        rx={5}
        fill="var(--accent)"
      />
    </g>
  );
}
