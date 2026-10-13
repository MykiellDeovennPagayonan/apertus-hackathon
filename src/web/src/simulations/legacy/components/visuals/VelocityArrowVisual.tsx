import { ProjectileStyles } from "../resources/ProjectileStyles";
import { posAt, velocityAt } from "../systems/BallisticMotionSystem";
/** Direction-normalized display arrow; length does not represent speed. */
export function VelocityArrowVisual({
  velocity,
  angle,
  gravity,
  time,
  scale,
  originX,
  groundY,
  markerId,
}: {
  velocity: number;
  angle: number;
  gravity: number;
  time: number;
  scale: number;
  originX: number;
  groundY: number;
  markerId: string;
}) {
  const p = posAt(velocity, angle, gravity, time),
    v = velocityAt(velocity, angle, gravity, time),
    mag = Math.hypot(v.x, v.y) || 1;
  const x = originX + p.x * scale,
    y = groundY - p.y * scale;
  return (
    <line
      x1={x}
      y1={y}
      x2={x + (v.x / mag) * ProjectileStyles.arrowLength}
      y2={y - (v.y / mag) * ProjectileStyles.arrowLength}
      stroke="var(--ok)"
      strokeWidth={2}
      markerEnd={`url(#${markerId})`}
    />
  );
}
