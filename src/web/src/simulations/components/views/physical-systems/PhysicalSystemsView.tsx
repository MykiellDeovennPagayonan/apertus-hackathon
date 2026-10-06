"use client";
import { AssemblyRecipeView } from "../AssemblyRecipeView";
export const physicalPresentations = [
  "physical-pendulum",
  "physical-track",
  "physical-circuit",
] as const;
export function PhysicalSystemsView() {
  return <AssemblyRecipeView />;
}
