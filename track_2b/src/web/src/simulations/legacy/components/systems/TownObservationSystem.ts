import type {
  ObservationContext,
  ObservationValue,
} from "../../../registry/contracts/objects/Observation";
import type { PersonObject } from "../traits/SceneObjects";
export function observePerson(
  o: PersonObject,
  output: string,
  context: ObservationContext,
): ObservationValue {
  const p = context.people.find((p) => p.id === o.id);
  if (!p) return "Unavailable";
  if (output === "position")
    return p.status === "not spawned" ? "Not spawned" : p.position;
  return `${p.status}${p.destination ? ` → ${p.destination}` : ""}`;
}
