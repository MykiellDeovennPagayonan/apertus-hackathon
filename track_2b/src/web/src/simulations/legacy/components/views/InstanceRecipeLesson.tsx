"use client";
import { useMemo, useSyncExternalStore } from "react";
import { insertRecipe } from "../../../creation-and-editing/authoring-engine/recipes";
import { DocumentRuntime } from "../../../creation-and-editing/runtime-engine/DocumentRuntime";
import { emptyAuthoredDocument } from "../../../creation-and-editing/authoring-engine/document";
import type { ActionResult } from "../../../creation-and-editing/runtime-engine/commands";
import type { ModelInstance } from "../../../registry/contracts/domainContribution";
import {
  advanceSessionTime,
  getSessionAnimation,
  setSessionAnimation,
  subscribeSessionAnimation,
} from "../../runtime/session";
import type { UIAction } from "../../runtime/types";
import { builtInRecipe } from "../../../registry/recipes/builtIn";
import { modelRecipe } from "../../../registry/recipes/modelRecipe";
import { RecipeLesson } from "../../../creation-and-editing/simulation/RecipeLesson";
/** Serialized aliases can retain their entry point without retaining a private lesson assembly. */
export function InstanceRecipeLesson({
  instance,
  dispatch,
  learningGoal,
}: {
  instance: ModelInstance;
  dispatch: (command: UIAction) => ActionResult;
  learningGoal?: string;
}) {
  const animationEnabled = useSyncExternalStore(
    subscribeSessionAnimation,
    getSessionAnimation,
    () => false,
  );
  const { document, runtime } = useMemo(() => {
    const recipe = modelRecipe(instance.provider);
    const model = recipe.document.nodes.find((n) => n.id === "model");
    if (!model) throw new Error("Recipe is missing its model");
    model.configuration = structuredClone(instance.parameters);
    const document = insertRecipe(
      emptyAuthoredDocument(),
      recipe,
      builtInRecipe,
      (id) => (id === "model" ? instance.id : `${instance.id}/${id}`),
    );
    if (learningGoal) document.lesson.instruction = learningGoal;
    const runtime = new DocumentRuntime(document, (commands) => {
      if (commands.length !== 1)
        return {
          accepted: false,
          error:
            "This compatibility adapter needs an atomic batch dispatcher for shared controls",
        };
      const c = commands[0];
      return dispatch({
        type: c.command,
        target: c.command === "RESET" ? "session" : c.node,
        ...(Object.hasOwn(c.arguments, "value")
          ? { value: c.arguments.value }
          : {}),
      });
    });
    runtime.adoptSnapshot({
      state: { [instance.id]: instance.state },
      outputs: {
        [instance.id]: {
          ...instance.outputs,
          configuration: instance.parameters,
        },
      },
    });
    return { document, runtime };
  }, [instance, dispatch, learningGoal]);
  return (
    <RecipeLesson
      workspace
      document={document}
      runtime={runtime}
      animationEnabled={animationEnabled}
      onAnimationChange={setSessionAnimation}
      onAdvanceTime={advanceSessionTime}
    />
  );
}
