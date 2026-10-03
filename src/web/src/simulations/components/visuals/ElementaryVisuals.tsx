export function RatioBarVisual({ ratio }: { ratio: number }) {
  const whole = Math.floor(ratio),
    remainder = ratio % 1;
  return (
    <svg
      viewBox={`0 0 440 ${ratio > 1 && remainder ? 170 : 90}`}
      role="img"
      aria-label={`${(ratio * 100).toFixed(2)} percent`}
    >
      <text x="20" y="22" fill="currentColor" fontSize="18">
        {ratio > 1
          ? `${whole} whole${whole === 1 ? "" : "s"} × 100%`
          : "One whole = 100%"}
      </text>
      <rect
        x="20"
        y="36"
        width="400"
        height="36"
        rx="5"
        fill="var(--panel)"
        stroke="var(--accent)"
      />
      <rect
        x="20"
        y="36"
        width={400 * Math.min(1, ratio)}
        height="36"
        rx="5"
        fill="var(--accent)"
      />
      {ratio > 1 && remainder > 0 && (
        <>
          <text x="20" y="108" fill="currentColor" fontSize="18">
            Plus{" "}
            {(remainder * 100).toLocaleString(undefined, {
              maximumFractionDigits: 2,
            })}
            % of another whole
          </text>
          <rect
            x="20"
            y="122"
            width="400"
            height="36"
            rx="5"
            fill="var(--panel)"
            stroke="var(--accent)"
          />
          <rect
            x="20"
            y="122"
            width={400 * remainder}
            height="36"
            rx="5"
            fill="var(--accent)"
          />
        </>
      )}
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
  const scale = Math.min(40, 340 / width, 200 / height);
  const w = width * scale,
    h = height * scale,
    x = (440 - w) / 2,
    y = (300 - h) / 2;
  return (
    <svg
      viewBox="0 0 480 300"
      role="img"
      aria-label={`Rectangle ${width} by ${height} metres`}
    >
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        fill="var(--panel)"
        stroke="var(--accent)"
        strokeWidth="3"
      />
      <text
        x={x + w / 2}
        y={y - 14}
        textAnchor="middle"
        fill="currentColor"
        fontSize="20"
      >
        {width} m
      </text>
      <text x={x + w + 10} y={y + h / 2 + 6} fill="currentColor" fontSize="20">
        {height} m
      </text>
    </svg>
  );
}
export function CoordinateAxesVisual() {
  return (
    <g>
      {Array.from({ length: 21 }, (_, i) => (
        <g key={`grid-${i - 10}`} stroke="var(--border)">
          <line x1={40 + i * 18} x2={40 + i * 18} y1="40" y2="400" />
          <line x1="40" x2="400" y1={40 + i * 18} y2={40 + i * 18} />
        </g>
      ))}
      <path d="M40 220H400M220 40V400" stroke="currentColor" strokeWidth="2" />
      {[-10, -5, 5, 10].map((n) => (
        <g key={n} fill="currentColor" fontSize="18">
          <text x={220 + n * 18} y="240" textAnchor="middle">
            {n}
          </text>
          <text x="210" y={225 - n * 18} textAnchor="end">
            {n}
          </text>
        </g>
      ))}
      <g fill="currentColor" fontSize="18">
        <text x="414" y="226">
          x
        </text>
        <text x="226" y="24">
          y
        </text>
        <text x="228" y="239">
          0
        </text>
      </g>
    </g>
  );
}
