"use client";
import { useMemo, useSyncExternalStore } from "react";
import { insertRecipe } from "../../runtime/authoring/recipes";
import { DocumentRuntime } from "../../runtime/authoring/runtime";
import { emptyAuthoredDocument } from "../../runtime/authoring/types";
import type { ActionResult } from "../../runtime/commands";
import type { ModelInstance } from "../../runtime/contribution";
import {
  advanceSessionTime,
  getSessionAnimation,
  setSessionAnimation,
  subscribeSessionAnimation,
} from "../../runtime/session";
import type { UIAction } from "../../runtime/types";
import { builtInRecipe, modelRecipe } from "../composites/catalog";
import { RecipeLesson } from "./RecipeLesson";
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
