import type { SpringState } from "../../systems/exploration/spring";

export function SpringVisual({ state }: { state: SpringState }) {
  const center = 300 + state.displacement * 240;
  const end = center - 30;
  const points = [
    [70, 170],
    [90, 170],
    ...Array.from({ length: 18 }, (_, i) => [
      90 + ((end - 110) * (i + 1)) / 19,
      170 + (i % 2 ? 18 : -18),
    ]),
    [end - 20, 170],
    [end, 170],
  ]
    .map((p) => p.join(","))
    .join(" ");
  return (
    <figure className="spring-experiment" style={{ margin: 0 }}>
      <svg
        viewBox="0 0 560 300"
        role="img"
        aria-label="A mass attached to a spring, moving around its resting position"
      >
        <path
          d="M70 115v110M70 210h450"
          stroke="#a99e86"
          strokeWidth="4"
          fill="none"
        />
        <path d="M300 105v125" stroke="#a99e86" strokeDasharray="5 6" />
        <text x="300" y="254" textAnchor="middle" fontSize="16" fill="#626c60">
          Resting position
        </text>
        <polyline
          points={points}
          fill="none"
          stroke="#285e56"
          strokeWidth="5"
          strokeLinejoin="round"
        />
        <rect
          x={center - 30}
          y="140"
          width="60"
          height="60"
          rx="10"
          fill="#285e56"
        />
        <text
          x={center}
          y="177"
          textAnchor="middle"
          fill="#fffbef"
          fontSize="16"
        >
          Mass
        </text>
      </svg>
      <figcaption>
        Change spring stiffness, then release the mass. A stiffer spring moves
        it back faster.
      </figcaption>
    </figure>
  );
}
