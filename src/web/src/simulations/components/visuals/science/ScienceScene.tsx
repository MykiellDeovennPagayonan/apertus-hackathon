"use client";
import { useId } from "react";
import {
  scienceCommand,
  scienceObservation,
  scienceSpec,
} from "../../../domains/science";
import { requireValue } from "../../../runtime/authoring/requireValue";
import type { ModelInstance } from "../../../runtime/contribution";
import type { ScienceState } from "../../systems/science/contracts";
import {
  flowerAvailable,
  genomeGlow,
  inspectedGenome,
} from "../../systems/science/life";

const colors = ["#2d6f75", "#925c29", "#6d588b", "#506f3a"];
interface Props {
  instance: ModelInstance;
  question?: string;
  onCommand?: (command: string, value?: unknown) => void;
}
export function ScienceScene({ instance, question, onCommand }: Props) {
  const s = instance.state as unknown as ScienceState,
    spec = scienceSpec(s.kind),
    obs = scienceObservation(s),
    uid = useId().replaceAll(":", "");
  const select = (i: number) =>
    onCommand?.(scienceCommand(s.kind, "SELECT"), i);
  const interactive = Boolean(onCommand);
  const pick = (i: number) =>
    interactive
      ? {
          role: "button" as const,
          tabIndex: 0,
          "aria-label": `Inspect ${obs.objects[i]?.name ?? "object"}`,
          "aria-pressed": s.selected === i,
          onClick: () => select(i),
          onKeyDown: (e: React.KeyboardEvent) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              select(i);
            }
          },
        }
      : {};
  const focus = (i: number) =>
    interactive && s.selected === i ? "#285e56" : "transparent";
  const chromosome = (
    x: number,
    y: number,
    i: number,
    copied: boolean,
    scale = 1,
  ) => (
    <g transform={`translate(${x} ${y}) scale(${scale})`} {...pick(i)}>
      <circle r={35} fill="transparent" stroke={focus(i)} strokeWidth={2} />
      <path
        d={copied ? "M-9 -15L9 15M9 -15L-9 15" : "M0 -16L0 16"}
        stroke={colors[i]}
        strokeWidth={8}
        strokeLinecap="round"
      />
      {s.overlay && (
        <text x={0} y={38} textAnchor="middle" fontSize={14} fontWeight={600}>
          {String.fromCharCode(65 + i)}
        </text>
      )}
    </g>
  );
  const organism = (
    x: number,
    y: number,
    crest: boolean,
    marks: number,
    glow: number,
  ) => (
    <g transform={`translate(${x} ${y})`}>
      <ellipse
        rx={43}
        ry={51}
        fill={glow > 0 ? `hsl(70 40% ${82 - glow * 0.2}%)` : "#c2d5be"}
        stroke="#47725c"
        strokeWidth={2}
      />
      <path
        d="M-27 -39L-38 -62L-9 -47M27 -39L38 -62L9 -47"
        fill="#c2d5be"
        stroke="#47725c"
        strokeWidth={2}
      />
      {crest && <path d="M-14 -50L-8 -70L0 -57L9 -74L16 -48" fill="#c4975a" />}
      <circle cx={-14} cy={-9} r={4} fill="#30362e" />
      <circle cx={14} cy={-9} r={4} fill="#30362e" />
      <path d="M-9 9Q0 16 9 9" fill="none" stroke="#47725c" strokeWidth={2} />
      {Array.from({ length: marks }, (_, slot) => slot).map((i) => (
        <ellipse
          key={i}
          cx={-18 + i * 12}
          cy={29}
          rx={4}
          ry={7}
          fill="#688b70"
        />
      ))}
      <ellipse cx={-23} cy={52} rx={14} ry={7} fill="#688b70" />
      <ellipse cx={23} cy={52} rx={14} ry={7} fill="#688b70" />
    </g>
  );
  return (
    <section
      className="science-scene"
      data-science={s.kind}
      data-time={s.time}
      aria-label={`${spec.title} scene`}
    >
      <div className="science-scene-heading">
        <span className="science-stage">
          {s.kind === "earth"
            ? s.settings.classification
              ? "Layers by behavior"
              : "Layers by material"
            : s.kind === "water"
              ? [
                  "In the clouds",
                  "Across the surface",
                  "Into the soil",
                  "Below ground",
                  "In the river",
                  "Downstream",
                ][requireValue(s.water).tracer]
              : obs.stage}
        </span>
        {interactive && (
          <span className="science-scene-hint">
            {s.kind === "earth"
              ? "Select a layer"
              : s.kind === "invasive"
                ? "Select a patch"
                : s.kind === "genome"
                  ? "Select a parent or offspring"
                  : "Select an object"}
          </span>
        )}
      </div>
      <h2 className="science-question">{question?.trim() || spec.question}</h2>
      {/* biome-ignore lint/a11y/useSemanticElements: Interactive SVG coordinate groups cannot use HTML fieldset. */}
      <svg
        viewBox="0 0 800 420"
        role="group"
        aria-label={`${spec.title}: selectable teaching scene`}
      >
        <defs>
          <marker
            id={`${uid}arrow`}
            markerWidth={8}
            markerHeight={8}
            refX={6}
            refY={3}
            orient="auto"
          >
            <path d="M0 0L6 3L0 6" fill="#638b7a" />
          </marker>
          <linearGradient id={`${uid}sky`} x2="0" y2="1">
            <stop stopColor="#e5eee6" />
            <stop offset="1" stopColor="#f5f3e7" />
          </linearGradient>
          <pattern
            id={`${uid}dots`}
            width={9}
            height={9}
            patternUnits="userSpaceOnUse"
          >
            <circle cx={4} cy={4} r={1.4} fill="#9b9276" />
          </pattern>
        </defs>
        {s.kind === "cell" && (
          <>
            {s.time < 6 ? (
              <>
                <ellipse
                  cx={400}
                  cy={218}
                  rx={s.time === 5 ? 225 : 185}
                  ry={145}
                  fill="#edf0dc"
                  stroke="#789879"
                  strokeWidth={3}
                />
                {s.time < 3 && (
                  <ellipse
                    cx={400}
                    cy={218}
                    rx={106}
                    ry={83}
                    fill="#e1e9df"
                    stroke="#a6b7a1"
                    strokeDasharray={s.time === 2 ? "5 6" : undefined}
                  />
                )}
                {s.time === 5 &&
                  [320, 480].map((x) => (
                    <ellipse
                      key={x}
                      cx={x}
                      cy={218}
                      rx={70}
                      ry={118}
                      fill="#e1e9df"
                      stroke="#a6b7a1"
                      strokeDasharray="5 6"
                    />
                  ))}
                {s.overlay &&
                  s.time >= 2 &&
                  [0, 1, 2, 3].map((i) => (
                    <g key={i} stroke="#aac1b2" strokeWidth={1.5}>
                      <path
                        d={`M230 218L${s.time === 4 ? 315 : 400} ${135 + i * 55}M570 218L${s.time === 4 ? 485 : 400} ${135 + i * 55}`}
                      />
                    </g>
                  ))}
                {[0, 1, 2, 3].map((i) => (
                  <g key={i}>
                    {s.time < 3 ? (
                      chromosome(
                        354 + (i % 2) * 92,
                        177 + Math.floor(i / 2) * 85,
                        i,
                        s.time >= 1,
                      )
                    ) : s.time === 3 ? (
                      chromosome(400, 126 + i * 57, i, true, 0.85)
                    ) : (
                      <>
                        {chromosome(320, 126 + i * 57, i, false, 0.85)}
                        {chromosome(480, 126 + i * 57, i, false, 0.85)}
                      </>
                    )}
                  </g>
                ))}
                {s.time >= 2 && (
                  <>
                    <circle cx={230} cy={218} r={8} fill="#c7a36a" />
                    <circle cx={570} cy={218} r={8} fill="#c7a36a" />
                  </>
                )}
              </>
            ) : (
              <>
                {[250, 550].map((x, j) => (
                  <g key={x}>
                    <circle
                      cx={x}
                      cy={215}
                      r={128}
                      fill="#edf0dc"
                      stroke="#789879"
                      strokeWidth={3}
                    />
                    <circle
                      cx={x}
                      cy={215}
                      r={86}
                      fill="#e1e9df"
                      stroke="#a6b7a1"
                    />
                    {[0, 1, 2, 3]
                      .filter((i) => !(j === 1 && s.settings.error && i === 0))
                      .map((i) => (
                        <g key={i}>
                          {chromosome(
                            x - 38 + (i % 2) * 76,
                            180 + Math.floor(i / 2) * 75,
                            i,
                            false,
                            0.8,
                          )}
                        </g>
                      ))}
                    {j === 0 &&
                      !!s.settings.error &&
                      chromosome(x + 75, 210, 0, false, 0.65)}
                    <text x={x} y={378} textAnchor="middle" fontSize={16}>
                      Daughter {j === 0 ? "1" : "2"}
                    </text>
                  </g>
                ))}
              </>
            )}
          </>
        )}
        {s.kind === "immune" && (
          <>
            <rect
              x={25}
              y={50}
              width={750}
              height={322}
              rx={35}
              fill="#edeedd"
            />
            {[75, 275, 500, 710].map((x, i) => (
              <g key={x}>
                <ellipse
                  cx={x}
                  cy={i % 2 ? 317 : 100}
                  rx={49}
                  ry={31}
                  fill="#dce1c7"
                  stroke="#bcc6aa"
                />
                <circle cx={x} cy={i % 2 ? 317 : 100} r={9} fill="#b8c5a9" />
              </g>
            ))}
            {Array.from(
              {
                length: Math.min(
                  18,
                  Math.ceil(requireValue(s.immune).burden / 5),
                ),
              },
              (_, slot) => slot,
            ).map((i) => (
              <path
                key={i}
                d={
                  s.settings.antigen
                    ? `M${145 + (i % 6) * 91} ${140 + Math.floor(i / 6) * 58}l9 10l-9 10l-9 -10Z`
                    : `M${145 + (i % 6) * 91} ${140 + Math.floor(i / 6) * 58}l11 20h-22Z`
                }
                fill="#b98261"
                opacity={0.8}
              />
            ))}
            {[
              { x: 150, y: 250, i: 1, color: "#9cbab4", label: "Phagocyte" },
              {
                x: 340,
                y: 145,
                i: 2,
                color: "#b5a1c4",
                label: "Antigen presenter",
              },
              { x: 490, y: 265, i: 3, color: "#d6b879", label: "B cell" },
              { x: 650, y: 180, i: 4, color: "#a1ba92", label: "T cell" },
            ].map((a) => (
              <g key={a.i} {...pick(a.i)}>
                {requireValue(s.immune).burden > 0 &&
                  (a.i === 1 ||
                    (a.i === 2 && s.time >= 2) ||
                    (a.i >= 3 && requireValue(s.immune).antibodies > 0)) && (
                    <circle
                      cx={a.x}
                      cy={a.y}
                      r={43}
                      fill="none"
                      stroke={a.color}
                      strokeWidth={4}
                      opacity={0.65}
                    />
                  )}
                <circle
                  cx={a.x}
                  cy={a.y}
                  r={34}
                  fill={a.color}
                  stroke={focus(a.i)}
                  strokeWidth={3}
                />
                <circle cx={a.x - 6} cy={a.y} r={12} fill="#ffffff60" />
                {s.overlay && (
                  <text x={a.x} y={a.y + 57} textAnchor="middle" fontSize={14}>
                    {a.label}
                  </text>
                )}
              </g>
            ))}
            {requireValue(s.immune).antibodies > 0 &&
              [0, 1, 2, 3].map((i) => (
                <path
                  key={i}
                  d={`M${425 + i * 48} 85v18m0 -18l-8 -10m8 10l8 -10`}
                  stroke="#a68a44"
                  strokeWidth={3}
                  fill="none"
                />
              ))}
            {requireValue(s.immune).memory.length > 0 && (
              <g {...pick(5)}>
                <rect
                  x={45}
                  y={15}
                  width={170}
                  height={34}
                  rx={17}
                  fill="#e5ecdf"
                />
                <text x={61} y={37} fontSize={14}>
                  Memory:{" "}
                  {requireValue(s.immune)
                    .memory.map((a) => (a ? "◇" : "△"))
                    .join(" ")}
                </text>
              </g>
            )}
          </>
        )}
        {s.kind === "genome" && s.settings.zoom === 0 && (
          <>
            {[0, 1].map((i) => (
              <g
                key={i}
                {...pick(i)}
                transform={`translate(${i ? 565 : 235} 104)`}
              >
                <ellipse
                  rx={65}
                  ry={82}
                  fill={s.selected === i ? "#e7edde" : "transparent"}
                />
                {organism(0, 0, !!s.settings[i ? "parentB" : "parentA"], 2, 0)}
                <text y={90} textAnchor="middle" fontSize={20}>
                  Parent {i ? "B" : "A"}
                </text>
              </g>
            ))}
            <path
              d="M290 143Q350 224 398 238M510 143Q450 224 402 238"
              fill="none"
              stroke="#9cb4a1"
              strokeWidth={3}
            />
            <text x={400} y={224} textAnchor="middle" fontSize={17}>
              Inherited from both parents
            </text>
            {requireValue(s.offspring).length === 0 ? (
              <g transform="translate(400 326)">
                <ellipse
                  rx={49}
                  ry={61}
                  fill="#edf0e4"
                  stroke="#bdc9b5"
                  strokeDasharray="5 6"
                  strokeWidth={2}
                />
                <text y={7} textAnchor="middle" fontSize={27} fill="#85947d">
                  ?
                </text>
              </g>
            ) : (
              requireValue(s.offspring).map((c, i) => (
                <g
                  key={c.id}
                  {...pick(i + 2)}
                  transform={`translate(${400 - ((requireValue(s.offspring).length - 1) * 112) / 2 + i * 112} 326)`}
                >
                  <ellipse
                    rx={51}
                    ry={64}
                    fill={s.selected === i + 2 ? "#e5ecde" : "transparent"}
                    stroke={focus(i + 2)}
                    strokeWidth={2}
                  />
                  <g transform="scale(.82)">
                    {organism(
                      0,
                      0,
                      c.alleles[0] + c.alleles[1] > 0,
                      c.alleles[2] + c.alleles[3] + c.alleles[4] + c.alleles[5],
                      0,
                    )}
                  </g>
                  <text y={78} textAnchor="middle" fontSize={16}>
                    Offspring {c.id}
                  </text>
                </g>
              ))
            )}
          </>
        )}
        {s.kind === "genome" && s.settings.zoom !== 0 && (
          <>
            <g {...pick(0)}>
              <g transform="translate(78 155) scale(.75)">
                {organism(
                  0,
                  0,
                  !!s.settings.parentA,
                  2,
                  s.settings.trait === 2
                    ? genomeGlow(
                        [s.settings.parentA, 0, 1, 0, 1, 0],
                        s.settings.environment,
                      )
                    : 0,
                )}
              </g>
              <text x={78} y={239} textAnchor="middle" fontSize={15}>
                Parent A
              </text>
            </g>
            <g {...pick(1)}>
              <g transform="translate(202 155) scale(.75)">
                {organism(
                  0,
                  0,
                  !!s.settings.parentB,
                  2,
                  s.settings.trait === 2
                    ? genomeGlow(
                        [s.settings.parentB, 0, 0, 1, 1, 0],
                        s.settings.environment,
                      )
                    : 0,
                )}
              </g>
              <text x={202} y={239} textAnchor="middle" fontSize={15}>
                Parent B
              </text>
            </g>
            <path
              d="M215 150H280"
              stroke="#638b7a"
              strokeWidth={2}
              markerEnd={`url(#${uid}arrow)`}
            />
            <rect
              x={298}
              y={56}
              width={455}
              height={199}
              rx={20}
              fill="#edf0e4"
            />
            <text x={324} y={88} fontSize={16} fontWeight={600}>
              {
                [
                  "Trait pathway",
                  "Cell → gene expression",
                  "Homologous chromosome segments",
                  "Loci contributing to this trait",
                  "Illustrative sequence · not a prediction",
                ][s.settings.zoom]
              }
            </text>
            {s.settings.zoom === 2 &&
              [0, 1].map((j) => (
                <g key={j}>
                  <text x={325} y={128 + j * 44} fontSize={15}>
                    Homolog {j + 1}
                  </text>
                  {[0, 1, 2].map((i) => (
                    <g key={i}>
                      <rect
                        x={420 + i * 97}
                        y={108 + j * 44}
                        width={86}
                        height={28}
                        rx={7}
                        fill={colors[i]}
                        opacity={j ? 0.55 : 0.9}
                      />
                      <text
                        x={463 + i * 97}
                        y={128 + j * 44}
                        textAnchor="middle"
                        fill="white"
                        fontSize={15}
                      >
                        {s.settings.zoom === 4
                          ? ["ATCG", "GCAT", "TACG"][i]
                          : `G${i + 1} · ${inspectedGenome(s)[i * 2 + j] ? "A" : "a"}`}
                      </text>
                    </g>
                  ))}
                </g>
              ))}
            {s.settings.zoom === 1 && (
              <>
                <ellipse
                  cx={410}
                  cy={151}
                  rx={70}
                  ry={45}
                  fill="#dce7d2"
                  stroke="#78987c"
                  strokeWidth={2}
                />
                <ellipse
                  cx={395}
                  cy={149}
                  rx={29}
                  ry={23}
                  fill="#c5d4c1"
                  stroke="#78987c"
                />
                <text x={395} y={154} textAnchor="middle" fontSize={14}>
                  DNA
                </text>
                <path
                  d="M430 149h48"
                  stroke="#638b7a"
                  strokeWidth={2}
                  markerEnd={`url(#${uid}arrow)`}
                />
                <text x={490} y={139} fontSize={15}>
                  RNA → modeled function
                </text>
                <text x={490} y={164} fontSize={15}>
                  Tissue: skin / markings
                </text>
                <text x={490} y={190} fontSize={15}>
                  Light modulates glow expression
                </text>
              </>
            )}
            {s.settings.zoom === 3 && (
              <>
                <rect
                  x={326}
                  y={114}
                  width={100}
                  height={44}
                  rx={10}
                  fill={colors[s.settings.trait]}
                />
                <text
                  x={376}
                  y={143}
                  textAnchor="middle"
                  fill="white"
                  fontSize={15}
                >
                  Gene {s.settings.trait + 1}
                </text>
                <path
                  d="M434 138h24M547 138h24"
                  stroke="#638b7a"
                  strokeWidth={2}
                  markerEnd={`url(#${uid}arrow)`}
                />
                <text x={470} y={144} fontSize={16}>
                  RNA
                </text>
                <text x={591} y={144} fontSize={16}>
                  Protein function
                </text>
                <text x={326} y={191} fontSize={15}>
                  Some genes act through functional RNA, without translation.
                </text>
              </>
            )}
            {s.settings.zoom === 4 && (
              <>
                {Array.from({ length: 8 }, (_, i) => i).map((i) => {
                  const sequence = inspectedGenome(s)[s.settings.trait * 2]
                    ? "ATCGTACG"
                    : "ATCATACG";
                  const base = sequence[i],
                    pair: Record<string, string> = {
                      A: "T",
                      T: "A",
                      C: "G",
                      G: "C",
                    };
                  return (
                    <g key={i}>
                      <path
                        d={`M${348 + i * 49} 135v37`}
                        stroke="#d3c9aa"
                        strokeWidth={3}
                      />
                      <circle
                        cx={348 + i * 49}
                        cy={127}
                        r={16}
                        fill={colors[i % 4]}
                      />
                      <circle
                        cx={348 + i * 49}
                        cy={178}
                        r={16}
                        fill={colors[(i + 1) % 4]}
                      />
                      <text
                        x={348 + i * 49}
                        y={132}
                        textAnchor="middle"
                        fill="white"
                        fontSize={15}
                      >
                        {base}
                      </text>
                      <text
                        x={348 + i * 49}
                        y={183}
                        textAnchor="middle"
                        fill="white"
                        fontSize={15}
                      >
                        {pair[base]}
                      </text>
                    </g>
                  );
                })}
              </>
            )}
            {s.settings.zoom !== 0 && (
              <text x={324} y={220} fontSize={14}>
                {s.settings.trait === 2
                  ? "Light → expression → glow (DNA stays the same)"
                  : "Variant → expression → function → visible trait"}
              </text>
            )}
            <text x={42} y={288} fontSize={14} fontWeight={600}>
              Offspring · select a sibling to trace its ancestry
            </text>
            {requireValue(s.offspring).length === 0 ? (
              <text x={42} y={330} fontSize={14} fill="#657060">
                Create an offspring to begin your family.
              </text>
            ) : (
              requireValue(s.offspring).map((c, i) => (
                <g
                  key={c.id}
                  {...pick(i + 2)}
                  transform={`translate(${75 + i * 127} 346)`}
                >
                  <rect
                    x={-53}
                    y={-48}
                    width={110}
                    height={91}
                    rx={12}
                    fill={s.selected === i + 2 ? "#e0eadc" : "#f3efe2"}
                    stroke={focus(i + 2)}
                    strokeWidth={2}
                  />
                  <g transform="scale(.45)">
                    {organism(
                      0,
                      -15,
                      c.alleles[0] + c.alleles[1] > 0,
                      c.alleles[2] + c.alleles[3] + c.alleles[4] + c.alleles[5],
                      s.settings.trait === 2
                        ? genomeGlow(c.alleles, s.settings.environment)
                        : 0,
                    )}
                  </g>
                  <text y={34} textAnchor="middle" fontSize={15}>
                    Sibling {c.id}
                    {c.mutation ? " *" : ""}
                  </text>
                </g>
              ))
            )}
          </>
        )}
        {s.kind === "pollination" && (
          <>
            <rect
              x={24}
              y={40}
              width={752}
              height={320}
              rx={24}
              fill={`url(#${uid}sky)`}
            />
            <path d="M25 290Q190 255 395 292T775 280V360H25Z" fill="#dce6c8" />
            <circle cx={57} cy={66} r={6} fill="#d6b879" />
            <text x={72} y={71} fontSize={16}>
              Species A
            </text>
            <circle cx={215} cy={66} r={6} fill="#b7a3c6" />
            <text x={230} y={71} fontSize={16}>
              Species B
            </text>
            {Array.from({ length: 6 }, (_, i) => {
              const x = 100 + i * 118,
                y = 185 + (i % 2) * 45,
                p = requireValue(s.pollen);
              return (
                <g key={obs.objects[i].name} {...pick(i)}>
                  <circle
                    cx={x}
                    cy={y}
                    r={34}
                    fill={s.selected === i ? "#e1e8d4" : "transparent"}
                    stroke={focus(i)}
                    strokeWidth={2}
                  />
                  <path
                    d={`M${x} ${y}V315M${x} 270q-20 -20 -32 0M${x} 285q22 -18 32 -3`}
                    fill="none"
                    stroke="#7e9b60"
                    strokeWidth={4}
                  />
                  {flowerAvailable(s, i) &&
                    [0, 1, 2, 3, 4].map((j) => (
                      <ellipse
                        key={j}
                        cx={x}
                        cy={y - 15}
                        rx={10}
                        ry={18}
                        fill={i % 2 ? "#b7a3c6" : "#d6b879"}
                        transform={`rotate(${j * 72} ${x} ${y})`}
                      />
                    ))}
                  <circle
                    cx={x}
                    cy={y}
                    r={flowerAvailable(s, i) ? 10 : 13}
                    fill={flowerAvailable(s, i) ? "#a18242" : "#8aa274"}
                  />
                  {p.fruits[i] > 0 && (
                    <circle cx={x + 14} cy={y + 36} r={12} fill="#bf7852" />
                  )}
                </g>
              );
            })}
            {Array.from({ length: s.settings.pollinators }, (_, i) => {
              const p = (s.time * 2 + i) % 6,
                x = 100 + p * 118,
                y = 115 + (i % 2) * 40;
              return (
                <g key={obs.objects[6 + i].name} {...pick(6 + i)}>
                  <ellipse
                    cx={x - 8}
                    cy={y - 12}
                    rx={10}
                    ry={7}
                    fill="#ffffffb0"
                  />
                  <ellipse
                    cx={x + 8}
                    cy={y - 12}
                    rx={10}
                    ry={7}
                    fill="#ffffffb0"
                  />
                  <ellipse cx={x} cy={y} rx={15} ry={9} fill="#c6a14c" />
                  <path
                    d={`M${x - 4} ${y - 8}v16m8 -16v16`}
                    stroke="#665842"
                    strokeWidth={3}
                  />
                  {s.overlay && requireValue(s.pollen).origins[i] >= 0 && (
                    <path
                      d={`M${100 + requireValue(s.pollen).origins[i] * 118} 182Q${x} 75 ${x} ${y + 15}`}
                      fill="none"
                      stroke="#997742"
                      strokeDasharray="4 5"
                    />
                  )}
                </g>
              );
            })}
          </>
        )}
        {s.kind === "invasive" && (
          <>
            <rect
              x={40}
              y={48}
              width={720}
              height={310}
              rx={18}
              fill="#dfe7ce"
            />
            {requireValue(s.invasive).cover.map((v, i) => {
              const x = 43 + (i % 6) * 119,
                y = 53 + Math.floor(i / 6) * 77,
                d = requireValue(s.invasive);
              return (
                <g key={obs.objects[i].name} {...pick(i)}>
                  <rect
                    x={x}
                    y={y}
                    width={117}
                    height={75}
                    rx={3}
                    fill={v ? "#e1dac0" : "#dfe7ce"}
                    stroke={s.selected === i ? "#285e56" : "#cbd5b9"}
                    strokeWidth={s.selected === i ? 3 : 1}
                  />
                  {[0, 1, 2].map((j) => (
                    <g
                      key={j}
                      transform={`translate(${x + 24 + j * 33} ${y + 43})`}
                    >
                      {v && j < v / 34 ? (
                        <>
                          <path
                            d="M0 14V-19M0 -4L-9 -12M0 -9L10 -18"
                            stroke="#a06842"
                            strokeWidth={3}
                            fill="none"
                          />
                          <circle cy={-21} r={6} fill="#bc7951" />
                          <circle cx={10} cy={-19} r={4} fill="#bc7951" />
                        </>
                      ) : (
                        <path
                          d="M0 12Q-2 -5 -9 -12M0 12Q3 -11 10 -18M0 12V-13"
                          stroke="#83a16b"
                          strokeWidth={3}
                          fill="none"
                        />
                      )}
                    </g>
                  ))}
                  {d.propagules[i] > 0 && (
                    <circle cx={x + 103} cy={y + 12} r={4} fill="#926135" />
                  )}
                  {d.treated[i] > 0 && (
                    <text x={x + 8} y={y + 19} fontSize={21} fill="#547864">
                      ×
                    </text>
                  )}
                </g>
              );
            })}
            <g transform="translate(51 391)">
              <circle r={6} fill="#83a16b" />
              <text x={15} y={5} fontSize={16}>
                Native plants
              </text>
              <circle cx={193} r={6} fill="#bc7951" />
              <text x={209} y={5} fontSize={16}>
                Introduced plant
              </text>
              <circle cx={414} r={4} fill="#926135" />
              <text x={429} y={5} fontSize={16}>
                Seeds left behind
              </text>
            </g>
          </>
        )}
        {s.kind === "earth" && (
          <>
            <g transform="translate(310 218)">
              {[184, 156, 97, 49].map((r, i) => (
                <g
                  key={r}
                  {...pick(s.settings.classification ? [0, 2, 3, 4][i] : i)}
                  opacity={i < s.settings.peel ? 0.18 : 1}
                >
                  <circle
                    r={r}
                    fill={["#99ad83", "#d6ad73", "#c48754", "#edcf89"][i]}
                    stroke="#fffbef"
                    strokeWidth={3}
                  />
                </g>
              ))}
              {s.settings.classification === 1 && (
                <>
                  <circle
                    {...pick(0)}
                    r={174}
                    fill="none"
                    stroke="#658670"
                    strokeWidth={17}
                  />
                  <circle
                    {...pick(1)}
                    r={149}
                    fill="none"
                    stroke="#ad986a"
                    strokeWidth={13}
                  />
                </>
              )}
              {s.overlay && (
                <>
                  <path
                    d="M-95 -55Q-158 35 -85 100M94 65Q150 -35 85 -105"
                    stroke="#917547"
                    strokeWidth={3}
                    fill="none"
                    markerEnd={`url(#${uid}arrow)`}
                  />
                  <circle
                    {...pick(obs.objects.length - 1)}
                    cx={Math.cos((s.time / 24) * Math.PI * 2) * 125}
                    cy={Math.sin((s.time / 24) * Math.PI * 2) * 125}
                    r={7}
                    fill="#fffbef"
                    stroke="#285e56"
                    strokeWidth={2}
                  />
                </>
              )}
            </g>
            {obs.objects.slice(0, -1).map((o, i) => (
              <g key={o.name} {...pick(i)}>
                <rect
                  x={524}
                  y={43 + i * 66}
                  width={244}
                  height={52}
                  rx={12}
                  fill={s.selected === i ? "#e1eadc" : "transparent"}
                  stroke={focus(i)}
                />
                <circle
                  cx={545}
                  cy={69 + i * 66}
                  r={7}
                  fill={
                    ["#99ad83", "#d6ad73", "#c48754", "#edcf89", "#eac987"][i]
                  }
                />
                <text
                  x={565}
                  y={75 + i * 66}
                  fontSize={19}
                  fontWeight={s.selected === i ? 650 : 450}
                >
                  {o.name}
                </text>
              </g>
            ))}
            <text x={310} y={414} textAnchor="middle" fontSize={15}>
              Layers shown with exaggerated thickness
            </text>
          </>
        )}
        {s.kind === "plates" &&
          (() => {
            const b = s.settings.boundary,
              p = (s.time * s.settings.motion) / 100,
              sub = b < 2,
              collision = b === 2,
              div = b === 3;
            return (
              <>
                <text x={35} y={30} fontSize={14} fontWeight={600}>
                  Surface view
                </text>
                <rect
                  x={30}
                  y={45}
                  width={740}
                  height={105}
                  rx={16}
                  fill="#e3eadc"
                />
                <path
                  d={b === 4 ? `M45 97H380V${97 + p * 3}H755` : "M45 101H755"}
                  fill="none"
                  stroke="#8fa5a4"
                  strokeWidth={8}
                />
                {p > 1 && (sub || collision) && (
                  <path
                    d={`M420 105L${470 + p * 2} ${93 - p * 4}L545 105`}
                    fill={sub ? "#c0946d" : "#acb084"}
                    stroke="#8c795e"
                  />
                )}
                <text x={65} y={76} fontSize={15}>
                  {sub ? "Oceanic lithosphere" : "Lithospheric plate"}
                </text>
                <text x={540} y={76} fontSize={15}>
                  {b === 0 || collision
                    ? "Continental plate"
                    : "Lithospheric plate"}
                </text>
                <text x={35} y={187} fontSize={14} fontWeight={600}>
                  Below the surface
                </text>
                <rect
                  x={30}
                  y={202}
                  width={740}
                  height={168}
                  rx={16}
                  fill="#e7c89a"
                />
                <g {...pick(0)}>
                  <path
                    d={
                      sub
                        ? `M35 226H350L${400 + p * 12} ${260 + p * 7}L${385 + p * 12} ${285 + p * 7}L337 255H35Z`
                        : div
                          ? `M35 227H${386 - p * 8}V270H35Z`
                          : "M35 227H385V270H35Z"
                    }
                    fill="#9aafaa"
                    stroke={focus(0)}
                    strokeWidth={3}
                  />
                </g>
                <g {...pick(1)}>
                  <path
                    d={
                      div
                        ? `M${414 + p * 8} 227H765V270H${414 + p * 8}Z`
                        : collision
                          ? `M390 227L${430} ${227 - p * 7}L${470} ${227 - p * 5}L510 227H765V277H390Z`
                          : "M395 225H765V267H395Z"
                    }
                    fill="#b7b58c"
                    stroke={focus(1)}
                    strokeWidth={3}
                  />
                </g>
                {sub && p > 1 && (
                  <g {...pick(2)}>
                    <path
                      d={`M490 226L525 ${226 - p * 6}L560 226`}
                      fill="#bd8862"
                    />
                    <path
                      d={`M525 ${226 - p * 6}V305`}
                      stroke="#c28b4b"
                      strokeWidth={4}
                    />
                  </g>
                )}
                {div && (
                  <path
                    d="M398 355V235"
                    stroke="#c58452"
                    strokeWidth={7}
                    markerEnd={`url(#${uid}arrow)`}
                  />
                )}
                {s.overlay && b !== 4 && (
                  <>
                    <path
                      d={`M165 317H${div ? 105 : 225}`}
                      stroke="#638b7a"
                      strokeWidth={3}
                      markerEnd={`url(#${uid}arrow)`}
                    />
                    <path
                      d={`M640 317H${div ? 700 : 580}`}
                      stroke="#638b7a"
                      strokeWidth={3}
                      markerEnd={`url(#${uid}arrow)`}
                    />
                  </>
                )}
              </>
            );
          })()}
        {s.kind === "volcano" &&
          (() => {
            const d = requireValue(s.volcano),
              h = Math.min(85, d.reservoir * 0.45);
            return (
              <>
                <rect
                  x={25}
                  y={25}
                  width={750}
                  height={350}
                  rx={22}
                  fill={`url(#${uid}sky)`}
                />
                <path
                  d="M25 271H190L360 113H432L586 271H775V375H25Z"
                  fill="#b9b496"
                />
                <path
                  d="M188 273L360 113H432L586 273"
                  fill="none"
                  stroke="#958c70"
                  strokeWidth={3}
                />
                <path d="M25 298H775" stroke="#a6997f" strokeWidth={2} />
                <g {...pick(0)}>
                  <ellipse
                    cx={397}
                    cy={334}
                    rx={107}
                    ry={37}
                    fill="#e1c594"
                    stroke={focus(0)}
                    strokeWidth={3}
                  />
                  <ellipse
                    cx={397}
                    cy={341}
                    rx={90}
                    ry={Math.max(3, h * 0.3)}
                    fill="#c58245"
                  />
                  <text x={397} y={340} textAnchor="middle" fontSize={14}>
                    Magma chamber
                  </text>
                </g>
                <g {...pick(1)}>
                  <path d="M397 303V125" stroke="#f1deba" strokeWidth={21} />
                  <path d="M397 303V125" stroke="#c58245" strokeWidth={11} />
                  {s.overlay && (
                    <>
                      <text x={440} y={239} fontSize={14}>
                        Vent
                      </text>
                      <path d="M431 234H408" stroke="#7f7965" />
                    </>
                  )}
                </g>
                <g {...pick(2)}>
                  {d.lava > 0 && (
                    <path
                      d={`M420 125Q465 195 561 267H${Math.min(732, 580 + d.lava * 0.45)}`}
                      fill="none"
                      stroke="#cc7745"
                      strokeWidth={Math.min(16, 3 + d.lava * 0.05)}
                      strokeLinecap="round"
                    />
                  )}
                  {d.ash > 0 && (
                    <path
                      d="M380 267H600"
                      stroke="#b5a396"
                      strokeWidth={Math.min(15, 3 + d.ash * 0.045)}
                    />
                  )}
                </g>
                {d.activity > 0 && (
                  <path
                    d="M397 258V160"
                    fill="none"
                    stroke="#f8e3b5"
                    strokeWidth={3}
                    markerEnd={`url(#${uid}arrow)`}
                  />
                )}
                {d.activity === 2 && (
                  <>
                    <path
                      d="M375 112Q330 82 340 55Q396 25 455 51Q490 82 423 112Z"
                      fill="#a5a395"
                      opacity={0.7}
                    />
                    <path d="M397 110V77" stroke="#b49b82" strokeWidth={14} />
                    {[0, 1, 2, 3, 4].map((i) => (
                      <circle
                        key={i}
                        cx={349 + i * 27}
                        cy={50 + (i % 2) * 18}
                        r={22}
                        fill="#a5a395"
                        opacity={0.55}
                      />
                    ))}
                  </>
                )}
              </>
            );
          })()}
        {s.kind === "water" &&
          (() => {
            const d = requireValue(s.water);
            const paths = [
              {
                d: "M475 118V232",
                x: 501,
                y: 179,
                label: "Rain",
                active: d.tracer === 0 || d.tracer === 1,
              },
              {
                d: "M495 252Q560 254 618 270",
                x: 518,
                y: 239,
                label: "Runoff",
                active: d.tracer === 1,
              },
              {
                d: "M310 259V308",
                x: 202,
                y: 285,
                label: "Soaking in",
                active: d.tracer === 2,
              },
              {
                d: "M391 310V355",
                x: 419,
                y: 336,
                label: "Moving deeper",
                active: d.tracer === 3,
              },
              {
                d: "M552 350Q707 351 707 278",
                x: 562,
                y: 379,
                label: "Feeding the river",
                active: d.tracer === 4,
              },
              {
                d: "M685 236V137",
                x: 650,
                y: 120,
                label: "Evaporation",
                active: d.evaporation > 0,
              },
            ];
            return (
              <>
                <rect
                  x={22}
                  y={22}
                  width={756}
                  height={377}
                  rx={24}
                  fill={`url(#${uid}sky)`}
                />
                <circle cx={101} cy={81} r={29} fill="#e7ca77" />
                <path
                  d="M23 240L143 129L245 234L301 199L428 240H777V293H22Z"
                  fill="#bacdb0"
                />
                <path
                  d="M105 167L143 129L181 170L153 158L142 170L128 155Z"
                  fill="#fbfaf1"
                />
                <path d="M22 294H778V340H22Z" fill="#ccba98" />
                <path d="M22 341H778V399H22Z" fill="#b0c8c2" />
                <rect
                  x={22}
                  y={294}
                  width={756}
                  height={105}
                  fill={`url(#${uid}dots)`}
                  opacity={0.55}
                />
                <path
                  d="M602 243Q554 253 618 274T775 287"
                  fill="none"
                  stroke="#6997ab"
                  strokeWidth={15}
                  strokeLinecap="round"
                />
                <path
                  d="M421 100Q390 60 432 48Q459 21 489 50Q547 41 550 89Q533 112 421 100Z"
                  fill="#fffef6"
                  stroke="#99b7b0"
                  strokeWidth={1.5}
                />
                <text x={468} y={80} textAnchor="middle" fontSize={18}>
                  Cloud
                </text>
                {[331, 381, 431].map((x) => (
                  <g key={x}>
                    <path
                      d={`M${x} 252v-50`}
                      stroke="#96835f"
                      strokeWidth={6}
                    />
                    <path d={`M${x} 182l-23 48h46Z`} fill="#729366" />
                  </g>
                ))}
                {d.tracer <= 1 &&
                  s.time > 0 &&
                  [435, 458, 482, 508].map((x, i) => (
                    <path
                      className="science-rain"
                      key={x}
                      d={`M${x} ${131 + i * 13}l-5 16`}
                      stroke="#729daf"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  ))}
                {paths.map((p) => (
                  <g key={p.label}>
                    <path
                      d={p.d}
                      fill="none"
                      opacity={p.active ? 1 : 0.4}
                      stroke={p.active ? "#317d80" : "#698b7a"}
                      strokeWidth={p.active ? 4 : 2}
                      markerEnd={`url(#${uid}arrow)`}
                    />
                    <text
                      x={p.x}
                      y={p.y}
                      fontSize={16}
                      fill={p.active ? "#285e56" : "#626e61"}
                      fontWeight={p.active ? 650 : 450}
                    >
                      {p.label}
                    </text>
                  </g>
                ))}
                <g
                  transform={`translate(${[468, 566, 310, 391, 707, 760][d.tracer]} ${[104, 256, 310, 356, 277, 289][d.tracer]})`}
                >
                  <circle
                    r={16}
                    fill="#fffef5"
                    stroke="#317d80"
                    strokeWidth={2}
                  />
                  <path d="M0 -10Q-11 3 0 9Q11 3 0 -10Z" fill="#5f9eaa" />
                </g>
                <text x={58} y={323} fontSize={17}>
                  Soil
                </text>
                <text x={58} y={378} fontSize={17}>
                  Groundwater
                </text>
                {/* Inspectable regions follow the model's water-store identities. */}
                {[
                  [400, 35, 160, 85],
                  [80, 240, 420, 48],
                  [35, 296, 520, 44],
                  [35, 345, 520, 44],
                  [565, 242, 210, 60],
                ].map(([x, y, width, height], i) => (
                  <g key={obs.objects[i].name} {...pick(i)}>
                    <rect
                      x={x}
                      y={y}
                      width={width}
                      height={height}
                      rx={12}
                      fill="transparent"
                      stroke={focus(i)}
                      strokeWidth={2}
                    />
                  </g>
                ))}
                <g {...pick(5)}>
                  <circle
                    cx={[468, 566, 310, 391, 707, 760][d.tracer]}
                    cy={[104, 256, 310, 356, 277, 289][d.tracer]}
                    r={24}
                    fill="transparent"
                    stroke={focus(5)}
                    strokeWidth={2}
                  />
                </g>
              </>
            );
          })()}
      </svg>
    </section>
  );
}
