import type { LineObject, Point } from "../traits/SceneObjects";
export function lineIntersection(
  a: LineObject,
  b: LineObject,
): Point | "parallel" | "coincident" {
  const u = { x: a.b.x - a.a.x, y: a.b.y - a.a.y },
    v = { x: b.b.x - b.a.x, y: b.b.y - b.a.y };
  const cross = u.x * v.y - u.y * v.x,
    dx = b.a.x - a.a.x,
    dy = b.a.y - a.a.y;
  if (Math.abs(cross) < 1e-9)
    return Math.abs(dx * u.y - dy * u.x) < 1e-9 ? "coincident" : "parallel";
  const t = (dx * v.y - dy * v.x) / cross;
  return { x: a.a.x + t * u.x, y: a.a.y + t * u.y };
}
