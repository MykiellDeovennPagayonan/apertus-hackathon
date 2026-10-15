"use client";
import { SpatialRecipeView } from "../views/SpatialRecipeView";
/** Stable compatibility export backed by public recipe controls. */
export function TownControls() {
  return <SpatialRecipeView demo="town" controlsOnly />;
}
export default TownControls;
