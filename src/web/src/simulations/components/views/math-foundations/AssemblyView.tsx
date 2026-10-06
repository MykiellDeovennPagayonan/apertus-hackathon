"use client";
import { useAssemblyStore } from "../../../runtime/assemblySession";
import { AssemblyRecipeView } from "../AssemblyRecipeView";
/** All supported assemblies use the public recipe renderer; the session remains a compatibility state adapter. */
export function AssemblyView() {
  const { assembly, instances } = useAssemblyStore();
  if (!assembly || !instances.length) return null;
  return <AssemblyRecipeView />;
}
