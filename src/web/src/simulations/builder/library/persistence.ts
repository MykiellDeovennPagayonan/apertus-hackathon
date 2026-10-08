import {
  loadRemoteComponents,
  saveRemoteComponent,
} from "../../../lib/library/client";
import type { CompositeRecipe } from "../../runtime/authoring/types";
import { RECIPE_LIBRARY_KEY, RecipeRepository } from "./RecipeRepository";

export async function loadComponentLibrary(ownerId?: string) {
  return ownerId
    ? (await loadRemoteComponents(ownerId)).map((entry) => entry.recipe)
    : new RecipeRepository(localStorage).read();
}

export async function saveComponentRecipe(
  recipe: CompositeRecipe,
  ownerId?: string,
) {
  if (ownerId) {
    const entries = await loadComponentLibrary(ownerId);
    const saved = await saveRemoteComponent(recipe, ownerId);
    return [
      ...entries.filter((entry) => entry.id !== saved.recipe.id),
      saved.recipe,
    ];
  }
  if (!navigator.locks)
    throw new Error(
      "This browser cannot coordinate local saves; export your recipe instead.",
    );
  return navigator.locks.request(RECIPE_LIBRARY_KEY, () =>
    new RecipeRepository(localStorage).save(recipe),
  );
}
