import type { ReactNode } from "react";
export function Tree({
  x,
  y,
  size = 1,
  cleared = false,
}: {
  x: number;
  y: number;
  size?: number;
  cleared?: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${size})`}>
      <path
        d="M0 0L0-65M0-20L-22-45M0-30L21-52"
        stroke="#79654b"
        strokeWidth="9"
        strokeLinecap="round"
      />
      {!cleared && (
        <>
          <ellipse cx="-22" cy="-63" rx="32" ry="26" fill="#b2c49a" />
          <ellipse cx="23" cy="-68" rx="33" ry="27" fill="#8fae82" />
          <ellipse cy="-90" rx="32" ry="28" fill="#a5bc8a" />
        </>
      )}
    </g>
  );
}
export function Mark({
  x,
  y,
  label = "C",
  shape = "circle",
}: {
  x: number;
  y: number;
  label?: string;
  shape?: string;
}) {
  return (
    <g className="cycle-chemical" transform={`translate(${x} ${y})`}>
      {shape === "diamond" ? (
        <path
          d="M0-21L32 0L0 21L-32 0Z"
          fill="#fffbef"
          stroke="#285e56"
          strokeWidth="2"
        />
      ) : (
        <rect
          x="-32"
          y="-17"
          width="64"
          height="34"
          rx={shape === "square" ? 5 : 17}
          fill="#fffbef"
          stroke="#285e56"
          strokeWidth="2"
        />
      )}
      <text textAnchor="middle" y="6" fontSize="16" fontWeight="650">
        {label}
      </text>
    </g>
  );
}
export function Arrow({
  d,
  label,
  x,
  y,
  active = true,
  marker,
}: {
  d: string;
  label: string;
  x: number;
  y: number;
  active?: boolean;
  marker: string;
}) {
  return (
    <g opacity={active ? 1 : 0.45}>
      <path
        d={d}
        fill="none"
        stroke="#285e56"
        strokeWidth={active ? 2.5 : 1.5}
        strokeDasharray={active ? undefined : "5 5"}
        markerEnd={`url(#${marker})`}
      />
      <text
        className="cycle-path-label"
        x={x}
        y={y}
        fontSize="16"
        fill="#30362e"
      >
        {label}
      </text>
    </g>
  );
}
export function Art({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 520 380"
      role="img"
      aria-label={label}
      className="cycle-art"
    >
      <defs>
        <marker
          id={id}
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="6"
          markerHeight="6"
          orient="auto-start-reverse"
        >
          <path d="M0 0L10 5L0 10Z" fill="#285e56" />
        </marker>
      </defs>
      {children}
    </svg>
  );
}
