import type { ModelInstance } from "../../../../registry/contracts/domainContribution";
import "./geometry.css";
import { gridSlots } from "./layout";

const n = (value: number) => Number(value.toFixed(1)).toString();
const vx = 390,
  vy = 200;
const toRad = (deg: number) => (deg * Math.PI) / 180;
/** Regular polygon with a vertex at the corner; its interior wedge starts at `start` degrees. */
function tile(sides: number, side: number, start: number) {
  const points: [number, number][] = [[vx, vy]];
  let x = vx,
    y = vy,
    heading = start;
  for (let i = 1; i < sides; i++) {
    x += side * Math.cos(toRad(heading));
    y -= side * Math.sin(toRad(heading));
    points.push([x, y]);
    heading += 360 / sides;
  }
  return points
    .map(([px, py]) => `${px.toFixed(2)},${py.toFixed(2)}`)
    .join(" ");
}
function wedge(from: number, to: number, r: number) {
  const a = [vx + r * Math.cos(toRad(from)), vy - r * Math.sin(toRad(from))];
  const b = [vx + r * Math.cos(toRad(to)), vy - r * Math.sin(toRad(to))];
  return `M ${vx} ${vy} L ${a[0]} ${a[1]} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 0 ${b[0]} ${b[1]} Z`;
}

export function RegularTilingScene({ instance }: { instance: ModelInstance }) {
  const sides = Number(instance.outputs.tileSides);
  const angle = Number(instance.outputs.interiorAngle);
  const fit = Number(instance.outputs.fitAtCorner);
  const gap = Number(instance.outputs.gap);
  const overlap = Number(instance.outputs.overlap);
  const exact = Boolean(instance.outputs.fitsExactly);
  const name = String(instance.outputs.shapeName);
  const side = 170 * Math.sin(Math.PI / sides);
  const mid = fit * angle + gap / 2;
  return (
    <section
      className="mg-scene"
      aria-label={instance.label}
      data-responsive-height="content"
    >
      <svg
        viewBox="0 0 780 400"
        role="img"
        aria-label={`${fit} regular ${name}s around a corner, each ${n(angle)} degrees. ${exact ? "They fill 360 degrees with no gap." : `A ${n(gap)} degree gap is left.`}`}
      >
        {gridSlots(fit, fit).map(([i]) => (
          <polygon
            key={`tile-${i * angle}`}
            points={tile(sides, side, i * angle)}
            className={i % 2 ? "mg-fill-teal" : "mg-fill-green"}
            data-tile
          />
        ))}
        {!exact && (
          <>
            <path
              d={wedge(fit * angle, 360, 70)}
              className="mg-fill-problem"
              data-gap={gap}
            />
            <polygon
              points={tile(sides, side, fit * angle)}
              className="mg-dashed"
              data-extra
            />
            <text
              x={vx + 100 * Math.cos(toRad(mid))}
              y={vy - 100 * Math.sin(toRad(mid))}
              textAnchor="middle"
              className="mg-strong mg-problem"
            >
              {n(gap)}° gap
            </text>
          </>
        )}
        <circle cx={vx} cy={vy} r={5} className="mg-fill-accent" />
        <text x={20} y={30} className="mg-strong">
          Regular {name}: each corner {n(angle)}°
        </text>
        <text x={20} y={56}>
          {fit} × {n(angle)}° = {n(fit * angle)}°{exact ? " = 360°" : ""}
        </text>
      </svg>
      <p className="mg-caption">
        {exact
          ? `${fit} ${name}s fill the full 360° around the corner with no gap, so regular ${name}s can tile a floor.`
          : `${fit} ${name}s leave a ${n(gap)}° gap, and squeezing in one more (dashed) would overlap by ${n(overlap)}°. Regular ${name}s cannot tile a floor on their own.`}
        {sides === 5 &&
          " Some irregular pentagons can tile; this shows regular ones only."}
      </p>
    </section>
  );
}
