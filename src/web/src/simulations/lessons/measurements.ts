import type { PersonSnapshot } from "../legacy/components/systems/ScheduledTripSystem";
import { observeMeasurement } from "../creation-and-editing/runtime-engine/composition/observations";
import type {
  CompositionScene,
  Measurement,
} from "../creation-and-editing/runtime-engine/composition/types";
export function measurementValue(
  m: Measurement,
  scene: CompositionScene,
  people: PersonSnapshot[],
  time: number,
): string | number {
  const value = observeMeasurement(m, scene, people, time),
    fmt = (v: number) => Number(v.toFixed(m.precision));
  if (typeof value === "string" || typeof value === "number") return value;
  if ("y" in value) return `(${fmt(value.x)}, ${fmt(value.y)})`;
  if (value.kind === "fraction-comparison")
    return `${value.left.n}/${value.left.d} ${value.relation} ${value.right.n}/${value.right.d}`;
  return value.vertical
    ? `x = ${fmt(value.x)}`
    : `y = ${fmt(value.slope)}x ${value.intercept < 0 ? "−" : "+"} ${fmt(Math.abs(value.intercept))}`;
}
