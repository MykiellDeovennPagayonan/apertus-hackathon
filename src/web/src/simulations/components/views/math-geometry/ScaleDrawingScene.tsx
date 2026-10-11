import type { ModelInstance } from "../../../runtime/contribution";
import "./geometry.css";

const n = (value: number) => Number(value.toFixed(2)).toString();
/** Grid line positions in metres from 0 to `extent`. */
const metres = (extent: number, step: number) =>
  Array.from({ length: extent / step + 1 }, (_, i) => i * step);

export function ScaleDrawingScene({ instance }: { instance: ModelInstance }) {
  const k = Number(instance.outputs.scaleFactor);
  const outline = (instance.outputs.outline as number[][] | undefined) ?? [];
  const width = Math.max(...outline.map(([x]) => x));
  const length = Math.max(...outline.map(([, y]) => y));
  const reach = Math.max(k, 2);
  // Display scale only changes when the plan outgrows twice its original size.
  const px = Math.min(700 / (reach * width), 330 / (reach * length));
  const ox = 40,
    oy = 370;
  const point = ([x, y]: number[], factor = 1) =>
    `${ox + x * factor * px},${oy - y * factor * px}`;
  const path = (factor: number, dx = 0, dy = 0) =>
    outline.map(([x, y]) => point([x + dx, y + dy], factor)).join(" ");
  const gridStep = px >= 10 ? 1 : 5;
  const gridW = Math.ceil((reach * width) / gridStep) * gridStep,
    gridH = Math.ceil((reach * length) / gridStep) * gridStep;
  const copies =
    Number.isInteger(k) && k > 1 && outline.length === 4
      ? Array.from({ length: k * k }, (_, i) => [i % k, Math.floor(i / k)])
      : [];
  const sw = Number(instance.outputs.scaledWidth),
    sl = Number(instance.outputs.scaledLength);
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 400"
        role="img"
        aria-label={`Original plan ${n(width)} by ${n(length)} metres, area ${n(Number(instance.outputs.originalArea))} square metres. Scaled by ${n(k)}: ${n(sw)} by ${n(sl)} metres, area ${n(Number(instance.outputs.scaledArea))} square metres.`}
      >
        {metres(gridW, gridStep).map((m) => (
          <line
            key={`x${m}`}
            x1={ox + m * px}
            y1={oy}
            x2={ox + m * px}
            y2={oy - gridH * px}
            className="mg-grid"
          />
        ))}
        {metres(gridH, gridStep).map((m) => (
          <line
            key={`y${m}`}
            x1={ox}
            y1={oy - m * px}
            x2={ox + gridW * px}
            y2={oy - m * px}
            className="mg-grid"
          />
        ))}
        <polygon points={path(k)} className="mg-fill-teal" data-scale={k} />
        {copies.map(([i, j]) => (
          <polygon
            key={`${i}-${j}`}
            points={path(1, i * width, j * length)}
            className="mg-dashed"
            data-copy
          />
        ))}
        <polygon points={path(1)} className="mg-fill-orange" data-original />
        <circle cx={ox} cy={oy} r={5} className="mg-fill-accent" />
        <text x={ox + (k * width * px) / 2} y={oy + 22} textAnchor="middle">
          {n(sw)} m
        </text>
        <text
          x={ox + k * width * px + 8}
          y={oy - (k * length * px) / 2}
          className="mg-small"
        >
          {n(sl)} m
        </text>
        <text x={ox + 6} y={oy - length * px - 8} className="mg-small">
          original {n(width)} × {n(length)} m
        </text>
        <text x={ox} y={18} className="mg-small">
          {gridStep === 1
            ? "Each grid square is 1 m × 1 m"
            : "Each grid square is 5 m × 5 m"}
        </text>
      </svg>
      <p className="mg-caption">
        Lengths ×{n(k)} · area ×{n(k * k)}:{" "}
        <strong>
          {n(Number(instance.outputs.originalArea))} m² →{" "}
          {n(Number(instance.outputs.scaledArea))} m²
        </strong>
        {copies.length > 0 &&
          ` — ${copies.length} copies of the original floor fit inside.`}{" "}
        Angles stay the same.
      </p>
    </section>
  );
}
