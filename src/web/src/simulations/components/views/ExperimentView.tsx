"use client";
import { useSyncExternalStore } from "react";
import { isElementaryDemo } from "../../runtime/elementarySession";
import { isMathDemo } from "../../runtime/mathModel";
import {
  advanceSessionTime,
  getActiveDefinition,
  getAuthoredSession,
  getSessionAnimation,
  setSessionAnimation,
  subscribeSessionAnimation,
} from "../../runtime/session";
import type { DemoType } from "../../runtime/types";
import { LegacyRecipeView } from "./LegacyRecipeView";
import { AssemblyView } from "./math-foundations/AssemblyView";
import { RecipeLesson } from "./RecipeLesson";
import { SpatialRecipeView } from "./SpatialRecipeView";
export function ExperimentView({ demo }: { demo: DemoType }) {
  const animationEnabled = useSyncExternalStore(
    subscribeSessionAnimation,
    getSessionAnimation,
    () => false,
  );
  const authored = getAuthoredSession();
  if (authored)
    return (
      <RecipeLesson
        workspace
        document={authored.document}
        runtime={authored.runtime}
        animationEnabled={animationEnabled}
        onAnimationChange={setSessionAnimation}
        onAdvanceTime={advanceSessionTime}
      />
    );
  // Session teardown can publish a store update before the next activation.
  // Keep that transition empty instead of assembling a legacy model from a
  // different session's starting values.
  if (!getActiveDefinition()) return <output>Loading experiment…</output>;
  if (demo === "assembly") return <AssemblyView />;
  if (demo === "gas" || isMathDemo(demo) || isElementaryDemo(demo))
    return <LegacyRecipeView demo={demo} />;
  if (demo === "projectile" || demo === "bridge" || demo === "town")
    return <SpatialRecipeView demo={demo} />;
  return null;
}
