import { getProject } from "../../../lib/projects/client";
import {
  parseDocument,
  serializeDocument,
} from "../../../simulations/builder/document/serialization";
import {
  loadLibrary,
  type SavedExperiment,
  saveEntry,
} from "../../../simulations/builder/persistence/storage";
import type { RecipeSession } from "../../../simulations/runtime/recipeSession";

const LAST_RECIPE = "apertus-accepted-recipe-id";
const expected = new Map<string, SavedExperiment>();
const queues = new Map<string, Promise<unknown>>();

/** Store one accepted authored snapshot through the normal library/conflict workflow. */
export function persistRecipe(session: RecipeSession, ownerId?: string) {
  const id = session.recipe.id;
  const key = `${ownerId ?? "guest"}:${id}`;
  const entry = { id, document: parseDocument(session.serialize()) };
  const write = async () => {
    const entries = await saveEntry(entry, expected.get(key), ownerId);
    const saved = entries.find((item) => item.id === id);
    if (!saved) throw new Error("The saved lesson could not be located.");
    expected.set(key, structuredClone(saved));
    sessionStorage.setItem(
      ownerId ? `${LAST_RECIPE}:${ownerId}` : LAST_RECIPE,
      id,
    );
  };
  const promise = (queues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(write);
  queues.set(key, promise);
  return promise;
}
export async function reopenAcceptedRecipe(ownerId?: string) {
  const id = sessionStorage.getItem(
    ownerId ? `${LAST_RECIPE}:${ownerId}` : LAST_RECIPE,
  );
  if (!id) return null;
  const project = ownerId ? await getProject(id, ownerId) : null;
  const entry = project
    ? {
        id: project.projectId,
        document: project.payload as SavedExperiment["document"],
        revision: project.saveRevision,
      }
    : (await loadLibrary()).find((entry) => entry.id === id);
  if (!entry) return null;
  expected.set(`${ownerId ?? "guest"}:${id}`, structuredClone(entry));
  return serializeDocument(entry.document);
}
