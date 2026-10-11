"use client";
import { useId } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import type { FishingState } from "../../systems/collective/fishing";
import "./collective.css";
export function FishingScene({ instance }: { instance: ModelInstance }) {
  const s = instance.state as unknown as FishingState,
    uid = useId().replaceAll(":", "");
  const fishPerMark = Math.max(10, Math.ceil(s.stock / 200));
  const count = Math.min(200, Math.ceil(s.stock / fishPerMark));
  const targets =
    s.history.at(-1)?.requests ??
    (s.arrangement === 0
      ? [4, 4, 4, 4, 4]
      : s.arrangement === 1
        ? [8, 4, 4, 4, 4]
        : [8, 8, 8, 8, 8]);
  return (
    <section
      className="collective-scene fishing-scene"
      data-collective="fishing"
      data-responsive-height="content"
      aria-label="Shared fishing lake"
    >
      <div className="collective-heading">
        <div>
          <span className="collective-eyebrow">A shared resource</span>
          <h2>Can the town keep its lake alive?</h2>
        </div>
        <span className="collective-stamp">Day {s.day}</span>
      </div>
      <svg
        viewBox="0 0 1000 400"
        role="img"
        aria-label={`${s.stock} fish remain. Today's catches: ${s.catches.join(", ")}.`}
      >
        <defs>
          <linearGradient id={`${uid}-water`} x2="0" y2="1">
            <stop stopColor="#d6ece4" />
            <stop offset="1" stopColor="#9dcfc0" />
          </linearGradient>
          <clipPath id={`${uid}-lake`}>
            <ellipse cx="500" cy="224" rx="437" ry="150" />
          </clipPath>
        </defs>
        <path
          d="M50 151 Q140 70 290 106 Q500 47 710 98 Q870 78 950 162 L940 340 Q700 430 480 380 Q210 425 55 320Z"
          fill="#e1e9cb"
        />
        <ellipse cx="500" cy="224" rx="446" ry="159" fill="#79a98e" />
        <ellipse
          cx="500"
          cy="224"
          rx="437"
          ry="150"
          fill={`url(#${uid}-water)`}
        />
        <g clipPath={`url(#${uid}-lake)`}>
          {Array.from({ length: count }, (_, i) => {
            const x = 104 + (i % 20) * 42,
              y = 131 + Math.floor(i / 20) * 22;
            return (
              <g
                key={`fish-${Math.floor(i / 20)}-${i % 20}`}
                transform={`translate(${x} ${y})`}
                opacity=".64"
              >
                <ellipse rx="7" ry="3.4" fill="#285e56" />
                <path d="M-6 0L-12 -4L-12 4Z" fill="#285e56" />
              </g>
            );
          })}
        </g>
        <rect
          x="375"
          y="183"
          width="250"
          height="86"
          rx="20"
          fill="#fffbef"
          fillOpacity=".94"
        />
        <text x="500" y="221" textAnchor="middle" className="lake-count">
          {s.stock.toLocaleString()}
        </text>
        <text x="500" y="246" textAnchor="middle" className="scene-small">
          fish in the lake
        </text>
        {targets.map((target, i) => {
          const x = 132 + i * 184;
          return (
            <g
              key={`fisherman-${String.fromCharCode(65 + i)}`}
              transform={`translate(${x} 56)`}
            >
              {s.playing && s.catches[i] > 0 && (
                <path
                  className="catch-path"
                  d="M0 115Q40 70 0 26"
                  fill="none"
                  stroke="#285e56"
                  strokeWidth="2"
                  strokeDasharray="4 12"
                />
              )}
              <path d="M-32 5L32 5L21 25L-21 25Z" fill="#8e6947" />
              <circle cy="-13" r="10" fill="#30362e" />
              <path
                d="M0 -3L0 8M8 -6L39 18"
                stroke="#30362e"
                strokeWidth="4"
                strokeLinecap="round"
              />
              <text y="-34" textAnchor="middle" className="scene-small">
                Fisher {i + 1}
              </text>
              <text y="50" textAnchor="middle" className="scene-small">
                {s.day ? `${s.catches[i]} caught` : `${target} a day`}
              </text>
            </g>
          );
        })}
        <text x="74" y="390" className="scene-footnote">
          Each fish mark represents up to {fishPerMark} fish.
        </text>
      </svg>
      <div className="fishing-bottom">
        <span>
          Replaced today{" "}
          <strong>
            {s.history.at(-1)?.births ?? Math.floor(s.stock / 100)} fish
          </strong>
        </span>
        <span>
          Taken today{" "}
          <strong>{s.catches.reduce((a, b) => a + b, 0)} fish</strong>
        </span>
        <span className="fishing-rule">1 new fish per 100, each day</span>
      </div>
    </section>
  );
}
