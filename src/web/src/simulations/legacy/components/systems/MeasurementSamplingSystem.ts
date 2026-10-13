import { validateValue } from "../../../registry/contracts/parameterSchema";
import type { Dataset, MeasurementProbe } from "../traits/MeasurementProbe";
import { measurementProbeSchema } from "../traits/MeasurementProbe";
import { flightTime, posAt } from "./BallisticMotionSystem";
/** Pure ballistic model-time sampling. Paused time adds no samples; relaunch/reset rebuilds the dataset. */
export function MeasurementSamplingSystem(
  probe: MeasurementProbe,
  launch: { angle: number; velocity: number },
  gravity: number,
  elapsed: number,
): Dataset {
  validateValue(measurementProbeSchema, probe, "probe");
  if (!Number.isFinite(elapsed) || elapsed < 0)
    throw new Error("Invalid model elapsed time");
  const end = Math.min(
    elapsed,
    flightTime(launch.velocity, launch.angle, gravity),
  );
  const count = Math.min(
    probe.maxSamples,
    Math.floor(end / probe.interval) + 1,
  );
  const rows = Array.from({ length: count }, (_, i) => {
    const time = i * probe.interval,
      p = posAt(launch.velocity, launch.angle, gravity, time),
      radians = (launch.angle * Math.PI) / 180;
    const value =
      probe.observable === "speed"
        ? Math.hypot(
            launch.velocity * Math.cos(radians),
            launch.velocity * Math.sin(radians) - gravity * time,
          )
        : p[probe.observable];
    return { time, value };
  });
  return {
    columns: [
      { key: "time", label: "Model time", unit: "s", type: "number" },
      {
        key: "value",
        label: `${probe.target} ${probe.observable}`,
        unit: probe.observable === "speed" ? "m/s" : "m",
        type: "number",
      },
    ],
    rows,
    assumption:
      "Analytic ground-to-ground ballistic samples; bounded history starts at launch.",
  };
}
