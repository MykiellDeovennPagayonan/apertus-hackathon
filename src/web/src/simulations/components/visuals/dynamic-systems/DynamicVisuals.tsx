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
        <ellipse className="traffic-lane" cx="310" cy="165" rx="217" ry="93" />
        {vehicles.map((vehicle) => {
          const angle =
            (vehicle.position / roadLength) * Math.PI * 2 - Math.PI / 2;
          const x = 310 + 217 * Math.cos(angle);
          const y = 165 + 93 * Math.sin(angle);
          const slow = vehicle.speed < desiredSpeed * 0.5;
          const heading =
            (Math.atan2(93 * Math.cos(angle), -217 * Math.sin(angle)) * 180) /
            Math.PI;
          return (
            <g
              key={vehicle.id}
              className={`traffic-vehicle${slow ? " is-slow" : ""}${vehicle.id === 0 ? " is-lead" : ""}`}
              transform={`translate(${x} ${y}) rotate(${heading})`}
            >
              <title>{`Car ${vehicle.id + 1}: ${dynamicNumber(vehicle.speed)} m/s${slow ? ", slowing" : ""}${vehicle.id === 0 ? "; brake target" : ""}`}</title>
              {vehicle.id === 0 && (
                <rect
                  className="traffic-lead-ring"
                  x="-17"
                  y="-12"
                  width="34"
                  height="24"
                  rx="9"
                />
              )}
              <rect
                className="traffic-tire"
                x="-7"
                y="-9"
                width="6"
                height="18"
                rx="2"
              />
              <rect
                className="traffic-tire"
                x="5"
                y="-9"
                width="6"
                height="18"
                rx="2"
              />
              <rect
                className="traffic-car"
                x="-14"
                y="-7"
                width="28"
                height="14"
                rx="5"
              />
              <path
                className="traffic-window"
                d="M2-5h5l2 10H2zM-8-5h3V5h-3z"
              />
              <path className="traffic-headlights" d="M12-5v3M12 2v3" />
              <path className="traffic-taillights" d="M-12-5v3M-12 2v3" />
              {vehicle.id === 0 && (
                <text
                  className="traffic-car-number"
                  transform={`rotate(${-heading})`}
                  textAnchor="middle"
                  y="4"
                >
                  1
                </text>
              )}
            </g>
          );
        })}
        <text x="310" y="156" textAnchor="middle">
          {
            vehicles.filter((vehicle) => vehicle.speed < desiredSpeed * 0.5)
              .length
          }{" "}
          of {vehicles.length} cars slowing
        </text>
        <text x="310" y="180" textAnchor="middle">
          Traffic moves clockwise →
        </text>
      </svg>
      <figcaption>
        <span className="traffic-key">
          <i aria-hidden="true" />
          Moving
        </span>
        <span className="traffic-key is-slow">
          <i aria-hidden="true" />
          Slowing · brake lights on
        </span>
        <span className="traffic-key is-lead">
          <i aria-hidden="true">1</i>Brake target
        </span>
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
