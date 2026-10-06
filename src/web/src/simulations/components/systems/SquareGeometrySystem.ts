import type { SquareObject } from "../traits/SceneObjects";
export function squareMetrics(side: number) {
  return { area: side ** 2, perimeter: 4 * side, side };
}
export function squareCorners(o: SquareObject) {
  const a = (o.rotation * Math.PI) / 180;
  return [
    [-1, -1],
    [1, -1],
    [1, 1],
    [-1, 1],
  ].map(([x, y]) => ({
    x: o.center.x + (o.side / 2) * (x * Math.cos(a) - y * Math.sin(a)),
    y: o.center.y + (o.side / 2) * (x * Math.sin(a) + y * Math.cos(a)),
  }));
}
