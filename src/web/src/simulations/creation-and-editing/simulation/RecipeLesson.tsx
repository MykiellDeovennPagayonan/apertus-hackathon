"use client";

import { MotionConfig } from "framer-motion";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { convertToBoard } from "../authoring-engine/presentation/board";
import { DocumentRuntime } from "../runtime-engine/DocumentRuntime";
import type { AuthoredDocument } from "../authoring-engine/document";
import { publicDefinition } from "../../registry/index";
import { ActionButton } from "../../registry/controls/ActionButton";
import { SpatialBoard } from "./board/SpatialBoard";
import { useReducedMotion } from "../../legacy/components/views/useCompactDiagram";
import "./recipe-lesson.css";
import "../../legacy/components/views/chemistry/ChemistryLesson.css";
import "../../legacy/components/views/dynamic-systems/DynamicSystemsLesson.css";
import "../../legacy/components/views/natural-systems/natural-systems.css";
import "../../legacy/components/views/math.css";
import "../../legacy/components/views/systems-comparisons.css";
import "../../legacy/components/views/science-lessons.css";

import {
  AuthorContext,
  type AuthorControls,
  MotionContext,
  SnapshotContext,
} from "./recipe/contexts";
import { PresentationLayout } from "./recipe/RecipeLayout";

export function RecipeLesson({
  document,
  runtime: supplied,
  onCapture,
  onPresentationChange,
  onBoardAction,
  authoring,
  workspace,
  selected,
  onSelect,
  onAuthorChange,
  onCanvasChange,
  onAnimationChange,
  onAdvanceTime,
  animationEnabled,
}: AuthorControls & {
  document: AuthoredDocument;
  workspace?: boolean;
  runtime?: DocumentRuntime;
  animationEnabled?: boolean;
  onAnimationChange?: (enabled: boolean) => void;
  onAdvanceTime?: (
    delta: number,
  ) => import("../runtime-engine/commands").ActionResult;
  onCapture?: (document: AuthoredDocument) => void;
  onBoardAction?: (
    action: "copy" | "paste" | "duplicate" | "delete" | "separate",
    layoutIds: string[],
    itemIds?: string[],
  ) => void;
  onPresentationChange?: (
    presentation: AuthoredDocument["presentation"],
    group?: string,
    action?: string,
  ) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [localMotion, setAllowMotion] = useState(false);
  const allowMotion = animationEnabled ?? localMotion;
  const animated = !reducedMotion || allowMotion;
  const ref = useRef<DocumentRuntime | null>(null);
  if (!ref.current) ref.current = supplied ?? new DocumentRuntime(document);
  const runtime = supplied ?? ref.current;
  useEffect(() => {
    if (supplied) return;
    runtime.activateEffects();
    return () => runtime.dispose();
  }, [runtime, supplied]);
  // Read-only browser diagnostics, gated by the same explicit flag as the learner shell.
  useEffect(() => {
    if (supplied || process.env.NEXT_PUBLIC_EXPERIMENT_DIAGNOSTICS !== "true")
      return;
    Object.defineProperty(window, "__builderLessonSnapshot", {
      value: () => ({
        recipe: { document: runtime.document },
        state: runtime.getSnapshot(),
      }),
      configurable: true,
    });
    return () => {
      Reflect.deleteProperty(window, "__builderLessonSnapshot");
    };
  }, [runtime, supplied]);
  const lastRuntimeSource = useRef<string | null>(null);
  const runtimeSource = JSON.stringify({
    ...document,
    presentation: undefined,
    editor: undefined,
  });
  useEffect(() => {
    if (!supplied && lastRuntimeSource.current !== runtimeSource) {
      runtime.updateDocument(document);
      lastRuntimeSource.current = runtimeSource;
    }
  }, [runtime, runtimeSource, document, supplied]);
  useEffect(() => {
    runtime.document.presentation = document.presentation;
    runtime.document.editor = document.editor;
  }, [runtime, document.presentation, document.editor]);
  const snapshot = useSyncExternalStore(
    runtime.subscribe,
    runtime.getSnapshot,
    runtime.getSnapshot,
  );
  useEffect(() => {
    if (supplied || !animated) return;
    let frame = 0,
      previous = 0;
    const tick = (now: number) => {
      if (
        previous &&
        document.nodes.some(
          (n) => publicDefinition(n).lifecycle.clock,
        )
      )
        runtime.step(Math.min(0.1, (now - previous) / 1000));
      previous = now;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [runtime, document.nodes, supplied, animated]);
  const presentationDocument = useMemo(() => {
    if (!workspace || authoring || document.presentation?.mode === "board")
      return document;
    return { ...document, presentation: convertToBoard(document) };
  }, [document, workspace, authoring]);
  const boardWorkspace =
    workspace && presentationDocument.presentation?.mode === "board";
  const runtimeActions = (
    <>
      {boardWorkspace && (
        <details className="recipe-lesson-info">
          <summary>About this lesson and its limits</summary>
          <p>{document.lesson.instruction}</p>
          <p>{document.lesson.explanation}</p>
        </details>
      )}
      {reducedMotion &&
        (!supplied || onAdvanceTime) &&
        document.nodes.some(
          (node) => publicDefinition(node).lifecycle.clock,
        ) && (
          <div className="recipe-motion-policy">
            <p>
              Automatic motion is paused to match your motion preference.
              Advance time in steps, or choose animation.
            </p>
            <label className="catalog-toggle">
              <span>Animate simulation</span>
              <input
                type="checkbox"
                checked={allowMotion}
                onChange={(event) => {
                  setAllowMotion(event.target.checked);
                  onAnimationChange?.(event.target.checked);
                }}
              />
            </label>
            {!allowMotion && (
              <ActionButton
                onCommand={() => {
                  try {
                    if (onAdvanceTime) return onAdvanceTime(0.25);
                    runtime.step(0.25);
                    return { accepted: true };
                  } catch (error) {
                    return {
                      accepted: false,
                      error:
                        error instanceof Error
                          ? error.message
                          : "Unable to advance time.",
                    };
                  }
                }}
              >
                Advance time by 0.25 seconds
              </ActionButton>
            )}
          </div>
        )}
      <button
        className="recipe-action recipe-action--quiet"
        type="button"
        onClick={() => runtime.reset()}
      >
        Reset experiment
      </button>
      {onCapture && (
        <button type="button" onClick={() => onCapture(runtime.capture())}>
          Use current settings as starting values
        </button>
      )}
    </>
  );
  return (
    <MotionConfig reducedMotion="user">
      <MotionContext.Provider value={animated}>
        <main
          className={`recipe-lesson ${boardWorkspace ? "is-board-workspace" : ""}`}
          aria-label={document.lesson.title}
        >
          {/* Workspace metadata belongs outside the canvas, never in a reserved top section. */}
          {!boardWorkspace && (
            <header>
              <h1>{document.lesson.title}</h1>
              <p>{document.lesson.instruction}</p>
              {document.lesson.explanation && (
                <details className="recipe-explanation">
                  <summary>About this lesson and its limits</summary>
                  <p>{document.lesson.explanation}</p>
                </details>
              )}
            </header>
          )}
          <AuthorContext.Provider
            value={{
              authoring,
              selected,
              onSelect,
              onAuthorChange,
              onCanvasChange,
            }}
          >
            <SnapshotContext.Provider value={snapshot}>
              <SpatialBoard
                document={presentationDocument}
                authoring={authoring}
                workspace={workspace}
                autoLayout={
                  !!workspace &&
                  !authoring &&
                  document.presentation?.mode !== "board"
                }
                actions={boardWorkspace ? runtimeActions : undefined}
                onEdit={onSelect}
                onChange={onPresentationChange}
                onAction={onBoardAction}
                render={(layout) => (
                  <PresentationLayout
                    layout={layout}
                    runtime={runtime}
                    boardHosted={
                      presentationDocument.presentation?.mode === "board"
                    }
                  />
                )}
              />
            </SnapshotContext.Provider>
          </AuthorContext.Provider>
          {!boardWorkspace && (
            <footer className="recipe-runtime-actions">{runtimeActions}</footer>
          )}
        </main>
      </MotionContext.Provider>
    </MotionConfig>
  );
}
