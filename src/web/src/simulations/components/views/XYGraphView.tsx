import { useProjectileStore } from "../../runtime/projectileSession";
import { range, sampleRange } from "../systems/BallisticMotionSystem";
import { SVGWorldView } from "./SVGWorldView";

const W = 240;
const H = 120;
const PAD = 24;

export function XYGraphView() {
  const s = useProjectileStore();
  const rMax = Math.max(
    ...s.instances.map((i) => range(i.launch.velocity, 45, i.gravity)),
  );
  const pts: string[] = [];
  for (const { x: a, y: r } of sampleRange(s.velocity, s.gravity)) {
    const x = PAD + (a / 90) * (W - PAD - 8);
    const y = H - PAD - (r / rMax) * (H - PAD - 12);
    pts.push(`${x},${y}`);
  }
  const cx = PAD + (s.angle / 90) * (W - PAD - 8);
  const cy =
    H - PAD - (range(s.velocity, s.angle, s.gravity) / rMax) * (H - PAD - 12);

  return (
    <div className="proj-graph">
      <div className="proj-graph__title">Range vs launch angle</div>
      <SVGWorldView
        aria-label="Simulation diagram"
        role="img"
        viewBox={`0 0 ${W} ${H}`}
        style={{ width: "100%" }}
      >
        <line
          x1={PAD}
          y1={H - PAD}
          x2={W - 8}
          y2={H - PAD}
          stroke="var(--border)"
        />
        <line x1={PAD} y1={H - PAD} x2={PAD} y2={8} stroke="var(--border)" />
        <polyline
          points={pts.join(" ")}
          fill="none"
          stroke="var(--accent)"
          strokeWidth={1.5}
        />
        <circle cx={cx} cy={cy} r={4} fill="var(--accent)" />
        {s.instances.slice(1).map((instance) => (
          <g key={instance.id}>
            <polyline
              points={sampleRange(instance.launch.velocity, instance.gravity)
                .map(
                  ({ x: a, y: r }) =>
                    `${PAD + (a / 90) * (W - PAD - 8)},${H - PAD - (r / rMax) * (H - PAD - 12)}`,
                )
                .join(" ")}
              fill="none"
              stroke="var(--warn)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
            />
            <circle
              cx={PAD + (instance.launch.angle / 90) * (W - PAD - 8)}
              cy={H - PAD - (instance.metrics.range / rMax) * (H - PAD - 12)}
              r="4"
              fill="var(--warn)"
            />
          </g>
        ))}
        <text
          x={W / 2}
          y={H - 6}
          fontSize={9}
          fill="var(--text-dim)"
          textAnchor="middle"
        >
          angle (deg)
        </text>
      </SVGWorldView>
    </div>
  );
}

export default XYGraphView;
