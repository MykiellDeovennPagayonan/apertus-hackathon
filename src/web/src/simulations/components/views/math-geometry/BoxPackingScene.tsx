import type { ModelInstance } from "../../../runtime/contribution";
import "./geometry.css";
import { gridSlots } from "./layout";

type Zone = {
  x: number;
  y: number;
  z: number;
  box: [number, number, number];
  nx: number;
  ny: number;
  nz: number;
};
const fills = ["mg-fill-teal", "mg-fill-orange"];
const maxDrawn = 400;

function View({
  zones,
  across,
  up,
  size,
  origin,
  scale,
  label,
}: {
  zones: Zone[];
  across: 0 | 1 | 2;
  up: 0 | 1 | 2;
  size: [number, number];
  origin: [number, number];
  scale: number;
  label: string;
}) {
  const [ox, oy] = origin;
  const position = (z: Zone, axis: number) => [z.x, z.y, z.z][axis];
  const counts = (z: Zone, axis: number) => [z.nx, z.ny, z.nz][axis];
  return (
    <g>
      <text x={ox} y={oy - 8} className="mg-small">
        {label}
      </text>
      <rect
        x={ox}
        y={oy}
        width={size[0] * scale}
        height={size[1] * scale}
        className="mg-line"
      />
      {zones.map((zone, zi) => {
        const zoneKey = `${zone.x}-${zone.y}-${zone.z}`;
        const a = counts(zone, across),
          b = counts(zone, up);
        const w = zone.box[across] * scale,
          h = zone.box[up] * scale;
        const x0 = ox + position(zone, across) * scale;
        // The front view stacks from the floor; the top view runs from the back wall.
        const rowY = (row: number) =>
          up === 2
            ? oy + (size[1] - position(zone, up)) * scale - (row + 1) * h
            : oy + position(zone, up) * scale + row * h;
        return a * b > maxDrawn ? (
          <rect
            key={zoneKey}
            x={x0}
            y={Math.min(rowY(0), rowY(b - 1))}
            width={a * w}
            height={b * h}
            className={fills[zi % 2]}
          />
        ) : (
          gridSlots(a * b, a).map(([col, row]) => (
            <rect
              key={`${zoneKey}-${col}-${row}`}
              x={x0 + col * w}
              y={rowY(row)}
              width={w}
              height={h}
              className={fills[zi % 2]}
            />
          ))
        );
      })}
    </g>
  );
}

export function BoxPackingScene({ instance }: { instance: ModelInstance }) {
  const o = instance.outputs;
  const zones = (o.zones as Zone[] | undefined) ?? [];
  const count = Number(o.count),
    limit = Number(o.volumeLimit),
    proven = Boolean(o.provenBest),
    mixed = Boolean(o.mixed),
    bestUniform = Number(o.bestUniform),
    mixedCount = Number(o.mixedCount);
  const box = (o.boxDimensions as number[] | undefined) ?? [1, 1, 1];
  const [L, W, H] = (o.binDimensions as number[] | undefined) ?? [1, 1, 1];
  const scale = Math.min(420 / L, 190 / W, 120 / H);
  const n = (v: number) => Number(v.toFixed(1)).toString();
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 400"
        role="img"
        aria-label={`${count} boxes fit in the ${n(L)} by ${n(W)} by ${n(H)} centimetre bin; the volume limit is ${limit}.`}
      >
        <View
          zones={zones}
          across={0}
          up={1}
          size={[L, W]}
          origin={[30, 40]}
          scale={scale}
          label={`From above (${n(L)} × ${n(W)} cm)`}
        />
        <View
          zones={zones}
          across={0}
          up={2}
          size={[L, H]}
          origin={[30, 70 + W * scale]}
          scale={scale}
          label={`From the front (${n(L)} × ${n(H)} cm)`}
        />
        <text x={500} y={70} className="mg-large">
          {count} {count === 1 ? "box fits" : "boxes fit"}
        </text>
        <text x={500} y={104}>
          Volume limit: {limit}
        </text>
        <text x={500} y={130} className="mg-small">
          {mixed
            ? "mixing two directions"
            : `every box ${n(box[0])} × ${n(box[1])} × ${n(box[2])} cm`}
        </text>
        <text
          x={500}
          y={160}
          className={`mg-small${proven ? " mg-strong" : ""}`}
        >
          {proven
            ? "Equals the volume limit: no layout can beat it."
            : "Not proven best."}
        </text>
      </svg>
      <p className="mg-caption">
        {mixed
          ? mixedCount > bestUniform
            ? `Turning some boxes fits ${mixedCount}, more than the ${bestUniform} you get with every box the same way.`
            : `Mixing directions finds no more than ${bestUniform} here.`
          : `Every box turned the same way: ${count}.`}{" "}
        Bin volume ÷ box volume = {limit} is only an upper limit, because boxes
        cannot be cut to fill the gaps.
      </p>
    </section>
  );
}
