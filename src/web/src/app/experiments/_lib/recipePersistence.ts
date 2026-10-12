import { getProject } from "../../../lib/projects/client";
import { nameFields, renamePayload } from "../../../lib/projects/validation";
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
const savedSessions = new WeakMap<RecipeSession, Map<string, SavedExperiment>>();
const queues = new Map<string, Promise<unknown>>();

/** Store one accepted authored snapshot through the normal library/conflict workflow. */
export function persistRecipe(session: RecipeSession, ownerId?: string) {
  const id = session.recipe.id;
  const key = `${ownerId ?? "guest"}:${id}`;
  const document = parseDocument(session.serialize());
  const write = async () => {
    const receipts =
      savedSessions.get(session) ?? new Map<string, SavedExperiment>();
    const previous = receipts.get(key) ?? expected.get(key);
    const savedId = previous?.id ?? crypto.randomUUID();
    const library = await loadLibrary(ownerId);
    const names = new Set(
      library
        .filter((item) => item?.id !== savedId)
        .flatMap((item) => {
          try {
            return [nameFields(item.document.lesson.title).normalizedName];
          } catch {
            return []; // Retain unreadable legacy records without blocking new saves.
          }
        }),
    );
    const title = nameFields(document.lesson.title).name;
    let name = title;
    for (let suffix = 1; names.has(nameFields(name).normalizedName); suffix++) {
      const ending = ` (${suffix})`;
      name = `${Array.from(title)
        .slice(0, 100 - ending.length)
        .join("")
        .trimEnd()}${ending}`;
    }
    const payload = renamePayload(
      "experiment", document, name,
    ) as SavedExperiment["document"];
    if (payload.recipeMetadata) payload.recipeMetadata.id = savedId;
    const entries = await saveEntry(
      { id: savedId, document: payload }, previous, ownerId,
    );
    const saved = entries.find((item) => item?.id === savedId);
    if (!saved) throw new Error("The saved lesson could not be located.");
    receipts.set(key, structuredClone(saved));
    savedSessions.set(session, receipts);
    sessionStorage.setItem(
      ownerId ? `${LAST_RECIPE}:${ownerId}` : LAST_RECIPE,
      savedId,
    );
  };
  const promise = (queues.get(key) ?? Promise.resolve())
    .catch(() => {})
    .then(write);
  queues.set(key, promise);
  return promise;
}
export function hasAcceptedRecipe(ownerId?: string) {
  return Boolean(
    sessionStorage.getItem(ownerId ? `${LAST_RECIPE}:${ownerId}` : LAST_RECIPE),
  );
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
    : (await loadLibrary()).find((entry) => entry?.id === id);
  if (!entry) return null;
  expected.set(`${ownerId ?? "guest"}:${id}`, structuredClone(entry));
  return serializeDocument(entry.document);
}
