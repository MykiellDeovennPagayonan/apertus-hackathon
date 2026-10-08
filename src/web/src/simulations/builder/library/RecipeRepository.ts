import { nameFields } from "../../../lib/projects/validation";
import { validateRecipe } from "../../runtime/authoring/recipes";
import type { CompositeRecipe } from "../../runtime/authoring/types";
import { parseRecipe } from "../../runtime/recipes/schema";
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
    return recipes.map((recipe) => parseRecipe(recipe));
  }
  save(recipe: CompositeRecipe, expected?: CompositeRecipe) {
    validateRecipe(recipe);
    const recipes = this.read(),
      index = recipes.findIndex((r) => r.id === recipe.id);
    const normalizedName = nameFields(recipe.title).normalizedName;
    if (
      recipes.some(
        (item) =>
          item.id !== recipe.id &&
          nameFields(item.title).normalizedName === normalizedName,
      )
    )
      throw new Error(
        "That name already exists on this device. Choose a different name.",
      );
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
