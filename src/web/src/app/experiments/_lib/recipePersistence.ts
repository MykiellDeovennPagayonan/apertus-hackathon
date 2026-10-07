import {
  parseDocument,
  serializeDocument,
} from "../../../simulations/builder/document/serialization";
import {
  readLibrary,
  type SavedExperiment,
  saveEntry,
} from "../../../simulations/builder/persistence/storage";
import type { RecipeSession } from "../../../simulations/runtime/recipeSession";

const LAST_RECIPE = "apertus-accepted-recipe-id";
const expected = new Map<string, SavedExperiment>();
const queues = new Map<string, Promise<unknown>>();

/** Store one accepted authored snapshot through the normal library/conflict workflow. */
export function persistRecipe(session: RecipeSession) {
  const id = session.recipe.id;
  const entry = { id, document: parseDocument(session.serialize()) };
  const write = async () => {
    await saveEntry(entry, expected.get(id));
    expected.set(id, structuredClone(entry));
    sessionStorage.setItem(LAST_RECIPE, id);
  };
  const promise = (queues.get(id) ?? Promise.resolve())
    .catch(() => {})
    .then(write);
  queues.set(id, promise);
  return promise;
}
export function reopenAcceptedRecipe() {
  try {
    const id = sessionStorage.getItem(LAST_RECIPE);
    if (!id) return null;
    const entry = readLibrary().find((entry) => entry?.id === id);
    if (!entry) return null;
    expected.set(id, structuredClone(entry));
    return serializeDocument(entry.document);
  } catch {
    return null;
  }
}
