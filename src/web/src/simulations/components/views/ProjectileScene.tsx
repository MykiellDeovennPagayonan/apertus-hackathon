import { useId } from "react";
import { ProjectileStyles } from "../resources/ProjectileStyles";
import { LauncherVisual } from "../visuals/LauncherVisual";
import { ShapeVisual2D } from "../visuals/ShapeVisual2D";
import { TrajectoryVisual } from "../visuals/TrajectoryVisual";
import { VelocityArrowVisual } from "../visuals/VelocityArrowVisual";
import { SVGWorldView } from "./SVGWorldView";

// Display coordinates belong to the reusable scene; physical distance uses the model scale.
const W = 760,
  H = 420,
  GROUND_Y = 350,
  ORIGIN_X = 55;

export function ProjectileScene({
  state: s,
  visualLayers = [
    "appearance/Launcher",
    "appearance/Trajectory",
    "appearance/VelocityArrow",
    "appearance/ProjectileBody",
  ],
}: {
  visualLayers?: string[];
  state: Pick<
    import("../../runtime/projectileSession").ProjectileState,
    "primary" | "instances" | "angle" | "velocity" | "gravity" | "showVectors"
  >;
}) {
  const markerId = useId();

  const { duration: T } = s.primary.metrics;
  // Keep a stable world scale while changing angle.
  const referenceRange = Math.max(
    ...s.instances.map((i) => i.launch.velocity ** 2 / i.gravity),
    1,
  );
  const scale = Math.min(
    12,
    (W - ORIGIN_X - 60) / referenceRange,
    (GROUND_Y - 65) / (referenceRange / 2),
  );

  const ball = s.primary.transform.position;
  const bx = ORIGIN_X + ball.x * scale;
  const by = GROUND_Y - ball.y * scale;

  const vecTimes = [T * 0.2, T * 0.5, T * 0.8];

  return (
    <>
      {s.instances.length > 1 && (
        <section className="projectile-legend" aria-label="Flight comparison">
          {s.instances.map((instance, index) => (
            <div key={instance.id} className={index ? "is-comparison" : ""}>
              <strong>
                Ball {index + 1} · {instance.launch.angle}° ·{" "}
                {instance.launch.velocity} m/s
              </strong>
            </div>
          ))}
        </section>
      )}
      <SVGWorldView
        aria-label="Simulation diagram"
        role="img"
        viewBox={`0 0 ${W} ${H}`}
        className="projectile-scene"
        style={{ width: "100%", height: "100%" }}
      >
        <text x={ORIGIN_X} y={GROUND_Y + 30} fill="var(--muted)" fontSize={14}>
          0 m
        </text>
        <text
          x={W - 35}
          y={GROUND_Y + 30}
          textAnchor="end"
          fill="var(--muted)"
          fontSize={14}
        >
          Distance →
        </text>
        {/* ground */}
        <line
          x1={0}
          y1={GROUND_Y}
          x2={W}
          y2={GROUND_Y}
          stroke="var(--border)"
          strokeWidth={2}
        />

        {visualLayers.includes("appearance/Launcher") && (
          <LauncherVisual
            angle={s.angle}
            originX={ORIGIN_X}
            groundY={GROUND_Y}
          />
        )}
        {s.instances.map((instance, index) =>
          instance.trajectoryVisible &&
          visualLayers.includes("appearance/Trajectory") ? (
            <TrajectoryVisual
              key={instance.id}
              velocity={instance.launch.velocity}
              angle={instance.launch.angle}
              gravity={instance.gravity}
              scale={scale}
              originX={ORIGIN_X}
              groundY={GROUND_Y}
              comparison={index > 0}
            />
          ) : null,
        )}
        {s.showVectors &&
          visualLayers.includes("appearance/VelocityArrow") &&
          vecTimes.map((tv, i) => (
            <VelocityArrowVisual
              key={i === 0 ? "start" : i === 1 ? "middle" : "end"}
              velocity={s.velocity}
              angle={s.angle}
              gravity={s.gravity}
              time={tv}
              scale={scale}
              originX={ORIGIN_X}
              groundY={GROUND_Y}
              markerId={markerId}
            />
          ))}

        <defs>
          <marker
            id={markerId}
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8 Z" fill="var(--ok)" />
          </marker>
        </defs>

        {/* ball */}
        {visualLayers.includes("appearance/ProjectileBody") && (
          <ShapeVisual2D
            identity={s.primary.id}
            cx={bx}
            cy={by}
            r={ProjectileStyles.radius}
            fill="var(--accent)"
          />
        )}
        {s.instances
          .slice(1)
          .filter(() => visualLayers.includes("appearance/ProjectileBody"))
          .map((instance) => (
            <ShapeVisual2D
              key={instance.id}
              identity={instance.id}
              cx={ORIGIN_X + instance.transform.position.x * scale}
              cy={GROUND_Y - instance.transform.position.y * scale}
              r={ProjectileStyles.radius}
              fill="var(--warn)"
            />
          ))}
      </SVGWorldView>
    </>
  );
}

export default ProjectileScene;
