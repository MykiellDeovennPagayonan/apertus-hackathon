import { type PointerEvent, useEffect, useRef, useState } from "react";
import type { ActionResult } from "../../runtime/commands";
import type { UIAction } from "../../runtime/types";
/** SVG picking coordinates are explicitly mapped into a domain edit. */
export function DragHandleControl({
  onCommand,
  target,
  cx,
  cy,
  map,
  label,
  keyboardStep = 8,
}: {
  onCommand: (command: UIAction) => ActionResult;
  target: string;
  cx: number;
  cy: number;
  map: (x: number, y: number) => UIAction;
  label: string;
  keyboardStep?: number;
}) {
  const dragging = useRef(false);
  const handle = useRef<SVGCircleElement>(null);
  const [radius, setRadius] = useState(22);
  useEffect(() => {
    const svg = handle.current?.ownerSVGElement;
    if (!svg) return;
    const measure = () => {
      const scale = svg.getScreenCTM()?.a ?? 1;
      setRadius(Math.max(18, 22 / Math.abs(scale || 1)));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(svg);
    return () => observer.disconnect();
  }, []);
  const send = (event: PointerEvent<SVGCircleElement>) => {
    const svg = event.currentTarget.ownerSVGElement,
      matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    onCommand({ ...map(mapped.x, mapped.y), target });
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG picking supports pointer capture and keyboard commands.
    <circle
      cx={cx}
      cy={cy}
      ref={handle}
      r={radius}
      fill="transparent"
      stroke="var(--accent)"
      strokeDasharray="3 3"
      style={{ cursor: "grab", touchAction: "none" }}
      role="button"
      tabIndex={0}
      aria-label={label}
      onPointerDown={(e) => {
        dragging.current = true;
        e.currentTarget.setPointerCapture(e.pointerId);
        send(e);
      }}
      onPointerMove={(e) => {
        if (dragging.current) send(e);
      }}
      onPointerUp={(e) => {
        dragging.current = false;
        e.currentTarget.releasePointerCapture(e.pointerId);
      }}
      onPointerCancel={() => {
        dragging.current = false;
      }}
      onKeyDown={(e) => {
        if (
          !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)
        )
          return;
        e.preventDefault();
        const step = keyboardStep * (e.shiftKey ? 0.1 : 1);
        onCommand({
          ...map(
            cx +
              (e.key === "ArrowRight"
                ? step
                : e.key === "ArrowLeft"
                  ? -step
                  : 0),
            cy +
              (e.key === "ArrowDown" ? step : e.key === "ArrowUp" ? -step : 0),
          ),
          target,
        });
      }}
    />
  );
}
