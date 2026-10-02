import type { SVGProps } from "react";
/** SVG surface; visual adapters supply projected geometry. Each view scopes its own defs with useId. */
export function SVGWorldView(props: SVGProps<SVGSVGElement>) {
  return <svg aria-label="Simulation diagram" role="img" {...props} />;
}
export function projectPoint(
  point: { x: number; y: number },
  origin: { x: number; y: number },
  scale: number,
  yUp = true,
) {
  return {
    x: origin.x + point.x * scale,
    y: origin.y + point.y * scale * (yUp ? -1 : 1),
  };
}
