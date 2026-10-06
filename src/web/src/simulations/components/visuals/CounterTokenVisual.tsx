import { motion } from "framer-motion";
import { ShapeVisual2D } from "./ShapeVisual2D";
export function CounterTokenVisual({
  id,
  x,
  y,
  ordinal,
  active = false,
  color = "#245bcb",
  inactiveColor = "#eef2fb",
  radius = 23,
  animated = false,
}: {
  id: string;
  x: number;
  y: number;
  ordinal?: number | null;
  active?: boolean;
  color?: string;
  inactiveColor?: string;
  radius?: number;
  animated?: boolean;
}) {
  const content = (
    <>
      <circle r={Math.max(radius, 34)} fill="transparent" />
      <ShapeVisual2D
        identity={id}
        r={radius}
        fill={active ? color : inactiveColor}
        stroke={color}
        strokeWidth={2}
      />
      {ordinal != null && (
        <text
          textAnchor="middle"
          dominantBaseline="central"
          fill={active ? "white" : color}
          fontSize={Math.max(18, radius * 0.7)}
          fontWeight={700}
        >
          {ordinal}
        </text>
      )}
    </>
  );
  return animated ? (
    <motion.g
      className="math-token"
      initial={false}
      animate={{ x, y }}
      transition={{ duration: 0.48, ease: "easeInOut" }}
    >
      {content}
    </motion.g>
  ) : (
    <g
      className="math-token"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      {content}
    </g>
  );
}
