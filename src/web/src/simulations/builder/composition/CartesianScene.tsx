// biome-ignore-all lint/a11y/useSemanticElements: Interactive SVG geometry uses keyboard-enabled button roles; HTML buttons cannot replace SVG shapes.
import {
  type PointerEvent,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  CompositionScene,
  LineObject,
  Point,
  SceneObject,
  SquareObject,
} from "./model";

type Props = {
  scene: CompositionScene;
  selected: string;
  authoring: boolean;
  onSelect: (id: string) => void;
  onChange: (object: SceneObject) => void;
  onCommit: (object: SceneObject) => void;
};
const clamp = (v: number) => Math.max(-1000, Math.min(1000, v));
export function CartesianScene({
  scene,
  selected,
  authoring,
  onSelect,
  onChange,
  onCommit,
}: Props) {
  const svg = useRef<SVGSVGElement>(null),
    clip = useId().replaceAll(":", "");
  const [drag, setDrag] = useState<{
    object: SceneObject;
    part: string;
    origin: Point;
  } | null>(null);
  const pending = useRef<SceneObject | null>(null);
  const boundsKey = JSON.stringify([
    scene.canvas.xMin,
    scene.canvas.xMax,
    scene.canvas.yMin,
    scene.canvas.yMax,
  ]);
  const authoredBounds = useMemo(() => {
    const [xMin, xMax, yMin, yMax] = JSON.parse(boundsKey) as number[];
    return { xMin, xMax, yMin, yMax };
  }, [boundsKey]);
  const [view, setView] = useState({ source: boundsKey, ...authoredBounds });
  const bounds = view.source === boundsKey ? view : authoredBounds;
  const { xMin, xMax, yMin, yMax } = bounds;
  const size = 500,
    pad = 45;
  const pan = useRef<{
    x: number;
    y: number;
    bounds: typeof authoredBounds;
  } | null>(null);
  const zoom = useCallback(
    (factor: number) =>
      setView((current) => {
        const b = current.source === boundsKey ? current : authoredBounds;
        const cx = (b.xMin + b.xMax) / 2,
          cy = (b.yMin + b.yMax) / 2;
        const w = Math.max(0.5, Math.min(200, (b.xMax - b.xMin) * factor));
        const h = Math.max(0.5, Math.min(200, (b.yMax - b.yMin) * factor));
        return {
          source: boundsKey,
          xMin: cx - w / 2,
          xMax: cx + w / 2,
          yMin: cy - h / 2,
          yMax: cy + h / 2,
        };
      }),
    [boundsKey, authoredBounds],
  );
  useEffect(() => {
    const element = svg.current;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        zoom(event.deltaY > 0 ? 1.1 : 0.9);
      }
    };
    element?.addEventListener("wheel", wheel, { passive: false });
    return () => element?.removeEventListener("wheel", wheel);
  }, [zoom]);
  const scale = size / Math.max(xMax - xMin, yMax - yMin);
  const plotWidth = (xMax - xMin) * scale,
    plotHeight = (yMax - yMin) * scale;
  const left = pad + (size - plotWidth) / 2,
    top = pad + (size - plotHeight) / 2;
  const px = (x: number) => left + (x - xMin) * scale;
  const py = (y: number) => top + (yMax - y) * scale;
  const point = (e: PointerEvent): Point => {
    const element = svg.current;
    if (!element) return { x: 0, y: 0 };
    const matrix = element.getScreenCTM();
    if (!matrix) return { x: 0, y: 0 };
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(
      matrix.inverse(),
    );
    const snap = (v: number) =>
      clamp(
        scene.canvas.snap > 0
          ? Math.round(v / scene.canvas.snap) * scene.canvas.snap
          : v,
      );
    return {
      x: snap(xMin + (p.x - left) / scale),
      y: snap(yMax - (p.y - top) / scale),
    };
  };
  const start = (e: PointerEvent<SVGElement>, o: SceneObject, part: string) => {
    e.stopPropagation();
    onSelect(o.id);
    if (
      !(o.kind === "line" || o.kind === "square") ||
      !(authoring || o.draggable)
    )
      return;
    svg.current?.setPointerCapture(e.pointerId);
    pending.current = null;
    setDrag({ object: structuredClone(o), part, origin: point(e) });
  };
  const move = (e: PointerEvent<SVGSVGElement>) => {
    if (pan.current) {
      const matrix = svg.current?.getScreenCTM();
      if (!matrix) return;
      const start = pan.current,
        b = start.bounds;
      const dx =
        ((e.clientX - start.x) / matrix.a / size) *
        Math.max(b.xMax - b.xMin, b.yMax - b.yMin);
      const dy =
        ((e.clientY - start.y) / matrix.d / size) *
        Math.max(b.xMax - b.xMin, b.yMax - b.yMin);
      const cx = Math.max(-1000, Math.min(1000, (b.xMin + b.xMax) / 2 - dx));
      const cy = Math.max(-1000, Math.min(1000, (b.yMin + b.yMax) / 2 + dy));
      setView({
        source: boundsKey,
        xMin: cx - (b.xMax - b.xMin) / 2,
        xMax: cx + (b.xMax - b.xMin) / 2,
        yMin: cy - (b.yMax - b.yMin) / 2,
        yMax: cy + (b.yMax - b.yMin) / 2,
      });
      return;
    }
    if (!drag) return;
    const p = point(e),
      o = structuredClone(drag.object);
    if (o.kind === "line") {
      if (drag.part === "a" || drag.part === "b") o[drag.part] = p;
      else {
        const dx = p.x - drag.origin.x,
          dy = p.y - drag.origin.y;
        o.a = { x: clamp(o.a.x + dx), y: clamp(o.a.y + dy) };
        o.b = { x: clamp(o.b.x + dx), y: clamp(o.b.y + dy) };
      }
      if (Math.hypot(o.b.x - o.a.x, o.b.y - o.a.y) < 0.01) return;
    } else if (o.kind === "square") {
      if (drag.part === "size")
        o.side = Math.max(
          0.1,
          Math.min(
            100,
            Math.hypot(p.x - o.center.x, p.y - o.center.y) * Math.SQRT2,
          ),
        );
      else if (drag.part === "rotate")
        o.rotation =
          (Math.atan2(p.y - o.center.y, p.x - o.center.x) * 180) / Math.PI - 90;
      else
        o.center = {
          x: clamp(o.center.x + p.x - drag.origin.x),
          y: clamp(o.center.y + p.y - drag.origin.y),
        };
    }
    pending.current = o;
    onChange(o);
  };
  const end = () => {
    pan.current = null;
    if (pending.current) onCommit(pending.current);
    pending.current = null;
    setDrag(null);
  };
  const ticks = (min: number, max: number) => {
    const desired = (max - min) / 10,
      magnitude = 10 ** Math.floor(Math.log10(desired)),
      step =
        ([1, 2, 5, 10].find((v) => v * magnitude >= desired) ?? 10) * magnitude;
    return Array.from(
      { length: Math.min(30, Math.floor((max - min) / step) + 2) },
      (_, i) => Math.ceil(min / step) * step + i * step,
    ).filter((v) => v <= max);
  };
  const linePoints = (o: LineObject) => {
    const dx = o.b.x - o.a.x,
      dy = o.b.y - o.a.y;
    if (Math.abs(dx) < 1e-9)
      return `${px(o.a.x)},${py(yMin)} ${px(o.a.x)},${py(yMax)}`;
    return `${px(xMin)},${py(o.a.y + ((xMin - o.a.x) * dy) / dx)} ${px(xMax)},${py(o.a.y + ((xMax - o.a.x) * dy) / dx)}`;
  };
  const corners = (o: SquareObject) => {
    const a = (o.rotation * Math.PI) / 180;
    return [
      [-1, -1],
      [1, -1],
      [1, 1],
      [-1, 1],
    ].map(([x, y]) => ({
      x: o.center.x + (o.side / 2) * (x * Math.cos(a) - y * Math.sin(a)),
      y: o.center.y + (o.side / 2) * (x * Math.sin(a) + y * Math.cos(a)),
    }));
  };
  const handle = (o: SceneObject, p: Point, part: string, label: string) => (
    <circle
      key={part}
      cx={px(p.x)}
      cy={py(p.y)}
      r={7}
      className="composition-handle"
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={(e) => start(e, o, part)}
      onKeyDown={(e) => {
        if (
          !authoring &&
          (o.kind === "line" || o.kind === "square") &&
          !o.draggable
        )
          return;
        if (
          !["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)
        )
          return;
        e.preventDefault();
        const step = scene.canvas.snap || 0.1,
          next = structuredClone(o);
        const updated = {
          x: clamp(
            p.x +
              (e.key === "ArrowRight"
                ? step
                : e.key === "ArrowLeft"
                  ? -step
                  : 0),
          ),
          y: clamp(
            p.y +
              (e.key === "ArrowUp" ? step : e.key === "ArrowDown" ? -step : 0),
          ),
        };
        if (next.kind === "line" && (part === "a" || part === "b"))
          next[part] = updated;
        else if (next.kind === "square" && part === "center")
          next.center = updated;
        else return;
        onChange(next);
        onCommit(next);
      }}
    />
  );
  return (
    <div className="composition-plane">
      <nav
        className="composition-plane-navigation"
        aria-label="Plane navigation"
      >
        <button type="button" onClick={() => zoom(0.8)}>
          Zoom in
        </button>
        <button type="button" onClick={() => zoom(1.25)}>
          Zoom out
        </button>
        <button
          type="button"
          onClick={() => setView({ source: boundsKey, ...authoredBounds })}
        >
          Reset view
        </button>
      </nav>
      <svg
        ref={svg}
        viewBox="0 0 590 590"
        className="composition-cartesian"
        aria-label="Editable Cartesian plane"
        onPointerMove={move}
        onPointerUp={end}
        onPointerCancel={end}
        onLostPointerCapture={end}
      >
        <title>
          Cartesian plane. Select an object, then drag its handles or use arrow
          keys and settings.
        </title>
        <defs>
          <clipPath id={clip}>
            <rect x={left} y={top} width={plotWidth} height={plotHeight} />
          </clipPath>
        </defs>
        <rect
          x={left}
          y={top}
          width={plotWidth}
          height={plotHeight}
          fill="#faf8f1"
          stroke="#ccc5b6"
          onPointerDown={(event) => {
            svg.current?.setPointerCapture(event.pointerId);
            pan.current = { x: event.clientX, y: event.clientY, bounds };
          }}
        />
        {ticks(xMin, xMax).map((v) => (
          <g key={`x${v}`} pointerEvents="none">
            {scene.canvas.grid && (
              <line
                x1={px(v)}
                x2={px(v)}
                y1={top}
                y2={top + plotHeight}
                stroke="#ddd8cc"
              />
            )}
            <text x={px(v)} y={top + plotHeight + 22} textAnchor="middle">
              {Number(v.toFixed(3))}
            </text>
          </g>
        ))}
        {ticks(yMin, yMax).map((v) => (
          <g key={`y${v}`} pointerEvents="none">
            {scene.canvas.grid && (
              <line
                x1={left}
                x2={left + plotWidth}
                y1={py(v)}
                y2={py(v)}
                stroke="#ddd8cc"
              />
            )}
            <text x={left - 9} y={py(v) + 4} textAnchor="end">
              {Number(v.toFixed(3))}
            </text>
          </g>
        ))}
        {xMin <= 0 && xMax >= 0 && (
          <line
            x1={px(0)}
            x2={px(0)}
            y1={top}
            y2={top + plotHeight}
            stroke="#777"
            strokeWidth={1.5}
          />
        )}
        {yMin <= 0 && yMax >= 0 && (
          <line
            x1={left}
            x2={left + plotWidth}
            y1={py(0)}
            y2={py(0)}
            stroke="#777"
            strokeWidth={1.5}
          />
        )}
        <g clipPath={`url(#${clip})`}>
          {scene.objects.map((o) =>
            o.kind === "line" ? (
              <g key={o.id}>
                <polyline
                  points={linePoints(o)}
                  fill="none"
                  stroke={o.color}
                  strokeWidth={o.width}
                  vectorEffect="non-scaling-stroke"
                  strokeDasharray={o.dashed ? "8 5" : undefined}
                />
                <polyline
                  points={linePoints(o)}
                  fill="none"
                  stroke="transparent"
                  strokeWidth={18}
                  vectorEffect="non-scaling-stroke"
                  role="button"
                  tabIndex={0}
                  aria-label={`Select ${o.label}`}
                  onPointerDown={(e) => start(e, o, "body")}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(o.id);
                    }
                  }}
                />
              </g>
            ) : o.kind === "square" ? (
              <polygon
                key={o.id}
                points={corners(o)
                  .map((p) => `${px(p.x)},${py(p.y)}`)
                  .join(" ")}
                fill={o.fill ? o.color : "none"}
                fillOpacity={o.opacity}
                stroke={o.color}
                strokeWidth={o.width}
                vectorEffect="non-scaling-stroke"
                role="button"
                tabIndex={0}
                aria-label={`Select ${o.label}`}
                onPointerDown={(e) => start(e, o, "body")}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(o.id);
                  }
                }}
              />
            ) : null,
          )}
        </g>
        {scene.objects
          .filter(
            (o) =>
              o.id === selected &&
              (authoring ||
                ((o.kind === "line" || o.kind === "square") && o.draggable)),
          )
          .map((o) =>
            o.kind === "line" ? (
              <g key={o.id}>
                {handle(o, o.a, "a", `${o.label} first handle`)}
                {handle(o, o.b, "b", `${o.label} second handle`)}
              </g>
            ) : o.kind === "square" ? (
              <g key={o.id}>
                {handle(o, o.center, "center", `${o.label} center`)}
                {handle(o, corners(o)[2], "size", `${o.label} resize`)}
                {handle(
                  o,
                  {
                    x:
                      o.center.x -
                      Math.sin((o.rotation * Math.PI) / 180) * (o.side / 2 + 1),
                    y:
                      o.center.y +
                      Math.cos((o.rotation * Math.PI) / 180) * (o.side / 2 + 1),
                  },
                  "rotate",
                  `${o.label} rotate`,
                )}
              </g>
            ) : null,
          )}
        <text x={left + plotWidth + 15} y={top + plotHeight + 20}>
          x
        </text>
        <text x={left - 12} y={top - 15}>
          y
        </text>
      </svg>
    </div>
  );
}
