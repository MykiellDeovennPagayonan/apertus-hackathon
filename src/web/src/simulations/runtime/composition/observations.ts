import type { ObservationValue } from "../../components/contracts/Observation";
import { componentDefinition } from "../../components/registry";
import type { PersonSnapshot } from "../../components/systems/ScheduledTripSystem";
import type { CompositionScene, Measurement } from "./types";
export function observeMeasurement(
  m: Measurement,
  scene: CompositionScene,
  people: PersonSnapshot[],
  time: number,
): ObservationValue {
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
  const o = scene.objects.find((o) => o.id === m.target);
  if (!o) return "Unavailable";
  return componentDefinition(o.kind).observe(o, m.output, {
    objects: scene.objects,
    people,
    time,
    other: m.other,
  });
}
