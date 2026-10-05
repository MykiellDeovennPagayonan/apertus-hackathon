"use client";
import { isElementaryDemo } from "../../runtime/elementarySession";
import { isMathDemo } from "../../runtime/mathModel";
import type { DemoType } from "../../runtime/types";
import { LegacyRecipeView } from "./LegacyRecipeView";
import { AssemblyView } from "./math-foundations/AssemblyView";
import { SpatialRecipeView } from "./SpatialRecipeView";
export function ExperimentView({ demo }: { demo: DemoType }) {
  if (demo === "assembly") return <AssemblyView />;
  if (demo === "gas" || isMathDemo(demo) || isElementaryDemo(demo))
    return <LegacyRecipeView demo={demo} />;
  if (demo === "projectile" || demo === "bridge" || demo === "town")
    return <SpatialRecipeView demo={demo} />;
  return null;
}
