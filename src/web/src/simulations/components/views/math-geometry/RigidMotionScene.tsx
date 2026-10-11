import { baseShape } from "../../../domains/math-geometry/rigidMotion";
import type { ModelInstance } from "../../../runtime/contribution";
import "./geometry.css";

type Point = { label: string; x: number; y: number };
const unit = 22,
  cx = 220,
  cy = 220,
  extent = 9;
const sx = (x: number) => cx + x * unit,
  sy = (y: number) => cy - y * unit;
const points = (list: Point[]) =>
  list.map((p) => `${sx(p.x)},${sy(p.y)}`).join(" ");
const names: Record<string, string> = {
  flip: "flip",
  turn: "turn",
  slide: "slide",
};

export function RigidMotionScene({ instance }: { instance: ModelInstance }) {
  const vertices = (instance.outputs.vertices as Point[] | undefined) ?? [];
  const previous = (instance.outputs.previous as Point[] | undefined) ?? [];
  const operations =
    (instance.outputs.operations as string[] | undefined) ?? [];
  const mirrored = instance.outputs.orientation === "mirrored";
  const [a, b] = vertices;
  const arrow = `mg-arrow-${instance.id.replace(/[^a-zA-Z0-9-]/g, "-")}`;
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 440 440"
        role="img"
        aria-label={`Lettered L shape after ${operations.length ? operations.join(", then ") : "no moves"}. ${mirrored ? "It is a mirror image of the start." : "It has the same orientation as the start."}`}
      >
        {Array.from({ length: 2 * extent + 1 }, (_, i) => i - extent).map(
          (i) => (
            <g key={i}>
              <line
                x1={sx(i)}
                y1={sy(-extent)}
                x2={sx(i)}
                y2={sy(extent)}
                className="mg-grid"
              />
              <line
                x1={sx(-extent)}
                y1={sy(i)}
                x2={sx(extent)}
                y2={sy(i)}
                className="mg-grid"
              />
            </g>
          ),
        )}
        <line
          x1={sx(0)}
          y1={sy(extent)}
          x2={sx(0)}
          y2={sy(-extent)}
          className="mg-dashed"
        />
        <text x={sx(0) + 6} y={sy(extent) + 14} className="mg-small">
          mirror line
        </text>
        <circle cx={sx(0)} cy={sy(0)} r={5} className="mg-fill-accent" />
        <text x={sx(0) + 8} y={sy(0) + 18} className="mg-small">
          turn centre
        </text>
        {operations.length > 0 && (
          <>
            <polygon
              points={points(baseShape)}
              className="mg-fill-faint"
              data-start
            />
            <polygon
              points={points(previous)}
              className="mg-dashed"
              data-previous
            />
          </>
        )}
        <polygon
          points={points(vertices)}
          className={mirrored ? "mg-fill-orange" : "mg-fill-teal"}
          data-orientation={mirrored ? "mirrored" : "same"}
        />
        {a && b && (
          <line
            x1={sx(a.x)}
            y1={sy(a.y)}
            x2={sx(a.x + (b.x - a.x) * 0.6)}
            y2={sy(a.y + (b.y - a.y) * 0.6)}
            className="mg-accent"
            markerEnd={`url(#${arrow})`}
          />
        )}
        <defs>
          <marker
            id={arrow}
            viewBox="0 0 10 10"
            refX="5"
            refY="5"
            markerWidth="5"
            markerHeight="5"
            orient="auto"
          >
            <path d="M0 0 L10 5 L0 10 z" className="mg-fill-accent" />
          </marker>
        </defs>
        {vertices.map((p) => (
          <text
            key={p.label}
            x={sx(p.x)}
            y={sy(p.y)}
            dx={-4}
            dy={5}
            className="mg-strong"
          >
            {p.label}
          </text>
        ))}
      </svg>
      <p className="mg-caption">
        {operations.length === 0
          ? "Start: going A → B → C, the corners run anticlockwise."
          : mirrored
            ? "Mirror image: A → B → C now runs clockwise. Only a flip reverses the order."
            : "Same orientation: A → B → C still runs anticlockwise. Turns and slides never reverse it."}{" "}
        {operations.length > 0 &&
          `Moves: ${operations.map((op) => names[op]).join(" → ")}. Every side keeps its length.`}
      </p>
    </section>
  );
}
