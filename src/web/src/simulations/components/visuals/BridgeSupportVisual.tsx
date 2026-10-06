import { motion } from "framer-motion";
export function BridgeSupportVisual({
  left,
  spanPx,
  deckY: DECK_Y,
  width: W,
  shares,
  markerId,
}: {
  left: number;
  spanPx: number;
  deckY: number;
  width: number;
  shares?: number[];
  markerId?: string;
}) {
  if (shares)
    return (
      <g>
        {[left, left + spanPx].map((x, i) => (
          <g key={x}>
            <line
              x1={x}
              y1={DECK_Y + 70}
              x2={x}
              y2={DECK_Y + 28}
              stroke="#285e56"
              strokeWidth={2}
              markerEnd={`url(#${markerId})`}
            />
            <text
              x={x + (i ? -10 : 10)}
              y={DECK_Y + 62}
              textAnchor={i ? "end" : "start"}
              fill="var(--accent)"
              fontSize={16}
            >
              {shares[i].toFixed(1)} t
            </text>
          </g>
        ))}
      </g>
    );
  return (
    <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <polygon
        points={`${left - 22},${DECK_Y + 90} ${left},${DECK_Y} ${left + 22},${DECK_Y + 90}`}
        fill="var(--border)"
      />
      <polygon
        points={`${left + spanPx - 22},${DECK_Y + 90} ${left + spanPx},${DECK_Y} ${left + spanPx + 22},${DECK_Y + 90}`}
        fill="var(--border)"
      />
      <rect
        x={0}
        y={DECK_Y + 70}
        width={W}
        height={6}
        fill="var(--border)"
        opacity={0.4}
      />
    </motion.g>
  );
}
