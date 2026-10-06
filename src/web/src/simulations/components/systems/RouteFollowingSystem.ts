import type { Point } from "../traits/SceneObjects";
export function interpolateSegment(
  from: Point,
  to: Point,
  travel: number,
): Point {
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  if (length === 0 || travel >= length) return to;
  return {
    x: from.x + ((to.x - from.x) * travel) / length,
    y: from.y + ((to.y - from.y) * travel) / length,
  };
}
export function alongRoute(
  from: Point,
  path: readonly Point[],
  travel: number,
): Point {
  let anchor = from;
  for (const to of path) {
    const length = Math.hypot(to.x - anchor.x, to.y - anchor.y);
    if (travel < length && length > 0)
      return interpolateSegment(anchor, to, travel);
    travel -= length;
    anchor = to;
  }
  return anchor;
}
