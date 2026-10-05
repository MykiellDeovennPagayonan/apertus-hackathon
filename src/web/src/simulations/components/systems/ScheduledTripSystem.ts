import {
  type CompositionScene,
  entrance,
  type PersonObject,
  type Point,
} from "../../runtime/composition/index";
import { requireRecord } from "../../runtime/records";
import { alongRoute } from "./RouteFollowingSystem";
import {
  authoredRoutePolicy,
  clearRouteSegment,
  searchRoute,
} from "./RouteSearchSystem";
import { latestDeparture } from "./ScheduleSystem";
export type PersonSnapshot = {
  id: string;
  position: Point;
  status: "not spawned" | "waiting" | "walking" | "no route";
  destination: string;
  route: Point[];
};
type Leg = {
  at: number;
  from: Point;
  path: Point[];
  length: number;
  destination: string;
  blocked: boolean;
};
type CompiledPerson = { object: PersonObject; legs: Leg[] };
const radius = 0.3;
const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
function geometry(scene: CompositionScene) {
  const ground = scene.objects.find((o) => o.kind === "ground");
  const bounds =
    ground?.kind === "ground"
      ? { width: ground.width, depth: ground.depth }
      : { width: 48, depth: 40 };
  const obstacles = scene.objects.flatMap((o) =>
    (o.kind === "building" && o.obstacle) || (o.kind === "road" && o.closed)
      ? [{ x: o.x, y: o.z, w: o.width / 2 + radius, d: o.depth / 2 + radius }]
      : [],
  );
  const walkable = (p: Point) =>
    Math.abs(p.x) <= bounds.width / 2 - radius &&
    Math.abs(p.y) <= bounds.depth / 2 - radius &&
    !obstacles.some(
      (o) => Math.abs(p.x - o.x) < o.w && Math.abs(p.y - o.y) < o.d,
    );
  const clear = (a: Point, b: Point) => clearRouteSegment(a, b, walkable, 0.2);
  return { bounds, walkable, clear };
}
/** Bounded grid search uses authored bounds and obstacles, never the premade town layout. */
export function planRoute(
  scene: CompositionScene,
  from: Point,
  to: Point,
): Point[] {
  return searchRoute(geometry(scene), from, to, authoredRoutePolicy);
}
/** Routes compile once per geometry/schedule change. Scrubbing evaluates the same timeline as playback. */
export function compileTown(
  scene: CompositionScene,
): (time: number) => PersonSnapshot[] {
  const people: CompiledPerson[] = scene.objects
    .filter((o): o is PersonObject => o.kind === "person")
    .map((o) => {
      const legs: Leg[] = [];
      let position = { x: o.x, y: o.z };
      for (const step of o.schedule) {
        const previous = legs[legs.length - 1];
        if (previous)
          position = alongRoute(
            previous.from,
            previous.path,
            (step.at - previous.at) *
              requireRecord(scene.clock).secondsPerHour *
              o.speed,
          );
        const target = scene.objects.find((b) => b.id === step.target);
        const to =
          target?.kind === "building"
            ? entrance(target)
            : { x: step.x, y: step.z };
        const path = planRoute(scene, position, to);
        let anchor = position,
          length = 0;
        for (const point of path) {
          length += distance(anchor, point);
          anchor = point;
        }
        legs.push({
          at: step.at,
          from: position,
          path,
          length,
          destination: target?.label ?? `(${step.x}, ${step.z})`,
          blocked: path.length === 0,
        });
      }
      return { object: o, legs };
    });
  return (time) =>
    people.map(({ object: o, legs }) => {
      const active = latestDeparture(legs, time);
      if (time < o.spawnAt)
        return {
          id: o.id,
          position: { x: o.x, y: o.z },
          status: "not spawned",
          destination: "",
          route: [],
        };
      if (!active)
        return {
          id: o.id,
          position: { x: o.x, y: o.z },
          status: "waiting",
          destination: "",
          route: [],
        };
      const travel =
        Math.max(0, time - active.at) *
        requireRecord(scene.clock).secondsPerHour *
        o.speed;
      return {
        id: o.id,
        position: alongRoute(active.from, active.path, travel),
        status: active.blocked
          ? "no route"
          : travel < active.length
            ? "walking"
            : "waiting",
        destination: active.destination,
        route: active.path,
      };
    });
}
