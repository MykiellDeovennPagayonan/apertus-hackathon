"use client";
import { useEffect, useMemo, useSyncExternalStore } from "react";
import { createStore } from "zustand/vanilla";
import { insertRecipe } from "../../../creation-and-editing/authoring-engine/recipes";
import { requireValue } from "../../../creation-and-editing/authoring-engine/requireValue";
import {
  DocumentRuntime,
  type ScopedCommand,
} from "../../../creation-and-editing/runtime-engine/DocumentRuntime";
import { emptyAuthoredDocument } from "../../../creation-and-editing/authoring-engine/document";
import {
  elementaryInitializer,
  useElementaryStore,
} from "../../runtime/elementarySession";
import { gasInitializer, useGasStore } from "../../runtime/gasSession";
import { mathInitializer, useMathStore } from "../../runtime/mathSession";
import {
  advanceSessionTime,
  getSessionAnimation,
  setSessionAnimation,
  subscribeSessionAnimation,
} from "../../runtime/session";
import type { DemoType } from "../../runtime/types";
import { builtInRecipe } from "../../../registry/recipes/builtIn";
import { modelRecipe } from "../../../registry/recipes/modelRecipe";
import { learningConfiguration } from "../../../registry/recipes/learningConfiguration";
import { RecipeLesson } from "../../../creation-and-editing/simulation/RecipeLesson";

/** Old session entry points delegate to their existing authoritative commands and clock, while presentation uses public recipe nodes. */
export function LegacyRecipeView({ demo }: { demo: DemoType }) {
  const animationEnabled = useSyncExternalStore(
    subscribeSessionAnimation,
    getSessionAnimation,
    () => false,
  );
  const gas = useGasStore(),
    math = useMathStore(),
    elementary = useElementaryStore();
  const id =
    demo === "gas"
      ? gas.id
      : demo === math.board.demo
        ? math.board.id
        : elementary.id;
  const initial =
    demo === "gas"
      ? gas.initial
      : demo === math.board.demo
        ? math.initial
        : elementary.initial;
  const document = useMemo(() => {
    const definition =
        demo === "gas" ? "prefabs/AuthoredGasContainer" : `models/${demo}`,
      recipe = modelRecipe(definition);
    requireValue(
      recipe.document.nodes.find((n) => n.id === "model"),
    ).configuration =
      demo === "gas"
        ? {
            ...structuredClone(
              requireValue(recipe.document.nodes.find((n) => n.id === "model"))
                .configuration,
            ),
            inputs: structuredClone(initial),
          }
        : demo === (initial as { demo?: string }).demo
          ? learningConfiguration(
              initial as import("../traits/MathBoards").MathBoard,
            )
          : (structuredClone(initial) as Record<string, unknown>);
    const document = insertRecipe(
      emptyAuthoredDocument(),
      recipe,
      builtInRecipe,
      (key) => (key === "model" ? id : `${id}/${key}`),
    );
    document.lesson = structuredClone(recipe.document.lesson);
    return document;
  }, [demo, id, initial]);
  const runtime = useMemo(
    () =>
      new DocumentRuntime(document, (commands) => {
        const dispatch = (c: ScopedCommand) => ({
          type: c.command.startsWith("set:")
            ? `SET_${c.command.slice(4).toUpperCase()}`
            : c.command === "reset"
              ? "RESET"
              : c.command,
          ...(Object.hasOwn(c.arguments, "value")
            ? { value: c.arguments.value }
            : {}),
        });
        if (demo === "gas") {
          const source = useGasStore.getState(),
            staged = createStore(gasInitializer);
          staged.setState({
            id: source.id,
            inputs: structuredClone(source.inputs),
            initial: structuredClone(source.initial),
            metrics: structuredClone(source.metrics),
            particles: structuredClone(source.particles),
          });
          for (const c of commands) {
            const result = staged.getState().dispatch(dispatch(c));
            if (!result.accepted) return result;
          }
          const next = staged.getState();
          useGasStore.setState({
            inputs: next.inputs,
            metrics: next.metrics,
            particles: next.particles,
          });
        } else if (demo === useMathStore.getState().board.demo) {
          const source = useMathStore.getState(),
            staged = createStore(mathInitializer);
          staged.setState({
            board: structuredClone(source.board),
            initial: structuredClone(source.initial),
          });
          for (const c of commands) {
            const result = staged.getState().dispatch(dispatch(c));
            if (!result.accepted) return result;
          }
          useMathStore.setState({ board: staged.getState().board });
        } else {
          const source = useElementaryStore.getState(),
            staged = createStore(elementaryInitializer);
          staged.setState({
            demo: source.demo,
            id: source.id,
            parameters: structuredClone(source.parameters),
            initial: structuredClone(source.initial),
            outputs: structuredClone(source.outputs),
          });
          for (const c of commands) {
            const result = staged.getState().dispatch(dispatch(c));
            if (!result.accepted) return result;
          }
          const next = staged.getState();
          useElementaryStore.setState({
            parameters: next.parameters,
            outputs: next.outputs,
          });
        }
        return { accepted: true };
      }),
    [document, demo],
  );
  useEffect(() => {
    if (demo === "gas")
      runtime.adoptSnapshot({
        state: {
          [id]: {
            ...document.nodes.find((n) => n.id === id)?.configuration,
            id,
            inputs: gas.inputs,
          },
        },
        outputs: { [id]: { pressureKPa: gas.metrics.pressureKPa } },
      });
    else if (demo === math.board.demo)
      runtime.adoptSnapshot({
        state: { [id]: math.board as unknown as Record<string, unknown> },
        outputs: {
          [id]: {
            board: math.board,
            feedback: math.board.feedback,
            playing: math.board.sequence.playing,
          },
        },
      });
    else
      runtime.adoptSnapshot({
        state: { [id]: elementary.parameters },
        outputs: { [id]: elementary.outputs as Record<string, unknown> },
      });
  }, [
    runtime,
    document,
    demo,
    id,
    gas.inputs,
    gas.metrics,
    math.board,
    elementary.parameters,
    elementary.outputs,
  ]);
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
