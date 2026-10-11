import {
  loadRemoteComponents,
  saveRemoteComponent,
} from "../../../lib/library/client";
import { saveProject } from "../../../lib/projects/client";
import type { CompositeRecipe } from "../../runtime/authoring/types";
import { RECIPE_LIBRARY_KEY, RecipeRepository } from "./RecipeRepository";

const cached = new Map<
  string,
  Array<{ recipe: CompositeRecipe; revision: number }>
>();
export async function loadComponentLibrary(ownerId?: string) {
  if (!ownerId) return new RecipeRepository(localStorage).read();
  const entries = await loadRemoteComponents(ownerId);
  cached.set(ownerId, entries);
  return entries.map((entry) => entry.recipe);
}
export async function saveComponentRecipe(
  recipe: CompositeRecipe,
  ownerId?: string,
  basedOnPublicationId?: string,
) {
  if (ownerId) {
    const entries = cached.get(ownerId) ?? [];
    const expected =
      entries.find((entry) => entry.recipe.id === recipe.id)?.revision ?? null;
    const attributed = basedOnPublicationId
      ? await saveProject(
          {
            projectId: recipe.id,
            projectType: "composition",
            name: recipe.title,
            description: recipe.description,
            tags: recipe.tags,
            payload: recipe,
            sharingAllowed: false,
          },
          ownerId,
          expected,
          basedOnPublicationId,
          recipe.id,
        )
      : null;
    const saved = attributed
      ? {
          recipe: attributed.payload as CompositeRecipe,
          revision: attributed.saveRevision,
        }
      : await saveRemoteComponent(recipe, ownerId, expected);
    const next = [
      ...entries.filter((entry) => entry.recipe.id !== saved.recipe.id),
      saved,
    ];
    cached.set(ownerId, next);
    return next.map((entry) => entry.recipe);
  }
  if (!navigator.locks)
    throw new Error(
      "This browser cannot coordinate local saves; export your recipe instead.",
    );
  return navigator.locks.request(RECIPE_LIBRARY_KEY, () => {
    if (basedOnPublicationId) {
      const sources = JSON.parse(
        localStorage.getItem("apertus-local-composition-sources-v1") ?? "{}",
      );
      sources[recipe.id] = basedOnPublicationId;
      localStorage.setItem(
        "apertus-local-composition-sources-v1",
        JSON.stringify(sources),
      );
    }
    return new RecipeRepository(localStorage).save(recipe);
  });
}
