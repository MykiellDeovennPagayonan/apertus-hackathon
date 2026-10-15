import type { LineObject, Point } from "../traits/SceneObjects";
export type LineGeometry = Pick<LineObject, "a" | "b">;
export function lineFromSlope(slope: number, intercept: number): LineGeometry {
  return { a: { x: 0, y: intercept }, b: { x: 1, y: slope + intercept } };
}
export function lineParameters(
  o: LineGeometry | { slope: number; intercept: number },
) {
  if ("slope" in o) return { vertical: false, ...o };
  const run = o.b.x - o.a.x;
  const slope = run === 0 ? 0 : (o.b.y - o.a.y) / run;
  return {
    vertical: run === 0,
    slope,
    intercept: run === 0 ? 0 : o.a.y - slope * o.a.x,
  };
}
export function lineYAt(
  o: LineGeometry | { slope: number; intercept: number },
  x: number,
) {
  const { vertical, slope, intercept } = lineParameters(o);
  if (vertical) throw new Error("Undefined for a vertical line");
  return slope * x + intercept;
}
export function setLineProperty(o: LineObject, key: string, value: number) {
  const current = lineParameters(o);
  if (current.vertical)
    throw new Error(
      "A vertical line has no finite slope or y intercept. Move its handles first.",
    );
  Object.assign(
    o,
    lineFromSlope(
      key === "slope" ? value : current.slope,
      key === "intercept" ? value : current.intercept,
    ),
  );
}
export function lineViewportPoints(
  o: LineGeometry,
  bounds: { xMin: number; xMax: number; yMin: number; yMax: number },
): Point[] {
  if (Math.abs(o.b.x - o.a.x) < 1e-9)
    return [
      { x: o.a.x, y: bounds.yMin },
      { x: o.a.x, y: bounds.yMax },
    ];
  return [bounds.xMin, bounds.xMax].map((x) => ({
    x,
    y: o.a.y + ((x - o.a.x) * (o.b.y - o.a.y)) / (o.b.x - o.a.x),
  }));
}
