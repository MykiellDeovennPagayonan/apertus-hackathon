// biome-ignore-all lint/a11y/useSemanticElements: SVG hit targets use keyboard-enabled button roles.
import type { PointerEvent, SVGProps } from "react";
import type { LineObject } from "../traits/SceneObjects";
export function LineVisual({
  object: o,
  points,
  onPointerDown,
  onSelect,
}: {
  object: LineObject;
  points: string;
  onPointerDown: (e: PointerEvent<SVGElement>) => void;
  onSelect: () => void;
}) {
  return (
    <g>
      <LineStroke
        points={points}
        fill="none"
        stroke={o.color}
        strokeWidth={o.width}
        vectorEffect="non-scaling-stroke"
        strokeDasharray={o.dashed ? "8 5" : undefined}
      />
      <polyline
        points={points}
        fill="none"
        stroke="transparent"
        strokeWidth={18}
        vectorEffect="non-scaling-stroke"
        role="button"
        tabIndex={0}
        aria-label={`Select ${o.label}`}
        onPointerDown={(e) => onPointerDown(e)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onSelect();
          }
        }}
      />
    </g>
  );
}

export function LineStroke(props: SVGProps<SVGPolylineElement>) {
  return <polyline fill="none" {...props} />;
}
