"use client";
import { SpatialRecipeView } from "../views/SpatialRecipeView";
/** Stable compatibility export backed by public recipe controls. */
export function BridgeControls() {
  return <SpatialRecipeView demo="bridge" controlsOnly />;
}
export default BridgeControls;
