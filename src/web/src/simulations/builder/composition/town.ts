import { requireRecord } from "../records";
import {
  type CompositionScene,
  entrance,
  type PersonObject,
  type Point,
} from "./model";
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
  const clear = (a: Point, b: Point) => {
    const count = Math.max(1, Math.ceil(distance(a, b) / 0.2));
    for (let n = 0; n <= count; n++)
      if (
        !walkable({
          x: a.x + ((b.x - a.x) * n) / count,
          y: a.y + ((b.y - a.y) * n) / count,
        })
      )
        return false;
    return true;
  };
  return { bounds, walkable, clear };
}
/** Bounded grid search uses authored bounds and obstacles, never the premade town layout. */
export function planRoute(
  scene: CompositionScene,
  from: Point,
  to: Point,
): Point[] {
  const { bounds, walkable, clear } = geometry(scene);
  if (!walkable(from) || !walkable(to)) return [];
  if (clear(from, to)) return [to];
  const spacing = 0.5,
    width = Math.floor(bounds.width / spacing) + 1,
    height = Math.floor(bounds.depth / spacing) + 1;
  const at = (i: number): Point => ({
    x: (i % width) * spacing - bounds.width / 2,
    y: Math.floor(i / width) * spacing - bounds.depth / 2,
  });
  const index = (p: Point) =>
    Math.round((p.y + bounds.depth / 2) / spacing) * width +
    Math.round((p.x + bounds.width / 2) / spacing);
  const start = index(from),
    parents = new Int32Array(width * height).fill(-1),
    queue = [start];
  parents[start] = start;
  let reached = -1;
  for (let n = 0; n < queue.length; n++) {
    const current = queue[n],
      p = current === start ? from : at(current);
    if (distance(p, to) <= spacing * 2 && clear(p, to)) {
      reached = current;
      break;
    }
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
      [1, 1],
      [-1, -1],
      [-1, 1],
      [1, -1],
    ]) {
      const x = (current % width) + dx,
        y = Math.floor(current / width) + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const next = y * width + x;
      if (parents[next] !== -1 || !clear(p, at(next))) continue;
      parents[next] = current;
      queue.push(next);
    }
  }
  if (reached < 0) return [];
  const reversed = [to];
  while (reached !== start) {
    reversed.push(at(reached));
    reached = parents[reached];
  }
  const path = reversed.reverse(),
    simplified: Point[] = [];
  let anchor = from;
  for (let n = 0; n < path.length; n++)
    if (n === path.length - 1 || !clear(anchor, path[n + 1])) {
      simplified.push(path[n]);
      anchor = path[n];
    }
  return simplified;
}
function along(from: Point, path: Point[], travel: number): Point {
  let anchor = from;
  for (const to of path) {
    const length = distance(anchor, to);
    if (travel < length && length > 0)
      return {
        x: anchor.x + ((to.x - anchor.x) * travel) / length,
        y: anchor.y + ((to.y - anchor.y) * travel) / length,
      };
    travel -= length;
    anchor = to;
  }
  return anchor;
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
          position = along(
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
      const active = [...legs].reverse().find((l) => l.at <= time);
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
        position: along(active.from, active.path, travel),
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
