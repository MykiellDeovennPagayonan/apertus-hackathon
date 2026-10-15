import type { ConstructionUpdate } from "../../creation-and-editing/simulation/construction/contracts";
import type { GenerationResult } from "../../creation-and-editing/input/results";
import type { ExperimentDocument } from "../document/types";
import { validateDocument } from "../document/validateDocument";

/** Navigation is independent of authored content and cannot invalidate an AI transaction. */
export function contentFingerprint(document: ExperimentDocument) {
  const copy = structuredClone(document);
  copy.editor.zoom = 1;
  delete copy.editor.pan;
  if (copy.authored) {
    copy.authored.editor.zoom = 1;
    delete copy.authored.editor.pan;
  }
  return JSON.stringify(copy);
}

export function constructionPreview(
  base: ExperimentDocument,
  update: ConstructionUpdate,
): ExperimentDocument {
  return {
    ...base,
    authored: update.document,
    lesson: update.document.lesson,
    editor: {
      ...update.document.editor,
      zoom: base.editor.zoom,
      ...(base.editor.pan ? { pan: base.editor.pan } : {}),
    },
  };
}

export function completedExperiment(
  base: ExperimentDocument,
  result: Extract<GenerationResult, { status: "created" | "updated" }>,
): ExperimentDocument {
  const next = structuredClone(base);
  const { document, ...metadata } = result.recipe;
  next.authored = structuredClone(document);
  next.lesson = structuredClone(document.lesson);
  next.recipeMetadata = structuredClone(metadata);
  next.editor = {
    ...structuredClone(document.editor),
    zoom: base.editor.zoom,
    ...(base.editor.pan ? { pan: base.editor.pan } : {}),
  };
  next.authored.editor = structuredClone(next.editor);
  validateDocument(next);
  return next;
}

/** Small pacing interval, cancellable even while no network bytes are arriving. */
export function presentationPause(signal: AbortSignal, milliseconds: number) {
  signal.throwIfAborted();
  return new Promise<void>((resolve, reject) => {
    const done = () => {
      signal.removeEventListener("abort", abort);
      resolve();
    };
    const timer = setTimeout(done, milliseconds);
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener("abort", abort);
      reject(signal.reason);
    };
    signal.addEventListener("abort", abort, { once: true });
  });
}
