import type { CSSProperties } from "react";
import type { ModelInstance } from "../../../runtime/contribution";
import { DatasetDisplay } from "../../views/DatasetDisplay";

export const dynamicNumber = (value: unknown, digits = 2) =>
  typeof value === "number" && Number.isFinite(value)
    ? value.toLocaleString(undefined, { maximumFractionDigits: digits })
    : "—";

export function GrowthVisual({ instance }: { instance: ModelInstance }) {
  const compound = instance.outputs.compoundPoints as {
    x: number;
    y: number;
  }[];
  const simple = instance.outputs.simplePoints as { x: number; y: number }[];
  const value =
    Array.isArray(compound) && Array.isArray(simple)
      ? compound.map((point) => ({
          x: point.x,
          compound: point.y,
          simple: simple.find((prior) => prior.x === point.x)?.y,
        }))
      : undefined;
  return (
    <DatasetDisplay
      kind="Chart"
      label="Compound and simple growth"
      value={value}
      presentation={{
        xKey: "x",
        xLabel: "Annual periods",
        xUnit: "years",
        yLabel: "Balance",
        yUnit: "currency units",
        columns: [
          { key: "x", label: "Annual periods", unit: "years", type: "number" },
          {
            key: "compound",
            label: "Compound growth",
            unit: "currency units",
            type: "number",
          },
          {
            key: "simple",
            label: "Simple growth",
            unit: "currency units",
            type: "number",
          },
        ],
      }}
    />
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
