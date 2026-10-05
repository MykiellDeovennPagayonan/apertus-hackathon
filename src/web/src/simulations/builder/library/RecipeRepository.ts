import { validateRecipe } from "../../runtime/authoring/recipes";
import type { CompositeRecipe } from "../../runtime/authoring/types";
export const RECIPE_LIBRARY_KEY = "apertus-composites-v1";
export type RecipeStore = Pick<Storage, "getItem" | "setItem">;
export class RecipeRepository {
  constructor(private storage: RecipeStore) {}
  read(): CompositeRecipe[] {
    const source = this.storage.getItem(RECIPE_LIBRARY_KEY);
    if (!source) return [];
    const recipes: unknown = JSON.parse(source);
    if (!Array.isArray(recipes))
      throw new Error(
        "Prebuilt library is unreadable; stored data has been retained.",
      );
    for (const r of recipes) validateRecipe(r);
    return recipes;
  }
  save(recipe: CompositeRecipe, expected?: CompositeRecipe) {
    validateRecipe(recipe);
    const recipes = this.read(),
      index = recipes.findIndex((r) => r.id === recipe.id);
    if (
      (index >= 0 && !expected) ||
      (expected &&
        (index < 0 ||
          JSON.stringify(recipes[index]) !== JSON.stringify(expected)))
    )
      throw new Error(
        "This prebuilt changed in another editor. Export your copy or save with a new identity.",
      );
    if (index >= 0) recipes[index] = structuredClone(recipe);
    else recipes.push(structuredClone(recipe));
    this.storage.setItem(RECIPE_LIBRARY_KEY, JSON.stringify(recipes));
    return recipes;
  }
}
