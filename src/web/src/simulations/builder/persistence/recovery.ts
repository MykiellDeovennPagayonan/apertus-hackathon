import { migrateManualDocument } from "../document/canonical";
import { composeLegacy } from "../document/migrations/composeLegacy";
import { parseDocument } from "../document/serialization";
import type { ExperimentDocument } from "../document/types";
import {
  validateDocument,
  validateRunnableDocument,
} from "../document/validateDocument";
import { upgradeWorkspace } from "../editor/workspaceCommands";
import { DRAFT_KEY, readLibrary, type SavedExperiment } from "./storage";
export type DraftRecovery = {
  document: ExperimentDocument;
  valid: ExperimentDocument;
  selected?: string;
  saveId?: string | null;
  recovery?: string;
};
export function editableDocument(document: ExperimentDocument) {
  if (document.authored) {
    return parseDocument(JSON.stringify(document));
  }
  const next = composeLegacy(document);
  if (next.scene) upgradeWorkspace(next.scene);
  validateDocument(next);
  return migrateManualDocument(next);
}
export function usableEntries(entries: SavedExperiment[]) {
  return entries.flatMap((entry) => {
    try {
      const document = entry.document.authored
        ? editableDocument(entry.document)
        : entry.document;
      validateDocument(document);
      return typeof entry.id === "string" ? [{ ...entry, document }] : [];
    } catch {
      return [];
    }
  });
}
export function readBuilderRecovery(entries = readLibrary()) {
  if (!Array.isArray(entries)) throw new Error("Saved library is unreadable");
  const usable = usableEntries(entries),
    params = new URLSearchParams(location.search),
    lesson = params.get("lesson"),
    entry = usable.find((e) => e.id === lesson);
  if (lesson && !entry)
    throw new Error(
      "This saved lesson is unavailable on this device. Import its experiment JSON to open it here.",
    );
  if (entry) {
    validateRunnableDocument(entry.document);
    return {
      entries: usable,
      unreadable: entries.length !== usable.length,
      lesson: entry,
    };
  }
  if (params.has("remix")) {
    const source = sessionStorage.getItem("apertus-builder-remix");
    if (!source)
      throw new Error(
        "No remix recipe was supplied. Choose a template or import a recipe.",
      );
    return {
      entries: usable,
      unreadable: entries.length !== usable.length,
      remix: parseDocument(source),
    };
  }
  const raw = localStorage.getItem(DRAFT_KEY);
  const draft: DraftRecovery | undefined = raw ? JSON.parse(raw) : undefined;
  if (draft) draft.valid = editableDocument(draft.valid);
  return {
    entries: usable,
    unreadable: entries.length !== usable.length,
    draft,
  };
}
export function persistDraft(draft: DraftRecovery) {
  localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}
