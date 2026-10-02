export function RatioBarVisual({ ratio }: { ratio: number }) {
  return (
    <svg
      viewBox="0 0 600 110"
      role="img"
      aria-label={`${(ratio * 100).toFixed(2)} percent`}
      style={{ width: "100%" }}
    >
      <rect
        x="20"
        y="30"
        width="560"
        height="50"
        fill="var(--panel)"
        stroke="currentColor"
      />
      <rect
        x="20"
        y="30"
        width={560 * Math.min(1, ratio)}
        height="50"
        fill="var(--accent)"
      />
    </svg>
  );
}
export function DimensionLabelVisual({
  width,
  height,
}: {
  width: number;
  height: number;
}) {
  const scale = Math.min(450 / width, 210 / height);
  return (
    <svg
      viewBox="0 0 600 320"
      role="img"
      aria-label={`Rectangle ${width} by ${height} metres`}
      style={{ width: "100%" }}
    >
      <rect
        x="70"
        y="50"
        width={width * scale}
        height={height * scale}
        fill="var(--panel)"
        stroke="var(--accent)"
        strokeWidth="3"
      />
      <text x="70" y="35">
        {width} m
      </text>
      <text x={80 + width * scale} y="90">
        {height} m
      </text>
    </svg>
  );
}
export function CoordinateAxesVisual() {
  return (
    <g stroke="var(--border)">
      {Array.from({ length: 21 }, (_, i) => (
        <g key={`grid-${i - 10}`}>
          <line x1={40 + i * 24} x2={40 + i * 24} y1="20" y2="260" />
          <line x1="40" x2="520" y1={20 + i * 12} y2={20 + i * 12} />
        </g>
      ))}
      <path d="M40 140H520M280 20V260" stroke="currentColor" strokeWidth="2" />
      <text x="530" y="145" stroke="none" fill="currentColor">
        x
      </text>
      <text x="285" y="15" stroke="none" fill="currentColor">
        y
      </text>
      <text x="285" y="155" stroke="none" fill="currentColor">
        0
      </text>
    </g>
  );
}
