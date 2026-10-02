import { type PointerEvent, useRef } from "react";
import { dispatchCommand } from "../../runtime/session";
import type { DemoType, UIAction } from "../../runtime/types";
/** SVG picking coordinates are explicitly mapped into a domain edit. */
export function DragHandleControl({
  demo,
  target,
  cx,
  cy,
  map,
  label,
}: {
  demo: DemoType;
  target: string;
  cx: number;
  cy: number;
  map: (x: number, y: number) => UIAction;
  label: string;
}) {
  const dragging = useRef(false);
  const send = (event: PointerEvent<SVGCircleElement>) => {
    const svg = event.currentTarget.ownerSVGElement,
      matrix = svg?.getScreenCTM();
    if (!svg || !matrix) return;
    const point = svg.createSVGPoint();
    point.x = event.clientX;
    point.y = event.clientY;
    const mapped = point.matrixTransform(matrix.inverse());
    dispatchCommand(demo, { ...map(mapped.x, mapped.y), target });
  };
  return (
    // biome-ignore lint/a11y/useSemanticElements: SVG picking supports pointer capture and keyboard commands.
    <circle
      cx={cx}
      cy={cy}
      r={18}
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
        dispatchCommand(demo, {
          ...map(
            cx + (e.key === "ArrowRight" ? 8 : e.key === "ArrowLeft" ? -8 : 0),
            cy + (e.key === "ArrowDown" ? 8 : e.key === "ArrowUp" ? -8 : 0),
          ),
          target,
        });
      }}
    />
  );
}
