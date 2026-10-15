"use client";
import { useEffect, useId, useState } from "react";
import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import type { productionMeasure } from "../../systems/social-systems/production";

/** Small overhead symbols keep the floor plan, rather than a worker portrait, in focus. */
function Worker({ x, y, waiting }: { x: number; y: number; waiting: boolean }) {
  return (
    <g transform={`translate(${x} ${y}) scale(0.65)`}>
      <ellipse rx={9} ry={5} fill={waiting ? "#aab3ab" : "#39776d"} />
      <circle r={5} fill="#d1a980" stroke="#806747" strokeWidth={1} />
      <path d="M-8 2L-10 8M8 2L10 8" stroke="#d1a980" strokeWidth={3} />
    </g>
  );
}
function Item({ stage, x, y }: { stage: number; x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {stage < 2 ? (
        <path d="M-6 -4H6M-6 1H6M-6 6H6" stroke="#a97d43" strokeWidth={3} />
      ) : stage < 6 ? (
        <>
          <rect
            x={-6}
            y={-5}
            width={12}
            height={12}
            rx={2}
            fill={stage >= 4 ? "#39776d" : "#a97d43"}
          />
          <path d="M-7 -8H7" stroke="#745b35" strokeWidth={3} />
        </>
      ) : (
        <>
          <rect
            x={-7}
            y={-7}
            width={14}
            height={14}
            fill="#d9b77f"
            stroke="#936f39"
          />
          <path d="M0 -7V7" stroke="#936f39" />
          {stage === 7 && (
            <rect x={2} y={1} width={4} height={3} fill="#fff9e8" />
          )}
        </>
      )}
    </g>
  );
}
const stationPoint = (i: number) => ({
  x: 50 + (i < 4 ? i : 7 - i) * 88,
  y: i < 4 ? 144 : 244,
});
export function ProductionComparisonVisual({
  instance,
}: {
  instance: ModelInstance;
}) {
  const scene = instance.outputs.scene as ReturnType<
    typeof productionMeasure
  >["scene"];
  const tileId = useId();
  const [traceStage, setTraceStage] = useState(0);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    if (!playing) return;
    const timer = window.setInterval(
      () => setTraceStage((s) => (s + 1) % 8),
      1400,
    );
    return () => window.clearInterval(timer);
  }, [playing]);
  const current = scene.stages[traceStage];
  return (
    <figure
      className="systems-scene factory-scene"
      data-completed={scene.assembly.completed}
    >
      <figcaption>
        <strong>Same factory floor. Two ways to make chairs.</strong>
        <span>
          On the left, each worker builds a whole chair. On the right, workers
          pass it along.
        </span>
      </figcaption>
      {/* biome-ignore lint/a11y/useSemanticElements: Interactive SVG factory floors expose their station buttons. */}
      <svg
        viewBox="0 0 760 382"
        role="group"
        aria-label="Two matching top-down factories: independent production and assembly handoffs"
      >
        <defs>
          <pattern
            id={tileId}
            width={20}
            height={20}
            patternUnits="userSpaceOnUse"
          >
            <path
              d="M20 0H0V20"
              fill="none"
              stroke="#e0e3d8"
              strokeWidth={0.7}
            />
          </pattern>
        </defs>
        {[false, true].map((assembly) => (
          <g
            key={assembly ? "assembly" : "craft"}
            className="factory-floor"
            transform={`translate(${assembly ? 395 : 0} 0)`}
            data-layout="matching-eight-station-floor"
          >
            <text x={0} y={22} className="systems-label">
              {assembly ? "Assembly factory" : "Craft factory"}
            </text>
            <text x={0} y={47} className="systems-small">
              {assembly
                ? "One operation per worker"
                : "A whole chair per worker"}
            </text>
            <rect
              x={3}
              y={66}
              width={358}
              height={266}
              rx={3}
              fill="#f0f1e9"
              stroke="#8f9e8a"
              strokeWidth={5}
            />
            <rect
              x={7}
              y={70}
              width={350}
              height={258}
              fill={`url(#${tileId})`}
            />
            {/* The same loading bays, stock shelves, workbenches and workers in both factories. */}
            <path d="M23 66H87M277 332H340" stroke="#f9f7ec" strokeWidth={7} />
            <path d="M104 66H147M210 66H253" stroke="#a9cbd0" strokeWidth={5} />
            <text x={14} y={92} className="factory-floor-label">
              WOOD IN
            </text>
            <text x={277} y={317} className="factory-floor-label">
              CHAIRS OUT
            </text>
            {[114, 174, 234, 294].map((x) => (
              <g key={x}>
                <rect
                  x={x}
                  y={80}
                  width={40}
                  height={14}
                  fill="#c8b79a"
                  stroke="#a38f6d"
                />
                <path d={`M${x + 5} 84h30M${x + 5} 89h30`} stroke="#a38f6d" />
              </g>
            ))}
            {assembly && (
              <>
                <path
                  d="M50 175H314Q342 175 342 200V245Q342 275 314 275H50"
                  fill="none"
                  stroke="#bac5b7"
                  strokeWidth={16}
                />
                <path
                  d="M50 175H314Q342 175 342 200V245Q342 275 314 275H50"
                  fill="none"
                  stroke="#f9fbf5"
                  strokeWidth={1.5}
                  strokeDasharray="4 5"
                />
                <path
                  d="M93 170L100 175L93 180M181 170L188 175L181 180M269 170L276 175L269 180M337 214L342 221L347 214M274 270L267 275L274 280M186 270L179 275L186 280M98 270L91 275L98 280"
                  fill="none"
                  stroke="#39776d"
                  strokeWidth={2}
                />
              </>
            )}
            {scene.stages.map((s, i) => {
              const { x, y } = stationPoint(i);
              return (
                <g key={s.name} data-station-position={`${x},${y}`}>
                  {/* biome-ignore lint/a11y/noStaticElementInteractions: Only assembly cells receive handlers and the button role. */}
                  {/* biome-ignore lint/a11y/useAriaPropsSupportedByRole: aria-pressed is present only with the button role. */}
                  <g
                    role={assembly ? "button" : undefined}
                    tabIndex={assembly ? 0 : undefined}
                    aria-label={
                      assembly ? `Visit ${s.name} station` : undefined
                    }
                    aria-pressed={assembly ? traceStage === i : undefined}
                    className={assembly ? "factory-station" : undefined}
                    onClick={assembly ? () => setTraceStage(i) : undefined}
                    onKeyDown={
                      assembly
                        ? (e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setTraceStage(i);
                            }
                          }
                        : undefined
                    }
                  >
                    <rect
                      x={x - 29}
                      y={y - 33}
                      width={58}
                      height={68}
                      rx={6}
                      fill={
                        assembly && traceStage === i ? "#e3ecde" : "transparent"
                      }
                      stroke={assembly && traceStage === i ? "#39776d" : "none"}
                      strokeWidth={2}
                    />
                    <rect
                      x={x - 18}
                      y={y - 7}
                      width={36}
                      height={18}
                      rx={2}
                      fill={
                        assembly && (s.bottleneck || s.interrupted)
                          ? "#f2d49e"
                          : "#cdb18a"
                      }
                      stroke="#9e845d"
                    />
                    <rect
                      x={x - 14}
                      y={y - 5}
                      width={7}
                      height={4}
                      fill="#738578"
                    />
                    <Item stage={assembly ? i : 4} x={x + 5} y={y + 2} />
                    <text
                      x={x}
                      y={y + 51}
                      textAnchor="middle"
                      className="factory-operation"
                    >
                      {assembly ? s.name : "Whole chair"}
                    </text>
                  </g>
                  <Worker x={x} y={y - 22} waiting={assembly && s.idle > 50} />
                  {!assembly && (
                    <>
                      <path
                        d={`M${x} ${y + 19}v11m-3-3l3 3 3-3`}
                        fill="none"
                        stroke="#39776d"
                        strokeWidth={1.5}
                      />
                      <Item stage={7} x={x + 19} y={y + 29} />
                    </>
                  )}
                  {assembly && (
                    <>
                      {Array.from({ length: Math.min(4, s.queue) }, (_, j) => (
                        <rect
                          key={`${s.name}/${j}`}
                          x={x - 27 - j * 5}
                          y={y + 18}
                          width={5}
                          height={7}
                          fill="#d9b77f"
                          stroke="#936f39"
                          strokeWidth={0.5}
                        />
                      ))}
                      <Item stage={i} x={x} y={y + 31} />
                      {traceStage === i && (
                        <circle
                          cx={x}
                          cy={y + 31}
                          r={11}
                          fill="none"
                          stroke="#ad7629"
                          strokeWidth={3}
                        />
                      )}
                      {s.bottleneck && (
                        <text
                          x={x}
                          y={y - 39}
                          textAnchor="middle"
                          className="factory-warning"
                        >
                          Slow station
                        </text>
                      )}
                      {s.interrupted && (
                        <path
                          d={`M${x + 18} ${y - 27}v9m5-9v9`}
                          stroke="#a14c35"
                          strokeWidth={3}
                        />
                      )}
                    </>
                  )}
                </g>
              );
            })}
            <text x={0} y={367} className="systems-value">
              {assembly ? scene.assembly.completed : scene.craft.completed}{" "}
              chairs finished
            </text>
          </g>
        ))}
      </svg>
      <div className="systems-trace">
        <button
          type="button"
          aria-pressed={playing}
          onClick={() => setPlaying((p) => !p)}
        >
          {playing ? "Pause chair journey" : "Watch a chair"}
        </button>
        <button
          type="button"
          onClick={() => {
            setPlaying(false);
            setTraceStage((s) => (s + 1) % 8);
          }}
        >
          {traceStage === 7 ? "Follow another item" : "Follow item →"}
        </button>
        <output aria-live="polite">
          Stage {traceStage + 1} of 8 · {current.name}
        </output>
      </div>
      <p className="systems-footnote">
        {current.queue > 1
          ? `${current.name}: ${current.queue} chairs queued. `
          : ""}
        {current.idle > 50 ? "Waiting for parts. " : ""}
        Amber marks the followed chair. Same eight-hour shift.
      </p>
    </figure>
  );
}
