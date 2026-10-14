"use client";
import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import { type CrowdState, obstacle } from "../../systems/collective/crowd";
import "./collective.css";
export function CrowdScene({ instance }: { instance: ModelInstance }) {
  const s = instance.state as unknown as CrowdState,
    o = obstacle(s);
  return (
    <section
      className="collective-scene"
      data-collective="crowd"
      data-responsive-height="content"
      aria-label="Matched crowd exit comparison"
    >
      <div className="collective-heading">
        <div>
          <span className="collective-eyebrow">Crowd movement</span>
          <h2>Could a pillar change the flow?</h2>
        </div>
        <span className="collective-stamp">{s.count} people in each room</span>
      </div>
      <div className="crowd-pair">
        {s.lanes.map((lane, i) => (
          <figure key={i === 0 ? "open" : "obstacle"}>
            <figcaption>
              <strong>{i ? "With obstacle" : "Open approach"}</strong>
              <span>{lane.people.length} inside</span>
            </figcaption>
            <svg
              viewBox="0 0 450 332"
              role="img"
              aria-label={`${i ? "With obstacle" : "Open approach"}: ${lane.exited} exited, ${lane.people.length} inside.`}
            >
              <rect
                x="15"
                y="13"
                width="420"
                height="280"
                rx="6"
                fill="#f4f0e5"
              />
              <path
                d="M211 294H15V13H435V294H239"
                fill="none"
                stroke="#a5a99a"
                strokeWidth="5"
              />
              {i === 1 && (
                <circle
                  cx={15 + (o.x + 0.5) * 14}
                  cy={13 + (o.y + 0.5) * 14}
                  r={o.r * 14}
                  fill="#bba685"
                  stroke="#887958"
                  strokeWidth="2"
                />
              )}
              {lane.people.map((p) => (
                <circle
                  key={p.id}
                  cx={15 + (p.x + 0.5) * 14}
                  cy={13 + (p.y + 0.5) * 14}
                  r="4.6"
                  fill={p.wait > 8 ? "#b07848" : "#285e56"}
                  stroke="#fffbef"
                  strokeWidth="1"
                  className="crowd-dot"
                />
              ))}
              <path
                d="M225 297V310M220 306L225 312L230 306"
                stroke="#285e56"
                strokeWidth="2"
                fill="none"
              />
              <text x="247" y="315" className="scene-small">
                Exit
              </text>
            </svg>
            <div className="crowd-result">
              {lane.finished ? (
                <>
                  <strong>{lane.finished}</strong> model steps to clear
                </>
              ) : lane.ticks >= 2000 ? (
                <strong>Incomplete · {lane.people.length} remain</strong>
              ) : (
                <>
                  <strong>{lane.exited}</strong> people have exited
                </>
              )}
            </div>
          </figure>
        ))}
      </div>
      <p className="scene-note">
        Dots turn amber after waiting. This model shows merging and delays, not
        physical pressure.
      </p>
    </section>
  );
}
