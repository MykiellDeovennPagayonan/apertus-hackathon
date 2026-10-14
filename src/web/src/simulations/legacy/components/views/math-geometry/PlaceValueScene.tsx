import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import "./geometry.css";
import { gridSlots } from "./layout";

const columns = [
  { name: "Hundreds", worth: "100", size: 30 },
  { name: "Tens", worth: "10", size: 24 },
  { name: "Ones", worth: "1", size: 19 },
  { name: "Tenths", worth: "0.1", size: 14 },
  { name: "Hundredths", worth: "0.01", size: 10 },
  { name: "Thousandths", worth: "0.001", size: 7 },
];
const fills = [
  "mg-fill-teal",
  "mg-fill-teal",
  "mg-fill-green",
  "mg-fill-orange",
  "mg-fill-orange",
  "mg-fill-orange",
];
const left = 30,
  width = 120,
  top = 78,
  area = 200;

export function PlaceValueScene({ instance }: { instance: ModelInstance }) {
  const counts = (instance.outputs.counts as number[] | undefined) ?? [];
  const text = String(instance.outputs.text ?? "");
  const before = String(instance.outputs.before ?? "");
  const change = String(instance.outputs.change ?? "start");
  const marker = left + 3 * width;
  const caption =
    change === "start"
      ? `The board shows ${text}. Each column is worth ten times the column to its right.`
      : change === "same value"
        ? `${before} → ${text}: blocks were traded ten for one, so the number stays the same.`
        : `${before} → ${text}: every block moved one column ${change === "ten times larger" ? "left, so each is worth ten times more" : "right, so each is worth ten times less"}. The decimal point stayed still.`;
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 360"
        role="img"
        aria-label={`Place-value board showing ${text}. Blocks per column from hundreds to thousandths: ${counts.join(", ")}.`}
      >
        {columns.map((column, i) => {
          const x = left + i * width;
          const count = counts[i] ?? 0;
          const pitch = column.size + 4;
          const perRow = Math.max(1, Math.floor((width - 12) / pitch));
          const rows = Math.max(1, Math.floor(area / pitch));
          const shown = Math.min(count, perRow * rows);
          return (
            <g key={column.name}>
              <rect
                x={x}
                y={20}
                width={width}
                height={300}
                className="mg-thin"
              />
              <text
                x={x + width / 2}
                y={42}
                textAnchor="middle"
                className="mg-strong"
              >
                {column.name}
              </text>
              <text
                x={x + width / 2}
                y={62}
                textAnchor="middle"
                className="mg-small"
              >
                each {column.worth}
              </text>
              {gridSlots(shown, perRow).map(([col, row]) => (
                <rect
                  key={`${col}-${row}`}
                  x={x + 8 + col * pitch}
                  y={top + row * pitch}
                  width={column.size}
                  height={column.size}
                  rx={2}
                  className={fills[i]}
                />
              ))}
              {shown < count && (
                <text
                  x={x + width / 2}
                  y={top + area + 4}
                  textAnchor="middle"
                  className="mg-small"
                >
                  +{count - shown} more
                </text>
              )}
              <text
                x={x + width / 2}
                y={308}
                textAnchor="middle"
                className={`mg-large${count > 9 ? " mg-problem" : ""}`}
                data-column={column.name}
              >
                {count}
              </text>
            </g>
          );
        })}
        <line x1={marker} y1={14} x2={marker} y2={326} className="mg-dashed" />
        <circle cx={marker} cy={300} r={6} className="mg-fill-accent" />
        <text x={marker} y={346} textAnchor="middle" className="mg-small">
          decimal point stays here
        </text>
      </svg>
      <p className="mg-caption">
        <strong>{text}</strong> — {caption}
        {counts.some((c) => c > 9) &&
          " A red count means that column holds ten or more blocks after a trade."}
      </p>
    </section>
  );
}
