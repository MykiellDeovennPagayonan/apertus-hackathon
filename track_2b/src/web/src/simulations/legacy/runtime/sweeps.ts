import { sampleRange } from "../components/systems/BallisticMotionSystem";
import type { Dataset } from "../components/traits/MeasurementProbe";
/** Isolated evaluations use trusted pure ballistics and never advance live instances. */
export function projectileSweep(speed: number, gravity: number): Dataset {
  if (
    !Number.isFinite(speed) ||
    speed < 5 ||
    speed > 40 ||
    !Number.isFinite(gravity) ||
    gravity <= 0 ||
    gravity > 100
  )
    throw new Error("Invalid ballistic sweep inputs");
  return {
    columns: [
      { key: "angle", label: "Launch angle", unit: "degrees", type: "number" },
      { key: "range", label: "Range", unit: "m", type: "number" },
    ],
    rows: sampleRange(speed, gravity).map((p) => ({ angle: p.x, range: p.y })),
    assumption:
      "Isolated analytic ground-to-ground launches at a constant speed and gravity.",
  };
}
