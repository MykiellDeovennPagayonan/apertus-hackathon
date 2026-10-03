export function BasketVisual({
  x,
  y,
  width,
  label,
  count,
  height = 170,
}: {
  x: number;
  y: number;
  width: number;
  label: string;
  count: number;
  height?: number;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        rx={18}
        fill="#f6f1e5"
        stroke="#af9870"
        strokeWidth={2}
      />
      <text x={x + 15} y={y + 27} className="math-scene-label">
        {label} · {count}
      </text>
    </g>
  );
}
