import {
  loadRemoteSimulations,
  saveRemoteSimulation,
} from "../../../lib/library/client";
import { type ExperimentDocument, validateDocument } from "../document";

export const DRAFT_KEY = "apertus-builder-draft-v1";
export const LIBRARY_KEY = "apertus-builder-library-v1";
export type SavedExperiment = {
  id: string;
  document: ExperimentDocument;
  recovery?: string;
  revision?: number;
};

export function readLibrary(): SavedExperiment[] {
  const entries = JSON.parse(localStorage.getItem(LIBRARY_KEY) ?? "[]");
  if (!Array.isArray(entries))
    throw new Error(
      "The saved library is unreadable. Export your experiment to keep a copy.",
    );
  return entries;
}

export async function loadLibrary(
  ownerId?: string,
): Promise<SavedExperiment[]> {
  return ownerId ? loadRemoteSimulations(ownerId) : readLibrary();
}

/** One complete storage replacement, using a cross-tab lock when supported. Unknown legacy entries are retained. */
export async function saveEntry(
  entry: SavedExperiment,
  expected?: SavedExperiment,
  ownerId?: string,
): Promise<SavedExperiment[]> {
  validateDocument(entry.document);
  const snapshot = structuredClone(entry);
  if (ownerId) {
    if (expected && expected.revision === undefined)
      throw new Error(
        "Reopen this experiment before saving it to your account.",
      );
    const entries = await loadRemoteSimulations(ownerId);
    const saved = await saveRemoteSimulation(
      snapshot,
      ownerId,
      expected?.revision ?? null,
    );
    return [...entries.filter((item) => item.id !== saved.id), saved];
  }
  const write = () => {
    const entries = readLibrary();
    const current = entries.find((item) => item?.id === snapshot.id);
    if (current && JSON.stringify(current) !== JSON.stringify(expected)) {
      throw new Error(
        "This experiment was saved in another tab. Export your changes, then reload this page and reopen the saved experiment before editing it again.",
      );
    }
    if (!current && expected)
      throw new Error(
        "The saved experiment changed in another tab. Export your changes before reopening it.",
      );
    const next = [
      ...entries.filter((item) => item?.id !== snapshot.id),
      snapshot,
    ];
    // setItem either replaces the complete record or throws; no partial document is written.
    localStorage.setItem(LIBRARY_KEY, JSON.stringify(next));
    return next;
  };
  return navigator.locks
    ? navigator.locks.request(LIBRARY_KEY, write)
    : write();
}
