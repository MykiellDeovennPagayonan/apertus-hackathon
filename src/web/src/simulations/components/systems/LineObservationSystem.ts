import type {
  ObservationContext,
  ObservationValue,
} from "../contracts/Observation";
import type { LineObject } from "../traits/SceneObjects";
import { lineParameters, lineYAt } from "./LineGeometrySystem";
import { lineIntersection } from "./LineIntersectionSystem";
export function observeLine(
  o: LineObject,
  output: string,
  context: ObservationContext,
): ObservationValue {
  if (output === "intersection") {
    const other = context.objects.find((v) => v.id === context.other);
    if (other?.kind !== "line") return "Choose another line";
    const p = lineIntersection(o, other);
    return typeof p === "string"
      ? p === "parallel"
        ? "Parallel · no intersection"
        : "Coincident · infinitely many intersections"
      : p;
  }
  const { slope, intercept, vertical } = lineParameters(o);
  if (output === "equation")
    return { kind: "line-equation", slope, intercept, vertical, x: o.a.x };
  if (vertical) return "Undefined for a vertical line";
  if (output === "yAtZero") return lineYAt(o, 0);
  if (output === "yAtOne") return lineYAt(o, 1);
  if (output === "rise" || output === "slope") return slope;
  if (output === "run") return 1;
  return intercept;
}
