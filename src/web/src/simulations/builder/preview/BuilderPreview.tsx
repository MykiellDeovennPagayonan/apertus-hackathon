"use client";
import { createPortal } from "react-dom";
import { CompositionCanvas } from "../../components/views/CompositionCanvas";
import {
  CompositionLesson,
  type LessonProps,
} from "../../lessons/CompositionLesson";
import type { ExperimentDocument } from "../document";
import { authoredDisplayCommit } from "../editor/objectCommands";
export function BuilderPreview(
  props: Omit<
    LessonProps,
    "document" | "editor" | "prepareCommit" | "renderCapture"
  > & {
    document: ExperimentDocument;
    onCapture?: (
      scene: import("../../runtime/composition/types").CompositionScene,
      canvasId?: string,
    ) => void;
    editor?: {
      canvasId: string;
      objectId: string;
      container: HTMLElement | null;
    };
  },
) {
  const container = props.editor?.container;
  return (
    <CompositionLesson
      {...props}
      prepareCommit={authoredDisplayCommit}
      renderCapture={
        props.onCapture
          ? (capture, canvasId) => (
              <button
                type="button"
                onClick={() => props.onCapture?.(capture(), canvasId)}
              >
                Use current settings as starting values
              </button>
            )
          : undefined
      }
      editor={
        props.editor
          ? {
              canvasId: props.editor.canvasId,
              objectId: props.editor.objectId,
              active: !!container,
              render: (viewProps) =>
                container
                  ? createPortal(
                      <section
                        className="component-visual-editor"
                        aria-label="Edit on connected canvas"
                      >
                        <CompositionCanvas {...viewProps} />
                        <p className="composition-interaction-help">
                          Drag the selected object's handles to change its
                          starting geometry. Sliders and dragging edit the same
                          object.
                        </p>
                      </section>,
                      container,
                    )
                  : null,
            }
          : undefined
      }
    />
  );
}
