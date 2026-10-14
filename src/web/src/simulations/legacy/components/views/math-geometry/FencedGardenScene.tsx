import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import "./geometry.css";

const n = (value: number) => Number(value.toFixed(2)).toString();
type Point = { x: number; y: number };

export function FencedGardenScene({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs;
  const p = Number(o.fenceLength),
    x = Number(o.gardenWidth),
    y = Number(o.gardenDepth),
    area = Number(o.gardenArea),
    bestX = Number(o.bestWidth),
    bestY = Number(o.bestDepth),
    largest = Number(o.largestArea);
  const wall = Boolean(o.againstWall);
  const curve = (o.curvePoints as Point[] | undefined) ?? [];
  // Fixed per fence length: dragging the width never rescales the garden.
  const px = Math.min(320 / (p / 2), 290 / (wall ? p : p / 2));
  const gx = 30,
    gy = 40;
  const w = x * px,
    d = y * px;
  const chart = { x: 420, y: 50, w: 330, h: 260 };
  const cx = (v: number) => chart.x + (v / (p / 2)) * chart.w;
  const cy = (v: number) => chart.y + chart.h - (v / (largest * 1.1)) * chart.h;
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 360"
        role="img"
        aria-label={`Garden ${n(x)} by ${n(y)} metres encloses ${n(area)} square metres with ${n(p)} metres of fence. The most is ${n(largest)} square metres at ${n(bestX)} by ${n(bestY)} metres.`}
      >
        <rect
          x={gx}
          y={gy}
          width={w}
          height={d}
          className="mg-fill-green"
          data-area={area}
        />
        <path
          d={
            wall
              ? `M ${gx} ${gy} H ${gx + w} V ${gy + d} H ${gx}`
              : `M ${gx} ${gy} H ${gx + w} V ${gy + d} H ${gx} Z`
          }
          className="mg-accent"
          data-fence
        />
        {wall && (
          <>
            <line
              x1={gx}
              y1={gy - 10}
              x2={gx}
              y2={gy + d + 10}
              className="mg-hatch"
              data-wall
            />
            <text x={gx} y={gy - 10} className="mg-small">
              wall (no fence needed)
            </text>
          </>
        )}
        <text x={gx + w / 2} y={gy + d + 22} textAnchor="middle">
          {n(x)} m
        </text>
        <text x={gx + w + 8} y={gy + d / 2} className="mg-small">
          {n(y)} m
        </text>
        {w > 60 && d > 30 && (
          <text
            x={gx + w / 2}
            y={gy + d / 2 + 6}
            textAnchor="middle"
            className="mg-strong"
          >
            {n(area)} m²
          </text>
        )}
        <line
          x1={chart.x}
          y1={chart.y + chart.h}
          x2={chart.x + chart.w}
          y2={chart.y + chart.h}
          className="mg-line"
        />
        <line
          x1={chart.x}
          y1={chart.y}
          x2={chart.x}
          y2={chart.y + chart.h}
          className="mg-line"
        />
        <polyline
          points={curve
            .map((q) => `${cx(q.x).toFixed(1)},${cy(q.y).toFixed(1)}`)
            .join(" ")}
          className="mg-accent"
        />
        <line
          x1={cx(bestX)}
          y1={cy(largest)}
          x2={cx(bestX)}
          y2={chart.y + chart.h}
          className="mg-dashed"
        />
        <text
          x={cx(bestX)}
          y={cy(largest) - 10}
          textAnchor="middle"
          className="mg-small"
        >
          most: {n(largest)} m² at {n(bestX)} m
        </text>
        <circle
          cx={cx(x)}
          cy={cy(area)}
          r={7}
          className="mg-fill-orange"
          data-marker={x}
        />
        <text
          x={chart.x + chart.w}
          y={chart.y + chart.h + 22}
          textAnchor="end"
          className="mg-small"
        >
          width (m) →
        </text>
        <text x={chart.x + 6} y={chart.y - 10} className="mg-small">
          area (m²)
        </text>
      </svg>
      <p className="mg-caption">
        {n(x)} m × {n(y)} m = <strong>{n(area)} m²</strong> with the same {n(p)}{" "}
        m of fence
        {wall ? " on three sides" : ""}.{" "}
        {Math.abs(area - largest) < 1e-9
          ? "This is the most ground possible."
          : `The best shape is ${n(bestX)} m × ${n(bestY)} m = ${n(largest)} m².`}
      </p>
    </section>
  );
}
