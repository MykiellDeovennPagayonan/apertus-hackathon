import { motion } from "framer-motion";
import type { SVGProps } from "react";
/** Screen-sized SVG circle, reusable for a projected ball or joint; identity supports picking. */
export function ShapeVisual2D({
  identity,
  ...props
}: SVGProps<SVGCircleElement> & { identity?: string }) {
  return <circle data-entity={identity} {...props} />;
}

export const AnimatedShapeVisual2D = motion.create(ShapeVisual2D);
