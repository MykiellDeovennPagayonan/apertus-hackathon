import type { ModelInstance } from "../../../runtime/contribution";
import "./geometry.css";

const n = (value: number, places = 1) =>
  Number(value.toFixed(places)).toString();
type Point = { x: number; y: number };

export function CanPackagingScene({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs;
  const r = Number(o.canRadius),
    h = Number(o.canHeight),
    wall = Number(o.wallArea),
    ends = Number(o.endsArea),
    total = Number(o.surfaceArea),
    bestR = Number(o.bestRadius),
    bestH = Number(o.bestHeight),
    least = Number(o.leastArea),
    extra = Number(o.extraPercent);
  const curve = (o.curvePoints as Point[] | undefined) ?? [];
  const twoEnds = Math.abs(ends - 2 * Math.PI * r * r) < 1e-6 * ends;
  // Fixed per-volume drawing scale: a 2 cm radius can just fits the drawing height.
  const volume = Math.PI * r * r * h;
  const px = 250 / (volume / (Math.PI * 4));
  const drawnH = Math.min(h * px, 270),
    clipped = h * px > 270,
    rx = r * px,
    base = 340,
    canX = 140;
  const top = base - drawnH;
  const maxArea = Math.max(...curve.map((p) => p.y));
  const bar = 380 / maxArea;
  const chart = { x: 330, y: 180, w: 400, h: 160 };
  const cx = (x: number) => chart.x + ((x - 1) / 14) * chart.w;
  const cy = (y: number) => chart.y + chart.h - (y / maxArea) * chart.h;
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 380"
        role="img"
        aria-label={`Can of radius ${n(r)} centimetres and height ${n(h)} centimetres uses ${n(total, 0)} square centimetres of metal. The least possible is ${n(least, 0)} at radius ${n(bestR)}.`}
      >
        <rect
          x={canX - rx}
          y={top}
          width={2 * rx}
          height={drawnH}
          className="mg-fill-teal"
        />
        <ellipse
          cx={canX}
          cy={base}
          rx={rx}
          ry={Math.min(12, rx / 3)}
          className="mg-fill-teal"
        />
        <ellipse
          cx={canX}
          cy={top}
          rx={rx}
          ry={Math.min(12, rx / 3)}
          className={twoEnds ? "mg-fill-orange" : "mg-dashed"}
        />
        {clipped && (
          <text x={canX} y={top - 18} textAnchor="middle" className="mg-small">
            taller than shown ↑
          </text>
        )}
        <text x={canX} y={base + 30} textAnchor="middle">
          r {n(r)} cm · h {n(h)} cm
        </text>
        <text x={330} y={30} className="mg-strong">
          Metal needed: {n(total, 0)} cm²
        </text>
        <rect
          x={330}
          y={48}
          width={wall * bar}
          height={30}
          className="mg-fill-teal"
          data-wall={wall}
        />
        <rect
          x={330 + wall * bar}
          y={48}
          width={ends * bar}
          height={30}
          className="mg-fill-orange"
          data-ends={ends}
        />
        <line
          x1={330 + least * bar}
          y1={40}
          x2={330 + least * bar}
          y2={88}
          className="mg-dashed"
        />
        <text x={330} y={104} className="mg-small">
          side wall unrolled {n(wall, 0)} cm² + {twoEnds ? "2 ends" : "1 end"}{" "}
          {n(ends, 0)} cm² · dashed = least possible {n(least, 0)} cm²
        </text>
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
            .map((p) => `${cx(p.x).toFixed(1)},${cy(p.y).toFixed(1)}`)
            .join(" ")}
          className="mg-accent"
        />
        <circle
          cx={cx(bestR)}
          cy={cy(least)}
          r={5}
          className="mg-fill-accent"
        />
        <text
          x={cx(bestR)}
          y={cy(least) + 22}
          textAnchor="middle"
          className="mg-small"
        >
          least at r {n(bestR)}
        </text>
        <circle
          cx={cx(r)}
          cy={cy(total)}
          r={7}
          className="mg-fill-orange"
          data-marker={r}
        />
        <text
          x={chart.x + chart.w}
          y={chart.y + chart.h + 20}
          textAnchor="end"
          className="mg-small"
        >
          radius (cm) →
        </text>
        <text x={chart.x + 6} y={chart.y - 6} className="mg-small">
          metal (cm²)
        </text>
      </svg>
      <p className="mg-caption">
        Same {n(volume, 0)} cm³ inside.{" "}
        {extra < 0.5
          ? `This is the least-metal shape: height ${n(h)} cm = ${twoEnds ? "2 × radius" : "radius"}.`
          : `This can uses ${n(extra, 0)}% more metal than the best one (r ${n(bestR)} cm, h ${n(bestH)} cm, ${twoEnds ? "height = 2 × radius" : "height = radius"}).`}
      </p>
    </section>
  );
}
