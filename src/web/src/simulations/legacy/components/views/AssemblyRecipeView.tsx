"use client";
import { useEffect, useMemo } from "react";
import { createStore } from "zustand/vanilla";
import {
  assemblyInitializer,
  useAssemblyStore,
} from "../../runtime/assemblySession";
import { assemblyDocument } from "../../../creation-and-editing/authoring-engine/compatibility/assemblyDocument";
import { DocumentRuntime } from "../../../creation-and-editing/runtime-engine/DocumentRuntime";
import { RecipeLesson } from "../../../creation-and-editing/simulation/RecipeLesson";
/** Compatibility owner: the accepted assembly remains the premade runtime; its UI is public recipe data. */
export function AssemblyRecipeView() {
  const { assembly, instances } = useAssemblyStore();
  const document = useMemo(
    () => (assembly ? assemblyDocument(assembly) : null),
    [assembly],
  );
  const runtime = useMemo(() => {
    if (!document) return null;
    return new DocumentRuntime(document, (commands) => {
      const current = useAssemblyStore.getState(),
        staged = createStore(assemblyInitializer);
      staged.setState({
        assembly: structuredClone(current.assembly),
        instances: structuredClone(current.instances),
        initial: structuredClone(current.initial),
        resetCount: current.resetCount,
      });
      for (const c of commands) {
        const result = staged.getState().dispatch({
          type: c.command,
          target: c.command === "RESET" ? "session" : c.node,
          ...(Object.hasOwn(c.arguments, "value")
            ? { value: c.arguments.value }
            : {}),
        });
        if (!result.accepted) return result;
      }
      const next = staged.getState();
      useAssemblyStore.setState({
        instances: next.instances,
        resetCount: next.resetCount,
      });
      return { accepted: true };
    });
  }, [document]);
  useEffect(() => {
    if (runtime)
      runtime.adoptSnapshot({
        state: Object.fromEntries(instances.map((i) => [i.id, i.state])),
        outputs: Object.fromEntries(
          instances.map((i) => [
            i.id,
            { ...i.outputs, configuration: i.parameters },
          ]),
        ),
      });
  }, [runtime, instances]);
  return document && runtime ? (
    <RecipeLesson workspace document={document} runtime={runtime} />
  ) : null;
}
