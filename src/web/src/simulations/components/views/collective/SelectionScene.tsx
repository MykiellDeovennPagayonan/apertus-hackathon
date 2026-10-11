"use client";
import { useState } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import { random } from "../../systems/collective/random";
import type { SelectionState } from "../../systems/collective/selection";
import "./collective.css";
const shade = (t: number) => `hsl(75 10% ${82 - t * 65}%)`;
export function SelectionScene({ instance }: { instance: ModelInstance }) {
  const s = instance.state as unknown as SelectionState,
    e = s.events.at(-1);
  const [selected, setSelected] = useState(-1);
  const shown = s.phase === 1 && e ? e.parents : s.organisms;
  const survivors = new Set(e?.survivors.map((o) => o.id));
  function position(id: number): [number, number] {
    const child =
      s.phase === 2 ? e?.children.find((o) => o.id === id) : undefined;
    const anchor = child ? child.parent : id;
    const x = 35 + random(s.seed, 0, anchor, 7) * 890;
    const y = 48 + random(s.seed, 0, anchor, 8) * 215;
    return child
      ? [
          Math.max(
            15,
            Math.min(945, x + (random(s.seed, 0, id, 9) - 0.5) * 36),
          ),
          Math.max(
            42,
            Math.min(280, y + (random(s.seed, 0, id, 10) - 0.5) * 36),
          ),
        ]
      : [x, y];
  }
  const organism = shown.find((o) => o.id === selected);
  const bins = Array.from(
    { length: 10 },
    (_, i) =>
      shown.filter((o) => Math.min(9, Math.floor(o.trait * 10)) === i).length,
  );
  return (
    <section
      className="collective-scene selection-scene"
      data-collective="selection"
      data-responsive-height="content"
      aria-label="Natural selection through generations"
    >
      <div className="collective-heading">
        <div>
          <span className="collective-eyebrow">
            Variation · inheritance · selection
          </span>
          <h2>Which shades reach the next generation?</h2>
        </div>
        <span className="collective-stamp">Generation {s.generation}</span>
      </div>
      <div className="selection-stage" style={{ background: shade(s.habitat) }}>
        <span className="habitat-label">
          {s.habitat < 0.5 ? "Light habitat" : "Dark habitat"} ·{" "}
          {s.phase === 1
            ? "Survival"
            : s.phase === 2
              ? "Offspring spawning"
              : "Living population"}
        </span>
        {/* biome-ignore lint/a11y/useSemanticElements: SVG contains keyboard-operable organism graphics. */}
        <svg
          viewBox="0 0 960 292"
          role="group"
          aria-label={`${shown.length} organisms, generation ${s.generation}. Traits remain inherited.`}
        >
          {s.phase === 2 &&
            e &&
            e.children.map((o) => {
              const parent = e.survivors.find((p) => p.id === o.parent);
              if (!parent) return null;
              return (
                <line
                  key={`line-${o.id}`}
                  x1={35 + random(s.seed, 0, parent.id, 7) * 890}
                  y1={48 + random(s.seed, 0, parent.id, 8) * 215}
                  x2={position(o.id)[0]}
                  y2={position(o.id)[1]}
                  stroke="#bdba92"
                  strokeOpacity=".35"
                />
              );
            })}
          {shown.map((o, i) => {
            const died = s.phase === 1 && !survivors.has(o.id);
            return (
              // biome-ignore lint/a11y/useSemanticElements: SVG graphics use button semantics and keyboard handling.
              <g
                key={o.id}
                role="button"
                tabIndex={i === 0 ? 0 : -1}
                aria-label={`Organism ${o.id + 1}, shade ${o.trait.toFixed(2)}${o.mutated ? ", mutated" : ""}${died ? ", did not survive" : ""}`}
                onClick={() => setSelected(selected === o.id ? -1 : o.id)}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") {
                    ev.preventDefault();
                    setSelected(o.id);
                  } else if (
                    ev.key === "ArrowRight" ||
                    ev.key === "ArrowLeft"
                  ) {
                    ev.preventDefault();
                    const n =
                      (i + (ev.key === "ArrowRight" ? 1 : -1) + shown.length) %
                      shown.length;
                    ev.currentTarget.parentElement
                      ?.querySelectorAll<SVGGElement>('[role="button"]')
                      [n]?.focus();
                  }
                }}
                className="organism-dot"
                transform={`translate(${position(o.id).join(" ")})`}
                opacity={died ? 0.14 : 1}
              >
                <circle
                  r={selected === o.id ? 10 : 7}
                  fill={shade(o.trait)}
                  stroke={o.mutated ? "#dca74e" : "#eee9dc"}
                  strokeWidth={o.mutated ? 2.5 : 1}
                />
                {o.mutated && (
                  <path d="M-3 0H3M0 -3V3" stroke="#dca74e" strokeWidth="1.4" />
                )}
                {died && <path d="M-5 -5L5 5M5 -5L-5 5" stroke="#30362e" />}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="trait-strip">
        <span>Light</span>
        <div>
          {bins.map((n, i) => (
            <div
              key={`shade-band-${(i + 0.5) / 10}`}
              style={{
                background: shade((i + 0.5) / 10),
                height: `${8 + (n / Math.max(1, ...bins)) * 32}px`,
              }}
              title={`${n} organisms in shade band ${i + 1}`}
            />
          ))}
        </div>
        <span>Dark</span>
        <strong>{shown.length} organisms</strong>
      </div>
      <p className="scene-note">
        {organism
          ? `Shade ${organism.trait.toFixed(2)} · ${organism.parent < 0 ? "Starting organism" : `offspring of organism ${organism.parent + 1}`} · ${organism.mutated ? "random mutation" : "inherited shade"}`
          : s.phase === 2
            ? "Thin lines connect offspring to parents. Gold marks show random mutations."
            : "Each dot is one organism. Its shade stays fixed throughout its life."}
      </p>
    </section>
  );
}
