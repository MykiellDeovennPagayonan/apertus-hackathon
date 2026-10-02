import { ProjectileStyles } from "../resources/ProjectileStyles";
import { sampleTrajectory } from "../systems/BallisticMotionSystem";
import type { FlightMetrics } from "../traits/FlightMetrics";
export function TrajectoryVisual({
  velocity,
  angle,
  gravity,
  scale,
  originX,
  groundY,
  comparison = false,
  metrics,
}: {
  velocity: number;
  angle: number;
  gravity: number;
  scale: number;
  originX: number;
  groundY: number;
  comparison?: boolean;
  metrics?: FlightMetrics;
}) {
  const points = sampleTrajectory(velocity, angle, gravity)
    .map((p) => `${originX + p.x * scale},${groundY - p.y * scale}`)
    .join(" ");
  return (
    <>
      <polyline
        points={points}
        fill="none"
        stroke={
          comparison ? ProjectileStyles.comparison : ProjectileStyles.primary
        }
        strokeWidth={ProjectileStyles.trajectoryWidth}
        strokeDasharray={
          comparison ? ProjectileStyles.comparisonDash : undefined
        }
      />
      {metrics && (
        <TrajectoryAnnotations
          metrics={metrics}
          scale={scale}
          originX={originX}
          groundY={groundY}
        />
      )}
    </>
  );
}

function TrajectoryAnnotations({
  metrics,
  scale,
  originX: ORIGIN_X,
  groundY: GROUND_Y,
}: {
  metrics: FlightMetrics;
  scale: number;
  originX: number;
  groundY: number;
}) {
  const { range: R, maxHeight: Hmax } = metrics;
  return (
    <>
      {/* range marker */}
      <g>
        <line
          x1={ORIGIN_X + R * scale}
          y1={GROUND_Y}
          x2={ORIGIN_X + R * scale}
          y2={GROUND_Y + 16}
          stroke="var(--accent)"
        />
        <text
          x={ORIGIN_X + R * scale}
          y={GROUND_Y + 32}
          fill="var(--accent)"
          fontSize={11}
          textAnchor="middle"
        >
          range {R.toFixed(1)} m
        </text>
      </g>

      {/* max height marker */}
      <line
        x1={ORIGIN_X + (R / 2) * scale - 14}
        y1={GROUND_Y - Hmax * scale}
        x2={ORIGIN_X + (R / 2) * scale + 14}
        y2={GROUND_Y - Hmax * scale}
        stroke="var(--text-dim)"
        strokeDasharray="4 4"
      />
      <text
        x={ORIGIN_X + (R / 2) * scale + 20}
        y={GROUND_Y - Hmax * scale + 4}
        fill="var(--text-dim)"
        fontSize={11}
      >
        h {Hmax.toFixed(1)} m
      </text>
    </>
  );
}
