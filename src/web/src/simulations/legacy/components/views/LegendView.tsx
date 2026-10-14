export function LegendView({
  entries,
  x,
  y = 24,
  width = 20,
  gap = 18,
  horizontal = false,
  fontSize = 11,
}: {
  entries: { label: string; color: string; dash?: string }[];
  x: number;
  y?: number;
  width?: number;
  gap?: number;
  horizontal?: boolean;
  fontSize?: number;
}) {
  return (
    <g fontSize={fontSize} fill="var(--text-dim)">
      {entries.map((e, i) => (
        <g key={e.label}>
          <line
            x1={x + (horizontal ? i * gap : 0)}
            y1={y + (horizontal ? 0 : i * gap)}
            x2={x + width + (horizontal ? i * gap : 0)}
            y2={y + (horizontal ? 0 : i * gap)}
            stroke={e.color}
            strokeWidth={2}
            strokeDasharray={e.dash}
          />
          <text
            x={x + width + 8 + (horizontal ? i * gap : 0)}
            y={y + (horizontal ? 0 : i * gap) + 4}
          >
            {e.label}
          </text>
        </g>
      ))}
    </g>
  );
}
