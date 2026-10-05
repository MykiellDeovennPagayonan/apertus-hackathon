"use client";
import { SpatialRecipeView } from "./SpatialRecipeView";
/** Serialized compatibility name; the canonical World canvas is lazy loaded by the recipe renderer. */
export function ThreeWorldView() {
  return <SpatialRecipeView demo="town" />;
}
export default ThreeWorldView;
