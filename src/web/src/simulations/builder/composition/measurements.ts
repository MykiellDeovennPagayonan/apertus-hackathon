import { compare } from "../../components/systems/fractionMath";
import { IdealGasSystem } from "../../components/systems/IdealGasSystem";
import { fractionValue } from "./definitions";
import {
  type CompositionScene,
  entrance,
  lineIntersection,
  type Measurement,
  propertyValue,
} from "./model";
import type { PersonSnapshot } from "./town";
export function measurementValue(
  m: Measurement,
  scene: CompositionScene,
  people: PersonSnapshot[],
  time: number,
): string | number {
  const o = scene.objects.find((o) => o.id === m.target),
    fmt = (v: number) => Number(v.toFixed(m.precision));
  const point = (x: number, y: number) => `(${fmt(x)}, ${fmt(y)})`;
  if (m.target === "clock")
    return m.output === "time"
      ? time
      : people.filter((p) =>
          m.output === "population"
            ? p.status !== "not spawned"
            : m.output === "traveling"
              ? p.status === "walking"
              : p.status === "no route",
        ).length;
  if (!o) return "Unavailable";
  if (o.kind === "gas") return IdealGasSystem(o.inputs).pressureKPa;
  if (o.kind === "fraction-bar") {
    const value = fractionValue(o);
    if (m.output === "fraction") return `${value.n}/${value.d}`;
    if (m.output === "decimal") return value.n / value.d;
    const other = scene.objects.find((v) => v.id === m.other);
    return other?.kind === "fraction-bar"
      ? `${value.n}/${value.d} ${compare(value, fractionValue(other))} ${fractionValue(other).n}/${fractionValue(other).d}`
      : "Choose another bar";
  }
  if (o.kind === "line") {
    const dx = o.b.x - o.a.x;
    if (m.output === "intersection") {
      const other = scene.objects.find((o) => o.id === m.other);
      if (other?.kind !== "line") return "Choose another line";
      const p = lineIntersection(o, other);
      return typeof p === "string"
        ? p === "parallel"
          ? "Parallel · no intersection"
          : "Coincident · infinitely many intersections"
        : point(p.x, p.y);
    }
    if (dx === 0)
      return m.output === "equation"
        ? `x = ${fmt(o.a.x)}`
        : "Undefined for a vertical line";
    const slope = Number(propertyValue(o, "slope")),
      b = Number(propertyValue(o, "intercept"));
    if (m.output === "yAtZero") return b;
    if (m.output === "yAtOne") return slope + b;
    if (m.output === "rise") return slope;
    if (m.output === "run") return 1;
    return m.output === "equation"
      ? `y = ${fmt(slope)}x ${b < 0 ? "−" : "+"} ${fmt(Math.abs(b))}`
      : m.output === "slope"
        ? slope
        : b;
  }
  if (o.kind === "square")
    return m.output === "area"
      ? o.side ** 2
      : m.output === "perimeter"
        ? 4 * o.side
        : o.side;
  if (o.kind === "ground") return o.width * o.depth;
  if (o.kind === "building") {
    const p = entrance(o);
    return point(p.x, p.y);
  }
  if (o.kind === "road") return o.closed ? "Closed" : "Open";
  const p = people.find((p) => p.id === o.id);
  return !p
    ? "Unavailable"
    : m.output === "position"
      ? p.status === "not spawned"
        ? "Not spawned"
        : point(p.position.x, p.position.y)
      : `${p.status}${p.destination ? ` → ${p.destination}` : ""}`;
}
