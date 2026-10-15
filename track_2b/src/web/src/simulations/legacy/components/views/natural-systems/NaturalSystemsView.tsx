"use client";
import type { Assembly, ModelInstance } from "../../../../registry/contracts/domainContribution";
import { dispatchCommand } from "../../../runtime/session";
import { AssemblyRecipeView } from "../AssemblyRecipeView";
import { InstanceRecipeLesson } from "../InstanceRecipeLesson";
/** Compatibility exports retain their provider identity; lesson content is public recipe data. */
export function NaturalSystemsContent({
  assembly,
  instances,
}: {
  assembly: Assembly;
  instances: ModelInstance[];
}) {
  return (
    <main aria-label={assembly.title}>
      {instances.map((instance) => (
        <InstanceRecipeLesson
          key={instance.id}
          instance={instance}
          learningGoal={assembly.learningGoal}
          dispatch={(command) => dispatchCommand("assembly", command)}
        />
      ))}
    </main>
  );
}
export function NaturalSystemsView() {
  return <AssemblyRecipeView />;
}
