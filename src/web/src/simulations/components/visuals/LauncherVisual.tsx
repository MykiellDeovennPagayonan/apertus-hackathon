import { rad } from "../systems/BallisticMotionSystem";
export function LauncherVisual({
  angle,
  originX: ORIGIN_X,
  groundY: GROUND_Y,
}: {
  angle: number;
  originX: number;
  groundY: number;
}) {
  return (
    <>
      {/* launcher */}
      <g transform={`translate(${ORIGIN_X},${GROUND_Y})`}>
        <line
          x1={0}
          y1={0}
          x2={Math.cos(rad(angle)) * 34}
          y2={-Math.sin(rad(angle)) * 34}
          stroke="var(--text-dim)"
          strokeWidth={4}
          strokeLinecap="round"
        />
        <circle r={6} fill="var(--accent)" />
      </g>

      {/* angle guide */}
      <path
        d={`M ${ORIGIN_X + 46} ${GROUND_Y} A 46 46 0 0 0 ${
          ORIGIN_X + Math.cos(rad(angle)) * 46
        } ${GROUND_Y - Math.sin(rad(angle)) * 46}`}
        fill="none"
        stroke="var(--text-dim)"
        strokeDasharray="3 4"
      />
      <text
        x={ORIGIN_X + 60}
        y={GROUND_Y - 12}
        fill="var(--text-dim)"
        fontSize={11}
      >
        {angle}°
      </text>
    </>
  );
}
