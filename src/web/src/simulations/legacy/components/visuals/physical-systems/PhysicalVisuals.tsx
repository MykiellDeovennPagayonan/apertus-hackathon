import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import { circuitWires } from "../../systems/physical-systems/models";
import type {
  CircuitState,
  Terminal,
} from "../../traits/physical-systems/state";

export const physicalPalette = ["#285e56", "#996018", "#514381", "#586600"];
export function PendulumVisual({
  instance,
  index,
  scale,
  showIndex = true,
}: {
  instance: ModelInstance;
  index: number;
  scale: number;
  showIndex?: boolean;
}) {
  const pivotX = 80 + index * 130;
  const bobX = pivotX + Number(instance.outputs.x) * scale;
  const bobY = 45 - Number(instance.outputs.y) * scale;
  return (
    <g>
      <line
        x1={pivotX - 25}
        y1={45}
        x2={pivotX + 25}
        y2={45}
        stroke="#30362e"
        strokeWidth={5}
      />
      <line
        x1={pivotX}
        y1={45}
        x2={bobX}
        y2={bobY}
        stroke="#30362e"
        strokeWidth={2}
      />
      <circle cx={bobX} cy={bobY} r={13} fill={physicalPalette[index % 4]} />
      <text x={pivotX} y={310} textAnchor="middle">
        {showIndex ? `${index + 1}. ` : ""}
        {String(instance.parameters.length)} m
      </text>
    </g>
  );
}
export function TrackVisual({
  instance,
  index,
  extent,
}: {
  instance: ModelInstance;
  index: number;
  extent: number;
}) {
  const y = 65 + index * 120;
  const x = (distance: number) => 95 + (distance / extent) * 425;
  const distance = Number(instance.outputs.distance);
  const stop = instance.outputs.stoppingDistance;
  return (
    <g>
      <path
        d={`M 20 ${y - 35} L 95 ${y} H 530`}
        fill="none"
        stroke="#746f61"
        strokeWidth={3}
      />
      <line
        x1={95}
        y1={y - 3}
        x2={x(distance)}
        y2={y - 3}
        stroke={physicalPalette[index % 4]}
        strokeWidth={4}
      />
      {typeof stop === "number" && (
        <>
          <line
            x1={x(stop)}
            y1={y - 22}
            x2={x(stop)}
            y2={y + 15}
            stroke="#514381"
            strokeDasharray="4 3"
          />
          <text x={x(stop)} y={y + 28} textAnchor="middle">
            stop {stop.toFixed(2)} m
          </text>
        </>
      )}
      <g transform={`translate(${x(distance)}, ${y - 13})`}>
        <rect
          x={-13}
          y={-12}
          width={26}
          height={13}
          rx={4}
          fill={physicalPalette[index % 4]}
        />
        <circle cx={-8} cy={3} r={5} fill="#30362e" />
        <circle cx={8} cy={3} r={5} fill="#30362e" />
      </g>
      <text x={20} y={y + 60}>
        {index + 1}. μ = {String(instance.parameters.resistance)} · travelled{" "}
        {distance.toFixed(2)} m
      </text>
    </g>
  );
}
export function CircuitVisual({ instance }: { instance: ModelInstance }) {
  const state = instance.state as unknown as CircuitState;
  const wires = circuitWires(state);
  const parallel = state.topology === "parallel";
  const position = (terminal: Terminal) => {
    if (terminal.component === "source")
      return { x: 55, y: terminal.port === "positive" ? 55 : 285 };
    const index = Number(terminal.component.split("/")[1]);
    return {
      x:
        (parallel ? 300 : 130 + (index * 350) / (state.bulbs + 1)) +
        (terminal.port === "a" ? -18 : 18),
      y: parallel ? 55 + (index * 230) / (state.bulbs + 1) : 55,
    };
  };
  return (
    <svg
      viewBox="0 0 560 340"
      role="img"
      aria-label={`${state.bulbs} bulbs in ${state.topology}; each uses ${instance.outputs.bulbPower} watts`}
    >
      {wires.map((wire, index) => {
        const a = position(wire.from),
          b = position(wire.to);
        const path = parallel
          ? wire.from.component === "source"
            ? `M ${a.x} ${a.y} H 100 V ${b.y} H ${b.x}`
            : `M ${a.x} ${a.y} H 505 V 285 H ${b.x}`
          : wire.to.component === "source"
            ? `M ${a.x} ${a.y} H 520 V ${b.y} H ${b.x}`
            : `M ${a.x} ${a.y} H ${b.x}`;
        return (
          <path
            key={`${wire.from.component}:${wire.to.component}:${index}`}
            d={path}
            fill="none"
            stroke="#514c42"
            strokeWidth={2}
          />
        );
      })}
      <path
        d="M55 55 V155 M55 185 V285 M35 155 H75 M42 185 H68"
        stroke="#30362e"
        strokeWidth={3}
      />
      <text x={12} y={145}>
        +
      </text>
      <text x={12} y={195}>
        −
      </text>
      <text x={15} y={320}>
        {state.voltage} V battery
      </text>
      {Array.from({ length: state.bulbs }, (_, index) => {
        const a = position({ component: `bulb/${index + 1}`, port: "a" });
        const power = Number(instance.outputs.bulbPower);
        return (
          <g key={`bulb/${index + 1}`}>
            <circle
              cx={a.x + 18}
              cy={a.y}
              r={18}
              fill={power === 0 ? "#e3dccb" : "#e9c968"}
              fillOpacity={power === 0 ? 1 : 0.2 + 0.8 * Math.min(1, power / 3)}
              stroke="#514c42"
              strokeWidth={2}
            />
            <path
              d={`M${a.x + 8} ${a.y - 9} l20 18 m0 -18 l-20 18`}
              stroke="#514c42"
              strokeWidth={2}
            />
            <text x={a.x + 18} y={a.y + 35} textAnchor="middle">
              {index + 1}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
