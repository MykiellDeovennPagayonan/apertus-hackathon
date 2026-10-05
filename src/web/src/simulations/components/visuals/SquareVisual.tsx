// biome-ignore-all lint/a11y/useSemanticElements: SVG hit targets use keyboard-enabled button roles.
import type { PointerEvent } from "react";
import type { SquareObject } from "../traits/SceneObjects";
export function SquareVisual({
  object: o,
  points,
  onPointerDown,
  onSelect,
}: {
  object: SquareObject;
  points: string;
  onPointerDown: (e: PointerEvent<SVGElement>) => void;
  onSelect: () => void;
}) {
  return (
    <polygon
      points={points}
      fill={o.fill ? o.color : "none"}
      fillOpacity={o.opacity}
      stroke={o.color}
      strokeWidth={o.width}
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
  );
}
