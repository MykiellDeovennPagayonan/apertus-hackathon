import type { CSSProperties } from "react";
import type { ModelInstance } from "../../../runtime/contribution";

export const dynamicNumber = (value: unknown, digits = 2) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";

type Point = { x: number; y: number };
function path(points: Point[], width: number, height: number, maxY: number) {
  const maxX = Math.max(1, ...points.map((point) => point.x));
  return points
    .map((point, index) => {
      const x = 44 + (point.x / maxX) * (width - 66);
      const y = height - 34 - (point.y / Math.max(1, maxY)) * (height - 60);
      return `${index ? "L" : "M"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
}

export function GrowthVisual({ instance }: { instance: ModelInstance }) {
  const compound = instance.outputs.compoundPoints as Point[];
  const simple = instance.outputs.simplePoints as Point[];
  const width = 600;
  const height = 310;
  const maxY = Math.max(
    ...compound.map((point) => point.y),
    ...simple.map((point) => point.y),
  );
  return (
    <figure className="dynamic-chart">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Compound and simple balance by year"
      >
        <title>Compound and simple balance by year</title>
        <line x1="44" y1="18" x2="44" y2={height - 34} />
        <line x1="44" y1={height - 34} x2={width - 16} y2={height - 34} />
        <path
          className="dynamic-line dynamic-line--compound"
          d={path(compound, width, height, maxY)}
        />
        <path
          className="dynamic-line dynamic-line--simple"
          d={path(simple, width, height, maxY)}
        />
        <text x="12" y="26">
          ${dynamicNumber(maxY, 0)}
        </text>
        <text x="44" y={height - 10}>
          0
        </text>
        <text x={width - 46} y={height - 10}>
          {String(instance.outputs.years)} yr
        </text>
      </svg>
      <figcaption>
        <span className="dynamic-key dynamic-key--compound" /> Compound{" "}
        <span className="dynamic-key dynamic-key--simple" /> Simple
      </figcaption>
    </figure>
  );
}

export function TrafficVisual({ instance }: { instance: ModelInstance }) {
  const vehicles = instance.outputs.vehicles as {
    id: number;
    position: number;
    speed: number;
  }[];
  const roadLength = Number(instance.parameters.roadLength);
  const desiredSpeed = Number(instance.parameters.desiredSpeed);
  return (
    <figure className="traffic-visual">
      <svg
        viewBox="0 0 620 330"
        role="img"
        aria-label={`${vehicles.length} vehicles on a closed road`}
      >
        <title>Vehicle positions and speeds on the closed road</title>
        <ellipse className="traffic-road" cx="310" cy="165" rx="244" ry="116" />
        <ellipse
          className="traffic-road-inner"
          cx="310"
          cy="165"
          rx="190"
          ry="70"
        />
        {vehicles.map((vehicle) => {
          const angle =
            (vehicle.position / roadLength) * Math.PI * 2 - Math.PI / 2;
          const x = 310 + 217 * Math.cos(angle);
          const y = 165 + 93 * Math.sin(angle);
          const slow = vehicle.speed < desiredSpeed * 0.5;
          return (
            <circle
              key={vehicle.id}
              className={slow ? "traffic-car is-slow" : "traffic-car"}
              cx={x}
              cy={y}
              r={vehicle.id === 0 ? 7 : 5}
            >
              <title>{`Vehicle ${vehicle.id + 1}: ${dynamicNumber(vehicle.speed)} m/s`}</title>
            </circle>
          );
        })}
        <text x="310" y="156" textAnchor="middle">
          Closed road
        </text>
        <text x="310" y="180" textAnchor="middle">
          slow cars turn amber
        </text>
      </svg>
      <figcaption>
        Every dot is computed from the car-following model. Vehicle 1 is the
        brief brake target.
      </figcaption>
    </figure>
  );
}

export function QueueVisual({ instance }: { instance: ModelInstance }) {
  const customers = instance.outputs.customers as {
    id: number;
    arrival: number;
    start: number;
    finish: number;
    wait: number;
    cashier: number;
  }[];
  const cashiers = Number(instance.outputs.cashiers);
  const longest = [...customers].sort((a, b) => b.wait - a.wait).slice(0, 12);
  return (
    <figure className="queue-visual">
      <div className="queue-stations">
        {[0, 1].map((cashier) => (
          <div
            key={cashier}
            className={
              cashier < cashiers ? "queue-cashier is-open" : "queue-cashier"
            }
          >
            <span aria-hidden="true">▣</span>
            <strong>Cashier {cashier + 1}</strong>
            <small>{cashier < cashiers ? "Open" : "Closed"}</small>
          </div>
        ))}
      </div>
      <div className="queue-customers">
        {longest.map((customer) => (
          <div
            key={customer.id}
            title={`Customer ${customer.id + 1}: waited ${dynamicNumber(customer.wait)} minutes`}
            style={
              { "--wait": Math.min(100, customer.wait * 8) } as CSSProperties
            }
          >
            <span aria-hidden="true">●</span>
            <small>{dynamicNumber(customer.wait, 1)}m</small>
          </div>
        ))}
      </div>
      <figcaption>
        The same seeded arrivals and service durations are used when cashier 2
        opens. Dots show the twelve longest waits.
      </figcaption>
    </figure>
  );
}
