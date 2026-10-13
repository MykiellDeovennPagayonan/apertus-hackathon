import type { Point } from "../traits/SceneObjects";
export type RouteGeometry = {
  bounds: { width: number; depth: number };
  walkable: (p: Point) => boolean;
  clear: (a: Point, b: Point) => boolean;
};
export type RoutePolicy = {
  spacing: number;
  neighbors: readonly (readonly [number, number])[];
  reach: number;
  requireWalkableStart: boolean;
  evaluateStartAtOrigin: boolean;
};
export const authoredRoutePolicy: RoutePolicy = {
  spacing: 0.5,
  neighbors: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [1, 1],
    [-1, -1],
    [-1, 1],
    [1, -1],
  ],
  reach: 1,
  requireWalkableStart: true,
  evaluateStartAtOrigin: true,
};
export const premadeRoutePolicy: RoutePolicy = {
  spacing: 0.5,
  neighbors: [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ],
  reach: 0.75,
  requireWalkableStart: false,
  evaluateStartAtOrigin: false,
};
export function clearRouteSegment(
  a: Point,
  b: Point,
  walkable: (p: Point) => boolean,
  resolution: number,
) {
  const count = Math.max(
    1,
    Math.ceil(Math.hypot(a.x - b.x, a.y - b.y) / resolution),
  );
  for (let n = 0; n <= count; n++)
    if (
      !walkable({
        x: a.x + ((b.x - a.x) * n) / count,
        y: a.y + ((b.y - a.y) * n) / count,
      })
    )
      return false;
  return true;
}
/** Search and simplify one route; scenarios select their geometry and connectivity policy. */
export function searchRoute(
  geometry: RouteGeometry,
  from: Point,
  to: Point,
  policy: RoutePolicy,
): Point[] {
  const { bounds, walkable, clear } = geometry;
  if ((policy.requireWalkableStart && !walkable(from)) || !walkable(to))
    return [];
  if (clear(from, to)) return [to];
  const spacing = policy.spacing,
    width = Math.floor(bounds.width / spacing) + 1,
    height = Math.floor(bounds.depth / spacing) + 1;
  const at = (i: number): Point => ({
    x: (i % width) * spacing - bounds.width / 2,
    y: Math.floor(i / width) * spacing - bounds.depth / 2,
  });
  const index = (p: Point) =>
    Math.round((p.y + bounds.depth / 2) / spacing) * width +
    Math.round((p.x + bounds.width / 2) / spacing);
  const start = index(from);
  if (start < 0 || start >= width * height) return [];
  const parents = new Int32Array(width * height).fill(-1),
    queue = [start];
  parents[start] = start;
  let reached = -1;
  for (let n = 0; n < queue.length; n++) {
    const current = queue[n],
      p =
        current === start && policy.evaluateStartAtOrigin ? from : at(current);
    if (Math.hypot(p.x - to.x, p.y - to.y) <= policy.reach && clear(p, to)) {
      reached = current;
      break;
    }
    for (const [dx, dy] of policy.neighbors) {
      const x = (current % width) + dx,
        y = Math.floor(current / width) + dy;
      if (x < 0 || x >= width || y < 0 || y >= height) continue;
      const next = y * width + x;
      if (
        parents[next] !== -1 ||
        !clear(current === start ? from : p, at(next))
      )
        continue;
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
