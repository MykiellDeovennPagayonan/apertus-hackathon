import { motion } from "framer-motion";
export function LoadTruckVisual({
  loadX,
  loadY,
  loadTons,
  showArrow = false,
  markerId,
}: {
  loadX: number;
  loadY: number;
  loadTons: number;
  showArrow?: boolean;
  markerId?: string;
}) {
  return (
    <motion.g initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}>
      <motion.g
        animate={{ x: loadX, y: loadY - 4 }}
        transition={{ duration: 0.35 }}
      >
        <rect
          x={-26}
          y={-30}
          width={52}
          height={22}
          rx={3}
          fill="var(--warn)"
        />
        <rect
          x={-20}
          y={-44}
          width={20}
          height={14}
          rx={2}
          fill="var(--warn)"
          opacity={0.8}
        />
        <circle cx={-16} cy={-4} r={5} fill="var(--text)" />
        <circle cx={16} cy={-4} r={5} fill="var(--text)" />
        <rect x="4" y="-27" width="14" height="10" rx="2" fill="#d8e8e7" />
        <path d="M-22 -12H22M-14 -42V-32" stroke="#725831" strokeWidth="2" />
        <text
          x={0}
          y={-52}
          textAnchor="middle"
          fontSize={11}
          fill="var(--warn)"
        >
          {loadTons} t
        </text>
      </motion.g>
      {showArrow && (
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <line
            x1={loadX}
            y1={115}
            x2={loadX}
            y2={loadY - 65}
            stroke="#285e56"
            strokeWidth="2"
            markerEnd={`url(#${markerId})`}
          />
          <text x={loadX + 10} y={125} fill="var(--accent)">
            ↓ applied load
          </text>
        </motion.g>
      )}
    </motion.g>
  );
}
